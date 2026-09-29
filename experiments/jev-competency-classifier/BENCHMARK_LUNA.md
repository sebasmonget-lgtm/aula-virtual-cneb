# Benchmark controlado Luna → Jev

## Alcance y respaldo

Solo cambia `experiments/jev-competency-classifier/`. No hay rutas nuevas de Ayni, migraciones, conexión a BD, flags de Ayni, deploy ni evaluación de estudiantes.

Respaldo: commit base `f03ff2abfd414d3a0512b9c2fbe89b06bea64e9d`, etiqueta `codex/jev-luna-before-benchmark-2026-09-28`. Implementación en `codex/jev-luna-benchmark`, worktree independiente. Para rollback, conservar los resultados privados y volver a esa etiqueta. No ejecutar un reset sobre el árbol principal con trabajo ajeno.

## Métodos que ya existían

El programa tiene dos recorridos anteriores; el nombre CURRENT debe leerse con la metadata de cada corrida.

| Recorrido | Nombre interno | Llamadas por caso | Principal / adicional | Abstención | Privacidad | KB y modelo |
| --- | --- | ---: | --- | --- | --- | --- |
| Composición docente actual, ya disponible en `cli/compare-product-path.mjs` | `product-teacher`, `createJevCompetencySuggester` | 2 concurrentes | Choice enfocado elige principal con confidence ≥0.50. Noul independiente añade ≥0.80, máximo 4 IDs incluyendo principal. | Principal NO_CLASIFICABLE, suficiencia <0.70 o confidence <0.50 vacían toda la propuesta. Una falla adicional conserva la principal. | `anonymousDecisionText` antes de proveedor; rechaza familiares e identificadores y neutraliza posibles nombres. | KB v4.1.0; `typesafe/jev-1.13`, snapshot efectivo en respuesta. |
| Paralelo del comparador anterior | `parallel-noul`, `createJevCompetencyClassifier` | 1 | Noul por competencia en una petición; ordena ≥0.80 para propuestas; ≥0.50 solo posibles de revisión. | Sin propuestas ≥0.80 se considera abstención para scoring; se conserva el estado UI review si hay posibles. Suficiencia se informa, sin cambiar su política. | El comparador de recorrido productivo aplica `anonymousDecisionText`; la UI simple solo exige datos anonimizados. | Comparador de recorrido: KB v4.1.0, focused; UI simple: KB v4.0.0. |
| Selección única de la UI local | `choice` | 1 | Una candidata, segunda solo como ranking; no asigna adicionales. | NO_CLASIFICABLE o confidence <0.50. Classified exige ≥0.82, margen ≥0.15 y probabilidad de abstención ≤0.20. Focused rebaja classified a review si suficiencia <0.80. | UI simple sin gate automático; entrada solicitada ficticia/anonimizada. | KB v4.0.0; modelo Jev del experimento. |

El benchmark usa por defecto **CURRENT=product-teacher** y **PARALLEL=parallel-noul focused con KB v4.1.0**, exactamente las variantes del comparador anterior. `--current-mode choice` selecciona explícitamente la pareja de la interfaz local y usa su KB v4.0.0. No se sustituye el panel previo ni se editan sus prompts, normalizadores o umbrales. Los adaptadores importan las implementaciones originales de solo lectura; no arrancan servidor Ayni ni crean contexto de telemetría/BD. Ese recorrido requiere las dependencias existentes del repositorio (`node_modules`).

Los métodos originales guardaban tokens reales input/output y, vía OpenRouter, `usage.cost`. El precio de respaldo de Jev es US$0.042/M entrada y US$0/M salida, fechado 2026-09-27. El benchmark preserva todos los campos `usage` de cada respuesta, también si su contenido no pasa la validación. No presenta un timeout sin usage como costo cero.

## Cuatro brazos

1. `CURRENT_RAW`: copia anónima original → CURRENT sin cambios.
2. `CURRENT_LUNA`: esa misma copia → Luna → CURRENT sin cambios.
3. `PARALLEL_RAW`: misma copia original → PARALLEL sin cambios.
4. `PARALLEL_LUNA`: misma salida de Luna → PARALLEL sin cambios.

