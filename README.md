# Ayni Aula

Asistente de planificación, organización y seguimiento pedagógico para docentes de Educación Inicial, alineado al CNEB.

## Estado

La entrega inicial implementa el shell responsive y el primer flujo vertical de registro rápido de evidencia. Los datos persisten en PostgreSQL local embebido; no existe conexión con Vercel, Supabase ni OpenAI.

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
```

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
- `docs/LOCAL_DATABASE.md`: operación local y futura migración a Supabase.
