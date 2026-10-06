# Rediseño de experiencia — implementación local

Base verificada: 2624348, rama codex/annual-year-map. Auditoría previa: REDISENO_EXPERIENCIA_AUDITORIA_2026-10-05.md. El usuario pidió un plan y después autorizó su ejecución. Se conservan los cambios documentales previos. No se ha publicado, enviado un push ni utilizado cuentas remotas para esta ejecución.

## Resultado por recorrido

| Recorrido | Implementación |
| --- | --- |
| Navegación | Mi año, Hoy, Calendario, Evaluar y Planificación. Mi año apunta al mismo Planificar/annual. |
| Planificación | Cuatro carpetas filtradas sobre la biblioteca canónica; cada carpeta consulta y descarga documentos y abre el flujo existente. |
| Inicio opcional | Diagnóstico informa y permite continuar; contexto revisable y conversación conservados por separado. |
| Inicio tardío | Quince tramos mantienen el año completo. Pasado sin registro explícito; historia declarada opcional, sin fabricar actividades o evaluaciones. El tramo actual utiliza días restantes. |
| Proyecto | Resumen del año, contexto adicional opcional y una preparación recuperable. Competencias principales y propósito se validan contra Mi año en servidor. |
| Actividades | Preparación automática del bloque desde el Master, checkpoints por actividad y revisión completa antes de una aprobación conjunta atómica. |
| Hoy | Consulta otras actividades del mismo proyecto e intercambio docente de dos fechas sin IA; preserva fecha pedagógica original y talleres ligados. |
| Cambio futuro | Sucesor explícito de Mi año; discrepancia visible del proyecto preparado, nueva versión solicitada y padre conservado hasta confirmar. |
| Revisión del período | Oferta desde Hoy con Revisar/Mantener; opcional; distingue oportunidades previstas/realizadas, evidencia, valoraciones docentes y proyectos futuros. Creador existente prepara una sola candidata para Biblioteca. |
| Documentos | Word de seis tipos canónicos, bytes privados estables, exportación granular y ZIP en partes de hasta 100 archivos o 50 MiB sin comprimir. |

## Decisiones y límites pedagógicos

- La duración pertenece al tramo. El solver existente adapta 2↔3 semanas sin reconstruir calendario; feriados, gestión y Acogida no se mueven.
- Un proyecto cuyo período empezó o con trabajo/evidencia registrada se conserva. Para adelantar otro se ofrece el siguiente tramo completo futuro. Un inicio tardío puede preparar el tramo parcial presente.
- Lista de proyectos sigue el orden temporal y números de Mi año, destacando vigente/próximo. Las advertencias por Navidad, Fiestas Patrias o event_month son determinísticas, requieren decisión y no llaman IA.
- Contexto aprobado y conversación se congelan por versión. La proyección enviada al proveedor utiliza el filtro privado y términos curriculares; no se envían fotos ni grabaciones de menores.
- Una llamada de proveedor con resultado incierto exige reintento explícito que informa posible repetición. No prometer exactamente una llamada frente a caída posterior a cobro y anterior a persistencia.
- No se asignan niveles por conteos, falta de registros o umbrales arbitrarios. Intereses emergentes no se inventan: la docente los aporta al creador de la candidata.
- El cierre Word es una exportación del manifiesto confirmado existente; no se presenta como una nueva plantilla oficial. Los demás exportadores reutilizan plantillas existentes. No se generan documentos finales de borradores en el paquete completo.

## Persistencia, permisos y concurrencia

Se añade preparation_jobs: identidad idempotente por fuente/revisión/huella, lease y token de ejecución, checkpoint privado, estados recuperables y aprobación docente. El IO de IA ocurre fuera de transacciones. El servidor local ejecuta pasos aun con navegador cerrado. En serverless el endpoint privado HMAC reclama un paso; requiere activar el dispatcher externo descrito abajo.

Las actividades incluyen preparation_item_id único. Un resultado guardado permite restaurar el token de entrega vencido sin volver a generar. El servidor consulta lo ya persistido antes de considerar una llamada adicional.

Reprogramación, intercambio, registros de ejecución, evidencias y observaciones comparten lock del aula. Se valida toda la línea de versiones y talleres; CAS/propiedad/calendario se vuelven a revisar en servidor. La aprobación del bloque revierte íntegramente ante fallo de una actividad. Confirmar un sucesor del año vuelve a comprobar trabajo surgido mientras el borrador estaba abierto.

