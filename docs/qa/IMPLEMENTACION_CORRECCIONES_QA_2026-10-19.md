# Aplicación de correcciones del QA interactivo

Fecha: 19 de octubre de 2026. Rama: `codex/qa-corrections-20261019`. Base: `d0260f43fd46e63951bc0edeb67706f48cf7ec8b`.

Se implementan correcciones desde el registro Word, conservando los planes y actividades confirmadas. No se publicaron cambios ni se ejecutaron migraciones cloud. El generador de materiales queda aplazado por decisión del usuario. No se hicieron llamadas pagadas de IA en esta ronda.

| Hallazgo | Aplicación y alcance | Validación |
|---|---|---|
| QA-UI-01 | Ejemplo de apellidos cambiado a Ramírez Flores; no se cambian nombres guardados. | Typecheck y revisión del formulario. |
| QA-UI-02 | Cierre transitorio del editor tras una foto: sin causa reproducida. No se introduce un arreglo especulativo. | PENDIENTE de reproducción con la misma secuencia. |
| QA-AI-01/02/03 | Clasificador distingue construcción espacial/indagación, emoción propia/comunicación y meta-estrategia-revisión; admite varias competencias con actuaciones independientes. | Contratos y regresiones locales; pendiente comprobar salidas nuevas con IA real. |
| QA-GUIADA-01 | Cobertura se incrementa inmediatamente tras respuesta canónica, sin contar dos veces el mismo ID, y luego se vuelve a consultar el servidor. | Regresión de combinación idempotente; QA visual local en curso. |
| QA-GUIADA-02 | La fuente de observación conserva experiencia y criterio por sus snapshots; se muestran en tarjeta y durante edición. | Pruebas del servicio y trazabilidad. |
| QA-GUIADA-03/04 | Lenguaje simple en pistas editoriales. Cantidades 0 obs./1 obs./2 obs.; gris/amarillo/verde, sin juicio de aprendizaje. | Catálogo y regresiones de cobertura; revisión visual local. |
| QA-CHAT-01 | Conserva literalmente aportes omitidos por la extracción con su turno de origen. Las decisiones retiradas por la profesora no se restauran. | Caso de seis aportes y cambios manuales; contratos del chat. |
| QA-CHAT-02 | Detalle usa el índice real del tramo al abrir Cambiar con Ayni. | Typecheck y revisión de enlaces existentes. |
| QA-CHAT-03 y calidad anual | Reglas de generación exigen oportunidades futuras para decisiones actuales y progresión concreta. Se distinguen emoción del personaje/emoción propia y reparto/acuerdo con necesidad real. | Regresiones de planificación; pendiente muestra nueva de IA real. |
| QA-WORD-01 | Instantes se presentan en America/Lima; fechas puras del calendario mantienen su día. | Caso nocturno UTC que corresponde al día previo en Lima. |
| QA-WORD-02 | Respuestas estructuradas familiares se presentan con sus etiquetas españolas; originales intactos. | Caso communication_tags/quiet_initially y fuente sin modificación. |
| QA-WORD-03/04/05/06 | Rótulos de propósito, reto, acciones, mediación y observación; contexto sin duplicación; tabla inicial con 15 tramos, fechas y competencias; páginas numeradas y omisión de secciones vacías. | Exportación con contenido canónico guardado; render local de Word. |
| QA-UX-CARGA-01 | Círculo anual con porcentaje estimado hasta 390 s; 100% de la estimación no declara finalizado el trabajo. Inicio persistido y finalización real independiente. | Typecheck/build; revisión visual local. |
| QA-UX-DOCS-01 | Documento anual tiene Ver Mi año y Descargar Word. Preparar/cachear la versión estable se integra en Descargar. Se conservan fuentes e historial. | Typecheck y regresiones de documentos. |
| QA-PROYECTO-01 | Saldo agotado es causa conocida, no una respuesta incierta. Se preservan resultados y se descarta solo el ID fallido de proveedor al reintentar tras recarga. | Fallo directo y respuesta background fallida con insufficient_quota. |
| QA-PROYECTO-02/05 | Hasta tres llamadas de actividades en paralelo después del Plan Maestro; checkpoint independiente por actividad y escritura serializada de snapshots. Se conservan éxitos si falla otra actividad. Publicación de toda la secuencia sigue atómica. Duraciones por generación y guardado. Círculo estimado con conteo real. | Regresiones de diez actividades, fallo parcial concurrente, reintento, respuesta guardada cuyo enlace temporal venció y rollback de publicación. No se promete un tiempo cloud sin medir. |
| QA-PROYECTO-03 | Nuevas guías rotulan el momento de observación en evidence_opportunities; la proyección lo coloca en ese momento con el mismo criterio/ID. | Caso explícito de criterio en Cierre, sin duplicarlo. Las guías históricas sin rótulo mantienen la ubicación anterior; requieren revisión docente, no inferencia automática. |
| QA-PROYECTO-04 | Cola v2 separada: el ejecutor antiguo no puede reclamar trabajos nuevos. Lectura del historial antiguo, sin retomarlo/escribirlo automáticamente. Se bloquea nueva preparación de una fuente con trabajo antiguo todavía pendiente. | Prueba con cola antigua real y cola nueva local, propiedad y rechazo de reintento histórico. Migración cloud PENDIENTE, no aplicada. |
| Pedagogía de las 20 actividades | Reglas generales en preparación de Plan Maestro y skill de actividad: reto progresivo, ayudas opcionales, recurso disponible, autoría infantil/dictado, revisión que admite conservar y cierre con participación alternativa. | Contratos e integridad de la secuencia. No se reescribieron las 20 actividades históricas ni se declara validada una generación real nueva. |
| QA-WORD-PROY-01/02 | Portada compacta con papelería Ayni. Guía diaria antes de referencias; se retiran rutinas genéricas repetidas del diario. Se conserva texto pedagógico y observaciones registradas. | 20 actividades exportadas, 3 páginas cada una en esta muestra; objetivo de 2 páginas es orientativo. |
| QA-WORD-PROY-03/04 | Un material no se presenta como espacio. No se inventa Sede principal. Campos opcionales sin fuente se omiten o se señalan sin dato. | Regresión de fuente y exportación sin modificar originales. |
| QA-WORD-PROY-05/06 | Origen y situación sin repetición literal; fundamentación separada; preguntas del recorrido completas, sin presentar solo la primera como reto global. Capacidades se rotulan de referencia, sin fingir selección pertinente. | Contratos de Word y render local; síntesis orientativa de edad sigue rotulada como tal. |
| Generador de materiales | APLAZADO: cuentos, imágenes y otros recursos específicos no se generan en esta ronda. | Costo adicional de IA de esta ronda: USD 0. |

