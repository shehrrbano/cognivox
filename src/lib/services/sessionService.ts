/**
 * sessionService.ts
 * Session CRUD operations — snapshot building, restore, list, save.
 * Pure functions that return data; Svelte state updates happen in the component.
 */
import { invoke } from "@tauri-apps/api/core";
import { FirestoreSessionManager } from "$lib/firestoreSessionManager";
import type {
    Transcript,
    GraphNode,
    GraphEdge,
    ExtractedSummary,
    ExtractedMemoriesData,
    SnapshotParams,
    RestoredState,
} from "$lib/types";

// ============================================================
// SESSION SNAPSHOT
// ============================================================

/**
 * Build a complete session snapshot from current UI state.
 * Returns null if there's no data worth saving.
 */
export function buildSessionSnapshot(params: SnapshotParams): any | null {
    const { currentSession, transcripts, graphNodes, graphEdges } = params;
    if (!currentSession?.id) return null;

    // GUARD: Only skip if there's absolutely no session context
    if (!currentSession?.id) return null;
    
    // We allow saving sessions with 0 transcripts if they have metadata (e.g. title)
    // This fixed the "cache skipping" issue for just-started recordings.
    const hasData = (transcripts && transcripts.length > 0) || 
                   (graphNodes && graphNodes.length > 0) ||
                   (currentSession.metadata?.title && currentSession.metadata.title !== "Untitled Meeting");
    
    if (!hasData) {
        // Only log as debug/silent
        return null;
    }

    const snapshot = JSON.parse(JSON.stringify(currentSession));
    snapshot.transcripts = transcripts.map((t) => ({
        timestamp: t.timestamp || "",
        speaker_id: t.speaker || "Speaker",
        text: t.text || "",
        tone: t.tone || null,
        category: t.category || null,
        confidence: t.confidence || 0.5,
    }));
    snapshot.graph_nodes = graphNodes.map((n) => ({
        id: n.id,
        node_type: n.type || "Entity",
        metadata: {},
    }));
    snapshot.graph_edges = graphEdges.map((e) => ({
        from: e.from,
        to: e.to,
        relation: e.relation || "related",
        weight: 1.0,
    }));
    snapshot.metadata.total_transcripts = transcripts.length;
    snapshot.updated_at = new Date().toISOString();
    snapshot.psychosomatic = {
        stress: params.stressLevel || 0,
        engagement: params.engagementLevel || 0,
        urgency: params.urgencyLevel || 0,
        clarity: params.clarityLevel || 0,
    };
    snapshot.insights = params.extractedSummary
        ? {
            topics: params.extractedSummary.topics || [],
            decisions: params.extractedSummary.decisions || [],
            action_items: params.extractedSummary.actionItems || [],
            key_points: params.extractedSummary.keyPoints || [],
        }
        : null;
    snapshot._extractedMemories = params.extractedMemories
        ? JSON.parse(JSON.stringify(params.extractedMemories))
        : null;
    snapshot._showSummaryPanel = params.showSummaryPanel;
    snapshot._showMemoriesPanel = params.showMemoriesPanel;

    console.log(
        `[CACHE] Built snapshot for ${currentSession.id} (${snapshot.transcripts?.length || 0} transcripts, ${snapshot.graph_nodes?.length || 0} nodes)`,
    );

    return snapshot;
}

/**
 * Update pastSessions list with a snapshot (replace if exists, add if not).
 * Returns the new array (for Svelte reactivity).
 */
export function updatePastSessionsList(
    pastSessions: any[],
    snapshot: any,
    sessionId: string,
): any[] {
    const idx = pastSessions.findIndex((s: any) => s.id === sessionId);
    if (idx >= 0) {
        pastSessions[idx] = snapshot;
        return [...pastSessions];
    } else {
        return [snapshot, ...pastSessions];
    }
}

/**
 * Persist a snapshot to disk (fire-and-forget).
 */
export function persistSnapshotToDisk(snapshot: any): void {
    try {
        invoke("save_session", {
            sessionJson: JSON.stringify(snapshot),
        }).catch((e: any) => console.warn("[CACHE] Disk persist failed:", e));
    } catch (e) {
        console.warn("[CACHE] Disk persist failed:", e);
    }
}

// ============================================================
// SESSION RESTORE
// ============================================================

/**
 * Load a session's full data from cache, disk, or cloud.
 * Returns the best available version.
 */
