# Coherencia editorial de entrevista familiar — 2026-10-16

Base: `23082282fb58f63c1f4876aa83c9e6ce3c6d99b0`.
Rama: `codex/interview-editorial-20261016`. Revisión de seis preguntas y 61 opciones visibles.
Se conservan las seis dimensiones acordadas, todas opcionales, los IDs de opciones y las claves
de respuesta v2. No hay migraciones, respuestas inventadas, reescritura de entrevistas ni IA nueva.

## Revisión de pregunta y respuesta

| Dimensión | Pregunta y opciones tras revisar |
| --- | --- |
| Intereses | Distingue actividades que disfruta y temas que le interesan; acepta categorías como animales o cuentos y un ejemplo/negación libre. |
| Juego | Pregunta cómo juega a solas y con otras personas; las opciones permiten distintas formas según el contexto, sin forzar una alternativa excluyente. |
| En casa | Pide qué hizo, dijo o intentó en una situación, además de los gustos. Opciones son acciones: armar, contar, mirar libros, etc. |
| Comunicación y lenguas | Separa forma de hacerse entender y lenguas escuchadas/usadas. No supone que habla cada lengua que oye. |
| Familia y comunidad | Pide actividades, lugares o costumbres compartidas; aclara que los botones son categorías y permite concretar qué hace/con quién. |
| Acompañamiento | Pregunta qué ayuda a sentirse a gusto y participar; opciones son apoyos concretos y se mantiene texto libre. |

No se alteran las opciones históricas de autonomía, apoyos emocionales o educación previa que
no forman parte de las seis preguntas activas. No se reincorporan preguntas antiguas descartadas.
La alias histórica naturaleza/plantas permanece legible sin presentar dos botones iguales.

## Errores reproducidos y correcciones

1. Pregunta principal decía «escucha o usa» pero el seguimiento solo «¿Con quién usa…?».
   Ahora mantiene ambas posibilidades y usa el nombre indicado al seleccionar «Otra lengua».
2. Familia/comunidad preguntaba qué era importante, pero ofrecía categorías sin explicar cómo
   responder. Se alinea la pregunta con las opciones y se mantiene espacio para una experiencia.
3. Un resumen con varias lenguas y un único interlocutor descartaba las otras lenguas. Se
   conservan todas las seleccionadas, incluso sin interlocutor, y el nombre personalizado.
4. El prefijo «le gusta» ante texto libre producía frases incorrectas o invertía el sentido de
   «No le gusta…». Se usa atribución neutral y se conserva la aclaración incluso con botones
   seleccionados. Puntuación de enlace normalizada solo en el resumen, fuente original intacta.
5. Cualquier opción de comunicación, incluso necesitar tiempo o hablar poco al inicio, activaba
   una pista que afirmaba que disfrutaba conversar. Ahora orienta qué observar sin inventar ese
   gusto. Pistas de exploración, construcción y juego también conservan atribución neutral.

Las pistas siguen siendo situaciones sugeridas para observar; nunca se incorporan como hechos
observados, valoración o evidencia curricular. Seleccionar categorías familiares tampoco prueba
que el niño ya desarrolla una competencia. No se modificaron modelos ni llamadas de IA.

## Validación ejecutada

- 36 tests distintos PASS: `family-interview-redesign`, `diagnostic-ui-flow`,
  `diagnostic-sources-v4`, `interview-interest-counts`. Los nueve de rediseño se repitieron tras
  ajustar puntuación y lista de lenguas. Incluyen todas las opciones aceptadas por servidor,
  conteo de una pregunta por opción, negaciones, lenguas, versión histórica, guardado idempotente,
  atribución familiar, exclusión de evidencia y exportación de entrevista.
- Una aserción antigua exigía la palabra «profesora» en la sexta pregunta; se actualizó a su
  propósito de acompañamiento. Una aserción nueva inicialmente coincidía también dentro de una
  negación; se corrigió para comprobar ausencia de afirmación añadida. Resultado final verde.
- TypeScript y lint PASS; detector Impeccable sin hallazgos. Builds Vinext/Next local ejecutados
  y build final exacto de Preview verificado mediante recibo de publicación.
- UI real en base local nueva: cuenta/aula ficticia y tres niños. Las seis preguntas se recorren
  en blanco: cero opciones seleccionadas, 0/6 respuestas y confirmación deshabilitada.
- Se seleccionan opciones coherentes y ejemplos, tres lenguas (castellano, quechua, asháninka),
  solo un interlocutor y una aclaración negativa de gustos. Confirmación por interfaz crea v1;
  recargar conserva seis respuestas, texto original, selecciones y nombre de otra lengua.
- API de lectura comprueba la fuente confirmada y el resumen derivado, sin SQL. La fuente
  preserva literalmente la negación y el resumen incluye todas las lenguas. Hoja imprimible
  generada con el lector existente y comprobada en tests; no nueva inspección física de impresión.
- Escritorio1366 y móvil390, sin desbordamiento observado en la pregunta multilingüe. Capturas
  y recorrido en `evidence/entrevista-editorial-20261016/`.

Entorno: frontend3421/API3422, PGlite y almacenamiento privados nuevos sin secretos cloud ni
proveedor IA. Alta/matrícula por API; respuestas y confirmación por interfaz. No se revalidó
dictado de hardware ni RLS cloud en esta ronda. Sin escrituras pedagógicas cloud porque Preview
y Producción comparten conexión. Costo adicional de IA: **USD0**.

## Publicación y rollback

Solo Preview desde commit identificable/árbol limpio y smoke anónimo. Recibo local de publicación
verifica SHA, target y que Producción conserve `dpl_H19YWzRdGjkgh8y72QAd1qBty7Mf` /
`9a0920230350cd6b9050f35683a1f35d459e78c7`. No se promociona ni toca su configuración.
Rollback: revertir este commit o usar el Preview anterior
`https://ayni-aula-staging-22bjlu7pd-ayni4.vercel.app/`. No restaurar bases ni borrar entrevistas.
