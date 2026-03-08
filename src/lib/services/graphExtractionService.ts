/**
 * graphExtractionService.ts
 * Dedicated knowledge graph extraction via Gemini API.
 * Extracts entities and relationships from transcripts to build a structured graph.
 */
import { keyManager } from "$lib/keyManager";
import type { Transcript, GraphNode, GraphEdge } from "$lib/types";

/** Result of a knowledge graph extraction */
export interface GraphExtractionResult {
    nodes: GraphNode[];
    edges: GraphEdge[];
    error: string | null;
}

/** Raw entity from API response */
interface RawEntity {
    id: string;
    type: string;
    label?: string;
    weight?: number;
}

/** Raw relationship from API response */
interface RawRelationship {
    source: string;
    target: string;
    relation: string;
}

/** Full API response shape */
interface GraphApiResponse {
    nodes: RawEntity[];
    edges: RawRelationship[];
}

/**
 * Build the prompt for knowledge graph extraction.
 */
function buildGraphExtractionPrompt(transcriptText: string): string {
    return `You are a knowledge graph extraction engine. Analyze the following transcript (lecture, meeting, or conversation) and extract ALL concepts, entities, and relationships to build a comprehensive conceptual knowledge graph.

TRANSCRIPT:
${transcriptText}

EXTRACTION RULES:
1. Extract ALL meaningful concepts and entities: academic concepts, theories, techniques, methods, people, organizations, projects, topics, technologies, locations, dates, decisions, tasks, definitions, examples, formulas
2. Extract ALL relationships: "requires" (prerequisite), "used_in" (application), "explains" (definition/clarification), "part_of" (composition), "contrasts_with" (comparison), "leads_to" (causation), "example_of" (illustration), "related_to" (general association), "discussed_by" (speaker attribution), "depends_on", "implements", "extends"
3. Each entity needs a unique "id" (short snake_case identifier), a "type" (category), a "label" (human-readable display name), and "weight" (importance 1-5, where 5 = central topic, 1 = minor mention)
4. Each relationship needs "source" (entity id), "target" (entity id), and "relation" (relationship type)
5. Entity types: CONCEPT, THEORY, METHOD, TECHNIQUE, DEFINITION, EXAMPLE, FORMULA, PERSON, ORG, PROJECT, TOPIC, TECHNOLOGY, LOCATION, DATE, DECISION, TASK, RISK, ACTION_ITEM, Speaker
6. Always include a "Start" node of type "Root" as the central anchor
7. Connect main concepts/topics to the Start node with "topic_of" relation
8. Connect speakers to concepts they discuss, NOT just to the Start node
9. Create CONCEPT-to-CONCEPT relationships (e.g., "Gradient Descent" --requires--> "Derivative", "Neural Network" --uses--> "Backpropagation")
10. Aim for 8-25 nodes and 12-35 edges. Focus on conceptual depth over breadth
11. Use multi-word labels for clarity (e.g., "Machine Learning" not just "ML")
12. Merge duplicate or near-duplicate concepts (e.g., "AI" and "Artificial Intelligence" should be one node)

RETURN FORMAT (valid JSON only, no markdown, no explanation):
{
  "nodes": [
    {"id": "Start", "type": "Root", "label": "Start", "weight": 5},
    {"id": "gradient_descent", "type": "CONCEPT", "label": "Gradient Descent", "weight": 4},
    {"id": "derivative", "type": "CONCEPT", "label": "Derivative", "weight": 3},
    {"id": "speaker_1", "type": "Speaker", "label": "Speaker 1", "weight": 2}
  ],
  "edges": [
    {"source": "gradient_descent", "target": "Start", "relation": "topic_of"},
    {"source": "gradient_descent", "target": "derivative", "relation": "requires"},
    {"source": "speaker_1", "target": "gradient_descent", "relation": "discussed"}
  ]
}

Return ONLY valid JSON. Do not wrap in markdown code blocks.`;
}

/**
 * Parse and validate the API response into graph data.
 */
