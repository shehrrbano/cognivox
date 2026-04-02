/**
 * connectionService.ts
 * Gemini connection, key manager subscription, VAD subscription, backend event listeners.
 */
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { keyManager, type KeyManagerState } from "$lib/keyManager";
import { vadManager, type VADState } from "$lib/vadManager";

// ============================================================
// GEMINI CONNECTION
// ============================================================

/**
 * Connect to Gemini API — initializes Whisper + ECAPA-TDNN, tests connection.
 * Returns new state values.
 */
export async function connectGemini(params: {
    apiKey: string;
    selectedModel: string;
    isRunningInTauri: boolean;
}): Promise<{
    isGeminiConnected: boolean;
    status: string;
}> {
    const { apiKey, selectedModel, isRunningInTauri } = params;

    console.log("[CONNECT] Starting connection sequence...");
    if (!apiKey) {
        console.warn("[CONNECT] No API Key found");
        return { isGeminiConnected: false, status: "API Key Required" };
    }

    localStorage.setItem("gemini_api_key", apiKey);
    localStorage.setItem("gemini_model", selectedModel);

    if (!isRunningInTauri) {
        return { isGeminiConnected: false, status: "Browser Mode - Cannot connect" };
    }

    try {
        try {
            await invoke("initialize_whisper", { modelSize: "small" });
            await invoke("set_whisper_language", { language: "auto" });
            console.log("[WHISPER] Initialized with auto language detection");
        } catch (e) {
            console.warn("[WHISPER] Initialization failed:", e);
        }

        console.log(`[CONNECT] Invoking test_gemini_connection with key length ${apiKey.length}`);

        const result = await invoke("test_gemini_connection", {
            key: apiKey,
            model: selectedModel,
        });

        console.log("[CONNECT] Result:", result);
        await new Promise((r) => setTimeout(r, 100));
        console.log("[CONNECT] isGeminiConnected set to true");
        return { isGeminiConnected: true, status: "Connected to Intelligence Engine" };
    } catch (error) {
        console.error("[CONNECT] Failed:", error);
        console.warn(
            "[CONNECT] Creating connection despite error - audio loop handles retries",
        );
        return {
            isGeminiConnected: true,
            status: "Connection issue: " + error + " - will retry",
        };
    }
}

// ============================================================
// KEY MANAGER SUBSCRIPTION
// ============================================================

/**
 * Subscribe to key manager state updates.
 * Uses callbacks to communicate state changes back to the Svelte component.
 */
