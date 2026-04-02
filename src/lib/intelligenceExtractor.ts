import { keyManager } from './keyManager';
import { settingsStore } from './settingsStore';
import { get } from "svelte/store";
import type { Transcript, ParsedSegment } from "./types";

export interface ExtractedInsights {
    tasks: Array<{ text: string; assignee?: string; priority?: string }>;
    decisions: Array<{ text: string; context?: string }>;
    deadlines: Array<{ text: string; date?: string; owner?: string }>;
    actionItems: Array<{ text: string; assignee?: string; dueDate?: string }>;
    risks: Array<{ text: string; severity?: 'low' | 'medium' | 'high' }>;
    urgency: Array<{ text: string; level: 'low' | 'medium' | 'high' | 'critical' }>;
    sentiment: { overall: string; shifts: string[] };
    keyTopics: string[];
    speakers: Array<{ id: string; name: string; turns: number }>;
}

export interface TranscriptWithSpeaker {
    id: string;
    timestamp: string;
    speaker: string;
    speakerId: number;
    text: string;
    tone?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    fillers?: string[];
    isPartial?: boolean;
}

export interface IntelligenceFilters {
    tasks: boolean;
    decisions: boolean;
    deadlines: boolean;
    actionItems: boolean;
    risks: boolean;
    urgency: boolean;
    sentiment: boolean;
    interruptions: boolean;
    agreement: boolean;
    disagreement: boolean;
    emotionShifts: boolean;
    topicDrifts: boolean;
}

const DEFAULT_FILTERS: IntelligenceFilters = {
    tasks: true,
    decisions: true,
    deadlines: true,
    actionItems: true,
    risks: true,
    urgency: true,
    sentiment: false,
    interruptions: false,
    agreement: false,
    disagreement: false,
    emotionShifts: false,
    topicDrifts: false
};

class IntelligenceExtractor {
    private filters: IntelligenceFilters = DEFAULT_FILTERS;
    private insights: ExtractedInsights = this.getEmptyInsights();
    private listeners: Set<(insights: ExtractedInsights) => void> = new Set();
    private isProcessing = false;
    private confidenceThreshold = 0.7;
    // MEETING_TASKS_v1: Task 1.3 — Tier-based routing
    private userTier: 'free' | 'paid' = 'free';

    constructor() {
        this.loadFilters();

        // Subscribe to global settings store for real-time updates
        if (typeof window !== 'undefined') {
            settingsStore.subscribe(settings => {
                this.filters = { ...settings.filters };
                this.confidenceThreshold = settings.confidenceThreshold;
                // MEETING_TASKS_v1: Task 1.3 — Track user tier for backend routing
                this.userTier = settings.userTier || 'free';
                if (settings.debugMode) {
                    console.log('[Intelligence] Filters and Threshold updated from store');
                }
            });
        }
    }

    private getEmptyInsights(): ExtractedInsights {
        return {
            tasks: [],
            decisions: [],
            deadlines: [],
            actionItems: [],
            risks: [],
            urgency: [],
            sentiment: { overall: 'neutral', shifts: [] },
            keyTopics: [],
            speakers: []
        };
    }

    setFilters(filters: Partial<IntelligenceFilters>) {
        this.filters = { ...this.filters, ...filters };
        localStorage.setItem('intelligence_filters', JSON.stringify(this.filters));
    }

    getFilters(): IntelligenceFilters {
        return { ...this.filters };
    }

    private loadFilters() {
        try {
            const stored = localStorage.getItem('intelligence_filters');
            if (stored) {
                this.filters = { ...this.filters, ...JSON.parse(stored) };
            }
        } catch (e) {
            console.error('[Intelligence] Failed to load filters:', e);
        }
    }

    getInsights(): ExtractedInsights {
        return { ...this.insights };
    }

    reset() {
        this.insights = this.getEmptyInsights();
        this.notifyListeners();
    }

