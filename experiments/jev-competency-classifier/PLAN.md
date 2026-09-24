# Plan de implementación: clasificador experimental Jev–CNEB

Estado: plan de diseño listo para revisión e implementación; sin código del experimento aún.
Fecha de diseño: 2026-09-23.
Responsabilidad de ejecución prevista: GPT-5.6 Terra, siguiendo este contrato.

## 1. Pregunta que debe responder

¿Puede Jev elegir la competencia CNEB de Inicial más directamente sustentada por una observación espontánea escrita en español, y abstenerse o pedir revisión cuando la nota no permite una asociación fiable?

La variable decisiva será la **precisión de las clasificaciones aceptadas automáticamente frente a la proporción de casos que se pueden aceptar**. También se medirán error por competencia, abstención, costo y latencia. El experimento no evaluará logros del niño, niveles A/B/C ni conclusiones pedagógicas.

## 2. Límites del trabajo

- Todo el código, datos ficticios, configuración, resultados locales y documentación del prototipo vivirán bajo `experiments/jev-competency-classifier/`.
- La KB v4 se lee sin modificarla. No se crean competencias paralelas ni mappings a UUID legacy.
- No se modifican diagnóstico, workflows, routing, migraciones, StudentContext ni el adaptador `src/lib/diagnostic-jev-adapter.mjs`. La existencia de ese adaptador no demuestra calidad del modelo y no se usará para este benchmark.
- No se hacen commit, push ni despliegue.
- Solo se usarán observaciones ficticias o anonimizadas de forma irreversible. No se introducirán nombres, UUID, colegio, docente, información familiar, fotos ni audio.
- Las pruebas ordinarias jamás llaman a TypeSafe. Una llamada real requiere un comando explícito.
- Con `TYPESAFE_API_KEY` ausente, se entrega el prototipo funcional con cliente simulado y se reporta que las métricas reales están pendientes.

### Contexto del repositorio al diseñar

`docs/DECISIONS.md` contiene un ADR nuevo sobre observaciones espontáneas y un umbral de 0.82 para el adaptador de Ayni. El experimento debe **medir 0.82 como un umbral candidato**, junto con otros, sin adoptarlo como valor validado. El árbol de trabajo ya contiene cambios ajenos; deben preservarse.

## 3. Entregables

Estructura orientativa; Terra puede ajustar nombres sin cambiar responsabilidades:

```text
experiments/jev-competency-classifier/
  PLAN.md
  README.md
  package.json
  .env.example
  .gitignore
  config/
    classifier.json
    pricing.json
  src/
    kb-loader.*
    criteria-builder.*
    typesafe-client.*
    jev-classifier.*
    baseline-classifier.*
    decision-policy.*
    cache.*
    dataset.*
    metrics.*
    local-server.*
  public/
    index.html
    app.*
  cli/
    models.*
    benchmark.*
  datasets/
    development.jsonl
    golden.template.jsonl
  tests/
  reports/                 # archivos locales ignorados por Git
  .cache/                  # respuestas locales ignoradas por Git
```