Luna se llama una vez por caso y repetición y se comparte entre los dos métodos. Las repeticiones hacen llamadas nuevas, sin caché local ni reintentos automáticos. El caché de tokens del proveedor, si existe, sigue siendo usage real.

La copia anónima se obtiene **antes de los cuatro brazos**. Raw íntegro se guarda localmente; Luna nunca recibe nombre, ID, fecha, docente, entrevistas, historia, resultados de Jev ni gold. El contexto se somete a la misma protección conservadora. Si observación/contexto se bloquea, los cuatro brazos quedan en privacy_blocked con cero llamadas. Por ello, Luna no puede reparar un falso bloqueo previo; el reporte lo muestra en los cuatro brazos.

Luna recibe solamente `{age,type,context?,observation}`. Modelo `gpt-6-luna`, reasoning `low`, Responses API, `store:false`, JSON Schema estricto y límite de 2048 tokens de salida. No clasifica ni evalúa. La salida conserva `clean_observation`, `brief_interpretation` y `uncertainty` sin convertirlas a lenguaje curricular. Jev recibe el clean y secciones descriptivas/uncertumbre, con la interpretación identificada como reformulación derivada, sin duplicar raw. El límite de entrada original de Jev permanece vigente: si la transformación excede 2000 caracteres, se registra el fallo y no se trunca.

## Dataset

Colocar el archivo privado en `datasets/luna-benchmark/`; esta carpeta está ignorada por Git salvo la plantilla ficticia. La CLI acepta también una ruta externa absoluta. `.json` admite un arreglo o `{ "cases": [...] }`; `.jsonl` admite un objeto por línea.

```json
{
  "id": "RO-01",
  "age": 5,
  "type": "spontaneous",
  "context": "Juego libre con rampas",
  "observation": "Puso el carrito arriba y cambió la altura para probar de nuevo.",
  "expected": {
    "primary": "CYT_INDAGA",
    "acceptable_primary": [],
    "acceptable_secondary": [],
    "should_abstain": false,
    "should_privacy_block": false
  }
}
```

- Edad obligatoria 3, 4 o 5: el Jev existente la necesita; Luna podría omitir edad, pero esta matriz no puede clasificar sin ella.
- Tipo `spontaneous` o `guided`. Contexto libre de hasta 500 caracteres. Observación de hasta 2000.
- Para varias primarias aceptables, usar `acceptable_primary` y omitir `primary` si no se quiere una métrica estricta. No se cuentan esos casos en el denominador de primaria estricta, sí en primaria aceptable.
- Abstención: `primary:null`, `should_abstain:true`. Privacidad real: `should_privacy_block:true`. `discussable:true` identifica una adjudicación discutible; varias primarias también la identifican.
- Para secundaria, listar los IDs en `acceptable_secondary`. Se informa cuántas propuestas coinciden y cuántas quedan fuera. El exact match exige primaria aceptable más **todo el conjunto secundario enumerado**, sin extras. Si las secundarias son solo posibilidades no exhaustivas, interpretar el exact match con esa limitación; cerrar etiquetas con docentes antes de evaluar.
- IDs estables: `COM_ORAL`, `COM_LECTURA`, `CYT_INDAGA`, `MAT_CANTIDAD`, etc. Se aceptan `COMUNICACION_ORAL`, `LEE_TEXTOS`, `INDAGA` y los alias del gold v1: `CANTIDAD`, `ARTE`, `CONVIVENCIA`, `ESCRITURA`, `FORMA_LOCALIZACION`, `INDAGACION`, `MOTRICIDAD`. Se convierten localmente a sus IDs canónicos antes del scoring, nunca se envían al proveedor. Se rechazan etiquetas no aplicables por edad/aplicabilidad. No se infiere edad.
- Compatibilidad: `expected_competency_id` y `acceptable_secondary_ids` anteriores. Se puede agregar `name` o `known_names` para neutralizar nombres presentes en la observación; esa metadata nunca se envía. No se conservan metadata ajenas innecesarias.

La plantilla es sintética y no es un gold adjudicado por especialistas. No se ajustaron prompts mirando sus respuestas.

## Ejecución CLI

