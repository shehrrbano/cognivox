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

export function ensureStartNode(nodes: GraphNode[]): GraphNode[] {
    if (!nodes.find((n) => n.id === "Start")) {
        return [...nodes, { id: "Start", type: "Root", label: "Start", weight: 3 }];
    }
    return nodes;
}

/**
 * Extract quick concepts from raw text using pattern matching.
 * Used as a fallback when Gemini entities are absent (e.g. rate-limited).
 * Returns an array of { name, type } objects.
 */
export function extractQuickConcepts(text: string): { name: string; type: string }[] {
    if (!text || text.trim().length < 5) return [];
    const concepts: { name: string; type: string }[] = [];
    const seen = new Set<string>();

    const stopWords = new Set([
        "the", "this", "that", "there", "their", "these", "those", "with",
        "from", "about", "would", "could", "should", "have", "been", "will",
        "just", "some", "like", "what", "when", "where", "which", "while",
        "also", "very", "really", "actually", "basically", "think", "know",
        "going", "doing", "being", "make", "made", "need", "want", "good",
        "well", "right", "yeah", "okay", "sure", "here", "they", "them",
        "then", "than", "into", "over", "only", "even", "more", "most",
        "such", "each", "much", "many", "your", "other", "after", "before",
        "still", "because", "through", "between", "does", "start", "speaker",
        "said", "says", "called", "used", "using", "means", "example",
        "first", "second", "third", "next", "last", "every", "another",
        "part", "parts", "thing", "things", "kind", "type", "types",
    ]);

    const addConcept = (name: string, type: string) => {
        const key = name.toLowerCase().trim();
        if (key.length < 3 || seen.has(key) || stopWords.has(key)) return;
        seen.add(key);
        const label = name.trim().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        concepts.push({ name: label, type });
    };

    // Strategy 1: Topic indicator patterns ("such as X, Y", "called X", "known as X", "is a X", "are X")
    const topicPatterns = [
        /(?:such as|like|including|for example|e\.g\.|namely)\s+([^.!?]+)/gi,
        /(?:called|known as|referred to as|termed)\s+([\w\s]+?)(?:[.,;!?]|\s+(?:is|are|was|were|and|which|that))/gi,
        /(?:types? of|kinds? of|forms? of|categories? of)\s+([\w\s]+?)(?:[.,;!?]|$)/gi,
        /(?:is a|are|refers to|means|defined as)\s+([\w\s]+?)(?:[.,;!?]|\s+(?:that|which|and))/gi,
    ];
    for (const pat of topicPatterns) {
        let m: RegExpExecArray | null;
        while ((m = pat.exec(text)) !== null) {
            const items = m[1].split(/[,;]|\band\b/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 40);
            for (const item of items) {
                const words = item.split(/\s+/).filter(w => !stopWords.has(w.toLowerCase()));
                if (words.length > 0 && words.length <= 4) {
                    addConcept(words.join(" "), "CONCEPT");
                }
            }
        }
    }

    // Strategy 2: Academic / domain term detection
    const academicPatterns = [
        /\b(\w+(?:tion|sion|ment|ence|ance|ity|ism|ist|ogy|ics|ing|ure|ness))\b/gi,
    ];
    for (const pat of academicPatterns) {
        let m: RegExpExecArray | null;
        while ((m = pat.exec(text)) !== null) {
            const word = m[1];
            if (word.length >= 5 && !stopWords.has(word.toLowerCase())) {
                addConcept(word, "CONCEPT");
            }
        }
    }

    // Strategy 3: Capitalized multi-word phrases
    const capPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
    let cm: RegExpExecArray | null;
    while ((cm = capPattern.exec(text)) !== null) {
        const phrase = cm[1];
        if (phrase.length >= 4 && phrase.split(" ").length <= 4) {
            addConcept(phrase, "CONCEPT");
        }
    }

    // Strategy 4: Frequency — count words, promote frequent ones
    const wordFreq = new Map<string, number>();
    const allWords = text.toLowerCase().split(/[\s.,;:!?()\[\]{}"']+/).filter(w => w.length >= 4 && !stopWords.has(w));
    for (const w of allWords) wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
    for (const [word, count] of wordFreq) {
        if (count >= 2) addConcept(word, "CONCEPT");
    }

    return concepts.slice(0, 15);
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

    // 4. Entity nodes (from Gemini or fallback quick-concepts)
    let entities = seg.entities && seg.entities.length > 0
        ? seg.entities
        : extractQuickConcepts(seg.transcript).map(c => ({ name: c.name, type: c.type }));

    if (entities.length > 0) {
        const nodeIds = new Set(nodes.map(n => n.id));
        for (const entity of entities) {
            const entityId = entity.name.trim();
            if (!entityId || entityId.length < 2) continue;
            if (!nodeIds.has(entityId)) {
                nodes = [...nodes, { id: entityId, type: entity.type || "Entity", label: entityId, weight: 1.3 }];
                edges = [...edges, { from: "Start", to: entityId, relation: "mentions" }];
                nodeIds.add(entityId);
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

    const nodeIds = new Set(nodes.map(n => n.id));
    const edgeSet = new Set(edges.map(e => `${e.from}|${e.to}|${e.relation}`));

    const addNode = (node: GraphNode) => {
        if (!nodeIds.has(node.id)) {
            nodes = [...nodes, node];
            nodeIds.add(node.id);
        }
    };
    const addEdge = (edge: GraphEdge) => {
        const key = `${edge.from}|${edge.to}|${edge.relation}`;
        if (!edgeSet.has(key)) {
            edges = [...edges, edge];
            edgeSet.add(key);
        }
    };

    // Combine all transcript text for concept extraction
    const allText = transcripts.map(t => t.text).join(". ");
    const quickConcepts = extractQuickConcepts(allText);

    let count = 0;
    for (const t of transcripts) {
        const speakerNode = t.speaker || "Speaker";

        // Add speaker
        addNode({ id: speakerNode, type: "Speaker", label: speakerNode, weight: 2 });
        addEdge({ from: "Start", to: speakerNode, relation: "participant" });

        // Add categories
        if (t.category) {
            for (const cat of t.category) {
                if (cat !== "INFO") {
                    addNode({ id: cat, type: "Category", label: cat, weight: 1.5 });
                    addEdge({ from: "Start", to: cat, relation: "contains" });
                    addEdge({ from: speakerNode, to: cat, relation: "raised" });
                }
            }
        }

        // Add tone
        if (t.tone && t.tone !== "NEUTRAL") {
            const toneId = `tone_${t.tone}`;
            addNode({ id: toneId, type: "Tone", label: t.tone || "NEUTRAL", weight: 1.2 });
            addEdge({ from: speakerNode, to: toneId, relation: "expressed" });
        }

        // Extract concepts from this transcript's text
        const localConcepts = extractQuickConcepts(t.text);
        for (const concept of localConcepts.slice(0, 6)) {
            addNode({ id: concept.name, type: concept.type, label: concept.name, weight: 1.3 });
            addEdge({ from: "Start", to: concept.name, relation: "topic" });
            addEdge({ from: speakerNode, to: concept.name, relation: "discussed" });
        }

        count++;
        if (onProgress) onProgress(count, transcripts.length);
    }

    // Add global quick concepts extracted from combined text
    for (const concept of quickConcepts) {
        addNode({ id: concept.name, type: concept.type, label: concept.name, weight: 1.5 });
        addEdge({ from: "Start", to: concept.name, relation: "topic" });
    }

    // Create co-occurrence edges between concepts that appear in the same transcript
    for (const t of transcripts) {
        const tConcepts = extractQuickConcepts(t.text).map(c => c.name);
        for (let i = 0; i < tConcepts.length; i++) {
            for (let j = i + 1; j < tConcepts.length && j < i + 3; j++) {
                addEdge({ from: tConcepts[i], to: tConcepts[j], relation: "related_to" });
            }
        }
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
