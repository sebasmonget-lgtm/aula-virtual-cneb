# Evaluación y consolidado — referencias visuales del 15 de octubre

Base: `a99036a77ebd06f94ef201df00012c653c483692`. Rama: `codex/evaluation-mockups-20261015`.

## Alcance

Se adaptaron las tres referencias proporcionadas por el usuario al flujo existente. La revisión por competencia muestra progreso real, lista de estudiantes con búsqueda y filtros, evidencia original con foto privada ampliable, análisis y decisión docente. En móvil la lista se abre desde «Cambiar niño». El consolidado conserva la matriz, añade resúmenes y filtros por estado y utiliza el Excel existente con esos mismos filtros. La reapertura explícita conserva motivo y versión y se presenta en un panel colapsable.

No se copiaron datos de ejemplo, fechas, anotaciones para Codex ni acciones sin contrato del mockup. No hay cambios de motor, esquema, IA, valoración o cierre. Las fotos se consultan mediante el endpoint autenticado existente; su ampliación reutiliza el mismo blob local y no llama a IA. Fuera de esta revisión, el adjunto mantiene su apertura manual anterior.

«Valoraciones confirmadas» usa `valuation_confirmed`. «Registros completos» exige el estado canónico `confirmed`, que incluye las condiciones de conclusión correspondientes. Un nivel confirmado con conclusión pendiente no se presenta como registro completo. La tabla sigue siendo de consulta; sus enlaces llevan al origen para corregir.

## Validación ejecutada

- TypeScript: `npx tsc --noEmit`, PASS.
- ESLint: `npm run lint -- --ignore-pattern .local`, PASS.
- Build local: `npm run build`, PASS; avisos de dependencias PGlite y tamaño de bundle ya existentes.
- Build Next usado por Vercel: `npx next build --webpack`, PASS.
- 57 pruebas: evaluación del período, presentación de análisis, continuidad de interfaz y navegación. PASS. Dos regresiones nuevas ejecutan la selección real de estudiantes: cancelar conserva el borrador y aceptar limpia el detalle anterior.
- Detector mecánico Impeccable sobre los cuatro componentes modificados: sin hallazgos. No sustituye la revisión visual.
- Navegador real con el aula ficticia local de 20 niños: escritorio 1366×1000 y móvil 390×844. Sin desbordamiento horizontal de página; la matriz conserva desplazamiento interno.
- Búsqueda sin tildes, búsqueda sin resultados, filtro de confirmados, selección de un niño sin evidencia, apertura de foto privada, ampliación y cierre con Escape: PASS.
- B1 cerrado: corrección deshabilitada y reapertura explícita. Cambio a B4 abierto: limpia la selección anterior, cuatro niveles sin selección predeterminada y aviso de cambios locales al escribir. La nota temporal se retiró sin guardar.
- Consolidado: filtros combinados por niño y competencia, registros completos, conclusiones opcionales y navegación a la pareja niño–competencia: PASS.
- Descarga real de Excel filtrado por registros completos: archivo ZIP/XML válido, Camila, Diego y Valentina presentes; niños pendientes excluidos. Se usó la exportación existente.

Capturas: [detalle escritorio](evidence/evaluation-mockups-20261015/detalle-escritorio.png), [detalle móvil](evidence/evaluation-mockups-20261015/detalle-movil.png), [consolidado escritorio](evidence/evaluation-mockups-20261015/consolidado-escritorio.png), [consolidado móvil](evidence/evaluation-mockups-20261015/consolidado-movil.png).

## Límites e integridad

Esta ronda valida la presentación y el recorrido afectado, no repite toda la auditoría anual. El reloj mostrado pertenece al harness ficticio; los períodos se abrieron mediante selección explícita. No se realizaron nuevas valoraciones, reaperturas ni cierres desde la interfaz durante esta revisión. Los tests de persistencia usan sus propias bases temporales.

Todos los datos de navegador fueron locales y ficticios. Las llamadas pagadas estuvieron deshabilitadas: gasto adicional de IA **USD 0**. No hubo escrituras pedagógicas cloud. Preview y Producción siguen compartiendo conexión; continúa pendiente la base QA independiente descrita en la auditoría anterior. Esta mejora visual no resuelve ese límite ni certifica el producto para Producción.

Rollback: revertir el commit de esta rama. No hay migraciones ni datos que restaurar.