function parseGraphResponse(responseText: string): GraphApiResponse | null {
    try {
        // Try to extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("[GraphExtraction] No JSON found in response");
            return null;
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Validate structure
        if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
            console.error("[GraphExtraction] Missing or invalid 'nodes' array");
            return null;
        }
        if (!parsed.edges || !Array.isArray(parsed.edges)) {
            console.error("[GraphExtraction] Missing or invalid 'edges' array");
            return null;
        }

        // Validate and clean nodes
        const validNodes: RawEntity[] = parsed.nodes
            .filter((n: any) => n && n.id && typeof n.id === "string")
            .map((n: any) => ({
                id: n.id.trim(),
                type: (n.type || "CONCEPT").trim(),
                label: (n.label || n.id).trim(),
                weight: typeof n.weight === "number" ? Math.max(1, Math.min(5, n.weight)) : 1,
            }));

        // Validate and clean edges
        const nodeIds = new Set(validNodes.map((n) => n.id));
        const validEdges: RawRelationship[] = parsed.edges
            .filter(
                (e: any) =>
                    e &&
                    e.source &&
                    e.target &&
                    e.relation &&
                    typeof e.source === "string" &&
                    typeof e.target === "string" &&
                    typeof e.relation === "string",
            )
            .map((e: any) => ({
                source: e.source.trim(),
                target: e.target.trim(),
                relation: e.relation.trim(),
            }));

        // Auto-create nodes referenced in edges but missing from nodes array
        for (const edge of validEdges) {
            if (!nodeIds.has(edge.source)) {
                validNodes.push({
                    id: edge.source,
                    type: "CONCEPT",
                    label: edge.source,
                    weight: 1,
                });
                nodeIds.add(edge.source);
            }
            if (!nodeIds.has(edge.target)) {
                validNodes.push({
                    id: edge.target,
                    type: "CONCEPT",
                    label: edge.target,
                    weight: 1,
                });
                nodeIds.add(edge.target);
            }
        }

        if (validNodes.length === 0) {
            console.error("[GraphExtraction] No valid nodes extracted");
            return null;
        }

        console.log(
            `[GraphExtraction] Parsed ${validNodes.length} nodes, ${validEdges.length} edges`,
        );
        return { nodes: validNodes, edges: validEdges };
    } catch (error: any) {
        console.error("[GraphExtraction] JSON parse error:", error.message);
        return null;
    }
}

/**
 * Convert raw API response into typed GraphNode[] and GraphEdge[].
 */
