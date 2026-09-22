# CODEX INTEGRATION - CNEB Inicial 3-5 AI Knowledge Base v3.0.0

## Purpose

This ZIP is the reusable backend knowledge layer for Ayni Aula.

**Do not make the runtime AI reread MINEDU PDFs for ordinary generation.**
PDF/source ingestion is an offline, versioned maintenance process.

The ZIP contains:
- official-source registry and authority hierarchy;
- resolved source conflicts;
- CNEB core concepts;
- 14 rich competency cards;
- age runtimes for 3, 4 and 5;
- 140 semantic progression candidates (explicitly NOT official verbatim performances);
- pedagogy modules;
- generation rules;
- retrieval-ready JSONL units;
- benchmarks and update/extension protocols.

## Integration principle

Keep two different stores:

1. `curriculum/official/`
   - exact official text/provenance when available;
   - used for verbatim official display/audit and exact performance IDs/text.

2. this knowledge base
   - canonical semantic understanding and generation guidance;
   - used by RAG/routing/generative AI.

They reinforce each other but must never be conflated.

## Recommended repository destination

```
knowledge/cneb-initial-3-5/v3.0.0/
```

or the equivalent project convention.

Do not overwrite existing `curriculum/official`, `curriculum/semantic`
or runtimes blindly. Import/migrate explicitly.

## Runtime retrieval

Index:

`06_retrieval/knowledge_units.jsonl`

Metadata filters:
- age_scope
- domain
- competency_id
- area
- temporal_scope
- retrieval_priority

When selecting a competency, use the complete card in:

`03_curriculum/competency_cards.jsonl`

Do not send only competency names.

## Context pipeline

```
teacher request/context
→ deterministic filters (age/language/applicability)
→ retrieve knowledge units
→ curriculum candidate cards
→ semantic selection/ranking when needed
→ generation
→ deterministic validation
→ teacher confirmation where pedagogically material
```

## Important

- `03_curriculum/progression_semantic_candidates.jsonl` contains semantic
  progression candidates. They are useful for retrieval and ranking but are
  NOT official performance text.
- Never quote semantic paraphrases as verbatim MINEDU.
- Do not mark official content verified merely because it is present here.
- Religion must be applicability-gated.
- Castellano L2 must be language-context-gated.
- Use 2026 material only as `temporal_scope=2026`.
- Resolved conflicts are in `07_quality/resolved_conflicts.json`; runtime AI
  should not reopen them.

## Suggested import tests

1. 14 canonical competency IDs are present and unique.
2. All canonical names are nonempty.
3. Age runtime is 3/4/5 only.
4. `not_specified_in_program` profiles cannot yield specific performance selection.
5. TRANS_TIC includes the canonical interaction capacity.
6. Semantic candidates can never become official verbatim records automatically.
7. Retrieval units reference only registered source IDs.
8. Year overlay is not returned for ordinary timeless queries unless relevant.
9. Alias lookup resolves to canonical IDs but output uses canonical names.
10. Benchmark fixtures continue to preserve ambiguous cases.

## Do not

- re-scrape/re-read PDFs for each teacher request;
- put entire knowledge base into every LLM prompt;
- use keyword matching alone for competency choice;
- rebuild this package from scratch inside the repo;
- duplicate pedagogy rules in many app modules.

## After integration

Report:
- destination path;
- imported version;
- number of sources;
- competencies;
- retrieval units;
- semantic progression candidates;
- tests;
- commit SHA.
