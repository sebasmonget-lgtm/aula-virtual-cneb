# Auditoría de IA: ejecución frente a configuración

Se usan tres niveles de evidencia: REAL (respuesta en UI más ledger/log), CÓDIGO/TEST (configuración o fixture revisado), NO PROBADO (salida inexistente en el recorrido). No se atribuyen tokens, latencia o calidad a un modelo que no fue llamado.

## Routing

| Flujo | Routing actual | Evidencia en este recorrido |
| --- | --- | --- |
| Diagnóstico, mapa, comentario individual manual | Código, sin IA | REAL |
| Asistencia individual diagnóstica | Sol medium | CÓDIGO; no llamada |
| Resumen diagnóstico | OpenAI gpt-6-sol medium | REAL, 4,052/412 tokens |
| Prioridades diagnósticas | OpenAI gpt-6-sol medium | REAL, 2,215/555 |
| Preplan anual | OpenAI gpt-6-sol high | REAL, 9,804/3,888 |
| Documento anual desarrollado | Sol low | NO PROBADO; confirmación falló antes |
| Proyecto / unidad | Sol medium | NO PROBADO |
| Workshop Master | Sol medium | NO PROBADO |
| Actividad | Luna medium; fallback Sol low de calidad | NO PROBADO |
| Taller diario | Luna medium | NO PROBADO |
| Criterio realineado | Sol medium | NO PROBADO; `criterion_and_evidence` se declara unavailable/reemplazo |
| Assessment Master | Sol medium | NO PROBADO |
| Assessment por niño/competencia | Luna medium; fallback/revisión profunda Sol medium | NO PROBADO |
| Conclusión descriptiva | Luna medium; fallback/revisión profunda Sol low | NO PROBADO |
| Informe familiar | Luna medium | NO PROBADO |
| Informe del aula | Sol medium | Barrera REAL, sin llamada |
| Reajuste actual | Código determinista, no modelo | CÓDIGO; no cierre previo |
| Reescritura observación | Luna low | CÓDIGO; no llamada |
| Audio | gpt-4o-mini-transcribe | NO PROBADO |
| Jev competencias | OpenRouter typesafe/jev-1.13; efectivo 1.13-20260917 | REAL: 23 pares de llamadas, 1 bloqueo previo |
| Jev imagen y ficha | Clientes de decisión específicos | CÓDIGO/TEST; no llamada REAL |
| Generación de material | Unavailable en router | No prometer generación productiva |

Los tres flujos OpenAI reales respetan router 3.0.0. Jev usa una integración de decisiones distinta de la generación de texto; que el router genérico declare ciertas decision_tasks unavailable no significa que Jev no exista. No se ejecutó una comparación entre dos modelos ni una búsqueda de «mejor modelo»: se auditó el híbrido y routing actuales sin cambiarlos.

## Contextos y schemas medidos

| Flujo real | Contexto/KB identificado en código | Contrato y observación |
| --- | --- | --- |
| Jev principal | Texto anonimizado, edad, competencias aplicables y criterios enfocados/suficiencia | Choice entre candidatos; no texto libre inventando IDs |
| Jev adicionales | Mismo hecho anonimizado y preguntas Noul de candidatos adicionales | Decisiones paralelas por competencia dentro de segunda llamada; el híbrido completo hace dos llamadas concurrentes |
| Grupo | Alias niño_N, notas observadas, comentarios opcionales confirmados; opciones curriculares | Structured Output de fortalezas/necesidades/prioridades de planificación; **no agregado de intereses** en este bundle |
| Prioridades | Grupo confirmado y opciones/condiciones curriculares | Salida estructurada validada, revisión docente antes de confirmar |
| Preplan | Grupo y prioridades confirmadas, intereses, contexto, calendario, initial_slots, competency_cards de edad 5, conocimiento didáctico enfocado | Schema `annual-preplan-v1`, exactamente doce propuestas; validación posterior; código alinea fechas/duración |

KB cargada v4.1.0 con 374 unidades combinadas, 14 tarjetas, 36 fuentes registradas y 16 workflows. Son conteos del paquete, NO conteos de documentos enviados a cada llamada. Las tarjetas incluyen estándares/capacidades/referencia de edad; lo curado o interpretado no se presenta como cita literal del CNEB. El log Jev sí registra kb_version=4.1.0. El contenido curricular recuperado por OpenAI se verifica en la construcción del bundle y tests, pero no se guardó un manifiesto de unit_ids/source_ids por llamada real: trazabilidad documental PARTIAL.

## Calidad, privacidad y límites

Jev acierta decisiones concretas, abstiene ante anécdotas y permite dos competencias. No garantiza verdad por confianza. J18 fue bloqueado por el filtro local de una palabra familiar y J24 se omitió por Jev; hay que separar ambas causas. No se bajó el umbral para mejorar artificialmente los resultados.

No se enviaron voces/fotos ni datos reales. La minimización por alias y anonimización está presente, pero el filtro tiene falsos positivos y no hay prueba de penetración/garantía completa de privacidad. Un export local PGlite no demuestra RLS real en Supabase. Las pruebas de autorización de dos docentes y RLS estática son soporte aislado, no certificación de producción.

## Latencia, errores y reintentos

46 eventos Jev de éxito con latencia registrada: min 278 ms, p50 339 ms, p95 902 ms, max 1,061 ms. No equivale a latencia usuario; se ejecutan dos llamadas por decisión. Las pantallas se observaron alrededor de 2.2 s después del guardado, incluyendo sondeo.

Para OpenAI no hay latencia propia guardada. Correlacionar hora de inicio de click con ledger da aproximadamente 10.1 s grupo, 13.3 s prioridades y 50.6 s preplan: aproximaciones de petición→persistencia, no medición pura del proveedor. Las horas de observación de UI en `ai-acciones-ui.json` son mayores por trabajo intercalado y NO se venden como rendimiento del modelo.

No se observó fallback/regeneración exitosa en estos flujos ni un error del proveedor. El ledger no registra intentos fallidos/reintentos por operación, por lo que «no observados» no equivale a «garantizados cero». H08 falla en validación local antes de formalizar, sin llamada nueva. El registro best-effort de costos puede fallar sin abortar la operación; es un riesgo de instrumentación visto en código, no una pérdida observada en estos 49 eventos.

Referencias: [Jev actual en OpenRouter](https://openrouter.ai/typesafe/jev-1.13), [documentación conceptual de Jev](https://openrouter.ai/blog/insights/what-is-jev/), [Sol](https://developers.openai.com/api/docs/models/gpt-6-sol), [Luna](https://developers.openai.com/api/docs/models/gpt-6-luna). Toda estimación de precio está separada de calidad y en el informe 15.
