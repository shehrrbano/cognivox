<script lang="ts">
    import { onMount, onDestroy } from "svelte";

    export let nodes: Array<{
        id: string;
        type: string;
        weight?: number;
        label?: string;
        collapsed?: boolean;
        childCount?: number;
        childIds?: string[];
    }> = [];
    export let edges: Array<{ from: string; to: string; relation: string }> =
        [];
    export let compact: boolean = false;

    // Expand/collapse callback — emitted so parent can update data
    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher<{
        toggleCluster: { nodeId: string };
    }>();

    // Force-directed layout state
    interface NodePosition {
        x: number;
        y: number;
        vx: number;
        vy: number;
        fx?: number | null;
        fy?: number | null;
    }

    let positions: Map<string, NodePosition> = new Map();
    let svgElement: SVGSVGElement;
    let containerEl: HTMLDivElement;
    let containerWidth = 600;
    let containerHeight = 400;
    let animationFrame: number;
    let isSimulating = true;
    let draggedNode: string | null = null;
    let simulationTick = 0;

    // Pan & Zoom state
    let zoomLevel = 1.0;
    let panX = 0;
    let panY = 0;
    let isPanning = false;

    // Fullscreen state
    let isFullscreen = false;
    let selectedNode: string | null = null;

    // Force simulation constants - tuned for clear, non-overlapping layout
    const REPULSION = 25000;
    const ATTRACTION = 0.008;
    const DAMPING = 0.82;
    const CENTER_PULL = 0.003;
    const MIN_DISTANCE = 180;
    const IDEAL_EDGE_LENGTH = 220;

    // Initialize node positions
    function initializePositions() {
        const centerX = containerWidth / 2;
        const centerY = containerHeight / 2;

        nodes.forEach((node, i) => {
            if (!positions.has(node.id)) {
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
            }
        });

        // Remove positions for deleted nodes
        const nodeIds = new Set(nodes.map((n) => n.id));
        for (const id of positions.keys()) {
            if (!nodeIds.has(id)) {
                positions.delete(id);
            }
        }

        positions = new Map(positions);
    }

    // Force simulation step
    function simulateStep() {
        if (!isSimulating || nodes.length === 0) return;

        const centerX = containerWidth / 2;
        const centerY = containerHeight / 2;

        // Apply forces
        nodes.forEach((node) => {
            const pos = positions.get(node.id);
            if (!pos || (pos.fx !== undefined && pos.fx !== null)) return;

            let fx = 0,
                fy = 0;

            // Repulsion from other nodes (stronger, with larger min distance)
            nodes.forEach((other) => {
                if (other.id === node.id) return;
                const otherPos = positions.get(other.id);
                if (!otherPos) return;

                const dx = pos.x - otherPos.x;
                const dy = pos.y - otherPos.y;
                const distSq = dx * dx + dy * dy;
                const dist = Math.max(Math.sqrt(distSq), 1);

                // Strong repulsion that prevents overlap
                const force = REPULSION / (dist * dist);

                // Extra strong push if nodes are too close
                const pushMultiplier =
                    dist < MIN_DISTANCE ? (MIN_DISTANCE / dist) * 3 : 1;

                fx += (dx / dist) * force * pushMultiplier;
                fy += (dy / dist) * force * pushMultiplier;
            });

            // Attraction to connected nodes (with ideal distance)
            edges.forEach((edge) => {
                let otherId: string | null = null;
                if (edge.from === node.id) otherId = edge.to;
                else if (edge.to === node.id) otherId = edge.from;

                if (otherId) {
                    const otherPos = positions.get(otherId);
                    if (otherPos) {
                        const dx = otherPos.x - pos.x;
                        const dy = otherPos.y - pos.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        // Spring force: attract if too far, repel if too close
                        const displacement = dist - IDEAL_EDGE_LENGTH;
                        const springForce = displacement * ATTRACTION;
                        if (dist > 0) {
                            fx += (dx / dist) * springForce;
                            fy += (dy / dist) * springForce;
                        }
                    }
                }
            });

            // Pull toward center
            fx += (centerX - pos.x) * CENTER_PULL;
            fy += (centerY - pos.y) * CENTER_PULL;

            // Update velocity
            pos.vx = (pos.vx + fx) * DAMPING;
            pos.vy = (pos.vy + fy) * DAMPING;

            // Update position
            pos.x += pos.vx;
            pos.y += pos.vy;

            // Boundary constraints with generous padding
            const padding = 80;
            pos.x = Math.max(
                padding,
                Math.min(containerWidth - padding, pos.x),
            );
            pos.y = Math.max(
                padding,
                Math.min(containerHeight - padding, pos.y),
            );
        });

        positions = new Map(positions);
        simulationTick++;

        // Run simulation longer to ensure good layout
        if (simulationTick > 600) {
            isSimulating = false;
        }
    }

    function animate() {
        simulateStep();
        animationFrame = requestAnimationFrame(animate);
    }

    // Drag handlers
    function handleMouseDown(event: MouseEvent, nodeId: string) {
        draggedNode = nodeId;
        const pos = positions.get(nodeId);
        if (pos) {
            pos.fx = pos.x;
            pos.fy = pos.y;
        }
        event.preventDefault();
    }

    function handleMouseMove(event: MouseEvent) {
        if (!draggedNode || !svgElement) return;

        const rect = svgElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const pos = positions.get(draggedNode);
        if (pos) {
            pos.x = x;
            pos.y = y;
            pos.fx = x;
            pos.fy = y;
            pos.vx = 0;
            pos.vy = 0;
            positions = new Map(positions);
        }
    }

    function handleMouseUp() {
        if (draggedNode) {
            const pos = positions.get(draggedNode);
            if (pos) {
                pos.fx = null;
                pos.fy = null;
            }
            draggedNode = null;
            // Restart simulation briefly
            isSimulating = true;
            simulationTick = 200;
        }
        isPanning = false;
    }

    function handleZoom(event: WheelEvent) {
        event.preventDefault();
        const zoomSpeed = 0.001;
        const delta = -event.deltaY;
        const newZoom = Math.max(
            0.2,
            Math.min(3, zoomLevel + delta * zoomSpeed),
        );

        // Target focus
        const rect = svgElement.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Adjust pan to zoom toward mouse
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
        // Collapsed cluster nodes get a special gold color
        if (collapsed) return "#fbbf24";

        const colors: Record<string, string> = {
            Root: "#f59e0b",
            CONCEPT: "#8b5cf6",
            THEORY: "#a78bfa",
            METHOD: "#06b6d4",
            TECHNIQUE: "#14b8a6",
            DEFINITION: "#60a5fa",
            EXAMPLE: "#34d399",
            FORMULA: "#c084fc",
            TECHNOLOGY: "#22d3ee",
            TASK: "#00c8ff",
            DECISION: "#4dd2ff",
            PERSON: "#a78bfa",
            DEADLINE: "#ef4444",
            RISK: "#f59e0b",
            ACTION_ITEM: "#10b981",
            Speaker: "#22d3ee",
            Topic: "#6366f1",
            TOPIC: "#06b6d4",
            Tone: "#f472b6",
            Category: "#818cf8",
            Entity: "#34d399",
            entity: "#34d399",
            PROJECT: "#f97316",
            LOCATION: "#84cc16",
            DATE: "#e879f9",
            ORG: "#fb923c",
            URGENCY: "#dc2626",
            SENTIMENT: "#a855f7",
            QUERY: "#2dd4bf",
            Cluster: "#fbbf24",
            default: "#00c8ff",
        };
        return colors[type] || colors.default;
    }

    // === FULLSCREEN / CONTROLS ===
    function toggleFullscreen() {
        isFullscreen = !isFullscreen;
        if (isFullscreen) {
            // Recalculate dimensions for fullscreen
            setTimeout(() => {
                if (containerEl) {
                    const rect = containerEl.getBoundingClientRect();
                    containerWidth = rect.width || 1200;
                    containerHeight = rect.height || 800;
                    resetView();
                }
            }, 50);
        } else {
            setTimeout(() => {
                if (svgElement?.parentElement) {
                    const rect =
                        svgElement.parentElement.getBoundingClientRect();
                    containerWidth = rect.width || 600;
                    containerHeight = rect.height || 400;
                    resetView();
                }
            }, 50);
        }
    }

    function resetView() {
        zoomLevel = 1.0;
        panX = 0;
        panY = 0;
        isSimulating = true;
        simulationTick = 0;
        initializePositions();
    }

    function zoomIn() {
        zoomLevel = Math.min(3, zoomLevel + 0.2);
    }

    function zoomOut() {
        zoomLevel = Math.max(0.2, zoomLevel - 0.2);
    }

    function fitToView() {
        if (nodes.length === 0) return;
        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
        for (const node of nodes) {
            const pos = positions.get(node.id);
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
            ctx.fillStyle = "#0a0c0f";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const link = document.createElement("a");
            link.href = canvas.toDataURL("image/png");
            link.download = `knowledge-graph-${new Date().toISOString().slice(0, 10)}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
        img.src =
            "data:image/svg+xml;base64," +
            btoa(unescape(encodeURIComponent(svgData)));
    }

    function exportGraphJSON() {
        const data = {
            nodes: nodes.map((n) => ({
                id: n.id,
                type: n.type,
                label: n.label || n.id,
                weight: n.weight,
            })),
            edges: edges.map((e) => ({
                from: e.from,
                to: e.to,
                relation: e.relation,
            })),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
        });
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
        // If it's a collapsed cluster, dispatch expand event
        if (node?.collapsed) {
            dispatch("toggleCluster", { nodeId });
            return;
        }
        selectedNode = selectedNode === nodeId ? null : nodeId;
    }

    // Track previous SVG element for cleanup
    let prevSvgElement: SVGSVGElement | null = null;

    // Re-measure container and re-attach wheel listener when SVG element appears/changes
    function measureAndAttach() {
        // Detach from previous SVG if it changed
        if (prevSvgElement && prevSvgElement !== svgElement) {
            prevSvgElement.removeEventListener("wheel", handleZoom);
        }
        // Measure from the container or SVG parent
        const measurable = containerEl || svgElement?.parentElement;
        if (measurable) {
            const rect = measurable.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                containerWidth = rect.width;
                containerHeight = rect.height;
            }
        }
        // Attach wheel listener to current SVG
        if (svgElement && svgElement !== prevSvgElement) {
            svgElement.addEventListener("wheel", handleZoom, {
                passive: false,
            });
            prevSvgElement = svgElement;
        }
    }

    // Reactive updates — fires when nodes change
    $: if (nodes.length > 0) {
        // Defer measurement to next tick so the SVG element exists in the DOM
        setTimeout(() => {
            measureAndAttach();
            initializePositions();
            isSimulating = true;
            simulationTick = 0;
            // Auto fit after simulation settles a bit
            setTimeout(() => fitToView(), 500);
        }, 0);
    }

    onMount(() => {
        // Initial dimension measurement
        measureAndAttach();
        initializePositions();
        animate();

        // Add global mouse handlers
        window.addEventListener("mousemove", handleGlobalMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
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
        class="fixed inset-0 z-[9999] bg-black/95 flex flex-col"
        bind:this={containerEl}
    >
        <!-- Fullscreen toolbar -->
        <div
            class="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-cyan-500/20"
        >
            <div class="flex items-center gap-3">
                <span class="text-cyan-400 font-semibold text-sm"
                    >Knowledge Graph</span
                >
                <span class="text-xs text-slate-500"
                    >{nodes.length} nodes / {edges.length} edges</span
                >
            </div>
            <div class="flex items-center gap-1">
                <button
                    onclick={zoomOut}
                    class="p-1.5 rounded hover:bg-slate-700/60 text-slate-400 hover:text-cyan-400 transition-colors"
                    title="Zoom Out"
                >
                    <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        ><circle cx="11" cy="11" r="8" /><line
                            x1="21"
                            y1="21"
                            x2="16.65"
                            y2="16.65"
                        /><line x1="8" y1="11" x2="14" y2="11" /></svg
                    >
                </button>
                <span class="text-xs text-slate-500 w-12 text-center"
                    >{Math.round(zoomLevel * 100)}%</span
                >
                <button
                    onclick={zoomIn}
                    class="p-1.5 rounded hover:bg-slate-700/60 text-slate-400 hover:text-cyan-400 transition-colors"
                    title="Zoom In"
                >
                    <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
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
                <div class="w-px h-5 bg-slate-700 mx-1"></div>
                <button
                    onclick={fitToView}
                    class="p-1.5 rounded hover:bg-slate-700/60 text-slate-400 hover:text-cyan-400 transition-colors"
                    title="Fit to View"
                >
                    <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        ><path
                            d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
                        /></svg
                    >
                </button>
                <button
                    onclick={resetView}
                    class="p-1.5 rounded hover:bg-slate-700/60 text-slate-400 hover:text-cyan-400 transition-colors"
                    title="Reset View"
                >
                    <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        ><polyline points="1 4 1 10 7 10" /><path
                            d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"
                        /></svg
                    >
                </button>
                <div class="w-px h-5 bg-slate-700 mx-1"></div>
                <button
                    onclick={downloadSVG}
                    class="p-1.5 rounded hover:bg-slate-700/60 text-slate-400 hover:text-cyan-400 transition-colors"
                    title="Download SVG"
                >
                    <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
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
                    class="p-1.5 rounded hover:bg-slate-700/60 text-slate-400 hover:text-cyan-400 transition-colors"
                    title="Download PNG"
                >
                    <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        ><rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                        /><circle cx="8.5" cy="8.5" r="1.5" /><polyline
                            points="21 15 16 10 5 21"
                        /></svg
                    >
                </button>
                <button
                    onclick={exportGraphJSON}
                    class="p-1.5 rounded hover:bg-slate-700/60 text-slate-400 hover:text-cyan-400 transition-colors"
                    title="Export JSON"
                >
                    <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        ><path
                            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                        /><polyline points="14 2 14 8 20 8" /></svg
                    >
                </button>
                <div class="w-px h-5 bg-slate-700 mx-1"></div>
                <button
                    onclick={toggleFullscreen}
                    class="p-1.5 rounded hover:bg-slate-700/60 text-red-400 hover:text-red-300 transition-colors"
                    title="Exit Fullscreen"
                >
                    <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
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
                            style="stop-color:#00c8ff;stop-opacity:0.1"
                        />
                        <stop
                            offset="50%"
                            style="stop-color:#00c8ff;stop-opacity:0.4"
                        />
                        <stop
                            offset="100%"
                            style="stop-color:#00c8ff;stop-opacity:0.1"
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
                            fill="#00c8ff"
                            opacity="0.5"
                        />
                    </marker>
                </defs>
                <g transform="translate({panX}, {panY}) scale({zoomLevel})">
                    <g class="edges">
                        {#each edges as edge}
                            {@const from = positions.get(edge.from)}
                            {@const to = positions.get(edge.to)}
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
                                <line
                                    x1={startX}
                                    y1={startY}
                                    x2={endX}
                                    y2={endY}
                                    stroke="#00c8ff"
                                    stroke-opacity="0.5"
                                    stroke-width="2"
                                    marker-end="url(#arrowhead)"
                                />
                                <rect
                                    x={midX - edge.relation.length * 3.2}
                                    y={midY - 8}
                                    width={edge.relation.length * 6.4}
                                    height={14}
                                    fill="#0a0c0f"
                                    fill-opacity="0.85"
                                    rx="3"
                                />
                                <text
                                    x={midX}
                                    y={midY + 3}
                                    fill="#00c8ff"
                                    font-size="10"
                                    opacity="0.8"
                                    text-anchor="middle"
                                    class="font-sans">{edge.relation}</text
                                >
                            {/if}
                        {/each}
                    </g>
                    <g class="nodes">
                        {#each nodes as node}
                            {@const pos = positions.get(node.id)}
                            {#if pos}
                                {@const color = getNodeColor(
                                    node.type,
                                    node.collapsed,
                                )}
                                {@const isCluster = node.collapsed}
                                {@const nodeR = isCluster ? 32 : 22}
                                <g
                                    transform="translate({pos.x}, {pos.y})"
                                    class="cursor-grab transition-transform {draggedNode ===
                                    node.id
                                        ? 'cursor-grabbing'
                                        : 'hover:scale-110'}"
                                    onmousedown={(e) =>
                                        handleMouseDown(e, node.id)}
                                    onclick={() => handleNodeClick(node.id)}
                                    role="button"
                                    tabindex="0"
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
                                        font-size="10"
                                        font-weight="500"
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
                                            fill="#00c8ff"
                                            fill-opacity="0.3"
                                            stroke="#00c8ff"
                                            stroke-width="1"
                                        />
                                        <text
                                            x="18"
                                            y="-14"
                                            text-anchor="middle"
                                            fill="#00c8ff"
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
                        class="absolute bottom-4 right-4 bg-slate-900/95 border border-cyan-500/30 rounded-lg p-3 min-w-[200px] max-w-[300px]"
                    >
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs font-medium text-cyan-400"
                                >{selNode.type}</span
                            >
                            <button
                                onclick={() => (selectedNode = null)}
                                class="text-slate-500 hover:text-slate-300 text-xs"
                                >Close</button
                            >
                        </div>
                        <p class="text-sm text-slate-200 font-medium">
                            {selNode.label || selNode.id}
                        </p>
                        {#if selNode.weight}
                            <p class="text-xs text-slate-500 mt-1">
                                Weight: {selNode.weight}
                            </p>
                        {/if}
                        {#if connEdges.length > 0}
                            <div class="mt-2 border-t border-slate-700 pt-2">
                                <p class="text-xs text-slate-500 mb-1">
                                    {connEdges.length} connection{connEdges.length >
                                    1
                                        ? "s"
                                        : ""}
                                </p>
                                {#each connEdges.slice(0, 5) as ce}
                                    <p class="text-xs text-slate-400 truncate">
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
        ? 'min-h-[180px]'
        : 'min-h-[400px]'}"
    class:hidden={isFullscreen}
    bind:this={containerEl}
    style="background: linear-gradient(135deg, rgba(13, 17, 23, 0.95) 0%, rgba(10, 12, 15, 0.9) 100%); border: 1px solid rgba(0, 200, 255, 0.15);"
>
    <!-- Controls toolbar -->
    {#if !compact}
        <div
            class="absolute top-2 right-2 z-10 flex items-center gap-0.5 bg-slate-900/80 rounded-lg border border-slate-700/50 px-1 py-0.5 backdrop-blur-sm"
        >
            <button
                onclick={zoomOut}
                class="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-cyan-400 transition-colors"
                title="Zoom Out"
            >
                <svg
                    class="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    ><circle cx="11" cy="11" r="8" /><line
                        x1="21"
                        y1="21"
                        x2="16.65"
                        y2="16.65"
                    /><line x1="8" y1="11" x2="14" y2="11" /></svg
                >
            </button>
            <span class="text-[10px] text-slate-500 w-8 text-center"
                >{Math.round(zoomLevel * 100)}%</span
            >
            <button
                onclick={zoomIn}
                class="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-cyan-400 transition-colors"
                title="Zoom In"
            >
                <svg
                    class="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
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
            <div class="w-px h-4 bg-slate-700 mx-0.5"></div>
            <button
                onclick={fitToView}
                class="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-cyan-400 transition-colors"
                title="Fit to View"
            >
                <svg
                    class="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    ><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg
                >
            </button>
            <button
                onclick={resetView}
                class="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-cyan-400 transition-colors"
                title="Reset View"
            >
                <svg
                    class="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    ><polyline points="1 4 1 10 7 10" /><path
                        d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"
                    /></svg
                >
            </button>
            <div class="w-px h-4 bg-slate-700 mx-0.5"></div>
            <button
                onclick={downloadSVG}
                class="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-cyan-400 transition-colors"
                title="Download SVG"
            >
                <svg
                    class="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
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
                class="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-cyan-400 transition-colors"
                title="Download PNG"
            >
                <svg
                    class="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    ><rect
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"
                    /><circle cx="8.5" cy="8.5" r="1.5" /><polyline
                        points="21 15 16 10 5 21"
                    /></svg
                >
            </button>
            <button
                onclick={exportGraphJSON}
                class="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-cyan-400 transition-colors"
                title="Export JSON"
            >
                <svg
                    class="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    ><path
                        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                    /><polyline points="14 2 14 8 20 8" /></svg
                >
            </button>
            <div class="w-px h-4 bg-slate-700 mx-0.5"></div>
            <button
                onclick={toggleFullscreen}
                class="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-cyan-400 transition-colors"
                title="Fullscreen"
            >
                <svg
                    class="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
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
                class="p-1 rounded bg-slate-900/70 hover:bg-slate-700/80 text-slate-400 hover:text-cyan-400 transition-colors border border-slate-700/50"
                title="Fullscreen"
            >
                <svg
                    class="w-3 h-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
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
        <div class="absolute inset-0 flex items-center justify-center">
            <div class="text-center">
                <svg
                    class="w-10 h-10 mx-auto mb-3 opacity-50 text-cyan-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                >
                    <circle cx="12" cy="5" r="3" />
                    <circle cx="5" cy="19" r="3" />
                    <circle cx="19" cy="19" r="3" />
                    <line x1="12" y1="8" x2="5" y2="16" />
                    <line x1="12" y1="8" x2="19" y2="16" />
                </svg>
                <p class="text-sm text-cyan-500/50">
                    Knowledge graph will appear here
                </p>
                <p class="text-xs text-slate-500 mt-1">
                    Start recording or simulate to add nodes
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
                        style="stop-color:#00c8ff;stop-opacity:0.1"
                    />
                    <stop
                        offset="50%"
                        style="stop-color:#00c8ff;stop-opacity:0.4"
                    />
                    <stop
                        offset="100%"
                        style="stop-color:#00c8ff;stop-opacity:0.1"
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
                        fill="#00c8ff"
                        opacity="0.5"
                    />
                </marker>
            </defs>

            <g transform="translate({panX}, {panY}) scale({zoomLevel})">
                <!-- Edges -->
                <g class="edges">
                    {#each edges as edge}
                        {@const from = positions.get(edge.from)}
                        {@const to = positions.get(edge.to)}
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
                            <line
                                x1={startX}
                                y1={startY}
                                x2={endX}
                                y2={endY}
                                stroke="#00c8ff"
                                stroke-opacity="0.5"
                                stroke-width="2"
                                marker-end="url(#arrowhead)"
                            />
                            <rect
                                x={midX - edge.relation.length * 3.2}
                                y={midY - 8}
                                width={edge.relation.length * 6.4}
                                height={14}
                                fill="#0a0c0f"
                                fill-opacity="0.85"
                                rx="3"
                            />
                            <text
                                x={midX}
                                y={midY + 3}
                                fill="#00c8ff"
                                font-size="10"
                                opacity="0.8"
                                text-anchor="middle"
                                class="font-sans">{edge.relation}</text
                            >
                        {/if}
                    {/each}
                </g>

                <!-- Nodes -->
                <g class="nodes">
                    {#each nodes as node}
                        {@const pos = positions.get(node.id)}
                        {#if pos}
                            {@const color = getNodeColor(
                                node.type,
                                node.collapsed,
                            )}
                            {@const isCluster = node.collapsed}
                            {@const nodeR = isCluster ? 32 : 22}
                            <g
                                transform="translate({pos.x}, {pos.y})"
                                class="cursor-grab transition-transform {draggedNode ===
                                node.id
                                    ? 'cursor-grabbing'
                                    : 'hover:scale-110'}"
                                onmousedown={(e) => handleMouseDown(e, node.id)}
                                onclick={() => handleNodeClick(node.id)}
                                role="button"
                                tabindex="0"
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
                                        fill="#00c8ff"
                                        fill-opacity="0.3"
                                        stroke="#00c8ff"
                                        stroke-width="1"
                                    />
                                    <text
                                        x="18"
                                        y="-14"
                                        text-anchor="middle"
                                        fill="#00c8ff"
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
                    class="absolute bottom-10 right-3 bg-slate-900/95 border border-cyan-500/30 rounded-lg p-3 min-w-[180px] max-w-[260px] z-10"
                >
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-medium text-cyan-400"
                            >{selNode.type}</span
                        >
                        <button
                            onclick={() => (selectedNode = null)}
                            class="text-slate-500 hover:text-slate-300 text-xs"
                            >x</button
                        >
                    </div>
                    <p class="text-sm text-slate-200 font-medium">
                        {selNode.label || selNode.id}
                    </p>
                    {#if selNode.weight}<p
                            class="text-xs text-slate-500 mt-0.5"
                        >
                            Weight: {selNode.weight}
                        </p>{/if}
                    {#if connEdges.length > 0}
                        <div class="mt-1.5 border-t border-slate-700 pt-1.5">
                            <p class="text-xs text-slate-500 mb-0.5">
                                {connEdges.length} connection{connEdges.length >
                                1
                                    ? "s"
                                    : ""}
                            </p>
                            {#each connEdges.slice(0, 4) as ce}
                                <p class="text-xs text-slate-400 truncate">
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
    <div class="absolute bottom-2 left-2 text-xs text-slate-500 flex gap-3">
        <span class="flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-500/50"></span>
            {nodes.length} nodes
        </span>
        <span class="flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-500/30"></span>
            {edges.length} edges
        </span>
    </div>
</div>
