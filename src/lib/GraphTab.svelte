<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import KnowledgeGraph from "./KnowledgeGraph.svelte";
    import type { GraphNode, GraphEdge, Transcript } from "./types";

    export let graphNodes: GraphNode[] = [];
    export let graphEdges: GraphEdge[] = [];
    export let transcripts: Transcript[] = [];
    export let isGenerating: boolean = false;

    const dispatch = createEventDispatcher();

    function handleGenerateGraph() {
        dispatch("generateGraph");
    }

    function handleClearGraph() {
        dispatch("clearGraph");
    }

    function handleToggleCluster(event: CustomEvent<{ nodeId: string }>) {
        dispatch("toggleCluster", event.detail);
    }
</script>

<div
    class="content-card"
    style="height: calc(100vh - 220px); min-height: 500px;"
>
    <div class="content-card-header">
        <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-3">
                <span class="text-sm font-medium text-slate-200"
                    >Knowledge Graph Visualization</span
                >
                <span class="text-xs text-slate-500"
                    >{graphNodes.length} nodes • {graphEdges.length} edges</span
                >
            </div>
            <div class="flex items-center gap-2">
                {#if graphNodes.length > 0}
                    <button
                        onclick={handleClearGraph}
                        class="px-2 py-1 text-xs rounded bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-slate-200 border border-slate-600/30 transition-colors"
                        title="Clear graph"
                    >
                        Clear
                    </button>
                {/if}
                <button
                    onclick={handleGenerateGraph}
                    disabled={isGenerating || transcripts.length === 0}
                    class="px-3 py-1 text-xs rounded font-medium transition-all
                        {isGenerating
                        ? 'bg-cyan-500/20 text-cyan-300 cursor-wait'
                        : transcripts.length === 0
                          ? 'bg-slate-700/30 text-slate-500 cursor-not-allowed'
                          : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30'}"
                    title={transcripts.length === 0
                        ? "Record a conversation first"
                        : "Generate knowledge graph from transcripts"}
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
                                    stroke-width="3"
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
                                stroke-width="2"
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
    <div class="h-full p-2">
        <KnowledgeGraph
            nodes={graphNodes}
            edges={graphEdges}
            compact={false}
            on:toggleCluster={handleToggleCluster}
        />
    </div>
</div>
