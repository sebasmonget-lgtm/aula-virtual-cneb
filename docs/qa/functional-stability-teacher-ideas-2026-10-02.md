# Estabilidad funcional e ideas docentes antes de Mi año

## Alcance y base

Implementación local sobre `codex/annual-year-map`, HEAD inicial `f51fda57976349d85ba718b2c15814fd970544ad`. Se revisaron las correcciones parciales y se conservaron los cambios ajenos de la comparación Jev/OpenAI y las auditorías anteriores. No se hizo rediseño general, no se activaron flags experimentales, no se cambiaron reglas de valoración ni se publicó esta implementación.

QA en Chrome real, frontend local en 5173 y API en 8788. Se copió `.local/pgdata` a `.local/phase1-qa-pgdata` con la API detenida. Se usó una identidad local independiente, el aula Las Mariposas de Jardín Los Pinos, profesora María Quispe y estudiante ficticia Lucía Flores. Formularios completados de forma natural, sin alterar el aula original. Las generaciones reales usan el proveedor configurado; las regresiones usan proveedores simulados.

Al cerrar, se detuvo la API de QA, se cerraron sus pestañas y se reinició la API sin los overrides de QA. Se comprobó que el contexto original volvió a estar activo; se conserva el clon para reproducir el recorrido.

## Cambios funcionales

- Evidencia desactualizada: acción `Actualizar propuesta`, conservación de decisiones editadas, cobertura recalculada en servidor, prohibición de confirmar fuentes antiguas y recuperación de conflictos.
- Estados: `Revisado` representa revisión local; `Cambios pendientes` representa datos sin guardar; `Confirmado` representa el contrato persistido. Guardar borrador no confirma. Snapshot y actualización condicionada evitan sobrescritura entre pestañas. Salir con cambios pendientes requiere decidir si descartarlos.
- Calendario: Semana desplaza siete días y sincroniza selección, cursor e intervalo. Mes/Año mantienen sus movimientos respectivos.
- Evaluar: período/fechas visibles; Conclusiones muestra tareas de conclusión disponibles o requisitos y acciones concretas de valoración/preparación de actividad.
- Ubicación: módulo y subvista en hash existente; Biblioteca/filtro, Calendario/vista, Diagnóstico/paso/modo, Evaluar/tarea/período y Planificar/paso/preparación/mapa-lista.
- Ideas opcionales: cero, una o varias; título, explicación breve, mes opcional; agregar, editar, eliminar, guardar, recargar y regenerar explícitamente el borrador. No se guardan como evidencia ni prioridad diagnóstica.

## Contrato y arquitectura

`annual_personalization_reviews.details.planning_preferences = { version: 1, teacher_ideas: [{id,title,explanation,requested_month}] }` es un campo opcional, separado de los cinco bloques diagnósticos. Es parte de la preparación versionada existente. No duplica los proyectos institucionales de condiciones del aula ni usa notas libres como almacenamiento.

`annual_preplan_v1` conserva una copia de las preferencias y `teacher_idea_feedback`. Cada fila puede declarar `source_teacher_idea_ids` y `planning_origin` (`diagnosis`, `teacher_idea`, `calendar`, `teacher_decision`). Referencias y copia se validan contra la preparación confirmada, incluso en propuestas disponibles. CNEB y calendario siguen siendo autoridades; el mes no puede crear días lectivos. Las explicaciones iniciales se distinguen de la ubicación actual tras movimientos docentes.

Sin ideas, se mantiene el esquema de IA anterior. Con ideas, se exige una explicación por cada idea, incluyendo alternativas u omisiones. Los nombres conocidos de alumnos se neutralizan en las preferencias enviadas al proveedor; el texto docente original se conserva en su preparación.

Regenerar requiere ID y revisión del borrador autorizado; revalida la preparación después de la llamada de IA y persiste propuesta/slots dentro de la misma transacción. No modifica el plan vigente ni históricos. El plan vigente solo cambia al confirmar Mi año. No requiere migración ni cambios RLS.

## Pruebas ejecutadas

Comando focal:

