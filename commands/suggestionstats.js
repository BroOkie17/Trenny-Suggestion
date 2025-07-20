const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getGuildStats, getUserStats, getSuggestionStats } = require('../utils/database');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const width = 800;
const height = 400;
const chartCanvas = new ChartJSNodeCanvas({ width, height });

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggestionstats')
        .setDescription('View suggestion statistics')
        .addSubcommand(subcommand =>
            subcommand
                .setName('server')
                .setDescription('View server-wide suggestion statistics')
                .addStringOption(option =>
                    option.setName('timeframe')
                        .setDescription('Statistics timeframe')
                        .addChoices(
                            { name: 'Today', value: 'today' },
                            { name: 'This Week', value: 'week' },
                            { name: 'This Month', value: 'month' },
                            { name: 'All Time', value: 'all' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('View user suggestion statistics')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('User to view stats for')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('category')
                .setDescription('View statistics by category')),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        const timeframe = interaction.options.getString('timeframe') || 'all';

        try {
            await interaction.deferReply();

            switch (subcommand) {
                case 'server':
                    await handleServerStats(interaction, timeframe);
                    break;
                case 'user':
                    await handleUserStats(interaction);
                    break;
                case 'category':
                    await handleCategoryStats(interaction);
                    break;
            }
        } catch (error) {
            console.error('Statistics Command Error:', error);
            if (!interaction.replied) {
                await interaction.editReply({
                    content: '❌ An error occurred while generating statistics.'
                });
            }
        }
    }
};

async function handleServerStats(interaction, timeframe) {
    const stats = await getGuildStats(interaction.guildId, timeframe);
    const chart = await generateStatsChart(stats);

    const embed = new EmbedBuilder()
        .setTitle('📊 Server Suggestion Statistics')
        .addFields([
            { name: 'Total Suggestions', value: `${stats.total}`, inline: true },
            { name: 'Approved', value: `${stats.approved}`, inline: true },
            { name: 'Implemented', value: `${stats.implemented}`, inline: true },
            { name: 'Average Rating', value: `${stats.averageRating?.toFixed(2) ?? '0.00'}⭐`, inline: true },
            { name: 'Most Active Category', value: stats.topCategory || 'N/A', inline: true },
            { name: 'Response Rate', value: `${((stats.responseRate ?? 0) * 100).toFixed(1)}%`, inline: true },
            { name: 'Implementation Rate', value: `${((stats.implementationRate ?? 0) * 100).toFixed(1)}%`, inline: false },
            { name: 'Trending Categories', value: stats.trendingCategories?.join(', ') || 'None', inline: false }
        ])
        .setImage('attachment://stats.png')
        .setColor(0x2ecc71)
        .setFooter({ text: `Powered by Trenny Development © 2024 • Statistics for: ${timeframe}` })
        .setTimestamp();

    const attachment = new AttachmentBuilder(chart, { name: 'stats.png' });
    await interaction.editReply({ embeds: [embed], files: [attachment] });
}

async function handleUserStats(interaction) {
    const target = interaction.options.getUser('target') || interaction.user;
    const stats = await getUserStats(interaction.guildId, target.id);

    const embed = new EmbedBuilder()
        .setTitle(`📊 Suggestion Statistics for ${target.tag}`)
        .setThumbnail(target.displayAvatarURL())
        .addFields([
            { name: 'Total Suggestions', value: `${stats.total}`, inline: true },
            { name: 'Approved Suggestions', value: `${stats.approved}`, inline: true },
            { name: 'Implemented Ideas', value: `${stats.implemented}`, inline: true },
            { name: 'Success Rate', value: `${((stats.successRate ?? 0) * 100).toFixed(1)}%`, inline: true },
            { name: 'Average Votes', value: `${stats.averageVotes?.toFixed(1) ?? '0.0'}`, inline: true },
            { name: 'Contribution Score', value: `${stats.contributionScore ?? 0}`, inline: true },
            { name: 'Top Categories', value: stats.topCategories?.join('\n') || 'N/A', inline: false },
            { name: 'Recent Activity', value: formatRecentActivity(stats.recentActivity || []), inline: false }
        ])
        .setColor(0x3498db)
        .setFooter({ text: 'Powered by Trenny Development © 2024' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleCategoryStats(interaction) {
    const stats = await getSuggestionStats(interaction.guildId, 'category');
    const chart = await generateCategoryChart(stats);

    const embed = new EmbedBuilder()
        .setTitle('📊 Category Statistics')
        .setDescription('Distribution of suggestions across categories')
        .addFields(
            stats.categories?.map(cat => ({
                name: cat.name,
                value: `Total: ${cat.total}\nApproval Rate: ${(cat.approvalRate * 100).toFixed(1)}%`,
                inline: true
            })) || []
        )
        .setImage('attachment://categories.png')
        .setColor(0x9b59b6)
        .setFooter({ text: 'Powered by Trenny Development © 2024' })
        .setTimestamp();

    const attachment = new AttachmentBuilder(chart, { name: 'categories.png' });
    await interaction.editReply({ embeds: [embed], files: [attachment] });
}

// Helpers
function formatRecentActivity(activity) {
    return activity.length
        ? activity.map(a => `• ${a.action} - ${new Date(a.timestamp).toLocaleDateString()}`).join('\n')
        : 'No recent activity.';
}

async function generateStatsChart(stats) {
    const configuration = {
        type: 'bar',
        data: {
            labels: ['Total', 'Approved', 'Implemented'],
            datasets: [{
                label: 'Suggestions',
                data: [stats.total, stats.approved, stats.implemented],
                backgroundColor: ['#3498db', '#2ecc71', '#f1c40f']
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            responsive: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    };
    return await chartCanvas.renderToBuffer(configuration);
}

async function generateCategoryChart(stats) {
    const configuration = {
        type: 'pie',
        data: {
            labels: stats.categories.map(cat => cat.name),
            datasets: [{
                data: stats.categories.map(cat => cat.total),
                backgroundColor: [
                    '#1abc9c', '#e67e22', '#9b59b6',
                    '#3498db', '#e74c3c', '#f39c12'
                ]
            }]
        },
        options: {
            responsive: false
        }
    };
    return await chartCanvas.renderToBuffer(configuration);
}
