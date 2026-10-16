# Auditoría anual de Ayni — 15 de octubre de 2026

**Resultado: PARTIAL. No constituye aprobación para Producción.** Se ejecutó una historia ficticia desde aula hasta B4, con cierres reales de B1–B3 y rechazo correcto del cierre anual por 237 pares alumno/competencia sin valoración. No se inventaron calificaciones para completar el año. El cierre anual positivo queda NOT TESTED.

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
