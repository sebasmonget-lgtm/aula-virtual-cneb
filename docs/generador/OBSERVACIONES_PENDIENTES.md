# Observaciones pendientes de la prueba docente

## Forma de trabajo acordada · 2026-10-27

La usuaria seguirá enviando sus observaciones durante la prueba. Inicialmente pidió registrarlas y esperar antes de cambiar la aplicación. El 27 de octubre autoriza arreglar el bloqueo y después aplicar las observaciones de alcance y distribución. Se conserva abajo el registro original y su cierre; cada nueva observación requiere revisar el alcance autorizado.

## 1. Evitar proyectos demasiado estrechos a partir de una necesidad concreta

**Observación precisada por la usuaria:** el chat sí puede preguntar por situaciones concretas. El problema es convertir automáticamente una necesidad puntual, como aprender a lavarse las manos, en un proyecto de dos semanas dedicado solo a repetir ese aprendizaje. En la captura, Ayni insiste en elegir un momento de higiene tras recibir una prioridad general; eso puede estrechar indebidamente los proyectos que propondrá para el año.

**Mejora pendiente:** usar los detalles concretos para comprender el aula y diseñar proyectos con un reto que permita experiencias variadas, relacionadas y progresivas durante su duración. No convertir cada hábito o dificultad en un proyecto independiente ni alargar una acción simple mediante actividades repetitivas. Distinguir lo que puede atenderse como rutina o actividad puntual de lo que justifica un proyecto de varios días. Ampliar la propuesta con coherencia, sin añadir temas o competencias solo para llenar tiempo.

El chat anual recoge prioridades generales, intereses del grupo, contexto familiar/comunitario, condiciones y recursos y acontecimientos del año; puede pedir ejemplos concretos cuando ayuden. Aceptar también respuestas amplias suficientes y evitar insistir en acotar una prioridad ya expresada. Mantener contexto suficiente para personalizar la previsión anual.

Profundizar en experiencias, materiales y decisiones de implementación en el chat de cada proyecto. Esta separación no prohíbe preguntas específicas en el chat anual ni implica volver a un chat de dos preguntas o producir un año genérico.

**Ejemplo de continuación esperada:** «Tendremos presentes la higiene y la alimentación saludable durante el año. ¿Qué otras necesidades o intereses importantes encuentras en tu grupo?» Es una referencia de intención, no una respuesta fija para todos los casos.

**Ejemplo del riesgo:** «lavarse las manos» no debe convertirse por defecto en diez días de repetir el mismo procedimiento. Puede formar parte de las rutinas y, si el contexto lo justifica, integrarse en un proyecto de cuidado y autonomía con experiencias conectadas. Ni ese título ni esa duración se imponen a todas las aulas.

**Evidencia:** captura aportada `codex-clipboard-f0c7d770-0198-4172-869d-5c891edee5f7.png` y confirmación explícita posterior de la usuaria para registrar esta observación y mejorar el chat más adelante.

**Estado:** pendiente de revisión conjunta. Sin cambios de código, prompts o datos; sin llamadas IA de prueba por esta anotación.

**Aplicado después con autorización expresa:** reglas v24 aceptan prioridades amplias y distinguen ejemplo concreto, rutina sostenida y proyecto con recorrido. Prueba de chat real acepta «higiene en general durante todo el año» sin volver a exigir un hábito. Se conserva exactamente la conversación docente existente; no se reescriben sus turnos anteriores. Véase `DISTRIBUCION_ANUAL_V24.md`.

## 2. Fallo al generar Mi año y mensaje sin explicación

**Observación:** al generar el año aparece «No se pudo completar la propuesta. Tus registros y borradores se conservan», con «Reintentar preparación». La usuaria pregunta por qué sucede; no es un paso esperado del flujo exitoso.

**Comprobación de solo lectura, 2026-10-27:** en el almacén activo hay once turnos de conversación listos y una tarea anual `5f846011-616a-47e0-be2f-1537cab243bb`, ya en segundo intento `running` iniciado a las 17:21:40 UTC. Aún no hay plan anual ni proyectos o actividades. El mensaje de captura corresponde al estado `failed` de la interfaz. No se ha iniciado un intento adicional, reiniciado el servidor ni cambiado la conversación.

**Límite del diagnóstico:** el ejecutor agrupa los errores en códigos genéricos; al reintentar limpia `error_code` y no conserva un historial de detalles por intento. El resultado fallido tampoco está guardado. Por ello no es posible atribuir este primer fallo a un motivo concreto con la evidencia disponible. El único error del stderr visible corresponde a `/manifest.webmanifest`, que después responde 200; no es prueba de la causa de la generación anual.

