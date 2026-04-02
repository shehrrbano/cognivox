/**
 * extractionService.ts
 * Summary and memory extraction via Gemini API.
 * Pure functions that return results.
 */
import { keyManager } from "$lib/keyManager";
import { settingsStore } from "$lib/settingsStore"; // Added
import { get } from "svelte/store"; // Added
import type { Transcript, ExtractedSummary, ExtractedMemoriesData } from "$lib/types";

/**
 * Extract a meeting summary from transcripts using Gemini API.
 */
export async function extractSummary(
    transcripts: Transcript[],
    getApiKey: () => string | null,
): Promise<{ summary: ExtractedSummary | null; error: string | null }> {
    if (transcripts.length === 0) {
        return { summary: null, error: "No transcripts to summarize" };
    }

    const transcriptText = transcripts
        .map((t) => `[${t.timestamp}] ${t.speaker}: ${t.text}`)
        .join("\n");

    const prompt = `Analyze this meeting transcript and return a JSON object with:
- topics: array of main discussion topics (3-5 items)
- decisions: array of decisions made
- actionItems: array of action items with assignees if mentioned
- keyPoints: array of key takeaways (3-5 items)

Transcript:
${transcriptText}

Return ONLY valid JSON, no markdown, no explanation.`;

    try {
        const apiKey = getApiKey();
        if (!apiKey) {
            throw new Error("No API key configured");
        }

        const settings = get(settingsStore);
        const model = settings.geminiModel || "gemini-2.0-flash";

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.3 },
                }),
            },
        );

        if (!response.ok) {
            if (response.status === 429) {
                keyManager.handleError(429, "Rate limit");
            }
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const summary = JSON.parse(jsonMatch[0]) as ExtractedSummary;
            keyManager.reportSuccess();
            return { summary, error: null };
        } else {
            throw new Error("Invalid response format");
        }
    } catch (error: any) {
        return { summary: null, error: `Summary extraction failed: ${error.message}` };
    }
}

/**
 * Extract memorable moments from transcripts using Gemini API.
 */
export async function extractMemories(
    transcripts: Transcript[],
    getApiKey: () => string | null,
): Promise<{ memories: ExtractedMemoriesData | null; error: string | null }> {
    if (transcripts.length === 0) {
        return { memories: null, error: "No transcripts to extract memories from" };
    }

    const transcriptText = transcripts
        .map((t) => `[${t.timestamp}] ${t.speaker}: ${t.text}`)
        .join("\n");

    const prompt = `Analyze this meeting transcript for memorable moments. Return a JSON object with:
- keyMoments: array of significant moments or turning points in the conversation
- personalInsights: array of personal observations or wisdom shared
- quotes: array of notable quotes with attribution (max 3)
- emotionShifts: array describing any emotional changes detected (e.g., "Discussion became tense when...")

Transcript:
${transcriptText}

Return ONLY valid JSON, no markdown, no explanation.`;

    try {
        const apiKey = getApiKey();
        if (!apiKey) {
            throw new Error("No API key configured");
        }

        const settings = get(settingsStore);
        const model = settings.geminiModel || "gemini-2.0-flash";

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.5 },
                }),
            },
        );

        if (!response.ok) {
            if (response.status === 429) {
                keyManager.handleError(429, "Rate limit");
            }
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const memories = JSON.parse(jsonMatch[0]) as ExtractedMemoriesData;
            keyManager.reportSuccess();
            return { memories, error: null };
        } else {
            throw new Error("Invalid response format");
        }
    } catch (error: any) {
        return { memories: null, error: `Memory extraction failed: ${error.message}` };
    }
}
