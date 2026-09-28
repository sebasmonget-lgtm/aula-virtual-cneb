# Assessment y valoración del período

## DESPUÉS DEL FIX — P4 con cinco trayectorias contrastadas

Marco V1 confirmado por UI para Bimestre 4: cinco criterios **efectivamente observados** (lectura 3/11, escritura 9/11, convivencia 5/11, 11/11 y 12/11), no los otros días planeados. El marco dice expresamente que conteos de cobertura no describen actuación individual. Cinco análisis IA reales fueron leídos y precisados por la docente. Se confirmaron cinco niveles de convivencia y cinco conclusiones sobre tres notas por niño: Valeria A (acuerdos en contextos cambiantes), Omar A (tras P1 sin información, ahora incluye y devuelve sin pregunta individual), Bruno B (autonomía en pequeño grupo, mediación al ampliar), Mateo A (con anticipación/señales disponibles, sin generalizar a asamblea) y Alma B (dos días autónomos en grupos pequeños y necesidad de pregunta en grupo de cinco). No se valoraron escritura/lectura desde una única nota ni ausencia como C.

P4 tiene 8 competencias en ámbito ×15 = 120 pares: A=3, B=2, C=0, AD=0, 115 pendientes. El cierre formal exige completar los pares sin una salida terminal de información insuficiente (H34); por ello no se cerró. P1–P4 tuvieron valoraciones parciales, no un año evaluado íntegramente. La conclusión docente incorpora las condiciones que algunas propuestas breves de IA omitían. Los cinco botones de conclusión se esperaron hasta «Conclusión confirmada» antes de cambiar de niño, evitando la carrera H48.

## ANTES DEL FIX — auditoría original

Estado: barreras negativas PASS; generación y cierre con evidencia NO PROBADOS por bloqueo del recorrido anual. No se evaluó un niño real ni se asignaron niveles ficticios sin evidencia.

## Cuatro períodos comprobados por UI

Se abrió Evaluar → Abrir evaluación. El año y aula estaban precargados y el período inicial era Bimestre 3 por la fecha del sistema. Se seleccionaron P1, P2, P3 y P4 y se pulsó Preparar marco del período en cada uno. Los cuatro respondieron:

> Aún no hay competencias trabajadas con criterios confirmados en este período.

Las cuatro pantallas muestran 0/15 niños completamente evaluados y 0/0 valoraciones docentes. No aparecieron niveles C por ausencia de notas; las 29 notas diagnósticas no fueron importadas como evidencias de actividad. No se cobró ninguna llamada adicional en estos intentos.

P1: 16/03–15/05; P2: 25/05–24/07; P3: 10/08–09/10; P4: 19/10–18/12. Se crearon los períodos normalmente al abrir el módulo, no mediante auditoría SQL. `period-guards.json` y cuatro archivos `period-N-no-evidence-dom.txt` conservan el resultado.

## Qué protege correctamente

PASS: no evaluación automática basada únicamente en entrevista, anécdota de asistencia o diagnóstico; no se prepara un marco sin criterios confirmados. Cerrar período aparece deshabilitado. El flujo dice que la docente confirma las valoraciones y que Ayni organiza la evidencia.

## Qué no quedó demostrado

No se generaron Assessment Master, assessments individuales, valoraciones AD/A/B/C ni conclusiones de período. No se comprobaron la incorporación de evidencia reciente de Valeria, contradicciones de Bruno, diferencias entre Inés/Thiago y Omar ni niveles persistentes. Los problemas del Word diagnóstico no se presentan como errores observados del assessment.

Agregar artificialmente una competencia a «trabajadas» sin actividad ni evidencia para desbloquear un modelo habría cambiado el significado pedagógico del dato. No se hizo. Las pruebas unitarias con fixtures se distinguen del recorrido docente y no autorizan declarar P1–P4 completos.

## Criterio de contraste