```text
node --test src/lib/annual-personalization-service.test.mjs src/lib/annual-planning-preferences.test.mjs src/lib/annual-preplan-service.test.mjs src/lib/annual-preplan-round-trip.test.mjs src/lib/school-calendar-navigation.test.mjs src/lib/teacher-navigation.test.mjs src/lib/period-evaluation.test.mjs
```

Resultado: **48/48 PASS**. Incluye evidencia stale, conservación de ediciones, snapshot de otra pestaña, preparación inicial concurrente, cero/una/varias ideas, mes opcional/inválido, octubre compatible, enero fuera del calendario, omisión explicada, citas inventadas, anonimización, persistencia/round-trip, autorización, regeneración con revisión vigente, historia intacta, confirmación de versión y 23 regresiones de evaluación.

Tras corregir la lectura concurrente de una preparación existente y la ubicación inicial por enlace entre módulos, se repitieron las 25 pruebas focales de planificación/calendario/navegación: **25/25 PASS**, y typecheck/lint/build. No se repitieron las 23 de evaluación porque sus archivos no cambiaron después del resultado anterior.

- `npx tsc --noEmit`: PASS. No existe script npm llamado `typecheck`.
- `npm run lint`: PASS, sin avisos.
- `npm run build`: PASS (Vinext); permanecen avisos de `eval` en PGlite y tamaño de chunks.
- `git diff --check`: PASS.

## Navegador real: fase 1

1. Configurar aula: la edad tiene elección explícita; registrar estudiante.
2. Diagnóstico con poca evidencia: sin prioridades inventadas; editar perfil, marcar Revisado, guardar como borrador, recargar y comprobar el texto persistido.
3. Registrar observación durante juego con bloques. Regresar a Así entendí tu aula: aviso de registros nuevos, creación bloqueada y Actualizar propuesta disponible.
4. Actualizar: conserva perfil docente, cobertura pasa a una observación, intereses Animales/Construcción, prioridades vacías.
5. Crear Mi año: doce propuestas reales; confirmar versión 1; documento formal visible en Biblioteca. Abrir el siguiente paso Proyecto o unidad y su selector.
6. Calendario Semana: 28 septiembre–4 octubre a 5–11 octubre; selección viernes 9 octubre; feriado de Angamos visible. Recarga conserva Semana. Los límites de mes/año se cubren con regresiones.
7. Biblioteca Ideas y materiales/Talleres: recarga mantiene módulo y filtro.
8. Evaluar/Conclusiones: bimestre 3, 10 agosto–9 octubre, cero conclusiones listas; explica valoraciones necesarias. Si no existe actividad trabajada, ofrece Preparar actividad.

## Navegador real: fase 2

1. Desde plan vigente V1, abrir preparación nueva. Ideas: animales (octubre), huerto (enero), cuentos (sin fecha). Guardar tres, recargar; todos los campos y meses se conservan.
2. Eliminar cuentos, editar título de animales, guardar y generar dos ideas: animales incorporada en octubre/noviembre; huerto en marzo con explicación explícita de que enero está fuera del año escolar. V1 sigue vigente, V2 queda en revisión.
3. Mover huerto del primer al segundo lugar y guardar: referencias conservadas y ubicación actual pasa a abril; la explicación se identifica como inicial. Lista refleja el mismo orden. Recargar mantiene lista y datos.
4. Editar ideas y regenerar: eliminar ambas, guardar cero ideas, recargar; acción para continuar sin agregar disponible. Agregar una idea con explicación editada y noviembre; guardar y regenerar. Misma versión anual V2, nueva preparación confirmada, propuesta situada en noviembre; V1 continúa vigente.
5. Confirmar V2 explícitamente: pasa a vigente y V1 pasa a anterior. Word formal V2 disponible en Biblioteca; abrir documento y usar Guardar Word en Descargas. Archivo `plan-anual-2026-bf7c3e51.docx`, 1.214.414 bytes; ZIP válido comprobando CRC32, texto del proyecto docente presente y sin placeholders de plantilla pendientes. No se renderizó paginación con Word/LibreOffice.
6. Dos pestañas sobre la misma preparación: segunda guarda una explicación distinta; primera rechaza su snapshot anterior y muestra Abrir revisión guardada junto al error. Abrir esa revisión recupera el texto de la segunda sin sobrescribirlo, con estado Borrador guardado. El plan V2 sigue vigente.
7. Conclusiones, recarga, Preparar actividad y Abrir proyecto o unidad: conserva la tarea por hash y lleva al selector real de proyectos de V2. No elimina la necesidad de confirmar un proyecto antes de crear actividades.
8. Abrir Versión 1 anterior desde el mapa después de confirmar V2: conserva sus doce propuestas y Word, sin aplicar las ideas nuevas a esa historia. Capturas locales: `output/functional-stability-2026-10-02/mi-ano-confirmado.png` y `word-confirmado.png`.

