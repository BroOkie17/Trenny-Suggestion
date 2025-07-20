const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addSuggestion, getGuildStats, dbGet } = require('../utils/database');
const { getConfig } = require('../utils/config');
const { generateSuggestionId } = require('../utils/helpers');

// Add default colors
const defaultColors = {
	feature: 0x2ecc71,
	bug: 0xe74c3c,
	improvement: 0x3498db,
	other: 0x95a5a6
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName('suggest')
		.setDescription('Submit a suggestion')
		.addStringOption(opt => 
			opt.setName('suggestion')
				.setDescription('Your suggestion')
				.setRequired(true)
				.setMaxLength(2000))
		.addStringOption(opt => 
			opt.setName('category')
				.setDescription('Suggestion category')
				.setRequired(false)
				.addChoices(
					{ name: 'Feature Request', value: 'feature' },
					{ name: 'Bug Report', value: 'bug' },
					{ name: 'Improvement', value: 'improvement' },
					{ name: 'Other', value: 'other' }
				))
		.addAttachmentOption(opt => 
			opt.setName('attachment')
				.setDescription('Add an image or file')
				.setRequired(false))
		.addBooleanOption(opt => 
			opt.setName('anonymous')
				.setDescription('Submit anonymously')
				.setRequired(false))
		.addStringOption(opt => 
			opt.setName('priority')
				.setDescription('Suggestion priority')
				.addChoices(
					{ name: 'Low', value: 'low' },
					{ name: 'Medium', value: 'medium' },
					{ name: 'High', value: 'high' }
				)),

	async execute(interaction, client) {
		try {
			const config = await getConfig(interaction.guildId);
			if (!config.suggestionChannel) {
				return interaction.reply({
					content: '❌ Suggestion channel not configured. Please contact an administrator.',
					ephemeral: true
				});
			}

			const suggestion = interaction.options.getString('suggestion');
			const category = interaction.options.getString('category') || 'other';
			const attachment = interaction.options.getAttachment('attachment');
			const anonymous = interaction.options.getBoolean('anonymous') || false;
			const priority = interaction.options.getString('priority') || 'medium';

			// Rate limiting check
			const userStats = await getGuildStats(interaction.guildId, interaction.user.id);
			if (userStats.suggestionCount >= config.maxSuggestionsPerDay) {
				return interaction.reply({
					content: `❌ You've reached the maximum suggestions limit (${config.maxSuggestionsPerDay}) for today.`,
					ephemeral: true
				});
			}

			// Advanced suggestion formatting
			const formattedSuggestion = await formatSuggestion(suggestion);
			
			// Content moderation check
			const moderationResult = await checkContentModeration(formattedSuggestion);
			if (!moderationResult.allowed) {
				return interaction.reply({
					content: `❌ Suggestion rejected: ${moderationResult.reason}`,
					ephemeral: true
				});
			}

			// Check user permissions and roles
			if (config.suggestionRoleId) {
				const hasRole = interaction.member.roles.cache.has(config.suggestionRoleId);
				if (!hasRole) {
					return interaction.reply({
						content: '❌ You need the required role to make suggestions.',
						ephemeral: true
					});
				}
			}

			// Check cooldown
			if (config.cooldownMinutes) {
				const lastSuggestion = await getLastUserSuggestion(interaction.guildId, interaction.user.id);
				if (lastSuggestion) {
					const timeDiff = Date.now() - lastSuggestion.timestamp;
					const cooldownMs = config.cooldownMinutes * 60 * 1000;
					if (timeDiff < cooldownMs) {
						const timeLeft = Math.ceil((cooldownMs - timeDiff) / 1000 / 60);
						return interaction.reply({
							content: `⏳ Please wait ${timeLeft} minutes before making another suggestion.`,
							ephemeral: true
						});
					}
				}
			}

			const suggestionId = generateSuggestionId();
			const embed = new EmbedBuilder()
				.setTitle(`💡 New Suggestion #${suggestionId}`)
				.setDescription(formattedSuggestion)
				.addFields([
					{ name: '📋 Category', value: `\`${category.toUpperCase()}\``, inline: true },
					{ name: '🎯 Priority', value: `\`${priority.toUpperCase()}\``, inline: true },
					{ name: '📊 Status', value: '`PENDING`', inline: true },
					{ name: '📈 Statistics', value: '```\n👍 0 | 🤔 0 | 👎 0\n```', inline: false }
				])
				.setColor(config.colors?.[category] || defaultColors[category] || 0x7289da)
				.setTimestamp();

			if (!anonymous) {
				embed.setAuthor({
					name: interaction.user.tag,
					iconURL: interaction.user.displayAvatarURL()
				});
			}

			if (attachment && attachment.contentType.startsWith('image/')) {
				embed.setImage(attachment.url);
			}

			embed.setFooter({
				text: `Powered by Trenny Development © 2024 • ID: ${suggestionId}`,
				iconURL: client.user.displayAvatarURL()
			});

			const buttons = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setCustomId(`upvote_${suggestionId}`)
					.setLabel('Upvote')
					.setEmoji('👍')
					.setStyle(ButtonStyle.Primary),
				new ButtonBuilder()
					.setCustomId(`neutral_${suggestionId}`)
					.setLabel('Neutral')
					.setEmoji('🤔')
					.setStyle(ButtonStyle.Secondary),
				new ButtonBuilder()
					.setCustomId(`downvote_${suggestionId}`)
					.setLabel('Downvote')
					.setEmoji('👎')
					.setStyle(ButtonStyle.Primary)
			);

			const channel = await client.channels.fetch(config.suggestionChannel);
			const msg = await channel.send({
				embeds: [embed],
				components: [buttons]
			});

			await addSuggestion({
				id: suggestionId,
				guildId: interaction.guildId,
				userId: interaction.user.id,
				messageId: msg.id,
				channelId: channel.id,
				content: suggestion,
				category,
				priority,
				anonymous,
				attachment: attachment ? attachment.url : null,
				status: 'PENDING',
				votes: {
					up: 0,
					neutral: 0,
					down: 0
				},
				timestamp: Date.now()
			});

			return interaction.reply({
				content: `✅ Your suggestion has been submitted! ID: \`${suggestionId}\``,
				ephemeral: true
			});

		} catch (error) {
			console.error('Suggestion Command Error:', error);
			return interaction.reply({
				content: '❌ An error occurred while processing your suggestion. Please try again later.',
				ephemeral: true
			});
		}
	}
};

