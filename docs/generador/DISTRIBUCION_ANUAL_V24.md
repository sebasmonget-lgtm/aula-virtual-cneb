# Distribución anual y alcance del chat · v24 · 2026-10-27

## Solicitud y cambios

La usuaria autoriza aplicar las observaciones pendientes al chat y al plan anual, conservando conversación y alumnos. Se mantiene la variante separada y el arreglo previo de streaming. No se modifica el Ayni original ni se publica.

El chat anual acepta prioridades amplias expresas —«higiene en general», «todas», «durante todo el año»— y puede pasar a otro aspecto pendiente. Los ejemplos concretos ayudan a comprender la necesidad sin convertir cada hábito en un proyecto de varias semanas. La definición de experiencias y materiales se profundiza después, en el chat del proyecto. Se conservan los ocho ámbitos de contexto, el cierre voluntario y la política sin diagnóstico.

El prompt anual v24 pide diseñar primero un recorrido con experiencias conectadas, distribuir y retomar aprendizajes por edad y momento del año y revisar la integración curricular. Propone explorar tres o cuatro competencias como punto de partida editorial; dos siguen siendo válidas cuando sean pertinentes. No se presenta esa cantidad como exigencia MINEDU, cuota igual para todos los proyectos o motivo para añadir competencias sin actuaciones propias. Se mantiene el mínimo contractual anterior para lectura y validación de versiones guardadas.

Se elimina la instrucción que limitaba everyday_opportunities a competencias ausentes de proyectos. Puede prever continuidad distinta y concreta en rutinas, talleres o sectores aun cuando la competencia aparezca en un proyecto, sin copiar el catálogo entero ni duplicar pares edad/competencia. La organización anual distingue jornada, hábitos sostenidos y proyectos. Los campos se sintetizan para que ampliar la selección no convierta el plan anual en el desarrollo diario completo.

## Revisión computada y compatibilidad

`document-generator-annual-distribution.mjs` calcula por edad proyectos, bimestres y oportunidades continuas; distingue presencia de retorno previsto y detecta concentración en el mínimo como punto de revisión editorial. Los recuentos no acreditan logros ni juzgan por sí solos pertinencia pedagógica. Son una revisión orientadora, no una norma curricular ni un nuevo bloqueo numérico al guardado.

El generador recibe `annual_distribution_brief` con calendario, IDs habilitados, posiciones protegidas y recuentos de la versión anterior. No incorpora nombres ni texto anterior de IA como hechos docentes. La salida validada conserva `distributionReview` en el resultado de trabajo. No hay migración, campos pedagógicos nuevos obligatorios en las fuentes guardadas ni modificación de las plantillas. Se preservan las posiciones que ya tienen proyectos o cierres mediante el mecanismo existente.

Referencias mantenidas: guía MINEDU de planificación en Inicial (https://repositorio.minedu.gob.pe/handle/20.500.12799/6518) y Programa Curricular versionado en el proyecto. La consulta web adicional de la guía devolvió verificación de seguridad; no se afirma una nueva lectura íntegra. Para la metodología de prueba de prompts se consultó la documentación oficial de OpenAI: https://developers.openai.com/api/docs/guides/prompting. Se contrastan las instrucciones con casos concretos y una generación real, no únicamente por presencia de frases en el prompt.

## Verificación real

Dos llamadas nuevas y acotadas: una continuación de chat ficticio en base temporal y un año completo en copia privada del almacén de la usuaria. Sin llamadas automáticas de reparación ni modificaciones a su conversación durante las pruebas.

El chat responde a la prioridad amplia sin volver a exigir un solo hábito: «Entendido: higiene en general y alimentación saludable durante todo el año; lavarse las manos es solo un ejemplo». Continúa preguntando por una situación comunitaria. Pasa comprobaciones de una pregunta, brevedad, ausencia de diagnóstico, no afirmar generación y sugerencias como respuestas. No se presenta un solo caso como garantía de todo diálogo posible.

La generación anual tarda 403267 ms con streaming, conserva las once indicaciones docentes y valida las quince posiciones, edades, cobertura y referentes. Uso comunicado: 42426 tokens de entrada, 26118 de salida, 68544 totales. Se revisan las quince propuestas y su distribución; se muestrean actuaciones de escritura, cantidad y motricidad de tres años, con escritura espontánea y sin copiar referentes de otra edad.

| Indicador | Versión anterior | Nueva versión |
|---|---:|---:|
| Proyectos con dos competencias | 13 | 0 |
| Proyectos con tres competencias | 2 | 11 |
| Proyectos con cuatro competencias | 0 | 4 |
| Proyectos con escritura | 1 | 6 |
| Proyectos con cantidad | 2 | 5 |
| Proyectos con motricidad | 2 | 4 |
| Proyectos con identidad | 4 | 4 |

Identidad cambia de P1/P3/P5/P6 a P1/P3/P6/P13. La propuesta nueva prevé también continuidad de identidad, convivencia, movimiento, oralidad, lectura, escritura, cantidad y aprendizaje autónomo; TIC permanece condicionada a confirmar un dispositivo. No se declara que cada competencia deba aparecer en todos los bimestres ni que la distribución constituya aprendizaje ya realizado.

Evidencias privadas: `.local/distribution-v24-chat-test.json`, `-candidate.json`, `-review.json`, `-provider-response.json` y `-acceptance.json`. La copia `generador-distribution-v24-qa-20261027` contiene contexto autorizado de esta prueba, no es una fixture ficticia. Respaldo previo en `.local/backups/distribution-v24-20261027` y comparación API anterior en `.local/distribution-v24-before.json`.

## Aplicación y conservación

Tras aceptar la prueba se guarda una versión nueva usando la cola y `useDocumentGeneratorYear` existentes con la respuesta ya generada; cero llamadas adicionales al aplicarla. Plan activo v2: `5a59a9fa-b5ff-4db6-bef6-436cb1a4410e`. El plan v1 `0c5efbb7-e2b9-419f-9f6d-4f5bedb16838` permanece en el historial con su propuesta idéntica. No se crean proyectos ni actividades por la usuaria.

Comparación exacta antes/después confirma once turnos, cuatro alumnos y colegio/aula intactos. SHA256 de conversación: `34723e5f39e84b94349a298ede101c96acbe7550e502f815c735519c6e8a89e1`. Descarga Word anual HTTP 200 sin marcadores sin resolver. Navegador muestra la propuesta de alimentación con identidad, lectura, cantidad y escritura. Almacén activo igual: `generador-prueba-chat-20261027-reinicio`; launcher 35140, web 5185/API 8805. Informe privado de conservación: `.local/distribution-v24-preservation.json`.

## Pruebas y reversión

29 pruebas distintas PASS de revisión anual, contratos editoriales, flujo documental, preparación de proyectos, conservación de versiones, fuentes y RLS. Typecheck, lint y build PASS; permanece un aviso React previo en lint completo. La simulación antigua del test integrado enviaba solo COM_ORAL como conjunto del maestro y luego esperaba un maestro con las dos competencias del proyecto. Se corrige la fixture para enviar todo el conjunto al maestro y limitar solo el primer día, sin relajar la validación de producto.

Reversión de código: volver a las reglas v23 y retirar el brief/review opcionales del adaptador; conservar el arreglo de streaming y las fuentes históricas. Revertir código no exige restaurar la base ni borrar la versión v2 o el chat. Cualquier cambio posterior del año debe pasar por el versionado y la conservación de proyectos existentes.
