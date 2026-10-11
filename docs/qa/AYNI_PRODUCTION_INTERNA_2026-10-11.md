# Ayni — Production para pruebas internas · 11 de octubre de 2026

El propietario autorizó expresamente publicar `ea206bf` para uso interno con acceso restringido, aceptando las verificaciones pendientes. Esta instrucción posterior reemplaza la condición anterior de esperar todos los gates; no autoriza relajar seguridad ni presentar tareas omitidas como aprobadas. No se encontraron defectos críticos conocidos pendientes ni una exposición concreta de datos entre docentes en el alcance ejecutado.

- Rama: `codex/ayni-qa-ia-ux-costos-20261009`.
- SHA publicado: `ea206bf179841f6a85f43dbec95c391a47b12674`, idéntico al Preview validado.
- Preview preservado: https://ayni-aula-staging-nurdgna70-ayni4.vercel.app, `dpl_DUGacBLSUGJb38Wc5CRGD6ezt63b`.
- Production habitual: https://project-0w0pq.vercel.app.
- Deployment nuevo: `dpl_EgekhWXwVjaM9iCcRc8mpJn2Eoc4`, READY; URL única https://ayni-aula-staging-9n7f0ec4l-ayni4.vercel.app.
- Rollback conservado: `dpl_BQ8jr9TVGXgDjsyu8oNN5bhy3QuH`, READY, SHA `e2bcd35ed377618fc520f07e00b4bee0f3b84d0f`; https://ayni-aula-staging-9xih831bh-ayni4.vercel.app. Para volver, promover ese deployment en el mismo proyecto/cuenta, sin migraciones.

## Comprobaciones realizadas

775 pruebas aprobadas, lint/typecheck y builds Next/Vinext del release siguen válidos: no se cambió el producto ni se repitieron llamadas IA. La compilación real de Production terminó correctamente. Se preparó con entorno Production, se probaron 22 comprobaciones públicas y después se promovió al dominio habitual, donde las mismas 22 aprobaron: salud PostgreSQL, autenticación Supabase, páginas públicas, rechazo 401 de rutas privadas y documentos sin sesión, rechazo 403 de Origin ajeno. Metadata y alias verifican exactamente el SHA publicado.

Las variables y protecciones Vercel conservan la misma huella antes/después; no se cambiaron autenticación, permisos, RLS ni migraciones. La excepción Vercel existente para dominios personalizados permanece: la página de entrada puede responder 200 sin sesión, pero los datos privados requieren autenticación Ayni. No se afirma que el dominio habitual tenga una barrera Vercel adicional.

Smoke en Chrome: la sesión existente vuelve a cargar tras publicar y muestra la misma aula sin configurar que antes. El formulario y su sección opcional abren y cierran correctamente, sin guardar cambios. Este smoke básico no equivale al recorrido pedagógico autenticado completo ni a aislamiento remoto entre dos docentes. No se reutilizó esta cuenta para introducir fixtures ni probar mutaciones.

No se ejecutaron escrituras pedagógicas, limpieza ni migraciones remotas. La inicialización PostgreSQL comprueba esquema y permisos mediante SELECT; las migraciones automáticas solo existen en modo local. El estado visible de la cuenta coincide antes/después. No se realizó una comparación fila por fila de toda la base; no se atribuye a este smoke una auditoría integral de datos.

Una comprobación RLS local adicional detectó una expectativa antigua del harness: exigía política SELECT docente en `preparation_dispatch_receipts`, que desde la migración aplicada es exclusivamente del backend, con RLS y sin grants de cliente. Se corrigió únicamente el test, exigiendo rechazo de SELECT/INSERT/UPDATE/DELETE a anon/authenticated. La regresión pasa con 73 migraciones, 66 tablas privadas y aislamiento de dos docentes sobre 16 tablas sensibles y Storage. Es evidencia local, no aceptación RLS remota. La corrección del test y este informe se guardan en un commit posterior; el deployment permanece deliberadamente en `ea206bf`.

Tras corregir el harness, su ejecución completa, lint, typecheck y ambos builds Next/Vinext terminaron con exit 0. Se conserva la suite de 775 PASS ya ejecutada sobre el producto idéntico; no se repitió toda la auditoría. El acceso directo a `/#planificar` y la recuperación de sesión se comprobaron en Production. No hubo correcciones de producto posteriores al SHA publicado.

## Pendientes aceptados para esta publicación interna

G0 y G4 aprobados; G1 aprobado localmente. G2 conserva pendiente zoom real 200%; G3 conserva micrófono/cámara físicos y seguridad autenticada remota entre dos docentes; G5 conserva recorrido autenticado completo en Preview. G6 corresponde ahora a publicación interna autorizada, READY y smoke básico aprobado. No se convierte ningún pendiente en PASS.

Ayni está publicada para pruebas internas con autenticación obligatoria sobre datos privados. La aceptación completa para uso docente general sigue pendiente de esos controles. Cero nuevas llamadas IA y cero modificaciones pedagógicas realizadas por esta publicación. Recibos, logs y captura privada: `.local/ayni-internal-production-20261011/`.
