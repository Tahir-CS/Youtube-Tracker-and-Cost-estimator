// backend.js
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { 
    findOrCreateUser, 
    addTrackedChannel, 
    getTrackedChannels, 
    removeTrackedChannel,
    setAlertCondition,
    getAlertCondition,
    addChannelSnapshot,
    getChannelSnapshots,
    getAllUsers,
    getAllChannels
} from './db_mock.js';

dotenv.config(); // Load environment variables from .env file

const app = express();
app.use(express.json());

// --- CORS Setup for OAuth and Frontend ---
const allowedOrigins = [
  'http://localhost:5500', // Frontend
  'http://localhost:3001', // Backend (if needed for local testing)
  'http://127.0.0.1:5500', // Frontend (127.0.0.1 alternative)
  'http://127.0.0.1:3001'  // Backend (127.0.0.1 alternative)
];

// If a Railway frontend URL is available, add it to the allowed origins
if (process.env.RAILWAY_STATIC_URL) {
  allowedOrigins.push(`https://${process.env.RAILWAY_STATIC_URL}`);
}

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Moved from hardcoding
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY; // Moved from hardcoding

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// --- Authentication Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // if there isn't any token

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // if token is no longer valid
        req.user = user; // Add user payload to request
        next(); // pass the execution off to whatever request the client intended
    });
};

// --- Auth Routes ---
app.post('/auth/google/callback', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload) {
            return res.status(400).json({ error: 'Invalid Google token' });
        }
        // payload contains user's Google profile information (sub, email, name, etc.)
        const user = findOrCreateUser(payload);
        
        // Create a session JWT
        const sessionToken = jwt.sign({ googleId: user.googleId, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        
        res.json({ token: sessionToken, user });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(401).json({ error: 'Google authentication failed', details: error.message });
    }
});

// --- Tracked Channels API Endpoints (Protected) ---
app.post('/api/tracked-channels', authenticateToken, async (req, res) => {
    const { channelId, channelName } = req.body;
    const googleId = req.user.googleId;
    if (!channelId || !channelName) {
        return res.status(400).json({ error: 'Channel ID and Name are required.' });
    }
    const success = addTrackedChannel(googleId, channelId, channelName);
    if (success) {
        // Optionally, fetch initial snapshot
        try {
            const url = new URL(`https://www.googleapis.com/youtube/v3/channels`);
            url.search = new URLSearchParams({ part: 'snippet,statistics', id: channelId, key: YOUTUBE_API_KEY }).toString();
            const response = await fetch(url.toString());
            const data = await response.json();
            if (data.items && data.items.length > 0) {
                const stats = data.items[0].statistics;
                const snapshot = { 
                    date: new Date().toISOString(), 
                    subscribers: parseInt(stats.subscriberCount, 10), 
                    views: parseInt(stats.viewCount, 10) 
                };
                addChannelSnapshot(channelId, snapshot);
            }
        } catch (error) {
            console.error('Error fetching initial channel stats:', error);
            // Continue even if initial fetch fails
        }
        res.status(201).json({ message: 'Channel added for tracking.' });
    } else {
        res.status(409).json({ error: 'Channel already tracked or user not found.' });
    }
});

app.get('/api/tracked-channels', authenticateToken, (req, res) => {
    const googleId = req.user.googleId;
    const channels = getTrackedChannels(googleId);
    res.json(channels);
});

app.delete('/api/tracked-channels/:channelId', authenticateToken, (req, res) => {
    const { channelId } = req.params;
    const googleId = req.user.googleId;
    const success = removeTrackedChannel(googleId, channelId);
    if (success) {
        res.json({ message: 'Channel removed from tracking.' });
    } else {
        res.status(404).json({ error: 'Channel not found or user not authorized.' });
    }
});

app.post('/api/tracked-channels/:channelId/alerts', authenticateToken, (req, res) => {
    const { channelId } = req.params;
    const googleId = req.user.googleId;
    const { type, threshold } = req.body; // e.g., { type: 'milestone', threshold: 100000 }

    if (!type || threshold === undefined) {
        return res.status(400).json({ error: 'Alert type and threshold are required.' });
    }
    setAlertCondition(googleId, channelId, { type, threshold: parseInt(threshold, 10) });
    res.json({ message: 'Alert condition set.' });
});

app.get('/api/tracked-channels/:channelId/alerts', authenticateToken, (req, res) => {
    const { channelId } = req.params;
    const googleId = req.user.googleId;
    const condition = getAlertCondition(googleId, channelId);
    if (condition) {
        res.json(condition);
    } else {
        res.status(404).json({ error: 'Alert condition not found for this channel.' });
    }
});

app.get('/api/tracked-channels/:channelId/snapshots', authenticateToken, (req, res) => {
    const { channelId } = req.params;
    // We don't strictly need to check user ownership for snapshots if channelId is globally unique
    // and snapshots don't contain user-specific sensitive info beyond what's public.
    // However, if only the tracking user should see them, add user check from db_mock.
    const snapshots = getChannelSnapshots(channelId);
    res.json(snapshots);
});

