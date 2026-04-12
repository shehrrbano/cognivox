<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<!-- CONVERTED: SVELTE_5_PROPS_v1 -->
<script lang="ts">
    import type { SpeakerIdStatus, SpeakerProfile, IdentifiedSpeaker } from "./types";

    interface Props {
        speakerIdInitialized?: boolean;
        speakerIdStatus?: SpeakerIdStatus | null;
        speakerProfiles?: SpeakerProfile[];
        lastIdentifiedSpeaker?: IdentifiedSpeaker | null;
        oninitializeSpeakerId?: () => void;
        onclearSpeakerProfiles?: () => void;
        onrenameSpeaker?: (data: { speakerId: string; newLabel: string }) => void;
    }

    let {
        speakerIdInitialized = false,
        speakerIdStatus = null,
        speakerProfiles = [],
        lastIdentifiedSpeaker = null,
        oninitializeSpeakerId,
        onclearSpeakerProfiles,
        onrenameSpeaker
    }: Props = $props();

    function handleRename(id: string) {
        const newLabel = prompt("Enter new name for speaker:");
        if (newLabel && onrenameSpeaker) {
            onrenameSpeaker({ speakerId: id, newLabel });
        }
    }
</script>

<div class="h-full flex flex-col space-y-6 p-6 overflow-y-auto">
    <!-- Header -->
    <div class="flex items-center justify-between">
        <div>
            <h2 class="text-xl font-bold text-gray-900">Speaker Recognition</h2>
            <p class="text-sm text-gray-500">Manage and identify participants in the session</p>
        </div>
        <div class="flex gap-2">
            {#if !speakerIdInitialized}
                <button 
                    class="btn-primary"
                    onclick={oninitializeSpeakerId}
                >
                    Initialize AI
                </button>
            {:else}
                <button 
                    class="btn-secondary text-red-500 border-red-100 hover:bg-red-50"
                    onclick={onclearSpeakerProfiles}
                >
                    Clear All Profiles
                </button>
            {/if}
        </div>
    </div>

    {#if !speakerIdInitialized}
        <div class="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">Speaker ID Offline</h3>
            <p class="text-gray-500 max-w-sm">The local speaker identification engine is not active. Click initialize to begin learning voices from the live stream.</p>
        </div>
    {:else}
        <!-- Stats Bar -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="glass-card p-4 border border-gray-100">
                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Status</span>
                <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span class="text-sm font-bold text-gray-800">Engine Active</span>
                </div>
            </div>
            <div class="glass-card p-4 border border-gray-100">
                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Profiles</span>
                <span class="text-lg font-bold text-gray-900">{speakerProfiles.length}</span>
            </div>
            <div class="glass-card p-4 border border-gray-100">
                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Last Match</span>
                <span class="text-sm font-medium text-blue-600 truncate block">
                    {lastIdentifiedSpeaker ? lastIdentifiedSpeaker.speaker_label : 'Waiting for voice...'}
                </span>
            </div>
        </div>

        <!-- Profiles List -->
        <div class="space-y-4">
            <h3 class="text-xs font-black text-gray-400 uppercase tracking-widest">Active Profiles</h3>
            
            {#if speakerProfiles.length === 0}
                <div class="text-center py-8 text-gray-400 text-sm italic">
                    No speaker profiles learned yet. Start talking to train the engine.
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each speakerProfiles as profile}
                        <div class="glass-card p-4 border border-gray-100 flex items-center justify-between group">
                            <div class="flex items-center gap-4">
                                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                                    {profile.label.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <span class="font-bold text-gray-900">{profile.label}</span>
                                        <button 
                                            class="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 hover:text-blue-700"
                                            onclick={() => handleRename(profile.id)}
                                            aria-label="Rename speaker"
                                        >
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                                        </button>
                                    </div>
                                    <div class="flex items-center gap-3 text-[10px] text-gray-400">
                                        <span>{profile.sample_count} samples</span>
                                        <span>•</span>
                                        <span>Learned {new Date(profile.created_at * 1000).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="flex flex-col items-end">
                                <span class="text-[10px] font-bold text-gray-400 uppercase">Confidence</span>
                                <div class="w-16 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                    <div class="h-full bg-blue-500" style="width: 85%"></div>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
</div>
