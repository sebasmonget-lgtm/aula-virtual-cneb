# Plantillas originales en el generador — 2026-10-26

## Causa y corrección

El exportador V2 insertaba párrafos sueltos en el cuerpo de la plantilla anual, incluso para proyectos y actividades. Perdía portada, secciones y referencias a estilos. Conservar el pie de página no equivalía a reutilizar la plantilla aprobada.

Ahora año, proyecto y actividad reutilizan sus renderizadores originales. Biblioteca usa el maestro de taller; diagnóstico usa su portada original. Familia y conclusiones comparten las tarjetas, símbolos, colores y tipografía del informe familiar. Nómina, observaciones, evaluación y asistencia usan la papelería anual original porque no tienen un maestro propio. Los cinco archivos DOCX aprobados no se modificaron.

Adaptaciones: filas por competencia/edad, registros y valoraciones vacíos, nombres del aula en instrumentos, asistencia horizontal y paginación de tarjetas/tablas. El proyecto conserva su secuencia prevista sin inventar una ruta diaria. La actividad mantiene registro y reflexión editables sin instrucciones de usar Hoy.

El contexto anual del proyecto se lee de la edición inmutable vinculada; sin catálogo cambiante ni escritura de datos. Los parámetros opcionales conservan el comportamiento diario por defecto.

## Validación ejecutada

- 28 pruebas del generador y 11 pruebas adicionales de Word/proyecto, autorización y versiones correctas. Tras seleccionar el maestro diagnóstico, otras 9 pruebas correctas.
- Typecheck, lint y build correctos. Lint conserva un aviso anterior del efecto de diagnostic-generation-control; build conserva avisos de PGlite/tamaño de chunks.
- Regresión permanente en test:documentos-generador: estilos XML e ilustraciones de año/proyecto/actividad idénticos a los maestros, sin marcadores pendientes ni mutación del documento.
- Auditoría: 18 documentos ficticios, contenido de 252 variantes de talleres, 40 enlaces y 90 PDF imprimibles. Incluye 45 alumnos, nombres largos y febrero.
- Render LibreOffice: 20 documentos, 155 páginas, cero palabras fuera de página. Revisión visual de formatos y de las 15 páginas del proyecto/actividad reales descargados (8 + 7). Corregidas tarjetas familiares separadas, filas de talleres cortadas y encabezado de asistencia.
- Clic en Abrir proyecto y Descargar proyecto Word en la prueba local. API proyecto/actividad 200 con DOCX. Variante reiniciada con el mismo almacén.
- Hash antes/después idéntico para año, proyecto, ocho actividades y cuatro estudiantes de la docente. Cero llamadas IA, migraciones o despliegues.

Evidencias locales: output/generador-documentos/plantillas-originales-20261026, con autoridad visual/hashes, auditoría, renders y copia corregida. Paginación verificada con LibreOffice; Word puede redistribuir líneas según fuentes y versión.

## Rollback

Revertir solo adaptadores y parámetros de presentación; no restaurar ni borrar la base de datos. Los archivos descargados son copias estáticas: volver a descargar para recibir el formato corregido. Checkout original y contenido guardado intactos.
