import { writable, get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import type { DynamicModel } from './types';

// ============================================================================
// SETTINGS STORE - Central state for app configuration
// ============================================================================

export interface Settings {
    // LLM / Gemini Settings
    geminiModel: string;
    availableModels: DynamicModel[];
    // MEETING_TASKS_v1: Task 1.3 — Tier-based backend routing
    // 'free' → local Whisper only (high latency OK); 'paid' → Gemini API (real-time)
    userTier: 'free' | 'paid';
    confidenceThreshold: number;
    vadSensitivity: number;
    autoConnect: boolean;
    debugMode: boolean;
    captureMode: 'mic' | 'system' | 'both';
    // Tasks 1.3 + 1.4 + 3.1: RagFlow / Knowledge Base integration config
    ragflowUrl: string;          // Server URL for the deployed RagFlow instance
    ragflowApiKey: string;       // LLM API key input into RagFlow (OpenAI or open-source)
    knowledgeBaseId: string;     // Active Knowledge Base ID for the current user/subject
    ragflowConversationId: string; // Active RAGFlow chat conversation ID
    filters: {
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
    };
    vadConfig: {
        minSpeechDuration: number;
        silenceDuration: number;
        minChunkDuration: number;
        enableFillerDetection: boolean;
    };
}

const DEFAULT_MODELS: DynamicModel[] = [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini', isCustom: false },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite', provider: 'gemini', isCustom: false },
    { id: 'gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash (Legacy/Exp)', provider: 'gemini', isCustom: false },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'gemini', isCustom: false },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini', isCustom: false }
];

const DEFAULT_SETTINGS: Settings = {
    geminiModel: 'gemini-2.0-flash', // Updated to 2.0 Flash default
    availableModels: DEFAULT_MODELS,
    userTier: 'paid', // Default to paid so Gemini is enabled by default for new users
    confidenceThreshold: 0.7,
    vadSensitivity: 0.5,
    autoConnect: false,
    debugMode: false,
    captureMode: 'both',
    // ZERO_CONFIG_RAGFLOW_AUTO_SETUP_v1: ragflowUrl pre-points at the default
    // native GPU instance. Bootstrap fills in apiKey (from bundled env) and
    // knowledgeBaseId (auto-created "My Lectures" dataset) on first launch.
    ragflowUrl: 'http://localhost:9380',
    ragflowApiKey: '',
    knowledgeBaseId: '',
    ragflowConversationId: '',
    filters: {
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
        topicDrifts: false,
    },
    vadConfig: {
        minSpeechDuration: 1500,
        silenceDuration: 2000,
        minChunkDuration: 1500,
        enableFillerDetection: true
    }
};

