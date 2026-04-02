<script lang="ts">
    import { invoke } from "@tauri-apps/api/core";
    import { save } from "@tauri-apps/plugin-dialog";
    import { onMount, onDestroy } from "svelte";
    import {
        initFirebase,
        signInWithGoogle,
        signOut,
        getCurrentUser,
        onAuthChange,
        isFirebaseConfigured,
    } from "./firebase";
    import { FirestoreSessionManager } from "./firestoreSessionManager";
    import type { User } from "firebase/auth";

    export let currentSession: any = null;
    export let onSessionLoad: (session: any) => void = () => {};

    let sessions: any[] = [];
    let showSaveDialog = false;
    let showLoadDialog = false;
    let showExportDialog = false;
    let showSummaryDialog = false;
    let sessionTitle = "Untitled Meeting";
    let exportFormat: "json" | "csv" | "markdown" | "graphml" | "entities" =
        "json";
    let isSaving = false;
    let isGeneratingSummary = false;
    let sessionSummary: any = null;

    // ===== CLOUD STORAGE STATE =====
    let firebaseUser: User | null = null;
    let isSigningIn = false;
    let cloudStatus: "connected" | "disconnected" | "syncing" | "error" =
        "disconnected";
    let cloudError: string | null = null;
    let unsubAuth: (() => void) | null = null;

    onMount(() => {
        // Initialize Firebase
        if (isFirebaseConfigured()) {
            try {
                initFirebase();
                unsubAuth = onAuthChange((user) => {
                    firebaseUser = user;
                    cloudStatus = user ? "connected" : "disconnected";
                    if (user) {
                        console.log("[Cloud] Authenticated as:", user.email);
                    }
                    if (!user) {
                        cloudError =
                            "Sign in with Google to access cloud sessions";
                    } else {
                        cloudError = null;
                    }
                });
            } catch (e) {
                console.warn("[Cloud] Firebase init failed:", e);
                cloudError = "Firebase initialization failed";
            }
        } else {
            console.warn("[Cloud] Firebase not configured");
            cloudError = "Firebase not configured";
        }
    });

    onDestroy(() => {
        if (unsubAuth) unsubAuth();
    });

    // ===== GOOGLE SIGN-IN =====
    async function handleSignIn() {
        isSigningIn = true;
        cloudError = null;
        try {
            firebaseUser = await signInWithGoogle();
            cloudStatus = "connected";
        } catch (error: any) {
            console.error("[Cloud] Sign-in failed:", error);
            // Tauri invoke errors are plain strings, Firebase errors have .message
            const msg =
                typeof error === "string"
                    ? error
                    : error?.message || error?.code || JSON.stringify(error);
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

        // Use a Map to deduplicate by session id — newest updated_at wins
        const sessionMap = new Map<string, any>();

        // Step 1: Always load local sessions first
        try {
            const localJson = (await invoke("list_sessions")) as string;
            const localSessions = JSON.parse(localJson);
            for (const s of localSessions) {
                sessionMap.set(s.id, s);
            }
            console.log(
                `[SessionMgr] Loaded ${localSessions.length} local sessions`,
            );
        } catch (e) {
            console.warn("[SessionMgr] Failed to load local sessions:", e);
        }

        // Step 2: Merge cloud sessions if signed in (deduplicate, newest wins)
        if (FirestoreSessionManager.isAvailable()) {
            try {
                cloudStatus = "syncing";
                const cloudSessions =
                    await FirestoreSessionManager.listSessions();
                for (const cs of cloudSessions) {
                    const existing = sessionMap.get(cs.id);
                    if (
                        !existing ||
                        new Date(cs.updated_at) > new Date(existing.updated_at)
                    ) {
                        sessionMap.set(cs.id, cs);
                    }
                }
                cloudStatus = "connected";
                console.log(
                    `[SessionMgr] Merged cloud, total: ${sessionMap.size} sessions`,
                );
            } catch (error) {
                console.warn(
                    "[SessionMgr] Cloud load failed (using local):",
                    error,
                );
                cloudStatus = "error";
                cloudError = "Cloud load failed — showing local sessions";
            }
        } else if (sessionMap.size === 0) {
            cloudError = "No sessions yet — record your first meeting!";
        }

        // Step 3: Build deduplicated array, sorted newest first
        sessions = Array.from(sessionMap.values()).sort(
            (a: any, b: any) =>
                new Date(b.updated_at).getTime() -
                new Date(a.updated_at).getTime(),
        );
        console.log(
            `[SessionMgr] Final session list: ${sessions.length} sessions`,
        );
    }

    async function saveCurrentSession() {
        if (!currentSession) return;

        isSaving = true;
        cloudError = null;
        try {
            currentSession.metadata.title = sessionTitle;

            // Always save locally first
            try {
                const sessionJson = JSON.stringify(currentSession);
                await invoke("save_session", { sessionJson });
                console.log("[SessionMgr] ✓ Saved to local disk");
            } catch (localErr) {
                console.error("[SessionMgr] Local save failed:", localErr);
            }

            // Sync to cloud if available
            if (FirestoreSessionManager.isAvailable()) {
                cloudStatus = "syncing";
                await FirestoreSessionManager.saveSession(currentSession);
                cloudStatus = "connected";
                console.log("[SessionMgr] ✓ Synced to Google Firestore");
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
            // Find the session in the already-loaded list
            const session = sessions.find((s) => s.id === sessionId);
            // Pass to parent's handleSessionLoad which handles cache + local disk + Firestore
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
            // Delete from local disk
            try {
                await invoke("delete_session", { sessionId });
                console.log("[SessionMgr] Deleted from local disk");
            } catch (e) {
                console.warn("[SessionMgr] Local delete failed:", e);
            }

            // Delete from cloud if available
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
                json: ["json"],
                csv: ["csv"],
                markdown: ["md"],
                graphml: ["graphml"],
                entities: ["json"],
            };

            const filePath = await save({
                defaultPath: `session_${currentSession.id}.${exportFormat === "markdown" ? "md" : exportFormat}`,
                filters: [
                    {
                        name: exportFormat.toUpperCase(),
                        extensions: extensions[exportFormat],
                    },
                ],
            });

            if (filePath) {
                const { writeTextFile } = await import("@tauri-apps/plugin-fs");
                await writeTextFile(filePath, content);
                console.log("Exported to:", filePath);
                showExportDialog = false;
                alert(`Successfully exported to ${filePath}`);
            }
        } catch (error) {
            console.error("Failed to export session:", error);
            alert(`Export failed: ${error}`);
        }
    }

    // Sync current session to cloud (manual trigger)
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
            const result = await invoke("generate_session_summary", {
                sessionJson,
            });
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

    $: if (showLoadDialog) loadSessions();
</script>

<!-- ===== GOOGLE CLOUD STATUS BAR ===== -->
<div
    class="mb-3 p-2 rounded-lg border transition-all duration-300 {cloudStatus ===
    'connected'
        ? 'bg-green-500/5 border-green-500/20'
        : cloudStatus === 'syncing'
          ? 'bg-yellow-500/5 border-yellow-500/20'
          : cloudStatus === 'error'
            ? 'bg-red-500/5 border-red-500/20'
            : 'bg-slate-500/5 border-slate-500/20'}"