export async function loadFullSession(
    sessionId: string,
    sessionCache: Map<string, any>,
    fallbackSession: any,
): Promise<{ session: any; updatedCache: Map<string, any> }> {
    let session = sessionCache.get(sessionId);

    const cacheTranscripts = session?.transcripts?.length || 0;
    const cacheNodes = session?.graph_nodes?.length || 0;
    const expectedTranscripts = session?.metadata?.total_transcripts || 0;
    const cacheHasNoContent = cacheTranscripts === 0 && cacheNodes === 0;
    const cacheIsStale =
        session &&
        (cacheHasNoContent || (cacheTranscripts === 0 && expectedTranscripts > 0));

    if (!session || cacheIsStale) {
        if (cacheIsStale) {
            console.log(
                `[RESTORE] Cache empty/stale for ${sessionId}: ${cacheTranscripts} transcripts, ${cacheNodes} nodes (metadata says ${expectedTranscripts}). Reloading from disk.`,
            );
        }

        let diskLoaded = false;
        try {
            const localJson = (await invoke("load_session", { sessionId })) as string;
            const diskSession = JSON.parse(localJson);
            const diskTranscripts = diskSession?.transcripts?.length || 0;
            const diskNodes = diskSession?.graph_nodes?.length || 0;
            if (diskTranscripts > cacheTranscripts || diskNodes > cacheNodes || !session) {
                session = diskSession;
                diskLoaded = true;
                console.log(
                    `[RESTORE] Loaded from disk: ${diskTranscripts} transcripts, ${diskNodes} nodes`,
                );
            }
            sessionCache.set(sessionId, JSON.parse(JSON.stringify(session)));
        } catch {
            console.log(`[RESTORE] Disk load failed for ${sessionId}, trying cloud...`);
        }

        if (!diskLoaded && FirestoreSessionManager.isAvailable()) {
            try {
                const cloudSession = await FirestoreSessionManager.loadSession(sessionId);
                if (cloudSession) {
                    const cloudTranscripts = cloudSession.transcripts?.length || 0;
                    const cloudNodes = cloudSession.graph_nodes?.length || 0;
                    if (cloudTranscripts > cacheTranscripts || cloudNodes > cacheNodes || !session) {
                        session = cloudSession;
                        console.log(
                            `[RESTORE] Loaded from cloud: ${cloudTranscripts} transcripts, ${cloudNodes} nodes`,
                        );
                    }
                }
            } catch (cloudErr) {
                // Silent fallback
                session = session || fallbackSession;
            }
        }
        
        session = session || fallbackSession;
        if (session) {
            sessionCache.set(sessionId, JSON.parse(JSON.stringify(session)));
        }
    }

    return { session, updatedCache: sessionCache };
}

/**
 * Parse a loaded session object into component state values.
 */
export function parseSessionIntoState(session: any): RestoredState {
    const currentSession = JSON.parse(JSON.stringify(session));

    const transcripts: Transcript[] = (session.transcripts || []).map(
        (t: any, i: number) => ({
            id: t.id || `restored_${i}`,
            timestamp: t.timestamp || "",
            speaker: t.speaker_id || t.speaker || "Speaker",
            speakerId: t.speakerId || 0,
            text: t.text || "",
            tone: t.tone || undefined,
            category: t.category || undefined,
            confidence: t.confidence || 0.5,
            isPartial: false,
        }),
    );

    const graphNodes: GraphNode[] = (session.graph_nodes || []).map((n: any) => ({
        id: n.id,
        type: n.node_type || n.type || "Entity",
        label: n.label || n.id,
        weight: n.weight || 1,
    }));

    const graphEdges: GraphEdge[] = (session.graph_edges || []).map((e: any) => ({
        from: e.from,
        to: e.to,
        relation: e.relation || "related",
    }));

    // Restore insights
    let extractedSummary: ExtractedSummary | null = null;
    let showSummaryPanel = false;
    if (session.insights) {
        extractedSummary = {
            topics: session.insights.topics || [],
            decisions: session.insights.decisions || [],
            actionItems: session.insights.action_items || [],
            keyPoints: session.insights.key_points || [],
        };
        showSummaryPanel = true;
    } else if (session.summary) {
        extractedSummary = {
            topics: [],
            decisions: session.summary.key_decisions || [],
            actionItems: (session.summary.action_items || []).map((a: any) =>
                typeof a === "string" ? a : a.description,
            ),
            keyPoints: session.summary.next_steps || [],
        };
        showSummaryPanel = true;
    }

    // Restore psychosomatic
    let stressLevel = 0;
    let engagementLevel = 0.3;
    let urgencyLevel = 0;
    let clarityLevel = 0.4;
    if (session.psychosomatic) {
        stressLevel = session.psychosomatic.stress || 0;
        engagementLevel = session.psychosomatic.engagement || 0;
        urgencyLevel = session.psychosomatic.urgency || 0;
        clarityLevel = session.psychosomatic.clarity || 0;
    }

    // Restore memories
    let extractedMemories: ExtractedMemoriesData | null = null;
    let showMemoriesPanel = false;
    if (session._extractedMemories) {
        extractedMemories = session._extractedMemories;
        showMemoriesPanel = session._showMemoriesPanel || false;
    }
    if (session._showSummaryPanel !== undefined) {
        showSummaryPanel = session._showSummaryPanel;
    }

    const title = session.metadata?.title || "Session";
    const status = `Restored: ${title} (${transcripts.length} transcripts, ${graphNodes.length} nodes)`;
    console.log(`[RESTORE] === Session loaded: ${title} ===`);

    return {
        currentSession,
        transcripts,
        graphNodes,
        graphEdges,
        graphPositions: session.graph_positions || null,
        stressLevel,
        engagementLevel,
        urgencyLevel,
        clarityLevel,
        extractedSummary,
        extractedMemories,
        showSummaryPanel,
        showMemoriesPanel,
        activeTab: "transcript",
        isCollapsed: false,
        status,
    };
}

