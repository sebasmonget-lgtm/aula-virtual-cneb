# Auditoría anual de Ayni — 15 de octubre de 2026

**Resultado vigente de la ronda final: NO APTA para Producción; correcciones listas para validar en Preview.** El cierre positivo B4/anual ya fue demostrado en un escenario reducido ficticio; los cuatro P2 originales fueron corregidos. Preview y Producción comparten actualmente base cloud: Auth/RLS con dos cuentas y medios privados siguen sin validación real aislada. El apartado «Ronda final» al final actualiza los resultados históricos siguientes, que se conservan para trazabilidad.

## A. Procedencia, aislamiento y cobertura

Rama `codex/qa-integral-anual-20261015`, base remota `e7afaa5ab0ba0f612de3f79e582944dc7e837dfa`, obtenida mediante fetch. Preview inicial `c3d0e973b966f5bb499fae9270b515c9d9322371`, deployment `dpl_7sMNRcPfQCAvu6fMT8rmNaxondsN`. Producción inspeccionada sin escritura: `9a0920230350cd6b9050f35683a1f35d459e78c7`, `dpl_H19YWzRdGjkgh8y72QAd1qBty7Mf`. Recibo de publicación de esta ronda al final del documento.

No se demostró separación de bases cloud: por ello **no se hicieron escrituras pedagógicas en Vercel/Supabase**. La prueba funcional se ejecutó con frontend y backend reales sobre tres bases PGlite nuevas, autenticación QA explícita y transporte externo restringido: Elena/20 niños/5 años (3351), Rosa/25/3 años (3361), Julia/5/4 años (3371). Esto no certifica Auth, Storage ni RLS cloud. Ninguna cuenta existente fue borrada o reutilizada.

Se revisaron memoria, decisiones, errores, auditorías previas, servicios, rutas y pruebas actuales. La visión v4 solicitada no se localizó como archivo accesible en esta ronda; no se inventó su contenido. El programa curricular oficial y el corpus local versionado sirvieron de referencia; la lectura completa del PDF remoto quedó limitada por acceso/tamaño. No es certificación MINEDU.

PASS significa escenario efectivamente ejecutado, no aprobación universal del módulo. PARTIAL identifica límites o muestras. Código incluye regresión; UI incluye persistencia; IA real se diferencia de fixtures.

| Función | Código | UI/backend real local | IA real / pedagogía |
|---|---|---|---|
| Cuenta cloud nueva, Auth/RLS y separación entre docentes | PARTIAL | NOT TESTED | NOT APPLICABLE |
| Aula, colegio, docente, sección y edades 3/4/5 | PASS | PASS | NOT APPLICABLE |
| Calendario y recuperación de configuración | PASS | PASS | NOT APPLICABLE |
| Matrículas consecutivas, CSV, aulas 5/20/25 | PASS | PASS | NOT APPLICABLE |
| Opcionales, incompletos, duplicado por request id | PASS | PASS | NOT APPLICABLE |
| Editar alumno, foto ficticia, retiro/reincorporación | PASS | PASS | NOT APPLICABLE |
| Seis preguntas familiares y borrador parcial | PASS | PASS | NOT APPLICABLE |
| Confirmar entrevistas; contexto separado de evidencia | PASS | PASS | PASS |
| Versiones completas de entrevistas y dictado físico | PARTIAL | NOT TESTED | NOT APPLICABLE |
| Diagnóstico libre/guiado y matriz | PASS | PASS | PARTIAL |
| Sugerir, cambiar, abstenerse, varias competencias | PASS | PASS | PASS |
| Síntesis diagnóstica y corrección docente | PASS | PARTIAL | PASS |
| Chats anual/proyecto, continuidad y saludo local | PASS | PASS | PASS |
| Corrección de contexto sin sobrescribir edición manual | PASS | PASS | PARTIAL |
| Mensaje/progreso/reanudación durante generación | PASS | PASS | PASS |
| Quince proyectos y cuatro bimestres | PASS | PASS | PARTIAL |
| Línea anual, fechas, imágenes y selección | PASS | PASS | NOT APPLICABLE |
| Inicio tardío: pasado consultable, no desarrollable | PASS | PASS | PARTIAL |
| Biblioteca y crear otro proyecto | PASS | PASS | PASS |
| Sustituir futuro sin preparar | PASS | PASS | PASS |
| Sustituir futuro preparado y proteger ejecución | PASS | PASS | PASS |
| Dos competencias o más pertinentes y desarrolladas | PASS | PASS | PARTIAL |
| Calendario docente antes de preparación | PASS | PASS | NOT APPLICABLE |
| Propósito, situación, producto y criterios de proyecto | PASS | PASS | PASS en 3 muestras |
| Secuencia, seguridad, recursos y progresión | PASS | PASS | PASS en 13 actividades |
| Timeout, pérdida de conexión y respuestas inválidas | PARTIAL | PARTIAL | PARTIAL |
| Consulta diaria y guía por momento en Hoy | PASS | PASS | PASS |
| Confirmadas inmutables incluso rutas antiguas | PASS | PASS | NOT APPLICABLE |
| Inicio fuera de fecha, cancelar, avanzar, cerrar | PASS | PASS | NOT APPLICABLE |
| No realizada/pendientes/asistencia opcional | PASS | PASS | NOT APPLICABLE |
| Catálogo 100, filtros por edad/tipo/competencia | PASS | PASS | NOT APPLICABLE |
| Taller: elegir, guardar, desarrollar, observar y Word | PASS | PASS | PASS de muestra, sin IA al elegir |
| Guiada desde criterio con actividad y momento | PASS | PASS | NOT APPLICABLE |
| Libre independiente con sugerencia/cambio/sin competencia | PASS | PASS | PASS |
| Prioridad por niño y competencia, conteos 0/1/2+ | PASS | PASS | NOT APPLICABLE |
| Texto/foto, corrección, retiro y no duplicados | PASS | PASS | NOT APPLICABLE |
| Voz, cámara y red desconectada en dispositivo real | PARTIAL | NOT TESTED | NOT TESTED |
| Evidencia canónica llega a Evaluar e historia | PASS | PASS | NOT APPLICABLE |
| Bimestre, alcance, alumno×competencia y originales | PASS | PASS | NOT APPLICABLE |
| Análisis con escasez, contradicción y antecedentes | PASS | PASS | PASS |
| Letras solo docentes, borrador y análisis obsoleto | PASS | PASS | PARTIAL |
| Evaluar 20 alumnos y cambiar selección | PASS | PASS | NOT APPLICABLE |
| Evaluar 25 alumnos durante todo el año | PARTIAL | NOT TESTED | NOT APPLICABLE |
| Conclusiones lote, advertencias y edición | PASS | PASS | PASS en 3 |
| Informes familiares lote y datos canónicos | PASS | PASS | PASS en 3; 17 vacíos deterministas |
| Consolidado de lectura y Excel | PASS | PASS | NOT APPLICABLE |
| Exportación completa SIAGIE | NOT APPLICABLE: ruta 501 vigente | NOT APPLICABLE | NOT APPLICABLE |
| Cierres B1/B2/B3 con pendientes legítimos | PASS | PASS | NOT APPLICABLE |
| Reapertura explícita B1 e historial | PASS | PASS | NOT APPLICABLE |
| B4 rechaza falta de valoración anual | PASS | PASS | NOT APPLICABLE |
| Cierre B4 positivo con todas las decisiones docentes | PARTIAL | NOT TESTED | NOT APPLICABLE |
| Calendario 2026, feriados, gestión, excepción | PASS | PASS | NOT APPLICABLE |
| Documentos cuatro carpetas y versiones anuales | PASS | PASS | NOT APPLICABLE |
| Word/Excel descargados: contenido canónico | PASS | PASS | NOT APPLICABLE |
| Word paginado/render visual y ZIP completo | PARTIAL | NOT TESTED | NOT APPLICABLE |
| Escritorio/móvil en pantallas muestreadas | PASS | PARTIAL | NOT APPLICABLE |
| Concurrencia/replay y guardia de costo | PASS | PASS | PASS |
| Edición individual/reordenar diaria confirmada | NOT APPLICABLE por decisión: bloqueado | PASS negativo | NOT APPLICABLE |

