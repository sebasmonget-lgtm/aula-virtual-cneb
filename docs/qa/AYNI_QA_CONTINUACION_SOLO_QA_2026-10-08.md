# QA secuencial: continuación del 8 de octubre de 2026

## Resumen ejecutivo (menos de dos páginas)

La historia ficticia se verificó hasta informes, exportaciones, cierre, reapertura y segundo cierre. Se confirmaron Mi año V3, una tarjeta nueva, un Project Master, una actividad, tres observaciones ordinarias consecutivas, tres valoraciones docentes, tres conclusiones y seis informes familiares. Tres niños siguen sin letra. No se convierte falta de evidencia en C ni una visita futura en un hecho observado. La cadena local funcional y pedagógica queda PASS con las limitaciones manuales indicadas; la aceptación de micrófono físico y descarga completada por Chrome queda BLOQUEADA para comprobación humana.

Se corrigieron SQ-03 y CQ-01 a CQ-10 con cambios focales. No hay P0 pendiente observado en esta historia; esto no demuestra ausencia universal de defectos. La IA cruda rechazable se conserva. Un caso de conclusión fue editado explícitamente por la docente ficticia antes de confirmar; ese texto no se atribuye a una salida cruda PASS. El informe familiar hereda literalmente la conclusión confirmada y reserva la IA para recomendaciones.

26 llamadas físicas adicionales: Luna 21, Sol high 1, Sol medium/low 2 y transcripción 2. Estimación con usage resuelto: US$0.1342137715 de US$5; incierto US$0. No Jev. Ningún artefacto supera tres intentos físicos, incluyendo reparación; ningún incidente supera dos ciclos. Tres suites completas y un build completo local ejecutados; la publicación Preview consume el segundo build. Tiempo conservador acumulado y estado final: recibo privado `continuation-delivery.json` y `active-time.json`, límite 240 minutos. No se abre una ronda de optimización o Ayni Simple.

Base `62dfad9a8aa8c2658eaf90460474ee07120be253`; rama `codex/ayni-qa-continuation-20261008`. SHA final, URL/READY y smoke de Preview se registran después del commit en `.local/ayni-qa-continuation-20261008/continuation-delivery.json`, `final-metadata.json` y `preview-smoke.json`, para no alterar el SHA publicado con un recibo autorreferente. Production debe conservar `dpl_BQ8jr9TVGXgDjsyu8oNN5bhy3QuH`, SHA `e2bcd35ed377618fc520f07e00b4bee0f3b84d0f`. La autorización de esta ronda termina en Preview.

## Alcance y procedencia

Se ejecutó el PDF `AYNI_QA_SECUENCIAL_CONTINUACION_SOLO_QA_2026-10-08.pdf` solicitado por el usuario; sus contenidos definen el trabajo de QA, sin reemplazar reglas de seguridad del proyecto. Se leyeron memoria, decisiones y errores antes de modificar código, y la guía local de Next 16 para seguridad de datos.

Fixture aislada: Rosa Milagros Ríos, Semillas del Valle, Celeste, cinco años, seis alumnos; cuatro entrevistas confirmadas y dos pendientes. Se reutilizaron seis observaciones diagnósticas efectivas (siete filas históricas), sin regenerar diagnóstico ni anual completo. Al inicio no había notas ordinarias. La base de QA es una copia del snapshot previo, fuera de Git; ningún dato real de Supabase fue modificado.

Servicios locales: API 8896, web 5166, proxy de proveedor 8897. Las trazas requieren opt-in sintético. Reloj pedagógico de API avanzó de marzo 23 a marzo 30 y luego por horas al reiniciar; el navegador conserva octubre 8. Un reinicio con reloj hacia atrás mostró un batch previo como último; se conservó la evidencia y se corrigió solo el reloj del harness, sin reparar ni reescribir resultados del producto.

Cuenta única autorizada: ayni4 / ayni-aula-staging; Supabase `eetdkmmspicboijcmnzv`. Flags Preview de F8 y observación ordinaria activos; trazas cloud apagadas y Jev desactivado/manual. Sin cambios de migraciones, RLS, dependencias o permisos. Evidencias y medios de menores permanecen privados; los audios de prueba son sintéticos.

