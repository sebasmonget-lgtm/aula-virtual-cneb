# Validación del benchmark Luna

Fecha civil: 2026-09-28 (Lima). Worktree y rama independientes `codex/jev-luna-benchmark`; base y etiqueta en [BENCHMARK_LUNA.md](../BENCHMARK_LUNA.md).

## Gold v1 sin edad: preparación (2026-09-28)

Por instrucción explícita del usuario se importaron los 28 casos exactamente, sin añadir edad. Copia privada `datasets/luna-benchmark/ayni_jev_gold_v1.jsonl`: SHA-256 idéntica al original `c8dcf899eaa4a7d15d6bee414a56e3f575f39bb81e38663766c83a52e4c483ef`. Mapping local de 9 alias validado contra la KB v4.1; sin cambiar adjudicación gold ni observaciones. Dos casos se bloquean por la privacidad original; se conservan en denominadores.

Compatibilidad mínima solo en experimento: null-age opt-in en validador local y catálogo general del ciclo; snapshot CURRENT con imports relativos y guardia null diferentes, resto exacto al original (prueba de igualdad completa). Nada editado en Ayni ni en textos de instrucciones, thresholds, privacidad o abstención. Luna ya omitía edad ausente; su archivo no se cambió.

Gates antes de proveedores: **43/43 pruebas PASS**; sintaxis JS **47 archivos PASS**; lint/ESLint **PASS**; build **PASS**. Pruebas nuevas de null en Jev/age omitida Luna, ausencia de patrones por edad, gold mutado sin cambiar ningún payload, snapshot original idéntico salvo adaptaciones mecánicas. Guardias de campos gold siguen activas en cada solicitud real.

Vista previa real del dataset: 28 casos × 3 repeticiones, hasta 504 Jev + 84 Luna = 588 llamadas; USD 0.093156 orientativos. Corridas autorizadas y completadas: primero 3 casos × 1 repetición, luego 28 × 3 tras schema correcto. No se optimizó tras medir.

### Ejecuciones pagadas del gold

Fuente congelada para ambas: commit **46212f4**, worktree limpio antes y durante la corrida. Ejecución por CLI con solo dos credenciales cargadas en memoria; sin copiar .env, BD ni flags de Ayni. Dataset age ausente exacto y copia con hashes idénticos antes/después. CURRENT product-teacher y PARALLEL focused noul, KB 4.1; modelos efectivos `typesafe/jev-1.13-20260917` y `gpt-6-luna`.

- Smoke real primeros 3 casos: `results/2026-09-29T03-16-25-842Z-dd930b09/`, 12 Jev + 2 Luna = 14 llamadas. AG-02 bloqueado; los otros dos con JSON Luna y respuestas Jev válidos. Cero fallas/costos desconocidos. USD **0.001731592** (Jev **0.001580292**, Luna tarifaria **0.000151300**).
- Completo: `results/2026-09-29T03-16-53-800Z-18ee8191/`, **3 repeticiones de 28**, 84/84, **468 Jev + 78 Luna = 546** llamadas, cero fallas/costos desconocidos. Dos bloques por corrida: **AG-02 y MN-01**, falsos según gold, 6/84 por brazo. Jev **USD 0.061497828** informado en usage de sus 468 llamadas. Luna **USD 0.005866100**, tarifa congelada sobre **27,831 input / 6,166 output**, reasoning 556 incluido en output; cache/writes cero. Total físico completo **USD 0.067363928**. Total con smoke: **USD 0.069095520**, 560 llamadas físicas.

Accuracy primaria estricta: CURRENT RAW **69.70%**, LUNA **71.21%**; PARALLEL RAW **28.79%**, LUNA **19.70%**. Aceptable: **69.70/74.24/28.79/19.70%**. Decisión completa: **60.71/61.90/42.86/36.90%**. Primarias sobre 66 casos-repetición, decisiones sobre 84; no son 84 muestras independientes. CURRENT Luna: 3 IMPROVED, 2 WORSENED, neto +1; PARALLEL: 2 IMPROVED, 7 WORSENED, neto -5. Δ USD por 1000: **0.073642524 / 0.071723524**; Δ latencia: **1530.738 / 1517.131 ms**. No selección automática ni integración.

Postprocesamiento sin proveedores creó `REVIEW_GOLD_V1.md`, `case-review.json`, `case-review.csv`: tabla principal, los 28 casos con respuestas y variación r1/r2/r3, grupos, categorías de error, totales y proyección 20 obs/día para 1/10/50/100 profesoras. Cost-analysis conserva además 12 escenarios y todos los 14 indicadores de costo. Resultados por repetición y raw permanecen intactos. Auditados 28 IDs por run, 84 registros, 546 ledger calls y diferencia cero entre costo físico recalculado y raw.costs. Sin verificación visual nueva de UI; ejecución y reportes verificados por CLI/archivos.

