# Medición de costo de IA por docente

## Política vigente y muestra medida — 2026-10-07

GPT-6.1 Sol usa USD 2/0.10/10 por millón de tokens de entrada/caché/salida corta y 4/0.20/15 para entrada larga, según `ai-usage-service.mjs`. GPT-6 Luna mantiene 0.10/0.01/0.50 corta. Cada registro conserva modelo y versión de tarifa. Consultas de Responses background no son generaciones nuevas y la usage se registra al completar la respuesta.

La muestra ficticia de siete etapas aprobadas costó aproximadamente USD 0.2274068: diagnóstico 0.040592, año con cinco propuestas futuras 0.092292, proyecto 0.090730, actividad 0.0013179, análisis 0.0009772, conclusión 0.0007453 e informe familiar 0.0007524. Otra muestra anual sin observaciones preparó las quince propuestas en una sola generación high: USD 0.143516 y 319466 ms, con 56 consultas de avance. La conversación de proyecto adicional Luna medium costó USD 0.0001176 (3904 ms). Total de nueve respuestas completadas medidas: USD 0.3710404. Los intentos que terminaron en timeout no devolvieron usage; su posible cargo no está incluido ni se declara cero. No es una proyección mensual ni una factura.

Las trazas completas contienen únicamente datos ficticios, quedan en `.local/modern-ai-qa` y no se publican ni se habilitan para docentes reales. Ver el handoff corregido del 7 de octubre para modelos, fuentes, validadores y límites.

## Escenario histórico — 2026-09-27

El presupuesto inferior corresponde a doce proyectos y la antigua cadena de masters. Se conserva como historia y no representa la arquitectura vigente de quince tramos.

Fecha de tarifas consultadas: 2026-09-27. Los importes del perfil son USD, no soles ni una factura. Se registran desde la migración `0060`/`202609270002`; no se estiman llamadas antiguas. El servidor atribuye cada llamada a la docente autenticada y guarda solo números y nombres técnicos de flujo/modelo. Las respuestas de menores y los audios no se guardan en este libro.

Fuentes: [precios oficiales de OpenAI](https://developers.openai.com/api/docs/pricing), [gpt-4o-mini-transcribe](https://developers.openai.com/api/docs/models/gpt-4o-mini-transcribe) y [Jev 1.13 en OpenRouter](https://openrouter.ai/typesafe/jev-1.13/). Tarifas Standard empleadas: GPT-6 Sol, entrada/caché/salida corta US$2/0.20/10 por millón de tokens; GPT-6 Luna US$0.10/0.01/0.50. Para entradas largas se usan las tarifas de cada modelo registradas en `ai-usage-service.mjs`. La transcripción se aproxima a US$0.003 por minuto; Jev a US$0.042 por millón de tokens de entrada y salida gratuita. Las tarifas pueden cambiar; cada fila conserva la versión de cálculo aplicada.

## Escenario ilustrativo de uso intensivo

Una docente ficticia con 20 estudiantes durante un año, doce proyectos, 180 actividades y talleres, 600 valoraciones y 600 conclusiones, 60 informes familiares, 600 audios de 30 segundos y 600 observaciones consultadas dos veces a Jev. También se suponen 12 decisiones de imagen, 180 de ficha, tres Assessment Masters y 40 ayudas diagnósticas. Los tokens por llamada son **supuestos para presupuestar**, no promedios medidos en Ayni. Se supone entrada corta, sin caché ni reintentos; el audio se cobra por duración.

| Uso anual supuesto | Cálculo | Costo ilustrativo |
| --- | --- | ---: |
| Plan anual, 2 llamadas Sol de 30k entrada / 10k salida | 2 × US$0.16 | US$0.32 |
| Proyectos, 36 llamadas Sol de 20k / 8k | 36 × US$0.12 | US$4.32 |
| 180 actividades y 180 talleres Luna de 8k / 3k | 360 × US$0.0023 | US$0.83 |
| 40 ayudas diagnósticas Sol de 8k / 3k y 3 Assessment Masters Sol de 20k / 8k | US$1.84 + US$0.36 | US$2.20 |
| 600 valoraciones, 600 conclusiones, 60 informes y 600 pulidos Luna | supuestos 6k/2k, 4k/1k, 8k/3k y 2k/0.5k | US$1.91 |
| 600 audios de 30 s | 300 min × US$0.003 | US$0.90 |
| 1392 decisiones Jev de 10k tokens de entrada | 13.92 M × US$0.042 | US$0.58 |
| **Total de este escenario** | **US$11.0606/año ÷ 12** | **US$0.92/mes promedio** |

El resultado es únicamente una sensibilidad de precios. Una sola regeneración, contexto más largo, tokens de razonamiento/salida adicionales, cache, cambio de modelo o tarifa puede mover mucho el total. Para presupuestar de verdad se debe usar el mes medido en la cuenta de cada docente y contrastarlo con las facturas de OpenAI y OpenRouter. El libro de Ayni no incluye hosting, base de datos, almacenamiento, red, impuestos ni márgenes.
