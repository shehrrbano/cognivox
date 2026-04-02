<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { Transcript } from "./types";

    export let isRunningInTauri = true;
    export let debugMode = false;
    export let debugEventCount = 0;
    export let transcripts: Transcript[] = [];
    export let debugLastEvent = "";
    export let isGeminiConnected = false;

    let visible = true;
</script>

{#if !isRunningInTauri}
    {#if visible}
        <div
            class="fixed top-0 left-0 right-0 z-[10000] bg-orange-600 text-white p-4 font-mono text-sm shadow-2xl animate-fadeIn"
        >
            <div class="relative max-w-4xl mx-auto pr-10 text-center">
                <strong>BROWSER MODE — Features Disabled</strong>
                <p class="mt-1 text-xs opacity-90">
                    You're viewing this in a browser. Close this tab and use the <strong
                        class="text-white underline underline-offset-2"
                    >Cognivox desktop window</strong> instead.
                </p>
                
                <button 
                    class="absolute top-1/2 -right-4 -translate-y-1/2 p-2 hover:bg-white/20 rounded-lg transition-colors group"
                    onclick={() => (visible = false)}
                    aria-label="Dismiss warning"
                >
                    <svg class="w-5 h-5 opacity-70 group-hover:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        </div>
    {/if}
{:else if debugMode}
    <div
        class="fixed top-0 left-0 right-0 z-[9999] bg-green-800 text-white p-3 font-mono text-xs"
    >
        <div class="flex flex-wrap gap-4 items-center justify-center">
            <span>Tauri: <strong>YES</strong></span>
            <span>|</span>
            <span
                >Events: <strong class="text-yellow-500"
                    >{debugEventCount}</strong
                ></span
            >
            <span>|</span>
            <span
                >Transcripts: <strong class="text-yellow-500"
                    >{transcripts.length}</strong
                ></span
            >
            <span>|</span>
            <span
                >Last: <strong class="text-green-500"
                    >{debugLastEvent || "none"}</strong
                ></span
            >
            <span>|</span>
            <span
                >Connected: <strong>{isGeminiConnected ? "YES" : "NO"}</strong
                ></span
            >
        </div>
        {#if transcripts.length > 0}
            <div class="mt-1 text-center text-xs bg-green-700 p-1 rounded">
                LATEST: "{transcripts[transcripts.length - 1]?.text || "empty"}"
            </div>
        {/if}
    </div>
{/if}
