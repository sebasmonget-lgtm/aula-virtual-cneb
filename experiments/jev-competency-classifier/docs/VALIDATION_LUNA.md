# Validación del benchmark Luna

Fecha civil: 2026-09-28 (Lima). Worktree y rama independientes `codex/jev-luna-benchmark`; base y etiqueta en [BENCHMARK_LUNA.md](../BENCHMARK_LUNA.md).

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

- La edad es obligatoria para los métodos Jev anteriores.
- Jev nuevo harness: OpenRouter; TypeSafe directo queda disponible solo en el panel anterior.
- Filtro de privacidad conservador, compartido antes de RAW/Luna; Luna no puede reparar los textos bloqueados.
- CURRENT top-2 se deriva de las probabilidades originales Choice; PARALLEL del ranking noul. Son rankings distintos; interpretar la métrica dentro de cada método.
- Las fallas de proveedor no se ocultan ni se reintentan automáticamente. Reiniciar crea un run-id distinto; los checkpoints permiten análisis parcial, no reanudación automática.
- Los resultados contienen raw local: mantener la carpeta privada y no añadirla a Git.
