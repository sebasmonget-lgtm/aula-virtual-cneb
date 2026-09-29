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

La migración local `0066` y Supabase `202609290001` añaden `classifier_version`, `classifier_status`, `teacher_action`, `classifier_latency_ms` y `classifier_error_code`. Se reutilizan `suggested_competency_v4_ids` y `competency_v4_ids` para sugerencia y decisión final. `teacher_action` es la decisión vigente de la fila: `confirmed`, `changed`, `rejected` o `saved_without_competency`. La tabla de eventos incorporada para el piloto conserva cada decisión anterior.

`GET /api/diagnostics/spontaneous-observations/metrics` entrega solo agregados del aula y docente autenticados. No entrega texto ni IDs de alumnos ni payload del proveedor.

## Piloto inicial de 30 observaciones

La tabla `diagnostic_spontaneous_observation_decision_events` (migraciones local `0067` y Supabase `202609290002`) registra cada gesto docente con su número secuencial, versión, sugerencia original y selección resultante. Esas migraciones añaden también contadores de intentos y fallos técnicos a la observación. La actualización de la observación y la inserción del evento se confirman en una sola transacción. El trigger rechaza modificación o borrado de eventos y valida que actor/aula/snapshots coincidan con la observación al insertarlos. El servidor autoriza la operación; en Supabase RLS concede solo lectura propia y no concede escritura directa al cliente. La tabla no duplica nota, nombre, prompt ni respuesta del proveedor. La primera decisión y una corrección posterior son dos filas distintas. `teacher_action` sigue mostrando únicamente la última decisión. No se hace backfill: las decisiones anteriores a la migración pueden aparecer como `reviewed_without_event`.

El endpoint se consulta con la sesión autenticada mediante `GET /api/diagnostics/spontaneous-observations/metrics`. Los agregados se restringen al aula activa y docente de la sesión. `pilot.target=30` es una meta de presentación; no cambia el clasificador ni detiene la recolección.

**Conteos y denominadores exactos:**

- `classifier.attempted` cuenta **observaciones** con al menos un intento de invocación. `attempt_calls` cuenta todas las invocaciones, incluidas repeticiones. Para filas V2.4 anteriores a esta migración se infiere un intento mínimo si su estado final es sugerido, abstención o fallo. Un fallo de configuración previo al HTTP puede contarse: estas cifras no equivalen a requests facturados. `privacy_blocked`, `missing_text`, `disabled` y `pending_classifier` se informan aparte.
- `technical_failed` cuenta observaciones que tuvieron al menos un fallo técnico, incluso si luego se recuperaron; `technical_failure_attempts` cuenta esos fallos. `technical_error_codes` presenta solo códigos del fallo **vigente**, pues el código anterior se reemplaza al reintentar. Un intento que la docente adelanta con una decisión manual sigue en `attempted` aunque no tenga resultado del modelo.
- `classifier.completed_classifier_attempts = suggested + abstained`: respuestas válidas que permiten medir abstención. `abstention_rate = abstained / completed_classifier_attempts`. Si el denominador es cero, la tasa es `null`.
- `review.suggestions_total = suggested`, incluidas las todavía no revisadas. `suggestions_reviewed` cuenta sugerencias cuyo **estado docente vigente** es `confirmed`, `changed` o `rejected`; `suggestions_pending_review = suggestions_total - suggestions_reviewed`. Una fila pendiente del clasificador no es una sugerencia ni un error.
- `direct_confirmation_rate_reviewed = direct_confirmations / suggestions_reviewed`; `changed_rate_reviewed = changed / suggestions_reviewed`; `rejected_rate_reviewed = rejected / suggestions_reviewed`. Estas son las tasas principales entre sugerencias revisadas; no se denominan accuracy de Jev. `review_completion_rate = suggestions_reviewed / suggestions_total`.
- `direct_confirmation_rate_all_suggestions = direct_confirmations / suggestions_total` es solo una tasa operativa que incluye pendientes; no sustituye la tasa principal. `saved_without_competency` cuenta decisiones vigentes sin competencia después de abstención, fallo u otro estado sin sugerencia. Ante una sugerencia activa, dejar sin competencia se registra como `rejected`.
- `pilot.remaining_to_target = max(0, 30 - classifier.attempted)`. El piloto puede superar 30. `pilot.reviewed_suggestions` indica cuántas sugerencias del conjunto ya tienen decisión vigente.

