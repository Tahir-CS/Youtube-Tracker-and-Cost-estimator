// api/tracked-channels.js - Serverless function for tracked channels
import jwt from 'jsonwebtoken';
import { 
    addTrackedChannel, 
    getTrackedChannels, 
    removeTrackedChannel 
} from '../lib/supabase.js';

function verifyToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('No token provided');
    }

    const token = authHeader.substring(7);
    return jwt.verify(token, process.env.JWT_SECRET);
}

export default async function handler(req, res) {
    // Enable CORS
    const allowedOrigins = [
        'https://your-frontend-domain.vercel.app', // Replace with your actual domain
        'http://localhost:5500',
        'http://127.0.0.1:5500'
    ];

    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const decoded = verifyToken(req);
        const googleId = decoded.googleId;

        switch (req.method) {
            case 'GET':
                const channels = await getTrackedChannels(googleId);
                return res.status(200).json(channels);

            case 'POST':
                const { channelId, channelName } = req.body;
                if (!channelId || !channelName) {
                    return res.status(400).json({ error: 'Channel ID and name are required' });
                }

                const added = await addTrackedChannel(googleId, channelId, channelName);
                if (!added) {
                    return res.status(400).json({ error: 'Channel already tracked' });
                }
                
                return res.status(201).json({ message: 'Channel added successfully' });

            case 'DELETE':
                // Extract channelId from URL path
                const pathParts = req.url.split('/');
                const channelIdToRemove = pathParts[pathParts.length - 1];
                
                if (!channelIdToRemove) {
                    return res.status(400).json({ error: 'Channel ID is required' });
                }

                const removed = await removeTrackedChannel(googleId, channelIdToRemove);
                if (!removed) {
                    return res.status(404).json({ error: 'Channel not found' });
                }
                
                return res.status(200).json({ message: 'Channel removed successfully' });

            default:
                return res.status(405).json({ error: 'Method not allowed' });
        }

    } catch (error) {
        console.error('API error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
}
