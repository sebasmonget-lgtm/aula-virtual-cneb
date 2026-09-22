# Update checklist

Use this process whenever MINEDU publishes or modifies a relevant source.

1. Register the source with URL, date, authority rank, temporal scope and hash if a canonical PDF is acquired.
2. Determine whether it is normative, curricular, stable guidance or year-specific overlay.
3. Compare it offline with the current canonical rules. Do not send unresolved contradictions to runtime AI.
4. Add a `resolved_conflicts` entry for every material conflict and choose the winning rule using `source_priority.json`.
5. Update official canonical names/IDs only when the authoritative curricular source supports the change; retain old names as aliases.
6. Rebuild competency/age cards and retrieval units.
7. Run benchmark cases and add regression fixtures for any changed decision boundary.
8. Increment semantic version:
   - patch: wording/retrieval metadata, no meaning change
   - minor: new official guidance/source or new knowledge units
   - major: curriculum structure/IDs or incompatible behavior
9. Preserve prior manifests so historical generated artifacts remain auditable.
10. Runtime generation must use only the released knowledge-base version, never a half-updated source set.
