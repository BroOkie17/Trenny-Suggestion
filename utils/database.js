const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db;

function initDB() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(path.join(__dirname, '../data/suggestions.db'), async (err) => {
            if (err) {
                reject(err);
                return;
            }

            try {
                await createTables();
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
}

function createTables() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS suggestions (
                id TEXT PRIMARY KEY,
                guildId TEXT,
                userId TEXT,
                messageId TEXT,
                channelId TEXT,
                content TEXT,
                category TEXT,
                priority TEXT,
                anonymous INTEGER,
                attachment TEXT,
                status TEXT,
                votes TEXT,
                timestamp INTEGER,
                lastUpdateBy TEXT,
                lastUpdateReason TEXT,
                lastUpdateTime INTEGER
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS votes (
                suggestionId TEXT,
                userId TEXT,
                voteType TEXT,
                timestamp INTEGER,
                PRIMARY KEY (suggestionId, userId)
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                commandName TEXT,
                userId TEXT,
                guildId TEXT,
                timestamp INTEGER,
                success INTEGER
            )`);
        });
        resolve();
    });
}

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Core functions
function addSuggestion(data) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`
            INSERT INTO suggestions (
                id, guildId, userId, messageId, channelId, content,
                category, priority, anonymous, attachment, status, votes,
                timestamp, lastUpdateBy, lastUpdateReason, lastUpdateTime
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        stmt.run(
            data.id, data.guildId, data.userId, data.messageId, data.channelId,
            data.content, data.category, data.priority, data.anonymous ? 1 : 0,
            data.attachment, data.status, JSON.stringify(data.votes), data.timestamp,
            data.lastUpdateBy || null, data.lastUpdateReason || null, data.lastUpdateTime || null,
            function(err) {
                stmt.finalize();
                if (err) reject(err);
                else resolve(data.id);
            }
        );
    });
}

function getGuildStats(guildId, userId = null) {
    const query = userId
        ? `SELECT COUNT(*) as count FROM suggestions WHERE guildId = ? AND userId = ? AND timestamp > ?`
        : `SELECT COUNT(*) as count FROM suggestions WHERE guildId = ?`;

    const params = userId
        ? [guildId, userId, Date.now() - 24 * 60 * 60 * 1000]
        : [guildId];

    return dbGet(query, params).then(row => ({
        suggestionCount: row ? row.count : 0
    }));
}

function getLastUserSuggestion(guildId, userId) {
    return dbGet(`
        SELECT * FROM suggestions 
        WHERE guildId = ? AND userId = ? 
        ORDER BY timestamp DESC LIMIT 1
    `, [guildId, userId]);
}

function updateSuggestion(id, data) {
    const updates = Object.entries(data)
        .map(([key]) => `${key} = ?`).join(', ');
    return dbRun(`UPDATE suggestions SET ${updates} WHERE id = ?`, [...Object.values(data), id]);
}

function getSuggestionById(id) {
    return dbGet('SELECT * FROM suggestions WHERE id = ?', [id]);
}

function getUserSuggestions(guildId, userId) {
    return dbAll(
        'SELECT * FROM suggestions WHERE guildId = ? AND userId = ? ORDER BY timestamp DESC',
        [guildId, userId]
    );
}

// ✅ User Stats Function
async function getUserStats(guildId, userId) {
    const rows = await dbAll(`SELECT * FROM suggestions WHERE guildId = ? AND userId = ?`, [guildId, userId]);
    const total = rows.length;
    const approved = rows.filter(r => r.status === 'APPROVED').length;
    const implemented = rows.filter(r => r.status === 'IMPLEMENTED').length;
    const contributionScore = approved * 2 + implemented * 3;

    let voteCount = 0;
    let voteSum = 0;
    const categoryMap = {};
    const recentActivity = [];

    rows.forEach(r => {
        const votes = JSON.parse(r.votes || '{}');
        const up = votes.up || 0;
        const down = votes.down || 0;
        const neutral = votes.neutral || 0;
        const totalVotes = up + down + neutral;

        voteSum += totalVotes;
        voteCount += 1;

        categoryMap[r.category] = (categoryMap[r.category] || 0) + 1;

        recentActivity.push({
            action: `#${r.id} - ${r.status}`,
            timestamp: r.timestamp
        });
    });

    const topCategories = Object.entries(categoryMap)
        .sort((a, b) => b[1] - a[1])
        .map(c => `${c[0]} (${c[1]})`);

    return {
        total,
        approved,
        implemented,
        successRate: total > 0 ? (approved + implemented) / total : 0,
        averageVotes: voteCount > 0 ? voteSum / voteCount : 0,
        contributionScore,
        topCategories,
        recentActivity: recentActivity.slice(0, 5)
    };
}

// ✅ Category Stats
async function getSuggestionStats(guildId, groupBy = 'category') {
    const rows = await dbAll(`SELECT ${groupBy}, status FROM suggestions WHERE guildId = ?`, [guildId]);
    const stats = {};

    rows.forEach(r => {
        const key = r[groupBy] || 'Uncategorized';
        if (!stats[key]) {
            stats[key] = { total: 0, approved: 0 };
        }
        stats[key].total++;
        if (r.status === 'APPROVED') stats[key].approved++;
    });

    return {
        categories: Object.entries(stats).map(([name, value]) => ({
            name,
            total: value.total,
            approvalRate: value.total > 0 ? value.approved / value.total : 0
        }))
    };
}

function getTopContributors(guildId, limit = 10) {
    return dbAll(`
        SELECT 
            userId,
            COUNT(*) as total_suggestions,
            SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = 'IMPLEMENTED' THEN 1 ELSE 0 END) as implemented
        FROM suggestions
        WHERE guildId = ?
        GROUP BY userId
        ORDER BY total_suggestions DESC
        LIMIT ?
    `, [guildId, limit]);
}

function getSuggestionTrends(guildId) {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return dbAll(`
        SELECT 
            date(timestamp/1000, 'unixepoch') as date,
            COUNT(*) as count,
            category
        FROM suggestions
        WHERE guildId = ? AND timestamp >= ?
        GROUP BY date, category
        ORDER BY date DESC
    `, [guildId, thirtyDaysAgo]);
}

module.exports = {
    initDB,
    addSuggestion,
    getGuildStats,
    dbGet,
    dbRun,
    dbAll,
    getLastUserSuggestion,
    updateSuggestion,
    getSuggestionById,
    getUserSuggestions,
    getUserStats,
    getSuggestionStats,
    getTopContributors,
    getSuggestionTrends,
    db
};
