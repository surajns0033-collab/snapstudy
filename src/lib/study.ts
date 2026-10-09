/**
 * The study-kit contract: the prompt sent to Gemma 4, the expected JSON shape,
 * and a resilient parser that turns the model's raw text into a typed result.
 */

export interface Flashcard {
    front: string;
    back: string;
}

export interface QuizQuestion {
    question: string;
    options: string[];
    answer: string;
}

export interface StudyKit {
    title: string;
    summary: string;
    keyPoints: string[];
    flashcards: Flashcard[];
    quiz: QuizQuestion[];
}

/**
 * System instruction. Grounding rules here are what keep the output faithful
 * to the photo and stop the model from inventing content.
 */
export const SYSTEM_INSTRUCTION = [
    'You are Gemma 4, an expert study assistant.',
    'You are shown a single image of study material: handwritten or printed notes,',
    'a lecture slide, a textbook page, a diagram, or a whiteboard.',
    '',
    'Rules:',
    '- Use ONLY the content visible in the image. Never invent facts.',
    '- If part of the image is unreadable, do not guess — omit it.',
    '- Keep the language of the source material.',
    '- Return a single JSON object and nothing else.',
].join('\n');

/** The user instruction. Describes the exact JSON shape the app validates. */
export const STUDY_PROMPT = [
    'Turn this image into a structured study kit.',
    'Respond with a single JSON object with exactly these keys:',
    '{',
    '  "title": string,                       // a short, descriptive title',
    '  "summary": string,                     // a clear 3-5 sentence summary',
    '  "keyPoints": string[],                 // 4-8 the most important points',
    '  "flashcards": [{ "front": string, "back": string }],   // 6-10 cards',
    '  "quiz": [{ "question": string, "options": string[], "answer": string }]  // 3-5 questions; 4 options each; "answer" must match one option exactly',
    '}',
    'Do not include any text outside the JSON object.',
].join('\n');

/** Remove ```json fences and surrounding prose, then parse. */
function extractJson(raw: string): unknown | null {
    const trimmed = raw.trim();
    const withoutFences = trimmed
        .replace(/^```(?:json)?/i, '')
        .replace(/```$/i, '')
        .trim();

    const candidates: string[] = [withoutFences];

    const firstBrace = withoutFences.indexOf('{');
    const lastBrace = withoutFences.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        candidates.push(withoutFences.slice(firstBrace, lastBrace + 1));
    }

    for (const candidate of candidates) {
        try {
            return JSON.parse(candidate);
        } catch {
            // try the next candidate
        }
    }
    return null;
}

function asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map((item) => asString(item))
        .filter((item) => item.length > 0);
}

/**
 * Parse the model's raw response into a `StudyKit`.
 *
 * Coerces where reasonable and never throws for a partially-formed object;
 * a safe fallback is returned when the shape cannot be understood at all.
 */
export function parseStudyKit(raw: string): StudyKit {
    const parsed = extractJson(raw);

    if (!parsed || typeof parsed !== 'object') {
        return {
            title: 'Study kit',
            summary: raw.trim().slice(0, 600),
            keyPoints: [],
            flashcards: [],
            quiz: [],
        };
    }

    const source = parsed as Record<string, unknown>;

    const flashcards: Flashcard[] = Array.isArray(source.flashcards)
        ? source.flashcards
            .map((item) => {
                const card = (item ?? {}) as Record<string, unknown>;
                return { front: asString(card.front), back: asString(card.back) };
            })
            .filter((card) => card.front && card.back)
        : [];

    const quiz: QuizQuestion[] = Array.isArray(source.quiz)
        ? source.quiz
            .map((item) => {
                const q = (item ?? {}) as Record<string, unknown>;
                return {
                    question: asString(q.question),
                    options: asStringArray(q.options),
                    answer: asString(q.answer),
                };
            })
            .filter((q) => q.question && q.options.length > 0)
        : [];

    return {
        title: asString(source.title, 'Study kit'),
        summary: asString(source.summary),
        keyPoints: asStringArray(source.keyPoints),
        flashcards,
        quiz,
    };
}
