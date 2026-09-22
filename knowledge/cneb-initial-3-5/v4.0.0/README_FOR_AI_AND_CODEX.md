# Ayni Aula — CNEB Initial 3-5 AI Knowledge Base v4.0.0

Scope: Perú · Educación Inicial · Ciclo II · 3, 4 y 5 años.
Source policy: solo fuentes oficiales MINEDU.

## Objetivo

Permitir que los workflows ordinarios de IA funcionen sin releer PDFs.
El backend construye un contexto pequeño y específico combinando:

1. referencia curricular estructurada;
2. orientación MINEDU estructurada;
3. tarjetas semánticas ricas;
4. reglas pedagógicas/de generación;
5. contexto real de docente/aula/alumno/evidencia.

## Entradas principales

- `05_workflows/workflow_knowledge_requirements.json`
- `05_workflows/context_builder_contract.json`
- `06_retrieval/combined_knowledge_units.jsonl`
- `03_semantic/competency_cards.jsonl`
- `02_official_reference/curriculum_reference.json`

## Regla central

workflow + contexto real -> filtros deterministas -> conocimiento pertinente -> IA

Nunca: toda la base -> IA.

## Texto oficial vs conocimiento para IA

Los nombres canónicos cortos de competencias/capacidades se preservan.
La información extensa de estándares/desempeños se normaliza en resúmenes semánticos trazables para IA.
No presentar esas paráfrasis como citas largas literales del MINEDU.
