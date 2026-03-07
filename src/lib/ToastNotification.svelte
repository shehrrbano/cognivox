<script lang="ts">
    export let message: string | null = null;
    export let type: "info" | "warning" | "error" = "info";
</script>

{#if message}
    <div class="fixed top-4 right-4 z-[10000] max-w-sm animate-fadeIn">
        <div
            class="px-4 py-3 rounded-lg shadow-lg border {type === 'error'
                ? 'bg-red-500/20 border-red-500/50 text-red-400'
                : type === 'warning'
                  ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                  : 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'} text-sm"
        >
            {message}
        </div>
    </div>
{/if}
