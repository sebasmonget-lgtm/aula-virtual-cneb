# CURRENT DEV: preparación y adjudicación humana

Estado: **implementado, sin benchmark pagado ni candidata validada**. El test final de 28 casos permanece congelado. La nueva CLI rechaza su nombre y su SHA-256 antes de parsear etiquetas; no abre resultados históricos para ajustar V2.

## Arquitectura

Todos los brazos pasan por `current-dev-privacy.mjs` y usan la misma KB v4, elegibilidad por edad, modelo Jev y thresholds. `age: null` usa criterios generales; Luna omite la edad. Los IDs oficiales, religión y castellano L2 conservan sus reglas de aplicabilidad.

| Brazo | Entrada de Jev | Prompt | Llamadas por registro permitido |
|---|---|---|---:|
| CURRENT_V1_RAW | Registro anonimizado original | CURRENT actual, intacto | 2 Jev |
| CURRENT_V2_RAW | Registro anonimizado original | V2 independiente | 2 Jev |
| CURRENT_V2_LUNA_CLEAN | Solo `clean_observation` | V2 | 1 Luna + 2 Jev |
| CURRENT_V2_LUNA_INTERPRET | Limpieza + interpretación + incertidumbre actuales | V2 | 1 Luna + 2 Jev |

Las dos decisiones Jev son concurrentes: Choice principal y nouls adicionales. Umbrales conservados: confianza primaria ≥0.50, suficiencia ≥0.70, secundaria ≥0.80, máximo cuatro competencias incluida la principal. No hay caché ni retries. Las dos variantes Luna son llamadas independientes: sus prompts difieren y no se reutiliza una respuesta.

La privacidad corregida es **común a los cuatro brazos nuevos**. Por ello V1 RAW de DEV conserva el clasificador anterior, pero no es idéntico al baseline histórico con filtro familiar. La diferencia A→B aísla el clasificador V2; B→C mide limpieza; C→D compara limpieza sola con el comportamiento interpretativo actual, incluida su salida de incertidumbre. La contribución común del filtro se verifica mediante regresiones separadas.

## Diff conceptual V1 → V2

V1 queda disponible en su adaptador original. V2 incorpora abstención explícita para estados circunstanciales, conducta observable central, secundaria independiente y las seis distinciones solicitadas. No cambia KB, thresholds ni selección de candidatos. El overlay está en `config/current-v2-prompt.json`.

