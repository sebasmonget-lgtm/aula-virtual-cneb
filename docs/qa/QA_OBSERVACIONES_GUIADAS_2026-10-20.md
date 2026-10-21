# Observaciones libres y guiadas: recorrido y revisión pedagógica

**Decisiones posteriores de la usuaria:** mantener el vínculo automático entre criterio y competencia; no se implementa la propuesta de cambiarlo. Fecha, aclaración breve, vocabulario sencillo y disponibilidad digital se ajustaron localmente según `QA_AJUSTES_OBSERVACIONES_2026-10-20.md`, pendientes de publicar. Indagación queda por explicar y acordar; el cuadro siguiente conserva la auditoría original y no constituye autorización para aplicar todas sus propuestas.

## Resultado verificado

La usuaria autorizó crear observaciones coherentes con los diez perfiles de demostración, tomar capturas y evaluar críticamente la guía. Añadió dos fotografías generadas y exigió correspondencia entre foto y relato.

Se guardaron por UI diez registros libres y diez guiados, uno de cada tipo por niño. Tras recargar, los veinte textos coinciden exactamente con el plan local. Se recorrieron seis experiencias: juego, movimiento/arte, cantidad/espacio, indagación, historias y autorregulación. No se usó dispositivo digital ni se atribuyó esa actuación a los niños. Las competencias libres se eligieron manualmente; no se solicitó clasificación IA ni se asignaron niveles. Los diez borradores de entrevista siguen sin confirmar. No se generó diagnóstico ni Mi año.

Son relatos sintéticos para QA, no hechos observados, entrevistas auténticas ni evaluaciones de menores. La fecha visible es 18/12/2026 por el reloj QA del navegador; no representa la fecha real de una observación. Veinte registros no constituyen un diagnóstico integral ni una cuota recomendada por MINEDU.

Las fotos generadas corresponden al estado final descrito: tapa azul flotando/piedra sumergida para Abril; puente con dos apoyos y carro rojo debajo para Mateo. Se verificó su apertura desde las rutas privadas después de guardar. No contienen personas. Una imagen del resultado no acredita palabras, intención, autoría, predicción ni proceso: eso pertenece al relato sintético. Procedencia y prompts completos están en `outputs/ayni-recorrido-20261020/evidencias/procedencia.json`. El video debe identificar el material generado como demostración.

## Referentes consultados y alcance