Desde la carpeta del experimento, con Node ≥22.13 y dependencias del repositorio disponibles. Poner `OPENROUTER_API_KEY` y `OPENAI_API_KEY` solo en `.env.local` del experimento; nunca en datasets, comandos visibles ni Git. Jev se consulta vía OpenRouter en este harness; el proveedor TypeSafe directo del panel anterior sigue disponible pero no participa en la nueva matriz.

```powershell
# Vista previa: no hace llamadas.
npm.cmd run eval:luna -- --dataset datasets/luna-benchmark/nuestro-gold.jsonl --runs 3

# Prueba pequeña: 3 casos, una repetición, límite hasta 21 llamadas.
npm.cmd run eval:luna -- --dataset datasets/luna-benchmark/nuestro-gold.jsonl --limit 3 --runs 1 --execute --max-live-requests 21

# La misma prueba con 3 repeticiones: hasta 63 llamadas.
npm.cmd run eval:luna -- --dataset datasets/luna-benchmark/nuestro-gold.jsonl --limit 3 --runs 3 --execute --max-live-requests 63
```

Para el dataset completo de N casos, `--runs 3` requiere máximo `21 × N` llamadas (6 Jev + 1 Luna por caso/repetición). Primero revisar la vista previa y después añadir `--execute --max-live-requests <máximo mostrado>`. No se ejecuta automáticamente una corrida grande.

Opciones: `--methods current|parallel|both`, `--no-luna`, `--current-mode product-teacher|choice`, `--criteria-profile focused|compact|enriched`, `--runs 1|3|5`, `--limit N`. El perfil cambia ambos brazos del método local por igual; no el prompt del CURRENT product-teacher. Registrar la variante antes de mirar el gold. Un cambio de variante es otro experimento, no una optimización sobre el test set.

## UI

`npm.cmd run dev` conserva `127.0.0.1:4179`. Para usar un puerto aislado:

```powershell
$env:JEV_EXPERIMENT_PORT = "4182"
npm.cmd run dev
```

La sección **Benchmark Luna** permite elegir dataset, métodos, activar Luna y repeticiones. **Calcular llamadas y costo** habilita la ejecución de esa vista previa. Al cambiar controles se invalida la vista previa; el servidor verifica la huella del dataset. Solo una corrida a la vez; progreso por caso-repetición y costo conocido acumulado. Resultado final o parcial visible. El servidor escucha exclusivamente en loopback y rechaza POST con Origin externo. El panel original sigue usando su contrato anterior.

## Resultados y métricas

`results/<timestamp>-<id-aleatorio>/` no se sobrescribe y está ignorado por Git:

- `raw-results.json`: raw original, copia anónima, salida Luna, cada brazo, respuestas Jev, usage real, costos, latencias, errores y score. Checkpoint tras cada caso.
- `summary.json`: agregado por brazo, deltas, repetición individual, versiones/precios, completados frente a previstos.
- `comparison.md`: tabla, mejorados/empeorados/iguales/incompletos y todos los casos.
- `errors.md`: fallas de API y diferencias respecto del gold, incluidas las desfavorables.
- `cost-analysis.md`: costos completos por brazo, proveedores/tokens, incrementos, eficiencia y 12 escenarios mensuales.
- `cost-analysis.json`: cifras sin redondear, procedencia y ledger por llamada con usage original. Luna física compartida se cuenta una vez.
- `monthly-costs.csv`: escenarios mensuales para 1/10/50/100 profesoras y 10/20/40 observaciones diarias por profesora.
- `runs/run-1.json`, `run-2.json`, etc.: cada repetición separada.

Las tasas incluyen en su denominador los fallos y bloqueos falsos; no se descartan para mejorar resultados. Se separan primaria estricta, primaria aceptable, top-2, exact match, false abstention, overclassification, privacidad TP/FP, secundarias correctas/incorrectas y casos discutibles. Matriz de confusión cuando existen al menos 10 observaciones distintas; repetir un caso no aumenta ese tamaño.

`IMPROVED`: RAW incumple el gold y Luna lo satisface. `WORSENED`: lo contrario. `SAME`: ambos satisfacen o ambos incumplen; el detalle muestra los errores distintos. `UNDETERMINED`: falta un resultado o hay falla de proveedor. Satisfacer significa abstenerse cuando corresponde, bloquear privacidad cuando corresponde, o proponer primaria aceptable con el conjunto secundario esperado y sin extras. No interviene otro LLM.

