# 📊 YouTube Tracker Cost Estimator

A YouTube channel analytics platform with AI-powered insights and earnings estimation.


## ✨ Features

- **Real-time Analytics**: Track subscriber counts, views, and channel growth
- **AI Insights**: Gemini AI-powered trend analysis and predictions
- **Earnings Calculator**: Estimate revenue based on CPM and view metrics
- **Smart Alerts**: Milestone notifications and growth tracking
- **Channel Comparison**: Side-by-side analytics for multiple channels
- **Google OAuth**: Secure authentication with Google accounts

## � Quick Start

1. **Clone and Install**
   ```bash
   git clone https://github.com/yourusername/youtube-tracker-cost-estimator.git
   cd youtube-tracker-cost-estimator
   npm install
   ```

2. **Environment Setup**
   
   # Edit .env.local with your API keys
   ```

3. **Required API Keys**
   - YouTube Data API v3 (Google Cloud Console)
   - Google OAuth Client ID (Google Cloud Console)
   - Gemini AI API (Google AI Studio)
   - Supabase URL and Keys (Supabase Dashboard)

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
├── index.html          # Main interface
├── main.js             # App entry point
├── api.js              # API communication
├── ui.js               # UI components
├── charts.js           # Data visualization
├── ai.js               # AI integration
├── api/                # Backend endpoints
│   ├── youtube.js      # YouTube API
│   ├── auth/google.js  # Google OAuth
│   └── ai/analyze.js   # AI analysis
└── lib/supabase.js     # Database client
```

## � Configuration

### Database Setup
Run the SQL schema from `supabase-schema.sql` in your Supabase project.

### API Configuration
1. **YouTube API**: Enable YouTube Data API v3 in Google Cloud Console
2. **Google OAuth**: Create OAuth 2.0 credentials with your domain
3. **Gemini AI**: Get API key from Google AI Studio
4. **Supabase**: Create project and get URL/keys from dashboard

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm i -g vercel
vercel --prod
```
Add environment variables in Vercel dashboard.


## �️ Usage

1. **Sign in** with Google account
2. **Add channels** by URL or handle
3. **Set alerts** for milestones
4. **Compare channels** side-by-side
5. **View AI insights** and predictions

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request



---
**Built with ❤️ using Supabase, Vercel, and Google AI**
