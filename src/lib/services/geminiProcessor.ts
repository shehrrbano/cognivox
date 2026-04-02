/**
 * geminiProcessor.ts
 * Handles parsing of Gemini intelligence payloads and graph building.
 * Pure functions — no Svelte state mutation.
 */
import type { Transcript, GraphNode, GraphEdge, ParsedSegment, SvoTriple, FigureOfSpeech, ToneAnalysis } from "$lib/types";

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
                            svo_triples: p.svo_triples || [],
                            implications: p.implications || [],
                            figures_of_speech: p.figures_of_speech || [],
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
                    svo_triples: parsed.svo_triples || [],
                    implications: parsed.implications || [],
                    figures_of_speech: parsed.figures_of_speech || [],
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
                svo_triples: [],
                implications: [],
                figures_of_speech: [],
            },
        ];
    }

    return segments;
}

/**
 * Create a transcript entry from a parsed segment.
 * FIX 1: Accepts optional utteranceStartMs captured in Rust BEFORE inference,
 * which reflects when the user actually spoke — not when the API responded.
 */
export function createTranscriptEntry(seg: ParsedSegment, utteranceStartMs?: number): Transcript {
    const ts = utteranceStartMs
        ? new Date(utteranceStartMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return {
        id: `t_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp: ts,
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

/** KG_REDESIGN_v1: ensureStartNode is deprecated — the graph starts empty and fills with real entities.
 * Kept as a no-op passthrough for backward-compat in case any call site still references it.
 */
export function ensureStartNode(nodes: GraphNode[]): GraphNode[] {
    // KG_REDESIGN_v1: Never inject the "Start"/"Root" dummy node — return nodes unchanged.
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
    // FIX 5: Require >= 7 chars (filters 'action','system','method') AND >= 2 occurrences
    // to prevent mundane conversational words from becoming graph focal nodes when Gemini is rate-limited.
    const academicPatterns = [
        /\b(\w+(?:tion|sion|ment|ence|ance|ity|ism|ist|ogy|ics|ing|ure|ness))\b/gi,
    ];
    const lowerText = text.toLowerCase();
    for (const pat of academicPatterns) {
        let m: RegExpExecArray | null;
        while ((m = pat.exec(text)) !== null) {
            const word = m[1];
            if (word.length >= 7 && !stopWords.has(word.toLowerCase())) {
                // Count occurrences — must appear 2+ times to earn CONCEPT status
                const regex = new RegExp(`\\b${word}\\b`, 'gi');
                const matches = lowerText.match(regex);
                if (matches && matches.length >= 2) {
                    addConcept(word, "CONCEPT");
                }
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
 * Respects confidence thresholds and intelligence filters.
 */
export function buildGraphFromSegment(
    seg: ParsedSegment,
    currentNodes: GraphNode[],
    currentEdges: GraphEdge[],
    confidenceThreshold: number = 0.5,
    filters: Record<string, boolean> = {}
): { nodes: GraphNode[]; edges: GraphEdge[] } {
    // GUARD: Respect the global confidence threshold
    if ((seg.confidence || 0) < confidenceThreshold) {
        return { nodes: currentNodes, edges: currentEdges };
    }

    // KG_REDESIGN_v1: No Start node — graph builds purely from real extracted entities.
    let nodes = ensureStartNode(currentNodes); // no-op passthrough
    let edges = [...currentEdges];

    const speakerId = seg.speaker || "Speaker";

    // Mapping for filters
    const filterMap: Record<string, string> = {
        'TASK': 'tasks',
        'DECISION': 'decisions',
        'DEADLINE': 'deadlines',
        'ACTION_ITEM': 'actionItems',
        'RISK': 'risks',
        'URGENCY': 'urgency',
        'SENTIMENT': 'sentiment',
        'INTERRUPTION': 'interruptions'
    };

    // 1. Speaker node — standalone, no hub edge to "Start"
    if (!nodes.find((n) => n.id === speakerId)) {
        nodes = [...nodes, { id: speakerId, type: "Speaker", label: speakerId, weight: 2 }];
    }

    // 2. Tone node — INTELLIGENT_PARSING_FIXED: only on strongly non-neutral tones, skip if sentiment filter off
    const isSentimentEnabled = filters.sentiment !== false;
    if (seg.tone && seg.tone !== "NEUTRAL" && isSentimentEnabled) {
        const toneId = `tone_${seg.tone}`;
        if (!nodes.find((n) => n.id === toneId)) {
            nodes = [...nodes, { id: toneId, type: "Tone", label: seg.tone, weight: 1.2 }];
        }
        const toneEdgeKey = `${speakerId}|${toneId}|expressed`;
        if (!edges.find(e => `${e.from}|${e.to}|${e.relation}` === toneEdgeKey)) {
            edges = [...edges, { from: speakerId, to: toneId, relation: "expressed" }];
        }
    }

    // 3. Category nodes — INTELLIGENT_PARSING_FIXED: REMOVED as standalone graph nodes (were pure noise).
    // Categories are now expressed only as entity type attributes and speaker→entity edge types.
    // No more "TASK", "DECISION", "RISK" floating nodes per utterance.

    // 4. Entity nodes — FUTURE_PROOF_v1: use Gemini-supplied id field when present,
    //    fall back to normalized name. Cap at 8; fallback extractQuickConcepts to 3.
    let rawEntities: Array<{ id?: string; name: string; type: string; label?: string; weight?: number }> =
        seg.entities && seg.entities.length > 0
            ? seg.entities.slice(0, 8)
            : extractQuickConcepts(seg.transcript).slice(0, 3).map(c => ({ name: c.name, type: c.type }));

    const nodeIds = new Set(nodes.map(n => n.id));
    const edgeKeys = new Set(edges.map(e => `${e.from}|${e.to}|${e.relation}`));

    // Build entity id→label map for SVO triple resolution
    const entityIdMap = new Map<string, string>(); // id → label

    if (rawEntities.length > 0) {
        for (const entity of rawEntities) {
            // FUTURE_PROOF_v1: prefer Gemini-supplied id (English snake_case) over derived id
            const entityId = (entity.id?.trim()) || entity.name.trim().toLowerCase().replace(/\s+/g, '_');
            const displayLabel = (entity.label || entity.name).trim();
            if (!entityId || entityId.length < 3) continue;
            entityIdMap.set(entityId, displayLabel);
            if (!nodeIds.has(entityId)) {
                const entityWeight = typeof entity.weight === 'number' ? entity.weight : 1.3;
                nodes = [...nodes, { id: entityId, type: entity.type || "ENTITY", label: displayLabel, weight: entityWeight }];
                nodeIds.add(entityId);
            }
        }
    }

    // 4b. Figures of speech — FUTURE_PROOF_v1: normalized form becomes a concept node
    if (seg.figures_of_speech && seg.figures_of_speech.length > 0) {
        for (const fig of seg.figures_of_speech) {
            if (!fig.normalized) continue;
            const figId = fig.normalized.trim().toLowerCase().replace(/\s+/g, '_');
            if (figId.length < 4) continue;
            if (!nodeIds.has(figId)) {
                nodes = [...nodes, { id: figId, type: "CONCEPT", label: fig.normalized.trim(), weight: 1.5 }];
                nodeIds.add(figId);
                entityIdMap.set(figId, fig.normalized.trim());
            }
        }
    }

    // 5. SVO triples — FUTURE_PROOF_v1: primary edge-building signal
    //    Each triple directly encodes WHO → VERB → WHAT with no category inference needed.
    if (seg.svo_triples && seg.svo_triples.length > 0) {
        for (const svo of seg.svo_triples) {
            const fromId = svo.subject_id?.trim().toLowerCase().replace(/\s+/g, '_');
            const toId = svo.object_id?.trim().toLowerCase().replace(/\s+/g, '_');
            const verb = svo.verb?.trim();
            if (!fromId || !toId || !verb) continue;

            // Auto-create nodes if referenced in SVO but not in entities
            if (!nodeIds.has(fromId)) {
                const label = entityIdMap.get(fromId) || fromId.replace(/_/g, ' ');
                nodes = [...nodes, { id: fromId, type: "ENTITY", label, weight: 1.0 }];
                nodeIds.add(fromId);
            }
            if (!nodeIds.has(toId)) {
                const label = entityIdMap.get(toId) || toId.replace(/_/g, ' ');
                nodes = [...nodes, { id: toId, type: "ENTITY", label, weight: 1.0 }];
                nodeIds.add(toId);
            }
            const edgeKey = `${fromId}|${toId}|${verb}`;
            if (!edgeKeys.has(edgeKey)) {
                edges = [...edges, { from: fromId, to: toId, relation: verb }];
                edgeKeys.add(edgeKey);
            }
        }
    } else {
        // Fallback: no SVO triples — infer speaker→entity edges from category
        const hasTask = seg.category?.includes("TASK");
        const hasDecision = seg.category?.includes("DECISION");
        const hasRisk = seg.category?.includes("RISK");
        const fallbackRelation = hasTask ? "assigned" : hasDecision ? "decided" : hasRisk ? "identified" : "discussed";
        for (const [entityId] of entityIdMap) {
            const edgeKey = `${speakerId}|${entityId}|${fallbackRelation}`;
            if (!edgeKeys.has(edgeKey)) {
                edges = [...edges, { from: speakerId, to: entityId, relation: fallbackRelation }];
                edgeKeys.add(edgeKey);
            }
        }
    }

    // 6. Gemini-extracted entity-to-entity graph edges (non-SVO structural relations)
    if (seg.graph_edges && seg.graph_edges.length > 0) {
        const currentNodeIds = new Set(nodes.map(n => n.id));
        const currentEdgeKeys = new Set(edges.map(e => `${e.from}|${e.to}|${e.relation}`));
        for (const edge of seg.graph_edges) {
            const fromId = edge.from?.trim().toLowerCase().replace(/\s+/g, '_');
            const toId = edge.to?.trim().toLowerCase().replace(/\s+/g, '_');
            const relation = edge.relation?.trim();
            if (!fromId || !toId || !relation) continue;
            if (!currentNodeIds.has(fromId)) {
                nodes = [...nodes, { id: fromId, type: "ENTITY", label: edge.from?.trim() || fromId, weight: 1.0 }];
                currentNodeIds.add(fromId);
            }
            if (!currentNodeIds.has(toId)) {
                nodes = [...nodes, { id: toId, type: "ENTITY", label: edge.to?.trim() || toId, weight: 1.0 }];
                currentNodeIds.add(toId);
            }
            const edgeKey = `${fromId}|${toId}|${relation}`;
            if (!currentEdgeKeys.has(edgeKey)) {
                edges = [...edges, { from: fromId, to: toId, relation }];
                currentEdgeKeys.add(edgeKey);
            }
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
    // KG_REDESIGN_v1: No Start node — graph builds purely from real extracted entities.
    let nodes = ensureStartNode(currentNodes); // no-op passthrough
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

    // INTELLIGENT_PARSING_FIXED: Extract concepts from combined text ONCE (not per-transcript).
    // Cap at 8 global concepts. Removed per-transcript extraction + co-occurrence O(n²) loop.
    const allText = transcripts.map(t => t.text).join(". ");
    const quickConcepts = extractQuickConcepts(allText).slice(0, 8);

    let count = 0;
    for (const t of transcripts) {
        // INTELLIGENT_PARSING_FIXED: normalize speaker ID
        const speakerNode = t.speaker || "Speaker";

        // Add speaker — standalone, no hub edge to "Start"
        addNode({ id: speakerNode, type: "Speaker", label: speakerNode, weight: 2 });

        // INTELLIGENT_PARSING_FIXED: Category nodes REMOVED from graph (pure noise).
        // Categories expressed as relation types on entity edges instead.

        // Add tone — only non-neutral
        if (t.tone && t.tone !== "NEUTRAL") {
            const toneId = `tone_${t.tone}`;
            addNode({ id: toneId, type: "Tone", label: t.tone || "NEUTRAL", weight: 1.2 });
            addEdge({ from: speakerNode, to: toneId, relation: "expressed" });
        }

        // INTELLIGENT_PARSING_FIXED: No per-transcript extractQuickConcepts (was 6 × N transcripts = 90+ nodes).
        // Concept-to-speaker mapping now done once from global quickConcepts below.

        count++;
        if (onProgress) onProgress(count, transcripts.length);
    }

    // INTELLIGENT_PARSING_FIXED: Add 8 global concepts (was 15 + 6×N per-transcript = explosion).
    // Connect each concept to the first speaker only. Normalized IDs.
    const firstSpeakerId = nodes.find(n => n.type === "Speaker")?.id;
    for (const concept of quickConcepts) {
        const conceptId = concept.name.trim().toLowerCase().replace(/\s+/g, '_');
        if (!conceptId || conceptId.length < 3) continue;
        addNode({ id: conceptId, type: concept.type, label: concept.name.trim(), weight: 1.5 });
        if (firstSpeakerId) {
            addEdge({ from: firstSpeakerId, to: conceptId, relation: "discussed" });
        }
    }

    // INTELLIGENT_PARSING_FIXED: Co-occurrence edges REMOVED (was O(n²) = 225 edges per transcript).
    // Entity-to-entity relations now come exclusively from Gemini graph_edges in buildGraphFromSegment.

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
 * FIX: Accepts optional utteranceStartMs captured in Rust BEFORE inference,
 * which reflects when the user actually spoke — not when the event was received.
 */
export function createPartialTranscript(intel: {
    text: string;
    speaker?: string;
    language?: string;
    confidence?: number;
}, utteranceStartMs?: number): Transcript {
    const whisperSpeaker = intel?.speaker || "You";
    const ts = utteranceStartMs
        ? new Date(utteranceStartMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return {
        id: `partial_${Date.now()}`,
        timestamp: ts,
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
