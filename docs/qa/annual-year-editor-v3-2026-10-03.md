# Mi año: editor de quince tramos — 2026-10-03

## Alcance y estado

Extensión de Mi año V2 sobre la rama QA existente. Conserva el teal, las ilustraciones pequeñas, el Plan Maestro V2, la trazabilidad, la revisión pedagógica, el calendario efectivo y la confirmación docente. La unidad cotidiana sigue siendo la actividad. Este informe distingue implementación y pruebas ejecutadas de la revisión visual pendiente.

Solo se autoriza publicación en staging QA. El recibo final con commit exacto, preview y smoke remoto se conserva en `.local/editor-qa-delivery.md` y `.local/editor-deployment-verification.json`; comprobarlo antes de declarar publicado este cambio. El destino QA es `https://ayni-aula-staging-qa-v2-ayni4.vercel.app/`. Producción y el aula QA original permanecen fuera de las escrituras de esta verificación. El ejercicio funcional utiliza una base local ficticia separada, `.local/editor-qa-db/`, y un proveedor mock local sin gasto API.

## Calendario antes del contenido

Para el flujo nuevo, el calendario efectivo determina Acogida y después quince tramos fijos: once de dos semanas y cuatro de tres, treinta y cuatro semanas después de las dos iniciales. Distribución por bloque: B1 = 2 + 2 + 3; B2, B3 y B4 = 2 + 2 + 2 + 3. No existe selector de cantidad para la profesora ni fechas concretas impuestas a las propuestas.

Las semanas son unidades del calendario dentro de los bloques lectivos. Un feriado lunes o viernes conserva los límites y la duración del tramo; `instructional_dates` contiene solo las fechas lectivas efectivas. Gestión no se asigna a propuestas. La validación comprueba que cada día lectivo pertenezca una sola vez a Acogida o a un tramo, sin huecos ni solapamientos. Un override autorizado puede cambiar días lectivos sin convertir el feriado en una semana adicional.

Ejemplo ejecutado: tramo 6, 22 de junio–3 de julio de 2026, dos semanas y nueve días lectivos; el lunes 29 de junio queda excluido. Project Master sigue revisando el calendario y las exclusiones antes de preparar una actividad por fecha confirmada. La regresión verifica nueve fechas y nueve blueprints correspondientes, no diez actividades por inferencia de dos semanas. No se ejecutó una generación pagada de Project Master para este cambio.

## Contrato, identidad y compatibilidad

Se conserva `plan_format = annual_preplan_v1` y `journey_version = 2`; el editor nuevo agrega `editor_version = 3`. `resolved_calendar.version = 3` identifica quince posiciones con `slot_id` estable y `proposal_id` nullable. La identidad pedagógica continúa siendo `proposal_id`. `available_experiences` guarda las alternativas dentro del JSONB del plan; una fila en Biblioteca no lleva fechas ni duración asignadas.

El esquema de generación nuevo es `annual-journey-slots-v3`, con exactamente quince propuestas. La validación del borrador permite tramos vacíos y cobertura pendiente para poder editar; confirmar exige todos los tramos ocupados, cobertura V2 válida y revisión vigente. Los lectores de calendario, slots y Word distinguen este contrato de los planes de doce; el documento utiliza las filas y fechas guardadas, sin inventar contenido pedagógico.

No hay migración SQL. Las restricciones aplicadas de `project_slots` ya admiten `slot_index > 0`; se conservan sus IDs, relaciones y autorización. No se editaron migraciones aplicadas ni RLS.

Los planes de doce y los jobs de recuperación anteriores se leen con su contrato existente, sin recalcular fechas ni convertir planes activos/históricos al abrirlos. La conversión a quince es una acción explícita sobre un borrador sin trabajo protegido; conserva propuestas existentes y deja posiciones vacías que deben completarse. Si hay pasado protegido, decisiones mantenidas o desarrollo vinculado, se bloquea esa conversión. No se convierte automáticamente un job antiguo en generación de quince.

## Edición determinística y permisos

El mapa permite snap únicamente a posiciones válidas: intercambiar dos propuestas, pasar a un tramo vacío, sustituir desde Biblioteca enviando la anterior a esa Biblioteca, retirar y restaurar. La duración y los días de la propuesta pasan a ser los del tramo de destino; no se desplazan fechas arbitrarias ni bloques oficiales. La alternativa accesible «Colocar en otro tramo» usa la misma operación del servidor.

