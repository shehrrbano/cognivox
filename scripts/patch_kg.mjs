/**
 * patch_kg.mjs
 * Applies 2 remaining patches to KnowledgeGraph.svelte:
 *  1. Layout stabilization: anchor new nodes near their source edge neighbor
 *  2. Search highlight ring: golden ring on nodes matching searchQuery
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, '..', 'src', 'lib', 'KnowledgeGraph.svelte');

let content = readFileSync(filePath, 'utf8');
let changes = 0;

// ============================================================
// PATCH 1: Layout Stabilization — anchor new nodes near source
// ============================================================
const OLD_INIT = `            if (!positions.has(node.id)) {
                const angle = (i / Math.max(nodes.length, 1)) * 2 * Math.PI;
                // Spread nodes out more based on count - use larger radius
                const baseRadius =
                    Math.min(containerWidth, containerHeight) * 0.35;
                const radius =
                    baseRadius +
                    (nodes.length > 5 ? (nodes.length - 5) * 15 : 0);
                positions.set(node.id, {
                    x:
                        centerX +
                        radius * Math.cos(angle) +
                        (Math.random() - 0.5) * 80,
                    y:
                        centerY +
                        radius * Math.sin(angle) +
                        (Math.random() - 0.5) * 80,
                    vx: 0,
                    vy: 0,
                });
            }`;

const NEW_INIT = `            if (!positions.has(node.id)) {
                // [PRIORITY 2] Anchor new nodes near their source edge neighbor
                // to prevent jarring layout jumps during live recording.
                const sourceEdge = edges.find(e => e.to === node.id && positions.has(e.from));
                if (sourceEdge) {
                    const srcPos = positions.get(sourceEdge.from);
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
                }
            }`;

// Normalise CRLF for matching
const normContent = content.replace(/\r\n/g, '\n');
const normOldInit = OLD_INIT.replace(/\r\n/g, '\n');

if (normContent.includes(normOldInit)) {
    const patched = normContent.replace(normOldInit, NEW_INIT);
    content = patched.replace(/\r?\n/g, '\r\n'); // restore CRLF
    changes++;
    console.log('✅ PATCH 1 applied: layout stabilization');
} else {
    console.warn('⚠️  PATCH 1 target not found — already applied?');
}

// ============================================================
// PATCH 2: Search Highlight Ring
// ============================================================
const OLD_CIRCLES = `                                    <circle
                                        r={nodeR + 6}
                                        fill="none"
                                        stroke={color}
                                        stroke-width={isCluster ? 2 : 1}
                                        stroke-opacity={draggedNode === node.id
                                            ? 0.5
                                            : 0.2}
                                        stroke-dasharray={isCluster
                                            ? "4 3"
                                            : "none"}
                                        class={draggedNode === node.id
                                            ? ""
                                            : "animate-pulse"}
                                    />
                                    <circle
                                        r={nodeR}
                                        fill={color}
                                        fill-opacity={isCluster
                                            ? 0.2
                                            : draggedNode === node.id
                                              ? 0.25
                                              : 0.1}
                                        stroke={color}
                                        stroke-width={draggedNode === node.id
                                            ? 3
                                            : 2}
                                        filter="url(#glow)"
                                    />`;

const NEW_CIRCLES = `                                    {#if highlightedNodes.has(node.id)}
                                        <!-- [PRIORITY 1] Search highlight ring -->
                                        <circle
                                            r={nodeR + 12}
                                            fill="none"
                                            stroke="#F59E0B"
                                            stroke-width="3"
                                            stroke-opacity="0.9"
                                        />
                                        <circle
                                            r={nodeR + 17}
                                            fill="none"
                                            stroke="#F59E0B"
                                            stroke-width="1"
                                            stroke-opacity="0.35"
                                            class="animate-pulse"
                                        />
                                    {/if}
                                    <circle
                                        r={nodeR + 6}
                                        fill="none"
                                        stroke={highlightedNodes.has(node.id) ? "#F59E0B" : color}
                                        stroke-width={isCluster ? 2 : 1}
                                        stroke-opacity={draggedNode === node.id
                                            ? 0.5
                                            : highlightedNodes.has(node.id) ? 0.7 : 0.2}
                                        stroke-dasharray={isCluster ? "4 3" : "none"}
                                        class={draggedNode === node.id ? "" : "animate-pulse"}
                                    />
                                    <circle
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

const norm2 = content.replace(/\r\n/g, '\n');
const normOldCircles = OLD_CIRCLES.replace(/\r\n/g, '\n');

if (norm2.includes(normOldCircles)) {
    const patched2 = norm2.replace(normOldCircles, NEW_CIRCLES);
    content = patched2.replace(/\r?\n/g, '\r\n');
    changes++;
    console.log('✅ PATCH 2 applied: search highlight ring');
} else {
    console.warn('⚠️  PATCH 2 target not found — already applied?');
}

if (changes > 0) {
    writeFileSync(filePath, content, 'utf8');
    console.log(`\n✅ KnowledgeGraph.svelte patched (${changes} change(s) applied).`);
} else {
    console.log('\nNo changes applied.');
}
