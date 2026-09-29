# Experimento Jev–CNEB

Prototipo local para medir si Jev puede asociar observaciones espontáneas ficticias de Educación Inicial con una competencia CNEB aplicable. Lee la KB v4 del repositorio y no modifica Ayni Aula.

Consulta [PLAN.md](PLAN.md) para el contrato, el alcance y las métricas.

## Experimento autónomo CURRENT DEV

La fase de 80 observaciones, CURRENT V1/V2 y Luna CLEAN/INTERPRET sigue el [protocolo autónomo autorizado](docs/CURRENT_STUDY_PLAN.md). El [gold DEV adjudicado por Codex](docs/CURRENT_DEV_GOLD_REVIEW.md) se congeló antes de consultar proveedores. Las versiones y errores se conservan en `docs/current-study/`. El test de 28 casos requiere cierre DEV y un lock de evaluación única.

**Estudio completado y cerrado:** cuatro ciclos DEV (V2, V2.1, V2.2, V2.3), tres repeticiones de los cuatro brazos, y una única pasada del candidato sobre el test congelado. [DEV_FINAL_REPORT.md](DEV_FINAL_REPORT.md), [FINAL_REPORT.md](FINAL_REPORT.md) y [validación](docs/CURRENT_STUDY_FINAL_VALIDATION.md) conservan resultados, costos y límites. No ejecutar otro ciclo ni otra evaluación final de este estudio; el lock ya está reclamado. El alto desempeño DEV no se confirmó en TEST y no se recomienda integrar esta versión todavía.

El procedimiento anterior de revisión humana permanece documentado en [CURRENT_DEV.md](CURRENT_DEV.md); su estado de preparación y presupuesto son históricos. La adjudicación autónoma DEV fue autorizada posteriormente y no se presenta como revisión docente independiente.

## Benchmark Luna

El harness separado de cuatro brazos, UI local, JSON/JSONL etiquetado, repeticiones, costos y comparación se documenta en [BENCHMARK_LUNA.md](BENCHMARK_LUNA.md). `npm.cmd run eval:luna -- --dataset <archivo> --runs 3` muestra primero el presupuesto sin consultar modelos; exige `--execute --max-live-requests N` para ejecutar. No modifica Ayni.

## Requisitos

Node 22.13 o superior. El harness que reutiliza `product-teacher` necesita las dependencias ya instaladas en la raíz del repositorio; no añade paquetes. En PowerShell con ejecución de scripts deshabilitada, sustituir `npm` por `npm.cmd` en los comandos siguientes.

```powershell
cd "experiments/jev-competency-classifier"
npm test
npm run typecheck
npm run lint
npm run build
```

Estas comprobaciones no llaman a Jev.

## Interfaz local

```powershell
notepad .env.local
# Pegar el valor completo de OPENROUTER_API_KEY, guardar y cerrar.
npm run dev
```

Abrir `http://127.0.0.1:4179`. `.env.example` selecciona `JEV_GATEWAY=openrouter` y el modelo fijo `typesafe/jev-1.13`. La clave se conserva en el proceso local; el navegador nunca recibe la clave. Sin clave, la interfaz informa que Jev no está configurado. Si la clave antigua solo aparece enmascarada en OpenRouter, usar «New Key» para crear otra y copiar su valor completo una sola vez.

La interfaz permite escribir una observación una vez y muestra **ambos métodos en un panel lateral**. Cada comparación hace dos llamadas al mismo modelo Jev: `choice` elige una única competencia o `NO_CLASIFICABLE`; `parallel-noul` incluye una pregunta independiente por cada competencia aplicable en **una sola llamada adicional**. Este último puede proponer varias competencias (≥0.80), muestra candidatas para revisión (≥0.50) y permite desplegar todas las puntuaciones. Si falla uno de los métodos, el otro resultado permanece visible. Son umbrales exploratorios, no calibrados. Ninguna propuesta `noul` se asigna automáticamente: requiere criterio docente. Las puntuaciones independientes no suman 100 % ni traen un campo de `confidence` separado.

