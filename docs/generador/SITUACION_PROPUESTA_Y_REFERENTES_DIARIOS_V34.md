# V34 · situación propuesta y referentes propios de cada actividad

2026-10-28. Autorización: inferir/inventar situación significativa cuando el chat no aporte un episodio, posponer recursos, mejorar selección de referentes y corregir el residuo de texto del P09. Alcance: variante local documental; fuentes docentes preservadas. No hay despliegue ni migraciones.

## Situación de partida

Si existe un episodio docente, se conserva. Si no existe, la IA puede crear una escena específica en pasado a partir del tema/aula/edades e intereses disponibles, introducida una sola vez con «Situación de partida propuesta.». Es ficción de planificación adaptable, no un registro observado ni una evaluación de niños reales. No inventar nombres ni citas infantiles literales. No exigir episodio para poder generar, ni quedarse únicamente en «les interesa»/«podrían surgir preguntas». El propósito y el reto deben sostener experiencias de varios días. Los registros de observación/resultados continúan vacíos. Se modifica la regla compartida; prompt de proyecto V34.

Esta autorización concreta del usuario permite proponer un origen narrativo; no autoriza inventar evidencias reales. Recursos informativos quedan expresamente pendientes, sin prometer que ahora el ZIP contiene textos nuevos.

## Causa del problema curricular y cambio de código

Además del prompt, había una restricción estructural: el esquema de actividad individual/lote exigía el array exacto de referentes del maestro. El validador de proyecto requería esa misma igualdad y el lector de Word exigía pertenencia al array del padre. Así, un maestro con Indaga 1/2/3 impedía elegir 4/5 posteriormente, aunque el criterio lo necesitara. La primera actividad también heredaba todos sus referentes desde el maestro.

Nuevos maestros documentales emiten `documentReferenceSelectionVersion=2` en el resultado validado. Al confirmar se guarda `document_reference_selection_version=2` en sus detalles. La marca se transmite únicamente desde el proyecto autorizado en servidor al contexto de generación.

Para esta política:

- Maestro y primera actividad seleccionan sus propios referentes por competencia/edad. La primera actividad sigue ligada a la planificación con los niños.
- Esquemas de actividad individual y lote permiten de uno a tres referentes del catálogo oficial de la competencia/edad autorizada; no se pide completar tres.
- El validador conserva padre, competencia, edad y catálogo; permite selección diferente del array del maestro. IDs inexistentes, de otra competencia o de otra edad se rechazan.
- El lector Word admite esas selecciones y resuelve el texto de la versión curricular correspondiente. Se conserva linaje del criterio al proyecto, fingerprint, titularidad y comprobación de fuentes.
- Sin la marca, proyectos históricos mantienen herencia exacta y exportación anterior. No se amplía el currículo del maestro ni las competencias/fechas del recorrido por sustituir IDs.

Prompt específico: seleccionar después de identificar la actuación observable, alinear paso/criterio/evidencia/referente y usar comparación o comunicación cuando el texto oficial corresponda. No asignar todos los desempeños a cada día ni inferir IDs por palabras. Se retiran las instrucciones contradictorias de herencia exacta solo en la rama documental; modo diario conserva las anteriores.

No hay validador automático que certifique toda pertinencia pedagógica: se corrige el bloqueo del código y se mejora la instrucción de selección, sin declarar infalible la decisión de IA.

## Texto dañado

Nuevo módulo `document-generator-spanish-schema.mjs` añade al esquema de prosa pedagógica caracteres de escritura latina, acentos combinados/precompuestos, puntuación y signos habituales. Se aplica antes de generar maestro/actividad/lote documentales. Evita fragmentos árabes/cirílicos en prosa española como «elegید» o una letra cirílica mezclada en «papel», sin añadir llamadas de reparación ni reintentos de proyecto. Los enums protegidos de títulos/nombres y fuentes históricas no se reescriben. No es un corrector completo de ortografía ni una garantía contra errores escritos con letras latinas.

Copia corregida del P09: `output/generador-documentos/p09-correccion-texto-v34/P09 - Animales - Proyecto y actividades - Texto corregido.zip`. Único cambio: «elegید» → «elegidos» en Materiales del maestro. Los diez Word de actividades son idénticos byte a byte; todas las otras partes OOXML del maestro son idénticas. El original y las fuentes guardadas siguen intactos. Recibo `copy-verification.json`. Siete páginas renderizadas e inspeccionadas en contacto completo y página 6 individual; cero desbordes, misma estética. No se presenta esta copia como regeneración pedagógica del P09 ni como modificación del proyecto de la cuenta.

## Pruebas ejecutadas

69 comprobaciones PASS en diez archivos: selección nueva, planificación, ruta, preparación, guards, fidelidad, lotes, documentos, documento de actividad y persistencia/generación. Cobertura de nueva política: permite Indaga 5.04/5.05 sin pertenecer al array padre, rechaza IDs ajenos, conserva comportamiento histórico y admite schema de primera actividad independiente. Prueba vertical aislada prepara ocho actividades con referentes distintos a los del maestro y descarga cada Word correctamente. No usa el almacén docente ni IA real para ese recorrido.

Pruebas de idioma: rechazan el residuo real y una letra cirílica visualmente similar; aceptan tildes/NFD, puntuación y títulos fijos de fuentes. Una aserción inicial del nuevo test esperaba estado «complete» cuando la preparación usa «succeeded»; se corrigió el test, no el contrato productivo. La suite final completa pasa. Tras ampliar el rango latino para acentos combinados se repitieron las cuatro pruebas focalizadas, PASS.

Prueba corta adicional con IA real: una creación, 2376 tokens totales, datos sintéticos de aula LILA/gallinas/ovejas. El proveedor aceptó el patrón del esquema y devolvió un episodio marcado como propuesto, material escrito en español y únicamente `PCI2016.CYT_INDAGA.5.04` para comparar explicaciones con información. Recibo privado `.local/v34-provider-smoke.json`. Es comprobación breve de esquema/prompt, no una nueva generación completa de proyecto ni revisión de diez actividades nuevas con IA real.

Typecheck/build PASS; lint sin errores y con el aviso React anterior. Logs privados `.local/v34-final-tests.log`, `v34-typecheck.log`, `v34-lint.log`, `v34-build.log`. No se ejecutan llamadas IA de recursos ni se cambia la estética.

## Activación, preservación y rollback

Sin trabajos docentes activos. Respaldo antes de activar: `.local/backups/guide-v34-before-activation`. Reinicio únicamente de variante local, launcher 19440; web 5185 y API 8805 HTTP 200. Después de activar: workspace y planes idénticos, 16 ámbitos/32 turnos de chat idénticos, cuatro alumnos y cuerpos de sesenta Word idénticos por SHA256. Recibo `.local/guide-v34-activation-preservation.json`.

Rollback: dejar de emitir la marca/prompt nuevos para futuras preparaciones, manteniendo soporte lector/validador de política 2 para fuentes ya guardadas. No eliminarla de proyectos con actividades cuyos referentes difieran del maestro. No restaurar un backup sobre datos nuevos automáticamente. No se modifica el Ayni original ni cuentas remotas.
