# Lista compacta de observaciones — 13/10/2026

Solicitud: reproducir filas del mockup con imagen simple y color por competencia. Base local `493ae01` (producto publicado `fb96be1`), árbol inicialmente limpio; `git fetch origin` comprobó que no hay commits remotos nuevos omitidos. Se conserva el flujo de captura/guardado de la entrega anterior.

## Cambios

- Filas compactas con foto/nombre/fecha, tipo y momento observados con iconos, texto original, competencias y acciones. Libre, guiada e historial previo comparten el mismo renderer. Edición y retirada mantienen servicios y guardas existentes; no se borran datos.
- Selector «Más recientes primero» / «Más antiguas primero». Fechas ausentes o inválidas siempre al final, con desempate estable por ID. Orden en memoria; no se almacenan textos ni datos de niños en el navegador.
- 14 nuevas imágenes simples SVG en `public/competencies/compact/`, generadas por `scripts/build-compact-competencies.mjs` a partir del conjunto vectorial Lucide existente. Variante hermana: imágenes antiguas y sus consumidores conservados. No se recurrió a generación raster IA, al ser una extensión de iconos SVG editables. Pesan 5.201 bytes en conjunto; máximo 546 bytes por imagen.
- Paleta por ID estable en `src/lib/competency-visuals.mjs`: mismo color de símbolo/texto y fondo suave para cada competencia. 14 pares distintos; contraste calculado de todos los pares >=4,5:1. Color acompaña imagen y etiqueta, nunca nivel de logro. Dos competencias conservan ambas imágenes/etiquetas. Sin competencia confirmada y sugerencias de Ayni continúan explícitas.
- Texto largo: vista breve de dos líneas y «Ver texto completo» / «Ver menos»; texto original disponible sin editar. Evidencia privada conserva su enlace. En móvil identidad/acciones arriba, texto y competencias abajo; botones >=44 px.

## Validación

- `npx tsc --noEmit`, PASS.
- Lint focal y global de fuente (`npm run lint -- --ignore-pattern .local --ignore-pattern .sites-runtime --ignore-pattern .wrangler`), PASS.
- `npx next build --webpack`, PASS.
- Nueve pruebas de presentación/paleta/orden/catálogo y 18 pruebas de servicios existentes (initial-journey/guided-observation-flow), 27 PASS. Cobertura/IDs oficiales, privacidad, autorización, idempotencia y versionado conservados. Imágenes comprobadas por tamaño/ID/contraste.
- Detector Impeccable en renderer/lista/CSS: cero hallazgos.
- Navegador local aislado, componentes actuales + backend real/PGlite nuevo: cuatro observaciones ficticias, orden descendente/ascendente comprobado por UI, imágenes cargadas, editar texto largo y añadir segunda competencia guardado en una revisión, expansión/contracción, menú de acciones/solicitud de eliminación/cancelación sin petición DELETE, PASS. Recibo independiente confirma cuatro registros, texto versionado y ambos IDs guardados. Sin llamadas IA reales ni escrituras cloud.
- Escritorio 1366 y móvil 390 sin desbordamiento horizontal; imágenes correctas y filas adaptadas. Revisados hooks, estado por registro, claves, acciones accesibles, foco y ausencia de nuevas dependencias.

Artefactos ignorados `.local/observation-list-20261013/`: capturas `list-desktop.png`, `list-mobile.png`, `list-preview.png`, HTTP/recibo funcional y base aislada. Arnés Vite usa sustituto HTML de next/image solo para inspección; build de producto usa Next real. No se prueba aquí cámara/dictado físico ni sesión cloud. Sin publicación automática de esta solicitud.

## Rollback

Revertir el commit de lista restaura renderer, orden descendente y chips anteriores; no cambia tablas, RLS, archivos privados ni formatos guardados. Imágenes compactas nuevas son aditivas y eliminables al revertir. Paleta reutilizable disponible para posteriores pantallas; su adopción global queda fuera de esta modificación de lista.
