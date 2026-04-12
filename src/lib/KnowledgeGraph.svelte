<script lang="ts">
    import { onMount, onDestroy, untrack } from "svelte";

    let {
        nodes = [],
        edges = [],
        compact = false,
        searchQuery = "",
        initialPositions = null as Record<string, { x: number; y: number }> | null, // [PERSISTENCE_v1] Load saved coordinates
        pauseSimulation = false,
        isFullscreen = $bindable(false),
        // KG_UNIFIED_v1: callback props replace createEventDispatcher (Svelte 5 compatible)
        ontoggleCluster = undefined as ((d: { nodeId: string }) => void) | undefined,
        onlayoutChanged = undefined as ((d: { positions: Record<string, { x: number; y: number }> }) => void) | undefined,
    } = $props();

    // INTELLIGENT_PARSING_FIXED: local search term overrides prop when set
    let localSearchTerm = $state("");

    // Reactive: set of node IDs that match the search query (local input or external prop)
    let highlightedNodes = $derived.by(() => {
        const q = (localSearchTerm.trim() || searchQuery.trim()).toLowerCase();
        if (q.length < 2) return new Set<string>();
        return new Set(
            nodes
                .filter(n =>
                    n.id.toLowerCase().includes(q) ||
                    (n.label || '').toLowerCase().includes(q) ||
                    n.type.toLowerCase().includes(q)
                )
                .map(n => n.id)
        );
    });

    // Force-directed layout state
    interface NodePosition {
        x: number;
        y: number;
        vx: number;
        vy: number;
        fx?: number | null;
        fy?: number | null;
    }

    // [REACTIVE_v2] Use Record for Svelte 5 granular reactivity
    let positions = $state<Record<string, NodePosition>>({});
    export const getPositions = () => {
        const map = new Map<string, NodePosition>();
        Object.entries(positions).forEach(([id, pos]) => map.set(id, pos));
        return map;
    };

    // KG_UNIFIED_v1: Expose refreshLayout so parent can trigger re-measure after tab becomes visible.
    // Called by +page.svelte $effect when activeTab switches to 'graph' (display:none → block).
    export function refreshLayout() {
        untrack(() => {
            measureAndAttach();
            setTimeout(() => fitToView(), 80);
        });
    }

    let svgElement = $state<SVGSVGElement>();
    let containerEl = $state<HTMLDivElement>();
    let containerWidth = $state(600);
    let containerHeight = $state(400);
    let animationFrame: number;
    let isSimulating = $state(true);
    let draggedNode = $state<string | null>(null);
    let simulationTick = $state(0);

    // Pan & Zoom state
    let zoomLevel = $state(1.0);
    let panX = $state(0);
    let panY = $state(0);
    let isPanning = $state(false);

    // isFullscreen is now a bindable prop
    let selectedNode = $state<string | null>(null);

    // [OPTIMIZATION_v2] Tuned constants for interactive stability
    const REPULSION = 18000; // Lowered from 28k to prevent jitter
    const ATTRACTION = 0.012;
    const DAMPING = 0.82; // Slightly more friction
    const CENTER_PULL = 0.005;
    const TYPE_PULL = 0.006;
    const MIN_DISTANCE = 110;
    const IDEAL_EDGE_LENGTH = 150;

    let injectionCooldown = $state(0);
    let previousNodeCount = $state(0);

    // [PERSISTENCE_v1] Initialize node positions with spatial memory support
    function initializePositions() {
        if (nodes.length === 0) return;
        
        const centerX = containerWidth > 0 ? containerWidth / 2 : 400;
        const centerY = containerHeight > 0 ? containerHeight / 2 : 300;

        nodes.forEach((node, i) => {
            // [PERSISTENCE_v1] Additive-only initialization:
            // Do NOT overwrite positions if the node already has a valid coordinate in the Map.
            // This prevents manual moves from being "snapped back" when new intelligence arrives.
            if (!positions[node.id]) {
                // Try restore from initialPositions first (saved session)
                if (initialPositions && initialPositions[node.id]) {
                    const saved = initialPositions[node.id];
                    positions[node.id] = {
                        x: saved.x,
                        y: saved.y,
                        vx: 0,
                        vy: 0,
                    };
                } else if (i === 0) {
                    // First node is the Anchor
                    positions[node.id] = {
                        x: centerX,
                        y: centerY,
                        vx: 0,
                        vy: 0,
                        fx: centerX, // [PSYCHO_v1] Lock root node initially to center
                        fy: centerY
                    };
                } else {
                    // Spawn logic: Mind-map style radial spread
                    const angle = (i / Math.max(nodes.length, 1)) * 2 * Math.PI;
                    const baseRadius = 180;
                    positions[node.id] = {
                        x: centerX + baseRadius * Math.cos(angle) + (Math.random() - 0.5) * 50,
                        y: centerY + baseRadius * Math.sin(angle) + (Math.random() - 0.5) * 50,
                        vx: 0,
                        vy: 0,
                    };
                }
            }
        });

        // Cleanup stale positions
        const nodeIds = new Set(nodes.map((n) => n.id));
        Object.keys(positions).forEach(id => {
            if (!nodeIds.has(id)) delete positions[id];
        });
    }

    // [OPTIMIZATION_v1] Force simulation with semantic clustering
    function simulateStep() {
        if (!isSimulating || nodes.length === 0 || pauseSimulation) return;

        const centerX = containerWidth / 2;
        const centerY = containerHeight / 2;

        nodes.forEach((node) => {
            const pos = positions[node.id];
            if (!pos || (pos.fx !== undefined && pos.fx !== null)) return;

            let fx = 0, fy = 0;

            // 1. Optimized Repulsion (Distance Cutoff)
            nodes.forEach((other) => {
                if (other.id === node.id) return;
                const otherPos = positions[other.id];
                if (!otherPos) return;

                const dx = pos.x - otherPos.x;
                const dy = pos.y - otherPos.y;
                const distSq = dx * dx + dy * dy;
                
                // [OPTIMIZATION_v1] Skip far nodes to save O(n^2) cycles
                if (distSq > 250000) return; // 500px squared for better clustering

                const dist = Math.max(Math.sqrt(distSq), 1);
                const force = REPULSION / distSq;
                const pushMultiplier = dist < MIN_DISTANCE ? (MIN_DISTANCE / dist) * 2.0 : 1;

                fx += (dx / dist) * force * pushMultiplier;
                fy += (dy / dist) * force * pushMultiplier;
            });

            // 2. Attraction Force (Springs)
            edges.forEach((edge) => {
                let otherId: string | null = null;
                if (edge.from === node.id) otherId = edge.to;
                else if (edge.to === node.id) otherId = edge.from;

                if (otherId) {
                    const otherPos = positions[otherId];
                    if (otherPos) {
                        const dx = otherPos.x - pos.x;
                        const dy = otherPos.y - pos.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const displacement = dist - IDEAL_EDGE_LENGTH;
                        const springForce = displacement * ATTRACTION;
                        if (dist > 0) {
                            fx += (dx / dist) * springForce;
                            fy += (dy / dist) * springForce;
                        }
                    }
                }
            });

            // 3. [PSYCHO_v1] Semantic Pull (Cluster by type)
            const typeLower = node.type.toLowerCase();
            let targetX = centerX;
            let targetY = centerY;

            if (typeLower.includes('task')) { targetX = centerX - 250; targetY = centerY - 150; }
            else if (typeLower.includes('decision')) { targetX = centerX + 250; targetY = centerY - 150; }
            else if (typeLower.includes('risk')) { targetY = centerY + 250; }

            fx += (targetX - pos.x) * TYPE_PULL;
            fy += (targetY - pos.y) * TYPE_PULL;

            // 4. Center Pull & Velocity Decay
            fx += (centerX - pos.x) * CENTER_PULL;
            fy += (centerY - pos.y) * CENTER_PULL;

            pos.vx = (pos.vx + fx) * DAMPING;
            pos.vy = (pos.vy + fy) * DAMPING;
            
            // [STABILITY_v1] Cap velocity to prevent explosion
            const maxV = 10;
            pos.vx = Math.max(-maxV, Math.min(maxV, pos.vx));
            pos.vy = Math.max(-maxV, Math.min(maxV, pos.vy));

            pos.x += pos.vx;
            pos.y += pos.vy;

            const padding = 60;
            pos.x = Math.max(padding, Math.min(containerWidth - padding, pos.x));
            pos.y = Math.max(padding, Math.min(containerHeight - padding, pos.y));
        });

        simulationTick++;
        if (injectionCooldown > 0) injectionCooldown--;
        if (simulationTick > 600) isSimulating = false;
    }

    function animate() {
        simulateStep();
        animationFrame = requestAnimationFrame(animate);
    }

    function handleMouseDown(event: MouseEvent, nodeId: string) {
        draggedNode = nodeId;
        isSimulating = true; // Ensure simulation is active for real-time rendering
        simulationTick = 0;
        const pos = positions[nodeId];
        if (pos) {
            pos.fx = pos.x;
            pos.fy = pos.y;
        }
        event.preventDefault();
    }

    function handleMouseMove(event: MouseEvent) {
        if (!draggedNode || !svgElement) return;

        const rect = svgElement.getBoundingClientRect();
        const x = (event.clientX - rect.left - panX) / zoomLevel;
        const y = (event.clientY - rect.top - panY) / zoomLevel;

        const pos = positions[draggedNode];
        if (pos) {
            pos.x = x;
            pos.y = y;
            pos.fx = x;
            pos.fy = y;
            pos.vx = 0;
            pos.vy = 0;
        }
    }

    function handleMouseUp() {
        if (draggedNode) {
            const pos = positions[draggedNode];
            if (pos) {
                // [PERSISTENCE_v1] Dispatch layout change immediately after drag to sync with local storage
                const serializable: Record<string, { x: number, y: number }> = {};
                Object.entries(positions).forEach(([k, v]) => {
                    serializable[k] = { x: v.x, y: v.y };
                });
                onlayoutChanged?.({ positions: serializable });
            }
            draggedNode = null;
            isSimulating = true;
            simulationTick = 400; // Reset tick to allow settling
        }
        isPanning = false;
    }

    function handleZoom(event: WheelEvent) {
        event.preventDefault();
        const zoomSpeed = 0.0012;
        const delta = -event.deltaY;
        const newZoom = Math.max(0.15, Math.min(4, zoomLevel + delta * zoomSpeed));

        const rect = svgElement!.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const zoomRatio = newZoom / zoomLevel;
        panX = mouseX - (mouseX - panX) * zoomRatio;
        panY = mouseY - (mouseY - panY) * zoomRatio;
        zoomLevel = newZoom;
    }

    function handleBackgroundMouseDown(event: MouseEvent) {
        if (event.target === svgElement) {
            isPanning = true;
            event.preventDefault();
        }
        selectedNode = null; // [PSYCHO_v1] Deselect on background click
    }

    function handleGlobalMouseMove(event: MouseEvent) {
        if (draggedNode) {
            handleMouseMove(event);
        } else if (isPanning) {
            panX += event.movementX;
            panY += event.movementY;
        }
    }

    function getNodeColor(type: string, collapsed?: boolean): string {
        if (collapsed) return "#fbbf24";
        const typeLower = type.toLowerCase();
        
        const colors: Record<string, string> = {
            task: "#3B82F6",
            decision: "#22C55E",
            risk: "#EF4444",
            entity: "#8B5CF6",
            topic: "#F59E0B",
            cluster: "#fbbf24",
            speaker: "#22d3ee",
            default: "#94a3b8",
        };

        if (typeLower.includes('task')) return colors.task;
        if (typeLower.includes('decision')) return colors.decision;
        if (typeLower.includes('risk') || typeLower.includes('urgency')) return colors.risk;
        if (typeLower.includes('entity') || typeLower.includes('person')) return colors.entity;
        if (typeLower.includes('topic') || typeLower.includes('project')) return colors.topic;
        if (typeLower.includes('speaker')) return colors.speaker;
        
        return colors.default;
    }

    async function toggleFullscreen() {
        if (!isFullscreen) {
            try {
                if (containerEl?.requestFullscreen) {
                    await containerEl.requestFullscreen();
                }
            } catch (err) {
                console.warn("Fullscreen API failed, falling back to overlay", err);
            }
            isFullscreen = true;
            setTimeout(() => {
                if (containerEl) {
                    const rect = containerEl.getBoundingClientRect();
                    containerWidth = rect.width || window.innerWidth;
                    containerHeight = rect.height || window.innerHeight;
                    fitToView();
                }
            }, 100);
        } else {
            try {
                if (document.fullscreenElement) {
                    await document.exitFullscreen();
                }
            } catch (err) {
                console.warn("Exit fullscreen failed", err);
            }
            isFullscreen = false;
            setTimeout(() => {
                const measurable = containerEl?.parentElement || document.body;
                const rect = measurable.getBoundingClientRect();
                containerWidth = rect.width || 800;
                containerHeight = rect.height || 600;
                fitToView();
            }, 100);
        }
    }

    function resetView() {
        if (nodes.length === 0) {
            zoomLevel = 1.0;
            panX = 0;
            panY = 0;
        } else {
            fitToView();
        }
        isSimulating = true;
        simulationTick = 0;
    }

    function zoomIn() { zoomLevel = Math.min(3, zoomLevel + 0.2); }
    function zoomOut() { zoomLevel = Math.max(0.2, zoomLevel - 0.2); }

    function fitToView() {
        if (nodes.length === 0 || !positions) return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const node of nodes) {
            const pos = positions[node.id];
            if (pos) {
                minX = Math.min(minX, pos.x);
                minY = Math.min(minY, pos.y);
                maxX = Math.max(maxX, pos.x);
                maxY = Math.max(maxY, pos.y);
            }
        }
        if (minX === Infinity) return;

        const padding = 80;
        const graphWidth = maxX - minX + padding * 2;
        const graphHeight = maxY - minY + padding * 2;
        const scaleX = containerWidth / graphWidth;
        const scaleY = containerHeight / graphHeight;
        zoomLevel = Math.min(scaleX, scaleY, 2.0);

        const centerGraphX = (minX + maxX) / 2;
        const centerGraphY = (minY + maxY) / 2;
        panX = containerWidth / 2 - centerGraphX * zoomLevel;
        panY = containerHeight / 2 - centerGraphY * zoomLevel;
    }

    function downloadSVG() {
        if (!svgElement) return;
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgData], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `knowledge-graph-${new Date().toISOString().slice(0, 10)}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function downloadPNG() {
        if (!svgElement) return;
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const canvas = document.createElement("canvas");
        canvas.width = containerWidth * 2;
        canvas.height = containerHeight * 2;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const img = new Image();
        img.onload = () => {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const link = document.createElement("a");
            link.href = canvas.toDataURL("image/png");
            link.download = `knowledge-graph-${new Date().toISOString().slice(0, 10)}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(img.src);
        };
        // INTELLIGENT_PARSING_FIXED: use Blob URL instead of base64 to support Unicode SVG content
        const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        img.src = URL.createObjectURL(blob);
    }

    function exportGraphJSON() {
        const data = {
            nodes: nodes.map((n) => ({ id: n.id, type: n.type, label: n.label || n.id, weight: n.weight })),
            edges: edges.map((e) => ({ from: e.from, to: e.to, relation: e.relation })),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `knowledge-graph-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function handleNodeClick(nodeId: string) {
        const node = nodes.find((n) => n.id === nodeId);
        if (node?.collapsed) {
            ontoggleCluster?.({ nodeId });
            return;
        }
        selectedNode = selectedNode === nodeId ? null : nodeId;
    }

    let prevSvgElement: SVGSVGElement | null = null;

    function measureAndAttach() {
        if (prevSvgElement && prevSvgElement !== svgElement) {
            prevSvgElement.removeEventListener("wheel", handleZoom);
        }
        const measurable = containerEl || svgElement?.parentElement;
        if (measurable) {
            const rect = measurable.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                const changed = containerWidth !== rect.width || containerHeight !== rect.height;
                containerWidth = rect.width;
                containerHeight = rect.height;
                if (changed && nodes.length > 0) {
                    fitToView();
                }
            }
        }
        if (svgElement && svgElement !== prevSvgElement) {
            svgElement.addEventListener("wheel", handleZoom, { passive: false });
            prevSvgElement = svgElement;
        }
    }

    $effect(() => {
        if (nodes.length > 0) {
            // untrack: measureAndAttach and initializePositions both read AND write local state
            // (positions, containerWidth, containerHeight). Without untrack, Svelte tracks those
            // reads as deps and the effect re-fires every time they're written → infinite loop.
            untrack(() => {
                measureAndAttach();
                initializePositions();
            });
            isSimulating = true;
            simulationTick = 0;
            setTimeout(() => fitToView(), 500);
        }
    });

    // KG_UNIFIED_v1: Re-apply saved positions when session changes (session restore fix).
    // initialPositions is inside untrack() in the nodes effect → not tracked as dep → positions
    // were never re-applied on session load. This separate effect tracks initialPositions directly.
    $effect(() => {
        const saved = initialPositions;
        if (saved && Object.keys(saved).length > 0) {
            untrack(() => {
                for (const [id, pos] of Object.entries(saved)) {
                    if (positions[id]) {
                        positions[id].x = pos.x;
                        positions[id].y = pos.y;
                        positions[id].vx = 0;
                        positions[id].vy = 0;
                    }
                }
                setTimeout(() => fitToView(), 100);
            });
        }
    });

    onMount(() => {
        measureAndAttach();
        const measurable = containerEl || svgElement?.parentElement;
        let resizeObserver: ResizeObserver | null = null;
        if (measurable) {
            resizeObserver = new ResizeObserver(() => {
                measureAndAttach();
            });
            resizeObserver.observe(measurable);
        }
        
        initializePositions();
        animate();
        window.addEventListener("mousemove", handleGlobalMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            if (resizeObserver) resizeObserver.disconnect();
            if (animationFrame) cancelAnimationFrame(animationFrame);
            window.removeEventListener("mousemove", handleGlobalMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            if (svgElement) svgElement.removeEventListener("wheel", handleZoom);
        };
    });

    onDestroy(() => {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        window.removeEventListener("mousemove", handleGlobalMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        if (svgElement) svgElement.removeEventListener("wheel", handleZoom);
    });
</script>

<!-- Fullscreen overlay -->
{#if isFullscreen}
    <div
        class="fixed inset-0 z-[9999] bg-white flex flex-col"
        bind:this={containerEl}
    >
        <!-- Fullscreen toolbar -->
        <div
            class="flex items-center justify-between px-4 py-2 bg-white/90 border-b border-blue-200"
        >
            <div class="flex items-center gap-3">
                <span class="text-blue-500 font-semibold text-sm"
                    >Knowledge Graph</span
                >
                <span class="text-xs text-gray-400"
                    >{nodes.length} nodes / {edges.length} edges</span
                >
            </div>
            <div class="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
                <button
                    onclick={zoomOut}
                    class="p-1.5 rounded hover:bg-gray-100/60 text-gray-500 hover:text-blue-500 transition-colors"
                    title="Zoom Out"
                >
                    <svg
                        class="w-2.5 h-2.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1"
                        ><circle cx="11" cy="11" r="8" /><line
                            x1="21"
                            y1="21"
                            x2="16.65"
                            y2="16.65"
                        /><line x1="8" y1="11" x2="14" y2="11" /></svg
                    >
                </button>
                <span class="text-xs text-gray-400 w-12 text-center"
                    >{Math.round(zoomLevel * 100)}%</span
                >
                <button
                    onclick={zoomIn}
                    class="p-1.5 rounded hover:bg-gray-100/60 text-gray-500 hover:text-blue-500 transition-colors"
                    title="Zoom In"
                >
                    <svg
                        class="w-2.5 h-2.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1"
                        ><circle cx="11" cy="11" r="8" /><line
                            x1="21"
                            y1="21"
                            x2="16.65"
                            y2="16.65"
                        /><line x1="11" y1="8" x2="11" y2="14" /><line
                            x1="8"
                            y1="11"
                            x2="14"
                            y2="11"
                        /></svg
                    >
                </button>
                <div class="w-px h-5 bg-gray-100 mx-1"></div>
                <button
                    onclick={fitToView}
                    class="p-1.5 rounded hover:bg-gray-100/60 text-gray-500 hover:text-blue-500 transition-colors"
                    title="Fit to View"
                >
                    <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1"
                        ><path
                            d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
                        /></svg
                    >
                </button>
                <button
                    onclick={resetView}
                    class="p-1.5 rounded hover:bg-gray-100/60 text-gray-500 hover:text-blue-500 transition-colors"
                    title="Reset View"
                >
                    <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1"
                        ><polyline points="1 4 1 10 7 10" /><path
                            d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"
                        /></svg
                    >
                </button>
                <div class="w-px h-5 bg-gray-100 mx-1"></div>
                <button
                    onclick={downloadSVG}
                    class="p-1.5 rounded hover:bg-gray-100/60 text-gray-500 hover:text-blue-500 transition-colors"
                    title="Download SVG"
                >
                    <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1"
                        ><path
                            d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                        /><polyline points="7 10 12 15 17 10" /><line
                            x1="12"
                            y1="15"
                            x2="12"
                            y2="3"
                        /></svg
                    >
                </button>
                <button
                    onclick={downloadPNG}
                    class="p-1.5 rounded hover:bg-gray-100/60 text-gray-500 hover:text-blue-500 transition-colors"
                    title="Download PNG"
                >
                    <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1"
                        ><rect
                            x="3"
                            y="3"
                            width="12"
                            height="12"
                            rx="2"
                            ry="2"
                        /><circle cx="8.5" cy="8.5" r="1.5" /><polyline
                            points="21 15 16 10 5 21"
                        /></svg
                    >
                </button>
                <button
                    onclick={exportGraphJSON}
                    class="p-1.5 rounded hover:bg-gray-100/60 text-gray-500 hover:text-blue-500 transition-colors"
                    title="Export JSON"
                >
                    <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1"
                        ><path
                            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                        /><polyline points="14 2 14 8 20 8" /></svg
                    >
                </button>
                <div class="w-px h-5 bg-gray-100 mx-1"></div>
                <button
                    onclick={toggleFullscreen}
                    class="p-1.5 rounded hover:bg-gray-100/60 text-red-500 hover:text-red-600 transition-colors"
                    title="Exit Fullscreen"
                >
                    <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1"
                        ><line x1="18" y1="6" x2="6" y2="18" /><line
                            x1="6"
                            y1="6"
                            x2="18"
                            y2="18"
                        /></svg
                    >
                </button>
            </div>
        </div>
        <!-- Fullscreen graph area -->
        <div class="flex-1 relative overflow-hidden">
            <svg
                bind:this={svgElement}
                class="w-full h-full touch-none"
                viewBox="0 0 {containerWidth} {containerHeight}"
                onmousedown={handleBackgroundMouseDown}
                role="application"
                aria-label="Knowledge graph visualization - fullscreen"
            >
                <defs>
                    <pattern id="dotGrid" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="var(--kg-dot-color)"/></pattern>
                    <filter
                        id="glow"
                        x="-50%"
                        y="-50%"
                        width="200%"
                        height="200%"
                    >
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge
                            ><feMergeNode in="coloredBlur" /><feMergeNode
                                in="SourceGraphic"
                            /></feMerge
                        >
                    </filter>
                    <linearGradient
                        id="edgeGradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                    >
                        <stop
                            offset="0%"
                            style="stop-color:#3B82F6;stop-opacity:0.1"
                        />
                        <stop
                            offset="50%"
                            style="stop-color:#3B82F6;stop-opacity:0.4"
                        />
                        <stop
                            offset="100%"
                            style="stop-color:#3B82F6;stop-opacity:0.1"
                        />
                    </linearGradient>
                    <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="10"
                        refX="9"
                        refY="3"
                        orient="auto"
                    >
                        <polygon
                            points="0 0, 10 3, 0 6"
                            fill="#3B82F6"
                            opacity="0.5"
                        />
                    </marker>
                </defs>
                <rect width="100%" height="100%" fill="url(#dotGrid)" pointer-events="none" />
                <g transform="translate({panX}, {panY}) scale({zoomLevel})">
                    <g class="edges">
                        {#each edges as edge}
                            {@const from = positions[edge.from]}
                            {@const to = positions[edge.to]}
                            {#if from && to}
                                {@const dx = to.x - from.x}
                                {@const dy = to.y - from.y}
                                {@const dist = Math.sqrt(dx * dx + dy * dy)}
                                {@const nodeRadius = 28}
                                {@const startX =
                                    from.x +
                                    (dx / Math.max(dist, 1)) * nodeRadius}
                                {@const startY =
                                    from.y +
                                    (dy / Math.max(dist, 1)) * nodeRadius}
                                {@const endX =
                                    to.x -
                                    (dx / Math.max(dist, 1)) * nodeRadius}
                                {@const endY =
                                    to.y -
                                    (dy / Math.max(dist, 1)) * nodeRadius}
                                {@const midX = (startX + endX) / 2}
                                {@const midY = (startY + endY) / 2}
                                {@const isConnected = selectedNode === edge.from || selectedNode === edge.to}
                                <line
                                    x1={startX}
                                    y1={startY}
                                    x2={endX}
                                    y2={endY}
                                    stroke="#3B82F6"
                                    stroke-opacity={selectedNode ? (isConnected ? 0.8 : 0.05) : 0.5}
                                    stroke-width={isConnected ? 2 : 1}
                                    marker-end="url(#arrowhead)"
                                />
                                {#if !selectedNode || isConnected}
                                    <rect
                                        x={midX - edge.relation.length * 3.2}
                                        y={midY - 8}
                                        width={edge.relation.length * 6.4}
                                        height={14}
                                        fill="#FFFFFF"
                                        fill-opacity="0.85"
                                        rx="3"
                                    />
                                    <text
                                        x={midX}
                                        y={midY + 3}
                                        fill="#3B82F6"
                                        font-size="10"
                                        opacity="0.8"
                                        text-anchor="middle"
                                        class="font-sans">{edge.relation}</text
                                    >
                                {/if}
                            {/if}
                        {/each}
                    </g>
                    <g class="nodes">
                        {#each nodes as node}
                            {@const pos = positions[node.id]}
                            {#if pos}
                                {@const color = getNodeColor(
                                    node.type,
                                    node.collapsed,
                                )}
                                {@const isCluster = node.collapsed}
                                {@const nodeR = isCluster ? 36 : 28}
                                {@const isDimmed = selectedNode && selectedNode !== node.id && !edges.some(e => (e.from === selectedNode && e.to === node.id) || (e.to === selectedNode && e.from === node.id))}
                                <g
                                    transform="translate({pos.x}, {pos.y})"
                                    class="cursor-grab transition-all duration-300 {draggedNode === node.id ? 'cursor-grabbing' : 'hover:scale-110'}"
                                    style="opacity: {isDimmed ? 0.15 : 1}"
                                    onmousedown={(e) =>
                                        handleMouseDown(e, node.id)}
                                    onclick={() => handleNodeClick(node.id)}
                                    onkeydown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleNodeClick(node.id);
                                        }
                                    }}
                                    role="button"
                                    tabindex="0"
                                    aria-label="Node: {node.label || node.id}, Type: {node.type}"
                                >
                                    {#if highlightedNodes.has(node.id)}
                                        <!-- [PRIORITY 1] Search highlight ring -->
                                        <circle
                                            r={nodeR + 12}
                                            fill="none"
                                            stroke="#F59E0B"
                                            stroke-width="2"
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
                                        fill="var(--kg-node-fill)"
                                        stroke={highlightedNodes.has(node.id) ? "#F59E0B" : color}
                                        stroke-width="var(--kg-node-stroke-width)"
                                        filter={draggedNode === node.id ? "url(#glow)" : ""}
                                    />
                                    
                                    <text
                                        text-anchor="middle"
                                        dy={isCluster ? "-2" : "4"}
                                        fill={color}
                                        font-size="11"
                                        font-weight="600"
                                        class="font-sans pointer-events-none select-none"
                                        >{(node.label || node.id).slice(
                                            0,
                                            12,
                                        )}</text
                                    >
                                    {#if isCluster && node.childCount}
                                        <text
                                            text-anchor="middle"
                                            dy="12"
                                            fill={color}
                                            font-size="9"
                                            opacity="0.7"
                                            class="font-sans pointer-events-none select-none"
                                            >+{node.childCount} nodes</text
                                        >
                                    {/if}
                                    <text
                                        text-anchor="middle"
                                        dy={isCluster ? "36" : "32"}
                                        fill="#64748b"
                                        font-size="8"
                                        class="font-sans pointer-events-none select-none"
                                        >{isCluster
                                            ? "Cluster"
                                            : node.type}</text
                                    >
                                    {#if node.weight && node.weight > 1}
                                        <circle
                                            cx="18"
                                            cy="-18"
                                            r="8"
                                            fill="#3B82F6"
                                            fill-opacity="0.3"
                                            stroke="#3B82F6"
                                            stroke-width="1"
                                        />
                                        <text
                                            x="18"
                                            y="-14"
                                            text-anchor="middle"
                                            fill="#3B82F6"
                                            font-size="9"
                                            font-weight="bold"
                                            class="pointer-events-none select-none"
                                            >{node.weight}</text
                                        >
                                    {/if}
                                </g>
                            {/if}
                        {/each}
                    </g>
                </g>
            </svg>
            <!-- Selected node info panel -->
            {#if selectedNode}
                {@const selNode = nodes.find((n) => n.id === selectedNode)}
                {#if selNode}
                    {@const connEdges = edges.filter(
                        (e) => e.from === selectedNode || e.to === selectedNode,
                    )}
                    <div
                        class="absolute bottom-4 right-4 bg-white/95 border border-blue-300 rounded-lg p-3 min-w-[134px] max-w-[201px]"
                    >
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs font-medium text-blue-500"
                                >{selNode.type}</span
                            >
                            <button
                                onclick={() => (selectedNode = null)}
                                class="text-gray-400 hover:text-gray-700 text-xs"
                                >Close</button
                            >
                        </div>
                        <p class="text-sm text-gray-800 font-medium">
                            {selNode.label || selNode.id}
                        </p>
                        {#if selNode.weight}
                            <p class="text-xs text-gray-400 mt-1">
                                Weight: {selNode.weight}
                            </p>
                        {/if}
                        {#if connEdges.length > 0}
                            <div class="mt-2 border-t border-slate-700 pt-2">
                                <p class="text-xs text-gray-400 mb-1">
                                    {connEdges.length} connection{connEdges.length >
                                    1
                                        ? "s"
                                        : ""}
                                </p>
                                {#each connEdges.slice(0, 5) as ce}
                                    <p class="text-xs text-gray-500 truncate">
                                        {ce.from === selectedNode
                                            ? ce.to
                                            : ce.from} ({ce.relation})
                                    </p>
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/if}
            {/if}
        </div>
    </div>
{/if}

<!-- Normal (inline) view -->
<div
    class="w-full h-full rounded-lg relative overflow-hidden {compact
        ? 'min-h-[121px]'
        : 'min-h-[268px]'} bg-gray-50/50 border border-gray-200"
    class:hidden={isFullscreen}
    bind:this={containerEl}
>
    <!-- Controls toolbar — INTELLIGENT_PARSING_FIXED: added search + node counter -->
    {#if !compact}
        <div
            class="absolute top-2 right-2 z-10 flex items-center gap-0.5 bg-white/80 rounded-lg border border-gray-200 px-1 py-0.5 backdrop-blur-sm"
        >
            <!-- Search input -->
            <input
                type="search"
                bind:value={localSearchTerm}
                placeholder="Search…"
                class="text-[8px] w-14 px-1.5 py-0.5 border border-gray-200 rounded bg-white/90 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-300"
                title="Search nodes"
            />
            <!-- Node/edge counter -->
            <span class="text-[7px] text-gray-400 tabular-nums px-0.5">{nodes.length}N/{edges.length}E</span>
            <div class="w-px h-4 bg-gray-100 mx-0.5"></div>
            <button
                onclick={zoomOut}
                class="p-1 rounded hover:bg-gray-100/60 text-gray-500 hover:text-blue-500 transition-colors"
                title="Zoom Out"
            >
                <svg
                    class="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1"
                    ><circle cx="11" cy="11" r="8" /><line
                        x1="21"
                        y1="21"
                        x2="16.65"
                        y2="16.65"
                    /><line x1="8" y1="11" x2="14" y2="11" /></svg
                >
            </button>
            <span class="text-[7px] text-gray-400 w-8 text-center"
                >{Math.round(zoomLevel * 100)}%</span
            >
            <button
                onclick={zoomIn}
                class="p-1 rounded hover:bg-gray-100/60 text-gray-500 hover:text-blue-500 transition-colors"
                title="Zoom In"
            >
                <svg
                    class="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1"
                    ><circle cx="11" cy="11" r="8" /><line
                        x1="21"
                        y1="21"
                        x2="16.65"
                        y2="16.65"
                    /><line x1="11" y1="8" x2="11" y2="14" /><line
                        x1="8"
                        y1="11"
                        x2="14"
                        y2="11"
                    /></svg
                >
            </button>
            <div class="w-px h-4 bg-gray-100 mx-0.5"></div>
            <button
                onclick={fitToView}
                class="p-1 rounded hover:bg-gray-100/60 text-gray-500 hover:text-blue-500 transition-colors"
                title="Fit to View"
            >
                <svg
                    class="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1"
                    ><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg
                >
            </button>
            <button
                onclick={resetView}
                class="p-1 rounded hover:bg-gray-100/60 text-gray-500 hover:text-blue-500 transition-colors"
                title="Reset View"
            >
                <svg
                    class="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1"
                    ><polyline points="1 4 1 10 7 10" /><path
                        d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"
                    /></svg
                >
            </button>
            <div class="w-px h-4 bg-gray-100 mx-0.5"></div>
            <button
                onclick={downloadSVG}
                class="p-1 rounded hover:bg-gray-100/60 text-gray-500 hover:text-blue-500 transition-colors"
                title="Download SVG"
            >
                <svg
                    class="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1"
                    ><path
                        d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                    /><polyline points="7 10 12 15 17 10" /><line
                        x1="12"
                        y1="15"
                        x2="12"
                        y2="3"
                    /></svg
                >
            </button>
            <button
                onclick={downloadPNG}
                class="p-1 rounded hover:bg-gray-100/60 text-gray-500 hover:text-blue-500 transition-colors"
                title="Download PNG"
            >
                <svg
                    class="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1"
                    ><rect
                        x="3"
                        y="3"
                        width="12"
                        height="12"
                        rx="2"
                        ry="2"
                    /><circle cx="8.5" cy="8.5" r="1.5" /><polyline
                        points="21 15 16 10 5 21"
                    /></svg
                >
            </button>
            <button
                onclick={exportGraphJSON}
                class="p-1 rounded hover:bg-gray-100/60 text-gray-500 hover:text-blue-500 transition-colors"
                title="Export JSON"
            >
                <svg
                    class="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1"
                    ><path
                        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                    /><polyline points="14 2 14 8 20 8" /></svg
                >
            </button>
            <div class="w-px h-4 bg-gray-100 mx-0.5"></div>
            <button
                onclick={toggleFullscreen}
                class="p-1 rounded hover:bg-gray-100/60 text-gray-500 hover:text-blue-500 transition-colors"
                title="Fullscreen"
            >
                <svg
                    class="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1"
                    ><polyline points="15 3 21 3 21 9" /><polyline
                        points="9 21 3 21 3 15"
                    /><line x1="21" y1="3" x2="14" y2="10" /><line
                        x1="3"
                        y1="21"
                        x2="10"
                        y2="14"
                    /></svg
                >
            </button>
        </div>
    {/if}

    {#if compact && nodes.length > 0}
        <!-- Compact mode: just fullscreen button -->
        <div class="absolute top-1 right-1 z-10">
            <button
                onclick={toggleFullscreen}
                class="p-1 rounded bg-white/70 hover:bg-gray-100/80 text-gray-500 hover:text-blue-500 transition-colors border border-slate-700/50"
                title="Fullscreen"
            >
                <svg
                    class="w-3 h-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1"
                    ><polyline points="15 3 21 3 21 9" /><polyline
                        points="9 21 3 21 3 15"
                    /><line x1="21" y1="3" x2="14" y2="10" /><line
                        x1="3"
                        y1="21"
                        x2="10"
                        y2="14"
                    /></svg
                >
            </button>
        </div>
    {/if}

    {#if nodes.length === 0}
        <div class="absolute inset-0 flex items-center justify-center p-6 text-center animate-fadeIn">
            <div class="relative group">
                <!-- Illustrated Placeholder -->
                <div class="relative w-20 h-20 mx-auto mb-6">
                    <div class="absolute inset-0 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-700"></div>
                    <svg
                        class="relative z-10 w-full h-full text-blue-500/40 group-hover:text-blue-500/60 transition-all promax-interaction"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.2"
                        aria-hidden="true"
                    >
                        <circle cx="12" cy="12" r="3" class="animate-pulse" />
                        <circle cx="4" cy="4" r="2" />
                        <circle cx="20" cy="4" r="2" />
                        <circle cx="4" cy="20" r="2" />
                        <circle cx="20" cy="20" r="2" />
                        <path d="M7 7l3.5 3.5M13.5 13.5L17 17M17 7l-3.5 3.5M10.5 13.5L7 17" opacity="0.3" stroke-dasharray="2 2" />
                    </svg>
                </div>
                
                <h3 class="text-fluid-xs font-bold text-slate-900 uppercase tracking-widest mb-1.5">Knowledge Graph Empty</h3>
                <p class="text-[7px] text-slate-400 max-w-[121px] mx-auto leading-relaxed">
                    Start recording to extract <span class="text-blue-500 font-bold">knowledge entities</span> — tasks, decisions, risks and topics appear here in real time.
                </p>
            </div>
        </div>
    {:else}
        <svg
            bind:this={svgElement}
            class="w-full h-full touch-none"
            viewBox="0 0 {containerWidth} {containerHeight}"
            onmousedown={handleBackgroundMouseDown}
            role="application"
            aria-label="Knowledge graph visualization"
        >
            <defs>
                    <pattern id="dotGrid" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="var(--kg-dot-color)"/></pattern>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <linearGradient
                    id="edgeGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                >
                    <stop
                        offset="0%"
                        style="stop-color:#3B82F6;stop-opacity:0.1"
                    />
                    <stop
                        offset="50%"
                        style="stop-color:#3B82F6;stop-opacity:0.4"
                    />
                    <stop
                        offset="100%"
                        style="stop-color:#3B82F6;stop-opacity:0.1"
                    />
                </linearGradient>
                <marker
                    id="arrowhead"
                    viewBox="0 0 10 10"
                    markerWidth="6"
                    markerHeight="6"
                    refX="9"
                    refY="5"
                    orient="auto-start-reverse"
                >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#3B82F6" />
                </marker>
            </defs>
            <rect width="100%" height="100%" fill="url(#dotGrid)" pointer-events="none" />

            <g transform="translate({panX}, {panY}) scale({zoomLevel})">
                <!-- Edges -->
                <g class="edges">
                    {#each edges as edge}
                        {@const nodeFrom = nodes.find(n => n.id === edge.from)}
                        {@const nodeTo = nodes.find(n => n.id === edge.to)}
                        {#if nodeFrom && nodeTo}
                            {@const from = positions[edge.from]}
                            {@const to = positions[edge.to]}
                            {#if from && to}
                            {@const dx = to.x - from.x}
                            {@const dy = to.y - from.y}
                            {@const dist = Math.sqrt(dx * dx + dy * dy)}
                            {@const nodeRadius = 28}
                            {@const startX =
                                from.x + (dx / Math.max(dist, 1)) * nodeRadius}
                            {@const startY =
                                from.y + (dy / Math.max(dist, 1)) * nodeRadius}
                            {@const endX =
                                to.x - (dx / Math.max(dist, 1)) * nodeRadius}
                            {@const endY =
                                to.y - (dy / Math.max(dist, 1)) * nodeRadius}
                            {@const midX = (startX + endX) / 2}
                            {@const midY = (startY + endY) / 2}
                            {@const isConnected = selectedNode === edge.from || selectedNode === edge.to}
                            <line
                                x1={startX}
                                y1={startY}
                                x2={endX}
                                y2={endY}
                                stroke="#3B82F6"
                                stroke-opacity={selectedNode ? (isConnected ? 0.8 : 0.05) : 0.5}
                                stroke-width={isConnected ? 2 : 1}
                                marker-end="url(#arrowhead)"
                            />
                            {#if !selectedNode || isConnected}
                                <rect
                                    x={midX - edge.relation.length * 3.2}
                                    y={midY - 8}
                                    width={edge.relation.length * 6.4}
                                    height={14}
                                    fill="#FFFFFF"
                                    fill-opacity="0.85"
                                    rx="3"
                                />
                                <text
                                    x={midX}
                                    y={midY + 3}
                                    fill="#3B82F6"
                                    font-size="10"
                                    opacity="0.8"
                                    text-anchor="middle"
                                    class="font-sans">{edge.relation}</text
                                >
                            {/if}
                        {/if}
                    {/if}
                {/each}
            </g>

                <!-- Nodes -->
                <g class="nodes">
                    {#each nodes as node}
                        {@const pos = positions[node.id]}
                        {#if pos}
                            {@const color = getNodeColor(
                                node.type,
                                node.collapsed,
                            )}
                            {@const isCluster = node.collapsed}
                            {@const nodeR = isCluster ? 36 : 28}
                            {@const isDimmed = selectedNode && selectedNode !== node.id && !edges.some(e => (e.from === selectedNode && e.to === node.id) || (e.to === selectedNode && e.from === node.id))}
                            <g
                                transform="translate({pos.x}, {pos.y})"
                                class="cursor-grab transition-all duration-300 {draggedNode === node.id
                                    ? 'cursor-grabbing'
                                    : 'hover:opacity-80'}"
                                style="opacity: {isDimmed ? 0.15 : 1}"
                                onmousedown={(e) => handleMouseDown(e, node.id)}
                                onclick={() => handleNodeClick(node.id)}
                                onkeydown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleNodeClick(node.id);
                                    }
                                }}
                                role="button"
                                tabindex="0"
                                aria-label="Node: {node.label || node.id}, Type: {node.type}"
                            >
                                <circle
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
                                />
                                <circle
                                    r={nodeR - 6}
                                    fill={color}
                                    fill-opacity="0.05"
                                />
                                <text
                                    text-anchor="middle"
                                    dy={isCluster ? "-2" : "4"}
                                    fill={color}
                                    font-size={compact ? "8" : "10"}
                                    font-weight="500"
                                    class="font-sans pointer-events-none select-none"
                                >
                                    {(node.label || node.id).slice(
                                        0,
                                        compact ? 8 : 12,
                                    )}
                                </text>
                                {#if isCluster && node.childCount}
                                    <text
                                        text-anchor="middle"
                                        dy="12"
                                        fill={color}
                                        font-size="9"
                                        opacity="0.7"
                                        class="font-sans pointer-events-none select-none"
                                        >+{node.childCount} nodes</text
                                    >
                                {/if}
                                <text
                                    text-anchor="middle"
                                    dy={isCluster ? "36" : "32"}
                                    fill="#64748b"
                                    font-size="8"
                                    class="font-sans pointer-events-none select-none"
                                    >{isCluster ? "Cluster" : node.type}</text
                                >
                                {#if node.weight && node.weight > 1}
                                    <circle
                                        cx="18"
                                        cy="-18"
                                        r="8"
                                        fill="#3B82F6"
                                        fill-opacity="0.3"
                                        stroke="#3B82F6"
                                        stroke-width="1"
                                    />
                                    <text
                                        x="18"
                                        y="-14"
                                        text-anchor="middle"
                                        fill="#3B82F6"
                                        font-size="9"
                                        font-weight="bold"
                                        class="pointer-events-none select-none"
                                        >{node.weight}</text
                                    >
                                {/if}
                            </g>
                        {/if}
                    {/each}
                </g>
            </g>
        </svg>

        <!-- Selected node info (inline) -->
        {#if selectedNode && !compact}
            {@const selNode = nodes.find((n) => n.id === selectedNode)}
            {#if selNode}
                {@const connEdges = edges.filter(
                    (e) => e.from === selectedNode || e.to === selectedNode,
                )}
                <div
                    class="absolute bottom-10 right-3 bg-white/95 border border-blue-300 rounded-lg p-3 min-w-[121px] max-w-[174px] z-10"
                >
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-medium text-blue-500"
                            >{selNode.type}</span
                        >
                        <button
                            onclick={() => (selectedNode = null)}
                            class="text-gray-400 hover:text-gray-700 text-xs"
                            >x</button
                        >
                    </div>
                    <p class="text-sm text-gray-800 font-medium">
                        {selNode.label || selNode.id}
                    </p>
                    {#if selNode.weight}<p
                            class="text-xs text-gray-400 mt-0.5"
                        >
                            Weight: {selNode.weight}
                        </p>{/if}
                    {#if connEdges.length > 0}
                        <div class="mt-1.5 border-t border-gray-200 pt-1.5">
                            <p class="text-xs text-gray-400 mb-0.5">
                                {connEdges.length} connection{connEdges.length >
                                1
                                    ? "s"
                                    : ""}
                            </p>
                            {#each connEdges.slice(0, 4) as ce}
                                <p class="text-xs text-gray-500 truncate">
                                    {ce.from === selectedNode ? ce.to : ce.from}
                                    ({ce.relation})
                                </p>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/if}
        {/if}
    {/if}

    <!-- Stats overlay -->
    <div class="absolute bottom-2 left-2 text-xs text-gray-400 flex gap-3">
        <span class="flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-500/50"></span>
            {nodes.length} nodes
        </span>
        <span class="flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-100"></span>
            {edges.length} edges
        </span>
    </div>
</div>