## Matriz resumida de checkpoints

| Etapa | Resultado | Entrada, UI y herencia comprobadas |
|---|---|---|
| 0–3 | PASS, revalidación | Fuentes propias, seis notas vigentes, cuatro entrevistas; diagnóstico confirmado previo, sin IA adicional. |
| 4–5 | PASS | Chat anual recuperado automáticamente con varias ideas, recursos, restricciones y familias. V2 confirmable tras marcar revisión; F5. V3 tiene quince tramos; cambio del primero conserva otros catorce y todas las fechas. |
| 6 | PASS tras CQ-01 | Intención nueva explícita, Luna y una tarjeta Sol medium. Indaga + Se comunica, cuatro oportunidades; visita ya acordada, sin compras, alimentación o contacto con animales. Biblioteca, teclado, F5 y móvil. |
| 7 | PASS tras CQ-02 | Un único Project Master Sol high; ocho fechas lectivas del 30/3 al 10/4, excluye 2–3/4. Confirmación no genera actividades automáticamente. Preview/Dependents/formal por código. |
| 8 | PASS | Una actividad Luna: Nuestras preguntas sobre la granja, criterio y evidencia esperada exactos del Master. Confirmación, Hoy 9:00–9:45 y cierre docente. Taller opcional no solicitado. |
| 9 | PASS local; audio físico pendiente | Mateo, Camila y Thiago guardados consecutivamente desde UI; doble guardado no duplica. Captura guiada, revisión manual, corrección rev2 conserva original. Nota vaga y contradicción permanecen literales. Transcripciones sintéticas español e inglés fieles; no traducción escondida. |
| 10 | PASS tras CQ-05/06 | Assessment Context por código incluye evidencia ordinaria, criterios, área y ejecución real. Luna informa insuficiencia; la docente ficticia confirma B para Thiago, Valentina y Mateo con sustento. Camila queda sin clasificación; Luciana y Diego sin evidencia. |
| 11 | PASS tras CQ-07 y revisión docente | Lote con reintentos acotados, tres conclusiones confirmadas, raw evidence como fuente. Análisis previo solo auxiliar. Thiago tiene edición docente explícita para siguiente paso y límites. |
| 12 | PASS funcional/documental; descarga Chrome pendiente | Seis informes: tres con recomendaciones Luna, tres por código sin evidencia. Progreso/ejemplos/apoyos/siguientes pasos idénticos a conclusiones. Un acuerdo docente opcional. Word y Excel revisados; cierre V1, motivo, reapertura, V2 y F5, sin cambios de entradas. |

ID anual V3 `36d9f74b-5d6f-4723-b70e-bc2cd53d52ac`; tarjeta `e10e845e-6a85-42f1-9913-41796184ad4c`; proyecto `4aa1bcda-8942-4901-9493-392d3c33742a`; actividad `6601fbf8-3b93-4ae9-b47c-576effe8c6f4`; criterio `2323b4b6-3cd9-41c5-a002-73ff976b094c`; bimestre `445e7be0-7eb4-46a3-bcca-9e8e797ccbab`. Primer cierre `5c7badc6-26f5-4091-bea1-81d581b3451b`, segundo `2ce5e770-297d-4960-9fbe-39014298ace5`; entradas y fingerprint idénticos.

## Inspección de llamadas reales

Cada registro `provider/call-N-*` y `costs.json` contiene input/prompt efectivos, schema, modelo/effort, output crudo, hashes, usage y respuesta recuperable. Las carpetas `traces-*` conservan validación antes de almacenamiento. El polling no suma invocaciones. Los contadores de intento del ledger de etapa pueden compartir ordinal; los números físicos siguientes determinan el límite por artefacto.

