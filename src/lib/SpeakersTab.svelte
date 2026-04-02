<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type {
        SpeakerIdStatus,
        SpeakerProfile,
        IdentifiedSpeaker,
    } from "./types";

    export let speakerIdInitialized = false;
    export let speakerIdStatus: SpeakerIdStatus | null = null;
    export let speakerProfiles: SpeakerProfile[] = [];
    export let lastIdentifiedSpeaker: IdentifiedSpeaker | null = null;

    const dispatch = createEventDispatcher();

    function initializeSpeakerId() {
        dispatch("initializeSpeakerId");
    }

    function clearSpeakerProfiles() {
        dispatch("clearSpeakerProfiles");
    }

    function renameSpeaker(speakerId: string) {
        const name = prompt(
            "New name for " +
                speakerProfiles.find((p) => p.id === speakerId)?.label +
                ":",
        );
        if (name) {
            dispatch("renameSpeaker", { speakerId, newLabel: name });
        }
    }
</script>

<!-- ECAPA-TDNN Speaker Identification Panel -->
<div class="p-3 sm:p-4 space-y-fluid-gap">
    <div class="flex items-center justify-between">
        <h3 class="text-fluid-base font-semibold text-blue-600">
            Speaker Identification
        </h3>
        <span
            class="text-xs px-2 py-1 rounded {speakerIdInitialized
                ? 'bg-green-50 text-green-600'
                : 'bg-yellow-50 text-yellow-600'}"
        >
            {speakerIdInitialized ? "ECAPA-TDNN Active" : "Not Initialized"}
        </span>
    </div>

    <div class="text-xs text-gray-400 space-y-1">
        <p>Model: ECAPA-TDNN (192-dim embeddings, ~95% accuracy)</p>
        <p>Method: Voice biometric comparison via cosine similarity</p>
        {#if speakerIdStatus}
            <p>
                Known speakers: {speakerIdStatus.speaker_count}
                | Threshold: {speakerIdStatus.threshold.toFixed(2)}
            </p>
        {/if}
    </div>

    {#if !speakerIdInitialized}
        <button
            class="px-4 py-2 rounded bg-blue-50 border border-blue-300 text-blue-600 hover:bg-blue-100 transition text-sm"
            onclick={initializeSpeakerId}
        >
            Initialize Speaker ID
        </button>
        <p class="text-xs text-gray-400">
            Requires ONNX model. Run: <code class="text-blue-500"
                >python scripts/export_ecapa_tdnn.py</code
            >
        </p>
    {/if}

    {#if lastIdentifiedSpeaker}
        <div class="p-3 rounded bg-blue-50 border border-blue-200">
            <p class="text-sm text-blue-600">
                Last identified: <strong
                    >{lastIdentifiedSpeaker.speaker_label}</strong
                >
            </p>
            <p class="text-xs text-gray-400">
                Confidence: {(lastIdentifiedSpeaker.confidence * 100).toFixed(
                    1,
                )}% | {lastIdentifiedSpeaker.is_new
                    ? "New speaker"
                    : "Known speaker"}
            </p>
        </div>
    {/if}

    {#if speakerProfiles.length > 0}
        <div class="space-y-2">
            <h4 class="text-sm font-medium text-gray-800">
                Known Speakers ({speakerProfiles.length})
            </h4>
            {#each speakerProfiles as profile}
                <div
                    class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 rounded bg-gray-50 border border-gray-200 gap-2"
                >
                    <div>
                        <span class="text-sm text-blue-600"
                            >{profile.label}</span
                        >
                        <span class="text-xs text-gray-400 ml-2"
                            >({profile.sample_count} segments)</span
                        >
                    </div>
                    <div class="flex gap-2">
                        <button
                            class="text-xs px-2 py-1 rounded bg-blue-50 text-blue-500 hover:bg-blue-100"
                            onclick={() => renameSpeaker(profile.id)}
                            >Rename</button
                        >
                    </div>
                </div>
            {/each}
            <button
                class="text-xs px-3 py-1.5 rounded bg-red-50 border border-red-300 text-red-500 hover:bg-red-100 mt-2"
                onclick={clearSpeakerProfiles}>Clear All Profiles</button
            >
        </div>
    {/if}
</div>
