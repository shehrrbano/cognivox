---
title: Batch2ExactStyleTransferAdapter
version: v1
generated: 2026-03-20 03:48
last_modified_by: INTELLIGENT_UI_MAPPING_MASTER_BATCH2_v1
current_app_image: attached (Meeting Mind UI with Recent Sessions, Gemini Conduit, Transcription after pixel-perfect fix)
inspiration_images: 4 attached (Decision Ledger chronological cards, Project Overview dashboard, Multi-Index Search results, Analytics Dashboard with sentiment/emotional pulse charts)
previous_audits_linked: PIXEL_PERFECT_AUDIT_v1 + GLOBAL_SCALE_REDUCTION_v1 (0.67 already applied)
---

# Sub-Agent: Batch2ExactStyleTransferAdapter

## Style Extraction Rules (Scaled 0.67)

### 1. Decision Ledger (Image 1)
- **Top Header**: Simple `.text-fluid-xl` "Decision Ledger" title, plus blue `.bg-blue-600` "+ Log New Decision" button.
- **Filter Bar**: `h-10 text-[10px]` inputs and `bg-blue-100 text-blue-600` primary active chip (`All Categories`).
- **Cards**: `p-4 my-3 bg-white border border-gray-100 rounded-xl shadow-sm`.
- **Card State Tags**: `Finalized` (`bg-green-100 text-green-700`), `Reviewing` (`bg-blue-50 text-blue-600`), `Archived` (`bg-yellow-100 text-yellow-700`).
- **Stakeholders**: Flex row of `w-6 h-6 rounded-full` avatars with names `text-[10px]`. 

### 2. Project Overview (Image 2)
- **KPI Cards**: 4 top cards with white bg, `text-2xl` bold numbers. Warning state with red `text-red-500 bg-red-50`.
- **Timeline**: Horizontal stepper. Active nodes `border-[3px] border-blue-400 fill-white`.
- **Priority Risks**: Colored left-border cards. Red `border-l-4 border-red-500`, Orange `border-orange-400`, Blue `border-blue-400`.
- **Mitigation Table**: Alternating rows, clean table format with exact Tailwind classes mapping to the 0.67 scale.

### 3. Analytics Dashboard (Image 3)
- **Top KPIs**: 3 cards, green `+12%` pill vs gray `Steady` pill.
- **Emotion Line Chart**: Minimal axes, deep blue smooth SVG line `stroke-blue-500 stroke-2`.
- **Speaker Dominance**: Progress bars with `bg-blue-500` and thin `h-1.5`.
- **Emotional Pulse**: Bar chart with varying shades of blue blocks `bg-blue-400`.

### 4. Multi-Index Search (Image 4)
- **Search Bar**: Centered large input `h-12 w-full text-fluid-base`.
- **Tabs**: `All Entities` button with blue background, others with white background `border border-gray-200`.
- **Results**: White cards, score badge `bg-gray-100 text-gray-500`, exact icon sizing `w-4 h-4`. Blue highlighted matches `text-blue-500 font-bold`.
