# Evaluación: análisis pendientes y contexto trabajado

## Síntoma y causa

En el recorrido UI, veinte notas de identidad/convivencia se confirmaron; la primera nota de Cantidad fue rechazada con Cambió lo que se trabajó en el período. Cantidad conservaba sus mismas observaciones y por ello el lote reutilizaba un borrador cuyo contexto era anterior a la última actividad terminada. La protección final del servidor detectó correctamente esa diferencia, pero la preparación no la mostraba. No se confirmó una nota incorrecta ni se retiró el guard.

Además, la huella del contexto incluía la versión global y la cobertura del mapa: añadir una observación de un niño podía invalidar a otros aunque sus fuentes y los criterios trabajados no cambiaran. La fecha inferida desde esas observaciones también cambiaba esa huella.

## Corrección general

Los análisis pendientes comparan tanto sus observaciones como la huella actual del contexto trabajado, y los lotes incluyen esa huella en su contrato durable. Un cambio real de actividad, criterio, revisión, programación o estado trabajado requiere actualización explícita. La cobertura y la fecha de las observaciones siguen en sus propios registros y en el mapa completo; no forman parte de la huella estructural común del marco. No se alteran estadísticas, fechas guardadas, cierres ni documentos históricos.

Se mantienen las notas confirmadas y, al actualizar un borrador, el texto que editó la docente, la elección provisional y el sustento. No se guardan notas automáticamente ni se cambia el modelo, el prompt, la concurrencia, los límites de reintento o el esquema pedagógico. El guard de confirmación se conserva. Una nueva observación de un niño continúa invalidando solo su análisis cuando el contexto trabajado sigue igual.

La lectura de fuentes dentro de transacción reutiliza el adaptador transaccional existente para no iniciar otra transacción. Un contexto común se comparte entre las doce llamadas del grupo; no se carga uno por niño. Las comprobaciones de vigencia requieren lecturas comunes adicionales antes de preparar o retomar, sin llamadas IA por sí mismas.

## Validación y reversión

Pruebas nuevas de cambio de contexto sin nuevas observaciones, conservación de texto/nota/sustento, confirmación posterior y preservación de la nota activa; prueba de huella que ignora cobertura/fecha inferida y detecta revisiones y estado trabajado. Regresión existente exige no repetir el análisis de otro niño cuando solo se agrega una observación, y conserva la carga de 120 análisis con doce proveedores/un escritor. 77 pruebas PASS; typecheck, lint sin errores (una advertencia histórica) y build Next webpack PASS. La recuperación cloud se registra después de su ejecución. Ninguna prueba local usa IA pagada o cambia datos remotos.

Reversión: revertir este commit y volver al alias QA anterior, conservando fuentes y versiones. Sin migración. No publicar en Producción desde este recorrido.