Preferir Node 22 y pocas dependencias. La UI puede ser HTML y JavaScript sencillos. El servidor escuchará solo en `127.0.0.1`; la clave no se enviará al navegador. Deben existir comandos equivalentes a `npm run dev`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run models` y `npm run eval:jev`. El README debe marcar claramente cuáles consumen API.

## 4. Contrato de entrada y aplicabilidad

```ts
type ClassificationInput = {
  age: 3 | 4 | 5;
  observation: string; // conservar exactamente el texto recibido
  context?: "juego_libre" | "recreo" | "lonchera" | "asamblea" |
    "rutina" | "exploracion" | "actividad" | "otro";
  applicability?: {
    castellano_as_second_language?: boolean;
    religion_applicable?: boolean;
  };
};
```

Rechazar edad inválida, texto vacío y entradas excesivas antes de llamar a la API; documentar los límites de tamaño. `applicability` es información contextual no personal y su omisión equivale a `false`. No inferir estos dos indicadores a partir del texto de la observación.

Para construir opciones, leer `03_semantic/competency_cards.jsonl`, `02_official_reference/age_competency_matrix.json`, `02_official_reference/special_applicability.json` y `manifest.json`. Verificar huellas de los archivos consumidos, IDs únicos y consistencia de aplicabilidad. Usar `runtime_selectable_by_age` y los observables de `ages[String(age)]` de cada tarjeta; no introducir patrones de otras edades. Según la KB actual hay 10 opciones a los 3 años, 11 a los 4 y 14 a los 5, antes de condiciones especiales. `CAST_L2_ORAL` y `PS_RELIGION` requieren los indicadores explícitos anteriores.

Cada criterio enviado a Jev debe partir de campos existentes en su tarjeta: `official_name`, `ai_meaning`, foco y observables de esa edad, y límites de uso. La primera versión debe ser concisa, determinista y trazable a los campos fuente. Registrar longitud/tokens de la consulta para poder comparar una versión posterior más breve o más rica. Añadir siempre `NO_CLASIFICABLE`, definido para notas insuficientes, irrelevantes o sin actuación que sustente una competencia. La instrucción debe pedir la competencia **más directamente observada**, sin interpretar logro ni inventar propósito docente.

## 5. API y normalización

Consultar la documentación oficial al implementar. Contrato verificado el 2026-09-23:

- `GET https://api.typesafe.ai/v1/models` con bearer token: descubrir nombres disponibles para la cuenta.
- `POST https://api.typesafe.ai/v1/systemone`: enviar `state`, `model` y una pregunta `choice` cuyos `criteria` son las competencias aplicables más `NO_CLASIFICABLE`.
- `state`: únicamente edad, contexto breve y texto original de la observación. Las definiciones de competencia pertenecen a `criteria`.
- El `choice` devuelve opción, probabilidades de todas las opciones y `confidence`; la respuesta incluye modelo efectivo y `usage.input_tokens` / `usage.output_tokens`.

Seleccionar un alias Jev que aparezca en `/v1/models`, preferiblemente `jev-latest` si está disponible. El benchmark debe guardar el modelo versionado que respondió y poder fijarlo en ejecuciones posteriores; un alias móvil no garantiza comparabilidad. No registrar clave, headers ni respuesta cruda con posibles datos sensibles. No hacer reintentos automáticos en esta primera versión: una solicitud corresponde a un intento medible y con costo conocido.

La interfaz `CompetencyClassifier` expondrá `classifyObservation(input)` y tendrá implementaciones Jev, baseline y fake. El resto del experimento consume solo un resultado normalizado. Validar que la opción ganadora exista entre los criterios enviados, que estén todas las probabilidades esperadas, sean finitas y estén en `[0,1]`, sumen aproximadamente uno y que `confidence` y usage tengan tipos válidos. Una respuesta que no pase el contrato produce `classification_failed`.

Resultado normalizado propuesto:

```ts
type ClassificationResult = {
  status: "classified" | "review" | "unclassified" | "classification_failed";
  primary_competency_id: string | null; // null si no hay asociación automática
  proposed_competency_id: string | null; // candidato visible solo para revisión
  secondary_candidate: { competency_id: string; probability: number } | null;
  probabilities: Record<string, number>; // incluye NO_CLASIFICABLE
  model_confidence: number | null; // valor de TypeSafe, distinto de top1_probability
  top1_probability: number | null;
  top2_probability: number | null;
  top1_top2_margin: number | null;
  unclassifiable_probability: number | null;
  model_requested: string | null;
  model_effective: string | null;
  classifier_version: string;
  knowledge_base_version: string;
  criteria_fingerprint: string;
  usage: { input_tokens: number; output_tokens: number } | null;
  latency_ms: number | null;
  cache_hit: boolean;
  error_code?: "missing_key" | "auth" | "rate_limited" | "timeout" |
    "server_error" | "model_unavailable" | "invalid_response" | "network";
};
```

`classified` permite asociación automática; `review` muestra un candidato sin asociarlo; `unclassified` no asigna competencia; `classification_failed` expresa una falla operativa. Si Jev elige `NO_CLASIFICABLE`, usar `unclassified`. Si elige competencia, aplicar umbrales configurables de confianza y margen para `classified` o `review`; confianza muy baja puede ir a `unclassified` sin perder la distribución para análisis. La probabilidad de `NO_CLASIFICABLE` también puede bloquear aceptación automática. Los valores iniciales son parámetros exploratorios, no umbrales aprobados.

