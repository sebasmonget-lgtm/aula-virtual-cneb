# Auditoría e integración de la KB v4.1.0

Fecha: 2026-09-26. Paquete examinado: `Ayni_KB_v4.1_Extension.zip`. Commit de respaldo anterior al cambio: `d00dc69`.

## Estado de partida y comparación

| Elemento | v4.0.0 | v4.1.0 |
| --- | ---: | ---: |
| Fuentes registradas | 22 | 36 |
| Claims de fuentes | 13 | 22 |
| Unidades compiladas | 245 | 374 |
| Competencias canónicas | 14 | 14 |
| Workflows reales de Ayni | 16 | 16 |

Se leyeron el paquete completo (39 archivos), su plan de integración, manifiesto, fuentes, claims, unidades, casos de calidad y el código de carga, recuperación y construcción de contexto en HEAD. Las 129 unidades y 14 fuentes añadidas tienen IDs nuevos; no se hallaron colisiones de IDs ni duplicados exactos con v4.0.0. Los documentos de didáctica específica cubren cantidad, forma, oralidad, lectura, escritura, indagación, psicomotricidad, arte y convivencia, junto con familias de situaciones y patrones de proyectos. Las 14 URL nuevas de MINEDU respondieron y correspondieron al título registrado. Esa comprobación verifica procedencia y disponibilidad, no convierte automáticamente los textos didácticos en currículo oficial.

El ZIP describía 13 workflows y asumía que solo `family_report` admitía varias competencias. El repositorio ya tenía 16 workflows y excepciones explícitas para proyecto, unidad, Assessment Master e informe del aula. Se conservaron esos contratos. El paquete también usaba `materials` y nombres de áreas como `workflow_scope`; se compilaron a ámbitos vigentes o se retiraron como ámbitos, conservando el área en los metadatos didácticos. Las unidades con contenido en lista se normalizaron a texto. Una referencia de una fuente específica de 5 años en una unidad de alcance 3–5 se corrigió para impedir que llegue a un aula de otra edad.

La separación de autoridad se conserva: `02_official_reference` y las tarjetas curriculares siguen siendo la referencia CNEB/Programa Curricular; la nueva `domain_didactics`, `situation_families` y `exemplar_patterns` orientan la enseñanza. Las fuentes de 2012–2015 solo entran como didáctica compatible. Los materiales concretos de Biblioteca, en particular «Juega, crea, resuelve y aprende», no forman parte del corpus compilado.

## Selección y jerarquía

El backend aplica `workflow → edad → competencia → aplicabilidad → dominio → ranking`. La aplicabilidad intercultural, bilingüe, familiar o de tutoría requiere datos explícitos del contexto. El manifest gobierna conteos y SHA-256 de todos los archivos de v4.1.0; el runtime no lee PDF ni usa embeddings. Las unidades devueltas conservan IDs y referencias de fuente en `provenance`.

| Workflow | Conocimiento nuevo que puede recibir |
| --- | --- |
| Diagnóstico | Familias de situaciones para observación natural, didáctica pertinente y apoyo individual aplicable. |
| Plan anual | Familias de situaciones, patrones de proyectos y didáctica para escoger tipos de experiencias; contexto intercultural o familiar solo cuando aplica. |
| Project Master | Familias y patrones para un detonante auténtico, caminos posibles y mapa; didáctica y contexto pertinentes. |
| Unit Master | Familias y didáctica para una secuencia situada, con contexto intercultural aplicable. |
| Taller | Didáctica propia de la competencia/lenguaje y posibles situaciones; los recursos concretos siguen en Biblioteca. |
| Actividad | Acciones infantiles, mediación, materiales y actuaciones observables para la fila confirmada; familias de situaciones solo enriquecen la intención ya decidida. |
| Criterio y evidencia / realineamiento | Patrones didácticos de actuación observable para el criterio situado. |
| Captura de evidencia | Únicamente patrones de actuación observable de la competencia confirmada; la docente registra el hecho real. |
| Assessment individual | Patrones y adaptaciones interpretativas por edad, con cautela contextual; no situaciones hipotéticas ni evidencia fabricada. |
| Informe familiar | Participación familiar y apoyo individual cuando son aplicables. |
| Material / modo Hoy | Didáctica pertinente para el material o la sugerencia cotidiana, subordinada a la actividad. |
| Assessment Master, conclusión e informe global del aula | Sin dominios nuevos en esta ampliación; mantienen las fuentes y contratos existentes. |

