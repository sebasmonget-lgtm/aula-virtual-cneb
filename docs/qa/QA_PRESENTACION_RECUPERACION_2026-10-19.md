# Presentación, asistencia y recuperación — 19/10/2026

## Alcance y fuentes

Rama `codex/qa-corrections-20261019`, base `60a3d544137812f43cd02a21851fe988428b8368`. Continúa los hallazgos de `QA_REANUDADO_PREVIEW_2026-10-19.json`. Cambios focales, sin migraciones, cambio de modelos ni nuevos prompts. No se reescriben actividades confirmadas, evidencias, niveles o conclusiones. La publicación autorizada es únicamente Preview con Supabase QA independiente.

La plantilla aportada por el usuario coincide byte a byte con `assets/templates/actividad-aprendizaje-inicial-con-taller-v1.docx`: SHA256 `e810bfd06e5c21c5d21a5d7cc297709f8cfd5d3f6be71cf4e3b0da073b92d42f`. El problema estaba en las transformaciones que retiraban la portada y convertían las secciones en párrafos/bullets. Se conserva la plantilla fuente, sus ilustraciones, geometría, tipografía, bandas, cabeceras y pies; se cambian las zonas de contenido. El usuario permite que el encabezado aparezca solo en la primera página si resulta necesario; en las muestras la cabecera discreta original se conserva sin dificultad.

## Lista de correcciones y cobertura

| Solicitud | Cambio y comprobación | Estado |
|---|---|---|
| Pausas de preparación de proyecto | Se conserva `resource_readiness` al reconstruir dependencias. Se sustituyen tres referencias a `context.age` fuera de alcance por el aula autorizada y se corrige el ámbito de limpieza. HTTP real conserva el recibo y alcanza un proveedor local que falla por cuota controlada. | PASS regresión; generación completa cloud pendiente |
| Recuperar borradores anteriores afectados | Consulta informa materiales pendientes de confirmar; reintento exige confirmación explícita y solo actualiza el borrador propio y la revisión vigente. Sin confirmación no llama a IA. Se elimina la escritura de `updated_at`, columna inexistente en el contrato de migraciones. | PASS HTTP real |
| Desconexiones en Mi año/proyecto | GET acotado con reintento, estado de reconexión y conservación de vista anterior. Master recupera la misma respuesta identificada, con un máximo de tres recuperaciones ante 502/503/504. Una creación incierta sin ID no se repite sin confirmación. | PASS pruebas de transporte/ejecutor; origen de los 503 cloud históricos no identificado |
| Diagnóstico operativo | Códigos seguros de motivo y etapa, sin prompts, claves ni registros de menores. Lint `no-undef` en servidor/ejecutor. | PASS |
| Asistencia compacta | Nombre a la izquierda y opciones a la derecha en escritorio; adaptación en móvil. Guardado real de diez alumnos, reapertura y recarga conservan falta/tarde/justificada. | PASS UI local |
| Estadísticas | Mi aula: período, alumno, aula, días lectivos transcurridos y pendientes. `(presente + tarde) / días lectivos × 100`; aula sobre pares alumno-día. Excluye feriados, fines de semana, gestión y excepciones sin clases. Sin registro se muestra pendiente, no falta. Solo lectura; no crea períodos de evaluación. | PASS servicio + UI local |
| Edades de talleres | Biblioteca y servidor solo devuelven propuestas compatibles con el aula. Incluye propuestas multiedad con adaptación específica. 78 opciones a los 3 años, 84 a los 4 y 84 a los 5. | PASS 246 variantes + selección multiedad por UI |
| Materiales imprimibles | Ruta privada PDF A4, encabezado pequeño de colegio/aula/edad, logo si está configurado, nombre opcional propio o línea en blanco. Todos los talleres tienen material imprimible; conserva orientación de originales PDF. Consulta y biblioteca conservan el identificador del paquete. | PASS 246 variantes; descarga HTTP 200 PDF y enlace pulsado por UI |
| Fichas originales | Dos fichas MINEDU verificadas por hash y pertinencia, asociadas a adivinanzas (5) y reparto (4); diez recursos originales Ayni con ilustraciones mejoradas. Otros talleres reciben tarjetas de acompañamiento docente, claramente rotuladas. | PARTIAL: no se afirma que los cien talleres tengan una ficha MINEDU asociada |
| Lenguaje de talleres | Textos nuevos de catálogo usan trazos, letras a su manera, señales o huellas según la acción. No modifica textos curriculares oficiales ni snapshots históricos. | PASS revisión de los textos afectados |
| Calendario | Resumen lateral del día: actividad y proyecto, taller independiente y apertura del detalle. Opciones administrativas quedan en desplegable secundario. | PASS UI escritorio; orden móvil definido en CSS |
| Hoy todo el día | Actividad principal y taller opcional se muestran independientemente de las horas. Las horas no inventan ejecución. A las 18:00 permanecen disponibles. | PASS UI local |
| Otra fecha en Hoy | Se consultó el 3/11 desde Calendario y se confirmó su desarrollo el 2/11; ejecución separada, fecha prevista conservada y sin edición pedagógica. | PASS UI local y regresiones de ejecución |
| Antes de empezar/materiales | Columnas equivalentes para actividad y taller; materiales como etiquetas y observación libre accesible. Corrección adicional conserva los materiales literales guardados también al iniciar. | PASS UI escritorio/móvil + servicio |
| Word actividad/proyecto | Portada original restaurada; tablas de guía, acciones/mediación en columnas, criterio/evidencia en su momento y referencias legibles. Revisiones nuevas de artefactos conservan descargas históricas. | PASS contenido y render Word; ver límites visuales |
| Word anual | Portada/papelería originales, tabla de quince proyectos, títulos con formato explícito y fuentes canónicas una vez. Regresión XML impide cortar dentro de la tabla original y producir un DOCX inválido. Calendario antes del anexo de fuentes evita una página final casi vacía. | PASS estructura/render; documento sigue siendo extenso por sus fuentes |
| Excel | Hoja Resumen con conteos reales, Consolidado con franjas suaves, niveles confirmados, encabezado y nombre fijos, impresión A4 horizontal y autofiltro. Datos y esquema del detalle conservados. | PASS servicio e importación/render de ambas hojas |

