<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<!-- CONVERTED: SVELTE_5_PROPS_v1 -->
<script lang="ts">
    import CognivoxControls from "./CognivoxControls.svelte";
    import { settingsStore } from "./settingsStore";

    interface Props {
        selectedModel?: string;
        apiKey?: string;
        isGeminiConnected?: boolean;
        captureMode?: string;
        currentVolume?: number;
        isRecording?: boolean;
        onsettingsChange?: (s: any) => void;
        onconnectGemini?: () => void;
        onsetCaptureMode?: (m: string) => void;
    }

    let {
        selectedModel = $bindable("gemini-2.0-flash"),
        apiKey = $bindable(""),
        isGeminiConnected = false,
        captureMode = "both",
        currentVolume = 0,
        isRecording = false,
        onsettingsChange,
        onconnectGemini,
        onsetCaptureMode
    }: Props = $props();

    let currentTier = $derived($settingsStore.userTier || 'paid');

    function setUserTier(tier: 'free' | 'paid') {
        settingsStore.update(s => ({ ...s, userTier: tier }));
        if (onsettingsChange) onsettingsChange({ userTier: tier });
    }

    function handleSettingsChange(settings: any) {
        if (onsettingsChange) onsettingsChange(settings);
    }

    let ragflowUrl = $state($settingsStore.ragflowUrl || '');
    let ragflowApiKey = $state($settingsStore.ragflowApiKey || '');
    let knowledgeBaseId = $state($settingsStore.knowledgeBaseId || '');
    let ragflowTestStatus = $state<'idle' | 'testing' | 'connected' | 'error'>('idle');
    let ragflowTestError = $state('');

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

    <div class="mb-6">
        <span class="block text-xs text-gray-500 mb-2">Processing Plan</span>
        <div class="flex gap-2">
            <button
                class="{currentTier === 'free' ? 'btn-primary' : 'btn-secondary'} flex-1"
                onclick={() => setUserTier('free')}
                aria-label="Free Plan"
            >
                Free
                <span class="block text-[9px] opacity-70">Local Whisper</span>
            </button>
            <button
                class="{currentTier === 'paid' ? 'btn-primary' : 'btn-secondary'} flex-1"
                onclick={() => setUserTier('paid')}
                aria-label="Paid Plan"
            >
                Paid
                <span class="block text-[9px] opacity-70">Gemini 2.0</span>
            </button>
        </div>
    </div>

    <div class="space-y-6">
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">RAGFlow Configuration</h4>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1" for="rag-url">Endpoint URL</label>
                    <input id="rag-url" type="text" bind:value={ragflowUrl} onblur={saveRagflowConfig} placeholder="http://localhost:9380" class="w-full bg-white border border-slate-200 rounded-lg h-9 px-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" />
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1" for="rag-key">API Key</label>
                    <input id="rag-key" type="password" bind:value={ragflowApiKey} onblur={saveRagflowConfig} placeholder="Enter RAGFlow API Key" class="w-full bg-white border border-slate-200 rounded-lg h-9 px-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" />
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1" for="rag-kb">Knowledge Base ID</label>
                    <input id="rag-kb" type="text" bind:value={knowledgeBaseId} onblur={saveRagflowConfig} placeholder="Dataset ID" class="w-full bg-white border border-slate-200 rounded-lg h-9 px-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" />
                </div>
                
                <button 
                    class="btn-secondary w-full text-[11px] font-bold py-2 flex items-center justify-center gap-2"
                    onclick={testRagflowConnection}
                    disabled={ragflowTestStatus === 'testing'}
                >
                    {#if ragflowTestStatus === 'testing'}
                        <div class="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                        Testing...
                    {:else if ragflowTestStatus === 'connected'}
                        <span class="text-green-600">✓ Connected</span>
                    {:else}
                        Test Connection
                    {/if}
                </button>

                {#if ragflowTestError}
                    <p class="text-[10px] text-red-600 mt-2 flex items-center gap-1">
                        <span class="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
                        Error: {ragflowTestError}
                    </p>
                {/if}
            </div>
        </div>

        <CognivoxControls onsettingsChange={handleSettingsChange} />
    </div>
</div>
