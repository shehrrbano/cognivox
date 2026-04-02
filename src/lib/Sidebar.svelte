<script lang="ts">
    import SessionManager from "./SessionManager.svelte";
    import type { GraphNode, GraphEdge } from "./types";

    let {
        pastSessions = [],
        currentSession = null,
        graphNodes = [],
        graphEdges = [],
        activeTab = "transcript",
        speakerIdInitialized = false,
        onsessionLoad = () => {},
        onsessionDelete = () => {},
        onrefreshSessions = () => {},
        ontabChange = () => {},
        ontoggleCluster = () => {}
    } = $props();

    function handleSessionLoad(session: any) {
        onsessionLoad(session);
    }

    function handleSessionDelete(sessionId: string, event: MouseEvent) {
        onsessionDelete({ sessionId, event });
    }

    function handleRefreshSessions() {
        onrefreshSessions();
    }

    function handleTabChange(tab: string) {
        console.log(`[Sidebar] Switching to tab: ${tab}`);
        ontabChange(tab);
    }
</script>

<div class="w-full lg:w-[320px] sidebar flex flex-col h-screen lg:sticky lg:top-0 border-r border-slate-200/50 bg-white backdrop-blur-xl overflow-hidden shadow-xl shadow-slate-900/5">
    <!-- 1. FIXED BRAND HEADER -->
    <div class="px-4 py-5 border-b border-slate-100 relative overflow-hidden bg-slate-50/30 flex-shrink-0">
        <div class="absolute -top-6 -left-6 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div class="relative z-10 w-full">
            <h1 class="text-fluid-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0">
                    <rect width="32" height="32" rx="6" fill="url(#cognivox-gradient-v3)"/>
                    <circle cx="11" cy="16" r="3.5" fill="white" opacity="0.9"/>
                    <circle cx="21" cy="16" r="3.5" fill="white" opacity="0.9"/>
                    <path d="M14.5 16 Q16 11 17.5 16" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                    <defs>
                        <linearGradient id="cognivox-gradient-v3" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#2563EB"/>
                            <stop offset="100%" stop-color="#1D4ED8"/>
                        </linearGradient>
                    </defs>
                </svg>
                <span class="font-black tracking-wider text-slate-900" style="letter-spacing: 0.08em;">COGNIVOX</span>
            </h1>
            <p class="text-[9px] font-bold text-blue-500 uppercase tracking-wide mt-1 opacity-80 pl-[34px] truncate">Intelligence Engine</p>
        </div>
    </div>

    <!-- 2. UNIFIED SCROLLABLE AREA (Navigation + Recent Sessions) -->
    <div class="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0 bg-slate-50/10">
        
        <!-- Navigation Area (Inside Scroll) -->
        <div class="p-4 flex flex-col gap-1.5 flex-shrink-0">
            <div class="mb-2">
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Navigation</span>
            </div>
            {#each [
                { id: 'transcript', label: 'Feeding Feed', icon: 'M4 17l6-6-6-6M12 19h8' },
                { id: 'ledger', label: 'Decision Ledger', icon: 'M3 4h18v18H3V4z M16 2v4 M8 2v4 M3 10h18' },
                { id: 'overview', label: 'Project Overview', icon: 'M3 3h7v7H3V3z M14 3h7v7h-7V3z M14 14h7v7h-7v14z M3 14h7v7H3v-7z' },
                { id: 'graph', label: 'Knowledge Map', icon: 'M12 2l10 5-10 5-10-5 10-5z M2 17l10 5 10-5 M2 12l10 5 10-5' },
                { id: 'analytics', label: 'Analytics Stats', icon: 'M22 12h-4l-3 9L9 3 6 12H2' },
                { id: 'speakers', label: 'Voice Profiles', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 7a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75' },
                { id: 'tasks', label: 'Action Center', icon: 'M12 20h9 M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z' }
            ] as tab}
                <button
                    class="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all duration-300 group {activeTab === tab.id ? 'bg-blue-600 shadow-lg shadow-blue-500/20 text-white' : 'text-slate-500 hover:bg-white hover:shadow-sm hover:text-blue-600 border border-transparent hover:border-slate-100'}"
                    onclick={() => handleTabChange(tab.id)}
                >
                    <div class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg {activeTab === tab.id ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-blue-50'}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d={tab.icon} />
                        </svg>
                    </div>
                    <div class="flex-1 flex flex-col items-start overflow-hidden text-left">
                        <span class="text-[11px] font-bold uppercase tracking-wider truncate w-full leading-none mb-1">{tab.label.split(' ')[1] || tab.label}</span>
                        <span class="text-[8px] font-bold opacity-50 uppercase tracking-tighter truncate w-full leading-none">{tab.label.split(' ')[0]}</span>
                    </div>
                </button>
            {/each}
        </div>

        <div class="h-px bg-slate-100 mx-4 my-2"></div>

        <!-- Recent Sessions Section (Inside Scroll) -->
        <div class="px-4 py-4 flex flex-col flex-grow">
            <div class="flex items-center justify-between mb-4 px-1">
                <span class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Recent Activity</span>
                <div class="flex items-center gap-1.5">
                    <button class="p-1 text-gray-400 hover:text-blue-500 transition-colors"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></button>
                    <button class="p-1 text-gray-400 hover:text-blue-500 transition-colors"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg></button>
                </div>
            </div>

            <div class="space-y-3">
                {#if pastSessions.length === 0}
                    <div class="py-6 text-center">
                        <p class="text-[10px] font-bold text-gray-300 uppercase">No History</p>
                    </div>
                {:else}
                    {#each pastSessions as session}
                        {@const isSelected = currentSession?.id === session.id}
                        <div class="relative group">
                            <div class="w-full text-left p-3 rounded-xl border transition-all {isSelected ? 'bg-white border-blue-200 shadow-sm ring-1 ring-blue-50' : 'bg-white border-slate-100 hover:border-slate-200'} flex flex-col gap-1.5 cursor-pointer" onclick={() => handleSessionLoad(session)}>
                                <div class="flex justify-between items-center">
                                    <span class="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-50 text-slate-500">SESSION</span>
                                    <span class="text-[8px] font-medium text-gray-400">{new Date(session.created_at).toLocaleDateString()}</span>
                                </div>
                                <h3 class="text-[11px] font-bold text-slate-700 truncate">{session.metadata.title || "Untitled Session"}</h3>
                            </div>
                            <button class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white border border-slate-100 text-red-400 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-sm hover:bg-red-50" onclick={(e) => handleSessionDelete(session.id, e)}><svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                        </div>
                    {/each}
                {/if}
            </div>
        </div>
    </div>

    <!-- 3. FIXED FOOTER (Session Multi-Action Card) -->
    <div class="p-3 border-t border-slate-100 bg-white flex-shrink-0">
        <SessionManager {currentSession} onSessionLoad={handleSessionLoad} />
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.4); }
</style>
