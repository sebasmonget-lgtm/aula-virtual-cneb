# Maestro secuencial v30

## Problema y cambio mínimo

La revisión docente del P03 pide progresión, no catorce propuestas que solo comparten tema. V3 fijaba fechas, títulos, focos y acciones distintas por texto, pero no expresaba qué aportaba cada experiencia al recorrido. Cambiar participantes repetidamente podía superar la validación sin hacer avanzar el reto.

Solo proyectos nuevos reciben planificación documental V4. La preparación, esquema privado, validación, guardado, actividades/lotes y exportación mantienen un flujo vertical; sin migraciones ni actualización retrospectiva de datos. El anual v24 y chat v29 conservan sus contratos. Las nuevas respuestas de generación se identifican como `ayni-documents-project-v30`.

## Maestro y actividades

El maestro establece `sequence.sharedChallenge` y `sequence.intendedOutcome` desde la intención docente y su conversación completa. Ese propósito se guarda al crear el proyecto nuevo, en lugar de copiar automáticamente el propósito general del año. La pregunta de su Word usa el reto del maestro. El año y los proyectos anteriores no cambian.

Cada fecha guarda `previousActivityPosition`, `startingPoint`, `expectedContribution` y `newChallenge`, además de su acción, evidencia y decisiones infantiles. El aporte es una previsión (información, alternativa, decisión, preparación o versión de un mensaje), no un aprendizaje acreditado.

Para evitar dos copias independientes producidas por IA, el esquema privado NO pide `startingPoint`. El servidor lo deriva del aporte anterior ya generado; el primer día parte del reto común. No se reescriben textos explícitos incorrectos: se rechazan las discordancias. La validación comprueba eslabón inmediato, orden, avances no idénticos y campos completos, manteniendo la comprobación de fechas/edades/competencias/referentes.

Las actividades reciben el día completo con su aporte anterior y reto nuevo. El prompt exige retomar brevemente, desarrollar la acción nueva y conservar algo útil para continuar. Si no hubo registro, recoger ideas actuales sin inventar resultados ni repetir toda la experiencia. Retomar una acción es pertinente si hay nueva información, dificultad, decisión o uso; cambiar título o materiales no acredita progresión.

Los nuevos resúmenes de acción tienen una oración breve (objetivo editorial 100–180 caracteres) y margen de 420 para terminarla. Acción, aporte y nuevo reto requieren terminación de oración en el contrato V4; no se recortan palabras. Esto detecta fragmentos como los de P03, pero no sustituye una revisión gramatical o semántica completa.

V1/V2/V3 siguen leyéndose con sus reglas originales, incluidos textos históricos inconclusos. Nuevas preparaciones cambian de marca a V4; las ya iniciadas mantienen su versión y fuente capturada. No se recalcula una captura para retomar pendientes.

## Verificaciones estructurales ejecutadas

Sesenta y dos pruebas de regresión PASS, incluyendo siete de ruta con V3/V4, API una edad y multiedad, límites curriculares, autorización, atomicidad, reanudación, Word e historial. Se prueba que la IA no devuelve el enlace derivado, que el servidor lo incorpora sin modificar el objeto original, que cada actividad recibe la ruta V4 y que una referencia futura, avance idéntico, inicio incoherente o frase sin terminar no se acepta. Nueva creación conserva su propósito propio; V3 no se amplía ni se valida retroactivamente con reglas V4.

Typecheck y build PASS. Lint sin errores, con el aviso React previo de diagnostic-generation-control. El esquema añade metadatos en la llamada habitual del maestro; no introduce una llamada separada de revisión ni reintentos automáticos.

## Prueba real aislada completada

`scripts/verify-generator-daily-route-live.mjs --sequential` usa un almacén QA propio, cuatro estudiantes ficticios y una copia del tramo P03. Reproduce cinco intercambios anteriores y agrega una precisión ficticia de modalidad y recursos: combinar cocina de juguete con una preparación fría real, receta ilustrada y alimentos autorizados listos para mezclar. Esa precisión es exclusivamente del caso QA; no se atribuye a la usuaria ni se modifica su chat.