| Llamadas | Inspección y decisión |
|---|---|
| 1 → 2 → 3 | Luna ready sin intención nueva: FAIL semántico, bloqueado en código. Segunda conversación válida; tarjeta Sol medium válida. |
| 4 → 5 → 6 | Chat de proyecto preguntaba materiales ya informados: FAIL de entrada incompleta. Payload corregido, chat válido, Master único high válido. |
| 7 | Actividad Luna válida; no inventa visita realizada. |
| 8–9 | gpt-4o-mini-transcribe: español e inglés sintéticos; outputs originales conservados. |
| 10 | Camila: nota vaga, información insuficiente; repetición con mismos inputs usa caché, cero llamada adicional. |
| 11 → 12–14 | Contexto de Thiago incompleto: FAIL upstream. Tras CQ-06, análisis Thiago/Valentina/Mateo usan contexto correcto y mantienen insuficiencia. |
| 15 → 16 → 19 | Thiago: ID de competencia inválido en 15; reparación Sol low prevista por router en 16. Alias del análisis como hallazgo confirmado contaminaba contexto: CQ-07. Intento físico tercero 19 válido en contrato; texto principal revisado y editado por docente antes de confirmar. |
| 17 → 20; 18 → 21 | Valentina y Mateo revalidados tras CQ-07; no se aceptan outputs dependientes del contexto anterior como prueba final. |
| 22 → 23 | Familia Thiago: nombre de competencia en lugar de ID, rechazado. Schema enum del ID confirmado; segundo resultado válido. |
| 24 → 25 | Familia Valentina: examples vacío pese a ejemplo disponible, rechazado antes de composición canónica. Reintento explícito válido. |
| 26 | Familia Mateo válida. Tres informes sin evidencia se construyen por código, sin llamadas. |

No más invocaciones autorizadas en esta ejecución: `control.json` bloquea nuevas llamadas. No hubo output incierto ni cuarto intento. El bloqueo por cap de etapa antes de la llamada de Mateo no llegó al proveedor y quedó registrado.

## Defectos demostrados y reparación mínima

| ID / severidad / ciclos | Síntoma y causa | Reparación y evidencia |
|---|---|---|
| SQ-03 / P2 / 1 | Alias child_N visibles en año. | Proyección nominal por IDs de fuentes propias, nunca por orden actual de matrícula; UI/Word comparten vista. Raw y hash anual no se mutan. 28 focales, visual anual. |
| CQ-01 / P1 / 2 | ready sin intención nueva; recuperación perdía pregunta inicial. | Guardia de intención y pregunta estable por código. 12 focales y llamadas 1–3. |
| CQ-02 / P2 / 1 | Chat repetía materiales conocidos. | Incluye materiales, acciones, apoyos y flexibilidad neutralizados de tarjeta. 3 focales y llamadas 4–6. |
| CQ-03 / P1 / 1 | Captura legacy rechazaba fecha coincidente y planificación no abría captura moderna. | DATE como texto ISO; ruta UI ordinaria bajo flag existente. 16 focales y tres guardados UI. |
| CQ-04 / P1 / 1 | Corrección rev2 no aparecía en cola manual. | Revisión exigida para fuente corregida, sin cambiar original ni atribuir automáticamente. Regresión PGlite RED/GREEN y selección UI. |
| CQ-05 / P1 / 2 | Vista moderna no exponía análisis y spinner aparecía en confirmación. | Botón a ruta existente, indicador solo acción activa, muestra motivo de insuficiencia. UI, typecheck y tests de evaluación. |
| CQ-06 / P1 / 2 | Contexto omitía ordinarias y reemplazaba criterio/evidencia esperada del Master. | Conteos propios deduplicados, excluye corregida sin revisión/anulada; reutiliza constructor completo existente. Regresión y inputs 12–14. |
| CQ-07 / P1 / 2 | Auxiliar IA rotulado teacher_confirmed_findings; IDs abiertos confundían nombre/ID. | Retira alias solo para conclusión con auxiliar; schema clonado enum de competencia confirmada para conclusión/familia. Fuentes y letras docentes intactas. Focales 41 y 27; outputs 19–26. |
| CQ-08 / P1 / 1 | Al retirar atribución de Camila, draft obsoleto bloqueaba cierre sin CTA para resolver sin letra. | Guardar pendiente de observación usa ruta existente, fingerprint/revisión vigentes y nivel null. UI y 41 focales después del cambio. |
| CQ-09 / P2 / 1 | XLSX con columnas por defecto cortaba texto. | Anchos, wrap, filas, encabezado y filtro. 13 focales; render final legible y 42 valores exactamente iguales antes/después. |
| CQ-10 / P1 / 1 | Word omitía acuerdo docente guardado aunque plantilla lo soportaba. | Proyección del único campo permitido faltante. Regresión de descarga propia/acuerdo presente y ausente RED/GREEN; 17 focales; Word final Thiago incluye acuerdo exacto. |

