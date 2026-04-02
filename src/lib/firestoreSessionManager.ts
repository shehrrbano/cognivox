// ============================================================================
// FIRESTORE SESSION MANAGER
// ============================================================================
// Cloud-based session storage using Google Cloud Firestore.
// Replaces local file storage with Google's NoSQL cloud database.
// Sessions are tied to the authenticated user's Google account.
// ============================================================================

import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    serverTimestamp,
    getDocFromServer,
    getDocsFromServer,
} from "firebase/firestore";
import { getDb, getCurrentUser, isFirebaseConfigured } from "./firebase";

// ============================================================================
// TYPES (mirror the Rust SessionData structure)
// ============================================================================

export interface TranscriptEntry {
    timestamp: string;
    speaker_id: string;
    text: string;
    tone?: string;
    category?: string[];
    confidence: number;
}

export interface GraphNode {
    id: string;
    node_type: string;
    metadata: Record<string, string>;
}

export interface GraphEdge {
    from: string;
    to: string;
    relation: string;
    weight: number;
}

export interface SessionMetadata {
    title: string;
    duration_seconds: number;
    total_transcripts: number;
    total_speakers: number;
    tags: string[];
}

export interface ActionItem {
    description: string;
    assignee?: string;
    deadline?: string;
    priority: string;
}

export interface SessionSummary {
    executive_summary: string;
    key_decisions: string[];
    action_items: ActionItem[];
    risks_identified: string[];
    next_steps: string[];
    generated_at: string;
}

export interface PsychosomaticState {
    stress: number;
    engagement: number;
    urgency: number;
    clarity: number;
}

export interface ExtractedInsights {
    topics: string[];
    decisions: string[];
    action_items: string[];
    key_points: string[];
}

export interface SessionData {
    id: string;
    created_at: string;
    updated_at: string;
    transcripts: TranscriptEntry[];
    graph_nodes: GraphNode[];
    graph_edges: GraphEdge[];
    metadata: SessionMetadata;
    graph_positions?: Record<string, { x: number; y: number }>; // [PERSISTENCE_v1]
    summary?: SessionSummary;
    psychosomatic?: PsychosomaticState;
    insights?: ExtractedInsights;
}

// Firestore document extends SessionData with user info
interface FirestoreSessionDoc extends SessionData {
    userEmail: string;
    userId: string;
    cloudSyncedAt: any; // Firestore Timestamp
}

// ============================================================================
// COLLECTION NAME
// ============================================================================

const SESSIONS_COLLECTION = "sessions";

// ============================================================================
// FIRESTORE DATA SANITIZER
// ============================================================================
// Firestore throws on `undefined` values. This recursively cleans objects
// so they can be safely stored. It converts undefined → null, removes
// functions, and ensures arrays contain no undefined entries.
// ============================================================================

function sanitizeForFirestore(obj: any): any {
    if (obj === undefined) return null;
    if (obj === null) return null;
    if (typeof obj === "function") return null;
    if (typeof obj === "symbol") return null;

    // Firestore serverTimestamp() sentinel — pass through
    if (obj && typeof obj === "object" && obj._methodName) return obj;

    if (Array.isArray(obj)) {
        return obj
            .filter((item) => item !== undefined)
            .map((item) => sanitizeForFirestore(item));
    }

    if (typeof obj === "object" && obj !== null) {
        const cleaned: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value === undefined) {
                cleaned[key] = null; // Firestore supports null but not undefined
            } else {
                cleaned[key] = sanitizeForFirestore(value);
            }
        }
        return cleaned;
    }

    return obj; // primitives: string, number, boolean
}

// ============================================================================
// FIRESTORE SESSION MANAGER CLASS
// ============================================================================

export class FirestoreSessionManager {
    /**
     * Check if Firestore is available and user is authenticated
     */
    static isAvailable(): boolean {
        return isFirebaseConfigured() && getCurrentUser() !== null;
    }

