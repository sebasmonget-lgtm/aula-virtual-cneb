# Dos pruebas reales de guía concreta — 2026-10-27

## Alcance e aislamiento

La usuaria pidió comprobar en un par de iteraciones que proyectos y actividades sean concretos, específicos y fáciles de preparar, usando las referencias docentes como orientación y sin modificar sus proyectos guardados. Se probó `ayni-documents-v21`, sin cambiarlo por el mero hecho de hacer otra ronda. El cambio de producto de esta revisión es de paginación: mantener unido el bloque breve de registro y referencias de la actividad práctica.

El evaluador admite ahora `--suite=concrete`, con solo dos rondas y almacenes `generador-qa-guia-concreta-20261027-r1` y `r2`. Conserva la suite anterior y rechaza repetir una solicitud ya consumida. Cada almacén tiene una institución, docente y tres estudiantes ficticios de 3, 4 y 5 años. El año es una previsión editorial confirmada para limitar gasto: no se pagó una generación anual. Se ejecutan los servicios reales de chat, generación, persistencia y exportación, sin declarar un recorrido de navegador completo.

## Primera ronda: autonomía en el refrigerio

Tres intercambios reales. El chat pregunta por situaciones concretas y recursos, ofrece ayuda para diseñar sin exigir una lista de actividades y conserva el lavado de manos ya existente. Se reciben los límites: utensilios vacíos en los ensayos, líquidos y derrames del piso a cargo del adulto, sin compras ni alimentos adicionales y una sola profesora con sectores visibles. El resumen cierra con sugerencias vacías y no solicita diagnóstico.

Se aceptaron un maestro y seis actividades: planificación con los niños, manejo de utensilios, traslado al tacho, cuidado compartido de una superficie, elección de acciones/ayudas y revisión de alternativas. El maestro cubre identidad, motricidad y convivencia; cada día focaliza lo pertinente. Las instrucciones nombran objetos, disposición, acciones y decisiones, con apoyos por edad y registros por completar. El recorrido de este caso se concentra en ensayos con objetos vacíos por las condiciones recibidas; no acredita por sí solo transferencia al refrigerio real.

## Segunda ronda: plantas y panel colectivo

Tres intercambios reales. El chat propone formas de recoger las preguntas y recoge la elección de un panel colectivo de cartón que pueda tocarse y reorganizarse. Conserva dos macetas visibles, hojas caídas limpias y materiales reutilizados; sin lupas, pantallas, compras, arrancar hojas o cambiar las condiciones de las plantas. Riego adulto, una sola profesora y participación mediante palabras, dibujos o señalamientos. No impone fichas diarias ni exposición individual.

El primer intento del maestro quedó `failed/generation_failed`, sin respuesta disponible ni evento de consumo registrado. No se conoce la causa precisa ni se asume que su coste sea cero. Un único reintento explícito fue autorizado dentro de esta prueba acotada. El evaluador guarda desde entonces solo motivo normalizado y estado HTTP en errores del proveedor, nunca mensajes completos, cabeceras o credenciales; la suite impide un tercer intento de la misma tarea. No se añadió retry automático al producto.

El reintento completó el maestro y las seis actividades. Ruta aceptada: planificación con los niños; comparación de hojas caídas y macetas; agrupación por rasgos visibles; armado del panel; reorganización para encontrar preguntas; revisión de la pregunta inicial y continuidad. Se desarrollan indagación, comunicación oral y convivencia en el maestro, con foco pertinente por día. El panel se construye con cartón apoyado en una caja, papeles y cinta; las instrucciones permiten imaginar la preparación sin equipos adicionales. Las preguntas y registros infantiles siguen por recoger, sin respuestas predeterminadas.

Balance: dos proyectos y doce actividades ficticias aceptadas, seis llamadas de chat y cuatro de generación exitosas; un intento adicional sin respuesta. Diez eventos de consumo registrados estiman USD 0.216923335. El importe no incluye un posible coste del intento fallido y no equivale al total facturado. No se hicieron más llamadas para descargar o ajustar presentación.

## Word y preservación

Exportación práctica desde fuentes guardadas, usando las plantillas Ayni aprobadas. Se compara `styles.xml` y cada imagen con el original; proyecto y actividades mantienen la misma estética. Guía diaria antes del sustento: materiales, Inicio/Desarrollo/Cierre, pasos numerados, decisiones infantiles, apoyos y criterios por edad. Registros vacíos. La ruta del maestro muestra día/actividad, qué haremos y qué necesitamos.

La primera inspección detectó en dos actividades una última página con un campo del registro o solo las referencias. Se reutiliza el agrupador de bloques breves para mantener registro y sustento juntos, sin recortar textos ni reducir letra. En el segundo maestro también se detectó una ligadura desde celdas de la última fila de criterios al bloque siguiente: el renderizador práctico libera todas las celdas de esa fila, manteniendo unida la tabla breve sin arrastrar el siguiente apartado. Se agrupan las referencias del proyecto para evitar líneas sueltas. No se cambia el helper global ni la exportación ordinaria. Los Word se vuelven a exportar y renderizar después del cambio. La guía operativa cabe en su primera página de contenido; las páginas posteriores conservan apoyos, criterios y sustento. La sencillez se evalúa por la claridad de uso, no por ocultar criterios de las tres edades.

El estado de la usuaria se compara antes y después del reinicio del servidor: workspace y planning idénticos, tres proyectos, 32 actividades y cuatro estudiantes; SHA combinado `9e3e51e47c000ec232aa995dd65adf95cc2653871e19e49b1fa472a42823f59e`. Web local devuelve 200. No se escribe en el checkout original, no hay migraciones, commit, push o despliegue.

Cierre visual: catorce Word finales renderizados, 62 páginas revisadas en hojas de contacto y guías representativas a resolución completa. Cero errores de conversión y cero palabras fuera de página. Cada proyecto ocupa siete páginas y cada actividad cuatro, con portada. El maestro de plantas pasa de ocho a siete páginas al corregir la ligadura de tablas. Los dos ZIP contienen siete Word cada uno y su `document.xml` coincide con las exportaciones individuales finales. Esta revisión no convierte los borradores en observaciones reales ni rellena los registros.

## Validación, evidencia y rollback

Diez regresiones editoriales, preparación y fidelidad PASS después del cambio de paginación; typecheck, lint completo y build ejecutados. Lint conserva el aviso previo de dependencias en `diagnostic-generation-control`; no hay errores. Evidencias: `output/generador-documentos/guia-concreta-real-20261027/round-1` y `round-2`; logs `.local/guia-concreta-*`. No se certifica con dos casos la calidad de todos los temas, la aplicación real en aula ni cumplimiento normativo universal. Se mantienen las referencias oficiales del catálogo y la distinción entre evidencia prevista y observada.

Rollback: retirar la agrupación del registro/referencias y el ajuste local de última fila en `document-generator-practical-word.mjs`; conservar las fuentes y las plantillas binarias. El namespace de QA y su diagnóstico seguro pueden retirarse sin tocar datos docentes ni el flujo de producción.
