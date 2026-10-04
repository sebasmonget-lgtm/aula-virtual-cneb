# Mi año: competencias elegidas para una nueva propuesta — 2026-10-04

## Problema y cambio mínimo

La candidata real de plantas del QA anterior omitió Crea, solicitada junto con Indaga. El filtro de privacidad trataba ambos nombres curriculares como nombres propios desconocidos. Además, la revisión de una candidata comprobaba currículo y oportunidades, pero no exigía conservar las competencias elegidas por la docente.

El filtro admite ahora exclusivamente nombres oficiales y abreviaciones provenientes del currículo de la edad del aula. Los nombres de estudiantes se neutralizan primero; contactos, identificadores y otros nombres propios siguen ocultos. Se comparte esta corrección con conversación, preparación síncrona/job y cambios locales/globales. No se modifica el tratamiento privado de observaciones/evidencias.

La conversación sugiere competencias solo cuando se nombran explícitamente en una indicación curricular; verbos cotidianos y temas no asignan IDs. La docente puede corregir esa selección antes de preparar, hasta cinco competencias según el contrato actual de oportunidades. La selección se conserva como preferencia docente en el JSONB existente. No es una observación ni una evaluación.

Generación, revisión y reparación de una sola fila reciben los IDs elegidos. Se exige una oportunidad real y pertenencia a las competencias principales por cada ID. Si falta alguna, se repara únicamente la candidata; si sigue faltando, se conserva el borrador y se bloquea su aprobación. No basta agregar un ID sin oportunidad. Una candidata antigua con revisión aprobada también pasa por este control, recuperando la intención literal conservada. GET y corrección de la selección no consultan IA.

## Permisos y rollback

Se mantienen propiedad, RLS, revisión CAS, leases y calendario del flujo existente. Los IDs enviados deben pertenecer al currículo efectivo; aprobar no permite sobrescribirlos para eludir la comprobación. Biblioteca y el año no cambian si falla la revisión. No hay nuevas tablas, migraciones ni cuentas. Solo se modifica la cuenta/aula QA ficticia autorizada para la prueba real posterior.

La publicación requiere commit identificable limpio, preview y smoke antes de producción del mismo SHA, autorizada el 4 de octubre. El recibo posterior al commit se conserva en `.local/proposal-intent-delivery.md`, con SHA, deployments, capturas, resultados de la candidata real y límites. Este documento no afirma que esa publicación o la prueba real ya hayan terminado.

Rollback: conservar lectores de doce/quince tramos, sesiones recuperables y selecciones persistidas; no borrar ni regenerar el año para revertir el cambio. El JSONB adicional es compatible con los lectores existentes, pero volver al comportamiento que omite competencias elegidas reintroduce el defecto.

## Validación local ejecutada

76/76 pruebas focales PASS: editor, journey, recuperación/jobs, mapa, Project Master, calendario, ilustraciones, recorrido inicial e intención curricular. Incluyen privacidad con Indaga/Crea y nombres/contactos; selección explícita, negación y vocabulario cotidiano; IDs inválidos sin IA; omisión durante generación/reparación; aprobación bloqueada; candidata histórica incompleta; recuperación de solo una fila sin modificar fechas; permisos de otra cuenta y guardado únicamente en Biblioteca.

Typecheck, lint del proyecto (`npm run lint`) y builds Next/Vinext finales PASS, exit 0; logs `.local/proposal-intent-*`. Una invocación previa incorrecta de `eslint .` incluyó el dist generado y agotó su formatter; se corrigió usando el comando del proyecto que excluye ese artefacto, sin cambiar ni relajar reglas. La prueba usa PostgreSQL local y proveedor simulado; sus contadores no se atribuyen a llamadas pagadas. Las pruebas no sustituyen la comprobación real en staging ni la revisión docente de la pertinencia de una candidata concreta.
