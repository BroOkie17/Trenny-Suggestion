const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { setConfig } = require('../utils/config');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('suggestionconfig')
		.setDescription('Configure suggestion system')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addChannelOption(opt => opt.setName('channel').setDescription('Suggestion channel').setRequired(true))
		.addStringOption(opt => opt.setName('color').setDescription('Embed color HEX').setRequired(false))
		.addStringOption(opt => opt.setName('categories').setDescription('Comma-separated categories').setRequired(false))
		.addBooleanOption(opt => opt.setName('anonymous').setDescription('Allow anonymous suggestions').setRequired(false))
		.addRoleOption(opt => 
			opt.setName('manager_role')
				.setDescription('Role that can manage suggestions')
				.setRequired(false))
		.addRoleOption(opt =>
			opt.setName('suggestion_role')
				.setDescription('Role required to make suggestions')
				.setRequired(false))
		.addIntegerOption(opt =>
			opt.setName('cooldown')
				.setDescription('Cooldown between suggestions (minutes)')
				.setMinValue(0)
				.setMaxValue(1440))
		.addStringOption(opt =>
			opt.setName('auto_archive')
				.setDescription('Auto-archive suggestions after X days')
				.addChoices(
					{ name: 'Never', value: 'never' },
					{ name: '7 days', value: '7' },
					{ name: '14 days', value: '14' },
					{ name: '30 days', value: '30' }
				))
		.addBooleanOption(opt =>
			opt.setName('dm_notifications')
				.setDescription('Send DM notifications for suggestion updates'))
		.addStringOption(opt =>
			opt.setName('embed_template')
				.setDescription('Custom embed template (JSON)')),

	async execute(interaction) {
		const channel = interaction.options.getChannel('channel');
		const color = interaction.options.getString('color');
		const categories = interaction.options.getString('categories');
		const anonymous = interaction.options.getBoolean('anonymous');
		const managerRole = interaction.options.getRole('manager_role');
		const suggestionRole = interaction.options.getRole('suggestion_role');
		const cooldown = interaction.options.getInteger('cooldown');
		const autoArchive = interaction.options.getString('auto_archive');
		const dmNotifications = interaction.options.getBoolean('dm_notifications');
		const embedTemplate = interaction.options.getString('embed_template');

		// Validate embed template if provided
		if (embedTemplate) {
			try {
				JSON.parse(embedTemplate);
			} catch (error) {
				return interaction.reply({
					content: '❌ Invalid embed template JSON format',
					ephemeral: true
				});
			}
		}

		// Advanced configuration validation
		const configValidation = await validateConfig({
			channel,
			color,
			categories,
			managerRole,
			suggestionRole,
			cooldown,
			autoArchive
		});

		if (!configValidation.valid) {
			return interaction.reply({
				content: `❌ Configuration error: ${configValidation.reason}`,
				ephemeral: true
			});
		}

		// Save extended configuration
		await setConfig(interaction.guildId, {
			suggestionChannel: channel.id,
			embedColor: color ? parseInt(color.replace('#', ''), 16) : undefined,
			categories: categories ? categories.split(',').map(c => c.trim()) : undefined,
			allowAnonymous: anonymous,
			managerRoleId: managerRole?.id,
			suggestionRoleId: suggestionRole?.id,
			cooldownMinutes: cooldown,
			autoArchiveDays: autoArchive === 'never' ? null : parseInt(autoArchive),
			dmNotifications: dmNotifications,
			embedTemplate: embedTemplate ? JSON.parse(embedTemplate) : null,
			lastUpdated: Date.now(),
			updatedBy: interaction.user.id
		});

		// Create detailed embed response
		const detailedEmbed = new EmbedBuilder()
			.setTitle('✅ Suggestion System Configured')
			.setColor(color ? parseInt(color.replace('#', ''), 16) : 0x1abc9c)
			.setDescription('Configuration has been updated successfully!')
			.addFields([
				{ 
					name: 'Basic Settings',
					value: [
						`📝 Channel: <#${channel.id}>`,
						`🎨 Color: ${color || 'Default'}`,
						`📑 Categories: ${categories || 'General'}`,
						`🎭 Anonymous: ${anonymous ? 'Allowed' : 'Not allowed'}`
					].join('\n'),
					inline: false
				},
				{
					name: 'Role Settings',
					value: [
						`👮 Manager Role: ${managerRole ? `<@&${managerRole.id}>` : 'Not set'}`,
						`👥 Suggestion Role: ${suggestionRole ? `<@&${suggestionRole.id}>` : 'Not set'}`
					].join('\n'),
					inline: false
				},
				{
					name: 'Advanced Settings',
					value: [
						`⏱️ Cooldown: ${cooldown ? `${cooldown} minutes` : 'No cooldown'}`,
						`📦 Auto-archive: ${autoArchive === 'never' ? 'Disabled' : `${autoArchive} days`}`,
						`📨 DM Notifications: ${dmNotifications ? 'Enabled' : 'Disabled'}`,
						`📝 Custom Template: ${embedTemplate ? 'Set' : 'Default'}`
					].join('\n'),
					inline: false
				}
			])
			.setFooter({ 
				text: `Powered by Trenny Development © 2024 • Updated by ${interaction.user.tag}`,
				iconURL: interaction.user.displayAvatarURL()
			})
			.setTimestamp();

		await interaction.reply({ embeds: [detailedEmbed], ephemeral: true });

		// Log configuration change
		const logChannel = await interaction.guild.channels.fetch(process.env.LOG_CHANNEL).catch(() => null);
		if (logChannel) {
			await logChannel.send({
				embeds: [
					new EmbedBuilder()
						.setTitle('Suggestion System Configuration Updated')
						.setDescription(`Configuration updated by ${interaction.user.tag}`)
						.setColor(0x2ecc71)
						.setTimestamp()
				]
			});
		}
	}
};

// Configuration validation helper
async function validateConfig(config) {
	const { channel, color, categories, managerRole, suggestionRole, cooldown, autoArchive } = config;

	if (!channel.permissionsFor(channel.guild.members.me).has(['SendMessages', 'EmbedLinks'])) {
		return { valid: false, reason: 'Bot missing required permissions in suggestion channel' };
	}

	if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
		return { valid: false, reason: 'Invalid color format. Use HEX (e.g., #FF0000)' };
	}

	if (categories) {
		const categoryList = categories.split(',').map(c => c.trim());
		if (categoryList.some(c => c.length > 32)) {
			return { valid: false, reason: 'Category names must be 32 characters or less' };
		}
	}

	return { valid: true };
}