>
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
            <!-- Google Cloud Icon -->
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class={cloudStatus === "connected"
                    ? "text-green-400"
                    : cloudStatus === "syncing"
                      ? "text-yellow-400 animate-spin"
                      : cloudStatus === "error"
                        ? "text-red-400"
                        : "text-slate-500"}
            >
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"
                ></path>
            </svg>
            <span
                class="text-xs {cloudStatus === 'connected'
                    ? 'text-green-400'
                    : cloudStatus === 'syncing'
                      ? 'text-yellow-400'
                      : cloudStatus === 'error'
                        ? 'text-red-400'
                        : 'text-slate-500'}"
            >
                {#if cloudStatus === "connected"}
                    Google Cloud Connected
                {:else if cloudStatus === "syncing"}
                    Syncing...
                {:else if cloudStatus === "error"}
                    Cloud Error
                {:else}
                    Cloud Offline
                {/if}
            </span>
        </div>
        <div class="flex items-center gap-2">
            {#if firebaseUser}
                <span
                    class="text-xs text-slate-400 truncate max-w-[120px]"
                    title={firebaseUser.email || ""}
                >
                    {firebaseUser.email}
                </span>
                <button
                    class="text-xs px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                    onclick={handleSignOut}
                >
                    Sign Out
                </button>
            {:else}
                <button
                    class="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1"
                    onclick={handleSignIn}
                    disabled={isSigningIn}
                >
                    <!-- Google G icon -->
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                    >
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    {isSigningIn ? "Signing in..." : "Sign in with Google"}
                </button>
            {/if}
        </div>
    </div>
    {#if cloudError}
        <p class="text-xs text-red-400 mt-1">{cloudError}</p>
    {/if}

    <!-- Firebase Cloud Storage Indicator -->
    {#if firebaseUser}
        <div class="flex items-center gap-2 mt-2">
            <span class="text-xs text-slate-500">Storage:</span>
            <span
                class="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30"
            >
                Google Cloud Firestore
            </span>
            {#if currentSession}
                <button
                    class="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors ml-auto"
                    onclick={syncToCloud}
                >
                    Sync Now
                </button>
            {/if}
        </div>
    {/if}
</div>

<!-- ===== ACTION BUTTONS ===== -->
<div class="grid grid-cols-4 gap-2">
    <button
        class="flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300 hover:bg-cyan-500/10 text-cyan-400 hover:text-cyan-300"
        onclick={() => (showSaveDialog = true)}
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
            ></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        <span class="text-xs">Save</span>
    </button>
    <button
        class="flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300 hover:bg-cyan-500/10 text-cyan-400 hover:text-cyan-300"
        onclick={() => (showLoadDialog = true)}
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
            ></path>
        </svg>
        <span class="text-xs">Load</span>
    </button>
    <button
        class="flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300 hover:bg-cyan-500/10 text-cyan-400 hover:text-cyan-300"
        onclick={() => (showExportDialog = true)}
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
        >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <span class="text-xs">Export</span>
    </button>
    <button
        class="flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300 hover:bg-cyan-500/10 text-cyan-400 hover:text-cyan-300"
        onclick={generateSummary}
        disabled={isGeneratingSummary}
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
        >
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
        <span class="text-xs">{isGeneratingSummary ? "..." : "Summary"}</span>
    </button>
</div>

<!-- Save Dialog -->
{#if showSaveDialog}
    <div
        class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
    >
        <div class="glass-card p-6 max-w-md w-full mx-4">
            <h3 class="text-lg font-bold text-slate-100 mb-4">Save Session</h3>

            <!-- Storage indicator -->
            <div
                class="flex items-center gap-2 mb-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
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
                class="text-xs text-slate-400 block mb-2"
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
        class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
    >
        <div
            class="glass-card p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        >
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-bold text-slate-100">Load Session</h3>
                <span
                    class="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400"
                >
                    Google Cloud
                </span>
            </div>

            {#if sessions.length === 0}
                <p class="text-sm text-slate-500 text-center py-8">
                    No saved sessions found
                </p>
            {:else}
                <div class="space-y-2">
                    {#each sessions as session}
                        <div
                            class="glass-card p-4 hover:border-cyan-500/30 transition-all cursor-pointer"
                        >
                            <div class="flex items-start justify-between mb-2">
                                <div>
                                    <h4
                                        class="text-sm font-bold text-slate-200"
                                    >
                                        {session.metadata.title}
                                    </h4>
                                    <p class="text-xs text-slate-500">
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
                                        class="btn-ghost text-xs px-3 py-1 text-red-400 hover:text-red-300"
                                        onclick={() =>
                                            deleteSession(session.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                            <div class="text-xs text-slate-500 flex gap-4">
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
        class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
    >
        <div class="glass-card p-6 max-w-md w-full mx-4">
            <h3 class="text-lg font-bold text-slate-100 mb-4">
                Export Session
            </h3>

            <div class="text-xs text-slate-400 block mb-2">Export Format</div>
            <div class="grid grid-cols-3 gap-2 mb-4">
                {#each ["json", "csv", "markdown", "graphml", "entities"] as format}
                    <button
                        class="px-3 py-2 text-xs rounded-lg border transition-all {exportFormat ===
                        format
                            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                            : 'bg-dark-700 border-cyan-500/20 text-slate-400 hover:border-cyan-500/40'}"
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
        class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
    >
        <div
            class="glass-card p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        >
            <h3 class="text-lg font-bold text-slate-100 mb-4">
                Session Summary
            </h3>

            {#if sessionSummary}
                <div class="space-y-4">
                    <div class="glass-card p-4">
                        <h4 class="text-sm font-medium text-cyan-400 mb-2">
                            Overview
                        </h4>
                        <p class="text-sm text-slate-300">
                            {sessionSummary.overview || "No overview available"}
                        </p>
                    </div>

                    {#if sessionSummary.key_points?.length > 0}
                        <div class="glass-card p-4">
                            <h4 class="text-sm font-medium text-cyan-400 mb-2">
                                Key Points
                            </h4>
                            <ul class="text-sm text-slate-300 space-y-1">
                                {#each sessionSummary.key_points as point}
                                    <li class="flex gap-2">
                                        <span class="text-cyan-400">•</span>
                                        {point}
                                    </li>
                                {/each}
                            </ul>
                        </div>
                    {/if}

                    {#if sessionSummary.action_items?.length > 0}
                        <div class="glass-card p-4">
                            <h4 class="text-sm font-medium text-cyan-400 mb-2">
                                Action Items
                            </h4>
                            <ul class="text-sm text-slate-300 space-y-1">
                                {#each sessionSummary.action_items as item}
                                    <li class="flex gap-2">
                                        <span class="text-green-400">→</span>
                                        {item}
                                    </li>
                                {/each}
                            </ul>
                        </div>
                    {/if}
                </div>
            {:else}
                <p class="text-sm text-slate-500 text-center py-8">
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