## Bugs adicionales corregidos

- El patrón `venta` encontraba `ventana` y creaba contexto Comercio local: se usan límites de palabra; prueba tanto ausencia falsa como extracción real.
- Dos solicitudes iniciales podían chocar creando la preparación: inserción idempotente con lectura del mismo borrador docente.
- Abrir una preparación existente con `refresh` efectuaba una escritura de normalización; dos solicitudes simultáneas podían producir un conflicto. Abrir ahora es solo lectura; actualizar un borrador existente requiere detalles de la acción explícita. Regresión de dos aperturas conserva snapshot/detalles, y dos pestañas reales permiten guardar y recuperar conflictos.
- Un enlace entre módulos elegía una subvista inicial sin escribirla en el hash. La subvista por defecto ahora se representa en la URL; recarga de Preparar actividad conserva la tarea.
- Persistir slots incrementa otra vez la revisión del plan: regeneración devuelve la revisión real después de persistir, evitando conflicto inmediato al guardar/confirmar.
- Conflicto al regenerar necesita recuperación: la respuesta permite abrir el borrador autorizado actual.
- Durante edición de preparación se impide confirmar/modificar el mapa o cambiar su versión; la tabla identifica el borrador como En revisión.
- La fixture antigua de evaluación no tenía `student_family_interviews`; se incorporó la tabla a la fixture, sin cambiar lógica de evaluación.

## Límites de la primera revisión (cerrados más abajo)

- No se ejecutó en navegador la rama Conclusiones con valoraciones listas; sí sus dependencias y confirmaciones en pruebas de evaluación.
- No se generó proyecto ni actividad nuevos: se validó hasta abrir el selector posterior al año confirmado.
- No se inyectó una falla del proveedor real; los estados de error/recuperación se revisaron en código y conflictos/stale se cubren con regresiones.
- Un diálogo de salida y una espera de descarga dejaron pestañas de automatización sin responder. Se continuó con otra pestaña; no se atribuye este problema al producto ni se declara esa descarga validada.
- No incluye QA móvil, RLS remoto, migraciones ni despliegue.

## Cierre de los tres huecos de validación, 2026-10-02

Se clonó el QA anterior, con la API detenida, a un directorio local ignorado independiente. Se usó la misma identidad ficticia, sin modificar datos originales. El transporte OpenAI apuntó a localhost con clave ficticia; proyecto, actividad, conclusión y regeneración usaron respuestas locales deterministas. Una recomendación de imagen automática del proyecto efectuó una llamada Jev existente: costo registrado USD 0.000035784. No se modificó el proveedor real ni se provocaron fallos remotos. El simulador no evalúa calidad pedagógica.

### 1. Conclusiones con valoración lista: PASS