## B. Registro de errores reproducidos

Todos reproducidos con datos ficticios. Resumen de pasos, resultado anterior, causa, corrección y regresión. Archivos bajo `src/lib`, componentes bajo `src/features/dashboard/components`, rutas bajo `scripts`. Evidencias HTTP/DB completas permanecen privadas en `.local/qa-integral-20261015`; no incluyen secretos en este informe.

| ID / severidad | Reproducción y causa | Corrección / archivos | Resultado verificado |
|---|---|---|---|
| QA01 P1 | Preparar futuro con reloj QA perdía fecha en llamada interna | preview-qa-clock, local-db-server: herencia autenticada restringida | 6 actividades reales; tests de reloj PASS |
| QA02 P1 | Elegir feriado rechazaba después de confirmar año | preparation-routes: validar antes del efecto | HTTP409; borrador/activo idénticos |
| QA03 P2 | Retirar telas en chat seguía dejando telas en resumen | annual-context-draft/use-annual-context-draft: reconciliar baseline intacta | 5 tests y 2 correcciones UI/reload PASS |
| QA04 P1 | Copiar/editar criterio confirmado y escritores legacy aceptaban cambios | local-db-server, activity-version-service: guardas servidor | 6 negativos HTTP; originales intactos |
| QA05 P2 | Hoy mostraba PRÓXIMO tras cierre manual | daily-dashboard-display/today-home | Taller/arte terminados visibles como TERMINADA |
| QA06 P2 ABIERTO | Proyecto14 incluye TIC principal condicionado a dispositivo no confirmado | Validación de recursos/contexto pendiente | Otras dos competencias válidas; no aprobar pertinencia universal |
| QA07 P2 | Documentos mezclaba seis tipos y conteo7 mostraba1 | document-folder-groups/document-tree: cuatro agrupaciones canónicas | UI conteos 0/3/17/24, móvil PASS |
| QA08 P2 | Pregunta entrecomillada cortaba oración y dejaba «y escuchar…» | activity-reading-content: unir continuación minúscula | 2 regresiones PASS; caso original UI no repetido |
| QA09 P1 | Evaluar omitía foto privada de observación | period-evaluation-routes/evaluation-evidence-media/PrivateEvidenceAttachment | Foto ficticia abierta con autorización; 3 tests PASS |
| QA10 P1 | Actividades retiradas reaparecían como pendientes pasadas | past-activity-review: filtrar proyección y revalidar escritor | Dos HTTP422; 4 pendientes legítimas, no6 |
| QA11 P1 | «Usar esta actividad hoy» ofrecía intercambio individual confirmado | project-activities-browser/activity-swap-service: quitar y bloquear | HTTP409 + DB fechas/agenda/auditoría intactas |
| QA12 P2 | Seleccionar al mismo niño borraba detalle de Evaluar | competency-period-review: conservar selección idéntica | Lucía abre y permanece al reseleccionarla |
| QA13 P2 | Saludo usaba hora real con reloj QA distinto | daily-dashboard-display/today-home | 11 tests; 08:00 muestra Buenos días |
| QA14 P2 | Corregir texto seguía anunciando competencias confirmadas | ordinary-observation-dialog: invalidar feedback y pedir revisión | Noah corregido sin falso confirmado; Diego reconfirmado llega a Evaluar |
| QA15 P2 | Cierre anual deshabilitado sin explicar causa | period-evaluation: mostrar pares sin valorar | UI explica237; HTTP422 no modifica período |
| QA16 P2 | Documento anual abría editor antiguo Organizar | documents-screen/annual-slot-editor: ruta compacta conservando versión | V1/V3 abren; sin indicación obsoleta de Lista |
| QA17 P2 | Calendario decía Confirmada y ofrecía no realizada tras ejecutar | school-calendar-screen/daily-dashboard-display | Terminada visible, acción oculta; POST409 íntegro |
| QA18 P2 | «Queremos» era anonimizado como persona | annual-journey-privacy: vocabulario cerrado, nombres siguen protegidos | 19 tests PASS; contexto antiguo no reescrito |
| QA19 P2 | Trayectoria visible, backend pedía flag literal1 | local-db-server: mismo valor por defecto que cliente | HTTP200 + trayectoria Camila Diagnóstico/B1–B4 |
| QA20 P2 ABIERTO | Mi aula dice sin competencia en evidencias libres confirmadas | Resumen roster usa criterios capturados y omite atribución libre | Evaluar/Trayectoria correctos; resumen debe unificarse |
| QA21 P2 ABIERTO | Reanalizar borra letra/motivo provisional sin aviso claro | Invalidación segura, falta aviso UX | Confirmar análisis obsoleto bloqueado; no preservar decisión vieja automáticamente |
| QA22 P2 ABIERTO | Análisis muestra literal [estudiante] | Falta presentación nominal segura tras anonimización | Sin mezcla de alumnos; texto visible requiere corrección |

