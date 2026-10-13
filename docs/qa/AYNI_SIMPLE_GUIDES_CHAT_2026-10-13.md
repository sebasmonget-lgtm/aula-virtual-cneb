# QA: guías simples, tabla y chat — 2026-10-13

Base: `codex/observaciones-inicial-qa`, `add155a`, fuente publicada `c98d739`. Fetch confirmó 0 commits de diferencia con origin.

## Funcional local

Harness aislado `.local/guide-chat-20261013/`, backend PGlite y 35 niños ficticios con nombres largos, sin escrituras cloud. Guardado guiado para alumno 35 mediante búsqueda; persiste y pasa a «1 registro». Captura desde celda reutiliza formulario compacto, conserva competencia y persiste; guiada de esa competencia muestra «1 registro». Otra competencia del mismo niño sigue «Sin registro». Ranking actualizado cambia prioridad sin saltar experiencia elegida. Prueba adicional de empate: se prioriza media de 2 frente a 5 registros por niño/competencia, sin favorecer experiencias de más competencias. Último momento permite otra experiencia y vuelve al momento 1.

Grilla de 3 columnas escritorio y 2 móvil, 250 px con scroll vertical: 35 opciones sin desbordamiento horizontal del diálogo en 1366/390 px. Tabla con scroll interno y cabecera fija. Captura → tabla → chat se probó por controles reales, sin síntesis ni introducción intermedia. Sin proveedor IA local se comprobó error recuperable del chat; inicio/respuestas/contexto exitosos se prueban con proveedores controlados en `initial-journey.test.mjs`. No afirmar generación IA real ni año nuevo cloud a partir de estas pruebas. Capturas locales `guided-desktop.png`, `mobile-selector.png`; stub next/image solo en harness.

## Pruebas

- `diagnostic-ui-flow`, `annual-context-draft`, `annual-journey-recovery`: 19 PASS.
- `initial-journey`, `guided-observation-flow`: 18 PASS, permisos/CAS/recuperación/fotos privadas y cero IA en persistencia/contexto.
- `annual-personalization-service`, `diagnostic-experiences-v4`: 12 PASS, incluida exclusión de información insuficiente.
- Typecheck PASS (`npx tsc --noEmit`), lint PASS sin advertencias (`npm run lint -- --ignore-pattern .local`) y build Next webpack PASS con código de salida 0. Recibo final después de verificar build exacto.

## Publicación

Pendiente de SHA, staging Production sin alias, smoke, promoción y verificación final. Rollback antes de publicar. Sin migraciones, variables cloud, roles ni cambios de main.
