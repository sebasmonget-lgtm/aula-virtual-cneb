# QA desde cero y nuevo tutorial de Ayni

21 de octubre de 2026. Recorrido solicitado sobre la cuenta descartable de QA. En curso: no presentar todavía esta ronda como validación completa ni el video como terminado.

## Cuenta nueva y recorrido por interfaz

La usuaria autoriza borrar los datos de la cuenta QA y volver a crear al menos un documento de cada tipo. El reinicio administrativo acotado elimina 414 filas propias en 37 tablas y 14 archivos propios; conserva Auth, RLS, catálogos y las demás cuentas. Se ensaya la misma transacción con rollback antes de ejecutarla. No se crea una copia del contenido eliminado. Las comprobaciones posteriores muestran cero archivos del alcance anterior y la pantalla de alta vacía.

Los datos siguientes se crean mediante formularios y controles de la aplicación, sin SQL/API para poblar entrevistas, observaciones o planificación. Se configura Jardín Brisas, Elena Vargas Medina, CELESTE, cinco años, 2026 y logo de iniciales. Diez niños con retratos genéricos y fechas; diez entrevistas confirmadas de ocho respuestas, verificadas tras recargar. Cincuenta observaciones libres y diez guiadas; consulta de lectura posterior confirma cinco libres y una guiada por cada niño. Dos fotos corresponden a los relatos de flotación y puente.

Se graba una sugerencia real de competencia libre: Ayni propone Convivencia para el relato de Abril que expresa molestia, acuerda un turno y lo cumple. La docente revisa y guarda. En guiada, el criterio de elección conserva la competencia Identidad y el niño seleccionado; el registro y su criterio se consultan después. La matriz organiza relatos por niño/competencia sin presentar cantidades como niveles.

El chat recibe recursos concretos, límites de compras/salidas, participación familiar voluntaria y necesidades de acompañamiento. Un año nuevo de quince tramos se prepara en un intento; el trabajo persistido mide aproximadamente 399 segundos. Se revisan los quince detalles por la interfaz antes de confirmar. Se mantienen las duraciones acordadas de dos o tres semanas.

La grabación utiliza PC como vista principal. Los originales conservan la evidencia de QA; los cuadros del montaje excluyen la franja del reloj interno mediante encuadre, sin modificar el DOM ni la aplicación. Se recorren formularios y detalles largos; las repeticiones y las esperas se resumirán. La narración debe sonar como una profesora que explica lo que hace y cómo le ayuda, con aviso de demostración/voz IA. No es un testimonio real ni una prueba física de celular.

## Hallazgo de interpretación y corrección general

Síntoma: el mensaje «Podemos crear Mi año con las entrevistas y observaciones que registré» se convierte en una decisión de proponer un proyecto llamado Mi año. El último tramo atribuye esa intención pedagógica a la docente, aunque era una operación de la aplicación. La propuesta de reconocimiento personal es viable en sí; la atribución de su origen es incorrecta.

Causa: el extractor acepta cualquier decisión expresa sin distinguir operaciones del producto de decisiones sobre aprendizaje. Además, la recuperación de aportes omitidos importa literalmente todo turno no representado. Una simple omisión del modelo volvería a introducir una orden de guardar, descargar o continuar como contexto.

Corrección: contrato de conversación v3 con `non_context_turns`, clasificación explícita de turnos exclusivamente operativos/sociales. Se conservan los mensajes originales; solo se excluye su importación pedagógica. En mensajes mixtos se extraen los fragmentos pedagógicos. El servidor rechaza índices inválidos, repetidos o simultáneamente excluidos y usados como fuente. La recuperación de decisiones omitidas, la procedencia literal y las ediciones/retiradas docentes se conservan. No hay filtros por palabras ni una prohibición del título Mi año: un proyecto con ese nombre es válido si existe intención pedagógica explícita. El generador anual recibe la misma distinción general.

No se cambian modelos, esfuerzo, concurrencia, permisos, plantillas, calendario, número de proyectos ni reglas de evaluación. Los históricos no se reescriben. La propuesta afectada debe ajustarse por la interfaz y verificarse de nuevo en pantalla y documento.

Validación local de esta corrección: 51 pruebas PASS, incluidas conservación de mensajes, turnos mixtos, proyecto explícito con nombre similar, contradicciones de clasificación, CAS, permisos, recuperación y protección de otras propuestas. Typecheck PASS; lint sin errores y una advertencia existente en diagnostic-generation-control.tsx; build canónico Vinext PASS. Publicación QA, comprobación real del nuevo contrato y continuación documental pendientes al registrar esta entrada.

Reversión: revertir conjuntamente esquema/instrucciones y consumidor de exclusiones; no borrar entrevistas, observaciones ni versiones. Las respuestas históricas sin el campo nuevo conservan la lectura compatible. Una corrección de contexto no confirma niveles ni transforma reportes familiares en actuaciones.

## Evidencia y pendientes

Recibos administrativos y contabilidad bajo `.local/e2e-desde-cero-20261021`; grabaciones, planes de datos sintéticos, trazas de acciones y lecturas UI bajo `.local/ayni-e2e-video-20261021`. Fuera de Git y del video promocional los fallos y originales con controles QA. Se registra un error de comprobación administrativa que imprimió una línea privada: nunca copiarla a documentación, entregables ni servicios de voz; seleccionar campos JSON explícitos en futuras inspecciones.

Pendiente en esta ronda: corregir la atribución, confirmar año, preparar/revisar diagnóstico, anual Word, proyecto de la propuesta, proyecto adicional, actividades, observaciones de jornada, asistencia, cumpleaños/calendario, evaluación, conclusiones, exportación e informe familiar. Renderizar los Word descargados y revisar contenido/maquetación. Registrar costos y tiempos reales, con máximo seis intentos por generación, incluyendo reparaciones. El nuevo video se entrega solo al terminar su exportación y comprobación.

Referentes: Programa Curricular de Inicial (orientaciones de planificación y evaluación, pp. 36–43), cartilla MINEDU de diagnóstico inicial (2023), guías de planificación/proyectos (2019) y RVM 094-2020 con modificación 048-2024. PDFs oficiales conservados con hashes en la auditoría anterior; no confundir una página protegida en la consulta actual con una nueva descarga satisfactoria. La RVM modificada exige conclusiones para A/B/C en Ciclo II; AD a criterio docente. La exportación para SIAGIE no equivale a envío o integración directa.
