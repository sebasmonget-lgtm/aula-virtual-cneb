# Ilustraciones pequeñas y selección por competencias — 2026-10-03

## Cambio y alcance

La docente aprobó el estilo infantil cálido de la referencia de niños y pidió dibujos más pequeños y simples, incluyendo plantas, mascotas, objetos y situaciones. Se cierra la biblioteca en 63 temas, conservando los 50 IDs iniciales y agregando identidad, movimiento, narración, lectura, escritura, expresión artística, compartir, planificación del juego, solidaridad, baile, Navidad, indagación y tecnología.

Los archivos usados por Mi año son WebP transparentes de 160 × 160 px, hasta 6144 bytes cada uno: total 357066 bytes, máximo 6136 bytes. Son ilustraciones raster, no vectores. Plantas y objetos no tienen rostro; personas y animales son personajes ficticios. La galería pública está en `/project-illustrations/catalog.html`; el índice y cada imagen tienen JSON con temas, competencias, dimensiones, peso y SHA-256. Los SVG anteriores se conservan en su ruta histórica.

La generación usó la herramienta de imágenes integrada y referencias de estilo, sin fotos de menores. Los PNG maestros quedan fuera del repositorio y del deployment. `assets/project-illustrations/spec.json` conserva el prompt elegido; el optimizador reduce tamaño y calidad con un límite obligatorio. Dos composiciones demasiado densas se simplificaron y regeneraron antes de aceptarlas. El generador de metadatos y su modo `--check` verifican los artefactos guardados; no implican reproducción determinista de la generación IA.

## Selección

La selección local prioriza el tema del título y usa propósito, situación, invitación y acciones como contexto. Las frases deben coincidir completas; se normalizan acentos y plurales. Los verbos y términos genéricos del aula no convierten cualquier imagen en pertinente. No se usan materiales ni observaciones originales.

Los metadatos decorativos referencian los 14 IDs disponibles de inicial en el paquete curricular 4.1.0. Una competencia principal aporta 6 puntos y una oportunidad curricular 3; el rol de alternativa curricular aporta 4. Estas señales resuelven coincidencias de contexto y empates del título. Una imagen elegible solo por competencia se usa cuando no hay un tema textual pertinente. IDs desconocidos no influyen y el fallback final es una bombilla neutral. Un `pictogram_id` explícito solo se acepta si pertenece al catálogo.

Ejemplos cubiertos: «Nuestros cuentos» con comunicación oral elige narración y con lectura elige pistas de lectura; «Agua» conserva gota aunque incluya escritura; «Colecta de Navidad» con convivencia elige solidaridad. Estas asociaciones no son imágenes oficiales del CNEB ni evaluaciones y no agregan o cambian competencias del proyecto. Word/Jev conserva su biblioteca y comportamiento.

La línea de tiempo muestra dibujos de 64 px y algo más de alto para el título. Fechas guardadas, proyectos, gestión, feriados, lista secundaria, acciones, contratos, permisos y arquitectura se mantienen. No hay migraciones ni escrituras al abrir Mi año.

## Validación ejecutada

- 28/28 pruebas focales: catálogo, selección, Word/Jev y línea de tiempo.
- `npx tsc --noEmit`, lint sin warnings, build Vinext y `next build --webpack`: PASS.
- Checks de los 63 WebP/JSON y de los 50 SVG históricos: PASS; hashes, transparencia, dimensiones y límites de peso comprobados.
- Dos rondas de navegador local en escritorio y móvil: galería con 63 imágenes, doce proyectos con temas diferenciados, selección y detalle, scroll horizontal, vista lista y regreso al mapa. Sin desbordamiento horizontal de página.
- QA sobre una copia local ficticia aislada: hash del plan conservado y cero llamadas al proveedor pedagógico al abrir/consultar el mapa. Las llamadas de generación de ilustraciones son una operación separada.

No se declara QA autenticado de un aula real ni pruebas físicas de dispositivos. La selección sigue siendo por metadatos y vocabulario local, sin una consulta semántica IA nueva.

## Publicación y reversión

Solo staging QA está autorizado. Antes de publicar: fetch del remoto, commit identificable, árbol limpio y pruebas anteriores. El preview debe verificar SHA, assets/JSON completos, cliente y guards de API antes de reasignar el alias QA. Se comprueba que producción conserve su deployment anterior.

Rollback de presentación: devolver `ayni-aula-staging-qa-v2-ayni4.vercel.app` al preview `ayni-aula-staging-835yhnn54-ayni4.vercel.app` del commit `60f40a35f23d4e3e5db9955fca18d05166b4bbb0`. No requiere cambios ni eliminación de datos.
