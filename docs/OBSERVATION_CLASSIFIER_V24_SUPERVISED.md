# Piloto supervisado de observaciones con CURRENT_V2_4_RAW

## Alcance y respaldo

Rama `codex/jev-v24-supervised`; respaldo previo `ee4d21a`. El cambio afecta solo a las observaciones diagnósticas espontáneas (`diagnostic_spontaneous_observations`). La observación ordinaria F5/F6, Project Master, actividades, Assessment Master, valoraciones y documentos conservan sus rutas.

Antes del cambio, `SpontaneousDiagnostic` guardaba la nota original con `recordSpontaneousObservation` y una cola en `scripts/local-db-server.mjs` llamaba al clasificador anterior, con posible fallback a OpenAI. `suggested_competency_v4_ids` ya estaba separado de `competency_v4_ids`. `correctSpontaneousClassification` era la única acción que escribía los IDs confirmados por la docente. `diagnostic-assessment-v4.mjs` lee solo filas `classification_status='classified'` y `competency_v4_ids`; la evaluación ordinaria consume atribuciones confirmadas. Esos consumidores no se modifican.

## Flujo y permisos

1. El servidor valida docente, aula y alumno activo, guarda texto original y media privada; marca la fila con `classifier_version='CURRENT_V2_4_RAW'` y `classifier_status='pending'` solo si `AYNI_OBSERVATION_CLASSIFIER_V24=1`.
2. La cola toma solo filas nuevas marcadas V2.4. El filtro de privacidad usa nombres del aula autorizada, bloquea identificadores directos y direcciones; «mamá», «papá», «familia», «hermano» y «casa» no son motivo de bloqueo. Preserva los verbos/conectores comprobados. Si una mayúscula es ambigua, bloquea la llamada en vez de borrar una acción pedagógica. El texto guardado nunca se sustituye por el texto depurado.
3. El adaptador invoca directamente el código y prompt experimentales congelados, verificados por SHA-256, modelo Jev 1.13, RAW y umbrales 0.50/0.70/0.80. No llama a Luna ni incluye etiquetas gold. Guarda solo IDs sugeridos, estado, versión, latencia y código técnico seguro; no guarda prompt, respuesta cruda ni interpretación transformada.
4. La UI presenta solo la principal y ofrece confirmar, cambiar o dejar sin competencia. La abstención permite elegir o guardar sin competencia. Secundarias quedan en `suggested_competency_v4_ids` para análisis, sin selección implícita. La selección manual valida competencia aplicable en servidor y escribe `competency_v4_ids`; hasta entonces Assessment no la consume.
5. Si el proveedor falla, la respuesta es inválida, hay timeout o la privacidad impide la llamada, la nota queda guardada y la docente puede elegir manualmente. La cola no procesa filas históricas sin marca V2.4. En el servidor, las escrituras verifican pertenencia al aula; la política RLS conserva lectura propia y prohíbe escrituras directas de `authenticated`.

## Telemetría y consulta

La migración local `0066` y Supabase `202609290001` añaden `classifier_version`, `classifier_status`, `teacher_action`, `classifier_latency_ms` y `classifier_error_code`. Se reutilizan `suggested_competency_v4_ids` y `competency_v4_ids` para sugerencia y decisión final. `teacher_action` es la decisión vigente de la fila: `confirmed`, `changed`, `rejected` o `saved_without_competency`. Una revisión posterior de la misma fila actualiza esa decisión vigente; para un estudio de decisiones sucesivas se requeriría un registro de eventos adicional.

`GET /api/diagnostics/spontaneous-observations/metrics` entrega solo agregados del aula y docente autenticados: total, sugerencias, acciones, tasas de confirmación/corrección/rechazo entre sugerencias, abstenciones entre intentos completados, distribución por competencia sugerida/confirmada y latencia media. Las filas pendientes o sin llamada no cuentan como abstención. No entrega texto de niños ni payload del proveedor. Para la validación de 100–300 observaciones reales, la tasa principal es confirmaciones directas divididas entre sugerencias; las acciones todavía pendientes de revisión permanecen en el denominador.

## Flag y rollback

Con `AYNI_OBSERVATION_CLASSIFIER_V24=1` y `OPENROUTER_API_KEY` configurados en el servidor, se activa V2.4. Reiniciar el servidor con el flag apagado detiene llamadas de este flujo, conserva notas y sugerencias ya registradas, mueve pendientes V2.4 a revisión manual al cargarlas y permite vinculación curricular por la docente. No hace falta revertir migraciones ni borrar datos. No desplegar automáticamente: aplicar ambas migraciones en sus entornos respectivos antes de encender el flag.

## Prueba manual supervisada

1. En un entorno de prueba con migración aplicada, registrar/dictar una nota concreta y verificar que el texto original se conserva, aparece la sugerencia principal y ninguna competencia queda confirmada antes de pulsar «Confirmar».
2. Confirmar una sugerencia, cambiar otra y dejar una tercera sin competencia; comprobar en la API de métricas las acciones y tasas correspondientes.
3. Registrar una nota solo circunstancial, otra con «mamá» y una con correo/dirección; comprobar abstención, sugerencia posible y fallback manual, respectivamente.
4. Apagar el flag, reiniciar, registrar otra nota y elegir manualmente una competencia. Verificar que no hay llamadas Jev en este flujo y que Assessment solo muestra las notas vinculadas por decisión docente.

No se han realizado todavía llamadas reales ni revisión de 100–300 observaciones; esa medición corresponde al piloto con profesoras.
