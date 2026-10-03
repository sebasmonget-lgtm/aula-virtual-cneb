# Biblioteca de pictogramas para Mi año — 2026-10-03

## Cambio y alcance

Se toman el contorno verde suave, las formas simples, la maceta lavanda y los colores pastel de la referencia «Trazo suave» elegida por el usuario. Se dibujan 50 SVG originales, transparentes y sin rostros, mediante `scripts/build-project-pictograms.mjs`. No contienen fotografías, fuentes, recursos externos, scripts ni imágenes incrustadas. Los SVG suman 26.080 bytes; el mayor ocupa 1.043 bytes.

`public/project-pictograms/` contiene 50 SVG, 50 JSON individuales, `index.json` y una galería `catalog.html`. Cada registro tiene ID estable, ruta, título, descripción, categoría, conceptos, acciones, objetos, contextos, edades y tamaño. El generador permite reproducir la biblioteca; `npm run check:project-pictograms` comprueba que los archivos coinciden con su fuente.

Temas: bandera del Perú, agua, árbol, planta, semilla, flor; perro, gato, ave, pez, conejo, tortuga, mariposa, abeja, gallina y vaca; niño, niña, padres, familia, casa, escuela, comunidad y amistad; lápiz, acuarelas, libro, música, ideas, títeres, bloques, formas, números, medida, mercado, frutas, verduras, cocina, salud, manos, dientes, corazón, pelota, juegos al aire libre, auto, bus, reciclaje, Tierra, clima y espacio.

## Selección y presentación

La línea de tiempo compartida por Mi año V2 y el lector anterior usa `ProjectPictogram` en sus proyectos/unidades y en la bandeja de propuestas disponibles. La elección es local: prioriza el tema del título y usa propósito/situación como apoyo. Omite verbos genéricos, materiales y competencias para evitar que todas las propuestas parezcan de arte o exploración. Sin coincidencia se usa una bombilla neutral. Un `pictogram_id` conocido puede indicar una elección explícita; se ignoran IDs ajenos al catálogo. No se añade editor, escritura de esa propiedad ni selector manual.

Se comparte únicamente el algoritmo de puntuación con la biblioteca anterior del Word. Jev, su catálogo raster, la exportación y los contratos existentes permanecen. Esta tarea no llama a Jev ni sustituye sus imágenes del Word. El nuevo JSON aporta metadatos para futuras elecciones; no es idéntico al esquema raster del exportador.

El pictograma es decorativo: el botón conserva el nombre completo del proyecto, fechas, selección y navegación. Un fallo de carga conserva el texto y la acción. No cambian flujo, fechas, calendario, plan guardado, permisos, RLS, migraciones ni generación pedagógica. La biblioteca versionada se consulta al renderizar; el icono no queda congelado dentro del plan.

## Validación

- 26/26 pruebas focales: catálogo/seguridad/tamaño, selección de temas, fallback, allowlist, biblioteca del Word, Jev, exportación Word y mapa anual.
- Typecheck (`npx tsc --noEmit`), lint sin advertencias, build Vinext y build Next/webpack: PASS. Check reproducible del catálogo: PASS.
- Galería con los 50 SVG cargados en escritorio y móvil, sin desbordamiento de la página.
- Dos rondas acotadas de QA visual local: doce temas distintos en el mapa; selección de planta y auto, vista lista y retorno, scroll horizontal en móvil sin desbordamiento de la página.
- Fixture ficticio aislado: copia local de la base QA; solo se cambian títulos/propósitos de doce propuestas de la copia para probar los dibujos. Las fechas e IDs se conservan. La huella del plan antes/después de consultar mapa/lista y recargar coincide; cero llamadas al proveedor simulado. No se modifican datos reales de staging ni otras cuentas.
- Capturas: `.local/pictograms-gallery-desktop.png`, `.local/pictograms-gallery-mobile.png`, `.local/pictograms-map-desktop-final.png` y `.local/pictograms-map-mobile-final.png`.

La selección por palabras clave no equivale a una interpretación semántica de IA. Los títulos ambiguos pueden requerir ampliar vocabulario. El QA de una docente con su plan real queda para staging; no se afirma haberlo realizado.

## Publicación y reversión

Solo staging QA está autorizado. Publicar exige comprobaciones, commit identificable y árbol limpio; verificar preview, SHA, assets públicos y guards de sesión antes de mover el alias. Producción debe conservar `055c77efa63981a95e9b21e03e295e735b713cdf`.

Rollback: devolver el alias QA a `ayni-aula-staging-k9pqy4qhz-ayni4.vercel.app` (commit `1c8ed107f95d688e60e239f6ec2cce98f503ac2f`). Revertir la presentación/biblioteca recupera los iconos anteriores sin modificar planes o datos.
