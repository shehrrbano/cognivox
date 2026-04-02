/**
 * patch_page.mjs
 * Applies the searchQuery prop to the <GraphTab> instantiation in +page.svelte
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, '..', 'src', 'routes', '+page.svelte');

let content = readFileSync(filePath, 'utf8');

const OLD_TAG = `                    <GraphTab
                        {graphNodes}
                        {graphEdges}
                        {transcripts}
                        isGenerating={isGeneratingGraph}`;

const NEW_TAG = `                    <GraphTab
                        {graphNodes}
                        {graphEdges}
                        {transcripts}
                        {searchQuery}
                        isGenerating={isGeneratingGraph}`;

const normContent = content.replace(/\r\n/g, '\n');
const normOldTag = OLD_TAG.replace(/\r\n/g, '\n');

if (normContent.includes(normOldTag)) {
    const patched = normContent.replace(normOldTag, NEW_TAG);
    content = patched.replace(/\r?\n/g, '\r\n');
    writeFileSync(filePath, content, 'utf8');
    console.log('✅ +page.svelte patched to pass searchQuery to GraphTab.');
} else {
    console.error('❌ Failed to find GraphTab target in +page.svelte');
}
