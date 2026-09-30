# Preparación de Vercel y Supabase: equivalencia con local

Estado al 30/09/2026, commit de funciones `815a4b9`: **despliegue bloqueado**. Una compilación correcta de la interfaz no acredita que la API, la persistencia y los archivos funcionen. `vercel.json` ejecuta `scripts/verify-cloud-deploy.mjs` antes de compilar; hoy termina con error deliberadamente y enumera los bloqueos conocidos. No usar el resultado local como autorización para publicar.

## Lo comprobado

- `npx tsc --noEmit`, `npm run lint`, `npm run build` (Vinext/Cloudflare) y suite `node --test --test-concurrency=4`: correctos, 605/605 pruebas, sobre `815a4b9`.
- `node node_modules/next/dist/bin/next build` compila la interfaz para Vercel, pero el manifiesto generado solo contiene `/`, `/_not-found` y `/manifest.webmanifest`. No contiene `/api/*`.
- El backend PostgreSQL y las migraciones tienen pruebas locales/emuladas. No se ejecutaron contra un proyecto Supabase nuevo real en esta revisión.
- `npm run test:postgres-adapter`: 5/5; `node scripts/test-supabase-rls.mjs`: 64 migraciones aplicadas en el test y aislamiento de dos docentes en 16 tablas sensibles y Storage. Siguen siendo pruebas locales.

## Brechas para funcionar como en local

| Área | Estado actual | Condición de aceptación |
| --- | --- | --- |
| API | `scripts/local-db-server.mjs` inicia un servidor Node persistente en el puerto 8788. Vercel no publica ese proceso como función. | Función `/api/*` con el mismo contrato, Auth/autorización por petición y pool PostgreSQL cerrado o reutilizado de forma segura. Probar login y un flujo docente completo en preview. |
| URL cliente | Si no se configura la URL pública, `src/lib/local-database.ts` apunta a `127.0.0.1:8788`. | API del mismo origen en Vercel o URL HTTPS válida; comprobar en el navegador que ninguna petición va a loopback. |
| Filesystem | En modo PostgreSQL el arranque aún crea `.local/assets`; varias funciones leen o escriben archivos locales. | El arranque no escribe en el filesystem de la función. Plantillas e imágenes se empaquetan como lectura; contenido generado y evidencias van a Storage privado. |
| Storage | Logos, adjuntos de entrevista, multimedia y fotos tienen rutas que devuelven 503 en PostgreSQL. Observaciones y artefactos F10 necesitan `AYNI_SUPABASE_SERVICE_ROLE_KEY` en el servidor para su adaptador actual. | Cargas, lecturas, descarga DOCX/ZIP y permisos equivalentes en buckets privados; dos docentes no pueden consultar archivos ajenos. Ninguna evidencia de menor se hace pública. |
| Base/Auth | Las migraciones y RLS se probaron en PostgreSQL emulado. | Proyecto Supabase **nuevo** con migraciones aplicadas en orden, Auth real y prueba de aislamiento con dos docentes ficticias. |
| QA pedagógico | F12 sigue sin aceptación anual completa. | Recorrido de profesora desde alta hasta cierre sin inventar evidencias ni valoraciones, documentos, móvil y carpeta/ZIP conforme a `docs/qa/f12-final-e2e-2026-09-28.md`. |

## Secuencia para habilitar una publicación

1. Terminar la función de API y Storage privado; retirar los bloqueos estáticos solo al reemplazar cada ruta. Añadir pruebas de contrato HTTP y archivos en modo PostgreSQL. Mantener el comportamiento local y sus flags `=0` como rollback.
2. Crear **cuentas nuevas** de Vercel y Supabase y un proyecto de staging con datos ficticios. No enlazar proyectos/cuentas existentes. Cargar secretos exclusivamente en variables privadas de la plataforma o archivos locales ignorados. La clave de servicio de Storage nunca lleva prefijo `NEXT_PUBLIC_`.
3. Aplicar `supabase/migrations/*.sql` sin modificar migraciones históricas. Verificar esquema, buckets privados, RLS, dos docentes y operaciones de lectura/escritura/descarga. Los tests locales no reemplazan esta prueba.
4. Repetir typecheck, lint, suite y los dos builds. Ejecutar `node scripts/verify-cloud-deploy.mjs` con salida correcta. Crear preview en Vercel, inspeccionar red y consola, y completar smoke de login, aula, proyecto, actividad, observación, evaluación y documentos/ZIP desde escritorio y móvil. Registrar bytes/hash de un Word descargado.
5. Solo después de commit identificable, checkout limpio, staging y smoke aprobados, solicitar publicación. Si falla el preview, revertir el código al commit anterior y conservar los datos; las migraciones aplicadas requieren migración compensatoria o restauración de respaldo probado.

No hay URL de staging, credenciales ni despliegue en este commit. La verificación de preparación falla hoy **por diseño**; eso evita confundir un frontend compilado con un producto completo.