// Gemini AI Proxy
app.post('/api/gemini', async (req, res) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-002:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      }
    );
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Gemini proxy error', details: err.message });
  }
});

// YouTube Data API Proxy (GET requests)
app.get('/api/youtube', async (req, res) => {
  try {
    const { endpoint, ...params } = req.query;
    if (!endpoint) return res.status(400).json({ error: 'Missing endpoint param' });

    // Build YouTube API URL
    const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
    url.search = new URLSearchParams({ ...params, key: YOUTUBE_API_KEY }).toString();

    const response = await fetch(url.toString());
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'YouTube proxy error', details: err.message });
  }
});

// YouTube Global Trends AI Analysis Endpoint
app.get('/api/youtube/global-trends', async (req, res) => {
  try {
    // 1. Fetch trending videos from YouTube
    const ytApiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&maxResults=25&regionCode=US&key=${YOUTUBE_API_KEY}`;
    console.log('Fetching from YouTube API:', ytApiUrl.replace(YOUTUBE_API_KEY, 'YOUR_YOUTUBE_KEY_REDACTED'));
    const ytRes = await fetch(ytApiUrl);
    console.log('YouTube API response status:', ytRes.status);

    let ytData;
    try {
        ytData = await ytRes.json();
    } catch (jsonError) {
        console.error('Failed to parse YouTube API response as JSON:', jsonError);
        const errorText = await ytRes.text().catch(() => "Could not read error response text.");
        console.error('YouTube API raw response text (first 500 chars):', errorText.substring(0,500));
        return res.status(ytRes.status || 500).json({ 
            error: 'YouTube API returned non-JSON response.', 
            details: `Status: ${ytRes.status}. Response: ${errorText.substring(0, 500)}`
        });
    }

    if (!ytRes.ok) {
      console.error('YouTube API call failed. Status:', ytRes.status, 'Response:', ytData);
      return res.status(ytRes.status).json({ error: 'Failed to fetch trending videos from YouTube API', details: ytData });
    }
    if (!ytData.items || ytData.items.length === 0) {
      console.warn('YouTube API returned no trending video items.');
      return res.status(200).json({ message: 'No trending videos found from YouTube at the moment.', analysis: null });
    }
    console.log(`Successfully fetched ${ytData.items.length} trending videos from YouTube.`);

    // 2. Extract titles and descriptions
    const videoTexts = ytData.items
        .map(v => (v.snippet && v.snippet.title && v.snippet.description) ? (v.snippet.title + '. ' + v.snippet.description) : '')
        .filter(text => text.trim() !== '')
        .join('\\n');

    if (!videoTexts) {
        console.warn('No video titles/descriptions extracted for Gemini prompt.');
        return res.status(200).json({ message: 'Could not extract sufficient text from videos for analysis.', analysis: null });
    }
    console.log('Video texts for Gemini prompt (first 100 chars):', videoTexts.substring(0, 100));

    // 3. Prepare Gemini prompt
    const geminiPrompt = {
      contents: [ { parts: [ { text: `Given these trending YouTube video titles and descriptions, what are the most popular topics or themes right now? List the top 3 themes and give a short explanation for each.\n\n${videoTexts}` } ] } ]
    };
    console.log('Prepared Gemini prompt.');

    // 4. Call Gemini
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const geminiEndpoint = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-002:generateContent";
    const geminiRes = await fetch(`${geminiEndpoint}?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPrompt),
      }
    );
    let geminiData;
    try {
      geminiData = await geminiRes.json();
    } catch (jsonError) {
      console.error('Failed to parse Gemini API response as JSON:', jsonError);
      const errorText = await geminiRes.text().catch(() => "Could not read error response text.");
      console.error('Gemini API raw response text (first 500 chars):', errorText.substring(0,500));
      return res.status(geminiRes.status || 500).json({ 
        error: 'Gemini API returned non-JSON response.', 
        details: `Status: ${geminiRes.status}. Response: ${errorText.substring(0,500)}`
      });
    }
    if (!geminiRes.ok) {
      console.error('Gemini API call failed. Status:', geminiRes.status, 'Response:', geminiData);
      return res.status(geminiRes.status).json({ error: 'Gemini API call failed', details: geminiData });
    }
    console.log('Successfully received response from Gemini API.');
    res.status(geminiRes.status).json(geminiData);
  } catch (err) {
    console.error('Unexpected error in /api/youtube/global-trends:', err);
    res.status(500).json({ error: 'Global trends AI processing encountered an unexpected error.', details: err.message });
  }
});

