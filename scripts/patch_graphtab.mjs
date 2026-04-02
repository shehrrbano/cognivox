/**
 * patch_graphtab.mjs
 * Injects Pixel-Perfect UI Legend Pills into GraphTab.svelte
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, '..', 'src', 'lib', 'GraphTab.svelte');

let content = readFileSync(filePath, 'utf8');
let normContent = content.replace(/\r\n/g, '\n');

const OLD_HEADER = `            <div class="flex items-center gap-3">
                <span class="text-sm font-medium text-gray-800"
                    >Knowledge Graph Visualization</span
                >
                <span class="text-xs text-gray-400"
                    >{graphNodes.length} nodes • {graphEdges.length} edges</span
                >
            </div>`;

const NEW_HEADER = `            <div class="flex items-center gap-3">
                <div class="flex items-center gap-2">
                    <div class="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-100 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                        <div class="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                        <span class="text-[10px] font-bold tracking-wider text-gray-600 uppercase">TASKS</span>
                    </div>
                    <div class="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-100 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                        <div class="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                        <span class="text-[10px] font-bold tracking-wider text-gray-600 uppercase">DECISIONS</span>
                    </div>
                    <div class="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-100 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                        <div class="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                        <span class="text-[10px] font-bold tracking-wider text-gray-600 uppercase">RISKS</span>
                    </div>
                </div>
            </div>`;

const normOldHeader = OLD_HEADER.replace(/\r\n/g, '\n');

if (normContent.includes(normOldHeader)) {
    normContent = normContent.replace(normOldHeader, NEW_HEADER);
    content = normContent.replace(/\n/g, '\r\n');
    writeFileSync(filePath, content, 'utf8');
    console.log('✅ GraphTab.svelte updated with Legend Pills');
} else {
    console.error('❌ Could not find old header in GraphTab.svelte');
}
