# Nombres de descarga del generador

2026-10-26. Variante aislada `codex/ayni-documentos-pruebas`.

## Convención

- Proyecto: `P01 - Título del proyecto - 2026 - Aula CELESTE.docx`.
- Actividad: `P01 - A02 - Título de la actividad - 2026 - Aula CELESTE.docx`.
- Proyecto de otra edición y sus actividades: `P01-v02 - ...` y `P01-v02 - A02 - ...`.
- Año: `Plan anual - 2026 - Aula CELESTE.docx`; revisiones posteriores añaden `v02` al final.
- Formatos: nombre en español, `B02` cuando depende del bimestre, año y aula. Asistencia usa `2026-04` para el mes. La selección explícita de un alumno añade su nombre.
- Biblioteca: `Taller - Título - Guía - 3 años - 2026 - Aula CELESTE.docx`; PDF sustituye Guía por Materiales. Los talleres guardados incluyen su fecha.

Dos dígitos mantienen el orden del 1 al 15. El número de proyecto procede de la posición en el plan anual guardado; el de actividad, de su posición propia. En V2 se resuelve la edición exacta desde el contrato de la actividad. No se consulta el mapa anual actual ni se inventa P01 si falta el vínculo. V1 usa su proyecto y ruta autorizados. El año y aula son los conservados por el documento.

## Implementación

`document-download-name.mjs` centraliza nombres, limpieza de caracteres incompatibles con Windows y Content-Disposition con respaldo ASCII y filename* UTF-8. Limita el nombre a 180 caracteres más extensión y elimina controles, separadores de ruta y nombres reservados. No expone UUID ni claves técnicas en los nombres normales de estas descargas.

`document-generator-downloads.mjs` resuelve el proyecto guardado mediante sus lectores autorizados. Las rutas documental V2, generador de formatos/biblioteca y descarga V1 aplican la convención únicamente en modalidad documentos. Las fuentes, filas de artefactos y descargas del modo diario conservan su contrato.

Los botones Blob del generador y del lector respetan filename*; formatos y biblioteca exponen Content-Disposition por CORS. El botón anual del generador usa la misma descarga autorizada, evitando el nombre técnico del artefacto de sincronización. Sin cambios de plantilla, migraciones, prompts ni llamadas de IA.

## Verificación

- Pruebas de nombres: orden, tildes, períodos, selección individual, materiales PDF, revisiones, límites de Windows e intento de ruta/inyección.
- Regresiones local/Supabase temporal: actividad 1 de P01 y actividad 2 de P01-v02 mantienen sus padres y números correctos.
- HTTP de ambas modalidades de aula: siete formatos, biblioteca Word/PDF y proyecto/actividades V2, incluida exposición CORS.
- Regresión HTTP del modo diario y conservación de fuentes: PASS.
- Descargas reales por clics: proyecto P01, actividad P01-A02 y Nómina del aula, guardadas en Descargas con sus nombres normalizados y tildes.
- Todas las descargas reales del año, proyecto y ocho actividades responden con los nombres esperados; el cuerpo XML del Word del proyecto coincide exactamente con la muestra visualmente aprobada en la revisión anterior.
- Datos antes/después idénticos: un año, un proyecto, ocho actividades y cuatro alumnos. Recibo: `output/generador-documentos/nombres-descargas-20261026/receipt.json`.

32 pruebas de la batería del generador y 16 de nombres/versiones/HTTP PASS; con cinco pruebas compartidas son 43 distintas. Typecheck, lint y build PASS; avisos previos de useEffect, PGlite y chunks conservados. No commit, push ni despliegue.

## Rollback

Retirar las llamadas al normalizador en las rutas y restaurar el uso del nombre anterior en los dos componentes de descarga. No cambiar filas documentales, artefactos, plantillas ni datos pedagógicos. Evitar restablecer archivos completos del worktree que contienen trabajo previo.
