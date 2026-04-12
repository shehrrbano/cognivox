<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<!-- CONVERTED: SVELTE_5_PROPS_v1 -->
<script lang="ts">
    import type { KeyManagerState } from "./keyManager";

    interface Props {
        status?: string;
        isRecording?: boolean;
        isProcessing?: boolean;
        isGeminiConnected?: boolean;
        keyState: KeyManagerState;
        forceNewSession?: boolean;
        hasExistingSession?: boolean;
        isSidebarOpen?: boolean;
        isRecordingStarting?: boolean;
        recordingSeconds?: number;
        vadState?: { isSpeaking: boolean; vadConfidence: number };
        whisperReady?: boolean;
        whisperLoading?: boolean;
        onopenSettings?: () => void;
        ontoggleCapture?: () => void;
        onnewSession?: () => void;
        ontoggleSidebar?: () => void;
    }

    let {
        status = "Ready",
        isRecording = false,
        isProcessing = false,
        isGeminiConnected = false,
        keyState,
        forceNewSession = false,
        hasExistingSession = false,
        isSidebarOpen = false,
        isRecordingStarting = false,
        recordingSeconds = 0,
        vadState = { isSpeaking: false, vadConfidence: 0 },
        whisperReady = false,
        whisperLoading = false,
        onopenSettings,
        ontoggleCapture,
        onnewSession,
        ontoggleSidebar
    }: Props = $props();

    function formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function openSettings() {
        if (onopenSettings) onopenSettings();
    }

    function toggleCapture() {
        if (ontoggleCapture) ontoggleCapture();
    }

    function newSession() {
        if (onnewSession) onnewSession();
    }
</script>

<div
    class="min-h-[2.68rem] px-3 sm:px-4 flex flex-wrap items-center justify-between gap-y-1.5 border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-30 py-2 sm:py-0 relative"
