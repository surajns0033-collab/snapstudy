/**
 * A small, typed error hierarchy so the API can return safe, consistent
 * messages and the client never sees a stack trace.
 */

export type ErrorCode =
    | 'CONFIGURATION_ERROR'
    | 'VALIDATION_ERROR'
    | 'AI_UNAVAILABLE'
    | 'AI_RATE_LIMITED'
    | 'AI_TIMEOUT'
    | 'INTERNAL_ERROR';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
    CONFIGURATION_ERROR: 500,
    VALIDATION_ERROR: 400,
    AI_UNAVAILABLE: 503,
    AI_RATE_LIMITED: 429,
    AI_TIMEOUT: 504,
    INTERNAL_ERROR: 500,
};

export class AppError extends Error {
    readonly code: ErrorCode;
    readonly status: number;

    constructor(code: ErrorCode, message: string) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.status = STATUS_BY_CODE[code];
    }
}

export class ConfigurationError extends AppError {
    constructor(message: string) {
        super('CONFIGURATION_ERROR', message);
        this.name = 'ConfigurationError';
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super('VALIDATION_ERROR', message);
        this.name = 'ValidationError';
    }
}

export class AiServiceError extends AppError {
    constructor(code: ErrorCode, message: string) {
        super(code, message);
        this.name = 'AiServiceError';
    }
}

/** Normalise an unknown thrown value into an `AppError`. */
export function toAppError(err: unknown): AppError {
    if (err instanceof AppError) {
        return err;
    }
    if (err instanceof Error) {
        return new AppError('INTERNAL_ERROR', 'Something went wrong. Please try again.');
    }
    return new AppError('INTERNAL_ERROR', 'Something went wrong. Please try again.');
}
