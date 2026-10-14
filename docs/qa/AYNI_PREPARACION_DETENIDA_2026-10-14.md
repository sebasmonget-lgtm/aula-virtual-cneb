# Preparación detenida en 0 de 10 — 14/10/2026

Base: 52ddd18. Alcance: recuperación de trabajo aceptado, Preview únicamente.

## Evidencia de nube
La solicitud real de /api/preparation/:id y las lecturas del proyecto llegan al deployment 32f9415, HTTP 200. Consulta SQL exclusivamente SELECT, mediante CLI Supabase autenticada y ref enlazado de Ayni, confirma estado succeeded/ready con approved_at=null, cero items/actividades; proyecto draft/map_review con Plan Maestro y diez días del 16 al 27 noviembre; plan anual activo, revisión 4 coincide. El job se creó antes de la última corrección y su última escritura fue después del Master. No se consulta la ERP ajena ni se modifica la base por SQL.

## Corrección
Proyección pública incomplete cuando falta publicación de un proyecto aceptado. Recuperación transaccional en lectura propia conserva job ID, Master, respuestas y días. Requiere fuente/revisión vigentes, proyecto/aula/propietario y política de aceptación original. Si había una llamada incierta, no se repite automáticamente. El executor no puede declarar succeeded antes de guardar aprobación/publicación atómica. Un bloque publicado nunca se vuelve a iniciar.

## Pruebas locales ejecutadas
11 PASS: complete-project-preparation, preparation-jobs, preparation-background, preparation-navigation y auth-http. Regresión reproduce la terminación prematura y recupera por /current, publica diez actividades con diez respuestas locales y sin otra generación de Master. Recuperación idempotente, propietario ajeno/revisión alterada bloqueados, respuesta incierta requiere aceptación del posible reintento; rollback de publicación conserva todo preparado. Cero llamadas pagadas de pruebas.
Typecheck, lint de fuentes y Next build PASS.

## Recuperación del trabajo docente
La nueva lectura autenticada retomará las actividades pendientes del proyecto ya aceptado. Esto no crea otro año/proyecto ni altera observaciones, evaluaciones o secuencia. No se modifican jobs por Management API ni se fuerza una aprobación pedagógica. Resultado cloud pendiente de registrar después de publicación y entrada autenticada.

## Publicación y rollback
Commit, Preview READY y smoke pendientes. Production excluida; rollback 32f9415 conserva los datos y Master. Evidencia privada en .local/preparation-stuck-20261014, sin secretos en el repositorio.
