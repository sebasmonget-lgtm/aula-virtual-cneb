# Diagnóstico y transferencia a Supabase

## Estado del diagnóstico

El flujo local precarga institución, docente, aula, edad, sección, año y estudiantes. La lista de competencias muestra cobertura de estudiantes con registros útiles. Al abrir una competencia se elige al estudiante y un referente de observación de la edad correspondiente. Cada marca usa uno de cuatro estados operativos: `observed`, `with_support`, `not_observed_yet` y `need_more_information`. Los dos últimos no se interpretan como incapacidad ni resultado negativo. La nota y el archivo multimedia son opcionales; actualmente se guarda sin archivos.

El catálogo incluido es **solo ilustrativo**: su desempeño tiene `source_ref = seed-local-no-oficial`. La interfaz lo señala y el preparador bloquea un paquete de producción. Antes de publicar, el equipo pedagógico debe cargar los textos oficiales, vincular y revisar cada referente, y probar 3/4/5 años. Ningún referente se genera con IA en cada uso.

El catálogo semántico de Jev no sustituye esa revisión: sus resúmenes son ayuda para selección y permanecen `pending` hasta que cada texto oficial, página y hash se contraste contra los PDF de MINEDU.

Resultados muestra cobertura real; conclusiones no emite una valoración ni escribe en planificación. Audio, foto y video aún no están habilitados: faltan compresión, límites, acceso privado y borrado controlado. No se deben subir originales de menores ni activar buckets públicos.

## Preparar una importación

1. Con `npm run db:local` encendido, ejecutar `npm run db:export`. El JSON queda en `.local/exports/` (ignorado por Git). No abrir el directorio PGlite desde otro proceso.
2. Ejecutar `npm run db:prepare-import -- RUTA_DEL_JSON`. Es un dry run sin conexión externa y muestra conteos y errores. Con el seed actual, debe bloquear producción por desempeño no oficial.
3. Solo para un staging nuevo con datos ficticios, generar paquete con `npm run db:prepare-import -- RUTA_DEL_JSON --generate --new-user-id UUID_NUEVO --include-demo`. El UUID debe existir previamente en `auth.users` de ese proyecto nuevo. `--include-demo` nunca es una validación curricular.
4. Revisar `.local/supabase-import/<id>/import.sql` y `manifest.json`; aplicar las tres migraciones en orden sobre un proyecto nuevo y vacío. Subir cada logo indicado en el manifiesto al bucket privado `institution-logos` con la ruta exacta antes de usarlo en la app.
5. Ejecutar SQL revisado de forma controlada, comparar conteos, probar Auth/RLS/Storage con dos docentes diferentes y realizar smoke test. Nunca usar la cuenta Supabase existente.

El preparador no abre conexiones Supabase ni guarda contraseñas. El SQL contiene nombres y observaciones locales: tratar el paquete como sensible, no subirlo a Git ni compartirlo públicamente. Ante un error SQL, la transacción hace rollback; conservar el JSON original para reintentar tras corregir el problema.