**Mejora pendiente:** conservar diagnóstico técnico seguro por intento (categoría, etapa y motivo controlado, sin secretos ni conversaciones en logs), distinguir fallos del proveedor y de validación y explicar de manera útil qué sucedió y qué puede hacer la profesora. Mantener recuperación de respuestas y evitar nuevos intentos automáticos que puedan duplicar consumo. Investigar la causa real con instrumentación segura cuando la usuaria indique trabajar las mejoras.

**Estado:** pendiente. Esta anotación no corrige ni reproduce el fallo y no declara identificado su origen. Cero llamadas IA iniciadas por el asistente durante la revisión.

**Reincidencia confirmada:** la segunda captura corresponde al segundo intento de esa misma tarea, ya `failed` con `errorCode: generation_failed`, actualizado a las 17:26:46 UTC del 27 de octubre. Siguen guardados los once turnos del chat y los cuatro alumnos, sin plan anual ni proyectos creados. Se considera bloqueo prioritario de la prueba. El código genérico no permite establecer si ambos intentos fallaron por el mismo motivo interno. No lanzar un tercer intento a ciegas ni pedir repetir el chat; conservar esta conversación para la investigación y recuperación cuando se trabajen las mejoras.

**Resuelto por solicitud posterior de la usuaria, 2026-10-27:** se autoriza arreglar este bloqueo ahora. Reproducción controlada identifica corte de conexión sin respuesta; transporte streaming solo para el año documental completa una generación real en 382776 ms y valida sus 15 posiciones. Se recupera la misma tarea con esa respuesta completa sin otra llamada y el guardado automático existente crea Mi año. Once turnos, colegio y cuatro alumnos exactamente conservados; cero proyectos/actividades desarrollados. Errores futuros tienen códigos seguros y mensajes más útiles. La observación 1 y las mejoras pedagógicas del chat siguen pendientes. Informe: `RECUPERACION_GENERACION_ANUAL_20261027.md`.

## 3. Distribución curricular del año generado y repetición inicial de «Se conoce»

**Observación de la usuaria:** al revisar Mi año parece que la mayoría de propuestas repiten «Se conoce» y que no se desarrollan todas las actividades/competencias.

**Auditoría de solo lectura:** plan activo `0c5efbb7-e2b9-419f-9f6d-4f5bedb16838`, versión 1, quince propuestas; cero proyectos y actividades desarrollados. «Se conoce» es el alias de presentación de Construye su identidad (`PS_IDENTIDAD`), correctamente asociado en datos e interfaz, sin fallback erróneo. Aparece en P1, P3, P5 y P6: cuatro de quince, concentrados cuatro de los primeros seis. En las tres edades las selecciones son iguales por proyecto, con actuaciones distintas por edad.

| Competencia | Propuestas donde se focaliza |
|---|---|
| Construye su identidad | 1, 3, 5, 6 |
| Convive y participa democráticamente | 1, 2, 7 |
| Motricidad | 8, 12 |
| Comunicación oral | 6, 13, 14, 15 |
| Lectura | 3, 7, 10, 13 |
| Escritura | 14 |
| Lenguajes artísticos | 7, 11, 12, 13 |
| Cantidad | 5, 9 |
| Forma, movimiento y localización | 4, 8, 11 |
| Indagación | 2, 4, 9, 10 |
| Aprendizaje autónomo | 15 |
| Entornos virtuales | Solo oportunidades cotidianas, condicionadas a contar con dispositivo |

Para cada edad están representadas las doce competencias habilitadas en esta aula: once en propuestas y TIC en oportunidades cotidianas. No se declara que esos recursos digitales estén confirmados ni que una mención asegure desarrollo efectivo. Trece propuestas tienen exactamente dos competencias; únicamente P7 y P13 tienen tres. Escritura y aprendizaje autónomo quedan focalizados en una sola propuesta y no tienen oportunidades cotidianas explícitas en la salida. Sus frecuencias aquí cuentan proyectos, no días, experiencias ni avances reales de niños.

