# Protocol to extend this knowledge base to another grade, cycle or level

This package is intentionally scoped to Educación Inicial, Ciclo II, ages 3-5. To expand it:

1. **Define the target scope**: level, cycle, grades/ages, modality and language context.
2. **Acquire official MINEDU authority sources**:
   - current CNEB / normative modifications;
   - the corresponding current curricular program;
   - current evaluation norm;
   - level-specific official guidance.
3. **Create a source registry and priority hierarchy before extracting content.**
4. **Build the official normalized catalog**:
   areas → competencies → capacities → cycle standards → grade/age performances.
   Use stable IDs and keep source/page/hash provenance in the official registry.
5. **Resolve source conflicts offline**:
   never leave two competing canonical rules for runtime AI.
6. **Build semantic decision cards** for every competency:
   meaning, intent, when-to-use, when-not-to-use, observable actions, evidence,
   examples, not-examples and confusions.
7. **Build grade/age runtimes** by projection from the master; never hand-edit runtimes.
8. **Build pedagogy modules** only from official MINEDU sources applicable to that level.
9. **Build retrieval units** with narrow, complete units and source refs.
10. **Build benchmarks** with clear intent, primary/secondary acceptable choices,
    unacceptable choices and genuine ambiguity.
11. **Validate**: IDs, age/grade boundaries, aliases, conflicts, source references,
    no semantic text promoted as official verbatim.
12. **Release a versioned ZIP** and integrate it through an importer.
