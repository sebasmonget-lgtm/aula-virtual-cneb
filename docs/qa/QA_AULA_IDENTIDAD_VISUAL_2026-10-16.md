# Ayni · Continuidad visual de Mi aula y diagnóstico

Fecha: 16 de octubre de 2026. Base remota: `a53e65390f9b64f4c5136b5880692c5fa73c915b`.
Rama: `codex/classroom-warm-surfaces-20261016`.

## Alcance

La profesora aprobó las interfaces de Evaluar, Informes y Consolidado y pidió aplicar esa misma identidad a las vistas que todavía resultaban formales. Se revisaron las superficies actuales y se delimitaron cinco vistas: Mi aula, perfil del niño, trayectoria por bimestre, datos del colegio y aula y resumen de observaciones diagnósticas.

- Mi aula reutiliza `PageIntro`, ilustración existente y conteos canónicos. Se mantienen búsqueda, filtros, matrícula y recuperación de niños.
- Perfil presenta nombre, aula, edad, año y controles de foto en un encabezado adaptable. Conserva todas las pestañas y recomendaciones.
- Trayectoria diferencia visualmente diagnóstico y bimestres mediante superficies suaves e iconos. Las fuentes permanecen desplegables, con su texto original y valoración docente.
- Datos del colegio conserva campos, guardado y logo. La agrupación visual y la ilustración no modifican el formulario ni sus validaciones.
- El resumen diagnóstico vigente es `ObservationCoverageMatrix`: mantiene competencias, pictogramas, cantidades, consulta de fuentes, registro y desplazamiento. Solo cambian encabezado, leyenda, foco y superficies.

Se usa un módulo CSS limitado a estas vistas. No se modifican Mi año, Hoy, Calendario, Documentos, Evaluar, Informes ni Consolidado; tampoco el resumen diagnóstico de compatibilidad ni el motor diagnóstico anterior. Entrevistas y captura guiada ya tienen presentación visual propia y se conservan.

## Verificación funcional y visual ejecutada

Entorno local con base ficticia persistida, docente Elena Prueba y 20 niños. Frontend real servido por el harness de QA, backend local y llamadas pagadas deshabilitadas (`mode=deny`). Sin escrituras pedagógicas cloud.

| Comprobación | Resultado |
|---|---|
| Mi aula, datos canónicos | 20 niños, 5 con evidencias de actividad, 15 por observar |
| Filtro «Con evidencias» | 5 tarjetas |
| Búsqueda «Camila» | 1 tarjeta; al limpiar vuelve la lista |
| Añadir niño | Abre/cierra el formulario; guardar permanece deshabilitado sin nombre/apellido |
| Perfil y pestañas | Camila abre; Resumen y Trayectoria cambian correctamente; regreso a la lista |
| Trayectoria y fuentes | B1–B4 visibles; fuente de convivencia abre con texto original y fecha 30/3/2026 |
| Colegio y aula | Siete campos de texto y controles de logo siguen accesibles, con valores guardados; no se envió el formulario |
| Matriz diagnóstica | Consulta de una celda de Camila y «Ver registros (1)» muestra la evidencia original |
| Adaptación móvil | Mi aula, perfil, colegio y matriz sin desbordamiento horizontal del documento a 390 px |
| Matriz móvil | Tabla ancha dentro de su región desplazable (315 px), con nombres fijos y competencias disponibles |
| Capturas | Escritorio 1366 × 1000 y celular 390 × 844; solo datos ficticios |

Evidencia: [Mi aula](evidence/aula-ux-20261016/mi-aula-desktop.png), [perfil](evidence/aula-ux-20261016/perfil-desktop.png), [trayectoria completa](evidence/aula-ux-20261016/trayectoria-desktop.png), [colegio](evidence/aula-ux-20261016/colegio-desktop.png), [resumen de observaciones](evidence/aula-ux-20261016/observaciones-desktop.png). Las versiones móviles están en la misma carpeta.

## Pruebas

35 pruebas PASS, 0 FAIL, en:

```
node --test --test-concurrency=3 src/lib/workflow-ui-continuity.test.mjs src/lib/student-guidance.test.mjs src/lib/student-context-service.test.mjs src/lib/student-enrollment.test.mjs src/lib/diagnostic-ui-flow.test.mjs src/lib/diagnostic-review-progress.test.mjs
```

También PASS: `npx tsc --noEmit`, `npm run lint -- --ignore-pattern .local`, `npm run build` y `npx next build --webpack`. Detector de diseño de los cinco archivos finales: sin hallazgos. El build Vinext mantiene advertencias conocidas de dependencia PGlite y tamaño de chunks; el build Next completa compilación y TypeScript.

## Integridad, límites y publicación

Solo se cambiaron presentación e importaciones de UI. No hay cambios de servicios, endpoints, modelos, prompts, esquema, permisos, evidencias, valoraciones, documentos, cierres ni reglas pedagógicas. Costo adicional de IA: 0 USD.

Este QA es focal de interfaz, no una nueva certificación del recorrido anual, Auth/RLS cloud, cámara, dictado ni descargas. Los límites de la auditoría anterior continúan vigentes. Los avisos del reloj en las capturas pertenecen exclusivamente al harness local. La advertencia React sobre `unoptimized`/`preload` proviene de su sustituto de `next/image`, no del build de producto.

Publicación autorizada exclusivamente en Preview, con commit identificable, árbol limpio y smoke posterior. URL, SHA y comprobaciones del despliegue se entregan con el resultado; no se debe promover a Producción. Para rollback, volver al Preview anterior `https://ayni-aula-staging-dglslskdk-ayni4.vercel.app/` o revertir únicamente el commit de esta ronda. No requiere migraciones ni restaurar datos.
