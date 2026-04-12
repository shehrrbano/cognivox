<script lang="ts">
    import { settingsStore } from './settingsStore';
    import {
        askQuestion,
        createConversation,
        checkRAGFlowStatus,
        listDatasets,
        type RAGFlowAnswer,
        type RAGFlowChunk,
        type RAGFlowStatus,
        uploadDocument,
        parseDocuments,
    } from './services/ragflowService';
    import { open } from "@tauri-apps/plugin-opener";
    // ZERO_CONFIG_RAGFLOW_AUTO_SETUP_v1: Hide all manual setup UI for normal users.
    import {
        initializeRAGFlowAutoSetup,
        onBootstrapChange,
        getBootstrapState,
        type BootstrapState,
    } from './services/ragflowBootstrap';

    let {
        graphNodes = [],
        onautoZoomEntity = (entityId: string) => {},
        onopenSettings = () => {},
    } = $props();

    // ZERO_CONFIG: Dev Mode gate — only power users see raw setup fields.
    // Reuses the existing debugMode flag in settingsStore.
    let devMode = $derived($settingsStore.debugMode === true);

    // Bootstrap state subscription (kept in sync with ragflowBootstrap service).
    let bootstrap = $state<BootstrapState>(getBootstrapState());
    $effect(() => {
        const unsubscribe = onBootstrapChange(s => { bootstrap = s; });
        return () => unsubscribe();
    });

    // Chat state
    let messages = $state<Array<{
        role: 'user' | 'assistant';
        content: string;
        chunks?: RAGFlowChunk[];
        relatedEntities?: string[];
        timestamp: string;
    }>>([]);
    let inputText = $state('');
    let isLoading = $state(false);
    let conversationId = $state<string | null>(null);
    let ragflowStatus = $state<RAGFlowStatus>({ connected: false });
    let showSources = $state<number | null>(null);
    let chatContainer: HTMLDivElement | undefined = $state();
    let datasetName = $state<string | null>(null);

    // Check connection on mount and when config changes
    $effect(() => {
        const url = $settingsStore.ragflowUrl;
        const key = $settingsStore.ragflowApiKey;
        if (url && key) {
            checkRAGFlowStatus().then(status => {
                ragflowStatus = status;
                if (status.connected && $settingsStore.knowledgeBaseId) {
                    loadDatasetName();
                }
            });
        } else {
            ragflowStatus = { connected: false, error: 'Not configured' };
        }
    });

    async function loadDatasetName() {
        try {
            const datasets = await listDatasets();
            const match = datasets.find(d => d.id === $settingsStore.knowledgeBaseId);
            datasetName = match?.name || null;
        } catch { datasetName = null; }
    }

    async function ensureConversation(): Promise<string | null> {
        if (conversationId) return conversationId;
        const id = await createConversation('Cognivox Study Session');
        if (id) {
            conversationId = id;
        }
        return id;
    }

    async function sendMessage() {
        const text = inputText.trim();
        if (!text || isLoading) return;

        messages = [...messages, {
            role: 'user',
            content: text,
            timestamp: new Date().toLocaleTimeString(),
        }];
        inputText = '';
        isLoading = true;

        requestAnimationFrame(() => {
            if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
        });

        try {
            const convId = await ensureConversation();
            if (!convId) {
                messages = [...messages, {
                    role: 'assistant',
                    content: 'Could not create a RAGFlow conversation. Please check your RAGFlow URL, API key, and Knowledge Base ID in Settings.',
                    timestamp: new Date().toLocaleTimeString(),
                }];
                return;
            }

            const answer: RAGFlowAnswer = await askQuestion(convId, text);

            messages = [...messages, {
                role: 'assistant',
                content: answer.answer,
                chunks: answer.chunks,
                relatedEntities: answer.relatedEntities,
                timestamp: new Date().toLocaleTimeString(),
            }];

            if (answer.relatedEntities.length > 0) {
                autoZoomToEntities(answer.relatedEntities);
            }
        } catch (e: any) {
            messages = [...messages, {
                role: 'assistant',
                content: `Error: ${e?.message || 'Failed to get answer from RAGFlow'}`,
                timestamp: new Date().toLocaleTimeString(),
            }];
        } finally {
            isLoading = false;
            requestAnimationFrame(() => {
                if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
            });
        }
    }

    function autoZoomToEntities(entities: string[]) {
        for (const entity of entities) {
            const matchingNode = graphNodes.find((n: any) =>
                n.id.toLowerCase().includes(entity) ||
                (n.label && n.label.toLowerCase().includes(entity)) ||
                entity.includes(n.id.toLowerCase())
            );
            if (matchingNode) {
                onautoZoomEntity(matchingNode.id);
                console.log(`[RAGFlow] Auto-zoom to KG node: ${matchingNode.id}`);
                break;
            }
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    function toggleSources(index: number) {
        showSources = showSources === index ? null : index;
    }

    function clearChat() {
        messages = [];
        conversationId = null;
    }

    let fileInput: HTMLInputElement | undefined = $state();

    async function handleFileUpload(e: Event) {
        const input = e.target as HTMLInputElement;
        if (!input.files?.length || !$settingsStore.knowledgeBaseId) return;

        const file = input.files[0];
        isLoading = true;
        messages = [...messages, {
            role: 'assistant',
            content: `Uploading and parsing "${file.name}"...`,
            timestamp: new Date().toLocaleTimeString(),
        }];

        try {
            const doc = await uploadDocument($settingsStore.knowledgeBaseId, file.name, file);
            if (doc?.id) {
                await parseDocuments($settingsStore.knowledgeBaseId, [doc.id]);
                messages = [...messages, {
                    role: 'assistant',
                    content: `Successfully added "${file.name}" to your knowledge base. It is now being indexed and will be available for questions in a few moments.`,
                    timestamp: new Date().toLocaleTimeString(),
                }];
                loadDatasetName();
            } else {
                throw new Error('Upload failed');
            }
        } catch (err: any) {
            messages = [...messages, {
                role: 'assistant',
                content: `Failed to upload "${file.name}": ${err.message}`,
                timestamp: new Date().toLocaleTimeString(),
            }];
        } finally {
            isLoading = false;
            input.value = '';
        }
    }

    async function launchDashboard() {
        const url = ($settingsStore.ragflowUrl || 'http://localhost:9380').trim();
        const cleanUrl = url.split('/api')[0];
        try { await open(cleanUrl); }
        catch (e) { console.error('[RAGFlow] Failed to open dashboard:', e); }
    }

    // Derived state
    let isConfigured = $derived(!!$settingsStore.ragflowUrl && !!$settingsStore.ragflowApiKey);
    let hasDataset = $derived(!!$settingsStore.knowledgeBaseId);
    let isReady = $derived(ragflowStatus.connected && hasDataset);

    // Quick prompts for empty state
    const quickPrompts = [
        'Summarize the key topics from my last lecture',
        'What are the main concepts discussed?',
        'Explain the relationship between the topics covered',
        'What questions should I review for the exam?',
    ];
</script>

<div class="flex flex-col h-full bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
        <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-500/20">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
            </div>
            <div>
                <h3 class="text-sm font-bold text-slate-800 leading-none">Study Buddy</h3>
                <p class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">
                    {#if isReady && datasetName}
                        {datasetName}
                    {:else if ragflowStatus.connected}
                        RAGFlow Connected
                    {:else}
                        RAGFlow Intelligence
                    {/if}
                </p>
            </div>
        </div>
        <div class="flex items-center gap-2">
            <!-- ZERO_CONFIG: Minimal status badge. Normal users only see Ready /
                 Warming. Dev Mode exposes the raw error for debugging. -->
            {#if devMode}
                <button
                    class="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors
                        {isReady ? 'bg-green-50 hover:bg-green-100' : 'bg-amber-50 hover:bg-amber-100'}"
                    onclick={() => onopenSettings()}
                    title="Dev Mode — click to open settings"
                    aria-label="Dev mode RAGFlow status"
                >
                    <span class="w-2 h-2 rounded-full {isReady ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}"></span>
                    <span class="text-[10px] font-bold uppercase tracking-wider {isReady ? 'text-green-600' : 'text-amber-600'}">
                        {isReady ? 'Ready' : bootstrap.phase}
                    </span>
                </button>
            {:else}
                <div class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50" aria-label="Study Buddy status">
                    <span class="w-2 h-2 rounded-full {isReady ? 'bg-green-500 animate-pulse' : 'bg-blue-400 animate-pulse'}"></span>
                    <span class="text-[10px] font-bold uppercase tracking-wider {isReady ? 'text-green-600' : 'text-blue-500'}">
                        {isReady ? 'Ready' : 'Warming Up'}
                    </span>
                </div>
            {/if}
            <!-- Launch Dashboard -->
            <button
                class="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all promax-interaction"
                onclick={launchDashboard}
                title="Open RAGFlow Dashboard"
                aria-label="Launch dashboard"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </svg>
            </button>
            <!-- Clear Chat -->
            {#if messages.length > 0}
                <button
                    class="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all promax-interaction"
                    onclick={clearChat}
                    title="Clear chat history"
                    aria-label="Clear chat"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            {/if}
        </div>
    </div>

    <!-- Messages Area -->
    <div
        bind:this={chatContainer}
        class="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
        style="scrollbar-width: thin; scrollbar-color: rgba(148,163,184,0.2) transparent;"
    >
        {#if messages.length === 0}
            <!-- Empty State -->
            <div class="flex flex-col items-center justify-center h-full text-center py-6">
                {#if !isReady && !devMode}
                    <!-- ZERO_CONFIG_FINAL_POLISH_v1: Two normal-user empty states.
                         Warming: spinner + friendly "setting itself up" copy.
                         Offline: calm stack icon + exact offline copy. No setup
                         fields ever shown to end users. -->
                    {#if bootstrap.phase === 'offline' || bootstrap.phase === 'error'}
                        <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgb(100, 116, 139)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                            </svg>
                        </div>
                        <h4 class="text-sm font-bold text-slate-700 mb-2">Study Buddy offline</h4>
                        <p class="text-xs text-slate-500 max-w-[300px] mb-2 leading-relaxed">
                            Study Buddy offline — RAGFlow not reachable. Some features may be limited.
                        </p>
                        <p class="text-[10px] text-slate-400 max-w-[280px] leading-relaxed">
                            You can still record lectures — your transcripts will be ingested automatically as soon as Study Buddy comes back online.
                        </p>
                    {:else}
                        <div class="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                            <svg class="w-8 h-8 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                            </svg>
                        </div>
                        <h4 class="text-sm font-bold text-slate-700 mb-2">Warming up Study Buddy</h4>
                        <p class="text-xs text-slate-400 max-w-[280px] mb-4 leading-relaxed">
                            Study Buddy is setting itself up automatically. Start a recording or upload an audio file — everything will be searchable and ready for questions in a moment.
                        </p>
                        <div class="text-[10px] text-slate-400 font-mono max-w-[280px] truncate">
                            {bootstrap.message || 'Preparing knowledge base…'}
                        </div>
                    {/if}

                {:else if !isReady && devMode}
                    <!-- Dev Mode: show the raw diagnostics so power users can debug. -->
                    <div class="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgb(245, 158, 11)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                    </div>
                    <h4 class="text-sm font-bold text-slate-700 mb-2">Study Buddy (Dev Mode)</h4>
                    <p class="text-xs text-slate-400 max-w-[280px] mb-1 leading-relaxed">
                        Phase: <span class="font-mono text-slate-600">{bootstrap.phase}</span>
                    </p>
                    <p class="text-[10px] text-slate-400 mb-2 font-mono truncate max-w-[280px]">
                        {$settingsStore.ragflowUrl || '(no url)'}
                    </p>
                    {#if bootstrap.lastError}
                        <p class="text-[10px] text-amber-600 mb-3">Error: {bootstrap.lastError}</p>
                    {/if}
                    <button
                        class="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 active:scale-[0.98] transition-all"
                        onclick={() => onopenSettings()}
                        aria-label="Open dev settings"
                    >
                        Open Dev Settings
                    </button>

                {:else}
                    <!-- Ready — Show Quick Prompts -->
                    <div class="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgb(59, 130, 246)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                        </svg>
                    </div>
                    <h4 class="text-sm font-bold text-slate-700 mb-1">Ask your Study Buddy</h4>
                    <p class="text-xs text-slate-400 max-w-[260px] mb-4 leading-relaxed">
                        Ask questions about your lecture recordings. Answers are grounded in your ingested transcripts.
                        {#if datasetName}
                            <span class="block mt-1 text-blue-500 font-semibold">Dataset: {datasetName}</span>
                        {/if}
                    </p>

                    <!-- Quick Prompt Buttons -->
                    <div class="w-full max-w-[300px] space-y-2">
                        {#each quickPrompts as prompt}
                            <button
                                class="w-full text-left px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all active:scale-[0.98] leading-relaxed"
                                onclick={() => { inputText = prompt; sendMessage(); }}
                                aria-label="Ask: {prompt}"
                            >
                                <span class="text-blue-400 mr-1.5">?</span>{prompt}
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
        {:else}
            <!-- Message List -->
            {#each messages as msg, i}
                <div class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
                    <div class="max-w-[85%] {msg.role === 'user' ? 'bg-blue-600 text-white rounded-2xl rounded-br-md shadow-blue-200' : 'bg-white text-slate-800 rounded-2xl rounded-bl-md shadow-slate-100'} px-4 py-3 shadow-md border border-slate-100/50" style="box-shadow: {msg.role === 'user' ? '0 4px 12px -2px rgba(37, 99, 235, 0.25), inset 0 2px 4px rgba(255,255,255,0.2)' : '0 4px 12px -2px rgba(0, 0, 0, 0.05), inset 0 2px 4px rgba(255,255,255,0.8)'}">
                        <p class="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                        {#if msg.role === 'assistant' && msg.chunks && msg.chunks.length > 0}
                            <button
                                class="mt-2 text-[10px] font-bold text-blue-500 uppercase tracking-wider hover:text-blue-700 transition-colors flex items-center gap-1 promax-interaction"
                                onclick={() => toggleSources(i)}
                                aria-label="{showSources === i ? 'Hide' : 'Show'} {msg.chunks.length} sources"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                                </svg>
                                {showSources === i ? 'Hide' : 'Show'} {msg.chunks.length} source{msg.chunks.length > 1 ? 's' : ''}
                            </button>

                            {#if showSources === i}
                                <div class="mt-2 space-y-2 border-t border-slate-200 pt-2">
                                    {#each msg.chunks as chunk, ci}
                                        <div class="p-2 rounded-lg bg-white/80 border border-slate-200 text-xs text-slate-600">
                                            <div class="flex items-center gap-1 mb-1">
                                                <span class="font-bold text-blue-500">#{ci + 1}</span>
                                                {#if chunk.document_name}
                                                    <span class="text-slate-400 truncate">{chunk.document_name}</span>
                                                {/if}
                                                {#if chunk.similarity}
                                                    <span class="ml-auto text-[9px] font-bold text-green-600">{(chunk.similarity * 100).toFixed(0)}%</span>
                                                {/if}
                                            </div>
                                            <p class="text-[11px] leading-relaxed line-clamp-3">{chunk.content}</p>
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        {/if}

                        {#if msg.role === 'assistant' && msg.relatedEntities && msg.relatedEntities.length > 0}
                            <div class="mt-2 flex flex-wrap gap-1">
                                {#each msg.relatedEntities.slice(0, 5) as entity}
                                    <button
                                        class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold uppercase hover:bg-blue-200 transition-colors promax-interaction"
                                        onclick={() => autoZoomToEntities([entity])}
                                        title="Zoom to '{entity}' in Knowledge Map"
                                        aria-label="Zoom to entity {entity} in knowledge graph"
                                    >
                                        {entity}
                                    </button>
                                {/each}
                            </div>
                        {/if}

                        <span class="block mt-1 text-[9px] opacity-50">{msg.timestamp}</span>
                    </div>
                </div>
            {/each}

            {#if isLoading}
                <div class="flex justify-start">
                    <div class="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                        <div class="flex items-center gap-2">
                            <div class="flex gap-1">
                                <div class="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style="animation-delay: 0ms;"></div>
                                <div class="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style="animation-delay: 150ms;"></div>
                                <div class="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style="animation-delay: 300ms;"></div>
                            </div>
                            <span class="text-[10px] text-slate-400 font-bold">Searching knowledge base...</span>
                        </div>
                    </div>
                </div>
            {/if}
        {/if}
    </div>

    <!-- ZERO_CONFIG_FINAL_POLISH_v1: Gemini-style options toolbar.
         Horizontally scrollable chip row with the eight canonical Study Buddy
         actions. Chips are presentational shortcuts — they seed the input so
         the user can confirm with Enter, keeping behaviour inside the single
         RAGFlow question-answer pipeline. -->
    <div class="border-t border-slate-100 px-3 pt-2 pb-1 bg-slate-50/50 flex-shrink-0 overflow-x-auto" style="scrollbar-width: none;">
        <div class="flex items-center gap-1.5 whitespace-nowrap">
            <button
                class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all promax-interaction disabled:opacity-40"
                onclick={() => { inputText = 'Show me my dataset and what documents are in it'; }}
                disabled={!isReady}
                aria-label="Dataset prompt"
            >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                Dataset
            </button>
            <button
                class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all promax-interaction disabled:opacity-40"
                onclick={() => { inputText = 'Start a new chat about my lecture'; }}
                disabled={!isReady}
                aria-label="Chat prompt"
            >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Chat
            </button>
            <button
                class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all promax-interaction disabled:opacity-40"
                onclick={() => { inputText = 'Search my transcripts for '; }}
                disabled={!isReady}
                aria-label="Search prompt"
            >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Search
            </button>
            <button
                class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all promax-interaction disabled:opacity-40"
                onclick={() => { inputText = 'Act as a study agent and help me review '; }}
                disabled={!isReady}
                aria-label="Agent prompt"
            >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
                Agent
            </button>
            <button
                class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all promax-interaction disabled:opacity-40"
                onclick={() => { inputText = 'What do you remember from my previous lectures?'; }}
                disabled={!isReady}
                aria-label="Memory prompt"
            >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-4"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>
                Memory
            </button>
            <button
                class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all promax-interaction disabled:opacity-40"
                onclick={() => { inputText = 'List the files in my knowledge base'; }}
                disabled={!isReady}
                aria-label="Files prompt"
            >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                File
            </button>
            <button
                class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all promax-interaction disabled:opacity-40"
                onclick={() => { inputText = 'Answer in English: '; }}
                disabled={!isReady}
                aria-label="Language prompt"
            >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                English
            </button>
            <button
                class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-semibold text-blue-600 hover:bg-blue-100 transition-all promax-interaction"
                onclick={() => onopenSettings()}
                aria-label="Create dataset prompt"
                title="Open settings to create a new dataset"
            >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Create dataset
            </button>
        </div>
    </div>

    <!-- Input Area -->
    <div class="border-t border-slate-100 p-3 bg-slate-50/50 flex-shrink-0">
        <input
            type="file"
            bind:this={fileInput}
            class="hidden"
            onchange={handleFileUpload}
            accept=".pdf,.doc,.docx,.txt,.md,.jpg,.png"
        />
        <div class="flex items-end gap-2">
            <button
                onclick={() => fileInput?.click()}
                disabled={!isReady || isLoading}
                class="flex-shrink-0 w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 transition-all promax-interaction disabled:opacity-40"
                title="Upload document to knowledge base"
                aria-label="Upload file"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
            </button>
            <textarea
                bind:value={inputText}
                onkeydown={handleKeydown}
                placeholder={isReady ? "Ask about your lectures..." : "Study Buddy is warming up — please wait..."}
                disabled={!isReady}
                class="flex-1 resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed"
                rows="1"
                style="min-height: 42px; max-height: 120px;"
                aria-label="Type your question"
            ></textarea>
            <button
                onclick={sendMessage}
                disabled={!inputText.trim() || isLoading || !isReady}
                class="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-all promax-interaction disabled:opacity-40 disabled:hover:bg-blue-600 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                title="Send message"
                aria-label="Send message"
            >
                {#if isLoading}
                    <svg class="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                {:else}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                {/if}
            </button>
        </div>
    </div>
</div>
