---
name: crear-biblioteca-materiales-ayni
description: Analizar fichas PDF de referencia y proponer, tras aprobación explícita, materiales imprimibles originales para la Biblioteca de Materiales de Ayni (3, 4 o 5 años). No es una skill de talleres.
---

# Biblioteca de Materiales Ayni

Un material es un recurso reutilizable de una actividad, taller o proyecto; nunca se clasifica por `tipo_taller` como entidad principal. Cada PDF suministrado es una unidad fuente completa, aunque incluya orientaciones o recortables. No lo dividas.

## Modo y límite de autorización

Hay dos fases que no se mezclan:

1. **ANALYZE / PROPOSE**: lee [analizar-y-proponer.md](references/analizar-y-proponer.md). Revisa **todos** los PDF y los PNG de personajes, entrega todas las propuestas, formula una sola ronda de preguntas globales y **detente**. No generes imágenes, PDF finales, `material.json` ni `catalogo.json`.
2. **GENERATE APPROVED**: solo tras aprobación explícita de las propuestas, lee [generar-aprobados.md](references/generar-aprobados.md). Aplica las correcciones específicas del usuario sin reabrir decisiones ya resueltas. Genera únicamente los materiales aprobados.

Si el usuario pide solo análisis, permanece en la fase A. Nunca interpretes una solicitud de crear la skill o examinar las fuentes como aprobación de la fase B. Publicar, desplegar, tocar producción o Supabase requiere solicitud separada.

## Invariantes compartidos

- Antes de cambiar el repositorio, cumple `AGENTS.md` y revisa memoria, decisiones, errores, skills existentes e implementación pertinente. Preserva cambios ajenos. No reconstruyas la Knowledge Base ni leas los PDF oficiales completos del CNEB en runtime.
- Prioridad curricular: texto explícito del PDF de la ficha → Knowledge Base v4 para normalizar ID, nombre y aplicabilidad a su edad → inferencia marcada solo si el PDF calla. Conserva la clasificación explícita aun si parece extraña: registra `curriculum_warning`, no la reemplaces en silencio.
- Carga solo la referencia de la edad fuente (3, 4 o 5); no uses los tres perfiles completos para una ficha. Reutiliza el workflow `material_generation` y las funciones de contexto del repositorio cuando corresponda; no introduzcas una arquitectura paralela.
- Conserva edad, intención, mecánica, dificultad, número aproximado de elementos y orientaciones relevantes. Crea escenas, redacción e ilustraciones originales; no copies ni redibujes casi idéntico el arte de referencia ni transcribas bloques extensos.
- Los PDF fuente son privados y no entran en `public/`, el bundle ni el catálogo distribuido. Los PNG de personajes definen su identidad visual. Asocia nombre e imagen solo si la evidencia lo permite; si hay ambigüedad, usa una descripción provisional y pregunta una vez globalmente.
- La ficha apoya experiencias pedagógicas; no es el método por defecto. Evita exceso textual/cognitivo y no inventes observaciones, evidencias reales ni niveles de logro.
