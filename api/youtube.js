// api/youtube.js - YouTube API proxy for serverless function
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

function verifyToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null; // Return null instead of throwing error for optional auth
    }

    const token = authHeader.substring(7);
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null; // Return null for invalid tokens
    }
}

export default async function handler(req, res) {
    // Enable CORS
    const allowedOrigins = [
        'https://youtube-tracker-cost-estimator-supa-base-version-infp6oj7i.vercel.app',
        'http://localhost:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://127.0.0.1:3000'
    ];

    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const user = verifyToken(req); // Optional authentication
        // Note: user will be null if not authenticated, but that's OK for public YouTube searches

        const { url } = req.query;
        if (!url) {
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        // Construct YouTube API URL with your API key
        const apiUrl = `${url}&key=${process.env.YOUTUBE_API_KEY}`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`YouTube API error: ${response.status}`);
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error('YouTube API error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        return res.status(500).json({ error: 'Failed to fetch YouTube data' });
    }
}
