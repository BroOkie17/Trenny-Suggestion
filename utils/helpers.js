const calculateProgress = (stats) => {
    // ...existing code...
};

const getTimeRemaining = (createdAt) => {
    // ...existing code...
};

const formatVotes = (stats) => {
    // ...existing code...
};

const formatSuggestionEmbed = (suggestion, stats) => {
    const progress = calculateProgress(stats);
    const timeLeft = getTimeRemaining(suggestion.createdAt);
    
    return {
        title: `Suggestion Status: ${progress}%`,
        fields: [
            { name: 'Time Remaining', value: timeLeft },
            { name: 'Current Votes', value: formatVotes(stats) }
        ]
    };
};

const validateSuggestion = (content) => {
    const minLength = 20;
    const maxLength = 1000;
    
    return {
        isValid: content.length >= minLength && content.length <= maxLength,
        reason: content.length < minLength ? 'Too short' : 
                content.length > maxLength ? 'Too long' : null
    };
};

function generateSuggestionId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

module.exports = {
    // ...existing code...
    formatSuggestionEmbed,
    validateSuggestion,
    generateSuggestionId
};