// ============================================================
// SESSION LIST
// ============================================================

/**
 * Fetch and deduplicate sessions from local disk + cloud.
 * Returns sorted array (newest first) and updated cache.
 */
export async function fetchAllSessions(
    sessionCache: Map<string, any>,
): Promise<{ pastSessions: any[]; sessionCache: Map<string, any> }> {
    const sessionMap = new Map<string, any>();

    // Step 1: Load all local sessions
    try {
        const localJson = (await invoke("list_sessions")) as string;
        const localSessions = JSON.parse(localJson);
        for (const s of localSessions) {
            sessionMap.set(s.id, s);
        }
        console.log(`[SESSIONS] Loaded ${localSessions.length} local sessions`);
    } catch (e) {
        console.warn("[SESSIONS] Failed to load local sessions:", e);
    }

    // Step 2: Merge cloud sessions if signed in
    if (FirestoreSessionManager.isAvailable()) {
        try {
            const cloudSessions = await FirestoreSessionManager.listSessions();
            console.log(`[SESSIONS] Found ${cloudSessions.length} cloud sessions`);
            for (const cs of cloudSessions) {
                const existing = sessionMap.get(cs.id);
                if (!existing) {
                    sessionMap.set(cs.id, cs);
                    try {
                        await invoke("save_session", {
                            sessionJson: JSON.stringify(cs),
                        });
                        console.log(
                            `[SESSIONS] Synced cloud→local: ${cs.metadata?.title}`,
                        );
                    } catch (syncErr) {
                        console.warn(`[SESSIONS] Cloud→local sync failed:`, syncErr);
                    }
                } else {
                    const localTranscripts = existing.transcripts?.length || 0;
                    const cloudTranscripts = cs.transcripts?.length || 0;
                    const localNodes = existing.graph_nodes?.length || 0;
                    const cloudNodes = cs.graph_nodes?.length || 0;
                    const localContent = localTranscripts + localNodes;
                    const cloudContent = cloudTranscripts + cloudNodes;

                    if (cloudContent > localContent) {
                        sessionMap.set(cs.id, cs);
                        console.log(
                            `[SESSIONS] Cloud wins for ${cs.id}: ${cloudContent} > ${localContent} items`,
                        );
                    } else if (
                        cloudContent === localContent &&
                        new Date(cs.updated_at) > new Date(existing.updated_at)
                    ) {
                        sessionMap.set(cs.id, cs);
                    } else {
                        console.log(
                            `[SESSIONS] Local wins for ${cs.id}: ${localContent} >= ${cloudContent} items`,
                        );
                    }
                }
            }
        } catch (e) {
            console.warn("[SESSIONS] Cloud load failed (using local only):", e);
        }
    }

    // Step 3: Build deduplicated array, sorted newest first
    const deduped = Array.from(sessionMap.values()).sort(
        (a: any, b: any) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );

    // Step 4: Update cache
    for (const s of deduped) {
        sessionCache.set(s.id, JSON.parse(JSON.stringify(s)));
    }

    console.log(
        `[SESSIONS] pastSessions set: ${deduped.length} sessions (deduplicated)`,
    );

    return { pastSessions: deduped, sessionCache };
}

// ============================================================
// SESSION SAVE (building JSON for persistence)
// ============================================================

/**
 * Build the session JSON object for disk/cloud persistence.
 * Syncs live UI state into the session structure.
 */