Para revisión manual: `acceptable_secondary` sigue con semántica exacta existente, sin cambiar score al ver resultados. TE-03 permite Lectura primaria y la enumera secundaria; anotación para adjudicación docente posterior. Todas las secundarias esperadas faltaron (12 etiquetas por brazo); extras fuera de gold 6/7/2/1. El gold y prompts no se corrigieron después de la corrida.

## Ampliación de costos (2026-09-28)

Se añadió postprocesamiento de costos, sin modificar solicitudes de inferencia, modelos, umbrales, gold ni arquitectura de los cuatro brazos. Configuración mensual: `config/cost-scenarios.json`; precios siguen en los dos archivos existentes y se congelan en metadata. `cli/analyze-luna-costs.mjs` analiza resultados guardados sin credenciales ni llamadas. Cada ejecución escribe un directorio nuevo.

Validación ejecutada: **41/41 pruebas PASS**, `typecheck` **PASS (46 archivos, sintaxis JS)**, lint con ESLint **PASS**, build **PASS**. Nuevas pruebas verifican costo físico compartido frente a atribución por brazo, unknown sin reemplazar por cero, tarifa/proveedor separados, 12 escenarios, incremento/eficiencia, bloqueos sin llamadas, brazo ausente y aliases del gold sin inferir edad. Las pruebas de equivalencia exacta RAW y leakage anteriores siguen pasando.

Prueba funcional: el CLI de costos procesó el `raw-results.json` del smoke anterior en dos directorios distintos, conservando el gasto físico USD **0.002025826** y sin nuevas llamadas pagadas. Informe final en `results/2026-09-29T01-48-37-390Z-78894070/cost-review-2026-09-29T02-46-32-012Z-cfd16f/`: `cost-analysis.md`, JSON con ledger y `monthly-costs.csv`. Las cifras por brazo y la suma física coinciden con usage y el reporte anterior. En esa plantilla, PARALLEL_RAW minimiza USD/clasificación correcta; no se generaliza al gold del usuario.

Dataset aportado: `C:/Users/ASUS/Documents/ayni_jev_gold_v1.jsonl`, 28 casos, SHA-256 `c8dcf899eaa4a7d15d6bee414a56e3f575f39bb81e38663766c83a52e4c483ef`. Archivo original intacto; los 28 carecen de edad. Se solicitó ese dato al usuario y no se ejecutó el benchmark del gold ni se supuso edad. Sus etiquetas se tratan como datos docentes, no como instrucciones ni objetivos para modificar prompts.

Rollback de la ampliación: revertir su commit vuelve al reporte previo; los resultados ignorados se conservan. No hay migración, escritura en BD, despliegue ni cambio de configuración Ayni.

## Archivos del cambio

Todo el diff versionado pertenece a `experiments/jev-competency-classifier/`.

- CLI: `cli/benchmark-luna.mjs`.
- Pipeline: `src/luna-benchmark-dataset.mjs`, `src/luna-inference-boundary.mjs`, `src/luna-client.mjs`, `src/luna-benchmark-adapters.mjs`, `src/luna-benchmark-runner.mjs`, `src/luna-benchmark-score.mjs`, `src/luna-benchmark-job.mjs`.
- UI/API local: `src/local-server.mjs`, `public/index.html`, `public/benchmark.js`, `public/app.css`.
- Configuración: `config/pricing-luna.json`, `config/benchmark-planning.json`, `.env.example`.
- Pruebas/gates: `tests/luna-benchmark.test.mjs`, `package.json`, `scripts/typecheck.mjs`, `scripts/lint.mjs`, `scripts/build.mjs`.
- Datos de muestra y exclusión Git: `datasets/luna-benchmark/example.template.jsonl`, `datasets/luna-benchmark/.gitignore`, `results/.gitignore`.
- Documentación: `README.md`, `BENCHMARK_LUNA.md`, este archivo y `docs/ERRORS_AND_FIXES_LUNA.md`.

No se editaron `jev-classifier.mjs`, `criteria-builder.mjs`, `result.mjs`, `decision-policy.mjs`, config de thresholds, el comparador anterior ni los módulos reutilizados de `src/lib/`. No hay diff curricular ni cambios versionados en Ayni.

## Mocks y comprobaciones

Los comandos locales se ejecutaron con la suite sin llamadas reales. El `typecheck` de este programa revisa sintaxis JS y build copia assets; no equivalen a un análisis TypeScript o a un deploy. La configuración ESLint raíz excluye `experiments/**`; el lint del experimento ahora comprueba secretos y ejecuta ESLint con su propia configuración, sin editar la de Ayni.

