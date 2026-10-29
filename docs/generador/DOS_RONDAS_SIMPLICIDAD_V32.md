# Dos rondas de simplicidad · V32 · 2026-10-28

## Resultado y alcance

Se simplificó la generación futura de proyectos y actividades de la variante independiente. Se mantienen situación significativa, pregunta, propósito, planificación con los niños, recorrido, competencias oficiales, criterios/evidencias por edad, condiciones, enfoques y registros vacíos. No se regeneró el año ni se modificaron los proyectos docentes existentes.

El prompt V32 usa instrucciones directas, sujetos reconocibles y acciones concretas. La segunda ronda añade lenguaje cotidiano también para la situación y el propósito, conservando los nombres oficiales del CNEB. No añade llamadas de IA ni una revisión remota a la generación habitual.

La presentación 2 se guarda al confirmar cada resultado V32 y se transporta hasta el documento. Los documentos sin esa marca conservan su exportación anterior. Inicio/Desarrollo/Cierre se leen a todo el ancho, con pasos breves y espacio entre apartados. Los títulos de la matriz explican criterio y evidencia en palabras comunes. Se mantiene Poppins, papelería, ilustraciones, portada y colores de Ayni. Las referencias van después de la guía y distinguen edades; el contenido oficial completo permanece en la fuente guardada.

La guía en pantalla reutiliza ActivityRunView: etiquetas sencillas para seleccionar edad y consultar el CNEB. Se corrigió la separación de listas numeradas: Intl.Segmenter interpretaba «1.» como una oración y la interfaz añadía otro número. Ahora cada acción numerada se conserva completa, incluidas sus preguntas. La prosa sin lista conserva su lectura habitual.

## Dos pruebas con IA real, aisladas

| Ronda | Proyecto | Edades | Competencias | Actividades | Word | Páginas |
|---|---|---|---:|---:|---:|---:|
| 1 | Creamos una tienda para jugar juntos | 4 y 5 | 4 | 10 | 11 | 45 |
| 2 | Inventamos caminos para jugar en el patio | 3 y 4 | 4 | 10 | 11 | 45 |

Se hicieron seis llamadas reales (dos maestros con primer día y cuatro lotes), sin reintentos ni sustituciones. Coste registrado de QA: USD 0.8204935. Las conversaciones de entrada y la propuesta anual se sembraron como casos sintéticos; no son dos pruebas nuevas del chat en vivo. Ambas preparaciones terminaron 10/10. El segundo caso se lanzó tras revisar el primer maestro y mejorar su instrucción editorial.

La tienda avanza de organizar envases a crear y probar mensajes/pedidos, revisarlos, ensayar y abrir el juego. Caminos avanza de explorar movimiento a transportar, comparar curvas, coordinar con tela, crear juegos, explicar, modificar accesos y compartir. Los 18 enlaces entre fechas coinciden con el maestro; cada fecha conserva título, foco curricular y edades. Los desarrollos no son duplicados exactos; la pertinencia y progresión se revisaron también leyendo el contenido.

Las 20 guías contienen Inicio, Desarrollo y Cierre en una sola página. Los Word completos tienen portada y apartados curriculares adicionales: simplificar la consulta no significa prometer una actividad entera de una página. Los proyectos tienen siete páginas y las actividades tres o cuatro. Se revisaron las 90 páginas finales en láminas y las páginas críticas a tamaño completo; sin texto fuera de página, marcadores sin completar ni superposiciones. Puede haber espacio libre al final por conservar matrices y registros legibles.

Los dos ZIP contienen exactamente sus once documentos; las partes DOCX coinciden con las exportaciones individuales, excluyendo solo fechas internas de docProps/core.xml.

Fuentes reproducibles: `output/generador-documentos/secuencia-proyecto-v30/simple-v32/iteracion-01/` e `iteracion-02/`, con solicitudes/respuestas, maestros, documentos, uso, Word, ZIP, render-audit y láminas. `quality-checks.json` y `layout-checks.json` recogen verificaciones de ambas rondas.

## Conservación y activación

Reinicio exclusivamente del lanzador de la variante local. Respaldo previo en `.local/backups/simple-v32-before-activation`. Después del reinicio: workspace, planificación y los 16 ámbitos de conversación idénticos; cuatro alumnos, 25 turnos y los cuerpos XML de 38 Word sin cambios. Recibo privado `.local/simple-v32-activation-preservation.json`. HTTP 200 en la web y consulta API correctas. No se desplegó ni se alteró la carpeta del Ayni original.

## Validación y límites

36 pruebas pertinentes pasaron, incluidas conservación de plantilla, presentación versionada al confirmar maestro/lotes, referencias y edades, recuperación, idempotencia y listas numeradas. Typecheck, lint y build pasaron; lint conserva una advertencia anterior de dependencias en diagnostic-generation-control.tsx. Registros `.local/simple-v32-*.log`.

La revisión del navegador comprobó lectura, selección de edad y paso entre momentos sobre documentos guardados, sin generación ni edición docente. No se ejecutó esta vez una nueva matriz de dispositivos ni una apertura en Microsoft Word de escritorio: el render visual se hizo con LibreOffice empaquetado. Dos casos no garantizan calidad semántica universal ni ausencia de fallos del proveedor; se conservan validaciones y recuperación existentes.

Rollback: revertir solo los cambios de esta entrega y reiniciar la variante. La presentación es metadato adicional; no hay migración ni reescritura de documentos docentes.