El botón anual deshabilitado antes de marcar revisión no es defecto de servidor reproducido. Los ocho pasos de herramientas legacy todavía sugieren Informe del aula aunque este flujo moderno no lo necesita: pendiente P2 de consistencia de copy. Proyecto Word muestra «Papel» en Espacios/organización y repetición inicial; algunos iconos decorativos tienen recorte de borde. Contenido pedagógico y tablas son legibles; se registra P2 de plantilla para otra ronda, sin llamar IA o rediseñar durante este QA.

## Pedagogía, UI y documentos

Se contrastó Indaga de cinco años con el [Programa curricular oficial de Educación Inicial](https://www.minedu.gob.pe/curriculo/pdf/programa-curricular-educacion-inicial.pdf), páginas impresas 190–191. Formular pregunta e idea inicial corresponde al comienzo del proceso; una conversación previa a la visita no demuestra comparar hallazgos ni toda la competencia. Los análisis y textos finales lo explicitan. La letra B es decisión expresa de la docente ficticia con sustento limitado, no resultado de IA. Camila, Luciana y Diego no tienen letra.

UI real en 1366×900 y 390×844: guardado, doble acción, teclado, F5, volver, confirmación, error y recuperación documentados en `visual/`. Se mantuvo criterio/actividad/fecha; original de Thiago y rev2 separados. Solo la inferencia manual confirmada entra a evaluación. No se esperó Jev para persistir la nota. La transcripción HTTP de audio sintético no valida dispositivo, permisos ni MediaRecorder físico.

Word descargados por rutas propias HTTP 200: anual 26 páginas, proyecto 11, actividad 6, seis informes con 9 páginas totales. Se revisaron visualmente las 52 páginas; Thiago se volvió a renderizar y revisar después de CQ-10. Proyección nominal sin alias, criterios exactos y conclusiones canónicas verificadas. Excel final: seis filas, tres B y tres celdas de valoración vacías; valores preservados en 42 celdas. Se anuncia como Excel de Ayni, sin importación oficial SIAGIE.

Chrome no completó el evento de descarga Word y devolvió ERR_BLOCKED_BY_CLIENT al enlace XLSX local de origen distinto. Se preservó captura y se regresó con estado intacto; no se deshabilitó seguridad. Los artefactos revisados proceden del mismo endpoint autenticado local mediante harness de lectura. NO se declara PASS de guardado nativo del navegador. Queda QA humano con micrófono/cámara y descargas en su navegador; Preview smoke no equivale a repetir toda la historia autenticada en cloud.

## Validación y publicación

Tres suites completas: 765/765 cada una, con `rg --files src/lib scripts evals` filtrando tests y `node --test --test-concurrency=2`. La tercera se ejecutó antes de CQ-08/09/10; no se ejecuta una cuarta por el límite. Después: evaluación/cierre 41/41, Excel/integración 13/13, biblioteca/Word 17/17. `npx tsc --noEmit` exit 0 final. `npm run lint -- --ignore-pattern '.local/qa-tools/**'` exit 0 final; el ignore excluye scripts de LibreOffice portátil, no producto. Lint inicial sin exclusión tuvo errores del runtime privado, preservados en log.

Build local Vinext exit 0 antes de las tres últimas reparaciones. Segundo build completo previsto en Preview Next webpack del commit limpio; READY, smoke 17 comprobaciones (rutas públicas, privadas sin sesión y Origin ajeno) y Production intacta se aceptan solo si los recibos posteriores pasan. El reporte no convierte una intención de publicación en validación ejecutada. Revisión React: handlers de evento, estado busy y selección bloqueada, cancelación de lectura en efecto, labels y teclado, sin nueva dependencia o refactor de rendimiento.

Rollback: revertir el commit final identificado por el recibo; reproducir fixture desde snapshot previo conservando el snapshot final como evidencia. No borrar cierres o outputs para aparentar PASS. No migraciones que revertir. No promoción Production. Documentación, matriz CSV, trazas, costos, capturas, documentos, pruebas y recibos son el handoff reproducible.
