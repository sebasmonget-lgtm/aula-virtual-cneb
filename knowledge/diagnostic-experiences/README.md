# Catálogo editorial de experiencias diagnósticas

`catalog.json` es la única fuente editable de las experiencias guiadas. Su estado actual es
`reviewed`, versión `diagnostic-v4.7`: revisión editorial interna de los 27 momentos de nueve
experiencias. No implica certificación del MINEDU ni validación de eficacia en aula.
No se generan experiencias con IA.

Cada experiencia declara `id` estable, `ages` (3, 4, 5), título, explicación, instrucciones,
`examples` orientativos, `sort_order` y `active` para activar o retirar sin borrar historia, y
aspectos observables. Cada aspecto tiene un ID estable, pregunta breve, `competencyId` de las
14 tarjetas de Knowledge Base v4 y `patternIndex` de un referente de esa tarjeta para cada edad
en que sea aplicable. `patternIndexByAge` permite seleccionar el referente pertinente por edad.
`moment_title`, `teacher_steps` y `look_for` son texto editorial propio: título del momento,
dos o tres acciones breves y orientación de observación. No derivar esta última concatenando
ejemplos. `age_support` y `teacher_instructions_by_age` adaptan la preparación.
El loader comprueba IDs duplicados, competencias inexistentes, edades y
referentes ausentes antes de servir el catálogo. La aplicabilidad L2/Religión proviene del aula.

Para incorporar la futura batería: editar el JSON mediante revisión pedagógica en Git,
incrementar `version`, ejecutar `npm run validate:diagnostic-catalog`, probar los tres grupos
de edad y cambiar `status` a `reviewed` o `active` solo tras aprobación editorial. Conservar
IDs de aspectos si su significado sigue igual; usar un ID nuevo cuando cambie. Las observaciones
guardan ID, versión, título y pregunta como snapshot y nunca se reescriben al publicar una versión.
No hay panel CMS ni importación de documentos sin revisión.

La versión 4.5 ordena los momentos para que formen una experiencia, separa lectura, oralidad y
escritura intencional, y excluye criterios de escritura a los tres años según la KB vigente.
Los nuevos IDs `write_message`, `read_own_message` y `gratitude_and_tradition` distinguen
cambios de significado de los aspectos históricos. Estos últimos conservan sus snapshots.
El mapa legacy de instrucciones es solo un fallback de compatibilidad, no otra fuente editorial.

La versión 4.6 añade dos experiencias para 5 años: planear/probar/revisar un reto (aprendizaje
autónomo) y explorar/crear un registro digital con acompañamiento (TIC). Esta última declara
`required_resource: digital_creation`: es una propuesta condicional, no una afirmación de
disponibilidad. Solo realizarla si la docente cuenta con un dispositivo adecuado; sin cuentas,
internet, publicación ni imágenes de personas. Sin dispositivo no se fabrica una observación
ni se interpreta dificultad. No se añaden desempeños transversales de 5 años a 3 o 4 años.
El validador comprueba que el conjunto ofrezca oportunidades para cada competencia aplicable
por edad/L2/Religión. No impone completar todas ni observar a todos en una misma actividad.

Referencia curricular: KB v4 versionada y Programa Curricular de Educación Inicial del MINEDU.
Revisión y límites: `docs/qa/QA_GUIADAS_EDITORIAL_2026-10-16.md`. Ejecutar también las pruebas
`diagnostic-editorial`, `diagnostic-ui-flow`, `diagnostic-experiences-v4` y `diagnostic-sources-v4`.
