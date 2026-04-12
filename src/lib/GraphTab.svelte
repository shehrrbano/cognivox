<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    // KG_UNIFIED_v1: Converted to Svelte 5 $props() — removes createEventDispatcher mismatch
    // that caused all button events (Generate, Clear, Clean Up) to be dispatched but never received.
    import KnowledgeGraph from "./KnowledgeGraph.svelte";
    import type { GraphNode, GraphEdge, Transcript } from "./types";

    let {
        graphNodes = [] as GraphNode[],
        graphEdges = [] as GraphEdge[],
        transcripts = [] as Transcript[],
        isGenerating = false,
        searchQuery = "",
        isRecording = false,
        isRecordingStarting = false,
        initialPositions = null as any,
        // Callback props (Svelte 5 style — replaces createEventDispatcher)
        ongenerateGraph = undefined as (() => void) | undefined,
        onclearGraph = undefined as (() => void) | undefined,
        onselfHealGraph = undefined as (() => void) | undefined,
        ontoggleCluster = undefined as ((d: { nodeId: string }) => void) | undefined,
        onlayoutChanged = undefined as ((d: { positions: any }) => void) | undefined,
    } = $props();

    let graphRef = $state<any>(null);

    // Expose getPositions for +page.svelte graphTabRef.getPositions()
    export function getPositions() { return graphRef?.getPositions(); }

    // KG_UNIFIED_v1: Expose refreshLayout so +page.svelte can trigger re-measure
    // when graph tab becomes visible (was hidden via display:none).
    export function refreshLayout() { graphRef?.refreshLayout?.(); }

    function handleGenerateGraph() { ongenerateGraph?.(); }
    function handleClearGraph() { onclearGraph?.(); }
    function handleSelfHeal() { onselfHealGraph?.(); }
</script>

<div
    class="content-card overflow-hidden"
    style="height: clamp(268px, 60vh, 359px); min-height: 180px;"
>
    <div class="content-card-header">
        <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-3">
                <div class="flex items-center gap-2 flex-wrap pb-2 sm:pb-0">
                    {#if isRecording}
                        <div class="flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-200 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                            <div class="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                            <span class="text-[7px] font-bold tracking-wider text-red-600 uppercase">LIVE</span>
                        </div>
                    {/if}
                    <div class="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-100 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                        <div class="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                        <span class="text-[7px] font-bold tracking-wider text-gray-600 uppercase">TASKS</span>
                    </div>
                    <div class="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-100 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                        <div class="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                        <span class="text-[7px] font-bold tracking-wider text-gray-600 uppercase">DECISIONS</span>
                    </div>
                    <div class="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-100 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                        <div class="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                        <span class="text-[7px] font-bold tracking-wider text-gray-600 uppercase">RISKS</span>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-2">
                {#if graphNodes.length > 0}
                    <!-- KG_CLEANUP_SELF_HEALING_v1: Self-heal button removes junk nodes instantly -->
                    <button
                        onclick={handleSelfHeal}
                        class="px-2.5 py-1.5 text-xs rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 hover:text-amber-700 border border-amber-200 transition-all promax-interaction font-bold min-h-[32px] flex items-center gap-1"
                        title="Remove noise nodes and deduplicate (instant, no API call)"
                        aria-label="Clean up knowledge graph"
                    >
                        ✦ Clean Up
                    </button>
                    <button
                        onclick={handleClearGraph}
                        class="px-2.5 py-1.5 text-xs rounded-lg bg-gray-100/50 hover:bg-slate-600/50 text-gray-500 hover:text-gray-800 border border-slate-600/30 transition-all promax-interaction min-h-[32px] flex items-center justify-center font-bold"
                        title="Clear graph"
                        aria-label="Clear knowledge graph"
                    >
                        Clear
                    </button>
                {/if}
                <button
                    onclick={handleGenerateGraph}
                    disabled={isGenerating || transcripts.length === 0}
                    class="px-3 py-1.5 min-h-[32px] text-xs rounded-lg font-bold transition-all promax-interaction
                        {isGenerating
                        ? 'bg-blue-50 text-blue-400 cursor-wait'
                        : transcripts.length === 0
                          ? 'bg-gray-100/30 text-gray-400 cursor-not-allowed opacity-50'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20'}"
                    title={transcripts.length === 0
                        ? "Record a conversation first"
                        : "Generate knowledge graph from transcripts"}
                    aria-label={graphNodes.length > 0 ? "Regenerate Graph" : "Generate Graph"}
                >
                    {#if isGenerating}
                        <span class="flex items-center gap-1">
                            <svg
                                class="w-3 h-3 animate-spin"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <circle
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-dasharray="31"
                                    stroke-dashoffset="10"
                                />
                            </svg>
                            Generating...
                        </span>
                    {:else}
                        <span class="flex items-center gap-1">
                            <svg
                                class="w-3 h-3"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1"
                            >
                                <circle cx="12" cy="5" r="3" />
                                <circle cx="5" cy="19" r="3" />
                                <circle cx="19" cy="19" r="3" />
                                <line x1="12" y1="8" x2="5" y2="16" />
                                <line x1="12" y1="8" x2="19" y2="16" />
                            </svg>
                            {graphNodes.length > 0 ? "Regenerate" : "Generate"} Graph
                        </span>
                    {/if}
                </button>
            </div>
        </div>
    </div>
    <div class="h-full p-2 sm:p-fluid-gap">
        <KnowledgeGraph
            bind:this={graphRef}
            {searchQuery}
            nodes={graphNodes}
            edges={graphEdges}
            compact={false}
            {initialPositions}
            pauseSimulation={isRecordingStarting}
            {ontoggleCluster}
            {onlayoutChanged}
        />
    </div>
</div>