>
    <!-- Left: Status & Mobile Menu -->
    <div class="flex items-center gap-4">
        <!-- Universal Menu Toggle -->
        <button
            class="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 promax-interaction border border-slate-100 shadow-sm flex-shrink-0 flex items-center justify-center"
            onclick={() => {
                if (ontoggleSidebar) ontoggleSidebar();
            }}
            aria-label={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
        >
            {#if isSidebarOpen}
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            {:else}
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            {/if}
        </button>

        <div class="flex items-center gap-2">
            <span
                class="status-dot {isRecording
                    ? 'status-dot-recording'
                    : isGeminiConnected
                      ? 'status-dot-ready'
                      : 'bg-slate-500'}"
            ></span>
            <span class="text-sm font-medium text-gray-700">{status}</span>
        </div>

        {#if isRecording}
            <div class="flex items-center gap-3 px-3 py-1 bg-red-50 rounded-full border border-red-100 shadow-sm animate-fadeIn">
                <!-- Pulsing Mic -->
                <div class="relative flex items-center justify-center w-5 h-5">
                    {#if vadState.isSpeaking}
                        <div class="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-25"></div>
                        <div class="absolute inset-1 bg-red-500 rounded-full animate-pulse"></div>
                    {:else}
                        <div class="w-2 h-2 bg-red-300 rounded-full"></div>
                    {/if}
                    <svg class="relative z-10 w-3 h-3 {vadState.isSpeaking ? 'text-white' : 'text-red-400'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                </div>

                <!-- Timer -->
                <span class="text-sm font-mono font-bold text-red-600 tracking-wider tabular-nums">
                    {formatTime(recordingSeconds)}
                </span>

                <!-- VU Meter -->
                <div class="flex items-center gap-0.5 h-3">
                    {#each Array(4) as _, i}
                        <div 
                            class="w-1 rounded-full transition-all duration-75 {i < (vadState.vadConfidence * 5) ? 'bg-red-500' : 'bg-red-200'}"
                            style="height: {4 + (i * 2)}px"
                        ></div>
                    {/each}
                </div>
                
                <span class="text-[10px] font-black text-red-600/60 uppercase tracking-tighter">Live</span>
            </div>
        {:else if isProcessing}
            <span class="badge-blue text-xs px-2 py-1 rounded animate-pulse"
                >PROCESSING</span
            >
        {:else if isGeminiConnected}
            <span
                class="badge-success text-xs px-2 py-1 rounded flex items-center gap-1"
            >
                <svg
                    class="w-2 h-2"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"><polyline points="20 6 9 17 4 12" /></svg
                >
                {#if keyState.keys.length > 1}
                    Key {keyState.currentIndex + 1}/{keyState.keys.length}
                {:else}
                    AI Connected
                {/if}
            </span>
        {:else if keyState.keys.length > 0}
            <button
                type="button"
                class="badge-info text-xs px-2 py-1 rounded tracking-wide font-bold cursor-pointer flex items-center gap-1 border border-blue-200 bg-blue-50 text-blue-700"
                onclick={openSettings}
            >
                {keyState.keys.length} AI KEY{keyState.keys.length > 1 ? "S" : ""} ACTIVE
            </button>
        {:else}
            <button
                type="button"
                class="badge-warning text-xs px-2 py-1 rounded cursor-pointer border-0"
                onclick={openSettings}
            >
                Setup
            </button>
        {/if}
    </div>

    <!-- Right: Actions -->
    <div class="flex items-center gap-3">
        <!-- Settings Quick Access -->
        <button class="icon-btn promax-interaction min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5" onclick={openSettings} aria-label="Open Settings">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                aria-hidden="true"
            >
                <circle cx="12" cy="12" r="3"></circle>
                <path
                    d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                ></path>
            </svg>
        </button>

        <!-- New Session Button - visible when not recording and there's an existing session -->
        {#if !isRecording && hasExistingSession}
            <button
                class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 {forceNewSession
                    ? 'bg-amber-500/20 text-amber-700 border border-amber-500/40 ring-1 ring-amber-200'
                    : 'bg-gray-100/50 text-gray-500 border border-slate-600/30 hover:bg-gray-100/80 hover:text-gray-700'}"
                onclick={newSession}
                disabled={isProcessing}
                title={forceNewSession
                    ? "New session will start on next recording"
                    : "Click to start a new session on next recording"}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="8.75"
                    height="8.75"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1"
                >
                    <path d="M12 5v14M5 12h14"></path>
                </svg>
                {forceNewSession ? "New Session ✓" : "New Session"}
            </button>
        {/if}

        <!-- Record Button -->
        <div class="flex flex-col items-center gap-0.5">
        <button
            class="{isRecording
                ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white shadow-red-200 ring-2 ring-red-100 border-red-400'
                : 'btn-primary'} flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-xl font-bold text-sm transition-all duration-200 promax-interaction shadow-sm border"
            onclick={toggleCapture}
            disabled={isProcessing || (isRecordingStarting && !isRecording)}
        >
            {#if isRecording && isRecordingStarting}
                <div class="flex items-center gap-2">
                    <span class="inline-flex gap-1 items-center">
                        <span class="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style="animation-delay: 0ms"></span>
                        <span class="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style="animation-delay: 150ms"></span>
                        <span class="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style="animation-delay: 300ms"></span>
                    </span>
                    <span class="uppercase tracking-widest text-[10px]">Initializing</span>
                </div>
            {:else if isRecording}
                <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-white rounded-sm shadow-sm"></div>
                    <span class="uppercase tracking-widest text-[10px]">Stop Recording</span>
                </div>
            {:else}
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 bg-red-100 rounded-full border-2 border-white flex items-center justify-center">
                        <div class="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                    </div>
                    <span class="uppercase tracking-widest text-[10px]">Start Recording</span>
                </div>
            {/if}
        </button>
        {#if !isRecording && whisperLoading}
            <span class="text-[9px] text-orange-500 font-medium animate-pulse">STT loading...</span>
        {:else if !isRecording && !whisperReady}
            <span class="text-[9px] text-gray-400">STT not loaded</span>
        {/if}
        </div>
    </div>
</div>