Resultado final: `npm.cmd test` **36/36 PASS**; `npm.cmd run typecheck` **PASS (43 archivos JS)**; `npm.cmd run lint` **PASS**; `npm.cmd run build` **PASS**. Las ampliaciones finales de métricas/fallos se verificaron con mocks; no se repitieron llamadas pagadas.

- Aislamiento de los campos `expected`, `expected_primary`, `acceptable_primary`, `acceptable_secondary`, `gold`, `correct_answer` y aliases legacy: guardia estructurada/serializada y pruebas de sentinelas privados.
- Cambiar gold sin cambiar ninguna solicitud de Jev.
- CURRENT_RAW y PARALLEL_RAW: igualdad profunda de los payloads HTTP contra los métodos originales; mismas propuestas en mocks.
- Cuatro brazos con el mismo caso; 3 repeticiones, una Luna compartida por repetición, sin caché local.
- Métricas de abstención, overclassification, privacidad FP/TP y secundarias; aliases/alternativas.
- Costos sobre usage real; tokens cached/reasoning; JSON fallido facturado; respuestas Jev inválidas facturadas.
- Cuota 402: solo dos llamadas CURRENT ya concurrentes, cero Luna, sin siguientes casos.
- No inventar deltas cuando se desactiva un brazo.
- Directorios distintos sin sobrescritura y archivos independientes por repetición.

## Smoke real pequeño

Se ejecutó **una sola corrida pagada** desde la sección Benchmark Luna del servidor aislado `127.0.0.1:4182`. El panel antiguo y los servidores de Ayni no se reiniciaron.

- Dataset: `example.template.jsonl`, 3 casos sintéticos, una repetición.
- Vista previa mostrada antes: máximo 18 llamadas Jev + 3 Luna, US$0.003327 orientativos.
- Ejecutadas: 12 llamadas Jev + 2 Luna; un caso bloqueado antes de proveedor.
- Gasto: US$0.002025826; Jev US$0.001902726, Luna US$0.0001231. Cero llamadas con costo desconocido.
- CURRENT: Luna eliminó una propuesta adicional fuera del gold sintético; 1 IMPROVED, 0 WORSENED. PARALLEL: 0 IMPROVED, 0 WORSENED.
- Las primarias no cambiaron. La precisión primaria es 50% al incluir el caso válido bloqueado, cuyo error se muestra separadamente como false_privacy_block.
- Caso «mamá»: FALSE PRIVACY BLOCK en los cuatro brazos, conservado sin relajar la política.
- Ninguna observación real de menores, foto, grabación, entrevista ni BD fue enviada.

Resultados privados locales:

`results/2026-09-29T01-48-37-390Z-78894070/`

Incluye `raw-results.json`, `summary.json`, `comparison.md`, `errors.md`, `runs/run-1.json` y `ui-completed.png`. Se verificó finalización 3/3 y comparación visible por UI, sin mensajes de error/warn en la consola del navegador. El control por clic del navegador integrado tuvo un desfase de coordenadas; la activación por teclado sobre el botón correcto completó el flujo.

Es verificación de flujo y billing, **no evidencia de superioridad pedagógica**. Una corrida sobre plantilla no mide generalización ni variabilidad suficiente. No se ajustaron prompts con estas etiquetas ni se ejecutó un benchmark grande.

## Entorno

Se reutilizaron las dependencias ya instaladas mediante junction de `node_modules` en el worktree, sin instalar paquetes. Para el smoke se cargaron únicamente `OPENAI_API_KEY` y `OPENROUTER_API_KEY` en memoria del proceso aislado desde las ubicaciones locales ignoradas ya existentes; no se copiaron archivos `.env`, no se cargaron flags/routing/BD de Ayni y no se registraron valores de credenciales. Una nueva ejecución con npm puede configurarlas en `.env.local` del experimento.

## Límites

- Los métodos anteriores exigen edad; esta matriz admite null por el adaptador documentado arriba.
- Jev nuevo harness: OpenRouter; TypeSafe directo queda disponible solo en el panel anterior.
- Filtro de privacidad conservador, compartido antes de RAW/Luna; Luna no puede reparar los textos bloqueados.
- CURRENT top-2 se deriva de las probabilidades originales Choice; PARALLEL del ranking noul. Son rankings distintos; interpretar la métrica dentro de cada método.
- Las fallas de proveedor no se ocultan ni se reintentan automáticamente. Reiniciar crea un run-id distinto; los checkpoints permiten análisis parcial, no reanudación automática.
- Los resultados contienen raw local: mantener la carpeta privada y no añadirla a Git.
