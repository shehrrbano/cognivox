<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<!-- CONVERTED: SVELTE_5_PROPS_v1 -->
<script lang="ts">
    import { invoke } from "@tauri-apps/api/core";
    import { save } from "@tauri-apps/plugin-dialog";

    interface Props {
        currentSession?: any | null;
        pastSessions?: any[];
        onsessionLoad?: (session: any) => void;
        onsessionDelete?: (data: { sessionId: string; event: MouseEvent }) => void;
        onrefreshSessions?: () => void;
    }

    let {
        currentSession = $bindable(null),
        pastSessions = [],
        onsessionLoad,
        onsessionDelete,
        onrefreshSessions
    }: Props = $props();

    let sessions = $state<any[]>([]);
    let showSaveDialog = $state(false);
    let showLoadDialog = $state(false);
    let showExportDialog = $state(false);
    let showSummaryDialog = $state(false);
    let sessionTitle = $state("Untitled Meeting");
    let exportFormat: "json" | "csv" | "markdown" | "graphml" | "entities" = $state("json");
    let isSaving = $state(false);
    let isGeneratingSummary = $state(false);
    let sessionSummary = $state<any>(null);

    // Sync local sessions with props if needed, or keep local
    $effect(() => {
        if (pastSessions.length > 0) {
            sessions = pastSessions;
        }
    });

    // ===== SESSION OPERATIONS (Local-Only Storage) =====
    async function loadSessions() {
        if (onrefreshSessions) {
            onrefreshSessions();
            return;
        }

        const sessionMap = new Map<string, any>();
        try {
            const localJson = (await invoke("list_sessions")) as string;
            const localSessions = JSON.parse(localJson);
            for (const s of localSessions) {
                sessionMap.set(s.id, s);
            }
        } catch (e) {
            console.warn("[SessionMgr] Failed to load local sessions:", e);
        }

        sessions = Array.from(sessionMap.values()).sort(
            (a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        );
    }

    async function saveCurrentSession() {
        if (!currentSession) return;
        isSaving = true;
        try {
            currentSession.metadata.title = sessionTitle;
            const sessionJson = JSON.stringify(currentSession);
            await invoke("save_session", { sessionJson });
            showSaveDialog = false;
            await loadSessions();
        } catch (error: any) {
            console.error("Failed to save session:", error);
        } finally {
            isSaving = false;
        }
    }

    async function loadSession(sessionId: string) {
        try {
            const session = sessions.find((s) => s.id === sessionId);
            if (onsessionLoad) onsessionLoad(session || { id: sessionId });
            showLoadDialog = false;
        } catch (error) {
            console.error("Failed to load session:", error);
        }
    }

    async function handleDeleteSession(sessionId: string, event: MouseEvent) {
        if (onsessionDelete) {
            onsessionDelete({ sessionId, event });
        } else {
            if (!confirm("Are you sure you want to delete this session?")) return;
            try {
                await invoke("delete_session", { sessionId });
                await loadSessions();
            } catch (error) {
                console.error("Failed to delete session:", error);
            }
        }
    }

    async function exportSession() {
        if (!currentSession) return;
        try {
            const sessionJson = JSON.stringify(currentSession);
            const content = (await invoke("export_session", {
                sessionJson,
                format: exportFormat,
            })) as string;

            const extensions: Record<string, string[]> = {
                json: ["json"], csv: ["csv"], markdown: ["md"], graphml: ["graphml"], entities: ["json"],
            };

            const filePath = await save({
                defaultPath: `session_${currentSession.id}.${exportFormat === "markdown" ? "md" : exportFormat}`,
                filters: [{ name: exportFormat.toUpperCase(), extensions: extensions[exportFormat] }],
            });

            if (filePath) {
                const { writeTextFile } = await import("@tauri-apps/plugin-fs");
                await writeTextFile(filePath, content);
                showExportDialog = false;
                alert(`Successfully exported to ${filePath}`);
            }
        } catch (error) {
            console.error("Failed to export session:", error);
            alert(`Export failed: ${error}`);
        }
    }

    async function generateSummary() {
        if (!currentSession) return;
        isGeneratingSummary = true;
        try {
            const sessionJson = JSON.stringify(currentSession);
            const result = await invoke("generate_session_summary", { sessionJson });
            const updatedSession = JSON.parse(result as string);
            currentSession = updatedSession;
            sessionSummary = updatedSession.summary;
            showSummaryDialog = true;
        } catch (error) {
            console.error("Failed to generate summary:", error);
            alert(`Summary generation failed: ${error}`);
        } finally {
            isGeneratingSummary = false;
        }
    }

    $effect(() => {
        if (showLoadDialog) {
            loadSessions();
        }
    });
</script>

<!-- ===== INTELLIGENCE FOOTER (LOCAL STORAGE) ===== -->
<div class="p-3 rounded-2xl bg-white/60 border border-slate-100 shadow-sm transition-all duration-500 hover:shadow-md group">
    <!-- Status Header -->
    <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
            <div class="relative">
                <div class="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                <div class="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-500 animate-ping opacity-40"></div>
            </div>
            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Local Storage
            </span>
        </div>
    </div>

    <!-- Action Buttons -->
    <div class="grid grid-cols-4 gap-2">
        <button
            class="flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all duration-300 hover:bg-blue-50 text-blue-500 hover:text-blue-600"
            onclick={() => (showSaveDialog = true)}
            title="Save Session"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            <span class="text-[8px] font-bold uppercase tracking-tighter">Save</span>
        </button>
        <button
            class="flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all duration-300 hover:bg-blue-50 text-blue-500 hover:text-blue-600"
            onclick={() => (showLoadDialog = true)}
            title="Load Session"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <span class="text-[8px] font-bold uppercase tracking-tighter">Load</span>
        </button>
        <button
            class="flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all duration-300 hover:bg-blue-50 text-blue-500 hover:text-blue-600"
            onclick={() => (showExportDialog = true)}
            title="Export Session"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span class="text-[8px] font-bold uppercase tracking-tighter">Export</span>
        </button>
        <button
            class="flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all duration-300 hover:bg-blue-50 text-blue-500 hover:text-blue-600"
            onclick={generateSummary}
            disabled={isGeneratingSummary}
            title="Generate Summary"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            <span class="text-[8px] font-bold uppercase tracking-tighter">{isGeneratingSummary ? "..." : "Sum"}</span>
        </button>
    </div>
</div>

<!-- Save Dialog -->
{#if showSaveDialog}
    <div
        class="fixed inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-50 px-4"
    >
        <div class="glass-card p-6 max-w-md w-full">
            <h3 class="text-lg font-bold text-gray-900 mb-4">Save Session</h3>
            <div class="flex items-center gap-2 mb-3 p-2 rounded-lg bg-green-50 border border-green-100">
                <span class="text-xs text-green-600 font-medium tracking-tight">Saving to local store</span>
            </div>
            <label for="session-title" class="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Session Title</label>
            <input
                id="session-title"
                type="text"
                bind:value={sessionTitle}
                placeholder="Meeting Title..."
                class="input-field mb-4"
            />
            <div class="flex gap-3">
                <button class="btn-primary flex-1 py-3" onclick={saveCurrentSession} disabled={isSaving}>{isSaving ? "Saving..." : "Save Session"}</button>
                <button class="btn-secondary flex-1 py-3" onclick={() => (showSaveDialog = false)}>Cancel</button>
            </div>
        </div>
    </div>
{/if}

<!-- Load Dialog -->
{#if showLoadDialog}
    <div class="fixed inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-50">
        <div class="glass-card p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto m-4">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-lg font-black text-gray-900 uppercase tracking-tight">Load Session</h3>
                <span class="text-[9px] font-black px-2 py-1 rounded bg-green-100 text-green-600 uppercase tracking-widest">Local</span>
            </div>
            {#if sessions.length === 0}
                <div class="py-12 text-center">
                    <p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">No saved sessions found</p>
                </div>
            {:else}
                <div class="space-y-3">
                    {#each sessions as session}
                        <div class="group bg-gray-50/50 p-4 rounded-xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-default">
                            <div class="flex items-start justify-between mb-3">
                                <div class="min-w-0">
                                    <h4 class="text-xs font-black text-gray-900 truncate pr-4">{session.metadata.title}</h4>
                                    <p class="text-[9px] font-bold text-gray-400 mt-0.5">{new Date(session.updated_at).toLocaleString()}</p>
                                </div>
                                <div class="flex gap-2 shrink-0">
                                    <button class="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white rounded-lg shadow-sm shadow-blue-200" onclick={() => loadSession(session.id)}>Load</button>
                                    <button class="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-white text-red-500 border border-red-100 rounded-lg" onclick={(e) => handleDeleteSession(session.id, e as any)}>Delete</button>
                                </div>
                            </div>
                            <div class="flex gap-4 text-[9px] font-bold text-gray-400">
                                <span class="flex items-center gap-1"><span class="w-1 h-1 rounded-full bg-blue-400"></span> {session.metadata.total_transcripts} Entries</span>
                                <span class="flex items-center gap-1"><span class="w-1 h-1 rounded-full bg-purple-400"></span> {session.graph_nodes?.length || 0} Nodes</span>
                                <span class="flex items-center gap-1"><span class="w-1 h-1 rounded-full bg-green-400"></span> {session.metadata.duration_seconds}s</span>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
            <button class="btn-secondary w-full mt-6 py-3 font-black uppercase tracking-widest text-[10px]" onclick={() => (showLoadDialog = false)}>Close Panel</button>
        </div>
    </div>
{/if}

<!-- Export Dialog -->
{#if showExportDialog}
    <div class="fixed inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-50">
        <div class="glass-card p-6 max-w-md w-full m-4">
            <h3 class="text-lg font-black text-gray-900 uppercase tracking-tight mb-6">Export Session</h3>
            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Target Format</div>
            <div class="grid grid-cols-3 gap-2 mb-6">
                {#each ["json", "csv", "markdown", "graphml", "entities"] as format}
                    <button class="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl border transition-all {exportFormat === format ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-gray-100 text-gray-400 hover:border-blue-300 hover:text-blue-500'}" onclick={() => (exportFormat = format as any)}>{format}</button>
                {/each}
            </div>
            <div class="flex gap-3">
                <button class="btn-primary flex-1 py-3" onclick={exportSession}>Confirm Export</button>
                <button class="btn-secondary flex-1 py-3" onclick={() => (showExportDialog = false)}>Cancel</button>
            </div>
        </div>
    </div>
{/if}

<!-- Summary Dialog -->
{#if showSummaryDialog}
    <div class="fixed inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-50">
        <div class="glass-card p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto m-4">
            <h3 class="text-lg font-black text-gray-900 uppercase tracking-tight mb-6">AI Session Summary</h3>
            {#if sessionSummary}
                <div class="space-y-6">
                    <div class="bg-blue-50 border border-blue-100 p-5 rounded-2xl">
                        <h4 class="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-3">Strategic Overview</h4>
                        <p class="text-sm font-medium text-gray-800 leading-relaxed">{sessionSummary.overview || "Analysis pending."}</p>
                    </div>
                    {#if sessionSummary.key_points?.length > 0}
                        <div>
                            <h4 class="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3 px-1">Key Objectives</h4>
                            <div class="space-y-2">
                                {#each sessionSummary.key_points as point}
                                    <div class="bg-white p-3.5 rounded-xl border border-gray-100 flex gap-3 items-start">
                                        <span class="text-blue-500 mt-1">•</span>
                                        <p class="text-[13px] font-medium text-gray-800">{point}</p>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}
                </div>
            {:else}
                <div class="py-12 text-center">
                    <p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">No Intelligence Summary Available</p>
                </div>
            {/if}
            <button class="btn-secondary w-full mt-8 py-3 font-black uppercase tracking-widest text-[10px]" onclick={() => (showSummaryDialog = false)}>Dismiss Summary</button>
        </div>
    </div>
{/if}