V2 añade una elección de fragmento a la **misma petición principal**. Jev entrega decisiones tipadas, no genera explicaciones libres ([documentación del proveedor](https://openrouter.ai/blog/tutorials/jev-vs-llm-when-to-use-each/)). El adaptador entrega `{status, primary, secondary, evidence, reason}` en `outcome.explanation`, sin razonamiento largo ni otro modelo evaluador. `reason` es una plantilla breve de trazabilidad, no una justificación libre de Jev.

Las opciones de evidencia se extraen únicamente del texto observado/limpiado, excluyendo la interpretación. Después se devuelve una cita literal del registro original por alineación léxica. Esta comprobación confirma procedencia textual, **no que el fragmento justifique semánticamente la competencia**. Una alineación imposible produce evidencia vacía y revisión pendiente, sin inventar una cita ni cambiar la clasificación. El reporte cuenta estas incidencias y bloquea la elegibilidad de una candidata con evidencia no verificada.

LUNA_CLEAN tiene su propio prompt y esquema de un único campo; LUNA_INTERPRET reutiliza `luna-client.mjs` intacto. Se conserva gpt-6-luna, esfuerzo low, API Responses, `store:false` y esquema estricto ([modelo](https://developers.openai.com/api/docs/models/gpt-6-luna), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)).

## Propuesta independiente: 80 registros ficticios

Archivo: `datasets/current-dev/dev_proposal_v1.jsonl`. Sin `expected` ni gold; cada registro está pendiente de adjudicación. No se copiaron ni reformularon casos del test final. Los grupos de cobertura son metas de generación, no respuestas correctas:

| Cobertura | Registros |
|---|---:|
| Cantidad | 8 |
| Forma/localización | 8 |
| Indagación | 8 |
| Oral | 8 |
| Lectura | 8 |
| Escritura emergente | 7 |
| Arte | 7 |
| Motricidad | 7 |
| Convivencia | 7 |
| Abstención y límites | 8 |
| Identificadores ficticios para privacidad | 4 |

Hay dictado imperfecto, dudas, múltiples conductas, menciones familiares benignas y límites entre competencias. Las edades quedan null. La distribución final de etiquetas dependerá exclusivamente de la adjudicación humana.

## Cómo adjudicar

1. Abrir `/current-dev-review.html` en el servidor experimental. La instancia preparada está en `http://127.0.0.1:4182/current-dev-review.html`; si se reinicia, usar el puerto indicado por `npm.cmd run dev`.
2. Indicar persona revisora. En cada caso elegir **clasificar / abstenerse / privacidad real**, sin inferir conductas ausentes. Elegir una primaria cuando corresponda.
3. Añadir alternativas primarias solo si son defendibles. Las secundarias requieren otra conducta independiente; pueden quedar vacías. Registrar fragmento, motivo o dudas en notas. Las metas de cobertura del autor se ocultan inicialmente para reducir sesgo.
4. Marcar cada caso revisado explícitamente. Revisar dudas con otra persona antes de cerrar el gold. Descargar borradores para respaldar el avance; el navegador conserva progreso local.
5. Con 80/80 revisados, descargar **ambos** archivos: `current_dev_adjudicated.jsonl` y `current_dev_adjudication.json`. Guardarlos sin alterar bytes en `datasets/current-dev/`. El manifest vincula SHA-256, revisión humana, fecha y cantidad. Estos archivos adjudicados están ignorados por Git.

Una revisión incompleta o un manifest que no coincide deja el conjunto no ejecutable. Es una declaración humana verificable por archivo, no una firma criptográfica de identidad. No se genera gold con modelos. Notas, etiquetas, IDs de casos, metas de cobertura y persona revisora permanecen fuera de todos los prompts.

## Comandos

Desde `experiments/jev-competency-classifier`:

```powershell
# Vista previa de la propuesta: cero llamadas, adjudicación pendiente.
npm.cmd run eval:current-dev -- --dataset datasets/current-dev/dev_proposal_v1.jsonl --runs 3

# Después de adjudicar: primero revisar presupuesto, sin --execute.
npm.cmd run eval:current-dev -- --dataset datasets/current-dev/current_dev_adjudicated.jsonl --adjudication datasets/current-dev/current_dev_adjudication.json --runs 3

# Benchmark DEV completo, con las credenciales locales existentes disponibles.
npm.cmd run eval:current-dev -- --dataset datasets/current-dev/current_dev_adjudicated.jsonl --adjudication datasets/current-dev/current_dev_adjudication.json --runs 3 --execute --max-live-requests 2400
```

Para validar schema previamente se admite `--limit 3 --runs 1 --execute --max-live-requests 30`, usando los mismos archivos adjudicados. Un subconjunto o una sola repetición nunca habilitan una candidata. No se ejecutó ese smoke pagado en esta entrega.

## Métricas y selección

Prioridad: primaria aceptable, falsas abstenciones, sobreclasificación y privacy FP. Primaria estricta, errores adicionales, secundarias ausentes y exact decision se reportan por separado. Exact decision incluye decisiones de abstención/privacidad y el conjunto esperado de secundarias, pero no controla por sí sola la mejora de primaria. Cada repetición usa nuevas llamadas; 240 repeticiones de caso no equivalen a 240 observaciones independientes.

`summary.json`, `raw-results.json`, `runs/run-N.json` y `comparison.md` quedan en carpetas únicas `results/current-dev-*`. Incluyen confusion matrix, diagnósticos Cantidad/Forma, Oral/Lectura, Convivencia forzada, privacidad, abstención, escritura e indagación, consumos por llamada y deltas frente a V1.

`config/current-dev-promotion.json` propone criterios operativos previos a las etiquetas: ganancia ≥3 puntos porcentuales, aumento de falsas abstenciones/privacy FP =0, aumento de sobreclasificación ≤2 puntos sobre casos de abstención y rango entre tres corridas ≤5 puntos. Son elecciones de ingeniería para revisión, no nuevos thresholds de Jev; deben revisarse antes de ver resultados. El 85% es orientativo. **No hay promoción automática, ajuste para alcanzar 85%, ejecución automática del test final ni integración en Ayni.**

Solo después de revisar una candidata en DEV se planificará una única evaluación final con versión congelada, distinguiendo el efecto del filtro común del clasificador. Esta CLI de DEV prohíbe el test final; no contiene un bypass para ejecutarlo.

## Costos

**Gasto de API de esta fase: US$0.** Las pruebas son simuladas. No existen todavía costos ni latencias reales de estas cuatro variantes.

| Variante | Presupuesto estimado 80 × 3 |
|---|---:|
| CURRENT_V1_RAW | US$0.078720 |
| CURRENT_V2_RAW | US$0.120960 |
| CURRENT_V2_LUNA_CLEAN | US$0.150960 |
| CURRENT_V2_LUNA_INTERPRET | US$0.150960 |
| Total | **US$0.501600** |

Máximo conservador: 1,920 Jev + 480 Luna =2,400 llamadas. Incluye todos los casos en la estimación; los cuatro bloqueos del filtro no llaman a proveedores. La estimación no es un límite monetario garantizado.

Hipótesis centralizadas en `config/current-dev-planning.json`: V1 US$0.000164/llamada histórica; V2 6,000 tokens de entrada +350 de salida/llamada; Luna 500+150 tokens/llamada. Tarifas congeladas en `pricing-openrouter.json` y `pricing-luna.json`: Jev US$0.042/M entrada, salida US$0; Luna US$0.10/M entrada, US$0.01/M cache leído, US$0.125/M cache escrito y US$0.50/M salida. Los tokens de razonamiento ya están incluidos en salida, no se cobran dos veces.

El ledger conserva `usage` real y costo del proveedor Jev cuando existe. Un fallback de tarifa se identifica aparte. Luna conserva tokens reales y calcula costo tarifario identificado; no lo presenta como factura del proveedor. Costos desconocidos quedan null, con subtotal conocido y conteo de llamadas sin costo; nunca se sustituyen por cero. Se reportan total, /obs, /100, /1000, Jev, Luna, tokens, llamadas y latencia, con incrementos frente a V1. Un 401/402/403/429 detiene nuevas solicitudes y deshabilita candidatas.

## Cambios y rollback

Implementación nueva: `current-dev-{privacy,dataset,job,report}.mjs`, `current-v2.mjs`, `luna-clean-client.mjs`, CLI, configuraciones V2/planificación/criterios, propuesta/generador, revisión web y pruebas. Cambios existentes mínimos: exportar `trackedFetch` sin cambiar su comportamiento, script npm, lint y enlaces/documentación. V1, PARALLEL y LUNA_INTERPRET conservan sus fuentes.

Respaldo previo: commit limpio `c02d0b9efd242e4eef9e7bc87dd91a9b35512003`, marcado antes de editar con tag `codex/jev-current-before-dev-v2-2026-09-28`. Para revisar/recuperar ese estado usar el commit/tag en otra checkout; para retirar esta fase después del commit final, revertir ese commit. Los datos de adjudicación y resultados ignorados se conservan por separado. No hay migraciones ni despliegues.
