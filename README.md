# Ayni Aula

Asistente de planificación, organización y seguimiento pedagógico para docentes de Educación Inicial, alineado al CNEB.

## Estado

La app local usa PostgreSQL embebido (PGlite) y un servidor API separado. Hay un adaptador PostgreSQL y Auth Supabase para staging, pero el despliegue Vercel/Supabase sigue bloqueado: faltan una función para la API y paridad de archivos privados. Ver [preparación cloud](docs/VERCEL_SUPABASE_READINESS.md) antes de publicar.

## Uso local

Requisitos: Node.js 22 o superior.

```bash
npm ci
npm run dev:local
```

La app se abre en `http://localhost:5173`. La base local se guarda en `.local/pgdata` y no requiere Docker.

## Validación

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run test:postgres-adapter
node scripts/test-supabase-rls.mjs
```

`node scripts/verify-cloud-deploy.mjs` debe terminar con error mientras las brechas de Vercel/Storage sigan abiertas. El build de Vercel ejecuta ese control automáticamente.

## Configuración futura

Copiar `.env.example` a un archivo local de entorno y completar únicamente con credenciales de las cuentas nuevas del proyecto. Nunca reutilizar las conexiones actuales de Vercel o Supabase.

Las migraciones locales están en `local-db/migrations`; las migraciones destinadas al futuro Supabase están en `supabase/migrations`. El seed curricular es solo de desarrollo y debe reemplazarse por contenido oficial validado antes de cualquier piloto.

Para generar un paquete de datos local transferible:

```bash
npm run db:export
```

## Documentación

- `docs/PROJECT_MEMORY.md`: estado, próximos pasos y riesgos.
- `docs/DECISIONS.md`: decisiones arquitectónicas.
- `docs/DATA_MODEL.md`: modelo de datos.
- `docs/AI_PROMPTS.md`: contratos previstos para IA.
- `docs/ERRORS_AND_FIXES.md`: memoria de errores.
- `docs/RELEASE_CHECKLIST.md`: controles antes de publicar.
- `docs/VERCEL_SUPABASE_READINESS.md`: brechas y prueba de equivalencia con local.
- `docs/LOCAL_DATABASE.md`: operación local y futura migración a Supabase.