function convertToGraphData(
    apiResponse: GraphApiResponse,
    existingNodes: GraphNode[],
    existingEdges: GraphEdge[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const nodeMap = new Map<string, GraphNode>();
    const edgeSet = new Set<string>();

    // Add existing nodes
    for (const node of existingNodes) {
        nodeMap.set(node.id, node);
    }

    // Add existing edges (deduplicate)
    const edges: GraphEdge[] = [];
    for (const edge of existingEdges) {
        const key = `${edge.from}|${edge.to}|${edge.relation}`;
        if (!edgeSet.has(key)) {
            edgeSet.add(key);
            edges.push(edge);
        }
    }

    // Add new nodes from extraction
    for (const rawNode of apiResponse.nodes) {
        if (!nodeMap.has(rawNode.id)) {
            nodeMap.set(rawNode.id, {
                id: rawNode.id,
                type: rawNode.type,
                label: rawNode.label || rawNode.id,
                weight: rawNode.weight || 1,
            });
        } else {
            // Update weight if new extraction suggests higher importance
            const existing = nodeMap.get(rawNode.id)!;
            if ((rawNode.weight || 1) > (existing.weight || 1)) {
                nodeMap.set(rawNode.id, {
                    ...existing,
                    weight: rawNode.weight,
                    label: rawNode.label || existing.label,
                });
            }
        }
    }

    // Add new edges from extraction
    for (const rawEdge of apiResponse.edges) {
        const key = `${rawEdge.source}|${rawEdge.target}|${rawEdge.relation}`;
        if (!edgeSet.has(key)) {
            edgeSet.add(key);
            edges.push({
                from: rawEdge.source,
                to: rawEdge.target,
                relation: rawEdge.relation,
            });
        }
    }

    // Ensure Start node exists
    if (!nodeMap.has("Start")) {
        nodeMap.set("Start", {
            id: "Start",
            type: "Root",
            label: "Start",
            weight: 5,
        });
    }

    return {
        nodes: Array.from(nodeMap.values()),
        edges,
    };
}

/**
 * Extract a knowledge graph from transcripts using Gemini API.
 * This is the main entry point — called from GraphTab or processing flow.
 *
 * @param transcripts - Array of transcript entries
 * @param existingNodes - Current graph nodes (will be merged, not replaced)
 * @param existingEdges - Current graph edges (will be merged, not replaced)
 * @param getApiKey - Function to get the current API key
 * @returns GraphExtractionResult with nodes, edges, and optional error
 */
export async function extractKnowledgeGraph(
    transcripts: Transcript[],
    existingNodes: GraphNode[],
    existingEdges: GraphEdge[],
    getApiKey: () => string | null,
): Promise<GraphExtractionResult> {
    if (transcripts.length === 0) {
        return {
            nodes: existingNodes,
            edges: existingEdges,
            error: "No transcripts available to build knowledge graph",
        };
    }

    // Build transcript text
    const transcriptText = transcripts
        .map((t) => `[${t.timestamp}] ${t.speaker}: ${t.text}`)
        .join("\n");

    // Limit to ~4000 chars for API efficiency
    const trimmedText =
        transcriptText.length > 4000
            ? transcriptText.slice(0, 4000) + "\n[... transcript truncated ...]"
            : transcriptText;

    const prompt = buildGraphExtractionPrompt(trimmedText);

    try {
        const apiKey = getApiKey();
        if (!apiKey) {
            // Fallback: build basic graph from transcripts without API
            console.warn("[GraphExtraction] No API key — using local extraction");
            return {
                ...buildLocalGraph(transcripts, existingNodes, existingEdges),
                error: null,
            };
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.2, max_output_tokens: 2048 },
                }),
            },
        );

        if (!response.ok) {
            if (response.status === 429) {
                keyManager.handleError(429, "Rate limit");
            }
            const errorText = await response.text().catch(() => "Unknown error");
            console.error(`[GraphExtraction] API Error ${response.status}:`, errorText);

            // Fallback to local extraction on API failure
            return {
                ...buildLocalGraph(transcripts, existingNodes, existingEdges),
                error: `API error ${response.status} — used local extraction instead`,
            };
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        if (!text) {
            return {
                ...buildLocalGraph(transcripts, existingNodes, existingEdges),
                error: "Empty API response — used local extraction instead",
            };
        }

        const parsed = parseGraphResponse(text);
        if (!parsed) {
            return {
                ...buildLocalGraph(transcripts, existingNodes, existingEdges),
                error: "Failed to parse API response — used local extraction instead",
            };
        }

        keyManager.reportSuccess();

        const result = convertToGraphData(parsed, existingNodes, existingEdges);
        console.log(
            `[GraphExtraction] Success: ${result.nodes.length} nodes, ${result.edges.length} edges`,
        );
        return { ...result, error: null };
    } catch (error: any) {
        console.error("[GraphExtraction] Failed:", error.message);
        // Fallback to local extraction
        return {
            ...buildLocalGraph(transcripts, existingNodes, existingEdges),
            error: `Extraction failed: ${error.message} — used local extraction`,
        };
    }
}

/**
 * Build a knowledge graph locally without API calls.
 * Uses NLP-like heuristics to extract entities and relationships.
 * This serves as a fallback when the API is unavailable.
 */
