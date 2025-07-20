const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Validate required environment variables
if (!process.env.BOT_TOKEN) {
    console.error('❌ Error: BOT_TOKEN is required in .env file');
    process.exit(1);
}

if (!process.env.CLIENT_ID) {
    console.error('❌ Error: CLIENT_ID is required in .env file');
    console.log('\n📋 To get your CLIENT_ID:');
    console.log('1. Go to https://discord.com/developers/applications');
    console.log('2. Select your bot application');
    console.log('3. Copy the "Application ID" from the General Information page');
    console.log('4. Add it to your .env file as CLIENT_ID=your_application_id_here');
    process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log('📂 Loading commands...');
for (const file of commandFiles) {
    try {
        const command = require(`./commands/${file}`);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
            console.log(`✅ Loaded: ${command.data.name}`);
        } else {
            console.warn(`⚠️ Skipped ${file}: Missing data or execute properties`);
        }
    } catch (error) {
        console.error(`❌ Error loading ${file}:`, error.message);
    }
}

if (commands.length === 0) {
    console.error('❌ No valid commands found!');
    process.exit(1);
}

const rest = new REST().setToken(process.env.BOT_TOKEN);

(async () => {
    try {
        console.log(`\n🚀 Started refreshing ${commands.length} application (/) commands...`);
        
        // Deploy commands globally (all servers) or to specific guild
        const route = process.env.GUILD_ID 
            ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
            : Routes.applicationCommands(process.env.CLIENT_ID);
            
        const deploymentType = process.env.GUILD_ID ? 'guild-specific' : 'global';
        console.log(`📍 Deploying ${deploymentType} commands...`);

        await rest.put(route, { body: commands });

        console.log(`\n✅ Successfully reloaded ${commands.length} application (/) commands!`);
        
        if (process.env.GUILD_ID) {
            console.log(`🎯 Commands deployed to guild: ${process.env.GUILD_ID}`);
            console.log('⚡ Guild commands update instantly!');
        } else {
            console.log('🌐 Commands deployed globally to all servers');
            console.log('⏳ Global commands may take up to 1 hour to update');
        }
        
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        
        if (error.code === 50035) {
            console.log('\n🔧 Possible fixes:');
            console.log('1. Check your CLIENT_ID in .env file');
            console.log('2. Ensure BOT_TOKEN is valid');
            console.log('3. Verify command structure is correct');
        }
    }
})();
