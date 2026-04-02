<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    export let message: string | null = null;
    export let type: "info" | "warning" | "error" = "info";
</script>

{#if message}
    <div class="fixed top-fluid-gap right-fluid-gap left-fluid-gap sm:left-auto z-[10000] max-w-sm animate-fadeIn">
        <div
            class="px-4 py-3 rounded-lg shadow-lg border {type === 'error'
                ? 'bg-red-50 border-red-300 text-red-500'
                : type === 'warning'
                  ? 'bg-yellow-50 border-yellow-300 text-yellow-600'
                  : 'bg-blue-50 border-blue-400 text-blue-500'} text-fluid-sm"
        >
            {message}
        </div>
    </div>
{/if}
