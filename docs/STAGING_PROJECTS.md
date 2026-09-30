# Proyectos nuevos de staging (2026-09-30)

Estos recursos se crearon en cuentas separadas de los proyectos anteriores. Son para datos ficticios hasta completar la validación de aislamiento, archivos privados y el flujo docente completo.

| Servicio | Proyecto | Estado |
| --- | --- | --- |
| Supabase | [ayni-aula-staging](https://supabase.com/dashboard/project/eetdkmmspicboijcmnzv), organización `Ayni Aula` (Free), región São Paulo | 68 migraciones aplicadas exclusivamente a `eetdkmmspicboijcmnzv`; 78/78 tablas públicas con RLS. Cinco buckets privados revisados. Sin usuarios docentes ni pruebas reales de Auth/RLS/Storage de dos cuentas. |
| Vercel | [ayni-aula-staging](https://vercel.com/ayni4/ayni-aula-staging), equipo `ayni` (Hobby) | Proyecto sin Git conectado ni despliegue. Production tiene modos PostgreSQL y Supabase, URL de la instancia nueva, origen `https://project-0w0pq.vercel.app`, cookies seguras, dominio técnico de DNI, claves de Auth/Storage nuevas de Supabase, dos secretos internos nuevos y claves de IA autorizadas. Falta `SUPABASE_DB_URL`. Preset Next.js y build `npx next build --webpack`. Uso del código para entrenamiento desactivado. |

Supabase se creó con exposición automática de tablas desactivada y RLS automático activado. La CLI se enlazó solo al ref `eetdkmmspicboijcmnzv` y se verificó ese ref antes de cada `db push` o consulta. La contraseña inicial de base de datos no está disponible en este checkout; su restablecimiento corresponde al propietario de la cuenta nueva. Nunca copiarla a un commit, log o mensaje.

La CLI global de Vercel en este equipo corresponde a la cuenta anterior `direccion-7906` / `Jesus de Belen`; no se usa. Una configuración CLI aislada fuera del repositorio se autenticó como `sebasmonget-4168` y enlazó este checkout exclusivamente a `ayni4/ayni-aula-staging`. El usuario aún debe restablecer la contraseña PostgreSQL del proyecto nuevo y colocarla directamente en la variable secreta `SUPABASE_DB_URL` de Vercel; la URL de sesión del pooler está preparada en el formulario sin guardar.

La rama `codex/qa-planning-ux` con el puente de API/Storage y la corrección para claves `sb_secret_` se subió a GitHub en `b86bbf9`; su remoto coincide con el commit local. Vercel aún no tiene permiso GitHub para este repositorio: se cerró la solicitud de autorización sin aprobarla ni conectar el proyecto. El primer despliegue se preparó por CLI aislada.

La cuenta de Supabase del panel lateral era la anterior `Jesus de Belen`; se cerró esa sesión sin cambiar sus proyectos. El proyecto Ayni sigue visible en Chrome con la cuenta nueva, y el panel lateral quedó en el formulario de acceso hasta que el propietario ingrese con esa cuenta.

## Puertas antes de publicar Ayni

1. La API HTTP se expone como ruta Next `/api/[...path]` y `/health`, sin puerto local ni escritura en disco en PostgreSQL. La compilación Next pasó y trazó los recursos; falta probarla en una Function de Vercel real con secretos de staging.
2. Los adaptadores privados de logos, entrevistas, evidencias y documentos están conectados en código. La migración `202609300001` alinea el bucket de evidencias con audio de hasta 8 MB. Verificar carga, lectura y descarga en Supabase real; las rutas conservan 503 sin Storage configurado.
3. Las migraciones se aplicaron en orden al proyecto nuevo; la versión duplicada `202609250001` se resolvió antes del primer push renombrando la migración aún no aplicada. La consulta remota confirmó RLS habilitado en 78/78 tablas públicas. Faltan pruebas con dos identidades Auth reales.
4. Configurar variables privadas en los servicios, crear dos docentes ficticias mediante la herramienta administrativa y probar ingreso con DNI, renovación de sesión, aislamiento cruzado, archivos y descargas.
5. Hacer commit identificable, dejar el checkout limpio, desplegar primero a staging y ejecutar smoke test. Conectar Git a Vercel solo cuando el backend y los valores de entorno estén listos, pues la conexión puede iniciar un despliegue.

Rollback: mantener los proyectos sin despliegue ni datos reales mientras se prepara la integración. Los cambios de esquema futuros requieren una migración compensatoria o restauración de respaldo verificado.
