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

        const firestoreDoc: FirestoreSessionDoc = {
            ...session,
            updated_at: new Date().toISOString(),
            userEmail: user.email || "",
            userId: user.uid,
            cloudSyncedAt: serverTimestamp(),
        };

        await setDoc(docRef, firestoreDoc);
        console.log(`[Firestore] Session saved: ${session.id}`);
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
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error(`Session not found: ${sessionId}`);
        }

        const data = docSnap.data() as FirestoreSessionDoc;

        // Security: only allow loading your own sessions
        if (data.userId !== user.uid) {
            throw new Error("Access denied: This session belongs to another user.");
        }

        return this.docToSession(data);
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

        const querySnapshot = await getDocs(q);
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
