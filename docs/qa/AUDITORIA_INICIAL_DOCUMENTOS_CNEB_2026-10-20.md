# Auditoría inicial de los documentos de Ayni Aula

Fecha: 20 de octubre de 2026. Base local: `b3fc88d`. Estado: auditoría de lectura y exportación; sin correcciones de producto ni de datos pedagógicos.

Las observaciones guardadas dentro de una actividad sí llegan a su Word. El problema confirmado en la muestra no es la desaparición de registros: existen diferencias entre la orientación docente que conserva la actividad, su distribución en Hoy y lo que imprime Word. La calidad pedagógica debe revisarse desde el Plan Maestro y sus lectores compartidos, sin sustituir criterios confirmados para adaptar un archivo aislado.

## Alcance y evidencia

Se consultó exclusivamente el aula de QA ya usada por el proyecto, dentro de una transacción PostgreSQL `READ ONLY`, cerrada con rollback. Cero escrituras canónicas, llamadas a IA, cambios de reloj, migraciones o despliegues. No se enviaron registros de niños a proveedores generativos.

El catálogo contiene 47 registros: 21 actividades activas, dos proyectos activos, un plan anual activo, diez informes familiares activos, once informes familiares históricos y dos cierres históricos confirmados. No contiene un resumen diagnóstico descargable. Se conservaron las versiones históricas y se seleccionaron 35 fuentes para exportación local: las 34 activas y el cierre confirmado más reciente. Que el cierre esté confirmado como versión histórica no demuestra que el período siga cerrado actualmente.

Se revisaron los campos pedagógicos de las 21 actividades y los dos proyectos. Las comprobaciones automáticas sobre los 35 Word verifican procedencia y presencia de texto; no sustituyen una revisión semántica de cada conclusión individual. Los diez informes familiares reúnen 120 secciones con lectura familiar y 120 niveles confirmados.

Se renderizó una muestra de seis archivos mediante `render_docx.py`: plan anual, proyecto de cuentos, actividad de lectura sin registros, actividad con registros, actividad de escritura e informe familiar. Resultado: 51, 10, 4, 6, 4 y 13 páginas, respectivamente. La inspección visual de esta ronda cubrió doce páginas seleccionadas y las cuatro páginas del Word originalmente adjunto; no se declara revisión visual de las 88 páginas renderizadas ni de los 35 archivos completos. La muestra familiar se generó sin cargar fotografía o asistencia externa: sirve para revisar texto y secciones, no para certificar la carátula completa que entrega cloud.

Evidencia privada, ignorada por Git: `.local/qa-auditoria-documentos-20261020/`. Contiene inventario, fuentes oficiales con hashes, 35 Word, comprobaciones y renders. No adjuntar esa carpeta al repositorio: contiene registros nominales de QA. El muestreo corresponde a cinco años y a contenido ya guardado; no demuestra calidad de generaciones nuevas ni cobertura funcional de tres y cuatro años.

## Fuentes oficiales consultadas

Se descargaron los PDF completos para consulta y se leyeron los apartados pertinentes a esta muestra. No se afirma haber revisado toda la producción documental del MINEDU.

