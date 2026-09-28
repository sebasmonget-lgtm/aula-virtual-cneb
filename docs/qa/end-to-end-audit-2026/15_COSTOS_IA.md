# Costos: prueba observada y escenarios anuales

## Corte final P1–P4: gasto observado, no factura

El ledger acumulado tiene **187 invocaciones facturables registradas**: 49 originales BEFORE, preservadas con el mismo contenido y orden, y 138 posteriores. Total mixto **USD 1.372454652**: **USD 0.006984432** de costos de generación informados por OpenRouter (Jev) y **USD 1.365470220** calculados a partir de tokens reales y tarifas registradas para OpenAI. No hubo eventos registrados sin precio. **Dos timeouts anteriores sin `usage` mantienen un posible cargo desconocido**; no se tratan como gratuitos. Tampoco existe conciliación con facturas, impuestos, recarga o créditos de las cuentas.

Hubo 13 invocaciones de informe familiar para 9 informes finales; cuatro propuestas rechazadas se pagaron igualmente. Los dos primeros intentos P4 (Alma y Omar) terminaron en `family_report_schema_mismatch`; el segundo intento de cada uno se confirmó. Este promedio de invocaciones incluye rechazos, pero **no** asegura una tasa futura de reintentos. La muestra no ejecutó transcripción de audio, reescritura de notas ni informe narrativo del aula.

La siguiente tabla sustituye **solo las medias unitarias** históricas con medidas de esta auditoría. El volumen anual sigue siendo una hipótesis para una profesora/15 niños. Los importes de «anual realista» multiplican media × usos supuestos × 1.20 llamadas textuales/decisiones (20% adicional); no se multiplica audio. `Jev observación` tiene unidad **par de llamadas por nota**: 46 llamadas para 23 notas diagnósticas, sin prueba de clasificación con contexto de actividad.

| Función | Invocaciones observadas | USD por invocación/salida base | Usos/año realista supuestos | USD/año con 20% adicional |
| --- | ---: | ---: | ---: | ---: |
| Síntesis diagnóstica | 1 | 0.012224 | 1 | 0.0147 |
| Prioridades | 1 | 0.009980 | 1 | 0.0120 |
| Preplan anual | 1 | 0.058488 | 1 | 0.0702 |
| Desarrollo formal anual | 2 | 0.044380 | 1 | 0.0533 |
| Proyecto/unidad: contexto | 8 | 0.019592 | 16 | 0.3762 |
| Proyecto/unidad: preguntas y criterios | 6 | 0.019239 | 16 | 0.3694 |
| Proyecto/unidad: mapa maestro | 5 | 0.061433 | 16 | 1.1795 |
| Proyecto/unidad: documento | 2 | 0.031237 | 16 | 0.5998 |
| Jev, imagen de proyecto | 5 | 0.0000384 | 16 | 0.0007 |
| Actividad | 20 | 0.001471 | 150 | 0.2649 |
| Maestro de talleres | 2 | 0.034728 | 12 | 0.5001 |
| Taller del día | 4 | 0.000731 | 120 | 0.1052 |
| Jev, ficha de taller | 1 | 0.0000616 | 120 | 0.0089 |
| Marco de evaluación | 5 | 0.066248 | 4 | 0.3180 |
| Assessment alumno–competencia | 22 | 0.001227 | 480 | 0.7069 |
| Conclusión descriptiva | 42 | 0.001619 | 480 | 0.9323 |
| Informe familiar | 13 | 0.000791 | 60 | 0.0570 |
| Jev observación híbrida, dos llamadas/nota | 46 llamadas/23 notas | 0.0002926/nota | 900 notas | 0.3161 |
| Informe del aula — **no medido** | 0 | 0.038 supuesto | 4 | 0.1824 |
| Reescritura — **no medida** | 0 | 0.0004 supuesto | 180 | 0.0864 |
| Reajuste, consolidado y descarga (código) | 0 | 0 adicional de IA | 4 | 0 |

El uso de una media de **llamada** para 60 informes, más 20% extra, no implica 60 informes confirmados; el caso P4 demuestra por qué deben medirse intentos y resultados por separado. Los precios unitarios de Jev y fichas son muestras muy pequeñas, no límites de costo.

| Escenario hipotético para 15 alumnos | Bajo | Realista | Intensivo |
| --- | ---: | ---: | ---: |
| Texto/decisiones, incluidos extras supuestos | $3.2072 | $6.1537 | $14.4497 |
| Audio aproximado, **sin uso real observado** | $0.54 | $1.80 | $4.50 |
| **Total API anual por profesora/aula** | **$3.7472** | **$7.9537** | **$18.9497** |
| Mensual en 10 meses lectivos | $0.3747 | $0.7954 | $1.8950 |
| Anual por alumno | $0.2498 | $0.5302 | $1.2633 |

Fuente reproducible: `llamadas-ia-continuacion.json` y `evidencias/cost-scenarios-after.json`, calculados por `audit-costs-continue.mjs` y `audit-scenarios-continue.mjs`. Son **costos API proyectados**, no gasto real anual ni precio del producto. No incluyen infraestructura, almacenamiento, soporte, impuestos, comisiones, margen, variación de tarifa ni cambios de divisa. El escenario «realista» conserva volúmenes decididos **antes** de medir el recorrido; no es una muestra estadística de docentes.

