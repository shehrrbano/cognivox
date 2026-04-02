/**
 * patch_cyan_to_blue.mjs
 * Cleans up remaining 'cyan' and 'dark' leaks for professional blue theme.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const files = [
    'src/lib/MainHeader.svelte',
    'src/lib/StatusBar.svelte',
    'src/lib/SettingsModal.svelte',
    'src/lib/KnowledgeGraph.svelte'
];

files.forEach(relPath => {
    const filePath = join(__dirname, '..', relPath);
    let content = readFileSync(filePath, 'utf8');
    let normContent = content.replace(/\r\n/g, '\n');
    let original = normContent;

    // Replace badge-cyan with badge-blue (mapped to the blue variables in app.css anyway)
    normContent = normContent.replace(/badge-cyan/g, 'badge-blue');
    
    // Replace cyan bg colors with blue
    normContent = normContent.replace(/bg-cyan-500/g, 'bg-blue-500');
    normContent = normContent.replace(/bg-cyan-400/g, 'bg-blue-400');
    normContent = normContent.replace(/text-cyan-400/g, 'text-blue-500');
    normContent = normContent.replace(/border-cyan-500\/10/g, 'border-gray-200');

    // Replace dark leaks
    normContent = normContent.replace(/bg-dark-600/g, 'bg-gray-100');
    normContent = normContent.replace(/bg-black\/95/g, 'bg-white');

    if (normContent !== original) {
        let changed = normContent.replace(/\n/g, '\r\n');
        writeFileSync(filePath, changed, 'utf8');
        console.log(`✅ Patched ${relPath}`);
    }
});
