/**
 * patch_final_tabs.mjs
 * Standardizes SpeakersTab and AnalyticsTab to the light theme.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const files = [
    'src/lib/SpeakersTab.svelte',
    'src/lib/AnalyticsTab.svelte'
];

files.forEach(relPath => {
    const filePath = join(__dirname, '..', relPath);
    let content = readFileSync(filePath, 'utf8');
    let normContent = content.replace(/\r\n/g, '\n');
    let original = normContent;

    // SpeakersTab Specifics
    normContent = normContent.replace(/bg-gray-800\/50/g, 'bg-gray-50');
    normContent = normContent.replace(/border-gray-700\/50/g, 'border-gray-200');
    normContent = normContent.replace(/text-blue-400/g, 'text-blue-600');
    normContent = normContent.replace(/text-gray-300/g, 'text-gray-800');
    normContent = normContent.replace(/bg-blue-500\/20/g, 'bg-blue-50');
    normContent = normContent.replace(/text-blue-300/g, 'text-blue-500');
    normContent = normContent.replace(/hover:bg-blue-500\/30/g, 'hover:bg-blue-100');

    // AnalyticsTab Specifics
    normContent = normContent.replace(/bg-slate-600/g, 'bg-gray-300');

    if (normContent !== original) {
        let changed = normContent.replace(/\n/g, '\r\n');
        writeFileSync(filePath, changed, 'utf8');
        console.log(`✅ Patched ${relPath}`);
    }
});
