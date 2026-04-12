/**
 * ragflowService.ts
 * RAGFlow Native GPU Backend — REST API Client
 *
 * Connects Cognivox to a native RAGFlow instance running on bare metal
 * with full GPU acceleration (DeepDoc, embeddings, reranker, vLLM/Ollama).
 *
 * RAGFlow API docs: The service talks to the FastAPI backend at the
 * configured ragflowUrl (default http://localhost:9380).
 *
 * Architecture (Hybrid RAG):
 *   Audio → Whisper → Transcript → ragflowService.ingestTranscript() → RAGFlow Dataset
 *   User Question → RAGFlow Retrieval (chunks) → Gemini LLM → Grounded Answer
 *
 * RAGFlow handles: ingestion, chunking, embedding, vector search
 * Gemini handles: answer generation from retrieved context
 */

import { get } from 'svelte/store';
import { settingsStore } from '$lib/settingsStore';
import { keyManager } from '$lib/keyManager';

// ============================================================================
// TYPES
// ============================================================================

export interface RAGFlowConfig {
    baseUrl: string;
    apiKey: string;
    knowledgeBaseId: string;
}

export interface RAGFlowStatus {
    connected: boolean;
    version?: string;
    error?: string;
}

export interface RAGFlowDataset {
    id: string;
    name: string;
    description?: string;
    doc_count?: number;
    chunk_count?: number;
    create_time?: string;
}

export interface RAGFlowDocument {
    id: string;
    name: string;
    size?: number;
    chunk_count?: number;
    status?: string;
    create_time?: string;
}

export interface RAGFlowChunk {
    id: string;
    content: string;
    document_id?: string;
    document_name?: string;
    similarity?: number;
    highlight?: string;
}

export interface RAGFlowConversation {
    id: string;
    name?: string;
    messages?: RAGFlowMessage[];
}

export interface RAGFlowMessage {
    role: 'user' | 'assistant';
    content: string;
    chunks?: RAGFlowChunk[];
    timestamp?: string;
}

export interface RAGFlowAnswer {
    answer: string;
    chunks: RAGFlowChunk[];
    conversationId: string;
    /** Entity names extracted from the answer for KG auto-zoom */
    relatedEntities: string[];
}

// ============================================================================
// CONFIG HELPERS
// ============================================================================

function getConfig(): RAGFlowConfig {
    const settings = get(settingsStore);
    return {
        baseUrl: (settings.ragflowUrl || 'http://localhost:9380').replace(/\/+$/, ''),
        apiKey: settings.ragflowApiKey || '',
        knowledgeBaseId: settings.knowledgeBaseId || '',
    };
}

function getHeaders(apiKey: string): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }
    return headers;
}

// ============================================================================
// RAGFlow API CLIENT
// ============================================================================

/**
 * Check if RAGFlow is configured and reachable
 */
export async function checkRAGFlowStatus(): Promise<RAGFlowStatus> {
    const config = getConfig();
    if (!config.baseUrl) {
        return { connected: false, error: 'RAGFlow URL not configured' };
    }

    const url = `${config.baseUrl}/api/v1/datasets?page=1&page_size=1`;
    console.log(`[RAGFlow] Checking status at: ${url}`);
    try {
        const resp = await fetch(url, {
            method: 'GET',
            headers: getHeaders(config.apiKey),
            signal: AbortSignal.timeout(5000),
        });
        console.log(`[RAGFlow] Status response: ${resp.status}`);
        if (resp.ok) {
            return { connected: true, version: 'native-gpu' };
        }
        const text = await resp.text();
        console.warn(`[RAGFlow] Status check failed: ${resp.status}`, text);
        return { connected: false, error: `HTTP ${resp.status}: ${text.slice(0, 200)}` };
    } catch (e: any) {
        console.error('[RAGFlow] Status check exception:', e);
        return { connected: false, error: e?.message || 'Connection failed' };
    }
}

/**
 * Check if RAGFlow is configured (has URL and API key set)
 */
export function isRAGFlowConfigured(): boolean {
    const config = getConfig();
    return !!(config.baseUrl && config.apiKey);
}

// ============================================================================
// DATASET MANAGEMENT
// ============================================================================

/**
 * List all datasets (knowledge bases) on the RAGFlow instance
 */