// --- Nodemailer Setup ---
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: parseInt(process.env.EMAIL_PORT || "587") === 465, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendEmail = async (to, subject, htmlContent) => {
    try {
        await transporter.sendMail({
            from: `"YouTube Tracker" <${process.env.EMAIL_USER}>`,
            to: to, // list of receivers
            subject: subject, // Subject line
            html: htmlContent, // html body
        });
        console.log('Email sent to:', to);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

// --- Server Initialization ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  // Schedule the cron job to run every 6 hours
  cron.schedule('0 */6 * * *', async () => { // Runs every 6 hours
    console.log('Running scheduled task: Checking channel stats and alerts...');
    const users = getAllUsers(); // From db_mock
    const allTrackedChannels = getAllChannels(); // From db_mock, to get channel names

    for (const user of users) {
        if (!user.trackedChannels || user.trackedChannels.length === 0) continue;

        for (const channelId of user.trackedChannels) {
            const channelInfo = allTrackedChannels[channelId];
            if (!channelInfo) continue;

            try {
                // 1. Fetch latest channel stats
                const url = new URL(`https://www.googleapis.com/youtube/v3/channels`);
                url.search = new URLSearchParams({ part: 'statistics,snippet', id: channelId, key: YOUTUBE_API_KEY }).toString();
                const response = await fetch(url.toString());
                const data = await response.json();

                if (data.items && data.items.length > 0) {
                    const stats = data.items[0].statistics;
                    const snippet = data.items[0].snippet;
                    const currentSubscribers = parseInt(stats.subscriberCount, 10);
                    const currentViews = parseInt(stats.viewCount, 10);
                    const channelName = snippet.title;

                    // Update channel name in mock DB if it changed
                    if (channelInfo.name !== channelName) {
                        allTrackedChannels[channelId].name = channelName;
                    }

                    // 2. Add new snapshot
                    const newSnapshot = { date: new Date().toISOString(), subscribers: currentSubscribers, views: currentViews };
                    addChannelSnapshot(channelId, newSnapshot);
                    console.log(`Snapshot added for ${channelName} (${channelId}): ${currentSubscribers} subs`);

                    // 3. Check alert conditions
                    const alertCondition = getAlertCondition(user.googleId, channelId);
                    if (alertCondition) {
                        const previousSnapshots = getChannelSnapshots(channelId);
                        let alertTriggered = false;
                        let alertMessage = '';

                        // Check milestone alert
                        if (alertCondition.type === 'milestone') {
                            const oldSnapshot = previousSnapshots.length > 1 ? previousSnapshots[1] : { subscribers: 0 }; // Second to last, or 0
                            if (currentSubscribers >= alertCondition.threshold && oldSnapshot.subscribers < alertCondition.threshold) {
                                alertTriggered = true;
                                alertMessage = `🎉 Milestone Reached! ${channelName} has reached ${currentSubscribers.toLocaleString()} subscribers (Threshold: ${alertCondition.threshold.toLocaleString()}).`;
                            }
                        }
                        // Check percentage growth alert
                        else if (alertCondition.type === 'percentage' && previousSnapshots.length > 1) {
                            const previousSnapshot = previousSnapshots.find(s => {
                                // Find a snapshot from roughly 24-48 hours ago for daily percentage, or just the previous one
                                // For simplicity, let's use the one before the current latest, if available and not too old.
                                // A more robust solution would be to pick a snapshot from a specific time window.
                                return new Date(s.date) < new Date(newSnapshot.date);
                            });

                            if (previousSnapshot && previousSnapshot.subscribers > 0) { // Avoid division by zero
                                const growthPercentage = ((currentSubscribers - previousSnapshot.subscribers) / previousSnapshot.subscribers) * 100;
                                if (growthPercentage >= alertCondition.threshold) {
                                    alertTriggered = true;
                                    alertMessage = `🚀 Growth Alert! ${channelName} grew by ${growthPercentage.toFixed(2)}% to ${currentSubscribers.toLocaleString()} subscribers (Threshold: ${alertCondition.threshold}%).`;
                                }
                            }
                        }
                        
                        if (alertTriggered) {
                            console.log(`ALERT for ${user.email} / ${channelName}: ${alertMessage}`);
                            // Send email
                            await sendEmail(
                                user.email, 
                                `YouTube Channel Alert: ${channelName}`,
                                `<p>Hi ${user.name || 'there'},</p>${alertMessage}<p>View dashboard: [Link to your app]</p>`
                            );
                            // Optional: Update alertCondition to prevent re-notifying immediately (e.g., add lastNotifiedDate)
                        }
                    }
                }
            } catch (error) {
                console.error(`Error processing channel ${channelId} for user ${user.googleId}:`, error);
            }
        }
    }
    console.log('Finished scheduled task.');
});


// Catch-all for unknown API routes (must be after all other routes)
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// MongoDB and Mongoose code (commented out for now)
/*
import mongoose from 'mongoose';

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/webproject', { useNewUrlParser: true, useUnifiedTopology: true });

// Cache schema
const cacheSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  response: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now, expires: 3600 } // 1 hour expiry
});
const Cache = mongoose.model('Cache', cacheSchema);

// Helper functions for cache
async function getCached(key) {
  const doc = await Cache.findOne({ key });
  return doc ? doc.response : null;
}
async function setCached(key, response) {
  try {
    await Cache.findOneAndUpdate({ key }, { response, createdAt: new Date() }, { upsert: true });
  } catch (e) { }
}
*/
