/**
 * API Key Manager - Smart round-robin rotation with fallback
 */

export interface ApiKey {
    id: string;
    key: string;
    name: string;
    priority: number; // 0-100, higher is used first
    isActive: boolean;
    isPrimary: boolean;
    lastUsed: string | null;
    rateLimited: boolean;
    rateLimitedUntil: number | null;
    failCount: number;
    isDisabled: boolean;
    usageCount: number;
    lastError?: string;
    cooldownUntil?: number;
}

export interface KeyManagerState {
    keys: ApiKey[];
    currentIndex: number;
    shuffleMode: boolean;
    totalCalls: number;
    lastError: string | null;
    lastRotationReason?: string;
}

const STORAGE_KEY = "gemini_api_keys_v2";
const STATE_KEY = "key_manager_state";
const RATE_LIMIT_COOLDOWN_MS = 60000; // 1 minute cooldown after rate limit
const QUOTA_EXHAUSTED_COOLDOWN_MS = 300000; // 5 minutes for quota exhaustion (was 1 hour - too aggressive)
const CONNECTION_TIMEOUT_MS = 12000; // 12 second timeout (was 3s - too short for cold starts)
const MAX_FAIL_COUNT = 5; // More tolerant before disabling

class ApiKeyManager {
    private state: KeyManagerState = {
        keys: [],
        currentIndex: 0,
        shuffleMode: false,
        totalCalls: 0,
        lastError: null
    };

    private listeners: Set<(state: KeyManagerState) => void> = new Set();

    constructor() {
        this.loadState();
    }

    // === STATE MANAGEMENT ===

    private loadState() {
        try {
            // Load keys
            const storedKeys = localStorage.getItem(STORAGE_KEY);
            if (storedKeys) {
                this.state.keys = JSON.parse(storedKeys);
            }

            // Migrate from old format if needed
            const oldKeys = localStorage.getItem("gemini_api_keys");
            if (oldKeys && this.state.keys.length === 0) {
                const oldFormat = JSON.parse(oldKeys);
                this.state.keys = oldFormat.map((k: any, i: number) => ({
                    ...k,
                    priority: k.priority || 0,
                    isPrimary: i === 0,
                    failCount: 0,
                    isDisabled: false,
                    usageCount: 0,
                    rateLimitedUntil: null
                }));
                this.saveState();
                localStorage.removeItem("gemini_api_keys");
            }

            // Load state
            const storedState = localStorage.getItem(STATE_KEY);
            if (storedState) {
                const parsed = JSON.parse(storedState);
                this.state.currentIndex = parsed.currentIndex || 0;
                this.state.shuffleMode = parsed.shuffleMode || false;
                this.state.totalCalls = parsed.totalCalls || 0;
            }

            // Validate current index
            if (this.state.currentIndex >= this.state.keys.length) {
                this.state.currentIndex = 0;
            }
        } catch (e) {
            console.error("[KeyManager] Failed to load state:", e);
        }
    }

