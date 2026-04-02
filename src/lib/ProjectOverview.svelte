<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_BATCH2_v1 -->
<!-- FIXED: FULL_FUNCTIONALITY_AUDITOR_AND_FIXER_v1 — real KPIs, removed mock toast -->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    export let transcripts: any[] = [];
    export let graphNodes: any[] = [];
    export let pastSessions: any[] = [];

    // Mock toast removed — was firing on every mount
    let showToast = false;

    // Real KPI: risks from graphNodes
    $: riskNodes = (graphNodes || []).filter(n =>
        n.type === 'RISK' || n.type === 'Risk' ||
        (n.id && n.id.toUpperCase().includes('RISK'))
    );
    $: totalRisks = riskNodes.length;
    $: highSeverityRisks = riskNodes.filter(n => (n.weight || 0) >= 0.7).length;

    // Real KPI: session count
    $: sessionCount = (pastSessions || []).length;

    // Real KPI: health score based on transcript/session availability
    $: healthScore = (() => {
        if (transcripts.length === 0 && sessionCount === 0) return 100;
        const riskRatio = totalRisks > 0 ? Math.min(totalRisks / Math.max(1, graphNodes.length), 0.5) : 0;
        return Math.max(40, Math.round((1 - riskRatio) * 100));
    })();

    // Timeline built from real pastSessions (up to 5 milestones)
    $: timeline = (() => {
        const dotStyles = [
            { dot: 'border-blue-500', innerDot: 'bg-white', active: true },
            { dot: 'border-blue-500', innerDot: 'bg-white', active: true },
            { dot: 'border-blue-400', innerDot: 'bg-blue-400', active: true, spotlight: true },
            { dot: 'border-gray-200', innerDot: 'bg-gray-200', active: false, fade: true },
            { dot: 'border-gray-200', innerDot: 'bg-gray-200', active: false, fade: true },
        ];
        if (!pastSessions || pastSessions.length === 0) {
            return [
                { date: '–', label: 'No sessions yet', status: 'Pending', statusColor: 'text-gray-400', ...dotStyles[0] }
            ];
        }
        return pastSessions.slice(0, 5).map((s, i) => {
            const d = s.created_at ? new Date(s.created_at) : null;
            const dateStr = d ? d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase() : '–';
            const label = s.metadata?.title || `Session ${i + 1}`;
            return {
                date: dateStr,
                label: label.length > 18 ? label.slice(0, 18) + '…' : label,
                status: i === 0 ? 'Latest' : 'Saved',
                statusColor: i === 0 ? 'text-[#0b66ff]' : 'text-green-500',
                ...dotStyles[Math.min(i, 4)],
            };
        });
    })();

    // Priority risks from real graph nodes
    $: risks = (() => {
        if (riskNodes.length === 0) return [];
        const levelMap = (w: number) => {
            if (w >= 0.8) return { level: 'CRITICAL', levelClass: 'bg-red-50 text-red-600', borderClass: 'border-red-500', iconCol: 'text-red-500' };
            if (w >= 0.5) return { level: 'MEDIUM', levelClass: 'bg-orange-50 text-orange-600', borderClass: 'border-orange-400', iconCol: 'text-orange-500' };
            return { level: 'LOW', levelClass: 'bg-blue-50 text-[#0b66ff]', borderClass: 'border-blue-400', iconCol: 'text-blue-500' };
        };
        return riskNodes.slice(0, 3).map(n => ({
            title: n.label || n.id,
            desc: `Detected in session — weight: ${(n.weight || 0).toFixed(2)}`,
            ...levelMap(n.weight || 0),
        }));
    })();

    // Tracker: risks as mitigation items
    $: tracker = (() => {
        if (riskNodes.length === 0) return [];
        return riskNodes.slice(0, 3).map((n, i) => ({
            title: n.label || n.id,
            sub: 'Detected via intelligence extraction',
            domain: 'AI Analysis',
            sev: (n.weight || 0) >= 0.7 ? 'Critical' : 'Low',
            sevDot: (n.weight || 0) >= 0.7 ? 'bg-red-500' : 'bg-[#0b66ff]',
            sevText: (n.weight || 0) >= 0.7 ? 'text-red-600' : 'text-[#0b66ff]',
            user: { initials: 'AI', label: 'Auto-detected', col: 'bg-blue-100 text-blue-600' },
            status: 'Monitoring',
            statusBg: 'bg-orange-50 text-orange-600 border-orange-200',
        }));
    })();

