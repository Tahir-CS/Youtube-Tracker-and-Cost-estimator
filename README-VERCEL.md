# 🚀 YouTube Tracker - Serverless Edition

A modern YouTube channel analytics tracker built for **Vercel** deployment with **Supabase** database and **AI-powered insights**.

## ✨ Features

- 📊 **Real-time YouTube Analytics** - Track subscriber counts, views, and video performance
- 🤖 **AI-Powered Insights** - Get content strategy recommendations from Gemini AI
- 📈 **Historical Data** - Store and visualize channel growth over time
- 🔔 **Smart Alerts** - Get notified when channels hit growth milestones
- 🌙 **Dark Mode** - Beautiful, responsive UI with dark/light themes
- ⚡ **Serverless** - Built for scale with Vercel Functions

## 🏗️ Architecture

- **Frontend**: Vanilla JavaScript with Chart.js for visualizations
- **Backend**: Vercel Serverless Functions (Node.js)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Google OAuth 2.0
- **AI**: Google Gemini API for analytics insights
- **Deployment**: Vercel with automatic CI/CD

## 🚀 Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/youtube-tracker)

## 📋 Setup Instructions

### 1. Prerequisites
- Vercel account
- Supabase account  
- Google Cloud Console project
- YouTube Data API v3 key
- Google Gemini API key

### 2. Database Setup
1. Create a new Supabase project
2. Copy the SQL from `supabase-schema.sql`
3. Run it in your Supabase SQL editor
4. Note your project URL and API keys

### 3. Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add your domain to authorized origins
4. Get your Client ID

### 4. Environment Variables
Set these in your Vercel dashboard:

```bash
YOUTUBE_API_KEY=your_youtube_api_key
GOOGLE_CLIENT_ID=your_google_client_id  
JWT_SECRET=your_random_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

### 5. Deploy
1. Push to GitHub
2. Connect to Vercel
3. Deploy automatically

## 📁 Project Structure

```
├── api/                    # Serverless functions
│   ├── auth/
│   │   └── google.js      # Google OAuth endpoint
│   ├── ai/
│   │   └── analyze.js     # AI analysis endpoint
│   ├── tracked-channels.js # Channel management
│   ├── youtube.js         # YouTube API proxy
│   ├── snapshots.js       # Historical data
│   └── alerts.js          # Alert management
├── lib/
│   └── supabase.js        # Database operations
├── index.html             # Main frontend
├── api.js                 # Frontend API client
├── main.js                # App logic
├── ui.js                  # UI components
├── charts.js              # Data visualization
├── vercel.json            # Vercel configuration
└── supabase-schema.sql    # Database schema
```

## 🔧 API Endpoints

- `POST /api/auth/google` - Google OAuth authentication
- `GET /api/tracked-channels` - Get user's tracked channels
- `POST /api/tracked-channels` - Add new channel to track
- `DELETE /api/tracked-channels` - Remove tracked channel
- `GET /api/youtube` - YouTube Data API proxy
- `POST /api/ai/analyze` - Get AI insights for channel
- `GET /api/snapshots` - Get historical channel data
- `POST /api/alerts` - Set channel alert conditions

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Install Vercel CLI
npm install -g vercel

# Start development server
vercel dev
```

## 🎯 Features

### 📊 Analytics Dashboard
- Track multiple YouTube channels
- View subscriber and view count trends
- Monitor video performance metrics
- Compare channel growth over time

### 🤖 AI Insights
- Content strategy recommendations
- Trending topic analysis
- Optimal posting schedule insights
- Engagement optimization tips

### 🔔 Smart Alerts
- Set custom subscriber milestones
- Get notified of rapid growth events
- Track view count thresholds
- Monitor new video uploads

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🆘 Support

- Check the [Deployment Guide](DEPLOYMENT-GUIDE.md) for detailed setup instructions
- Open an issue for bugs or feature requests
- Join our community for support and discussions

---

**Built with ❤️ for the YouTube creator community**
