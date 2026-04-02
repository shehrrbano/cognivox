<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { invoke } from "@tauri-apps/api/core";
    import { listen } from "@tauri-apps/api/event";
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import { onMount, onDestroy, untrack as svelteUntrack } from "svelte";
    
    // Fallback for untrack if svelteUntrack is somehow undefined at runtime
    const untrackHandle = typeof svelteUntrack !== 'undefined' ? svelteUntrack : ((fn: any) => fn());
    import Diagnostics from "$lib/Diagnostics.svelte";
    import RecordingOverlay from "$lib/RecordingOverlay.svelte";
    import ProcessingProgress from "$lib/ProcessingProgress.svelte";
    import SettingsModal from "$lib/SettingsModal.svelte";
    import LiveRecordingPanel from "$lib/LiveRecordingPanel.svelte";
    import StatusBar from "$lib/StatusBar.svelte";
    import { vadManager, type VADState } from "$lib/vadManager";
    import {
        intelligenceExtractor,
        type ExtractedInsights,
    } from "$lib/intelligenceExtractor";
    import { FirestoreSessionManager } from "$lib/firestoreSessionManager";
    import { getCurrentUser, initFirebase, waitForAuth } from "$lib/firebase";
    import { keyManager, type KeyManagerState } from "$lib/keyManager";
    import { settingsStore } from "$lib/settingsStore";


    // === UI COMPONENTS ===
    import DebugBar from "$lib/DebugBar.svelte";
    import Sidebar from "$lib/Sidebar.svelte";
    import MainHeader from "$lib/MainHeader.svelte";
    import TranscriptView from "$lib/TranscriptView.svelte";
    import SummaryPanel from "$lib/SummaryPanel.svelte";
    import MemoriesPanel from "$lib/MemoriesPanel.svelte";
    import AlertsTab from "$lib/AlertsTab.svelte";
    import AnalyticsTab from "$lib/AnalyticsTab.svelte";
    import SettingsTab from "$lib/SettingsTab.svelte";
    import SpeakersTab from "$lib/SpeakersTab.svelte";
    import GraphTab from "$lib/GraphTab.svelte";
    import BottomActionBar from "$lib/BottomActionBar.svelte";
    import ToastNotification from "$lib/ToastNotification.svelte";
    import InsightsPanel from "$lib/InsightsPanel.svelte";
    import DecisionLedger from "$lib/DecisionLedger.svelte";
    import ProjectOverview from "$lib/ProjectOverview.svelte";
    import SearchTab from "$lib/SearchTab.svelte";

    // === SERVICE MODULES ===
    import type {
        Transcript,
        GraphNode,
        GraphEdge,
        ExtractedSummary,
        ExtractedMemoriesData,
        SpeakerIdStatus,
        SpeakerProfile,
        IdentifiedSpeaker,
        RestoredState,
        SnapshotParams,
    } from "$lib/types";
    import {
        parseGeminiPayload,
        createTranscriptEntry,
        buildGraphFromSegment,
        buildGraphFromTranscripts,
        analyzeToneDistribution,
        createPartialTranscript,
    } from "$lib/services/geminiProcessor";
    import {
        buildSessionSnapshot,
        updatePastSessionsList,
        persistSnapshotToDisk,
        loadFullSession,
        parseSessionIntoState,
        fetchAllSessions,
        buildSessionJson,
        saveSessionToDisk,
        syncSessionToCloud,
        deleteSession as deleteSessionService,
        recoverPendingSave,
    } from "$lib/services/sessionService";
    import {
        extractSummary as doExtractSummary,
        extractMemories as doExtractMemories,
    } from "$lib/services/extractionService";
    import {
        extractKnowledgeGraph,
        applyGraphQualityRules,
        selfHealGraph,
        autoClusterGraph,
        expandCluster,
    } from "$lib/services/graphExtractionService";
    import {
        initializeSpeakerId as doInitSpeakerId,
        refreshSpeakerIdStatus as doRefreshSpeakerStatus,
        renameSpeaker as doRenameSpeaker,
        clearSpeakerProfiles as doClearSpeakerProfiles,
    } from "$lib/services/speakerService";
    import {
        connectGemini as doConnectGemini,
        setupKeyManagerSubscription,
        setupBackendEventListeners,
        setupVADSubscription,
        backgroundRecordingInit,
        waitForTranscriptions,
    } from "$lib/services/connectionService";

    // ============================================================
    // STATE DECLARATIONS
    // ============================================================
    let devices = $state<any[]>([]);
    let status = $state("Ready");
    let isRecording = $state(false);
    // Guard to prevent rapid Start/Stop race condition where stop_audio_capture
    // could invoke before start_audio_capture completes → EC-009 fix
    let isRecordingStarting = $state(false);
    let forceNewSession = $state(false);
    let apiKey = $state("");
    let isGeminiConnected = $state(false);
    let isRunningInTauri = $state(true);
    let whisperReady = $state(false);
    let whisperLoading = $state(false);
    let whisperProgress = $state(0);

    let selectedModel = $state($settingsStore.geminiModel);
    // availableModels is now dynamic from $settingsStore

    let captureMode = $state("both");
    let currentVolume = $state(0);
    let volumeInterval: ReturnType<typeof setInterval> | null = $state(null);
    let autoSaveInterval: ReturnType<typeof setInterval> | null = $state(null);
    let pastSessions = $state<any[]>([]);
    let sessionCache = $state<Map<string, any>>(new Map());
    let isTyping = $state(false);
    let partialText = $state("");
    let latencyMs = $state(0);
    let searchQuery = $state("");
    let searchFilter = $state("all");
    let transcripts = $state<Transcript[]>([]);
    let stressLevel = $state(0);
    let engagementLevel = $state(0.3);
    let urgencyLevel = $state(0);
    let clarityLevel = $state(0.4);
    let alerts = $state<Array<{
        id: string;
        type: string;
        message: string;
        timestamp: string;
        severity: "info" | "warning" | "critical";
    }>>([]);
    let isProcessing = $state(false);
    let processingStep = $state(0);
    let processingError = $state<string | null>(null);
    let showSettingsModal = $state(false);
    let recordingStartTime = $state<Date | null>(null);
    let speakerIdInitialized = $state(false);
    let speakerIdStatus = $state<SpeakerIdStatus | null>(null);
    let speakerProfiles = $state<SpeakerProfile[]>([]);
    let lastIdentifiedSpeaker = $state<IdentifiedSpeaker | null>(null);
    let debugEventCount = $state(0);
    let debugLastEvent = $state("");
    let debugLastTranscript = $state("");
    let keyState = $state<KeyManagerState>(keyManager.getState());
    let isRateLimited = $state(false);
    let lastRequestTime = $state<string | null>(null);
    let elapsedRecordingSeconds = $state(0);
    let recordingTimerInterval: ReturnType<typeof setInterval> | null = null;
    let debugMode = $state(false);
    let toastMessage = $state<string | null>(null);
    let toastType = $state<"info" | "warning" | "error">("info");
    let vadState = $state<VADState>(vadManager.getState());
    let activeTab = $state<string>("transcript");
    let graphNodes = $state<GraphNode[]>([]);
    let graphEdges = $state<GraphEdge[]>([]);
    // Keep unclustered originals for expanding clusters
    let _originalGraphNodes = $state<GraphNode[]>([]);
    let _originalGraphEdges = $state<GraphEdge[]>([]);
    let currentSession = $state<any>({
        id: crypto.randomUUID ? crypto.randomUUID() : `session_${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        transcripts: [],
        graph_nodes: [],
        graph_edges: [],
        metadata: {
            title: "Untitled Meeting",
            duration_seconds: 0,
            total_transcripts: 0,
            total_speakers: 0,
            tags: [],
        },
        summary: null,
    });
    let isCollapsed = $state(false);
    let isSidebarOpen = $state(false);
    let showSummaryPanel = $state(false);
    let showMemoriesPanel = $state(false);
    let extractedSummary = $state<ExtractedSummary | null>(null);
    let localInsights = $state<any[]>([]); // Restored for intelligence pipeline continuity
    
    // [PERSISTENCE_v1] Reference to GraphTab for coordinate capture
    let graphTabRef = $state<any>();
    let extractedMemories = $state<ExtractedMemoriesData | null>(null);
    let isExtractingSummary = $state(false);
    let isExtractingMemories = $state(false);
    let isGeneratingGraph = $state(false);
    let extractError = $state<string | null>(null);
    // Timer for promoting partial transcripts when Gemini is unresponsive
    let partialPromotionTimer = $state<ReturnType<typeof setTimeout> | null>(null);
    let typingTimer: ReturnType<typeof setTimeout> | null = null;
    const PARTIAL_PROMOTION_DELAY_MS = 15_000; // 15 seconds

    // Unsubscribe functions (non-reactive)
    let vadUnsubscribe: (() => void) | null = null;
    let chunkUnsubscribe: (() => void) | null = null;
    let unlistenStatus = $state<(() => void) | null>(null);
    let unlistenTranscript = $state<(() => void) | null>(null);
    let unlistenIntelligence = $state<(() => void) | null>(null);
    let unlistenBackendErrors = $state<(() => void) | null>(null);

    // === SETTINGS STORE SUBSCRIPTION ===
    // Svelte 5 $settingsStore automatically handles subscription.
    // Manual subscription removed to prevent double-updates.

    // ============================================================
    // REACTIVE STATEMENTS
    // ============================================================
    // === SESSION SYNC EFFECT ===
    // Lightweight sync for UI metadata only. Heavy cloning moved to saveSession.
    // GUARD: skip during isRecordingStarting to prevent Svelte 5 effect-depth cascade.
    // isRecordingStarting is a TRACKED dependency so the effect re-runs once it clears.
    $effect(() => {
        const transcriptCount = transcripts.length;
        if (isRecordingStarting) return;

        untrackHandle(() => {
            if (currentSession && currentSession.metadata) {
                if (currentSession.metadata.total_transcripts !== transcriptCount) {
                    currentSession.metadata.total_transcripts = transcriptCount;
                    currentSession.updated_at = new Date().toISOString();
                }
            }
        });
    });

    // Keep selectedModel in sync with settingsStore
    $effect(() => {
        if (selectedModel !== $settingsStore.geminiModel) {
            selectedModel = $settingsStore.geminiModel;
        }
    });

    // KG_UNIFIED_v1: Trigger refreshLayout when graph tab becomes visible.
    // GraphTab is CSS-toggled (display:none when hidden) so ResizeObserver doesn't fire on show.
    // refreshLayout() re-measures containerWidth/containerHeight and calls fitToView().
    $effect(() => {
        if (activeTab === 'graph') {
            // Two rAF frames: first allows CSS display:block to apply, second allows layout paint.
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    graphTabRef?.refreshLayout();
                });
            });
        }
    });

    let displayText = $derived(
        transcripts.length > 0
            ? transcripts[transcripts.length - 1].text
            : "No transcripts yet. Start recording to begin."
    );

    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================
    function showToast(
        message: string,
        type: "info" | "warning" | "error" = "info",
    ) {
        toastMessage = message;
        toastType = type;
        setTimeout(() => {
            toastMessage = null;
        }, 5000);
    }

    function getActiveApiKey(): string | null {
        return keyManager.getCurrentKey()?.key || null;
    }
    function getActiveKeyName(): string {
        return keyManager.getCurrentKeyInfo()?.name || "";
    }
    function getActiveKeyIndex(): number {
        return keyManager.getCurrentKeyInfo()?.index || 1;
    }
    function loadApiKeysFromStorage() {
        debugMode = localStorage.getItem("debug_mode") === "true";
        keyState = keyManager.getState();
    }
    function openSettings() {
        showSettingsModal = true;
    }
    function closeSettings() {
        showSettingsModal = false;
    }
    function toggleCollapseState() {
        isCollapsed = !isCollapsed;
    }
    function closeSummaryPanel() {
        showSummaryPanel = false;
    }
    function closeMemoriesPanel() {
        showMemoriesPanel = false;
    }
    function handleSettingsChange(settings: any) {
        console.log("Settings updated:", settings);
    }
    function dismissProcessing() {
        isProcessing = false;
        processingStep = 0;
        processingError = null;
        status = "Ready";
    }
    function retryProcessing() {
        runProcessingFlow(5);
    }

    /**
     * Promote partial (Whisper-only) transcripts to final transcripts.
     * Called when Gemini is unresponsive (rate-limited / 429) so that
     * graph building and post-processing can still use the text.
     */
    function promotePartialTranscripts(): number {
        let promoted = 0;
        transcripts = transcripts.map((t) => {
            if (t.isPartial) {
                promoted++;
                return { ...t, isPartial: false };
            }
            return t;
        });
        if (promoted > 0) {
            console.log(
                `[PARTIAL-PROMO] Promoted ${promoted} partial transcripts to final`,
            );
        }
        return promoted;
    }

    /**
     * Schedule a timer to promote partials if Gemini doesn't respond.
     * Resets on each new Whisper event so we only promote after sustained silence from Gemini.
     */
    function schedulePartialPromotion() {
        if (partialPromotionTimer) clearTimeout(partialPromotionTimer);
        partialPromotionTimer = setTimeout(() => {
            const partials = transcripts.filter((t) => t.isPartial);
            if (partials.length > 0) {
                console.log(
                    `[PARTIAL-PROMO] Gemini silent for ${PARTIAL_PROMOTION_DELAY_MS / 1000}s — promoting ${partials.length} partials`,
                );
                promotePartialTranscripts();
                // Build a quick local graph from the promoted transcripts
                const localGraph = buildGraphFromTranscripts(
                    transcripts,
                    graphNodes,
                    graphEdges,
                );
                const cleaned = applyGraphQualityRules(
                    localGraph.nodes,
                    localGraph.edges,
                );
                graphNodes = cleaned.nodes;
                graphEdges = cleaned.edges;
            }
            partialPromotionTimer = null;
        }, PARTIAL_PROMOTION_DELAY_MS);
    }

    // ============================================================
    // STATE HELPERS
    // ============================================================
    function getSnapshotParams(): SnapshotParams {
        return {
            currentSession,
            transcripts,
            graphNodes,
            graphEdges,
            graphPositions: currentSession?.graph_positions || null,
            stressLevel,
            engagementLevel,
            urgencyLevel,
            clarityLevel,
            extractedSummary,
            extractedMemories,
            showSummaryPanel,
            showMemoriesPanel,
        };
    }

    // [PERSISTENCE_v1] Capture visual state from the physics engine
    function captureGraphPositions() {
        if (!graphTabRef) return;
        const posMap = graphTabRef.getPositions();
        if (posMap && currentSession) {
            const serializable: Record<string, { x: number; y: number }> = {};
            posMap.forEach((v: any, k: string) => {
                serializable[k] = { x: v.x, y: v.y };
            });
            currentSession.graph_positions = serializable;
        }
    }

    function applyRestoredState(state: RestoredState) {
        currentSession = state.currentSession;
        transcripts = state.transcripts;
        graphNodes = state.graphNodes;
        graphEdges = state.graphEdges;
        if (state.graphPositions && currentSession) {
            currentSession.graph_positions = state.graphPositions;
        }
        stressLevel = state.stressLevel;
        engagementLevel = state.engagementLevel;
        urgencyLevel = state.urgencyLevel;
        clarityLevel = state.clarityLevel;
        extractedSummary = state.extractedSummary;
        extractedMemories = state.extractedMemories;
        showSummaryPanel = state.showSummaryPanel;
        showMemoriesPanel = state.showMemoriesPanel;
        activeTab = state.activeTab as any;
        isCollapsed = state.isCollapsed;
        status = state.status;
    }

    // ============================================================
    // SESSION MANAGEMENT (thin wrappers around sessionService)
    // ============================================================
    function saveCurrentSessionToCache(): any | null {
        // [EC-017] CRITICAL GUARD: Never build snapshot while recording is starting
        // because the state is in flux and multiple flushes will trigger depth-limit crashes.
        if (isRecordingStarting || isProcessing) return null;

        return untrackHandle(() => {
            const snapshot = buildSessionSnapshot(getSnapshotParams());
            if (!snapshot) return null;
            sessionCache.set(currentSession.id, snapshot);
            if (isRunningInTauri && transcripts.length > 0) {
                persistSnapshotToDisk(snapshot);
            }
            pastSessions = updatePastSessionsList(
                pastSessions,
                snapshot,
                currentSession.id,
            );
            return snapshot;
        });
    }

    // MEETING_TASKS_v1: Task 3.1 — Firebase Persistence Audit
    // VERIFIED: loadInitialData() correctly calls initFirebase() → waitForAuth() → refreshSessionList()
    // → fetchAllSessions() which loads local disk sessions first, then merges Firestore cloud sessions.
    // Sessions persist across reopens. No code change required — persistence is confirmed working.
    async function refreshSessionList(): Promise<void> {
        const result = await fetchAllSessions(sessionCache);
        pastSessions = result.pastSessions;
        sessionCache = result.sessionCache;
    }

    async function restoreSessionData(fullSession: any) {
        const { session, updatedCache } = await loadFullSession(
            fullSession.id,
            sessionCache,
            fullSession,
        );
        sessionCache = updatedCache;
        applyRestoredState(parseSessionIntoState(session));
    }

    // [PERSISTENCE_v1] Core sync hook: Listen for manual moves and update state immediately
    // KG_UNIFIED_v1: Signature changed from CustomEvent wrapper to direct detail object
    function handleGraphLayoutChanged(detail: { positions: any }) {
        const positions = detail.positions;
        if (currentSession && positions) {
            console.log(`[GRAPH-PERSISTENCE] Manual move detected: syncing ${Object.keys(positions).length} nodes`);
            currentSession.graph_positions = positions;
            
            // Auto-sync to cache/disk for robustness
            if (!isRecording && isRunningInTauri) {
                saveCurrentSessionToCache();
            }
        }
    }

    async function handleSessionLoad(session: any) {
        if (!session) return;
        // FIX: Guard against loading a session while recording — would destroy live transcripts (EC-016)
        if (isRecording) {
            showToast("Please stop recording before switching sessions.", "warning");
            return;
        }
        if (currentSession?.id === session.id) {
            activeTab = "transcript";
            return;
        }
        console.log(`[RESTORE] === Loading session: ${session.id} ===`);
        const snapshot = saveCurrentSessionToCache();
        if (snapshot && isRunningInTauri) {
            try {
                if (isRunningInTauri) {
                    await invoke("save_session", {
                        sessionJson: JSON.stringify(snapshot),
                    });
                }
            } catch (e) {
                console.warn("[SESSION-SWITCH] Disk save failed:", e);
            }
        }
        status = "Loading session...";
        await restoreSessionData(session);
    }

    async function handleSessionDelete(sessionId: string, event: MouseEvent) {
        event.stopPropagation();
        if (!confirm("Delete this session? This cannot be undone.")) return;
        await deleteSessionService(sessionId);
        sessionCache.delete(sessionId);
        if (currentSession?.id === sessionId) {
            currentSession = null;
            transcripts = [];
            graphNodes = [];
            graphEdges = [];
            extractedSummary = null;
        }
        await refreshSessionList();
        status = "Session deleted";
    }

    async function saveSession(isFinal = false) {
        // [EC-017] EMERGENCY GUARD: Skip during recording setup to prevent reactive loop
        if (isRecordingStarting) return;
        if (!isRunningInTauri || (!isRecording && !isFinal)) return;
        
        return untrackHandle(async () => {
            if (!currentSession) {
                console.warn("[PERSISTENCE] No current session to save");
                return;
            }
            
            // [PERSISTENCE_v1] Capture latest coordinates before building payload
            captureGraphPositions();

            try {
                const sessionObj = buildSessionJson(
                    currentSession,
                    transcripts,
                    graphNodes,
                    graphEdges,
                    stressLevel,
                    engagementLevel,
                    urgencyLevel,
                    clarityLevel,
                    extractedSummary,
                    extractedMemories,
                    showSummaryPanel,
                    showMemoriesPanel,
                );
                currentSession = sessionObj;
                const transcriptCount = sessionObj.transcripts.length;
                const nodeCount = sessionObj.graph_nodes.length;
                
                console.log(
                    `[PERSISTENCE] Saving ${isFinal ? "(Final)" : "(Auto)"}: ${transcriptCount} transcripts, ${nodeCount} nodes`,
                );
                
                // SAVE to cache
                saveCurrentSessionToCache();
                
                if (isRunningInTauri) {
                    await saveSessionToDisk(JSON.stringify(sessionObj));
                    await syncSessionToCloud(sessionObj);
                }
                
                if (isFinal) {
                    await refreshSessionList();
                    status = `Session saved (${transcriptCount} transcripts)`;
                }
            } catch (error: any) {
                const errMsg = typeof error === "string" ? error : error?.message || String(error);
                console.error("[PERSISTENCE] Save FAILED:", errMsg);
                status = `⚠ Save failed: ${errMsg}`;
            }
        });
    }

    async function loadInitialData() {
        try {
            if (!isRunningInTauri) return;
            if (isRunningInTauri) await recoverPendingSave();
            try {
                initFirebase();
                const user = await waitForAuth();
                if (user)
                    console.log(`[RESTORE] Authenticated as: ${user.email}`);
                else console.log("[RESTORE] Not signed in — local only");
            } catch (firebaseErr) {
                console.warn("[RESTORE] Firebase init failed:", firebaseErr);
            }
            await refreshSessionList();
            if (pastSessions.length > 0 && transcripts.length === 0) {
                const latest = pastSessions[0];
                console.log(
                    `[RESTORE] Auto-loading latest session: ${latest.metadata?.title}`,
                );
                await restoreSessionData(latest);
            }
        } catch (error: any) {
            const errMsg =
                typeof error === "string"
                    ? error
                    : error?.message || String(error);
            console.error("[RESTORE] Failed to load sessions:", errMsg);
            status = `Error loading sessions: ${errMsg}`;
        }
    }

    // ============================================================
    // SPEAKER ID (thin wrappers)
    // ============================================================
    async function initializeSpeakerId() {
        if (!isRunningInTauri) return;
        speakerIdInitialized = await doInitSpeakerId();
        if (speakerIdInitialized) await doRefreshSpeakerIdStatus();
    }

    async function doRefreshSpeakerIdStatus() {
        if (!isRunningInTauri) return;
        const result = await doRefreshSpeakerStatus();
        speakerIdStatus = result.status;
        speakerProfiles = result.profiles;
    }

    async function renameSpeaker(speakerId: string, newLabel: string) {
        if (!isRunningInTauri) return;
        const result = await doRenameSpeaker(speakerId, newLabel);
        if (result.success) {
            await doRefreshSpeakerIdStatus();
            showToast(result.message, "info");
        } else showToast(result.message, "error");
    }

    async function clearSpeakerProfiles() {
        if (!isRunningInTauri) return;
        const result = await doClearSpeakerProfiles();
        if (result.success) {
            await doRefreshSpeakerIdStatus();
            showToast(result.message, "info");
        } else showToast(result.message, "error");
    }

    // ============================================================
    // EXTRACTION (thin wrappers)
    // ============================================================
    async function extractSummary() {
        isExtractingSummary = true;
        extractError = null;
        const result = await doExtractSummary(transcripts, getActiveApiKey);
        if (result.summary) {
            extractedSummary = result.summary;
            showSummaryPanel = true;
        } else {
            extractError = result.error;
            setTimeout(() => (extractError = null), 3000);
        }
        isExtractingSummary = false;
    }

    async function extractMemories() {
        isExtractingMemories = true;
        extractError = null;
        const result = await doExtractMemories(transcripts, getActiveApiKey);
        if (result.memories) {
            extractedMemories = result.memories;
            showMemoriesPanel = true;
        } else {
            extractError = result.error;
            setTimeout(() => (extractError = null), 3000);
        }
        isExtractingMemories = false;
    }

    async function handleGenerateGraph() {
        // FIX: Guard against calling while recording — would overwrite additive live graph nodes (EC-013)
        if (isRecording) {
            showToast("Stop recording before regenerating the knowledge graph.", "warning");
            return;
        }
        if (isGeneratingGraph || transcripts.length === 0) return;
        isGeneratingGraph = true;
        status = "Generating knowledge graph...";
        try {
            const result = await extractKnowledgeGraph(
                transcripts,
                graphNodes,
                graphEdges,
                getActiveApiKey,
            );
            // KG_CLEANUP_SELF_HEALING_v1: quality rules → self-heal → cluster
            const cleaned = applyGraphQualityRules(result.nodes, result.edges);
            const healed = selfHealGraph(cleaned.nodes, cleaned.edges);
            // Store unclustered originals for expand
            _originalGraphNodes = [...healed.nodes];
            _originalGraphEdges = [...healed.edges];
            // Auto-cluster if large
            const clustered = autoClusterGraph(healed.nodes, healed.edges, 20);
            graphNodes = clustered.nodes;
            graphEdges = clustered.edges;
            if (result.error) {
                showToast(result.error, "warning");
            } else {
                showToast(
                    `Knowledge graph generated: ${graphNodes.length} nodes, ${graphEdges.length} edges`,
                    "info",
                );
            }
            // Save session with new graph data
            await saveSession(false);
        } catch (e: any) {
            console.error("[Graph] Generation failed:", e);
            showToast(`Graph generation failed: ${e.message}`, "error");
        } finally {
            isGeneratingGraph = false;
            status = "Ready";
        }
    }

    function handleClearGraph() {
        graphNodes = [];
        graphEdges = [];
        _originalGraphNodes = [];
        _originalGraphEdges = [];
        showToast("Knowledge graph cleared", "info");
    }

    // KG_CLEANUP_SELF_HEALING_v1: instant self-heal (no API) — removes noise nodes
    function handleSelfHealGraph() {
        const before = graphNodes.length;
        const healed = selfHealGraph(graphNodes, graphEdges);
        graphNodes = healed.nodes;
        graphEdges = healed.edges;
        const removed = before - healed.nodes.length;
        showToast(
            removed > 0
                ? `Graph cleaned: removed ${removed} noise node${removed > 1 ? "s" : ""}`
                : "Graph is already clean",
            "info",
        );
    }

    // KG_UNIFIED_v1: Signature changed from CustomEvent to direct detail object (Svelte 5 callback)
    function handleToggleCluster(detail: { nodeId: string }) {
        const { nodeId } = detail;
        const origNodes =
            _originalGraphNodes.length > 0 ? _originalGraphNodes : graphNodes;
        const origEdges =
            _originalGraphEdges.length > 0 ? _originalGraphEdges : graphEdges;
        const result = expandCluster(
            nodeId,
            origNodes,
            origEdges,
            graphNodes,
            graphEdges,
        );
        graphNodes = result.nodes;
        graphEdges = result.edges;
    }

    // ============================================================
    // CONNECTION
    // ============================================================
    async function connectGemini() {
        if (!apiKey) {
            status = "API Key Required";
            return;
        }
        const result = await doConnectGemini({
            apiKey,
            selectedModel,
            isRunningInTauri,
        });
        isGeminiConnected = result.isGeminiConnected;
        status = result.status;
        if (isRunningInTauri) initializeSpeakerId();
    }

    // ============================================================
    // AUDIO CAPTURE
    // ============================================================
    async function pollVolume() {
        if (!isRecording) return;
        try {
            if (isRunningInTauri) {
                let vol = (await invoke("get_current_volume")) as number;
                currentVolume = currentVolume * 0.3 + vol * 0.7;
                vadManager.processVolume(currentVolume);
            }
        } catch {
            /* ignore */
        }
    }

    async function setCaptureMode(mode: string) {
        try {
            if (isRunningInTauri) {
                await invoke("set_capture_mode", { mode });
                captureMode = mode;
                if (isRecording) {
                    await invoke("stop_audio_capture");
                    await invoke("start_audio_capture");
                    status = `Recording (${mode})...`;
                }
            } else {
                captureMode = mode;
                if (isRecording) status = `Recording (Browser Mode)...`;
            }
        } catch (error) {
            console.error("Failed to set capture mode:", error);
        }
    }

    async function toggleCapture() {
        console.log("[Recording] toggleCapture called. Current isRecording:", isRecording);
        // FIX: Prevent rapid start/stop race condition (EC-009)
        if (isRecordingStarting) {
            console.warn("[Recording] Ignored — recording start already in progress");
            return;
        }
        try {
            if (isRecording) {
                isRecording = false;
                // === STOP RECORDING ===
                try {
                    if (isRunningInTauri) await invoke("stop_audio_capture");
                } catch (stopErr: any) {
                    console.warn("[Recording] Stop audio capture failed:", stopErr);
                }
                // Flush: tell backend to process any buffered audio immediately
                // (don't wait for silence timeout)
                try {
                    if (isRunningInTauri) await invoke("flush_audio_buffer");
                } catch (e) {
                    console.warn("[Recording] flush_audio_buffer:", e);
                }
                if (volumeInterval) {
                    clearInterval(volumeInterval);
                    volumeInterval = null;
                }
                currentVolume = 0;
                vadManager.stop();
                if (autoSaveInterval) {
                    clearInterval(autoSaveInterval);
                    autoSaveInterval = null;
                }
                const vadStats = vadManager.getStats();
                console.log(
                    `[VAD] Session stats: ${(vadStats.totalSpeechTime / 1000).toFixed(1)}s speech, ${vadStats.chunksSent} chunks, ${(vadStats.speechRatio * 100).toFixed(0)}% speech ratio`,
                );
                const duration = recordingStartTime
                    ? Math.floor(
                          (Date.now() - recordingStartTime.getTime()) / 1000,
                      )
                    : 0;
                recordingStartTime = null;
                if (duration >= 1) {
                    try {
                        await runProcessingFlow(duration);
                    } catch (e) {
                        console.error("[RECORDING] Processing flow error:", e);
                    }
                } else {
                    status = "Recording too short (min 1 second)";
                    setTimeout(() => {
                        status = "Ready";
                    }, 2000);
                }
                if (recordingTimerInterval) {
                    clearInterval(recordingTimerInterval);
                    recordingTimerInterval = null;
                }
                elapsedRecordingSeconds = 0;
                
                if (transcripts.length > 0 || graphNodes.length > 0) {
                    await saveSession(true);
                    console.log("[RECORDING] Safety-net final save complete");
                }
            } else {
                // === START RECORDING (HIGH-CONFIDENCE INIT) ===
                // UI feedback MUST be immediate
                isRecording = true; 
                isRecordingStarting = true;
                elapsedRecordingSeconds = 0;
                
                // Start UI timer immediately
                recordingTimerInterval = setInterval(() => {
                    elapsedRecordingSeconds++;
                }, 1000);
                
                untrackHandle(async () => {
                    // 1. Determine session continuation
                    const CONTINUE_WINDOW_MS = 120_000;
                    const canContinue = !forceNewSession && currentSession && currentSession.updated_at &&
                        transcripts.length > 0 && (Date.now() - new Date(currentSession.updated_at).getTime() < CONTINUE_WINDOW_MS);
                    forceNewSession = false;

                    if (canContinue) {
                        const partNum = (currentSession.parts?.length || 0) + 1;
                        if (!currentSession.parts) currentSession.parts = [];
                        currentSession.parts.push({
                            partNumber: partNum,
                            startedAt: new Date().toISOString(),
                            transcriptStartIndex: transcripts.length,
                        });
                        localInsights = [];
                    } else {
                        // SAVE OLD: Note this is inside untrack so it's safe
                        if (currentSession && (transcripts.length > 0 || graphNodes.length > 0)) {
                            saveCurrentSessionToCache();
                        }
                        transcripts = [];
                        graphNodes = [];
                        graphEdges = [];
                        localInsights = [];
                        
                        const now = new Date();
                        currentSession = {
                            id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `session_${Date.now()}`,
                            created_at: now.toISOString(),
                            updated_at: now.toISOString(),
                            transcripts: [],
                            graph_nodes: [],
                            graph_edges: [],
                            metadata: { title: `Session ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`, duration_seconds: 0, total_transcripts: 0, total_speakers: 0, tags: [] },
                            summary: null,
                            parts: [{ partNumber: 1, startedAt: now.toISOString(), transcriptStartIndex: 0 }],
                        };
                    }

                    // 2. Start services (Atomic)
                    try { if (isRunningInTauri) { await invoke("reset_audio_loop"); await invoke("clear_whisper_context"); } } catch (e) { console.warn("[Recording] Init failed:", e); }

                    // REALTIME_v1: Initialize Whisper unconditionally at every recording start.
                    // Whisper is a LOCAL model — it does not need an API key.
                    // Previously it was only initialized inside backgroundRecordingInit which is
                    // gated on keyState.keys.length > 0, and ran AFTER start_processing_loop.
                    // The smart_audio_loop checks whisper_ready before processing ANY audio, so
                    // if Whisper was still loading when audio arrived, nothing got transcribed
                    // until after stop (flush_audio_buffer). Firing init HERE ensures Whisper
                    // is loading from the very first moment of recording.
                    if (isRunningInTauri) {
                        if (!whisperReady) whisperLoading = true;
                        invoke("initialize_whisper", { modelSize: "small" })
                            .then(() => { whisperReady = true; whisperLoading = false; })
                            .catch(e => {
                                whisperLoading = false;
                                console.warn("[Recording] Whisper background init:", e);
                            });
                    }

                    currentVolume = 0;
                    try { if (isRunningInTauri) await invoke("start_audio_capture"); } catch (e) { console.warn("[Recording] Capture backend fail:", e); }
                    
                    recordingStartTime = new Date();
                    status = "Listening for speech...";
                    
                    // 3. Handlers & Intervals
                    vadManager.start();
                    volumeInterval = setInterval(pollVolume, 100);
                    autoSaveInterval = setInterval(() => saveSession(false), 30000);
                    
                    try { if (isRunningInTauri) await invoke("start_processing_loop"); } catch (e) { console.warn("[Recording] Processing loop fail:", e); }
                    
                    if (keyState.keys.length > 0) {
                        backgroundRecordingInit({
                            selectedModel,
                            onSpeakerIdReady: () => { speakerIdInitialized = true; },
                            onSpeakerIdStatusRefresh: doRefreshSpeakerIdStatus,
                        }).then(res => {
                            isGeminiConnected = res.isGeminiConnected;
                            if (res.apiKey) apiKey = res.apiKey;
                            status = res.status;
                            if (res.error) showToast(res.error, "warning");
                        });
                    }
                    
                    try { new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleicAV63E25NbIACf08HmjFgT").play(); } catch { }

                    // Services are up, but we keep isRecordingStarting for another 800ms 
                    // to allow UI animations and backend buffers to settle.
                    setTimeout(() => { 
                        isRecordingStarting = false;
                        console.log("[Recording] Stabilization window complete.");
                    }, 1200);
                });
            }
        } catch (error: any) {
            console.error("Capture error:", error);
            const errMsg = error?.message || String(error);
            // FIX: Provide specific guidance for microphone permission denial (EC-001)
            if (errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('denied') || errMsg.toLowerCase().includes('notallowed')) {
                showToast("Microphone access denied. Please check your browser or OS microphone permissions.", "error");
            } else {
                showToast(`Recording failed: ${errMsg}`, "error");
            }
            status = `Capture Error: ${errMsg}`;
            processingError = errMsg;
            isRecording = false;
            isRecordingStarting = false;
        }
    }

    // ============================================================
    // PROCESSING FLOW
    // ============================================================
    async function runProcessingFlow(duration: number) {
        isProcessing = true;
        processingStep = 0;
        processingError = null;
        status = "Processing recording...";
        try {
            // Step 1: Save
            processingStep = 1;
            status = "Saving recording...";
            await saveSession(true);

            // Step 2: Wait for transcription
            processingStep = 2;
            status = "Waiting for transcription to complete...";
            if (isGeminiConnected) {
                const countBefore = transcripts.length;
                await waitForTranscriptions(
                    duration,
                    () => transcripts.length,
                    countBefore,
                    (s) => {
                        status = s;
                    },
                );
                lastRequestTime = new Date().toLocaleTimeString();
            } else {
                await new Promise((r) => setTimeout(r, 1000));
                transcripts = [
                    ...transcripts,
                    {
                        id: `rec_${Date.now()}`,
                        timestamp: new Date().toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        }),
                        speaker: "Recording",
                        speakerId: 0,
                        text: `[${duration}s audio recorded - connect to Gemini AI to transcribe]`,
                        confidence: 0,
                        isPartial: false,
                    },
                ];
            }
            // Promote any remaining partial transcripts before processing
            const promoted = promotePartialTranscripts();
            if (promoted > 0) {
                console.log(
                    `[PROCESSING] Promoted ${promoted} partial transcripts before processing`,
                );
            }
            // Clear the promotion timer since we've handled it
            if (partialPromotionTimer) {
                clearTimeout(partialPromotionTimer);
                partialPromotionTimer = null;
            }

            if (transcripts.length === 0) {
                processingStep = 7;
                status = "No speech detected in recording.";
                await saveSession(true);
                setTimeout(() => {
                    isProcessing = false;
                    processingStep = 0;
                    status = "Ready";
                }, 3000);
                return;
            }

            // Step 3: Tone analysis
            processingStep = 3;
            status = "Analyzing vocal topography...";
            const tones = analyzeToneDistribution(transcripts);
            stressLevel = tones.stressLevel;
            engagementLevel = tones.engagementLevel;
            urgencyLevel = tones.urgencyLevel;
            clarityLevel = tones.clarityLevel;
            await new Promise((r) => setTimeout(r, 100));

            // Step 4: Knowledge graph (enhanced with Gemini extraction)
            processingStep = 4;
            status = "Building knowledge graph...";
            // First build basic graph from transcript data
            const basicGraph = buildGraphFromTranscripts(
                transcripts,
                graphNodes,
                graphEdges,
                (c, t) => {
                    if (transcripts.length > 5)
                        status = `Building knowledge graph... (${c}/${t})`;
                },
            );
            graphNodes = basicGraph.nodes;
            graphEdges = basicGraph.edges;

            // KG_CLEANUP_SELF_HEALING_v1: Gemini batch extraction REPLACES the live graph.
            // Pass empty arrays (not existing junk nodes) so Gemini builds a FRESH clean graph
            // from the full transcript. This is the auto-heal on recording stop.
            if (!isRecording) {
                try {
                    status = "Rebuilding knowledge graph...";
                    const getApiKey = () => keyManager.getCurrentKey()?.key || null;
                    const extractedGraph = await extractKnowledgeGraph(
                        transcripts,
                        [], // SELF_HEALING_FIXED: start fresh — replace live junk graph
                        [], // with clean Gemini-extracted entities and relations
                        getApiKey,
                    );
                    graphNodes = extractedGraph.nodes;
                    graphEdges = extractedGraph.edges;
                    if (extractedGraph.error) {
                        console.warn(
                            `[PROCESSING] Graph extraction note: ${extractedGraph.error}`,
                        );
                    } else {
                        console.log(`[PROCESSING] Graph rebuilt: ${graphNodes.length} nodes, ${graphEdges.length} edges`);
                    }
                } catch (e) {
                    console.warn(
                        "[PROCESSING] Enhanced graph extraction failed, using basic graph:",
                        e,
                    );
                }
            } else {
                console.log("[PROCESSING] Skipping Gemini extraction — still recording (live graph intact)");
            }
            // KG_CLEANUP_SELF_HEALING_v1: Apply quality rules → self-heal → auto-cluster
            {
                const cleaned = applyGraphQualityRules(graphNodes, graphEdges);
                // Self-heal removes residual junk (generic concepts, orphaned nodes)
                const healed = selfHealGraph(cleaned.nodes, cleaned.edges);
                _originalGraphNodes = [...healed.nodes];
                _originalGraphEdges = [...healed.edges];
                const clustered = autoClusterGraph(healed.nodes, healed.edges, 20);
                graphNodes = clustered.nodes;
                graphEdges = clustered.edges;
            }
            // Fallback: if graph is still very thin after all extraction attempts,
            // force a local-only rebuild from raw transcript text
            // KG_REDESIGN_v1: Count only real content nodes (exclude deprecated Root/Speaker utility nodes)
            const nonRootNodes = graphNodes.filter(
                (n) => n.type !== "Root" && n.type !== "Speaker",
            );
            if (nonRootNodes.length < 3 && transcripts.length > 0) {
                console.log(
                    "[PROCESSING] Graph too thin — forcing local-only rebuild",
                );
                status = "Building local knowledge graph...";
                const localResult = await extractKnowledgeGraph(
                    transcripts,
                    [], // KG_REDESIGN_v1: Graph starts empty — no dummy Start node
                    [],
                    () => null, // Force local extraction by passing no API key
                );
                const localCleaned = applyGraphQualityRules(
                    localResult.nodes,
                    localResult.edges,
                );
                _originalGraphNodes = [...localCleaned.nodes];
                _originalGraphEdges = [...localCleaned.edges];
                const localClustered = autoClusterGraph(
                    localCleaned.nodes,
                    localCleaned.edges,
                    20,
                );
                graphNodes = localClustered.nodes;
                graphEdges = localClustered.edges;
            }
            console.log(
                `[PROCESSING] Step 4 complete. Graph: ${graphNodes.length} nodes, ${graphEdges.length} edges`,
            );
            await new Promise((r) => setTimeout(r, 100));

            // Step 5: Intelligence extraction
            processingStep = 5;
            status = "Extracting intelligence insights...";
            if (transcripts.length > 0) {
                try {
                    await intelligenceExtractor.extractFromTranscript(
                        transcripts.map((t) => ({
                            ...t,
                            speakerId: t.speakerId || 1,
                        })),
                    );
                } catch (e) {
                    console.error("Intelligence extraction failed:", e);
                }
            }
            await new Promise((r) => setTimeout(r, 100));

            // Step 6: Final save
            processingStep = 6;
            status = "Saving final session data...";
            await saveSession(true);
            await new Promise((r) => setTimeout(r, 100));

            // Step 7: Complete
            processingStep = 7;
            status = "Processing complete!";
            activeTab = "transcript";
            try {
                new Audio(
                    "data:audio/wav;base64,UklGRl8GAABXQVZFZm10IBAAAAABAAEAIlYAAEAfAAACABAAAABkYXRhPQYAAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAIA/",
                ).play();
            } catch {
                /* ignore */
            }
            setTimeout(() => {
                isProcessing = false;
                processingStep = 0;
                status = "Ready";
            }, 3000);
        } catch (error: any) {
            console.error("Processing error:", error);
            processingError = `Processing failed: ${error?.message || String(error)}`;
            status = `Error: ${processingError}`;
            isProcessing = false;
        }
    }

    // ============================================================
    // EVENT LISTENERS + LIFECYCLE
    // ============================================================

    onMount(async () => {
        if (typeof window !== "undefined" && window.innerWidth >= 1024) {
            isSidebarOpen = true;
        }

        // Initialize from store
        selectedModel = $settingsStore.geminiModel;
        debugMode = $settingsStore.debugMode;

        // MEETING_TASKS_v1: Task 1.3 — Push tier to Rust backend on startup
        if (isRunningInTauri || typeof window !== 'undefined') {
            try {
                await invoke("set_user_tier", { tier: $settingsStore.userTier ?? 'paid' });
            } catch (_) { /* non-fatal if Tauri not ready yet */ }
        }
        
        const savedKey = localStorage.getItem("gemini_api_key");
        if (savedKey) apiKey = savedKey;

        isRunningInTauri = typeof window !== "undefined" && 
            !!((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__);
            
        // Only log detection once to keep console clean
        if (!(window as any).__TAURI_LOGGED__) {
            console.log("[INIT] Tauri environment detected:", isRunningInTauri);
            (window as any).__TAURI_LOGGED__ = true;
        }
        if (isRunningInTauri) {
            try {
                await invoke("list_audio_devices");
            } catch (e) {
                console.warn("[INIT] Invoke test failed:", e);
            }
        }

        try {
            await loadDevices();
            loadApiKeysFromStorage();

            if (isRunningInTauri) {
                status = "Initializing Intelligence...";
                const connectionResult = await keyManager.validateOnStartup();
                if (connectionResult.success) {
                    isGeminiConnected = true;
                    apiKey = connectionResult.key?.key || "";
                    
                    // AUTO-CONNECT LOGIC
                    if ($settingsStore.autoConnect) {
                        status = "Auto-connecting to Intelligence Engine...";
                        await connectGemini();
                        status = "Intelligence Engine Connected ✓";
                    } else {
                        status = "Intelligence Engine Ready (Manual)";
                    }
                } else {
                    isGeminiConnected = false;
                    status = "Offline - Click settings to add API key";
                }
            } else {
                status = "Browser Mode - Settings disabled";
            }

            await loadInitialData();

            // REALTIME_v1: Pre-warm Whisper model in the background so it is ready
            // before the user starts their first recording. Whisper (local model, ~500MB)
            // can take 30-120s to load on the first cold run. By firing this here we
            // overlap that latency with the user configuring settings / reviewing past
            // sessions. If it fails (model not yet downloaded) it will retry at recording start.
            if (isRunningInTauri) {
                whisperLoading = true;
                invoke("initialize_whisper", { modelSize: "small" })
                    .then(() => {
                        whisperReady = true;
                        whisperLoading = false;
                        console.log("[PREWARM] Whisper model pre-loaded ✓ — real-time transcription ready");
                    })
                    .catch(e => {
                        whisperLoading = false;
                        console.warn("[PREWARM] Whisper pre-warm (will retry at recording start):", e);
                    });
            }

            listen("cognivox:whisper_progress", (event: any) => {
                whisperProgress = event.payload.percent;
                if (whisperProgress >= 100) {
                    // Handled by initialize_whisper resolution, but safe to set here too
                }
            });

            // Setup subscriptions
            setupKeyManagerSubscription({
                onStateUpdate: (state) => {
                    keyState = state;
                    isRateLimited = state.keys.some((k) => k.rateLimited);
                    const activeKey = state.keys.find((k) => k.isActive);
                    if (activeKey) apiKey = activeKey.key;
                },
                onKeySwitch: (key, message) => {
                    apiKey = key.key;
                    showToast(message, "warning");
                    if (isRecording && isRunningInTauri)
                        invoke("update_gemini_key", { key: key.key }).catch(
                            console.error,
                        );
                },
                onAllExhausted: () =>
                    showToast(
                        "All keys exhausted – add more in Settings",
                        "error",
                    ),
                isRecording: () => isRecording,
            });

            const vadSubs = setupVADSubscription({
                onVADStateUpdate: (state, rec, proc) => {
                    untrackHandle(() => {
                        vadState = state;
                        if (rec && !proc) {
                            if (state.status === "buffering")
                                status = "Speaking detected – analyzing live...";
                            else if (state.status === "sending")
                                status = "Sending chunk to Intelligence Engine...";
                            else if (state.isSpeaking)
                                status = "Speaking detected – analyzing live...";
                            else status = "Listening for speech...";
                        }
                    });
                },
                onChunk: (_chunk, rec) => {
                    untrackHandle(() => {
                        if (rec) status = "Analyzing speech...";
                    });
                },
                getRecordingState: () => ({ isRecording, isProcessing }),
            });
            vadUnsubscribe = vadSubs.vadUnsubscribe;
            chunkUnsubscribe = vadSubs.chunkUnsubscribe;

            if (isRunningInTauri) {
                unlistenBackendErrors = await setupBackendEventListeners({
                    onKeyRotated: (msg) => showToast(msg, "warning"),
                    onAllExhausted: () =>
                        showToast(
                            "Service disrupted: All keys exhausted",
                            "error",
                        ),
                });

                unlistenStatus = await listen("cognivox:status", (event) => {
                    status = event.payload as string;
                });

                await listen("cognivox:speaker_identified", (event) => {
                    const payload = event.payload as any;
                    lastIdentifiedSpeaker = payload;
                    console.log(
                        `[SPEAKER-ID] ${payload.speaker_label} (confidence: ${payload.confidence.toFixed(3)}, new: ${payload.is_new})`,
                    );
                    if (payload.is_new) doRefreshSpeakerIdStatus();
                });

                unlistenTranscript = await listen(
                    "cognivox:gemini_intelligence",
                    async (event) => {
                        debugEventCount++;
                        debugLastEvent = new Date().toLocaleTimeString();
                        const payload = event.payload as {
                            transcript: string;
                            speaker?: string;
                            intelligence: string;
                            chunk_id?: number;
                            utterance_start_ms?: number;
                        };
                        debugLastTranscript =
                            (payload?.transcript || "").substring(0, 50) +
                            "...";
                        console.log(
                            "[GEMINI] === RECEIVED INTELLIGENCE EVENT ===",
                        );
                        console.log(
                            "[GEMINI] Full payload:",
                            JSON.stringify(event.payload, null, 2),
                        );

                        const segments = parseGeminiPayload(payload);
                        const startTime = performance.now();
                        isTyping = true;
                        if (typingTimer) clearTimeout(typingTimer);

                        // FIX 3: Remove ONLY the partial transcript matching this chunk_id.
                        // Previously filtered ALL partials, which dropped late-arriving chunks.
                        if (payload.chunk_id !== undefined) {
                            transcripts = transcripts.filter(
                                (t) => !(t.isPartial && t.chunkId === payload.chunk_id)
                            );
                        } else {
                            // Fallback for payloads without chunk_id (backward-compat)
                            transcripts = transcripts.filter((t) => !t.isPartial);
                        }

                        for (const seg of segments) {
                            if (
                                !seg.transcript ||
                                seg.transcript.trim().length === 0
                            )
                                continue;
                            console.log(
                                `[GEMINI] Adding segment: speaker=${seg.speaker}, tone=${seg.tone}, text="${seg.transcript.substring(0, 60)}..."`,
                            );
                            // FIX 1: Pass utterance_start_ms so timestamp reflects when user spoke
                            transcripts = [
                                ...transcripts,
                                createTranscriptEntry(seg, payload.utterance_start_ms),
                            ];
                            const graphUpdate = buildGraphFromSegment(
                                seg,
                                graphNodes,
                                graphEdges,
                                $settingsStore.confidenceThreshold,
                                $settingsStore.filters
                            );
                            // FIX 2: Apply additive-only graph updates during live recording
                            // to prevent new intelligence events from displacing existing nodes.
                            const existingNodeIds = new Set(graphNodes.map((n) => n.id));
                            const newNodes = graphUpdate.nodes.filter((n) => !existingNodeIds.has(n.id));
                            const mergedNodes = [...graphNodes, ...newNodes];
                            // KG_CLEANUP_SELF_HEALING_v1: Apply quality rules then self-heal
                            // selfHealGraph removes generic single-word noise (budget-draft, phase, project, etc.)
                            const cleaned = applyGraphQualityRules(mergedNodes, graphUpdate.edges);
                            const healed = selfHealGraph(cleaned.nodes, cleaned.edges);
                            graphNodes = healed.nodes;
                            graphEdges = healed.edges;
                        }
                        console.log(
                            "[GRAPH] Updated:",
                            graphNodes.length,
                            "nodes,",
                            graphEdges.length,
                            "edges",
                        );
                        latencyMs = Math.round(performance.now() - startTime);

                        try {
                            const freshInsights =
                                await intelligenceExtractor.extractFromTranscript(
                                    transcripts.slice(-5),
                                );
                            if (freshInsights) {
                                // Insights are automatically synced to InsightsPanel via singleton subscription.
                                // We update status to show activity.
                                status = "Intelligence updated ✓";
                            }
                        } catch (e) {
                            console.error("Live extraction error:", e);
                        }
                        typingTimer = setTimeout(() => {
                            isTyping = false;
                            partialText = "";
                        }, 2000); // 2s debounce to prevent flicker during fast extraction cycles
                    },
                );

                unlistenIntelligence = await listen(
                    "cognivox:whisper_transcription",
                    (event) => {
                        const intel = event.payload as any;
                        console.log(
                            "[WHISPER] === RECEIVED TRANSCRIPTION ===",
                            intel,
                        );
                        if (intel?.text && intel.text.trim().length > 0) {
                            const whisperSpeaker = intel?.speaker || "You";
                            status = `Whisper (${intel.language}): "${intel.text.substring(0, 50)}..."`;
                            const incomingChunkId = intel?.chunk_id;
                            const utteranceStartMs = intel?.utterance_start_ms;
                            const existingPartial = transcripts.find(
                                // FIX 3: Match exactly by chunkId if available, else any partial
                                (t) => t.isPartial && (incomingChunkId === undefined || t.chunkId === incomingChunkId)
                            );
                            if (existingPartial) {
                                transcripts = transcripts.map((t) =>
                                    t.isPartial && (incomingChunkId === undefined || t.chunkId === incomingChunkId)
                                        ? {
                                              ...t,
                                              text: intel.text,
                                              speaker: whisperSpeaker,
                                          }
                                        : t,
                                );
                            } else {
                                transcripts = [
                                    ...transcripts,
                                    {
                                        // FIX: Pass utteranceStartMs to createPartialTranscript for correct timestamp
                                        ...createPartialTranscript(intel, utteranceStartMs),
                                        // FIX 3: Tag with chunk_id so gemini_intelligence can remove THIS partial specifically
                                        chunkId: incomingChunkId,
                                    },
                                ];
                                console.log(
                                    "[WHISPER] Added partial transcript (chunkId:",
                                    incomingChunkId,
                                    "), total:",
                                    transcripts.length,
                                );
                            }
                            // Schedule promotion ONLY as emergency fallback (Gemini permanently failed)
                            if (isRecording) {
                                schedulePartialPromotion();
                            }
                        }
                    },
                );

                await listen("tray:record", () => {
                    if (!isRecording) toggleCapture();
                });
                await listen("tray:stop", () => {
                    if (isRecording) toggleCapture();
                });

                const appWindow = getCurrentWindow();
                await appWindow.onCloseRequested(async () => {
                    console.log(
                        "[CLOSE] App close requested — saving session to disk...",
                    );
                    try {
                        const snapshot = saveCurrentSessionToCache();
                        if (snapshot && isRunningInTauri) {
                            await invoke("save_session", {
                                sessionJson: JSON.stringify(snapshot),
                            });
                            console.log("[CLOSE] Session saved");
                        }
                    } catch (e) {
                        console.error("[CLOSE] Failed to save:", e);
                    }
                });
            }
        } catch (error) {
            console.error("Failed to initialize Tauri listeners:", error);
            status = "Tauri Init Error: " + error;
        }
        document.addEventListener("keydown", handleKeyDown);
        window.addEventListener("beforeunload", handleBeforeUnload);
    });

    async function loadDevices() {
        if (!isRunningInTauri || typeof invoke === "undefined") {
            devices = [{ id: "mock", name: "Web Preview Mode - Audio Disabled" }];
            return;
        }
        try {
            // Safety check for Tauri internals before calling invoke
            if (typeof window !== "undefined" && ((window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__)) {
                devices = await invoke("list_audio_devices");
            } else {
                throw new Error("Tauri internals not found");
            }
        } catch (error) {
            console.error("[INIT] Device load failed:", error);
            devices = [{ id: "mock", name: "Web Preview Mode - Audio Disabled" }];
            status = "Ready (Browser Mode)";
        }
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.ctrlKey && e.shiftKey) {
            switch (e.key) {
                case "R":
                    e.preventDefault();
                    toggleCapture();
                    break;
                case "S":
                    e.preventDefault();
                    console.log("[HOTKEY] Save session");
                    break;
                case "G":
                    e.preventDefault();
                    activeTab = activeTab === "graph" ? "transcript" : "graph";
                    break;
                case "A":
                    e.preventDefault();
                    activeTab = "alerts";
                    break;
                case "T":
                    e.preventDefault();
                    activeTab = "transcript";
                    break;
            }
        }
        if (e.key === "Escape" && isRecording)
            console.log("[HOTKEY] Escape pressed during recording");
    }

    function handleBeforeUnload() {
        const snapshot = saveCurrentSessionToCache();
        if (snapshot) {
            try {
                localStorage.setItem(
                    "cognivox_pending_save",
                    JSON.stringify(snapshot),
                );
            } catch {
                /* ignore */
            }
        }
    }

    onDestroy(() => {
        if (unlistenStatus) unlistenStatus();
        if (unlistenTranscript) unlistenTranscript();
        if (unlistenIntelligence) unlistenIntelligence();
        if (unlistenBackendErrors) unlistenBackendErrors();
        if (partialPromotionTimer) clearTimeout(partialPromotionTimer);
        document.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("beforeunload", handleBeforeUnload);
    });
</script>

<!-- === DEBUG / STATUS BAR === -->
<DebugBar
    {isRunningInTauri}
    {debugMode}
    {debugEventCount}
    {transcripts}
    {debugLastEvent}
    {isGeminiConnected}
/>

<!-- === RECORDING OVERLAY (Fixed at top during recording) === -->
<RecordingOverlay
    {isRecording}
    {status}
    {currentVolume}
    elapsedSeconds={elapsedRecordingSeconds}
    {isGeminiConnected}
    onopenSettings={() => (showSettingsModal = true)}
    ontoggleCapture={toggleCapture}
/>

<!-- === SETTINGS MODAL === -->
<SettingsModal
    isOpen={showSettingsModal}
    onclose={closeSettings}
    onsave={(e) => {
        showToast("Settings consolidated across all systems", "info");
    }}
    onconnected={(e) => {
        isGeminiConnected = true;
        apiKey = e.detail.key;
        status = "Connected to Gemini ✓";
    }}
/>

<!-- === STATUS BAR (Fixed at bottom) === -->
<StatusBar
    {isGeminiConnected}
    {isRecording}
    apiKeyCount={keyState.keys.length}
    activeKeyName={getActiveKeyName()}
    activeKeyIndex={getActiveKeyIndex()}
    {isRateLimited}
    {lastRequestTime}
    {debugMode}
    requestCount={keyState.totalCalls}
    {whisperReady}
    {whisperLoading}
    {whisperProgress}
    onopenSettings={openSettings}
/>

<!-- === TOAST NOTIFICATION === -->
<ToastNotification message={toastMessage} type={toastType} />

<div
    class="h-screen w-full flex flex-col lg:flex-row bg-white font-sans overflow-hidden {isRecording
        ? 'pt-[72px]'
        : ''} relative"
>
    <!-- MOBILE BACKDROP -->
    {#if isSidebarOpen}
        <div 
            class="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden animate-fadeIn"
            onclick={() => (isSidebarOpen = false)}
        ></div>
    {/if}

    <!-- SIDEBAR CONTAINER -->
    <div class="fixed inset-y-0 left-0 z-50 lg:relative transition-all duration-300 ease-in-out w-[320px] {isSidebarOpen ? 'translate-x-0 lg:ml-0 opacity-100' : '-translate-x-full lg:translate-x-0 lg:-ml-[320px] opacity-0'} overflow-hidden h-full bg-slate-50/30 shrink-0">
        <div class="w-[320px] h-full pb-14"> <!-- Increased pb to clear StatusBar completely -->
            <Sidebar
                {pastSessions}
                {currentSession}
                {graphNodes}
                {graphEdges}
                {activeTab}
                {speakerIdInitialized}
                onsessionLoad={(session) => {
                    handleSessionLoad(session);
                }}
                onsessionDelete={(data) =>
                    handleSessionDelete(data.sessionId, data.event)}
                onrefreshSessions={refreshSessionList}
                ontabChange={(tab) => {
                    activeTab = tab;
                }}
                ontoggleCluster={handleToggleCluster}
            />
        </div>
    </div>

    <!-- MAIN CONTENT -->
    <div class="flex-1 flex flex-col min-w-0 h-full overflow-hidden pb-10">
        <!-- HEADER BAR -->
        <MainHeader
            {status}
            {isRecording}
            {isProcessing}
            {isRecordingStarting}
            {keyState}
            {isGeminiConnected}
            {isSidebarOpen}
            {vadState}
            {whisperReady}
            {whisperLoading}
            recordingSeconds={elapsedRecordingSeconds}
            hasExistingSession={pastSessions.length > 0}
            forceNewSession={forceNewSession}
            ontoggleSidebar={() => (isSidebarOpen = !isSidebarOpen)}
            onopenSettings={() => (showSettingsModal = true)}
            ontoggleCapture={toggleCapture}
            onnewSession={() => (forceNewSession = true)}
        />

        <!-- CONTENT AREA -->
        <div class="flex-1 overflow-auto min-h-0 p-4 sm:p-6 lg:p-8">
            <div class="max-w-5xl mx-auto space-y-fluid-gap">


                <!-- === PROCESSING PROGRESS (shows after recording stops) === -->
                <ProcessingProgress
                    {isProcessing}
                    currentStep={processingStep}
                    error={processingError}
                    ondismiss={dismissProcessing}
                    onretry={retryProcessing}
                />

                <!-- === LIVE RECORDING PANEL (shows during recording) === -->
                <LiveRecordingPanel
                    {isRecording}
                    {isRecordingStarting}
                    {currentVolume}
                    {isGeminiConnected}
                    {transcripts}
                    {graphNodes}
                    {graphEdges}
                    recordingSeconds={elapsedRecordingSeconds}
                    bind:stressLevel
                    bind:engagementLevel
                    bind:urgencyLevel
                    bind:clarityLevel
                />

                <!-- Search Bar -->
                <div class="flex gap-3">
                    <div class="flex-1 relative">
                        <svg
                            class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1"
                        >
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input
                            type="text"
                            placeholder="Search semantic logs..."
                            bind:value={searchQuery}
                            onkeydown={(e) => { if(e.key === 'Enter') activeTab = 'search'; }}
                            class="search-input"
                        />
                    </div>
                    <select bind:value={searchFilter} class="select-field w-28">
                        <option value="all">All</option>
                        <option value="speaker">By Speaker</option>
                        <option value="category">By Category</option>
                    </select>
                </div>

                {#if activeTab === "transcript"}
                    <TranscriptView
                        {transcripts}
                        {graphNodes}
                        {graphEdges}
                        {isCollapsed}
                        {debugMode}
                        {debugEventCount}
                        {debugLastEvent}
                        {debugLastTranscript}
                        onexpandGraph={() => (activeTab = "graph")}
                    />
                    <SummaryPanel
                        show={showSummaryPanel}
                        {extractedSummary}
                        onclose={closeSummaryPanel}
                    />
                    <MemoriesPanel
                        show={showMemoriesPanel}
                        {extractedMemories}
                        onclose={closeMemoriesPanel}
                    />
                {:else if activeTab === "alerts"}
                    <AlertsTab {alerts} onclearAlerts={() => (alerts = [])} />
                {:else if activeTab === "analytics"}
                    <AnalyticsTab
                        {transcripts}
                        {graphNodes}
                        {latencyMs}
                        {isGeminiConnected}
                        {isRecording}
                    />
                {:else if activeTab === "settings"}
                    <SettingsTab
                        bind:selectedModel={selectedModel}
                        bind:apiKey={apiKey}
                        isGeminiConnected={isGeminiConnected}
                        captureMode={captureMode}
                        currentVolume={currentVolume}
                        isRecording={isRecording}
                        on:settingsChange={(e) =>
                            handleSettingsChange(e.detail)}
                        on:connectGemini={connectGemini}
                        on:setCaptureMode={(e) => setCaptureMode(e.detail)}
                    />
                {:else if activeTab === "diagnostics"}
                    <Diagnostics {isRecording} {isGeminiConnected} />
                {:else if activeTab === "speakers"}
                    <SpeakersTab
                        {speakerIdInitialized}
                        {speakerIdStatus}
                        {speakerProfiles}
                        {lastIdentifiedSpeaker}
                        oninitializeSpeakerId={initializeSpeakerId}
                        onclearSpeakerProfiles={clearSpeakerProfiles}
                        onrenameSpeaker={(e) =>
                            renameSpeaker(
                                e.detail.speakerId,
                                e.detail.newLabel,
                            )}
                    />
                {:else if activeTab === "tasks"}
                    <div class="h-[600px] w-full bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden animate-fadeIn">
                        <InsightsPanel />
                    </div>
                {:else if activeTab === "ledger"}
                    <DecisionLedger {transcripts} {graphNodes} />
                {:else if activeTab === "overview"}
                    <ProjectOverview {transcripts} {graphNodes} {pastSessions} />
                {:else if activeTab === "search"}
                    <SearchTab {transcripts} {graphNodes} initialQuery={searchQuery} />
                {/if}

                <!-- KG_SYNC_v1: GraphTab always mounted (CSS-toggled) to preserve KnowledgeGraph physics state across tab switches.
                     Conditional rendering caused positions map to reset every tab switch → layout scrambled each visit. -->
                <div class="{activeTab !== 'graph' ? 'hidden' : ''}">
                    <GraphTab
                        bind:this={graphTabRef}
                        {graphNodes}
                        {graphEdges}
                        {transcripts}
                        {searchQuery}
                        isGenerating={isGeneratingGraph}
                        ongenerateGraph={handleGenerateGraph}
                        onclearGraph={handleClearGraph}
                        onselfHealGraph={handleSelfHealGraph}
                        ontoggleCluster={handleToggleCluster}
                        onlayoutChanged={handleGraphLayoutChanged}
                        {isRecording}
                        {isRecordingStarting}
                        initialPositions={currentSession?.graph_positions || null}
                    />
                </div>
            </div>
        </div>

        <!-- BOTTOM ACTION BAR -->
        <BottomActionBar
            {extractError}
            {isCollapsed}
            {transcripts}
            {showMemoriesPanel}
            {showSummaryPanel}
            {isExtractingMemories}
            {isExtractingSummary}
            ontoggleCollapse={toggleCollapseState}
            onextractMemories={extractMemories}
            onextractSummary={extractSummary}
        />
    </div>
</div>
