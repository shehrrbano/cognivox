<script lang="ts">
    import { invoke } from "@tauri-apps/api/core";
    import { save } from "@tauri-apps/plugin-dialog";
    import { onMount, onDestroy } from "svelte";
    import {
        initFirebase,
        signInWithGoogle,
        signOut,
        onAuthChange,
        isFirebaseConfigured,
    } from "./firebase";
    import { FirestoreSessionManager } from "./firestoreSessionManager";
    import type { User } from "firebase/auth";

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

    // ===== CLOUD STORAGE STATE =====
    let firebaseUser = $state<User | null>(null);
    let isSigningIn = $state(false);
    let cloudStatus: "connected" | "disconnected" | "syncing" | "error" = $state("disconnected");
    let cloudError = $state<string | null>(null);
    let unsubAuth: (() => void) | null = null;
    const firebaseConfigured = isFirebaseConfigured();

    onMount(() => {
        if (firebaseConfigured) {
            try {
                initFirebase();
                unsubAuth = onAuthChange((user) => {
                    firebaseUser = user;
                    cloudStatus = user ? "connected" : "disconnected";
                    if (!user) {
                        cloudError = "Sign in with Google to access cloud sessions";
                    } else {
                        cloudError = null;
                    }
                });
            } catch (e) {
                console.debug("[Cloud] Firebase init skipped/failed:", e);
                cloudError = "Firebase initialization failed";
            }
        } else {
            cloudStatus = "disconnected";
            cloudError = null;
        }
    });

    onDestroy(() => {
        if (unsubAuth) unsubAuth();
    });

    // ===== GOOGLE SIGN-IN =====
    async function handleSignIn() {
        if (!firebaseConfigured) {
            cloudError = "Cloud features are not configured in this environment.";
            return;
        }
        isSigningIn = true;
        cloudError = null;
        try {
            firebaseUser = await signInWithGoogle();
            cloudStatus = "connected";
        } catch (error: any) {
            console.error("[Cloud] Sign-in failed:", error);
            const msg = typeof error === "string" ? error : error?.message || error?.code || JSON.stringify(error);
            cloudError = msg || "Sign-in failed (unknown error)";
            cloudStatus = "error";
        } finally {
            isSigningIn = false;
        }
    }

    async function handleSignOut() {
        try {
            await signOut();
            firebaseUser = null;
            cloudStatus = "disconnected";
        } catch (error) {
            console.error("[Cloud] Sign-out failed:", error);
        }
    }

    // ===== SESSION OPERATIONS (Local-First + Cloud Sync) =====
    async function loadSessions() {
        cloudError = null;
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

        if (FirestoreSessionManager.isAvailable()) {
            try {
                cloudStatus = "syncing";
                const cloudSessions = await FirestoreSessionManager.listSessions();
                for (const cs of cloudSessions) {
                    const existing = sessionMap.get(cs.id);
                    if (!existing || new Date(cs.updated_at) > new Date(existing.updated_at)) {
                        sessionMap.set(cs.id, cs);
                    }
                }
                cloudStatus = "connected";
            } catch (error) {
                console.warn("[SessionMgr] Cloud load failed (using local):", error);
                cloudStatus = "error";
                cloudError = "Cloud load failed — showing local sessions";
            }
        } else if (sessionMap.size === 0) {
            cloudError = "No sessions yet — record your first meeting!";
        }

        sessions = Array.from(sessionMap.values()).sort(
            (a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        );
    }

    async function saveCurrentSession() {
        if (!currentSession) return;
        isSaving = true;
        cloudError = null;
        try {
            currentSession.metadata.title = sessionTitle;
            try {
                const sessionJson = JSON.stringify(currentSession);
                await invoke("save_session", { sessionJson });
            } catch (localErr) {
                console.error("[SessionMgr] Local save failed:", localErr);
            }

            if (FirestoreSessionManager.isAvailable()) {
                cloudStatus = "syncing";
                await FirestoreSessionManager.saveSession(currentSession);
                cloudStatus = "connected";
            }
            showSaveDialog = false;
            await loadSessions();
        } catch (error: any) {
            console.error("Failed to save session:", error);
            cloudError = error.message || "Save failed";
            cloudStatus = "error";
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
            cloudStatus = "error";
        }
    }

    async function deleteSession(sessionId: string) {
        if (!confirm("Are you sure you want to delete this session?")) return;
        try {
            try {
                await invoke("delete_session", { sessionId });
            } catch (e) {
                console.warn("[SessionMgr] Local delete failed:", e);
            }

            if (FirestoreSessionManager.isAvailable()) {
                try {
                    cloudStatus = "syncing";
                    await FirestoreSessionManager.deleteSession(sessionId);
                    cloudStatus = "connected";
                } catch (e) {
                    console.warn("[SessionMgr] Cloud delete failed:", e);
                }
            }
            await loadSessions();
        } catch (error) {
            console.error("Failed to delete session:", error);
            cloudStatus = "error";
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

    async function syncToCloud() {
        if (!currentSession || !FirestoreSessionManager.isAvailable()) return;
        cloudStatus = "syncing";
        cloudError = null;
        try {
            await FirestoreSessionManager.syncToCloud(currentSession);
            cloudStatus = "connected";
        } catch (error: any) {
            cloudError = error.message || "Sync failed";
            cloudStatus = "error";
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

<!-- ===== INTELLIGENCE FOOTER (CONSOLIDATED) ===== -->
<div class="p-3 rounded-2xl bg-white/60 border border-slate-100 shadow-sm transition-all duration-500 hover:shadow-md group">
    <!-- Status Header -->
    <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
            <div class="relative">
                <div class="w-2.5 h-2.5 rounded-full {cloudStatus === 'connected' ? 'bg-green-500 animate-pulse' : cloudStatus === 'error' ? 'bg-red-500' : 'bg-amber-500'}"></div>
                <div class="absolute inset-0 w-2.5 h-2.5 rounded-full {cloudStatus === 'connected' ? 'bg-green-500 animate-ping' : ''} opacity-40"></div>
            </div>
            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {#if cloudStatus === "connected"}
                    Sync Active
                {:else if cloudStatus === "syncing"}
                    Syncing...
                {:else if cloudStatus === "error"}
                    Sync Error
                {:else}
                    Offline
                {/if}
            </span>
        </div>
        
        {#if firebaseUser}
            <div class="flex items-center gap-2">
                <span class="text-[9px] font-bold text-slate-400 truncate max-w-[80px]" title={firebaseUser.email || ""}>
                    {firebaseUser.email?.split('@')[0]}
                </span>
                <button
                    class="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all duration-300"
                    onclick={handleSignOut}
                    title="Sign Out"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </button>
            </div>
        {/if}
    </div>

    <!-- Auth / Storage Actions -->
    {#if !firebaseUser}
        <button
            onclick={handleSignIn}
            disabled={isSigningIn}
            class="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
        >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            {isSigningIn ? "Authorizing..." : "Identity Sync"}
        </button>
    {:else if currentSession}
        <button
            class="w-full py-3 rounded-xl bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-widest border border-blue-100 hover:bg-blue-100 transition-all duration-300 flex items-center justify-center gap-2"
            onclick={syncToCloud}
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/></svg>
            Sync Session
        </button>
    {/if}

    <!-- Critical Alerts -->
    {#if cloudError || (firebaseUser && !firebaseConfigured)}
        <div class="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-col items-center gap-1.5 text-center text-red-500 animate-fadeIn">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span class="text-[9px] font-bold uppercase tracking-tight break-all leading-tight w-full" title={cloudError || "Firebase Config Required"}>
                {cloudError || "Firebase Config Required"}
            </span>
        </div>
    {/if}
    <!-- Action Buttons (Now inside the consolidated card for stability) -->
    <div class="mt-3 pt-3 border-t border-slate-100 grid grid-cols-4 gap-2">
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
                class="flex items-center gap-2 mb-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="9"
                    height="9"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1"
                    class="text-blue-400"
                >
                    <path
                        d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"
                    ></path>
                </svg>
                <span class="text-xs text-blue-400"
                    >Saving to Google Cloud Firestore</span
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
                    {isSaving ? "Saving..." : "Save to Cloud"}
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
                    class="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400"
                >
                    Google Cloud
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
