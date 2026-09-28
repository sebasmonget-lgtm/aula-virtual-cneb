# F2 Project Master bake-off — estado: preparado, gate no ejecutado

El contrato vinculante es `docs/PLAN_MAESTRO_NUEVO_AYNI.md`, §8 y §10. Este directorio **no** cambia el flujo de producción ni habilita `ProjectMasterV3`. El comparador `gate.mjs` rechaza la selección de una rama si faltan datos, revisiones ciegas independientes o adjudicaciones. `gate.test.mjs` usa datos **sintéticos exclusivamente para probar la regla**, no resultados pedagógicos.

## Registro previo al experimento

- Rama A: `preview → dependents → master` actual. Rama B: una llamada Sol/medium que devuelve el mismo contrato `ProjectMasterV3`. Ambas reciben idénticos casos, KB, calendario y decisiones docentes congeladas. Se permiten prompts específicos por brazo, pero cada uno se congela y registra por SHA-256 antes de la primera ejecución. Se usa un normalizador/validador común. Ninguna salida inválida se descarta del denominador; máximo un reintento.
- Antes de invocar modelos, fijar en un manifiesto versionado: commit, versión de proveedor/router/modelo/esfuerzo, semilla y orden contrabalanceado, temperatura, hashes de inputs/prompt/KB/calendario/esquema, tabla de precios efectiva y versión de normalizador. No incluir nombres ni observaciones reales de niños.
- Casos: 24 celdas 3 edades × 4 períodos × contexto sin novedad/cambio; 6 regresiones trazables a QA con salida esperada; 6 difíciles **adjudicados por especialistas**, incluido legacy. Separar desarrollo de test ciego. Los especialistas, no el autor del prompt, fijan los seis casos difíciles y los resultados esperados antes de ver las salidas.
- Ejecutar tres repeticiones por caso y brazo, orden contrabalanceado. Entregar salidas codificadas sin brazo a dos docentes/especialistas independientes. Adjudicar cualquier discrepancia; registrar vetos curriculares y edición docente (minutos y número). Los revisores no deben ver `A`/`B` ni costos/latencias antes de puntuar.
- Rúbrica 0–4 y pesos: coherencia 20 %, CNEB 20 %, evidencia/vínculos 20 %, calendario 15 %, mediación/recursos 15 %, claridad/edición 10 %. ID no aplicable o criterio incompatible, vínculo roto, o día lectivo incorrecto son veto. Calcular intervalos pareados con bootstrap determinista después de congelar el set; publicar resultados por caso y no solo el promedio.
- Gate: 0 defectos de autorización/privacidad/historia; al menos 98 % de salidas válidas tras ≤1 reintento; 0 vetos graves del set experto. Si ambas pasan, B gana solo con ventaja ≥0,20/4 sin pérdida de dimensión >5 puntos porcentuales, o empate ±0,20 con ≥25 % menos P95 o costo mediano y sin más edición docente. En otro caso conservar A; si ninguna pasa, conservar el flujo vigente y preregistrar un nuevo ensayo. `gate.mjs` implementa esta regla y falla cerrado con datos incompletos.

## Gate pendiente

No hay en el repositorio seis casos difíciles con adjudicación externa verificable ni dos valoraciones ciegas independientes del conjunto. Los ejemplos inventados por un agente no pueden sustituirlos. Tampoco hay aún un manifiesto congelado ni 216 ejecuciones reales (36 casos × 2 brazos × 3 repeticiones); por eso **no existe una rama ganadora** ni un costo/latencia medido para F2. El historial QA ofrece fuentes para las seis regresiones, pero aún deben extraerse y desidentificarse con resultado esperado antes del experimento.

Para continuar se necesita un paquete aprobado de seis casos difíciles desidentificados y dos especialistas/docentes revisores disponibles para la rúbrica ciega; después se completa el dataset, se congelan inputs y se ejecuta el bake-off. Los tests de `gate.mjs` solo comprueban que no se elija una rama sin cumplir lo anterior.

## Rollback

No hay migración ni cambio productivo. Eliminar los archivos de preparación de F2 deja intacto el pipeline A y todo registro histórico. El respaldo QA de F1/F2 permanece en `.local/qa-backups/` (ignorado por Git); no se toca para ensayar modelos.
