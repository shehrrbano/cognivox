/**
 * patch_ts_errors.mjs
 * Fixes the 3 TypeScript errors found by svelte-check.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 1. Fix srcPos null check in KnowledgeGraph.svelte
const kgPath = join(__dirname, '..', 'src', 'lib', 'KnowledgeGraph.svelte');
let kgContent = readFileSync(kgPath, 'utf8').replace(/\r\n/g, '\n');
const kgTarget = `                    const srcPos = positions.get(sourceEdge.from);
                    const angle = Math.random() * 2 * Math.PI;
                    positions.set(node.id, {
                        x: srcPos.x + Math.cos(angle) * (IDEAL_EDGE_LENGTH * 0.6) + (Math.random() - 0.5) * 40,
                        y: srcPos.y + Math.sin(angle) * (IDEAL_EDGE_LENGTH * 0.6) + (Math.random() - 0.5) * 40,
                        vx: 0,
                        vy: 0,
                    });`;
const kgReplacement = `                    const srcPos = positions.get(sourceEdge.from);
                    if (srcPos) {
                        const angle = Math.random() * 2 * Math.PI;
                        positions.set(node.id, {
                            x: srcPos.x + Math.cos(angle) * (IDEAL_EDGE_LENGTH * 0.6) + (Math.random() - 0.5) * 40,
                            y: srcPos.y + Math.sin(angle) * (IDEAL_EDGE_LENGTH * 0.6) + (Math.random() - 0.5) * 40,
                            vx: 0,
                            vy: 0,
                        });
                    } else {
                        const angle = (i / Math.max(nodes.length, 1)) * 2 * Math.PI;
                        const baseRadius = Math.min(containerWidth, containerHeight) * 0.35;
                        const radius = baseRadius + (nodes.length > 5 ? (nodes.length - 5) * 15 : 0);
                        positions.set(node.id, {
                            x: centerX + radius * Math.cos(angle) + (Math.random() - 0.5) * 80,
                            y: centerY + radius * Math.sin(angle) + (Math.random() - 0.5) * 80,
                            vx: 0,
                            vy: 0,
                        });
                    }`;

if (kgContent.includes(kgTarget)) {
    kgContent = kgContent.replace(kgTarget, kgReplacement);
    writeFileSync(kgPath, kgContent.replace(/\n/g, '\r\n'), 'utf8');
    console.log('✅ Fixed KnowledgeGraph.svelte null check');
} else {
    console.log('❌ Failed to find KnowledgeGraph.svelte target');
}

// 2. Fix GraphTab props and KnowledgeGraph instantiation
const gtPath = join(__dirname, '..', 'src', 'lib', 'GraphTab.svelte');
let gtContent = readFileSync(gtPath, 'utf8').replace(/\r\n/g, '\n');

// Add export let searchQuery = "";
if (!gtContent.includes('export let searchQuery')) {
    gtContent = gtContent.replace('export let isGenerating: boolean = false;', 'export let isGenerating: boolean = false;\n    export let searchQuery: string = "";');
    console.log('✅ Added searchQuery prop to GraphTab.svelte');
}

// Pass searchQuery to KnowledgeGraph
if (gtContent.includes('<KnowledgeGraph') && !gtContent.includes('{searchQuery}')) {
    gtContent = gtContent.replace('<KnowledgeGraph', '<KnowledgeGraph\n            {searchQuery}');
    console.log('✅ Passed searchQuery to KnowledgeGraph in GraphTab.svelte');
}
writeFileSync(gtPath, gtContent.replace(/\n/g, '\r\n'), 'utf8');
