---
title: Continuity Guard Report
version: v1
generated: 2026-03-19 08:45
last_modified_by: CODEBASE_INDEXER_v1
---

# Continuity Guard Protocol

## Mission
To ensure that the knowledge and structural integrity captured in this index persists across sessions and among different engineering agents.

## Agent Self-Verification Checklist
Before an agent considers their work "compatible" with this codebase, they MUST:
1. [ ] Check `01_FILE_INVENTORY.md` for existing structure.
2. [ ] Verify new logic against `02_CONNECTION_MAP.md` to avoid architectural drift.
3. [ ] If adding/modifying files, update/create the corresponding report in `CODEBASE_INDEX/FILES/`.
4. [ ] Ensure no "RED" files are left in the `03_FUNCTIONALITY_AUDIT.md`.

## Index Update Protocol
- **Minor Changes**: Update the `Stats` and `Critical Sections` in the individual file report.
- **Major Features**: Update `00_OVERVIEW.md` and `02_CONNECTION_MAP.md`.
- **Structural Changes**: Rerun the `FileScanner` logic and update `01_FILE_INVENTORY.md`.

## Regenerate Index Command Template
> "Run CODEBASE_INDEXER_v1 protocol to audit and document the current state of the repository."
