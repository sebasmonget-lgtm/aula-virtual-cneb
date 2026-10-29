# Validación real V34 y protección de campos compartidos

2026-10-28. Solicitud: generar un proyecto completo de prueba con Ayni y revisar los requisitos acordados. Prueba aislada de animales, aula ficticia LILA de 3, 4 y 5 años, cuatro niños. La cuenta docente no se usa para crear este proyecto.

## Incidencia encontrada por la prueba completa

Las dos primeras preparaciones se detuvieron antes de obtener maestro: `provider_invalid_response`. La consulta del response ID privado confirmó status `incomplete`, razón `max_output_tokens`, salida vacía y uso reportado cero. El esquema fue aceptado por HTTP 200; no era un rechazo HTTP del formato. No se guardaron proyectos incompletos ni se reescribieron fuentes docentes.

La protección V34 de prosa española recorría un esquema clonado con objetos compartidos. `structuredClone` conserva esas referencias: apertura/desarrollo/cierre del maestro podían apuntar al mismo objeto de esquema. Cada visita anteponía otra restricción anclada; aparecían patrones con tres anclas de inicio. La comprobación corta anterior no tenía campos compartidos y no reproducía este caso.

Corrección general en `document-generator-spanish-schema.mjs`: recorrer cada objeto una sola vez mediante WeakSet y reconocer el prefijo ya aplicado para que la transformación sea idempotente. No se quita la protección de idioma ni se reduce el currículo. Es común a maestro, actividad individual y lote; las fuentes guardadas no se modifican.

Comparación A/B con el esquema completo, misma tarea técnica/modelo y límite de 256 tokens: esquema original con anclas repetidas produjo cero tokens; esquema con una ancla produjo 256 tokens (165 de razonamiento), con uso de entrada reportado. Ambas terminaron incompletas por el límite deliberadamente pequeño de esa comprobación técnica. Esta comparación prueba la diferencia del decodificador, no la calidad pedagógica de un proyecto completo. Recibos privados `.local/v34-schema-ablation-original.json` y `v34-schema-ablation-single.json`.

Se ensayó un presupuesto explícito mayor en la segunda preparación y no resolvió el problema; ese cambio se retiró. Se conservan modelos, esfuerzos de razonamiento, transporte recuperable y presupuestos anteriores. La documentación oficial explica que `max_output_tokens` puede señalar una respuesta incompleta sin texto visible; el mensaje por sí solo no demostraba la causa interna de esta incidencia. Fuente consultada: [OpenAI, Reasoning models — Allocating space for reasoning](https://developers.openai.com/api/docs/guides/reasoning).

Regresiones: 70 comprobaciones PASS en diez archivos, incluida una nueva con el esquema completo de diez días, campos compartidos, una sola ancla y doble aplicación sin cambios. Typecheck/build PASS y lint de los archivos modificados sin errores. Evidencia privada `.local/validacion-real-v34-final-tests.log`, `validacion-real-v34-final-typecheck.log`, `validacion-real-v34-final-lint.log`, `validacion-real-v34-final-build.log`.

## Alcance de la prueba pedagógica

Contexto sintético: interés general por mascotas, gallinas y ovejas, sin anécdota concreta; posibilidad de observación a distancia y materiales básicos. Tres competencias: Indaga, Lectura y Cantidad. No se entrega un episodio ni se ordena en el caso qué desempeño seleccionar: lo deben resolver las reglas compartidas. Las respuestas docentes/contexto se preparan como fixture; maestro y actividades se solicitan a IA real mediante la cola y los renderizadores productivos. No es una prueba manual del chat anual ni un recorrido de clicks.

Carpeta de la ronda completa tras corregir: `output/generador-documentos/secuencia-proyecto-v30/validacion-real-v34/iteracion-03/`. Las rondas 01/02 quedan como evidencia de los intentos fallidos. Los recursos informativos continúan aplazados por decisión expresa del usuario; no se puede afirmar que el ZIP proporcione todas las lecturas o ilustraciones.

El resultado de contenido, Word y conservación se añade al terminar la comprobación completa; las regresiones técnicas no se presentan como aprobación pedagógica por sí solas.


## Resultado posterior
La ronda con anclas únicas produjo un maestro real, pero detectó duplicación de competencias/edades y una regla que exigía crear aun en una investigación. Se corrigen con formato privado de claves y cierre por comunicación admitido. V35 terminó una generación real completa de diez actividades y verificó una presentación 4 de 38 páginas con los mismos contenidos, sin nueva IA para maquetar. 87 pruebas y gates PASS, sesenta Word docentes intactos tras activar. Detalle y límites: `PRUEBA_COMPLETA_ANIMALES_V35.md`.