El selector «Información curricular» permite comparar `compact` (perfil original) con `enriched`. El perfil enriquecido envía todos los patrones observables de la edad —sin cortar después del tercero—, los límites de uso, dos ejemplos y contraejemplos de la tarjeta y las distinciones con otras competencias aplicables. Solo lee la KB versionada; no consulta otra fuente ni envía información de niños.

`focused` es una tercera variante experimental: conserva todos los patrones por edad y distinciones pertinentes, pero omite ejemplos genéricos para reducir tokens. En `parallel-noul` corrige una negación contradictoria que trataba «también corresponde a otra competencia» como evidencia en contra. Ambos métodos añaden en la misma petición una pregunta `noul` sobre suficiencia de la observación. En `choice`, una puntuación inferior a `0.80` impide la autoaceptación y deja la candidata para revisión; en `parallel-noul` se informa la puntuación sin ocultar propuestas. El selector local abre `focused` por defecto, pero la CLI conserva `compact` para compatibilidad. Ningún umbral está validado para producto.

## Llamadas reales y costo

Estos comandos pueden consumir API:

```powershell
npm run models
npm run eval:jev -- --max-live-requests 20 --limit 20 --no-cache
npm run eval:jev -- --method parallel-noul --max-live-requests 20 --limit 20 --no-cache
npm run eval:jev -- --method choice --criteria-profile enriched --max-live-requests 20 --limit 20 --no-cache
npm run eval:jev -- --method parallel-noul --criteria-profile enriched --max-live-requests 20 --limit 20 --no-cache
npm run eval:jev -- --method choice --criteria-profile focused --max-live-requests 20 --limit 20 --no-cache
npm run eval:jev -- --method parallel-noul --criteria-profile focused --max-live-requests 20 --limit 20 --no-cache
```

`models` lista los modelos Jev visibles mediante la pasarela elegida. `eval:jev` exige un límite explícito de solicitudes. Con OpenRouter se usa `typesafe/jev-1.13` de forma predeterminada; para comparar instantáneas se puede fijar `JEV_MODEL`. El reporte usa `usage.cost` devuelto por OpenRouter cuando está disponible y estima con la tarifa fechada en caso contrario.

Para comparar métodos, usar el mismo dataset, `--limit`, modelo y `--no-cache`. Cada comando de 20 casos realiza 20 solicitudes (el método paralelo empaqueta todas sus preguntas para una observación en una solicitud). Sus métricas no son idénticas: `choice` mide selección exclusiva y posible autoaceptación; `parallel-noul` informa cobertura de etiquetas primarias/secundarias provisionales y cantidad de propuestas múltiples, sin adjudicar una precisión multietiqueta. Las `acceptable_secondary_ids` son alternativas plausibles, no un conjunto exhaustivo validado.

Comparación exploratoria del 2026-09-27 sobre los mismos 20 casos ficticios provisionales y Jev `typesafe/jev-1.13-20260917`: `choice` pasó de 15/17 a 16/17 selecciones primarias; `parallel-noul` de 13/17 a 15/17 casos que incluyen la primaria entre sus propuestas. La detección simultánea de primaria y secundaria plausible pasó de 0/5 a 1/5. Ambas corridas enriquecidas completaron 20/20 solicitudes sin caché; el costo fue US$0.004261 para `choice` y US$0.004039 para `parallel-noul`, aproximadamente el doble que el perfil compacto. Este es un ajuste evaluado en el mismo conjunto de desarrollo, no una estimación independiente de precisión. No convertir los umbrales en política de producto sin revisión docente y golden nuevo.

La revisión integral posterior y seis lotes reales adicionales se documentan en [REVIEW_2026-09-27.md](REVIEW_2026-09-27.md). `datasets/challenge-v1.jsonl` contiene 20 casos ficticios creados antes de ejecutar esos lotes; sigue siendo provisional y no sustituye un golden docente.