| Fuente | Apartados usados | Aplicación a la auditoría |
| --- | --- | --- |
| [Currículo Nacional de la Educación Básica](https://www.minedu.gob.pe/curriculo/pdf/curriculo-nacional-de-la-educacion-basica.pdf) | Orientaciones pedagógicas y evaluación formativa, pp. 171–182 | Contrastar competencias con actuaciones, criterios, retroalimentación y comunicación de resultados. |
| [Programa Curricular de Educación Inicial](https://www.minedu.gob.pe/curriculo/pdf/programa-curricular-educacion-inicial.pdf) | Caracterización y principios del Ciclo II; planificación y evidencias; desempeños de cinco años de Convivencia, Lectura, Escritura y Arte, pp. 87, 125, 131 y 137 | Verificar pertinencia de la actuación propuesta y distinguir referencia oficial de criterio contextualizado. |
| [La planificación en la Educación Inicial, 2019](https://repositorio.minedu.gob.pe/handle/20.500.12799/6518) | Planificación anual, pp. 20–22; proyectos, unidades y actividades, pp. 65–71 | Flexibilidad, participación infantil, previsión de recursos y registro de evidencias. |
| [Guía de proyectos de aprendizaje en Inicial, 2019](https://repositorio.minedu.gob.pe/handle/20.500.12799/6517) | Definición, características, origen y primeras decisiones, pp. 8–15 | Una propuesta docente puede iniciar un proyecto; su desarrollo requiere decisiones y aportes de los niños. |
| [Evaluación diagnóstica para conocer a nuestras niñas y nuestros niños](https://repositorio.minedu.gob.pe/handle/20.500.12799/12683) | Observación, entrevista y registro de hechos, pp. 6–12 | Separar información familiar, observación individual e interpretación. |
| [RVM 094-2020-MINEDU](https://www.gob.pe/institucion/minedu/normas-legales/541161-094-2020-minedu) y [modificación RVM 048-2024-MINEDU](https://www.gob.pe/institucion/minedu/normas-legales/5518274-048-2-24-minedu) | Definiciones y criterios de evaluación; modificación de 5.1.1.3 y del informe de progreso, anexo I, pp. 5–7 del PDF de 2024 | Evidencias relevantes, juicio docente y conclusiones descriptivas. En Inicial II la modificación exige conclusiones para A, B y C; en AD quedan a criterio docente. |

Los hashes del CNEB y del Programa Inicial coinciden con las fuentes canónicas ya registradas por el proyecto. Las guías ofrecen orientaciones; una plantilla, portada, cuota de criterios o cantidad de páginas no se convierte por ello en exigencia normativa. La lectura de las normas citadas no constituye una certificación integral de cumplimiento de toda la normativa vigente.

## Observación desde Hoy hasta el Word

1. `ordinary-observation-dialog.tsx` envía el `activityId` cuando el formulario se abre dentro de una actividad, también en captura libre. La libre no recibe un criterio por inferencia.
2. `saveOrdinaryObservation` valida docente, alumno, aula y actividad y conserva el vínculo en `ordinary_observations.activity_id`. La captura guiada conserva además criterio y, cuando se indica, momento.
3. `loadActivityObservations` reúne registros modernos y evidencias anteriores de esa actividad, aplica las correcciones vigentes y excluye registros anulados.
4. `loadSavedDocument` incorpora esa proyección como `registered_evidence`.
5. La descarga normal vuelve a leer la fuente; no reutiliza el detalle abierto en el navegador. La respuesta HTTP usa `private, no-store`.
6. `renderActivityUnifiedWord` imprime alumno, fecha, observación y criterio asociado. La foto privada se indica como adjunto guardado en Ayni; no se inserta su imagen.

Se comprobaron las 20 observaciones existentes en tres actividades: diez, cinco y cinco. Los 20 textos y nombres están presentes en sus Word locales. La actividad del adjunto conserva cero observaciones, por lo que su aviso vacío coincide con la fuente. Un archivo ya descargado permanece como estaba; hay que descargarlo de nuevo después del guardado.

«Observar sin actividad» deja el vínculo vacío y no debe incorporarse al Word de una actividad elegida después. La coincidencia de fecha o competencia no autoriza inventar ese vínculo. Las versiones estables históricas de documentos conservan sus bytes; no equivalen a una nueva descarga de la fuente actual.

Pruebas ejecutadas: `ordinary-observation-service.test.mjs`, `document-library-service.test.mjs` y `activity-unified-word.test.mjs`: **21 PASS**. Incluyen guardado, aislamiento, captura libre contextual, corrección/anulación y representación Word. No se realizó una nueva captura por navegador ni una descarga HTTP autenticada en esta ronda.

## Hallazgos y prioridades

### DOC 01 Orientación observacional distinta entre detalle y Word

**Prioridad alta.** En 20 de las 21 actividades no aparece íntegro el campo guardado `evidence_opportunities` en el Word. Sí aparecen los criterios y evidencias esperadas. La rama por momentos de `activityGuide` usa bloques de criterios, mientras el detalle de pantalla sí presenta aquel campo. Algunas ideas pueden quedar expresadas en otros apartados; la ausencia literal del campo no demuestra veinte pérdidas semánticas completas.

La muestra de cuentos sí permite identificar una diferencia relevante: la orientación guardada sitúa la observación después de la lectura, mientras el bloque imprimible queda en Desarrollo. La corrección debe acordar una proyección compartida para qué observar, dónde y cómo registrar, evitando añadir automáticamente todos los párrafos y aumentar la repetición. Conservar separados esos consejos y las observaciones reales.

### DOC 02 Los históricos sin momento explícito se asignan a Desarrollo

**Prioridad alta.** Los 21 criterios históricos de la muestra carecen de `observation_moments`. Sin metadata ni rótulo explícito en la orientación, `criterionMoments` devuelve Desarrollo. Por eso un comentario o revisión previsto también en Cierre puede no mostrar allí su acción contextual de registro. El fallback afecta a Hoy y al Word mediante `activityPedagogicalBlocks`.

El generador actual ya pide momentos en el esquema del Plan Maestro. La prevención requiere probar su coherencia con las acciones, no solo la existencia del array. En históricos debe hacerse visible que falta precisión y permitir revisión docente, sin reinterpretar silenciosamente textos mediante palabras clave ni alterar registros anteriores.

### DOC 03 Apoyos generales del proyecto añadidos al diario

**Prioridad media.** Word añade directamente `source_proposal_snapshot.supports` del proyecto a cada actividad. El detalle diario no usa ese bloque del mismo modo. Así llega a la lectura el apoyo general sobre no terminar un libro o no producir un texto común, sin aclarar a quién se refiere ni qué parte del recorrido apoya.

Conviene contextualizar cada apoyo en la mediación del día y usar la misma decisión en pantalla y documento. Ofrecer una lectura completa y respetar la participación individual es compatible; la redacción debe explicarlo. No aplicar filtros automáticos que borren apoyos por mencionar un material distinto.

### DOC 04 Los referentes históricos no identifican una selección oficial

**Prioridad media, histórica.** Ninguno de los 21 criterios conserva referencias oficiales seleccionadas. Word los presenta honestamente como paráfrasis orientativas, por lo que no hay una cita oficial falsa en esos textos. El catálogo por edad y la selección de referencias ya existen en el código nuevo; esta muestra antigua no permite afirmar que la corrección nueva falle o haya sido validada pedagógicamente para todos los casos.

No convertir todos los criterios de lectura en opinión con razones. Identificar acciones, anticipar, interpretar y opinar son focos distintos que pueden ser pertinentes. En escritura debe distinguirse la producción propia de la revisión de un texto dictado: el desempeño oficial de revisión de cinco años menciona explícitamente el dictado. El criterio contextual puede ampliar una situación legítima, pero no debe atribuir una paráfrasis al texto oficial.

### DOC 05 Flexibilidad de proyectos y previsión anual

**Prioridad media, revisión de diseño.** Las dos rutas guardadas anticipan diez actividades cada una; el año organiza quince tramos. Las fuentes consultadas favorecen previsiones revisables y participación infantil, no un calendario de contenidos inmutable. Los documentos sí incluyen flexibilidad y decisiones posibles: esto impide calificarlos automáticamente como incumplimiento.

La mejora debe comprobar que una propuesta emergente, una continuación o una decisión infantil puedan cambiar el recorrido con un esfuerzo razonable. Un texto que diga «flexible» no demuestra por sí solo esa capacidad. Tampoco corresponde exigir siempre una asamblea, un producto o una nueva actividad diferente por cada día.

### DOC 06 Volumen y datos individuales en el plan anual

**Prioridad media.** El Word anual de esta muestra tiene 51 páginas e incluye relatos individuales de familias con identificación en su apartado de procedencia. La descarga está autorizada a la docente; no se observó acceso público. Aun así, el documento de planificación grupal combina decisiones de uso cotidiano y un expediente detallado de sus fuentes.

Conviene separar una planificación grupal legible de la consulta privada de procedencia, preservando los hechos originales. Esto mejora lectura y minimiza la circulación innecesaria de información individual cuando la docente comparte su planificación institucional. No se propone borrar el historial ni ocultar su sustento.

### DOC 07 Repetición y uso de espacio

**Prioridad media.** En las actividades revisadas se repiten identificación y propósito de portada, además de criterio/evidencia en el momento y en la tabla final. El Word con diez observaciones ocupa seis páginas; la última contiene una sola fila. Los registros están presentes y esa fila no está cortada en las páginas inspeccionadas. Los proyectos pueden partir filas narrativas entre páginas.

La mejora debe conservar los registros y la legibilidad, reduciendo encabezados y reiteraciones antes de comprimir la letra. No se fija un máximo universal de dos páginas. El informe familiar de trece páginas refleja la decisión previa de una competencia por página; su extensión por sí sola no demuestra un defecto pedagógico.

## Qué conservar

- Herencia del propósito y los criterios desde la ruta confirmada; la guía no debe cambiarlos para encajar una mediación nueva.
- Escritura con propósito y destinatario, aproximaciones propias y revisión sin copia obligatoria.
- Lectura compartida completa, relecturas con un propósito diferente y comentarios sustentados en pistas.
- Creación musical con elecciones infantiles; convivencia mediante acuerdos ante situaciones reales, sin identificar silencio con dificultad.
- Registros individuales reales separados de evidencias esperadas, conclusiones y niveles confirmados por la docente.
- Lectura familiar específica y comprensible: las 120 secciones actuales conservan su versión sencilla y sus niveles asociados. Su presencia no certifica por sí sola que todas las valoraciones tengan sustento suficiente.

## Siguiente verificación antes de implementar

La primera corrección vertical recomendada es DOC 01–03: fuente diaria → bloques de Hoy → detalle → Word, incluyendo una observación de apertura, una de desarrollo, una de cierre y una libre vinculada. Validar las cuatro en un aula ficticia y mantener correcciones/anulaciones y permisos. Después evaluar nuevas muestras de generación de tres, cuatro y cinco años, con varias competencias y recursos confirmados. No solucionar la calidad semántica mediante listas rígidas de palabras permitidas.

Diagnóstico sin documento disponible, talleres, muestras nuevas de otras edades, lectura individual de las 120 conclusiones, consolidado Excel, RLS real y una nueva ejecución de navegador quedan fuera de la validación de esta ronda. Se necesitan para ampliar el alcance, no para responder la comprobación puntual sobre observaciones y Word. Esta auditoría no modifica las fuentes confirmadas ni autoriza desplegar.
