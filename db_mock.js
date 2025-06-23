let users = {}; // Store users by googleId: { googleId, email, name, trackedChannels: [channelId1, channelId2] }
let channels = {}; // Store channel details: { channelId, name, snapshots: [{date, subscribers, views}] }
let alertConditions = {}; // Store alert conditions by userId_channelId: { type, threshold }

// --- User Management (Mock) ---
const findOrCreateUser = (profile) => {
    if (!users[profile.sub]) {
        users[profile.sub] = {
            googleId: profile.sub,
            email: profile.email,
            name: profile.name,
            trackedChannels: []
        };
    }
    return users[profile.sub];
};

const getUserById = (googleId) => {
    return users[googleId];
};

const getAllUsers = () => {
    return Object.values(users);
}

// --- Tracked Channels (Mock) ---
const addTrackedChannel = (googleId, channelId, channelName) => {
    const user = getUserById(googleId);
    if (user && !user.trackedChannels.includes(channelId)) {
        user.trackedChannels.push(channelId);
        if (!channels[channelId]) {
            channels[channelId] = { channelId, name: channelName, snapshots: [] };
        }
        return true;
    }
    return false;
};

const getTrackedChannels = (googleId) => {
    const user = getUserById(googleId);
    if (user) {
        return user.trackedChannels.map(channelId => channels[channelId]).filter(ch => ch);
    }
    return [];
};

const removeTrackedChannel = (googleId, channelId) => {
    const user = getUserById(googleId);
    if (user) {
        user.trackedChannels = user.trackedChannels.filter(id => id !== channelId);
        // Optionally, clean up channel from `channels` if no one is tracking it anymore
        // For simplicity, we'll leave it for now.
        return true;
    }
    return false;
};

// --- Channel Snapshots (Mock) ---
const addChannelSnapshot = (channelId, snapshot) => {
    if (channels[channelId]) {
        channels[channelId].snapshots.push(snapshot); // snapshot = { date, subscribers, views }
        channels[channelId].snapshots.sort((a, b) => new Date(b.date) - new Date(a.date)); // Keep sorted
        return true;
    }
    return false;
};

const getChannelSnapshots = (channelId) => {
    return channels[channelId] ? channels[channelId].snapshots : [];
};

// --- Alert Conditions (Mock) ---
const setAlertCondition = (googleId, channelId, condition) => {
    // condition = { type: 'milestone' | 'percentage', threshold: number, lastNotified?: date }
    alertConditions[`${googleId}_${channelId}`] = condition;
    return true;
};

const getAlertCondition = (googleId, channelId) => {
    return alertConditions[`${googleId}_${channelId}`];
};

const getAllChannels = () => {
    return Object.values(channels);
}

export {
    findOrCreateUser,
    getUserById,
    addTrackedChannel,
    getTrackedChannels,
    removeTrackedChannel,
    addChannelSnapshot,
    getChannelSnapshots,
    setAlertCondition,
    getAlertCondition,
    getAllUsers,
    getAllChannels
};
