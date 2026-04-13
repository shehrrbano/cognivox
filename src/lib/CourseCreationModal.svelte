<script lang="ts">
    import { courseStore } from './courseStore';
    import { createDataset } from './services/ragflowService';
    import { parseFile, parseAudio, parsePicture } from './services/courseParsingService';
    import type { Course } from './types';

    let { onclose, oncreate } = $props<{ onclose: () => void; oncreate?: (courseId: string) => void }>();

    let courseName = $state('');
    let files = $state<File[]>([]);
    let audioFiles = $state<File[]>([]);
    let pictures = $state<File[]>([]);
    let isCreating = $state(false);
    let progress = $state(0);
    let status = $state('');

    async function handleCreate() {
        if (!courseName || (files.length === 0 && audioFiles.length === 0 && pictures.length === 0)) return;

        isCreating = true;
        status = 'Creating course dataset...';
        
        try {
            // 1. Create RAGFlow Dataset
            const ds = await createDataset(courseName);
            if (!ds?.id) throw new Error('Failed to create dataset');

            const newCourse: Course = {
                id: crypto.randomUUID(),
                name: courseName,
                datasetId: ds.id,
                resources: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            courseStore.addCourse(newCourse);

            // 2. Parse all resources
            const total = files.length + audioFiles.length + pictures.length;
            let current = 0;

            status = 'Ingesting resources...';

            await Promise.all([
                ...files.map(async (f) => {
                    await parseFile(newCourse.id, ds.id, f);
                    current++;
                    progress = (current / total) * 100;
                }),
                ...audioFiles.map(async (f) => {
                    await parseAudio(newCourse.id, ds.id, f);
                    current++;
                    progress = (current / total) * 100;
                }),
                ...pictures.map(async (f) => {
                    await parsePicture(newCourse.id, ds.id, f);
                    current++;
                    progress = (current / total) * 100;
                })
            ]);

            status = 'Course created successfully!';
            setTimeout(() => {
                if (oncreate) {
                    oncreate(newCourse.id);
                } else {
                    onclose();
                }
            }, 1500);
        } catch (e: any) {
            console.error('[CourseCreation] Error:', e);
            status = `Error: ${e.message}`;
            isCreating = false;
        }
    }

    function handleFileChange(e: Event, target: 'files' | 'audio' | 'pictures') {
        const input = e.target as HTMLInputElement;
        if (!input.files) return;
        const newFiles = Array.from(input.files);
        if (target === 'files') files = [...files, ...newFiles];
        else if (target === 'audio') audioFiles = [...audioFiles, ...newFiles];
        else if (target === 'pictures') pictures = [...pictures, ...newFiles];
    }
</script>

<div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
    <div class="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden border border-slate-200">
        <!-- Header -->
        <div class="px-8 pt-8 pb-6 bg-slate-50/50 border-b border-slate-100">
            <div class="flex items-center justify-between mb-2">
                <h2 class="text-2xl font-bold text-slate-800">New University Course</h2>
                <button onclick={onclose} class="p-2 hover:bg-slate-200/50 rounded-full transition-colors" aria-label="Close modal">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>

            </div>
            <p class="text-slate-500">Initialize a new knowledge silo for your subject.</p>
        </div>

        <!-- Body -->
        <div class="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
            <!-- Name -->
            <div class="space-y-2">
                <label for="courseName" class="text-sm font-semibold text-slate-700 ml-1">COURSE NAME</label>
                <input 
                    id="courseName"
                    type="text" 
                    bind:value={courseName}
                    placeholder="e.g. Advanced Machine Learning"
                    class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-800 font-medium"
                    disabled={isCreating}
                />
            </div>

            <!-- Upload Grid -->
            <div class="grid grid-cols-1 gap-4">
                <!-- Documents -->
                <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-2">
                            <div class="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            </div>
                            <span class="font-semibold text-slate-700">Documents</span>
                        </div>
                        <label class="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer uppercase tracking-wider">
                            Browse
                            <input type="file" multiple onchange={(e) => handleFileChange(e, 'files')} class="hidden" accept=".pdf,.doc,.docx,.txt" disabled={isCreating} />
                        </label>
                    </div>
                    <div class="space-y-1">
                        {#each files as f}
                            <div class="text-xs text-slate-500 flex items-center justify-between">
                                <span class="truncate">{f.name}</span>
                                <span class="text-slate-400">{(f.size/1024).toFixed(0)}KB</span>
                            </div>
                        {/each}
                        {#if files.length === 0}
                            <div class="text-xs text-slate-400 italic">No files selected (PDF, DOCX, TXT)</div>
                        {/if}
                    </div>
                </div>

                <!-- Audio -->
                <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-2">
                            <div class="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                            </div>
                            <span class="font-semibold text-slate-700">Audio Lectures</span>
                        </div>
                        <label class="text-xs font-bold text-purple-600 hover:text-purple-700 cursor-pointer uppercase tracking-wider">
                            Browse
                            <input type="file" multiple onchange={(e) => handleFileChange(e, 'audio')} class="hidden" accept=".mp3,.wav,.m4a" disabled={isCreating} />
                        </label>
                    </div>
                    <div class="space-y-1">
                        {#each audioFiles as f}
                            <div class="text-xs text-slate-500 flex items-center justify-between">
                                <span class="truncate">{f.name}</span>
                                <span class="text-purple-400">Whisper Transcript</span>
                            </div>
                        {/each}
                        {#if audioFiles.length === 0}
                            <div class="text-xs text-slate-400 italic">No audio selected (MP3, WAV)</div>
                        {/if}
                    </div>
                </div>

                <!-- Pictures -->
                <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-2">
                            <div class="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            </div>
                            <span class="font-semibold text-slate-700">Visual Aids</span>
                        </div>
                        <label class="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer uppercase tracking-wider">
                            Browse
                            <input type="file" multiple onchange={(e) => handleFileChange(e, 'pictures')} class="hidden" accept=".jpg,.jpeg,.png" disabled={isCreating} />
                        </label>
                    </div>
                    <div class="space-y-1">
                        {#each pictures as f}
                            <div class="text-xs text-slate-500 flex items-center justify-between">
                                <span class="truncate">{f.name}</span>
                                <span class="text-emerald-400">Vision Analysis</span>
                            </div>
                        {/each}
                        {#if pictures.length === 0}
                            <div class="text-xs text-slate-400 italic">No images selected (JPG, PNG)</div>
                        {/if}
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="px-8 py-6 bg-slate-50/50 border-t border-slate-100">
            {#if isCreating}
                <div class="space-y-3 animate-pulse">
                    <div class="flex items-center justify-between text-xs font-bold text-blue-600 uppercase tracking-widest">
                        <span>{status}</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div class="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div class="h-full bg-blue-500 transition-all duration-300" style="width: {progress}%"></div>
                    </div>
                </div>
            {:else}
                <div class="flex gap-3">
                    <button 
                        onclick={onclose}
                        class="flex-1 px-6 py-4 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-100 transition-all"
                    >
                        CANCEL
                    </button>
                    <button 
                        onclick={handleCreate}
                        disabled={!courseName || (files.length === 0 && audioFiles.length === 0 && pictures.length === 0)}
                        class="flex-2 px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all promax-interaction"
                    >
                        INITIALIZE COURSE
                    </button>
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .promax-interaction:active {
        transform: scale(0.98);
    }
    .flex-2 { flex: 2; }
</style>
