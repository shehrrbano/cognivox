<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<!-- CONVERTED: SVELTE_5_PROPS_v1 -->
<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { intelligenceExtractor, type ExtractedInsights } from "./intelligenceExtractor";

    interface Props {}
    let {}: Props = $props();

    let insights = $state<ExtractedInsights>(intelligenceExtractor.getInsights());
    let unsubscribe: (() => void) | null = null;
    let activeTab = $state("kanban"); // 'kanban', 'decisions', 'risks'

    onMount(() => {
        unsubscribe = intelligenceExtractor.subscribe((newInsights) => {
            insights = newInsights;
        });
    });

    onDestroy(() => {
        if (unsubscribe) unsubscribe();
    });

    let todoTasks = $derived(insights.tasks.filter((_: any, i: number) => i % 3 === 0));
    let inProgressTasks = $derived(insights.tasks.filter((_: any, i: number) => i % 3 === 1));
    let doneTasks = $derived(insights.tasks.filter((_: any, i: number) => i % 3 === 2));

    function getTagStyle(text: string) {
        const t = text.length;
        if (t % 3 === 0) return "bg-blue-100 text-blue-600";
        if (t % 3 === 1) return "bg-purple-100 text-purple-600";
        return "bg-orange-100 text-orange-600";
    }

    function getTagName(text: string) {
        const t = text.length;
        if (t % 3 === 0) return "Frontend";
        if (t % 3 === 1) return "Design";
        return "Backend";
    }
</script>

