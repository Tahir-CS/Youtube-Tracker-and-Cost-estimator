// lib/supabase.js - Supabase client configuration and database operations
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for server-side operations

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// --- User Management ---
export async function findOrCreateUser(profile) {
    try {
        // Check if user exists
        const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('google_id', profile.sub)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
            throw fetchError;
        }

        if (existingUser) {
            return existingUser;
        }

        // Create new user
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([
                {
                    google_id: profile.sub,
                    email: profile.email,
                    name: profile.name,
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (createError) throw createError;
        return newUser;
    } catch (error) {
        console.error('Error in findOrCreateUser:', error);
        throw error;
    }
}

export async function getUserById(googleId) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('google_id', googleId)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error in getUserById:', error);
        throw error;
    }
}

// --- Tracked Channels ---
export async function addTrackedChannel(googleId, channelId, channelName) {
    try {
        const user = await getUserById(googleId);
        if (!user) throw new Error('User not found');

        // Check if channel is already tracked
        const { data: existing } = await supabase
            .from('tracked_channels')
            .select('*')
            .eq('user_id', user.id)
            .eq('channel_id', channelId)
            .single();

        if (existing) {
            return false; // Already tracked
        }

        // Add tracked channel
        const { error } = await supabase
            .from('tracked_channels')
            .insert([
                {
                    user_id: user.id,
                    channel_id: channelId,
                    channel_name: channelName,
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error in addTrackedChannel:', error);
        throw error;
    }
}

export async function getTrackedChannels(googleId) {
    try {
        const user = await getUserById(googleId);
        if (!user) return [];

        const { data, error } = await supabase
            .from('tracked_channels')
            .select('*')
            .eq('user_id', user.id);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error in getTrackedChannels:', error);
        throw error;
    }
}

export async function removeTrackedChannel(googleId, channelId) {
    try {
        const user = await getUserById(googleId);
        if (!user) return false;

        const { error } = await supabase
            .from('tracked_channels')
            .delete()
            .eq('user_id', user.id)
            .eq('channel_id', channelId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error in removeTrackedChannel:', error);
        throw error;
    }
}

// --- Alert Conditions ---
export async function setAlertCondition(googleId, channelId, type, threshold) {
    try {
        const user = await getUserById(googleId);
        if (!user) throw new Error('User not found');

        const { error } = await supabase
            .from('alert_conditions')
            .upsert([
                {
                    user_id: user.id,
                    channel_id: channelId,
                    alert_type: type,
                    threshold: threshold,
                    updated_at: new Date().toISOString()
                }
            ], { onConflict: 'user_id,channel_id' });

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error in setAlertCondition:', error);
        throw error;
    }
}

export async function getAlertCondition(googleId, channelId) {
    try {
        const user = await getUserById(googleId);
        if (!user) return null;

        const { data, error } = await supabase
            .from('alert_conditions')
            .select('*')
            .eq('user_id', user.id)
            .eq('channel_id', channelId)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error in getAlertCondition:', error);
        throw error;
    }
}

// --- Channel Snapshots ---
export async function addChannelSnapshot(channelId, subscribers, views, videosCount) {
    try {
        const { error } = await supabase
            .from('channel_snapshots')
            .insert([
                {
                    channel_id: channelId,
                    subscribers: subscribers,
                    views: views,
                    videos_count: videosCount,
                    recorded_at: new Date().toISOString()
                }
            ]);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error in addChannelSnapshot:', error);
        throw error;
    }
}

export async function getChannelSnapshots(channelId) {
    try {
        const { data, error } = await supabase
            .from('channel_snapshots')
            .select('*')
            .eq('channel_id', channelId)
            .order('recorded_at', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error in getChannelSnapshots:', error);
        throw error;
    }
}

// --- Admin Functions ---
export async function getAllUsers() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*');

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error in getAllUsers:', error);
        throw error;
    }
}

export async function getAllChannels() {
    try {
        const { data, error } = await supabase
            .from('tracked_channels')
            .select('channel_id, channel_name')
            .group('channel_id, channel_name');

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error in getAllChannels:', error);
        throw error;
    }
}