Se mantiene un límite de cuatro solicitudes reales: maestro/primer día y tres lotes para catorce fechas. El maestro se revisa antes de autorizar los lotes. Capturas de solicitudes/respuestas y uso sin secretos en `output/generador-documentos/secuencia-proyecto-v30/iteracion-01/`. Cero llamadas anuales o de chat reales. Los quince Word y su ZIP se exportan con los escritores de Ayni, sin retoques manuales.

El maestro real ya propone una cadena reconocible: preguntas del juego → consulta de receta → ensayos de mezcla y cuidado → recordatorios → organización/revisión del reparto → ensayo integrado → preparación real → relectura y comunicación a familias → revisión final. Dos experiencias de reparto tienen propósitos progresivos (organización inicial y respuesta a un cambio), en vez de cuatro repeticiones casi equivalentes. Las notas se usan como recordatorios internos y luego para comunicar a destinatarios distintos. La prueba termina con catorce actividades válidas, todas correspondientes a sus fechas, títulos, competencias y referentes del maestro. Trece enlaces consecutivos comprobados; acciones de hasta 168 caracteres, completas. Se leen todos los momentos, progresiones y focos diarios de las actividades.

## Límites y reversión

Dependencias correctas y textos distintos no prueban por sí solos coherencia pedagógica de cualquier tema. `newChallenge` hace explícita la justificación y permite revisar el maestro; la prueba real requiere lectura de todas las acciones y de sus actividades. No se afirma eliminar toda repetición ni garantizar ausencia de fallos de proveedor. El recorrido sigue siendo una previsión adaptable a decisiones infantiles reales.

Para volver a preparar con V3 se puede revertir la marca de nuevas preparaciones y la selección del esquema. Conservar los lectores V4 si existen proyectos nuevos guardados. No restaurar respaldos sobre trabajo docente posterior ni regenerar proyectos anteriores para aplicar esta mejora.


## Evidencia final de generación y Word

Cuatro llamadas reales completadas sin fallo ni reintento: 126254 tokens de entrada y 25313 de salida; coste registrado estimado USD 0.191584775. Tiempo acumulado de proveedor 334308 ms. El tiempo no se presenta como garantía ni como comparación con otra generación. Uso, respuestas, maestro, documentos y verification.json en la carpeta de prueba. La revisión de coherencia no añade una llamada separada.

Quince Word/65 páginas renderizadas e inspeccionadas en ocho hojas de contacto; guía de preparación y ruta central también abiertas a tamaño individual. Maestro de nueve páginas, catorce actividades de cuatro. La mejora no se presenta como reducción del total de páginas. Misma estética, fuentes y papelería; cero texto fuera de página y guías completas de Inicio/Desarrollo/Cierre. ZIP de quince documentos cotejado con 527 partes OOXML de los Word exportados. No se editan los textos generados para la entrega.

La utilidad del ejemplo real depende de su contexto QA expresamente aclarado: receta ilustrada y alimentos autorizados disponibles. No se atribuyen esos recursos al aula de la usuaria y no se da por resuelto el hallazgo anterior de recursos inventados o no aportados en todos los temas.

El primer render produjo PDF pero ninguna imagen para tres nombres largos en Windows, pese a salida cero del helper. Se diagnosticaron sus logs. El wrapper admite raíz corta y alias para QA y exige todas las imágenes; se renderizan de nuevo los tres archivos sin alterar su contenido. El conjunto final sí contiene todas las imágenes. No es un fallo de descarga ni una modificación de nombres docentes.

Activación final: launcher 26468, mismo almacén local y respaldo project-sequence-v30-before-activation. Workspace, planes y chats comparados exactamente: cuatro alumnos, veinte turnos, dos proyectos y veinticuatro actividades intactos. Veintiséis cuerpos Word docentes conservan el mismo hash. Web/API operativas; recibo privado .local/project-sequence-v30-preservation.json. No commit, push, despliegue ni cambios al checkout original.
