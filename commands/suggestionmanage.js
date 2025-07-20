const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getSuggestionById: getSuggestion, updateSuggestion, getGuildStats } = require('../utils/database');
const { getConfig } = require('../utils/config');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('suggestionmanage')
		.setDescription('Manage suggestions')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addSubcommand(subcommand =>
			subcommand
				.setName('status')
				.setDescription('Update suggestion status')
				.addStringOption(option =>
					option.setName('id')
						.setDescription('Suggestion ID')
						.setRequired(true))
				.addStringOption(option =>
					option.setName('status')
						.setDescription('New status')
						.setRequired(true)
						.addChoices(
							{ name: '✅ Approved', value: 'APPROVED' },
							{ name: '❌ Denied', value: 'DENIED' },
							{ name: '🚧 In Progress', value: 'IN_PROGRESS' },
							{ name: '✨ Implemented', value: 'IMPLEMENTED' },
							{ name: '⏳ Pending', value: 'PENDING' },
							{ name: '⏸️ On Hold', value: 'ON_HOLD' }
						))
				.addStringOption(option =>
					option.setName('reason')
						.setDescription('Reason for status change')
						.setRequired(false))
				.addBooleanOption(option =>
					option.setName('notify')
						.setDescription('Notify the suggestion author')
						.setRequired(false)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('transfer')
				.setDescription('Transfer suggestion to another channel')
				.addStringOption(option =>
					option.setName('id')
						.setDescription('Suggestion ID')
						.setRequired(true))
				.addChannelOption(option =>
					option.setName('channel')
						.setDescription('Target channel')
						.setRequired(true)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('merge')
				.setDescription('Merge multiple suggestions')
				.addStringOption(option =>
					option.setName('ids')
						.setDescription('Suggestion IDs (comma-separated)')
						.setRequired(true))
				.addStringOption(option =>
					option.setName('reason')
						.setDescription('Reason for merging')
						.setRequired(false))),

	async execute(interaction, client) {
		try {
			const subcommand = interaction.options.getSubcommand();
			const config = await getConfig(interaction.guildId);

			switch (subcommand) {
				case 'status':
					await handleStatusUpdate(interaction, client, config);
					break;
				case 'transfer':
					await handleTransfer(interaction, client, config);
					break;
				case 'merge':
					await handleMerge(interaction, client, config);
					break;
			}
		} catch (error) {
			console.error('Suggestion Management Error:', error);
			await interaction.reply({
				content: '❌ An error occurred while managing the suggestion.',
				flags: MessageFlags.Ephemeral
			});
		}
	}
};

async function handleStatusUpdate(interaction, client, config) {
	const suggestionId = interaction.options.getString('id');
	const newStatus = interaction.options.getString('status');
	const reason = interaction.options.getString('reason') || 'No reason provided';
	const notify = interaction.options.getBoolean('notify') ?? true;

	const suggestion = await getSuggestion(suggestionId);
	if (!suggestion) {
		return interaction.reply({
			content: '❌ Suggestion not found.',
			flags: MessageFlags.Ephemeral
		});
	}

	// Parse votes safely
	let votes = { up: 0, neutral: 0, down: 0 };
	try {
		votes = JSON.parse(suggestion.votes || '{}');
		if (typeof votes !== 'object') votes = { up: 0, neutral: 0, down: 0 };
	} catch (err) {
		console.warn('Failed to parse votes JSON:', err);
	}

	const statusColors = {
		APPROVED: 0x2ecc71,
		DENIED: 0xe74c3c,
		IN_PROGRESS: 0x3498db,
		IMPLEMENTED: 0xf1c40f,
		PENDING: 0x95a5a6,
		ON_HOLD: 0xe67e22
	};

	const embed = new EmbedBuilder()
		.setTitle(`Suggestion #${suggestionId}`)
		.setDescription(suggestion.content)
		.addFields([
			{ name: '📋 Category', value: `\`${suggestion.category?.toUpperCase() || 'N/A'}\``, inline: true },
			{ name: '🎯 Priority', value: `\`${suggestion.priority?.toUpperCase() || 'N/A'}\``, inline: true },
			{ name: '📊 Status', value: `\`${newStatus}\``, inline: true },
			{ name: '💬 Reason', value: reason, inline: false },
			{
				name: '📈 Statistics',
				value: `\`\`\`\n👍 ${votes.up || 0} | 🤔 ${votes.neutral || 0} | 👎 ${votes.down || 0}\n\`\`\``,
				inline: false
			}
		])
		.setColor(statusColors[newStatus])
		.setTimestamp()
		.setFooter({
			text: `Powered by Trenny Development © 2024 • Updated by ${interaction.user.tag}`,
			iconURL: interaction.user.displayAvatarURL()
		});

	if (suggestion.attachment) {
		embed.setImage(suggestion.attachment);
	}

	const channel = await client.channels.fetch(suggestion.channelId);
	const message = await channel.messages.fetch(suggestion.messageId);
	await message.edit({ embeds: [embed] });

	await updateSuggestion(suggestionId, {
		status: newStatus,
		lastUpdateBy: interaction.user.id,
		lastUpdateReason: reason,
		lastUpdateTime: Date.now()
	});

	if (notify && !suggestion.anonymous) {
		try {
			const author = await client.users.fetch(suggestion.userId);
			await author.send({
				embeds: [
					new EmbedBuilder()
						.setTitle('Suggestion Status Updated')
						.setDescription(`Your suggestion #${suggestionId} has been updated!`)
						.addFields([
							{ name: 'New Status', value: newStatus, inline: true },
							{ name: 'Reason', value: reason, inline: true }
						])
						.setColor(statusColors[newStatus])
						.setTimestamp()
				]
			});
		} catch (error) {
			console.error('Failed to notify suggestion author:', error);
		}
	}

	await interaction.reply({
		content: `✅ Successfully updated suggestion #${suggestionId} to ${newStatus}`,
		flags: MessageFlags.Ephemeral
	});
}

// Stub handlers if not implemented yet
async function handleTransfer(interaction, client, config) {
	await interaction.reply({
		content: '🚧 Transfer functionality is not implemented yet.',
		flags: MessageFlags.Ephemeral
	});
}

async function handleMerge(interaction, client, config) {
	await interaction.reply({
		content: '🚧 Merge functionality is not implemented yet.',
		flags: MessageFlags.Ephemeral
	});
}