La comparación posterior con 50 observaciones sintéticas, de las cuales diez tienen dos etiquetas y ocho no tienen ninguna, está en [REVIEW_SYNTHETIC_50_2026-09-27.md](REVIEW_SYNTHETIC_50_2026-09-27.md). Se probaron los dos métodos `focused` con 50 llamadas reales cada uno. Las etiquetas fueron creadas a partir de la KB por el equipo técnico, no definidas por docentes; los resultados solo orientan la siguiente evaluación experta.

La prueba posterior con **30 situaciones entregadas por el usuario**, seis combinaciones y barridos de umbral calculados sin llamadas adicionales está en [REVIEW_USER_HARD_30_2026-09-27.md](REVIEW_USER_HARD_30_2026-09-27.md). `datasets/user-hard-30-v1.jsonl` es una copia anonimizada: se retiraron nombres antes de enviarla. Dos etiquetas primarias indicadas para 4 años no son seleccionables en la KB y se muestran sin contarlas como aciertos o errores. El análisis no altera los umbrales vigentes. Para repetirlo, `cli/compare-profiles.mjs` requiere un límite explícito de hasta 180 llamadas, conserva respuestas parciales en `reports/` y `cli/analyze-profiles.mjs` recalcula los indicadores sin consultar Jev.

La revisión [REVIEW_PRODUCT_PATH_2026-09-27.md](REVIEW_PRODUCT_PATH_2026-09-27.md) repite la prueba con la KB activa v4.1.0 y el mismo anonimizado que utiliza Ayni. El reporte histórico conserva los resultados de la política `product` anterior de solo `noul`; ese nombre ya no se reutiliza. `cli/compare-product-path.mjs` permite las seis combinaciones experimentales, `hybrid:compact` y la nueva composición docente `product-teacher` (`Choice` más `noul`, dos solicitudes por caso). Exige la clave de OpenRouter solo en `.env.local` y un máximo explícito de llamadas. Ejemplo: `node --env-file-if-exists=.env.local cli/compare-product-path.mjs 60 hard-30 product-teacher`; cambiar `hard-30` por `synthetic-50` para el segundo conjunto. Un cuarto argumento selecciona variantes separadas por comas; un quinto `r2`–`r9` crea una repetición independiente. Nunca incluye observaciones rechazadas por la política de privacidad y guarda respuestas en `reports/`, ignorado por Git. Tras reponer crédito, la nueva composición obtuvo 21/27 casos difíciles admisibles y 38/48 sintéticos exactos; siguen sin ser etiquetas expertas.

Para conservar el acceso directo a TypeSafe, cambiar `.env.local` a `JEV_GATEWAY=typesafe` y definir `TYPESAFE_API_KEY`. No introducir una clave de OpenRouter en `TYPESAFE_API_KEY`.

Para comprobar el flujo sin gastar:

```powershell
npm run eval:baseline
```

Los reportes se escriben en `reports/` y la caché en `.cache/`, ambos ignorados por Git. La caché contiene respuestas completas, pero solo un hash del texto de la observación; usar únicamente datos ficticios o anonimizados de forma irreversible.

## Dataset

`datasets/development.jsonl` contiene casos ficticios provisionales. No es un golden pedagógico. `datasets/golden.template.jsonl` es una plantilla para casos etiquetados y revisados antes de ejecutar Jev.

El benchmark acepta `.json`, `.jsonl` y `.csv`. Para CSV, `acceptable_secondary_ids` usa IDs separados por `|` y `applicability` contiene JSON.

La precisión de autoaceptación informa un intervalo Wilson del 95%; con muestras pequeñas el intervalo es amplio aunque los casos observados hayan sido todos correctos.

## Límites actuales

El resultado de una clasificación es una propuesta o una abstención. No es evaluación del niño, nivel de logro, conclusión pedagógica ni decisión que modifique Ayni. Los umbrales iniciales, incluido 0.82, se deben comparar con un golden revisado e independiente antes de cualquier integración.
