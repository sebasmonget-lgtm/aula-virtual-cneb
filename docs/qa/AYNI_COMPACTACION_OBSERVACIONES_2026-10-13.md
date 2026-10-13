# Compactación de observaciones — 2026-10-13

Base limpia y actualizada: `e01acc9`, rama `codex/observaciones-inicial-qa`; fetch y comparación con origin 0/0 antes de editar. Solo presentación de observación libre/guiada y sus selectores. Sin cambios de servicios, permisos, datos, migraciones o modelos.

## Cambios

Guiada mantiene ranking por proporción sin registro y después un registro por niño/competencia, sin favorecer experiencias con más competencias ni cambiar la elección docente. Selector ordenado y marca Recomendada; resumen breve para la experiencia recomendada. Retirados el párrafo «Puedes elegir cualquiera…», listado «Oportunidades en esta experiencia» y aclaración adicional. Qué hacer/Qué observar/Por ejemplo en tres columnas de escritorio; criterio y recuadro concreto junto a competencia/botón. Navegación de momentos y modal conservados.

Libre conserva identificación accesible del niño, fecha editable, momento, dictado, fotografía, apoyo, selección manual y sugerencia. Se retira cabecera duplicada grande; fecha/hora dentro de la franja de momento. Texto más bajo, foto/apoyo en paralelo, competencias a todo el ancho en cinco columnas de escritorio (tres a tamaño intermedio, dos en móvil). Nombres completos preservados, con scroll del selector; imágenes genéricas existentes. Otras pantallas/formularios mantienen su variante sin compactar.

## Validación ejecutada

- Typecheck `npx tsc --noEmit`, lint `npm run lint -- --ignore-pattern .local`, build Next webpack: PASS finales.
- `node --test src/lib/diagnostic-ui-flow.test.mjs`: ocho PASS (ranking sin registros/pocos, exclusión de retirados/sugerencias sin confirmar y alumnos ajenos, criterio/ejemplos/IDs intactos).
- Navegador con UI real y API/PGlite aislados: dos registros ficticios manuales, primero con dos competencias y apoyo No; tercera competencia deshabilitada. Confirmación/limpieza y nueva captura inmediata PASS. Segundo registro con fecha editada 12/10/2026 recuperado en lista; el primero ficticio quedó 13/10 al detectar el evento faltante durante implementación.
- Tras guardar, ranking cambia a Nos movemos y creamos; selección anterior permanece hasta elección docente. Cambio de experiencia, siguiente/anterior momento y apertura/cierre por teclado del modal PASS. No se guardó registro guiado en esta prueba.
- Escritorio iframe 1366px, móvil iframe 390px (375px de contenido por scrollbar), sin overflow horizontal. Revisión de textos largos y recuadro interno. Filas del selector ajustadas a altura intrínseca para evitar texto sobrepuesto. Capturas/recibos ignorados `.local/compact-observations-20261013/`.
- Cámara/micrófono físicos, IA real, nueva fotografía y nube no probados: controles existentes conservados. Sin escrituras pedagógicas remotas ni publicación Vercel en esta solicitud.

## Rollback

Revertir el commit de presentación; los registros y sus IDs/fechas/competencias siguen usando el mismo contrato. No revertir datos ni migraciones.