## Ledger acumulativo: checkpoint intermedio histórico

Las 49 filas originales de `llamadas-ia.json`/`costos.csv` no se sobrescriben. `audit-costs-continue.mjs` añade por ID a `llamadas-ia-continuacion.json`, verifica que el prefijo histórico es idéntico y rechaza omisiones/duplicados. Conserva intento formal rechazado y reintento exitoso. Añade acción/período cuando la UI permite correlacionar, sin inventar intentos internos del proveedor.

Corte provisional 04:11:56 UTC (27/09 en Lima): 53 llamadas, USD 0.213085552 mixtos; USD 0.006730752 reportados por OpenRouter y USD 0.2063548 estimados por tarifas sobre uso OpenAI. Nuevas funciones entonces: formal anual, 2 llamadas / USD 0.0887608 (incluye rechazo); contexto de proyecto, 1 / USD 0.017626; preguntas/criterios, 1 / USD 0.019276. No equivale a factura reconciliada. El **corte final de arriba**, no este checkpoint, incluye Masters y funciones siguientes; los escenarios de abajo son hipótesis BEFORE, no la estimación recalibrada.

## Medición y escenarios históricos antes del fix

Moneda USD. Fecha de tarifas 27/09/2026. NO son precio de venta ni costo total de operación. El ciclo anual no se completó; las proyecciones son un modelo de supuestos, no un año medido.

## 1. Gasto registrado durante esta auditoría

| Acción real | Llamadas | Entrada | Salida | Fuente del costo | USD |
| --- | --- | --- | --- | --- | --- |
| Jev principal + adicionales, 23 observaciones | 46 | 160,256 | 9,935 | Costo informado por OpenRouter | 0.006730752 |
| Resumen diagnóstico | 1 | 4,052 | 412 | Estimación tarifaria OpenAI | 0.012224 |
| Prioridades | 1 | 2,215 | 555 | Estimación tarifaria OpenAI | 0.009980 |
| Borrador anual | 1 | 9,804 | 3,888 | Estimación tarifaria OpenAI | 0.058488 |
| **Total mixto** | **49** | **176,327** | **14,790** | **Proveedor + estimaciones** | **0.087422752** |

Desglose: US$0.006730752 informado por proveedor y US$0.080692 estimados. El contador muestra US$0.0874 por redondeo; coincide con el ledger. Ninguna llamada registrada quedó sin precio. Esto NO prueba que toda tentativa fallida futura pueda conciliarse: el sistema registra uso best-effort y no correlaciona intentos de negocio.

OpenAI devolvió tokens reales de respuesta, pero no un cargo monetario facturado; no se tuvo acceso a factura ni Usage/Costs de la cuenta para reconciliar. OpenRouter devolvió costo por generación, no se reconcilió con saldo/impuestos/tarifas de recarga. No hubo transcripciones, selección de imágenes/fichas, proyectos, assessments ni informes familiares medidos.

Se guardan todas las 49 filas con hora UTC, workflow, modelo, tokens, costo/fuente, versión tarifaria y latencia cuando puede correlacionarse en `costos.csv` y `llamadas-ia.json`. No contienen claves ni prompts de niños reales. Reintentos aparecen desconocidos, no «0» inventado. Las horas son 28/09 UTC y 27/09 noche en Lima.

## 2. Tarifas utilizadas

