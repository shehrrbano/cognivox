<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<!-- CONVERTED: SVELTE_5_PROPS_v1 -->
<script lang="ts">
    import { keyManager } from "./keyManager";

    interface Props {
        isGeminiConnected?: boolean;
        isRecording?: boolean;
        apiKeyCount?: number;
        activeKeyName?: string;
        activeKeyIndex?: number;
        isRateLimited?: boolean;
        lastRequestTime?: string | null;
        debugMode?: boolean;
        requestCount?: number;
        whisperReady?: boolean;
        whisperLoading?: boolean;
        whisperProgress?: number;
        onopenSettings?: () => void;
    }

    let {
        isGeminiConnected = false,
        isRecording = false,
        apiKeyCount = 0,
        activeKeyName = "",
        activeKeyIndex = 1,
        isRateLimited = false,
        lastRequestTime = null,
        debugMode = false,
        requestCount = 0,
        whisperReady = false,
        whisperLoading = false,
        whisperProgress = 0,
        onopenSettings = () => {}
    }: Props = $props();

    function getStatusText(): string {
        if (apiKeyCount === 0) return "No API key – click to setup";
        if (isRateLimited) return `Rate limited – switching key...`;
        if (isGeminiConnected) {
            if (apiKeyCount > 1) return `API: Key ${activeKeyIndex}/${apiKeyCount} – Connected`;
            return `Connected to Gemini`;
        }
        return `${apiKeyCount} key${apiKeyCount > 1 ? 's' : ''} ready – connecting...`;
    }

    function getStatusColor(): string {
        if (apiKeyCount === 0) return "text-red-500 bg-red-50 border-red-100";
        if (isRateLimited) return "text-yellow-600 bg-yellow-50 border-yellow-100 animate-pulse";
        if (isGeminiConnected) return "text-green-600 bg-green-50 border-green-100";
        return "text-blue-500 bg-blue-50 border-blue-100";
    }
</script>

<footer class="fixed bottom-0 left-0 right-0 h-10 border-t border-gray-200 bg-white/80 backdrop-blur-sm z-40 px-6 flex items-center justify-between pointer-events-auto">
    <!-- LEFT: System Status -->
    <div class="flex items-center gap-4">
        <div 
            class="flex items-center gap-2 px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer {getStatusColor()}"
            onclick={onopenSettings}
            role="button"
            tabindex="0"
            onkeydown={(e) => e.key === 'Enter' && onopenSettings()}
        >
            <div class="w-1.5 h-1.5 rounded-full {isGeminiConnected ? 'bg-green-500 animate-pulse' : 'bg-current'}"></div>
            {getStatusText()}
        </div>

        {#if whisperLoading}
            <div class="flex items-center gap-2">
                <div class="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div class="h-full bg-blue-500 transition-all duration-300" style="width: {whisperProgress}%"></div>
                </div>
                <span class="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Loading AI {whisperProgress}%</span>
            </div>
        {:else if !whisperReady && !whisperLoading}
            <div class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 border border-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-widest">
                <span class="w-1 h-1 rounded-full bg-slate-400"></span>
                Engine Standby
            </div>
        {:else}
            <div class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-500 text-[9px] font-bold uppercase tracking-widest">
                <span class="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></span>
                Engine Ready
            </div>
        {/if}
    </div>

    <!-- RIGHT: Info & Debug -->
    <div class="flex items-center gap-4">
        {#if lastRequestTime}
            <span class="text-[9px] text-gray-400 font-mono">Last Signal: {lastRequestTime}</span>
        {/if}

        <div class="h-4 w-px bg-gray-200"></div>

        <div class="flex items-center gap-3">
            <div class="flex items-center gap-1.5">
                <span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Session Integrity</span>
                <div class="flex gap-0.5">
                    <div class="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <div class="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                </div>
            </div>

            {#if debugMode}
                <div class="px-1.5 py-0.5 rounded bg-gray-900 text-white text-[8px] font-mono font-bold uppercase">Debug</div>
            {/if}

            <span class="text-[10px] font-bold text-gray-300">v0.1.0-alpha</span>
        </div>
    </div>
</footer>