async function formatSuggestion(content) {
    // Remove excessive newlines
    content = content.replace(/\n{3,}/g, '\n\n');
    
    // Capitalize first letter of sentences
    content = content.replace(/(^\w|\.\s+\w)/g, letter => letter.toUpperCase());
    
    // Format code blocks properly
    content = content.replace(/```(\w+)?\n?(.*?)\n?```/gs, (_, lang, code) => {
        return `\`\`\`${lang || ''}\n${code.trim()}\n\`\`\``;
    });
    
    return content;
}

async function checkContentModeration(content) {
    // Basic content moderation rules
    const rules = {
        minLength: 10,
        maxLength: 2000,
        bannedWords: ['spam', 'test', 'advertisement'],
        urlLimit: 3,
        mentionLimit: 3
    };

    if (content.length < rules.minLength) {
        return { allowed: false, reason: 'Suggestion is too short' };
    }

    if (content.length > rules.maxLength) {
        return { allowed: false, reason: 'Suggestion is too long' };
    }

    const urlCount = (content.match(/https?:\/\/[^\s]+/g) || []).length;
    if (urlCount > rules.urlLimit) {
        return { allowed: false, reason: 'Too many URLs' };
    }

    const mentionCount = (content.match(/<@!?\d+>/g) || []).length;
    if (mentionCount > rules.mentionLimit) {
        return { allowed: false, reason: 'Too many mentions' };
    }

    const containsBannedWords = rules.bannedWords.some(word => 
        content.toLowerCase().includes(word)
    );
    if (containsBannedWords) {
        return { allowed: false, reason: 'Contains inappropriate content' };
    }

    return { allowed: true };
}

async function getLastUserSuggestion(guildId, userId) {
    try {
        return await dbGet(`
            SELECT * FROM suggestions 
            WHERE guildId = ? AND userId = ? 
            ORDER BY timestamp DESC 
            LIMIT 1
        `, [guildId, userId]);
    } catch (error) {
        console.error('Database Error:', error);
        return null;
    }
}

// Error handling wrapper
process.on('unhandledRejection', (error) => {
	console.error('Unhandled promise rejection in suggest.js:', error);
});
