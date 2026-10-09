/**
 * Gemma 4 client — the single point of contact with the AI provider.
 *
 * Path:  UI → /api/study → GemmaStudyClient → @google/genai → Gemini API → Gemma 4
 *
 * This module is server-only. It builds a multimodal request (the image as
 * native inline data plus the study-kit instruction), asks for JSON output,
 * enforces a timeout, and normalises provider errors into typed errors.
 */
import { GoogleGenAI } from '@google/genai';
import type { ServerConfig } from '@/config/env';
import { AiServiceError, ConfigurationError } from '@/lib/errors';
import { parseStudyKit, STUDY_PROMPT, SYSTEM_INSTRUCTION, type StudyKit } from '@/lib/study';

/** The minimal slice of the SDK we depend on, so tests can inject a fake. */
export interface GenAiClientLike {
    models: {
        generateContent: (args: {
            model: string;
            contents: unknown;
            config?: Record<string, unknown>;
        }) => Promise<{ text?: string }>;
    };
}

export interface StudyImageInput {
    /** Base64-encoded image bytes (no data-URL prefix). */
    imageBase64: string;
    /** e.g. image/png, image/jpeg, image/webp. */
    mimeType: string;
}

const REQUEST_TIMEOUT_MS = 45_000;

export class GemmaStudyClient {
    private readonly client: GenAiClientLike;
    private readonly model: string;

    constructor(config: ServerConfig, client?: GenAiClientLike) {
        this.model = config.gemmaModel;
        this.client =
            client ??
            (new GoogleGenAI({ apiKey: config.geminiApiKey }) as unknown as GenAiClientLike);
    }

    get modelName(): string {
        return this.model;
    }

    /**
     * Generate a study kit from a single image of study material.
     *
     * @throws {AiServiceError} on provider availability problems.
     */
    async generate(input: StudyImageInput): Promise<StudyKit> {
        const parts = [
            { inlineData: { mimeType: input.mimeType, data: input.imageBase64 } },
            { text: STUDY_PROMPT },
        ];

        let result: { text?: string };
        try {
            result = await this.withTimeout(
                this.client.models.generateContent({
                    model: this.model,
                    contents: [{ role: 'user', parts }],
                    config: {
                        systemInstruction: SYSTEM_INSTRUCTION,
                        responseMimeType: 'application/json',
                        temperature: 0.3,
                        topP: 0.9,
                        maxOutputTokens: 4096,
                    },
                }),
            );
        } catch (error) {
            throw normalizeProviderError(error);
        }

        const text = typeof result.text === 'string' ? result.text : '';
        if (!text.trim()) {
            throw new AiServiceError('AI_UNAVAILABLE', 'The model returned an empty response.');
        }

        return parseStudyKit(text);
    }

    private withTimeout<T>(promise: Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new AiServiceError('AI_TIMEOUT', 'The model took too long to respond.'));
            }, REQUEST_TIMEOUT_MS);

            promise.then(
                (value) => {
                    clearTimeout(timer);
                    resolve(value);
                },
                (error) => {
                    clearTimeout(timer);
                    reject(error);
                },
            );
        });
    }
}

/** Map an unknown provider error to a typed, user-safe error. */
export function normalizeProviderError(error: unknown): AiServiceError {
    const status =
        typeof error === 'object' && error !== null && 'status' in error
            ? Number((error as { status?: unknown }).status)
            : undefined;

    if (status === 429) {
        return new AiServiceError('AI_RATE_LIMITED', 'Rate limit reached. Please wait and retry.');
    }
    if (status === 401 || status === 403) {
        return new ConfigurationError('The API key was rejected. Check GEMINI_API_KEY.');
    }
    if (status === 404) {
        return new ConfigurationError('The requested Gemma model was not found for this API key.');
    }
    if (typeof status === 'number' && status >= 500) {
        return new AiServiceError('AI_UNAVAILABLE', 'The AI service is temporarily unavailable.');
    }
    return new AiServiceError('AI_UNAVAILABLE', 'Could not reach the AI service. Please try again.');
}
