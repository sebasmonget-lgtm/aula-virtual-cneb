# Proyecto, talleres y preparación diaria

## Decisión vigente

El Project/Unit Master confirmado contiene **una actividad prevista por cada fecha lectiva seleccionada**. Cada fila conserva posición, fecha, título, propósito, competencias, criterio, evidencia posible, materiales, mediación y continuidad con las filas vecinas. La IA diaria desarrolla una fila; no rediseña el recorrido. Una fila puede continuar una experiencia anterior.

La profesora puede crear una versión nueva del proyecto o unidad y revisar filas futuras. La versión anterior, sus actividades, criterios, evidencias y evaluaciones mantienen sus IDs y relaciones. El servidor impide cambiar, omitir o reprogramar una fila pasada o con registros de ejecución/evidencia. El calendario confirmado se hereda al crear la nueva versión; los cambios de fechas futuras se revisan en el mapa antes de confirmar. `teacher_overrides` deja constancia de los campos modificados. El Word sale de la versión confirmada vigente; las anteriores permanecen consultables.

## Talleres

El Workshop Master se propone **después** del Project/Unit Master. Mantiene una sugerencia por fecha, pero cada día puede ser `suggested`, `accepted`, `continued`, `changed` o `none`. Una continuación debe corresponder a un taller elegido del día anterior con la misma competencia y tipo. La profesora puede ignorar el Workshop Master y preparar igualmente la actividad principal.

“Preparar día” genera la actividad principal desde la fila confirmada. Solo genera el taller si hay un Workshop Master activo y la opción de ese día fue elegida. Si falla el taller opcional, se entrega la actividad principal con un aviso. Antes de guardar un borrador nuevo, la profesora puede escoger guardar solo la actividad. Si existen ambos borradores, se guardan y confirman juntos con sus propias relaciones; no se inventan registros posteriores.

## Contratos de contexto de IA

| Workflow | Decisiones y contexto enviados | KB v4.1 y límites |
| --- | --- | --- |
| Preplan | Síntesis grupal y prioridades confirmadas, intereses, entorno, calendario, edad, tarjetas CNEB aplicables y 12 espacios calculados por código | Retrieval focalizado en prioridades aplicables; solo datos didácticos pertinentes. Devuelve 12 propuestas editables, sin desarrollar actividades. |
| Project/Unit Master | Propuesta y propósito elegidos, preguntas/criterios revisados, fechas lectivas confirmadas y tarjetas de competencias elegidas | Retrieval por edad y competencias confirmadas. Devuelve todas las filas, una por fecha; código valida fechas, competencias, cardinalidad e IDs. |
| Workshop Master | Fundamento del proyecto, mapa confirmado, prioridades y competencias aplicables, cobertura curricular | Retrieval didáctico de talleres por competencias pertinentes. Devuelve sugerencias; las fichas se eligen después de fijar intención y competencia. |
| Actividad | Fundamento y decisiones confirmadas del proyecto, **fila actual**, posición, fila anterior/siguiente, contexto docente actualizado y referente curricular de la edad | `buildAIContext` hace retrieval focalizado en una competencia. No se manda otra copia del mapa completo ni archivos de evidencias de menores. |
| Taller diario | Fundamento confirmado, opción elegida para ese día, vecinas, actividad principal y ficha seleccionada, si existe | Retrieval solo para la competencia del taller. Conserva tipo, competencia y ficha. |
| Criterio/evidencia y evaluación | Actividad y criterio confirmados, evidencias reales autorizadas y período, según el contrato del workflow v4 | Retrieval focalizado; la IA no inventa evidencias ni fija el nivel final. |

El loader/retrieval conserva la secuencia `workflow → edad → competencia → aplicabilidad → dominio → ranking`. Las tarjetas CNEB son autoridad curricular; las unidades didácticas v4.1 orientan mediación, acciones infantiles, materiales y observación. `src/lib/direct-ai-context-contracts.mjs` construye las proyecciones directas de proyecto/actividad; `src/lib/ai-focused-knowledge.mjs` acota la KB de preplan, proyecto/unidad y talleres. Los demás workflows mantienen `buildAIContext` y sus límites existentes. No se cambian modelos ni routing.

## Verificación y rollback

Comprobar mapa completo, taller omitido/aceptado/continuado, actividad principal sin taller, Word con y sin taller, copia V2 con pasado protegido y fecha futura editable, aislamiento por aula, y pruebas de KB/contexto. Los commits son incrementales: para revertir un bloque, revertir su commit y conservar la versión de datos anterior. No modificar migraciones aplicadas ni reasignar IDs históricos.
