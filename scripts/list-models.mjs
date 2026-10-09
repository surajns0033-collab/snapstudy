#!/usr/bin/env node
/**
 * list-models.mjs
 *
 * Lists the model IDs available to your Gemini API key so you can confirm —
 * before the live demo — which Gemma and Gemini models you can actually call.
 *
 * Usage (from the snapstudy folder):
 *   node scripts/list-models.mjs                 # reads GEMINI_API_KEY from the environment
 *   node scripts/list-models.mjs <YOUR_API_KEY>  # or pass the key explicitly
 *
 * Calls the public REST endpoint directly, so it has NO npm dependencies.
 * Requires Node.js 18+ (uses the built-in global `fetch`).
 */

const apiKey = process.argv[2] || process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error('No API key found.');
    console.error('Set GEMINI_API_KEY, or pass the key as the first argument:');
    console.error('  node scripts/list-models.mjs <YOUR_API_KEY>');
    process.exit(1);
}

const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;

let response;
try {
    response = await fetch(endpoint);
} catch (error) {
    console.error('Network request failed:', error instanceof Error ? error.message : error);
    process.exit(1);
}

if (!response.ok) {
    console.error(`Request failed: ${response.status} ${response.statusText}`);
    console.error(await response.text());
    process.exit(1);
}

const payload = await response.json();
const ids = (payload.models ?? [])
    .map((model) => String(model.name ?? '').replace(/^models\//, ''))
    .filter(Boolean)
    .sort();

const gemma = ids.filter((id) => id.includes('gemma'));

console.log(`Total models available to this key: ${ids.length}\n`);
console.log('Gemma models:');
console.log(gemma.length ? gemma.map((id) => `  - ${id}`).join('\n') : '  (none)');

console.log('\nRecommended default for SnapStudy: gemma-4-26b-a4b-it');
if (gemma.includes('gemma-4-26b-a4b-it')) {
    console.log('✓ Gemma 4 is available — this key can run SnapStudy as designed.');
} else if (gemma.length > 0) {
    console.log('! Pick an available Gemma 4 variant above and set it as GEMMA_MODEL.');
} else {
    console.log('! No Gemma models were listed for this key. Check region/access in AI Studio.');
}
