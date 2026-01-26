// Authentication Context
// Provides user state and auth methods throughout the app

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    isConfigured: boolean;
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signOut: () => Promise<void>;
    signInWithGoogle: () => Promise<{ error: AuthError | null }>;
    signInWithGithub: () => Promise<{ error: AuthError | null }>;
    resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isSupabaseConfigured || !supabase) {
            setLoading(false);
            return;
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        if (!supabase) return { error: { message: 'Supabase not configured' } as AuthError };
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
    };

    const signUp = async (email: string, password: string) => {
        if (!supabase) return { error: { message: 'Supabase not configured' } as AuthError };
        const { error } = await supabase.auth.signUp({ email, password });
        return { error };
    };

    const signOut = async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
    };

    const signInWithGoogle = async () => {
        if (!supabase) return { error: { message: 'Supabase not configured' } as AuthError };
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        return { error };
    };

    const signInWithGithub = async () => {
        if (!supabase) return { error: { message: 'Supabase not configured' } as AuthError };
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        return { error };
    };

    const resetPassword = async (email: string) => {
        if (!supabase) return { error: { message: 'Supabase not configured' } as AuthError };
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        return { error };
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                loading,
                isConfigured: isSupabaseConfigured,
                signIn,
                signUp,
                signOut,
                signInWithGoogle,
                signInWithGithub,
                resetPassword,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
