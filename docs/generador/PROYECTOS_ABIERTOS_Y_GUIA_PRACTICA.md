# Proyectos abiertos y guía práctica — 2026-10-26

## Solicitud y criterio

La revisión docente aclaró que alimentación e higiene comprende autonomía con utensilios y vaso, recogida de restos y pedir ayuda; organizar una mesa era una interpretación demasiado estrecha. La mejora solicitada es general, no una adaptación a un único ejemplo: elegir situaciones que permitan un proyecto coherente durante varios días, documentos más utilizables y guía como Hoy, conservando la estética.

Se consultaron fuentes oficiales:

- [Guía de orientación para desarrollar proyectos de aprendizaje en Educación Inicial, MINEDU 2019](https://repositorio.minedu.gob.pe/handle/20.500.12799/6517). Presenta proyectos y experiencias en distintas edades y multiedad; no establece un modelo único. Articula situaciones, propósitos, actividades, participación, implementación, comunicación y evaluación.
- [La planificación en la Educación Inicial, MINEDU 2019](https://repositorio.minedu.gob.pe/handle/20.500.12799/6518). Se leyó el PDF del portal oficial de formación docente; orienta decisiones sobre propósitos, evaluación, estrategias y condiciones, incluidos momentos cotidianos de la jornada.
- [Programa Curricular de Educación Inicial](https://www.minedu.gob.pe/curriculo/pdf/programa-curricular-educacion-inicial.pdf), desempeños de Construye su identidad, pp. 78–79 impresas: acciones de cuidado, alimentación e higiene con progresiva autonomía. Las competencias se eligen por las experiencias y referentes pertinentes, no por una cuota de áreas.

Las guías son referencias pedagógicas, no una cantidad de páginas que deba copiar cada documento. El diseño de la guía operativa y el control interno de tres experiencias distintas son decisiones de Ayni; no se atribuyen como un formato ni una duración obligatorios del MINEDU. Requisitos particulares de institución/UGEL se verifican con sus disposiciones. No se declara certificación ni aprobación oficial de estos Word.

## Generación

Prompt v15: profundizar prioridades ambiguas antes de reducirlas a una tarea; conservar la corrección docente y distinguir rutinas continuas. Se elimina «prefiere dos competencias centrales». Permite más de dos cuando contribuyen con acciones y evidencias propias, dentro del catálogo y límites existentes. Se conserva el mínimo de dos solicitado anteriormente por la usuaria como regla de producto; no es una exigencia curricular general del MINEDU. No se amplía arbitrariamente la selección ya confirmada en un año guardado.

Prompt v16: primero situación/pregunta con posibilidades de investigación, resolución de problemas o creación; después título, competencias y ruta. Antes de elegir, comprobar tres experiencias diferentes y conectadas que avancen una pregunta común. No es una secuencia fija ni una obligación de tres fases. No prolongar una tarea cambiando materiales, ni acumular subtemas o competencias para justificar la duración. Los niños pueden modificar las previsiones. Sus intereses, preguntas y resultados no se inventan. No se exige un producto físico ni diagnóstico en el chat.

## Presentación y compatibilidad

El generador V2 elige `practical:true` al descargar año, proyecto o actividad. El ZIP usa exactamente esa presentación. Los renderizadores diarios y su comportamiento por defecto permanecen disponibles. Las plantillas binarias originales no se editaron: portada, estilos, medios, geometría y papelería se reutilizan.

El año práctico prioriza calendario, propósitos, preguntas y organización; el desarrollo por competencia y edad corresponde a los proyectos. El proyecto reúne sentido, recorrido, ruta breve, criterios, condiciones, apoyos y enfoques. La actividad presenta propósito/materiales, guía de Inicio–Desarrollo–Cierre, acompañamiento y criterios por edad, espacios de registro y sustento al final. Los referentes se identifican por IDs y páginas; sus textos completos siguen en la fuente guardada y se pueden desplegar en pantalla. No se recortan ni se resumen con IA datos guardados al descargar.

La plantilla tiene una portada y espacio de registro; no se promete una cantidad fija de páginas. La muestra anterior de actividad pasó de nueve a seis páginas y la de proyecto de diez a siete, conservando su contenido extenso anterior. Una actividad real descargada por clics tuvo cinco páginas. El año de compatibilidad tuvo trece páginas; es un fixture antiguo con textos genéricos, no una muestra de calidad editorial de la generación nueva.

Mi año incorpora Ver guía de la actividad. Documentos abre el mismo lector. Reutiliza ActivityRunView y PedagogicalBlock de Hoy: un momento cada vez, selección de edad, materiales, acompañamiento y criterios de ese momento. Referentes completos plegados; sin iniciar/terminar actividades, registros ficticios ni escrituras pedagógicas. Los componentes compartidos reciben parámetros opcionales y el título del proyecto no se repite cuando coincide con el de la actividad.

## Validación y conservación

La carpeta `output/generador-documentos/guia-practica-20261026/` contiene evidencia, renders y logs; las llamadas reales están en `guia-practica-live`. Se ensayaron contextos ficticios de alimentación, pequeños animales del patio y relatos comunitarios, sin tocar la cuenta docente. La primera muestra v15 produjo tres competencias pertinentes en cada proyecto y respetó que el lavado de manos ya se acompañaba. El intento con el criterio de selección reforzado v16 agotó el tiempo de respuesta del proveedor: no produjo salida aceptada ni se guardó un año. Dos llamadas en total, sin reintentos automáticos ni tercer intento. No se declara validación real completa de v16 ni se atribuye el timeout a una causa no demostrada; sus pruebas de contrato y prompts sí pasaron.

Pruebas: 34 del generador y 42 de regresión distintas PASS; cinco comprobaciones de prompts se repitieron tras v16 y pasaron. Se prueba explícitamente que tres competencias son aceptadas y visibles, se conservan criterios y evidencias por edad, IDs oficiales, estilos y medios, y que el ZIP coincide con la descarga práctica individual. Un fallo inicial de ruta mostró fechas ISO: se restableció dd/mm/aaaa. La comparación de ZIP se ajustó al mismo modo práctico, manteniendo la igualdad del XML. Tipos, lint y build se registran en logs de la versión final; el aviso previo de useEffect y los avisos del empaquetador permanecen.

Cuatro Word / 31 páginas renderizados y revisados; sin palabras fuera de página. Se recorrieron Mi año y Documentos con clics, selector de edad, avance de momentos y de actividad, y descarga real normalizada. Escritorio y móvil revisados, detector mecánico sin hallazgos. El renderer QA permite configurar su ruta porque el paquete documental cambió de versión; no se depende exclusivamente de una ruta de caché antigua.

Snapshot de aplicación antes/después del reinicio y del recorrido idéntico: tres proyectos, 32 actividades y cuatro alumnos. Las descargas cambian su presentación, no las filas ni el contenido fuente. No se regenera el proyecto «Una mesa para alimentarnos con cuidado». Ayni original sigue en su checkout propio; no hay migraciones, commit, push o despliegue.

## Rollback

Retirar `practical:true` de las rutas y del ZIP vuelve a la presentación anterior; conservar la opción para documentos ya emitidos. Retirar los accesos al lector vuelve a la descarga directa. La metadata y los lectores anteriores siguen compatibles. Revertir las reglas de prompt afecta solo generaciones futuras. No restaurar ni borrar datos docentes para hacer rollback de presentación.