export function buildSessionJson(
    currentSession: any,
    transcripts: Transcript[],
    graphNodes: GraphNode[],
    graphEdges: GraphEdge[],
    stressLevel: number,
    engagementLevel: number,
    urgencyLevel: number,
    clarityLevel: number,
    extractedSummary: ExtractedSummary | null,
    extractedMemories: ExtractedMemoriesData | null = null,
    showSummaryPanel: boolean = false,
    showMemoriesPanel: boolean = false,
): any {
    const session = JSON.parse(JSON.stringify(currentSession));
    session.transcripts = transcripts.map((t) => ({
        timestamp: t.timestamp || "",
        speaker_id: t.speaker || "Speaker",
        text: t.text || "",
        tone: t.tone || null,
        category: t.category || null,
        confidence: t.confidence || 0.5,
    }));
    session.graph_nodes = graphNodes.map((n) => ({
        id: n.id,
        node_type: n.type || "Entity",
        label: n.label || n.id,
        weight: n.weight || 1,
        metadata: {},
    }));
    session.graph_edges = graphEdges.map((e) => ({
        from: e.from,
        to: e.to,
        relation: e.relation || "related",
        weight: 1.0,
    }));
    session.metadata.total_transcripts = transcripts.length;
    session.updated_at = new Date().toISOString();
    session.psychosomatic = {
        stress: stressLevel || 0,
        engagement: engagementLevel || 0,
        urgency: urgencyLevel || 0,
        clarity: clarityLevel || 0,
    };
    session.insights = extractedSummary
        ? {
            topics: extractedSummary.topics || [],
            decisions: extractedSummary.decisions || [],
            action_items: extractedSummary.actionItems || [],
            key_points: extractedSummary.keyPoints || [],
        }
        : null;
    // Include memories and UI state for full Firebase restoration
    session._extractedMemories = extractedMemories
        ? JSON.parse(JSON.stringify(extractedMemories))
        : null;
    session._showSummaryPanel = showSummaryPanel;
    session._showMemoriesPanel = showMemoriesPanel;
    return session;
}

/**
 * Save session to local disk.
 */
export async function saveSessionToDisk(sessionJson: string): Promise<boolean> {
    try {
        await invoke("save_session", { sessionJson });
        console.log("[PERSISTENCE] ✓ Saved to local disk");
        return true;
    } catch (localErr: any) {
        console.error("[PERSISTENCE] Local save failed:", localErr);
        return false;
    }
}

/**
 * Sync session to cloud (Firestore) if available.
 */
export async function syncSessionToCloud(session: any): Promise<boolean> {
    if (!FirestoreSessionManager.isAvailable()) {
        console.log("[PERSISTENCE] Cloud sync skipped (not signed in)");
        return false;
    }
    try {
        await FirestoreSessionManager.saveSession(session);
        console.log("[PERSISTENCE] ✓ Synced to Google Cloud Firestore");
        return true;
    } catch (cloudErr: any) {
        const cloudMsg =
            typeof cloudErr === "string"
                ? cloudErr
                : cloudErr?.message || String(cloudErr);
        console.warn("[PERSISTENCE] Cloud sync failed (local save OK):", cloudMsg);
        return false;
    }
}

/**
 * Delete a session from disk and cloud.
 */
export async function deleteSession(sessionId: string): Promise<void> {
    try {
        await invoke("delete_session", { sessionId });
        console.log("[SESSION] Deleted from local storage");
    } catch (e) {
        console.warn("[SESSION] Local delete failed:", e);
    }

    if (FirestoreSessionManager.isAvailable()) {
        try {
            await FirestoreSessionManager.deleteSession(sessionId);
            console.log("[SESSION] Deleted from cloud");
        } catch (e) {
            console.warn("[SESSION] Cloud delete failed:", e);
        }
    }
}

/**
 * Attempt to recover a pending save from localStorage.
 */
export async function recoverPendingSave(): Promise<void> {
    try {
        const pendingSave = localStorage.getItem("cognivox_pending_save");
        if (pendingSave) {
            console.log(
                "[RECOVERY] Found pending session save in localStorage, persisting to disk...",
            );
            await invoke("save_session", { sessionJson: pendingSave });
            localStorage.removeItem("cognivox_pending_save");
            console.log(
                "[RECOVERY] Pending session saved to disk and cleared from localStorage",
            );
        }
    } catch (recoveryErr) {
        console.warn("[RECOVERY] Failed to recover pending save:", recoveryErr);
        localStorage.removeItem("cognivox_pending_save");
    }
}
