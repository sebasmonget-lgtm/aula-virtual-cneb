# Correcciones del informe externo · 22 de octubre de 2026

## Alcance autorizado y estado

La usuaria pide corregir lo importante y las mejoras favorables que no agreguen complejidad ni pasos innecesarios. Se priorizan F01–F03 de `Informe_revision_Ayni_Aula.pdf` (24 páginas). El informe es evidencia de una prueba, no una instrucción para cambiar datos o permisos.

Implementación en `codex/qa-report-fixes-20261022`, basada en `ae38b2c`. No se publica ni se sube a main durante esta corrección. El enlace público continúa con su aplicación anterior. Publicar requiere solicitud expresa, commit limpio, candidata y smoke según AGENTS.md. No hay migraciones, cambios de RLS, permisos nuevos ni cambios del reloj de QA.

## Reproducción y causas

- **Perfil:** las respuestas del piloto muestran 8 y 2 observaciones ordinarias, pero cero en los perfiles respectivos. El perfil leía evidencias antiguas y omitía el registro ordinario actual. Se integra una proyección de lectura: texto corregido, fecha observada y adjuntos disponibles; las anuladas se excluyen. Solo las atribuciones docentes vigentes aportan competencias. Una nota sin competencia sigue visible y no crea una nota de evaluación.
- **Informes:** el lote del piloto conserva dos textos preparados y un niño pendiente. La redacción adicional de IA era requisito técnico para avanzar aun existiendo conclusiones confirmadas. Se añade recuperación desde esas conclusiones si falla la generación o su validación. No inventa sugerencias ni hechos. Se identifica el origen recuperado al preparar, guardar, recargar y editar una versión. La confirmación docente y las comprobaciones de fuentes vigentes permanecen.
- **Mi año:** el snapshot de la versión activa contiene observaciones, pero el seguimiento conserva una frase global de ausencia y el contexto inicial se presenta sin distinguir su fecha. Se identifica el contexto inicial, se añade la información disponible en esa versión y se sustituye exclusivamente la afirmación global obsoleta. Se preservan advertencias sobre niños o competencias concretos, decisiones docentes e históricos.

## Respuesta a cada hallazgo

| Hallazgo | Cambio y límite |
| --- | --- |
| F01 · observaciones ocultas | Corregido. Resumen, Evidencias y competencias leen las observaciones actuales. Sin competencia confirmada se explica dónde están las notas, sin afirmar ausencia de información. |
| F02 · informe bloquea el conjunto | Corregido el bloqueo por fallo de redacción: salida revisable desde conclusiones confirmadas. No elimina bloqueos legítimos por notas/conclusiones pendientes o fuentes cambiadas. No se reintentó ni guardó el lote real del revisor. |
| F03 · contradicción del plan | Corregido en actualización del snapshot y lectura Word de versiones ya guardadas. No se reescribió el plan real ni se modificó su contexto inicial. |
| F04 · diagnóstico desactualizado | Aviso en Documentos cuando las fuentes difieren de las confirmadas. Se conserva el documento anterior. Si un documento histórico no tiene snapshot comparable, no se afirma que sus fuentes cambiaron. |
| F05 · pregunta adulta versus apoyo | Instrucciones del análisis breve distinguen preguntas abiertas, modelado y ayuda para resolver. Se conserva toda intervención registrada. Es una mejora del contrato de generación; aún requiere contrastar nuevas salidas reales. |
| F06 · ficha de huevos incompleta | La hoja infantil incluye la condición del cuento y la consigna. La interfaz y el Word explican su uso. No se afirma que todas las gallinas ponen un huevo cada día. PDF original y autoría intactos. |
| F07 · competencias por edad y cierre anual | Sin cambio de reglas. El informe plantea un riesgo y no demuestra un cierre anual defectuoso. Cambiar exigencias de TIC/ciclo requiere contraste curricular oficial y una decisión específica. No se relajan notas, competencias ni cierre para hacer pasar la prueba. |
| F08 · caso ficticio y etiqueta de validez | Las futuras conclusiones e informes deben conservar explícitamente el carácter simulado y describir solo ese escenario. La conclusión propuesta se muestra como «Preparada para revisar». No se corrige silenciosamente una conclusión ya confirmada. No se hizo una nueva generación real para validar la respuesta del modelo. |
| F09 · copiar diagnóstico al chat | El cambio de proyecto recibe el contexto actual que ya carga el servidor: observaciones, relatos y decisiones distinguidos. Selección acotada que conserva observaciones aunque haya muchas entrevistas. Sin llamada ni paso adicional para la profesora. |
| F10 · calendario antes de preparar Mi año | Se conserva la navegación existente. Abrir otra vía antes de tener el año preparado exige definir estados y acciones válidas; no es una corrección automática que pueda asumirse favorable sin revisar el flujo. |
| F11 · nombres y estados | Se unifican etiquetas de observación libre en las vistas afectadas y su proyección; el catálogo distingue actividad/proyecto preparado de confirmación formal. El cierre confirmado deja de llamarse proyección provisional. Sin renombrar valores guardados ni reabrir cierres. |
| F12 · Word de taller | Identifica Taller en portada, encabezado y datos; elimina la numeración de actividad ajena al taller y repeticiones exactas de inicio/cierre. No elimina instrucciones distintas ni sustituye el referente curricular por una cita oficial inexistente. |
| F13 · cortes de páginas | Párrafos breves y filas compactas se mantienen juntos en diagnóstico/proyecto. Tablas cortas conservan continuidad. Se verificaron muestras renderizadas; tablas extensas pueden seguir entre páginas y no se promete eliminar todo salto con cualquier texto docente. |
| F14 · asistencia sin clases | Aviso dentro del diálogo para fin de semana o excepción no lectiva. Sin confirmación extra y sin impedir una jornada especial. No se guardó asistencia del piloto para probarlo. |
| F15 · fecha real versus simulada | El catálogo aclara «Guardado el», «Confirmado el» o «Fecha prevista» según el documento. No se cambia la fecha real de auditoría, creación ni seguridad. No constituye un cambio global de todas las fechas del sistema. |