**Hallazgo de implementación:** `validateMultiAgeAnnualProposal` comprueba cobertura de cada par edad/competencia al menos una vez, edades y mínimo de dos por propuesta. No comprueba recurrencia, concentración por bimestres, progresión o calidad de la combinación. Superar ese contrato no demuestra equilibrio pedagógico. La regla actual del prompt pide seleccionar más competencias cuando corresponda, pero esta salida sigue quedándose casi siempre en el mínimo. Las instrucciones restringen everyday_opportunities a pares todavía ausentes de proyectos; no se pueden interpretar como una planificación completa de todas las rutinas, talleres y sectores.

**Mejora pendiente:** revisar la distribución y las oportunidades de retorno a los aprendizajes durante el año; combinar competencias según las experiencias concretas y admitir más de dos cuando tengan acción/evidencia propias. Distinguir foco de proyecto y oportunidades sostenidas de rutinas, talleres y juego en sectores; mostrar cobertura útil para la profesora. No imponer números de repeticiones como supuesta exigencia MINEDU, cuotas iguales ni añadir competencias para rellenar. Considerar el vínculo posterior que limita el proyecto a las competencias de su propuesta anual al diseñar la corrección, evitando dejar la amplitud solo en el prompt de proyecto.

**Estado:** pendiente para la revisión conjunta; no se modifica ni regenera este año. Cero llamadas IA nuevas. Datos agregados de auditoría en `.local/annual-coverage-audit-20261027.json`, instantánea privada en `.local/annual-coverage-review-20261027.json`.

**Aplicado después por solicitud expresa:** prompts v24, brief de distribución y revisión por edad/bimestre. Generación real aceptada y guardada como v2, conservando v1: once propuestas con tres competencias y cuatro con cuatro; escritura pasa de una a seis, cantidad de dos a cinco y motricidad de dos a cuatro. Hay oportunidades continuas que no se restringen a cubrir ausencias. Once turnos y cuatro alumnos idénticos, cero proyectos desarrollados. Pruebas y límites: `DISTRIBUCION_ANUAL_V24.md`.

## Auditoría del ZIP P02 aportado por la docente — 2026-10-27

Revisión de solo lectura: once Word y sus 48 páginas renderizadas; cero fallos de conversión o texto fuera de página. Original ZIP conservado por SHA256. Evidencia privada: output/generador-documentos/auditoria-p02-20261027/manifest.json, word/render-audit.json, review-findings.json y hojas de contacto. No se modifican documentos, app, prompts ni datos docentes.

Cumple identificación CELESTE/JARDIN 428/edades/docente/fechas, primer día de planificación conjunta, tres competencias explícitas, apoyos/criterios/evidencias por edad, instrumento previsto, registros vacíos y estética. Indaga aparece en siete actividades, Convive en siete y Escribe en cuatro; 58 menciones de referentes corresponden al catálogo. La presencia y pertenencia de los IDs no certifica la coherencia de la experiencia.

Pendientes pedagógicos: el recorrido se centra en preparar observación, representar y dejar preguntas abiertas, sin día explícito de obtención de información del entorno ni prueba de una acción de cuidado. A02/A05/A07 reiteran modelos; A03/A08 preparan preguntas o notas similares. Varias actividades prevén comparar datos para Indaga de 5 años sin organizar su obtención, especialmente A03/A06. Convive se evalúa reiteradamente mediante guardar piezas/hojas más que mediante la acción comunitaria que da origen al proyecto. A08 posterga preguntar a la profesora sin un paso posterior claro de respuesta. Todos los recursos siguen por verificar. La situación usa Se ha informado, atribuida de manera indirecta, aunque sí ubica niños, aula y colegio.

Pendientes de presentación: diez actividades de cuatro páginas más maestro de ocho; propósito repetido exactamente entre portada y cuerpo en las diez. A01 separa cierre en la página siguiente al desarrollo; A07 destina su cuarta página a registro/referencias (63 palabras). Ruta del maestro ocupa tres páginas por repetir materiales. Preservar estética y mejorar flujo, sin reducir letra ni eliminar criterio/evidencia. Estas observaciones quedan para autorización de mejora; no se reescribe el proyecto existente.

**Aplicado por solicitud posterior de la usuaria:** v27 corrige el generador, sin reescribir P02 guardado. Situación con episodio comunicado; primer día construye el proyecto completo con niños; maestro por fecha vincula posteriores actividades a acciones/evidencias concretas; materiales básicos asumidos. Dos rondas reales completas y revisión de Word, con mejoras entre rondas. Evidencia y límites: RUTA_DIARIA_Y_MATERIALES_BASICOS_V27.md. La copia de revisión se entrega aparte; no se presenta el archivo docente anterior como regenerado.

