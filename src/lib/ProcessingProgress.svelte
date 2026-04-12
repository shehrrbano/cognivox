<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<!-- CONVERTED: SVELTE_5_PROPS_v1 -->
<script lang="ts">
    interface Props {
        isProcessing?: boolean;
        currentStep?: number;
        error?: string | null;
        onretry?: () => void;
        ondismiss?: () => void;
    }

    let {
        isProcessing = false,
        currentStep = 0,
        error = null,
        onretry,
        ondismiss
    }: Props = $props();

    const steps = [
        { id: 1, label: "Saving recording...", duration: "" },
        { id: 2, label: "Waiting for transcription...", duration: "varies" },
        { id: 3, label: "Vocal Topography Analysis...", duration: "" },
        { id: 4, label: "Building Knowledge Graph...", duration: "" },
        {
            id: 5,
            label: "Extracting Intelligence...",
            duration: "",
            substeps: [
                "Analyzing emotional patterns",
                "Detecting stress markers",
                "Measuring engagement levels",
                "Extracting cognitive insights",
            ],
        },
        { id: 6, label: "Saving final data...", duration: "" },
        { id: 7, label: "Complete!", duration: "" },
    ];

    let currentSubstep = $state(0);
    
    let progressPercent = $derived.by(() => {
        if (!isProcessing) return 0;
        const baseProgress = ((currentStep - 1) / (steps.length - 1)) * 100;
        return Math.min(Math.max(baseProgress, 0), 100);
    });
</script>

{#if isProcessing || error}
    <div class="glass-card p-4 sm:p-6 mb-4 sm:mb-6 animate-fadeIn">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-fluid-base font-semibold text-gray-900 flex items-center gap-2">
                {#if error}
                    Processing Error
                {:else if currentStep >= 7}
                    Processing Complete
                {:else}
                    <span class="animate-spin flex items-center justify-center w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></span>
                    Processing Recording
                {/if}
            </h3>

            {#if currentStep >= 7 || error}
                <button
                    class="text-gray-500 hover:text-gray-700 transition-colors"
                    onclick={ondismiss}
                    aria-label="Dismiss"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            {/if}
        </div>

        {#if error}
            <div class="bg-red-50 border border-red-300 rounded-lg p-4 mb-4">
                <p class="text-red-500 text-sm font-medium">{error}</p>
            </div>
            <div class="flex gap-3">
                <button class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm" onclick={onretry}> Retry </button>
                <button class="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm" onclick={ondismiss}>
                    Dismiss
                </button>
            </div>
        {:else}
            <div class="mb-6">
                <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        class="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700 ease-out"
                        style="width: {progressPercent}%"
                    ></div>
                </div>
            </div>

            <div class="space-y-4">
                {#each steps as step, i}
                    {@const isActive = currentStep === step.id}
                    {@const isComplete = currentStep > step.id}
                    {@const isPending = currentStep < step.id}

                    <div class="flex items-start gap-4 {isPending ? 'opacity-40' : ''}">
                        <div
                            class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                            {isComplete
                                ? 'bg-green-50 text-green-600 border border-green-500/30'
                                : isActive
                                  ? 'bg-blue-50 text-blue-500 border border-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                                  : 'bg-gray-50 text-gray-400 border border-gray-100'}"
                        >
                            {#if isComplete}
                                ✓
                            {:else}
                                {i + 1}
                            {/if}
                        </div>

                        <div class="flex-1">
                            <div class="flex items-center justify-between">
                                <span class="font-bold text-sm {isActive ? 'text-blue-600' : isComplete ? 'text-green-700' : 'text-gray-500'}">
                                    {step.label}
                                </span>
                                {#if step.duration && !isComplete}
                                    <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">{step.duration}</span>
                                {/if}
                            </div>

                            {#if step.substeps && isActive}
                                <div class="mt-2 ml-2 space-y-1.5 border-l-2 border-blue-100 pl-4">
                                    {#each step.substeps as substep, j}
                                        <div class="flex items-center gap-2 text-[12px]">
                                            {#if j < currentSubstep}
                                                <span class="text-green-600">✓</span>
                                                <span class="text-gray-400 line-through font-medium">{substep}</span>
                                            {:else if j === currentSubstep}
                                                <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                                <span class="text-blue-600 font-bold">{substep}</span>
                                            {:else}
                                                <span class="w-1.5 h-1.5 rounded-full bg-gray-200"></span>
                                                <span class="text-gray-400 font-medium">{substep}</span>
                                            {/if}
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>

            {#if currentStep >= 7}
                <div class="mt-6 p-4 bg-green-50 border border-green-500/20 rounded-xl text-center shadow-inner">
                    <p class="text-green-700 font-black text-sm uppercase tracking-wide">
                        Synthesis Complete
                    </p>
                    <p class="text-green-600/70 text-[11px] font-bold mt-1">
                        Neural graph updated. All insights extracted.
                    </p>
                </div>
            {/if}
        {/if}
    </div>
{/if}

<style>
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-7px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn {
        animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
</style>
