<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_BATCH2_v1 -->
<!-- FIXED: FULL_FUNCTIONALITY_AUDITOR_AND_FIXER_v1 — real decisions from transcripts -->
<!-- CONVERTED: SVELTE_5_PROPS_v1 -->
<script lang="ts">
    import type { Transcript, GraphNode } from './types';

    interface Props {
        transcripts?: Transcript[];
        graphNodes?: GraphNode[];
    }

    let {
        transcripts = [],
        graphNodes = []
    }: Props = $props();

    const AVATAR_COLORS = [
        'bg-teal-700', 'bg-black', 'bg-orange-300', 'bg-[#eaddce]',
        'bg-blue-600', 'bg-purple-600', 'bg-pink-500', 'bg-green-600'
    ];

    function speakerColor(name: string): string {
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
    }

    let decisions = $derived.by(() => {
        const seen = new Set<string>();
        const result: any[] = [];

        const raw = (transcripts || []).filter((t: Transcript) =>
            t.category?.some((c: string) => c.toUpperCase().includes('DECISION'))
        );

        for (const t of raw) {
            const key = (t.text || '').trim().toLowerCase().slice(0, 60);
            if (seen.has(key)) continue;
            seen.add(key);
            const date = t.timestamp
                ? new Date(t.timestamp).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()
                : t.timestamp || 'Unknown';
            const time = t.timestamp ? t.timestamp : '';
            const speaker = (t.speaker && t.speaker !== 'auto') ? t.speaker : 'Speaker';
            result.push({
                id: result.length + 1,
                date,
                time,
                status: 'Recorded',
                statusColor: 'bg-blue-50 text-blue-600',
                title: t.text || 'Decision recorded',
                rationale: t.text || '',
                stakeholders: [{ name: speaker, color: speakerColor(speaker) }],
            });
        }

        const decisionNodes = (graphNodes || []).filter((n: GraphNode) =>
            n.type === 'DECISION' || n.type === 'Decision'
        );
        for (const n of decisionNodes) {
            const label = (n.label || n.id || '').trim();
            if (!label || label.length < 5) continue;
            const key = label.toLowerCase().slice(0, 60);
            if (seen.has(key)) continue;
            seen.add(key);
            result.push({
                id: result.length + 1,
                date: 'KG EXTRACTED',
                time: '',
                status: 'From Graph',
                statusColor: 'bg-purple-50 text-purple-600',
                title: label,
                rationale: label,
                stakeholders: [{ name: 'Knowledge Graph', color: 'bg-purple-600' }],
            });
        }

        return result;
    });

    let filterQuery = $state('');
    let filteredDecisions = $derived(
        filterQuery.trim()
            ? decisions.filter((d: any) =>
                d.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
                d.rationale.toLowerCase().includes(filterQuery.toLowerCase()) ||
                d.stakeholders.some((s: any) => s.name.toLowerCase().includes(filterQuery.toLowerCase()))
              )
            : decisions
    );
</script>

<div class="flex-1 w-full bg-slate-50 overflow-y-auto px-4 lg:px-12 py-8 custom-scrollbar">
    <div class="max-w-5xl mx-auto">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
                <h1 class="text-[28px] font-black text-gray-900 tracking-tight leading-none mb-2">Decision Ledger</h1>
                <p class="text-[13px] text-gray-500/90 font-medium max-w-xl leading-relaxed">
                    A high-fidelity chronological record of organizational outcomes, strategic rationales, and verified stakeholders.
                </p>
            </div>
            <button class="bg-[#0b66ff] hover:bg-blue-600 text-white text-[12px] font-bold px-4 py-2.5 rounded-lg shadow-sm shadow-blue-500/30 flex items-center gap-2 transition-all">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Log New Decision
            </button>
        </div>

        <div class="flex flex-col lg:flex-row gap-3 mb-6">
            <div class="flex-1 relative flex items-center bg-white border border-gray-200/80 rounded-lg shadow-sm p-1">
                <div class="pl-3 pr-2 text-gray-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </div>
                <input type="text" bind:value={filterQuery} placeholder="Filter by keyword, speaker, or decision text..." class="bg-transparent border-none outline-none text-[12px] w-full text-gray-600 placeholder:text-gray-400 h-8" />
            </div>
        </div>

        {#if (decisions || []).length === 0}
            <div class="flex flex-col items-center justify-center py-20 text-center">
                <div class="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 border border-blue-100/50">
                    <svg class="w-8 h-8 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </div>
                <h3 class="text-[12px] font-bold text-gray-700 uppercase tracking-widest mb-1">No Decisions Logged</h3>
                <p class="text-[11px] text-gray-400 max-w-[280px] leading-relaxed">Decisions captured during recording will appear here automatically.</p>
            </div>
        {/if}

        <div class="space-y-4">
            {#each (filteredDecisions || []) as d}
                <div class="bg-white p-5 lg:p-6 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex flex-col md:flex-row gap-6 relative group transition-all hover:shadow-md">
                    <div class="md:w-[140px] flex-shrink-0 flex flex-col gap-1.5 pt-1">
                        <div class="text-[11px] font-black text-[#0b66ff] tracking-wide">{d.date}</div>
                        <div class="text-[11px] font-medium text-gray-400 mb-2">{d.time}</div>
                        <div class="inline-flex">
                            <span class="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider {d.statusColor}">
                                {d.status}
                            </span>
                        </div>
                    </div>
                    <div class="flex-1 pr-6">
                        <button class="absolute top-6 right-5 text-gray-300 hover:text-gray-500 transition-colors" aria-label="Decision actions">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                        </button>
                        <h2 class="text-[16px] font-bold text-gray-900 mb-4 tracking-tight">
                            {d.title}
                        </h2>
                        <div class="mb-4">
                            <h3 class="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em] mb-1.5">CONTEXT</h3>
                            <p class="text-[13px] text-gray-600 leading-relaxed font-normal">
                                {d.rationale}
                            </p>
                        </div>
                        <div>
                            <h3 class="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em] mb-2.5">STAKEHOLDERS</h3>
                            <div class="flex flex-wrap gap-2.5">
                                {#each d.stakeholders as s}
                                    <div class="flex items-center gap-1.5 bg-gray-50/80 border border-gray-100 rounded-full pr-3 pl-1 py-1">
                                        <div class={`w-4 h-4 rounded-full ${s.color} shadow-inner`}></div>
                                        <span class="text-[10px] font-bold text-gray-700">{s.name}</span>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(203, 213, 225, 0.4); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.6); }
</style>
