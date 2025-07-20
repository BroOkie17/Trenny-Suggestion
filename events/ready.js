const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        
        // Set bot activity
        client.user.setActivity('suggestions', { type: 'WATCHING' });
        
        // Log startup info
        console.log(`Serving ${client.guilds.cache.size} guilds`);
        console.log(`Loaded ${client.commands.size} commands`);
    }
};