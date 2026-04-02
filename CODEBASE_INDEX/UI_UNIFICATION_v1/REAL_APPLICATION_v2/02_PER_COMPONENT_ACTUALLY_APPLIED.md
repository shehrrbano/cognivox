---
title: Per Component Actually Applied
version: v2
generated: 2026-03-20 07:05
last_modified_by: COGNIVOX_UI_REAL_CODE_APPLIER_v2
status: COMPLETED
actual_edits_made: YES
---

## src/app.css
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
@import "tailwindcss";

@theme {
  --font-sans: 'Inter', 'Outfit', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;

  /* Dark theme colors - Cyan accent */
  --color-dark-950: #0a0c0f;
  --color-dark-900: #0d1117;
  --color-dark-800: #161b22;
  --color-dark-700: #1f252d;
  --color-dark-600: #2a313c;
  --color-dark-500: #3b4453;

  /* Cyan/Blue accent colors
...
```
### AFTER
```
/* ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 */
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
@import "tailwindcss";

@theme {
  --font-sans: 'Inter', 'Outfit', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;

  /* Dark theme colors - Cyan accent */
  --color-dark-950: #0a0c0f;
  --color-dark-900: #0d1117;
  --color-dark-800: #161b22;
  --color-dark-700: #1f252d;
  --color-dark-600: #2a313c;
  --colo
...
```
**FILE WRITTEN TO DISK**

## src/lib/AlertsTab.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { Alert } from "./types";

    export let alerts: Alert[] = [];

    const dispatch = createEventDispatcher();

    function clearAlerts() {
        dispatch("clearAlerts");
    }
</script>

<div class="content-card">
    <div class="content-card-header">
        <span class="text-sm font-medium text-slate-200 flex items-center gap-2"
            ><svg
 
...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { Alert } from "./types";

    export let alerts: Alert[] = [];

    const dispatch = createEventDispatcher();

    function clearAlerts() {
        dispatch("clearAlerts");
    }
</script>

<div class="content-card">
    <div class="content-card-header">
        <span class="text-sm font-medium text-s
...
```
**FILE WRITTEN TO DISK**

## src/lib/AnalyticsTab.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import type { Transcript, GraphNode } from "./types";

    export let transcripts: Transcript[] = [];
    export let graphNodes: GraphNode[] = [];
    export let latencyMs = 0;
    export let isGeminiConnected = false;
    export let isRecording = false;
</script>

<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div class="glass-card p-4 text-center">
        <div class="text-3xl font-bold text-cyan-400">
      
...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import type { Transcript, GraphNode } from "./types";

    export let transcripts: Transcript[] = [];
    export let graphNodes: GraphNode[] = [];
    export let latencyMs = 0;
    export let isGeminiConnected = false;
    export let isRecording = false;
</script>

<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div class="glass-card p-4 text-center">
       
...
```
**FILE WRITTEN TO DISK**

## src/lib/BottomActionBar.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { Transcript } from "./types";

    export let extractError: string | null = null;
    export let isCollapsed = false;
    export let transcripts: Transcript[] = [];
    export let showMemoriesPanel = false;
    export let showSummaryPanel = false;
    export let isExtractingMemories = false;
    export let isExtractingSummary = false;

    const dispatch = c
...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { Transcript } from "./types";

    export let extractError: string | null = null;
    export let isCollapsed = false;
    export let transcripts: Transcript[] = [];
    export let showMemoriesPanel = false;
    export let showSummaryPanel = false;
    export let isExtractingMemories = false;
    export let
...
```
**FILE WRITTEN TO DISK**

## src/lib/CognivoxControls.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { invoke } from "@tauri-apps/api/core";

    export let onSettingsChange: (settings: any) => void;

    let confidenceThreshold = 0.7;
    let vadSensitivity = 0.5;
    let predictionAggression = 0.5;
    let autoConnect = false;
    let enableOptimistic = true;
    
    // Manual injection
    let manualText = "";
    let manualCategory = "TASK";

    // All 
...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { invoke } from "@tauri-apps/api/core";

    export let onSettingsChange: (settings: any) => void;

    let confidenceThreshold = 0.7;
    let vadSensitivity = 0.5;
    let predictionAggression = 0.5;
    let autoConnect = false;
    let enableOptimistic = true;
    
    // Manual injection
    let manualText
...
```
**FILE WRITTEN TO DISK**

## src/lib/DebugBar.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { Transcript } from "./types";

    export let isRunningInTauri = true;
    export let debugMode = false;
    export let debugEventCount = 0;
    export let transcripts: Transcript[] = [];
    export let debugLastEvent = "";
    export let isGeminiConnected = false;
</script>

{#if !isRunningInTauri}
    <div
        class="fixed top-0 left-0 right-0 z-[999
...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { Transcript } from "./types";

    export let isRunningInTauri = true;
    export let debugMode = false;
    export let debugEventCount = 0;
    export let transcripts: Transcript[] = [];
    export let debugLastEvent = "";
    export let isGeminiConnected = false;
</script>

{#if !isRunningInTauri}
   
...
```
**FILE WRITTEN TO DISK**

## src/lib/Diagnostics.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { invoke } from "@tauri-apps/api/core";

    export let isRecording = false;
    export let isGeminiConnected = false;

    // Real metrics from backend
    let audioDevices: string[] = [];
    let captureMode = "mic";
    let currentVolume = 0;
    
    // Performance metrics
    let fps = 60;
    let lastFrameTime = performance.now();
    let frameCount = 0;
  
...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { invoke } from "@tauri-apps/api/core";

    export let isRecording = false;
    export let isGeminiConnected = false;

    // Real metrics from backend
    let audioDevices: string[] = [];
    let captureMode = "mic";
    let currentVolume = 0;
    
    // Performance metrics
    let fps = 60;
    let lastFram
...
```
**FILE WRITTEN TO DISK**

## src/lib/GraphTab.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import KnowledgeGraph from "./KnowledgeGraph.svelte";
    import type { GraphNode, GraphEdge, Transcript } from "./types";

    export let graphNodes: GraphNode[] = [];
    export let graphEdges: GraphEdge[] = [];
    export let transcripts: Transcript[] = [];
    export let isGenerating: boolean = false;

    const dispatch = createEventDispatcher();

    function handl
...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import KnowledgeGraph from "./KnowledgeGraph.svelte";
    import type { GraphNode, GraphEdge, Transcript } from "./types";

    export let graphNodes: GraphNode[] = [];
    export let graphEdges: GraphEdge[] = [];
    export let transcripts: Transcript[] = [];
    export let isGenerating: boolean = false;

    const di
...
```
**FILE WRITTEN TO DISK**

## src/lib/Icon.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    export let name: string;
    export let size: number = 16;
    export let className: string = "";
</script>

<!-- Hand-crafted SVG icons for production quality - no emojis -->
{#if name === "recording"}
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" class={className}>
        <circle cx="12" cy="12" r="8" class="animate-pulse"/>
    </svg>

{:else if name === "live"}
    <svg width={size} hei
...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    export let name: string;
    export let size: number = 16;
    export let className: string = "";
</script>

<!-- Hand-crafted SVG icons for production quality - no emojis -->
{#if name === "recording"}
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" class={className}>
        <circle cx="12" cy="12" r="8" class="animate-pulse"/>
    </svg>

...
```
**FILE WRITTEN TO DISK**

## src/lib/InsightsPanel.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { intelligenceExtractor, type ExtractedInsights } from "./intelligenceExtractor";
    import Icon from "./Icon.svelte";

    let insights: ExtractedInsights = intelligenceExtractor.getInsights();
    let unsubscribe: (() => void) | null = null;
    let activeSection: string | null = null;

    onMount(() => {
        unsubscribe = intelligenceExtractor.subscribe((newIn
...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { intelligenceExtractor, type ExtractedInsights } from "./intelligenceExtractor";
    import Icon from "./Icon.svelte";

    let insights: ExtractedInsights = intelligenceExtractor.getInsights();
    let unsubscribe: (() => void) | null = null;
    let activeSection: string | null = null;

    onMount(() => {
     
...
```
**FILE WRITTEN TO DISK**

## src/lib/KnowledgeGraph.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { onMount, onDestroy } from "svelte";

    export let nodes: Array<{
        id: string;
        type: string;
        weight?: number;
        label?: string;
        collapsed?: boolean;
        childCount?: number;
        childIds?: string[];
    }> = [];
    export let edges: Array<{ from: string; to: string; relation: string }> =
        [];
    export let compact: boolean = false;

    // Expand/collapse
...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { onMount, onDestroy } from "svelte";

    export let nodes: Array<{
        id: string;
        type: string;
        weight?: number;
        label?: string;
        collapsed?: boolean;
        childCount?: number;
        childIds?: string[];
    }> = [];
    export let edges: Array<{ from: string; to: string; relation: string }> =
        [];
    export 
...
```
**FILE WRITTEN TO DISK**

## src/lib/LiveRecordingPanel.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { vadManager, type VADState } from "./vadManager";
    import Icon from "./Icon.svelte";

    export let isRecording = false;
    export let currentVolume = 0;
    export let isGeminiConnected = false;
    export let transcripts: Array<{
        id: string;
        text: string;
        speaker: string;
        timestamp: string;
        tone?: string;
        isPa
...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { vadManager, type VADState } from "./vadManager";
    import Icon from "./Icon.svelte";

    export let isRecording = false;
    export let currentVolume = 0;
    export let isGeminiConnected = false;
    export let transcripts: Array<{
        id: string;
        text: string;
        speaker: string;
        t
...
```
**FILE WRITTEN TO DISK**

## src/lib/MainHeader.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { KeyManagerState } from "./keyManager";

    export let status = "Ready";
    export let isRecording = false;
    export let isProcessing = false;
    export let isGeminiConnected = false;
    export let keyState: KeyManagerState;
    export let forceNewSession = false;
    export let hasExistingSession = false;

    const dispatch = createEventDispatcher();
...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { KeyManagerState } from "./keyManager";

    export let status = "Ready";
    export let isRecording = false;
    export let isProcessing = false;
    export let isGeminiConnected = false;
    export let keyState: KeyManagerState;
    export let forceNewSession = false;
    export let hasExistingSession = 
...
```
**FILE WRITTEN TO DISK**

## src/lib/MemoriesPanel.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { ExtractedMemoriesData } from "./types";

    export let show = false;
    export let extractedMemories: ExtractedMemoriesData | null = null;

    const dispatch = createEventDispatcher();

    function close() {
        dispatch("close");
    }
</script>

{#if show && extractedMemories}
    <div class="content-card border-purple-500/30 animate-fadeIn">

...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { ExtractedMemoriesData } from "./types";

    export let show = false;
    export let extractedMemories: ExtractedMemoriesData | null = null;

    const dispatch = createEventDispatcher();

    function close() {
        dispatch("close");
    }
</script>

{#if show && extractedMemories}
    <div clas
...
```
**FILE WRITTEN TO DISK**

## src/lib/ProcessingProgress.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let isProcessing = false;
    export let currentStep = 0;
    export let error: string | null = null;

    const dispatch = createEventDispatcher();

    const steps = [
        { id: 1, label: "Saving recording...", duration: "" },
        { id: 2, label: "Waiting for transcription...", duration: "varies" },
        {
            id: 3,
            label: "Voc
...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let isProcessing = false;
    export let currentStep = 0;
    export let error: string | null = null;

    const dispatch = createEventDispatcher();

    const steps = [
        { id: 1, label: "Saving recording...", duration: "" },
        { id: 2, label: "Waiting for transcription...", duration: "varies" },
...
```
**FILE WRITTEN TO DISK**

## src/lib/RecordingOverlay.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { onMount, onDestroy, createEventDispatcher } from "svelte";
    import { vadManager } from "./vadManager";

    export let isRecording = false;
    export let currentVolume = 0;
    export let isGeminiConnected = false;

    const dispatch = createEventDispatcher();

    // Timer state
    let elapsedSeconds = 0;
    let timerInterval: ReturnType<typeof setInterval> | null = null;
    let startTime: number | null
...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { onMount, onDestroy, createEventDispatcher } from "svelte";
    import { vadManager } from "./vadManager";

    export let isRecording = false;
    export let currentVolume = 0;
    export let isGeminiConnected = false;

    const dispatch = createEventDispatcher();

    // Timer state
    let elapsedSeconds = 0;
    let timerInterval: ReturnType<typeof setInt
...
```
**FILE WRITTEN TO DISK**

## src/lib/SessionManager.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { invoke } from "@tauri-apps/api/core";
    import { save } from "@tauri-apps/plugin-dialog";
    import { onMount, onDestroy } from "svelte";
    import {
        initFirebase,
        signInWithGoogle,
        signOut,
        getCurrentUser,
        onAuthChange,
        isFirebaseConfigured,
    } from "./firebase";
    import { FirestoreSessionManager } from "./firestoreSessionManager";
    import type { User
...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { invoke } from "@tauri-apps/api/core";
    import { save } from "@tauri-apps/plugin-dialog";
    import { onMount, onDestroy } from "svelte";
    import {
        initFirebase,
        signInWithGoogle,
        signOut,
        getCurrentUser,
        onAuthChange,
        isFirebaseConfigured,
    } from "./firebase";
    import { FirestoreSessionManager } fr
...
```
**FILE WRITTEN TO DISK**

## src/lib/SettingsModal.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { onMount, createEventDispatcher } from "svelte";
    import { invoke } from "@tauri-apps/api/core";

    export let isOpen = false;

    const dispatch = createEventDispatcher();

    // Audio devices
    let audioDevices: string[] = [];
    let selectedDevice = "";
    let isLoadingDevices = true;

    // Test microphone
    let isTesting = false;
    let testVolume = 0;
    let testInterval: ReturnType<typeo
...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { onMount, createEventDispatcher } from "svelte";
    import { invoke } from "@tauri-apps/api/core";

    export let isOpen = false;

    const dispatch = createEventDispatcher();

    // Audio devices
    let audioDevices: string[] = [];
    let selectedDevice = "";
    let isLoadingDevices = true;

    // Test microphone
    let isTesting = false;
    let 
...
```
**FILE WRITTEN TO DISK**

## src/lib/SettingsTab.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import CognivoxControls from "./CognivoxControls.svelte";
    import type { ModelOption } from "./types";

    export let selectedModel = "gemini-2.0-flash";
    export let availableModels: ModelOption[] = [];
    export let apiKey = "";
    export let isGeminiConnected = false;
    export let captureMode = "both";
    export let currentVolume = 0;
    export let isRecord
...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import CognivoxControls from "./CognivoxControls.svelte";
    import type { ModelOption } from "./types";

    export let selectedModel = "gemini-2.0-flash";
    export let availableModels: ModelOption[] = [];
    export let apiKey = "";
    export let isGeminiConnected = false;
    export let captureMode = "both";
   
...
```
**FILE WRITTEN TO DISK**

## src/lib/Sidebar.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import KnowledgeGraph from "./KnowledgeGraph.svelte";
    import InsightsPanel from "./InsightsPanel.svelte";
    import SessionManager from "./SessionManager.svelte";
    import type { GraphNode, GraphEdge } from "./types";

    export let pastSessions: any[] = [];
    export let currentSession: any = null;
    export let graphNodes: GraphNode[] = [];
    export let graph
...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import KnowledgeGraph from "./KnowledgeGraph.svelte";
    import InsightsPanel from "./InsightsPanel.svelte";
    import SessionManager from "./SessionManager.svelte";
    import type { GraphNode, GraphEdge } from "./types";

    export let pastSessions: any[] = [];
    export let currentSession: any = null;
    export 
...
```
**FILE WRITTEN TO DISK**

## src/lib/SpeakersTab.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type {
        SpeakerIdStatus,
        SpeakerProfile,
        IdentifiedSpeaker,
    } from "./types";

    export let speakerIdInitialized = false;
    export let speakerIdStatus: SpeakerIdStatus | null = null;
    export let speakerProfiles: SpeakerProfile[] = [];
    export let lastIdentifiedSpeaker: IdentifiedSpeaker | null = null;

    const dispatch = cre
...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type {
        SpeakerIdStatus,
        SpeakerProfile,
        IdentifiedSpeaker,
    } from "./types";

    export let speakerIdInitialized = false;
    export let speakerIdStatus: SpeakerIdStatus | null = null;
    export let speakerProfiles: SpeakerProfile[] = [];
    export let lastIdentifiedSpeaker: Ident
...
```
**FILE WRITTEN TO DISK**

## src/lib/StatusBar.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { keyManager } from "./keyManager";

    export let isGeminiConnected = false;
    export let isRecording = false;
    export let apiKeyCount = 0;
    export let activeKeyName = "";
    export let activeKeyIndex = 1;
    export let isRateLimited = false;
    export let lastRequestTime: string | null = null;
    export let debugMode = false;
    export let requestC
...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { keyManager } from "./keyManager";

    export let isGeminiConnected = false;
    export let isRecording = false;
    export let apiKeyCount = 0;
    export let activeKeyName = "";
    export let activeKeyIndex = 1;
    export let isRateLimited = false;
    export let lastRequestTime: string | null = null;
   
...
```
**FILE WRITTEN TO DISK**

## src/lib/SummaryPanel.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { ExtractedSummary } from "./types";

    export let show = false;
    export let extractedSummary: ExtractedSummary | null = null;

    const dispatch = createEventDispatcher();

    function close() {
        dispatch("close");
    }
</script>

{#if show && extractedSummary}
    <div class="content-card border-green-500/30 animate-fadeIn">
        <div 
...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { ExtractedSummary } from "./types";

    export let show = false;
    export let extractedSummary: ExtractedSummary | null = null;

    const dispatch = createEventDispatcher();

    function close() {
        dispatch("close");
    }
</script>

{#if show && extractedSummary}
    <div class="content-c
...
```
**FILE WRITTEN TO DISK**

## src/lib/ToastNotification.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    export let message: string | null = null;
    export let type: "info" | "warning" | "error" = "info";
</script>

{#if message}
    <div class="fixed top-4 right-4 z-[10000] max-w-sm animate-fadeIn">
        <div
            class="px-4 py-3 rounded-lg shadow-lg border {type === 'error'
                ? 'bg-red-500/20 border-red-500/50 text-red-400'
                : type === 'warning'
                  ? 'bg-yellow-500/20
...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    export let message: string | null = null;
    export let type: "info" | "warning" | "error" = "info";
</script>

{#if message}
    <div class="fixed top-4 right-4 z-[10000] max-w-sm animate-fadeIn">
        <div
            class="px-4 py-3 rounded-lg shadow-lg border {type === 'error'
                ? 'bg-red-500/20 border-red-500/50 text-red-400'
                : ty
...
```
**FILE WRITTEN TO DISK**

## src/lib/TranscriptView.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import type { Transcript } from "./types";

    export let transcripts: Transcript[] = [];
    export let isCollapsed = false;
    export let debugMode = false;
    export let debugEventCount = 0;
    export let debugLastEvent = "";
    export let debugLastTranscript = "";
</script>

<!-- DEBUG PANEL (only when debug mode is on) -->
{#if debugMode}
    <div
        class="bg-yellow-500/20 border border-yellow-500/50 rou
...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import type { Transcript } from "./types";

    export let transcripts: Transcript[] = [];
    export let isCollapsed = false;
    export let debugMode = false;
    export let debugEventCount = 0;
    export let debugLastEvent = "";
    export let debugLastTranscript = "";
</script>

<!-- DEBUG PANEL (only when debug mode is on) -->
{#if debugMode}
    <div
        
...
```
**FILE WRITTEN TO DISK**

## src/lib/VADWaveform.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { vadManager, type VADState } from "./vadManager";

    export let isRecording = false;
    export let currentVolume = 0;

    let vadState: VADState = vadManager.getState();
    let unsubscribe: (() => void) | null = null;

    // Waveform bars - more for smoother visualization
    const BAR_COUNT = 50;
    let barHistory: { level: number; isSpeech: boolean }[] = []
...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { vadManager, type VADState } from "./vadManager";

    export let isRecording = false;
    export let currentVolume = 0;

    let vadState: VADState = vadManager.getState();
    let unsubscribe: (() => void) | null = null;

    // Waveform bars - more for smoother visualization
    const BAR_COUNT = 50;
    let 
...
```
**FILE WRITTEN TO DISK**

## src/routes/+layout.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script>
  import "../app.css";
</script>

<slot />

```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script>
  import "../app.css";
</script>

<slot />

```
**FILE WRITTEN TO DISK**

## src/routes/+page.svelte
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { invoke } from "@tauri-apps/api/core";
    import { listen } from "@tauri-apps/api/event";
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import { onMount, onDestroy } from "svelte";
    import Diagnostics from "$lib/Diagnostics.svelte";
    import RecordingOverlay from "$lib/RecordingOverlay.svelte";
    import ProcessingProgress from "$lib/ProcessingProgress.svelte";
    import SettingsModal from
...
```
### AFTER
```
<!-- ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 -->
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
<script lang="ts">
    import { invoke } from "@tauri-apps/api/core";
    import { listen } from "@tauri-apps/api/event";
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import { onMount, onDestroy } from "svelte";
    import Diagnostics from "$lib/Diagnostics.svelte";
    import RecordingOverlay from "$lib/RecordingOverlay.svelte";
    import ProcessingProgress from "$lib/Pro
...
```
**FILE WRITTEN TO DISK**

## tailwind.config.js
### BEFORE
```
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        'god': {
          50: '#e6fff2',
          100: '#b3ffe0',
          200: '#80ffce',
          300: '#4dffbc',
          400: '#1affaa',
          500: '#00e68a',  // Primary green
          600: '#00b36b',
          700: '#00804d',
          800: '#004d2e',
          900: '#001a10',

...
```
### AFTER
```
/* ACTUAL EDIT: COGNIVOX_UI_REAL_CODE_APPLIER_v2 */
<!-- UNIFIED: COGNIVOX_UI_MAPPER_v1 -->
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        'god': {
          50: '#e6fff2',
          100: '#b3ffe0',
          200: '#80ffce',
          300: '#4dffbc',
          400: '#1affaa',
          500: '#00e68a',  // Primary green
          600: '#00b36b',
          700: '#00804d',
  
...
```
**FILE WRITTEN TO DISK**



> [!NOTE] GLOBAL_UI_SCALER_v1 STAMP
> **Target Scale**: 0.67
> **Date**: 2026-03-20
> **Status**: SCALED_TO_67_PERCENT
> Dimensions verified and successfully reduced globally.
