# Comparación conservadora de caché de instrucciones

La usuaria autoriza optimizar diagnóstico/proyecto solo si se conserva la calidad y estabilidad. No se baja modelo ni esfuerzo, no se recorta contenido, no se debilitan validadores ni se aumenta concurrencia cloud. Preferir no publicar un cambio cuyo ahorro no sea claro.

Experimento aislado, sin editar el proveedor de la aplicación: comparar el payload actual con una variante de caché explícita después de las mismas instrucciones, enviadas en un mensaje developer. Se conservan literalmente las instrucciones, el bundle completo, esquema, modelo y esfuerzo. El cambio de ubicación de instrucciones es una diferencia real del transporte; no se supone equivalencia de resultados por una prueba de texto. Se exige validación estructural/de dominio y lectura pedagógica de nuevas salidas antes de considerar integración.

Techo nuevo de seis creaciones para toda esta comparación, tres por flujo (actual, variante fría y variante con prefijo caliente). Reserva persistida antes de cada creación; consultas del mismo ID no cuentan como nuevas generaciones. Dos flujos independientes, máximo dos solicitudes en curso; no cambia el límite del producto. Muestras sintéticas autorizadas de la ronda anterior, sin fotos/audio, confirmación docente ni escrituras remotas. Una variante caliente conserva el mismo JSON y añade un salto final de línea para evitar atribuir el acierto del bundle completo a las instrucciones compartidas. Se declara esta limitación artificial del ensayo.

Medir duración completa hasta resultado, espera de consulta por separado, tokens de lectura/escritura de caché, resultado de validadores y costo estimado. No utilizar los 462 ms de la recuperación histórica del diagnóstico como duración de generación. La muestra no es estadísticamente suficiente para garantizar un porcentaje de mejora; una variación pequeña/inconsistente impide promoverla.

Aceptación conservadora: ninguna salida inválida ni regresión pedagógica y una señal de mejora de al menos 20% en ambos flujos, diferenciando generación de detección por polling. Sin esa señal, mantener aplicación y deployment actuales. Si resulta prometedora, integración posterior mínima, gates del proyecto y publicación QA con commit limpio/smoke; Producción queda intacta. Rollback del experimento: descartar la variante privada; ningún dato de aula depende de ella.

Fuentes: documentación oficial de OpenAI sobre prompt caching y latencia, consultada el 21/10/2026. Top-level instructions no admite breakpoint explícito; el prefijo estable puede declararse en un input_text de developer. Caché ahorra procesamiento de entrada, no genera una respuesta previamente guardada ni garantiza reducir el análisis/redacción.

## Resultado y decisión

**Variante descartada; aplicación y despliegues conservados.** Se completaron seis creaciones (tres por flujo), sin reparación ni reintentos de creación. Seis salidas válidas mediante esquema JSON y validadores originales: once lecturas diagnósticas y diez actividades por proyecto. Se revisaron los textos: alcance de las afirmaciones, fuente familiar separada de observación, apoyos, secuencia de indagación, decisiones infantiles y criterios/referentes. Ninguna salida se confirma ni sustituye documentos del aula.

| Flujo | Actual | Primera variante | Variante con prefijo previo |
| --- | ---: | ---: | ---: |
| Diagnóstico | 119,592 s | 131,046 s | 121,995 s |
| Proyecto | 197,903 s | 224,675 s | 188,592 s |

La última condición reduce 9,311 s en proyecto (4,7%) y aumenta 2,403 s en diagnóstico (2,01%). No cumple el umbral conservador. Una muestra por condición, con respuestas nuevas de longitud y razonamiento variables, no demuestra una reducción estable ni permite atribuir causalmente diferencias pequeñas a la caché. Se conserva el código actual; no se reduce esfuerzo/modelo ni se recorta contenido para obtener una cifra mejor.

La condición denominada `cache_cold` en los recibos es solo la primera variante: no garantiza caché fría. En diagnóstico leyó 15270 tokens del control completo y aun así tardó más. La segunda variante, cuyo JSON solo añade un salto final de línea, recuperó cero tokens en diagnóstico y 2395 en proyecto. No se presenta este ensayo como prueba concluyente de caché común entre aulas ni se deduce una causa raíz del acierto/miss sin instrumentación adicional. La falta de aciertos de las muestras históricas no demostraba una avería.

Costos nuevos estimados US$0,642675 por seis creaciones; cero desconocidos nuevos. Acumulado conocido US$2,01815362 por 108 llamadas; siete intentos históricos sin precio separados. No es factura. Medición global del ensayo: 16:47:23–16:57:34 UTC (11:47–11:57 Lima); se ejecutaron dos flujos independientes en paralelo. Duración hasta detectar resultado mediante consultas cada cinco segundos; el CSV separa segundos de proveedor cuando disponibles.

Preservación comprobada: archivos de proveedor/factory/proyecto/diagnóstico sin diff, QA permanece `67369618289a7ecb3a7efb34f61426a53f600def` / `dpl_FgC4fZFXqSdH3mEqvD1maR55DZaG` y Producción `9a0920230350cd6b9050f35683a1f35d459e78c7` / `dpl_H19YWzRdGjkgh8y72QAd1qBty7Mf`. El ensayo no conecta ni escribe la base remota. No hay publicación, cambio de arquitectura, interfaz o plantilla; no se requieren nuevas capturas ni se declaran nuevos gates de aplicación.

Recibos, salidas, fuente del experimento y contador privado en `.local/cache-conservador-20261021`. Entrega legible en `outputs/Ayni-comparacion-espera-2026-10-21`: resumen, CSV de tiempos/costos, resultados y preservación. Los cambios paralelos de Mirai no se incluyen ni se modifican. Los experimentos privados no forman parte del bundle de la aplicación.

Fuentes: [Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching) y [Latency optimization](https://developers.openai.com/api/docs/guides/latency-optimization), documentación oficial de OpenAI consultada el 21/10/2026.
