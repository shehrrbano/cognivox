<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<!-- CONVERTED: SVELTE_5_PROPS_v1 -->
<script lang="ts">
    import SessionManager from "./SessionManager.svelte";
    import type { GraphNode, GraphEdge } from "./types";

    interface Props {
        pastSessions?: any[];
        currentSession?: any | null;
        graphNodes?: GraphNode[];
        graphEdges?: GraphEdge[];
        activeTab?: string;
        speakerIdInitialized?: boolean;
        onsessionLoad?: (session: any) => void;
        onsessionDelete?: (data: { sessionId: string; event: MouseEvent }) => void;
        onrefreshSessions?: () => void;
        ontabChange?: (tab: string) => void;
        ontoggleCluster?: (data: { nodeId: string }) => void;
    }

    let {
        pastSessions = [],
        currentSession = null,
        graphNodes = [],
        graphEdges = [],
        activeTab = "transcript",
        speakerIdInitialized = false,
        onsessionLoad,
        onsessionDelete,
        onrefreshSessions,
        ontabChange,
        ontoggleCluster
    }: Props = $props();

    function handleSessionLoad(session: any) {
        if (onsessionLoad) onsessionLoad(session);
    }

    function handleSessionDelete(data: { sessionId: string; event: MouseEvent }) {
        if (onsessionDelete) onsessionDelete(data);
    }

    function handleRefreshSessions() {
        if (onrefreshSessions) onrefreshSessions();
    }

    const navItems = [
        { id: "transcript", label: "Transcript", icon: "message-square" },
        { id: "courses", label: "Courses", icon: "book-open" },
        { id: "study-buddy", label: "Study Buddy", icon: "bot" },
        { id: "memory", label: "Context Memory", icon: "database" },
        { id: "graph", label: "Knowledge Map", icon: "share-2" },
        { id: "analytics", label: "Analytics", icon: "bar-chart-2" },
        { id: "ledger", label: "Decision Ledger", icon: "list" },
        { id: "alerts", label: "Alerts", icon: "bell" },
        { id: "search", label: "Global Search", icon: "search" },
        { id: "diagnostics", label: "Diagnostics", icon: "activity" }
    ];
</script>

<aside class="sidebar h-full flex flex-col border-r border-gray-200 bg-white">
    <div class="sidebar-header p-5 border-b border-gray-100">
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
            </div>
            <div>
                <h1 class="text-sm font-black text-gray-900 tracking-tight leading-none">Cognivox</h1>
                <p class="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-1">Intelligence Layer</p>
            </div>
        </div>
    </div>

    <!-- Main Navigation -->
    <nav class="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
        <div class="mb-4">
            <span class="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] px-3 mb-2 block">MAIN CONSOLE</span>
            {#each navItems as item}
                <button
                    class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] font-bold transition-all promax-interaction
                        {activeTab === item.id 
                            ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100' 
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}"
                    onclick={() => ontabChange?.(item.id)}
                    aria-label="Navigate to {item.label}"
                >
                    <span class="w-4 h-4 opacity-70">
                        <!-- Simplified icons for demo -->
                        <svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            {#if item.icon === 'message-square'}<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>{/if}
                            {#if item.icon === 'book-open'}<path d="M2 3h6a4 4 0 0 1 4 4v14a4 4 0 0 0-4-4H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a4 4 0 0 1 4-4h6z"/>{/if}
                            {#if item.icon === 'share-2'}<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>{/if}
                            {#if item.icon === 'bar-chart-2'}<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>{/if}
                            {#if item.icon === 'list'}<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>{/if}
                            {#if item.icon === 'bell'}<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>{/if}
                            {#if item.icon === 'search'}<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>{/if}
                            {#if item.icon === 'bot'}<path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>{/if}
                            {#if item.icon === 'database'}<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>{/if}
                            {#if item.icon === 'activity'}<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>{/if}
                        </svg>
                    </span>
                    {item.label}
                </button>
            {/each}
        </div>

        <div class="pt-4 border-t border-gray-100">
            <span class="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] px-3 mb-2 block">HISTORY & SESSIONS</span>
            <SessionManager
                {pastSessions}
                onsessionLoad={handleSessionLoad}
                onsessionDelete={handleSessionDelete}
                onrefreshSessions={handleRefreshSessions}
            />
        </div>
    </nav>

    <!-- Sidebar Footer -->
    <div class="p-4 border-t border-gray-100 bg-gray-50/50">
        <div class="flex items-center gap-3 px-2 py-2">
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 overflow-hidden border-2 border-white shadow-sm ring-1 ring-gray-100">
                <div class="w-full h-full flex items-center justify-center text-[10px] font-black text-white">AD</div>
            </div>
            <div class="min-w-0 flex-1">
                <p class="text-[11px] font-bold text-gray-900 truncate">Admin User</p>
                <p class="text-[9px] text-gray-400 font-medium truncate">Pro Plan Active</p>
            </div>
            <button class="text-gray-300 hover:text-blue-500 transition-colors" aria-label="Account Settings">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
        </div>
    </div>
</aside>