export function buildLocalGraph(
    transcripts: Transcript[],
    existingNodes: GraphNode[],
    existingEdges: GraphEdge[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const nodeMap = new Map<string, GraphNode>();
    const edgeSet = new Set<string>();
    const edges: GraphEdge[] = [];

    // Import existing data
    for (const n of existingNodes) nodeMap.set(n.id, n);
    for (const e of existingEdges) {
        const key = `${e.from}|${e.to}|${e.relation}`;
        if (!edgeSet.has(key)) {
            edgeSet.add(key);
            edges.push(e);
        }
    }

    // Ensure Start node
    if (!nodeMap.has("Start")) {
        nodeMap.set("Start", {
            id: "Start",
            type: "Root",
            label: "Start",
            weight: 5,
        });
    }

    const stopWords = new Set([
        "the", "this", "that", "there", "their", "these", "those", "with",
        "from", "about", "would", "could", "should", "have", "been", "will",
        "just", "some", "like", "what", "when", "where", "which", "while",
        "also", "very", "really", "actually", "basically", "think", "know",
        "going", "doing", "being", "make", "made", "need", "want", "good",
        "well", "right", "yeah", "okay", "sure", "here", "they", "them",
        "then", "than", "into", "over", "only", "even", "more", "most",
        "such", "each", "much", "many", "your", "other", "after", "before",
        "still", "because", "through", "between", "those", "does", "have",
        "meeting", "speaker", "said", "says", "start", "called", "used",
        "using", "means", "example", "first", "second", "third", "next",
        "last", "every", "another", "part", "parts", "thing", "things",
        "kind", "type", "types", "come", "came", "take", "took", "give",
        "gave", "look", "looks", "tell", "told", "talk", "talking",
    ]);

    // Helper: add node/edge with dedup
    const addNode = (id: string, type: string, label: string, weight: number) => {
        if (!nodeMap.has(id)) {
            nodeMap.set(id, { id, type, label, weight });
        }
    };
    const addEdge = (from: string, to: string, relation: string) => {
        const key = `${from}|${to}|${relation}`;
        if (!edgeSet.has(key)) {
            edgeSet.add(key);
            edges.push({ from, to, relation });
        }
    };

    // Capitalize a phrase for use as a node label/id
    const capitalize = (s: string) => s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

    // Track word frequency for importance weighting
    const wordFrequency = new Map<string, number>();
    const speakerTopics = new Map<string, Set<string>>();
    // Track concepts found per sentence for co-occurrence edges later
    const sentenceConcepts: string[][] = [];

    // Combine all transcript text for global strategies
    const allText = transcripts.map(t => t.text || "").join(". ");

    // === STRATEGY 1: Topic-indicator pattern extraction ===
    // Catches "such as nouns, verbs", "called adjectives", "types of words" etc.
    const topicPatterns = [
        /(?:such as|like|including|for example|e\.g\.|namely)\s+([^.!?]+)/gi,
        /(?:called|known as|referred to as|termed)\s+([\w\s]+?)(?:[.,;!?]|\s+(?:is|are|was|were|and|which|that))/gi,
        /(?:types? of|kinds? of|forms? of|categories? of)\s+([\w\s]+?)(?:[.,;!?]|$)/gi,
        /(?:is a|are|refers to|means|defined as)\s+([\w\s]+?)(?:[.,;!?]|\s+(?:that|which|and))/gi,
    ];
    for (const pat of topicPatterns) {
        let m: RegExpExecArray | null;
        while ((m = pat.exec(allText)) !== null) {
            const items = m[1].split(/[,;]|\band\b/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 40);
            for (const item of items) {
                const words = item.split(/\s+/).filter(w => !stopWords.has(w.toLowerCase()) && w.length > 2);
                if (words.length > 0 && words.length <= 4) {
                    const conceptId = capitalize(words.join(" "));
                    const entityType = classifyEntityType(conceptId);
                    addNode(conceptId, entityType, conceptId, 2);
                    addEdge("Start", conceptId, "topic");
                }
            }
        }
    }

    // === STRATEGY 2: Academic/domain term detection (suffix-based) ===
    const suffixPattern = /\b(\w{5,}(?:tion|sion|ment|ence|ance|ity|ism|ist|ogy|ics|ure|ness|ive|ous|ful|able|ible))\b/gi;
    let suffixMatch: RegExpExecArray | null;
    while ((suffixMatch = suffixPattern.exec(allText)) !== null) {
        const word = suffixMatch[1];
        if (!stopWords.has(word.toLowerCase())) {
            const conceptId = capitalize(word);
            addNode(conceptId, "CONCEPT", conceptId, 1.5);
            addEdge("Start", conceptId, "topic");
        }
    }

    // === PER-TRANSCRIPT EXTRACTION ===
    for (const t of transcripts) {
        const speaker = t.speaker || "Speaker";

        // Add speaker node
        addNode(speaker, "Speaker", speaker, 2);
        addEdge("Start", speaker, "participant");

        // Add tone node
        if (t.tone && t.tone !== "NEUTRAL") {
            const toneId = `tone_${t.tone}`;
            addNode(toneId, "Tone", t.tone || "NEUTRAL", 1);
            addEdge(speaker, toneId, "expressed");
        }

        // Add category nodes
        if (t.category) {
            for (const cat of t.category) {
                if (cat !== "INFO") {
                    addNode(cat, "Category", cat, 1.5);
                    addEdge("Start", cat, "contains");
                    addEdge(speaker, cat, "raised");
                }
            }
        }

        // Extract meaningful phrases using improved heuristics
        const text = t.text || "";
        const words = text.split(/\s+/);

        // Track concepts found in this transcript for co-occurrence
        const thisTranscriptConcepts: string[] = [];

        // Extract multi-word proper nouns (consecutive capitalized words)
        const phrases: string[] = [];
        let currentPhrase: string[] = [];

        for (const word of words) {
            const cleaned = word.replace(/[.,!?;:'"()\[\]{}]/g, "").trim();
            if (cleaned.length < 2) {
                if (currentPhrase.length > 0) {
                    phrases.push(currentPhrase.join(" "));
                    currentPhrase = [];
                }
                continue;
            }

            const isCapitalized =
                cleaned[0] === cleaned[0].toUpperCase() &&
                cleaned[0] !== cleaned[0].toLowerCase();
            const isStopWord = stopWords.has(cleaned.toLowerCase());

            if (isCapitalized && !isStopWord && cleaned.length > 2) {
                currentPhrase.push(cleaned);
            } else {
                if (currentPhrase.length > 0) {
                    phrases.push(currentPhrase.join(" "));
                    currentPhrase = [];
                }
                // Also track individual important words
                if (!isStopWord && cleaned.length > 4) {
                    const lower = cleaned.toLowerCase();
                    wordFrequency.set(lower, (wordFrequency.get(lower) || 0) + 1);
                }
            }
        }
        if (currentPhrase.length > 0) {
            phrases.push(currentPhrase.join(" "));
        }

        // Extract bigrams (two consecutive non-stopword words) for concept detection
        const cleanedWords = words
            .map((w: string) => w.replace(/[.,!?;:'"()\[\]{}]/g, "").trim())
            .filter((w: string) => w.length > 2 && !stopWords.has(w.toLowerCase()));
        for (let i = 0; i < cleanedWords.length - 1; i++) {
            const bigram = `${cleanedWords[i]} ${cleanedWords[i + 1]}`;
            const bigramKey = bigram.toLowerCase();
            wordFrequency.set(bigramKey, (wordFrequency.get(bigramKey) || 0) + 1);
        }

        // Add phrase entities
        if (!speakerTopics.has(speaker)) {
            speakerTopics.set(speaker, new Set());
        }
        const topics = speakerTopics.get(speaker)!;

        for (const phrase of phrases.slice(0, 8)) {
            if (phrase.length < 3) continue;
            if (stopWords.has(phrase.toLowerCase())) continue;

            // Determine entity type based on content — extended for concepts
            const entityType = classifyEntityType(phrase);

            addNode(phrase, entityType, phrase, 1.3);
            addEdge("Start", phrase, "mentions");
            thisTranscriptConcepts.push(phrase);

            // Connect speaker to entity
            if (!topics.has(phrase)) {
                topics.add(phrase);
                addEdge(speaker, phrase, "discussed");
            }
        }

        // Also extract concepts from lowercase text (Whisper output is often lowercase)
        // Use the same suffix/frequency approach per-sentence
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
        for (const sentence of sentences) {
            const sWords = sentence.trim().split(/\s+/)
                .map(w => w.replace(/[.,!?;:'"()\[\]{}]/g, "").trim())
                .filter(w => w.length > 3 && !stopWords.has(w.toLowerCase()));
            // Add individual content words to frequency map
            for (const w of sWords) {
                const lower = w.toLowerCase();
                wordFrequency.set(lower, (wordFrequency.get(lower) || 0) + 1);
            }
            // Also extract sentence-level bigrams
            for (let i = 0; i < sWords.length - 1; i++) {
                const bigram = `${sWords[i]} ${sWords[i + 1]}`.toLowerCase();
                wordFrequency.set(bigram, (wordFrequency.get(bigram) || 0) + 1);
            }
        }

        if (thisTranscriptConcepts.length > 0) {
            sentenceConcepts.push(thisTranscriptConcepts);
        }
    }

    // === STRATEGY 3: Add high-frequency words/bigrams as topic nodes ===
    for (const [word, count] of wordFrequency) {
        if (count >= 2 && !stopWords.has(word) && word.length > 3) {
            const conceptId = capitalize(word);
            if (!nodeMap.has(conceptId)) {
                const entityType = classifyEntityType(conceptId);
                addNode(conceptId, entityType, conceptId, Math.min(count, 4));
                addEdge("Start", conceptId, "topic");
            }
        }
    }

    // === STRATEGY 4: Co-occurrence edges between concepts found in the same transcript ===
    for (const concepts of sentenceConcepts) {
        for (let i = 0; i < concepts.length; i++) {
            for (let j = i + 1; j < concepts.length && j < i + 4; j++) {
                addEdge(concepts[i], concepts[j], "related_to");
            }
        }
    }

    // Cross-concept relationships for concepts sharing speakers
    const conceptsBySpeaker = new Map<string, string[]>();
    for (const [spk, topicSet] of speakerTopics) {
        conceptsBySpeaker.set(spk, Array.from(topicSet));
    }
    for (const [_spk, concepts] of conceptsBySpeaker) {
        for (let i = 0; i < concepts.length; i++) {
            for (let j = i + 1; j < concepts.length && j < i + 3; j++) {
                addEdge(concepts[i], concepts[j], "related_to");
            }
        }
    }

    console.log(`[LocalGraph] Built ${nodeMap.size} nodes, ${edges.length} edges from ${transcripts.length} transcripts`);

    return {
        nodes: Array.from(nodeMap.values()),
        edges,
    };
}

/**
 * Classify an entity phrase into a type based on keyword heuristics.
 */
function classifyEntityType(phrase: string): string {
    const lower = phrase.toLowerCase();

    // Academic/technical concepts
    const conceptKeywords = [
        "algorithm", "function", "model", "theory", "theorem", "principle",
        "method", "approach", "technique", "process", "system", "framework",
        "pattern", "structure", "analysis", "equation", "formula", "concept",
        "learning", "network", "intelligence", "optimization", "regression",
        "classification", "gradient", "descent", "derivative", "integral",
        "matrix", "vector", "probability", "statistics", "distribution",
        "hypothesis", "variable", "parameter", "computation", "abstraction",
        "architecture", "protocol", "interface", "module", "component",
    ];
    if (conceptKeywords.some((k) => lower.includes(k))) return "CONCEPT";

    // Technology
    const techKeywords = [
        "python", "javascript", "typescript", "react", "svelte", "node",
        "api", "database", "server", "cloud", "docker", "kubernetes",
        "git", "linux", "windows", "machine", "deep", "neural", "transformer",
        "gpu", "cpu", "software", "hardware", "compiler", "runtime",
    ];
    if (techKeywords.some((k) => lower.includes(k))) return "TECHNOLOGY";

    // Method/technique
    const methodKeywords = [
        "step", "procedure", "workflow", "pipeline", "strategy",
        "implementation", "solution", "design",
    ];
    if (methodKeywords.some((k) => lower.includes(k))) return "METHOD";

    // Project
    if (lower.includes("project") || lower.includes("app") || lower.includes("platform")) return "PROJECT";

    // Task
    if (lower.includes("task") || lower.includes("todo") || lower.includes("action")) return "TASK";

    // Date/time
    const dateKeywords = [
        "deadline", "date", "monday", "tuesday", "wednesday", "thursday",
        "friday", "saturday", "sunday", "january", "february", "march",
        "april", "may", "june", "july", "august", "september", "october",
        "november", "december", "week", "month", "year",
    ];
    if (dateKeywords.some((k) => lower.includes(k))) return "DATE";

    // Person (proper noun heuristic — single capitalized word that doesn't match other categories)
    if (phrase.split(" ").length === 1 && phrase[0] === phrase[0].toUpperCase()) return "PERSON";

    // Default to CONCEPT for multi-word capitalized phrases
    if (phrase.split(" ").length > 1) return "CONCEPT";

    return "Entity";
}

// ============================================================
// GRAPH QUALITY RULES
// ============================================================

/**
 * Apply quality rules to a graph: deduplicate nodes (case-insensitive),
 * merge near-duplicates, remove orphan nodes, and remove trivial edges.
 */
export function applyGraphQualityRules(
    nodes: GraphNode[],
    edges: GraphEdge[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
    // 1. Case-insensitive deduplication — merge nodes with same id ignoring case
    const idMap = new Map<string, GraphNode>(); // lowercase id → canonical node
    const remap = new Map<string, string>(); // original id → canonical id

    for (const node of nodes) {
        const key = node.id.toLowerCase().trim();
        if (idMap.has(key)) {
            const existing = idMap.get(key)!;
            // Keep the one with higher weight or longer label
            remap.set(node.id, existing.id);
            if ((node.weight || 1) > (existing.weight || 1)) {
                idMap.set(key, { ...node, weight: (node.weight || 1) + (existing.weight || 1) - 1 });
                remap.set(existing.id, node.id);
                remap.set(node.id, node.id);
            }
        } else {
            idMap.set(key, node);
            remap.set(node.id, node.id);
        }
    }

    const deduped = Array.from(idMap.values());

    // 2. Remap edges to use canonical node ids and deduplicate
    const edgeSet = new Set<string>();
    const cleanEdges: GraphEdge[] = [];
    for (const edge of edges) {
        const from = remap.get(edge.from) || edge.from;
        const to = remap.get(edge.to) || edge.to;
        if (from === to) continue; // Remove self-loops
        const key = `${from}|${to}|${edge.relation}`;
        if (!edgeSet.has(key)) {
            edgeSet.add(key);
            cleanEdges.push({ from, to, relation: edge.relation });
        }
    }

    // 3. Remove orphan nodes (no edges) except Start and Speaker nodes
    const connectedIds = new Set<string>();
    for (const e of cleanEdges) {
        connectedIds.add(e.from);
        connectedIds.add(e.to);
    }
    const finalNodes = deduped.filter(
        (n) => connectedIds.has(n.id) || n.type === "Root" || n.type === "Speaker",
    );

    // 4. Remove edges referencing nodes that no longer exist
    const finalNodeIds = new Set(finalNodes.map((n) => n.id));
    const finalEdges = cleanEdges.filter(
        (e) => finalNodeIds.has(e.from) && finalNodeIds.has(e.to),
    );

    console.log(
        `[GraphQuality] ${nodes.length}→${finalNodes.length} nodes, ${edges.length}→${finalEdges.length} edges`,
    );

    return { nodes: finalNodes, edges: finalEdges };
}

/**
 * Auto-cluster a large graph by grouping nodes connected to a common parent.
 * When node count exceeds threshold, low-weight leaf nodes sharing a parent
 * are collapsed into cluster summary nodes.
 *
 * @param threshold Min node count before clustering kicks in (default: 20)
 */
export function autoClusterGraph(
    nodes: GraphNode[],
    edges: GraphEdge[],
    threshold: number = 20,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
    if (nodes.length <= threshold) return { nodes, edges };

    // Find leaf nodes (only one edge connecting them) and their parent
    const edgeCount = new Map<string, number>();
    const parentOf = new Map<string, string>(); // nodeId → parent nodeId

    for (const e of edges) {
        edgeCount.set(e.from, (edgeCount.get(e.from) || 0) + 1);
        edgeCount.set(e.to, (edgeCount.get(e.to) || 0) + 1);
    }

    // Identify leaves: nodes with ≤1 edge and weight ≤2
    for (const e of edges) {
        const fromCount = edgeCount.get(e.from) || 0;
        const toCount = edgeCount.get(e.to) || 0;
        const fromNode = nodes.find((n) => n.id === e.from);
        const toNode = nodes.find((n) => n.id === e.to);

        // "to" is a leaf hanging off "from"
        if (toCount <= 1 && (toNode?.weight || 1) <= 2 && toNode?.type !== "Root" && toNode?.type !== "Speaker") {
            parentOf.set(e.to, e.from);
        }
        // "from" is a leaf hanging off "to"
        if (fromCount <= 1 && (fromNode?.weight || 1) <= 2 && fromNode?.type !== "Root" && fromNode?.type !== "Speaker") {
            parentOf.set(e.from, e.to);
        }
    }

    // Group leaves by parent
    const clusterGroups = new Map<string, string[]>(); // parent → leaf ids
    for (const [leaf, parent] of parentOf) {
        if (!clusterGroups.has(parent)) clusterGroups.set(parent, []);
        clusterGroups.get(parent)!.push(leaf);
    }

    // Only cluster groups with 3+ leaves
    const leafIdsToRemove = new Set<string>();
    const clusterNodes: GraphNode[] = [];
    const clusterEdges: GraphEdge[] = [];

    for (const [parent, leaves] of clusterGroups) {
        if (leaves.length < 3) continue;

        const parentNode = nodes.find((n) => n.id === parent);
        const clusterId = `cluster_${parent}`;
        const clusterLabel = parentNode?.label || parent;

        leafIdsToRemove.add(clusterId); // prevent conflicts
        for (const l of leaves) leafIdsToRemove.add(l);

        clusterNodes.push({
            id: clusterId,
            type: parentNode?.type || "CONCEPT",
            label: `${clusterLabel}…`,
            weight: 2,
            collapsed: true,
            childCount: leaves.length,
            childIds: [...leaves],
        });
        clusterEdges.push({
            from: parent,
            to: clusterId,
            relation: "cluster",
        });
    }

    if (clusterNodes.length === 0) return { nodes, edges };

    // Build final arrays
    const keptNodes = nodes.filter((n) => !leafIdsToRemove.has(n.id));
    const keptEdges = edges.filter(
        (e) => !leafIdsToRemove.has(e.from) && !leafIdsToRemove.has(e.to),
    );

    console.log(
        `[AutoCluster] Collapsed ${leafIdsToRemove.size} leaves into ${clusterNodes.length} clusters`,
    );

    return {
        nodes: [...keptNodes, ...clusterNodes],
        edges: [...keptEdges, ...clusterEdges],
    };
}

/**
 * Expand a collapsed cluster node back into its children.
 * Returns updated nodes and edges arrays with the cluster replaced by original children.
 *
 * @param clusterId The id of the cluster node to expand
 * @param allOriginalNodes Full original (unclustered) node list
 * @param allOriginalEdges Full original (unclustered) edge list
 * @param currentNodes Currently displayed nodes
 * @param currentEdges Currently displayed edges
 */
export function expandCluster(
    clusterId: string,
    allOriginalNodes: GraphNode[],
    allOriginalEdges: GraphEdge[],
    currentNodes: GraphNode[],
    currentEdges: GraphEdge[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const cluster = currentNodes.find((n) => n.id === clusterId);
    if (!cluster?.childIds) return { nodes: currentNodes, edges: currentEdges };

    // Remove the cluster node
    const nodes = currentNodes.filter((n) => n.id !== clusterId);
    // Remove cluster edges
    const edges = currentEdges.filter((e) => e.from !== clusterId && e.to !== clusterId);

    // Re-add child nodes from originals
    for (const childId of cluster.childIds) {
        const original = allOriginalNodes.find((n) => n.id === childId);
        if (original && !nodes.find((n) => n.id === childId)) {
            nodes.push({ ...original });
        }
    }

    // Re-add edges connecting to children
    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const edge of allOriginalEdges) {
        if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
            const key = `${edge.from}|${edge.to}|${edge.relation}`;
            if (!edges.find((e) => `${e.from}|${e.to}|${e.relation}` === key)) {
                edges.push(edge);
            }
        }
    }

    return { nodes, edges };
}
