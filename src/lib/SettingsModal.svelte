<script lang="ts">
    import { createEventDispatcher, onMount, untrack as svelteUntrack } from "svelte";
    const untrackHandle = typeof svelteUntrack !== 'undefined' ? svelteUntrack : ((fn: any) => fn());
    import { invoke } from "@tauri-apps/api/core";
    import { open } from "@tauri-apps/plugin-opener";
    import { settingsStore } from "./settingsStore";
    import { vadManager } from "./vadManager";
    import {
        keyManager,
        type ApiKey,
        type KeyManagerState,
        type DynamicApiKey,
    } from "./keyManager";
    import type { DynamicModel } from "./types";

    let {
        isOpen = false,
        onclose = () => {}
    } = $props();

    const dispatch = createEventDispatcher();

    let isRunningInTauri = $state(false);
    
    // Check if we're in a Tauri environment once on mount
    onMount(() => {
        isRunningInTauri = typeof window !== "undefined" && 
            !!((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__);
        
        console.log("[Settings] Running in Tauri:", isRunningInTauri);
    });

    // Audio devices
    let audioDevices: string[] = $state([]);
    let selectedDevice = $state("");
    let isLoadingDevices = $state(true);

    // Test microphone
    let isTesting = $state(false);
    let testVolume = $state(0);
    let testInterval: ReturnType<typeof setInterval> | null = null;

    // Settings (Form State)
    let selectedModel = $state("gemini-2.0-flash");
    let confidenceThreshold = $state(0.7);
    let vadSensitivity = $state(0.5);
    let enableDebugMode = $state(false);
    let autoConnect = $state(false);
    let captureMode = $state("both");
    let userTier = $state<'free' | 'paid'>('paid'); // MEETING_TASKS_v1: Task 1.3

    // VAD Configuration
    let vadMinSpeech = $state(3);
    let vadSilenceTime = $state(1.5);
    let vadMinChunk = $state(2);
    let enableFillerDetection = $state(false);

    // Filters
    let filters = $state({
        tasks: true,
        decisions: true,
        deadlines: true,
        actionItems: true,
        risks: true,
        urgency: true,
        sentiment: true,
        interruptions: true,
        agreement: true,
        disagreement: true,
        emotionShifts: true,
        topicDrifts: true,
    });

    // API Keys Management
    let keyState: KeyManagerState = $state(keyManager.getState());
    let apiKeys: ApiKey[] = $state([]);
    let newKeyInput = $state("");
    let newKeyName = $state("");
    let shuffleMode = $state(false);
    let isTestingConnection = $state(false);
    let connectionTestResult: "success" | "error" | null = $state(null);
    let connectionTestMessage = $state("");

    // RAGFlow Configuration
    let ragflowUrl = $state('');
    let ragflowApiKey = $state('');
    let knowledgeBaseId = $state('');
    let ragflowTestStatus: 'idle' | 'testing' | 'connected' | 'error' = $state('idle');
    let ragflowTestError = $state('');
    let ragflowDatasets: Array<{id: string; name: string}> = $state([]);
    let isLoadingDatasets = $state(false);

    // Custom Models Management
    let newModelId = $state("");
    let newModelName = $state("");
    let showModelManager = $state(false);

    // 1. Sync form state from Store whenever it updates
    $effect(() => {
        if (isOpen) {
            const s = $settingsStore;
            // Use untrackHandle to prevent updates to these fields from triggering this effect
            untrackHandle(() => {
                selectedModel = s.geminiModel;
                confidenceThreshold = s.confidenceThreshold;
                vadSensitivity = s.vadSensitivity;
                enableDebugMode = s.debugMode;
                autoConnect = s.autoConnect;
                userTier = s.userTier ?? 'paid'; // MEETING_TASKS_v1: Task 1.3
                filters = { ...s.filters };

                vadMinSpeech = s.vadConfig.minSpeechDuration / 1000;
                vadSilenceTime = s.vadConfig.silenceDuration / 1000;
                vadMinChunk = s.vadConfig.minChunkDuration / 1000;
                enableFillerDetection = s.vadConfig.enableFillerDetection;

                // RAGFlow config
                ragflowUrl = s.ragflowUrl || '';
                ragflowApiKey = s.ragflowApiKey || '';
                knowledgeBaseId = s.knowledgeBaseId || '';
                ragflowTestStatus = 'idle';
                ragflowTestError = '';
            });
        }
    });

    // 2. Initialize external data (devices, keys) ONCE when modal opens
    let hasInitialized = $state(false);
    $effect(() => {
        if (isOpen && !hasInitialized) {
            untrackHandle(() => {
                loadDevices();
                loadApiKeys();
                hasInitialized = true;
            });
        } else if (!isOpen) {
            hasInitialized = false;
        }
    });

    // Key Manager Subscription
    let unsubKeyManager: (() => void) | null = null;
    $effect(() => {
        if (isOpen) {
            unsubKeyManager = keyManager.subscribe((state) => {
                keyState = state;
                apiKeys = state.keys;
                shuffleMode = state.shuffleMode;
            });
            return () => {
                if (unsubKeyManager) unsubKeyManager();
            };
        }
    });

    // availableModels is now dynamic from settingsStore

    // Permissions status
    let micPermission: "granted" | "denied" | "unknown" = $state("unknown");

    // === API KEY FUNCTIONS ===
    function addApiKey() {
        if (!newKeyInput.trim()) return;
        keyManager.addKey(newKeyInput.trim(), newKeyName.trim() || undefined, 50); // Default priority 50
        newKeyInput = "";
        newKeyName = "";
    }

    function updateKeyPriority(id: string, priority: number) {
        keyManager.updateKeyPriority(id, priority);
    }

    function addCustomModel() {
        if (!newModelId.trim() || !newModelName.trim()) return;
        settingsStore.update(s => ({
            ...s,
            availableModels: [
                ...s.availableModels,
                { id: newModelId.trim(), name: newModelName.trim(), provider: 'gemini', isCustom: true }
            ]
        }));
        newModelId = "";
        newModelName = "";
    }

    function removeCustomModel(id: string) {
        settingsStore.update(s => ({
            ...s,
            availableModels: s.availableModels.filter(m => m.id !== id || !m.isCustom)
        }));
    }

    function removeApiKey(id: string) {
        keyManager.removeKey(id);
    }

    function toggleShuffleMode() {
        keyManager.setShuffleMode(!shuffleMode);
    }

    function loadApiKeys() {
        const state = keyManager.getState();
        apiKeys = state.keys;
        shuffleMode = state.shuffleMode;
    }

    function maskKey(key: string): string {
        return keyManager.maskKey(key);
    }

    function getActiveKey(): string | null {
        const current = keyManager.getCurrentKey();
        return current?.key || null;
    }

    async function testConnection() {
        const keyObj = keyManager.getNextKey();
        if (!keyObj) {
            connectionTestResult = "error";
            connectionTestMessage = "No API keys configured";
            return;
        }

        isTestingConnection = true;
        connectionTestResult = null;
        connectionTestMessage = `Testing ${keyObj.name}...`;

        try {
            if (isRunningInTauri) {
                await invoke("test_gemini_connection", {
                    key: keyObj.key,
                    model: selectedModel,
                });
            } else {
                // Mock success in browser for testing UI
                await new Promise((r) => setTimeout(r, 1000));
            }
            connectionTestResult = "success";
            connectionTestMessage = `✓ Connected via ${keyObj.name}!`;
            keyManager.reportSuccess();
            dispatch("connected", { key: keyObj.key, model: selectedModel });
        } catch (error: any) {
            const errorStr = String(error);
            const errorCode = errorStr.includes("429") ? 429 : errorStr.includes("401") ? 401 : errorStr.includes("500") ? 500 : 0;
            const result = keyManager.handleError(errorCode, errorStr);
            connectionTestResult = "error";
            connectionTestMessage = result.message;
        } finally {
            isTestingConnection = false;
        }
    }

    // === AUDIO FUNCTIONS ===
    async function loadDevices() {
        if (!isRunningInTauri || typeof invoke === "undefined") {
            audioDevices = ["Web Preview Mode - Audio Disabled"];
            selectedDevice = audioDevices[0];
            micPermission = "granted";
            isLoadingDevices = false;
            return;
        }
        isLoadingDevices = true;
        try {
            // Extra safety check for window.__TAURI__
            if (!(window as any).__TAURI__ && !(window as any).__TAURI_INTERNALS__) {
                throw new Error("Tauri internals not found");
            }
            audioDevices = await invoke("list_audio_devices");
            if (audioDevices && audioDevices.length > 0 && !selectedDevice) {
                selectedDevice = audioDevices[0];
            }
            micPermission = "granted";
        } catch (e) {
            console.error("Failed to load devices:", e);
            micPermission = "denied";
            // Fallback for browser testing
            if (!audioDevices || audioDevices.length === 0) {
                audioDevices = ["No Devices Found (Web)"];
                selectedDevice = audioDevices[0];
            }
        } finally {
            isLoadingDevices = false;
        }
    }

    async function testMicrophone() {
        if (isTesting) {
            stopTest();
            return;
        }
        if (!isRunningInTauri) return;
        isTesting = true;
        try {
            await invoke("start_audio_capture");
            testInterval = setInterval(async () => {
                try {
                    if (isRunningInTauri) {
                        testVolume = await invoke("get_current_volume");
                    }
                } catch (e) {}
            }, 100);
        } catch (e) {
            console.error("Failed to start test:", e);
            isTesting = false;
        }
    }

    async function stopTest() {
        if (testInterval) clearInterval(testInterval);
        testInterval = null;
        isTesting = false;
        testVolume = 0;
        try {
            if (isRunningInTauri) {
                await invoke("stop_audio_capture");
            }
        } catch (e) {}
    }

    async function setCaptureMode(mode: string) {
        captureMode = mode;
        try {
            if (isRunningInTauri) {
                await invoke("set_capture_mode", { mode });
            }
        } catch (e) {
            console.error("Failed to set capture mode:", e);
        }
    }

    async function testRagflowConnection() {
        ragflowTestStatus = 'testing';
        ragflowTestError = '';
        // Save first so the service reads current values
        settingsStore.update(s => ({
            ...s,
            ragflowUrl: ragflowUrl.trim(),
            ragflowApiKey: ragflowApiKey.trim(),
            knowledgeBaseId: knowledgeBaseId.trim(),
        }));
        try {
            const { checkRAGFlowStatus } = await import('./services/ragflowService');
            const status = await checkRAGFlowStatus();
            if (status.connected) {
                ragflowTestStatus = 'connected';
                // Auto-load datasets on successful connection
                loadRagflowDatasets();
            } else {
                ragflowTestStatus = 'error';
                ragflowTestError = status.error || 'Connection failed';
            }
        } catch (e: any) {
            ragflowTestStatus = 'error';
            ragflowTestError = e?.message || 'Unknown error';
        }
    }

    async function loadRagflowDatasets() {
        isLoadingDatasets = true;
        try {
            const { listDatasets } = await import('./services/ragflowService');
            const datasets = await listDatasets();
            ragflowDatasets = datasets.map(d => ({ id: d.id, name: d.name }));
        } catch (e) {
            ragflowDatasets = [];
        } finally {
            isLoadingDatasets = false;
        }
    }

    async function createNewDataset() {
        const name = prompt('Enter dataset name (e.g. "Machine Learning Lectures"):');
        if (!name?.trim()) return;
        try {
            const { createDataset } = await import('./services/ragflowService');
            const ds = await createDataset(name.trim());
            if (ds) {
                knowledgeBaseId = ds.id;
                await loadRagflowDatasets();
            }
        } catch (e: any) {
            console.error('[RAGFlow] Create dataset failed:', e);
        }
    }

    async function launchDashboard() {
        const url = ragflowUrl.trim() || 'http://localhost:9380';
        // Remove /api/v1 if the user mistakenly added it
        const cleanUrl = url.split('/api')[0];
        try {
            await open(cleanUrl);
        } catch (e) {
            console.error('[RAGFlow] Failed to open dashboard:', e);
        }
    }

    function saveSettings() {
        settingsStore.update(s => ({
            ...s,
            geminiModel: selectedModel,
            confidenceThreshold: confidenceThreshold,
            vadSensitivity: vadSensitivity,
            debugMode: enableDebugMode,
            autoConnect: autoConnect,
            userTier: userTier, // MEETING_TASKS_v1: Task 1.3 — persist tier
            filters: { ...filters },
            vadConfig: {
                minSpeechDuration: vadMinSpeech * 1000,
                silenceDuration: vadSilenceTime * 1000,
                minChunkDuration: vadMinChunk * 1000,
                enableFillerDetection: enableFillerDetection
            },
            ragflowUrl: ragflowUrl.trim(),
            ragflowApiKey: ragflowApiKey.trim(),
            knowledgeBaseId: knowledgeBaseId.trim(),
        }));
        // MEETING_TASKS_v1: Task 1.3 — Push tier to Rust backend on save
        if (isRunningInTauri) {
            invoke("set_user_tier", { tier: userTier }).catch(() => {});
        }

        dispatch("save", {
            selectedModel,
            confidenceThreshold,
            vadSensitivity,
            enableDebugMode,
            autoConnect,
            filters,
            apiKey: getActiveKey(),
        });
        close();
    }

    function close() {
        if (isTesting) stopTest();
        onclose();
        dispatch("close");
    }

    function checkPermissions() {
        loadDevices();
    }
</script>

{#if isOpen}
    <!-- Backdrop -->
    <div
        class="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 animate-fadeIn"
        onclick={close}
        role="presentation"
    ></div>

    <!-- Modal -->
    <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
    >
        <div
            class="glass-card w-full sm:max-w-2xl h-full sm:max-h-[90vh] overflow-y-auto pointer-events-auto animate-scaleIn rounded-none sm:rounded-2xl"
            onclick={(e) => e.stopPropagation()}
            role="dialog"
            tabindex="-1"
            aria-labelledby="settings-title"
            onkeydown={(e) => {
                if (e.key === "Escape") close();
            }}
        >
            <!-- Header -->
            <div
                class="flex items-center justify-between p-6 border-b border-gray-200"
            >
                <h2
                    id="settings-title"
                    class="text-xl font-bold text-gray-900 flex items-center gap-2"
                >
                    <svg
                        class="w-6 h-6 text-blue-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1"
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                    </svg>
                    Settings
                </h2>
                <button
                    class="text-gray-500 hover:text-white transition-colors p-2"
                    onclick={close}
                    aria-label="Close settings"
                >
                    <svg
                        class="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            <div class="p-4 sm:p-6 space-y-fluid-section">
                <!-- === API KEYS SECTION === -->
                <section>
                    <h3
                        class="text-sm font-semibold text-blue-500 uppercase tracking-wider mb-4 flex items-center gap-2"
                    >
                        <span>🔑</span> API Keys
                    </h3>

                    <!-- Existing Keys List -->
                    {#if apiKeys.length > 0}
                        <div class="space-y-2 mb-4">
                            {#each apiKeys as apiKey, i}
                                <div
                                    class="flex items-center gap-3 p-3 rounded-lg bg-gray-200/50 border
                                    {apiKey.isActive
                                        ? 'border-blue-400 bg-blue-500/5'
                                        : apiKey.isDisabled
                                          ? 'border-red-300 opacity-50'
                                          : apiKey.rateLimited
                                            ? 'border-yellow-300'
                                            : 'border-gray-200'}"
                                >
                                    <!-- Priority Control -->
                                    <div class="flex flex-col items-center gap-1 group">
                                        <input 
                                            type="number" 
                                            min="0" 
                                            max="100" 
                                            value={apiKey.priority || 0}
                                            onchange={(e) => updateKeyPriority(apiKey.id, parseInt(e.currentTarget.value))}
                                            class="w-8 h-8 text-[10px] font-bold text-center bg-white rounded border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                            title="Priority (0-100)"
                                        />
                                        <span class="text-[8px] text-gray-400 uppercase font-bold">Prio</span>
                                    </div>
                                    <!-- Status indicator -->
                                    <div
                                        class="w-3 h-3 rounded-full flex-shrink-0
                                        {apiKey.isActive
                                            ? 'bg-green-500 animate-pulse'
                                            : apiKey.isDisabled
                                              ? 'bg-red-500'
                                              : apiKey.rateLimited
                                                ? 'bg-yellow-500'
                                                : 'bg-slate-600'}"
                                    ></div>

                                    <div class="flex-1 min-w-0">
                                        <div
                                            class="flex items-center gap-2 flex-wrap"
                                        >
                                            <span
                                                class="text-sm font-medium text-gray-800"
                                                >{apiKey.name}</span
                                            >

                                            <!-- Primary Key Badge -->
                                            {#if apiKey.isPrimary}
                                                <span
                                                    class="text-xs px-1.5 py-0.5 rounded bg-purple-50 text-purple-600"
                                                    >Primary</span
                                                >
                                            {/if}

                                            <!-- Status Badges -->
                                            {#if apiKey.isActive}
                                                <span
                                                    class="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-600"
                                                    >Active</span
                                                >
                                            {/if}
                                            {#if apiKey.rateLimited}
                                                <span
                                                    class="text-xs px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-600"
                                                    >Cooldown</span
                                                >
                                            {/if}
                                            {#if apiKey.isDisabled}
                                                <span
                                                    class="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-500"
                                                    >Disabled</span
                                                >
                                            {/if}
                                        </div>
                                        <div
                                            class="flex items-center gap-2 mt-1"
                                        >
                                            <span
                                                class="text-xs text-gray-400 font-mono"
                                                >{maskKey(apiKey.key)}</span
                                            >
                                            {#if apiKey.usageCount > 0}
                                                <span
                                                    class="text-xs text-gray-400"
                                                    >• {apiKey.usageCount} calls</span
                                                >
                                            {/if}
                                        </div>
                                    </div>

                                    <button
                                        class="text-gray-500 hover:text-red-500 transition-colors p-1"
                                        onclick={() => removeApiKey(apiKey.id)}
                                        aria-label="Delete key"
                                    >
                                        <svg
                                            class="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="1"
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <div
                            class="p-4 rounded-lg bg-yellow-50 border border-yellow-300 mb-4"
                        >
                            <p class="text-yellow-600 text-sm">
                                No API keys configured. Add a Gemini API key to
                                enable AI features.
                            </p>
                        </div>
                    {/if}

                    <!-- Add New Key -->
                    <div
                        class="p-4 rounded-lg bg-gray-200/30 border border-gray-200"
                    >
                        <p class="text-xs text-gray-500 mb-3">
                            Add multiple keys for automatic rotation on rate
                            limits
                        </p>
                        <div class="space-y-2">
                            <div class="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Key name (optional)"
                                    bind:value={newKeyName}
                                    class="input-field w-40 text-sm"
                                />
                            </div>
                            <div class="flex gap-2">
                                <input
                                    type="password"
                                    placeholder="Paste Gemini API key here..."
                                    bind:value={newKeyInput}
                                    class="input-field flex-1 text-sm font-mono"
                                />
                                <button
                                    class="btn-secondary text-sm px-4 whitespace-nowrap"
                                    onclick={addApiKey}
                                    disabled={!newKeyInput.trim()}
                                >
                                    + Add Key
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Test Connection & Options -->
                    <div class="mt-4 space-y-3">
                        <div class="flex items-center gap-3">
                            <button
                                class="btn-primary text-sm"
                                onclick={testConnection}
                                disabled={isTestingConnection ||
                                    apiKeys.length === 0}
                            >
                                {isTestingConnection
                                    ? "Testing..."
                                    : "Test Connection"}
                            </button>

                            {#if connectionTestResult}
                                <span
                                    class="text-sm {connectionTestResult ===
                                    'success'
                                        ? 'text-green-600'
                                        : 'text-yellow-600'}"
                                >
                                    {connectionTestMessage}
                                </span>
                            {/if}
                        </div>

                        <!-- Rotation Mode Toggle -->
                        {#if apiKeys.length > 1}
                            <div
                                class="flex items-center justify-between p-3 rounded-lg bg-gray-200/30 border border-gray-200"
                            >
                                <div>
                                    <span class="text-sm text-gray-700"
                                        >Key Rotation Mode</span
                                    >
                                    <p class="text-xs text-gray-400">
                                        {shuffleMode
                                            ? "Random key selection for better distribution"
                                            : "Sequential round-robin rotation"}
                                    </p>
                                </div>
                                <button
                                    class="px-3 py-1 text-xs rounded {shuffleMode
                                        ? 'bg-purple-50 text-purple-600'
                                        : 'bg-blue-50 text-blue-500'}"
                                    onclick={toggleShuffleMode}
                                >
                                    {shuffleMode ? "Shuffle" : "Sequential"}
                                </button>
                            </div>
                        {/if}

                        <!-- Key Stats -->
                        {#if apiKeys.length > 0}
                            <div
                                class="text-xs text-gray-400 flex items-center gap-4"
                            >
                                <span
                                    >{keyState.totalCalls} total API calls</span
                                >
                                <span
                                    >{keyManager.getActiveKeyCount()}/{apiKeys.length}
                                    keys available</span
                                >
                            </div>
                        {/if}
                    </div>
                </section>

                <!-- === SYSTEM PERMISSIONS (EXACT MATCH INSPIRATION 3) === -->
                <section>
                    <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                        System Permissions
                    </h3>

                    <div class="glass-card border border-gray-100 p-0 overflow-hidden divide-y divide-gray-50 flex flex-col">
                        <!-- Microphone Access Row -->
                        <div class="p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                            <div class="flex items-center gap-3">
                                <!-- Styled Toggle -->
                                <button 
                                    class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 ease-in-out {micPermission === 'granted' ? 'bg-blue-500' : 'bg-gray-200'}"
                                    onclick={checkPermissions}
                                    role="switch"
                                    aria-checked={micPermission === 'granted'}
                                >
                                    <span class="sr-only">Enable Microphone Access</span>
                                    <span aria-hidden="true" class="pointer-events-none absolute left-0 inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out {micPermission === 'granted' ? 'translate-x-4' : 'translate-x-0.5'}"></span>
                                </button>
                                
                                <div>
                                    <span class="text-sm font-bold text-gray-800 block leading-none mb-1">Enable Microphone Access</span>
                                    <span class="text-[10px] text-gray-400 font-medium">Capture audio input for real-time transcription</span>
                                </div>
                            </div>
                        </div>

                        <!-- Current Device Row -->
                        <div class="p-4 sm:p-5 flex items-center justify-between bg-gray-50/30">
                            <div>
                                <span class="text-xs font-bold text-gray-600 block mb-0.5">Current Device</span>
                                <div class="text-[10px] text-gray-400 font-mono w-48 truncate">
                                    {#if isLoadingDevices}
                                        Scanning interfaces...
                                    {:else if audioDevices.length > 0}
                                        <select bind:value={selectedDevice} class="bg-transparent border-none p-0 w-full text-[10px] font-mono text-gray-500 focus:ring-0 cursor-pointer">
                                            {#each audioDevices as device}
                                                <option value={device}>{device}</option>
                                            {/each}
                                        </select>
                                    {:else}
                                        No interfaces found
                                    {/if}
                                </div>
                            </div>
                            
                            <!-- Connected Badge -->
                            {#if micPermission === "granted" && audioDevices.length > 0}
                                <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-100 shadow-sm">
                                    <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse border border-green-200"></span>
                                    <span class="text-[9px] font-bold uppercase tracking-wider text-green-600">Connected</span>
                                </div>
                            {:else}
                                <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200 shadow-sm">
                                    <span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                    <span class="text-[9px] font-bold uppercase tracking-wider text-gray-500">Offline</span>
                                </div>
                            {/if}
                        </div>

                        <!-- Capture Source Controls -->
                        <div class="p-4 sm:p-5 border-t border-gray-100 bg-white">
                            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Capture Routing</span>
                            <div class="flex p-1 bg-gray-100/80 rounded-lg">
                                <button class="flex-1 py-1.5 text-[10px] uppercase font-bold tracking-wider rounded-md transition-all {captureMode === 'mic' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}" onclick={() => setCaptureMode("mic")}>
                                    Microphone
                                </button>
                                <button class="flex-1 py-1.5 text-[10px] uppercase font-bold tracking-wider rounded-md transition-all {captureMode === 'system' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}" onclick={() => setCaptureMode("system")}>
                                    System Audio
                                </button>
                                <button class="flex-1 py-1.5 text-[10px] uppercase font-bold tracking-wider rounded-md transition-all {captureMode === 'both' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}" onclick={() => setCaptureMode("both")}>
                                    Combined Array
                                </button>
                            </div>
                        </div>

                        <!-- Test Diagnostic Row -->
                        <div class="p-4 sm:p-5 flex items-center justify-between bg-gray-50/50">
                            <div class="flex-1 mr-4">
                                <span class="text-xs font-bold text-gray-600 block mb-2">Input Diagnostics</span>
                                <div class="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden shadow-inner flex">
                                    <div class="h-full transition-all duration-75 {testVolume > 0.15 ? 'bg-red-500' : testVolume > 0.05 ? 'bg-green-500' : 'bg-blue-500'}" style="width: {isTesting ? Math.min(testVolume * 10, 1) * 100 : 0}%"></div>
                                </div>
                            </div>
                            <button
                                class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg border transition-all {isTesting ? 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100 shadow-sm ring-2 ring-red-500/20' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-500 shadow-sm'}"
                                onclick={testMicrophone}
                            >
                                {isTesting ? "Halt Diag" : "Run Diag"}
                            </button>
                        </div>
                    </div>
                </section>

                <!-- === AI ENGINE SECTION === -->
                <section>
                    <h3
                        class="text-sm font-semibold text-blue-500 uppercase tracking-wider mb-4 flex items-center gap-2"
                    >
                        <span>🤖</span> AI Engine
                    </h3>

                    <!-- MEETING_TASKS_v1: Task 1.3 — Processing Tier -->
                    <div class="mb-4">
                        <span class="block text-xs text-gray-500 mb-2">Processing Plan</span>
                        <div class="flex gap-2">
                            <button
                                class="flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors {userTier === 'free' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}"
                                onclick={() => userTier = 'free'}
                                type="button"
                            >
                                Free
                                <span class="block text-[10px] opacity-70 font-normal">Local Whisper only</span>
                            </button>
                            <button
                                class="flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors {userTier === 'paid' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}"
                                onclick={() => userTier = 'paid'}
                                type="button"
                            >
                                Paid
                                <span class="block text-[10px] opacity-70 font-normal">Gemini API (real-time)</span>
                            </button>
                        </div>
                    </div>

                    <div class="mb-4">
                        <label
                            for="model-select"
                            class="block text-xs text-gray-500 mb-2"
                        >
                            Transcription Model
                        </label>
                        <select
                            id="model-select"
                            bind:value={selectedModel}
                            class="select-field w-full"
                        >
                            {#each $settingsStore.availableModels as model}
                                <option value={model.id}>{model.name}</option>
                            {/each}
                        </select>
                        <button 
                            class="mt-2 text-[10px] font-bold text-blue-500 uppercase tracking-widest hover:text-blue-600 transition-colors"
                            onclick={() => showModelManager = !showModelManager}
                        >
                            {showModelManager ? "Hide Model Manager" : "Manage Models"}
                        </button>

                        {#if showModelManager}
                            <div class="mt-4 p-4 rounded-xl bg-gray-100/50 border border-gray-200 space-y-3 animate-fadeIn">
                                <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Model Registry</h4>
                                
                                <!-- Custom Model List -->
                                <div class="space-y-2">
                                    {#each $settingsStore.availableModels as model}
                                        <div class="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-100">
                                            <div class="flex flex-col">
                                                <span class="text-xs font-bold text-gray-700">{model.name}</span>
                                                <span class="text-[9px] font-mono text-gray-400">{model.id}</span>
                                            </div>
                                            {#if model.isCustom}
                                                <button 
                                                    class="text-red-400 hover:text-red-600 transition-colors"
                                                    onclick={() => removeCustomModel(model.id)}
                                                >
                                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            {:else}
                                                <span class="text-[8px] font-black text-blue-400 uppercase tracking-widest">Core</span>
                                            {/if}
                                        </div>
                                    {/each}
                                </div>

                                <!-- Add Model Form -->
                                <div class="pt-2 border-t border-gray-200 space-y-2">
                                    <div class="flex gap-2">
                                        <input 
                                            type="text" 
                                            placeholder="Model ID (e.g. gemini-1.5-pro)" 
                                            bind:value={newModelId}
                                            class="input-field flex-1 text-[10px]" 
                                        />
                                        <input 
                                            type="text" 
                                            placeholder="Display Name" 
                                            bind:value={newModelName}
                                            class="input-field flex-1 text-[10px]" 
                                        />
                                    </div>
                                    <button 
                                        class="btn-secondary w-full py-1.5 text-[10px] font-black uppercase tracking-widest"
                                        onclick={addCustomModel}
                                        disabled={!newModelId.trim() || !newModelName.trim()}
                                    >
                                        + Register New Model
                                    </button>
                                </div>
                            </div>
                        {/if}
                    </div>

                    <div class="mb-4">
                        <label
                            for="confidence"
                            class="block text-xs text-gray-500 mb-2"
                        >
                            Confidence Threshold: <span class="text-blue-500"
                                >{(confidenceThreshold * 100).toFixed(0)}%</span
                            >
                        </label>
                        <input
                            id="confidence"
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            bind:value={confidenceThreshold}
                            class="w-full"
                        />
                    </div>

                    <div class="mb-4">
                        <label
                            for="vad"
                            class="block text-xs text-gray-500 mb-2"
                        >
                            Voice Activity Sensitivity: <span
                                class="text-blue-500"
                                >{vadSensitivity.toFixed(1)}</span
                            >
                        </label>
                        <input
                            id="vad"
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            bind:value={vadSensitivity}
                            class="w-full"
                        />
                    </div>

                    <div class="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="auto-connect"
                            bind:checked={autoConnect}
                        />
                        <label
                            for="auto-connect"
                            class="text-sm text-gray-700"
                        >
                            Auto-connect to AI on startup
                        </label>
                    </div>
                </section>

                <!-- === INTELLIGENCE FILTERS === -->
                <section>
                    <h3
                        class="text-sm font-semibold text-blue-500 uppercase tracking-wider mb-4 flex items-center gap-2"
                    >
                        Intelligence Filters
                    </h3>
                    <p class="text-xs text-gray-400 mb-4">
                        Select which insights to extract during recording
                    </p>

                    <div class="grid grid-cols-2 gap-3">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                bind:checked={filters.tasks}
                            />
                            <span class="text-sm text-gray-700">Tasks</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                bind:checked={filters.decisions}
                            />
                            <span class="text-sm text-gray-700">Decisions</span
                            >
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                bind:checked={filters.deadlines}
                            />
                            <span class="text-sm text-gray-700">Deadlines</span
                            >
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                bind:checked={filters.actionItems}
                            />
                            <span class="text-sm text-gray-700"
                                >Action Items</span
                            >
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                bind:checked={filters.risks}
                            />
                            <span class="text-sm text-gray-700">Risks</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                bind:checked={filters.urgency}
                            />
                            <span class="text-sm text-gray-700">Urgency</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                bind:checked={filters.sentiment}
                            />
                            <span class="text-sm text-gray-700">Sentiment</span
                            >
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                bind:checked={filters.interruptions}
                            />
                            <span class="text-sm text-gray-700"
                                >Interruptions</span
                            >
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                bind:checked={filters.agreement}
                            />
                            <span class="text-sm text-gray-700">Agreement</span
                            >
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                bind:checked={filters.disagreement}
                            />
                            <span class="text-sm text-gray-700"
                                >Disagreement</span
                            >
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                bind:checked={filters.emotionShifts}
                            />
                            <span class="text-sm text-gray-700"
                                >Emotion Shifts</span
                            >
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                bind:checked={filters.topicDrifts}
                            />
                            <span class="text-sm text-gray-700"
                                >Topic Drifts</span
                            >
                        </label>
                    </div>
                </section>

                <!-- === SMART AUDIO BUFFERING (VAD) === -->
                <section>
                    <h3
                        class="text-sm font-semibold text-blue-500 uppercase tracking-wider mb-4 flex items-center gap-2"
                    >
                        Smart Audio Buffering
                    </h3>
                    <p class="text-xs text-gray-400 mb-4">
                        Configure intelligent speech detection to reduce API
                        costs
                    </p>

                    <div class="mb-4">
                        <label
                            for="vad-min-speech"
                            class="block text-xs text-gray-500 mb-2"
                        >
                            Min Speech Buffer: <span class="text-blue-500"
                                >{vadMinSpeech}s</span
                            >
                        </label>
                        <input
                            id="vad-min-speech"
                            type="range"
                            min="3"
                            max="30"
                            step="1"
                            bind:value={vadMinSpeech}
                            class="w-full"
                        />
                        <p class="text-xs text-gray-400 mt-1">
                            Accumulate this much speech before sending to AI
                        </p>
                    </div>

                    <div class="mb-4">
                        <label
                            for="vad-silence"
                            class="block text-xs text-gray-500 mb-2"
                        >
                            Silence Detection: <span class="text-blue-500"
                                >{vadSilenceTime}s</span
                            >
                        </label>
                        <input
                            id="vad-silence"
                            type="range"
                            min="1"
                            max="5"
                            step="0.5"
                            bind:value={vadSilenceTime}
                            class="w-full"
                        />
                        <p class="text-xs text-gray-400 mt-1">
                            Pause length to trigger chunk send
                        </p>
                    </div>

                    <div class="mb-4">
                        <label
                            for="vad-min-chunk"
                            class="block text-xs text-gray-500 mb-2"
                        >
                            Min Chunk Size: <span class="text-blue-500"
                                >{vadMinChunk}s</span
                            >
                        </label>
                        <input
                            id="vad-min-chunk"
                            type="range"
                            min="1"
                            max="10"
                            step="1"
                            bind:value={vadMinChunk}
                            class="w-full"
                        />
                        <p class="text-xs text-gray-400 mt-1">
                            Ignore chunks shorter than this
                        </p>
                    </div>

                    <div class="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="filler-detection"
                            bind:checked={enableFillerDetection}
                        />
                        <label
                            for="filler-detection"
                            class="text-sm text-gray-700"
                        >
                            Detect & flag filler words (um, uh, like...)
                        </label>
                    </div>
                </section>

                <!-- === RAGFLOW / STUDY BUDDY SECTION === -->
                <section>
                    <h3
                        class="text-sm font-semibold text-blue-500 uppercase tracking-wider mb-4 flex items-center gap-2"
                    >
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                        Study Buddy (RAGFlow)
                    </h3>
                    <p class="text-xs text-gray-500 mb-4 leading-relaxed">
                        Connect to a RAGFlow instance to enable AI-powered Q&A over your lecture recordings. Your transcripts are automatically ingested into the knowledge base when you save a session.
                    </p>

                    <!-- RAGFlow Server URL -->
                    <div class="mb-3">
                        <label for="ragflow-url-modal" class="block text-xs font-medium text-gray-600 mb-1.5">
                            RAGFlow Server URL
                        </label>
                        <div class="flex gap-2">
                            <input
                                id="ragflow-url-modal"
                                type="url"
                                bind:value={ragflowUrl}
                                class="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                                placeholder="http://localhost:9380"
                            />
                            <button
                                class="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 text-[10px] font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors whitespace-nowrap flex items-center gap-1.5"
                                onclick={launchDashboard}
                                title="Open RAGFlow's native web dashboard"
                            >
                                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                Dashboard
                            </button>
                        </div>
                        <p class="text-[11px] text-gray-400 mt-1">The URL of your deployed RAGFlow instance</p>
                    </div>

                    <!-- RAGFlow API Key -->
                    <div class="mb-3">
                        <label for="ragflow-apikey-modal" class="block text-xs font-medium text-gray-600 mb-1.5">
                            RAGFlow API Key
                        </label>
                        <input
                            id="ragflow-apikey-modal"
                            type="password"
                            bind:value={ragflowApiKey}
                            class="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                            placeholder="ragflow-xxxxxxxxxxxxxxxx"
                        />
                        <p class="text-[11px] text-gray-400 mt-1">Found in RAGFlow Dashboard &gt; User Settings &gt; API Key</p>
                    </div>

                    <!-- Knowledge Base ID + Dataset Selector -->
                    <div class="mb-4">
                        <label for="ragflow-kb-modal" class="block text-xs font-medium text-gray-600 mb-1.5">
                            Knowledge Base (Dataset) ID
                        </label>
                        <div class="flex gap-2">
                            <input
                                id="ragflow-kb-modal"
                                type="text"
                                bind:value={knowledgeBaseId}
                                class="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-mono text-xs"
                                placeholder="paste dataset ID here"
                            />
                            {#if ragflowTestStatus === 'connected'}
                                <button
                                    class="px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors whitespace-nowrap"
                                    onclick={createNewDataset}
                                    title="Create a new dataset in RAGFlow"
                                    aria-label="Create new dataset"
                                >
                                    <svg class="w-3.5 h-3.5 inline -mt-0.5 mr-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                                    New
                                </button>
                            {/if}
                        </div>
                        <p class="text-[11px] text-gray-400 mt-1">The ID of the dataset where transcripts are stored. Connect first, then pick or create one.</p>

                        <!-- Dataset Quick-Select (shown after successful connection) -->
                        {#if ragflowDatasets.length > 0}
                            <div class="mt-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                                <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Your Datasets</span>
                                <div class="mt-1.5 flex flex-wrap gap-1.5">
                                    {#each ragflowDatasets as ds}
                                        <button
                                            class="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all {knowledgeBaseId === ds.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'}"
                                            onclick={() => (knowledgeBaseId = ds.id)}
                                            title="Use dataset: {ds.name} ({ds.id})"
                                            aria-label="Select dataset {ds.name}"
                                        >
                                            {ds.name}
                                        </button>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>

                    <!-- Test Connection Button -->
                    <button
                        class="w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2
                            {ragflowTestStatus === 'connected'
                                ? 'bg-green-50 border-2 border-green-300 text-green-700'
                                : ragflowTestStatus === 'error'
                                    ? 'bg-red-50 border-2 border-red-300 text-red-700 hover:bg-red-100'
                                    : 'bg-blue-600 border-2 border-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'}"
                        onclick={testRagflowConnection}
                        disabled={ragflowTestStatus === 'testing' || !ragflowUrl.trim()}
                        aria-label="Test RAGFlow connection"
                    >
                        {#if ragflowTestStatus === 'testing'}
                            <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                            Testing Connection...
                        {:else if ragflowTestStatus === 'connected'}
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            Connected to RAGFlow
                        {:else if ragflowTestStatus === 'error'}
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            Connection Failed — Retry
                        {:else}
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            Test Connection
                        {/if}
                    </button>

                    <!-- Status Feedback -->
                    {#if ragflowTestStatus === 'connected'}
                        <div class="mt-3 p-3 rounded-lg bg-green-50 border border-green-200">
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                <span class="text-xs font-semibold text-green-700">RAGFlow is connected</span>
                            </div>
                            <p class="text-[11px] text-green-600 mt-1">{ragflowUrl}</p>
                            {#if knowledgeBaseId}
                                <p class="text-[11px] text-green-600 mt-0.5">Dataset: <code class="bg-green-100 px-1 rounded font-mono">{knowledgeBaseId}</code></p>
                            {:else}
                                <p class="text-[11px] text-amber-600 mt-0.5 font-medium">Select or create a dataset above to start ingesting transcripts.</p>
                            {/if}
                        </div>
                    {:else if ragflowTestStatus === 'error'}
                        <div class="mt-3 p-3 rounded-lg bg-red-50 border border-red-200">
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-red-500"></span>
                                <span class="text-xs font-semibold text-red-700">Connection failed</span>
                            </div>
                            <p class="text-[11px] text-red-600 mt-1">{ragflowTestError}</p>
                            <p class="text-[11px] text-red-500 mt-1">Check that RAGFlow is running and the URL/API key are correct.</p>
                        </div>
                    {/if}
                </section>

                <!-- === DEVELOPER OPTIONS === -->
                <section>
                    <h3
                        class="text-sm font-semibold text-blue-500 uppercase tracking-wider mb-4 flex items-center gap-2"
                    >
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                        Developer Options
                    </h3>

                    <div class="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="debug-mode"
                            bind:checked={enableDebugMode}
                        />
                        <label for="debug-mode" class="text-sm text-gray-700">
                            Enable Debug Mode
                        </label>
                    </div>
                    <p class="text-xs text-gray-400 ml-7 mt-1">
                        Shows raw logs and audio file paths in console
                    </p>
                </section>
            </div>

            <!-- Footer -->
            <div class="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button class="btn-secondary" onclick={close}> Cancel </button>
                <button class="btn-primary" onclick={saveSettings}>
                    Save Settings
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes scaleIn {
        from {
            opacity: 0;
            transform: scale(0.95);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }

    .animate-fadeIn {
        animation: fadeIn 0.2s ease-out forwards;
    }

    .animate-scaleIn {
        animation: scaleIn 0.3s ease-out forwards;
    }
</style>