## Errores relevantes y prevención

- **P1 / QA-R-H03:** dependents reconstruía el JSON y perdía el recibo de disponibilidad. Corrección preserva el campo. Regresión real de endpoints, no un adaptador que omite la ruta. Para borradores ya afectados se solicita la decisión faltante sin inventarla.
- **P1 / QA-R-H04:** identificadores fuera de alcance en Master/mapa/confirmación y limpieza. Aula autorizada disponible en `source.classroom`; limpieza usa contexto de petición declarado fuera de `try`. `no-undef` permanente previene recurrencia.
- **P1 / confirmación de recursos:** actualización refería `learning_experiences.updated_at`, inexistente en las 77 migraciones. Se actualiza únicamente el JSON autorizado; el recibo conserva su fecha. La nueva prueba HTTP de recuperación detectó el defecto antes de publicar y pasó después de corregirlo.
- **P2 / QA-R-H05:** error genérico perdía motivo operativo. Se guardan motivo/etapa seguros y se distingue cuota de incertidumbre. Reconexión a un GET no se representa como un fallo de generación.
- **P2 / recursos en consulta:** la proyección documental y el adaptador de consulta omitían `workshop_catalog`. La vista mostraba un recurso suelto o nada en talleres sin PNG. Ahora conservan el ID del paquete; regresión de las 246 variantes comprueba esa continuidad.
- **P2 / materiales al iniciar:** dashboard no consideraba los materiales literales en `details` cuando no existía `preparation.materials`. Consulta y ejecución usan el mismo orden de fuentes; una lista vacía explícita se respeta.
- **P2 / Word anual ilegible:** el primer corte de papelería se hacía desde un párrafo dentro de una tabla. Word rechazó el resultado real aunque la prueba textual pasaba. Corte desde tabla contenedora y regresión de anidamiento de elementos Word; Word vuelve a abrir/exportar correctamente.
- **P2 / móvil:** el `inline-flex` del pictograma interfería con `hidden`; envoltorio responsivo evita estrechar la columna de lectura. Se comprobó la guía y asistencia a 390×844.

