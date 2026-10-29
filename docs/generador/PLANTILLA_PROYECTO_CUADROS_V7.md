# Proyecto con mayor separación y tablas · presentación 7

28/10/2026. La usuaria solicita aplicar al proyecto la mejora visual de las actividades, conservando su contenido y la estética aprobada de Ayni.

## Presentación

- Portada, Poppins, tamaños de letra, colores e ilustraciones conservados.
- Situación significativa a ancho completo, con separación entre párrafos; pregunta y propósito distinguidos visualmente.
- Planificación con los niños en dos filas: qué proponemos y qué podrán decidir.
- Ruta con tres columnas: día/fecha, actividad y qué harán los niños; títulos resaltados, fechas completas y encabezado repetido si continúa la tabla.
- Criterios y evidencias por edad con mayor espacio; se intenta mantener junta cada competencia cuando el bloque es breve, conservando filas completas y encabezados repetidos para otros tamaños.
- Enfoques, materiales/organización y acompañamiento por edad en tablas con márgenes internos y tonos suaves.

No se añaden contenidos pedagógicos, registros ficticios ni llamadas de IA. El registro nominal de observaciones continúa en cada actividad, presentación 6.

## Muestra y fidelidad

`output/generador-documentos/plantilla-proyecto-v7/P11 - Construimos un lugar para jugar y cuidarlo - Plantilla mejorada.docx` usa una copia del P11 real, sin regenerarlo. Conserva sus catorce actividades, cuatro competencias, todos los criterios/evidencias, situación, materiales, apoyos y enfoques.

Comparación de las palabras del Word original y de la muestra: ninguna desaparece. Solo se añaden etiquetas de navegación de la nueva tabla. Fuente JSON sin cambios, `styles.xml` idéntico y recursos gráficos originales idénticos. Los textos y el orden de las catorce filas se compararon directamente con `dailyRoute`.

Ocho páginas en esta muestra, frente a siete en el formato compacto. Se inspeccionaron las ocho imágenes finales ampliadas: sin palabras fuera de página, fechas partidas ni filas de actividad cortadas. La última hoja contiene materiales, organización y apoyos completos. La cantidad de páginas depende del contenido, no es una exigencia del MINEDU.

Evidencia: `content-fidelity.json`, `quality-checks.json`, `render-audit.json` y contacto en la carpeta de muestra. PNG/PDF son QA interna; el entregable es el Word.

## Implementación y compatibilidad

`projectCardsWordBody` es una ruta de presentación exclusiva del proyecto. El maestro nuevo que antes recibiría presentación 4 guarda ahora 7; las actividades siguen recibiendo 6 con su nómina congelada. No cambia la versión del prompt, el contrato pedagógico ni la IA.

El lector reconoce 7 y el renderizador la aplica solo a su exportación práctica. Las versiones históricas mantienen su ruta, incluido el proyecto guardado por la usuaria. No se migran datos ni se altera el Ayni original.

Para rollback, volver a emitir 4 en proyectos futuros, manteniendo lector/renderizador 7 para los que ya existan. No quitar la marca de una fuente creada ni sustituir el almacén por una base QA.

## Pruebas y activación

45 pruebas PASS en siete archivos, incluyendo confirmación de proyecto 7 con primer día/lotes 6, Word práctico con todas las filas y criterios, versiones previas, nómina e idempotencia. Typecheck/build PASS. Lint sin errores y con el aviso React preexistente en `diagnostic-generation-control.tsx:28`.

Logs `.local/project-cards-v7-delivery-{tests,typecheck,lint,build}.log`. La primera corrida local falló por falta de espacio; los resultados finales anteriores corresponden a la repetición completa después de recuperarlo.

Activación solo local, launcher 27744, respaldo `.local/backups/project-cards-v7-before-activation/store`. Web 5185 HTTP 200 y API 8805 operativa. Comparación antes/después: workspace/planes, dieciséis ámbitos de chat y 75 cuerpos Word idénticos; cuatro alumnos y 36 turnos conservados. Recibo `.local/project-cards-v7-activation-preservation.json`. Cero IA y cero documentos docentes reescritos.

## Incidencia de entorno

El disco C quedó con menos de 3 MB, llegó a cero y bloqueó temporales del renderizador y un fixture PGlite (`ErrnoError 51`). El OOXML era válido; el mismo documento se renderizó después de recuperar espacio. No se cambió la lógica de generación para ocultar este fallo.

La revisión automática bloqueó un borrado recursivo de cachés. Se descartó esa acción. Se comprimieron de forma transparente mediante NTFS respaldos de esta variante y 22 bases `test-checkpoint-*` identificadas en el código como pruebas cerradas; no se comprimió el almacén activo. Solo se eliminó un PNG regenerable de QA anterior (`.local/activity-cards-v5-render/0ce994182b86/page-2.png`), no un Word entregado. Los documentos originales y el contenido de los respaldos se conservaron. Espacio final comprobado: aproximadamente 1,2 GB.

Prevención: comprobar espacio disponible antes de nuevas rondas extensas de renderizado/pruebas y conservar los resultados finales diferenciados de intentos fallidos. La compresión no sustituye una política futura de retención de QA.
