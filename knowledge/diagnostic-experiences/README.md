# Catálogo editorial de experiencias diagnósticas

`catalog.json` es la única fuente editable de las experiencias guiadas. Su estado actual es
`development_fixture`: sirve para comprobar el flujo y **no** es la batería pedagógica definitiva.
No se generan experiencias con IA.

Cada experiencia declara `id` estable, `ages` (3, 4, 5), título, explicación, instrucciones,
`examples` orientativos, `sort_order` y `active` para activar o retirar sin borrar historia, y
aspectos observables. Cada aspecto tiene un ID estable, pregunta breve, `competencyId` de las
14 tarjetas de Knowledge Base v4 y `patternIndex` de un referente de esa tarjeta para cada edad
en que sea aplicable. El loader comprueba IDs duplicados, competencias inexistentes, edades y
referentes ausentes antes de servir el catálogo. La aplicabilidad L2/Religión proviene del aula.

Para incorporar la futura batería: editar el JSON mediante revisión pedagógica en Git,
incrementar `version`, ejecutar `npm run validate:diagnostic-catalog`, probar los tres grupos
de edad y cambiar `status` a `reviewed` o `active` solo tras aprobación editorial. Conservar
IDs de aspectos si su significado sigue igual; usar un ID nuevo cuando cambie. Las observaciones
guardan ID, versión, título y pregunta como snapshot y nunca se reescriben al publicar una versión.
No hay panel CMS ni importación de documentos sin revisión.