No se reprodujo P0, pero los límites cloud y del cierre positivo impiden concluir ausencia de problemas críticos no ensayados. Las correcciones no introducen migraciones, almacenamiento alternativo, cambios de modelos ni reescritura histórica.

### Regresiones históricas

H01: borrador parcial y cambio de niño conservados; interrupción completa de red no ejecutada. H03: falso positivo Queremos reproducido/corregido con test, no relajación general. H06: cantidad no equivale a suficiencia, verificado con 0/1/5 y análisis insuficiente. H10: diagnóstico separado de evidencia ordinaria del bimestre. H14/H17: Word/Excel contenido verificado; paginación/ZIP pendientes. H15: muestras móviles sin desborde, cobertura parcial. H34: B1–B3 permiten pendientes legítimos según ADR085; B4 exige valoraciones anuales, rechazo probado y cierre positivo pendiente. H44: reloj interno/saludo corregidos; cookies localhost compartidas entre puertos requieren aislar contextos del harness. H48: cancelar inicio fuera de fecha y recargar probado, no todos los diálogos. H49: tres informes reales y lote20 terminaron; inyección real de fallo del proveedor no ejecutada.

## C. Recorrido ejecutado y calidad pedagógica

1. Aula principal creada desde UI, cinco matrículas consecutivas y quince CSV. Complementarias: 25 niños de3 y5 de4; CSV inválido rechazado, nombre/foto sintética editados. Dos entrevistas parciales, seis preguntas. Doce observaciones diagnósticas (11 libres y1 guiada). En Indagación, Diego0 precede Camila1 y Valentina5 aunque Diego tenga dos de Comunicación.
2. Conversación anual real y generación de15 proyectos. Recarga recuperó el mismo job. Todos con2–3 competencias, pero el caso TIC de QA06 impide PASS pedagógico global. Se creó «Barquitos de papel entre el agua y las preguntas» con Indaga/Oral/Lectura; otros14 y fechas quedaron idénticos.
3. Calendario excluyó fines de semana y feriados2/3abril. Docente eligió6 de8 días disponibles. Plan Maestro y6 actividades reales: preguntar, probar, comparar y comunicar. Seguridad con recipientes bajos y derrames; lectura y registros tienen uso auténtico. Producto comunicativo, no objeto decorativo impuesto.
4. Actividad Mar30 desarrollada en tres momentos; cierre prematuro bloqueado, cierre final manual. Diego pregunta «¿Se va a hundir cuando el papel tome agua?» y revisa su anticipación. Camila presta recipiente/espera turno: libre Convive, foto sintética privada. Taller de cajas ejecutado con criterio motriz; Valentina ajusta apoyo/fuerza y pide camino amplio. Asistencia opcional guardada. No hubo IA al elegir taller.
5. Recuperar propuesta anterior generó secuencia futura completa de4 días. Cinco futuras de agua archivadas; actividad ejecutada, tres observaciones y demás14 proyectos intactos. No se mezclaron secuencias. El fallo era proyección de pendientes QA10, no publicación atómica defectuosa.
6. B1: tres análisis reales insuficientes. Profesora ficticia confirmó tres B con motivo para probar el flujo; esto no demuestra que una sola observación baste pedagógicamente para B. Tres conclusiones con advertencia y edición docente preservada. Veinte informes:3 reales y17 vacíos deterministas, sin logros inventados. Excel60 pares:3 B y57 vacíos, nunca C automática. Cierre, reapertura explícita y recierre B1 mantienen huella canónica.
7. B2: Diego compara sombras y ofrece actuaciones distintas en grupo/pareja; el análisis no convierte silencio en dificultad. Bruno «miró la ventana»: IA se abstiene, queda sin competencia. Proyecto artístico «Lluvias de líneas y sonidos», tres días reales y competencias Arte/Motricidad. Lucía cambia rectas por curvas para representar viento y explica su elección. Dos análisis señalan insuficiencia; no se asigna letra para cerrar. B2 cerrado con pendientes legítimos.
8. B3: Camila reparte seis vasos entre tres niños y explica/repite. IA sugiere Cantidad; docente añade Oral. Mismo UUID visible en ambas líneas de evidencia, sin duplicación. B3 cierra con atribuciones pendientes conforme ADR085; no se confunde con borrador evaluativo iniciado y sin resolver.
9. B4: Diego compara plantas/macetas, misma agua y luz distinta. Corrección conservó original y revisión2; atribución requiere reconfirmación explícita. B4 al21dic bloquea237 pares anuales sin valorar. No se simularon decisiones faltantes por SQL. B1–B3 siguen vigentes.
10. Retirar/reincorporar a Camila con historial desde UI:19→20 activos, mismo ID, diez registros ordinarios y cuatro vistas de períodos idénticos. Replay concurrente devuelve mismo registro; payload diferente con misma clave409. Registro Noah corregido y retirado lógicamente conserva trazabilidad:10 totales,9 válidos,1 retirado.

