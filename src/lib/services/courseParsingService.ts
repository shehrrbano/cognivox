import { get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import { settingsStore } from '$lib/settingsStore';
import { keyManager } from '$lib/keyManager';
import { uploadDocument, parseDocuments } from './ragflowService';
import { courseStore } from '$lib/courseStore';
import type { CourseResource } from '$lib/types';

/**
 * Service to handle multi-modal parsing of course content.
 * Orchestrates Whisper for audio, Gemini Vision for images, and RAGFlow for files.
 */

/**
 * Parse a file (PDF, TXT, etc.)
 */
export async function parseFile(courseId: string, datasetId: string, file: File): Promise<CourseResource> {
    const resource: CourseResource = {
        id: crypto.randomUUID(),
        name: file.name,
        type: 'file',
        status: 'parsing',
        uploadDate: new Date().toISOString(),
        size: file.size
    };

    courseStore.addResource(courseId, resource);

    try {
        const doc = await uploadDocument(datasetId, file.name, file);
        if (doc?.id) {
            await parseDocuments(datasetId, [doc.id]);
            courseStore.updateResource(courseId, resource.id, r => ({ ...r, status: 'indexed', ragflowDocId: doc.id }));
        } else {
            throw new Error('Upload failed');
        }
    } catch (e) {
        console.error('[CourseParsing] File parsing failed:', e);
        courseStore.updateResource(courseId, resource.id, r => ({ ...r, status: 'error' }));
    }

    return resource;
}

/**
 * Parse an audio file using Whisper transcription.
 * Decodes the audio in the browser for maximum compatibility with Tauri backend.
 */
export async function parseAudio(courseId: string, datasetId: string, file: File): Promise<CourseResource> {
    const resource: CourseResource = {
        id: crypto.randomUUID(),
        name: file.name,
        type: 'audio',
        status: 'parsing',
        uploadDate: new Date().toISOString(),
        size: file.size
    };

    courseStore.addResource(courseId, resource);

    try {
        // 1. Decode audio in browser using AudioContext
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        
        // Convert to mono f32 samples
        const samples = audioBuffer.getChannelData(0);
        
        // 2. Transcribe using Tauri Whisper command
        // We might need to split this if it's too large, but for now we'll try the direct chunk command
        // Note: transcribe_audio_chunk expects Vec<f32>
        const transcript = await invoke<string>('transcribe_audio_chunk', {
            audioData: Array.from(samples)
        });
        
        // 3. Upload transcript to RAGFlow
        const docName = `${file.name}.transcript.txt`;
        const doc = await uploadDocument(datasetId, docName, transcript);
        
        if (doc?.id) {
            await parseDocuments(datasetId, [doc.id]);
            courseStore.updateResource(courseId, resource.id, r => ({ ...r, status: 'indexed', ragflowDocId: doc.id }));
        } else {
            throw new Error('Upload failed');
        }
        await audioCtx.close();
    } catch (e) {
        console.error('[CourseParsing] Audio parsing failed:', e);
        courseStore.updateResource(courseId, resource.id, r => ({ ...r, status: 'error' }));
    }

    return resource;
}

/**
 * Parse a picture using Gemini Vision with Knowledge Graph extraction.
 */
export async function parsePicture(courseId: string, datasetId: string, file: File): Promise<CourseResource> {
    const resource: CourseResource = {
        id: crypto.randomUUID(),
        name: file.name,
        type: 'picture',
        status: 'parsing',
        uploadDate: new Date().toISOString(),
        size: file.size
    };

    courseStore.addResource(courseId, resource);

    try {
        // 1. Convert image to base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(file);
        });
        const base64Data = await base64Promise;

        // 2. Analyze with Gemini Vision (KG-aligned Extraction)
        const apiKey = keyManager.getCurrentKey()?.key;
        if (!apiKey) throw new Error('API Key missing');

        const settings = get(settingsStore);
        const model = settings.geminiModel || 'gemini-2.0-flash';

        const prompt = `
            Analyze this educational image in detail. Extract any text, diagrams, and key concepts.
            Crucially, provide a Knowledge Graph representation in JSON format containing:
            1. 'nodes': Array of { id, label, type, description }
            2. 'edges': Array of { source, target, label }
            3. 'summary': A detailed textual explanation of the visual content.
            
            Return ONLY the raw analysis text followed by the JSON structure.
        `;

        const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inline_data: { mime_type: file.type, data: base64Data } }
                        ]
                    }]
                }),
            }
        );

        if (!resp.ok) throw new Error(`Gemini error: ${resp.status}`);
        const data = await resp.json();
        const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // 3. Extract JSON from the response text
        let extractedGraph = undefined;
        let summary = analysisText;
        try {
            const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                extractedGraph = {
                    nodes: parsed.nodes || [],
                    edges: parsed.edges || []
                };
                summary = parsed.summary || analysisText.replace(jsonMatch[0], '').trim();
            }
        } catch (e) {
            console.warn('[CourseParsing] Failed to parse KG JSON from Vision response', e);
        }

        // 4. Upload analysis to RAGFlow
        const docName = `${file.name}.analysis.txt`;
        const doc = await uploadDocument(datasetId, docName, analysisText);
        
        if (doc?.id) {
            await parseDocuments(datasetId, [doc.id]);
            courseStore.updateResource(courseId, resource.id, r => ({ 
                ...r, 
                status: 'indexed', 
                ragflowDocId: doc.id,
                description: summary.slice(0, 200) + '...',
                extractedGraph
            }));
        } else {
            throw new Error('Upload failed');
        }
    } catch (e) {
        console.error('[CourseParsing] Picture parsing failed:', e);
        courseStore.updateResource(courseId, resource.id, r => ({ ...r, status: 'error' }));
    }

    return resource;
}
