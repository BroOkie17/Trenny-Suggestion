const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getUserSuggestions } = require('../utils/database');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('suggestionhistory')
		.setDescription('View your suggestion history'),

	async execute(interaction) {
		const suggestions = await getUserSuggestions(interaction.guildId, interaction.user.id);

		if (!Array.isArray(suggestions) || suggestions.length === 0) {
			return interaction.reply({
				content: 'You have not submitted any suggestions yet.',
				flags: MessageFlags.Ephemeral
			});
		}

		const description = suggestions.map(s => {
			const id = s.id ?? '???';
			const status = s.status ?? 'unknown';
			const text = typeof s.suggestion === 'string' ? s.suggestion : '[no suggestion text]';
			const shortText = text.length > 40 ? text.slice(0, 40) + '...' : text;

			return `**#${id}** [${status}] - ${shortText}`;
		}).join('\n');

		const embed = new EmbedBuilder()
			.setTitle('📜 Your Suggestions')
			.setColor(0x1abc9c)
			.setDescription(description)
			.setFooter({ text: 'Powered by Trenny Development © 2024' })
			.setTimestamp();

		await interaction.reply({
			embeds: [embed],
			flags: MessageFlags.Ephemeral
		});
	}
};
