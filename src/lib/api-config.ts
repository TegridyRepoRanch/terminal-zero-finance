// API Configuration - Uses environment variables from Vercel

export function getOpenAIApiKey(): string {
  const key = import.meta.env.VITE_OPENAI_API_KEY;
  if (!key) {
    throw new Error('VITE_OPENAI_API_KEY environment variable is not set');
  }
  return key;
}

export function getGeminiApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) {
    throw new Error('VITE_GEMINI_API_KEY environment variable is not set');
  }
  return key;
}

export function hasOpenAIKey(): boolean {
  return !!import.meta.env.VITE_OPENAI_API_KEY;
}

export function hasGeminiKey(): boolean {
  return !!import.meta.env.VITE_GEMINI_API_KEY;
}
