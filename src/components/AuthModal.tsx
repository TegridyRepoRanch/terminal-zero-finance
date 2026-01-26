// Authentication Modal
// Login and signup forms

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, Mail, Lock, Github, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';

type AuthMode = 'signin' | 'signup' | 'reset';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
    const { signIn, signUp, signInWithGoogle, signInWithGithub, resetPassword, isConfigured } = useAuth();
    const [mode, setMode] = useState<AuthMode>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            if (mode === 'signin') {
                const { error } = await signIn(email, password);
                if (error) {
                    setError(error.message);
                } else {
                    onSuccess?.();
                    onClose();
                }
            } else if (mode === 'signup') {
                const { error } = await signUp(email, password);
                if (error) {
                    setError(error.message);
                } else {
                    setSuccess('Check your email for a confirmation link!');
                }
            } else if (mode === 'reset') {
                const { error } = await resetPassword(email);
                if (error) {
                    setError(error.message);
                } else {
                    setSuccess('Password reset email sent!');
                }
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleOAuth = async (provider: 'google' | 'github') => {
        setLoading(true);
        setError(null);

        try {
            const { error } = provider === 'google'
                ? await signInWithGoogle()
                : await signInWithGithub();

            if (error) {
                setError(error.message);
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (!isConfigured) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
                <div className="relative bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md w-full mx-4">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300"
                    >
                        <X size={20} />
                    </button>

                    <div className="text-center py-8">
                        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-zinc-100 mb-2">
                            Authentication Not Configured
                        </h2>
                        <p className="text-sm text-zinc-400 mb-4">
                            To enable user accounts, configure Supabase in your environment:
                        </p>
                        <div className="text-left bg-zinc-950 rounded p-4 text-xs font-mono text-zinc-400">
                            <p>VITE_SUPABASE_URL=your-project-url</p>
                            <p>VITE_SUPABASE_ANON_KEY=your-anon-key</p>
                        </div>
                        <p className="text-xs text-zinc-500 mt-4">
                            Get these from your Supabase project dashboard.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md w-full mx-4">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300"
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <h2 className="text-xl font-semibold text-zinc-100">
                        {mode === 'signin' && 'Welcome Back'}
                        {mode === 'signup' && 'Create Account'}
                        {mode === 'reset' && 'Reset Password'}
                    </h2>
                    <p className="text-sm text-zinc-400 mt-1">
                        {mode === 'signin' && 'Sign in to access your saved valuations'}
                        {mode === 'signup' && 'Start saving your work to the cloud'}
                        {mode === 'reset' && 'Enter your email to reset your password'}
                    </p>
                </div>

                {/* Error/Success Messages */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded flex items-center gap-2">
                        <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                )}
                {success && (
                    <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded flex items-center gap-2">
                        <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
                        <p className="text-sm text-emerald-400">{success}</p>
                    </div>
                )}

                {/* OAuth Buttons */}
                {mode !== 'reset' && (
                    <>
                        <div className="flex gap-3 mb-4">
                            <button
                                onClick={() => handleOAuth('google')}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Google
                            </button>
                            <button
                                onClick={() => handleOAuth('github')}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                <Github size={16} />
                                GitHub
                            </button>
                        </div>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-zinc-700" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-zinc-900 px-2 text-zinc-500">Or continue with</span>
                            </div>
                        </div>
                    </>
                )}

                {/* Email/Password Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs text-zinc-400 mb-1">Email</label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm focus:border-emerald-500 focus:outline-none"
                                placeholder="you@example.com"
                            />
                        </div>
                    </div>

                    {mode !== 'reset' && (
                        <div>
                            <label className="block text-xs text-zinc-400 mb-1">Password</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm focus:border-emerald-500 focus:outline-none"
                                    placeholder="Min 6 characters"
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={cn(
                            'w-full py-2 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2',
                            'bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50'
                        )}
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {mode === 'signin' && 'Sign In'}
                        {mode === 'signup' && 'Create Account'}
                        {mode === 'reset' && 'Send Reset Email'}
                    </button>
                </form>

                {/* Mode Toggle */}
                <div className="mt-6 text-center text-sm">
                    {mode === 'signin' && (
                        <>
                            <button
                                onClick={() => setMode('reset')}
                                className="text-zinc-400 hover:text-zinc-300"
                            >
                                Forgot password?
                            </button>
                            <span className="mx-2 text-zinc-600">|</span>
                            <button
                                onClick={() => setMode('signup')}
                                className="text-emerald-400 hover:text-emerald-300"
                            >
                                Create account
                            </button>
                        </>
                    )}
                    {mode === 'signup' && (
                        <button
                            onClick={() => setMode('signin')}
                            className="text-zinc-400 hover:text-zinc-300"
                        >
                            Already have an account? <span className="text-emerald-400">Sign in</span>
                        </button>
                    )}
                    {mode === 'reset' && (
                        <button
                            onClick={() => setMode('signin')}
                            className="text-zinc-400 hover:text-zinc-300"
                        >
                            Back to sign in
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// User Menu Component for the header
export function UserMenu() {
    const { user, signOut, isConfigured } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    if (!isConfigured) {
        return null; // Don't show anything if auth isn't configured
    }

    if (!user) {
        return (
            <>
                <button
                    onClick={() => setShowAuthModal(true)}
                    className="px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-500 rounded transition-colors"
                >
                    Sign In
                </button>
                <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
            </>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
            >
                <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-xs font-bold">
                    {user.email?.[0].toUpperCase()}
                </div>
                <span className="text-sm text-zinc-300 hidden sm:block">
                    {user.email?.split('@')[0]}
                </span>
            </button>

            {showMenu && (
                <>
                    <div className="fixed inset-0" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg py-1 z-50">
                        <div className="px-4 py-2 border-b border-zinc-800">
                            <p className="text-xs text-zinc-500">Signed in as</p>
                            <p className="text-sm text-zinc-300 truncate">{user.email}</p>
                        </div>
                        <button
                            onClick={() => {
                                signOut();
                                setShowMenu(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                        >
                            Sign Out
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
