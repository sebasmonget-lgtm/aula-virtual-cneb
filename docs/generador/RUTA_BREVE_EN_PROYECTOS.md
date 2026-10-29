# Ruta breve de actividades en el Word del proyecto

2026-10-26. Solo variante `codex/ayni-documentos-pruebas`.

## Resultado y criterio pedagógico

El Word del proyecto incorpora una tabla con fecha, título, propósito breve y competencias de cada actividad preparada. Las competencias se identifican con claves C1, C2 y una leyenda con sus nombres completos para evitar repetirlos en todas las filas. No copia la secuencia diaria, las mediaciones por edad ni los instrumentos: estos permanecen en el documento de la actividad y en los apartados propios del proyecto. La ruta se presenta como propuesta flexible.

Es una decisión editorial de Ayni, no un formato obligatorio atribuido al MINEDU. Referencias consultadas: [Guía de orientación para desarrollar proyectos de aprendizaje en Educación Inicial](https://repositorio.minedu.gob.pe/handle/20.500.12799/6517), que admite diversas formas de desarrollar proyectos, y [Programa curricular de Educación Inicial](https://www.minedu.gob.pe/curriculo/pdf/programa-curricular-educacion-inicial.pdf), sobre planificación reflexiva, flexible y centrada en los propósitos.

## Fuentes y seguridad

El maestro conserva el planteamiento general. Los detalles diarios proceden de las actividades ya guardadas. `loadDocumentGeneratorProjectExport` carga el maestro con el servicio autorizado y compone una proyección de lectura de las actividades confirmadas de esa misma edición. Cada actividad pasa por el lector que valida sus referentes curriculares, criterios, identidad y huella del proyecto. No se mezclan actividades de otras ediciones, proyectos o docentes. No se inventan días todavía no preparados ni se llama a IA. Una ruta vacía indica que las actividades aparecerán al prepararlas.

La opción `activityRoute` del renderizador es explícita. Solo la descarga de proyectos V2 en modalidad documentos la usa. El maestro JSON, el renderizado por defecto y las exportaciones del modo diario conservan su contrato inmutable. La descarga compuesta refleja las actividades preparadas al descargar; no se guarda una nueva edición ni se modifica una fuente. Las plantillas originales y sus recursos permanecen iguales.

## Validación

- Batería del generador: 29 pruebas PASS.
- Regresión de versiones y HTTP nativo: 13 pruebas PASS, incluidas dos ya cubiertas por la batería; 40 pruebas distintas en total.
- Pruebas comprueban aislamiento entre ediciones y docentes, ausencia de escrituras, fechas/propósitos del Word HTTP y conservación de estilos e imágenes originales al añadir la ruta.
- Tipos, lint y build: PASS en la versión final. Avisos previos de lint (useEffect) y build (PGlite y tamaño de chunks) no corresponden a este cambio.
- Muestra real descargada por el endpoint: `output/generador-documentos/ruta-proyecto-20261026/proyecto-con-ruta-diaria.docx`. Diez páginas renderizadas e inspeccionadas individualmente; las dos últimas contienen la ruta de ocho días. Sin palabras fuera de página, encabezado de tabla repetido y filas íntegras. No sobrescribe la copia anterior `proyecto-ayni-corregido.docx`.
- Comparación de datos antes/después idéntica: un año, un proyecto, ocho actividades y cuatro alumnos. Huella SHA-256 `5150c891786acced4d862e224a937b0a7c14921b8e0611ec1b923129a565be51`. Recibo en esa carpeta. Sin llamadas de IA, migraciones, commit, push o despliegue.

## Rollback

Retirar únicamente la composición opcional de la rama de descarga documental en `scripts/multi-age-app-routes.mjs`; el renderizador por defecto devuelve inmediatamente el maestro anterior. No hace falta revertir datos ni plantillas. No restablecer archivos completos del worktree, que contiene trabajo previo de la variante.