<div class="h-full flex flex-col bg-gray-50/50">
    <!-- Header: Action Center -->
    <div class="px-5 py-4 flex items-center justify-between border-b border-gray-200/60 bg-white shadow-sm">
        <div>
            <h2 class="text-xs font-black text-gray-800 tracking-tight flex items-center gap-2 uppercase">
                <svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                ACTION CENTER
            </h2>
        </div>
        <div class="flex items-center gap-2 bg-gray-100/80 p-1 rounded-lg">
            <button class="px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all {activeTab === 'kanban' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}" onclick={() => activeTab = 'kanban'}>Tasks</button>
            <button class="px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all {activeTab === 'decisions' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}" onclick={() => activeTab = 'decisions'}>Log</button>
            <button class="px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all {activeTab === 'risks' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}" onclick={() => activeTab = 'risks'}>Risks</button>
        </div>
    </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-hidden flex flex-col pt-4">
        {#if insights.tasks.length === 0 && insights.decisions.length === 0}
            <div class="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div class="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 border border-blue-100/50 shadow-inner">
                    <svg class="w-8 h-8 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <h3 class="text-[11px] font-bold text-gray-700 uppercase tracking-widest">No Action Items Found</h3>
                <p class="text-[9px] text-gray-400 mt-2 max-w-[200px] leading-relaxed">Recording a session will automatically generate actionable insights here.</p>
            </div>
        {:else if activeTab === 'kanban'}
            <!-- Kanban Board Grid -->
            <div class="flex-1 overflow-x-auto overflow-y-hidden px-5 flex gap-5 custom-scrollbar pb-6 relative">
                
                <!-- Column: TO DO -->
                <div class="flex-shrink-0 w-[280px] flex flex-col bg-gray-100/40 rounded-2xl border border-gray-200/60 shadow-inner overflow-hidden">
                    <div class="px-4 py-3 border-b border-gray-200/50 flex justify-between items-center bg-gray-100/60 backdrop-blur-sm sticky top-0 z-10">
                        <span class="text-[10px] font-black text-gray-500 uppercase tracking-widest">TO DO</span>
                        <span class="w-5 h-5 rounded-full bg-white border border-gray-200 shadow-sm text-gray-600 text-[9px] font-bold flex items-center justify-center">{todoTasks.length}</span>
                    </div>
                    <div class="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar pb-10">
                        {#each todoTasks as task}
                            <div class="bg-white p-4 rounded-xl shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all cursor-grab group">
                                <div class="flex justify-between items-start mb-2.5">
                                    <span class="text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-widest {getTagStyle(task.text)}">
                                        {getTagName(task.text)}
                                    </span>
                                    <button class="text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 -mr-2 -mt-1 rounded-md hover:bg-blue-50">
                                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/></svg>
                                    </button>
                                </div>
                                <p class="text-[11px] font-bold text-gray-800 leading-relaxed mb-4 pr-2">{task.text}</p>
                                
                                <div class="flex items-center justify-between text-[9px] text-gray-400 font-semibold border-t border-gray-100 pt-3">
                                    <div class="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-50">
                                        <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                        <span>0/3</span>
                                    </div>
                                    {#if task.assignee}
                                        <div class="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-blue-600 shadow-sm ring-1 ring-gray-100">
                                            {task.assignee[0]}
                                        </div>
                                    {:else}
                                        <div class="w-6 h-6 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-[8px] font-black text-gray-400 shadow-sm ring-1 ring-gray-100 border-dashed">
                                            ?
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>

                <!-- Column: IN PROGRESS -->
                <div class="flex-shrink-0 w-[280px] flex flex-col bg-blue-50/30 rounded-2xl border border-blue-100/50 shadow-inner overflow-hidden">
                    <div class="px-4 py-3 border-b border-blue-100 flex justify-between items-center bg-blue-50/80 backdrop-blur-sm sticky top-0 z-10">
                        <span class="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                            <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse ring-2 ring-blue-500/20"></span> IN PROGRESS
                        </span>
                        <span class="w-5 h-5 rounded-full bg-white border border-blue-200 shadow-sm text-blue-600 text-[9px] font-bold flex items-center justify-center">{inProgressTasks.length}</span>
                    </div>
                    <div class="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar pb-10">
                        {#each inProgressTasks as task}
                            <div class="bg-white p-4 rounded-xl shadow-[0_4px_12px_-4px_rgba(59,130,246,0.15)] border border-blue-200 ring-1 ring-blue-500/5 hover:shadow-lg transition-all cursor-grab group">
                                <div class="flex justify-between items-start mb-2.5">
                                    <span class="text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-widest {getTagStyle(task.text)}">
                                        {getTagName(task.text)}
                                    </span>
                                </div>
                                <p class="text-[11px] font-bold text-gray-800 leading-relaxed mb-4 pr-2">{task.text}</p>
                                
                                <div class="mb-4 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                    <div class="flex justify-between text-[7px] font-black uppercase tracking-widest text-blue-500 mb-1.5">
                                        <span>Progress</span>
                                        <span>66%</span>
                                    </div>
                                    <div class="w-full bg-blue-100/50 rounded-full h-1.5 overflow-hidden">
                                        <div class="bg-blue-500 h-1.5 rounded-full shadow-[0_0_5px_rgba(59,130,246,0.5)]" style="width: 66%"></div>
                                    </div>
                                </div>

                                <div class="flex items-center justify-between text-[9px] text-gray-400 font-semibold pt-1">
                                    <div class="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-50 text-blue-600">
                                        <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                        <span>2/3</span>
                                    </div>
                                    {#if task.assignee}
                                        <div class="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-blue-600 shadow-sm ring-1 ring-blue-100">
                                            {task.assignee[0]}
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>

                <!-- Column: DONE -->
                <div class="flex-shrink-0 w-[280px] flex flex-col bg-gray-50/50 rounded-2xl border border-gray-200/40 overflow-hidden opacity-90 hover:opacity-100 transition-opacity">
                    <div class="px-4 py-3 border-b border-gray-200/50 flex justify-between items-center bg-gray-100/50 backdrop-blur-sm sticky top-0 z-10">
                        <span class="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-2">
                            <span class="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm"></span> DONE
                        </span>
                        <span class="w-5 h-5 rounded-full bg-white border border-gray-200 shadow-sm text-green-600 text-[9px] font-bold flex items-center justify-center">{doneTasks.length}</span>
                    </div>
                    <div class="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar pb-10">
                        {#each doneTasks as task}
                            <div class="bg-white/80 p-4 rounded-xl border border-gray-200 cursor-default opacity-75 hover:opacity-100 transition-opacity">
                                <div class="flex justify-between items-start mb-2.5">
                                    <span class="text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-widest bg-green-50 text-green-600 border border-green-100">
                                        Completed
                                    </span>
                                </div>
                                <p class="text-[11px] font-bold text-gray-500 leading-relaxed mb-4 line-through decoration-gray-300 decoration-2">{task.text}</p>
                                
                                <div class="flex items-center justify-between text-[9px] text-green-500 font-black border-t border-gray-100 pt-3">
                                    <div class="flex items-center gap-1.5 px-2 py-1 rounded bg-green-50">
                                        <svg class="w-3.5 h-3.5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                                        <span class="uppercase tracking-wider">Done</span>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
        {:else if activeTab === 'decisions'}
            <!-- Decisions Log -->
            <div class="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                {#each insights.decisions as decision}
                    <div class="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex gap-4 hover:shadow-md transition-shadow">
                        <div class="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                            <svg class="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <div>
                            <p class="text-[11px] font-bold text-gray-800 leading-relaxed">"{decision.text}"</p>
                            {#if decision.context}
                                <div class="mt-2 text-[9px] text-gray-500 font-medium bg-gray-50 inline-block px-2.5 py-1 rounded-md border border-gray-100">
                                    <span class="text-gray-400 mr-1 uppercase tracking-widest text-[8px] font-black">Context</span> {decision.context}
                                </div>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        {:else if activeTab === 'risks'}
            <!-- Risks & Urgencies -->
            <div class="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                {#each insights.risks as risk}
                    <div class="bg-red-50/50 border border-red-100 rounded-xl p-4 flex gap-4 items-start hover:bg-red-50 hover:shadow-sm transition-all">
                        <div class="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-500 flex-shrink-0 shadow-sm border border-red-200/50">
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        </div>
                        <div>
                            <span class="text-[9px] font-black uppercase tracking-widest text-red-600 block mb-1">Critical Risk Detected</span>
                            <p class="text-[11px] font-bold text-gray-800 leading-relaxed max-w-sm">{risk.text}</p>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.4); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.6); }
</style>