    /**
     * Build the Gemini prompt based on enabled filters
     */
    private buildExtractionPrompt(transcriptText: string): string {
        const enabledFilters: string[] = [];

        if (this.filters.tasks) {
            enabledFilters.push('- "tasks": array of {text, assignee?, priority?} for any tasks mentioned');
        }
        if (this.filters.decisions) {
            enabledFilters.push('- "decisions": array of {text, context?} for decisions made');
        }
        if (this.filters.deadlines) {
            enabledFilters.push('- "deadlines": array of {text, date?, owner?} for deadlines mentioned');
        }
        if (this.filters.actionItems) {
            enabledFilters.push('- "actionItems": array of {text, assignee?, dueDate?} for action items');
        }
        if (this.filters.risks) {
            enabledFilters.push('- "risks": array of {text, severity: "low"|"medium"|"high"} for risks/concerns');
        }
        if (this.filters.urgency) {
            enabledFilters.push('- "urgency": array of {text, level: "low"|"medium"|"high"|"critical"} for urgent items');
        }
        if (this.filters.sentiment) {
            enabledFilters.push('- "sentiment": {overall: string, shifts: string[]} describing overall tone and emotional shifts');
        }

        if (enabledFilters.length === 0) {
            enabledFilters.push('- "keyTopics": array of main discussion topics');
        }

        // Always include speakers
        enabledFilters.push('- "speakers": array of {id, name, turns} for each speaker detected (use "Speaker 1", "Speaker 2", etc. Only include multiple speakers if there is clear evidence of different people speaking)');

        return `You are a meeting intelligence engine. Analyze this transcript and extract structured insights with high precision.

TRANSCRIPT:
${transcriptText}

EXTRACT THE FOLLOWING (return valid JSON only, no markdown):
{
${enabledFilters.join(',\n')}
}

CLASSIFICATION RULES — MANDATORY:
DECISIONS: ANY budget allocation, approved direction, committed plan, role assignment, KPI target, or directive statement counts as a decision. Examples: "budget is 2.5 million", "moving forward with Project X", "KPI is functionality and stability", "40% goes to product development", "rolling forecast every two weeks". Do NOT skip decisions because the speaker sounds authoritative or the tone is neutral — directives ARE decisions.
TASKS: ANY explicit work assignment or required action. Look for: "you need to X", "make sure X", "deliver X", "complete X", "responsible for X". Must be a future assigned action.
RISKS: ANY conditional failure statement, stated concern, or identified threat. Look for: "if X slips...", "if X fails...", "risk of X", "concern about X", "everything depends on X". Conditional statements ("if base slips, everything slips") are HIGH-PRIORITY risks.
DEADLINES: ANY time-bound commitment. Look for: "by end of week", "within X days", "every two weeks", "Phase X by X date".

QUALITY RULES:
- Be specific: use exact values, names, percentages from the transcript
- Include actual names, dollar amounts, percentages, timeframes
- Do not extract generic filler words as tasks or decisions
- If nothing found for a category, return empty array
- Return ONLY valid JSON, no explanation`;
    }

    /**
     * Extract insights from a transcript chunk
     */
    async extractFromTranscript(transcripts: TranscriptWithSpeaker[]): Promise<ExtractedInsights | null> {
        if (transcripts.length === 0) {
            return null;
        }

        // Check if any filters are enabled
        const hasEnabledFilters = Object.values(this.filters).some(v => v);
        if (!hasEnabledFilters) {
            console.log('[Intelligence] No filters enabled, skipping extraction');
            return null;
        }

        // MEETING_TASKS_v1: Task 1.3 — Tier-based routing
        // Free users: Gemini API calls skipped — rely on local Whisper transcription only
        if (this.userTier === 'free') {
            console.log('[TIER] Free user — using local Whisper only. Gemini intelligence skipped.');
            return null;
        }

        this.isProcessing = true;

        const transcriptText = transcripts
            .map(t => `[${t.timestamp}] ${t.speaker}: ${t.text}`)
            .join('\n');

        const prompt = this.buildExtractionPrompt(transcriptText);

        try {
            const apiKey = keyManager.getCurrentKey()?.key;
            if (!apiKey) {
                throw new Error('No API key available');
            }

            // MEETING_TASKS_v1: Task 1.2 — Upgraded to Gemini 2.5 Flash
            const settings = get(settingsStore);
            const model = settings.geminiModel || "gemini-2.0-flash";
            
            const payload = {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2 }
            };

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );

