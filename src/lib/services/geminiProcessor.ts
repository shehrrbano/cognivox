/**
 * geminiProcessor.ts
 * Handles parsing of Gemini intelligence payloads and graph building.
 * Pure functions — no Svelte state mutation.
 */
import type { Transcript, GraphNode, GraphEdge, ParsedSegment, ToneAnalysis } from "$lib/types";

// ============================================================
// GEMINI INTELLIGENCE PARSING
// ============================================================

/**
 * Parse a Gemini intelligence event payload into typed segments.
 * Supports both single-object and array formats from Gemini.
 */
export function parseGeminiPayload(payload: {
    transcript: string;
    speaker?: string;
    intelligence: string;
}): ParsedSegment[] {
    const rawIntel = payload?.intelligence || "";
    const transcriptText = payload?.transcript || "";
    const backendSpeaker = payload?.speaker || "";

    // Check if ECAPA-TDNN identified speaker(s)
    const isTwoSpeakers = backendSpeaker.includes("+");
    const isEcapaIdentified =
        isTwoSpeakers ||
        (backendSpeaker.startsWith("Speaker ") && backendSpeaker !== "Speaker");
    const ecapaSpeakers = isTwoSpeakers
        ? backendSpeaker.split("+")
        : [backendSpeaker];

    let segments: ParsedSegment[] = [];

    try {
        const arrayMatch = rawIntel.match(/\[[\s\S]*\]/);
        const objMatch = rawIntel.match(/\{[\s\S]*\}/);

        if (arrayMatch) {
            try {
                const parsed = JSON.parse(arrayMatch[0]);
                if (Array.isArray(parsed)) {
                    segments = parsed.map((p: any) => {
                        let speaker: string;
                        if (isTwoSpeakers) {
                            const geminiSpeaker = p.speaker || "";
                            const matchedEcapa = ecapaSpeakers.find(
                                (s: string) =>
                                    geminiSpeaker.includes(s) || s.includes(geminiSpeaker),
                            );
                            speaker = matchedEcapa || p.speaker || ecapaSpeakers[0];
                        } else if (isEcapaIdentified) {
                            speaker = backendSpeaker;
                        } else {
                            speaker = p.speaker || backendSpeaker || "Speaker";
                        }
                        return {
                            transcript: p.transcript || transcriptText,
                            speaker,
                            tone: p.tone || "NEUTRAL",
                            confidence: p.confidence || 0.85,
                            category: p.category || ["INFO"],
                            entities: p.entities || [],
                            graph_edges: p.graph_edges || [],
                        };
                    });
                    console.log(
                        `[GEMINI] Parsed ${segments.length} speaker segments from array (ECAPA=${isEcapaIdentified}, backend=${backendSpeaker})`,
                    );
                }
            } catch {
                // Array parse failed, try single object
            }
        }

        // Fallback: try single object format
        if (segments.length === 0 && objMatch) {
            const parsed = JSON.parse(objMatch[0]);
            const speaker = isEcapaIdentified
                ? backendSpeaker
                : backendSpeaker && backendSpeaker !== "auto"
                    ? backendSpeaker
                    : parsed.speaker || "Speaker";
            segments = [
                {
                    transcript: parsed.transcript || transcriptText,
                    speaker,
                    tone: parsed.tone || "NEUTRAL",
                    confidence: parsed.confidence || 0.85,
                    category: parsed.category || ["INFO"],
                    entities: parsed.entities || [],
                    graph_edges: parsed.graph_edges || [],
                },
            ];
        }
    } catch (e) {
        console.log("[GEMINI] JSON parse error (using raw transcript):", e);
    }

    // If no segments parsed, create one from raw transcript
    if (segments.length === 0) {
        const speaker = isEcapaIdentified
            ? backendSpeaker
            : backendSpeaker && backendSpeaker !== "auto"
                ? backendSpeaker
                : "Speaker 1";
        segments = [
            {
                transcript: transcriptText,
                speaker,
                tone: "NEUTRAL",
                confidence: 0.7,
                category: ["INFO"],
                entities: [],
                graph_edges: [],
            },
        ];
    }

    return segments;
}

/**
 * Create a transcript entry from a parsed segment.
 */
