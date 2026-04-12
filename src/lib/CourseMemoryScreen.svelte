<script lang="ts">
    import { courseStore } from './courseStore';
    import { listDocuments, deleteDocuments, uploadDocument, parseDocuments } from './services/ragflowService';
    import { parseFile, parseAudio, parsePicture } from './services/courseParsingService';
    import type { Course, CourseResource } from './types';
    import { onMount } from 'svelte';

    interface Props {
        courses: Course[];
        onclose: () => void;
    }

    let { courses = [], onclose }: Props = $props();

    let selectedCourseId = $state<string | null>(null);
    let selectedCourse = $derived(courses.find((c: Course) => c.id === selectedCourseId));
    let ragflowDocs = $state<any[]>([]);
    let isLoading = $state(false);

    $effect(() => {
        if (selectedCourseId) {
            loadDocs(selectedCourseId);
        }
    });

    async function loadDocs(courseId: string) {
        const course = courses.find((c: Course) => c.id === courseId);
        if (!course) return;
        
        isLoading = true;
        try {
            ragflowDocs = await listDocuments(course.datasetId);
        } catch (e) {
            console.error('[MemoryScreen] Failed to load docs:', e);
        } finally {
            isLoading = false;
        }
    }

    async function handleDelete(docId: string) {
        if (!selectedCourse || !confirm('Are you sure you want to delete this resource?')) return;
        
        const ok = await deleteDocuments(selectedCourse.datasetId, [docId]);
        if (ok) {
            // Find the resource in our local store to remove it too
            const resource = selectedCourse.resources.find((r: CourseResource) => r.ragflowDocId === docId);
            if (resource) {
                courseStore.removeResource(selectedCourse.id, resource.id);
            }
            // Reload list
            await loadDocs(selectedCourse.id);
        }
    }

    async function handleAddFile(e: Event) {
        const input = e.target as HTMLInputElement;
        if (!input.files || !selectedCourse) return;
        
        const file = input.files[0];
        isLoading = true;
        
        try {
            // Determine parsing logic based on type
            if (file.type.startsWith('audio/')) {
                await parseAudio(selectedCourse.id, selectedCourse.datasetId, file);
            } else if (file.type.startsWith('image/')) {
                await parsePicture(selectedCourse.id, selectedCourse.datasetId, file);
            } else {
                await parseFile(selectedCourse.id, selectedCourse.datasetId, file);
            }
            await loadDocs(selectedCourse.id);
        } catch (e) {
            console.error('[MemoryScreen] Failed to add file:', e);
        } finally {
            isLoading = false;
            input.value = '';
        }
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

<div class="fixed inset-0 z-[100] flex flex-col bg-white animate-fadeIn">
    <!-- Header -->
    <div class="h-20 flex items-center justify-between px-8 border-b border-slate-100 bg-slate-50/50">
        <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-lg shadow-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            </div>
            <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Context Memory & RAG Management</h1>
        </div>
        <button 
            onclick={onclose}
            class="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all flex items-center gap-2 font-bold text-xs"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            EXIT MANAGER
        </button>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex min-h-0">
        <!-- Sidebar: Course List -->
        <div class="w-80 border-r border-slate-100 p-6 overflow-y-auto space-y-4 bg-slate-50/20">
            <h2 class="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2 mb-4">Select Course Context</h2>
            {#each courses as course}
                <button 
                    onclick={() => selectedCourseId = course.id}
                    class="w-full p-4 rounded-2xl text-left transition-all duration-200 border {selectedCourseId === course.id ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200 hover:text-blue-600'}"
                >
                    <div class="font-bold truncate">{course.name}</div>
                    <div class="text-[10px] opacity-70 mt-1 uppercase font-bold tracking-wider">{course.resources.length} Ingested Docs</div>
                </button>
            {/each}
            {#if courses.length === 0}
                <div class="text-center py-12 text-slate-400 italic text-sm">No courses found.</div>
            {/if}
        </div>

        <!-- Main Panel: File Management -->
        <div class="flex-1 p-8 overflow-y-auto min-w-0">
            {#if selectedCourse}
                <div class="max-w-4xl mx-auto space-y-8">
                    <!-- Stat Cards -->
                    <div class="grid grid-cols-3 gap-6">
                        <div class="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Payload</div>
                            <div class="text-2xl font-black text-slate-800">{formatBytes(selectedCourse.resources.reduce((a: number, b: CourseResource) => a + (b.size || 0), 0))}</div>
                        </div>
                        <div class="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">RAGFlow Dataset</div>
                            <div class="text-lg font-mono font-bold text-blue-600 truncate">{selectedCourse.datasetId}</div>
                        </div>
                        <div class="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ingestion Pipeline</div>
                            <div class="text-lg font-bold text-emerald-500">GPU Accelerated ✓</div>
                        </div>
                    </div>

                    <!-- File List Control -->
                    <div class="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden">
                        <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 class="font-bold text-slate-800">Resource Ledger</h3>
                            <label class="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-blue-700 transition-all flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                ADD RESOURCE
                                <input type="file" class="hidden" onchange={handleAddFile} />
                            </label>
                        </div>
                        
                        <div class="divide-y divide-slate-50">
                            {#if isLoading}
                                <div class="p-12 text-center text-slate-400">
                                    <div class="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto mb-4"></div>
                                    Syncing with RAGFlow backend...
                                </div>
                            {:else}
                                {#each ragflowDocs as doc}
                                    <div class="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-all group">
                                        <div class="flex items-center gap-4 min-w-0">
                                            <div class="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>
                                            </div>
                                            <div class="min-w-0">
                                                <div class="text-sm font-bold text-slate-800 truncate">{doc.name}</div>
                                                <div class="text-[10px] text-slate-400 mt-0.5 font-medium">
                                                    STATUS: <span class="uppercase border px-1 rounded rounded-sm {doc.status === '1' ? 'text-emerald-500 border-emerald-100 bg-emerald-50' : 'text-amber-500 border-amber-100 bg-amber-50'}">{doc.status === '1' ? 'Success' : 'Indexing'}</span> • {formatBytes(doc.size)} • {new Date(doc.create_time).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onclick={() => handleDelete(doc.id)}
                                                class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Remove from knowledge base"
                                                aria-label="Delete resource"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                            </button>
                                        </div>
                                    </div>
                                {/each}
                                {#if ragflowDocs.length === 0}
                                    <div class="p-12 text-center text-slate-400 text-sm">
                                        No files found in this dataset.
                                    </div>
                                {/if}
                            {/if}
                        </div>
                    </div>
                </div>
            {:else}
                <div class="h-full flex flex-col items-center justify-center text-center opacity-40">
                    <div class="w-24 h-24 rounded-[32px] bg-slate-100 flex items-center justify-center mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    </div>
                    <h2 class="text-xl font-bold text-slate-800">Select a course to manage its memory</h2>
                    <p class="mt-2 text-slate-500 max-w-sm">Every course has a high-fidelity dataset attached to it. Manage its contents here.</p>
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .animate-fadeIn {
        animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>
