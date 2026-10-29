# Talleres compartidos dentro de Ayni

23 de octubre de 2026. Desarrollo local, pendiente de publicación.

Hoy permite elegir una propuesta del catálogo existente que tenga adaptaciones completas para todas las edades atendidas. La profesora revisa el propósito y la secuencia compartida, los criterios y la evidencia prevista por edad, y selecciona uno a tres desempeños pertinentes por grupo. El servidor comprueba competencia, edad, aplicabilidad, catálogo, revisión del aula, confirmación docente y día lectivo. No se elige el desempeño por coincidencia de palabras ni se copia el criterio de los mayores.

La confirmación crea un taller canónico, una actividad y sus criterios V2. Conserva identidad del aula, textos curriculares, materiales, preparación, versión del catálogo y contenido confirmado. No requiere crear un proyecto ficticio ni modificar el maestro anual. Se admite un taller por día; repetir el mismo recibo es idempotente. El taller se abre en Hoy con el lector de Ayni y en Documentos con su Word propio. Los registros posteriores se filtran por la asignación y edad de cada niño, y participan en la evaluación individual. Preparar el taller no acredita ejecución ni logros.

Las migraciones aditivas 0087/202610230009 y 0088/202610230010 exigen validación de servidor y conservan identidad y contenido de talleres confirmados, incluso si se intenta retirar su marcador o cambiar de padre. El flujo V1 conserva su catálogo y servicios. El listado de proyectos V2 ahora filtra explícitamente `type=project`, para que un taller no aparezca como proyecto editable ni actividad siguiente de un proyecto.

Validación inicial ejecutada: ocho pruebas entre los esquemas local y Supabase temporal, más una prueba HTTP con reinicio. Incluyen autorización/RLS, referencia de otra edad, omisión de grupo, fecha no lectiva, duplicado, idempotencia, observación individual, evaluación, conservación de seis documentos previos y bloqueo por cierre. El Word de tres páginas se renderizó e inspeccionó completo. Recibo y muestra: `.local/multi-age-main-20261023/talleres/`. No se llamó a IA real ni a servicios remotos. La revisión visual de la aplicación sigue pendiente: Work mantiene deshabilitado el navegador.

Pruebas: `npm run test:multiedad:talleres`. Los talleres son de catálogo y revisión docente; no se añadió generación de talleres con IA ni se generaron nuevas fichas. Los ocho recursos gráficos originales presentes para propuestas de tres edades se pueden abrir desde la propuesta y el taller guardado, para guardar o imprimir la imagen original sin datos infantiles ni usar lectores V1 de edad única. Se comprobó su presencia en `public/workshops/`.

Rollback: deshabilitar la integración local V2 para volver al recorrido V1. Conservar la base sintética y sus migraciones; no eliminar actividades, observaciones ni snapshots para revertir una pantalla. No aplicar estas migraciones a cuentas actuales.
