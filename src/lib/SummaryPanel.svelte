<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { ExtractedSummary } from "./types";

    export let show = false;
    export let extractedSummary: ExtractedSummary | null = null;

    const dispatch = createEventDispatcher();

    function close() {
        dispatch("close");
    }
</script>

{#if show && extractedSummary}
    <div class="content-card border-green-500/30 animate-fadeIn">
        <div class="content-card-header">
            <span
                class="text-sm font-medium text-green-600 flex items-center gap-2"
                ><svg
                    class="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1"
                    ><path
                        d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
                    /><rect
                        x="8"
                        y="2"
                        width="5"
                        height="3"
                        rx="1"
                        ry="1"
                    /></svg
                > Meeting Summary</span
            >
            <button
                class="icon-btn text-gray-500 hover:text-white"
                onclick={close}
                aria-label="Close summary panel"
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
            {#if extractedSummary.topics?.length > 0}
                <div>
                    <h4
                        class="text-xs text-gray-500 uppercase tracking-wider mb-2"
                    >
                        Topics Discussed
                    </h4>
                    <div class="flex flex-wrap gap-2">
                        {#each extractedSummary.topics as topic}
                            <span
                                class="px-2 py-1 text-fluid-sm rounded bg-blue-50 text-blue-500"
                                >{topic}</span
                            >
                        {/each}
                    </div>
                </div>
            {/if}
            {#if extractedSummary.decisions?.length > 0}
                <div>
                    <h4
                        class="text-xs text-gray-500 uppercase tracking-wider mb-2"
                    >
                        Decisions Made
                    </h4>
                    <ul class="space-y-1">
                        {#each extractedSummary.decisions as decision}
                            <li
                                class="text-fluid-sm text-gray-700 flex items-start gap-2"
                            >
                                <svg
                                    class="w-3 h-3 text-green-600 flex-shrink-0 mt-0.5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    ><polyline points="20 6 9 17 4 12" /></svg
                                >
                                {decision}
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}
            {#if extractedSummary.actionItems?.length > 0}
                <div>
                    <h4
                        class="text-xs text-gray-500 uppercase tracking-wider mb-2"
                    >
                        Action Items
                    </h4>
                    <ul class="space-y-1">
                        {#each extractedSummary.actionItems as action}
                            <li
                                class="text-fluid-sm text-gray-700 flex items-start gap-2"
                            >
                                <span class="text-yellow-600">→</span>
                                {action}
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}
            {#if extractedSummary.keyPoints?.length > 0}
                <div>
                    <h4
                        class="text-xs text-gray-500 uppercase tracking-wider mb-2"
                    >
                        Key Takeaways
                    </h4>
                    <ul class="space-y-1">
                        {#each extractedSummary.keyPoints as point}
                            <li
                                class="text-fluid-sm text-gray-700 flex items-start gap-2"
                            >
                                <span class="text-blue-400">•</span>
                                {point}
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}
        </div>
    </div>
{/if}
