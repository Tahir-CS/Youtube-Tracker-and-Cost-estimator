# 🚀 Deploy YouTube Tracker to Vercel with Supabase

## Prerequisites
- Vercel account
- Supabase account
- Google Cloud Console project (for YouTube API & OAuth)
- Gemini AI API key

## Step 1: Set up Supabase Database

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL editor in your Supabase dashboard
3. Copy and run the SQL from `supabase-schema.sql` to create the tables
4. Note down your:
   - Project URL
   - Anon key
   - Service role key (from Settings > API)

## Step 2: Update Google OAuth Settings

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to "Credentials" in APIs & Services
3. Edit your OAuth 2.0 client
4. Add your Vercel domain to authorized origins:
   - `https://your-project-name.vercel.app`
5. Add callback URL:
   - `https://your-project-name.vercel.app/api/auth/google`

## Step 3: Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard (Settings > Environment Variables):
   ```
   YOUTUBE_API_KEY=your_youtube_api_key
   GOOGLE_CLIENT_ID=your_google_client_id
   JWT_SECRET=your_random_jwt_secret
   GEMINI_API_KEY=your_gemini_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   EMAIL_FROM=your_email@gmail.com
   EMAIL_PASSWORD=your_email_app_password
   ```

## Step 4: Update Frontend URLs

1. In `api/auth/google.js`, update the allowed origins:
   ```javascript
   const allowedOrigins = [
       'https://your-project-name.vercel.app', // Replace with your actual domain
       'http://localhost:5500',
       'http://127.0.0.1:5500'
   ];
   ```

2. Update the same in other API files:
   - `api/tracked-channels.js`
   - `api/youtube.js`
   - `api/ai/analyze.js`

## Step 5: Test Deployment

1. Visit your Vercel URL
2. Test Google Sign-In
3. Try adding/removing channels
4. Verify data is being stored in Supabase

## Architecture Benefits

✅ **Serverless**: No server management required
✅ **Scalable**: Automatically handles traffic spikes
✅ **Fast**: Global CDN deployment
✅ **Reliable**: Supabase provides robust PostgreSQL database
✅ **Cost-effective**: Pay only for what you use

## File Structure
```
/api
  /auth
    google.js          # Google OAuth endpoint
  /ai
    analyze.js         # Gemini AI analysis
  tracked-channels.js  # Channel management
  youtube.js          # YouTube API proxy
/lib
  supabase.js         # Database operations
vercel.json           # Vercel configuration
supabase-schema.sql   # Database setup script
```

## Troubleshooting

- **CORS errors**: Make sure to update allowed origins in all API files
- **Database errors**: Check Supabase logs and ensure tables are created
- **Auth issues**: Verify Google OAuth configuration and JWT secret
- **API limits**: Monitor YouTube API quotas

Your app is now serverless and production-ready! 🎉
