import { SnapStudy } from '@/components/SnapStudy';

export default function HomePage() {
    return (
        <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-10 sm:px-6">
            <header className="mb-8">
                <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-lg text-white">
                        📸
                    </span>
                    <h1 className="text-2xl font-semibold tracking-tight">SnapStudy</h1>
                    <span className="ml-auto rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                        Gemma 4 · Gemini API
                    </span>
                </div>
                <p className="mt-3 text-slate-600">
                    Snap a page of notes, a slide, or a whiteboard. Get a structured study kit —
                    summary, key points, flashcards, and a quiz.
                </p>
            </header>

            <SnapStudy />

            <footer className="mt-12 border-t border-slate-200 pt-6 text-xs text-slate-500">
                Powered by <strong>Gemma 4</strong> through the Gemini API. Images are sent to the
                model only to produce your study kit and are not stored.
            </footer>
        </main>
    );
}
