# Mi año: QA autónomo secuencial — 13/10/2026

Base de producto b70cb3b, documentación cce2027, árbol inicialmente limpio. La cuenta QA estaba vacía tras la limpieza expresamente solicitada inmediatamente antes: cero aulas, niños y registros. Se crea por UI una nueva aula ficticia de cinco años, QA Mi año 13 octubre / QA Anual, y cinco niños Ensayo Anual. No se reconstruyen datos borrados. Restricciones: una sola generación anual controlada, conservar datos creados y calendario, sin migraciones ni publicación de Producción.

## Corrección focal previa a generación

La API conserva la propuesta IA en ai_snapshot, pero el editor recuperado no comunicaba processing ni distinguía una propuesta preparada del texto docente vigente. Ahora expone estado/expiración sin token de lease, permite consultar el estado sin generar y ofrece usar explícitamente la propuesta conservada. Una petición que termina después de desmontar el editor no aplica ni vuelve a guardar su resultado sobre correcciones más recientes. No se añade worker, cola ni tabla; el resultado sigue durable en el mecanismo existente y la exclusión por lease/cache permanece.

Instrumentación mínima: duración HTTP del proveedor en provider_metadata, tiempos de fuentes antes/después, DB y conexión del contexto de medición existente y tiempo antes de persistir. No registra SQL, prompts, nombres ni secretos. Server-Timing se activa únicamente para la ruta adicional de sugerencia grupal; las optimizaciones de guardado existentes no se sustituyen. Las medidas de DB/proveedor son intervalos que pueden solaparse con lectura de fuentes/telemetría, no deben sumarse ciegamente.

La Preview base no incluía los flags del reloj QA. Se habilita la función ya existente solo en el nuevo despliegue Preview y para el UUID QA autorizado; conserva el valor predeterminado 16/02/2026 08:00, la firma privada y la separación del tiempo real de seguridad/facturación. No se cambia configuración de Producción, reglas curriculares ni calendario.

Typecheck, lint de cambios y Next webpack PASS. 49 pruebas focales PASS: proveedor/diagnóstico/reloj (18), recorrido/calendario/recuperación anual (31). Ninguna generación real en estas suites. El recorrido cloud y sus tiempos/costos se registrarán al cierre.

Rollback: volver al commit de producto b70cb3b y a sus flags de despliegue; no eliminar datos ni ai_snapshot. Campos de estado y timings opcionales son compatibles con clientes anteriores. No cambia modelo ni reasoning effort del resumen/plan.
