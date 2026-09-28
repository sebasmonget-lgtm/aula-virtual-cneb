# Assessment y valoración del período

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