## Auditoría del ZIP P03 aportado — 2026-10-27

Quince Word (maestro y catorce actividades), 64 páginas renderizadas: proyecto diez páginas, actividades 54. Todas las páginas inspeccionadas mediante ocho hojas de contacto y dos páginas críticas de ruta abiertas a tamaño individual. Cero errores de conversión y cero palabras fuera de página. Original conservado por SHA256 a75e1810c29e07f8b926c56ebb6446659a03eaaa852c216631bd9dda76d1100e. Evidencia output/generador-documentos/auditoria-p03-20261027: manifest, word/render-audit, curriculum-audit y review-findings.

Cumple episodio del juego de cocinar, identidad del aula, primera actividad de planificación del proyecto completo, cuatro competencias explícitas y focos diarios, criterios/evidencias por edad y registros sin resultados inventados. Frecuencias: Identidad siete actividades, Cantidad seis, Lectura tres y Escritura tres. Se validan 69 variantes por edad y 103 menciones de referentes contra catálogo; no se equipara pertenencia formal con coherencia pedagógica.

Todavía no está suficientemente resuelto: preparar comida saludable se convierte en comida imaginaria sin aclarar modalidad; no hay receta ni preparación acordada. A04/A06/A11/A13 repiten el reparto con incorporación/retiro de participantes sin profundización clara. A03 pide un relato pero no aporta texto ni referencia; A05 pide dibujos de acciones de cuidado sin concretarlos; A08 deja crear una nota alternativa. Son problemas de utilidad del producto, no se declaran incumplimientos legales o formatos obligatorios del MINEDU.

Error comprobado de contenido: ruta de días 11, 13 y 14 termina en las nuevas op, antes de la y las nuevas, respectivamente. Las mismas cadenas de exactamente 320 caracteres están en el maestro guardado, por tanto no es recorte de la vista previa ni de la tabla Word. No se identifica un recorte local en el renderizador ni se inventa una causa de transporte; revisar redacción/capacidad del campo y control de frases completas. No se corrigen estas fuentes ni se regenera el ZIP durante la auditoría.

Presentación: estética conservada y guía de tres momentos junta; maestro de diez páginas con ruta de cuatro páginas y varias últimas páginas diarias de solo registro/referencias (63–75 palabras) siguen siendo extensos. La guía MINEDU de planificación, pp impresas 67–69/75, orienta a proyección flexible y secuencia coherente con propósitos; no prescribe esos números de páginas ni autoriza rellenar días repitiendo un ejercicio.

Contexto verificado del P03: recibió solo cinco mensajes docentes, sin propuestas anteriores; Las tres carecía de referente explícito. v29 posterior ya añadió contexto de referencias. Por solicitud de considerar conversación completa, se amplía para próximas preparaciones a transcript con mensajes completados de ambos autores, opciones de respuesta y procedencia. El último resumen del asistente se incluye como propuesta, nunca como hecho docente; intención y correcciones docentes prevalecen. Capturas históricas por defecto y proyectos anteriores no cambian. Cero llamadas IA nuevas en esta revisión; no se afirma haber regenerado un proyecto con la transcripción completa. Validación y activación finales se registran al cerrar.

Cierre: transcripción completa activada solo en variante local, launcher 37372 y mismo almacén, tras cero trabajos activos. Diecinueve pruebas PASS, typecheck/build PASS, lint sin errores con aviso React previo. Workspace, planes y tres chats idénticos tras reinicio: cuatro alumnos, veinte turnos, dos proyectos y veinticuatro actividades. ZIP original idéntico por hash. Cero IA nueva, no se regeneró ningún documento. Recibo privado .local/p03-full-transcript-preservation.json. Los hallazgos pedagógicos, recursos ausentes y frases incompletas de este P03 siguen pendientes; no se presentan como corregidos por enviar el chat completo.

**Mejora aplicada posteriormente por solicitud docente:** v30 reemplaza el diseño independiente de días por maestro V4 con aporte previsto, nuevo reto y enlace consecutivo; conserva intención/propósito propios y documentos anteriores. Una prueba real aislada de catorce actividades muestra avance desde consulta/ensayos hacia preparación, revisión y comunicación. No se atribuye al P03 anterior ni se afirma resolver automáticamente cualquier recurso faltante. Evidencia y límites: MAESTRO_SECUENCIAL_V30.md.

## Comprobación posterior de secuencia V4