`correction_matrix` agrupa **sugerencia principal → competencia principal confirmada vigente → cantidad**, tanto coincidencias como cambios. Los rechazos no tienen competencia final y se cuentan aparte. `distribution` muestra para cada ID curricular sugerencias, selecciones finales, cambios hacia él y cambios desde él. La latencia se expresa en milisegundos: media y percentiles p50/p95 de valores disponibles; los percentiles usan el rango más cercano hacia arriba sobre los datos ordenados. Fallos y bloqueos permanecen en sus categorías; falsos bloqueos de privacidad y claridad de la UX requieren revisión humana posterior.

Ejemplo ilustrativo de respuesta, sin observaciones reales:

```json
{
  "classifier_version": "CURRENT_V2_4_RAW",
  "observations": 5,
  "classifier": {
    "attempted": 4, "attempt_calls": 4, "suggested": 3, "abstained": 1,
    "privacy_blocked": 0, "technical_failed": 0, "technical_failure_attempts": 0,
    "pending_classifier": 1,
    "completed_classifier_attempts": 4, "missing_text": 0, "disabled": 0,
    "technical_error_codes": {}
  },
  "review": {
    "suggestions_total": 3, "suggestions_reviewed": 2,
    "suggestions_pending_review": 1, "direct_confirmations": 1,
    "changed": 1, "rejected": 0, "saved_without_competency": 1,
    "decision_events_recorded": 3, "observations_with_multiple_decisions": 0,
    "reviewed_without_event": 0
  },
  "rates": {
    "direct_confirmation_rate_reviewed": 0.5,
    "review_completion_rate": 0.6666666666666666,
    "changed_rate_reviewed": 0.5,
    "rejected_rate_reviewed": 0,
    "abstention_rate": 0.25,
    "direct_confirmation_rate_all_suggestions": 0.3333333333333333
  },
  "correction_matrix": [
    { "suggested_competency": "MAT_CANTIDAD", "confirmed_competency": "MAT_CANTIDAD", "count": 1 },
    { "suggested_competency": "MAT_FORMA", "confirmed_competency": "MAT_CANTIDAD", "count": 1 }
  ],
  "distribution": [
    { "competency": "COM_ORAL", "suggested": 1, "confirmed": 0, "changed_toward": 0, "changed_from": 0 },
    { "competency": "MAT_CANTIDAD", "suggested": 1, "confirmed": 2, "changed_toward": 1, "changed_from": 0 },
    { "competency": "MAT_FORMA", "suggested": 1, "confirmed": 0, "changed_toward": 0, "changed_from": 1 }
  ],
  "latency_ms": { "count": 4, "mean": 350, "p50": 300, "p95": 600 },
  "pilot": { "target": 30, "attempted": 4, "reviewed_suggestions": 2, "remaining_to_target": 26 }
}
```

Treinta observaciones constituyen un piloto exploratorio, no una validación estadística definitiva. Durante la recolección no se modifican prompt, modelo, thresholds ni privacidad de V2.4 en función de los resultados.

## Flag y rollback

Con `AYNI_OBSERVATION_CLASSIFIER_V24=1` y `OPENROUTER_API_KEY` configurados en el servidor, se activa V2.4. Reiniciar el servidor con el flag apagado detiene llamadas de este flujo, conserva notas y sugerencias ya registradas, mueve pendientes V2.4 a revisión manual al cargarlas y permite vinculación curricular por la docente. No hace falta revertir migraciones ni borrar datos. No desplegar automáticamente: aplicar ambas migraciones en sus entornos respectivos antes de encender el flag.

## Prueba manual supervisada

1. En un entorno de prueba con migración aplicada, registrar/dictar una nota concreta y verificar que el texto original se conserva, aparece la sugerencia principal y ninguna competencia queda confirmada antes de pulsar «Confirmar».
2. Confirmar una sugerencia, cambiar otra y dejar una tercera sin competencia; comprobar en la API de métricas las acciones y tasas correspondientes.
3. Registrar una nota solo circunstancial, otra con «mamá» y una con correo/dirección; comprobar abstención, sugerencia posible y fallback manual, respectivamente.
4. Apagar el flag, reiniciar, registrar otra nota y elegir manualmente una competencia. Verificar que no hay llamadas Jev en este flujo y que Assessment solo muestra las notas vinculadas por decisión docente.

No se han realizado todavía llamadas reales ni revisión de 30 observaciones; esa medición corresponde al piloto con profesoras.
