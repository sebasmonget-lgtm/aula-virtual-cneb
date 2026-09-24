# Arquitectura de contexto v4

```text
CANONICAL SOURCES
        │
        ▼
DOMAIN PROJECTIONS
   ┌──────────────┐
   │StudentContext│
   └──────────────┘
          +
   ┌────────────────┐
   │ClassroomContext│
   └────────────────┘
        │
        ▼
WORKFLOW CONTEXT BUILDERS
        │
        ├── Annual Plan, Project, Unit, Activity
        ├── Diagnostic, Assessment, Conclusion, Family Report
        └── Today
        │
        ▼
MINIMUM NECESSARY DATA
        │
        ▼
AI / UI / PLANNING
```

Las fuentes siguen en sus tablas originales. `student-context-service.mjs` construye el perfil actual de un solo niño y marca la procedencia de entrevista, observación, síntesis diagnóstica, evidencia formativa, assessment y conclusión. El acceso al perfil se autoriza por docente/aula en el servidor. Su snapshot de versión 1 se **actualiza** y funciona como caché del estado actual, no como copia histórica.

La entrevista captura la estructura **durante la respuesta**: selección múltiple de lenguas, lengua principal opcional y comentario original; selección múltiple de intereses, opción «Otro» y relato original; experiencia previa Sí/No/Prefiero no responder, tipo opcional cuando es Sí y relato original. El catálogo pequeño de opciones tiene `structured_options_version = 1`. No hay una segunda tarea de clasificación. Las entrevistas anteriores sin estructura continúan siendo legibles y pueden corregirse mediante una nueva versión; no se infieren tags a partir de su texto.

`classroom-context-service.mjs` autoriza primero el aula activa y después consulta solo a sus niños. Calcula bajo demanda lenguas usadas/escuchadas, lengua principal, intereses y experiencia previa desde opciones elegidas en entrevistas **confirmadas**, además de cobertura observacional y la última síntesis grupal confirmada. Las respuestas originales permanecen intactas en la entrevista versionada. No se interpreta texto libre para inventar etiquetas. El agregado interno conserva los conteos originales por opción; la proyección pública omite IDs de niños y fuentes, nombres y texto familiar, y oculta cada patrón si el aula tiene menos de cinco niños, si hay menos de tres casos o si el complemento tiene un solo caso. «Frecuente» significa exactamente que pasó esa regla de publicación, no una inferencia curricular. Los conteos no son niveles, rankings ni evidencia de competencia. La UI muestra este panorama en «Conocer».

| Fuente | Proyección | Consumidor | IA | Finalidad |
| --- | --- | --- | --- | --- |
| Entrevista confirmada | Resumen familiar permitido | Perfil, diagnóstico individual | Solo subset diagnóstico | Contextualizar acompañamiento; nunca evidencia docente |
| Etiquetas confirmadas de entrevista | Agregado de aula protegido | Plan anual, Project, Unit, Activity | Sí, agregado | Contextualizar planificación grupal |
| Observaciones diagnósticas docentes | Historial individual y cobertura | Perfil, diagnóstico | Solo subset diagnóstico | Preparar revisión docente |
| Revisión diagnóstica confirmada | Hallazgo individual | Perfil, diagnóstico | Solo cuando el workflow lo requiera | Distinguir diagnóstico inicial de assessment formativo |
| Revisión grupal confirmada | Síntesis de aula sin nombres | Planificación | Sí | Prioridades redactadas y confirmadas por docente |
| Evidencia formativa | Subset individual | Assessment | Sí | Analizar evidencia real de Activity/criterio |
| Assessment confirmado | Subset individual | Conclusión descriptiva | Sí | Redactar conclusión con fuentes confirmadas |
| Conclusión confirmada | Subset individual | Informe familiar | Sí | Comunicar hallazgos confirmados |
| Horario y asistencia | Contexto operativo | Hoy | No en este flujo | Orientar la próxima acción cotidiana |

La política auditable está en `src/lib/context-policy-v4.mjs`. Los builders de Plan Anual, Project, Unit y Activity reciben únicamente la proyección grupal pública. Activity además usa su Project/Unit padre. Los builders de diagnóstico, assessment, conclusión e informe son individuales y no reciben ClassroomContext. `buildAIContext()` sigue filtrando los datos finales por contrato de workflow y KB v4.

Cada proyección actual se recalcula desde las fuentes vigentes; no se crea tabla duplicada. La procedencia interna incluye ID, versión y confirmación cuando existe. El agregado público conserva solo una huella de fuentes. Las generaciones de planificación guardan en `generation_metadata.context_snapshot` una copia mínima del agregado público utilizado; esa metadata queda en servidor y es histórica, de modo que una nueva entrevista cambia el contexto actual sin alterar el contexto de una generación anterior. La respuesta al navegador no contiene la metadata técnica ni entrevistas completas.

Seguridad: el backend local filtra por la identidad docente de proceso y aula activa antes de agregar. Esta identidad es solo simulación local; para datos reales sigue pendiente Auth verificada por petición y prueba de RLS en staging. No se envían fotos, adjuntos, rutas, expectativas familiares, cuidado/alimentación, ni entrevista sin filtrar al proveedor. La reversión del panorama consiste en retirar `context_v4` de los builders y ocultar la tarjeta de UI; las fuentes confirmadas permanecen intactas.
