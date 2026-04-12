<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_BATCH2_v1 -->
<!-- FIXED: FULL_FUNCTIONALITY_AUDITOR_AND_FIXER_v1 — real search from props -->
<script lang="ts">
    import { getContextWindow } from './intelligenceExtractor'; // MEETING_TASKS_v1: Task 3.3 — RAG context window
    import * as ragflow from './services/ragflowService';
    import { settingsStore } from './settingsStore';

    let {
        transcripts = [] as any[],
        graphNodes = [] as any[],
        initialQuery = "",
    } = $props();

    let query = $state(initialQuery);
    let activeFilter: 'all' | 'tasks' | 'decisions' | 'meetings' | 'entities' | 'ragflow' = $state('all');
    let visibleCount = $state(10);
    let ragflowResults = $state<any[]>([]);
    let isSearchingRagflow = $state(false);

    // Highlight matching text
    function highlight(text: string, q: string): string {
        if (!q.trim() || !text) return text;
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return text.replace(new RegExp(`(${escaped})`, 'gi'), '<span class="text-[#0b66ff] font-bold">$1</span>');
    }

    // Sync RAGFlow Search
    $effect(() => {
        const q = query.trim();
        if (q.length > 2 && (activeFilter === 'all' || activeFilter === 'ragflow')) {
            const timer = setTimeout(async () => {
                isSearchingRagflow = true;
                try {
                    const results = await ragflow.searchChunks(q, 10);
                    ragflowResults = results.map(c => ({
                        type: 'ragflow',
                        title: c.document_name || 'RAGFlow Source',
                        path: `RAGFlow > Chunk ${c.id.slice(0, 8)}`,
                        score: (c.similarity || 0).toFixed(2),
                        snippet: c.content,
                        meta1Icon: 'book', meta1Text: 'RAG Source',
                        meta2Icon: 'clock', meta2Text: 'Knowledge Base',
                    }));
                } catch (e) {
                    console.error('[SearchTab] RAGFlow search failed:', e);
                    ragflowResults = [];
                } finally {
                    isSearchingRagflow = false;
                }
            }, 300);
            return () => clearTimeout(timer);
        } else {
            ragflowResults = [];
        }
    });


    // MEETING_TASKS_v1: Task 3.3 — RAG context window: extract 10 words pre/post match
    // Returns highlighted snippet with context (10 words before and after the match).
    function snippetWithContext(text: string, q: string): string {
        if (!q.trim() || !text) return highlight(text, q);
        // Get 10-word context window around the match
        const contextText = getContextWindow(text, q, 10);
        // Highlight match within the context
        return highlight(contextText, q);
    }

    // Build results from real data
    let allResults = $derived((() => {
        const q = query.trim().toLowerCase();
        const out: any[] = [];

        // 0. RAGFlow Results (Vector Search)
        if (activeFilter === 'all' || activeFilter === 'ragflow') {
            for (const r of ragflowResults) {
                out.push({
                    ...r,
                    title: highlight(r.title, q),
                    snippet: highlight(r.snippet, q)
                });
            }
        }

        // 1. Transcripts → "meeting" entries
        if (activeFilter === 'all' || activeFilter === 'meetings') {
            for (const t of (transcripts || [])) {
                if (!t.text) continue;
                if (q && !t.text.toLowerCase().includes(q) && !(t.speaker||'').toLowerCase().includes(q)) continue;
                out.push({
                    type: 'meeting',
                    title: highlight(`${t.speaker || 'Speaker'}: "${t.text.slice(0,60)}${t.text.length > 60 ? '…' : ''}"`, q),
                    path: `Transcript > ${t.speaker || 'Unknown'} > ${t.timestamp || ''}`,
                    score: '1.00',
                    // MEETING_TASKS_v1: Task 3.3 — 10-word context window around match
                    snippet: snippetWithContext(t.text, q),
                    meta1Icon: 'video', meta1Text: 'Recorded',
                    meta2Icon: 'user', meta2Text: t.speaker || 'Speaker',
                    tone: t.tone,
                });
            }
        }

        // 2. Decisions from transcript categories
        if (activeFilter === 'all' || activeFilter === 'decisions') {
            for (const t of (transcripts || [])) {
                const isDecision = Array.isArray(t.category)
                    ? t.category.some((c: string) => c.toUpperCase().includes('DECISION'))
                    : typeof t.category === 'string' && t.category.toUpperCase().includes('DECISION');
                if (!isDecision) continue;
                if (q && !t.text?.toLowerCase().includes(q)) continue;
                out.push({
                    type: 'decision',
                    title: highlight(`Decision: ${(t.text || '').slice(0, 60)}${(t.text||'').length > 60 ? '…' : ''}`, q),
                    path: `Decisions > ${t.speaker || 'Speaker'} > ${t.timestamp || ''}`,
                    score: '0.95',
                    snippet: snippetWithContext(t.text || '', q), // MEETING_TASKS_v1: Task 3.3
                    meta1Icon: 'calendar', meta1Text: t.timestamp || '',
                    meta2Icon: 'user', meta2Text: t.speaker || 'Speaker',
                });
            }
        }

        // 3. Tasks from transcript categories
        if (activeFilter === 'all' || activeFilter === 'tasks') {
            for (const t of (transcripts || [])) {
                const isTask = Array.isArray(t.category)
                    ? t.category.some((c: string) => ['TASK','ACTION_ITEM','DEADLINE'].includes(c.toUpperCase()))
                    : typeof t.category === 'string' && ['TASK','ACTION_ITEM','DEADLINE'].includes(t.category.toUpperCase());
                if (!isTask) continue;
                if (q && !t.text?.toLowerCase().includes(q)) continue;
                out.push({
                    type: 'task',
                    title: highlight(`Task: ${(t.text || '').slice(0, 60)}${(t.text||'').length > 60 ? '…' : ''}`, q),
                    path: `Tasks > ${t.speaker || 'Speaker'} > ${t.timestamp || ''}`,
                    score: '0.90',
                    snippet: snippetWithContext(t.text || '', q), // MEETING_TASKS_v1: Task 3.3
                    meta1Icon: 'check', meta1Text: 'Captured',
                    meta2Icon: 'user', meta2Text: t.speaker || 'Speaker',
                });
            }
        }

        // 4. Knowledge graph nodes as "entities"
        if (activeFilter === 'all' || activeFilter === 'entities') {
            for (const n of (graphNodes || [])) {
                // KG_REDESIGN_v1: Skip any legacy "Start"/"Root" nodes that may exist in old restored sessions
                if (n.id === 'Start' || n.type === 'Root') continue;
                if (q && !n.label?.toLowerCase().includes(q) && !n.id?.toLowerCase().includes(q)) continue;
                out.push({
                    type: 'document',
                    title: highlight(n.label || n.id, q),
                    path: `Knowledge Graph > ${n.type || 'Entity'} > weight: ${(n.weight||0).toFixed(2)}`,
                    score: ((n.weight || 0.5)).toFixed(2),
                    snippet: highlight(`"${n.label || n.id}" — a ${n.type || 'concept'} node extracted from conversation`, q),
                    meta1Icon: 'calendar', meta1Text: 'In current session',
                    meta2Icon: 'user', meta2Text: `Type: ${n.type || 'Entity'}`,
                });
            }
        }

        // Sort by score descending
        return out.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
    })());

    let displayResults = $derived(allResults.slice(0, visibleCount));

    function loadMore() { visibleCount += 10; }

    function setFilter(f: typeof activeFilter) {
        activeFilter = f;
        visibleCount = 10;
    }

