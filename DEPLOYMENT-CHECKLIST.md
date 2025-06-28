# 🚀 Vercel Deployment Checklist

## ✅ Pre-Deployment Setup

### 1. Supabase Database Setup
- [ ] Create Supabase account and project
- [ ] Run the SQL schema from `supabase-schema.sql`
- [ ] Copy project URL, anon key, and service key
- [ ] Test database connection

### 2. Google Cloud Console Setup
- [ ] Create or use existing Google Cloud project
- [ ] Enable YouTube Data API v3
- [ ] Create API key for YouTube Data API
- [ ] Create OAuth 2.0 credentials
- [ ] Download OAuth client configuration
- [ ] Enable Google Gemini API (optional for AI features)

### 3. API Keys Collection
- [ ] YouTube Data API key
- [ ] Google OAuth Client ID
- [ ] Google Gemini API key (optional)
- [ ] Generate JWT secret (random string)
- [ ] Supabase URL, anon key, service key

## 🔧 Deployment Steps

### 1. Code Repository
- [ ] Push code to GitHub repository
- [ ] Ensure all files are committed
- [ ] Verify `vercel.json` configuration

### 2. Vercel Setup
- [ ] Connect GitHub repository to Vercel
- [ ] Configure environment variables:
  ```
  YOUTUBE_API_KEY=your_key
  GOOGLE_CLIENT_ID=your_client_id
  JWT_SECRET=your_secret
  GEMINI_API_KEY=your_key (optional)
  SUPABASE_URL=your_url
  SUPABASE_ANON_KEY=your_key
  SUPABASE_SERVICE_KEY=your_key
  ```
- [ ] Deploy project

### 3. Post-Deployment Configuration
- [ ] Copy your Vercel deployment URL
- [ ] Update Google OAuth authorized origins:
  - Add `https://your-project.vercel.app`
  - Add callback URL: `https://your-project.vercel.app/api/auth/google`
- [ ] Update CORS origins in API files:
  - `api/auth/google.js`
  - `api/tracked-channels.js`
  - `api/youtube.js`
  - `api/ai/analyze.js`
  - `api/snapshots.js`
  - `api/alerts.js`

## 🧪 Testing

### 1. Frontend Testing
- [ ] Visit your Vercel URL
- [ ] Test Google Sign-In functionality
- [ ] Verify dark/light mode toggle
- [ ] Check responsive design

### 2. API Testing
- [ ] Test adding a YouTube channel
- [ ] Verify data appears in Supabase
- [ ] Test removing a channel
- [ ] Check channel analytics display
- [ ] Test AI insights (if Gemini enabled)

### 3. Database Testing
- [ ] Verify user creation in Supabase
- [ ] Check tracked channels storage
- [ ] Test historical data snapshots
- [ ] Verify alert conditions

## 🐛 Troubleshooting

### Common Issues
- [ ] **CORS Errors**: Update allowed origins in API files
- [ ] **OAuth Errors**: Check Google Console configuration
- [ ] **Database Errors**: Verify Supabase connection and RLS policies
- [ ] **API Quota**: Monitor YouTube API usage limits
- [ ] **Function Timeouts**: Check Vercel function logs

### Debug Steps
- [ ] Check Vercel function logs
- [ ] Verify environment variables are set
- [ ] Test API endpoints individually
- [ ] Check browser console for errors
- [ ] Monitor Supabase logs

## 📊 Post-Launch

### 1. Monitoring
- [ ] Set up Vercel analytics
- [ ] Monitor Supabase usage
- [ ] Track YouTube API quota usage
- [ ] Check function performance

### 2. Scaling
- [ ] Consider upgrading Supabase plan if needed
- [ ] Monitor Vercel function usage
- [ ] Optimize database queries
- [ ] Implement caching strategies

### 3. Maintenance
- [ ] Regular dependency updates
- [ ] Monitor security advisories
- [ ] Backup database regularly
- [ ] Review and optimize performance

---

## 🎉 Success Criteria

Your deployment is successful when:
- ✅ Users can sign in with Google
- ✅ Channels can be added and tracked
- ✅ Historical data is stored and displayed
- ✅ Charts and analytics work properly
- ✅ AI insights generate (if enabled)
- ✅ Mobile/desktop responsive design works
- ✅ No console errors or failed API calls

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Vercel and Supabase documentation
3. Check GitHub issues for similar problems
4. Open a new issue with detailed error information

**Happy deploying! 🚀**