El servidor valida propiedad docente, aula/año, borrador, revisión esperada/CAS, huella de calendario y pertenencia de IDs antes de persistir. También protege la propuesta entrante y la desplazada cuando hay pasado, decisión mantenida o Project Master/desarrollo relacionado. Un movimiento no reprograma silenciosamente su calendario detallado. El historial estructural identifica ambas propuestas afectadas, slot origen/destino y cero llamadas IA.

La cobertura cuenta propuestas distintas que contienen cada competencia en `primary_competency_ids` u `opportunities`; repetir oportunidades dentro de una propuesta no aumenta el número. Los momentos cotidianos se indican aparte. B1–B4 y Total proceden de las mismas filas. El filtro por competencia resalta esas propuestas, mantiene Gestión, Acogida y feriados visibles y dispone de «Quitar filtro». La sustitución muestra el delta curricular antes de confirmar; una ausencia anual y cotidiana obligatoria bloquea la confirmación, sin imponer conteos iguales.

Mover, intercambiar, retirar, restaurar, heredar duración, contar, filtrar, calcular delta, derivar fechas, aplicar feriados y marcar Hoy son operaciones de código con cero llamadas IA.

## Extensión visual existente

Se conservan las ilustraciones y el lenguaje visual vigente. Los colores representan significado: Proyecto teal/azul suave, Unidad lila, Acogida mint, Gestión azul grisáceo, feriado rojo, selección con borde teal y Hoy dorado. No se alternan colores según el índice. El feriado usa un banderín rojo y línea fina con detalle accesible; Hoy tiene su propia línea y fecha.

La tarjeta prioriza ilustración, ordinal, título de hasta dos líneas, rango y dos/tres semanas. El ordinal se presenta una vez: el helper elimina numeración/fechas añadidas únicamente para mostrar el título, conservando el literal persistido. La ficha seleccionada muestra acciones de los niños y rationale; los detalles recuperan propósito, invitación, oportunidades, materiales, apoyos, flexibilidad y fuentes del contrato. Las flechas de orden se sustituyen por las acciones del editor.

Biblioteca muestra alternativas sin fecha, tipo y competencias, con incorporación accesible y «+ Nueva propuesta». El bloque de conversación permanente se reemplaza por «Cambiar con Ayni» contextual, ajuste global discreto y actualización explícita con nuevas observaciones. ChangeSet, batching y sus protecciones permanecen detrás de esas acciones. La matriz usa los pictogramas/nombres breves existentes, consulta del nombre oficial y scroll horizontal. Declara que sus números son oportunidades planificadas y no desempeño infantil.

## Nueva propuesta y revisión docente

El panel contextual de Luna recibe un resumen compacto: títulos, competencias por propuesta, conteos distintos, distribución bimestral, menor presencia, momentos cotidianos, decisiones docentes pertinentes, Biblioteca y tramos libres. No recibe fotos ni grabaciones infantiles; los datos privados omitidos no se convierten en observaciones. Los conteos orientan, sin obligar a balance perfecto.

Luna recoge la intención y llega a `ready`. El pipeline existente genera una fila completa con el modelo pedagógico correspondiente, valida referencias/CNEB y revisa solo esa candidata. Se conserva la generación frente al fallo del revisor y los checkpoints para reanudar. El preview docente incluye acciones, rationale, competencias, propósito, invitación, materiales, apoyos, flexibilidad, oportunidades completas y fuentes pertinentes. «Guardar en Biblioteca» requiere aprobación explícita; generar no ocupa automáticamente un tramo ni modifica el resto del año.

## Evidencia ejecutada

- Suite focal final: 65/65 PASS, cero fallos, `.local/editor-tests.txt`.
- HTTP funcional local: `.local/editor-qa-http-result.json` y runner `.local/editor-qa-http.mjs`; swap 2→3 y 3→2, retirar, bloqueo de confirmación por vacío, restaurar, conversar, generar una candidata y aprobarla a Biblioteca. El plan mantiene quince propuestas colocadas y añade una alternativa.
- Llamadas IA de ese ejercicio: estructurales 0→0; nueva propuesta 0→4 requests al mock (dos de Luna, una fila y una revisión). Cero llamadas pagadas. Estos números no miden consumo de un proveedor real ni el costo de preparar un año desde cero.
- Pasada final después de los dos ajustes de revisión: `npx tsc --noEmit`, lint completo, `next build --webpack` y build Vinext PASS, todos con exit 0. La revisión de código cerró sus dos hallazgos P2; la revisión visual sigue requiriendo recaptura.