Muestras reales: tres Planes Maestros y13 diarias; no las15 secuencias completas. Muestras buenas: barquitos con pregunta comprobable y comunicación; arte con decisiones infantiles; análisis que diferencia contexto y escasez; informe de Diego usa puentes como recomendación familiar y no logro curricular. Muestras deficientes: TIC condicionado a recurso no confirmado, literal [estudiante] y resumen de Mi aula inconsistente. Adaptaciones culturales/lingüísticas, discapacidad y todas las edades no fueron cubiertas en profundidad.

La síntesis diagnóstica real adicional fue ejecutada por endpoint sobre12 registros y entrevistas: distingue interés de dos niños de necesidad grupal, no usa entrevistas como logro. **No fue confirmada en UI ni insumo del anual ya generado**. Se conserva esta limitación en lugar de afirmar la cadena completa con ese antecedente.

## D. Experiencia de la profesora

Se comprobaron navegación Mi año/Hoy/Calendario/Evaluar/Documentos, versiones anuales antiguas, guía por momentos, observación guiada junto al criterio, libre independiente, prioridad y carpetas. Escritorio y390px: sin desborde horizontal en capturas muestreadas; calendario de siete columnas legible, observación conserva búsqueda/conteos y scroll interno. Guía artística móvil tiene encabezado alto y acciones debajo del primer pliegue: mejora pendiente, no rediseño durante auditoría.

Persisten fricciones QA20–22. El cierre anual ahora explica por qué no permite continuar. No se agregaron pantallas ni opciones de edición diaria. Materiales/guía de muestras revisados, sin certificar todos los100 talleres individualmente en esta ronda. Los colores de observaciones expresan cantidad, nunca aprendizaje.

## E. Informe técnico, documentos y costo

Validación final: **188 archivos, 883 tests PASS,0 FAIL** (346,5s), `npx tsc --noEmit`, lint y `npx next build --webpack` PASS. Se repararon fixtures SQL y assertions de UI obsoletas, sin restaurar funciones descartadas. Se añadieron regresiones significativas de inmutabilidad, fecha, foto, pendiente, intercambio, reloj y costo. Build se ejecutó antes de typecheck para evitar competir por `.next`.

UI descargó Word de actividad/taller/informe/plan anual y Excel B1. XML: colegio, docente, alumno, fechas y evidencias textuales canónicas; actividad9 tablas137 párrafos, taller8 tablas123 párrafos. Excel61 filas incluido encabezado,60 pares,3 B y57 vacíos. **La foto adjunta no se incrusta en ese Word**. Render visual de Word intentado, bloqueado por `soffice.exe`/LibreOffice ausente: saltos de página y aspecto final NOT TESTED. No declarar Word bonito por inspección XML.

IA real: **45 llamadas medidas; estimación conservadora US$0,789982332**, inferior aUS$5. No es factura; no incluye consumo del agente Codex. Guardia persistente reservó costo antes de despachar, límite4,50, conserva reservas inciertas, prohíbe modelos/endpoints no previstos y medios. Al terminar llamadas pagadas deshabilitadas. No se usó el gasto global de la cuenta como gasto de esta ronda.

| Workflow | Llamadas | Tiempo observado | Costo conservador USD |
|---|---:|---|---:|
| Chat anual |3|9,47–12,31s|0,007364|
| Año15 |1|296,74s|0,277740|
| Chat otro proyecto |1|4,11s|0,001641|
| Propuesta focal |1|26,44s|0,065770|
| Plan Maestro |3|67,32–115,51s|0,275500|
| Diarias |13|7,28–13,52s|0,042549|
| Análisis de evidencias |7|5,95–12,68s|0,051687|
| Conclusiones |3|4,83–6,35s|0,004741|
| Informes reales |3|7,59–9,22s|0,005082|
| Síntesis diagnóstica auxiliar |1|37,57s|0,056245|
| Sugerencias Jev |9|0,73–0,91s|0,001664|

