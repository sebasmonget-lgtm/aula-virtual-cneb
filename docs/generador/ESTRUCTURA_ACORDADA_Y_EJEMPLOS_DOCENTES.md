# Estructura acordada de proyectos y actividades

Revisión del 27 de octubre de 2026. La usuaria aprobó adaptar las plantillas y prompts después de contrastar su estructura con las orientaciones oficiales. Mantener el lenguaje docente concreto y la estética Ayni; no regenerar sus proyectos existentes.

## Decisiones de presentación

Se conserva el maestro binario aprobado y se reutiliza su resumen de portada para identificar las competencias con nombres oficiales. En el proyecto se leen las del maestro y en cada actividad solo las familias focalizadas de ese día. No se añade una competencia al descargar ni se importa el conjunto completo del proyecto a todas las actividades.

Proyecto: datos y título en portada; situación significativa, pregunta/reto, propósito y planificación con los niños; ruta breve; aprendizajes y evaluación; condiciones, apoyos por edad y enfoques; referencias. La planificación con los niños se proyecta desde la primera fase guardada de learningJourney, sin inventar sus respuestas o acuerdos. Para fuentes antiguas sin esa metadata no se fabrica una fase nueva. La organización utiliza el comienzo general guardado del maestro; el prompt nuevo lo reserva para espacios, agrupamientos y acompañamiento. Las fuentes anteriores no se reescriben.

Actividad: datos y competencias en portada; propósito, materiales y guía de inicio/desarrollo/cierre; participación infantil y apoyos; criterios y evidencias por edad; registro de observación vacío y referencias. La guía operativa se mantiene antes de la matriz curricular. El registro distingue nombre/fecha, actuación o expresión real vinculada al criterio y apoyo/siguiente paso.

Se retiran los bloques genéricos Recorrido abierto, Cierre y continuidad y Cómo cerraremos el proyecto. La intención de cierre permanece en la planificación estructurada y se desarrolla en la actividad final y su propósito visible en la ruta. No se borra del documento fuente. En fuentes sin actividades preparadas se muestra la previsión de fases, incluida la de cierre, sin un segundo bloque repetido. Evaluación prevista identifica un instrumento sencillo —registro de observación de las actividades— y mantiene todas las matrices y referentes por edad; no equivale a una evaluación ya realizada.

## Mejora visual solicitada durante la revisión

La usuaria autorizó mejorar el diseño con colores e imágenes, conservando la identidad de Ayni. Se aplica la skill Documents instalada y se consultó como referencia técnica la skill DOCX publicada por Anthropic en su repositorio oficial; no se instaló código de terceros. La documentación técnica no sustituye la plantilla aprobada ni prescribe la estructura pedagógica. Fuente consultada: https://github.com/anthropics/skills/blob/main/skills/docx/SKILL.md

La proyección práctica añade franjas pastel en títulos, color suave en las etiquetas de inicio/desarrollo/cierre y en las edades, manteniendo los textos que identifican cada categoría. Portadas, Poppins, papelería, cabeceras, pie e imágenes originales permanecen. Se incorpora una pequeña ilustración de Ayni procedente de public/ayni-thinking-v2.webp o public/ayni-profesora.webp, con texto alternativo. No se genera imagen nueva ni se usan fotos de niños.

El resumen de portada admite una tercera celda opcional para la ilustración, dentro de la fila de competencias. Su disposición original de dos columnas se conserva cuando no se solicita imagen. Los límites opcionales de tamaño de imágenes tienen los mismos valores anteriores por defecto. La ilustración no se agrega como una fila separada que consuma otra página. Se compacta solo el párrafo del salto de portada ilustrada. Los materiales del día se presentan a todo el ancho antes de la tabla de momentos, conservando todo el texto para que la guía siga cabiendo en una página de contenido en la muestra real.

## Prompts v23

Se conserva la política sin diagnóstico obligatorio y la situación redactada desde los niños y su aula. La primera actividad sigue siendo Planificamos el proyecto con los niños. Se precisan los campos de proyecto/día y su relación con la estructura acordada, sin crear nuevos campos de respuesta ni cambiar el contrato validado de versión 2.

