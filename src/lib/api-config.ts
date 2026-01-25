// API Configuration - Environment variable validation and error handling
// Supports both legacy (direct API) and modern (backend proxy) modes

// =============================================================================
// CONFIGURATION MODE DETECTION
// =============================================================================

/**
 * Determine which mode the app is running in
 */
export type ConfigMode = 'backend' | 'legacy' | 'unconfigured';

export function getConfigMode(): ConfigMode {
  const hasBackendUrl = !!import.meta.env.VITE_BACKEND_URL;
  const hasLegacyKeys = hasGeminiKey() || hasAnthropicKey();

  if (hasBackendUrl) {
    return 'backend';
  } else if (hasLegacyKeys) {
    return 'legacy';
  } else {
    return 'unconfigured';
  }
}

// =============================================================================
// BACKEND API CONFIGURATION (RECOMMENDED)
// =============================================================================

/**
 * Get backend API URL
 */
export function getBackendUrl(): string {
  const url = import.meta.env.VITE_BACKEND_URL;
  if (!url) {
    throw new Error(
      'VITE_BACKEND_URL is not configured. ' +
      'Add it to your .env file (e.g., VITE_BACKEND_URL=http://localhost:3001). ' +
      'See BACKEND_SETUP.md for setup instructions.'
    );
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    throw new Error(
      `VITE_BACKEND_URL is invalid: "${url}". ` +
      'Must be a valid URL (e.g., http://localhost:3001)'
    );
  }

  return url;
}

/**
 * Check if backend URL is configured
 */
export function hasBackendUrl(): boolean {
  return !!import.meta.env.VITE_BACKEND_URL;
}

// =============================================================================
// LEGACY API CONFIGURATION (DEPRECATED)
// =============================================================================

/**
 * Get Gemini API key (legacy mode only)
 * @deprecated Use backend API proxy instead
 */
export function getGeminiApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      'VITE_GEMINI_API_KEY is not set. ' +
      'This exposes your API key in the browser and is NOT secure. ' +
      'Use the backend API proxy instead. See BACKEND_SETUP.md for instructions.'
    );
  }
  return key;
}

/**
 * Check if Gemini API key exists
 */
export function hasGeminiKey(): boolean {
  return !!import.meta.env.VITE_GEMINI_API_KEY;
}

/**
 * Get Anthropic API key (legacy mode only)
 * @deprecated Use backend API proxy instead
 */
export function getAnthropicApiKey(): string {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      'VITE_ANTHROPIC_API_KEY is not set. ' +
      'This exposes your API key in the browser and is NOT secure. ' +
      'Use the backend API proxy instead. See BACKEND_SETUP.md for instructions.'
    );
  }
  return key;
}

/**
 * Check if Anthropic API key exists
 */
export function hasAnthropicKey(): boolean {
  return !!import.meta.env.VITE_ANTHROPIC_API_KEY;
}

/**
 * Check if all legacy keys exist
 * @deprecated Legacy mode only
 */
export function hasAllKeys(): boolean {
  return hasGeminiKey() && hasAnthropicKey();
}

// =============================================================================
// VALIDATION & HEALTH CHECKS
// =============================================================================

export interface ConfigValidation {
  isValid: boolean;
  mode: ConfigMode;
  errors: string[];
  warnings: string[];
}

/**
 * Validate environment configuration
 * Returns detailed validation results
 */
export function validateConfig(): ConfigValidation {
  const mode = getConfigMode();
  const errors: string[] = [];
  const warnings: string[] = [];

  if (mode === 'unconfigured') {
    errors.push(
      'No configuration found. You must set either:',
      '1. VITE_BACKEND_URL (recommended) - See BACKEND_SETUP.md',
      '2. VITE_GEMINI_API_KEY + VITE_ANTHROPIC_API_KEY (legacy, not secure)'
    );
  } else if (mode === 'legacy') {
    warnings.push(
      '⚠️ Running in LEGACY mode with frontend API keys.',
      'This exposes your API keys in the browser.',
      'Switch to backend mode for production. See BACKEND_SETUP.md'
    );

    if (!hasGeminiKey()) {
      errors.push('VITE_GEMINI_API_KEY is missing');
    }
    if (!hasAnthropicKey()) {
      warnings.push('VITE_ANTHROPIC_API_KEY is missing (optional, but needed for Claude features)');
    }
  } else if (mode === 'backend') {
    try {
      getBackendUrl(); // Validates URL format
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Invalid backend URL');
    }

    if (hasGeminiKey() || hasAnthropicKey()) {
      warnings.push(
        'Frontend API keys detected while using backend mode.',
        'These keys are ignored and can be removed from .env'
      );
    }
  }

  return {
    isValid: errors.length === 0,
    mode,
    errors,
    warnings,
  };
}

/**
 * Throw error if configuration is invalid
 * Call this at app startup to fail fast
 */
export function assertValidConfig(): void {
  const validation = validateConfig();

  if (!validation.isValid) {
    const errorMessage = [
      '❌ Configuration Error:',
      '',
      ...validation.errors,
      '',
      'Please check your .env file and restart the application.',
      'See .env.example and BACKEND_SETUP.md for guidance.',
    ].join('\n');

    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Log warnings but don't fail
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Configuration Warnings:\n' + validation.warnings.join('\n'));
  }

  // Log mode
  console.log(`✅ Running in ${validation.mode.toUpperCase()} mode`);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get user-friendly setup instructions based on current state
 */
export function getSetupInstructions(): string {
  const mode = getConfigMode();

  if (mode === 'unconfigured') {
    return [
      'To get started:',
      '',
      '1. Backend Mode (Recommended):',
      '   - Copy .env.example to .env',
      '   - Set VITE_BACKEND_URL=http://localhost:3001',
      '   - Follow BACKEND_SETUP.md to set up the backend server',
      '',
      '2. Legacy Mode (Development only):',
      '   - Copy .env.example to .env',
      '   - Add VITE_GEMINI_API_KEY and VITE_ANTHROPIC_API_KEY',
      '   - ⚠️ WARNING: This exposes API keys in the browser',
    ].join('\n');
  } else if (mode === 'legacy') {
    return [
      'You are running in LEGACY mode (insecure).',
      '',
      'For production, switch to backend mode:',
      '1. Follow BACKEND_SETUP.md to set up the backend server',
      '2. Update .env: Set VITE_BACKEND_URL=http://localhost:3001',
      '3. Remove VITE_GEMINI_API_KEY and VITE_ANTHROPIC_API_KEY from .env',
      '4. Restart the application',
    ].join('\n');
  }

  return 'Configuration is valid. Backend mode is active.';
}
