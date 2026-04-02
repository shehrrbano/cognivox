<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { Transcript } from "./types";

    export let isRunningInTauri = true;
    export let debugMode = false;
    export let debugEventCount = 0;
    export let transcripts: Transcript[] = [];
    export let debugLastEvent = "";
    export let isGeminiConnected = false;
</script>

{#if !isRunningInTauri}
    <div
        class="fixed top-0 left-0 right-0 z-[9999] bg-orange-600 text-white p-4 font-mono text-sm"
    >
        <div class="text-center">
            <strong>BROWSER MODE — Features Disabled</strong>
            <p class="mt-1 text-xs">
                You're viewing this in a browser. Close this tab and use the <strong
                    >Cognivox desktop window</strong
                > instead.
            </p>
            <p class="mt-1 text-xs">
                To launch: run <code class="bg-black/30 px-1 rounded"
                    >npx tauri dev</code
                > in the project directory and use the native window that opens.
            </p>
        </div>
    </div>
    <div class="h-20"></div>
{:else if debugMode}
    <div
        class="fixed top-0 left-0 right-0 z-[9999] bg-green-800 text-white p-3 font-mono text-xs"
    >
        <div class="flex flex-wrap gap-4 items-center justify-center">
            <span>Tauri: <strong>YES</strong></span>
            <span>|</span>
            <span
                >Events: <strong class="text-yellow-300"
                    >{debugEventCount}</strong
                ></span
            >
            <span>|</span>
            <span
                >Transcripts: <strong class="text-yellow-300"
                    >{transcripts.length}</strong
                ></span
            >
            <span>|</span>
            <span
                >Last: <strong class="text-green-300"
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
    <div class="h-12"></div>
{/if}
