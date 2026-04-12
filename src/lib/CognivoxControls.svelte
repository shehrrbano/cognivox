<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<!-- CONVERTED: SVELTE_5_PROPS_v1 -->
<script lang="ts">
    import { invoke } from "@tauri-apps/api/core";

    interface Props {
        onsettingsChange?: (settings: any) => void;
        onintelligenceInjected?: (intelligence: any) => void;
    }

    let {
        onsettingsChange,
        onintelligenceInjected
    }: Props = $props();

    let confidenceThreshold = $state(0.7);
    let vadSensitivity = $state(0.5);
    let predictionAggression = $state(0.5);
    let autoConnect = $state(false);
    let enableOptimistic = $state(true);
    
    // Manual injection
    let manualText = $state("");
    let manualCategory = $state("TASK");

    // All 16 categories from Cognivox
    let categories = $state([
        { id: "TASK", label: "Tasks", checked: true },
        { id: "DECISION", label: "Decisions", checked: true },
        { id: "DEADLINE", label: "Deadlines", checked: true },
        { id: "ACTION_ITEM", label: "Action Items", checked: true },
        { id: "RISK", label: "Risks", checked: true },
        { id: "URGENCY", label: "Urgency", checked: true },
        { id: "SENTIMENT", label: "Sentiment", checked: false },
        { id: "INTERRUPTION", label: "Interruptions", checked: false },
        { id: "AGREEMENT", label: "Agreement", checked: false },
        { id: "DISAGREEMENT", label: "Disagreement", checked: false },
        { id: "EMOTION_SHIFT", label: "Emotion Shifts", checked: false },
        { id: "TOPIC_DRIFT", label: "Topic Drifts", checked: false },
    ]);

    async function updateSettings() {
        const selectedCategories = categories.filter((c) => c.checked).map((c) => c.id);
        
        const settings = {
            confidenceThreshold,
            vadSensitivity,
            predictionAggression,
            autoConnect,
            enableOptimistic,
            categories: selectedCategories,
        };
        
        // Call backend
        try {
            await invoke("update_processing_settings", {
                confidenceThreshold,
                predictionAggression,
                enableOptimistic,
                categories: selectedCategories,
            });
        } catch (error) {
            console.error("Failed to update settings:", error);
        }
        
        if (onsettingsChange) onsettingsChange(settings);
    }
    
    async function injectIntelligence() {
        if (!manualText.trim()) return;
        
        try {
            const result = await invoke("inject_manual_intelligence", {
                text: manualText,
                category: manualCategory,
                confidence: 1.0,
            });
            console.log("Injected intelligence:", result);
            manualText = "";
            if (onintelligenceInjected) onintelligenceInjected(result);
        } catch (error) {
            console.error("Failed to inject intelligence:", error);
        }
    }
</script>

