# Mi año: vista compacta y persistencia — 13/10/2026

## Alcance y base

Petición del usuario sobre los dos mockups de Mi año y Detalle del proyecto, dentro del QA y publicación Production autorizados en esta conversación. Base c3df295, código Production bf78110. Rama codex/observaciones-inicial-qa, origen actualizado y árbol limpio al comenzar; no se usa main antiguo.

1. Año creado se abre al retroceder, avanzar o recargar; eliminar posibilidad de regeneración completa por navegación.
2. Separar 15 tramos por B1, B2, B3, B4 y Todo el año.
3. Colores/íconos de competencias y pictogramas livianos existentes.
4. Preparar proyecto, cambiar con Ayni y detalle como vista aparte.
5. Mostrar propósito/acciones/fechas/competencias y orientaciones esenciales; conservar detalles pedagógicos bajo desplegable y regreso claro a Mi año.

Sin migraciones, modificación de cuentas, modelos, claves, permisos o datos pedagógicos reales para probar. El cambio de versión activa mantiene la copia de revisión y los endpoints focales existentes. Revisar/confirmar mantiene la exigencia docente sobre interpretaciones. Navegar nunca llama al proveedor. Pasado sin registro sigue explícito y las fechas guardadas no se redistribuyen. Rollback al deployment previo conserva los planes; restauraría las antiguas opciones de regeneración, por lo que debe revisarse antes de abrir ese flujo.

## Verificación funcional

Harness aislado .local/year-overview-20261013, 35 alumnos ficticios, API real local, PGlite y proveedor controlado explícito: una llamada física, cero pagadas. Se creó V1 con calendario de 15 tramos y cuatro proyectos futuros; B1 contiene 3 tramos, B2–B4 contienen 4 cada uno. Navegar/recargar conserva plan/propuesta. Confirmar V1 y abrir Cambiar con Ayni crea V2 como copia de revisión del mismo año sin generación; confirmar y continuar abre el proyecto elegido. No se generaron actividades ni proyectos nuevos mediante IA. Esta prueba verifica integración/persistencia, no calidad de un modelo real.

46 pruebas focales PASS: annual-plan-display, annual-journey-recovery, annual-year-editor, annual-personalization-service, initial-journey y simple-project-flow. Incluye replay con revisión vieja sobre año completo, confirmación, job vencido, ruta legacy, permisos/recovery, estructura/cobertura y personalización.

Dos pasadas visuales acotadas, escritorio 1366 px y móvil 390 px. Filtros, lista/mapa, selección, detalle/regreso y preparación comprobados. Body móvil 375/375 px (ancho disponible y scroll), sin desbordamiento horizontal; carrusel contenido. Segunda pasada confirma regreso visible arriba al abrir el detalle. Capturas overview-desktop-final.png, overview-mobile-final.png, detail-desktop-final.png y detail-mobile-final.png conservadas en el harness privado ignorado.

Typecheck/lint/build finales y recibo cloud se añaden al cerrar publicación.

Validación final: npx tsc --noEmit PASS; npm run lint -- --ignore-pattern '.local/**' PASS, sin advertencias (se excluyen cachés/artefactos QA privados ignorados); node node_modules/next/dist/bin/next build --webpack PASS con Next 16.3.4, incluyendo TypeScript. Build adicional vinext PASS, pero la publicación usa Next conforme vercel.json.

## Recibo Production

Fuente 9a0920230350cd6b9050f35683a1f35d459e78c7, GitHub actualizado en codex/observaciones-inicial-qa. Árbol limpio durante staging y promoción. Proyecto prj_3GOhE5KykLKbhuULD5rAeXpfbEko, equipo ayni4, deployment dpl_H19YWzRdGjkgh8y72QAd1qBty7Mf, READY; https://ayni-aula-staging-8a8wfvf8y-ayni4.vercel.app. Doce smoke previos y doce finales PASS. Se promovió el mismo build tras comprobar SHA/proyecto y que Production anterior no había cambiado. Alias https://project-0w0pq.vercel.app verificado contra ese deployment.

QA autenticado de lectura en pestaña propia: abre V1 Borrador ya existente, id 17db5b4c-76a4-43e3-955c-a0b732f6b113, con 15 tramos/cuatro propuestas futuras y el contexto original. Detalle de El agua que corre muestra contenido real y Volver a Mi año; pasos 3 → 4 vuelven al mismo id/V1. Una espera de selector terminó antes de cargar la lectura; el estado posterior confirmó la vista correcta. No se atribuye esa espera a regeneración ni se declara carga instantánea. No se confirmó/copió/modificó el plan real ni se generó proyecto/actividad para probar. Capturas year-production.png y detail-production.png en harness privado. Pestaña original del usuario preservada, pestaña de entrega queda en Mi año.

Rollback identificado: dpl_72f81xAa6k6PVNMEWroBabNAfyo7 / bf781101587e018510467b5ad33d7c02e06b438b, https://ayni-aula-staging-ahi76o9zr-ayni4.vercel.app; conserva base de datos y planes porque no hay migraciones. La reversión restaura UI y guardas anteriores, incluida la posibilidad de regenerar, así que revisar ese flujo antes de usarla. Servidores locales cerrados y puertos 3341–3344 sin escucha; pestañas locales QA cerradas. Recibos/capturas ignorados; ningún secreto incluido en commits. La documentación del recibo se confirma después del SHA fuente, sin reconstruir código idéntico.
