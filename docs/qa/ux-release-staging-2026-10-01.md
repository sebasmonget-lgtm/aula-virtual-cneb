# Preparación de salida UX a staging — 2026-10-01

Base: `af522a5`. El cambio UX se confirmó en `2d251bb`; esta revisión añade un texto coherente para Hoy cuando el registro cotidiano aún no está habilitado en el entorno. Ese botón lleva a preparar una actividad y se presenta como tal. No se cambian flags ni datos.

Destino previsto: el proyecto nuevo `ayni4/ayni-aula-staging` de Vercel, con la CLI aislada de la cuenta nueva de Ayni. El entorno Preview no tiene variables configuradas; se publica en la URL estable del proyecto de staging y se comprueba `/`, `/health`, `/api/auth/config` y el rechazo esperado de `/api/auth/session` sin sesión. La reversión es promover el despliegue anterior desde Vercel; no hay migración.

Los escenarios de UI sin datos disponibles en el aula de muestra permanecen pendientes como indica `ux-audit-af522a5-2026-10-01.md`. Publicar la versión no equivale a aceptar esos escenarios ni a verificar RLS/Storage con dos docentes.
