<script lang="ts">
    import { invoke } from "@tauri-apps/api/core";
    import { save } from "@tauri-apps/plugin-dialog";
    import { onMount } from "svelte";

    let {
        currentSession = $bindable(null),
        onSessionLoad = (session: any) => {}
    } = $props();

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

    // ===== SESSION OPERATIONS (Local-Only Storage) =====
    async function loadSessions() {
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
            onSessionLoad(session || { id: sessionId });
            showLoadDialog = false;
        } catch (error) {
            console.error("Failed to load session:", error);
        }
    }

    async function deleteSession(sessionId: string) {
        if (!confirm("Are you sure you want to delete this session?")) return;
        try {
            await invoke("delete_session", { sessionId });
            await loadSessions();
        } catch (error) {
            console.error("Failed to delete session:", error);
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
        class="fixed inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-50"
    >
        <div class="glass-card p-6 max-w-md w-full mx-4">
            <h3 class="text-lg font-bold text-gray-900 mb-4">Save Session</h3>

            <!-- Storage indicator -->
            <div
                class="flex items-center gap-2 mb-3 p-2 rounded-lg bg-green-500/10 border border-green-500/20"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="9"
                    height="9"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1"
                    class="text-green-400"
                >
                    <path d="M22 12H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
                </svg>
                <span class="text-xs text-green-400"
                    >Saving to local storage</span
                >
            </div>

            <label
                for="session-title"
                class="text-xs text-gray-500 block mb-2"
            >
                Session Title
            </label>
            <input
                id="session-title"
                type="text"
                bind:value={sessionTitle}
                placeholder="Enter session title..."
                class="input-field mb-4"
            />

            <div class="flex gap-2">
                <button
                    class="btn-primary flex-1"
                    onclick={saveCurrentSession}
                    disabled={isSaving}
                >
                    {isSaving ? "Saving..." : "Save Session"}
                </button>
                <button
                    class="btn-secondary flex-1"
                    onclick={() => (showSaveDialog = false)}
                >
                    Cancel
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Load Dialog -->
{#if showLoadDialog}
    <div
        class="fixed inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-50"
    >
        <div
            class="glass-card p-4 sm:p-6 max-w-2xl w-full h-full sm:h-auto sm:max-h-[80vh] overflow-y-auto rounded-none sm:rounded-2xl"
        >
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-bold text-gray-900">Load Session</h3>
                <span
                    class="text-xs px-2 py-1 rounded bg-green-500/20 text-green-500"
                >
                    Local Storage
                </span>
            </div>

            {#if sessions.length === 0}
                <p class="text-sm text-gray-400 text-center py-8">
                    No saved sessions found
                </p>
            {:else}
                <div class="space-y-2">
                    {#each sessions as session}
                        <div
                            class="glass-card p-4 hover:border-blue-300 transition-all cursor-pointer"
                        >
                            <div class="flex items-start justify-between mb-2">
                                <div>
                                    <h4
                                        class="text-sm font-bold text-gray-800"
                                    >
                                        {session.metadata.title}
                                    </h4>
                                    <p class="text-xs text-gray-400">
                                        {new Date(
                                            session.created_at,
                                        ).toLocaleString()}
                                    </p>
                                </div>
                                <div class="flex gap-2">
                                    <button
                                        class="btn-primary text-xs px-3 py-1"
                                        onclick={() => loadSession(session.id)}
                                    >
                                        Load
                                    </button>
                                    <button
                                        class="btn-ghost text-xs px-3 py-1 text-red-500 hover:text-red-600"
                                        onclick={() =>
                                            deleteSession(session.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                            <div class="text-xs text-gray-400 flex gap-4">
                                <span
                                    >{session.metadata.total_transcripts} transcripts</span
                                >
                                <span
                                    >{session.graph_nodes?.length || 0} nodes</span
                                >
                                <span>{session.metadata.duration_seconds}s</span
                                >
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}

            <button
                class="btn-secondary w-full mt-4"
                onclick={() => (showLoadDialog = false)}
            >
                Close
            </button>
        </div>
    </div>
{/if}

<!-- Export Dialog -->
{#if showExportDialog}
    <div
        class="fixed inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-50"
    >
        <div class="glass-card p-6 max-w-md w-full mx-4">
            <h3 class="text-lg font-bold text-gray-900 mb-4">
                Export Session
            </h3>

            <div class="text-xs text-gray-500 block mb-2">Export Format</div>
            <div class="grid grid-cols-3 gap-2 mb-4">
                {#each ["json", "csv", "markdown", "graphml", "entities"] as format}
                    <button
                        class="px-3 py-2 text-xs rounded-lg border transition-all {exportFormat ===
                        format
                            ? 'bg-blue-50 border-blue-400 text-blue-400'
                            : 'bg-gray-200 border-blue-200 text-gray-500 hover:border-blue-300'}"
                        onclick={() => (exportFormat = format as any)}
                    >
                        {format.toUpperCase()}
                    </button>
                {/each}
            </div>

            <div class="flex gap-2">
                <button class="btn-primary flex-1" onclick={exportSession}>
                    Export
                </button>
                <button
                    class="btn-secondary flex-1"
                    onclick={() => (showExportDialog = false)}
                >
                    Cancel
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Summary Dialog -->
{#if showSummaryDialog}
    <div
        class="fixed inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-50"
    >
        <div
            class="glass-card p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        >
            <h3 class="text-lg font-bold text-gray-900 mb-4">
                Session Summary
            </h3>

            {#if sessionSummary}
                <div class="space-y-4">
                    <div class="glass-card p-4">
                        <h4 class="text-sm font-medium text-blue-500 mb-2">
                            Overview
                        </h4>
                        <p class="text-sm text-gray-700">
                            {sessionSummary.overview || "No overview available"}
                        </p>
                    </div>

                    {#if sessionSummary.key_points?.length > 0}
                        <div class="glass-card p-4">
                            <h4 class="text-sm font-medium text-blue-500 mb-2">
                                Key Points
                            </h4>
                            <ul class="text-sm text-gray-700 space-y-1">
                                {#each sessionSummary.key_points as point}
                                    <li class="flex gap-2">
                                        <span class="text-blue-500">•</span>
                                        {point}
                                    </li>
                                {/each}
                            </ul>
                        </div>
                    {/if}

                    {#if sessionSummary.action_items?.length > 0}
                        <div class="glass-card p-4">
                            <h4 class="text-sm font-medium text-blue-500 mb-2">
                                Action Items
                            </h4>
                            <ul class="text-sm text-gray-700 space-y-1">
                                {#each sessionSummary.action_items as item}
                                    <li class="flex gap-2">
                                        <span class="text-green-600">→</span>
                                        {item}
                                    </li>
                                {/each}
                            </ul>
                        </div>
                    {/if}
                </div>
            {:else}
                <p class="text-sm text-gray-400 text-center py-8">
                    No summary available
                </p>
            {/if}

            <button
                class="btn-secondary w-full mt-4"
                onclick={() => (showSummaryDialog = false)}
            >
                Close
            </button>
        </div>
    </div>
{/if}
