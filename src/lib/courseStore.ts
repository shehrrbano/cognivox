import { writable, get } from 'svelte/store';
import type { Course, CourseResource } from './types';

const STORAGE_KEY = 'cognivox_courses';

function createCourseStore() {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const initialCourses: Course[] = saved ? JSON.parse(saved) : [];

    const { subscribe, set, update } = writable<Course[]>(initialCourses);

    return {
        subscribe,
        addCourse: (course: Course) => {
            update(courses => {
                const next = [...courses, course];
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                }
                return next;
            });
        },
        updateCourse: (courseId: string, updater: (course: Course) => Course) => {
            update(courses => {
                const next = courses.map(c => c.id === courseId ? updater(c) : c);
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                }
                return next;
            });
        },
        deleteCourse: (courseId: string) => {
            update(courses => {
                const next = courses.filter(c => c.id !== courseId);
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                }
                return next;
            });
        },
        addResource: (courseId: string, resource: CourseResource) => {
            update(courses => {
                const next = courses.map(c => {
                    if (c.id === courseId) {
                        return { ...c, resources: [...c.resources, resource], updatedAt: new Date().toISOString() };
                    }
                    return c;
                });
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                }
                return next;
            });
        },
        updateResource: (courseId: string, resourceId: string, updater: (res: CourseResource) => CourseResource) => {
            update(courses => {
                const next = courses.map(c => {
                    if (c.id === courseId) {
                        return {
                            ...c,
                            resources: c.resources.map(r => r.id === resourceId ? updater(r) : r),
                            updatedAt: new Date().toISOString()
                        };
                    }
                    return c;
                });
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                }
                return next;
            });
        },
        removeResource: (courseId: string, resourceId: string) => {
            update(courses => {
                const next = courses.map(c => {
                    if (c.id === courseId) {
                        return {
                            ...c,
                            resources: c.resources.filter(r => r.id !== resourceId),
                            updatedAt: new Date().toISOString()
                        };
                    }
                    return c;
                });
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                }
                return next;
            });
        }
    };
}

export const courseStore = createCourseStore();

// Selection state for current active course
export const activeCourseId = writable<string | null>(null);

export function getActiveCourse(): Course | null {
    const id = get(activeCourseId);
    if (!id) return null;
    return get(courseStore).find(c => c.id === id) || null;
}
