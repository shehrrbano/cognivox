<script lang="ts">
    import { courseStore, getActiveCourse } from './courseStore';
    import RAGFlowChat from './RAGFlowChat.svelte';
    import GraphTab from './GraphTab.svelte';
    import { buildGraphFromCourse } from './services/ragflowService';
    import type { Course, CourseResource } from './types';

    let { courseId, onback } = $props<{
        courseId: string | null;
        onback: () => void;
    }>();

    let course = $derived($courseStore.find(c => c.id === courseId));
    
    // Aggregate all extracted graphs from all resources in this course
    let graphNodes = $derived.by(() => {
        if (!course) return [];
        const nodesMap = new Map();
        
        // Static resource nodes
        course.resources.forEach(res => {
            if (res.extractedGraph?.nodes) {
                res.extractedGraph.nodes.forEach(node => {
                    nodesMap.set(node.id || node.label, node);
                });
            }
        });

        // Dynamic discovered nodes
        dynamicGraph.nodes.forEach(node => {
            nodesMap.set(node.id || node.label, node);
        });

        return Array.from(nodesMap.values());
    });

    let graphEdges = $derived.by(() => {
        if (!course) return [];
        const baseEdges = course.resources.flatMap(res => res.extractedGraph?.edges || []);
        return [...baseEdges, ...dynamicGraph.edges];
    });

    let dynamicGraph = $state({ nodes: [], edges: [] });
    let isBuildingGraph = $state(false);

    let isGeneratingGraph = $state(false);
    let chatRef = $state<any>();

    function triggerAgent(type: string) {
        if (!chatRef) return;
        
        let prompt = '';
        switch(type) {
            case 'summarize':
                prompt = 'Analyze my entire course knowledge base and provide a comprehensive executive summary. Highlight the 5 most important concepts and explain how they connect.';
                break;
            case 'quiz':
                prompt = 'Create a 5-question multiple choice quiz based on these materials to test my understanding. Provide the answers at the very end.';
                break;
            case 'flashcards':
                prompt = 'Extract the key definitions and formulas from this course and format them as Q&A flashcards for active recall study.';
                break;
            case 'assignment':
                prompt = 'Based on the level of this course, propose a practical assignment or project that would help me apply these concepts in the real world.';
                break;
        }
        
        if (prompt) {
            chatRef.handleExternalMessage(prompt);
        }
    }

    async function handleBuildGraph() {
        if (!course?.datasetId || isBuildingGraph) return;
        isBuildingGraph = true;
        try {
            const result = await buildGraphFromCourse(course.datasetId);
            dynamicGraph = {
                nodes: [...dynamicGraph.nodes, ...result.nodes],
                edges: [...dynamicGraph.edges, ...result.edges]
            };
        } finally {
            isBuildingGraph = false;
        }
    }

    function handleAutoZoom(d: { nodeId: string }) {
        console.log('[CourseInterface] Auto-zooming to node:', d.nodeId);
        // Implementation for zooming graph could go here
    }

    function formatBytes(bytes: number = 0) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = 2;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
</script>