Comando focal ejecutado:

```powershell
node --test src/lib/annual-year-editor.test.mjs src/lib/annual-journey.test.mjs src/lib/annual-journey-recovery.test.mjs src/lib/annual-year-map.test.mjs src/lib/project-flow-service.test.mjs src/lib/school-calendar-service.test.mjs src/lib/project-pictograms.test.mjs src/lib/initial-journey.test.mjs
```

Comandos de checks: `npx tsc --noEmit`, `npm run lint`, `npx next build --webpack` y `npm run build` (Vinext mediante el runner existente). Los logs locales separan cada resultado; archivos de intentos fallidos anteriores no sustituyen la suite final.

Las pruebas cubren quince tramos, proporción 11/4, distribución por bimestre, 34 semanas, feriados dentro/en extremos y override, asignación única, swap y duración, Biblioteca, retirada/restauración, vacío, cobertura y delta, momentos cotidianos separados, bloqueos, títulos literales, contexto compacto, contratos de doce y recuperación, CAS/permisos, fila nueva/revisión/aprobación y fechas de Project Master. La prueba HTTP acredita operaciones de servidor; no acredita un gesto drag & drop ejecutado en navegador.

## QA visual pendiente y cierre manual

Hay primeras capturas de escritorio en `.local/editor-screenshots/`: `desktop-inicial.jpg`, `timeline-inicio.jpg`, `timeline-medio.jpg` y `timeline-final.jpg`. No representan aprobación visual final tras los últimos ajustes. La recaptura móvil, Biblioteca, matriz, filtro, chat y demostración real de drag quedó bloqueada por conectividad local y la política de URL del navegador. La revisión final exige recapturar; no se declara entregada la colección completa solicitada ni aprobado el drag real.

Pasos pendientes sobre un preview autorizado y una copia ficticia:

1. Abrir Mi año en escritorio y móvil; comprobar títulos, tamaños legibles, scroll de timeline/matriz sin desbordar la página, Gestión/Acogida/feriados/Hoy y ficha completa. Capturar timeline completo con las quince posiciones.
2. Ejecutar drag genuino 2→3 y 3→2, swap, retirada a Biblioteca, restauración y sustitución desde Biblioteca. Mostrar el snap, delta y conteo de llamadas antes/después; repetir mediante botones/teclado.
3. Dejar un tramo vacío y comprobar bloqueo de confirmación; revisar una competencia sin oportunidad anual ni cotidiana. Seleccionar una competencia en matriz y capturar las propuestas iluminadas y «Quitar filtro».
4. Capturar Biblioteca, matriz y panel «+ Nueva propuesta»; pasar por ready, generar, abrir todos los detalles y aprobar a Biblioteca. Verificar que la candidata no ocupa un tramo automáticamente.
5. Consultar el ejemplo de dos semanas/nueve días, abrir Project Master y revisar días/exclusiones. Verificar bloqueo de pasado/protegidos/desarrollados y que histórico de doce abre sin mutación.
6. Registrar commit, preview, SHA y smoke remoto de assets/API/guards; conservar producción y datos QA originales. Las llamadas reales requieren el alcance y presupuesto ya autorizado; el mock debe identificarse como tal.

## Reversión segura

Antes de publicar se exige commit identificable, árbol limpio, staging y smoke. Si se necesita revertir la presentación o detener nuevos edits, conservar un backend/lector/exportador capaz de abrir los contratos persistidos de doce y quince, su Biblioteca y slots nullable. Una vez guardados planes de quince, devolver el alias a un deployment que solo lea doce deja datos incompatibles y no es un rollback seguro.

Usar un preview compatible para desactivar o corregir la superficie nueva; no borrar tramos, propuestas, historial ni jobs y no recalcular calendarios guardados. No requiere revertir SQL porque no hay migración. El destino concreto de rollback debe verificarse contra la compatibilidad de quince antes de reasignar un alias; queda pendiente del commit/preview final.
