-- Supabase Database Schema for YouTube Tracker
-- Run these SQL commands in your Supabase SQL editor

-- Create users table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tracked_channels table
CREATE TABLE tracked_channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, channel_id)
);

-- Create channel_snapshots table for historical data
CREATE TABLE channel_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id TEXT NOT NULL,
    subscribers BIGINT NOT NULL,
    views BIGINT NOT NULL,
    videos_count INTEGER DEFAULT 0,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create alert_conditions table
CREATE TABLE alert_conditions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    alert_type TEXT NOT NULL, -- 'subscribers', 'views', 'videos'
    threshold BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, channel_id)
);

-- Create indexes for better performance
CREATE INDEX idx_tracked_channels_user_id ON tracked_channels(user_id);
CREATE INDEX idx_channel_snapshots_channel_id ON channel_snapshots(channel_id);
CREATE INDEX idx_channel_snapshots_recorded_at ON channel_snapshots(recorded_at);
CREATE INDEX idx_alert_conditions_user_id ON alert_conditions(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_conditions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (optional - for additional security)
-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users FOR ALL USING (auth.uid()::text = google_id);
CREATE POLICY "Users can view own tracked channels" ON tracked_channels FOR ALL USING (user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text));
CREATE POLICY "Users can view channel snapshots" ON channel_snapshots FOR SELECT USING (true);
CREATE POLICY "Users can view own alert conditions" ON alert_conditions FOR ALL USING (user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text));
