import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'SnapStudy — snap your notes, get a study kit (Gemma 4)',
    description:
        'Snap a page of notes, a slide, or a whiteboard and get a structured study kit — summary, key points, flashcards, and a quiz — powered by Gemma 4 via the Gemini API.',
    applicationName: 'SnapStudy',
    keywords: ['Gemma 4', 'flashcards', 'study', 'multimodal', 'Gemini API'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