La primera fase de learningJourney recoge saberes, preguntas, propuestas y elección de primeras acciones. El recorrido siguiente permanece como previsión ajustable. commonSequence.opening del proyecto precisa condiciones prácticas. projectCriteriaFamilies conserva todas las competencias autorizadas del maestro y criteriaFamilies focaliza el día; expected_evidence describe actuaciones posibles para un registro, nunca logros confirmados.

El cierre del maestro concreta objetos/registros disponibles, pregunta propia, comunicación voluntaria y próximas preguntas/apoyos. La última fase y la actividad que coincide con project_schedule.last_activity_date incorporan esa intención; en lotes se compara cada fecha. Sin presentaciones, productos físicos o respuestas infantiles obligatorias. Los pasos continúan nombrando materiales, acciones, decisiones y una ayuda docente útil; no se reemplaza esa concreción por más apartados técnicos.

## Comparación con las referencias de la usuaria

Se releen los textos completos extraídos de los tres DOCX de octubre y el proyecto 11 pegado por la usuaria. La actividad adicional sobre grillos ya había sido extraída y renderizada; se distingue de un proyecto de varios días. Las referencias se usan como muestras de uso docente, no como fuente curricular oficial ni como hechos del aula actual.

| Contenido | Proyecto 12 Leemos y escribimos | Proyecto 11 Pequeños exploradores de insectos |
|---|---|---|
| Identificación | Sí, con aula, edad y responsables; el calendario aporta fechas. | Sí, con institución, edades y responsables; incluye calendario. |
| Situación, reto y propósito | Situación desarrollada; parte de la intención está integrada en su texto y no todos los elementos tienen encabezado separado. | Situación, reto y propósito explícitos; también actuación propuesta. |
| Planificación con los niños | Primera actividad y tabla de qué haré/cómo/necesitaré. | Primera actividad y la misma tabla práctica. |
| Aprendizajes y evaluación | Matriz de competencias, capacidades, desempeños, evidencias, criterios e instrumentos. | Matriz con esos mismos campos. |
| Enfoques | Enfoque, valor y actitud. | Enfoque, valor y actitud. |
| Actividades y cierre | Ruta/calendario y actividad final de evaluación con los niños. | Ruta/calendario, comunicación y actividad final de evaluación con los niños. |
| Materiales | Por actividad y relación general. | Por actividad y relación general. |
| Organización y apoyos | Hay estrategias y agrupamientos en las consignas, pero no apoyos diferenciados claramente sistematizados. | Hay estrategias y organización en consignas; la diferenciación y los apoyos no quedan tan explícitos como en Ayni multiedad. |

Conclusión limitada: ambos proyectos incluyen la mayor parte de los contenidos acordados, con distinta distribución y claridad. No corresponde decir que todos los archivos aportados contienen todos los apartados de proyecto: varios son actividades diarias. Las del 19 y 20 presentan identificación, propósitos/referentes, criterios/evidencias/instrumento y momentos; también rutinas y anexos que no deben copiarse completos cada día. Persisten inconsistencias de fechas, edades y algunos criterios repetidos; su presencia formal no garantiza coherencia pedagógica. No se trasladan respuestas o conclusiones infantiles anticipadas ni afirmaciones científicas no verificadas.

## Fuentes y alcance normativo

- Programa Curricular de Educación Inicial, pp. 37–39: propósitos, evidencias y situaciones/estrategias/condiciones, independientemente del esquema adoptado. https://www.minedu.gob.pe/curriculo/pdf/programa-curricular-educacion-inicial.pdf
- La planificación en la Educación Inicial, pp. 66–71 y 75–76: esquema adaptable de proyecto y actividad, competencias/referentes, enfoques, evidencias/instrumentos, recursos e inicio/desarrollo/cierre. https://repositorio.minedu.gob.pe/handle/20.500.12799/6518
- Guía de proyectos, pp. 22 y 28: planificación pedagógica, propuestas infantiles, comunicación y evaluación. https://repositorio.minedu.gob.pe/handle/20.500.12799/6517

Son orientaciones curriculares y de planificación; los rótulos, orden de lectura, cantidad de pasos y extensión de Ayni son decisiones editoriales. No se presentan como un índice nacional único ni sustituyen los requisitos concretos de una institución.

## Validación y reversión

