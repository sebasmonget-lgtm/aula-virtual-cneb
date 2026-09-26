# Actividad principal y taller del día

## Flujo

1. El Project/Unit Master confirmado conserva su `activity_route`. El Plan Anual y los proyectos históricos no se migran ni se reescriben.
2. Sol medium recibe edad, CNEB filtrado, contexto del aula, prioridades anuales disponibles, proyecto y ruta confirmados, y conteo de oportunidades de las actividades principales. Devuelve un `workshop-master-v1` con un taller por posición. No recibe fichas al elegir competencias.
3. El servidor busca fichas **después** de la competencia e intención. Solo ofrece PDF reales de MINEDU con edad exacta, mapeo CNEB compatible y coincidencia de acciones. Puede dejar `sheet_id = null`. La docente edita y confirma el maestro; una versión nueva no modifica días ya confirmados.
4. Al preparar una actividad, Luna desarrolla la actividad principal desde la ruta y otro llamado Luna desarrolla `workshop-v1` desde el Workshop Master confirmado. El servidor guarda ambos borradores en una transacción y exige revisar ambos para confirmarlos juntos.
5. El Word lee esos datos confirmados. Usa la plantilla `actividad-aprendizaje-inicial-con-taller-v1.docx` intacta, llena su sección VIII y anexa todas las páginas del PDF real de la ficha al final cuando existe. Sin ficha no añade páginas.
6. Hoy recibe dos bloques con IDs de actividad diferentes. El taller tiene criterio propio; las observaciones posteriores se asocian a ese ID y competencia. Las observaciones no se generan por IA.

## Contratos y referencias

- `learning_experiences.type='workshop'` con `parent_project_id` identifica al Workshop Master. Esto coexiste con talleres históricos independientes sin `parent_project_id`.
- `activities.linked_main_activity_id` y `workshop_item_index` vinculan la actividad diaria con su taller. Los triggers verifican aula, proyecto y fecha; los índices impiden dos borradores o dos confirmados del mismo día y maestro.
- `workshop-master-v1` guarda título, tipo, competencia, propósito, motivo, foco de observación, materiales, recorrido breve y ficha opcional por día.
- `workshop-v1` guarda título, tipo, competencia, propósito, criterio/foco, inicio, desarrollo, cierre, evidencia esperada, materiales y ficha opcional.
- La ficha se lee desde `AYNI_SHEET_LIBRARY_DIR` o la biblioteca local auditada. El servidor verifica el SHA del PDF antes de renderizarlo. Un entorno PostgreSQL remoto necesita acceso a esa biblioteca o un adaptador privado equivalente antes de permitir descarga de fichas; no se despliega esta función en este cambio.

## Prueba y rollback

- Prueba aislada: `node --env-file-if-exists=.env.local scripts/smoke-daily-workshop.mjs`. Usa datos ficticios y la API real; produce DOCX y JSON bajo `.local/qa/daily-workshop/`. La confirmación docente en esa prueba es un estado sintético, no un cambio en el aula real.
- Pruebas de contrato, catálogo y Word: `node --test src/lib/workshop-flow.test.mjs scripts/daily-workshop-persistence.test.mjs`.
- Para rollback de aplicación, volver al commit previo a este flujo. Las migraciones añaden columnas y triggers sin reescribir filas existentes; se conservan para evitar perder vínculos creados durante la prueba.

## Error detectado durante la integración

- **Síntoma:** la consulta inicial del maestro de talleres fallaba al leer el aula.
- **Causa:** intentaba consultar `classrooms.group_context` y `classrooms.diagnostic_summary`, columnas inexistentes. El contexto grupal está en `classrooms.context` y la síntesis se obtiene desde el flujo diagnóstico.
- **Solución:** se lee `classrooms.context` y se evita asumir columnas nuevas. Una prueba de ruta sobre base fresca debe proteger esta consulta.
