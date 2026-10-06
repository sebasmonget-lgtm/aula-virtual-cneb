# Consolidación de todas las ramas para publicar Ayni

Solicitud expresa del usuario: subir todos los cambios y commits de todas las ramas a Vercel. Se conserva el historial Git completo y se publica su estado final integrado, mediante CLI aislada de la cuenta nueva sebasmonget-4168, scope ayni4 y proyecto ayni-aula-staging. Supabase destino exclusivo: eetdkmmspicboijcmnzv. Ver docs/STAGING_PROJECTS.md para la creación de las cuentas separadas.

## Integración y comprobaciones ejecutadas

- 23 ramas locales y ocho referencias remotas: todas sus puntas están contenidas en el historial de codex/release-all-20261005. Merge de QA con sus diagramas históricos y de F12 con los defaults aprobados F1–F11; contratos de personalización, privacidad, quince tramos y rediseño actual conservados. Los demás worktrees quedaron limpios.
- Eliminada solo la migración 0066 no aplicada añadida por F12: idéntica a la 0069 canónica ya existente. No se modificaron migraciones aplicadas.
- Una única carga de Skill personalizada mantiene process.cwd() compatible con serverless. Syntax check de 375 módulos, typecheck y lint PASS; compilaciones Next webpack y Vinext PASS.
- Suite completa de 143 archivos de producto: **707/707 PASS**, cero fallos, cancelados u omitidos. Incluye autorización HTTP, paridad de esquema, privacidad, CAS/versiones, evaluación docente, checkpoints, documentos y navegación. No se ejecutan por descubrimiento automático los scripts de experimentación que necesitan datasets externos.
- Recorrido HTTP con servidor/worker reales y proveedor local ficticio: quince tramos, cinco propuestas futuras, proyecto con cuatro actividades, aprobación conjunta, seis Word y un ZIP. Ocho llamadas simuladas y cero pagadas; repetir mantuvo ocho. No acredita calidad pedagógica de un proveedor real.
- Inventario de deployment: .local, .env, credenciales, node_modules y materiales privados/internos excluidos. Metadata de producción anterior guardada para rollback.

## Preparación remota ejecutada antes de publicar

Migraciones 20261006015005 y 20261006021437 aplicadas en una transacción con lock y registros en supabase_migrations.schema_migrations. Solo DDL aditivo/constraints e historial de migración; ningún DML sobre planes, actividades, evidencias ni evaluaciones. Las dos tablas nuevas tienen RLS; authenticated solo SELECT propio sobre jobs, sin lectura/escritura de recibos. Prueba transaccional con identidad propietaria y otra identidad: lectura 1/0 y rollback de la fila ficticia. Es una prueba SQL de políticas, no dos inicios de sesión Auth reales.

Secreto HMAC guardado exclusivamente en Vercel preview/production y Vault. pg_cron y pg_net instalados; función private.dispatch_preparation_tick sin permiso EXECUTE para cliente. Dispatcher sin schedule durante esta validación. Una firma vigente y un nonce único son obligatorios; los resultados de las llamadas y replay se registran tras el despliegue.

## Publicación y recibo posterior

Dejar el checkout limpio con un SHA identificable; desplegar preview y comprobar salud, login/configuración, rutas protegidas y worker firmado. Solo después crear producción del mismo SHA sin mover inicialmente el dominio, hacer smoke y promoverla. Activar el cron cuando ese endpoint responda correctamente. Subir las 23 ramas a origin sin force ni borrado. Vercel contiene el estado desplegado; los commits completos quedan en GitHub.

Los IDs, SHA, URLs y resultados reales posteriores se guardan en .local/release-delivery.json para que registrar el recibo no cambie el SHA publicado. Este documento no atribuye una publicación que todavía no se ejecutó.

## Rollback

Producción previa: dpl_9zLjS3EBuMnDKjyaWkvLHqsJjPRG, SHA 071e8a89a420225ee31098ed99782d9a87a724f6. Dominio estable: project-0w0pq.vercel.app. Usar la CLI aislada y el scope ayni4 para el rollback de Vercel si el smoke final falla. Detener cron.unschedule('ayni-preparation-dispatch') antes de retirar el worker; conserva jobs y resultados. Mantener migraciones, snapshots y artefactos. Para presentación anterior, NEXT_PUBLIC_AYNI_EXPERIENCE=0 y rollback explícito de los defaults F1–F11 con sus flags =0. No modificar niveles ni regenerar propuestas para revertir infraestructura.
