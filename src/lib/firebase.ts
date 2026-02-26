// ============================================================================
// FIREBASE CONFIGURATION - Google Cloud Firestore for Session Storage
// ============================================================================
// This module initializes Firebase and provides Firestore + Auth instances.
// Sessions are stored in Google Cloud Firestore instead of local files,
// demonstrating Google ecosystem integration.
// ============================================================================

import { initializeApp, type FirebaseApp } from "firebase/app";
import {
    getFirestore,
    type Firestore,
} from "firebase/firestore";
import {
    getAuth,
    signInWithCredential,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    type Auth,
    type User,
} from "firebase/auth";
import { invoke } from "@tauri-apps/api/core";

// ============================================================================
// FIREBASE CONFIG
// ============================================================================
// IMPORTANT: You must create a Firebase project and replace these values.
//
// Steps:
// 1. Go to https://console.firebase.google.com/
// 2. Click "Create a project" (or use an existing one)
// 3. Add a Web App (click the </> icon)
// 4. Copy the firebaseConfig object and paste it below
// 5. Enable Firestore Database (Build > Firestore Database > Create database)
// 6. Enable Authentication (Build > Authentication > Get started)
//    - Enable "Google" sign-in provider
//    - Add your email (bscs23f05@namal.edu.pk) as an authorized user
// 7. Set Firestore rules to allow authenticated users:
//    rules_version = '2';
//    service cloud.firestore {
//      match /databases/{database}/documents {
//        match /sessions/{sessionId} {
//          allow read, write: if request.auth != null
//                             && request.auth.token.email == resource.data.userEmail;
//          allow create: if request.auth != null;
//        }
//      }
//    }
// ============================================================================

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// ============================================================================
// INITIALIZATION
// ============================================================================

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let initialized = false;

export function initFirebase(): { app: FirebaseApp; db: Firestore; auth: Auth } {
    if (initialized) {
        return { app, db, auth };
    }

    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    // NOTE: IndexedDB persistence DISABLED.
    // It was causing stale cached reads — sessions loaded with 0 transcripts
    // because the cache had old data from before transcripts were saved.
    // All reads now go directly to the Firestore server for fresh data.

    initialized = true;
    console.log("[Firebase] Initialized with project:", firebaseConfig.projectId);
    return { app, db, auth };
}

export function getDb(): Firestore {
    if (!initialized) initFirebase();
    return db;
}

export function getAuthInstance(): Auth {
    if (!initialized) initFirebase();
    return auth;
}

// ============================================================================
// AUTHENTICATION - Desktop OAuth Flow
// ============================================================================
// Tauri webview blocks popups, so we use the standard desktop OAuth flow:
// 1. Rust opens the system browser for Google sign-in
// 2. User authenticates in their real browser (no popup issues)
// 3. Google redirects to a temporary localhost server in Rust
// 4. Rust exchanges the auth code for a Google ID token
// 5. Frontend uses signInWithCredential() with that token
// ============================================================================

/**
 * Sign in with Google via desktop OAuth flow (system browser)
 * This avoids the auth/popup-blocked error in Tauri's webview
 */
export async function signInWithGoogle(): Promise<User> {
    const authInstance = getAuthInstance();

    console.log("[Firebase Auth] Starting desktop OAuth flow...");

    // Step 1: Call the Rust backend to handle the OAuth flow
    // This opens the system browser, captures the auth code, and returns tokens
    const oauthResult: { id_token: string; access_token: string; email: string | null } =
        await invoke("start_google_oauth");

    console.log("[Firebase Auth] Got OAuth tokens, signing into Firebase...");

    // Step 2: Create a Firebase credential from the Google ID token
    const credential = GoogleAuthProvider.credential(
        oauthResult.id_token,
        oauthResult.access_token
    );

    // Step 3: Sign into Firebase with the credential
    const result = await signInWithCredential(authInstance, credential);

    console.log("[Firebase Auth] Signed in as:", result.user.email);
    return result.user;
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
    const authInstance = getAuthInstance();
    await firebaseSignOut(authInstance);
    console.log("[Firebase Auth] Signed out");
}

/**
 * Get the current authenticated user (or null)
 */
export function getCurrentUser(): User | null {
    const authInstance = getAuthInstance();
    return authInstance.currentUser;
}

/**
 * Wait for Firebase Auth to restore the session (resolves with user or null).
 * Call this once at startup before accessing getCurrentUser().
 */
export function waitForAuth(timeoutMs = 5000): Promise<User | null> {
    const authInstance = getAuthInstance();
    // If already resolved, return immediately
    if (authInstance.currentUser) return Promise.resolve(authInstance.currentUser);

    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            unsub();
            resolve(null);
        }, timeoutMs);

        const unsub = onAuthStateChanged(authInstance, (user) => {
            clearTimeout(timer);
            unsub();
            resolve(user);
        });
    });
}

/**
 * Subscribe to auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
    const authInstance = getAuthInstance();
    return onAuthStateChanged(authInstance, callback);
}

/**
 * Check if Firebase is properly configured (not using placeholder values)
 */
export function isFirebaseConfigured(): boolean {
    return (
        !!firebaseConfig.apiKey &&
        !!firebaseConfig.projectId &&
        firebaseConfig.apiKey !== "YOUR_API_KEY" &&
        firebaseConfig.projectId !== "YOUR_PROJECT_ID"
    );
}