    private saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state.keys));
            localStorage.setItem(STATE_KEY, JSON.stringify({
                currentIndex: this.state.currentIndex,
                shuffleMode: this.state.shuffleMode,
                totalCalls: this.state.totalCalls
            }));
        } catch (e) {
            console.error("[KeyManager] Failed to save state:", e);
        }
    }

    // === KEY MANAGEMENT ===

    addKey(key: string, name?: string, priority: number = 0): ApiKey {
        const newKey: ApiKey = {
            id: `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            key: key.trim(),
            name: name?.trim() || `Key ${this.state.keys.length + 1}`,
            priority,
            isActive: this.state.keys.length === 0,
            isPrimary: this.state.keys.length === 0,
            lastUsed: null,
            rateLimited: false,
            rateLimitedUntil: null,
            failCount: 0,
            isDisabled: false,
            usageCount: 0
        };

        this.state.keys.push(newKey);
        this.saveState();
        this.notifyListeners();

        console.log(`[KeyManager] Added key: ${newKey.name} (${this.state.keys.length} total)`);
        return newKey;
    }

    removeKey(id: string) {
        const index = this.state.keys.findIndex(k => k.id === id);
        if (index === -1) return;

        const wasPrimary = this.state.keys[index].isPrimary;
        this.state.keys = this.state.keys.filter(k => k.id !== id);

        // If we removed the current key, adjust index
        if (this.state.currentIndex >= this.state.keys.length) {
            this.state.currentIndex = Math.max(0, this.state.keys.length - 1);
        }

        // If we removed primary, make first key primary
        if (wasPrimary && this.state.keys.length > 0) {
            this.state.keys[0].isPrimary = true;
        }

        this.saveState();
        this.notifyListeners();
    }

    updateKeyPriority(id: string, priority: number) {
        const key = this.state.keys.find(k => k.id === id);
        if (key) {
            key.priority = priority;
            this.saveState();
            this.notifyListeners();
        }
    }

    updateKeyName(id: string, name: string) {
        const key = this.state.keys.find(k => k.id === id);
        if (key) {
            key.name = name.trim();
            this.saveState();
            this.notifyListeners();
        }
    }

    getKeys(): ApiKey[] {
        return [...this.state.keys];
    }

    getKeyCount(): number {
        return this.state.keys.length;
    }

    getActiveKeyCount(): number {
        return this.state.keys.filter(k => !k.isDisabled && !this.isRateLimited(k)).length;
    }

    // === ROTATION LOGIC ===

    /**
     * Get the next available key for an API call
     * Implements round-robin with smart fallback
     */
    getNextKey(): ApiKey | null {
        // First, refresh states to clear any expired cooldowns
        this.refreshKeyStates();

        if (this.state.keys.length === 0) return null;

        const availableKeys = this.state.keys
            .map((k, i) => ({ key: k, index: i }))
            .filter(({ key }) => !key.isDisabled && !this.isRateLimited(key))
            .sort((a, b) => (b.key.priority || 0) - (a.key.priority || 0)); // Priority first

        if (availableKeys.length === 0) {
            // All keys exhausted - try primary as last resort
            const primary = this.state.keys.find(k => k.isPrimary && !k.isDisabled);
            if (primary) {
                console.warn("[KeyManager] All keys rate-limited, using primary as fallback");
                return primary;
            }
            console.error("[KeyManager] No available keys!");
            return null;
        }

        let nextKey: ApiKey;
        let nextIndex: number;

        if (this.state.shuffleMode) {
            // Random selection from available keys
            const randomIdx = Math.floor(Math.random() * availableKeys.length);
            nextKey = availableKeys[randomIdx].key;
            nextIndex = availableKeys[randomIdx].index;
        } else {
            // Round-robin: find next available starting from current
            let found = false;
            for (let i = 0; i < this.state.keys.length; i++) {
                const checkIndex = (this.state.currentIndex + i) % this.state.keys.length;
                const key = this.state.keys[checkIndex];
                if (!key.isDisabled && !this.isRateLimited(key)) {
                    nextKey = key;
                    nextIndex = checkIndex;
                    found = true;
                    break;
                }
            }
            if (!found) {
                nextKey = availableKeys[0].key;
                nextIndex = availableKeys[0].index;
            }
        }

        // Update state
        this.state.currentIndex = (nextIndex! + 1) % this.state.keys.length;
        nextKey!.usageCount++;
        nextKey!.lastUsed = new Date().toISOString();
        nextKey!.isActive = true;

        // Deactivate others
        this.state.keys.forEach((k, i) => {
            if (i !== nextIndex) k.isActive = false;
        });

        this.state.totalCalls++;
        this.saveState();
        this.notifyListeners();

        console.log(`[KeyManager] Using key: ${nextKey!.name} (${nextIndex! + 1}/${this.state.keys.length})`);
        return nextKey!;
    }

    /**
     * Get current active key without rotating
     */
    getCurrentKey(): ApiKey | null {
        const active = this.state.keys.find(k => k.isActive && !k.isDisabled);
        if (active) return active;

        // Fallback to first available
        return this.state.keys.find(k => !k.isDisabled && !this.isRateLimited(k)) || null;
    }

    getCurrentKeyInfo(): { name: string; index: number; total: number } | null {
        const current = this.getCurrentKey();
        if (!current) return null;

        const index = this.state.keys.findIndex(k => k.id === current.id);
        return {
            name: current.name,
            index: index + 1,
            total: this.state.keys.length
        };
    }

    // === ERROR HANDLING ===

    /**
     * Handle API error and switch keys if needed
     * Returns true if switched to new key, false if no more keys available
     */
    handleError(errorCode: number, errorMessage?: string): { switched: boolean; newKey: ApiKey | null; message: string } {
        const current = this.getCurrentKey();
        if (!current) {
            return { switched: false, newKey: null, message: "No keys available" };
        }

        const isRateLimit = errorCode === 429 ||
            (errorMessage?.includes("RATE_LIMITED:"));
        const isQuotaExhausted = errorMessage?.includes("RESOURCE_EXHAUSTED") ||
            (errorCode === 403 && errorMessage?.toLowerCase().includes("quota"));
        const isServerError = errorCode >= 500 && errorCode < 600;
        // Don't treat 403 as auth error if it's actually quota exhaustion
        const isAuthError = (errorCode === 401) ||
            (errorCode === 403 && !isQuotaExhausted);

        current.lastError = errorMessage || `Error ${errorCode}`;

        if (isRateLimit) {
            current.rateLimited = true;
            current.rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
            current.failCount++;
            this.state.lastRotationReason = `Rate limit on ${current.name}`;
            console.warn(`[KeyManager] Rate limit on ${current.name}, cooldown for ${RATE_LIMIT_COOLDOWN_MS / 1000}s`);
        } else if (isQuotaExhausted) {
            current.rateLimited = true;
            current.rateLimitedUntil = Date.now() + QUOTA_EXHAUSTED_COOLDOWN_MS;
            current.failCount++;
            this.state.lastRotationReason = `Quota exhausted on ${current.name}`;
            console.warn(`[KeyManager] Quota exhausted on ${current.name}, cooldown for ${QUOTA_EXHAUSTED_COOLDOWN_MS / 1000}s`);
        } else if (isAuthError) {
            // Don't immediately disable - just increment fail count
            current.failCount++;
            this.state.lastRotationReason = `Auth error on ${current.name}`;
            console.warn(`[KeyManager] Auth error on ${current.name}, fail count: ${current.failCount}`);
        } else if (isServerError) {
            current.failCount++;
            this.state.lastRotationReason = `Server error on ${current.name}`;
        }

        if (current.failCount >= MAX_FAIL_COUNT && !current.isPrimary) {
            current.isDisabled = true;
            console.warn(`[KeyManager] Key ${current.name} disabled after ${MAX_FAIL_COUNT} failures`);
        }

        this.state.lastError = `${errorCode}: ${errorMessage || 'Unknown error'}`;
        this.saveState();

        const nextKey = this.getNextKey();
        if (nextKey && nextKey.id !== current.id) {
            const message = isRateLimit ? `Rate limit hit on ${current.name} – switching to ${nextKey.name}` :
                isQuotaExhausted ? `Quota exhausted on ${current.name} – switching to ${nextKey.name}` :
                    `Error on ${current.name} – switching to ${nextKey.name}`;

            this.notifyListeners();
            return { switched: true, newKey: nextKey, message };
        }

        this.notifyListeners();
        return { switched: false, newKey: null, message: `All keys exhausted or unavailable` };
    }

    /**
     * Report successful API call - reset fail count
     */
    reportSuccess() {
        const current = this.getCurrentKey();
        if (current) {
            current.failCount = 0;
            current.rateLimited = false;
            current.rateLimitedUntil = null;
            this.saveState();
        }
    }

    private isRateLimited(key: ApiKey): boolean {
        if (!key.rateLimited) return false;
        if (!key.rateLimitedUntil) return false;

        if (Date.now() >= key.rateLimitedUntil) {
            // Cooldown expired - clear rate limit and re-enable
            key.rateLimited = false;
            key.rateLimitedUntil = null;
            key.failCount = 0; // Reset fail count after cooldown
            if (key.isDisabled && !key.isPrimary) {
                key.isDisabled = false; // Re-enable after cooldown
                console.log(`[KeyManager] ${key.name} cooldown expired - re-enabled`);
            }
            return false;
        }

        return true;
    }

    /**
     * Refresh all key states - clear expired cooldowns and re-enable disabled keys
     * Call this before any key operation to ensure fresh state
     */
    refreshKeyStates(): void {
        const now = Date.now();
        let changed = false;

        this.state.keys.forEach(key => {
            // Clear expired rate limits AND re-enable the key
            if (key.rateLimitedUntil && now >= key.rateLimitedUntil) {
                key.rateLimited = false;
                key.rateLimitedUntil = null;
                key.failCount = 0;
                key.isDisabled = false; // RE-ENABLE when rate limit expires!
                changed = true;
                console.log(`[KeyManager] ${key.name} rate limit expired - re-enabled`);
            }

            // Clear expired quota cooldowns AND re-enable the key
            if (key.cooldownUntil && now >= key.cooldownUntil) {
                key.cooldownUntil = undefined;
                key.failCount = 0;
                key.isDisabled = false; // RE-ENABLE when quota cooldown expires!
                changed = true;
                console.log(`[KeyManager] ${key.name} quota cooldown expired - re-enabled`);
            }

            // Also re-enable keys that are disabled but have no active cooldowns
            // (this catches keys that were disabled manually or by old logic)
            if (key.isDisabled && !key.rateLimited && !key.rateLimitedUntil && !key.cooldownUntil) {
                key.isDisabled = false;
                key.failCount = 0;
                changed = true;
                console.log(`[KeyManager] ${key.name} re-enabled (no active cooldowns)`);
            }
        });

        if (changed) {
            this.saveState();
            this.notifyListeners();
        }
    }

    /**
     * Force reset all key cooldowns (user action)
     */
    resetAllCooldowns(): void {
        this.state.keys.forEach(key => {
            key.rateLimited = false;
            key.rateLimitedUntil = null;
            key.cooldownUntil = undefined;
            key.isDisabled = false;
            key.failCount = 0;
        });
        this.saveState();
        this.notifyListeners();
        console.log("[KeyManager] All key cooldowns reset");
    }

    // === SETTINGS ===

    setShuffleMode(enabled: boolean) {
        this.state.shuffleMode = enabled;
        this.saveState();
        this.notifyListeners();
    }

    isShuffleMode(): boolean {
        return this.state.shuffleMode;
    }

    // === LISTENERS ===

    subscribe(listener: (state: KeyManagerState) => void): () => void {
        this.listeners.add(listener);
        listener(this.state);
        return () => this.listeners.delete(listener);
    }

    private notifyListeners() {
        this.listeners.forEach(l => l({ ...this.state }));
    }

    getState(): KeyManagerState {
        return { ...this.state };
    }

    // === UTILITIES ===

    maskKey(key: string): string {
        if (key.length <= 8) return "••••••••";
        return key.slice(0, 4) + "••••••••" + key.slice(-4);
    }

    /**
     * SMART: Find the next working key before recording starts.
     * Does NOT make API calls to avoid burning quota on pre-checks.
     * Just picks the first key that isn't on cooldown.
     * The real validation happens in the Rust backend on first actual use.
     */
    async getNextWorkingKeyFast(): Promise<{ success: boolean; key?: ApiKey; message: string }> {
        // Refresh key states to clear any expired cooldowns
        this.refreshKeyStates();

        const allKeys = this.state.keys;

        if (allKeys.length === 0) {
            return { success: false, message: "No API keys configured" };
        }

        // Find keys that are available (not rate-limited, not disabled)
        const availableKeys = allKeys.filter(k => !k.isDisabled && !this.isRateLimited(k));

        console.log(`[KeyManager] Available keys: ${availableKeys.length}/${allKeys.length}`);

        if (availableKeys.length > 0) {
            // Pick the best available key (prefer primary, then round-robin)
            const primaryKey = availableKeys.find(k => k.isPrimary);
            const selectedKey = primaryKey || availableKeys[0];

            // Activate it
            selectedKey.isActive = true;
            this.state.keys.forEach(other => { if (other.id !== selectedKey.id) other.isActive = false; });
            this.state.currentIndex = this.state.keys.findIndex(x => x.id === selectedKey.id);
            this.saveState();
            this.notifyListeners();

            console.log(`[KeyManager] Selected key: ${selectedKey.name} (no pre-test, saves quota)`);
            return { success: true, key: selectedKey, message: `Using ${selectedKey.name}` };
        }

        // All keys are on cooldown - check if any cooldowns are about to expire
        const soonestExpiry = allKeys
            .filter(k => !k.isDisabled)
            .map(k => k.rateLimitedUntil || k.cooldownUntil || Infinity)
            .reduce((min, v) => Math.min(min, v ?? Infinity), Infinity);

        const waitMs = soonestExpiry - Date.now();

        if (waitMs > 0 && waitMs <= 30000) {
            // A key will be available within 30 seconds - wait for it
            console.log(`[KeyManager] Waiting ${(waitMs / 1000).toFixed(0)}s for key cooldown to expire...`);
            await new Promise(resolve => setTimeout(resolve, waitMs + 500));
            this.refreshKeyStates();

            const nowAvailable = this.state.keys.filter(k => !k.isDisabled && !this.isRateLimited(k));
            if (nowAvailable.length > 0) {
                const key = nowAvailable[0];
                key.isActive = true;
                this.state.keys.forEach(other => { if (other.id !== key.id) other.isActive = false; });
                this.state.currentIndex = this.state.keys.findIndex(x => x.id === key.id);
                this.saveState();
                this.notifyListeners();
                console.log(`[KeyManager] Key ${key.name} now available after cooldown`);
                return { success: true, key, message: `Using ${key.name} (after cooldown)` };
            }
        }

        // If ALL keys are genuinely disabled (not just on cooldown), reset them
        // This handles stale state from previous sessions
        const onlyDisabled = allKeys.every(k => k.isDisabled);
        if (onlyDisabled) {
            console.log(`[KeyManager] All keys disabled - resetting stale state`);
            this.resetAllCooldowns();
            const resetKey = this.state.keys[0];
            resetKey.isActive = true;
            this.saveState();
            this.notifyListeners();
            return { success: true, key: resetKey, message: `Using ${resetKey.name} (reset stale state)` };
        }

        // All keys genuinely rate-limited with long cooldowns
        return { success: false, message: `All API keys are on cooldown. Next available in ${Math.ceil(waitMs / 1000)}s.` };
    }

    /**
     * SMART: Rotate to next key after each API call (for load distribution)
     */
    rotateToNextKey(): ApiKey | null {
        const available = this.state.keys.filter(k => !k.isDisabled && !this.isRateLimited(k));

        if (available.length <= 1) {
            return available[0] || null; // No rotation possible
        }

        // Move to next available key
        const currentIdx = this.state.currentIndex;
        let nextIdx = (currentIdx + 1) % this.state.keys.length;

        // Find next available (skip disabled/rate-limited)
        for (let i = 0; i < this.state.keys.length; i++) {
            const candidate = this.state.keys[nextIdx];
            if (!candidate.isDisabled && !this.isRateLimited(candidate)) {
                this.state.currentIndex = nextIdx;
                candidate.isActive = true;
                this.state.keys.forEach((k, idx) => { if (idx !== nextIdx) k.isActive = false; });
                this.saveState();
                this.notifyListeners();

                console.log(`[KeyManager] Rotated to: ${candidate.name} (${nextIdx + 1}/${this.state.keys.length})`);
                return candidate;
            }
            nextIdx = (nextIdx + 1) % this.state.keys.length;
        }

        return null;
    }

    /**
     * Test a specific API key against Gemini API (with 3s timeout for fast feedback)
     */
    async testConnection(key: string): Promise<{ success: boolean; message: string; statusCode?: number }> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT_MS);

        try {
            console.log(`[KeyManager] Testing connection (timeout: ${CONNECTION_TIMEOUT_MS}ms)...`);

            // Use models.list endpoint first - it's lightweight and doesn't consume quota
            const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {
                method: "GET",
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (listResponse.ok) {
                console.log("[KeyManager] Connection successful (models.list OK)!");
                return { success: true, message: "Connected", statusCode: 200 };
            }

            // Parse the actual error body to understand what's wrong
            const errorBody = await listResponse.json().catch(() => ({}));
            const errorMsg = errorBody?.error?.message || `HTTP ${listResponse.status}`;
            const errorStatus = errorBody?.error?.status || '';
            console.warn(`[KeyManager] Test failed: HTTP ${listResponse.status} - ${errorMsg} (status: ${errorStatus})`);

            if (listResponse.status === 429) {
                return { success: false, message: `Rate limited: ${errorMsg}`, statusCode: 429 };
            } else if (listResponse.status === 403) {
                // IMPORTANT: Distinguish between quota exhaustion and other 403 errors
                const isQuota = errorMsg.toLowerCase().includes('quota') ||
                    errorMsg.toLowerCase().includes('resource_exhausted') ||
                    errorStatus === 'RESOURCE_EXHAUSTED';
                if (isQuota) {
                    return { success: false, message: `Quota exhausted: ${errorMsg}`, statusCode: 403 };
                }
                // Other 403 = permission issue, NOT quota
                return { success: false, message: `Permission denied: ${errorMsg}`, statusCode: 403 };
            } else if (listResponse.status === 400) {
                // 400 with valid key just means bad request format - key itself is fine
                return { success: true, message: "Key valid (400 on test)", statusCode: 200 };
            } else {
                return { success: false, message: errorMsg, statusCode: listResponse.status };
            }
        } catch (e: any) {
            clearTimeout(timeoutId);
            if (e.name === 'AbortError') {
                console.error(`[KeyManager] Timed out after ${CONNECTION_TIMEOUT_MS / 1000}s`);
                // Timeout doesn't mean key is bad - could be slow network
                return { success: false, message: `Timeout (${CONNECTION_TIMEOUT_MS / 1000}s) - key may still work` };
            }
            console.error("[KeyManager] Network error:", e.message);
            return { success: false, message: `Network error: ${e.message}` };
        }
    }

    /**
     * Automatically validate saved keys on startup
     */
    async validateOnStartup(): Promise<{ success: boolean; key?: ApiKey; message: string }> {
        // Reset all cooldowns on startup - fresh start
        this.resetAllCooldowns();

        const keys = this.state.keys.filter(k => !k.isDisabled);
        if (keys.length === 0) return { success: false, message: "No keys found" };

        // Try primary first, then others
        const primary = keys.find(k => k.isPrimary) || keys[0];
        console.log(`[KeyManager] Validating primary key: ${primary.name}`);

        const result = await this.testConnection(primary.key);
        if (result.success) {
            primary.isActive = true;
            this.state.keys.forEach(k => { if (k.id !== primary.id) k.isActive = false; });
            this.saveState();
            this.notifyListeners();
            return { success: true, key: primary, message: "Primary key connected" };
        }

        // Broad fallback: just find any working key
        for (const k of keys) {
            if (k.id === primary.id) continue;
            console.log(`[KeyManager] Validating fallback key: ${k.name}`);
            const res = await this.testConnection(k.key);
            if (res.success) {
                k.isActive = true;
                this.state.keys.forEach(other => { if (other.id !== k.id) other.isActive = false; });
                this.saveState();
                this.notifyListeners();
                return { success: true, key: k, message: `Connected to ${k.name}` };
            }
        }

        return { success: false, message: "All keys failed validation" };
    }

    reset() {
        this.state = {
            keys: [],
            currentIndex: 0,
            shuffleMode: false,
            totalCalls: 0,
            lastError: null
        };
        this.saveState();
        this.notifyListeners();
    }
}

// Singleton instance
export const keyManager = new ApiKeyManager();
