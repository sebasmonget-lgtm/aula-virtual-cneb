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
Producto c452e01019121e4f5a3a8833e33a17316209faca, subido a GitHub. Preview https://ayni-aula-staging-h7rqj0fz5-ayni4.vercel.app / dpl_5VPuUDA1BNBQSHmvDinnpqAVcN7A, READY, target null, SHA verificado. Build cloud y 24 smoke por CLI autenticada PASS. Production dpl_H19YWzRdGjkgh8y72QAd1qBty7Mf / 9a0920230350cd6b9050f35683a1f35d459e78c7 permanece intacta. Production excluida; rollback 32f9415 conserva los datos y Master. Evidencia privada en .local/preparation-stuck-20261014, sin secretos en el repositorio.

La consulta de lectura confirma recovery_source_matches=1 para el trabajo real. Se abrió una pestaña separada en Chrome; Vercel permite acceso, pero Ayni pide DNI/contraseña en el nuevo dominio. Inicio de sesión docente solicitado al usuario para comprobar recuperación real; sin SQL de escritura, sin otra generación anual/Master y sin llamadas pagadas sintéticas.

## Verificación autenticada final
Usuario confirmó inicio de sesión en h7rqj0fz5. Recarga retoma el mismo trabajo: 1, 2, 3, 5, 6, 7, 8, 9 y 10 actividades guardadas, sin crear otro job. Salir a Documentos durante la preparación no interrumpe el avance. A las 19:36:53 UTC quedó succeeded/ready, approved_at persistido; plan anual activo conserva revisión 4 y proyecto original conserva su Master/ruta de diez días. La confirmación esperada del proyecto lo pasó a activo/revisión 4.

SELECT final confirma exactamente diez actividades active del 16 al 27 noviembre, cada una con propósito, situación, acciones infantiles, cierre, criterio, contrato activity-v3, referencia de criterio y una entrada de calendario en su fecha. No hay duplicados de actividades en ese proyecto. UI muestra «10 actividades guardadas» cronológicas. Se abre la primera en consulta completa y se vuelve al mismo proyecto sin generar ni editar. Capturas privadas: recovered-ten.png y activity-consultation.png. Lectura final de uso registra diez llamadas workflow activity, del 19:25:17 al 19:35:21 UTC, sin nuevas llamadas de año o Master. Publicación terminó a las 19:36:53 UTC: aproximadamente doce minutos de preparación real; no es un plazo garantizado.

Durante publicación apareció en pantalla «timeout exceeded when trying to connect». La consulta independiente confirmó después publicación exitosa sin reintento docente; la siguiente lectura de UI eliminó el aviso y mostró la lista. Fue un fallo transitorio de conexión de la consulta visible, no pérdida de las diez respuestas. No se declara resuelta la capacidad de conexiones de infraestructura ni atribuye el timeout a un límite concreto sin más evidencia. Production sigue en dpl_H19YWzRdGjkgh8y72QAd1qBty7Mf / 9a0920230350cd6b9050f35683a1f35d459e78c7. Sin SQL de escritura, migraciones o regeneración del bloque.
