/**
 * POST /api/study
 *
 * Thin HTTP adapter. Runs on the Node.js runtime (required by the GenAI SDK)
 * so the API key never reaches the browser. Loads configuration, validates the
 * incoming image, delegates to the Gemma 4 client, and returns a uniform
 * response envelope.
 */
import type { NextRequest } from 'next/server';
import { getServerConfig } from '@/config/env';
import { GemmaStudyClient } from '@/lib/gemma';
import { toAppError, ValidationError } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

interface StudyBody {
    imageBase64?: unknown;
    mimeType?: unknown;
}

export async function POST(request: NextRequest): Promise<Response> {
    try {
        const config = getServerConfig();

        let body: StudyBody;
        try {
            body = (await request.json()) as StudyBody;
        } catch {
            throw new ValidationError('Malformed JSON body.');
        }

        if (typeof body.imageBase64 !== 'string' || !body.imageBase64.trim()) {
            throw new ValidationError('No image was provided.');
        }
        const mimeType = typeof body.mimeType === 'string' ? body.mimeType : 'image/png';
        if (!ALLOWED_MIME.includes(mimeType)) {
            throw new ValidationError(`Unsupported image type: ${mimeType}`);
        }

        const approxBytes = Math.floor((body.imageBase64.length * 3) / 4);
        if (approxBytes > MAX_IMAGE_BYTES) {
            throw new ValidationError('That image is too large. Please use one under 8 MB.');
        }

        const client = new GemmaStudyClient(config);
        const kit = await client.generate({ imageBase64: body.imageBase64, mimeType });

        return Response.json({ ok: true, model: client.modelName, data: kit });
    } catch (error) {
        const appError = toAppError(error);
        return Response.json(
            { ok: false, error: { code: appError.code, message: appError.message } },
            { status: appError.status },
        );
    }
}

/** Health/config probe — reports readiness without revealing secrets. */
export async function GET(): Promise<Response> {
    try {
        const config = getServerConfig();
        return Response.json({ ok: true, ready: true, model: config.gemmaModel });
    } catch (error) {
        const appError = toAppError(error);
        return Response.json(
            { ok: false, error: { code: appError.code, message: appError.message } },
            { status: appError.status },
        );
    }
}