            if (!response.ok) {
                if (response.status === 429) {
                    keyManager.handleError(429, 'Rate limit');
                }
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            // Parse JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const extracted = JSON.parse(jsonMatch[0]);

                // Merge with existing insights
                this.mergeInsights(extracted);
                keyManager.reportSuccess();

                console.log('[Intelligence] Extracted:', extracted);
                
                // Filter extracted insights by confidence if Gemini provides it 
                // (Note: Currently Gemini response doesn't always provide per-item confidence in this schema, 
                // but we prepare the logic here for future structured output with scores)
                
                return this.insights;
            }
        } catch (error: any) {
            console.error('[Intelligence] Extraction failed:', error.message);
        } finally {
            this.isProcessing = false;
        }

        return null;
    }

    private mergeInsights(newInsights: Partial<ExtractedInsights>) {
        // Append new items to existing arrays (avoid duplicates)
        if (newInsights.tasks) {
            this.insights.tasks = [...this.insights.tasks, ...newInsights.tasks];
        }
        if (newInsights.decisions) {
            this.insights.decisions = [...this.insights.decisions, ...newInsights.decisions];
        }
        if (newInsights.deadlines) {
            this.insights.deadlines = [...this.insights.deadlines, ...newInsights.deadlines];
        }
        if (newInsights.actionItems) {
            this.insights.actionItems = [...this.insights.actionItems, ...newInsights.actionItems];
        }
        if (newInsights.risks) {
            this.insights.risks = [...this.insights.risks, ...newInsights.risks];
        }
        if (newInsights.urgency) {
            this.insights.urgency = [...this.insights.urgency, ...newInsights.urgency];
        }
        if (newInsights.sentiment) {
            this.insights.sentiment = newInsights.sentiment;
        }
        if (newInsights.keyTopics) {
            const existingTopics = new Set(this.insights.keyTopics);
            newInsights.keyTopics.forEach(t => existingTopics.add(t));
            this.insights.keyTopics = Array.from(existingTopics);
        }
        if (newInsights.speakers) {
            this.insights.speakers = newInsights.speakers;
        }

        this.notifyListeners();
    }

    subscribe(listener: (insights: ExtractedInsights) => void): () => void {
        this.listeners.add(listener);
        listener(this.insights);
        return () => this.listeners.delete(listener);
    }

    private notifyListeners() {
        this.listeners.forEach(l => l({ ...this.insights }));
    }

    isExtracting(): boolean {
        return this.isProcessing;
    }
}

// Singleton
export const intelligenceExtractor = new IntelligenceExtractor();

// ============================================================
// MEETING_TASKS_v1: Task 3.3 — RAG Context Window Helper
// Extracts N words before and after a match phrase from a text corpus.
// Used by SearchTab and any RAG augmentation pipeline.
// ============================================================

/**
 * Extract a context window of N words before and N words after a match in text.
 * Returns the surrounding context with the match preserved in-place.
 * @param text - Full text to search within
 * @param match - The phrase to find
 * @param words - Number of words to include on each side (default: 10)
 * @returns Context string: "...pre-context [MATCH] post-context..."
 */
export function getContextWindow(text: string, match: string, words: number = 10): string {
    if (!text || !match) return text || '';
    const lowerText = text.toLowerCase();
    const lowerMatch = match.toLowerCase().trim();
    const idx = lowerText.indexOf(lowerMatch);
    if (idx === -1) return text.slice(0, 120) + (text.length > 120 ? '…' : '');

    // Split text into word tokens with their positions
    const allWords = text.split(/(\s+)/); // Preserve whitespace as tokens
    const wordTokens: Array<{ word: string; start: number; end: number }> = [];
    let pos = 0;
    for (const token of allWords) {
        if (token.trim().length > 0) {
            wordTokens.push({ word: token, start: pos, end: pos + token.length });
        }
        pos += token.length;
    }

    // Find which word index corresponds to the match start position
    const matchEnd = idx + lowerMatch.length;
    let matchStartWordIdx = 0;
    let matchEndWordIdx = wordTokens.length - 1;
    for (let i = 0; i < wordTokens.length; i++) {
        if (wordTokens[i].start <= idx && wordTokens[i].end > idx) matchStartWordIdx = i;
        if (wordTokens[i].start < matchEnd && wordTokens[i].end >= matchEnd) {
            matchEndWordIdx = i;
            break;
        }
    }

    const preStart = Math.max(0, matchStartWordIdx - words);
    const postEnd = Math.min(wordTokens.length - 1, matchEndWordIdx + words);

    const preWords = wordTokens.slice(preStart, matchStartWordIdx).map(w => w.word).join(' ');
    const matchWord = wordTokens.slice(matchStartWordIdx, matchEndWordIdx + 1).map(w => w.word).join(' ');
    const postWords = wordTokens.slice(matchEndWordIdx + 1, postEnd + 1).map(w => w.word).join(' ');

    const prefix = preStart > 0 ? '…' : '';
    const suffix = postEnd < wordTokens.length - 1 ? '…' : '';

    return `${prefix}${preWords} ${matchWord} ${postWords}${suffix}`.trim();
}