function createSettingsStore() {
    // Load initial state from localStorage
    const savedGeminiModel = typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_model') : null;
    const savedConfidence = typeof localStorage !== 'undefined' ? localStorage.getItem('confidence_threshold') : null;
    const savedVadSensitivity = typeof localStorage !== 'undefined' ? localStorage.getItem('vad_sensitivity') : null;
    const savedAutoConnect = typeof localStorage !== 'undefined' ? localStorage.getItem('auto_connect') : null;
    const savedDebugMode = typeof localStorage !== 'undefined' ? localStorage.getItem('debug_mode') : null;
    const savedCaptureMode = typeof localStorage !== 'undefined' ? localStorage.getItem('capture_mode') : null;
    const savedFilters = typeof localStorage !== 'undefined' ? localStorage.getItem('intelligence_filters') : null;
    const savedVadConfig = typeof localStorage !== 'undefined' ? localStorage.getItem('vad_config') : null;
    // Tasks 1.3 + 1.4 + 3.1: Persist RagFlow config across sessions
    const savedRagflowUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('ragflow_url') : null;
    const savedRagflowApiKey = typeof localStorage !== 'undefined' ? localStorage.getItem('ragflow_api_key') : null;
    const savedKnowledgeBaseId = typeof localStorage !== 'undefined' ? localStorage.getItem('ragflow_kb_id') : null;
    const savedRagflowConversationId = typeof localStorage !== 'undefined' ? localStorage.getItem('ragflow_conversation_id') : null;
    const savedUserTier = typeof localStorage !== 'undefined' ? localStorage.getItem('user_tier') : null; // MEETING_TASKS_v1: Task 1.3
    const savedAvailableModels = typeof localStorage !== 'undefined' ? localStorage.getItem('available_models') : null;

    const initialState: Settings = {
        ...DEFAULT_SETTINGS,
        geminiModel: savedGeminiModel || DEFAULT_SETTINGS.geminiModel,
        availableModels: savedAvailableModels ? JSON.parse(savedAvailableModels) : DEFAULT_SETTINGS.availableModels,
        userTier: (savedUserTier as 'free' | 'paid') || DEFAULT_SETTINGS.userTier,
        confidenceThreshold: savedConfidence ? parseFloat(savedConfidence) : DEFAULT_SETTINGS.confidenceThreshold,
        vadSensitivity: savedVadSensitivity ? parseFloat(savedVadSensitivity) : DEFAULT_SETTINGS.vadSensitivity,
        autoConnect: savedAutoConnect === 'true',
        debugMode: savedDebugMode === 'true',
        captureMode: (savedCaptureMode as any) || DEFAULT_SETTINGS.captureMode,
        filters: savedFilters ? JSON.parse(savedFilters) : DEFAULT_SETTINGS.filters,
        vadConfig: savedVadConfig ? JSON.parse(savedVadConfig) : DEFAULT_SETTINGS.vadConfig,
        // Tasks 1.3 + 1.4 + 3.1: Restore RagFlow config from localStorage
        ragflowUrl: savedRagflowUrl || DEFAULT_SETTINGS.ragflowUrl,
        ragflowApiKey: savedRagflowApiKey || DEFAULT_SETTINGS.ragflowApiKey,
        knowledgeBaseId: savedKnowledgeBaseId || DEFAULT_SETTINGS.knowledgeBaseId,
        ragflowConversationId: savedRagflowConversationId || DEFAULT_SETTINGS.ragflowConversationId,
    };

    const { subscribe, set, update } = writable<Settings>(initialState);

    return {
        subscribe,
        set: (value: Settings) => {
            // Sync to localStorage on set
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('gemini_model', value.geminiModel);
                localStorage.setItem('user_tier', value.userTier); // MEETING_TASKS_v1: Task 1.3
                localStorage.setItem('confidence_threshold', value.confidenceThreshold.toString());
                localStorage.setItem('vad_sensitivity', value.vadSensitivity.toString());
                localStorage.setItem('auto_connect', value.autoConnect.toString());
                localStorage.setItem('debug_mode', value.debugMode.toString());
                localStorage.setItem('capture_mode', value.captureMode);
                localStorage.setItem('intelligence_filters', JSON.stringify(value.filters));
                localStorage.setItem('vad_config', JSON.stringify(value.vadConfig));
                // Tasks 1.3 + 1.4 + 3.1: Persist RagFlow config
                localStorage.setItem('ragflow_url', value.ragflowUrl || '');
                localStorage.setItem('ragflow_api_key', value.ragflowApiKey || '');
                localStorage.setItem('ragflow_kb_id', value.knowledgeBaseId || '');
                localStorage.setItem('ragflow_conversation_id', value.ragflowConversationId || '');
                localStorage.setItem('available_models', JSON.stringify(value.availableModels));
            }
            set(value);
        },
        update: (updater: (value: Settings) => Settings) => {
            update(current => {
                const next = updater(current);
                // Sync to localStorage on update
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('gemini_model', next.geminiModel);
                    localStorage.setItem('user_tier', next.userTier); // MEETING_TASKS_v1: Task 1.3
                    localStorage.setItem('confidence_threshold', next.confidenceThreshold.toString());
                    localStorage.setItem('vad_sensitivity', next.vadSensitivity.toString());
                    localStorage.setItem('auto_connect', next.autoConnect.toString());
                    localStorage.setItem('debug_mode', next.debugMode.toString());
                    localStorage.setItem('capture_mode', next.captureMode);
                    localStorage.setItem('intelligence_filters', JSON.stringify(next.filters));
                    localStorage.setItem('vad_config', JSON.stringify(next.vadConfig));
                    // Tasks 1.3 + 1.4 + 3.1: Persist RagFlow config on update
                    localStorage.setItem('ragflow_url', next.ragflowUrl || '');
                    localStorage.setItem('ragflow_api_key', next.ragflowApiKey || '');
                    localStorage.setItem('ragflow_kb_id', next.knowledgeBaseId || '');
                    localStorage.setItem('ragflow_conversation_id', next.ragflowConversationId || '');
                    localStorage.setItem('available_models', JSON.stringify(next.availableModels));
                }
                return next;
            });
        },
        reset: () => {
            if (confirm('Reset all settings to default?')) {
                set(DEFAULT_SETTINGS);
                localStorage.clear(); // Or just clear the keys we use
            }
        }
    };
}

export const settingsStore = createSettingsStore();
