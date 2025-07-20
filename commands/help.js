const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Show help for all commands')
		.addStringOption(option =>
			option.setName('category')
				.setDescription('Help category')
				.addChoices(
					{ name: 'Suggestions', value: 'suggestions' },
					{ name: 'Administration', value: 'admin' },
					{ name: 'Configuration', value: 'config' },
					{ name: 'Statistics', value: 'stats' }
				)),

	async execute(interaction, client) {
		const category = interaction.options.getString('category');
		
		// Get all commands for dynamic help
		const commands = Array.from(client.commands.values());
		
		// Categorize commands
		const categories = {
			suggestions: commands.filter(cmd => !cmd.data.defaultPermission),
			admin: commands.filter(cmd => cmd.data.defaultPermission),
			config: commands.filter(cmd => cmd.data.name.includes('config')),
			stats: commands.filter(cmd => cmd.data.name.includes('stats'))
		};

		if (category) {
			const categoryCommands = categories[category] || [];
			const embed = new EmbedBuilder()
				.setTitle(`📚 Help: ${category.charAt(0).toUpperCase() + category.slice(1)}`)
				.setColor(getCategoryColor(category))
				.setDescription(getCategoryDescription(category))
				.addFields(
					categoryCommands.map(cmd => ({
						name: `/${cmd.data.name}`,
						value: getDetailedCommandHelp(cmd)
					}))
				)
				.setFooter({ text: 'Powered by Trenny Development © 2024' });

			// Add pagination buttons if there are many commands
			if (categoryCommands?.length > 5) {
				const pages = chunkArray(categoryCommands, 5);
				const paginatedEmbed = createPaginatedEmbed(pages[0], category, 1, pages.length);
				// Add pagination logic here
			}

			return interaction.reply({ embeds: [embed], ephemeral: true });
		}

		const embed = new EmbedBuilder()
			.setTitle('🛠️ Trenny Development Suggestion Bot Help')
			.setColor(0x7289da)
			.setDescription('**Categories:**\n> 💡 Suggestions\n> 🛡️ Admin\n\n**Commands:**')
			.addFields(
				{ name: '/suggest', value: 'Submit a suggestion (category, anonymous supported).' },
				{ name: '/suggestionstatus', value: 'Admin: Update suggestion status (approve/deny/implement).' },
				{ name: '/suggestionhistory', value: 'View your suggestion history.' },
				{ name: '/suggestionconfig', value: 'Admin: Configure suggestion system.' },
				{ name: '/help', value: 'Show this help message.' }
			)
			.setFooter({ text: 'Powered by Trenny Development © 2024', iconURL: 'https://cdn-icons-png.flaticon.com/512/190/190411.png' })
			.setTimestamp();

		await interaction.reply({ embeds: [embed], ephemeral: true });
	}
};

function createPaginatedEmbed(commands, category, currentPage, totalPages) {
    return new EmbedBuilder()
        .setTitle(`📚 Help: ${category.charAt(0).toUpperCase() + category.slice(1)} (Page ${currentPage}/${totalPages})`)
        .setColor(getCategoryColor(category))
        .setDescription(getCategoryDescription(category))
        .addFields(commands.map(cmd => ({
            name: `/${cmd.data.name}`,
            value: getDetailedCommandHelp(cmd)
        })))
        .setFooter({ text: `Page ${currentPage}/${totalPages} • Powered by Trenny Development © 2024` });
}

function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

function getCommandExamples(command) {
    const examples = {
        suggest: [
            '/suggest suggestion:Add a new feature priority:high',
            '/suggest suggestion:Fix this bug category:bug anonymous:true'
        ],
        suggestionconfig: [
            '/suggestionconfig channel:#suggestions color:#FF0000',
            '/suggestionconfig cooldown:30 dm_notifications:true'
        ],
        // Add more examples for other commands
    };
    return examples[command.data.name] || [];
}

function getDetailedCommandHelp(command) {
    let help = command.data.description + '\n\n';

    if (command.data.options?.length > 0) {
        help += '**Options:**\n' + command.data.options
            .map(opt => `• \`${opt.name}\`: ${opt.description}`)
            .join('\n') + '\n\n';
    }

    const examples = getCommandExamples(command);
    if (examples.length > 0) {
        help += '**Examples:**\n' + examples
            .map(ex => `\`${ex}\``)
            .join('\n');
    }

    return help;
}

function getCategoryColor(category) {
    const colors = {
        suggestions: 0x2ecc71,
        admin: 0xe74c3c,
        config: 0x3498db,
        stats: 0xf1c40f
    };
    return colors[category] || 0x7289da;
}

function getCategoryDescription(category) {
    const descriptions = {
        suggestions: 'Commands for managing and creating suggestions',
        admin: 'Administrative commands for managing the suggestion system',
        config: 'Configuration commands for setting up the bot',
        stats: 'Statistical and analytical commands'
    };
    return descriptions[category] || 'No description available';
}
