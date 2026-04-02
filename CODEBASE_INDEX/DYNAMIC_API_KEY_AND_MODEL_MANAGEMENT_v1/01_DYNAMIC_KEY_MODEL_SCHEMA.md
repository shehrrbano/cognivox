---
title: Dynamic Key and Model Schema
version: v1
generated: 2026-03-25 15:16
last_modified_by: DYNAMIC_API_KEY_AND_MODEL_MANAGEMENT_v1
rule: Replace all hardcoded keys and fixed models with fully dynamic, user-editable system. No new files if possible — surgical changes only to existing Settings and key management files.
---

# 01_DYNAMIC_KEY_MODEL_SCHEMA

## API Key Schema (Extension of current ApiKey)

```typescript
export interface DynamicApiKey {
    id: string;              // Unique identifier (UUID or timestamp)
    name: string;            // User-friendly name
    key: string;             // The actual API key (hashed or encrypted if stored on cloud)
    priority: number;        // Higher priority keys used first (default: 0)
    isActive: boolean;       // Is the key currently active?
    isPrimary: boolean;      // Default key for new sessions
    isDisabled: boolean;     // Manually disabled?
    rateLimited: boolean;    // Currently on cooldown?
    rateLimitedUntil: number;// Expiry time for rate limit
    failCount: number;       // Number of consecutive failures
    usageCount: number;      // Total successful calls
    lastUsed: string | null; // ISO timestamp
}
```

## Model Schema

```typescript
export interface DynamicModel {
    id: string;              // Model ID (e.g. "gemini-2.0-flash")
    name: string;            // User-friendly name
    provider: 'gemini' | 'openai' | 'custom'; 
    isCustom: boolean;       // User-added?
    description?: string;
}
```

## Rotation Schema

- **Round-Robin**: Cycle through all available keys.
- **Priority-First**: Use highest priority key unless rate-limited.
- **Smart-Rotation**: Distribute load based on usage counts.
