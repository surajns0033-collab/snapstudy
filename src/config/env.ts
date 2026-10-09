import { ConfigurationError } from '@/lib/errors';

/**
 * Default Gemma model identifier.
 *
 * Gemma 4 is the core intelligence of SnapStudy. The identifier stays
 * configurable via `GEMMA_MODEL` and is never hardcoded in feature logic.
 */
export const DEFAULT_GEMMA_MODEL = 'gemma-4-26b-a4b-it';

export interface ServerConfig {
    geminiApiKey: string;
    gemmaModel: string;
}

/**
 * Read and validate server configuration.
 *
 * Fails fast with a clear error if the API key is missing, so misconfiguration
 * surfaces as a readable message instead of a confusing crash.
 */
export function getServerConfig(): ServerConfig {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
        throw new ConfigurationError(
            'GEMINI_API_KEY is not set. Copy .env.example to .env.local and add your key.',
        );
    }

    const model = process.env.GEMMA_MODEL?.trim() || DEFAULT_GEMMA_MODEL;

    return { geminiApiKey: apiKey, gemmaModel: model };
}
