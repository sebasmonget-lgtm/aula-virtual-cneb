# Recuperación del mapa anual en V2 — 2026-10-03

## Problema y cambio

La vista acordada de Mi año estaba conservada en `AnnualYearMap`: incorporada en bc9ee42, corregida en fb5b816 y con la última mejora visual en 904eb8d. El workspace V2 mostraba solamente tarjetas y no conectaba esa vista. El HEAD remoto QA previo a esta recuperación era f80e1a0; se verificó el remoto antes de modificarlo.

Se reutiliza la misma línea de tiempo marzo–diciembre como vista principal de V2, con proyectos seleccionables, bloques de gestión, acogida guardada y marcadores compactos de feriados. La lista completa de doce propuestas queda como alternativa; la selección map/list se conserva en la URL. Seleccionar un proyecto muestra su contenido y las acciones V2 existentes. Hablar con Ayni permanece debajo del mapa y del detalle.

Las fechas se leen de la propuesta V2 materializada y se contrastan con su calendario resuelto. No se ejecuta el planificador legacy al abrir el mapa. Los bloques de gestión proceden de `document_context.calendar` de la versión seleccionada. Los feriados se consultan mediante la ruta autorizada existente `/api/school-calendar`, como en ADR 106; son el calendario efectivo actual del mismo año escolar, no una nueva copia histórica. Si falla esa consulta se informa sin ocultar las propuestas; si faltan fechas o hay discrepancias se muestra la lista con un aviso, sin inventar ni regenerar fechas.

No cambian rutas, permisos, migraciones, contratos de generación, confirmación, protección docente, Word ni datos pedagógicos. La presentación temporal se comparte con el workspace anterior, que conserva sus controles y bandeja.

## Verificación

- 25 pruebas focales PASS: annual-year-map, annual-journey y annual-journey-recovery. Regresiones nuevas comprueban fechas guardadas sin calendario para recalcular, ausencia de mutación y rechazo de fechas ausentes, invertidas, superpuestas o discrepantes.
- Typecheck, lint, build Vinext y build Next/webpack PASS para esta entrega; resultados finales en el registro de herramientas de la tarea.
- Navegador local con base ficticia aislada y propuesta V2 ya guardada: mapa por defecto, selección y detalle, doce tarjetas en lista, persistencia de vista al recargar, popup de Semana Santa, Fiestas Patrias y marcadores de diciembre. Acceso a Cambiar con Ayni y retorno al año completo sin guardar indicaciones.
- Escritorio 1440×1000 y móvil 390×844: scroll horizontal local con barra visible, selección del último proyecto y sin overflow horizontal del documento. Dos rondas acotadas; se corrigió el marcador de Todos los Santos que antes se abreviaba incorrectamente como Semana Santa.
- Abrir y consultar la vista no hizo llamadas al proveedor: el harness conservó cinco llamadas simuladas anteriores, última a las 17:22:36 UTC. No se enviaron datos ni imágenes a IA.
- Capturas locales: `.local/year-map-v2-desktop-final.png` y `.local/year-map-v2-mobile-final.png`. Son datos ficticios; no equivalen a QA autenticado del aula real en Vercel.

## Publicación y rollback

Solo preview del proyecto aislado `ayni-aula-staging`, alias QA V2 existente. Publicar desde un commit identificable y working tree limpio, comprobar READY/preview/SHA y smoke de frontend/API/assets antes de asignar el alias. Producción debe permanecer en 055c77e. No se ejecutan migraciones ni limpieza de cuentas.

Rollback: devolver el alias al deployment preview previo f80e1a0 (`ayni-aula-staging-1rm32a15x-ayni4.vercel.app`), o revertir este commit de presentación. Los planes y documentos siguen usando el mismo contrato V2.
