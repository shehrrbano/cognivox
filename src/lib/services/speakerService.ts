/**
 * speakerService.ts
 * Speaker identification operations (ECAPA-TDNN).
 * Pure functions that return results.
 */
import { invoke } from "@tauri-apps/api/core";
import type { SpeakerIdStatus, SpeakerProfile } from "$lib/types";

/**
 * Initialize the ECAPA-TDNN speaker identification engine.
 */
export async function initializeSpeakerId(): Promise<boolean> {
    try {
        console.log("[SPEAKER-ID] Initializing ECAPA-TDNN...");
        const result = await invoke("initialize_speaker_id");
        console.log("[SPEAKER-ID]", result);
        return true;
    } catch (e: any) {
        console.warn("[SPEAKER-ID] Init failed (non-blocking):", e);
        return false;
    }
}

/**
 * Refresh speaker ID status and profiles from backend.
 */
export async function refreshSpeakerIdStatus(): Promise<{
    status: SpeakerIdStatus | null;
    profiles: SpeakerProfile[];
}> {
    try {
        const status = (await invoke("get_speaker_id_status")) as SpeakerIdStatus;
        const profiles = (await invoke("get_speaker_profiles")) as SpeakerProfile[];
        return { status, profiles };
    } catch (e) {
        console.warn("[SPEAKER-ID] Status refresh error:", e);
        return { status: null, profiles: [] };
    }
}

/**
 * Rename a speaker profile.
 */
export async function renameSpeaker(
    speakerId: string,
    newLabel: string,
): Promise<{ success: boolean; message: string }> {
    try {
        await invoke("rename_speaker", { speakerId, newLabel });
        return { success: true, message: `Speaker renamed to "${newLabel}"` };
    } catch (e: any) {
        return { success: false, message: `Rename failed: ${e}` };
    }
}

/**
 * Clear all speaker profiles.
 */
export async function clearSpeakerProfiles(): Promise<{
    success: boolean;
    message: string;
}> {
    try {
        const result = (await invoke("clear_speaker_profiles")) as string;
        return { success: true, message: result };
    } catch (e: any) {
        return { success: false, message: `Clear failed: ${e}` };
    }
}