Dos proyectos completos de 14 y 10 días comprobados; precisión posterior de la acción central en la guía y lote regenerado en QA. Se conserva toda fuente docente. Evidencia y límites: DOS_PRUEBAS_SECUENCIALES_V30.md. No equivale a certificar cualquier tema ni eliminar reiteraciones pedagógicas útiles.

## Tres temas y procedimientos concretos V31

Rondas de plantas, tienda y movimiento completas. Se refuerza pertinencia/criterios, se separan referentes provisionales del año de la selección del maestro y se prueba escritura focalizada para documentos. No se editan Word guardados ni se certifica toda temática. Treinta y tres Word finales, 49 regresiones PASS; fuentes docentes intactas. Evidencia y límites en TRES_RONDAS_GENERALES_V31.md.


## P04 recuperado · auditoría de solo lectura 2026-10-28
Estructura y consulta práctica cumplen: once Word/47 páginas, tres competencias, 48 variantes por edad, 108 menciones válidas de referentes. Diez guías completas en una página y secuencia conectada; estilos e ilustraciones preservados. Ajustes pendientes: A07 no aclara si los dos vertidos/registros son individuales o rondas de todos; A10 debería comparar explícitamente ideas iniciales con datos observados para una explicación provisional, además de preguntar qué sigue abierto. Siete actividades dejan una cuarta página de menos de cien palabras de registro/referencias. No se alteran fuentes, app ni prompts durante la revisión. Detalle y límites: `AUDITORIA_P04_20261028.md`; evidencia en output/generador-documentos/auditoria-p04-20261028.


**P04 · mejoras aplicadas al generador futuro por autorización posterior:** V33 convierte organización/revisión final en contrato y compone la misma guía para pantalla/Word; presentación nueva V3 compacta citas y registro. Prueba real distinta de puentes: diez actividades, once Word/42 páginas, guías completas juntas y sin cola de referencias sola. 64 regresiones y gates PASS. Activación local conserva los 49 cuerpos Word, 27 turnos y cuatro alumnos. El P04 auditado no fue reescrito. No se afirma corrección universal por superar campos estructurales. Evidencia: `MEJORAS_GENERALES_Y_PRUEBA_PUENTES_V33.md`.


## P09 · revisión posterior de generación V33
La salida real del usuario muestra que cumplir schema y la prueba de puentes no garantiza concreción ni selección semántica. Pasa secuencia, primera planificación con niños, organización, cierre, edades y estética. Pendientes: recoger episodio/pregunta/foco en chat (tres turnos se centraron en contacto), concretar fuentes informativas realmente utilizables, seleccionar referentes por actuación en lugar de repetir 1/2/3 y evitar residuos de otro idioma. Ajuste menor: última hoja de enfoques y tablas divididas entre edades. Once Word/40 páginas, 48 variantes, 122 menciones oficiales válidas formalmente. Solo auditoría; no reescribir P09 ni cambiar app sin solicitud. Evidencia y límites: `AUDITORIA_P09_20261028.md`.


**P09 · decisión y mejora posterior V34:** usuario permite inventar/inferir un episodio para situación significativa si falta, marcado una vez como propuesta; el recurso informativo queda pospuesto. Se corrige la causa estructural de herencia exacta mediante política 2 solo en proyectos nuevos y selección oficial por actividad. Contrato de español previene fragmentos de otro alfabeto; copia ZIP corrige únicamente la palabra dañada del maestro. Fuentes P09 de la cuenta, sesenta cuerpos Word, 32 turnos y alumnos intactos. 69 pruebas, recorrido sintético de ocho días/exportación y una prueba corta IA real; no se declara nueva generación completa. Referentes del P09 anterior no se sustituyen. Detalle `SITUACION_PROPUESTA_Y_REFERENTES_DIARIOS_V34.md`.


## V35 · prueba completa posterior a P09
Nuevo caso de animales sin episodio en el contexto: situación propuesta concreta y secuencia de diez días generadas con IA real. Se corrigen anclas duplicadas, duplicación de identidades curriculares y exigencia artificial de crear; campos por competencia/edad y referentes independientes guardan/exportan correctamente. Presentación 4: 38 páginas, guías íntegras juntas y sin registro solo; sin reescribir textos de la IA. 87 pruebas PASS y fuentes docentes intactas. Provisión de lecturas/secuencias ilustradas sigue pendiente por decisión del usuario; los errores de la prueba y su corrección no se ocultan ni se atribuyen a P09 modificado. Evidencia `PRUEBA_COMPLETA_ANIMALES_V35.md`.