</script>

<div class="flex-1 w-full bg-slate-50 overflow-y-auto px-4 lg:px-10 py-8 custom-scrollbar relative">
    
    {#if showToast}
        <div class="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-[#0f172a] text-white px-5 py-3 rounded-lg shadow-2xl flex items-center justify-between min-w-[360px] z-50 animate-fadeIn">
            <span class="text-[12px] font-medium tracking-wide shadow-none border-none">Task "Database Patch" moved to Archive.</span>
            <div class="flex items-center gap-4">
                <button class="text-[#0b66ff] font-bold text-[11px] hover:text-blue-400 transition-colors uppercase tracking-wider">UNDO</button>
                <button class="text-gray-400 hover:text-white" on:click={() => showToast = false}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
        </div>
    {/if}

    <div class="max-w-6xl mx-auto space-y-6">
        
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
                <h1 class="text-[28px] font-black text-gray-900 tracking-tight leading-none mb-1.5">Project Overview</h1>
                <p class="text-[14px] text-gray-500 font-medium">
                    Real-time risk mitigation and deadline tracking.
                </p>
            </div>
            <div class="flex items-center gap-3">
                <button class="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-[12px] font-bold px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-all">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/></svg>
                    Undo Last Action
                </button>
                <button class="bg-[#0b66ff] hover:bg-blue-600 text-white text-[12px] font-bold px-4 py-2.5 rounded-lg shadow-sm shadow-blue-500/30 flex items-center gap-2 transition-all">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    New Task
                </button>
            </div>
        </div>

        <!-- 4 KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <!-- Card 1 -->
            <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_15px_-5px_rgba(0,0,0,0.05)] flex flex-col justify-between h-[130px]">
                <div class="flex justify-between items-start">
                    <span class="text-[12px] font-semibold text-gray-500 leading-tight w-[100px]">Total Risks<br>Identified</span>
                    <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#0b66ff]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </div>
                </div>
                <div class="flex items-end gap-3 mt-auto">
                    <span class="text-[32px] font-black text-gray-900 leading-none">{totalRisks}</span>
                    <span class="text-[10px] font-bold text-gray-400 flex items-center gap-1 mb-1">from sessions</span>
                </div>
            </div>

            <!-- Card 2 -->
            <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_15px_-5px_rgba(0,0,0,0.05)] flex flex-col justify-between h-[130px]">
                <div class="flex justify-between items-start">
                    <span class="text-[12px] font-semibold text-gray-500 leading-tight">High Severity</span>
                    <div class="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                        <span class="font-black text-[14px]">!</span>
                    </div>
                </div>
                <div class="flex items-end gap-3 mt-auto">
                    <span class="text-[32px] font-black text-gray-900 leading-none">{String(highSeverityRisks).padStart(2,'0')}</span>
                    <span class="text-[10px] font-bold text-gray-400 flex items-center gap-1 mb-1">weight ≥ 0.7</span>
                </div>
            </div>

            <!-- Card 3 -->
            <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_15px_-5px_rgba(0,0,0,0.05)] flex flex-col justify-between h-[130px]">
                <div class="flex justify-between items-start">
                    <span class="text-[12px] font-semibold text-gray-500 leading-tight w-[100px]">Upcoming<br>Deadlines</span>
                    <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#0b66ff]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                </div>
                <div class="flex flex-col mt-auto gap-0.5">
                    <span class="text-[32px] font-black text-gray-900 leading-none">{String(sessionCount).padStart(2,'0')}</span>
                    <span class="text-[10px] font-medium text-gray-400">recorded sessions</span>
                </div>
            </div>

            <!-- Card 4 -->
            <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_15px_-5px_rgba(0,0,0,0.05)] flex flex-col justify-between h-[130px]">
                <div class="flex justify-between items-start">
                    <span class="text-[12px] font-semibold text-gray-500 leading-tight">Health Score</span>
                    <div class="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-500">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                </div>
                <div class="flex flex-col mt-auto gap-2">
                    <span class="text-[32px] font-black text-green-500 leading-none">{healthScore}%</span>
                    <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div class="h-full bg-green-500 rounded-full" style="width: {healthScore}%"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Middle Row: Timeline & Priority Risks -->
        <div class="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5">
            
            <!-- Timeline -->
            <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_15px_-5px_rgba(0,0,0,0.05)] flex flex-col h-[280px]">
                <div class="flex justify-between items-center mb-10">
                    <h2 class="text-[16px] font-black text-gray-900 tracking-tight">Project Timeline</h2>
                    <div class="text-[12px] font-bold text-gray-900">
                        {#if pastSessions.length >= 2}
                            {new Date(pastSessions[pastSessions.length-1]?.created_at).toLocaleDateString('en-US',{month:'short',year:'numeric'})} – {new Date(pastSessions[0]?.created_at).toLocaleDateString('en-US',{month:'short',year:'numeric'})}
                        {:else if pastSessions.length === 1}
                            {new Date(pastSessions[0]?.created_at).toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric'})}
                        {:else}
                            No sessions yet
                        {/if}
                    </div>
                </div>

                <div class="relative flex-1 flex items-center justify-between px-6 mt-12 pb-10">
                    <!-- Background Line -->
                    <div class="absolute top-1/2 left-10 right-10 h-0.5 bg-gray-100 -translate-y-1/2 rounded z-0"></div>
                    
                    {#each timeline as t, i}
                        <div class="relative z-10 flex flex-col items-center group {t.fade ? 'opacity-40' : ''}">
                            <!-- Dot wrapper -->
                            <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center mb-3 {t.spotlight ? 'ring-4 ring-blue-50' : ''}">
                                <div class={`w-4 h-4 rounded-full border-[3px] ${t.dot} ${t.innerDot} transition-all duration-300`}></div>
                            </div>
                            <!-- Labels -->
                            <div class="text-center absolute top-10 w-[100px]">
                                <div class={`text-[10px] font-black tracking-widest uppercase mb-1 ${t.active ? 'text-[#0b66ff]' : 'text-gray-300'}`}>{t.date}</div>
                                <div class="text-[11px] font-bold text-gray-900 leading-tight mb-0.5 whitespace-nowrap">{t.label}</div>
                                <div class={`text-[9px] font-black tracking-widest ${t.statusColor}`}>{t.status}</div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Priority Risks -->
            <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_15px_-5px_rgba(0,0,0,0.05)] h-[280px] flex flex-col">
                <div class="flex justify-between items-center mb-5">
                    <h2 class="text-[16px] font-black text-gray-900 tracking-tight">Priority Risks</h2>
                    <a href="#" class="text-[11px] font-bold text-[#0b66ff] hover:underline">View All</a>
                </div>

                <div class="flex-1 space-y-3 overflow-y-auto no-scrollbar pr-1">
                    {#if risks.length === 0}
                        <div class="flex flex-col items-center justify-center h-full text-center py-8 opacity-60">
                            <svg width="24" height="24" class="text-gray-300 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No risks detected</p>
                        </div>
                    {/if}
                    {#each risks as r}
                        <div class="bg-[#fafafb] border border-gray-100 rounded-xl p-3.5 flex justify-between items-center relative overflow-hidden group">
                            <!-- Left Border Accent -->
                            <div class={`absolute left-0 top-0 bottom-0 w-1 ${r.borderClass}`}></div>
                            
                            <div class="flex items-start gap-3 pl-2">
                                <div class={`pt-1 ${r.iconCol}`}>
                                    {#if r.level === 'CRITICAL'} <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                                    {:else if r.level === 'MEDIUM'} <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
                                    {:else} <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                                    {/if}
                                </div>
                                <div>
                                    <h3 class="text-[12px] font-bold text-gray-900 leading-snug">{r.title}</h3>
                                    <p class="text-[10px] text-gray-500">{r.desc}</p>
                                </div>
                            </div>

                            <span class={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${r.levelClass}`}>
                                {r.level}
                            </span>
                        </div>
                    {/each}
                </div>
            </div>
            
        </div>

        <!-- Bottom Row: Mitigation Tracker -->
        <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_15px_-5px_rgba(0,0,0,0.05)]">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-[16px] font-black text-gray-900 tracking-tight">Mitigation Strategy Tracker</h2>
                
                <div class="flex items-center gap-3">
                    <button class="flex items-center gap-6 bg-white border border-gray-200 text-gray-600 text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm hover:bg-gray-50">
                        All Severities
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <button class="bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 p-1.5 rounded-lg shadow-sm">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="21" y1="4" x2="3" y2="4"></line><line x1="18" y1="12" x2="6" y2="12"></line><line x1="14" y1="20" x2="10" y2="20"></line></svg>
                    </button>
                </div>
            </div>

            <!-- Table -->
            <div class="w-full overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="border-b border-gray-100">
                            <th class="pb-3 text-[10px] font-black text-gray-400 tracking-widest uppercase pl-2">Risk Description</th>
                            <th class="pb-3"></th>
                            <th class="pb-3"></th>
                            <th class="pb-3 text-[10px] font-black text-gray-400 tracking-widest uppercase px-4 text-center">Assigned To</th>
                            <th class="pb-3 text-[10px] font-black text-gray-400 tracking-widest uppercase pl-4">Status</th>
                            <th class="pb-3 text-[10px] font-black text-gray-400 tracking-widest uppercase text-right pr-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#if tracker.length === 0}
                            <tr><td colspan="6" class="py-8 text-center text-[11px] text-gray-400 font-medium">No mitigation items. Record a session to detect risks automatically.</td></tr>
                        {/if}
                        {#each tracker as tr}
                            <tr class="border-b border-gray-50 hover:bg-slate-50/50 transition-colors">
                                <!-- Col 1: Desc -->
                                <td class="py-4 pl-2 min-w-[250px]">
                                    <div class="text-[12px] font-semibold text-gray-900 leading-tight">{tr.title}</div>
                                    <div class="text-[10px] text-gray-400 mt-0.5">{tr.sub}</div>
                                </td>
                                
                                <!-- Col 2: Domain -->
                                <td class="py-4 px-2 w-[120px]">
                                    <span class="text-[11px] font-medium text-gray-600">{tr.domain}</span>
                                </td>

                                <!-- Col 3: Severity dot -->
                                <td class="py-4 px-2 w-[100px]">
                                    <div class="flex items-center gap-1.5">
                                        <div class={`w-2 h-2 rounded-full ${tr.sevDot}`}></div>
                                        <span class={`text-[10px] font-bold ${tr.sevText}`}>{tr.sev}</span>
                                    </div>
                                </td>

                                <!-- Col 4: Assigned To -->
                                <td class="py-4 px-4 w-[160px]">
                                    <div class="flex items-center justify-center gap-2">
                                        <div class={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black tracking-tighter ${tr.user.col}`}>
                                            {tr.user.initials}
                                        </div>
                                        <span class="text-[11px] font-semibold text-gray-700">{tr.user.label}</span>
                                    </div>
                                </td>

                                <!-- Col 5: Status -->
                                <td class="py-4 px-4 w-[120px]">
                                    <span class={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded border bg-opacity-70 ${tr.statusBg}`}>
                                        {tr.status}
                                    </span>
                                </td>

                                <!-- Col 6: Actions -->
                                <td class="py-4 pr-4">
                                    <div class="flex items-center justify-end gap-3 text-gray-400">
                                        <button class="hover:text-blue-500 transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
                                        <button class="hover:text-red-500 transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                                    </div>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

        </div>

    </div>
</div>

<style>
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(203, 213, 225, 0.4); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.6); }

    @keyframes fadeIn {
        from { opacity: 0; transform: translate(-50%, 10px); }
        to { opacity: 1; transform: translate(-50%, 0); }
    }
    .animate-fadeIn {
        animation: fadeIn 0.4s ease-out forwards;
    }
</style>
