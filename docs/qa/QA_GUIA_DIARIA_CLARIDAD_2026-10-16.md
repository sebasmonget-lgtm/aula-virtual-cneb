# Claridad de las actividades diarias — 2026-10-16

Base: `3e964b3fcad67ce423b5982353aacab496e60236`.
Rama: `codex/daily-guidance-quality-20261016`.

## Pregunta y diagnóstico

La frase repetitiva del diagnóstico provenía de `guidedObservationLookFor`, corregida en v4.5.
Las actividades diarias se presentan mediante `activityPedagogicalBlocks` y `PedagogicalBlock`:
no utilizan esa concatenación de ejemplos. La guía de generación ya pide Inicio/Desarrollo/Cierre
separados para niños y docente, instrucciones prácticas y preguntas no redundantes.

Se releyeron **13 respuestas reales guardadas** del QA del 15 de octubre, sin nuevas llamadas:
`real-response-9` a `14`, `20` a `23` y `38` a `40` en el archivo local de QA.
Corresponden a secuencias de ciencias/lectura/comunicación, convivencia/identidad y arte/movimiento.
No se encontró el mecanismo de concatenación ni dos ejemplos casi iguales como en la captura.
Las actividades retoman contexto compartido porque forman una secuencia: esa continuidad no
equivale por sí sola a redundancia. No se declara revisada cada generación posible ni todos los
proyectos/edades: son muestras históricas reales, no una nueva prueba del prompt modificado.

Ejemplo coherente: «Volvemos a probar y comparamos» propone retomar una idea anterior, elegir
si repetir o cambiar algo y contrastar lo ocurrido. La mediación pregunta qué ocurrió ahora y
qué pensaba antes; la evidencia prevista concreta la relación entre idea y resultado. No inventa
que el niño ya lo logró. Arte admite movimiento sentado, distintas elecciones y participación
voluntaria, sin exigir que todos produzcan lo mismo.

## Dos defectos focales encontrados y corregidos

1. La presentación usaba el criterio como respaldo de evidencia ausente, repitiéndolo bajo otro
   encabezado. Ahora muestra evidencia solo cuando existe texto propio distinto del criterio;
   también evita duplicación exacta en la vista compacta. Comparación literal tras trim, sin
   pretender detectar equivalencia semántica. Los campos guardados y Word permanecen intactos.
2. La skill de generación aún decía que la docente podía modificar después decisiones heredadas
   de una actividad. Se alinea con la regla vigente: no edición individual de confirmadas;
   cambios futuros como nueva secuencia completa aprobada. Se añaden pautas de redacción:
   acciones concretas, roles complementarios, sin paráfrasis encadenadas, señal observable
   contextualizada, gramática y continuidad. No se modifican modelos, payloads ni contratos.

Estos ajustes reducen fallos concretos; no certifican automáticamente la calidad pedagógica de
todo texto de IA. Los validadores estructurales existentes comprueban contratos, no sustituyen
lectura pedagógica. No se añade un filtro semántico improvisado que rechace textos válidos o
provoque reintentos pagados. No se regeneran actividades confirmadas ni se reescribe historia.

## Validación

- 16 regresiones PASS: `pedagogical-blocks`, `activity-reading-content`, `ai-activity-ui-service`,
  `activity-runner`, `activity-version-service`. Conservación de criterio/herencia, secuencia,
  historial y navegación por momentos; sin proveedor real.
- QA UI del componente real con datos sintéticos: seis casos (vista normal/compacta × evidencia
  ausente/idéntica/distinta). Criterio aparece una vez; evidencia propia aparece cuando existe.
  El callback de registro mantiene `criterio-qa` y momento `development` en todos los casos.
- Escritorio1366 y móvil390: sin desbordamiento; captura visual. Fixture de consulta sin DB,
  por lo que no se afirma nuevo guardado de observaciones end-to-end en esta ronda.
- TypeScript, lint, build Vinext y build Next webpack PASS; detector Impeccable sin hallazgos.
  El recibo local de publicación conserva estado definitivo, SHA y smoke del Preview.
- Cero llamadas nuevas a IA, USD0. Sin escrituras pedagógicas cloud ni Producción.

Evidencia: `evidence/guia-diaria-claridad-20261016/`. Rollback de producto: revertir el commit de
esta rama o usar el Preview anterior `https://ayni-aula-staging-p12c9isai-ayni4.vercel.app/`.
No hay migración ni necesidad de restaurar bases. El endurecimiento del prompt requiere futuras
muestras reales para medir su efecto; no se atribuye ese resultado a las respuestas anteriores.