La actividad conserva el Project/Unit Master confirmado, la fila del mapa, sus vecinas, fecha, propósito y competencias. Las reglas v4.1 prohíben reemplazar la situación. Por ejemplo, una fila de `MAT_CANTIDAD` sobre organizar productos de una tienda puede recibir estrategias de agrupación, comparación, correspondencia y preguntas de mediación; no se transforma en otro juego de conteo. Assessment usa el conocimiento como marco de interpretación y nunca convierte una actuación esperada en observación registrada.

## Validación y reversión

La suite de v4.1 ejecuta los diez casos de `retrieval_cases.json` y los siete escenarios de `generation_benchmarks.json` como comparación determinista de paquetes de conocimiento v4.0/v4.1. Comprueba además la aplicabilidad condicionada, aislamiento por edad/competencia, autoridad de fuentes históricas, integridad de todos los archivos y conservación del mapa confirmado en el bundle de Actividad. `regression_guardrails.json` se contrastó con los contratos reales: 14 IDs, referencia por edad, filtros especiales, autoridad docente, separación de evidencia, procedencia, overlay temporal y excepciones vigentes de competencias múltiples. Las pruebas de servicios del proyecto, actividad, evaluación, criterio, evidencia y routing también se ejecutan.

Se ejecutaron además ocho llamadas reales a la API con datos enteramente ficticios: cuatro casos representativos de `generation_benchmarks.json`, cada uno con v4.0 y v4.1, mismo input, schema y routing vigente. Las respuestas completas y unidades seleccionadas están en `evals/kb-v4-1/2026-09-26-comparison.json`.

| Caso | Modelo vigente | Tokens de entrada v4.0 → v4.1 | Tiempo v4.0 → v4.1 | Revisión de la salida v4.1 |
| --- | --- | ---: | ---: | --- |
| Plan anual, cantidad 4 años | Sol high | 18 653 → 21 095 | 14,8 → 13,8 s | Propone organización y reparto con correspondencia/conteo funcional; mantiene propuesta revisable y separa lo observado de lo esperado. |
| Project Master, insecto 5 años | Sol medium | 6 775 → 8 200 | 7,4 → 8,2 s | Conserva pregunta real, exploración y decisiones infantiles; no cierra respuesta ni secuencia. |
| Actividad, tienda 4 años | Luna medium | 5 299 → 6 887 | 4,9 → 4,6 s | Conserva la segunda fila del mapa y la tienda; añade organización, reparto, comprobación, mediación y evidencia posible. |
| Assessment, forma 5 años | Luna medium | 4 706 → 5 201 | 5,4 → 4,1 s | Interpreta únicamente dos actuaciones registradas; no inventa hechos ni asigna AD/A/B/C. |

La línea base v4.0 también produjo respuestas pedagógicamente útiles. En esta muestra v4.1 hizo más explícita la didáctica sin cambiar la intención; el coste potencial de contexto aumentó 5 950 tokens de entrada en total (aproximadamente 17%). Es una muestra de una ejecución por versión y caso, no una medición estadística de calidad o latencia. Los otros tres benchmarks quedan cubiertos por la comparación determinista; Taller no tiene generación productiva en el routing actual.

No se cambian modelos, esfuerzo, proveedor ni routing. No hay migraciones ni despliegue. Para revertir, usar `KNOWLEDGE_BASE_V4_0_ROOT` en el loader o restaurar esa raíz predeterminada; v4.0.0 permanece intacta.