- Caso mínimo: dos observaciones ficticias, actividad trabajada el 2 de noviembre y valoración B confirmada para Indaga en Bimestre 4 (19 octubre–18 diciembre). La preparación del caso usó las rutas de guardar/confirmar valoración con fingerprint y revisión; no saltó sus contratos.
- Chrome: Evaluar → Conclusiones → elegir Bimestre 4 → Preparar conclusión → Preparar con Ayni → revisar → confirmar. La pantalla mostró la valoración B y las dos evidencias correspondientes.
- F5 conservó período, niña, competencia, tarea y conclusión confirmada. Atrás volvió a Conclusiones del cuarto bimestre con Ver conclusión.
- Comprobación del paquete recibido por el proveedor: nivel B, estado suficiente, competencia CYT_INDAGA y las dos observaciones. En base de datos, FK assessment_id y snapshot corresponden exactamente a la valoración confirmada, con fechas correctas del período.
- Bug mínimo corregido: el filtro de inputs descartaba confirmed_achievement_level y analysis_status antes del proveedor. Se conservan solo en descriptive_conclusion. Regresión comprueba nivel confirmado y ausencia de nivel en propuesta preliminar.

### 2. Mi año → Proyecto → Actividad: PASS

- Desde V2 vigente generado con ideas docentes, seleccionar la propuesta 11 Los animales de nuestra comunidad: conocer para cuidar (2–13 noviembre, Bimestre 4) y abrir Ver proyecto.
- Contexto, propósito y tres competencias se heredaron. Revisar preguntas, recorrido y criterios; confirmar los diez días lectivos; preparar mapa y confirmar proyecto V1.
- Desarrollar su primera actividad abrió Preparar día con 2 noviembre y criterio/evidencia heredados. Preparar, guardar borrador y confirmar. F5 volvió al selector de proyectos y permitió reabrir la actividad confirmada conservando textos y criterio. No se afirma que la selección del detalle permanezca abierta tras F5.
- Comprobación persistida: proyecto anual_plan_id de V2, proposal_id correcto y slot 11; actividad experience_id, versión 1, route_item_id del primer blueprint y fecha coincidente. Criterio y competencia CYT_INDAGA concuerdan con el blueprint; evidencia esperada conservada y actividad calendarizada.
- Se comprobó el adaptador del contrato estructurado existente: los flags V3 siguen desactivados. No se exigió ni activó un contrato V3 nuevo. Las preferencias continúan en su preparación/anual; no modifican criterios ni crean evidencia infantil.

### 3. Fallo del proveedor y reintento: PASS

- Reorganizar creó borrador V3 conservando V2 activo; editar explicación docente y Guardar ideas.
- Inyección de un único HTTP 503 en el transporte localhost para el esquema anual con ideas; mensaje accionable y reintento disponible. Se ajustó únicamente el mensaje anual que antes mostraba provider_error.
- Comparación completa de las respuestas de planes antes/después del fallo: vigente, históricos y borrador anual idénticos, incluida revisión. Las ideas y el mes persistieron tras F5.
- Reintentar con respuesta local válida regeneró el mismo borrador V3 (revisión 3). Copia de las preferencias conservada; V2 y V1 idénticos al snapshot anterior. V3 no se confirmó.
- Durante el ajuste del simulador hubo respuestas 422 por esquema no admitido/trazas incompletas: el producto las rechazó sin escribir el año. Se corrigió solo el harness ignorado; después se verificaron explícitamente el 503 y el reintento válido.

### Validación final y aislamiento

- 88/88 pruebas focales PASS: los siete archivos del comando anterior, más descriptive-conclusion-v4, ai-context-builder-v4, project-proposal-navigation, activity-persistence-v4 y planning-contract-v3.
- npx tsc --noEmit: PASS. npm run lint: PASS, cero avisos después de retirar una importación sin uso del harness local. npm run build: PASS; avisos existentes de Vinext/PGlite/chunks. git diff --check: PASS.
- Diff completo revisado; sin cambios de diseño adicionales, migraciones, flags, secretos ni archivos de fixture en el commit. Los experimentos Jev/OpenAI, auditorías visuales anteriores y capturas quedan fuera y se conservan en un stash identificado.
- API QA y simulador detenidos, pestañas QA cerradas y API original reiniciada. Clon, harness, snapshots y capturas conservados en .local/validation-close, ignorado. No se hizo push, merge ni despliegue.

### Limitaciones restantes

Los tres huecos solicitados están cerrados. La generación en este cierre usó simulación local; no es una validación de calidad pedagógica del proveedor real ni una prueba remota de staging/RLS. No incluye QA móvil ni paginación de Word.
