# 🤖 Advanced Suggestion Bot

<div align="center">

![Discord](https://img.shields.io/badge/Discord-7289DA?style=for-the-badge&logo=discord&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)

**A powerful, feature-rich Discord bot for managing suggestions with advanced analytics and moderation**

[Join Trenny Development](https://discord.gg/trennydev) | [Support](https://discord.gg/trennydev) | [Documentation](#documentation)

</div>

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🎯 How It Works](#-how-it-works)
- [🚀 Quick Start](#-quick-start)  
- [⚙️ Configuration](#️-configuration)
- [📚 Commands](#-commands)
- [🛠️ Advanced Setup](#️-advanced-setup)
- [📊 Analytics & Stats](#-analytics--stats)
- [🔒 Security Features](#-security-features)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [👥 Credits](#-credits)

---

## ✨ Features

### 🎯 **Core Functionality**
- **Slash Command Integration** - Modern Discord slash commands for seamless user experience
- **Smart Categorization** - Organize suggestions by Feature Requests, Bug Reports, Improvements, or Other
- **Priority System** - Assign Low, Medium, or High priority levels to suggestions
- **Anonymous Submissions** - Allow users to submit suggestions anonymously
- **File Attachments** - Support for images and files to enhance suggestion details

### 📊 **Advanced Analytics**
- **Real-time Statistics** - Track total, approved, denied, and pending suggestions
- **Visual Charts** - Beautiful chart generation using Chart.js for data visualization  
- **Guild-specific Metrics** - Separate analytics for each Discord server
- **Historical Data** - Complete suggestion history with timestamps and status changes

### 🛡️ **Moderation & Management**
- **Auto-moderation** - Built-in content filtering and spam protection
- **Rate Limiting** - Prevent spam with intelligent cooldown systems
- **Suggestion Management** - Easy approve/deny system with staff controls
- **Custom Configuration** - Per-guild settings for channels, roles, and permissions

### 🔧 **Technical Excellence**
- **SQLite Database** - Reliable local data storage with efficient queries
- **Error Handling** - Comprehensive error logging and webhook notifications
- **Caching System** - Smart caching for improved performance
- **Modular Architecture** - Clean, maintainable code structure

---

## 🎯 How It Works

### 1. **Suggestion Submission**
Users submit suggestions using the `/suggest` command with options for:
- Detailed description (up to 2000 characters)
- Category selection (Feature/Bug/Improvement/Other)
- Priority level assignment
- File attachments for visual context
- Anonymous submission option

### 2. **Automatic Processing**
The bot automatically:
- Generates unique suggestion IDs
- Applies content moderation filters
- Checks rate limits to prevent spam
- Stores data in SQLite database
- Posts formatted suggestion embeds

### 3. **Management System**
Staff can:
- Review suggestions with interactive buttons
- Approve or deny with reason tracking
- View comprehensive statistics and analytics  
- Configure bot settings per server
- Access suggestion history and reports

### 4. **Analytics Dashboard**
Advanced statistics include:
- Visual charts showing suggestion trends
- Category breakdown analysis
- User engagement metrics
- Historical performance data

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v16.9.0 or higher
- **Discord Bot Token** (from Discord Developer Portal)
- **npm** or **yarn** package manager

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-repo/suggestion-bot.git
   cd suggestion-bot
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   ERROR_WEBHOOK=your_error_webhook_url_here
   ```

4. **Deploy Commands**
   ```bash
   node deploy-commands.js
   ```

5. **Start the Bot**
   ```bash
   node index.js
   ```

### Docker Installation (Alternative)
```bash
docker build -t suggestion-bot .
docker run -d --env-file .env suggestion-bot
```

---

## ⚙️ Configuration

### Basic Setup
Use `/suggestionconfig` to configure:
- **Suggestion Channel** - Where suggestions are posted
- **Staff Role** - Who can manage suggestions  
- **Log Channel** - For audit logs and notifications
- **Auto-approval** - Automatic approval settings

### Advanced Configuration
Edit configuration files in `/data/`:
- `config.json` - Main bot configuration
- `filters.json` - Content moderation rules
- `permissions.json` - Role-based permissions

---

## 📚 Commands

### User Commands
| Command | Description | Usage |
|---------|-------------|-------|
| `/suggest` | Submit a new suggestion | `/suggest suggestion:Your idea category:feature` |
| `/suggestionstatus` | Check status of your suggestion | `/suggestionstatus id:123` |
| `/suggestionhistory` | View your suggestion history | `/suggestionhistory` |
| `/help` | Display help information | `/help` |

### Staff Commands  
| Command | Description | Usage |
|---------|-------------|-------|
| `/suggestionmanage` | Approve/deny suggestions | `/suggestionmanage id:123 action:approve` |
| `/suggestionstats` | View detailed statistics | `/suggestionstats` |
| `/suggestionconfig` | Configure bot settings | `/suggestionconfig` |

### Admin Commands
| Command | Description | Usage |
|---------|-------------|-------|
| `/suggestionstats` | Advanced analytics dashboard | `/suggestionstats type:advanced` |

---

## 🛠️ Advanced Setup

### Custom Themes
Modify suggestion embed colors in `/utils/config.js`:
```javascript
const colors = {
    feature: 0x2ecc71,    // Green
    bug: 0xe74c3c,        // Red  
    improvement: 0x3498db, // Blue
    other: 0x95a5a6       // Gray
};
```

### Webhook Integration
Set up error webhooks for real-time monitoring:
```env
ERROR_WEBHOOK=https://discord.com/api/webhooks/your_webhook_url
```

### Database Optimization
For high-traffic servers, consider:
- Regular database cleanup scripts
- Index optimization for faster queries
- Backup automation systems

---

## 📊 Analytics & Stats

### Visual Charts
The bot generates beautiful charts showing:
- **Suggestion Trends** - Timeline of submissions
- **Category Distribution** - Pie charts of suggestion types
- **Approval Rates** - Success/rejection ratios
- **User Activity** - Top contributors

### Metrics Tracked
- Total suggestions submitted
- Approval/denial rates  
- Average response time
- Popular categories
- User engagement levels
- Peak activity periods

---

## 🔒 Security Features

### Content Moderation
- **Automated Filtering** - Blocks inappropriate content
- **Spam Detection** - Prevents duplicate submissions
- **Rate Limiting** - Protects against abuse

### Data Protection  
- **Local Storage** - Data stays on your server
- **Encrypted Tokens** - Secure credential management
- **Audit Logging** - Complete action history

### Permission System
- **Role-based Access** - Granular permission control
- **Staff-only Commands** - Protected management functions
- **Anonymous Safety** - Secure anonymous submissions

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes  
4. Add tests if applicable
5. Submit a pull request

### Code Style
- Use ESLint configuration provided
- Follow JavaScript Standard Style
- Write descriptive commit messages
- Document new features

---

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Credits

### 🏢 **Developed by Trenny Development**

<div align="center">

**All credits belong to [Trenny Development](https://discord.gg/trennydev)**

[![Discord](https://img.shields.io/badge/Join%20Now-Trenny%20Development-7289DA?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/trennydev)

*Join our community for support, updates, and exclusive content!*

</div>

### Special Thanks
- Discord.js community for excellent documentation
- Chart.js team for visualization capabilities  
- SQLite team for reliable database engine
- All beta testers and contributors

### Support & Community
- 💬 **Discord Support**: [discord.gg/trennydev](https://discord.gg/trennydev)
- 📧 **Contact**: Join our Discord for direct support
- 🐛 **Bug Reports**: Submit issues in our Discord server
- 💡 **Feature Requests**: Share ideas in our community

---

<div align="center">

### 🌟 **Star this project if you found it helpful!**

**Made with ❤️ by [Trenny Development](https://discord.gg/trennydev)**

[![Discord](https://img.shields.io/badge/Join%20Our%20Community-7289DA?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/trennydev)

</div>

---

*© 2024 Trenny Development. All rights reserved.*
