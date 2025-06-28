// api/alerts.js - Alert conditions endpoint
import jwt from 'jsonwebtoken';
import { 
    setAlertCondition, 
    getAlertCondition 
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
        'https://your-frontend-domain.vercel.app',
        'http://localhost:5500',
        'http://127.0.0.1:5500'
    ];

    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const decoded = verifyToken(req);
        const googleId = decoded.googleId;

        const { channelId } = req.query;
        if (!channelId) {
            return res.status(400).json({ error: 'Channel ID is required' });
        }

        switch (req.method) {
            case 'GET':
                const alertCondition = await getAlertCondition(googleId, channelId);
                return res.status(200).json(alertCondition || {});

            case 'POST':
                const { type, threshold } = req.body;
                if (!type || threshold === undefined) {
                    return res.status(400).json({ error: 'Alert type and threshold are required' });
                }

                await setAlertCondition(googleId, channelId, type, threshold);
                return res.status(200).json({ message: 'Alert condition set successfully' });

            default:
                return res.status(405).json({ error: 'Method not allowed' });
        }

    } catch (error) {
        console.error('Alerts API error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
}
