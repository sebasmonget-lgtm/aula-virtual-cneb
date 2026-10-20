# Asistencia en el informe para familias

Solicitud: recuperar la gráfica sencilla de asistencia de cada alumno, tanto en el informe visible como en su Word. Alcance vertical: lectura autorizada existente de asistencia → alumno/bimestre → gráfica común → pantalla y exportación; sin migraciones, IA o cambios de datos.

Se conservan calendario efectivo, feriados/gestión excluidos y corte pedagógico. Presente y Llegó tarde se muestran separados; ambos cuentan como asistencia. Justificada y Sin registro aparecen cuando corresponden. Un total sin registros no se presenta como una falta ni como una asistencia cero confirmada. Históricos sin período formal/aula activa conservan descarga con disponibilidad explícita.

Permisos: API de asistencia ya valida docente, aula y período; Word carga de nuevo el documento autorizado y toma ese alumno y aula. Ni el texto ni parámetros del cliente aportan cantidades a la descarga. No se envían datos de asistencia a IA. Consulta al abrir/descargar con fecha de corte, sin modificar la versión guardada de notas o conclusiones.

Pruebas locales: conteo excluyente, justificada, pendiente, cero días y totales inválidos; Word conserva texto/nota, barras con cantidades y una sola sección de asistencia; regresiones de documentos y propiedad. Comprobación real de diez Word en transacción de solo lectura: 43 días lectivos por alumno, cantidades contrastadas contra el mismo calendario/asistencia, once saltos entre doce competencias.

Recibos privados en `.local/qa-asistencia-familias-20261020`: tests.log, library-tests.log, typecheck.log, lint.log, build.log, local-word-check.json. Antes de terminar deben constar smoke.json, asistencia-cloud.json, capturas de móvil/escritorio, verificación Word renderizada y release.json con SHA/alias. No sustituirlos por recibos del QA anterior ni afirmar cobertura total de Ayni.

Publicación exclusivamente Preview QA en gru1, commit limpio/push y smoke antes del alias. Producción permanece en su deployment anterior. Rollback: volver al Preview registrado en baseline-release.json; las lecturas no requieren restaurar ni borrar datos.
