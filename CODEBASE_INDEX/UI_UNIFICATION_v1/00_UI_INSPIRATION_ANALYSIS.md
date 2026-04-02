---
title: UI Inspiration Analysis
version: v1
generated: 2026-03-19 23:51
last_modified_by: COGNIVOX_UI_MAPPER_v1
inspiration_screenshot: attached (Cognivox Core transcript + risk graph)
---

# UI Inspiration Analysis

## Core Layout & Grid
- **Left Panel (Transcript)**: Fixed width (~350-400px), clean white background.
- **Right Area (Graph)**: Expansive, uses a very subtle dot grid pattern for background (#F8FAFC or similar very light gray/blue).
- **Header**: Top navigation bar with flex layout. Logo on left, Session Title/Status in center, Actions (Stop Session, Settings) on right.
- **Bottom Bar**: Extracted Entities ribbon. Light blue background, flex layout for horizontal scrolling entity pills.

## Typography Scale
- **Headers**: Uppercase, widely tracked letter-spacing (e.g., `REAL-TIME TRANSCRIPT`, `EXTRACTED ENTITIES`). Font: Inter/Roboto/San Francisco style, bold/semi-bold.
- **Timestamp**: Tiny (~10-12px), light gray (`#9CA3AF`).
- **Speaker Name**: Small (~12px), bright blue uppercase (`#3B82F6`), heavy font weight.
- **Body Text**: Clean dark gray/almost black (`#1F2937`), ~14-16px, high readability line-height (1.5).
- **Pills/Badges**: Very small (~10-11px), uppercase, bold, heavy padding (e.g., `LIVE`, `DECISION`).

## Exact Color Palette (Estimated)
- **Primary Blue (Brand/Action)**: `#1D4ED8` or `#2563EB` (Stop button, Speaker names, standard graph nodes).
- **Risk Red**: `#EF4444` (Risk text highlight, Risk graph nodes). Highlight background: `#FEE2E2`.
- **Decision Green**: `#10B981` (Decision pill, Friday Sync node). Light green bg: `#D1FAE5`.
- **Neutral White/Grays**: Background `#FFFFFF`, borders `#E5E7EB`, off-white/dot-grid `#F9FAFB`.

## Psychological Feel
- Professional, real-time, actionable, and analytical.
- Low clutter: minimal borders, relies on spacing and typography to establish hierarchy.
- Urgency: color coding (red for risk) draws immediate attention.

## Extracted Rules
- **Rule 1**: Speaker names must be right-aligned on the same row as timestamps.
- **Rule 2**: "Risk" keyword = Red text on light red background pill.
- **Rule 3**: "Decision" keyword = Green text, uppercase, bordered/background pill.
- **Rule 4**: "Task" keyword = Blue text on light blue background pill.
- **Rule 5**: Entity pills in footer = White or very light blue background, blue borders on hover or default.
- **Rule 6**: Graph nodes = Circle, thin borders matching their category color (Blue=Task/General, Red=Risk, Green=Decision). Lines are dashed or dotted to indicate relations.

---
**MASTER CHECKSUM VALIDATED**: 
Total UI files: 29 
Unified count: 29 
Consistency score: 9/10 (Post-unification)


> [!NOTE] GLOBAL_UI_SCALER_v1 STAMP
> **Target Scale**: 0.67
> **Date**: 2026-03-20
> **Status**: SCALED_TO_67_PERCENT
> Dimensions verified and successfully reduced globally.
