/**
 * patch_kg_visuals.mjs
 * Applies visual style rules from KNOWLEDGE_GRAPH_UI_VISUAL_UNIFIER_v1
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, '..', 'src', 'lib', 'KnowledgeGraph.svelte');

let content = readFileSync(filePath, 'utf8');

// Normalize line endings for reliable replacement
let normContent = content.replace(/\r\n/g, '\n');
let changes = 0;

// 1. Add pattern to <defs> (doing a global replace to catch both fullscreen and normal)
const patternDef = `<pattern id="dotGrid" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="var(--kg-dot-color)"/></pattern>`;
if (!normContent.includes('id="dotGrid"')) {
    normContent = normContent.replace(/<defs>/g, `<defs>\n                    ${patternDef}`);
    changes++;
    console.log('✅ Injected dotGrid pattern into <defs>');
}

// 2. Add <rect width="100%" height="100%" fill="url(#dotGrid)" /> immediately after </defs>
const backgroundRect = `</defs>\n                <rect width="100%" height="100%" fill="url(#dotGrid)" pointer-events="none" />`;
if (!normContent.includes('fill="url(#dotGrid)"')) {
    normContent = normContent.replace(/<\/defs>/g, backgroundRect);
    changes++;
    console.log('✅ Injected dotGrid background rectangle');
}

// 3. Update Node sizes and node circles
// Replace the radius declaration
normContent = normContent.replace(/\{@const nodeR = isCluster \? 32 : 22\}/g, `{@const nodeR = isCluster ? 36 : 28}`);

// Replace the normal fill circle with the bordered variant
const oldNodeCircle = `<circle
                                        r={nodeR}
                                        fill={color}
                                        fill-opacity={isCluster
                                            ? 0.2
                                            : highlightedNodes.has(node.id)
                                              ? 0.5
                                              : draggedNode === node.id
                                                ? 0.25
                                                : 0.1}
                                        stroke={highlightedNodes.has(node.id) ? "#F59E0B" : color}
                                        stroke-width={highlightedNodes.has(node.id) || draggedNode === node.id ? 3 : 2}
                                        filter="url(#glow)"
                                    />`;
const newNodeCircle = `<circle
                                        r={nodeR}
                                        fill="var(--kg-node-fill)"
                                        stroke={highlightedNodes.has(node.id) ? "#F59E0B" : color}
                                        stroke-width="var(--kg-node-stroke-width)"
                                        filter={draggedNode === node.id ? "url(#glow)" : ""}
                                    />`;
// We also need to remove the "- 6" inner circle which is no longer needed in the minimalist style
const innerCircle = `<circle
                                        r={nodeR - 6}
                                        fill={color}
                                        fill-opacity="0.05"
                                    />`;

if (normContent.includes(oldNodeCircle)) {
    normContent = normContent.replace(new RegExp(oldNodeCircle.replace(/[.*+?^$\{()|[\]\\]/g, '\\$&'), 'g'), newNodeCircle);
    normContent = normContent.replace(new RegExp(innerCircle.replace(/[.*+?^$\{()|[\]\\]/g, '\\$&'), 'g'), '');
    changes++;
    console.log('✅ Updated primary node circles to hollow minimalist style');
}

// 4. Update Node Text Typography
const oldText = `font-size="10"
                                        font-weight="500"`;
const newText = `font-size="11"
                                        font-weight="600"`;
if (normContent.includes(oldText)) {
    normContent = normContent.replace(new RegExp(oldText.replace(/[.*+?^$\{()|[\]\\]/g, '\\$&'), 'g'), newText);
    changes++;
    console.log('✅ Updated node typography to bold 11px');
}

// Restore CRLF
content = normContent.replace(/\n/g, '\r\n');
writeFileSync(filePath, content, 'utf8');

console.log(`\n🎉 KnowledgeGraph.svelte patched successfully with ${changes} changes.`);
