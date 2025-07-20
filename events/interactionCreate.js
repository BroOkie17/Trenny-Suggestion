const { Events, EmbedBuilder, MessageFlags } = require('discord.js');
const { dbGet, dbRun, dbAll } = require('../utils/database');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction, client) {
		try {
			if (interaction.isButton()) {
				await handleButtonInteraction(interaction);
				return;
			}

			if (!interaction.isChatInputCommand()) return;

			const command = client.commands.get(interaction.commandName);
			if (!command) return;

			// Cooldown handler
			const handleCooldown = async (interaction, command) => {
				const { cooldowns } = interaction.client;
				const now = Date.now();
				const cooldownAmount = (command.cooldown || 3) * 1000;

				if (cooldowns.has(interaction.user.id)) {
					const expirationTime = cooldowns.get(interaction.user.id) + cooldownAmount;
					if (now < expirationTime) {
						const timeLeft = (expirationTime - now) / 1000;
						return `Please wait ${timeLeft.toFixed(1)} seconds before using this command again.`;
					}
				}

				cooldowns.set(interaction.user.id, now);
				setTimeout(() => cooldowns.delete(interaction.user.id), cooldownAmount);
				return null;
			};

			const cooldownMessage = await handleCooldown(interaction, command);
			if (cooldownMessage) {
				return interaction.reply({
					content: cooldownMessage,
					flags: MessageFlags.Ephemeral
				});
			}

			await command.execute(interaction, client);

			// Optional: usage tracking (safe)
			try {
				// await trackCommandUsage(interaction);
			} catch (err) {
				console.warn('Failed to track usage:', err.message);
			}

		} catch (error) {
			console.error('Interaction Error:', error);
			const errorReply = {
				content: 'An error occurred!',
				flags: MessageFlags.Ephemeral
			};

			if (interaction.replied || interaction.deferred) {
				await interaction.followUp(errorReply).catch(() => {});
			} else {
				await interaction.reply(errorReply).catch(() => {});
			}
		}
	}
};

async function handleButtonInteraction(interaction) {
	const [action, suggestionId] = interaction.customId.split('_');
	if (!['upvote', 'neutral', 'downvote'].includes(action)) return;

	try {
		// Get suggestion
		const suggestion = await dbGet('SELECT * FROM suggestions WHERE id = ?', [suggestionId]);
		if (!suggestion) {
			return interaction.reply({
				content: 'Suggestion not found!',
				flags: MessageFlags.Ephemeral
			});
		}

		// Check vote
		const existingVote = await dbGet(
			'SELECT voteType FROM votes WHERE suggestionId = ? AND userId = ?',
			[suggestionId, interaction.user.id]
		);

		if (existingVote) {
			if (existingVote.voteType === action) {
				await dbRun(
					'DELETE FROM votes WHERE suggestionId = ? AND userId = ?',
					[suggestionId, interaction.user.id]
				);
			} else {
				await dbRun(
					'UPDATE votes SET voteType = ?, timestamp = ? WHERE suggestionId = ? AND userId = ?',
					[action, Date.now(), suggestionId, interaction.user.id]
				);
			}
		} else {
			await dbRun(
				'INSERT INTO votes (suggestionId, userId, voteType, timestamp) VALUES (?, ?, ?, ?)',
				[suggestionId, interaction.user.id, action, Date.now()]
			);
		}

		const voteCounts = await dbAll(`
			SELECT voteType, COUNT(*) as count 
			FROM votes 
			WHERE suggestionId = ? 
			GROUP BY voteType
		`, [suggestionId]);

		const votes = { up: 0, neutral: 0, down: 0 };
		voteCounts.forEach(vote => {
			if (vote.voteType === 'upvote') votes.up = vote.count;
			if (vote.voteType === 'neutral') votes.neutral = vote.count;
			if (vote.voteType === 'downvote') votes.down = vote.count;
		});

		const message = await interaction.message.fetch();
		const embed = EmbedBuilder.from(message.embeds[0]);

		const statsFieldIndex = embed.data.fields.findIndex(f => f.name === '📈 Statistics');
		if (statsFieldIndex !== -1) {
			embed.data.fields[statsFieldIndex] = {
				name: '📈 Statistics',
				value: `\`\`\`\n👍 ${votes.up} | 🤔 ${votes.neutral} | 👎 ${votes.down}\n\`\`\``,
				inline: false
			};
		}

		console.log(`Vote updated for suggestion ID: ${suggestionId}`);

		embed.setFooter({
			text: `Made by Trenny Development • ID: ${suggestionId}`,
			iconURL: interaction.client.user.displayAvatarURL()
		});

		await message.edit({ embeds: [embed] });
		await interaction.deferUpdate();

	} catch (error) {
		console.error('Button Interaction Error:', error);
		if (!interaction.replied && !interaction.deferred) {
			await interaction.reply({
				content: 'An error occurred while processing your vote.',
				flags: MessageFlags.Ephemeral
			}).catch(() => {});
		}
	}
}
