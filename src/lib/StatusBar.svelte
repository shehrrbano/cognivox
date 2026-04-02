<script lang="ts">
    import { keyManager } from "./keyManager";

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
    } = $props();

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
        if (apiKeyCount === 0) return "bg-red-500";
        if (isRateLimited) return "bg-yellow-500 animate-pulse";
        if (isGeminiConnected) return "bg-green-500";
        return "bg-blue-500 animate-pulse";
    }

    function handleClick() {
        if (apiKeyCount === 0 || !isGeminiConnected) {
            onopenSettings();
        }
    }
</script>

<div class="fixed bottom-0 left-0 right-0 z-[60] h-6 xs:h-8 bg-white/95 border-t border-gray-200 backdrop-blur-sm flex items-center justify-between px-2 sm:px-4">
    <!-- Left: Connection Status -->
    <button 
        class="flex items-center gap-2 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
        onclick={handleClick}
    >
        <span class="w-2 h-2 rounded-full {getStatusColor()}"></span>
        <span class="text-xs {isGeminiConnected ? 'text-green-600' : apiKeyCount === 0 ? 'text-red-500' : 'text-gray-500'}">
            {getStatusText()}
        </span>
    </button>

    <div class="flex items-center gap-1.5 min-w-[100px]">
        {#if whisperReady}
            <span class="w-2 h-2 rounded-full bg-green-500"></span>
            <span class="text-xs text-green-600">STT Ready</span>
        {:else if whisperLoading}
            <div class="flex flex-col items-center gap-0.5">
                <div class="flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
                    <span class="text-[10px] text-orange-500 font-medium">Downloading: {Math.round(whisperProgress)}%</span>
                </div>
                <div class="w-24 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div class="h-full bg-orange-400 transition-all duration-300" style="width: {whisperProgress}%"></div>
                </div>
            </div>
        {:else}
            <span class="w-2 h-2 rounded-full bg-gray-300"></span>
            <span class="text-xs text-gray-400">STT Idle</span>
        {/if}
    </div>

    <!-- Center: Recording indicator -->
    {#if isRecording}
        <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span class="text-xs text-red-500">Recording Active</span>
        </div>
    {/if}

    <!-- Right: Stats & Debug -->
    <div class="hidden sm:flex items-center gap-4 text-[7px] sm:text-xs text-gray-400">
        {#if debugMode && lastRequestTime}
            <span>Last request: {lastRequestTime}</span>
        {/if}
        {#if requestCount > 0}
            <span>API calls: {requestCount}</span>
        {/if}
        {#if apiKeyCount > 1}
            <span title="Multiple keys for failover" class="flex items-center gap-1"><svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg> {apiKeyCount} keys</span>
        {/if}
        <span class="hidden xs:inline text-gray-400">Cognivox v1.0</span>
    </div>
</div>
