# QA: personalización de Mi año — 2026-10-01

## Alcance y datos

Se usó una base PGlite aislada en `.local/qa-annual-redesign-20261001-server/pgdata`, con aula y seis estudiantes ficticios. No se modificó `.local/pgdata` ni se aplicó la migración de Supabase a un proyecto remoto. El navegador recorrió Planificar → Mi año → «Así entendí tu aula» → «Crear mi año» → revisión de doce propuestas → «Confirmar Mi año» → Word formal listo. El estado de prueba incluía cero entrevistas y cero observaciones; no se exigió inventar prioridades. La docente completó una condición: «Patio pequeño disponible tres mañanas por semana». El primer motivo visible decía «Responde a Patio pequeño disponible tres mañanas por semana.».

La primera generación del aula aislada se hizo antes de separar las guías del calendario y todavía mostró los cuatro temas festivos. Tras corregirla, se añadió una observación ficticia sobre plantas y se probó el reajuste completo en la interfaz. La pantalla sugirió el interés nuevo, permitió confirmar el contrato V2 y generó doce propuestas nuevas sin los cuatro temas impuestos. Mientras el nuevo plan estaba en borrador, V1 permaneció vigente. Después de confirmar, V2 quedó vigente, V1 apareció como anterior y el Word de V2 quedó listo. Una propuesta de V2 mostró el motivo «Responde a Plantas.».

## Aulas A/B con proveedor real

Se usó el currículo de cinco años y el mismo calendario nacional 2026. Ambos contratos contenían 25 observaciones declaradas como cobertura ficticia y decisiones pedagógicas distintas; la prueba llamó al generador real y comprobó sus doce títulos y competencias. No representa una evaluación estadística del modelo.

| Caso | Interés, oportunidad y prioridad | Títulos observados | Énfasis inicial |
| --- | --- | --- | --- |
| A | Animales y naturaleza; agricultura y huertos; comunicación oral | «Preguntas sobre los animales», «¿Cómo cambian las plantas?», «Historias del campo, creaciones propias» | La primera fila citó Animales y naturaleza; la competencia oral apareció en varias propuestas. |
| B | Construcción y transporte; comercio, calles y mercado; convivencia | «Rutas hacia el mercado», «¿Cómo lograr que una construcción se sostenga?», «Una ciudad imaginada entre todos» | La primera fila citó Construcción y transporte y Convivencia y acuerdos; PS_CONVIVE fue principal en esa fila. |

Los temas y oportunidades del entorno difirieron. En estas dos salidas ninguna de las doce filas tuvo como título los cuatro hitos que la guía antigua imponía. El motivo visible se construyó desde IDs de decisiones confirmadas; el texto libre del modelo no se usa como justificación final.

## Validaciones

- Pruebas focales: 22/22, incluidas paridad local/Supabase, fuente familiar vs. observación, cobertura escasa, trazas, A/B simulado, versiones, compatibilidad del preplan y Word.
- `npx tsc --noEmit`, `npm run lint` y `npm run build`: correctos tras separar la guía del calendario. Se repitieron al final después de la consulta adicional de observaciones históricas.
- La prueba visual verificó cinco bloques en una pantalla, condición editable, contrato confirmado, doce propuestas, Word listo y reajuste V1→V2 ante una observación nueva. No se probó un deploy, dispositivos móviles ni migración remota.

## Reversión

Las migraciones son aditivas y `annual_plans.source_personalization_review_id` admite null para planes históricos. Para volver temporalmente a la interfaz previa, conservar la tabla y columna hasta que ninguna versión nueva dependa de ellas. No se borran entrevistas, observaciones, revisiones ni planes.