Tarifas consultadas: [OpenAI](https://developers.openai.com/api/docs/pricing), [modelo Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [Jev](https://openrouter.ai/typesafe/jev-1.13/). Se contaron tokens sin descuento de caché, con tarifas superiores conservadoras cuando correspondía. No se cambiaron modelos y prompts simultáneamente para ocultar un defecto.

Evidencia seleccionada reproducible: [carpetas escritorio](evidence/qa-integral-20261015/documents-four-folders-desktop.png), [carpetas móvil](evidence/qa-integral-20261015/documents-mobile.png), [calendario móvil](evidence/qa-integral-20261015/calendar-mobile.png), [foto privada ficticia en Evaluar](evidence/qa-integral-20261015/evaluation-private-photo-desktop.png), [recibo sanitario de QA](evidence/qa-integral-20261015/summary.json). Logs completos, bases, respuestas y ledgers quedan ignorados en `.local`; ninguna credencial se incorpora a Git.

Limitaciones adicionales: Auth/RLS/Storage y aislamiento cloud, voz/cámara real, desconexión física, carga sostenida y Evaluar25 anual, ZIP integral, SIAGIE completo, L2/religión/apoyos extensivos, cierre anual positivo. Los tests de fallos simulados no se presentan como fallos reales del proveedor. Cookies de reloj localhost entre puertos requieren contextos separados; no prueba cloud multisesión.

Rollback: revertir el commit de producto de esta rama y volver al Preview anterior c3d0e973; conservar bases/observaciones/versiones. No borrar datos ni revertir migraciones (no hay nuevas). No promover ni reasignar alias de Producción. Repetir guardas negativas y smoke tras revertir.

## F. Veredicto solicitado

1. ¿Profesora nueva completa flujo anual? **No demostrado completo**: inicio aB3 sí; B4 positivo pendiente.
2. ¿Cambia proyecto futuro sin romper dependencias? **Sí en muestras**, incluida secuencia preparada y protección de ejecutada.
3. ¿Diarias protegidas individualmente? **Sí en escritores/rutas auditados tras fixes**, UI y negativos HTTP/DB.
4. ¿Proyectos≥2 competencias pertinentes? **Estructura sí; pertinencia PARTIAL**, caso TIC pendiente y muestreo de actividades.
5. ¿Prioridad correcta? **Sí**, específica por competencia, válida y seleccionable.
6. ¿Evidencias llegan a Evaluar? **Sí**, incluyendo libre, guiada, taller, foto y revisión reconfirmada.
7. ¿Evalúa por competencia con evidencias? **Sí en muestra20**, letras solo docentes.
8. ¿Historia entre bimestres? **Sí**, B1–B3 y trayectoria consultables, retiro/reincorporación conserva todo.
9. ¿Conclusiones/informes sustentados? **Sí en muestra controlada**, advertencias de insuficiencia y vacíos; no certificación de todos los casos.
10. ¿Cierran los cuatro? **B1–B3 sí; B4 negativo correcto, positivo NOT TESTED**.
11. ¿IA suficiente? **PARTIAL**: muestras coherentes y límites explícitos; QA06/22 pendientes.
12. ¿Sencilla para Inicial? **PARTIAL**: mejora comprobada, quedan resumen inconsistente, aviso de reanálisis y altura móvil.
13. ¿Errores críticos impiden uso? Guardas P1 reproducidas fueron corregidas y regresadas; **sin prueba cloud/fin anual no se garantiza uso real completo**.
14. ¿Qué falta para Producción? Resolver QA06/20–22; verificar aislamiento y Auth/RLS/medios con cuenta ficticia cloud; ejecutar B4 positivo con decisiones docentes trazables; Word render/ZIP; regresión de red, hardware y carga, y ampliar muestra pedagógica/contextos.

Cadena demostrada parcialmente: Diagnóstico → Mi año → Proyecto → Plan Maestro → diarias → observaciones → evaluación → conclusiones → informes → cierreB1/reapertura → continuidadB2/B3 → rechazo legítimoB4. **No se afirma cadena anual completa aprobada.**

## Publicación exclusivamente Preview

### Contraste posterior de consumo aportado por el usuario

La captura posterior muestra acumulado de octubre US$7,28 frente a US$6,80 en la referencia anterior: incremento observado de cuenta US$0,48. Es distinto de la estimación conservadora de varios proveedores de esta ronda (US$0,789982332); no se atribuye automáticamente toda la diferencia mensual al QA. El total US$2,12, 157 solicitudes y 1.058.551 tokens pertenecen a una ventana móvil de siete días y no se restan de la ventana anterior como si fuera idéntica. La captura muestra US$0,56 para el15oct UTC. No es un recibo individual de las45 llamadas ni sustituye el ledger. El límite US$5 se conserva y no se habilitaron nuevas llamadas pagadas para contrastar estos datos.

Producto: `c9ca5fea3301085cf595043d8d80d74cffb2d96b`, subido a GitHub en `codex/qa-integral-anual-20261015`. [Preview verificado](https://ayni-aula-staging-9860ndjvv-ayni4.vercel.app/), deployment `dpl_9sKEp6khmYnaHFCQRhUEwmzV89nx`, READY, target null y SHA exacto. Build cloud PASS. Dieciocho controles smoke PASS: recursos200 y APIs privadas401 sin sesión, sin escrituras pedagógicas. Navegador muestra Bienvenida a Ayni y campos de acceso. [Recibo](evidence/qa-integral-20261015/preview.json), [smoke](evidence/qa-integral-20261015/preview-smoke.json), [captura cloud](evidence/qa-integral-20261015/preview-login.png).

Producción reconsultada tras publicar: mismo deployment `dpl_H19YWzRdGjkgh8y72QAd1qBty7Mf` y SHA `9a0920230350cd6b9050f35683a1f35d459e78c7`. No promoción, reasignación de alias ni migración. Tres servidores locales apagados con cierre de PGlite; bases y registros ficticios conservados. La pestaña cloud se deja abierta como resultado. El recibo documental se confirma después del producto y no cambia el SHA desplegado.

## Ronda final focalizada — 15 de octubre de 2026 (Lima)

### Procedencia y límites

Base remota `275c545eaef851c61689b130bbbee6a12bba66c9`, descendiente de `c9ca5fe`, contrastada de nuevo con `git fetch origin`. Rama aislada `codex/qa-final-pendientes-20261015`. Se continuó la auditoría conservando sus tres aulas; no se repitió desde cero. Se añadió una cuarta base PGlite exclusiva para el cierre positivo. No se modificaron migraciones, modelos predeterminados, cantidad de proyectos, competencias históricas ni secuencias confirmadas.

### Matriz de actualización

Esta tabla sustituye únicamente los estados de los pendientes de la ronda anterior; los demás mantienen su cobertura y sus límites originales.

| Punto | Regresión de código | Ejecución real | Resultado / límite |
|---|---|---|---|
| QA06 recursos/TIC | PASS | Contrato y entrada del proveedor con fixtures | PASS técnico; no se regeneró otro anual con IA pagada |
| QA20 Mi aula / Evaluar / Trayectoria | PASS en adaptadores; HTTP canónico | PASS, aula original de 20 | Dos observaciones de Camila, tres competencias confirmadas; un registro puede cubrir dos competencias |
| QA21 reanálisis y borrador | PASS | PASS UI + IA real + lectura histórica | Advertencia explícita; B y sustento conservados; nueva confirmación docente necesaria |
| QA22 nombre / anonimización | PASS | PASS UI + IA real | Marcador inequívoco del alumno actual se presenta con su nombre; referencias ambiguas antiguas permanecen neutrales |
| B4 y cierre anual positivos | PASS contratos existentes | PASS, aula reducida de una niña ficticia | Doce competencias aplicables valoradas durante el año; no prueba cierre masivo de 20 niños |
| Reapertura y recierre B4 | PASS | PASS UI + HTTP + lectura de historia | Dos versiones; motivo y análisis anterior conservados; B1–B3 intactos |
| Consolidado y conclusiones del caso reducido | PASS | PASS, cuatro consolidados y doce conclusiones manuales | Sin documento anual unificado nuevo; se consultan los cuatro períodos y su trayectoria |
| Word de cierre | PASS | PASS, cinco archivos descargados | Cuatro cierres más la versión anterior de B4, nombres y contenido sin campos pendientes |
| Word visual | PASS paginación de observaciones | PASS, 34 páginas de cuatro muestras y revisión de corrección | Word local autorizado, originales intactos; mejoras de presentación pendientes del anual histórico |
| ZIP completo | PASS | PASS HTTP y UI | 44 Word / 7.100.912 bytes, CRC y estructura interna de cada DOCX correctos |
| Enlace directo / cambio de bimestre | PASS | PASS UI local | Se abre Indagación del alumno correcto; cambiar B4→B3 limpia selección y mensajes anteriores |
| Móvil emulado | PASS focal | PASS, revisión B4 sin desborde horizontal | No sustituye celular físico |
| Aislamiento cloud | FAIL en configuración actual | Lectura real de conexiones | Preview y Producción usan la misma conexión DB y el mismo proyecto Supabase |
| Auth/RLS, cuentas cruzadas y medios cloud | PARTIAL en tests locales | NOT TESTED en cloud aislado | Bloqueado hasta crear/configurar base independiente |
| Cámara, dictado, celular físico y desconexión física | PARTIAL previo | NOT TESTED en esta ronda | No hay evidencia de hardware real ni pérdida de red física |

### Cuatro P2 originales

**QA06 — Corregido.** Causa: el generador y la cobertura anual ofrecían TRANS_TIC aunque el contexto solo planteaba conseguir o confirmar un dispositivo. La misma política de recursos filtra esa competencia en la entrada al proveedor, en la cobertura requerida y en el reemplazo focal. Los contratos nuevos (`resource_policy_version: 1`) rechazan una oportunidad TIC sin dispositivo disponible; un equipo sin internet sí puede utilizarse. No se bloquean otras competencias ni se reescriben años antiguos. Pruebas con recursos vacíos, no disponibles, condicionales y confirmados: quince tramos y mínimo dos competencias se conservan; una salida con TIC sin recurso se rechaza. Archivos: `annual-resource-policy`, `annual-plan-contract`, `annual-journey-contract/service` y tests. Límites: política sobre la declaración de recursos, no inventario físico verificado; no nueva muestra anual pagada.

**QA20 — Corregido.** Causa: el resumen de matrícula contaba IDs capturados en la observación y omitía la decisión curricular posterior. Ahora utiliza `loadConfirmedOrdinaryEvaluationRows`, el mismo lector canónico que alimenta la evaluación, considerando última atribución, revisión del texto y retiro. Mantiene un registro por observación y una unión por competencia. Reproducción/regresión HTTP y UI: Camila tiene dos observaciones y tres competencias (Convivencia, Oral y Cantidad); el segundo registro multicompetencia aparece en las dos columnas de Evaluar y en Trayectoria con el mismo ID. Bruno sin clasificación no recibe competencia ficticia; un registro retirado no suma. Archivo: `scripts/local-db-server.mjs`. Recibo privado: `roster-trajectory.json` y dashboard del recorrido.

**QA21 — Corregido.** Causa: reanalizar sustituía el borrador y perdía letra/motivo sin información suficiente. Se usa el diálogo existente de Ayni, con dos decisiones claras: conservar borrador o continuar con el análisis. El servidor exige reconocer la revisión vigente antes de una llamada que afecta una decisión; el borrador conserva letra y sustento, y archiva el análisis anterior en `generation_metadata.reanalysis_history`. Evidencias y huellas vigentes siguen siendo obligatorias para confirmar. Regresiones: 409 sin reconocimiento y cero llamadas; continuar actualiza análisis y conserva B/sustento; lectura posterior de base aislada confirma historia; UI exige nueva confirmación, nunca asigna una letra por IA. Archivos: `competency-period-review`, `period-evaluation-routes`, `period-evaluation-draft-service` y tests.

**QA22 — Corregido con límite de atribución.** Causa: un marcador anónimo genérico llegaba literal a la interfaz. La solicitud distingue el sujeto actual (`[estudiante_actual]`) de otros nombres; nombres compartidos por compañeros no se usan para desambiguar. Solo el marcador explícito se presenta como el nombre del alumno seleccionado. Un `[estudiante]` histórico ambiguo se presenta como «un estudiante»: convertirlo automáticamente al nombre del alumno podría atribuirle una actuación de otro. Las solicitudes y la salida canónica de IA permanecen anonimizadas; se transforma únicamente la presentación. IA real produjo «Hay dos observaciones de [estudiante_actual]…» y la UI mostró «…de Ada…». Pruebas de dos niños y criterio nulo. Archivos: `assessment-v4-service`, `assessment-display`, rutas y componente de revisión.

### Cierre positivo B4/anual y conservación

El cierre vigente exige que todas las filas del período estén resueltas; en B4 añade una valoración docente anual vigente por cada niño y competencia aplicable. No permite completar el requisito con letras inventadas ni elimina competencias para cerrar. El bloqueo de los 237 pares del aula original sigue siendo correcto y no se manipuló esa aula.

Caso adicional: María Prueba / Cierre QA, una niña de cinco años («Ada Ficticia Qa»), sin religión ni castellano L2 aplicables; doce competencias del catálogo aplicables. Hay tableta con aplicación sin conexión y acompañamiento adulto declarados para la prueba de TIC. El calendario inicial de esta aula divide B1–B4 de marzo a diciembre; no es una nueva validación del calendario oficial del aula original. Cada competencia tiene dos actuaciones ficticias explícitamente guionizadas y confirmadas como datos de prueba, no como observaciones de una menor real ni contenido inventado por la IA.

`scripts/qa/b4-positive-scenario.json` conserva el guion: 24 textos fechados, doce decisiones A/B contextualizadas, sustento de la evidencia limitada y doce conclusiones docentes. Se registró todo mediante rutas reales. Aula, alumna y cuatro confirmaciones se hicieron desde la UI; ocho decisiones y doce conclusiones manuales usaron los endpoints de guardado/confirmación. **Ninguna calificación se escribió por SQL.** Las consultas SQL posteriores fueron solo de lectura, con el servidor PGlite cerrado, para comprobar la historia. No se dio por realizada ninguna actividad por su fecha.

B1 y B2 cerraron por UI; B3 por endpoint; B4 por UI. Los cuatro consolidados contienen doce pares confirmados en total, con sus conclusiones y evidencias. B4 informó `annual_unvalued: 0`. Se comprobó recarga y cierre vigente en los cuatro períodos. Las 24 observaciones permanecieron y los overviews B1–B3 son idénticos antes y después del cierre B4.

Negativos: escribir borrador en período cerrado devuelve409; reapertura sin motivo422; cierre con versión obsoleta409; estado sin mutación. Después se reabrió B4 por UI con motivo explícito, se ejecutó un reanálisis real, se conservó/reconfirmó B y su sustento, se confirmó nuevamente la conclusión manual y se recerró B4 por UI. Existen dos manifiestos B4, historial del motivo y del análisis anterior, y cinco Word de cierres legibles internamente. La consulta anual de la trayectoria conserva los cuatro períodos. Esto demuestra el **camino positivo reducido**, no un año completo ejecutado con 20 niños, todas las actividades ni informes familiares B4 generados en lote. Los informes familiares reales de la primera auditoría siguen siendo la evidencia de ese módulo.

### Seguridad cloud y bloqueo pendiente

Se descargó la configuración de Vercel para comparación local privada, sin publicar valores. Auth es Supabase y DB es PostgreSQL en ambos entornos. Las huellas de `SUPABASE_DB_URL` y `AYNI_SUPABASE_URL` coinciden exactamente entre Preview y Producción. **No hubo escrituras pedagógicas cloud ni se modificaron conexiones o permisos existentes.**

Tras autorización y aclaración del usuario («Misma cuenta, base QA separada»), se creó únicamente la organización gratuita «Ayni QA aislado», dentro de la cuenta actual. Se dejó preparado el formulario «Ayni QA final» en el panel lateral, pendiente de que el usuario introduzca y envíe la nueva contraseña. La política de control del navegador exige que esa credencial nueva la introduzca el usuario. No se creó la base, no se tocaron proyectos ajenos y no se aceptaron términos en nombre del usuario. Las conexiones compartidas siguen intactas.

Por tanto **NO se declaran probados** registro cloud, RLS con dos docentes reales, acceso cruzado, medios privados, recuperación de sesión o persistencia cloud aislada. Los tests de autorización locales y los 401 del smoke no sustituyen esas pruebas. Este es un bloqueo para aprobar Producción, no un fallo de RLS demostrado.

### Word, ZIP y UX

El usuario autorizó explícitamente exportar copias ficticias con Microsoft Word local. Se abrieron de solo lectura, con macros deshabilitadas, se exportaron a PDF y se cerraron sin guardar. Se inspeccionaron visualmente todas las páginas: actividad5, taller5, informe familiar2 y anual22. Los originales se conservan; la copia inicial del taller coincide en SHA256 con el original descargado. La inspección cubre márgenes, texto, datos, tablas, saltos y legibilidad, no solo XML.

**QA24 P2 — Corregido, paginación de observación.** En el taller, una observación continuaba en otra página sin nombre ni criterio visibles. Se impide dividir filas que caben en una página, se repite la cabecera y se conserva junto a la primera fila. El nuevo Word se renderizó otra vez en Word: sección, nombre, criterio y registro quedan juntos en página5, sin recortes. Filas excepcionalmente mayores a una página pueden continuar por limitación normal de Word. `activity-unified-word` y regresión XML; los nuevos artefactos de actividad usan revisión de presentación `layout2`, conservando los bytes de los anteriores. No cambia el contenido pedagógico ni las evidencias.

El ZIP completo se preparó con el job real de exportación (44/44), se descargó también desde Documentos y se comprobó el archivo que llegó a Descargas. Tiene44 DOCX, 7.100.912 bytes, carpetas por aula/tipo, manifest y CRC válidos; todos los DOCX abren como OOXML con `word/document.xml`. No se afirma render visual de esos44 completos. Los archivos históricos dentro del ZIP conservan su presentación anterior; no se sobrescribieron para aplicar `layout2`.

**QA23 P2 — Corregido, cambio de período/enlace.** Al pasar de bimestre persistían aviso y selección anterior, y una proyección legacy oculta podía sobrescribir la competencia del enlace. La vista compacta conserva una sola selección de revisión, recupera la del enlace inicial, evita el lector legacy oculto y limpia mensaje/motivo/par al cambiar período. Prueba ejecutando el handler real: cancelar conserva todo; aceptar limpia el contexto. UI: enlace directo a Indagación/Ada correcto y B4→B3 muestra sus propias competencias sin el error anterior. El modo avanzado conserva su contrato.

Pendiente nuevo **P2 de presentación, sin rediseño general**: el anual histórico de22 páginas usa el formato textual de compatibilidad e incluye etiquetas técnicas en su trazabilidad. Debe ajustarse esa presentación antes de un piloto amplio; no se reescribieron documentos históricos para ocultarlo. No hay evidencia de pérdida de contenido en las muestras. Además se corrigió la etiqueta genérica «Proyecto o unidad» del panel opcional de sincronización: ahora distingue actividad, diagnóstico, informe y cierre por su tipo canónico, sin cambiar archivos ni carpetas.

Revisión móvil focal emulada de B4 sin desborde horizontal; no dispositivo físico. La automatización de Chrome perdió su conexión durante la exportación; el flujo se terminó en navegador integrado. La espera automática del evento de descarga venció, pero se verificaron el mensaje de éxito, HTTP200 y el ZIP real de Descargas. No se clasificó esa espera de la herramienta como fallo del producto. Cámara, micrófono físico y desconexión física siguen NOT TESTED.

### Calidad pedagógica y costo de esta ronda

Una sola nueva llamada real de análisis, con el enrutamiento predeterminado `gpt-6-luna`: entrada6.175 y salida685 tokens (6.860 total), aproximadamente9,4s. Estimación del ledger **US$0,0020575**, no factura del proveedor; reserva previa US$0,024544 y techo persistente US$4,50 para cumplir el máximo del usuario US$5. No se enviaron fotos ni audio a IA. Después se deshabilitaron las llamadas pagadas. La ronda anterior y sus45 llamadas no se vuelven a contabilizar como consumo nuevo.

Salida real: el análisis cita las dos fechas y distingue plantear una pregunta, proponer comparar, mirar dibujos y recordar el agua con mediación. No inventa resultados de crecimiento ni formula una calificación. Advierte que dos actuaciones no permiten cerrar toda la competencia; `information_status: sufficient` se refiere a poder resumir esas actuaciones, no a suficiencia curricular ni a una letra. La UI mantiene el aviso de pocas evidencias y solicita sustento docente. La conclusión B se confirmó explícitamente con el alcance limitado del guion. No se generaliza esta muestra a todas las generaciones.

### Validación, rollback y decisión

Typecheck, lint (excluyendo `.local`, que contiene cachés/recibos privados), build local y regresiones focales PASS. Suite completa: **197 archivos /910 tests,0 fallos**,374,2s;18 regresiones focales de navegación/Word/continuidad PASS. La revisión final añadió dos casos de reanálisis desde valoración ya confirmada o borrador: antes de IA materializa el borrador si falta, reconoce la revisión exacta y solo fuerza una generación nueva después de aceptar el diálogo;57 pruebas focales de evaluación/anual/navegación PASS. No se repitió una llamada real para ello. `npx next build --webpack` y su typecheck final PASS, además del build local. La corrección de etiquetas documentales se comprobó en UI:14 actividades,20 informes y4 cierres identificados correctamente. Los contratos UI, autoridad docente, fuentes canónicas, cierres y artefactos existentes permanecen protegidos. `git diff --check` sin incidencias. No migración ni cambio de modelos por defecto. [Recibo resumido sin secretos](evidence/qa-final-20261015/summary.json), [B4 recerrado](evidence/qa-final-20261015/b4-reclosed.png), [móvil emulado](evidence/qa-final-20261015/b4-mobile.png), [Word corregido](evidence/qa-final-20261015/word-observation-layout2.png). Publicación y SHA en recibo posterior.

Rollback: revertir el commit focal desde275c545 y publicar otro Preview, sin promover a Producción. Conservar bases, observaciones, cierres y artefactos: no borrar/revertir datos. Los documentos `layout2` ya guardados siguen siendo archivos históricos; los metadatos adicionales de reanálisis y política son compatibles con lectores anteriores. La base QA cloud aún no existe, por lo que no hay migraciones cloud que revertir.

**Veredicto: NO APTA PARA PRODUCCIÓN.** Los cuatro P2 originales y el cierre positivo reducido quedan resueltos con evidencia; Word y ZIP ya tienen prueba real. Falta terminar el entorno cloud independiente y ejecutar Auth/RLS/medios con dos cuentas, probar hardware/red y resolver las fricciones documentales señaladas. El aula original20 sigue legítimamente sin cierre anual por falta de valoraciones; no se la declara cerrada. La publicación autorizada es exclusivamente Preview y su smoke sin sesión no equivale a aprobación pedagógica ni de seguridad cloud.
