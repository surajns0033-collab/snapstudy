import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Pin the tracing root to this project so a parent lockfile does not affect it.
    outputFileTracingRoot: fileURLToPath(new URL('.', import.meta.url)),
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    // The capture feature uses the in-page camera stream (same origin).
                    { key: 'Permissions-Policy', value: 'camera=(self)' },
                ],
            },
        ];
    },
};

export default nextConfig;
