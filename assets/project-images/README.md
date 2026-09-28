# Biblioteca visual Ayni — primera colección

La colección contiene 61 escenas horizontales para Educación Inicial. Cada escena aprobada tiene un PNG maestro en `masters/`, un JPEG optimizado en su categoría y un JSON homónimo. `index.json` reúne los metadatos que lee `src/lib/image-library.mjs`. Las ocho referencias de personajes y sus nombres están en `characters.json` y `characters/`.

## Uso

`selectProjectImage({ title, purpose, situation, competencies, concepts, context }, { usedIds })` devuelve `{ id, path, score }` o `null`. La ruta se interpreta desde la raíz del repositorio. `usedIds` penaliza las escenas ya usadas dentro del mismo documento. El selector no llama a IA ni genera imágenes; las exportaciones Word pueden consumirlo cuando incorporen ilustraciones. En esta primera etapa todavía no se inserta automáticamente ninguna escena en Word.

## Agregar una escena

1. Añadir una fila única a `catalog-prioritized.tsv` con personaje, acción y etiquetas concretas.
2. Generar la escena con `visual-style-prompt.md` y los PNG de `characters/` como referencias. Revisar identidad, acción, anatomía, texto accidental y pertinencia cultural.
3. Guardar el PNG aprobado como `masters/<id>.png` y ejecutar `node scripts/finalize-image-library.mjs`. El script crea JPEG calidad 88 y JSON individual para escenas nuevas.
4. Ejecutar `npm run build:image-library-index`, `npm run check:image-library` y `npm run test:image-library`. Añadir una prueba de búsqueda si el tema introduce vocabulario nuevo.

`image.schema.json` documenta el contrato y `src/lib/image-library-schema.mjs` lo valida en ejecución. No debe editarse `index.json` a mano. Si una escena aprobada debe corregirse, conservar el original generado, revisar la nueva versión, sustituir master y JPEG juntos y reconstruir el índice si cambia el JSON.

## Permisos y reversión

La biblioteca contiene solo recursos estáticos; no lee evidencias de estudiantes ni escribe datos pedagógicos. El selector se ejecuta localmente sobre el índice incluido en el proyecto. Para retirar la colección de una versión, revertir estos archivos y las llamadas futuras al selector; no hay migración de base de datos. Los PNG originales de los seis personajes permanecen en la carpeta personal `C:\Users\ASUS\Documents\plantillas ayni\personajes_ayni`, ahora con nombres legibles; allí también se añadieron Clara y Diego.
