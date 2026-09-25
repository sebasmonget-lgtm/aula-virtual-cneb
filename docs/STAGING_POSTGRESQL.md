# Backend PostgreSQL preparado para staging

Este commit prepara la conexión. No crea un proyecto Supabase, no aplica migraciones externas y no despliega. Usar solo cuentas y datos ficticios nuevos.

## Modos

| Modo | Base | Identidad | Archivos |
| --- | --- | --- | --- |
| Local | `AYNI_DB_MODE=local`, PGlite | `AYNI_AUTH_MODE=local`, `AYNI_LOCAL_TEACHER_ID` | Disco local, solo loopback |
| Staging | `AYNI_DB_MODE=postgres`, PostgreSQL Supabase | `AYNI_AUTH_MODE=supabase`, token comprobado por petición | Storage pendiente; fotos y adjuntos devuelven 503 |

El servidor rechaza una combinación distinta. El test HTTP de Auth puede combinar Auth simulado y PGlite únicamente con `NODE_ENV=test` y `AYNI_TEST_AUTH_PGLITE=1`; nunca se usa en staging.

`SUPABASE_DB_URL` es privada y corresponde a una conexión PostgreSQL del **backend** con escritura. Para este servidor persistente se recomienda la conexión directa si hay IPv6 o el pooler en modo sesión si solo hay IPv4. TLS se exige fuera de localhost. El pool de `pg` comparte hasta cinco conexiones, con límites de conexión, consulta y transacción inactiva. Cada petición recibe su wrapper de DB; `BEGIN` fija una conexión hasta `COMMIT`/`ROLLBACK`, `transaction()` usa una sola conexión y un savepoint si ya existe una transacción. Al finalizar la petición, se revierte cualquier transacción abierta y se devuelve la conexión. El cierre del proceso vacía el pool.

El flujo es Auth Supabase `/auth/v1/user` → `teacherId` verificado → `{teacherId,requestId,db}` → autorización de selectores → servicios existentes → PostgreSQL. No se ejecutan migraciones automáticamente al iniciar; el servidor verifica tablas y permiso de escritura. `AYNI_LOCAL_TEACHER_ID` no se lee en este modo.

## Rutas de datos

- **A. Backend privilegiado:** altas, edición, generación, confirmación, evaluación, cierres, informes y descargas. Todos pasan por Auth y servicios que comprueban propiedad; la conexión backend no sustituye esa autorización.
- **B. Data API directa:** solo `SELECT` autenticado en las tablas curriculares y filas propias permitidas por `202609240010_rls_hardening.sql`. Ayni usa su API propia para los flujos; la Data API es una superficie de lectura restringida por RLS.
- **C. Sin acceso cliente directo:** `INSERT`, `UPDATE`, `DELETE` de datos docentes y alumnos, `ai_pending_generations`, funciones privadas no autorizadas y escritura en Storage. Nunca se envían `SUPABASE_DB_URL`, rol de servicio o clave OpenAI al navegador.

La descarga DOCX requiere la sesión y vuelve a consultar la propiedad. `/api/export` y `/api/documents/*/save-local` no están disponibles en staging. Logos, fotos, adjuntos de entrevista y lectura de multimedia esperan el adaptador Storage; no se guardan silenciosamente en el disco del servidor. Las observaciones de texto siguen disponibles.

## Migraciones y pruebas

Aplicar `supabase/migrations/*.sql` en orden lexicográfico en un proyecto vacío, con la herramienta de migraciones Supabase y una conexión administradora. No ejecutar las migraciones `local-db` en Supabase. La migración nueva `202609240011_staging_curriculum_version.sql` agrega únicamente la fila de metadatos de la versión curricular activa si falta; no crea contenido CNEB ficticio. La fuente oficial de competencias por edad permanece en la Knowledge Base versionada.

`npm run test:postgres-adapter` prueba contrato, pool, transacciones, rollback, revisión esperada y paridad de tablas/columnas al aplicar todas las migraciones Supabase en PostgreSQL embebido con esquemas Auth/Storage simulados. `node scripts/test-supabase-rls.mjs` comprueba políticas, grants, funciones privadas y aislamiento entre dos docentes. Las pruebas existentes de integridad verifican V1/V2 y cierres concurrentes en PGlite. No equivalen a ejecutar Auth, RLS y transacciones en Supabase real; repetir allí antes del piloto.

## Datos necesarios para conectar staging después

1. URL del proyecto Supabase (`AYNI_SUPABASE_URL`) y publishable key (`AYNI_SUPABASE_PUBLISHABLE_KEY`).
2. URL PostgreSQL del proyecto (`SUPABASE_DB_URL`) con usuario backend de escritura, obtenida de **Connect**. Entregarla por el mecanismo privado de variables de entorno, no en chat ni en el repositorio.
3. Origen HTTPS exacto de la interfaz (`AYNI_ALLOWED_ORIGIN`) y URL pública HTTPS de la API (`NEXT_PUBLIC_AYNI_API_URL`), bajo el mismo sitio para la cookie.
4. Dos cuentas docentes ficticias de staging, una por aula, para comprobar Auth y RLS. No se necesita `SUPABASE_SERVICE_ROLE_KEY` para este adaptador PostgreSQL.

Rollback del código: volver al commit anterior y usar `AYNI_DB_MODE=local`/`AYNI_AUTH_MODE=local` en desarrollo. No revertir migraciones aplicadas editando archivos históricos; usar una migración compensatoria o restaurar un respaldo probado.
