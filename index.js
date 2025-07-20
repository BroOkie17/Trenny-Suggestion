const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { initDB } = require('./utils/database');
require('dotenv').config();

// Create directories if they don't exist
const dirs = ['data', 'events', 'utils'].map(dir => path.join(__dirname, dir));
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Advanced logging setup
const logger = {
    info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
    error: (msg, error) => {
        console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`);
        if (error) console.error(error);
        if (process.env.ERROR_WEBHOOK) {
            const webhook = new WebhookClient({ url: process.env.ERROR_WEBHOOK });
            webhook.send({ content: `Error: ${msg}\n\`\`\`${error?.stack || 'No stack trace'}\`\`\`` });
        }
    }
};

// Initialize client with all necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// Collections for various data
client.commands = new Collection();
client.cooldowns = new Collection();
client.suggestionCache = new Collection();
client.activePrompts = new Collection();

// Command handler setup
const loadCommands = async () => {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        try {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                logger.info(`Loaded command: ${command.data.name}`);
            }
        } catch (error) {
            logger.error(`Error loading command ${file}`, error);
        }
    }
};

// Event handler setup
const loadEvents = async () => {
    const eventsPath = path.join(__dirname, 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        try {
            const filePath = path.join(eventsPath, file);
            const event = require(filePath);
            if ('name' in event && 'execute' in event) {
                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args, client));
                } else {
                    client.on(event.name, (...args) => event.execute(...args, client));
                }
                logger.info(`Loaded event: ${event.name}`);
            }
        } catch (error) {
            logger.error(`Error loading event ${file}`, error);
        }
    }
};

// Add metrics collection
const metrics = {
    suggestions: {
        total: 0,
        approved: 0,
        denied: 0,
        pending: 0
    },
    updateMetrics: async (guildId) => {
        const stats = await getGuildStats(guildId);
        metrics.suggestions = stats;
    }
};

// Auto-moderation system
const autoMod = {
    checkContent: async (content) => {
        // Filter inappropriate content
        const blockedWords = ['spam', 'inappropriate', 'offensive'];
        return !blockedWords.some(word => content.toLowerCase().includes(word));
    },
    
    rateLimitCheck: async (userId) => {
        const userSuggestions = client.suggestionCache.get(userId) || [];
        const recentSuggestions = userSuggestions.filter(s => 
            Date.now() - s.timestamp < 3600000 // Last hour
        );
        return recentSuggestions.length < 5; // Max 5 suggestions per hour
    }
};

// Custom event handling
client.on('suggestionCreate', async (suggestion) => {
    metrics.suggestions.total++;
    logger.info(`New suggestion created: ${suggestion.id}`);
    
    // Notify moderators if high-priority
    if (suggestion.priority === 'high') {
        const modChannel = await client.channels.fetch(process.env.MOD_CHANNEL);
        if (modChannel) {
            modChannel.send({
                content: `🔔 High priority suggestion received! ID: ${suggestion.id}`
            });
        }
    }
});

// Periodic tasks
setInterval(async () => {
    try {
        // Update suggestion status for inactive suggestions
        const oldSuggestions = await getInactiveSuggestions();
        for (const suggestion of oldSuggestions) {
            await updateSuggestionStatus(suggestion.id, 'archived');
            logger.info(`Archived inactive suggestion: ${suggestion.id}`);
        }
    } catch (error) {
        logger.error('Error in periodic tasks', error);
    }
}, 86400000); // Run daily

// Initialize bot
const initializeBot = async () => {
    try {
        await initDB();
        logger.info('Database initialized');

        await loadCommands();
        await loadEvents();

        // Set up periodic tasks
        setInterval(() => {
            client.suggestionCache.clear();
            logger.info('Suggestion cache cleared');
        }, 1800000); // Clear cache every 30 minutes

        // Error handling
        process.on('unhandledRejection', (error) => {
            logger.error('Unhandled promise rejection', error);
        });

        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception', error);
            process.exit(1);
        });

        // Login
        await client.login(process.env.BOT_TOKEN);
        logger.info('Bot successfully started');
    } catch (error) {
        logger.error('Failed to initialize bot', error);
        process.exit(1);
    }
};

initializeBot();

// Export additional functionality
module.exports = {
    ...module.exports,
    metrics,
    autoMod
};
