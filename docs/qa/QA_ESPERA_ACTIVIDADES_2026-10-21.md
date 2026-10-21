# Espera de las actividades completas

## Hallazgo y causa comprobada

El proyecto de sombras se pausa dos veces en actividades distintas, conservando el maestro, las respuestas completas y las actividades guardadas. El código privado registra timeout; 422 es la respuesta interna tipificada de Ayni, no un rechazo curricular ni un código HTTP atribuido al proveedor. En el segundo corte había cinco actividades guardadas y otras dos respuestas completas. El primer reintento explícito completó la actividad anterior sin repetir sus hermanas listas.

La creación de proveedores de actividad no indicaba una espera propia: heredaba los 30 segundos de OpenAIProvider. Un tiempo agotado no permite determinar si la respuesta perdida habría sido válida ni su costo cuando no existe recibo. No atribuir retrospectivamente esta causa a todas las pausas antiguas sin diagnóstico.

## Cambio mínimo y límites

Solo generateTeacherActivity da 90 segundos a cada proveedor que ya crea la política vigente. Modelos, razonamiento, instrucciones, esquema, contexto, calidad, concurrencia y reglas de fallback se conservan. No se agrega ningún reintento, llamada o confirmación automática. Una respuesta rápida termina tan pronto llega; el margen mayor permite esperar una respuesta que supere 30 segundos. No prometer una reducción medida de latencia antes de comprobarla.

El límite sigue acotado: la ruta admite 300 segundos y la concesión del trabajador 360. La política actual permite un intento principal y uno alterno por calidad/validación; dos esperas máximas de 90 segundos más el presupuesto previo de hasta 75 segundos del bucle caben en esos límites. No aumentar ese margen sin volver a revisar ambos contratos.

Reversión: retirar el timeout explícito y su constante. No modifica migraciones, fuentes pedagógicas, autorizaciones ni documentos históricos.

## Verificación

24 pruebas de servicio de actividad, proveedor, bloque completo, cola y continuación PASS. Incluyen ambas creaciones de proveedor con 90 segundos conservando planes/salida, error de espera sin reintento silencioso, presupuesto de evaluación breve conservado, recuperación sin repetir IA, exclusión mutua y publicación atómica. Typecheck y build Next webpack PASS; lint cero errores y una advertencia histórica.

Publicación solo QA y recuperación real del proyecto pendientes al escribir esta entrada. Se mantiene el límite de seis intentos por llamada; las dos pausas observadas corresponden a actividades distintas, no seis generaciones del proyecto. Los tiempos/costos se registran por separado del tiempo dedicado a revisar y publicar.

## Prevención

Conservar el código privado acotado de pausa y revisar el presupuesto efectivo del proveedor cuando cambia el tamaño de una salida. Mostrar la recuperación existente y conservar resultados parciales. La falta de un recibo de uso se registra como costo desconocido, nunca gratuito.
