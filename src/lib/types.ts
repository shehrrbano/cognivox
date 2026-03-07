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

/** A parsed segment from Gemini intelligence response */
export interface ParsedSegment {
    transcript: string;
    speaker: string;
    tone: string;
    confidence: number;
    category: string[];
    entities: Array<{ name: string; type: string }>;
    graph_edges: Array<{ from: string; to: string; relation: string }>;
}

/** Tone analysis result */
export interface ToneAnalysis {
    stressLevel: number;
    engagementLevel: number;
    urgencyLevel: number;
    clarityLevel: number;
    toneDistribution: Record<string, number>;
}
