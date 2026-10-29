# Registro de observación con nómina · presentación 6

28/10/2026. La usuaria solicita sustituir las líneas genéricas de nombre/observación por una tabla con todos los alumnos y espacio vacío para registrar lo observado. No se requiere completar todas las filas.

## Resultado

El Word de las actividades nuevas incluye número, nombre completo y edad curricular, observaciones y apoyo o siguiente paso. Las dos últimas columnas quedan vacías. Una nota indica que se anote qué hizo o dijo y el criterio relacionado, pudiendo dejar filas sin completar. El título de la actividad y su fecha prevista identifican el registro aunque quede en otra página.

Se conservan Poppins, portada, ilustraciones y colores de Ayni. Las filas de nombres distinguen edades con colores suaves y tienen altura mínima para escribir; pueden crecer en Word. Los encabezados se repiten y una fila de alumno no se parte entre páginas. Las listas pequeñas se mantienen con su encabezado; las grandes pueden ocupar varias páginas.

Muestras reales remaquetadas de P11/A01 y P11/A14, con los cuatro alumnos de la cuenta: cinco páginas cada una. El registro completo ocupa la quinta; los tres momentos siguen completos en la segunda. No se reescribió el contenido pedagógico. Carpeta `output/generador-documentos/registro-alumnos-v6/`.

## Fuente y autorización

La IA no proporciona los nombres ni inventa observaciones. Al confirmar cada actividad documental nueva, el servidor toma estudiantes activos del aula y sus asignaciones curriculares activas del mismo año. La consulta verifica titularidad del aula y del año, además de la autorización curricular existente. Guarda exclusivamente ID, nombre y edad en `details.observation_roster`, contrato `ayni-document-observation-roster-v1`.

Se rechazan IDs repetidos, nombres vacíos, edades ajenas, más de 45 alumnos y campos extra de evaluación. No se calculan edades por fecha de nacimiento ni se copian referentes de otra edad. La escritura ocurre en la misma transacción que confirma la actividad; no se crean fuentes parcialmente confirmadas.

El lector usa esa nómina congelada. Exportar no consulta la matrícula actual: un cambio posterior de nombre o estado de matrícula no altera el Word histórico. La prueba de captura cambia un nombre en una base sintética y verifica que el registro conserva el anterior. No se añaden nombres a los prompts ni llamadas de IA.

## Compatibilidad

Presentación 6 solo para actividades nuevas cuya ruta antes emitía 5 a partir del maestro V35. El proyecto continúa en presentación 4 y las actividades 2/3/4/5 mantienen su salida. Un documento 6 sin nómina válida se rechaza, sin reconstruir nombres de otra fuente. Sin migraciones ni cambios en Ayni original.

Las dos muestras entregables usan una copia de las instrucciones guardadas del P11 y los alumnos actuales para mostrar la plantilla; no modifican los documentos originales de la cuenta. Las actividades futuras capturan su propia lista al confirmar.

## Comprobaciones

- 45 pruebas PASS en siete archivos, incluidas nómina, autorización, campos vacíos, límite, escape XML, congelación, confirmación del primer día y lotes, exportación y compatibilidad histórica.
- Typecheck/build PASS. Lint sin errores, con el aviso React preexistente en `diagnostic-generation-control.tsx:28`.
- Dos Word reales, diez páginas renderizadas; dos contactos inspeccionados y ambos registros ampliados. Cuatro nombres por tabla, columnas de observación/apoyo vacías, estilos y arte idénticos a la plantilla; ningún texto fuera de página.
- Caso sintético adicional de 35 alumnos y nombres largos: ocho páginas; los 35 nombres aparecen completos una sola vez, con encabezados repetidos en las cinco páginas que contienen filas. Contacto completo inspeccionado. No se añadieron esos alumnos a la cuenta.
- Evidencia `content-fidelity.json`, `quality-checks.json`, `render-audit.json` y subcarpeta privada de QA; logs `.local/observation-roster-v6-delivery-{tests,typecheck,lint,build}.log`.

## Activación y rollback

Reiniciada únicamente la variante local, mismo ejecutable/argumentos y almacén verificados. Respaldo `.local/backups/observation-roster-v6-before-activation/store`, launcher 31256. Web 5185 HTTP 200 y API 8805 operativa.

Comparación antes/después: cuatro alumnos, 36 turnos, dieciséis ámbitos de chat, workspace y planes idénticos; 75 cuerpos Word conservan su hash. Recibo `.local/observation-roster-v6-activation-preservation.json`. Cero llamadas IA nuevas y cero documentos docentes regenerados.

Para rollback, emitir de nuevo presentación 5 para actividades futuras, manteniendo lector y renderizador 6 para las ya creadas. No quitar su nómina ni sobrescribir fuentes anteriores. La cantidad de hojas del registro aumenta con el número de alumnos y la longitud de los nombres; se prioriza espacio útil para escribir.