    /**
     * Save a session to Firestore
     */
    static async saveSession(session: SessionData): Promise<string> {
        const user = getCurrentUser();
        if (!user) {
            throw new Error("Not authenticated. Please sign in with Google first.");
        }

        const db = getDb();
        const docRef = doc(db, SESSIONS_COLLECTION, session.id);

        // Build the document, then sanitize to remove undefined values
        // (Firestore throws on undefined, causing silent save failures)
        const rawDoc = {
            ...session,
            updated_at: new Date().toISOString(),
            userEmail: user.email || "",
            userId: user.uid,
            cloudSyncedAt: serverTimestamp(),
        };

        const firestoreDoc = sanitizeForFirestore(rawDoc);
        // Re-attach serverTimestamp since sanitizer might not handle it
        firestoreDoc.cloudSyncedAt = serverTimestamp();

        console.log(`[Firestore] Saving session ${session.id}: ${session.transcripts?.length || 0} transcripts, ${session.graph_nodes?.length || 0} nodes, ${session.graph_edges?.length || 0} edges`);

        await setDoc(docRef, firestoreDoc);
        console.log(`[Firestore] Session saved successfully: ${session.id}`);
        return session.id;
    }

    /**
     * Load a single session from Firestore
     */
    static async loadSession(sessionId: string): Promise<SessionData> {
        const user = getCurrentUser();
        if (!user) {
            throw new Error("Not authenticated. Please sign in with Google first.");
        }

        const db = getDb();
        const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
        // Force read from server to avoid stale cached data
        const docSnap = await getDocFromServer(docRef);

        if (!docSnap.exists()) {
            throw new Error(`Session not found in Firestore: ${sessionId}`);
        }

        const data = docSnap.data() as FirestoreSessionDoc;

        // Security: only allow loading your own sessions
        if (data.userId !== user.uid) {
            throw new Error("Access denied: This session belongs to another user.");
        }

        const session = this.docToSession(data);
        console.log(`[Firestore] Loaded session ${sessionId} (from server): ${session.transcripts?.length || 0} transcripts, ${session.graph_nodes?.length || 0} nodes, ${session.graph_edges?.length || 0} edges, title="${session.metadata?.title}"`);
        return session;
    }

    /**
     * List all sessions for the current user
     */
    static async listSessions(): Promise<SessionData[]> {
        const user = getCurrentUser();
        if (!user) {
            throw new Error("Not authenticated. Please sign in with Google first.");
        }

        const db = getDb();
        const sessionsRef = collection(db, SESSIONS_COLLECTION);
        // Only filter by userId — no orderBy to avoid requiring a composite index
        const q = query(
            sessionsRef,
            where("userId", "==", user.uid)
        );

        // Force read from server to avoid stale cached data
        const querySnapshot = await getDocsFromServer(q);
        const sessions: SessionData[] = [];

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data() as FirestoreSessionDoc;
            sessions.push(this.docToSession(data));
        });

        // Sort client-side (newest first) — avoids Firestore composite index requirement
        sessions.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

        console.log(`[Firestore] Listed ${sessions.length} sessions for ${user.email}`);
        return sessions;
    }

    /**
     * Delete a session from Firestore
     */
    static async deleteSession(sessionId: string): Promise<void> {
        const user = getCurrentUser();
        if (!user) {
            throw new Error("Not authenticated. Please sign in with Google first.");
        }

        const db = getDb();
        const docRef = doc(db, SESSIONS_COLLECTION, sessionId);

        // Verify ownership before deleting
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data() as FirestoreSessionDoc;
            if (data.userId !== user.uid) {
                throw new Error("Access denied: Cannot delete another user's session.");
            }
        }

        await deleteDoc(docRef);
        console.log(`[Firestore] Session deleted: ${sessionId}`);
    }

    /**
     * Sync a local session to the cloud (upload)
     */
    static async syncToCloud(session: SessionData): Promise<void> {
        await this.saveSession(session);
    }

    /**
     * Convert Firestore document data to SessionData (strips Firestore-specific fields)
     */
    private static docToSession(data: FirestoreSessionDoc): SessionData {
        const { userEmail, userId, cloudSyncedAt, ...sessionData } = data;
        return sessionData as SessionData;
    }
}