export function setupKeyManagerSubscription(callbacks: {
    onStateUpdate: (state: KeyManagerState) => void;
    onKeySwitch: (key: any, message: string) => void;
    onAllExhausted: () => void;
    isRecording: () => boolean;
}): void {
    let prevIndex = keyManager.getState().currentIndex;
    let prevCount = keyManager.getState().keys.length;

    keyManager.subscribe((state) => {
        callbacks.onStateUpdate(state);

        // Key switch detection
        if (
            state.keys.length > 1 &&
            state.currentIndex !== prevIndex &&
            prevCount === state.keys.length
        ) {
            const activeKey = state.keys.find((k) => k.isActive);
            if (activeKey) {
                const message = `Key exhausted – switching to ${activeKey.name} (Key ${state.currentIndex + 1}/${state.keys.length})`;
                callbacks.onKeySwitch(activeKey, message);

                if (callbacks.isRecording()) {
                    if (typeof window !== "undefined" && ((window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__)) {
                        invoke("update_gemini_key", { key: activeKey.key }).catch((err) =>
                            console.error("[TAURI] Failed to update key:", err),
                        );
                    }
                }
            }
        }

        // All keys exhausted
        if (
            state.keys.length > 0 &&
            state.keys.every((k) => k.isDisabled || k.rateLimited)
        ) {
            callbacks.onAllExhausted();
        }

        prevIndex = state.currentIndex;
        prevCount = state.keys.length;
    });
}

// ============================================================
// BACKEND EVENT LISTENERS
// ============================================================

/**
 * Listen for backend API errors and trigger key rotation.
 */
export async function setupBackendEventListeners(callbacks: {
    onKeyRotated: (message: string) => void;
    onAllExhausted: () => void;
}): Promise<() => void> {
    const unlisten = await listen("cognivox:api_error", async (event: any) => {
        const { code, message } = event.payload;
        console.warn(`[BACKEND] API Error: ${code} - ${message}`);

        const result = keyManager.handleError(code, message);

        if (result.switched && result.newKey) {
            try {
                await invoke("update_gemini_key", { key: result.newKey.key });
                console.log(`[BACKEND] Rotated key to: ${result.newKey.name}`);
            } catch (e) {
                console.error(`[BACKEND] Failed to push rotated key:`, e);
            }
            callbacks.onKeyRotated(result.message);
        } else {
            callbacks.onAllExhausted();
        }
    });

    return unlisten;
}

// ============================================================
// VAD SUBSCRIPTION
// ============================================================

/**
 * Subscribe to VAD (Voice Activity Detection) state changes and chunk events.
 */
export function setupVADSubscription(callbacks: {
    onVADStateUpdate: (state: VADState, isRecording: boolean, isProcessing: boolean) => void;
    onChunk: (chunk: any, isRecording: boolean) => void;
    getRecordingState: () => { isRecording: boolean; isProcessing: boolean };
}): { vadUnsubscribe: () => void; chunkUnsubscribe: () => void } {
    const vadUnsubscribe = vadManager.subscribe((state) => {
        const { isRecording, isProcessing } = callbacks.getRecordingState();
        callbacks.onVADStateUpdate(state, isRecording, isProcessing);
    });

    const chunkUnsubscribe = vadManager.onChunk(async (chunk) => {
        console.log(`[VAD] Chunk detected: ${(chunk.duration / 1000).toFixed(1)}s`);
        const { isRecording } = callbacks.getRecordingState();
        callbacks.onChunk(chunk, isRecording);
    });

    return { vadUnsubscribe, chunkUnsubscribe };
}

// ============================================================
// RECORDING BACKGROUND INIT
// ============================================================

/**
 * Background initialization sequence for recording start.
 * Initializes Whisper, Speaker ID, validates API key, tests connection.
 * Returns updated state.
 */
export async function backgroundRecordingInit(params: {
    selectedModel: string;
    onSpeakerIdReady: () => void;
    onSpeakerIdStatusRefresh: () => Promise<void>;
}): Promise<{
    isGeminiConnected: boolean;
    apiKey: string;
    status: string;
    error?: string;
}> {
    try {
        // STEP 1: Init Whisper + Speaker ID in PARALLEL (Tauri only)
        const isTauri = typeof window !== "undefined" && !!((window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__);
        
        const [whisperResult, speakerResult] = await Promise.allSettled([
            (async () => {
                if (!isTauri) return;
                await invoke("initialize_whisper", { modelSize: "small" });
                await invoke("set_whisper_language", { language: "auto" });
                console.log("[Recording] Whisper ready (small, auto-detect)");
            })(),
            (async () => {
                if (!isTauri) return;
                await invoke("initialize_speaker_id");
                params.onSpeakerIdReady();
                console.log("[Recording] ECAPA-TDNN speaker ID ready");
                await params.onSpeakerIdStatusRefresh();
            })(),
        ]);

        if (whisperResult.status === "rejected") {
            console.log(
                "[Recording] Whisper already initialized or skipped:",
                whisperResult.reason,
            );
        }
        if (speakerResult.status === "rejected") {
            console.warn(
                "[Recording] Speaker ID init failed (non-blocking):",
                speakerResult.reason,
            );
        }

        // STEP 2: Get a working API key
        const keyResult = await keyManager.getNextWorkingKeyFast();
        if (!keyResult.success || !keyResult.key) {
            return {
                isGeminiConnected: false,
                apiKey: "",
                status: "Recording (AI offline — check API keys)",
                error: `AI processing unavailable: ${keyResult.message}. Audio is still being captured.`,
            };
        }

        const apiKey = keyResult.key.key;
        console.log("[Recording] Ready with key:", keyResult.key?.name);

        // STEP 3: Test Gemini connection (Tauri only)
        if (isTauri) {
            try {
                await invoke("test_gemini_connection", {
                    key: keyResult.key!.key,
                    model: params.selectedModel,
                });
                console.log(`[Recording] Connected with key: ${keyResult.key!.name}`);
            } catch (e: any) {
                const errMsg = e?.message || String(e);
                console.warn(`[Recording] Backend test warning: ${errMsg}`);

                // Try to silently rotate to next key
                const nextKey = keyManager.rotateToNextKey();
                if (nextKey) {
                    try {
                        await invoke("update_gemini_key", { key: nextKey.key });
                        console.log(
                            `[Recording] Rotated to ${nextKey.name} after initial test failure`,
                        );
                        return {
                            isGeminiConnected: true,
                            apiKey: nextKey.key,
                            status: "Listening for speech...",
                        };
                    } catch (_) {
                        /* ignore */
                    }
                }
            }
        } else {
            console.log("[Recording] Browser mode: skipping backend connection test");
        }

        return {
            isGeminiConnected: true,
            apiKey,
            status: "Listening for speech...",
        };
    } catch (initErr) {
        console.error("[Recording] Background init error:", initErr);
        return {
            isGeminiConnected: false,
            apiKey: "",
            status: "Recording (AI init failed)",
        };
    }
}

/**
 * Wait for transcriptions to stabilize after recording stops.
 * Returns when no new transcripts arrive for stabilityThreshold ms, or maxWait is exceeded.
 */
export async function waitForTranscriptions(
    duration: number,
    getTranscriptCount: () => number,
    initialCount: number,
    onProgress: (status: string) => void,
): Promise<{ newTranscripts: number; waitTime: number }> {
    let lastTranscriptCount = initialCount;
    let stableTime = 0;
    const waitStart = Date.now();
    // CPU-only Whisper can take 10-30x real-time. Give enough time:
    // At least 15s, up to 3 minutes for longer recordings, max 5 minutes.
    const maxWait = Math.min(Math.max(15000, duration * 5000), 300000);
    const stabilityThreshold = 5000;

    while (stableTime < stabilityThreshold && Date.now() - waitStart < maxWait) {
        await new Promise((r) => setTimeout(r, 300));
        const currentCount = getTranscriptCount();
        if (currentCount > lastTranscriptCount) {
            lastTranscriptCount = currentCount;
            stableTime = 0;
            const newCount = currentCount - initialCount;
            onProgress(
                `Transcribing... (${newCount} segment${newCount > 1 ? "s" : ""} received)`,
            );
        } else {
            stableTime += 300;
            // Show waiting progress so user knows the system is working
            const elapsed = Math.floor((Date.now() - waitStart) / 1000);
            if (stableTime < stabilityThreshold) {
                onProgress(`Waiting for Whisper transcription... (${elapsed}s)`);
            }
        }
    }

    const newTranscripts = getTranscriptCount() - initialCount;
    const waitTime = Date.now() - waitStart;
    console.log(
        `[PROCESSING] Step 2 complete. New transcripts: ${newTranscripts} (waited ${(waitTime / 1000).toFixed(1)}s)`,
    );

    return { newTranscripts, waitTime };
}
