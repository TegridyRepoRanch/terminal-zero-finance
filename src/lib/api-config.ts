// API Configuration - Uses environment variables from Vercel
// Gemini-only setup - no OpenAI required

export function getGeminiApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) {
    throw new Error('VITE_GEMINI_API_KEY environment variable is not set. Add it to your .env file or Vercel environment variables.');
  }
  return key;
}

export function hasGeminiKey(): boolean {
  return !!import.meta.env.VITE_GEMINI_API_KEY;
}
