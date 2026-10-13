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

Fuente publicada: `dc02a73714f25fe4c222cdcf038b32a56c5b6d46`, incluye `779af90`. Ambos commits en GitHub, rama `codex/observaciones-inicial-qa`. Árbol limpio al desplegar.

Production staged `--skip-domain`: `dpl_ErioWNTaEcdGfjZoZgjW3axcEpAs`, https://ayni-aula-staging-pubnx8j34-ayni4.vercel.app, READY y build cloud Next PASS. Proyecto/owner/SHA comprobados; 10 smoke PASS antes de promover. Ese mismo build se promovió a https://project-0w0pq.vercel.app; alias, proyecto, destino y SHA comprobados; 10 smoke posteriores PASS. Rutas públicas/recursos/health/auth config 200; endpoints de sesión, aula, entrevistas y POST de observación sin sesión 401.

QA autenticado por interfaz de producción en pestaña propia: selector ordenado con «Recomendada»/prioridades; diálogo de la competencia elegida muestra dos niños sin registro y uno con un registro; tabla «Resumen de observaciones» conduce directamente al chat, sin pantalla de síntesis ni fuentes crudas. Ayni respondió, sin error y con generación habilitada. No se pulsó generar, no se escribió respuesta docente ni observación en cloud. Captura de esa entrada: `.local/guide-chat-20261013/chat-live.png`. Pestañas del usuario sin cambios.

Rollback identificado: `dpl_AtjxWnr35ydnfKyANmLhpyxwSngA`, fuente `c98d739fa540f1d9a2d261da1683b277ded7b4e3`. Candidato inicial `779af90` compilado pero no promovido; producción se mantuvo en rollback hasta validar/promover `dc02a73`. Artefactos/recibos ignorados en `.local/guide-chat-20261013/`. Sin migraciones, variables cloud, roles ni cambios de main. Documentación confirmada después del SHA fuente publicado.