</script>

<div class="flex-1 w-full bg-[#fafafb] overflow-y-auto px-4 lg:px-12 py-10 custom-scrollbar flex flex-col items-center">
    <div class="w-full max-w-4xl">

        <!-- Big Search Bar -->
        <div class="relative w-full mb-6">
            <div class="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <input type="text" bind:value={query} class="w-full bg-white border border-gray-200/80 rounded-2xl h-14 pl-14 pr-6 text-[15px] font-medium text-gray-900 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.08)] outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" placeholder="Search transcripts, decisions, entities…" />
        </div>

        <!-- Filter Chips -->
        <div class="flex gap-3 mb-10 overflow-x-auto no-scrollbar pb-2">
            <button onclick={() => setFilter('all')} class="{activeFilter === 'all' ? 'bg-[#0b66ff] text-white shadow-sm shadow-blue-500/30' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'} text-[13px] font-bold px-5 py-2.5 rounded-full flex items-center gap-2 whitespace-nowrap transition-colors">
                All Entities
            </button>
            <button onclick={() => setFilter('ragflow')} class="{activeFilter === 'ragflow' ? 'bg-[#ff6b0b] text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'} text-[13px] font-semibold px-5 py-2.5 rounded-full shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                {isSearchingRagflow ? 'Searching RAGFlow...' : 'RAGFlow Docs'}
            </button>
            <button onclick={() => setFilter('tasks')} class="{activeFilter === 'tasks' ? 'bg-[#0b66ff] text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'} text-[13px] font-semibold px-5 py-2.5 rounded-full shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                Tasks
            </button>
            <button onclick={() => setFilter('decisions')} class="{activeFilter === 'decisions' ? 'bg-[#0b66ff] text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'} text-[13px] font-semibold px-5 py-2.5 rounded-full shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Decisions
            </button>
            <button onclick={() => setFilter('meetings')} class="{activeFilter === 'meetings' ? 'bg-[#0b66ff] text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'} text-[13px] font-semibold px-5 py-2.5 rounded-full shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                Meetings
            </button>
            <button onclick={() => setFilter('entities')} class="{activeFilter === 'entities' ? 'bg-[#0b66ff] text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'} text-[13px] font-semibold px-5 py-2.5 rounded-full shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                Entities
            </button>
        </div>

        <!-- Meta Line -->
        <div class="flex justify-between items-center mb-6">
            <div class="flex items-center gap-2">
                <h2 class="text-[17px] font-black text-gray-900 tracking-tight">Search Results</h2>
                <span class="text-[14px] text-gray-400 font-medium">({allResults.length} found)</span>
            </div>
            <div class="flex items-center gap-2 text-[13px]">
                <span class="text-gray-500 font-medium">Sort by:</span>
                <button class="text-[#0b66ff] font-bold flex items-center gap-1 hover:underline">
                    Relevance
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
            </div>
        </div>

        <!-- Empty State -->
        {#if allResults.length === 0}
            <div class="flex flex-col items-center justify-center py-20 text-center">
                <div class="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4 border border-gray-100">
                    <svg class="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
                <h3 class="text-[12px] font-bold text-gray-600 uppercase tracking-widest mb-1">
                    {query.trim() ? 'No results found' : 'Start searching'}
                </h3>
                <p class="text-[11px] text-gray-400 max-w-[260px] leading-relaxed">
                    {query.trim() ? `No matches for "${query}"` : 'Type to search transcripts, decisions, tasks, and knowledge graph entities.'}
                </p>
            </div>
        {/if}

        <!-- Results List -->
        <div class="space-y-4">
            {#each displayResults as r}
                <div class="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-blue-100 transition-all group flex flex-col gap-3">
                    
                    <div class="flex justify-between items-start gap-4">
                        <div class="flex items-start gap-4">
                            <!-- Icon -->
                            <div class="mt-1 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 
                                {r.type === 'document' || r.type === 'ragflow' ? 'bg-blue-50 text-blue-500' :
                                 r.type === 'decision' ? 'bg-orange-50 text-orange-500' :
                                 r.type === 'task' ? 'bg-green-50 text-green-500' :
                                 'bg-purple-50 text-purple-500'}">
                                {#if r.type === 'document' || r.type === 'ragflow'}
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>
                                {:else if r.type === 'decision'}
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                {:else if r.type === 'task'}
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                                {:else}
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                                {/if}
                            </div>
                            <!-- Title & Path -->
                            <div>
                                <h3 class="text-[16px] font-bold text-gray-900 group-hover:text-[#0b66ff] transition-colors cursor-pointer leading-tight mb-1 max-w-2xl">
                                    {@html r.title}
                                </h3>
                                <p class="text-[11px] text-gray-400 font-medium tracking-wide">
                                    {r.path}
                                </p>
                            </div>
                        </div>
                        <!-- Score Badge -->
                        <span class="bg-gray-100 text-gray-500 text-[10px] font-bold px-2.5 py-1 rounded">Score: {r.score}</span>
                    </div>

                    <!-- Snippet -->
                    <p class="text-[13px] text-gray-600 leading-relaxed max-w-3xl mt-1">
                        {@html r.snippet}
                    </p>

                    <!-- Footer Meta -->
                    <div class="flex items-center gap-6 mt-2 pt-3 border-t border-gray-50">
                        <div class="flex items-center gap-2 text-[11px] font-semibold text-gray-400">
                            {#if r.meta1Icon === 'calendar'} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            {:else if r.meta1Icon === 'check'} <span class="text-green-500 flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></span>
                            {:else if r.meta1Icon === 'video'} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                            {:else if r.meta1Icon === 'book'} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                            {/if}
                            <span class={r.meta1Icon === 'check' ? 'text-green-500' : ''}>{r.meta1Text}</span>
                        </div>
                        <div class="flex items-center gap-2 text-[11px] font-semibold text-gray-400">
                            {#if r.meta2Icon === 'user'} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            {:else if r.meta2Icon === 'clock'} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            {/if}
                            {r.meta2Text}
                        </div>
                    </div>

                </div>
            {/each}
        </div>

        <!-- Load More -->
        {#if displayResults.length < allResults.length}
            <div class="flex justify-center mt-8">
                <button onclick={loadMore} class="flex items-center gap-2 bg-white border border-gray-200 text-[#0b66ff] text-[13px] font-bold px-6 py-3 rounded-xl shadow-sm hover:bg-gray-50 hover:border-blue-200 transition-colors">
                    Load more results
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
            </div>
        {/if}

    </div>
</div>

<style>
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(203, 213, 225, 0.4); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.6); }
</style>
