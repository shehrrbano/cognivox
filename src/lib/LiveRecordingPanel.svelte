<script lang="ts">
    import { onMount, onDestroy, untrack } from "svelte";
    import { vadManager, type VADState } from "./vadManager";
    import KnowledgeGraph from "./KnowledgeGraph.svelte";
    import Icon from "./Icon.svelte";

    let {
        isRecording = false,
        isRecordingStarting = false,
        currentVolume = 0,
        isGeminiConnected = false,
        transcripts = [],
        graphNodes = [],
        graphEdges = [],
        stressLevel = $bindable(0),
        engagementLevel = $bindable(0.3),
        urgencyLevel = $bindable(0),
        clarityLevel = $bindable(0.4),
        recordingSeconds = 0
    } = $props();

    // Track last processed tone to avoid re-triggering on same transcript
    let lastProcessedToneId = $state("");

    // VAD State
    let vadState: VADState = $state(vadManager.getState());
    let unsubscribe: (() => void) | null = null;

    // Waveform bars
    const BAR_COUNT = 50;
    let barHistory: { level: number; isSpeech: boolean }[] = $state([]);
    const SPEECH_THRESHOLD = 0.015;

    // Animation
    let lastUpdateTime = 0;

    // Waveform update interval
    let waveformInterval: ReturnType<typeof setInterval> | null = null;
    let wasRecording = false;
    let isGraphExpanded = $state(false);

    // === WEB AUDIO API dB METER ===
    // Using $state for dB values so they drive reactive template updates.
    // Polled via setInterval(50ms) instead of requestAnimationFrame to avoid
    // flooding Svelte 5 scheduler with 60fps $state writes.
    let inputDb = $state(-60);
    let processedDb = $state(-60);
    let audioCtx: AudioContext | null = null;
    let analyserNode: AnalyserNode | null = null;
    let micStream: MediaStream | null = null;
    let dbPollInterval: ReturnType<typeof setInterval> | null = null;
    let webAudioActive = $state(false);
    // smoothed value for processedDb (plain non-reactive variable)
    let _smoothedDb = -60;

    // React to isRecording changes: start/stop waveform interval and Web Audio
    $effect(() => {
        if (isRecording && !isRecordingStarting && !wasRecording) {
            barHistory = [];
            lastUpdateTime = 0;
            if (waveformInterval) clearInterval(waveformInterval);
            waveformInterval = setInterval(() => {
                updateWaveform(effectiveVolume);
            }, 80);
            wasRecording = true;
            initWebAudio();
        } else if (!isRecording && wasRecording) {
            if (waveformInterval) {
                clearInterval(waveformInterval);
                waveformInterval = null;
            }
            wasRecording = false;
            destroyWebAudio();
        }
    });

    // Effective volume: Web Audio when available and Tauri volume is flat
    let effectiveVolume = $derived(
        webAudioActive && inputDb > -58
            ? Math.pow(10, (inputDb + 6) / 20) // scale up slightly for waveform
            : currentVolume
    );

    async function initWebAudio() {
        try {
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            audioCtx = new AudioContext();
            analyserNode = audioCtx.createAnalyser();
            analyserNode.fftSize = 512;
            analyserNode.smoothingTimeConstant = 0.8;
            const src = audioCtx.createMediaStreamSource(micStream);
            src.connect(analyserNode);
            webAudioActive = true;
            // Poll at 20fps (50ms) instead of 60fps rAF to avoid flooding Svelte scheduler
            dbPollInterval = setInterval(sampleDb, 50);
        } catch (e) {
            console.warn('[LiveRecordingPanel] Web Audio init failed (will use Tauri volume):', e);
            webAudioActive = false;
        }
    }

    function sampleDb() {
        if (!analyserNode) return;
        const buf = new Float32Array(analyserNode.fftSize);
        analyserNode.getFloatTimeDomainData(buf);
        let rms = 0;
        for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
        rms = Math.sqrt(rms / buf.length);
        const raw = rms > 0.00001 ? Math.max(-60, Math.min(0, 20 * Math.log10(rms))) : -60;
        inputDb = raw;
        _smoothedDb = _smoothedDb * 0.7 + raw * 0.3;
        processedDb = Math.max(-60, _smoothedDb - 1.5);
    }

    function destroyWebAudio() {
        if (dbPollInterval !== null) { clearInterval(dbPollInterval); dbPollInterval = null; }
        if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
        if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
        analyserNode = null;
        webAudioActive = false;
        inputDb = -60;
        processedDb = -60;
        _smoothedDb = -60;
    }

    // dB to 0..100% for meter fill
    function dbToPercent(db: number): number {
        return Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
    }

    function dbColor(db: number): string {
        if (db > -10) return '#ef4444';
        if (db > -20) return '#f97316';
        if (db > -35) return '#22c55e';
        return '#3b82f6';
    }

    // Recent transcript for live display
    let liveTranscript = $derived(
        transcripts.length > 0 ? transcripts[transcripts.length - 1] : null
    );

    function updateWaveform(vol: number) {
        const now = Date.now();
        if (now - lastUpdateTime < 50) return;
        lastUpdateTime = now;

        const isSpeech = vol > SPEECH_THRESHOLD;
        const jitteredLevel = vol * (0.85 + Math.random() * 0.3);
        barHistory = [
            ...barHistory.slice(-BAR_COUNT + 1),
            { level: jitteredLevel, isSpeech },
        ];

        urgencyLevel = Math.max(0, urgencyLevel - 0.001);
        stressLevel = Math.max(0, stressLevel - 0.001);
        engagementLevel = Math.max(0.2, engagementLevel - 0.0008);
        clarityLevel = Math.max(0.3, clarityLevel - 0.0008);
    }

    // Track emotions from transcript tones
    $effect(() => {
        if (liveTranscript?.tone && liveTranscript?.id !== lastProcessedToneId) {
            lastProcessedToneId = liveTranscript.id;
            const t = liveTranscript.tone;
            if (t === "URGENT") { urgencyLevel = Math.min(1, urgencyLevel + 0.35); stressLevel = Math.min(1, stressLevel + 0.15); clarityLevel = Math.min(1, clarityLevel + 0.05); }
            if (t === "FRUSTRATED") { stressLevel = Math.min(1, stressLevel + 0.35); urgencyLevel = Math.min(1, urgencyLevel + 0.1); clarityLevel = Math.max(0, clarityLevel - 0.1); }
            if (t === "NEGATIVE") { stressLevel = Math.min(1, stressLevel + 0.25); engagementLevel = Math.max(0, engagementLevel - 0.05); }
            if (t === "EXCITED") { engagementLevel = Math.min(1, engagementLevel + 0.35); clarityLevel = Math.min(1, clarityLevel + 0.1); }
            if (t === "POSITIVE") { engagementLevel = Math.min(1, engagementLevel + 0.25); clarityLevel = Math.min(1, clarityLevel + 0.1); stressLevel = Math.max(0, stressLevel - 0.05); }
            if (t === "HESITANT") { clarityLevel = Math.max(0, clarityLevel - 0.15); stressLevel = Math.min(1, stressLevel + 0.1); engagementLevel = Math.max(0, engagementLevel - 0.05); }
            if (t === "DOMINANT") { engagementLevel = Math.min(1, engagementLevel + 0.3); urgencyLevel = Math.min(1, urgencyLevel + 0.15); clarityLevel = Math.min(1, clarityLevel + 0.1); }
            if (t === "EMPATHETIC") { engagementLevel = Math.min(1, engagementLevel + 0.2); stressLevel = Math.max(0, stressLevel - 0.1); clarityLevel = Math.min(1, clarityLevel + 0.1); }
            if (t === "NEUTRAL") { clarityLevel = Math.min(1, clarityLevel + 0.05); }
        }
    });

    function getBarColor(isSpeech: boolean, level: number): string {
        if (level < 0.003) return "bg-gray-100";
        if (level < 0.01) return "bg-blue-100";
        if (isSpeech) return "bg-gradient-to-t from-green-600 to-green-400";
        return "bg-gradient-to-t from-yellow-600 to-yellow-400";
    }

    function getGaugeColor(value: number): string {
        if (value > 0.7) return "#ef4444";
        if (value > 0.4) return "#eab308";
        return "#22c55e";
    }

    function formatTime(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, "0")}`;
    }

    function getMinBufferPercent(): number {
        const minRequired = vadManager.getConfig().minSpeechDuration;
        return Math.min(100, (vadState.bufferDuration / minRequired) * 100);
    }

    // Whisper status label
    let whisperStatusLabel = $derived(
        vadState.chunksSent > 0
            ? `${vadState.chunksSent} chunk${vadState.chunksSent !== 1 ? 's' : ''} sent`
            : vadState.status === 'sending'
            ? 'Sending...'
            : vadState.status === 'buffering'
            ? 'Buffering...'
            : 'Waiting for speech'
    );

    let whisperStatusColor = $derived(
        vadState.chunksSent > 0
            ? 'text-green-600'
            : vadState.status === 'sending'
            ? 'text-blue-500'
            : vadState.status === 'buffering'
            ? 'text-orange-500'
            : 'text-gray-400'
    );

    onMount(() => {
        unsubscribe = vadManager.subscribe((state) => {
            untrack(() => {
                vadState = state;
            });
        });
    });

    onDestroy(() => {
        if (unsubscribe) unsubscribe();
        if (waveformInterval) {
            clearInterval(waveformInterval);
            waveformInterval = null;
        }
        destroyWebAudio();
    });
</script>

{#if isRecording}
    <div class="live-recording-panel animate-fadeIn">

        <!-- === LIVE RECORDING STATUS BAR === -->
        <div class="status-bar glass-card p-3 sm:p-4 mb-4 border-blue-200">
            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">

                <!-- LEFT: Status indicator + mic animation -->
                <div class="flex items-center gap-3 flex-shrink-0">
                    <div class="relative flex items-center justify-center w-8 h-8">
                        {#if vadState.isSpeaking}
                            <div class="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-30"></div>
                            <div class="absolute inset-1 bg-green-500 rounded-full animate-pulse opacity-60"></div>
                        {:else}
                            <div class="absolute inset-1 bg-blue-200 rounded-full"></div>
                        {/if}
                        <svg class="relative z-10 w-4 h-4 {vadState.isSpeaking ? 'text-white' : 'text-blue-400'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                            <line x1="12" y1="19" x2="12" y2="23"></line>
                            <line x1="8" y1="23" x2="16" y2="23"></line>
                        </svg>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold {vadState.isSpeaking ? 'text-green-600' : 'text-gray-500'} uppercase tracking-wider">
                            {vadState.isSpeaking ? 'Speaking' : 'Listening...'}
                        </span>
                        <!-- Whisper activity -->
                        <span class="text-[10px] font-mono {whisperStatusColor} mt-0.5">
                            Whisper: {whisperStatusLabel}
                        </span>
                    </div>
                </div>

                <!-- CENTER: dB meters + waveform -->
                <div class="flex-1 w-full sm:w-auto flex flex-col gap-1.5">
                    <!-- Input dB meter -->
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] font-mono text-gray-400 w-16 text-right flex-shrink-0">
                            {inputDb > -59 ? `${inputDb.toFixed(1)} dB` : '--- dB'}
                        </span>
                        <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                class="h-full rounded-full transition-all duration-75"
                                style="width: {dbToPercent(inputDb)}%; background-color: {dbColor(inputDb)}"
                            ></div>
                        </div>
                        <span class="text-[10px] font-bold text-gray-400 w-6 flex-shrink-0">IN</span>
                    </div>
                    <!-- Processed/output dB meter -->
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] font-mono text-gray-400 w-16 text-right flex-shrink-0">
                            {processedDb > -59 ? `${processedDb.toFixed(1)} dB` : '--- dB'}
                        </span>
                        <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                class="h-full rounded-full transition-all duration-150"
                                style="width: {dbToPercent(processedDb)}%; background-color: {dbColor(processedDb)}"
                            ></div>
                        </div>
                        <span class="text-[10px] font-bold text-gray-400 w-6 flex-shrink-0">OUT</span>
                    </div>
                </div>

                <!-- RIGHT: Stats row -->
                <div class="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 flex-shrink-0 flex-wrap">
                    <!-- LIVE badge -->
                    <div class="flex items-center gap-1 px-2 py-1 bg-red-50 rounded-full border border-red-100">
                        <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                        <span class="text-red-600 font-mono">{recordingSeconds.toString().padStart(2,'0')}s</span>
                        <span class="text-red-400 font-black ml-0.5">LIVE</span>
                    </div>
                    <!-- VAD confidence -->
                    <span class="text-blue-500">{(vadState.vadConfidence * 100).toFixed(0)}% VAD</span>
                    <!-- Buffer -->
                    <div class="flex items-center gap-1.5">
                        <span>Buf</span>
                        <div class="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                class="h-full transition-all duration-200 rounded-full {getMinBufferPercent() >= 100 ? 'bg-green-500' : 'bg-blue-500'}"
                                style="width: {getMinBufferPercent()}%"
                            ></div>
                        </div>
                    </div>
                </div>

            </div>

            <!-- Waveform row -->
            {#if barHistory.length > 0}
                <div class="mt-3 flex items-end gap-px h-8 w-full">
                    {#each barHistory.slice(-BAR_COUNT) as bar, i}
                        {@const height = Math.max(3, Math.min(28, bar.level * 400))}
                        <div
                            class="flex-1 min-w-[1px] max-w-[3px] rounded-t-sm transition-all duration-50 {getBarColor(bar.isSpeech, bar.level)}"
                            style="height: {height}px; opacity: {0.4 + (i / BAR_COUNT) * 0.6}"
                        ></div>
                    {/each}
                </div>
            {:else}
                <!-- Skeleton bars while initializing -->
                <div class="mt-3 flex items-end gap-px h-8 w-full opacity-20">
                    {#each Array(BAR_COUNT) as _, i}
                        <div class="flex-1 min-w-[1px] max-w-[3px] rounded-t-sm bg-blue-200 h-1"></div>
                    {/each}
                </div>
            {/if}
        </div>

        <!-- === MAIN GRID: Transcript + Knowledge Graph === -->
        <div class="grid grid-cols-1 xl:grid-cols-12 gap-0 border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">

            <!-- LEFT: Real-Time Transcript -->
            <div class="xl:col-span-4 border-b xl:border-b-0 xl:border-r border-gray-100 bg-white flex flex-col min-h-[400px]">
                <div class="p-4 sm:p-5 border-b border-gray-50 flex items-center justify-between">
                    <span class="text-xs font-black text-blue-600 tracking-widest uppercase">Real-Time Transcript</span>
                    <div class="flex items-center gap-2">
                        <!-- Whisper processing badge -->
                        {#if vadState.status === 'sending'}
                            <span class="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase animate-pulse">
                                Sending to Whisper
                            </span>
                        {:else if vadState.status === 'buffering'}
                            <span class="bg-orange-50 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase animate-pulse">
                                Buffering
                            </span>
                        {:else}
                            <span class="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm tracking-wider uppercase">Live</span>
                        {/if}
                    </div>
                </div>

                <div class="flex-1 transcript-scroll overflow-y-auto p-4 sm:p-5 space-y-5">
                    {#if transcripts.length > 0}
                        {#each transcripts.slice(-15) as t (t.id)}
                            {@const isSpeaker1 = t.speaker?.includes("1") || t.speaker === "You"}
                            <div class="relative pl-4 animate-fadeIn">
                                <div class="absolute left-0 top-0 bottom-0 w-[3px] rounded-full {isSpeaker1 ? 'bg-blue-500' : 'bg-transparent'}"></div>
                                <div class="flex items-center justify-between mb-1">
                                    <span class="text-[10px] font-mono text-gray-400">{t.timestamp}</span>
                                    <span class="text-[10px] font-bold uppercase tracking-wider {isSpeaker1 ? 'text-blue-600' : 'text-blue-400'}">
                                        {isSpeaker1 ? 'Speaker 1' : 'Speaker 2'}
                                    </span>
                                </div>
                                <p class="text-sm leading-relaxed text-gray-800">
                                    {#if Array.isArray(t.category) ? t.category.some((c: string) => c.toUpperCase() === "RISK") : (t.category as any) === "risk"}
                                        {@html t.text.replace(/latency|risk/gi, (match: string) => `<span class="text-red-500 font-medium">${match}</span>`)}
                                    {:else if Array.isArray(t.category) ? t.category.some((c: string) => c.toUpperCase() === "TASK" || c.toUpperCase() === "ACTION_ITEM") : (t.category as any) === "task"}
                                        {@html t.text.replace(/task|benchmarking/gi, (match: string) => `<span class="bg-blue-50 text-blue-600 px-1 font-medium rounded">${match}</span>`)}
                                    {:else if Array.isArray(t.category) ? t.category.some((c: string) => c.toUpperCase() === "DECISION") : (t.category as any) === "decision"}
                                        {@html t.text.replace(/decision/gi, (match: string) => `<span class="text-[10px] font-bold tracking-widest uppercase text-green-600 ml-1">${match}</span>`)}
                                    {:else}
                                        {t.text}
                                    {/if}
                                    {#if t.isPartial}
                                        <span class="inline-flex gap-0.5 ml-1">
                                            <span class="w-1 h-1 bg-gray-300 rounded-full animate-pulse"></span>
                                            <span class="w-1 h-1 bg-gray-300 rounded-full animate-pulse" style="animation-delay: 0.1s"></span>
                                            <span class="w-1 h-1 bg-gray-300 rounded-full animate-pulse" style="animation-delay: 0.2s"></span>
                                        </span>
                                    {/if}
                                </p>
                            </div>
                        {/each}
                    {:else}
                        <div class="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
                            <!-- Animated mic waiting icon -->
                            <div class="relative w-10 h-10">
                                <div class="absolute inset-0 bg-blue-100 rounded-full animate-pulse"></div>
                                <div class="absolute inset-2 bg-blue-200 rounded-full animate-ping opacity-40"></div>
                                <svg class="relative z-10 w-10 h-10 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                    <line x1="12" y1="19" x2="12" y2="23"></line>
                                    <line x1="8" y1="23" x2="16" y2="23"></line>
                                </svg>
                            </div>
                            <p class="text-gray-400 text-sm font-medium">Awaiting audio input...</p>
                            <p class="text-gray-300 text-xs">Speak clearly — Whisper is listening</p>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- RIGHT: Knowledge Graph -->
            <div class="xl:col-span-8 bg-[#fafafa] relative flex flex-col min-h-[400px]" style="background-image: radial-gradient(circle, #e5e7eb 1px, transparent 1px); background-size: 24px 24px;">

                <!-- Graph legend -->
                <div class="absolute top-4 left-4 flex gap-2 z-10 flex-wrap">
                    {#each [['bg-blue-500','Tasks'],['bg-green-500','Decisions'],['bg-red-500','Risks']] as [color, label]}
                        <div class="bg-white border border-gray-100 rounded-full shadow-sm px-2.5 py-1 flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full {color}"></span>
                            <span class="text-[10px] uppercase font-bold text-gray-600 tracking-wider">{label}</span>
                        </div>
                    {/each}
                </div>

                <!-- Graph -->
                <div class="flex-1 w-full relative">
                    <KnowledgeGraph
                        nodes={graphNodes}
                        edges={graphEdges}
                        bind:isFullscreen={isGraphExpanded}
                        compact={false}
                    />
                </div>

                <!-- Expand button -->
                <div class="absolute bottom-4 right-4">
                    <button
                        onclick={() => isGraphExpanded = true}
                        class="w-8 h-8 bg-white border border-gray-100 rounded-lg shadow-sm flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-gray-50 transition-colors"
                        title="Expand graph"
                    >
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8V5a2 2 0 0 1 2-2h3"></path><path d="M21 8V5a2 2 0 0 0-2-2h-3"></path><path d="M3 16v3a2 2 0 0 0 2 2h3"></path><path d="M21 16v3a2 2 0 0 1-2 2h-3"></path></svg>
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-7px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }

    .transcript-scroll::-webkit-scrollbar { width: 3px; }
    .transcript-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.03); border-radius: 1px; }
    .transcript-scroll::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.2); border-radius: 1px; }

    .live-recording-panel { /* fills space */ }
</style>
