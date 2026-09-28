# Comparación pareada Jev con 50 observaciones sintéticas — 2026-09-27

## Alcance

Se redactaron y etiquetaron **antes de llamar al modelo** 50 observaciones ficticias a partir de las 14 tarjetas semánticas CNEB del paquete v4.0.0 que usa este experimento. Hay 32 casos con una etiqueta esperada, 10 con dos etiquetas esperadas y 8 que deberían quedar sin clasificar. El archivo es `datasets/synthetic-50-v1.jsonl`; su SHA-256 es `2f8f3e363113ec87f0693c27b5ca5cb7d648bd838fad9c7b8b60d1bbd973cd0a`. Todas las etiquetas son **provisionales de autoría técnica, no definidas ni revisadas por especialistas docentes**. No son un golden pedagógico. Las observaciones no contienen datos de niños reales.

Se ejecutaron 50 llamadas reales por método a OpenRouter, sin caché, con `typesafe/jev-1.13-20260917`, el perfil `focused`, la misma KB y el mismo archivo. Cada lote terminó 50/50 sin fallos. No se modificaron prompts, modelo, etiquetas ni umbrales entre ambas corridas. `choice` y `parallel-noul` siguen siendo prototipos aislados de Ayni.

## Tabla comparativa

Para la comparación de conjuntos, `choice` aporta su única etiqueta si está `classified` o `review`, y conjunto vacío si está `unclassified`; `parallel-noul` aporta todas sus propuestas con puntuación ≥0.80. El conjunto esperado está explícito en `expected_competency_ids`, separado del texto enviado a Jev. Las métricas micro cuentan cada etiqueta esperada/propuesta; no equivalen a calidad pedagógica validada.

| Indicador sobre los mismos 50 casos | Choice focused | Parallel-noul focused |
| --- | ---: | ---: |
| Conjunto de etiquetas exactamente igual | 36/50 | 38/50 |
| Casos de una etiqueta exactos | 28/32 | 22/32 |
| Casos de dos etiquetas exactos | 0/10 | 8/10 |
| Casos sin etiqueta correctamente vacíos | 8/8 | 8/8 |
| Etiqueta primaria incluida en la propuesta operativa | 35/42 | 38/42 |
| Verdaderos positivos de etiquetas | 37 | 47 |
| Etiquetas extra (falsos positivos provisionales) | 2 | 10 |
| Etiquetas esperadas omitidas | 15 | 5 |
| Precisión micro de etiquetas | 94.9 % | 82.5 % |
| Recuperación micro de etiquetas | 71.2 % | 90.4 % |
| F1 micro de etiquetas | 81.3 % | 86.2 % |
| Costo real de las 50 llamadas | US$0.009632 | US$0.009601 |
| Latencia media por llamada | 323 ms | 313 ms |

En la comparación pareada de conjunto exacto, ambos acertaron 30 casos, solo `choice` acertó 6, solo `parallel-noul` acertó 8 y ninguno acertó 6. La diferencia neta es **dos casos de 50**, demasiado pequeña y sesgada por etiquetas sintéticas para declarar una superioridad pedagógica general. El informe nativo de `choice` también registró top‑1 crudo 37/42, top‑2 40/42 y 32/50 autoaceptados. La precisión estricta de primaria entre autoaceptados fue 31/32, pero solo 25/32 autoaceptaciones coincidieron con el **conjunto completo** esperado: otras siete omitieron una segunda competencia. `parallel-noul` deja todas las propuestas en revisión docente; no autoacepta ninguna.

## Lectura de errores

- `parallel-noul` es más apto para **recuperar competencias simultáneas**: 8/10 conjuntos dobles exactos. `choice` está diseñado para escoger una y necesariamente omite la otra.
- `choice` fue más preciso en casos de **una sola competencia** (28/32 exactos frente a 22/32) y emitió menos etiquetas extra (2 frente a 10). Es la opción menos ruidosa si el objetivo operativo es una sugerencia principal, no un conjunto completo.
- Ambos dejaron vacíos los ocho casos sin evidencia suficiente, pero los ejemplos fueron redactados deliberadamente como negativos claros. Esto no calibra la abstención ante notas reales ambiguas.
- La primera nota de identidad (`syn50-001`) confundió a ambos métodos; `choice` se abstuvo y `parallel-noul` propuso comunicación oral. `syn50-021` mostró otra confusión relevante de `parallel-noul` entre localización y comunicación. En `syn50-040`, el método paralelo captó indagación pero omitió el uso activo de TIC. Estas discrepancias deben ser adjudicadas por una docente, no resueltas cambiando las etiquetas para mejorar la métrica.

## Decisión provisional y límites

Para este experimento sintético, **no hay un ganador único**: elegir `choice` si se quiere una candidata principal con menos ruido; elegir `parallel-noul` si es importante mostrar varias competencias potenciales a una docente. Una estrategia combinada aún no se ha medido y no debe asumirse superior. En ambos casos la salida es una sugerencia, nunca una clasificación confirmada ni un nivel de logro.

La autoría del dataset conoce las tarjetas que Jev recibió. Eso favorece formulaciones cercanas a la KB y no representa la variabilidad de notas auténticas. Las etiquetas dobles y los casos sin competencia necesitan adjudicación experta independiente. El umbral 0.80 y el control de suficiencia permanecieron congelados, pero no están calibrados. No se usó este conjunto para ajustar el código después de ver las salidas. Para decidir un despliegue o integración hay que repetir la comparación con observaciones anonimizadas y etiquetas ciegas de docentes, incluyendo varias competencias verdaderas y abstención.

Reportes completos: `reports/jev-choice-focused-2026-09-27T16-15-30-788Z.json` y `reports/jev-parallel-noul-focused-2026-09-27T16-15-53-378Z.json` (también hay `.md`; `reports/` está ignorado por Git). Se pueden revertir los datos de este ejercicio dejando de seleccionar `synthetic-50-v1.jsonl`; no cambian Ayni ni la KB. No hubo despliegue ni commit.
