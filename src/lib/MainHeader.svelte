<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { KeyManagerState } from "./keyManager";

    export let status = "Ready";
    export let isRecording = false;
    export let isProcessing = false;
    export let isGeminiConnected = false;
    export let keyState: KeyManagerState;
    export let forceNewSession = false;
    export let hasExistingSession = false;

    const dispatch = createEventDispatcher();

    function openSettings() {
        dispatch("openSettings");
    }

    function toggleCapture() {
        dispatch("toggleCapture");
    }

    function newSession() {
        dispatch("newSession");
    }
</script>

<div
    class="h-16 px-6 flex items-center justify-between border-b border-cyan-500/10 bg-[#0d1117]/50"
>
    <!-- Left: Status -->
    <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
            <span
                class="status-dot {isRecording
                    ? 'status-dot-recording'
                    : isGeminiConnected
                      ? 'status-dot-ready'
                      : 'bg-slate-500'}"
            ></span>
            <span class="text-sm font-medium text-slate-300">{status}</span>
        </div>

        {#if isRecording}
            <span
                class="badge-error text-xs px-2 py-1 rounded animate-pulse flex items-center gap-1"
                ><span class="w-2 h-2 rounded-full bg-red-500"></span> LIVE</span
            >
        {:else if isProcessing}
            <span class="badge-cyan text-xs px-2 py-1 rounded animate-pulse"
                >PROCESSING</span
            >
        {:else if isGeminiConnected}
            <span
                class="badge-success text-xs px-2 py-1 rounded flex items-center gap-1"
            >
                <svg
                    class="w-3 h-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"><polyline points="20 6 9 17 4 12" /></svg
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
                class="badge-cyan text-xs px-2 py-1 rounded cursor-pointer flex items-center gap-1 border-0"
                onclick={openSettings}
            >
                <svg
                    class="w-3 h-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    ><path
                        d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"
                    /></svg
                >
                {keyState.keys.length} Key{keyState.keys.length > 1 ? "s" : ""} Ready
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
        <button class="icon-btn" onclick={openSettings} aria-label="Settings">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
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
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 ring-1 ring-amber-500/20'
                    : 'bg-slate-700/50 text-slate-400 border border-slate-600/30 hover:bg-slate-700/80 hover:text-slate-300'}"
                onclick={newSession}
                disabled={isProcessing}
                title={forceNewSession
                    ? "New session will start on next recording"
                    : "Click to start a new session on next recording"}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path d="M12 5v14M5 12h14"></path>
                </svg>
                {forceNewSession ? "New Session ✓" : "New Session"}
            </button>
        {/if}

        <!-- Record Button -->
        <button
            class="{isRecording
                ? 'btn-recording'
                : 'btn-primary'} flex items-center gap-2"
            onclick={toggleCapture}
            disabled={isProcessing}
        >
            {#if isRecording}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <rect x="6" y="6" width="12" height="12" rx="2"></rect>
                </svg>
                Stop Recording
            {:else}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <circle cx="12" cy="12" r="10"></circle>
                </svg>
                Start Recording
            {/if}
        </button>
    </div>
</div>
