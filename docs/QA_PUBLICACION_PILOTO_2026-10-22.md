# Publicación del piloto para profesoras · 22 de octubre de 2026

## Estado final

La usuaria autorizó expresamente publicar las últimas correcciones en producción, en el enlace que compartirá con las profesoras. El dominio https://project-0w0pq.vercel.app/ sirve ahora el deployment `dpl_GwkzJBptxKv24SM2cRaNjhj3MRTY`, commit `f3e61adef1ce8b4e397f4158101646365c59687f`, promovido el 22 de octubre a las 11:09 de Lima. La consulta del alias y del destino Production confirma la misma revisión. El código de aplicación corresponde a `34ceb4b`; los commits posteriores previos al despliegue son documentales.

Incluye Hoy simplificado, Observación libre con identidad común, talleres al final, actividad sin inicio/cierre manual y sus consumidores alineados, conservación de notas históricas y conclusiones dentro de Informe a familias con comprobación de notas completas en servidor. El reloj de QA está desactivado en producción. Las confirmaciones de notas y los cierres formales permanecen.

## Preparación y controles ejecutados

- Checkout administrado nuevo, limpio y fijado a `f3e61ad`, coincidente con origin/main al preparar y promover. Sin archivos privados en el checkout publicado ni migraciones.
- Auditoría previa del mismo código: typecheck, lint sin errores (una advertencia existente), builds Vinext y Next webpack PASS; 211 pruebas en 32 archivos PASS. Detalle y límites en QA_MAIN_Y_VERSIONES_PUBLICADAS_2026-10-22.md.
- Compilación cloud Next webpack PASS. Candidata de producción `https://ayni-aula-staging-6xttl9bdi-ayni4.vercel.app`, sin cambiar inicialmente el alias público; 53 comprobaciones PASS antes de promover.
- Dominio público después de promover: **56 comprobaciones PASS**. Incluyen commit/alias, región Brasil, base de producción, autenticación, rutas pedagógicas, propiedad, rechazo de origen inválido, reloj de QA deshabilitado y acceso público sin bypass Vercel.
- Descarga real y validación del contenedor Word de plan anual, proyecto y actividad: tres archivos en candidata y tres en producción, todos PASS. No se pidió nueva generación IA.
- Navegador real, cuenta ya abierta en producción, recargada después de promover: Hoy sin actividad muestra Observación libre, elimina el acceso redundante Ir al Calendario y presenta talleres al final. Captura: `output/piloto-produccion-20261022/Hoy-produccion.png`. Esta evidencia corresponde al dominio público, no al fixture local.

## Conservación y límites

Se compararon huellas mediante las API canónicas autorizadas de la cuenta docente de prueba existente antes de desplegar, en la candidata y en el alias público. Coinciden los diez estudiantes, 30 observaciones libres y 35 guiadas de diagnóstico. También coinciden los conjuntos consultados de observaciones ordinarias, notas, conclusiones e informes, vacíos en este escenario de producción. No se modificaron fuentes pedagógicas, notas o conclusiones durante el smoke; las descargas pueden registrar artefactos derivados. Se renovó la sesión de prueba existente sin enviar correo ni cambiar contraseña.

Esto no es una auditoría global de todas las tablas o cuentas. El acceso directo REST de servicio devolvió 403 y no se dispuso de conexión SQL utilizable; no se redujeron protecciones para ampliarlo. La conservación de textos de conclusiones e informes ya guardados se probó en las regresiones y el recorrido local documentados; no se afirma haber creado o revalidado un lote no vacío de informes en producción.

QA conserva `dpl_7wKLPEYG4DNVRqNAAXaqC8sZgWpv` / `63ea015`. Las huellas de configuración de seguridad y variables del proyecto no cambiaron. No se cambiaron cuentas, permisos o RLS. No se publicaron las capturas privadas ni archivos locales en el despliegue.

## Evidencias y prevención

Recibos privados ignorados en `.local/pilot-production-20261022/`: preflight.json, deploy.json, baseline-smoke.json, candidate-smoke.json, production-smoke.json, promotion.json y recibos de fuentes/descargas. Los controles iniciales que suponían una URL en auth/config o GET en la ruta de escritura de observaciones se corrigieron según el contrato existente; no fueron fallos de la aplicación.

El proyecto Vercel continúa sin integración Git: un push a main no equivale a publicación. Al entregar enlaces se deben contrastar el deployment efectivo, el código aprobado y el smoke de ese dominio. Si main avanza solo por documentación, verificar y dejar constancia de que no cambia ninguna ruta de aplicación. Una pestaña abierta antes del despliegue requiere recarga para sustituir su JavaScript anterior.

## Reversión

Deployment anterior retenido: `dpl_B4ccwivp6ZtpbsiGKLYwPm767fAk`, commit `58b76428111090acde82066ba3f8164c45d1715e`. Ante una regresión comprobada, promover ese deployment de nuevo al mismo alias y repetir smoke. No restaurar datos: esta publicación no aplica migraciones ni transforma fuentes pedagógicas.