Reexportación de las dos muestras sintéticas v21 en carpeta nueva estructura-acordada-20261027: catorce Word, dos ZIP, estilos e imágenes comparados con los originales y fuentes JSON idénticas. No se usa esta reexportación como prueba de una nueva generación real v23. La regresión de fidelidad comprueba competencias antes del primer salto de página, criterios/referentes completos, registro/instrumento y ausencia de los rótulos retirados, conservando fuentes y exportación ordinaria.

Se hicieron dos llamadas de maestro/primer día con IA real, sin generación anual pagada ni llamadas de chat adicionales. La primera pasó el contrato, pero el evaluador antiguo no transmitía el snapshot de conversación del proyecto: devolvió recursos por verificar y un planteamiento genérico. No se acepta como validación de personalización ni se entrega esa muestra. Se corrigió exclusivamente el evaluador para recibir projectContext y reenviarlo, además de informar teacher_id a la factory para aplicar el plazo documental correcto. El flujo de producto ya transmitía ese snapshot y no requirió una modificación de contexto.

La segunda llamada v23 conserva dos macetas, hojas caídas, bandejas, cajas/cartón, papel/crayones y cinta; riego adulto, sin modificar plantas, una profesora y sectores visibles. Sitúa el proyecto en el aula e institución ficticias, plantea planificación con los niños, comparación de hojas, revisión de preguntas y panel reorganizable. El maestro tiene indagación, comunicación oral y convivencia para 3/4/5; el primer día focaliza indagación y comunicación. No inventa los aportes de los niños ni solicita diagnóstico. Se valida el contrato con la función real de generación; no se declara que todas las actividades posteriores se hayan generado con esta nueva versión.

Evidencia: estructura-acordada-real-20261027/round-01 y round-02. Metadatos del proveedor: 136429 ms y 109825 ms, 25182 y 23875 tokens totales respectivamente. El evaluador directo no registró eventos de coste; no se interpreta esa ausencia como consumo gratuito. La muestra entregable word-final proyecta el segundo maestro y primer día sobre identidad sintética y sus referentes oficiales, sin guardar un proyecto docente. El bloque inicial de planificación se muestra una vez y la ruta sin días preparados contiene las fases posteriores. Son copias de revisión, no documentos históricos reemplazados.

Rollback: retirar las reglas v23, el resumen de competencias opcional y los cambios del cuerpo práctico. Conservar las fuentes pedagógicas guardadas, la metadata de cierre, sus referencias, archivos aportados y maestros binarios. Sin migraciones, cambios de permisos, commit, push o despliegue. Las pruebas de generación reales, resultados de gates y conservación se registran al cierre.

### Cierre validado

31 regresiones distintas PASS en la ejecución final: contratos editoriales/planificación, preparación y reanudación, fidelidad de plantillas, privacidad y lectura/ZIP de proyecto y actividad en ambos esquemas. Typecheck, lint completo y build finales PASS; permanece el aviso previo de dependencias React en diagnostic-generation-control. Las repeticiones por cambios visuales no se contabilizan como casos distintos.

Dieciséis Word finales renderizados, 73 páginas: catorce reexportaciones de contenido v21 y dos proyecciones de la segunda generación v23. Cero errores de conversión, palabras fuera de página o páginas con menos de 25 palabras. Se revisan distribución, títulos largos y portadas en hojas de contacto; las once páginas de los dos Word entregables v23 se inspeccionan individualmente. El proyecto tiene siete páginas y la actividad cuatro, con su guía operativa completa en la primera página de contenido. No se presenta una reexportación como nueva generación ni se recortan las fuentes para alcanzar ese tamaño.

El primer comando de reinicio fue rechazado por la revisión automática con el motivo genérico bloqueado por política. Se solicitó confirmación por ese rechazo; la usuaria autorizó expresamente reiniciar solo la variante local. Después de verificar que no hubiera trabajos activos, se reinició únicamente su árbol de procesos identificado, sin clean-start. El servidor nuevo usa v23 y las nuevas proyecciones. Dos descargas HTTP de documentos existentes devuelven 200, contienen competencias y la imagen nueva, y no escriben fuentes; web 5185 responde 200. Almacén generador-prueba-chat-20261025 conserva tres proyectos, 32 actividades y cuatro alumnos. Workspace y planning idénticos por SHA antes/después: 9e3e51e47c000ec232aa995dd65adf95cc2653871e19e49b1fa472a42823f59e. Evidencia .local/estructura-acordada-preservation.json y logs estructura-acordada-*.
