'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { requestStudyKit } from '@/lib/api';
import type { StudyKit } from '@/lib/study';

type Tab = 'summary' | 'flashcards' | 'quiz';

/** Read a Blob as a base64 string without the data-URL prefix. */
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result ?? '');
            const comma = result.indexOf(',');
            resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        reader.onerror = () => reject(new Error('Could not read that image.'));
        reader.readAsDataURL(blob);
    });
}

export function SnapStudy() {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [mimeType, setMimeType] = useState('image/png');
    const [kit, setKit] = useState<StudyKit | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<Tab>('summary');
    const [cameraOn, setCameraOn] = useState(false);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileRef = useRef<HTMLInputElement | null>(null);

    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setCameraOn(false);
    }, []);

    useEffect(() => stopCamera, [stopCamera]);

    async function acceptImage(blob: Blob, type: string) {
        const base64 = await blobToBase64(blob);
        setImageBase64(base64);
        setMimeType(type);
        setImageUrl(URL.createObjectURL(blob));
        setKit(null);
        setError(null);
    }

    function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (file) {
            void acceptImage(file, file.type || 'image/png');
        }
    }

    async function startCamera() {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false,
            });
            streamRef.current = stream;
            setCameraOn(true);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
        } catch {
            setError('Camera permission was denied or is unavailable. You can upload an image instead.');
        }
    }

    function capturePhoto() {
        const video = videoRef.current;
        if (!video) {
            return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const context = canvas.getContext('2d');
        if (!context) {
            return;
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
            if (blob) {
                void acceptImage(blob, 'image/png');
                stopCamera();
            }
        }, 'image/png');
    }

    async function generate() {
        if (!imageBase64) {
            setError('Add an image first — take a photo or upload one.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const result = await requestStudyKit(imageBase64, mimeType);
            setKit(result);
            setTab('summary');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
                    >
                        Upload image
                    </button>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={onFileChange}
                    />
                    {!cameraOn ? (
                        <button
                            type="button"
                            onClick={() => void startCamera()}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                            Use camera
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={capturePhoto}
                            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                        >
                            Capture
                        </button>
                    )}
                    {cameraOn && (
                        <button
                            type="button"
                            onClick={stopCamera}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                            Stop camera
                        </button>
                    )}
                </div>

                {cameraOn && (
                    <video
                        ref={videoRef}
                        playsInline
                        muted
                        className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-100"
                    />
                )}

                {imageUrl && !cameraOn && (
                    <div className="mt-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={imageUrl}
                            alt="Selected study material"
                            className="max-h-80 w-full rounded-xl border border-slate-200 object-contain"
                        />
                    </div>
                )}

                <div className="mt-4">
                    <button
                        type="button"
                        onClick={() => void generate()}
                        disabled={loading || !imageBase64}
                        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? 'Gemma 4 is reading your notes…' : 'Generate study kit'}
                    </button>
                </div>

                {error && (
                    <p
                        role="alert"
                        className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                    >
                        {error}
                    </p>
                )}
            </section>

            {kit && <StudyKitView kit={kit} tab={tab} onTab={setTab} />}
        </div>
    );
}

function StudyKitView({
    kit,
    tab,
    onTab,
}: {
    kit: StudyKit;
    tab: Tab;
    onTab: (tab: Tab) => void;
}) {
    const tabs: { id: Tab; label: string }[] = [
        { id: 'summary', label: 'Summary' },
        { id: 'flashcards', label: `Flashcards (${kit.flashcards.length})` },
        { id: 'quiz', label: `Quiz (${kit.quiz.length})` },
    ];

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">{kit.title}</h2>

            <div className="mt-4 flex gap-2 border-b border-slate-200">
                {tabs.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => onTab(item.id)}
                        className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${tab === item.id
                                ? 'border-brand-600 text-brand-700'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="mt-4">
                {tab === 'summary' && <SummaryView kit={kit} />}
                {tab === 'flashcards' && <FlashcardsView kit={kit} />}
                {tab === 'quiz' && <QuizView kit={kit} />}
            </div>
        </section>
    );
}

function SummaryView({ kit }: { kit: StudyKit }) {
    return (
        <div className="space-y-4">
            <p className="leading-relaxed text-slate-700">{kit.summary}</p>
            {kit.keyPoints.length > 0 && (
                <div>
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Key points
                    </h3>
                    <ul className="space-y-2">
                        {kit.keyPoints.map((point, index) => (
                            <li key={index} className="flex gap-2 text-slate-700">
                                <span className="text-brand-600">•</span>
                                <span>{point}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

function FlashcardsView({ kit }: { kit: StudyKit }) {
    const [revealed, setRevealed] = useState<number | null>(null);
    if (kit.flashcards.length === 0) {
        return <p className="text-slate-500">No flashcards were produced for this image.</p>;
    }
    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {kit.flashcards.map((card, index) => {
                const isOpen = revealed === index;
                return (
                    <button
                        key={index}
                        type="button"
                        onClick={() => setRevealed(isOpen ? null : index)}
                        className="flex min-h-24 flex-col items-start rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-brand-300"
                    >
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            {isOpen ? 'Answer' : 'Question — tap to reveal'}
                        </span>
                        <span className="mt-1 font-medium text-slate-800">
                            {isOpen ? card.back : card.front}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

function QuizView({ kit }: { kit: StudyKit }) {
    const [chosen, setChosen] = useState<Record<number, string>>({});
    if (kit.quiz.length === 0) {
        return <p className="text-slate-500">No quiz questions were produced for this image.</p>;
    }
    return (
        <ol className="space-y-5">
            {kit.quiz.map((question, qIndex) => (
                <li key={qIndex}>
                    <p className="font-medium text-slate-800">
                        {qIndex + 1}. {question.question}
                    </p>
                    <div className="mt-2 space-y-2">
                        {question.options.map((option, oIndex) => {
                            const picked = chosen[qIndex];
                            const isPicked = picked === option;
                            const isCorrect = option === question.answer;
                            const showState = picked !== undefined;
                            const base =
                                'w-full rounded-lg border px-3 py-2 text-left text-sm transition';
                            const state = !showState
                                ? 'border-slate-200 hover:border-brand-300'
                                : isCorrect
                                    ? 'border-green-300 bg-green-50 text-green-800'
                                    : isPicked
                                        ? 'border-red-300 bg-red-50 text-red-800'
                                        : 'border-slate-200 text-slate-500';
                            return (
                                <button
                                    key={oIndex}
                                    type="button"
                                    disabled={showState}
                                    onClick={() =>
                                        setChosen((prev) => ({ ...prev, [qIndex]: option }))
                                    }
                                    className={`${base} ${state}`}
                                >
                                    {option}
                                </button>
                            );
                        })}
                    </div>
                </li>
            ))}
        </ol>
    );
}
