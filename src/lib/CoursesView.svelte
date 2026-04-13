<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import CourseCreationModal from './CourseCreationModal.svelte';
    import type { Course } from './types';

    let { courses = [], activeId = null, onselectCourse, oncreateCourse } = $props<{
        courses: Course[];
        activeId: string | null;
        onselectCourse: (id: string) => void;
        oncreateCourse?: (id: string) => void;
    }>();

    let showModal = $state(false);

    function handleCourseClick(course: Course) {
        onselectCourse(course.id);
    }
</script>

<div class="space-y-6 animate-fadeIn">
    <!-- Header with Plus Button -->
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
            <button 
                onclick={() => showModal = true}
                class="flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:scale-105 transition-all duration-200 promax-interaction"
                title="Create New Course"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <h2 class="text-2xl font-bold text-slate-800">Your University Courses</h2>
        </div>
        <div class="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/50">
            {courses.length} Course{courses.length === 1 ? '' : 's'}
        </div>
    </div>

    <!-- Courses Grid -->
    {#if courses.length === 0}
        <div class="flex flex-col items-center justify-center py-24 px-6 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 animate-fadeIn">
            <div class="w-20 h-20 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                <svg class="text-slate-300" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            </div>
            <h3 class="text-xl font-semibold text-slate-700 mb-2">No courses uploaded yet</h3>
            <p class="text-slate-500 text-center max-w-sm">
                Upload your first course materials to begin your intelligent learning journey.
            </p>
            <button 
                onclick={() => showModal = true}
                class="mt-8 px-6 py-3 bg-white text-blue-600 border border-blue-100 shadow-sm hover:shadow-md hover:border-blue-200 rounded-2xl font-medium transition-all duration-200"
            >
                Create Your First Course
            </button>
        </div>
    {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each courses as course}
                <button 
                    onclick={() => handleCourseClick(course)}
                    class="group relative flex flex-col text-left p-6 bg-white border border-slate-200/60 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-200 transition-all duration-300 promax-interaction overflow-hidden"
                >
                    <div class="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 group-hover:bg-blue-100/50 transition-colors duration-300"></div>
                    
                    <div class="relative z-10">
                        <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                        </div>
                        <h4 class="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-700 transition-colors">{course.name}</h4>
                        <p class="text-sm text-slate-500 mb-4 line-clamp-2">{course.description || 'No description provided.'}</p>
                        
                        <div class="flex items-center gap-4 pt-4 border-t border-slate-50">
                            <div class="flex items-center gap-1.5">
                                <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                <span class="text-xs font-medium text-slate-600 uppercase tracking-wider">{course.resources.length} resources</span>
                            </div>
                            <div class="text-xs text-slate-400 italic">
                                Created {new Date(course.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </button>
            {/each}
        </div>
    {/if}
</div>

{#if showModal}
    <CourseCreationModal
        onclose={() => showModal = false}
        oncreate={(id) => {
            showModal = false;
            if (oncreateCourse) {
                oncreateCourse(id);
            } else {
                onselectCourse(id);
            }
        }}
    />
{/if}

<style>
    .promax-interaction:active {
        transform: scale(0.98);
    }
</style>