Nuevas migraciones locales 0072/0073 y remotas 20261006015005/20261006021437. No se editaron migraciones anteriores. Remotas añaden RLS de lectura propia y escrituras privilegiadas, sin permisos de cliente sobre recibos de firma. Se verificó paridad de esquema mediante PostgreSQL local; no se ejecutaron ni validaron RLS en un Supabase remoto.

Artefactos de diagnóstico, actividad, informe y cierre incluyen huella de fuente en la identidad de plantilla para conservar versiones anteriores tras nuevos registros. El Word anual de este contrato usa annual-experience-v1; los lectores y artefactos históricos siguen disponibles. El paquete congela una lista de fuentes; si cambia durante exportación conserva archivos preparados y pide una descarga nueva.

## Validación ejecutada

- Suite final focal: **109/109 PASS** y una regresión adicional de privacidad PASS (verbos pedagógicos conservados y nombres conocidos ocultos), incluyendo PostgreSQL, recuperación, exclusión, autorización, CAS, rollback del bloque, protección de pasado/evidencias/talleres, sucesores explícitos, horizonte tardío, calendario y Word/ZIP/paridad.
- Typecheck y lint completos PASS. Builds Vinext y Next PASS. Advertencias de PGlite/eval, tamaño de chunks y tracing de filesystem presentes en builds; no se atribuye validación de tamaño de deployment remoto.
- HTTP local aislado con proveedor ficticio: quince tramos, cinco propuestas restantes, proyecto del tramo parcial con cuatro actividades, aprobación conjunta, seis Word y un ZIP válido. Ocho llamadas simuladas; **cero llamadas pagadas**. Repetir el recorrido reutilizó lo preparado y mantuvo ocho llamadas.
- Revisión HTTP del período: doce competencias, cero alumnos ficticios, continuidad futura visible y período desconocido rechazado. Pruebas focales cubren la diferencia entre realizado/evidencia/futuro.
- Navegador local real: escritorio 1440×900 y móvil 390×844, cinco accesos, cuatro carpetas, mismo Mi año con quince tramos y etiqueta parcial, listado ordenado 11–15 y proyecto vigente destacado, lectura y descarga de actividad, recuperación del ZIP, apertura real de la actividad de Hoy y revisión opcional del período. Mantener Mi año conservó el hash exacto de la versión activa. Sin desbordamiento global en móvil ni errores de consola detectados en las superficies verificadas.
- Pruebas visuales en .local/qa-redesign-20261005-results; recibo HTTP verification.json y consolidado delivery-checks.json. Proveedor simulado acredita funcionamiento y recuperación, no calidad pedagógica de generación real.

## Activación pendiente en infraestructura nueva

1. Crear/configurar las cuentas nuevas exigidas por AGENTS.md. No reutilizar las cuentas actuales. Mantener secretos exclusivamente en el entorno seguro.
2. Aplicar las dos migraciones remotas nuevas a staging, comprobar RLS con dos docentes y mantener Storage de artefactos privado.
3. Configurar AYNI_PREPARATION_DISPATCH_SECRET exclusivamente en servidor y el mismo secreto en Vault; Vault también contiene la URL HTTPS /api/internal/preparation/run.
4. Habilitar pg_cron, pg_net y pgcrypto; revisar y ejecutar scripts/configure-preparation-cron.sql únicamente en una operación de staging/publicación autorizada. La tabla durable es la autoridad, no la cola transitoria de pg_net.
5. Probar salir/cerrar navegador durante un proyecto y un paquete, firma inválida/replay, dos docentes, caída del proveedor y reintento. Hacer revisión pedagógica humana con proveedor real antes del piloto.
6. Publicación requiere solicitud expresa, commit identificable, working tree limpio, staging y smoke test. Estos pasos remotos no se han ejecutado.

## Rollback

NEXT_PUBLIC_AYNI_EXPERIENCE=0 restaura presentación anterior; AYNI_EXPERIENCE=0 desactiva las habilitaciones nuevas del servidor cuando corresponda. Conservar lectores de doce/quince, snapshots, actividades, artefactos y contratos del horizonte tardío. No volver a un código limitado a doce ni borrar tablas para revertir interfaz.

Detener el dispatcher con cron.unschedule('ayni-preparation-dispatch') conserva jobs/checkpoints y trabajo generado. El retiro del worker no elimina datos pendientes; volver a activarlo retoma estados seguros. No revertir migraciones aplicadas ni regenerar automáticamente estados inciertos.
