# Última comparación Luna high

20/10/2026. Evidencia histórica del formato anterior con nota sugerida. La instrucción posterior de la persona usuaria elimina esa función. No usar esta comparación para afirmar que la versión actual propone notas ni extrapolar su costo exacto al nuevo formato de 30–70 palabras.

Se ejecutaron diez casos y dos repeticiones dirigidas con gpt-6-luna high. Todas las respuestas pasaron el contrato anterior. Los hashes de contexto/esquema/instrucciones coinciden con los pares low/medium; máximo tres solicitudes simultáneas, sin fallback ni reintentos automáticos. Notas y borradores del aula QA mantienen el hash; solo se escribe telemetría.

| Medida, primera pasada de diez casos | Low | Medium | High |
|---|---:|---:|---:|
| Promedio por llamada | 5.87s | 6.36s | 11.29s |
| Costo observado de diez | USD0.003184 | USD0.005677 | USD0.007302 |
| Proyección de 200, entrada ordinaria igualada | USD0.077 | USD0.104 | USD0.136 |
| Proyección de 200, escritura de caché igualada | USD0.086 | USD0.114 | USD0.146 |

La caché observada difiere y no debe atribuirse su ahorro al esfuerzo; por eso se incluyen filas normalizadas. Fuente tarifaria: [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna). Más observaciones o razonamiento pueden aumentar el costo.

Costo high completo de doce llamadas: USD0.008770135. Las diez sugerencias iniciales coinciden con low; nueve con medium. En el caso avanzado de Alma, high A→AD y medium AD→A; low se mantuvo A. Daniel recibió B en las dos pasadas de los tres esfuerzos. Los dos controles sin actuación pertinente quedaron sin letra. No hay un conjunto patrón docente ni una muestra suficiente para certificar mejor calibración.

High describió mejor límites en algunos casos, pero también alargó el texto. En Camila escribió que no se observó necesidad de apoyo sin que el registro precisara ese dato; en Bruno el motivo se apoya en parte en relectura del adulto, prevista en Inicial. Ninguno de estos ejemplos justifica automatizar una nota. La variación A/AD se resuelve de producto eliminando la sugerencia según petición posterior, no afirmando que un esfuerzo superior la vuelve fiable.

La aplicación conserva su perfil previo: no se cambia el esfuerzo del producto ni se hace commit, push o despliegue en esta ronda. Todos los textos high y los comparables se conservan en el JSON compañero. La versión vigente local se describe en QA_EVALUAR_SOLO_ANALISIS_2026-10-20.md.