export function createTranscriptEntry(seg: ParsedSegment): Transcript {
    return {
        id: `t_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        }),
        speaker: seg.speaker,
        speakerId: (() => {
            const s = seg.speaker || "Speaker 1";
            const numMatch = s.match(/(\d+)/);
            if (numMatch) return parseInt(numMatch[1], 10);
            if (s === "You") return 1;
            return 1;
        })(),
        text: seg.transcript,
        tone: seg.tone,
        category: seg.category,
        confidence: seg.confidence,
        isPartial: false,
    };
}

// ============================================================
// GRAPH BUILDING (shared by live events + post-processing)
// ============================================================

function ensureStartNode(nodes: GraphNode[]): GraphNode[] {
    if (!nodes.find((n) => n.id === "Start")) {
        return [...nodes, { id: "Start", type: "Root", label: "Start", weight: 3 }];
    }
    return nodes;
}

/**
 * Build graph nodes/edges from a single parsed segment.
 * Used by the live gemini_intelligence event handler.
 */
export function buildGraphFromSegment(
    seg: ParsedSegment,
    currentNodes: GraphNode[],
    currentEdges: GraphEdge[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
    let nodes = ensureStartNode(currentNodes);
    let edges = [...currentEdges];

    const speakerId = seg.speaker || "Speaker";

    // 1. Speaker node
    if (!nodes.find((n) => n.id === speakerId)) {
        nodes = [...nodes, { id: speakerId, type: "Speaker", label: speakerId, weight: 2 }];
        edges = [...edges, { from: "Start", to: speakerId, relation: "participant" }];
    }

    // 2. Tone node
    if (seg.tone && seg.tone !== "NEUTRAL") {
        const toneId = `tone_${seg.tone}`;
        if (!nodes.find((n) => n.id === toneId)) {
            nodes = [...nodes, { id: toneId, type: "Tone", label: seg.tone, weight: 1.2 }];
        }
        edges = [...edges, { from: speakerId, to: toneId, relation: "expressed" }];
    }

    // 3. Category nodes
    if (seg.category && seg.category.length > 0) {
        for (const cat of seg.category) {
            if (cat !== "INFO") {
                if (!nodes.find((n) => n.id === cat)) {
                    nodes = [...nodes, { id: cat, type: "Category", label: cat, weight: 1.5 }];
                    edges = [...edges, { from: "Start", to: cat, relation: "contains" }];
                }
                edges = [...edges, { from: speakerId, to: cat, relation: "raised" }];
            }
        }
    }

    // 4. Entity nodes
    if (seg.entities && seg.entities.length > 0) {
        for (const entity of seg.entities) {
            const entityId = entity.name.trim();
            if (!entityId || entityId.length === 0) continue;
            if (!nodes.find((n) => n.id === entityId)) {
                nodes = [...nodes, { id: entityId, type: entity.type || "Entity", label: entityId, weight: 1.3 }];
                edges = [...edges, { from: "Start", to: entityId, relation: "mentions" }];
            }
            edges = [...edges, { from: speakerId, to: entityId, relation: "mentioned" }];
        }
    }

    // 5. Gemini-extracted graph edges
    if (seg.graph_edges && seg.graph_edges.length > 0) {
        for (const edge of seg.graph_edges) {
            const fromId = edge.from?.trim();
            const toId = edge.to?.trim();
            const relation = edge.relation?.trim();
            if (!fromId || !toId || !relation) continue;
            if (!nodes.find((n) => n.id === fromId)) {
                nodes = [...nodes, { id: fromId, type: "Entity", label: fromId, weight: 1.0 }];
            }
            if (!nodes.find((n) => n.id === toId)) {
                nodes = [...nodes, { id: toId, type: "Entity", label: toId, weight: 1.0 }];
            }
            edges = [...edges, { from: fromId, to: toId, relation }];
        }
    }

    return { nodes, edges };
}

/**
 * Build graph from ALL transcripts (used during post-recording processing Step 4).
 * Also extracts key phrases from transcript text as entity nodes.
 */
export function buildGraphFromTranscripts(
    transcripts: Transcript[],
    currentNodes: GraphNode[],
    currentEdges: GraphEdge[],
    onProgress?: (current: number, total: number) => void,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
    let nodes = ensureStartNode(currentNodes);
    let edges = [...currentEdges];

    const stopWords = [
        "Speaker", "Start", "Meeting", "The", "This", "That", "There",
        "Their", "These", "Those", "With", "From", "About",
        "Would", "Could", "Should",
    ];

    let count = 0;
    for (const t of transcripts) {
        const speakerNode = t.speaker || "Speaker";

        // Add speaker
        if (!nodes.find((n) => n.id === speakerNode)) {
            nodes = [...nodes, { id: speakerNode, type: "Speaker", label: speakerNode, weight: 2 }];
            edges = [...edges, { from: "Start", to: speakerNode, relation: "participant" }];
        }

        // Add categories
        if (t.category) {
            for (const cat of t.category) {
                if (cat !== "INFO") {
                    if (!nodes.find((n) => n.id === cat)) {
                        nodes = [...nodes, { id: cat, type: "Category", label: cat, weight: 1.5 }];
                        edges = [...edges, { from: "Start", to: cat, relation: "contains" }];
                    }
                    edges = [...edges, { from: speakerNode, to: cat, relation: "raised" }];
                }
            }
        }

        // Add tone
        if (t.tone && t.tone !== "NEUTRAL") {
            const toneId = `tone_${t.tone}`;
            if (!nodes.find((n) => n.id === toneId)) {
                nodes = [...nodes, { id: toneId, type: "Tone", label: t.tone, weight: 1.2 }];
            }
            edges = [...edges, { from: speakerNode, to: toneId, relation: "expressed" }];
        }

        // Extract key phrases from text
        const words = t.text.split(/\s+/);
        const keyPhrases = words.filter(
            (w: string) =>
                w.length > 4 &&
                w[0] === w[0].toUpperCase() &&
                w[0] !== w[0].toLowerCase() &&
                !stopWords.includes(w),
        );

        const addedEntities = new Set<string>();
        for (const phrase of keyPhrases.slice(0, 3)) {
            const clean = phrase.replace(/[.,!?;:'"]/g, "").trim();
            if (clean.length < 3 || addedEntities.has(clean)) continue;
            addedEntities.add(clean);
            if (!nodes.find((n) => n.id === clean)) {
                nodes = [...nodes, { id: clean, type: "Entity", label: clean, weight: 1.0 }];
            }
            edges = [...edges, { from: speakerNode, to: clean, relation: "mentioned" }];
        }

        count++;
        if (onProgress) onProgress(count, transcripts.length);
    }

    return { nodes, edges };
}

// ============================================================
// TONE ANALYSIS (post-processing Step 3)
// ============================================================

/**
 * Analyze tone distribution from transcripts.
 * Used by runProcessingFlow Step 3.
 */
export function analyzeToneDistribution(transcripts: Transcript[]): ToneAnalysis {
    const toneDistribution: Record<string, number> = {};
    for (const t of transcripts) {
        const tone = t.tone || "NEUTRAL";
        toneDistribution[tone] = (toneDistribution[tone] || 0) + 1;
    }

    const totalTones = Object.values(toneDistribution).reduce((a, b) => a + b, 0);
    let stressLevel = 0;
    let engagementLevel = 0.3;
    let urgencyLevel = 0;
    let clarityLevel = 0.4;

    if (totalTones > 0) {
        const stressTones =
            (toneDistribution["URGENT"] || 0) + (toneDistribution["FRUSTRATED"] || 0);
        stressLevel = stressTones / totalTones;

        const positiveTones =
            (toneDistribution["POSITIVE"] || 0) +
            (toneDistribution["EXCITED"] || 0) +
            (toneDistribution["EMPATHETIC"] || 0);
        engagementLevel = Math.min(1, (positiveTones + totalTones * 0.3) / totalTones);

        const urgentCount = toneDistribution["URGENT"] || 0;
        urgencyLevel = urgentCount / totalTones;

        const avgConfidence =
            transcripts.reduce((sum, t) => sum + (t.confidence || 0.5), 0) / transcripts.length;
        clarityLevel = avgConfidence;
    }

    console.log("[PROCESSING] Tone distribution:", toneDistribution);

    return { stressLevel, engagementLevel, urgencyLevel, clarityLevel, toneDistribution };
}

/**
 * Create a partial transcript entry from Whisper transcription event.
 */
export function createPartialTranscript(intel: {
    text: string;
    speaker?: string;
    language?: string;
    confidence?: number;
}): Transcript {
    const whisperSpeaker = intel?.speaker || "You";
    return {
        id: `partial_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        }),
        speaker: whisperSpeaker,
        speakerId:
            whisperSpeaker === "You" || whisperSpeaker.includes("1") ? 1 : 0,
        text: intel.text,
        tone: "NEUTRAL",
        category: ["INFO"],
        confidence: intel.confidence || 0.85,
        isPartial: true,
    };
}