export async function listDatasets(): Promise<RAGFlowDataset[]> {
    const config = getConfig();
    try {
        const resp = await fetch(`${config.baseUrl}/api/v1/datasets?page=1&page_size=100`, {
            headers: getHeaders(config.apiKey),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        return (data.data || []) as RAGFlowDataset[];
    } catch (e: any) {
        console.error('[RAGFlow] Failed to list datasets:', e);
        return [];
    }
}

/**
 * Create a new dataset (knowledge base)
 */
export async function createDataset(name: string, description?: string): Promise<RAGFlowDataset | null> {
    const config = getConfig();
    try {
        const resp = await fetch(`${config.baseUrl}/api/v1/datasets`, {
            method: 'POST',
            headers: getHeaders(config.apiKey),
            body: JSON.stringify({
                name,
                description: description || `Cognivox auto-created dataset: ${name}`,
                chunk_method: 'naive',
            }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
        const data = await resp.json();
        console.log(`[RAGFlow] Created dataset: ${name} → ${data.data?.id}`);
        return data.data as RAGFlowDataset;
    } catch (e: any) {
        console.error('[RAGFlow] Failed to create dataset:', e);
        return null;
    }
}

/**
 * Delete a dataset (knowledge base) by ID
 */
export async function deleteDataset(datasetId: string): Promise<boolean> {
    const config = getConfig();
    try {
        const resp = await fetch(`${config.baseUrl}/api/v1/datasets`, {
            method: 'DELETE',
            headers: getHeaders(config.apiKey),
            body: JSON.stringify({ ids: [datasetId] }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
        console.log(`[RAGFlow] Deleted dataset: ${datasetId}`);
        return true;
    } catch (e: any) {
        console.error('[RAGFlow] Failed to delete dataset:', e);
        return false;
    }
}

// ============================================================================
// DOCUMENT MANAGEMENT
// ============================================================================

/**
 * List documents in a dataset
 */
export async function listDocuments(datasetId: string): Promise<RAGFlowDocument[]> {
    const config = getConfig();
    try {
        const resp = await fetch(`${config.baseUrl}/api/v1/datasets/${datasetId}/documents?page=1&page_size=100`, {
            headers: getHeaders(config.apiKey),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        return (data.data || []) as RAGFlowDocument[];
    } catch (e: any) {
        console.error('[RAGFlow] Failed to list documents:', e);
        return [];
    }
}

/**
 * Delete documents from a dataset by IDs
 */
export async function deleteDocuments(datasetId: string, documentIds: string[]): Promise<boolean> {
    const config = getConfig();
    try {
        const resp = await fetch(`${config.baseUrl}/api/v1/datasets/${datasetId}/documents`, {
            method: 'DELETE',
            headers: getHeaders(config.apiKey),
            body: JSON.stringify({ ids: documentIds }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
        console.log(`[RAGFlow] Deleted ${documentIds.length} documents from dataset ${datasetId}`);
        return true;
    } catch (e: any) {
        console.error('[RAGFlow] Failed to delete documents:', e);
        return false;
    }
}

/**
 * Upload a text document to a RAGFlow dataset.
 * Used to ingest transcripts into the knowledge base.
 */
export async function uploadDocument(
    datasetId: string,
    fileName: string,
    content: string | File | Blob,
): Promise<RAGFlowDocument | null> {
    const config = getConfig();
    try {
        // RAGFlow expects multipart/form-data for file upload
        const formData = new FormData();
        if (content instanceof File || content instanceof Blob) {
            formData.append('file', content, fileName);
        } else {
            const blob = new Blob([content], { type: 'text/plain' });
            formData.append('file', blob, fileName);
        }

        const headers: Record<string, string> = {};
        if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }

        const resp = await fetch(`${config.baseUrl}/api/v1/datasets/${datasetId}/documents`, {
            method: 'POST',
            headers,
            body: formData,
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
        const data = await resp.json();
        console.log(`[RAGFlow] Uploaded document: ${fileName}`);
        return (data.data?.[0] || data.data) as RAGFlowDocument;
    } catch (e: any) {
        console.error('[RAGFlow] Document upload failed:', e);
        return null;
    }
}

/**
 * Trigger parsing (chunking + embedding) for uploaded documents.
 * RAGFlow uses GPU-accelerated DeepDoc for this.
 */
export async function parseDocuments(datasetId: string, documentIds: string[]): Promise<boolean> {
    const config = getConfig();
    try {
        const resp = await fetch(`${config.baseUrl}/api/v1/datasets/${datasetId}/chunks`, {
            method: 'POST',
            headers: getHeaders(config.apiKey),
            body: JSON.stringify({ document_ids: documentIds }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
        console.log(`[RAGFlow] Parsing triggered for ${documentIds.length} documents (GPU)`);
        return true;
    } catch (e: any) {
        console.error('[RAGFlow] Parse trigger failed:', e);
        return false;
    }
}

/**
 * Ingest a transcript into RAGFlow as a document.
 * This is the main bridge from Whisper → RAGFlow.
 *
 * Flow: Transcript text → Create .txt document → Upload to dataset → GPU parsing
 */
export async function ingestTranscript(
    sessionTitle: string,
    transcriptText: string,
    speakerLabels?: string[],
): Promise<boolean> {
    const config = getConfig();
    if (!config.knowledgeBaseId) {
        console.log('[RAGFlow] No knowledge base ID configured — skipping ingestion');
        return false;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `cognivox_${sessionTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.txt`;

    // Build rich document with speaker labels
    let documentContent = `# Session: ${sessionTitle}\n`;
    documentContent += `# Date: ${new Date().toLocaleString()}\n`;
    if (speakerLabels?.length) {
        documentContent += `# Speakers: ${speakerLabels.join(', ')}\n`;
    }
    documentContent += `\n${transcriptText}`;

    const doc = await uploadDocument(config.knowledgeBaseId, fileName, documentContent);
    if (!doc?.id) return false;

    // Trigger GPU-accelerated parsing
    await parseDocuments(config.knowledgeBaseId, [doc.id]);
    console.log(`[RAGFlow] Transcript ingested: ${fileName} → dataset ${config.knowledgeBaseId}`);
    return true;
}

/**
 * Ingest an array of Transcript objects into RAGFlow.
 * Formats them with speaker labels and timestamps.
 */
export async function ingestTranscriptArray(
    sessionTitle: string,
    transcripts: Array<{ speaker: string; text: string; timestamp: string; tone?: string; category?: string[] }>,
): Promise<boolean> {
    if (!transcripts.length) return false;

    const formattedText = transcripts
        .map(t => `[${t.timestamp}] ${t.speaker}: ${t.text}`)
        .join('\n');

    const speakers = [...new Set(transcripts.map(t => t.speaker))];
    return ingestTranscript(sessionTitle, formattedText, speakers);
}

// ============================================================================
// CONVERSATION / CHAT (Hybrid RAG: RAGFlow retrieval + Gemini generation)
// ============================================================================

/**
 * Create a new conversation. In hybrid mode this is a lightweight local ID
 * since we don't need RAGFlow's chat assistant (which requires an LLM
 * configured in RAGFlow). We only use RAGFlow for retrieval.
 */
export async function createConversation(name?: string): Promise<string | null> {
    const config = getConfig();
    if (!config.knowledgeBaseId) {
        console.warn('[RAGFlow] No knowledge base ID — cannot create conversation');
        return null;
    }

    // Generate a local conversation ID — no need for RAGFlow chat assistant
    const localId = `local::${Date.now()}::${Math.random().toString(36).slice(2, 8)}`;
    console.log(`[RAGFlow] Created hybrid conversation: ${localId}`);
    return localId;
}

/** System prompt for the Gemini-powered Study Buddy. */
const STUDY_BUDDY_SYSTEM_PROMPT = `You are Study Buddy, an AI assistant that helps students understand their lecture content. You answer questions using ONLY the provided source excerpts from the student's lecture transcripts and uploaded documents.

Rules:
- Base your answer strictly on the provided sources. If the sources don't contain relevant information, say so honestly.
- Be concise and accurate. Use bullet points for clarity when listing multiple points.
- When referencing information, mention which source it comes from (e.g. "According to Source #1...").
- If asked about topics not covered in the sources, say "I don't have information about that in your current knowledge base."`;

/**
 * Send a question and get a grounded answer using hybrid RAG:
 *   1. RAGFlow retrieval: find relevant chunks via vector search
 *   2. Gemini generation: synthesize an answer from the chunks
 *
 * This avoids needing an LLM configured in RAGFlow itself.
 */
export async function askQuestion(
    conversationId: string,
    question: string,
    datasetId?: string,
): Promise<RAGFlowAnswer> {

    const emptyAnswer: RAGFlowAnswer = {
        answer: '',
        chunks: [],
        conversationId,
        relatedEntities: [],
    };

    const config = getConfig();
    const activeDsId = datasetId || config.knowledgeBaseId;
    
    if (!activeDsId) {
        emptyAnswer.answer = 'No knowledge base configured. Please check your RAGFlow settings.';
        return emptyAnswer;
    }


    try {
        // Step 1: Retrieve relevant chunks from RAGFlow
        const chunks = await searchChunks(question, 8, activeDsId);


        if (chunks.length === 0) {
            emptyAnswer.answer = 'No relevant content found in your knowledge base. Try uploading some lecture recordings or documents first, then ask again.';
            return emptyAnswer;
        }

        // Step 2: Build context from retrieved chunks
        const contextParts = chunks.map((chunk, i) =>
            `[Source #${i + 1}${chunk.document_name ? ` — ${chunk.document_name}` : ''}]\n${chunk.content}`
        );
        const context = contextParts.join('\n\n');

        // Step 3: Generate answer using Gemini
        const answer = await generateAnswerWithGemini(question, context);

        if (!answer) {
            // Fallback: return raw chunks if Gemini is unavailable
            emptyAnswer.answer = 'Could not generate an answer (Gemini API key may not be configured). Here are the relevant excerpts:\n\n' +
                chunks.slice(0, 3).map((c, i) => `**Source ${i + 1}:** ${c.content.slice(0, 300)}...`).join('\n\n');
            emptyAnswer.chunks = chunks;
            return emptyAnswer;
        }

        const relatedEntities = extractEntitiesFromAnswer(answer);

        console.log(`[RAGFlow] Hybrid answer: ${answer.slice(0, 100)}... (${chunks.length} sources, ${relatedEntities.length} entities)`);

        return {
            answer,
            chunks,
            conversationId,
            relatedEntities,
        };
    } catch (e: any) {
        console.error('[RAGFlow] Hybrid ask failed:', e);
        emptyAnswer.answer = `Error: ${e?.message || 'Failed to get answer'}`;
        return emptyAnswer;
    }
}

/**
 * Generate an answer using Gemini given retrieved context chunks.
 * Returns null if Gemini is unavailable.
 */
async function generateAnswerWithGemini(
    question: string,
    context: string,
): Promise<string | null> {
    const currentKey = keyManager.getCurrentKey();
    if (!currentKey) {
        // Also try localStorage fallback
        const storedKey = typeof localStorage !== 'undefined'
            ? localStorage.getItem('gemini_api_key')
            : null;
        if (!storedKey) {
            console.warn('[RAGFlow] No Gemini API key available for answer generation');
            return null;
        }
        return callGeminiApi(storedKey, question, context);
    }

    return callGeminiApi(currentKey.key, question, context);
}

async function callGeminiApi(
    apiKey: string,
    question: string,
    context: string,
): Promise<string | null> {
    const settings = get(settingsStore);
    const model = settings.geminiModel || 'gemini-2.0-flash';

    const prompt = `${STUDY_BUDDY_SYSTEM_PROMPT}

--- SOURCES FROM KNOWLEDGE BASE ---
${context}
--- END SOURCES ---

Student's question: ${question}

Answer the question based on the sources above.`;

    try {
        const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 2048,
                    },
                }),
            },
        );

        if (!resp.ok) {
            if (resp.status === 429) {
                keyManager.handleError(429, 'Rate limit');
            }
            const errText = await resp.text().catch(() => 'Unknown');
            console.error(`[RAGFlow] Gemini error ${resp.status}:`, errText);
            return null;
        }

        const data = await resp.json();
        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (answer) {
            keyManager.reportSuccess();
        }

        return answer || null;
    } catch (e: any) {
        console.error('[RAGFlow] Gemini call failed:', e);
        return null;
    }
}

/**
 * Extract entity/concept names from a RAGFlow answer for KG auto-zoom.
 * Looks for capitalized multi-word phrases and known entity patterns.
 */
function extractEntitiesFromAnswer(answer: string): string[] {
    if (!answer) return [];

    const entities: Set<string> = new Set();

    // Extract quoted terms
    const quotedMatches = answer.match(/"([^"]+)"/g);
    if (quotedMatches) {
        quotedMatches.forEach(m => entities.add(m.replace(/"/g, '').toLowerCase()));
    }

    // Extract capitalized multi-word phrases (likely entity names)
    const capitalizedMatches = answer.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g);
    if (capitalizedMatches) {
        capitalizedMatches.forEach(m => entities.add(m.toLowerCase()));
    }

    // Extract bold markdown terms (** **)
    const boldMatches = answer.match(/\*\*([^*]+)\*\*/g);
    if (boldMatches) {
        boldMatches.forEach(m => entities.add(m.replace(/\*\*/g, '').toLowerCase()));
    }

    return Array.from(entities).filter(e => e.length > 2 && e.length < 50);
}

// ============================================================================
// RETRIEVAL (Direct chunk search without LLM)
// ============================================================================

/**
 * Search chunks directly in a dataset (no LLM, just vector search).
 * Useful for finding relevant transcript segments.
 */
export async function searchChunks(
    query: string,
    topK: number = 5,
    datasetId?: string,
): Promise<RAGFlowChunk[]> {

    const config = getConfig();
    const activeDsId = datasetId || config.knowledgeBaseId;
    if (!activeDsId) return [];


    const url = `${config.baseUrl}/api/v1/retrieval`;
    console.log(`[RAGFlow] Searching chunks at: ${url}`, { query, kb_ids: [activeDsId] });
    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: getHeaders(config.apiKey),
            body: JSON.stringify({
                question: query,
                dataset_ids: [activeDsId],
                kb_ids: [activeDsId], // Alias for compatibility
                top_k: topK,
            }),

        });
        console.log(`[RAGFlow] Search response: ${resp.status}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const chunks = Array.isArray(data.data) ? data.data : (data.data?.chunks || []);
        return chunks.map((c: any) => ({
            id: c.id || '',
            content: c.content || '',
            document_id: c.document_id || '',
            document_name: c.document_name || '',
            similarity: c.similarity || 0,
            highlight: c.highlight || '',
        }));
/**
 * Build a full Knowledge Graph for a course by extracting concepts from its materials.
 */
export async function buildGraphFromCourse(datasetId: string): Promise<{ nodes: any[], edges: any[] }> {
    console.log(`[RAGFlow] Building knowledge graph for dataset: ${datasetId}`);
    
    // 1. Get top informative chunks from the dataset
    // We search for general knowledge keywords or just use a dummy high-topK search
    const chunks = await searchChunks("Explain the core concepts and definitions of this course", 20, datasetId);
    
    if (chunks.length === 0) {
        return { nodes: [], edges: [] };
    }

    // 2. Synthesize concepts using Gemini
    const context = chunks.map((c, i) => `[Source ${i+1}]: ${c.content}`).join('\n\n');
    const prompt = `
        You are a knowledge engineering expert. Below are excerpts from a course's materials.
        Extract the fundamental concepts and the relationships between them.
        
        Return the result ONLY as a JSON object:
        {
          "nodes": [ { "id": "ConceptID", "label": "Human Readable Label", "type": "topic", "description": "Brief definition" } ],
          "edges": [ { "source": "NodeA", "target": "NodeB", "label": "Relationship" } ]
        }
        
        Focus on creating a clean, hierarchical structure. Limit to 15-20 nodes.
        
        SOURCE EXCERPTS:
        ${context}
    `;

    const apiKey = keyManager.getCurrentKey()?.key;
    if (!apiKey) throw new Error('Gemini API key missing');

    const settings = get(settingsStore);
    const model = settings.geminiModel || 'gemini-2.0-flash';

    try {
        const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { response_mime_type: "application/json" }
                }),
            }
        );

        if (!resp.ok) throw new Error(`Gemini status ${resp.status}`);
        const data = await resp.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const parsed = JSON.parse(jsonText);
        
        return {
            nodes: parsed.nodes || [],
            edges: parsed.edges || []
        };
    } catch (e) {
        console.error('[RAGFlow] Graph build failed:', e);
        return { nodes: [], edges: [] };
    }
}
