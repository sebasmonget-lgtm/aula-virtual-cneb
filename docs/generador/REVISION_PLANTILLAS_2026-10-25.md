# Revisión de plantillas del generador — 2026-10-25

Revisión y correcciones realizadas exclusivamente en la copia `ayni-generador-documentos`, rama `codex/ayni-documentos-pruebas`. No se publicaron cambios ni se utilizaron cuentas o claves remotas. Los ejemplos contienen datos ficticios.

## Resultado

- Siete instrumentos: nómina, diagnóstico, observaciones, evaluación, conclusiones, informe familiar y asistencia.
- 18 DOCX exportados y convertidos correctamente: los siete instrumentos, diagnóstico individual, nómina/asistencia con 45 nombres largos, cinco tipos de taller y ejemplos existentes de plan anual, proyecto y actividad multiedad.
- 87 páginas renderizadas. Comprobación automática de texto fuera del tamaño físico de página: cero incidencias. Inspección visual mediante hojas de contacto y páginas completas de cabeceras, tablas, continuaciones, talleres y planificación. Este control de límites no detecta por sí solo cualquier solapamiento.
- 252 variantes de guía de taller comprobadas por contenido, edad y nombres; 90 variantes de materiales PDF generadas y abiertas correctamente. Muestras de materiales de 3, 4 y 5 años renderizadas e inspeccionadas.
- 40 referencias a recursos curados comprobadas contra sus huellas SHA256. Son referencias de variantes, no necesariamente 40 archivos distintos.
- 35 pruebas automatizadas correctas de instrumentos, API, permisos y regresión de exportadores de planificación de una edad/multiedad. Esquema Supabase probado únicamente en base temporal, sin conexión a una cuenta remota.
- `npx tsc --noEmit`, `npm run lint` y `npm run build`: salida cero. Lint conserva una advertencia previa en `diagnostic-generation-control.tsx:28`; build conserva avisos de dependencias y tamaño de paquetes.
- Reinicio exclusivo del preview independiente y smoke por HTTP: web disponible, misma aula y tres alumnos conservados, descarga de asistencia horizontal con sus nombres.

## Correcciones

1. Seleccionar un alumno ahora limita también edades y competencias del instrumento a su grupo curricular. Los talleres rechazan un alumno que pertenece a otra edad; el nombre automático del material PDF se toma solo del grupo elegido.
2. Asistencia estaba definida con dimensiones intercambiadas dos veces por la API de `docx`. Se conservan dimensiones A4 base y se deja que la orientación determine el giro. La prueba comprueba las dimensiones reales del XML, además del atributo de orientación.
3. La cabecera de asistencia es compacta y los días 17 al final comienzan otra sección de páginas para grupos grandes. La muestra de 45 nombres largos ocupa cuatro páginas horizontales; conserva todos los alumnos en ambos bloques de días.
4. Informes familiares y conclusiones repiten nombre y edad en la cabecera de su tabla al continuar en otra página. Cada alumno comienza en página nueva.
5. Los saltos de línea de preparación de talleres se escriben como saltos de Word. El título, nombres y comienzo de tabla de cada grupo diagnóstico conservan continuidad.
6. Nómina usa «Nombres y apellidos» y fechas DD/MM/AAAA sin conversión de zona horaria. La identificación rotula «Director o directora».

Las observaciones, niveles, conclusiones y asistencia permanecen vacíos. El contexto conversado sigue identificado como información para planificar y no como resultado observado. No se alteraron los exportadores existentes de planificación para corregir estos instrumentos.

## Evidencias y repetición

Resultados bajo `output/generador-documentos/revision-plantillas/`: `audit.json`, `render-audit.json`, DOCX, muestras PDF, PNG por página y hojas de contacto. `scripts/audit-document-generator-templates.mjs` reproduce la revisión de contenido con fixtures aislados; `scripts/render-generator-templates.py` usa el renderer de Documents y LibreOffice extraído en `.local/tools/libreoffice/extracted/program`.

Se verificó firma y SHA256 de LibreOffice 26.2.6 antes de extraerlo para QA. No se instaló globalmente ni se modificó el PATH permanente. La carencia del convertidor registrada en la entrega anterior queda resuelta para esta revisión.

## Límites y rollback

La revisión visual usa LibreOffice, no Microsoft Word; puede haber pequeñas diferencias de paginación entre motores. Los ejemplos de planificación proceden de fixtures y proveedor simulado: no validan calidad de una nueva respuesta de IA real. Sigue pendiente ese recorrido con clave propia y revisión pedagógica docente, además de Auth/RLS en un staging nuevo.

Todas las modificaciones de esta revisión se dirigieron al worktree independiente. Al cotejar las doce huellas históricas de la carpeta original, diez coincidían y dos archivos tenían cambios posteriores a aquel registro; no se restauraron ni se atribuyeron esos cambios a esta revisión. No se escribió sobre la carpeta original.

Rollback: detener el launcher independiente y revertir únicamente los cambios de esta revisión en la rama de pruebas, conservando el trabajo previo y los datos de prueba que se necesiten. No hay migración ni escritura pedagógica que revertir.
