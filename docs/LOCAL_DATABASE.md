# Base de datos local

El proyecto usa PGlite para desarrollo local: PostgreSQL compilado a WebAssembly y persistido en `.local/pgdata`. No necesita Docker, una cuenta de Supabase ni conexión a internet después de instalar dependencias.

## Iniciar

```bash
npm run dev:local
```

Este comando inicia la app y la API de datos local. También pueden ejecutarse por separado:

```bash
npm run db:local
npm run dev
```

La API escucha únicamente en `127.0.0.1:8788` y acepta solicitudes de la app local en el puerto 5173. Los datos no salen del equipo.

## Migraciones

Las migraciones locales están en `local-db/migrations`. Se aplican automáticamente y en orden al iniciar. No se debe modificar una migración ya aplicada; se crea otra.

Las migraciones de producción permanecen en `supabase/migrations`. Ambas variantes comparten nombres de tablas, IDs y relaciones de dominio. Las diferencias son deliberadas: la versión Supabase incluye `auth.users`, RLS y Storage; la local usa un perfil de desarrollo aislado.

## Exportar para migrar

```bash
npm run db:export
```

Se crea un archivo JSON versionado en `.local/exports`. Contiene registros por tabla con UUID estables y puede importarse de forma controlada al Supabase nuevo después de aplicar sus migraciones. `.local` está ignorado por Git porque puede contener información pedagógica.

Antes de importar a un Supabase remoto se debe:

1. Crear una cuenta/proyecto nuevo.
2. Aplicar y probar las migraciones en staging.
3. Crear los usuarios reales y mapear el usuario local de desarrollo.
4. Ejecutar un dry run del importador y revisar conteos por tabla.
5. Validar RLS con dos docentes diferentes.

## Limitaciones

- PGlite reproduce SQL PostgreSQL, pero no reemplaza Auth, Storage ni RLS de Supabase.
- El perfil incluido es ficticio y solo sirve para desarrollo.
- El seed CNEB es abreviado y no es contenido oficial listo para producción.
