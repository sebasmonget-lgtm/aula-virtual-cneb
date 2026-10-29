# Pruebas reales del chat para Mi año — 2026-10-25

Esta es la muestra inicial v3. Las dos iteraciones posteriores, política vigente v5 y recorrido visual están en `ITERACIONES_Y_RECORRIDO_FINAL.md`.

Resultado: cinco respuestas reales de conversación con gpt-6-luna, una tentativa por llamada, sobre tres cuentas ficticias en un almacén independiente. No se generó ni confirmó un año real, no se usaron datos de la profesora ni de sus niños y no se hicieron reintentos. La historia antigua del quinto caso se sembró con una respuesta simulada, identificada como tal; la respuesta de recuperación sí es real.

## Resultado revisado

| Caso | Resultado observado |
| --- | --- |
| inicio-sin-idea | Pide entorno y espacios, sin repetir edades ni exigir proyectos. |
| contexto-completo | Reconoce recursos y restricciones; propone crear sin preguntar de nuevo. |
| salida-voluntaria | No añade preguntas, conserva la restricción de compras y señala el botón. |
| una-edad-pocos-recursos | Ofrece tres opciones viables con salón/cuentos y una sola elección. |
| recupera-historia-anterior | Corrige la exigencia histórica, confirma que no necesita diagnóstico y permite crear. |

## Ejemplos de respuestas reales

### inicio-sin-idea

Profesora: Quiero preparar Mi año, pero no sé qué información necesitas.

Ayni: ¡Claro! Para empezar, cuéntame dónde será el aula y qué espacios podrán usar, por ejemplo, un patio o un jardín.

Opciones para responder: Aula con patio; Aula en casa; Aula y espacio exterior

### contexto-completo

Profesora: La escuela está en zona semirrural. Tenemos patio, cuentos, bloques, disfraces y un pequeño huerto. Escasea el agua y hace frío en algunos meses. Quiero empezar con adaptación, seguir con organización del aula y familia, y dar oportunidades de autonomía.

Ayni: Gracias, ya tengo lo necesario para una primera propuesta de Mi año 2026: aula en zona semirrural, patio y pequeño huerto, con cuentos, bloques y disfraces; el agua escasea y algunos meses hace frío. Plantearé comenzar con la adaptación, continuar con la organización del aula y la familia, y ofrecer oportunidades para la autonomía, considerando esas condiciones. Puedes pulsar **Crear Mi año**; luego podrás ajustar la propuesta.

Opciones para responder: ninguna; no obliga a seguir respondiendo.

### salida-voluntaria

Profesora: Con eso basta. No quiero responder más preguntas; quiero crear Mi año sin diagnóstico y sin pedir compras a las familias.

Ayni: De acuerdo, no necesitas responder más ni enviar un diagnóstico. Tengo en cuenta el patio, el pequeño huerto y los materiales disponibles, así como la escasez de agua y el frío en algunos meses. La propuesta comenzará con la adaptación y seguirá con la organización del aula y la familia, ofreciendo oportunidades de autonomía sin pedir compras a las familias. Puedes pulsar **Crear Mi año**; después podrás ajustar la propuesta.

Opciones para responder: ninguna; no obliga a seguir respondiendo.

### una-edad-pocos-recursos

Profesora: No tengo ideas de proyectos ni muchos materiales. Solo tenemos el salón y algunos cuentos. Ayúdame a encontrar por dónde comenzar.

Ayni: Está bien comenzar con lo que ya tienen: el salón y algunos cuentos. Podemos explorar posibilidades sencillas que no requieran muchos materiales.

¿Qué te gustaría priorizar al inicio: conocerse y convivir, escuchar y crear cuentos, o explorar el salón y sus espacios?

Opciones para responder: Conocerse y convivir; Escuchar y crear cuentos; Explorar el salón

### recupera-historia-anterior

Profesora: ¿Tengo que enviar el diagnóstico? Quiero preparar el año con lo que ya te conté.

Ayni: No, no necesitas enviar ningún diagnóstico. Ya tengo en cuenta que el aula reúne a una niña o un niño de 3 años y otro de 4, que cuentan con patio y cuentos, y que quieres comenzar con adaptación y convivencia usando lo disponible, sin pedir compras. Puedes pulsar **Crear Mi año** para preparar la propuesta.

Opciones para responder: ninguna; no obliga a seguir respondiendo.

## Cambios aplicados

Política `ayni-documents-v3`. El chat recibe un resumen específico de edades/cantidades, calendario configurado, nombres oficiales de competencias e indicaciones vigentes, en lugar del paquete completo de generación anual con sus quince tramos e instrucciones de producción. Las lecturas, revisiones y pendientes de diagnóstico siguen fuera de este resumen. El año completo sigue recibiendo el currículo y sus referentes oficiales por su servicio original.

La conversación elige solo un vacío de información útil, evita repetir respuestas, ayuda con alternativas si no hay ideas y permite crear con contexto suficiente o por elección docente. No describe diagnóstico como pendiente; si un mensaje viejo lo pidió, aclara que no se necesita. Las sugerencias son respuestas posibles, no preguntas adicionales. No se cambió la interfaz ni se reescribió el historial existente.

## Verificación y límites

28 pruebas automatizadas del chat/contratos originales correctas (`npm run test:documentos:chat`); typecheck, lint y build correctos. Lint conserva el aviso previo de `diagnostic-generation-control.tsx`; build conserva avisos de PGlite/eval y chunks. Los controles léxicos de QA no se usan para censurar, reparar ni aprobar automáticamente respuestas de producción. Se revisó además el contenido de las cinco respuestas: contexto, concisión, elección de una pregunta y respeto de las restricciones de agua/materiales/compras.

La entrega del contexto al servicio anual se comprobó con un proveedor inyectado simulado, sin cobro: entorno semirrural, escasez de agua, adaptación, autonomía y no pedir compras permanecen en las indicaciones docentes. El servicio de una edad mantiene sus citas literales. Cero diagnósticos, planes canónicos, notas y conclusiones creados en ese almacén. Esto verifica el traspaso de fuentes; no constituye una nueva evaluación semántica del plan anual completo.

Cinco respuestas son una muestra acotada; no garantizan todas las conversaciones posibles. Los límites canónicos de texto y treinta turnos V2 existentes se conservan. No se publica ni se modifica el Ayni original. Para rollback, revertir el resumen y la política a v2; conservar todos los almacenes e historiales y no regenerar automáticamente.

Recibo: `output/generador-documentos/generador-chat-real-1792973791759/receipt.json`.

## Referencia de método

Se consultó [OpenAI Docs: Prompt engineering](https://developers.openai.com/api/docs/guides/prompt-engineering), sobre instrucciones claras, contexto y evaluación mediante ejemplos. La aprobación de esta muestra procede de las respuestas conservadas, no de una garantía de esa documentación.
