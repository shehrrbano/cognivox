<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import type { Transcript, GraphNode, GraphEdge } from "./types";
    import { createEventDispatcher, onMount } from "svelte";
    import KnowledgeGraph from "./KnowledgeGraph.svelte";

    let {
        transcripts = [],
        graphNodes = [],
        graphEdges = [],
        isCollapsed = false,
        debugMode = false,
        debugEventCount = 0,
        debugLastEvent = "",
        debugLastTranscript = ""
    } = $props();

    import { settingsStore } from "./settingsStore";

    const dispatch = createEventDispatcher();

    // Task 2.3 (BATCH2): Inline speaker rename — dispatch to parent (+page.svelte)
    function renameSpeakerInline(speakerId: string | undefined, currentName: string) {
        const newName = prompt(`Rename "${currentName}" to:`, currentName);
        if (newName && newName.trim() && newName.trim() !== currentName) {
            dispatch('renameSpeaker', { speakerId, newLabel: newName.trim() });
        }
    }

    // MEETING_TASKS_v1: Task 3.2 — Export transcript to .txt file
    function exportTranscriptAsTxt() {
        if (!transcripts || transcripts.length === 0) return;
        const lines = (transcripts as Transcript[]).map(t => {
            const ts = t.timestamp || '';
            const speaker = t.speaker || 'Speaker';
            const text = t.text || '';
            const tone = t.tone && t.tone !== 'NEUTRAL' ? ` [${t.tone}]` : '';
            return `[${ts}] ${speaker}${tone}: ${text}`;
        });
        const content = lines.join('\n');
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcript_${new Date().toISOString().slice(0,19).replace(/[:T]/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Mapping node types/categories to settings filter keys
    const filterMap: Record<string, string> = {
        'TASK': 'tasks',
        'DECISION': 'decisions',
        'DEADLINE': 'deadlines',
        'ACTION_ITEM': 'actionItems',
        'RISK': 'risks',
        'URGENCY': 'urgency',
        'SENTIMENT': 'sentiment',
        'INTERRUPTION': 'interruptions',
        'AGREEMENT': 'agreement',
        'DISAGREEMENT': 'disagreement',
        'EMOTION_SHIFT': 'emotionShifts',
        'TOPIC_DRIFT': 'topicDrifts'
    };

    let filteredNodes = $derived((graphNodes || []).filter(node => {
        // KG_REDESIGN_v1: "Start"/"Root" nodes are deprecated — filter them out entirely
        if (node.id === 'Start' || node.type === 'Root') return false;
        // Always show speaker, entity, and tone nodes
        if (node.type === 'Speaker' || node.type === 'ENTITY' || node.type === 'Entity' || node.type === 'Tone') return true;

        // Check if this category is enabled in settings
        const filterKey = filterMap[node.id] || filterMap[node.type];
        if (filterKey) {
            return ($settingsStore.filters as any)[filterKey] !== false;
        }
        return true;
    }));

    let filteredEdges = $derived((graphEdges || []).filter(edge => {
        const sourceVisible = filteredNodes.some(n => n.id === (edge as any).source || n.id === edge.from);
        const targetVisible = filteredNodes.some(n => n.id === (edge as any).target || n.id === edge.to);
        return sourceVisible && targetVisible;
    }));


    function getToneStyle(tone?: string) {
        if (!tone) return "bg-gray-100 text-gray-500 border-gray-200/50";
        switch (tone.toUpperCase()) {
            case "POSITIVE": return "bg-green-50 text-green-600 border-green-200/50";
            case "NEGATIVE": return "bg-red-50 text-red-600 border-red-200/50";
            case "URGENT": return "bg-orange-50 text-orange-600 border-orange-200/50";
            default: return "bg-gray-100 text-gray-500 border-gray-200/50";
        }
    }
</script>

<div class="w-full flex flex-col xl:flex-row gap-4 xl:h-[600px]">
    <!-- Left Column: Transcript Section (40%) -->
    <div class="xl:w-[40%] h-[600px] xl:h-auto flex flex-col bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden flex-shrink-0">
        <!-- Header -->
        <div class="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10 backdrop-blur-sm">
            <div class="flex items-center gap-3">
                <span class="text-[11px] font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)] ring-2 ring-red-500/20"></span>
                    LIVE TRANSCRIPT
                </span>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[9px] font-bold text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-200 shadow-sm">{transcripts.length} ENTRIES</span>
                <!-- MEETING_TASKS_v1: Task 3.2 — Export to .txt button -->
                {#if transcripts.length > 0}
                    <button
                        onclick={exportTranscriptAsTxt}
                        title="Export transcript as .txt"
                        class="flex items-center gap-1 text-[9px] font-bold text-gray-400 bg-white hover:text-blue-600 hover:border-blue-200 px-2 py-0.5 rounded border border-gray-200 shadow-sm transition-colors"
                        aria-label="Export transcript as text file"
                    >
                        <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        EXPORT
                    </button>
                {/if}
            </div>
        </div>

        <!-- Transcript Content -->
        <div class="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar bg-white">
            {#if transcripts.length === 0}
                <div class="flex flex-col items-center justify-center h-full text-center opacity-50">
                    <svg class="w-8 h-8 text-blue-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                    <p class="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Awaiting Audio</p>
                </div>
            {:else}
                {#each transcripts as t, i (t.id || i)}
                    {@const isUser = t.speaker?.toLowerCase() === 'you' || t.speaker?.includes('1')}
                    <!-- Task 2.2 (BATCH2): Determine speaker role — speakerId 1 = Lecturer, others = Student N -->
                    {@const speakerLabel = t.speaker && t.speaker !== 'You' && t.speaker !== 'Speaker 1'
                        ? t.speaker
                        : isUser
                            ? 'Lecturer'
                            : `Student ${(t.speakerId ?? 2) - 1}`
                    }
                    {@const avatarText = isUser ? 'LEC' : `S${(t.speakerId ?? 2) - 1}`}
                    <div class="group flex gap-3 animate-fadeIn">
                        <!-- Avatar -->
                        <div class="flex-shrink-0">
                            <div class="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black {isUser ? 'bg-blue-100 text-blue-600 border border-blue-200/50' : 'bg-purple-100 text-purple-600 border border-purple-200/50'} shadow-sm">
                                {avatarText}
                            </div>
                        </div>
                        
                        <!-- Content -->
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-[10px] font-bold {isUser ? 'text-blue-600' : 'text-purple-600'} flex items-center gap-1.5">
                                    {speakerLabel}
                                    {#if t.tone}
                                        <span class="text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded border {getToneStyle(t.tone)}">
                                            {t.tone}
                                        </span>
                                    {/if}
                                </span>
                                <span class="text-[9px] font-medium text-gray-400">{t.timestamp || new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                <!-- Task 2.3 (BATCH2): Inline rename button — hidden until hover -->
                                <button
                                    class="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] text-gray-400 hover:text-blue-500 px-1.5 py-0.5 rounded border border-gray-200 hover:border-blue-300 bg-white ml-auto"
                                    onclick={() => renameSpeakerInline(t.speakerId?.toString(), speakerLabel)}
                                    title="Rename this speaker"
                                >✏ Rename</button>
                            </div>
                            
                            <div class="bg-gray-50/80 hover:bg-gray-100/80 transition-colors p-3.5 rounded-2xl rounded-tl-sm border border-gray-200/60 shadow-sm relative">
                                <p class="text-[13px] font-semibold text-gray-800 leading-relaxed max-w-prose break-words">
                                    {t.text}
                                </p>
                            </div>
                        </div>
                    </div>
                {/each}
            {/if}
        </div>
    </div>

    <!-- Right Column: Knowledge Graph — same KnowledgeGraph component as MAP tab -->
    <div class="xl:w-[60%] h-[600px] xl:h-auto overflow-hidden rounded-2xl border border-gray-200/60 shadow-sm">
        <KnowledgeGraph
            nodes={filteredNodes}
            edges={filteredEdges}
            compact={false}
        />
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.4); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.6); }
</style>
