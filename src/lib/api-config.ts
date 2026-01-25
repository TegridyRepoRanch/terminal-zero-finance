// API Configuration - Uses environment variables from Vercel
// Multi-model setup: Gemini 3 + Anthropic Claude

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

export function getAnthropicApiKey(): string {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error('VITE_ANTHROPIC_API_KEY environment variable is not set. Add it to your .env file or Vercel environment variables.');
  }
  return key;
}

export function hasAnthropicKey(): boolean {
  return !!import.meta.env.VITE_ANTHROPIC_API_KEY;
}

export function hasAllKeys(): boolean {
  return hasGeminiKey() && hasAnthropicKey();
}