La valoración debe ser un juicio docente sobre evidencia pertinente a la competencia, no un conteo de registros ni promedio de letras. El ciclo II de Inicial tiene condiciones específicas para conclusiones descriptivas; la fuente normativa de contraste fue la [RVM 048-2024-MINEDU](https://cdn.www.gob.pe/uploads/document/file/8031673/6744990-rvm-00048-2024-m.pdf?v=1746639808). El índice oficial permitió contrastar esas reglas; esta auditoría no certifica ausencia de modificaciones normativas posteriores ni integración SIAGIE.

## DESPUÉS DEL FIX — P1 real desde la interfaz

Assessment Master V2 confirmado; 74 evidencias de actividades/talleres en P1, seis competencias con registros. La UI mantiene diez competencias en el ámbito del período: 150 parejas para 15 alumnos. Se confirmaron 16 valoraciones vigentes y sus conclusiones: convivencia en 14 alumnos (3 A y 11 B), indagación de Inés A y cantidad de Thiago A. Cero C/AD y 134 parejas pendientes; ningún alumno tiene las diez valoraciones. Las letras son decisiones de la profesora ficticia revisadas sobre actuaciones, no equivalencia automática por contar notas ni benchmark experto.

Se revisaron los quince: Omar conserva información insuficiente y cero evidencia de período, sin llamar al assessment ni asignar letra. Mateo A está acotado a pareja/apoyos disponibles; no afirma autonomía de grupo grande. Valeria B reconoce avance con acuerdos conocidos y apoyo ante cambios. Bruno B conserva contraste pareja/grupo pequeño frente a grupo numeroso. Inés y Thiago tienen fortalezas específicas, no A global. Once síntesis restantes fueron manuales y confirmadas en UI. Hubo seis llamadas de análisis IA, incluido un reintento por fecha incorrecta; no se afirma que IA redactó los dieciséis.

H35 actualiza huella según marco/contexto; H36 corrige fecha civil; H37 confirma snapshots JSONB sin falsos conflictos; H39 admite la preposición española «A» conservando la prohibición de calificaciones en conclusiones. H41 permite revisar una interpretación confirmada por versión; se corrigieron errores de síntesis manual de Camila y Thiago sin cambiar notas. H43 anonimiza nombres de compañeros en la copia enviada a IA. Históricos y correcciones quedan separados.

El cierre permanece bloqueado (H34): no hay decisión terminal confirmable de insuficiencia para una pareja sin evidencia. No se forzaron 134 letras ni se transformó diagnóstico en evidencia del período. Evidencia: `p1-before-assessment-qa-snapshot.json`, `h41-valuation-reviewed-qa-snapshot.json`, `p1-valoraciones-docentes-ui.json`, captura `25-p1-consolidado-niveles-pendientes.png` y registro H35–H43.

## DESPUÉS DEL FIX — P2 y primera semana de gestión posterior

Veinte notas de cuatro actividades de junio, conciliadas por alumno/texto/día (20/20). Marco V1 generado, revisado y confirmado por UI durante la fecha QA de gestión 27/7. La síntesis docente cambió «actividades completadas» por «con registros»: no presupone evidencia en las demás fechas del bimestre.

Cinco valoraciones y cinco conclusiones vigentes de convivencia: **Valeria B, Omar B, Bruno B, Mateo A, Alma B**. Seis análisis IA reales: los cinco contrastantes y Camila. Cinco conclusiones IA reales, revisadas antes de confirmar; Omar se editó para explicitar la devolución de materiales y el apoyo para incluir un compañero nuevo. No se calificaron las cuatro notas únicas de cantidad ni se arrastraron letras de P1.

El caso Camila («le gustó el juego… No anoté cómo intervino en el acuerdo») devuelve información insuficiente, no una interpretación de su desempeño. Conserva nivel vacío. Omar sí dispone ahora de tres actuaciones concretas con distinto grado de mediación: esto permite valorar P2, sin fingir una comparación de nivel con P1 que no tiene evidencia. Mateo participa con apoyos de acceso, sin penalizarlos ni afirmar actuación en grupos grandes. Bruno y Alma conservan las diferencias por organización del juego; Valeria muestra avances, pero aún pregunta docente para distribuir el cuidado común.

El ámbito P2 incluye siete competencias previstas: 105 parejas, 5 confirmadas/100 pendientes, A=1/B=4/C=0/AD=0. El Excel real descargado desde UI pasó conciliación celda por celda. Cierre e informe global siguen deshabilitados según su suficiencia actual; no se forzaron letras ni se ocultaron competencias para abrirlos. P3 recibe el snapshot de las cinco conclusiones confirmadas mediante opt-in. H48 documenta una carrera de carga no contaminante al navegar antes de terminar un guardado.

## DESPUÉS DEL FIX — P3, revisión durante la gestión de octubre

Marco V1 generado/revisado/confirmado por UI el 12/10 simulado. Describe las tres actividades realmente cerradas (31/8, 1/9, 2/9), no todo el mapa. Los criterios de convivencia y orientación espacial se leyeron completos. Dos notas del 31/8 son episodios distintos de la misma actividad, no dos actividades adicionales. Cinco análisis IA y cinco propuestas de conclusión UI; el ledger registra seis invocaciones de conclusión, incluido un escalamiento, no cinco llamadas facturables.

Valoraciones docentes confirmadas y conclusiones: **Valeria A, Omar B, Bruno B, Mateo A, Alma B** en convivencia. Las síntesis docentes explicitan mediación/contexto; la de Mateo conserva anticipación y tarjetas como acceso, sin generalizar a grupo numeroso. Valeria muestra actuaciones autónomas en organizaciones cambiadas; Omar ahora tiene sustento, pero necesita pregunta ante acceso de otro grupo. Bruno varía cuando se juntan grupos. Alma no mantiene su actuación autónoma en pareja al ampliar el juego. No se inventó una valoración de Forma por una sola indicación ni por una nota de diversión.

Ámbito P3: nueve competencias, 135 parejas. Cinco letras y conclusiones vigentes, A=2/B=3/C=0/AD=0, 130 pendientes. Descarga Excel real conciliada celda por celda PASS. Cierre e informe global deshabilitados. Snapshot `p3-five-assessed-qa-snapshot.json` y `consolidado-p3-inspect.json`. Diagnóstico mostrado como antecedente no se suma a la evidencia de período, aunque su fecha real tardía conserve la limitación cronológica QA.
