# Bloques guiados con fondos compartidos — 13/10/2026

Solicitud complementaria a la lista compacta: seguir los mockups de Qué hacer/Qué observar/Por ejemplo y criterio con recuadro interior. Base actual `2f2b9e4`, árbol inicialmente limpio, fetch de origin sin commits nuevos omitidos. La lista compacta previa se conserva.

## Resultado

Qué hacer conserva azul con nube; Qué observar verde con plantas; Por ejemplo ámbar con cono. Tres fondos genéricos compartidos por todas las experiencias y momentos, sin modificar instrucciones/criterios/ejemplos/IDs. CSS usa el mismo recurso en cada bloque y reserva espacio a la derecha en escritorio y debajo en móvil; imágenes decorativas fuera del árbol accesible, no obstaculizan texto ni controles. Las ilustraciones específicas de cabecera aprobadas antes continúan por experiencia.

Criterio mantiene fondo violeta, texto oficial y acción existente. Dentro, recuadro casi blanco con lupa, «Qué debes mirar en este momento:» resaltado y explicación concreta desde ejemplos existentes. Ilustración infantil genérica `project-illustrations/boy.webp` reutilizada para todos, con alt vacío. Banda azul de competencia y botón Registrar observación conservados. No lógica de guardado, estado, autorización o calendario nueva.

## Imágenes generadas

Generadas con herramienta integrada `imagegen`, cada una en una petición independiente y fondo transparente. Originales conservados fuera del repo en CODEX_HOME. Se recorta espacio transparente y reduce a 280px de ancho mediante Sharp; WebP 80%, alfa preservado. Archivos finales:

| Recurso | Peso | Dimensiones |
| --- | ---: | --- |
| `public/guided-panels/cloud.webp` | 6.248 bytes | 280×115 |
| `public/guided-panels/plants.webp` | 7.768 bytes | 280×133 |
| `public/guided-panels/cone.webp` | 7.562 bytes | 280×133 |

Total 21.578 bytes, sin imágenes personalizadas por experiencia y sin generar en tiempo de uso. La ilustración infantil del criterio ya existía.

Prompts de generación (peticiones originales, formato de uso):

1. Cloud: “A tiny decorative corner illustration for a preschool teacher app: one rounded powder-blue cloud resting above two very low pale blue soft hills, three tiny sky-blue motion dashes. Flat clean children's book digital illustration, simple softly rounded shapes, no outlines, no text, no people, no objects other than cloud and low hills, no full sky. Wide low horizontal composition with all artwork grouped at bottom right, isolated on a truly transparent background. Pastel blue palette. Used at 140px wide as background detail behind a blue instructional panel. Quiet decoration, not an icon badge.”
2. Plants: “A tiny decorative corner illustration for a preschool teacher app: two small mint-green leafy sprouts on the right, one low pale mint rounded grassy hill on the left, three tiny mint motion dashes. Flat clean children's book digital illustration, simple softly rounded organic shapes, no outlines, no text, no people, no pot. Wide low horizontal composition with artwork grouped at bottom right, isolated on a truly transparent background. Very light pastel green palette. Used at 140px wide as background detail behind a green instructional panel. Quiet decoration, not an icon badge.”
3. Cone: “A tiny decorative corner illustration for a preschool teacher app: a single friendly small orange traffic cone with two pale yellow stripes on a low rounded orange base, two very low pale butter-yellow hills, three tiny golden motion dashes. Flat clean children's book digital illustration, simple softly rounded shapes, no outlines, no text, no people. Wide low horizontal composition with artwork grouped at bottom right, isolated on a truly transparent background. Pastel orange and light yellow palette. Used at 140px wide as background detail behind an example panel. Quiet decoration, not an icon badge.”

## Validación ejecutada

Typecheck (`npx tsc --noEmit`), lint focal y global de fuente excluyendo `.local`, `.sites-runtime`, `.wrangler`, build Next webpack y diez pruebas de `diagnostic-ui-flow`/`guided-observation-flow` PASS; detector Impeccable sin hallazgos. Alpha y tamaño comprobados con Sharp. No tests nuevos para cambios decorativos.

Navegador local aislado con componentes actuales/backend real/PGlite: escritorio 1366 y móvil 390 sin desbordamiento, tres fondos visibles y recuadro interior legible. Cambio de momento conserva criterio/ejemplos correspondientes; Registrar observación abre el criterio elegido y Cerrar funciona sin escrituras. Cambio a Exploramos nuestro entorno reutiliza el mismo fondo cloud, no un asset nuevo. Sin escritura pedagógica local/cloud en esta ronda; aula ficticia separada. Arnés Vite usa imagen HTML para QA; build usa Next real. Capturas/procesado/baseline ignorados en `.local/guided-panels-20261013/`. Hardware/proveedor IA pedagógico/sesión cloud no probados. No publicación solicitada para estos últimos cambios.

## Rollback

Revertir este commit restaura bloques sin decoración y explicación sin recuadro. Assets nuevos aditivos; ningún dato guardado cambia y no hay migraciones, RLS, cuentas ni variables nuevas.
