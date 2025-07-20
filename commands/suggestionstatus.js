const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { updateSuggestionStatus, getSuggestionById } = require('../utils/database');
const { getConfig } = require('../utils/config');

const statusColors = {
	'Approved': 0x27ae60,
	'Denied': 0xe74c3c,
	'Implemented': 0xf1c40f,
	'Pending': 0x1abc9c
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName('suggestionstatus')
		.setDescription('Update the status of a suggestion')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addIntegerOption(opt => opt.setName('id').setDescription('Suggestion ID').setRequired(true))
		.addStringOption(opt =>
			opt.setName('status')
				.setDescription('New status')
				.setRequired(true)
				.addChoices(
					{ name: 'Approved', value: 'Approved' },
					{ name: 'Denied', value: 'Denied' },
					{ name: 'Implemented', value: 'Implemented' }
				)
		)
		.addStringOption(opt => opt.setName('reason').setDescription('Reason (optional)').setRequired(false)),
	async execute(interaction, client) {
		const id = interaction.options.getInteger('id');
		const status = interaction.options.getString('status');
		const reason = interaction.options.getString('reason') || 'No reason provided';

		const suggestion = await getSuggestionById(id);
		if (!suggestion) {
			return interaction.reply({ content: '❌ Suggestion not found.', ephemeral: true });
		}

		const config = await getConfig(interaction.guildId);
		const channel = await client.channels.fetch(config.suggestionChannel);
		const msg = await channel.messages.fetch(suggestion.messageId);

		const embed = EmbedBuilder.from(msg.embeds[0])
			.setFields(
				{ name: 'Category', value: `\`${suggestion.category}\``, inline: true },
				{ name: 'Status', value: `\`${status}\``, inline: true },
				{ name: 'Reason', value: reason }
			)
			.setColor(statusColors[status] || 0x1abc9c)
			.setFooter({ text: `Powered by Trenny Development © 2024 • Updated by ${interaction.user.tag}` })
			.setTimestamp();

		await msg.edit({ embeds: [embed] });
		await updateSuggestionStatus(id, status, reason);

		await interaction.reply({ content: `✅ Suggestion #${id} status updated to **${status}**.`, ephemeral: true });
	}
};
