# Descarga conjunta de proyecto y actividades

26 de octubre de 2026. Solo variante de documentos.

## Comportamiento

Mi año y el lector de Documentos ofrecen Descargar todo (ZIP) junto al Word individual. El botón anuncia Preparando ZIP, evita doble clic mientras descarga y muestra errores recuperables. El archivo conserva el nombre normalizado del proyecto, año, aula y edición, seguido de Proyecto y actividades.

El ZIP contiene `01 Proyecto` y `02 Actividades`, con los mismos nombres P01 y P01-A01 de las descargas individuales. Incluye solo las actividades preparadas y guardadas de la edición elegida; no crea los días pendientes ni consume IA. Si se está preparando un proyecto, el paquete refleja los documentos disponibles en la consulta.

## Implementación y autorización

`document-generator-project-zip.mjs` arma el archivo mediante JSZip y los renderizadores existentes. Primero autoriza la modalidad y carga todas las fuentes; solo entrega el ZIP si todas las lecturas y renderizaciones terminan correctamente. V2 usa la lista de IDs de la edición exacta y valida cada huella del padre mediante los lectores existentes. Esas fuentes son inmutables; una actividad incorporada después no se añade a un paquete en curso. V1 usa una transacción de lectura repetible para las fuentes de su experiencia concreta.

Rutas GET: `/api/multi-age/documents/project/:id/bundle.zip` y `/api/documents/experience/:id/bundle.zip`. Propiedad docente y año se validan en servidor. La integración Supabase se prueba en esquema temporal con sus lectores y RLS; no se despliega ni habilita una integración remota nueva. Respuestas privadas, sin caché, con Content-Disposition UTF-8. No se escriben documentos, criterios, evaluaciones ni artefactos de sincronización.

El modo diario conserva su interfaz y no habilita estos paquetes de la variante. No hay migración ni cambios de plantilla, prompts o documentos anteriores. El rollback consiste en retirar el componente y estas rutas; no requiere revertir datos.

## Validación

- Batería del generador: 32 PASS.
- Versiones/proyectos V2 local y Supabase temporal más HTTP del generador: 14 PASS, con dos pruebas compartidas con la batería.
- Biblioteca V1, ZIP V1 y HTTP del modo diario: 15 PASS. Total: 59 pruebas distintas.
- Typecheck, lint y build PASS. Avisos previos de useEffect, PGlite y chunks conservados.
- Detector de interfaz sin hallazgos; escritorio y móvil inspeccionados, sin desborde horizontal.
- Dos descargas reales por clic, desde Documentos y Mi año: proyecto y ocho actividades. Los nueve cuerpos Word coinciden con las descargas individuales.
- Un año, un proyecto, ocho actividades y cuatro alumnos idénticos antes/después. Cero llamadas de IA, commit, push o despliegue.

Recibo, ZIP real y capturas: `output/generador-documentos/zip-y-revision-pedagogica-20261026/`. La revisión pedagógica de veinte Word y los vacíos encontrados están en `REVISION_PEDAGOGICA_DOCUMENTOS_20261026.md`; este cambio de descarga no reescribe contenido pedagógico.