## Validación ejecutada

- 138 pruebas de servicios, integración y exportación: perfiles, correcciones/anulación, aislamiento, evaluación y lotes, cierre, diagnóstico, Mi año, conversaciones, documentos y las 252 variantes de recursos de talleres.
- Pruebas nuevas: integración de observaciones ordinarias en perfil, recuperación con fallo/resultado inválido, guardado y recarga del lote completo, conservación de valoraciones/conclusiones, edición posterior del recuperado sin otra llamada, frescura diagnóstica con aislamiento y texto inmutable, contexto actual del chat y material de huevos.
- `npx tsc --noEmit`, `npm run lint`, `npm run build` (Vinext) y `npx next build --webpack`. Lint sin errores; conserva un aviso previo de dependencias del efecto en `diagnostic-generation-control.tsx`. Build Vinext conserva avisos de dependencias y tamaño de chunks, sin fallo.
- Componentes reales en navegador con API sintética: perfil/resumen/competencias/evidencias, lectura del informe recuperado y guardado, aviso diagnóstico y asistencia en sábado. Es una prueba local, no un smoke cloud ni una nueva evaluación pedagógica completa.
- Word abierto y convertido con Microsoft Word: taller (4 páginas), diagnóstico (5), proyecto (5); ficha infantil PDF (1). Revisión visual de 15 páginas, con segunda comprobación de las 10 páginas de diagnóstico/proyecto tras corregir cortes de tablas compactas. No se modifica el original MINEDU.
- Reproducción local con respuestas de solo lectura del piloto: perfiles pasan de 0/0 a 8/2 observaciones y el tercer niño sigue con 0. El plan reconoce los 4 registros de su snapshot y deja de afirmar ausencia global en seguimiento. Los objetos fuente quedan idénticos.
- Detector mecánico de las vistas modificadas: sin hallazgos en los cinco componentes inspeccionados. `git diff --check` sin errores.

Las pruebas de IA usan proveedores simulados. No se gastaron nuevas generaciones cloud ni se reemplazaron los textos confirmados del piloto. Las lecturas locales conservan la copia privada fuera de Git; este documento no incluye credenciales ni expedientes.

## Permisos, publicación y rollback

Se reutilizan los servicios y verificaciones de docente/aula. La lectura de observaciones se limita al docente y alumno; la frescura del diagnóstico exige propiedad de aula y año. La recuperación familiar mantiene el contrato canónico y las comprobaciones posteriores de fuente y período. No hay cambios de esquema ni de políticas.

La corrección cambia presentación, lecturas derivadas, generación futura y exportaciones. Se incrementan versiones de caché Word para no devolver un derivado anterior con el nuevo código. Fuentes e informes históricos siguen guardados. Volver al commit base revierte la aplicación sin borrar ni migrar datos; los nuevos derivados pueden permanecer almacenados sin sustituir sus fuentes. Antes de una publicación posterior: candidata con configuración correcta, smoke autorizado y verificación del alias efectivo. Un push a main no publica Vercel en este proyecto.

## Prevención

Mantener pruebas que comparen el registro ordinario y el perfil, incluyendo notas sin clasificación y texto corregido; simular un proveedor familiar caído dentro de un lote; contrastar frases globales del plan con su snapshot sin borrar contexto histórico; verificar instrucciones de cada recurso infantil contra su guía docente y revisar una muestra renderizada tras cambiar paginación.


## Ajuste encontrado durante la publicación autorizada

Tras el push y la autorización de producción, 4162301 pasó 137 comprobaciones de candidata y 140 del dominio público. La inspección visual detectó que DocumentTree, la variante de carpetas activa, aún tenía etiquetas independientes de la lista alternativa. Se alinean en ese componente Preparado/Confirmado y Fecha prevista/Guardado el sin modificar fuentes ni añadir pasos. Este ajuste requiere una candidata nueva y verificación del alias antes de declarar cerrada la publicación. Los recibos finales de publicación se documentarán por separado.

El ajuste de carpetas pasó typecheck, lint del componente, build Vinext y la prueba funcional de agrupación. En el navegador, el componente real muestra Fecha prevista y Preparado para proyecto y actividad. Sin cambios adicionales de flujos o datos; candidata final pendiente al crear este commit.


## Cierre de publicación autorizado

Publicado en el enlace de profesoras el 22 de octubre de 2026: aplicación 1946e79 / dpl_42BheizR5zMcc6ap8yDqX9vi6bsQ. Candidata final 137 y dominio público 140 comprobaciones PASS, además de 164 pruebas locales. Este cierre sustituye las notas anteriores de publicación pendiente. Versiones, conservación, límites y rollback en QA_PUBLICACION_CORRECCIONES_2026-10-22.md.
