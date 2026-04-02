<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { ExtractedMemoriesData } from "./types";

    export let show = false;
    export let extractedMemories: ExtractedMemoriesData | null = null;

    const dispatch = createEventDispatcher();

    function close() {
        dispatch("close");
    }
</script>

{#if show && extractedMemories}
    <div class="content-card border-purple-500/30 animate-fadeIn">
        <div class="content-card-header">
            <span
                class="text-sm font-medium text-purple-600 flex items-center gap-2"
                ><svg
                    class="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1"
                    ><path
                        d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"
                    /></svg
                > Extracted Memories</span
            >
            <button
                class="icon-btn text-gray-500 hover:text-white"
                onclick={close}
                aria-label="Close memories panel"
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
                        d="M6 18L18 6M6 6l12 12"
                    />
                </svg>
            </button>
        </div>
        <div class="p-4 sm:p-6 space-y-fluid-gap">
            {#if extractedMemories.keyMoments?.length > 0}
                <div>
                    <h4
                        class="text-xs text-gray-500 uppercase tracking-wider mb-2"
                    >
                        Key Moments
                    </h4>
                    <ul class="space-y-2">
                        {#each extractedMemories.keyMoments as moment}
                            <li
                                class="text-fluid-sm text-gray-700 p-2 rounded bg-purple-50 border-l-2 border-purple-500"
                            >
                                {moment}
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}
            {#if extractedMemories.quotes?.length > 0}
                <div>
                    <h4
                        class="text-xs text-gray-500 uppercase tracking-wider mb-2"
                    >
                        Notable Quotes
                    </h4>
                    <div class="space-y-2">
                        {#each extractedMemories.quotes as quote}
                            <blockquote
                                class="text-fluid-sm text-gray-700 italic border-l-2 border-blue-500 pl-3 py-1"
                            >
                                "{quote}"
                            </blockquote>
                        {/each}
                    </div>
                </div>
            {/if}
            {#if extractedMemories.personalInsights?.length > 0}
                <div>
                    <h4
                        class="text-xs text-gray-500 uppercase tracking-wider mb-2"
                    >
                        Personal Insights
                    </h4>
                    <ul class="space-y-1">
                        {#each extractedMemories.personalInsights as insight}
                            <li
                                class="text-fluid-sm text-gray-700 flex items-start gap-2"
                            >
                                <span class="text-yellow-600">•</span>
                                {insight}
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}
            {#if extractedMemories.emotionShifts?.length > 0}
                <div>
                    <h4
                        class="text-xs text-gray-500 uppercase tracking-wider mb-2"
                    >
                        Emotion Shifts
                    </h4>
                    <ul class="space-y-1">
                        {#each extractedMemories.emotionShifts as shift}
                            <li
                                class="text-fluid-sm text-gray-700 flex items-start gap-2"
                            >
                                <span class="text-orange-600">↗</span>
                                {shift}
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}
        </div>
    </div>
{/if}