## 6. Dataset y baseline

Crear `development.jsonl` con casos ficticios, etiquetados **antes** de invocar Jev. Incluir las 14 competencias cuando correspondan a la edad, abstención esperada y las ocho familias de casos solicitadas: claros, ambiguos, pobres, no pedagógicos, varias actuaciones, errores de escritura, muy cortos y contexto desambiguador. Distribuir los ejemplos entre 3, 4 y 5 años. Separar casos especiales L2/Religión con su aplicabilidad explícita.

Esquema de caso:

```json
{
  "id": "dev-001",
  "age": 5,
  "context": "lonchera",
  "observation": "Contó los vasos y dijo que faltaba uno.",
  "applicability": {},
  "expected_competency_id": "MAT_CANTIDAD",
  "acceptable_secondary_ids": [],
  "case_type": "clear",
  "label_status": "provisional"
}
```

Para abstención, `expected_competency_id` será `null`. Para una nota genuinamente ambigua, conservar etiqueta primaria provisional y alternativas aceptables, y reportar su estrato por separado. No convertir la salida de Jev en verdad de referencia. No copiar directamente los 50 fixtures de `07_quality/competency_selection_50.json` al golden: están pendientes de revisión docente y algunos contienen `teacher_goal`, que revela la etiqueta.

El baseline será un conjunto simple y versionado de palabras/expresiones por competencia, solo para comparación. Aplicará el mismo filtrado de edad y reglas especiales. Los casos sin coincidencia y empates se abstendrán. No se usará este baseline como clasificador de Ayni.

`golden.template.jsonl` contendrá esquema y ejemplos ficticios mínimos. Una evaluación pedagógica concluyente requiere etiquetas revisadas independientemente y casos nuevos no utilizados para ajustar criterios ni umbrales. Los resultados del dataset de desarrollo se marcarán como exploratorios.

## 7. Benchmark y métricas

Aceptar JSON, JSONL y CSV con validación de IDs, edad, contexto, aplicabilidad, etiqueta y pertenencia a la KB. El runner tendrá `--limit`, `--no-cache`, selección de modelo y límite explícito de solicitudes reales. Guardar en cada reporte: fecha, versión, huella de KB/criterios, modelo solicitado y efectivo, dataset y su huella, configuración de umbrales, tarifa consultada y tamaño de muestra.

Calcular al menos:

1. Total, completados, abstenciones, revisiones y fallos de API.
2. Top‑1 y top‑2 sobre casos con etiqueta de competencia, indicando denominador y tratamiento de abstenciones.
3. Tasa de abstención correcta y falsas asociaciones en casos cuyo esperado es `null`.
4. Matriz de confusión con etiquetas esperada, predicha y `NO_CLASIFICABLE`; lista de pares más confundidos.
5. Auto-accept accuracy = autoaceptados correctos / todos los autoaceptados. Un caso esperado `null` aceptado automáticamente es error.
6. Auto-accept coverage = autoaceptados / todos los casos evaluables, con fallos de API reportados por separado. Mantener el mismo denominador a través de umbrales.
7. Barrido configurable de umbrales, incluyendo 0.82 como candidato, y de margen top‑1/top‑2. No optimizar y evaluar sobre el mismo golden.
8. Confidence media de aciertos y errores, y tabla por intervalos de confidence para examinar calibración.
9. Latencia real min, media, mediana/p50, p95 y max de llamadas a API; informar cache hits aparte.
10. Tokens y costo real de llamadas desde `usage`; proyecciones a 100, 1 000 y 10 000 observaciones basadas en el consumo medio medido, claramente identificadas como estimaciones.
11. Resultados por edad, tipo de caso, longitud de observación y aplicabilidad especial cuando haya suficientes ejemplos.
12. Comparación con baseline usando el mismo dataset y las mismas reglas de acierto.

No afirmar precisión de 97–99 % a partir de unas pocas decenas de ejemplos. Reportar numerador, denominador e intervalo de incertidumbre para la precisión de autoaceptación. Si una franja tiene muy pocos casos, decirlo de forma explícita.

## 8. Costo, privacidad y fallos

