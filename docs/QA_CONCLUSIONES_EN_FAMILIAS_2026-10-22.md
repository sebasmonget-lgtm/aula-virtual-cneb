# Conclusiones dentro de Informe a familias · 22 de octubre de 2026

Estado: implementado y probado localmente. Sin publicación ni escrituras en QA/producción.

## Cambio y conservación

La pantalla donde se confirman notas deja de mostrar el bloque de conclusiones. Informe a familias consulta de nuevo el overview del bimestre antes de ofrecer acciones y usa `family_readiness.pending_grades` del servidor. Con notas pendientes muestra el número y un retorno a completar notas; sin notas o sin comprobación disponible no permite preparar conclusiones.

Con notas completas aparece Preparar conclusiones, o Ver conclusiones si existe un lote persistido. Guardar las conclusiones habilita los informes según `family_readiness.ready`. Las conclusiones siguen consultables sobre los informes ya disponibles. Se elimina el enlace redundante hacia la misma pantalla. No se modifican servicios, RLS, migraciones, fuentes, notas, observaciones ni textos guardados. Preparar sigue siendo una acción docente explícita; los trabajos ya en cola conservan su mecanismo existente para retomarlos.

Se consideran las valoraciones pertinentes del bimestre según el servidor; no se crean obligaciones para todas las competencias del currículo sin evidencia. La compatibilidad de preparación anticipada de la API permanece; la interfaz actual ya no la ofrece.

## Validación ejecutada

- `npx tsc --noEmit`: PASS.
- `npm run lint`: cero errores, advertencia previa de dependencia compleja en diagnostic-generation-control.tsx:28.
- `npm run build`: PASS. Advertencias conocidas de eval en PGlite y tamaño de chunks.
- `node --test src/lib/period-evaluation.test.mjs src/lib/integrated-period-workflow.test.mjs`: 53/53 PASS. Incluye confirmación atómica, historial, bloqueo de informes con notas/conclusiones pendientes, lotes idempotentes y aislamiento de aulas/años.
- Detector Impeccable una vez sobre los cuatro componentes UI: `[]`.
- Navegador con PeriodEvaluation y sus componentes reales, API sintética local: pantalla de notas sin botón de conclusiones; una nota pendiente bloquea la preparación aunque existan conclusiones anteriores; retorno a notas y cambio simulado de la última nota del servidor se vuelve a consultar al entrar en informes; textos persistidos recuperados con cero escrituras automáticas.
- Caso sin lote: acción explícita prepara, edición docente y guardado habilitan informes; recarga recupera el texto editado sin nueva generación. Caso preparado: consulta existente sin informes antes de guardar. Caso guardado: informes disponibles, consulta de conclusiones y continuación al consolidado. Estados sin notas, sin readiness y bimestre cerrado conservan los bloqueos.
- Revisión visual en 1440×900 y 390×844: orden legible, botón completo en móvil, sin recortes observados. Se restableció el viewport al finalizar.

## Evidencia y límites

Capturas en `outputs/conclusiones-en-familias-20261022/desktop-notas-completas.png` y `movil-notas-completas.png`. Harness ignorado en `.local/conclusiones-en-familias-20261022`; escritura/recarga sintéticas aisladas en ese origen. No se llamó IA real, ni se guardaron conclusiones de personas reales, ni se descargó Word en este recorrido. Las pruebas de servicios usan una base aislada y proveedor simulado. No equivale a un nuevo smoke cloud.

Rollback: revertir los cambios de competency-period-review.tsx, period-evaluation.tsx y period-batch-panel.tsx y retirar period-family-flow.tsx. No requiere restaurar datos.
