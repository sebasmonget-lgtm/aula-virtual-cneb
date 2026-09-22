# CNEB Inicial 3-5 AI Knowledge Base v3.0.0

**Scope:** Perú · Educación Inicial · Ciclo II · 3, 4 y 5 años  
**Sources:** only official MINEDU sources  
**Purpose:** backend knowledge for AI generation, retrieval and curriculum selection.

## Core design

This is **not a human-oriented PDF archive**. It is a canonical, structured knowledge
layer designed so the application does not need to reread MINEDU PDFs for every request.

It separates:
- authoritative source registry;
- resolved source hierarchy/conflicts;
- canonical curriculum names and semantic cards;
- pedagogy rules;
- generation logic;
- retrieval units;
- quality/limits.

Use `06_retrieval/knowledge_units.jsonl` for RAG/search.
Use `03_curriculum/competency_cards.jsonl` for competency selection.
Use `03_curriculum/age_runtime_3|4|5.json` for age-scoped context.

For exact official quotations/audit, use the application's `curriculum/official`
registry after its one-time offline ingestion. Do not treat AI-optimized explanatory
text in this package as a verbatim quotation from MINEDU.
