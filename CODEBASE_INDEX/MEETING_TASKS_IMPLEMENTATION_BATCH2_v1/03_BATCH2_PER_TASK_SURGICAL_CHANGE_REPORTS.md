---
title: Batch2 Per-Task Surgical Change Reports
version: v1
generated: 2026-03-24 22:10
last_modified_by: MEETING_TASKS_IMPLEMENTATION_BATCH2_AUDITOR_AND_LOGICAL_PLACEMENT_FIXER_v1
meeting_notes_source: attached
rule: NO new files, NO new folders, NO new functionalities — only surgical changes at existing logical locations
parallel_collaboration: MEETING_TASKS_IMPLEMENTATION_v1 + FULL_FUNCTIONALITY_AUDIT_AND_FIX_v1 + START_RECORDING_WORKFLOW_AUDIT_v1
---

# Batch2 Per-Task Surgical Change Reports

## Tasks 1.3 + 1.4 + 3.1 — settingsStore.ts

```diff
// Settings interface — 3 fields added
+ ragflowUrl: string;          // Task 3.1: RagFlow server URL
+ ragflowApiKey: string;       // Task 1.4: LLM API key for RagFlow
+ knowledgeBaseId: string;     // Task 1.3: Per-user/subject KB ID

// DEFAULT_SETTINGS — 3 defaults added
+ ragflowUrl: '',
+ ragflowApiKey: '',
+ knowledgeBaseId: '',

// localStorage restore — 3 keys added
+ const savedRagflowUrl = localStorage.getItem('ragflow_url');
+ const savedRagflowApiKey = localStorage.getItem('ragflow_api_key');
+ const savedKnowledgeBaseId = localStorage.getItem('ragflow_kb_id');

// initialState — 3 properties restored
+ ragflowUrl: savedRagflowUrl || '',
+ ragflowApiKey: savedRagflowApiKey || '',
+ knowledgeBaseId: savedKnowledgeBaseId || '',

// set() and update() — 3 localStorage writes added
+ localStorage.setItem('ragflow_url', value.ragflowUrl || '');
+ localStorage.setItem('ragflow_api_key', value.ragflowApiKey || '');
+ localStorage.setItem('ragflow_kb_id', value.knowledgeBaseId || '');
```

## Tasks 1.3 + 1.4 + 3.1 — SettingsTab.svelte

```diff
// Script block additions
+ let ragflowUrl = $settingsStore.ragflowUrl || '';
+ let ragflowApiKey = $settingsStore.ragflowApiKey || '';
+ let knowledgeBaseId = $settingsStore.knowledgeBaseId || '';
+ function saveRagflowConfig() { settingsStore.update(s => ({...s, ragflowUrl, ragflowApiKey, knowledgeBaseId})); }

// HTML additions — inserted before <CognivoxControls>
+ <div class="mb-6 border border-blue-100 rounded-xl p-4 bg-blue-50/50">
+   RagFlow Server URL input (id="ragflow-url", type="url")
+   LLM API Key input (id="ragflow-api-key", type="password")
+   Knowledge Base ID input (id="kb-id", type="text")
+   Save button → saveRagflowConfig()
+   Connection indicator: {#if $settingsStore.ragflowUrl}
+ </div>
```

## Task 2.2 — TranscriptView.svelte (Diarization Labels)

```diff
// In #each transcripts block
+ {@const speakerLabel = t.speaker && t.speaker !== 'You' && t.speaker !== 'Speaker 1'
+     ? t.speaker                              // Custom renamed name preserved
+     : isUser ? 'Lecturer' : `Student ${(t.speakerId ?? 2) - 1}`}
+ {@const avatarText = isUser ? 'LEC' : `S${(t.speakerId ?? 2) - 1}`}

// Avatar bubble
- {isUser ? 'YOU' : 'S2'}
+ {avatarText}

// Speaker name label
- {isUser ? 'You' : (t.speaker || 'Speaker 2')}
+ {speakerLabel}
```

## Task 2.3 — TranscriptView.svelte (Inline Rename)

```diff
// Script block
+ function renameSpeakerInline(speakerId, currentName) {
+     const newName = prompt(`Rename "${currentName}" to:`, currentName);
+     if (newName?.trim() && newName.trim() !== currentName)
+         dispatch('renameSpeaker', { speakerId, newLabel: newName.trim() });
+ }

// HTML — inline button in speaker header row
+ <button
+     class="opacity-0 group-hover:opacity-100 transition-opacity ..."
+     onclick={() => renameSpeakerInline(t.speakerId?.toString(), speakerLabel)}
+     title="Rename this speaker"
+ >✏ Rename</button>
```