{#if course}
    <div class="h-full flex flex-col animate-fadeIn">
        <!-- Course Header -->
        <div class="px-8 py-6 mb-2">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-6">
                    <button 
                        onclick={onback}
                        class="group p-3 rounded-2xl bg-white/80 backdrop-blur-md text-slate-500 hover:text-blue-600 border border-slate-200/50 shadow-sm transition-all hover:shadow-md hover:border-blue-200 active:scale-95"
                        aria-label="Back to courses list"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="group-hover:-translate-x-0.5 transition-transform"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    </button>

                    <div>
                        <div class="flex items-center gap-3 mb-1">
                            <h2 class="text-3xl font-black text-slate-800 tracking-tight">{course.name}</h2>
                            <div class="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full border border-indigo-100 uppercase tracking-widest leading-none shadow-sm">
                                Verified Subject
                            </div>
                        </div>
                        <p class="text-[11px] text-slate-400 font-mono tracking-tighter uppercase font-bold flex items-center gap-2">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                            RAGFLOW DATASET: {course.datasetId}
                        </p>
                    </div>
                </div>
                
                <div class="flex items-center gap-3">
                    <div class="flex -space-x-2 mr-4">
                        <div class="w-8 h-8 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 shadow-sm">AI</div>
                        <div class="w-8 h-8 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 shadow-sm">KG</div>
                        <div class="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm">DB</div>
                    </div>
                    <div class="h-10 w-px bg-slate-200 mx-2"></div>
                    <div class="text-right">
                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status</div>
                        <div class="text-sm font-bold text-slate-700">Course Active</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Three Column Grid -->
        <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 pb-4">
            
            <!-- Column 1: Resources (25%) -->
            <div class="lg:col-span-3 flex flex-col gap-6 min-h-0">
                <!-- Content List -->
                <div class="flex-1 flex flex-col bg-slate-50/50 rounded-[32px] border border-slate-200/60 overflow-hidden shadow-sm">
                    <div class="p-5 border-b border-slate-100 bg-white/50">
                        <h3 class="font-bold text-slate-800 flex items-center gap-2">
                            <svg class="text-blue-500" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                            Subject Content
                        </h3>
                    </div>
                    <div class="flex-1 overflow-y-auto p-4 space-y-3">
                        {#each course.resources as res}
                            <div class="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all group">
                                <div class="flex items-start gap-3">
                                    <div class="w-8 h-8 rounded-lg flex items-center justify-center {res.type === 'file' ? 'bg-blue-50 text-blue-500' : res.type === 'audio' ? 'bg-purple-50 text-purple-500' : 'bg-emerald-50 text-emerald-500'}">
                                        {#if res.type === 'file'}
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                        {:else if res.type === 'audio'}
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path></svg>
                                        {:else}
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                        {/if}
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="text-[13px] font-bold text-slate-700 truncate">{res.name}</div>
                                        <div class="text-[10px] text-slate-400 mt-0.5">{new Date(res.uploadDate).toLocaleDateString()} • {formatBytes(res.size)}</div>
                                    </div>
                                    {#if res.status === 'parsing'}
                                        <div class="w-2 h-2 rounded-full bg-blue-500 animate-pulse mt-1"></div>
                                    {:else if res.status === 'indexed'}
                                        <div class="text-emerald-500 mt-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        </div>
                                    {/if}
                                </div>
                                {#if res.description}
                                    <p class="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-tight bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                        {res.description}
                                    </p>
                                {/if}
                            </div>
                        {/each}
                        {#if course.resources.length === 0}
                            <div class="text-center py-12 text-slate-400">
                                <svg class="mx-auto mb-2 opacity-20" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                <span class="text-xs">No resources uploaded.</span>
                            </div>
                        {/if}
                    </div>
                </div>

                <!-- Smart Agent Actions -->
                <div class="bg-slate-900 rounded-[32px] p-6 shadow-xl shadow-slate-900/20 border border-slate-800">
                    <h4 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        Smart Agent Tools
                    </h4>
                    <div class="grid grid-cols-1 gap-2">
                        <button 
                            onclick={() => triggerAgent('summarize')}
                            class="flex items-center gap-3 w-full p-2.5 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-all text-xs font-bold text-left group"
                        >
                            <div class="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:bg-blue-500/20">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                            </div>
                            Summarize Course
                        </button>
                        <button 
                            onclick={handleBuildGraph}
                            disabled={isBuildingGraph}
                            class="flex items-center gap-3 w-full p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all text-xs font-bold text-left group shadow-lg shadow-blue-500/20 disabled:opacity-50"
                        >
                            <div class="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center group-hover:bg-white/20">
                                {#if isBuildingGraph}
                                    <svg class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                {:else}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                {/if}
                            </div>
                            Build Concept Map
                        </button>
                        <button 
                            onclick={() => triggerAgent('quiz')}
                            class="flex items-center gap-3 w-full p-2.5 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-all text-xs font-bold text-left group"
                        >
                            <div class="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:bg-purple-500/20">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            </div>
                            Generate 5-Quest Quiz
                        </button>
                        <button 
                            onclick={() => triggerAgent('flashcards')}
                            class="flex items-center gap-3 w-full p-2.5 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-all text-xs font-bold text-left group"
                        >
                            <div class="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:bg-amber-500/20">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                            </div>
                            Active Recall Cards
                        </button>
                        <button 
                            onclick={() => triggerAgent('assignment')}
                            class="flex items-center gap-3 w-full p-2.5 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-all text-xs font-bold text-left group"
                        >
                            <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500/20">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            </div>
                            Assignment Creator
                        </button>
                    </div>
                </div>
            </div>

            <!-- Column 2: Smart Chat (45%) -->
            <div class="lg:col-span-5 flex flex-col min-h-0">
                <RAGFlowChat 
                    bind:this={chatRef}
                    overrideDatasetId={course.datasetId}
                    {graphNodes}
                    onautoZoomEntity={(id) => handleAutoZoom({ nodeId: id })}
                />
            </div>


            <!-- Column 3: Knowledge Graph (30%) -->
            <div class="lg:col-span-4 flex flex-col bg-white/70 backdrop-blur-xl rounded-[40px] border border-slate-200/50 shadow-xl shadow-slate-200/20 overflow-hidden group/graph">
                <div class="p-6 border-b border-slate-100/50 flex items-center justify-between bg-white/40">
                    <h3 class="font-bold text-slate-800 flex items-center gap-3">
                        <div class="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shadow-inner group-hover/graph:scale-110 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-lg tracking-tight">Concept Map</span>
                            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global Graph</span>
                        </div>
                    </h3>
                </div>
                <div class="flex-1 min-h-0 relative bg-slate-50/10">
                    <GraphTab 
                        {graphNodes} 
                        {graphEdges}
                        isGenerating={isGeneratingGraph}
                        isRecording={false}
                        isRecordingStarting={false}
                        hideToolbar={true}
                    />
                    
                    {#if graphNodes.length === 0}
                        <div class="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white/40 backdrop-blur-md">
                            <div class="w-20 h-20 bg-white/80 rounded-[28px] shadow-lg shadow-indigo-500/5 border border-slate-100 flex items-center justify-center mb-6 animate-bounce-subtle">
                                <svg class="text-indigo-400" xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v8"/><path d="m16 6-4 4-4-4"/><circle cx="12" cy="12" r="10"/><path d="m8 14 8 8"/><path d="m16 14-8 8"/></svg>
                            </div>
                            <h4 class="text-lg font-black text-slate-800 tracking-tight">No Concepts Yet</h4>
                            <p class="text-xs text-slate-500 mt-2 max-w-[220px] leading-relaxed">
                                Upload pictures or ask Study Buddy questions to extract and visualize the knowledge structure of your course.
                            </p>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .animate-fadeIn {
        animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>
