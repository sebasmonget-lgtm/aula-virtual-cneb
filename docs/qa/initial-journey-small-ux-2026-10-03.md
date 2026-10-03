# Ajustes pequeños del recorrido V2 — 2026-10-03

## Alcance

Sobre el remoto QA `41752e6`, solo presentación e interacción existente. Sin cambios de arquitectura, migraciones, permisos, proveedores ni datos de staging. Se conservan autosave, sugerencia explícita, confirmación docente al guardar y checkpoints persistidos.

- Familias: Anterior / Siguiente / Finalizar entrevista; Cancelar cambios queda condicionado a corregir una entrevista confirmada. Header opaco sobre el contenido y margen de scroll para campos enfocados.
- Observar: Cambiar / Agregar otra / Quitar con texto, misma selección de hasta dos competencias y guardado sin segunda confirmación.
- Matriz: blanco / amarillo tenue / teal sin cambios. Columna fija y nombres oficiales disponibles al pasar el mouse, tocar o activar el botón con teclado.
- Conversar: Con pocos registros; sin telemetría técnica visible. Estado ready muestra cierre, extracto literal de decisiones y Preparar mi año. Decisiones extensas siguen consultables completas.
- Recorrido único visible: 1 Familias, 2 Observar, 3 Revisar, 4 Conversar, 5 Preparando, 6 Mi año. Los enlaces existentes a Familias/Observar/Revisar conservan su comportamiento. El indicador antiguo de otras etapas deja de competir con esta numeración en V2.
- Revisar lo que conocemos / Alumnos × competencias. Preparando conserva sus checkpoints reales y su contenido.

## Verificación focal

51 tests PASS: family-interview-redesign, initial-journey, annual-journey, annual-personalization-service y diagnostic-sources-v4. Typecheck, lint, build Vinext y build Next webpack PASS.

Navegador local con aula ficticia aislada y proveedores simulados, escritorio 1440 × 1000 y móvil 390 × 844:

- Seis preguntas, autosave visible, Finalizar entrevista retorna a alumnos. Cancelar cambios ausente en entrevista confirmada de solo lectura y presente al corregir.
- Escribir → OK → sugerencia → agregar/quitar/ajustar → guardar: nota en lista y formulario limpio; sin nueva confirmación.
- Scroll horizontal móvil: encabezado y nombres permanecen en x=37,6 px, con scrollLeft pasando de 0 a 300,8 px. En escritorio ambos permanecen en x=338 px con scrollLeft=511,2 px.
- Nombres completos consultados en popover para identidad e indagación; Escape cierra. Campos de entrevista móvil permanecen debajo del header de 80 px; sin desbordamiento horizontal del documento.
- Respuesta docente → ready → cierre y resumen literal; búsqueda DOM de Luna/tokens/reintentos/costos/llamadas sin coincidencias en main. Preparación muestra checkpoints Listo/En curso/Pendiente desde el job real local, con proveedor simulado.

Capturas privadas: `.local/ux-small-*.jpg`. La comprobación de teclado/mouse no sustituye pruebas físicas de cámara o micrófono; no se modificaron esas funciones. No se hicieron llamadas de IA externas en esta pasada.

## Publicación y rollback

Publicar únicamente preview del proyecto staging aislado después de ambos builds, commit limpio y push remoto. Verificar READY, SHA del commit y target preview; smoke de rutas, assets y guards de sesión antes de asignar el alias QA. Producción debe conservar SHA `055c77efa63981a95e9b21e03e295e735b713cdf`.

Rollback por alias al preview previo `ayni-aula-staging-gl1nzp6h2-ayni4.vercel.app` o revert del commit. No hay cambios de datos que revertir.