<div class="space-y-fluid-gap">
    <!-- Confidence -->
    <div>
        <label for="conf" class="block text-xs text-gray-500 mb-2">
            Min Confidence Threshold
        </label>
        <div class="flex items-center gap-4">
            <input
                id="conf"
                type="range"
                min="0"
                max="1"
                step="0.05"
                bind:value={confidenceThreshold}
                onchange={updateSettings}
                class="w-full"
            />
            <span class="text-sm font-mono text-blue-500 w-12 text-right">
                {(confidenceThreshold * 100).toFixed(0)}%
            </span>
        </div>
    </div>

    <!-- VAD -->
    <div>
        <label for="vad" class="block text-xs text-gray-500 mb-2">
            Voice Activity Sensitivity
        </label>
        <div class="flex items-center gap-4">
            <input
                id="vad"
                type="range"
                min="0"
                max="1"
                step="0.1"
                bind:value={vadSensitivity}
                onchange={updateSettings}
                class="w-full"
            />
            <span class="text-sm font-mono text-blue-500 w-12 text-right">
                {vadSensitivity}
            </span>
        </div>
    </div>

    <!-- Toggles -->
    <div class="flex items-center gap-3">
        <input
            id="autoconnect"
            type="checkbox"
            bind:checked={autoConnect}
            onchange={updateSettings}
            class="w-4 h-4 rounded"
        />
        <label for="autoconnect" class="text-sm text-gray-700">
            Auto-connect on startup
        </label>
    </div>

    <!-- Filters -->
    <div class="pt-4 border-t border-gray-200">
        <h4 class="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-3">
            Intelligence Filters
        </h4>
        <div class="grid grid-cols-1 xs:grid-cols-2 gap-2">
            {#each categories as cat}
                <div class="flex items-center gap-2">
                    <input
                        id={cat.id}
                        type="checkbox"
                        bind:checked={cat.checked}
                        onchange={updateSettings}
                        class="w-4 h-4 rounded"
                    />
                    <label for={cat.id} class="text-sm text-gray-700">
                        {cat.label}
                    </label>
                </div>
            {/each}
        </div>
    </div>
    
    <!-- Prediction Controls -->
    <div class="pt-4 border-t border-gray-200">
        <h4 class="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-3">
            Prediction & Optimistic Mode
        </h4>
        
        <div class="space-y-fluid-gap">
            <div>
                <label for="pred" class="block text-xs text-gray-500 mb-2">
                    Prediction Aggression
                </label>
                <div class="flex items-center gap-4">
                    <input
                        id="pred"
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        bind:value={predictionAggression}
                        onchange={updateSettings}
                        class="w-full"
                    />
                    <span class="text-sm font-mono text-blue-500 w-12 text-right">
                        {(predictionAggression * 100).toFixed(0)}%
                    </span>
                </div>
            </div>
            
            <div class="flex items-center gap-3">
                <input
                    id="optimistic"
                    type="checkbox"
                    bind:checked={enableOptimistic}
                    onchange={updateSettings}
                    class="w-4 h-4 rounded"
                />
                <label for="optimistic" class="text-sm text-gray-700">
                    Enable Optimistic Predictions (Local)
                </label>
            </div>
        </div>
    </div>
    
    <!-- Manual Intelligence Injection -->
    <div class="pt-4 border-t border-gray-200">
        <h4 class="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-3">
            Manual Intelligence Inject
        </h4>
        
        <div class="space-y-fluid-gap">
            <input
                type="text"
                placeholder="Enter text to inject..."
                bind:value={manualText}
                class="input-field"
            />
            <div class="flex gap-2">
                <select
                    bind:value={manualCategory}
                    class="select-field flex-1"
                >
                    <option value="TASK">Task</option>
                    <option value="DECISION">Decision</option>
                    <option value="RISK">Risk</option>
                    <option value="ACTION_ITEM">Action Item</option>
                </select>
                <button
                    class="btn-primary"
                    onclick={injectIntelligence}
                >
                    Inject
                </button>
            </div>
        </div>
    </div>
    
    <!-- Keyboard Shortcuts Reference -->
    <div class="pt-4 border-t border-gray-200">
        <h4 class="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="2" y="4" width="13" height="11" rx="2" ry="2"/><path d="M6 8h.001"/><path d="M10 8h.001"/><path d="M14 8h.001"/><path d="M18 8h.001"/><path d="M8 12h.001"/><path d="M12 12h.001"/><path d="M16 12h.001"/><path d="M7 16h10"/></svg> Keyboard Shortcuts
        </h4>
        <div class="text-xs text-gray-500 space-y-1.5">
            <div class="flex items-center gap-2">
                <kbd class="px-1.5 py-0.5 bg-gray-200 rounded text-blue-500 border border-blue-200">Ctrl+Shift+R</kbd>
                <span>Toggle Recording</span>
            </div>
            <div class="flex items-center gap-2">
                <kbd class="px-1.5 py-0.5 bg-gray-200 rounded text-blue-500 border border-blue-200">Ctrl+Shift+G</kbd>
                <span>Graph View</span>
            </div>
            <div class="flex items-center gap-2">
                <kbd class="px-1.5 py-0.5 bg-gray-200 rounded text-blue-500 border border-blue-200">Ctrl+Shift+A</kbd>
                <span>Alerts</span>
            </div>
            <div class="flex items-center gap-2">
                <kbd class="px-1.5 py-0.5 bg-gray-200 rounded text-blue-500 border border-blue-200">Ctrl+Shift+T</kbd>
                <span>Transcripts</span>
            </div>
        </div>
    </div>
</div>
