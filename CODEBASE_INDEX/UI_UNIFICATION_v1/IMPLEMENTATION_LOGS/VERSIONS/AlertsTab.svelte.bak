<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { Alert } from "./types";

    export let alerts: Alert[] = [];

    const dispatch = createEventDispatcher();

    function clearAlerts() {
        dispatch("clearAlerts");
    }
</script>

<div class="content-card">
    <div class="content-card-header">
        <span class="text-sm font-medium text-slate-200 flex items-center gap-2"
            ><svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                ><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path
                    d="M13.73 21a2 2 0 0 1-3.46 0"
                /></svg
            > Intelligence Alerts</span
        >
        <button class="btn-ghost text-xs" onclick={clearAlerts}
            >Clear All</button
        >
    </div>
    <div class="p-6 space-y-3 max-h-96 overflow-y-auto">
        {#if alerts.length === 0}
            <div class="text-center py-12 text-slate-500">
                <svg
                    class="w-12 h-12 mx-auto mb-4 text-slate-500 opacity-30"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    ><path
                        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                    /><line x1="1" y1="1" x2="23" y2="23" /></svg
                >
                <p>
                    No alerts yet. Alerts appear when important events are
                    detected.
                </p>
            </div>
        {:else}
            {#each alerts as alert}
                <div
                    class="glass-card p-4 {alert.severity === 'critical'
                        ? 'border-red-500/30'
                        : alert.severity === 'warning'
                          ? 'border-yellow-500/30'
                          : 'border-cyan-500/30'}"
                >
                    <div class="flex items-start gap-3">
                        <svg
                            class="w-5 h-5 {alert.severity === 'critical'
                                ? 'text-red-500'
                                : alert.severity === 'warning'
                                  ? 'text-yellow-500'
                                  : 'text-cyan-500'}"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            ><circle cx="12" cy="12" r="10" /><line
                                x1="12"
                                y1="8"
                                x2="12"
                                y2="12"
                            /><line x1="12" y1="16" x2="12.01" y2="16" /></svg
                        >
                        <div class="flex-1">
                            <div class="flex justify-between">
                                <span class="font-medium text-slate-200"
                                    >{alert.type}</span
                                >
                                <span class="text-xs text-slate-500"
                                    >{alert.timestamp}</span
                                >
                            </div>
                            <p class="text-sm text-slate-400 mt-1">
                                {alert.message}
                            </p>
                        </div>
                    </div>
                </div>
            {/each}
        {/if}
    </div>
</div>
