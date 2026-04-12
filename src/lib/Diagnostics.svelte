<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<!-- CONVERTED: SVELTE_5_PROPS_v1 -->
<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { invoke } from "@tauri-apps/api/core";

    interface Props {
        isRecording?: boolean;
        isGeminiConnected?: boolean;
    }

    let {
        isRecording = false,
        isGeminiConnected = false
    }: Props = $props();

    // Real metrics from backend
    let audioDevices = $state<string[]>([]);
    let captureMode = $state("mic");
    let currentVolume = $state(0);
    
    // Performance metrics
    let fps = $state(60);
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let memoryUsage = $state(0);
    
    // Connection status
    let apiEndpoint = $state("generativelanguage.googleapis.com");
    let lastRequestTime = $derived(isRecording ? new Date().toLocaleTimeString() : "--");
    let requestCount = $state(0);

    let interval: ReturnType<typeof setInterval>;
    let animationId: number;

    // Calculate real FPS
    function measureFPS() {
        const now = performance.now();
        frameCount++;
        
        if (now - lastFrameTime >= 1000) {
            fps = Math.round(frameCount * 1000 / (now - lastFrameTime));
            frameCount = 0;
            lastFrameTime = now;
        }
        
        animationId = requestAnimationFrame(measureFPS);
    }

    async function loadDevices() {
        try {
            audioDevices = await invoke("list_audio_devices");
        } catch (e) {
            console.error("Failed to load devices:", e);
        }
    }

    async function pollVolume() {
        if (!isRecording) {
            currentVolume = 0;
            return;
        }
        try {
            currentVolume = await invoke("get_current_volume");
        } catch (e) {
            // Ignore
        }
    }

    onMount(() => {
        loadDevices();
        measureFPS();
        
        interval = setInterval(async () => {
            await pollVolume();
            
            // Estimate memory usage (browser-only approximation)
            if ((performance as any).memory) {
                memoryUsage = Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024);
            }
            
            if (isRecording) {
                requestCount++;
            }
        }, 500);
    });

    onDestroy(() => {
        if (interval) clearInterval(interval);
        if (animationId) cancelAnimationFrame(animationId);
    });
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 gap-fluid-gap">
    <!-- Component Status -->
    <div class="glass-card p-4 sm:p-6">
        <h3 class="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="text-blue-500">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
            System Health
        </h3>
        <div class="space-y-3">
            <div class="flex justify-between items-center">
                <span class="text-sm text-gray-500">Audio Engine</span>
                <span class="badge-cyan flex items-center gap-1.5 {isRecording ? 'bg-green-500/15 text-green-600 border-green-500/30' : ''}">
                    <span class="w-2 h-2 rounded-full {isRecording ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}"></span>
                    {isRecording ? "Active" : "Standby"}
                </span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-sm text-gray-500">Gemini API</span>
                <span class="badge-cyan flex items-center gap-1.5 {isGeminiConnected ? 'bg-green-500/15 text-green-600 border-green-500/30' : 'bg-red-500/15 text-red-500 border-red-300'}">
                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">{#if isGeminiConnected}<polyline points="20 6 9 17 4 12"/>{:else}<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>{/if}</svg>
                    {isGeminiConnected ? "Connected" : "Offline"}
                </span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-sm text-gray-500">API Endpoint</span>
                <span class="text-xs text-blue-500 font-mono truncate max-w-[30vw] sm:max-w-40">
                    {apiEndpoint}
                </span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-sm text-gray-500">Last Request</span>
                <span class="text-xs text-gray-500 font-mono">
                    {lastRequestTime}
                </span>
            </div>
        </div>
    </div>

    <!-- Performance Metrics -->
    <div class="glass-card p-4 sm:p-6">
        <h3 class="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="text-blue-500">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            Performance Metrics
        </h3>
        <div class="grid grid-cols-2 gap-3">
            <div class="p-3 rounded-lg bg-gray-200/50 border border-gray-200">
                <div class="text-xs text-gray-400 mb-1">Frame Rate</div>
                <div class="text-xl font-bold {fps >= 55 ? 'text-green-600' : fps >= 30 ? 'text-yellow-600' : 'text-red-500'}">
                    {fps}
                    <span class="text-xs font-normal text-gray-400">FPS</span>
                </div>
            </div>
            <div class="p-3 rounded-lg bg-gray-200/50 border border-gray-200">
                <div class="text-xs text-gray-400 mb-1">Audio Level</div>
                <div class="text-xl font-bold text-blue-500">
                    {(currentVolume * 100).toFixed(0)}
                    <span class="text-xs font-normal text-gray-400">%</span>
                </div>
            </div>
            <div class="p-3 rounded-lg bg-gray-200/50 border border-gray-200">
                <div class="text-xs text-gray-400 mb-1">Sample Rate</div>
                <div class="text-xl font-bold text-blue-500">
                    16
                    <span class="text-xs font-normal text-gray-400">kHz</span>
                </div>
            </div>
            <div class="p-3 rounded-lg bg-gray-200/50 border border-gray-200">
                <div class="text-xs text-gray-400 mb-1">Memory Usage</div>
                <div class="text-xl font-bold text-blue-500">
                    {memoryUsage}
                    <span class="text-xs font-normal text-gray-400">MB</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Audio Pipeline Status -->
    <div class="glass-card p-4 sm:p-6 md:col-span-2">
        <h3 class="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="text-blue-500">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            Audio Pipeline
        </h3>
        <div class="flex items-center gap-4">
            <!-- Pipeline stages -->
            <div class="flex items-center gap-2 flex-1">
                <!-- Capture Stage -->
                <div class="flex-1 relative">
                    <div class="h-2 rounded-full {isRecording ? 'bg-gradient-to-r from-cyan-500 to-cyan-400' : 'bg-slate-700'} transition-all">
                        {#if isRecording && currentVolume > 0.01}
                            <div 
                                class="absolute inset-0 bg-white/20 rounded-full animate-pulse"
                                style="width: {Math.min(currentVolume * 100, 100)}%"
                            ></div>
                        {/if}
                    </div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="text-blue-500 {isRecording ? 'animate-pulse' : 'opacity-30'}">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                <!-- Process Stage -->
                <div class="flex-1 h-2 rounded-full {isRecording ? 'bg-gradient-to-r from-cyan-400 to-blue-500' : 'bg-slate-700'} transition-all" style="transition-delay: 100ms"></div>
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="text-blue-500 {isGeminiConnected ? 'animate-pulse' : 'opacity-30'}">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                <!-- Transmit Stage -->
                <div class="flex-1 h-2 rounded-full {isGeminiConnected ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-slate-700'} transition-all" style="transition-delay: 200ms"></div>
            </div>
        </div>
        <div class="flex justify-between text-xs text-gray-400 mt-2">
            <span class="flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full {isRecording ? 'bg-cyan-500' : 'bg-slate-600'}"></span>
                Capture
            </span>
            <span class="flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full {isRecording ? 'bg-blue-500' : 'bg-slate-600'}"></span>
                Process
            </span>
            <span class="flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full {isGeminiConnected ? 'bg-purple-500' : 'bg-slate-600'}"></span>
                Transmit
            </span>
        </div>
    </div>

    <!-- Audio Devices -->
    <div class="glass-card p-4 sm:p-6 md:col-span-2">
        <h3 class="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="text-blue-500">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
            Audio Devices
        </h3>
        <div class="max-h-32 overflow-y-auto space-y-1">
            {#if audioDevices.length === 0}
                <p class="text-sm text-gray-400">Loading devices...</p>
            {:else}
                {#each audioDevices as device}
                    <div class="text-xs text-gray-500 font-mono py-1 px-2 rounded bg-gray-200/30">
                        {device}
                    </div>
                {/each}
            {/if}
        </div>
    </div>
</div>
