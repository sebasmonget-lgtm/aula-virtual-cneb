# QA técnica: CURRENT_V2_4_RAW sin filtro previo a Jev

Fecha: 2026-09-29. Rama: `codex/jev-v24-supervised`. Datos totalmente ficticios en PGlite en memoria; estas llamadas no pertenecen al piloto de 30 observaciones reales. No hubo despliegue.

## Cambio verificado

La observación diagnóstica espontánea marcada V2.4 conserva `observation_text` exactamente como lo escribió la profesora, incluidos espacios y saltos de línea, y entrega ese valor a Jev sin anonimización, detección de nombres, mayúsculas o identificadores. Solo permanece la validación estructural de nota no vacía y longitud máxima. Las fotos y grabaciones privadas no se entregan a Jev. La sugerencia sigue sin confirmarse automáticamente; Assessment solo consume competencias elegidas por la docente.

El estado `privacy_blocked` fue retirado del servicio, la UI V2.4, el agregado de métricas y el constraint mediante migraciones nuevas local `0068` / Supabase `202609290003`. La migración convierte filas antiguas sin decisión en `pending` y conserva decisiones ya revisadas como `disabled`. No se editaron migraciones aplicadas.

## Pruebas

- Tests relacionados: **49/49 PASS**, incluidos RAW exacto con nombres, correo, dirección, teléfono y espacios; migración de filas antiguas; historial de decisiones; Assessment; HTTP autorizado; paridad de esquema.
- Typecheck, lint y build: **PASS**.
- Suite general: **582/585 PASS**. Los mismos tres fallos preexistentes del SHA de `ai_system_contract_v3.json` v4.0.0. No se corrigieron en esta tarea. Log privado: `.local/test-results/v24-no-privacy-full-suite.tap`.
- Hash SHA-256 del prompt V2.4: `271b4b8298a5b8c2132160f7514d69c45f8f59cf686aa2a2a2edd0892cbd0867`. Hash del código experimental: `601254e3622cd26db927c465f153f2be9be9e54b27f223c5443bf3773c199d83`. Coinciden con los valores congelados. Modelo solicitado `typesafe/jev-1.13`; umbrales 0.50 / 0.70 / 0.80, sin cambios. No Luna.

## Cinco casos reales de Jev

Cada observación recibió dos solicitudes del clasificador congelado: 10 HTTP en total, sin reintentos. RAW persistido y enviado idéntico en los cinco casos; ninguna competencia quedó confirmada por la prueba.

| Caso | Esperado aproximado | Principal Jev | Secundarias | Estado | Latencia |
|---|---|---|---|---|---:|
| QA-JEV-01 | MAT_CANTIDAD | MAT_CANTIDAD | — | suggested | 723 ms |
| QA-JEV-02 | CYT_INDAGA | CYT_INDAGA | — | suggested | 390 ms |
| QA-JEV-03 | COM_LECTURA | COM_LECTURA | — | suggested | 331 ms |
| QA-JEV-04 | abstención | — | — | abstained | 349 ms |
| QA-JEV-05 | MAT_FORMA, con ambigüedad de convivencia | PS_CONVIVE | — | suggested | 391 ms |

QA-JEV-05 es una discrepancia pedagógica frente a la expectativa aproximada; no se ajustó el prompt, modelo, thresholds ni lógica de abstención a partir de este resultado. El modelo efectivo reportado por el proveedor fue `typesafe/jev-1.13-20260917`.

Uso real informado por el proveedor: **61,669 tokens de entrada**, **2,345 tokens de salida**, **USD 0.002590098** en 10 eventos (`cost_source=provider`). No son estimaciones. El reporte privado con IDs de observación, estados, latencias y uso está en `.local/test-results/v24-no-privacy-real-jev-qa-result.json`; no guarda prompts ni respuestas crudas.

## Métricas y límites

En la base QA en memoria: 5 observaciones, 5 intentos de clasificador, 4 sugerencias, 1 abstención, 0 fallos técnicos, 4 sugerencias pendientes de revisión y 0 decisiones docentes. `privacy_blocked` ya no aparece en el agregado. Latencia promedio 436.8 ms, p50 390 ms, p95 723 ms. `attempt_calls=5` cuenta invocaciones de clasificación; las solicitudes HTTP reales fueron 10.

La validación técnica del flujo pasó. La clasificación de QA-JEV-05 queda señalada para revisión pedagógica manual antes del piloto; esta QA no constituye una evaluación de accuracy. La migración Supabase se verificó por paridad local, pero no se aplicó a un entorno remoto. El piloto de 30 observaciones reales no se inició.
