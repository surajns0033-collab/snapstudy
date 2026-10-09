import type { StudyKit } from '@/lib/study';

export interface StudyResponse {
    ok: boolean;
    model?: string;
    data?: StudyKit;
    error?: { code: string; message: string };
}

/** Send an image (base64) to the server and return the generated study kit. */
export async function requestStudyKit(imageBase64: string, mimeType: string): Promise<StudyKit> {
    const response = await fetch('/api/study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType }),
    });

    const payload = (await response.json()) as StudyResponse;

    if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message ?? 'Something went wrong. Please try again.');
    }

    return payload.data;
}