## Evidencia y límites

QA funcional por interfaz sobre PGlite local desechable, profesora Elena Ramírez, IE Semillas, Los Girasoles, diez nombres ficticios. El fixture contiene una secuencia de seis actividades **previamente generada** y un anual guardado; prepararlo por código solo habilita la revisión visual y no acredita una generación ni un recorrido docente anual. Asistencia, elección multiedad, añadido del taller y ejecución de otra fecha sí se realizaron mediante la interfaz. No se hizo ninguna escritura de prueba en Producción.

Documentos reexportados desde salidas guardadas: proyecto de semillas, seis actividades y anual. Word local abre en solo lectura y exporta copias a PDF. Actividad 1: cinco páginas inspeccionadas individualmente; proyecto: once páginas revisadas en contacto visual; las otras actividades: cinco páginas cada una salvo la última, seis. Anual renderizado y revisado en contactos de todas las páginas; no representa una nueva revisión pedagógica completa de los quince proyectos. PDF de adivinanzas y tarjetas revisados a resolución legible. Excel real de la aplicación importado y renderizado con ArtifactTool; no se afirma haber probado impresión física o Excel nativo.

Muestras y capturas locales: `outputs/qa-presentacion-20261019/`. Detalle reproducible y logs locales ignorados: `.local/ux-final-20261019/`. No se suben credenciales, datos privados ni archivos de trabajo al repositorio.

**Costo de IA de estas correcciones: USD 0; llamadas pagadas: 0.** El proveedor de la prueba HTTP es un servidor local controlado, no IA real. Se conserva el acumulado conservador USD 4,75075397 del máximo autorizado USD 6.

Pendientes explícitos: completar curaduría ficha–taller donde no hay recurso infantil pertinente, repetir el proyecto de macetas en Preview con la confirmación de materiales y revisar sus salidas nuevas; contrastar el criterio/momento de Cierre de la actividad histórica QA-R-H01 sin reescribirla silenciosamente. No se certifica el año completo, ausencia absoluta de errores de red/proveedor, ni preparación para Producción.

## Rollback

Revertir el commit de esta ronda y volver a apuntar únicamente el alias QA al despliegue anterior `ayni-aula-staging-ge230hghi-ayni4.vercel.app`. Sin migración ni modificación de la conexión de Producción. Las revisiones nuevas de plantilla no sustituyen bytes de artefactos anteriores; el historial canónico permanece consultable. Los registros de asistencia añadidos por una profesora son datos propios y no deben borrarse al revertir código.

## Validación final local

- Typecheck, lint, build Vinext y build Next webpack: PASS.
- Suite final de once archivos: 38 PASS, cero fallos u omitidos. Incluye HTTP real, PDFs de 246 adaptaciones, edades, propiedad, asistencia, Word, documentos, ejecutor y transporte.
- Suite ampliada: 44 PASS, cero fallos u omitidos, con casos solapados. No sumar ambas como pruebas únicas. Incluye preparación completa, documentos, calendario y ejecución de otra fecha.
- Detector Impeccable en ocho componentes: sin hallazgos. La inspección visual encontró y corrigió el pictograma móvil.
- git diff --check: PASS.

La generación cloud completa de macetas no forma parte de estos resultados. SHA, alias y smoke se verifican por separado tras el commit, conservando Producción.
