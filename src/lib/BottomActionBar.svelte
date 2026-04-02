<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { Transcript } from "./types";

    export let extractError: string | null = null;
    export let isCollapsed = false;
    export let transcripts: Transcript[] = [];
    export let showMemoriesPanel = false;
    export let showSummaryPanel = false;
    export let isExtractingMemories = false;
    export let isExtractingSummary = false;

    const dispatch = createEventDispatcher();

    function toggleCollapse() {
        dispatch("toggleCollapse");
    }

    function extractMemories() {
        dispatch("extractMemories");
    }

    function extractSummary() {
        dispatch("extractSummary");
    }

    // MEETING_TASKS_v1: Task 2.2 — Audio Upload Feature
    // Triggers a hidden <input type="file"> and dispatches the selected file up for processing.
    let audioFileInput: HTMLInputElement;

    function triggerAudioUpload() {
        if (audioFileInput) audioFileInput.click();
    }

    function handleAudioFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        // Validate audio type
        if (!file.type.startsWith('audio/') && !file.name.match(/\.(wav|mp3|ogg|flac|m4a|webm)$/i)) {
            alert('Please select a valid audio file (.wav, .mp3, .ogg, .flac, .m4a, .webm)');
            input.value = '';
            return;
        }
        dispatch("audioUpload", { file });
        // Reset so same file can be selected again if needed
        input.value = '';
    }
</script>

<div
    class="h-auto sm:h-20 p-4 sm:px-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 border-t border-gray-200 bg-white/50 relative z-30"
>
    <!-- Error Toast -->
    {#if extractError}
        <div
            class="absolute top-2 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-red-50 border border-red-300 text-red-500 text-sm animate-fadeIn"
        >
            {extractError}
        </div>
    {/if}

    <button
        class="btn-action {isCollapsed ? 'bg-blue-50' : ''}"
        onclick={toggleCollapse}
        disabled={transcripts.length === 0}
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1"
        >
            {#if isCollapsed}
                <rect x="3" y="3" width="12" height="12" rx="2" ry="2"></rect>
                <line x1="3" y1="12" x2="21" y2="12"></line>
            {:else}
                <rect x="3" y="3" width="12" height="12" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
            {/if}
        </svg>
        {isCollapsed ? "Expand Transcript" : "Collapse Transcript"}
    </button>

    <button
        class="btn-action {showMemoriesPanel ? 'bg-purple-50' : ''}"
        onclick={extractMemories}
        disabled={isExtractingMemories || transcripts.length === 0}
    >
        {#if isExtractingMemories}
            <span class="animate-spin">⏳</span>
        {:else}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1"
            >
                <circle cx="12" cy="12" r="3"></circle>
                <circle cx="19" cy="5" r="2"></circle>
                <circle cx="5" cy="5" r="2"></circle>
                <circle cx="19" cy="19" r="2"></circle>
                <circle cx="5" cy="19" r="2"></circle>
                <line x1="12" y1="9" x2="12" y2="3"></line>
                <line x1="14.5" y1="13.5" x2="19" y2="17"></line>
                <line x1="9.5" y1="13.5" x2="5" y2="17"></line>
                <line x1="14.5" y1="10.5" x2="19" y2="7"></line>
                <line x1="9.5" y1="10.5" x2="5" y2="7"></line>
            </svg>
        {/if}
        {isExtractingMemories ? "Extracting..." : "Extract Memories"}
    </button>

    <button
        class="btn-action {showSummaryPanel ? 'bg-green-50' : ''}"
        onclick={extractSummary}
        disabled={isExtractingSummary || transcripts.length === 0}
    >
        {#if isExtractingSummary}
            <span class="animate-spin">⏳</span>
        {:else}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1"
            >
                <path
                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                ></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
        {/if}
        {isExtractingSummary ? "Generating..." : "Summary"}
    </button>

    <!-- MEETING_TASKS_v1: Task 2.2 — Audio Upload Button -->
    <!-- Hidden file input — triggered programmatically by the button below -->
    <input
        bind:this={audioFileInput}
        type="file"
        accept="audio/*,.wav,.mp3,.ogg,.flac,.m4a,.webm"
        class="hidden"
        onchange={handleAudioFileSelected}
        aria-hidden="true"
    />
    <button
        class="btn-action"
        onclick={triggerAudioUpload}
        title="Upload audio file for transcription"
        aria-label="Upload Audio File"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1"
        >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        Upload Audio
    </button>

    <!-- Diamond Icon -->
    <div class="ml-4 diamond-icon">
        <span class="text-blue-500">◆</span>
    </div>
</div>