`config/pricing.json` registrará fuente, fecha y tarifa vigente verificada al implementar. Referencia al 2026-09-23: Jev 1.13 publica USD 0.042 por millón de tokens de entrada y salida gratuita. El cálculo será `input_tokens / 1_000_000 * input_usd_per_million + output_tokens / 1_000_000 * output_usd_per_million`. Nunca sustituir usage real por un conteo supuesto en el reporte de gasto incurrido.

La caché local usará SHA-256 sobre edad, contexto, observación exacta, aplicabilidad, `classifier_version`, huella de criterios/KB y modelo versionado. Los archivos de caché y reportes se ignoran por Git. `--no-cache` fuerza medición limpia. El README advertirá que la caché conserva el texto de observaciones; el experimento solo admitirá datos ficticios o anonimizados.

El cliente debe distinguir clave ausente, 401/403, 429, timeout, 5xx, modelo no disponible, red y respuesta inválida. Los mensajes de UI y logs serán seguros: sin token, headers, payload completo ni texto de observación en errores. El comando de benchmark se detendrá o marcará el resto sin intentar asociar una competencia tras un fallo sistemático de autenticación.

## 9. Orden de ejecución y puertas de calidad

### Etapa A — Núcleo sin red

Implementar lector KB, criterios por edad, contratos, normalizador, política de decisión y fake. Probar especialmente 3/4/5 años, L2/Religión, abstención, selección fuera de opciones y response incompleta. Entregable: clasificación simulada verificable desde tests.

### Etapa B — Flujo manual real

Añadir descubrimiento de modelos, cliente Jev y UI local. Validar con fake toda la ruta navegador → servidor → clasificador → resultado. Si hay `TYPESAFE_API_KEY`, hacer primero 3–5 llamadas ficticias, verificar modelo efectivo, forma de respuesta y usage. No avanzar a un lote ante errores contractuales.

### Etapa C — Benchmark reproducible

Añadir dataset provisional, lectores JSON/JSONL/CSV, baseline, caché, métricas, matriz y reporte. Con clave disponible, ejecutar un lote inicial acotado por `--limit` y presupuesto de llamadas; documentar número exacto de solicitudes y costo. Sin clave, producir un reporte de muestra con fake claramente marcado como simulado, sin presentar accuracy de Jev.

### Etapa D — Verificación final

Ejecutar `npm run typecheck`, `npm run lint`, `npm run build`, `npm test` y una prueba funcional de UI/batch. Verificar que las pruebas normales no realizan red y que archivos ignorados/secretos no aparecen en `git status`. Ejecutar las comprobaciones del proyecto raíz exigidas por `AGENTS.md`; si fallan por cambios previos ajenos, documentar el resultado sin alterar esos archivos.

## 10. Criterios de aceptación y entrega

- El experimento se inicia desde su directorio y funciona independientemente de Ayni.
- La UI permite probar una observación ficticia y muestra competencia, abstención/revisión, segunda candidata, distribución, modelo, tokens, costo y latencia.
- El benchmark acepta los tres formatos, reporta todas las métricas anteriores y permite repetir la corrida con configuración y huellas identificables.
- `npm test` y demás comprobaciones ordinarias no consumen API.
- No existe secreto ni dato de menores identificable en archivos, logs o reportes.
- Ningún archivo de producción, KB, migración o documentación raíz fue modificado por este trabajo.
- La recomendación final distingue **prometedor**, **necesita ajustes** o **no suficientemente fiable**, y explica con casos y tamaños de muestra por qué. Si no hay API key o golden revisado, la conclusión queda explícitamente provisional.

Rollback: retirar únicamente `experiments/jev-competency-classifier/`; no hay efectos sobre datos ni esquema de Ayni.

## 11. Fuentes a comprobar al implementar

- TypeSafe Choice: https://docs.typesafe.ai/primitives/choice
- TypeSafe API/OpenAPI: https://api.typesafe.ai/openapi.json
- Modelos, alias, idioma y tarifa: https://docs.typesafe.ai/models
- Limitaciones conocidas de Jev 1.13: https://docs.typesafe.ai/model-jaggedness/jev-1.13
- KB local: `knowledge/cneb-initial-3-5/v4.0.0/`
- Reglas del proyecto: `docs/PROJECT_MEMORY.md`, `docs/DECISIONS.md`, `docs/ERRORS_AND_FIXES.md`
