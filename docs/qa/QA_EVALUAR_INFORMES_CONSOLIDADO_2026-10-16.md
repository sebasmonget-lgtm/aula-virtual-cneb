# UX de Evaluación, Informes y Consolidado — 16 de octubre de 2026

Base: `4b9a6475b22839342cff5b7123f75a7223b7d280`. Rama: `codex/evaluation-family-ux-20261016`.

## Cambio delimitado

Se consultaron los estilos de Mi año como referencia. No se modificó Mi año, su editor, ni otro módulo de producto fuera de las interfaces de evaluación. Tampoco se modificaron endpoints, permisos, modelos, prompts, proveedores, persistencia, documentos, reglas de valoración o cierres.

- **Evaluación:** lista lateral existente más compacta, búsqueda y filtros conservados; anterior/siguiente alumno desde el encabezado, foto privada ampliable y un único bloque de análisis editable. Nombre y acciones permanecen cerca durante el desplazamiento. La decisión AD/A/B/C sigue siendo docente, sin selección inicial automática. Confirmar y siguiente conserva el guardado y la progresión existentes.
- **Informe a familias:** revisión de un alumno a la vez, lista buscable y filtros de pendientes, guardados y «Conviene revisar». Conclusiones canónicas y recomendaciones en bloques diferenciados; introducción, recomendaciones, cierre y acuerdos mantienen sus campos editables existentes cuando corresponde. Editar nueva versión, regeneración individual, recuperación de trabajos y guardado del conjunto usan los mismos handlers y payloads. Descargar Word permanece disponible para el informe guardado. Cambiar de alumno conserva todas las ediciones locales y el enlace directo; los informes de alumnos fuera de la matrícula activa continúan accesibles desde el lote recibido.
- **Consolidado:** conserva resúmenes y filtros reales, Excel y conclusiones opcionales. Encabezados breves con nombre completo accesible, filas de aproximadamente 53 px y una sola acción por celda. Se elimina el enlace repetido «Ver detalle»; la celda abre la misma pareja alumno–competencia. Nombres y cabeceras fijos, tabla con desplazamiento interno y mapa de celdas para evitar búsquedas repetidas. Reapertura explícita con motivo/versionado sigue en el panel secundario.

La identidad se mantiene con los colores, tipografía, componentes, imágenes existentes y tarjetas de Ayni. Los tres destinos se ven completos en móvil. Las ilustraciones son decorativas y no representan estados ni datos.

## Pruebas y evidencia

La validación funcional usa exclusivamente el aula ficticia local de 20 alumnos, con B1 cerrado y B4 abierto. No hubo mutaciones pedagógicas cloud ni llamadas de IA pagadas. Los bloques de generación y persistencia se cubren mediante las regresiones de servicio existentes; esta ronda visual no regenera informes ni confirma nuevas notas.

- Selección anterior/siguiente de alumnos, niño sin evidencia sin valoración C y foto privada ampliable con cierre por Escape: PASS.
- Búsqueda de informes con tildes, filtro vacío, guardados, selección, siguiente/anterior y recuperación del alumno tras recarga del enlace: PASS.
- Word nominal descargado desde Informes: ZIP y OOXML íntegros, nombre correcto. Se conserva el exportador y el contenido existente.
- Consolidado: estados completos/todos, conclusiones opcionales, acceso al alumno y competencia, descarga Excel filtrada y archivo íntegro: PASS.
- Escritorio 1366×1000 y móvil 390×844, tres pantallas sin desbordamiento horizontal de página. La matriz se desplaza dentro de su región.
- Fixture **solo visual**, independiente y sin base de datos: 25 alumnos × 12 competencias, 300 celdas. Se verificaron renderizado, ancho móvil contenido y posición fija de nombres durante desplazamiento horizontal. Los niveles y conclusiones de esta fixture son sintéticos y no certifican generación pedagógica, persistencia ni una evaluación real de 25 alumnos.
- Regresión adicional: cambiar de informe no altera las ediciones locales de otros alumnos ni invoca guardado/generación. El selector conserva IDs de informes recibidos aunque no estén en la matrícula activa.

Resultados: **59 pruebas PASS**, TypeScript PASS, ESLint PASS, build local y Next PASS. Comandos: `npx tsc --noEmit`, `npm run lint -- --ignore-pattern .local`, `npm run build`, `npx next build --webpack`, y `node --test` sobre `period-evaluation`, `period-review-navigation`, `assessment-display` y `workflow-ui-continuity`. El commit desplegado y el smoke de Preview se entregan junto al enlace. Detector mecánico Impeccable sin hallazgos; no reemplaza la revisión visual.

Capturas:

| Pantalla | Escritorio | Móvil |
|---|---|---|
| Evaluación | [Ver](evidence/evaluar-ux-20261016/evaluacion-escritorio.png) | [Ver](evidence/evaluar-ux-20261016/evaluacion-movil.png) |
| Informe a familias | [Ver](evidence/evaluar-ux-20261016/informes-escritorio.png) | [Ver](evidence/evaluar-ux-20261016/informes-movil.png) |
| Consolidado | [Ver](evidence/evaluar-ux-20261016/consolidado-escritorio.png) | [Ver](evidence/evaluar-ux-20261016/consolidado-movil.png) |
| Matriz visual 25×12 | [Ver](evidence/evaluar-ux-20261016/matriz-25x12-escritorio.png) | [Ver](evidence/evaluar-ux-20261016/matriz-25x12-movil.png) |

## Integridad y publicación

Las consultas y descargas usan las fuentes canónicas existentes. Las únicas ediciones de prueba fueron locales en memoria y se retiraron sin guardar. Se mantienen los bloqueos de bimestre cerrado, borradores y controles de acceso existentes. No se reabre, cierra, califica ni regenera un período para obtener capturas.

Publicación autorizada exclusivamente en Preview, con commit identificable, árbol limpio y smoke test. La base compartida de Preview/Producción continúa siendo un límite para QA autenticado cloud; esta ronda no pretende resolver ni certificar Auth/RLS cruzado. Producción permanece excluida. Rollback: revertir el commit de esta rama; no hay migraciones ni datos que restaurar. Gasto adicional de IA: **USD 0**.
