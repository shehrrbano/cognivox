# UI/UX ProMax Audit and Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the full UI/UX ProMax skill checklist to every element in the Cognivox codebase, transforming it into a premium, student-friendly, and psychologically optimized "Study Buddy" interface.

**Architecture:**
1.  **Global Design System**: Enhance `src/app.css` with ProMax-level interactions (smooth scroll, improved focus rings, active scaling, and fluid typography refinements).
2.  **Psychological Theme Alignment**: Inject "Calm Blue" and "Soft UI" principles (Claymorphism-inspired depth) into the global theme tokens.
3.  **Component Audit & Patch**: Surgically upgrade every Svelte component in `src/lib` to include missing hover/active states, ARIA labels, and touch targets.

**Tech Stack**: Svelte 5 (Runes), Tailwind CSS, Rust (Tauri Backend).

---

### Task 1: ProMax Global Style Infrastructure

**Files:**
- Modify: `src/app.css`
- Modify: `src/routes/+layout.svelte`

- [ ] **Step 1: Apply Global ProMax Utility Enhancements**
  Update `src/app.css` to add smooth scrolling, improved focus rings, and a universal `active:scale-95` utility.

```css
/* src/app.css updates */
html {
  scroll-behavior: smooth; /* ProMax guideline 1 */
}

:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}

@layer utilities {
  .promax-interaction {
    @apply transition-all duration-200 active:scale-95;
  }
  .soft-glass {
    @apply bg-white/70 backdrop-blur-md border border-white/20 shadow-xl shadow-slate-900/5;
  }
}
```

- [ ] **Step 2: Commit global styles**
```bash
git add src/app.css
git commit -m "style: add ProMax global interaction and glass utilities"
```

---

### Task 2: Navigation & Branding Audit (Sidebar & MainHeader)

**Files:**
- Modify: `src/lib/Sidebar.svelte`
- Modify: `src/lib/MainHeader.svelte`

- [ ] **Step 1: Upgrade Sidebar Navigation buttons**
  Apply `.promax-interaction` and add `aria-label` to every nav button. Use "Calm Blue" active states.

```html
<!-- src/lib/Sidebar.svelte sample change -->
<button
    class="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 promax-interaction group {activeTab === tab.id ? 'bg-blue-600 shadow-lg shadow-blue-500/20 text-white' : 'text-slate-500 hover:bg-blue-50/50 hover:text-blue-600'}"
    onclick={() => handleTabChange(tab.id)}
    aria-label="Switch to {tab.label}"
>
```

- [ ] **Step 2: Enhance MainHeader Controls**
  Ensure record button and settings button have 44px touch targets and clear active states.

```html
<!-- src/lib/MainHeader.svelte sample change -->
<button class="icon-btn promax-interaction min-h-[44px] min-w-[44px] flex items-center justify-center" onclick={openSettings} aria-label="Open Settings">
```

- [ ] **Step 3: Commit navigation upgrades**
```bash
git add src/lib/Sidebar.svelte src/lib/MainHeader.svelte
git commit -m "ux: upgrade sidebar and header to ProMax standards (interaction + accessibility)"
```

---

### Task 3: "Study Buddy" Chat & Interaction Audit

**Files:**
- Modify: `src/lib/RAGFlowChat.svelte`
- Modify: `src/lib/TranscriptView.svelte`

- [ ] **Step 1: Soften Chat Bubbles and Streaming UI**
  Apply Claymorphism depth to chat bubbles and ensure smooth "typing" indicators.

```html
<!-- src/lib/RAGFlowChat.svelte -->
<div class="p-4 rounded-2xl soft-glass {msg.role === 'user' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white shadow-slate-100'}" style="box-shadow: inset 0 2px 4px rgba(255,255,255,0.3), 0 10px 15px -3px rgba(0,0,0,0.1)">
```

- [ ] **Step 2: Accessibility & Success Feedback in TranscriptView**
  Add "Copy to Clipboard" feedback and clear heading hierarchy.

- [ ] **Step 3: Commit chat upgrades**
```bash
git add src/lib/RAGFlowChat.svelte src/lib/TranscriptView.svelte
git commit -m "ux: apply Soft UI and Claymorphism to Study Buddy chat and transcript view"
```

---

### Task 4: Responsive Justification & Final Integration

**Files:**
- Modify: `src/routes/+page.svelte`
- Modify: `CODEBASE_INDEX/00_OVERVIEW.md`

- [ ] **Step 1: Audit main layout container responsiveness**
  Ensure no horizontal scroll on 375px and correct padding for mobile status bars.

- [ ] **Step 2: Update the Brain**
  Update `./CODEBASE_INDEX/UI_UX_PROMAX_FULL_AUDIT_v1/` docs to reflect the completed audit.

- [ ] **Step 3: Commit final integration**
```bash
git add src/routes/+page.svelte CODEBASE_INDEX/
git commit -m "docs: finalize UI/UX ProMax audit and upgrade Brain"
```

---

## Execution Handoff

**Plan complete. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
