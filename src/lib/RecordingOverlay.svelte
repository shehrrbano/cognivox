<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<!-- CONVERTED: SVELTE_5_PROPS_v1 -->
<script lang="ts">
    interface Props {
        isRecording?: boolean;
        status?: string;
        currentVolume?: number;
        elapsedSeconds?: number;
        isGeminiConnected?: boolean;
        onopenSettings?: () => void;
        ontoggleCapture?: () => void;
    }

    let {
        isRecording = false,
        status = "Recording...",
        currentVolume = 0,
        elapsedSeconds = 0,
        isGeminiConnected = false,
        onopenSettings = () => {},
        ontoggleCapture = () => {}
    }: Props = $props();

    function formatTime(seconds: number): string {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function volToDb(vol: number): number {
        return vol > 0.00001 ? Math.max(-60, Math.min(0, 20 * Math.log10(vol))) : -60;
    }

    function dbToPercent(db: number): number {
        return Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
    }

    function dbColor(db: number): string {
        if (db > -10) return '#ef4444';
        if (db > -20) return '#f97316';
        if (db > -35) return '#22c55e';
        return '#3b82f6';
    }
</script>

{#if isRecording}
    <div class="fixed top-0 left-0 right-0 z-50 pointer-events-none animate-slideDown">
        <div class="bg-gradient-to-r from-red-900/95 via-red-800/95 to-red-900/95 border-b border-red-300 backdrop-blur-sm shadow-lg shadow-red-500/20 pointer-events-auto">
            <div class="max-w-7xl mx-auto px-3 sm:px-6 py-2.5">
                <div class="flex items-center justify-between gap-3">

                    <!-- LEFT: pulsing dot + REC + status -->
                    <div class="flex items-center gap-2.5 flex-shrink-0">
                        <div class="relative w-3.5 h-3.5">
                            <div class="w-3.5 h-3.5 bg-red-400 rounded-full animate-pulse"></div>
                            <div class="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-60"></div>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-white font-black text-xs tracking-widest uppercase">Rec</span>
                            <span class="text-red-200 text-[10px] font-bold truncate max-w-[120px] hidden sm:block">{status}</span>
                        </div>
                    </div>

                    <!-- CENTER: Timer + volume bar -->
                    <div class="flex items-center gap-3 flex-1 justify-center min-w-0">
                        <div class="text-white font-mono text-xl sm:text-2xl font-bold tracking-wider tabular-nums flex-shrink-0">
                            {formatTime(elapsedSeconds)}
                        </div>

                        {#if currentVolume > 0}
                            {@const db = volToDb(currentVolume)}
                            <div class="hidden sm:flex flex-col gap-0.5 w-24 flex-shrink-0">
                                <div class="flex items-center gap-1">
                                    <span class="text-red-200 text-[9px] font-mono w-10 text-right">{db > -59 ? `${db.toFixed(0)}dB` : '---'}</span>
                                    <div class="flex-1 h-1.5 bg-red-950/60 rounded-full overflow-hidden">
                                        <div class="h-full rounded-full transition-all duration-75" style="width:{dbToPercent(db)}%;background:{dbColor(db)}"></div>
                                    </div>
                                </div>
                            </div>
                        {/if}
                    </div>

                    <!-- RIGHT: AI status + STOP -->
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <button 
                            onclick={onopenSettings}
                            class="p-2 text-white/70 hover:text-white transition-colors hidden sm:block"
                            title="Open Settings"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        </button>

                        <div class="h-6 w-px bg-red-400 opacity-30 mx-1 hidden sm:block"></div>

                        {#if isGeminiConnected}
                            <span class="hidden sm:block text-green-300 text-[10px] font-bold tracking-wider">AI ✓</span>
                        {:else}
                            <span class="hidden sm:block text-yellow-300 text-[10px] font-bold tracking-wider animate-pulse">Local</span>
                        {/if}

                        <button
                            onclick={ontoggleCapture}
                            class="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-white hover:bg-red-50 text-red-700 font-black text-xs sm:text-sm rounded-lg border-2 border-red-300 hover:border-red-500 transition-all shadow-md tracking-widest uppercase"
                            aria-label="Stop Recording"
                        >
                            <div class="w-2.5 h-2.5 bg-red-600 rounded-sm flex-shrink-0"></div>
                            <span>Stop</span>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    @keyframes slideDown {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    .animate-slideDown { animation: slideDown 0.25s ease-out forwards; }
</style>
