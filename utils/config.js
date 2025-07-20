const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../data/config.json');

function ensureConfigFile() {
    if (!fs.existsSync(path.dirname(configPath))) {
        fs.mkdirSync(path.dirname(configPath), { recursive: true });
    }
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, '{}');
    }
}

async function getConfig(guildId) {
    ensureConfigFile();
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config[guildId] || {};
}

async function setConfig(guildId, data) {
    ensureConfigFile();
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config[guildId] = { ...config[guildId], ...data };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

module.exports = { getConfig, setConfig };