## Costo y latencia

Tarifa Luna centralizada en `config/pricing-luna.json`, fuente oficial y fecha. Procesamiento estándar y contexto breve: input US$0.10/M, cached input US$0.01/M, output US$0.50/M; cache writes US$0.125/M cuando usage expone ese campo. Se calcula sobre tokens reales, descontando cached/writes del input común. Reasoning tokens son parte de output y no se cobran dos veces. No se estima usage ausente.

Jev: primero `usage.cost`, después tarifa de `config/pricing-openrouter.json` aplicada al usage real; origen conservado por llamada. Usage desconocido → costo desconocido. Un error no borra usage válido. HTTP de cuota/auth/rate-limit detiene la corrida; las dos solicitudes concurrentes originales de CURRENT pueden haber comenzado antes de ese rechazo.

Por brazo: `cost_luna_usd`, `cost_jev_usd`, `total_cost_usd`, número de llamadas Jev y `total_latency_ms`. CURRENT mide duración real de sus dos llamadas concurrentes, no la suma; Luna se añade a esa duración secuencial. La comparación por método atribuye una Luna completa a cada brazo Luna. El gasto real conjunto solo cuenta **una** Luna compartida por caso/repetición. Los costos conocidos y el número de llamadas con costo desconocido se reportan por separado.

También se informan costo medio, por 100/1000, por clasificación correcta, costo incremental y costo adicional por error corregido. Las proyecciones usan costos observados en esa corrida, incluyendo los bloqueos sin costo. El presupuesto previo usa `benchmark-planning.json`: promedio histórico Jev y hipótesis explícita de tokens Luna; no es una predicción precisa ni reemplaza usage real.

### Análisis ampliado sin nuevas llamadas

```powershell
npm.cmd run costs:luna -- results/<run-id>/raw-results.json
```

Genera `cost-review-<timestamp>-<id>/` junto al resultado original sin sobrescribirlo. Usa la tarifa congelada en metadata de la corrida; no revaloriza el pasado con precios nuevos. `config/cost-scenarios.json` centraliza días lectivos, profesoras y observaciones/día. El módulo es postprocesamiento y no invoca proveedores.

El informe distingue importe informado por Jev, estimación de Jev cuando falta ese importe y valoración tarifaria de tokens reales Luna (OpenAI no devuelve aquí un importe facturado). Un total con llamadas sin costo sigue desconocido; el subtotal conocido se conserva aparte. No sumar los cuatro totales de adopción: duplicaría la Luna compartida.

Costo por clasificación correcta completa = gasto del brazo / casos con primaria aceptable y secundarias exactas; abstenciones y bloqueos no cuentan como clasificaciones. También se informa USD por primaria aceptable y accuracy de decisión completa (incluye abstención/privacidad). Errores corregidos netos descuentan casos empeorados; se conserva el costo por mejora bruta pedido. La ganancia pp/USD declara la exposición del benchmark y ofrece una normalización a 1,000 observaciones. El criterio económico de selección es menor costo por clasificación correcta completa, acompañado de frontera de Pareto costo/accuracy. Una corrida detenida no produce recomendación de ganador.

La proyección mensual es una estimación lineal con la mezcla de casos/bloqueos, tokens, caché y precios observados. No incluye impuestos, hosting, almacenamiento ni audio. Las repeticiones no triplican el costo operativo por observación: se divide por el número de casos-repetición ejecutados.

## Validación y límites

Pruebas automáticas sin proveedores: equivalencia exacta de los payloads RAW con las implementaciones anteriores, gold mutado sin cambiar prompts, guardia de todos los campos de leakage, privacidad antes de proveedor, repetición 3, costos reales/caché/reasoning, parada de cuota y archivos distintos. El `typecheck` es comprobación de sintaxis JavaScript, no un typecheck TypeScript; lint revisa secretos y ejecuta ESLint con reglas propias del experimento; build copia assets locales.

Ver `docs/VALIDATION_LUNA.md` para los comandos y resultados ejecutados en este cambio. No se deriva una conclusión pedagógica de la plantilla ni de una sola corrida; hace falta el JSON/JSONL nuevo etiquetado manualmente y varias repeticiones.
