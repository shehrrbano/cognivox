<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import CognivoxControls from "./CognivoxControls.svelte";
    import type { ModelOption } from "./types";
    import { settingsStore } from "./settingsStore"; // MEETING_TASKS_v1: Task 1.3

    export let selectedModel = "gemini-2.0-flash";
    // availableModels is now dynamic from settingsStore
    export let apiKey = "";
    export let isGeminiConnected = false;
    export let captureMode = "both";
    export let currentVolume = 0;
    export let isRecording = false;

    const dispatch = createEventDispatcher();

    // MEETING_TASKS_v1: Task 1.3 — Tier selector state
    let currentTier: 'free' | 'paid' = $settingsStore.userTier || 'paid';

    function setUserTier(tier: 'free' | 'paid') {
        currentTier = tier;
        settingsStore.update(s => ({ ...s, userTier: tier }));
        dispatch("settingsChange", { userTier: tier });
        console.log(`[TIER] User switched to ${tier} plan. Backend: ${tier === 'paid' ? 'Gemini API (real-time)' : 'Local Whisper (offline)'}`);
    }

    function connectGemini() {
        dispatch("connectGemini");
    }

    function setCaptureMode(mode: string) {
        dispatch("setCaptureMode", mode);
    }

    function handleSettingsChange(settings: any) {
        dispatch("settingsChange", settings);
    }

    // Tasks 1.3 + 1.4 + 3.1 (BATCH2): RagFlow Integration config bindings
    let ragflowUrl = $settingsStore.ragflowUrl || '';
    let ragflowApiKey = $settingsStore.ragflowApiKey || '';
    let knowledgeBaseId = $settingsStore.knowledgeBaseId || '';
    let ragflowTestStatus: 'idle' | 'testing' | 'connected' | 'error' = 'idle';
    let ragflowTestError = '';

    function saveRagflowConfig() {
        settingsStore.update(s => ({
            ...s,
            ragflowUrl: ragflowUrl.trim(),
            ragflowApiKey: ragflowApiKey.trim(),
            knowledgeBaseId: knowledgeBaseId.trim()
        }));
    }

    async function testRagflowConnection() {
        ragflowTestStatus = 'testing';
        ragflowTestError = '';
        saveRagflowConfig();
        try {
            const { checkRAGFlowStatus } = await import('./services/ragflowService');
            const status = await checkRAGFlowStatus();
            if (status.connected) {
                ragflowTestStatus = 'connected';
            } else {
                ragflowTestStatus = 'error';
                ragflowTestError = status.error || 'Connection failed';
            }
        } catch (e: any) {
            ragflowTestStatus = 'error';
            ragflowTestError = e?.message || 'Unknown error';
        }
    }
</script>

