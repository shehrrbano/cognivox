/**
 * ragflowBootstrap.ts
 * ZERO_CONFIG_RAGFLOW_AUTO_SETUP_v1
 *
 * Auto-configures RAGFlow on first app launch so end users never touch a setup
 * screen. Responsible for:
 *   1. Hard-coding the default RAGFlow URL (localhost:9380) into the settings
 *      store if the user hasn't overridden it.
 *   2. Picking up a bundled API key from the Vite build-time env
 *      (VITE_RAGFLOW_DEFAULT_API_KEY) so distributables ship pre-authenticated.
 *   3. Probing the backend, and once reachable, auto-creating the default
 *      "My Lectures" dataset and pinning its ID as the active knowledge base.
 *   4. Retrying in the background with bounded attempts so a slow-starting
 *      RAGFlow container still gets picked up after the UI has rendered.
 *
 * The whole thing is idempotent: it can be called on every launch without
 * clobbering user overrides set via Dev Mode.
 */

import { get } from 'svelte/store';
import { settingsStore } from '$lib/settingsStore';
import {
    checkRAGFlowStatus,
    listDatasets,
    createDataset,
} from './ragflowService';

// ============================================================================
// ZERO-CONFIG CONSTANTS
// ============================================================================

/** Default URL for a locally running RAGFlow instance (native GPU build). */
export const DEFAULT_RAGFLOW_URL = 'http://localhost:9380';

/** Default dataset name auto-created on first launch. */
export const DEFAULT_DATASET_NAME = 'My Lectures';

/** Default dataset description. */
export const DEFAULT_DATASET_DESCRIPTION =
    'Cognivox auto-managed knowledge base. All lecture recordings and uploaded audio are ingested here automatically.';

/**
 * Build-time bundled API key. Distributors drop this into `.env` before
 * `pnpm tauri build` so the final binary ships pre-authenticated. If empty,
 * bootstrap falls back to whatever the user has in localStorage.
 */
const BUNDLED_API_KEY = (import.meta as any).env?.VITE_RAGFLOW_DEFAULT_API_KEY || '';

/** Bundled URL override (rare — defaults to localhost). */
const BUNDLED_URL = (import.meta as any).env?.VITE_RAGFLOW_DEFAULT_URL || DEFAULT_RAGFLOW_URL;

// ============================================================================
// BOOTSTRAP STATE (exported for UI consumption)
// ============================================================================

export type BootstrapPhase =
    | 'idle'
    | 'applying-defaults'
    | 'probing'
    | 'creating-dataset'
    | 'ready'
    | 'offline'
    | 'error';

export interface BootstrapState {
    phase: BootstrapPhase;
    message: string;
    datasetId: string | null;
    datasetName: string | null;
    conversationId: string | null;
    attempt: number;
    lastError?: string;
}

let _state: BootstrapState = {
    phase: 'idle',
    message: 'Zero-config bootstrap idle',
    datasetId: null,
    datasetName: null,
    conversationId: null,
    attempt: 0,
};

type Listener = (state: BootstrapState) => void;
const listeners = new Set<Listener>();

export function getBootstrapState(): BootstrapState {
    return { ..._state };
}

export function onBootstrapChange(listener: Listener): () => void {
    listeners.add(listener);
    listener(getBootstrapState());
    return () => listeners.delete(listener);
}

function updateState(patch: Partial<BootstrapState>): void {
    _state = { ..._state, ...patch };
    const snapshot = getBootstrapState();
    listeners.forEach(fn => {
        try { fn(snapshot); } catch (e) { console.warn('[RAGFlowBootstrap] listener error:', e); }
    });
}

// ============================================================================
// HARD-CODED DEFAULT APPLICATION
// ============================================================================

/**
 * Idempotently applies bundled defaults (URL + API key) to the settings store.
 * Never overwrites a value the user explicitly set.
 */
function applyBundledDefaults(): void {
    updateState({ phase: 'applying-defaults', message: 'Applying zero-config defaults' });
    const current = get(settingsStore);

    const patch: Partial<typeof current> = {};
    if (!current.ragflowUrl) patch.ragflowUrl = BUNDLED_URL;
    if (!current.ragflowApiKey && BUNDLED_API_KEY) patch.ragflowApiKey = BUNDLED_API_KEY;

    if (Object.keys(patch).length) {
        settingsStore.update(s => ({ ...s, ...patch }));
        console.log('[RAGFlowBootstrap] Applied bundled defaults:', Object.keys(patch));
    }
}