Standard, por millón de tokens, contexto <=272k: Sol entrada 2.00, caché 0.20, salida 10.00; Luna entrada 0.10, caché 0.01, salida 0.50 USD. Si entrada supera 272k, configuración local usa Sol 4/0.4/15 y Luna 0.2/0.02/0.75. No se mezclan tarifas Batch/Flex/Fast. El precio por minuto de mini-transcribe se usa como aproximación US$0.003/min, no como factura exacta. Fuentes: [precios OpenAI](https://developers.openai.com/api/docs/pricing), [modelo de transcripción](https://developers.openai.com/api/docs/models/gpt-4o-mini-transcribe).

Jev 1.13 tiene entrada US$0.042/M y salida gratuita en la tarifa consultada. Para las 46 llamadas se usa su costo real informado, no esta fórmula en sustitución del dato. Fuente: [Jev en OpenRouter](https://openrouter.ai/typesafe/jev-1.13).

## 3. Escenarios anuales para una profesora con 15 alumnos

Incluyen diez meses de actividad escolar y cuatro períodos. Regeneración adicional hipotética: 5%, 20% y 75% de llamadas textuales/decisiones. No se multiplica audio por regeneración textual: los minutos indicados ya son el uso total. No se incluye caché para evitar inventar ahorro.

| Volumen anual supuesto | Bajo | Realista | Intensivo |
| --- | --- | --- | --- |
| Proyectos + unidades | 6 + 2 | 12 + 4 | 20 + 8 |
| Actividades | 80 | 150 | 220 |
| Workshop Masters | 4 | 12 | 20 |
| Talleres | 40 | 120 | 220 |
| Assessments por niño/competencia | 360 | 480 | 720 |
| Conclusiones por niño/competencia | 360 | 480 | 720 |
| Informes familiares | 60 | 60 | 60 |
| Marcos/informes de aula | 4 + 4 | 4 + 4 | 4 + 4 |
| Observaciones clasificadas con híbrido Jev | 300 | 900 | 1,800 |
| Reescrituras de notas | 30 | 180 | 540 |
| Audio, minutos | 180 | 600 | 1,500 |
| Selección Jev de imágenes / fichas | 8 / 40 | 16 / 120 | 28 / 220 |

Además, un diagnóstico/prioridades/preplan por año y un documento anual formal. Reajustes actuales se resuelven por código y se presupuestan a US$0 adicional de modelo; cambiar/regenerar después un documento puede requerir otro flujo y queda dentro del supuesto de regeneración. Nada de esto afirma que el producto pueda generar hoy todas esas salidas del recorrido.

| Costo API estimado por profesora/aula | Bajo | Realista | Intensivo |
| --- | --- | --- | --- |
| OpenAI texto | $2.7685 | $5.1740 | $11.7892 |
| OpenAI audio, aproximación | $0.54 | $1.80 | $4.50 |
| Jev observaciones, imágenes/fichas | $0.1006 | $0.3435 | $0.9947 |
| Otros proveedores usados en modelo | $0 | $0 | $0 |
| **Anual por aula / profesora** | **$3.41** | **$7.32** | **$17.28** |
| Mensual, repartido en 10 meses escolares | $0.34 | $0.73 | $1.73 |
| Mensual, repartido en 12 meses calendario | $0.28 | $0.61 | $1.44 |
| Anual por alumno, 15 alumnos | $0.23 | $0.49 | $1.15 |

Estos importes bajos dependen de usar Luna en salidas rutinarias y de los sobres de tokens de la siguiente tabla. NO son una promesa ni una cota superior. La denominación «realista» describe el volumen supuesto, no una calibración con una profesora observada durante un año.

## 4. Costo por salida importante y sobre de tokens

| Salida/acción | Modelo | Entrada/salida asumida | USD base por generación | Estado |
| --- | --- | --- | --- | --- |
| Word diagnóstico descargado | Código | — | 0 adicional | Medido: texto grupal IA costó aparte 0.012224 |
| Preplan anual | Sol | 9,804/3,888 reales | 0.058488 | Medido por tarifa |
| Documento anual formal | Sol | 12,000/4,000 | 0.064 | No medido |
| Proyecto o unidad | Sol | 14,000/5,000 | 0.078 | No medido |
| Workshop Master | Sol | 10,000/3,000 | 0.050 | No medido |
| Actividad | Luna | 10,000/2,200 | 0.0021 | No medido |
| Taller | Luna | 7,000/1,600 | 0.0015 | No medido |
| Assessment Master | Sol | 12,000/2,500 | 0.049 | No medido |
| Assessment individual/competencia | Luna | 10,000/1,400 | 0.0017 | No medido |
| Conclusión | Luna | 7,000/600 | 0.0010 | No medido |
| Informe familiar | Luna | 9,000/1,800 | 0.0018 | No medido |
| Informe del aula | Sol | 9,000/2,000 | 0.038 | No medido |
| Reescritura nota | Luna | 2,500/300 | 0.0004 | No medido |
| Jev observación híbrida | Jev | Dos llamadas; promedio de 23 pares reales | 0.0002926414 | Medido por proveedor |
| Jev imagen o ficha | Jev | 4,000 entrada por selección | 0.000168 | No medido |
| Audio un minuto | mini-transcribe | 60 s | ~0.003 | No medido; tarifa aproximada |

Los tokens de salida deben incluir razonamiento facturable cuando el proveedor lo integre en usage. No se presupuestan solo las palabras visibles. Los sobres están especificados en `audit-costs.mjs` y `evidencias/cost-scenarios.json` para poder sustituirlos por medidas futuras.

## 5. Regeneraciones, escalamiento y decisión comercial

Rehacer una salida paga otra llamada aunque la docente no la confirme. En el escenario realista se usa multiplicador 1.20 y en intensivo 1.75, incluido Jev si se solicita de nuevo. No se presupone que el botón Cancelar elimine un cargo ya procesado.

Sensibilidad concreta: sustituir 60 assessments Luna de 10k/1.4k por Sol aumenta aproximadamente US$1.938. Si se factura además el intento Luna fallido, debe sumarse. Promover muchas salidas a Sol, aumentar razonamiento, duplicar contexto, usar contextos largos o repetir audios puede dominar la factura. No se observó fallback en los flujos medidos.

Antes de fijar precio/límites: desbloquear el ciclo; medir 2–3 aulas piloto con cada flujo, retries y regeneraciones; conciliar con proveedor; separar presupuesto de audio/texto; añadir infraestructura, almacenamiento, soporte, impuestos/margen y moneda local con tasa vigente. No se calculó soles ni se inventó tipo de cambio. Estos escenarios sirven para diseñar la instrumentación y los primeros sobres de uso, no para fijar una tarifa comercial definitiva.
