# Formatos complementarios listos para Word · V8

2026-10-28. Solo variante local `codex/ayni-documentos-pruebas`.

## Resultado y alcance

La docente puede usar estos documentos fuera de Ayni sin registrar observaciones en la aplicación. Las siete descargas complementarias y las guías de talleres completan institución, docente, aula, año y datos escolares adicionales cuando están registrados. Se conservan portada, colores, arte y tipografía aprobados. Los encabezados repiten la identificación para reconocer hojas sueltas.

| Documento | Información completada | Qué completa la docente |
| --- | --- | --- |
| Nómina | Todos los alumnos, edades y nacimiento si consta | Datos aún desconocidos |
| Asistencia | Alumnos, edades y calendario del mes seleccionado | Asistencia real |
| Observaciones | Alumnos y edades en filas amplias | Fecha, actividad, palabras/acciones, contexto y apoyo |
| Diagnóstico | Alumnos agrupados por edad y competencias de la base curricular | Información recogida, hallazgos y prioridades |
| Evaluación | Nómina y matrices por edad con leyenda de competencias | Valoraciones sustentadas en registros propios |
| Informe familiar | Datos del niño correspondiente y sus referentes curriculares | Valoración, descripción y orientaciones reales |
| Conclusiones | Datos del niño correspondiente y sus referentes curriculares | Conclusiones y valoración docente |
| Guía de taller | Datos escolares, preparación, tres momentos y alumnos de su edad | Fecha y registros reales opcionales |

Una casilla vacía no indica C ni otro nivel. No se inventan observaciones, evaluaciones, conclusiones ni fechas de nacimiento. Los informes personales no incluyen la lista de compañeros. El diagnóstico no imprime la conversación de planificación como si fuera evidencia; esa conversación sigue intacta en su fuente. Las guías conservan el contenido de la biblioteca.

## Implementación mínima y permisos

Cambios de presentación en `document-generator-word.mjs`, `ayni-instrument-word.mjs`, `generator-workshop-word.mjs` y exclusivamente la rama en blanco de `family-report-word.mjs`. Los formatos complementarios son exportaciones de la matrícula actual autorizada en servidor; no son fuentes históricas congeladas. Se mantiene la selección existente de período, mes o alumno y las validaciones de titularidad. No se añaden permisos ni endpoints.

Las fuentes guardadas del plan anual, proyectos y actividades no se reescriben; sus lectores y versiones no cambian. La rama original de informes con registros confirmados permanece cubierta por regresión. No hay prompts nuevos, llamadas IA, migraciones ni cambios en la matrícula.

La matriz de evaluación presenta hasta doce competencias por bloque con leyenda de códigos; los códigos no son calificaciones. Las filas no se parten. Las tablas cortas permanecen juntas; cohortes mayores pueden continuar con encabezados repetidos. La guía de taller separa preparación de la hoja práctica y une registros pequeños para evitar alumnos aislados en una página.

## Validación ejecutada

- Sesenta pruebas de regresión pasaron, incluyendo HTTP, selección por alumno/edad, fuente curricular, plantilla, matrícula y flujo; once pruebas focalizadas volvieron a pasar después de los últimos ajustes visuales.
- Typecheck y build finales pasaron. Lint: cero errores; un aviso previo de dependencias de `useEffect` en `diagnostic-generation-control.tsx:28`.
- Diez Word con el contexto real de cuatro alumnos: 66 páginas renderizadas; ocho láminas de contacto revisadas y ampliaciones de tablas, registros y encabezados. Ningún texto fuera del área de página según análisis PDF. Comprobación OOXML de celdas vacías para observaciones y calificaciones.
- Muestras: nómina 2 páginas; asistencia 2; observaciones 2; diagnóstico 6; evaluación horizontal 4; informe familiar 20 y conclusiones 20 (cinco páginas por cada niño); talleres 3, 4 y 3. Las fichas personales permiten seleccionar un solo alumno. Estos conteos son del grupo de prueba, no límites generales ni exigencias normativas.
- Activación local PID 31812 tras respaldar el almacén detenido en `.local/backups/complementary-v8-before-activation/store`.
- Comparación exacta antes/después: cuatro alumnos, 36 turnos en dieciséis ámbitos de chat, planificación y workspace idénticos, 75 cuerpos Word guardados idénticos.
- Smoke del servidor activado: diez descargas HTTP 200, cuerpos iguales a los renderizadores nuevos, contexto conservado y web 200. Cero llamadas IA.

Evidencia privada local: `.local/complementary-v8-activation-preservation.json`, `.local/complementary-v8-live-smoke.json`, logs `complementary-v8-*`; muestras y auditorías en `output/generador-documentos/complementarios-v8/`. El ZIP de revisión contiene únicamente diez Word y una guía, sin contexto privado, chats ni logs.

## Rollback

Revertir únicamente los cambios de presentación complementaria y reiniciar solo la variante local. No restaurar la matrícula ni borrar planes para revertir una plantilla. Conservar respaldo y lectores de los documentos históricos. No se ha publicado ni modificado Ayni original.