// ============================================================================
// AUTO DATASET PROVISIONING
// ============================================================================

/**
 * Returns the dataset ID for "My Lectures", creating it if missing.
 * Reuses an existing dataset if one with the same name is already present
 * (so repeated launches never spawn duplicates).
 */
async function ensureDefaultDataset(): Promise<string | null> {
    updateState({ phase: 'creating-dataset', message: 'Provisioning default knowledge base' });

    const datasets = await listDatasets();
    const existing = datasets.find(d => d.name === DEFAULT_DATASET_NAME);
    if (existing?.id) {
        console.log(`[RAGFlowBootstrap] Reusing existing dataset: ${existing.id}`);
        return existing.id;
    }

    const created = await createDataset(DEFAULT_DATASET_NAME, DEFAULT_DATASET_DESCRIPTION);
    if (created?.id) {
        console.log(`[RAGFlowBootstrap] Created default dataset: ${created.id}`);
        return created.id;
    }

    return null;
}

// ============================================================================
// MAIN BOOTSTRAP ENTRY POINT
// ============================================================================

export interface BootstrapOptions {
    /** Max attempts before giving up and marking offline. Default 10. */
    maxAttempts?: number;
    /** Base delay between retries (ms). Default 3000. */
    retryDelayMs?: number;
}

let _bootstrapping = false;

/**
 * Kicks off the zero-config setup. Non-blocking — safe to call from onMount.
 * Returns a promise that resolves once bootstrap reaches a terminal state
 * ('ready', 'offline', or 'error'). Subsequent calls while running no-op.
 */
export async function initializeRAGFlowAutoSetup(
    options: BootstrapOptions = {},
): Promise<BootstrapState> {
    if (_bootstrapping) return getBootstrapState();
    _bootstrapping = true;

    const maxAttempts = options.maxAttempts ?? 10;
    const retryDelayMs = options.retryDelayMs ?? 3000;

    try {
        applyBundledDefaults();

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            updateState({
                phase: 'probing',
                message: `Connecting to RAGFlow (attempt ${attempt}/${maxAttempts})`,
                attempt,
            });

            const status = await checkRAGFlowStatus();
            if (!status.connected) {
                if (attempt < maxAttempts) {
                    await new Promise(r => setTimeout(r, retryDelayMs));
                    continue;
                }
                updateState({
                    phase: 'offline',
                    message: 'Study Buddy offline — RAGFlow not reachable',
                    lastError: status.error || 'RAGFlow unreachable',
                });
                return getBootstrapState();
            }

            // Connected — provision dataset.
            const current = get(settingsStore);
            let datasetId = current.knowledgeBaseId;
            if (!datasetId) {
                datasetId = (await ensureDefaultDataset()) || '';
            } else {
                // Verify the saved ID still exists. If not, auto-recreate.
                const datasets = await listDatasets();
                if (!datasets.find(d => d.id === datasetId)) {
                    console.log('[RAGFlowBootstrap] Saved knowledgeBaseId stale, re-provisioning');
                    datasetId = (await ensureDefaultDataset()) || '';
                }
            }

            if (!datasetId) {
                updateState({
                    phase: 'error',
                    message: 'Could not auto-create default dataset',
                    lastError: 'createDataset returned null',
                });
                return getBootstrapState();
            }

            settingsStore.update(s => ({ ...s, knowledgeBaseId: datasetId as string }));

            // Hybrid RAG: conversations are local (no RAGFlow LLM needed).
            // Just mark as ready — the chat component creates local conversation
            // IDs on demand and uses RAGFlow retrieval + Gemini for generation.

            updateState({
                phase: 'ready',
                message: 'Study Buddy ready',
                datasetId,
                datasetName: DEFAULT_DATASET_NAME,
                conversationId: null,
                lastError: undefined,
            });
            console.log('[RAGFlowBootstrap] ✓ Zero-config complete — Study Buddy is ready');
            return getBootstrapState();
        }

        return getBootstrapState();
    } catch (e: any) {
        updateState({
            phase: 'error',
            message: 'Bootstrap failed',
            lastError: e?.message || String(e),
        });
        console.error('[RAGFlowBootstrap] Failed:', e);
        return getBootstrapState();
    } finally {
        _bootstrapping = false;
    }
}

/**
 * Public helper for UI: is RAGFlow ready to serve user queries?
 */
export function isStudyBuddyReady(): boolean {
    return _state.phase === 'ready';
}
