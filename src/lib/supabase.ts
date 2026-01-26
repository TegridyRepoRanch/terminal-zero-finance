// Supabase Client Configuration
// Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Create Supabase client (may be null if not configured)
export const supabase = isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    })
    : null;

// Types for our database tables
export interface DbValuation {
    id: string;
    user_id: string;
    company_ticker: string;
    company_name: string;
    scenarios: Record<string, unknown>;
    assumptions: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface DbUser {
    id: string;
    email: string;
    created_at: string;
    display_name?: string;
}