<div class="glass-card p-6">
    <h3 class="text-lg font-medium text-gray-800 mb-6">
        Audio & Processing Controls
    </h3>

    <!-- MEETING_TASKS_v1: Task 1.3 — Plan / Tier Selector -->
    <div class="mb-6">
        <span class="block text-xs text-gray-500 mb-2">Processing Plan</span>
        <div class="flex gap-2">
            <button
                class="{currentTier === 'free' ? 'btn-primary' : 'btn-secondary'} flex-1"
                onclick={() => setUserTier('free')}
                aria-label="Free Plan — Local Whisper"
            >
                Free
                <span class="block text-[9px] opacity-70">Local Whisper</span>
            </button>
            <button
                class="{currentTier === 'paid' ? 'btn-primary' : 'btn-secondary'} flex-1"
                onclick={() => setUserTier('paid')}
                aria-label="Paid Plan — Gemini API"
            >
                Paid
                <span class="block text-[9px] opacity-70">Gemini API (Real-time)</span>
            </button>
        </div>
        {#if currentTier === 'free'}
            <p class="text-[10px] text-gray-400 mt-1">Local Whisper only — Gemini intelligence disabled</p>
        {:else}
            <p class="text-[10px] text-green-600 mt-1">Gemini API enabled — real-time intelligence active</p>
        {/if}
    </div>

    <!-- Model Selection -->
    <div class="mb-6">
        <label for="model-select" class="block text-xs text-gray-500 mb-2"
            >AI Model</label
        >
        <select
            id="model-select"
            bind:value={selectedModel}
            class="select-field w-full"
        >
            {#each $settingsStore.availableModels as model}
                <option value={model.id}>{model.name}</option>
            {/each}
        </select>
    </div>

    <!-- API Key -->
    <div class="mb-6">
        <label for="api-key-input" class="block text-xs text-gray-500 mb-2"
            >Gemini API Key</label
        >
        <div class="flex gap-2">
            <input
                id="api-key-input"
                type="password"
                bind:value={apiKey}
                class="input-field flex-1"
                placeholder="AIza..."
            />
            <button
                class="btn-secondary"
                onclick={connectGemini}
                disabled={isGeminiConnected}
            >
                {isGeminiConnected ? "Connected" : "Connect"}
            </button>
        </div>
    </div>

    <!-- Capture Source -->
    <div class="mb-6">
        <span class="block text-xs text-gray-500 mb-2">Capture Source</span>
        <div class="flex gap-2">
            <button
                class="{captureMode === 'mic'
                    ? 'btn-primary'
                    : 'btn-secondary'} flex-1"
                onclick={() => setCaptureMode("mic")}
                aria-label="Set Mic Only"
                title="Records only your microphone input"
            >
                <svg
                    class="w-4 h-4 inline mr-1"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1"
                    ><path
                        d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"
                    /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg
                >
                Mic Only
                <span class="block text-[9px] opacity-70">Your voice</span>
            </button>
            <button
                class="{captureMode === 'system'
                    ? 'btn-primary'
                    : 'btn-secondary'} flex-1"
                onclick={() => setCaptureMode("system")}
                aria-label="Set System Audio Only"
                title="Records computer audio output (speakers, calls). Requires a virtual audio loopback device on Windows."
            >
                System
                <span class="block text-[9px] opacity-70">PC audio</span>
            </button>
            <button
                class="{captureMode === 'both'
                    ? 'btn-primary'
                    : 'btn-secondary'} flex-1"
                onclick={() => setCaptureMode("both")}
                aria-label="Set Both Audio Sources"
                title="Records both your microphone and computer audio simultaneously (recommended for calls)"
            >
                Both
                <span class="block text-[9px] opacity-70 text-green-500 font-bold">{captureMode === 'both' ? '✓ Active' : 'Recommended'}</span>
            </button>
        </div>
        {#if captureMode === 'system'}
            <p class="text-[10px] text-amber-600 mt-1.5 flex items-center gap-1">
                <svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                System audio capture requires a virtual loopback device (e.g. VB-Cable) on Windows.
            </p>
        {:else if captureMode === 'both'}
            <p class="text-[10px] text-green-600 mt-1.5">Mic + system audio — best for capturing all voices in a call.</p>
        {/if}
    </div>

    <!-- Audio Level -->
    <div class="mb-6">
        <span class="block text-xs text-gray-500 mb-2">Audio Level</span>
        <div class="space-y-2">
            {#if currentVolume !== undefined}
                <div
                    class="h-3 bg-gray-200 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={Math.min(
                        Math.max(currentVolume * 10, 0),
                        1,
                    ) * 100}
                    aria-valuemin="0"
                    aria-valuemax="100"
                >
                    <div
                        class="h-full transition-all duration-75 {currentVolume >
                        0.15
                            ? 'bg-red-500'
                            : currentVolume > 0.05
                              ? 'bg-green-500'
                              : currentVolume > 0.01
                                ? 'bg-cyan-500'
                                : 'bg-slate-600'}"
                        style="width: {Math.min(
                            Math.max(currentVolume * 10, 0),
                            1,
                        ) * 100}%"
                    ></div>
                </div>
                <div class="flex justify-between text-xs text-gray-400 mt-1">
                    <span class="flex items-center gap-1">
                        <span
                            class="w-2 h-2 rounded-full {isRecording
                                ? currentVolume > 0.02
                                    ? 'bg-green-500 animate-pulse'
                                    : 'bg-cyan-500'
                                : 'bg-slate-600'}"
                        ></span>
                        {isRecording ? "Listening" : "Idle"}
                    </span>
                    <span
                        >{isRecording
                            ? currentVolume > 0.0001
                                ? (20 * Math.log10(currentVolume)).toFixed(0) +
                                  " dB"
                                : "-∞ dB"
                            : "--"}</span
                    >
                </div>
            {/if}
        </div>
    </div>

    <!-- ============================================================ -->
    <!-- ZERO_CONFIG_RAGFLOW_AUTO_SETUP_v1                            -->
    <!-- Normal users see only a friendly status pill. Dev Mode        -->
    <!-- (debugMode=true) unlocks the raw URL / API key / KB ID       -->
    <!-- fields for advanced debugging.                                -->
    <!-- ============================================================ -->
    {#if !$settingsStore.debugMode}
        <div class="mb-6 border border-blue-100 rounded-xl p-4 bg-blue-50/50 flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
            </div>
            <div class="flex-1 min-w-0">
                <h4 class="text-xs font-bold text-blue-700 uppercase tracking-widest mb-1">Study Buddy</h4>
                <p class="text-[11px] text-slate-600 leading-relaxed">
                    Auto-configured and running in the background. Every recording is
                    automatically added to your personal knowledge base — no setup required.
                </p>
                <p class="text-[10px] text-slate-400 mt-1.5">
                    Need to tweak the connection? Enable <span class="font-bold text-slate-500">Dev Mode</span> below.
                </p>
            </div>
        </div>
        <!-- Dev Mode toggle — always visible so power users can unlock advanced settings -->
        <div class="mb-6 flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50">
            <div>
                <span class="block text-xs font-semibold text-slate-700">Dev Mode</span>
                <span class="block text-[10px] text-slate-400">Expose raw RAGFlow configuration for advanced users</span>
            </div>
            <button
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                    {$settingsStore.debugMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}"
                onclick={() => settingsStore.update(s => ({ ...s, debugMode: !s.debugMode }))}
                aria-label="Toggle Dev Mode"
            >
                {$settingsStore.debugMode ? 'ON' : 'OFF'}
            </button>
        </div>
    {:else}
    <div class="mb-6 border border-blue-100 rounded-xl p-4 bg-blue-50/50">
        <h4 class="text-xs font-bold text-blue-700 uppercase tracking-widest mb-3 flex items-center justify-between">
            <span class="flex items-center gap-2">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                RagFlow Backend (Dev Mode)
            </span>
            <button
                class="px-2 py-0.5 rounded bg-blue-600 text-white text-[9px] font-bold uppercase hover:bg-blue-700"
                onclick={() => settingsStore.update(s => ({ ...s, debugMode: false }))}
                aria-label="Disable Dev Mode"
                title="Disable Dev Mode"
            >
                Exit Dev
            </button>
        </h4>
        <!-- Task 3.1: Connect audio recording to RagFlow — Worker URL -->
        <div class="mb-3">
            <label for="ragflow-url" class="block text-xs text-gray-500 mb-1">
                RagFlow Server URL
                <span class="text-gray-400">(e.g. http://localhost:9380)</span>
            </label>
            <input
                id="ragflow-url"
                type="url"
                bind:value={ragflowUrl}
                class="input-field w-full"
                placeholder="http://localhost:9380"
            />
        </div>
        <!-- Task 1.4: LLM API Key (OpenAI or open-source) into RagFlow -->
        <div class="mb-3">
            <label for="ragflow-api-key" class="block text-xs text-gray-500 mb-1">
                LLM API Key (OpenAI or open-source)
            </label>
            <input
                id="ragflow-api-key"
                type="password"
                bind:value={ragflowApiKey}
                class="input-field w-full"
                placeholder="sk-... or custom model key"
            />
        </div>
        <!-- Task 1.3: Per-user / per-subject Knowledge Base ID -->
        <div class="mb-3">
            <label for="kb-id" class="block text-xs text-gray-500 mb-1">
                Knowledge Base ID
                <span class="text-gray-400">(unique per user/subject)</span>
            </label>
            <input
                id="kb-id"
                type="text"
                bind:value={knowledgeBaseId}
                class="input-field w-full"
                placeholder="kb_lectures_prof_xyz"
            />
        </div>
        <div class="flex gap-2">
            <button
                class="btn-primary flex-1 text-xs py-2"
                onclick={saveRagflowConfig}
            >
                Save Config
            </button>
            <button
                class="btn-primary flex-1 text-xs py-2"
                onclick={testRagflowConnection}
                disabled={ragflowTestStatus === 'testing' || !ragflowUrl.trim()}
            >
                {ragflowTestStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </button>
        </div>
        {#if ragflowTestStatus === 'connected'}
            <p class="text-[10px] text-green-600 mt-2 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                Connected to: {$settingsStore.ragflowUrl}
            </p>
        {:else if ragflowTestStatus === 'error'}
            <p class="text-[10px] text-red-600 mt-2 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
                Error: {ragflowTestError}
            </p>
        {:else if $settingsStore.ragflowUrl}
            <p class="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block"></span>
                URL saved — click "Test Connection" to verify
            </p>
        {/if}
    </div>
    {/if}

    <CognivoxControls onSettingsChange={handleSettingsChange} />
</div>