Se releyeron extractos conservados de las fuentes oficiales de la auditoría anterior: [cartilla de evaluación diagnóstica de Inicial](https://repositorio.minedu.gob.pe/handle/20.500.12799/12683), pp. 6–13; [CNEB](https://www.minedu.gob.pe/curriculo/pdf/curriculo-nacional-de-la-educacion-basica.pdf), evaluación formativa, pp. 177–181; [Programa Curricular de Inicial](https://www.minedu.gob.pe/curriculo/pdf/programa-curricular-educacion-inicial.pdf), planificación/evaluación y escritura, p. 131. El acceso web actual al repositorio devolvió verificación de seguridad; los PDF grandes excedieron el lector web. Se usaron las copias oficiales previamente conservadas, sin afirmar una descarga nueva ni una revisión de toda la normativa.

La cartilla propone recoger información individual en diversas situaciones, registrar hechos y considerar barreras; el CNEB orienta a analizar evidencias con criterios y capacidades combinadas. Estas fuentes fundamentan el juicio pedagógico, pero no obligan a una plantilla, cantidad fija de registros o campos concretos de interfaz. Las mejoras de producto siguientes son recomendaciones de esta auditoría.

## Juicio general

La guía es pedagógicamente útil como apoyo para observar; no basta por sí misma para evaluar integralmente competencias. El catálogo `diagnostic-v4.6` contiene nueve propuestas, de las cuales siete aparecen en esta aula de cinco años (sin L2 ni Religión), con veinticinco focos. Se revisaron el catálogo, sus referentes editoriales por edad, la proyección y el formulario. Se ejecutó el guardado en seis experiencias; las otras tres se revisaron en código, sin simular su aplicación.

Conservar: situaciones lúdicas, elección y participación voluntaria, estrategias infantiles, preguntas abiertas, adaptación por edad, respeto a gestos y ritmos, registro literal, fotos opcionales, ausencia de niveles al guardar. En convivencia se evita provocar conflictos; en arte no se pide copiar modelos; en lectura no se exige acertar el argumento; en escritura se admiten aproximaciones propias. El conteo se presenta expresamente como cantidad, no nivel.

| Hallazgo | Evidencia e implicación | Mejora propuesta |
| --- | --- | --- |
| Alta: fecha y apoyo de guiadas menos precisos que libres | El diálogo guiado solo recibe niño, nota y foto; no permite fecha del hecho, momento libre ni apoyo estructurado. El texto puede describir la ayuda, como se hizo aquí, pero requiere recordarlo. Registrar más tarde puede confundir captura y observación. | Separar fecha del hecho y de guardado, ofrecer contexto y ayuda recibida opcionales; conservar literal e historial. No convertir «con ayuda» en nivel bajo. Compartir la proyección con resúmenes y Word. |
| Alta: asociación fija puede aparentar pertinencia | Cualquier nota no vacía queda vinculada a la competencia del criterio; no se comprueba correspondencia semántica. El guardado fue correcto para los ejemplos escritos, pero eso no demuestra que todo texto pertenezca a ese foco. | Mostrar una revisión sencilla del ajuste al criterio; permitir conservar como libre u otro foco sin alterar el hecho. No resolverlo con clasificación obligatoria, bloqueo por palabras ni un nivel automático. |
| Alta: focos parciales y conteos no significan suficiencia | Elegir sector solo ilumina una parte de Identidad; señalar diferencias solo una parte de Indaga. La prioridad combina registros de la misma competencia, aun de otro criterio. La advertencia de cantidad es buena, pero no informa qué dimensiones/contextos faltan. | Mantener el conteo para organizar y añadir consulta de focos/contextos y una revisión docente de suficiencia. Evitar declarar competencia evaluada tras una o dos notas o exigir una cuota uniforme. |
| Media: indagación queda incompleta como recorrido | Preguntar, comparar y volver a probar ofrecen entradas pertinentes. Compartir el hallazgo se vincula exclusivamente a Oralidad, aunque puede mostrar comunicación de la indagación. No hay un momento explícito para conservar datos y contrastar idea inicial/resultado. | Añadir esa oportunidad sin pedir explicación científica formal; aceptar marcas, dibujos, objetos y gestos. Permitir vincular una segunda competencia cuando el relato efectivamente la sustente, con revisión docente. |
| Media: escritura propia y referente de revisión deben distinguirse | `read_own_message` invita a releer marcas propias; su referente editorial para cinco años dice revisar la producción. El desempeño oficial de p. 131 menciona revisar el escrito dictado. La actividad es posible, pero esa paráfrasis amplía el referente. | Identificar criterio contextual y referente oficial por separado; ofrecer también dictado a la docente, relectura y cambios para comprobar el mensaje. No convertir las marcas propias en error ni atribuirles una cita oficial. |
| Media: recomendación digital no atiende disponibilidad | El catálogo declara `required_resource: digital_creation`; el selector/ranking de esta pantalla no consulta disponibilidad y terminó recomendando el mensaje digital por falta de registros. Las instrucciones sí condicionan su uso al recurso. | Permitir indicar disponibilidad o posponer esa propuesta sin marcar dificultad del niño. Mantener la alternativa cotidiana y la actuación efectiva del niño, sin evaluar acceso familiar a tecnología. |

## Revisión por experiencia

| Experiencia | Valor y ajuste recomendado |
| --- | --- |
| Nos conocemos y organizamos el juego | Elección, intercambios y acuerdos contextualizados; ampliar oportunidades de explicar preferencias, emociones y autorregulación. No confundir tiempo de acercamiento con dificultad. |
| Nos movemos y creamos | Movimiento seguro y creación abierta; registrar decisiones y significados, no rapidez ni semejanza a un modelo. Asegurar alternativas de participación. |
| Contamos y encontramos lugares | Reparto, comparación y rutas con sentido; documentar estrategias y comprobación, variando reto por edad y experiencia. No exigir conteo convencional como única respuesta. |
| Exploramos nuestro entorno | Buena exploración concreta; completar registro de datos, contraste y comunicación de hallazgos, como se describe arriba. |
| Escuchamos y contamos historias | Anticipación y escritura con destinatario son pertinentes; sumar contraste tras leer, interpretación/opinión cuando proceda y distinguir revisión del dictado. No intentar cubrir Lectura con una portada solamente. |
| Probamos nuestro plan | Meta, estrategia y revisión con preguntas breves son útiles a cinco años. Distinguir plan infantil de obedecer instrucciones y conservar el apoyo específico. |
| Creamos un mensaje digital | Participación activa, acompañamiento y propósito comunicativo son adecuados; condicionar recomendación a recurso disponible. No se ejecutó con estos niños. |
| Castellano L2 y creencias/cuidado | Solo revisión de catálogo; no aparecen en el aula. Es positivo respetar lengua familiar, voluntariedad y contexto. No se ha validado aplicación ni pertinencia para otras aulas. |

## Evidencia técnica y continuidad

Código inspeccionado: `guided-observation-workspace.tsx`, `spontaneous-diagnostic-v4.tsx`, `interviews-workspace.tsx`, `diagnostic-ui-flow.mjs`, `diagnostic-experiences-v4.mjs`, `pedagogical-blocks.mjs`, `diagnostic-catalog-v4.mjs` y `knowledge/diagnostic-experiences/catalog.json`. Las referencias `observable_patterns` son editoriales; no deben presentarse como transcripción literal del Programa.

Prueba funcional ejecutada: veinte guardados mediante la UI publicada, veinte coincidencias tras recarga, dos medios privados abiertos y vistos. No se verificó el Word diagnóstico en esta ronda, ni se alteró código, migraciones o despliegue. No corresponde declarar typecheck/lint/build nuevos por esta carga de QA y documentación. Antes de corregir, diseñar un cambio vertical mínimo con pruebas de fechas, literalidad, permisos, correcciones e igualdad de información entre interfaz y documento.

Artefactos ignorados por Git: `observaciones-ejemplo.json`, `verificacion-observaciones.json`, `evidencias/`, `capturas/004*` y secuencia/guion actualizados dentro de `outputs/ayni-recorrido-20261020/`. Capturas de página completa sirven para trazabilidad; las tomas de pantalla y fotos sirven para montaje. No hay video generado ni publicado. La pantalla queda en observaciones para revisar antes del siguiente paso.
