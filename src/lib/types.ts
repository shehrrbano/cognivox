// Shared TypeScript types/interfaces for Cognivox

export interface Transcript {
    id: string;
    timestamp: string;
    speaker: string;
    speakerId: number;
    text: string;
    tone?: string;
    category?: string[];
    confidence?: number;
    isPartial?: boolean;
    /** FIX 3: Atomic chunk ID from Rust — used to correlate a partial whisper transcript
     *  to its final gemini_intelligence event. Eliminates timer-based partial promotion. */
    chunkId?: number;
}

export interface Alert {
    id: string;
    type: string;
    message: string;
    timestamp: string;
    severity: "info" | "warning" | "critical";
}

export interface GraphNode {
    id: string;
    type: string;
    label?: string;
    weight?: number;
    /** When true, this node represents a collapsed cluster */
    collapsed?: boolean;
    /** Number of children hidden inside a collapsed cluster */
    childCount?: number;
    /** IDs of child nodes hidden in this cluster */
    childIds?: string[];
}

export interface GraphEdge {
    from: string;
    to: string;
    relation: string;
}

export interface SpeakerIdStatus {
    initialized: boolean;
    speaker_count: number;
    threshold: number;
    model: string;
}

export interface SpeakerProfile {
    id: string;
    label: string;
    sample_count: number;
    created_at: number;
    last_seen: number;
}

export interface IdentifiedSpeaker {
    speaker_label: string;
    confidence: number;
    is_new: boolean;
}

export interface ExtractedSummary {
    topics: string[];
    decisions: string[];
    actionItems: string[];
    keyPoints: string[];
}

export interface ExtractedMemoriesData {
    keyMoments: string[];
    personalInsights: string[];
    quotes: string[];
    emotionShifts: string[];
}

export interface DynamicModel {
    id: string;              // Model ID (e.g. "gemini-2.0-flash")
    name: string;            // User-friendly name
    provider: 'gemini' | 'openai' | 'custom';
    isCustom: boolean;       // User-added?
    description?: string;
}

export interface DynamicApiKey {
    id: string;               // Unique identifier
    name: string;             // User-friendly name
    key: string;              // The actual API key
    priority: number;         // Higher priority keys used first
    isActive: boolean;        // Is the key currently active?
    isPrimary?: boolean;      // Default key for new sessions
    rateLimited?: boolean;    // Currently on cooldown?
    rateLimitedUntil?: number;// Expiry time for rate limit
    usageCount?: number;      // Total successful calls
    lastUsed?: string | null; // ISO timestamp
}

export interface ModelOption {
    id: string;
    name: string;
}

// === Service-level types ===

/** Result of restoring a session into UI state */
export interface RestoredState {
    currentSession: any;
    transcripts: Transcript[];
    graphNodes: GraphNode[];
    graphEdges: GraphEdge[];
    graphPositions?: Record<string, { x: number; y: number }>;
    stressLevel: number;
    engagementLevel: number;
    urgencyLevel: number;
    clarityLevel: number;
    extractedSummary: ExtractedSummary | null;
    extractedMemories: ExtractedMemoriesData | null;
    showSummaryPanel: boolean;
    showMemoriesPanel: boolean;
    activeTab: string;
    isCollapsed: boolean;
    status: string;
}

/** Parameters needed to build a session snapshot */
export interface SnapshotParams {
    currentSession: any;
    transcripts: Transcript[];
    graphNodes: GraphNode[];
    graphEdges: GraphEdge[];
    stressLevel: number;
    engagementLevel: number;
    urgencyLevel: number;
    clarityLevel: number;
    extractedSummary: ExtractedSummary | null;
    extractedMemories: ExtractedMemoriesData | null;
    showSummaryPanel: boolean;
    showMemoriesPanel: boolean;
}

/** Subject-Verb-Object triple extracted by Gemini — primary graph-building signal */
export interface SvoTriple {
    subject_id: string;
    verb: string;
    object_id: string;
    confidence?: number;
}

/** Figurative language detected in the transcript */
export interface FigureOfSpeech {
    original: string;
    /** Semantic literal meaning — used as the graph node label */
    normalized: string;
    /** "metaphor" | "idiom" | "hyperbole" | "personification" */
    type: string;
}

/** A parsed segment from Gemini intelligence response */
export interface ParsedSegment {
    transcript: string;
    speaker: string;
    tone: string;
    confidence: number;
    category: string[];
    entities: Array<{
        /** English snake_case ID — language-agnostic, stable across sessions */
        id?: string;
        name: string;
        type: string;
        label?: string;
        weight?: number;
    }>;
    graph_edges: Array<{ from: string; to: string; relation: string; strength?: number }>;
    /** SVO triples — richer than raw entity lists, drive the primary KG edges */
    svo_triples?: SvoTriple[];
    /** Strategic implications inferred from the segment */
    implications?: string[];
    /** Figurative language detected; normalized form becomes a graph node */
    figures_of_speech?: FigureOfSpeech[];
}

/** Tone analysis result */
export interface ToneAnalysis {
    stressLevel: number;
    engagementLevel: number;
    urgencyLevel: number;
    clarityLevel: number;
    toneDistribution: Record<string, number>;
}