## Seguridad de activación y rollback

La migración aditiva `202610190001_isolated_preparation_queue.sql` crea únicamente la cola v2 con RLS y lectura propia; no mueve ni borra trabajos antiguos. Su equivalente PGlite es `0075_isolated_preparation_queue.sql`. No se aplicó ninguna a Supabase. Antes de activar Preview, verificar permisos y conexión QA y aplicar la migración en un entorno aislado. No apuntar el código nuevo a una base que todavía carece de la tabla.

Los trabajos antiguos inconclusos se conservan para consulta. Su recuperación requiere revisar su estado y el ejecutor antiguo; no se migran a ciegas ni se declara que la incidencia cloud esté resuelta por haber pasado las pruebas locales.

Rollback de código: volver a la base d0260f4 sin eliminar la tabla v2 ni los datos nuevos. Un ejecutor anterior no procesa esa tabla; revisar explícitamente trabajos pendientes antes de cambiar de versión. No se retiran columnas ni se reescriben migraciones aplicadas.

## Límite de la validación

Las pruebas locales verifican contratos, persistencia, concurrencia y presentación. La calidad de nuevas respuestas de IA, los tiempos con tres llamadas reales y la activación remota siguen pendientes. No equivalen a un nuevo QA anual completo ni autorizan modificar Producción.

## Verificación ejecutada

95 pruebas PASS en la ejecución combinada de servicios, persistencia, generación con proveedores simulados, documentos, catálogo, recuperación, calendario y paridad de esquema. Typecheck, lint y build Vinext pasan; los comprobantes finales se conservan en `.local/qa-corrections-*.txt`. Se exportaron 23 documentos con fuentes guardadas: un plan anual, dos proyectos y veinte actividades. Word local produjo PDFs; las actividades de esta muestra tienen tres páginas y los proyectos nueve. No es una medición de generación IA nueva.

La caché de documentos cambia a annual-journey-readable-v3, experience layout3 y activity layout5. Los archivos estables anteriores permanecen disponibles en el historial. Descargar prepara o reutiliza la plantilla vigente.

## 2026-10-19 — Criterios múltiples y correcciones de la revisión de macetas

Una actividad puede desarrollar varias competencias pertinentes, cada una con criterio, evidencia y uno o varios momentos de observación. Se heredan y persisten las referencias completas; se reutiliza el almacenamiento existente. La muestra real detectó y permitió corregir otra restricción de AIContextBundle a una competencia por llamada diaria. No se obliga a integrar dos competencias en todos los días ni se reescriben actividades confirmadas.

Se agregó confirmación docente previa para recursos explícitamente pendientes, se reforzaron las reglas de viabilidad y lenguaje práctico y se ajustaron los Word. Las observaciones libres sin criterio tampoco reciben un criterio por defecto en el documento. Detalle, evidencia, límites y rollback: docs/qa/QA_CORRECCIONES_PEDAGOGICAS_2026-10-19.md. En esta etapa inicial el mapeo de desempeños oficiales estaba pendiente. La ampliación posterior lo implementa y valida: ver docs/qa/QA_DESEMPENOS_OFICIALES_2026-10-19.md; las paráfrasis históricas siguen diferenciadas de las citas oficiales.

QA: 96 regresiones PASS; typecheck, lint y build PASS. Muestra nueva de IA real: un Master y seis actividades de cinco años; ocho llamadas pagadas contando una revisión del último borrador. Costo adicional estimado USD 0,1066935; acumulado USD 4,607772955 de 5. Sin escrituras cloud, commit ni despliegue de esta ronda.
