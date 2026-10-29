# Prueba real del chat del proyecto y Word práctico

Cierre del 27 de octubre de 2026. Tres rondas autorizadas con IA real, en tres almacenes QA propios. No se abre la base de la usuaria desde el evaluador. Su prueba se consulta únicamente para comparar workspace y planning y comprobar conservación.

## Resultados y cambios

1. v18, alimentación: cinco turnos de chat, maestro y cinco actividades adicionales. Conserva que el lavado de manos existe, el adulto sirve líquidos, no hay agua para juegos ni compras. Preguntó demasiado pronto qué otras actividades quería la docente y ofreció un chip de acción al cerrar.
2. v19, alimentación: cuatro turnos, maestro y cinco actividades adicionales. Primero precisa la situación y materiales; ofrece alternativas propias y recoge viabilidad, restricciones y formas de participación. Cierra con suggestions vacío. No pide que la docente diseñe una lista de actividades.
3. v20, plantas: tres turnos con respuestas extensas, maestro y cinco actividades adicionales. Origen concreto, materiales, intención, espacio visible, una profesora, riego adulto, sin equipos especiales y expresión con gestos/dibujos. No se exige una cantidad fija de preguntas si la información ya se recibió. Ruta: planificación con los niños, comparación de hojas, observación de macetas, revisión de explicaciones posibles, intercambio de registros y cierre con preguntas pendientes.

En total se aceptaron tres proyectos y 18 actividades ficticias. Doce llamadas de chat y seis de generación exitosas; además, un intento del tercer maestro agotó 180 segundos. No dejó response ID recuperable y quedó uncertain sin guardar un proyecto parcial. Se amplió a 300 segundos el plazo del primer maestro documental, por debajo de su lease de 360; el modo diario conserva 90 segundos. Un reintento explícito, con aceptación de posible consumo, completó esa tercera ronda. No hay reintentos automáticos. Son 19 intentos, 18 con respuesta aceptada; cero generaciones anuales pagadas. Coste estimado registrado: USD 0.2970477; no incluye un posible coste del intento sin respuesta, por lo que no equivale al total facturado.

## Criterios propios del maestro

La revisión real detectó que se reutilizaban criterios del primer día en las competencias del maestro, mientras otras usaban la previsión anual. El nuevo resultado documental pide projectCriteriaFamilies separado de criteriaFamilies del primer día. Debe cubrir todas las competencias autorizadas y todas las edades, con referencias oficiales válidas. El primer día conserva los mismos referentes para cada par; puede focalizar un subconjunto. El escritor solo lee estos criterios del resultado privado autorizado, nunca de un campo público del cliente. Los resultados antiguos y el modo diario siguen su contrato anterior. No hay migración.

La regresión modifica deliberadamente los criterios del maestro en el proveedor de prueba y comprueba su persistencia exacta, distinta de la del primer día. La tercera generación real confirma criterios generales referidos a varias exploraciones y criterios diarios para la planificación inicial. No se certifican resultados de aprendizaje: son oportunidades y evidencias previstas.

## Documento y uso cotidiano

Se conservan portada, estilos, ilustraciones y papelería de Ayni; se verifica identidad binaria de styles.xml y de cada imagen en los siete Word finales. Guía primero: propósito breve, materiales, Inicio/Desarrollo/Cierre y tres a cinco pasos numerados. Después, apoyos por edad, matrices de criterio y evidencia, registro vacío y referencias compactas. La situación conserva párrafos reales y los campos del registro no se concatenan. La última fecha seleccionada recupera la pregunta del proyecto y abre continuidad sin presentación obligatoria.

No se recortan textos guardados ni se cambian fuentes al descargar. La simplificación es una proyección práctica opcional; el render diario por defecto permanece separado. Las páginas adicionales conservan diferenciación por edad y trazabilidad curricular. Referencia pedagógica utilizada: Guía MINEDU de proyectos en Educación Inicial (2019), planificación con los niños, página impresa 21; currículo oficial versionado incluido por IDs en cada documento.

## Verificación y límites

28 regresiones de proyecto, documentación, historial, conversación y ambos esquemas PASS; 16 verificaciones posteriores de persistencia/tiempos, generación y plantilla PASS, con solapamiento entre ambas baterías. Se ejecutaron typecheck, lint y build; permanece el aviso anterior de React en diagnostic-generation-control. Un typecheck posterior coincidió con recreación de tipos .next durante un reinicio y falló por archivos ausentes; se repitió sin incremental y pasó. Logs iniciales conservados, sin declararlos exitosos.

Las llamadas reales usan los mismos servicios de conversación, trabajos, preparación, confirmación y exportación que el servidor. No se declara un recorrido de navegador completo con proveedor real en esta entrega. Las pruebas HTTP y de autorización son aisladas; no envían nombres de los niños a IA. El mapa anual QA es una previsión editorial confirmada para limitar llamadas, no un año generado con IA.

Proyecto y planificación de la usuaria idénticos por SHA antes y después: tres proyectos, 32 actividades y cuatro estudiantes. Sus documentos almacenados no se sustituyen por ejemplos QA. La selección curricular sigue delimitada por el año; el chat no agrega competencias ajenas. No se implementó actualización automática desde las intervenciones infantiles posteriores: las propuestas permanecen ajustables por la docente. Sin despliegue, commit ni cambios al checkout original.

Evidencias: output/generador-documentos/chat-proyecto-real-20261026/round-1 a round-3, con requests sin claves, respuestas, conversación, recibos, Word, ZIP y auditoría de render; logs .local/chat-project-live-* y .local/chat-project-live-user-preservation.json. El intento incierto queda documentado por request sin response y preparation.json anterior, además del log original.

## Rollback

Retirar los nuevos campos solo de futuras generaciones y restaurar la proyección práctica previa, conservando todos los resultados y maestros ya aceptados. No borrar filas ni revertir otros cambios de este checkout. El conjunto completo del nuevo maestro está guardado de forma independiente y puede seguir leyéndose aunque vuelva el prompt anterior.
