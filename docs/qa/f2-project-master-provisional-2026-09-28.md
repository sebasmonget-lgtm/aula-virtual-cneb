# F2 — checkpoint provisional, sin selección experimental de B

## Autoridad y resultado

El usuario autorizó continuar F2–F12 con evaluación ciega provisional de IA y fallback A si B no demuestra ventaja. Tras confirmar saldo API negativo, instruyó continuar sin probar la API. **Se conserva A por seguridad; no hay ganador estadístico ni validación pedagógica humana.** B permanece experimental, sin activación productiva. No hubo migraciones, push ni despliegue.

## Ejecución preservada

Se construyeron 36 casos sintéticos desidentificados: 24 base (edades 3/4/5 × P1–P4 × dos contextos), seis QA y seis difíciles fundamentados en CNEB/QA. El manifiesto congela insumos, conocimiento recuperado idéntico por brazo, contratos, calendario, modelo Sol/medium y precios. Ambos brazos usan el mismo normalizador V3 y validador.

La corrida corregida dejó 216 registros: **63 válidos y 153 fallidos por proveedor `rate_limited`**. Un diagnóstico mínimo confirmó HTTP 429, `credit_balance_exhausted`, `insufficient_quota`. No se atribuye este fallo a calidad curricular. No se excluyen del denominador ni se declara superado el gate del 98 %. No hay revisiones ciegas de esta corrida ni intervalos comparativos; requieren llamadas externas ahora suspendidas.

Resultados y snapshot de seguridad, ignorados por Git:

- `.local/test-results/project-master-f2/full/results.json`
- `.local/test-results/project-master-f2/full/results-before-quota-stop.json`
- `.local/test-results/project-master-f2/smoke/results.json` (ensayo anterior limitado; no decide rama).
- `.local/test-results/project-master-f2/exploratory-unequal-retrieval/results.json` (primer ensayo con recuperación desigual, excluido del comparador, conservado).

Se comprobó por SHA-256 que los 39 registros capturados al iniciar esta revisión permanecieron idénticos. Todos los 63 resultados válidos se conservan; no se regeneraron parejas válidas. Antes de detener el proceso se copió y parseó un snapshot; el checkpoint final también se parseó correctamente con los 216 registros. Se canceló el lanzador pendiente de revisión ciega antes de que hiciera llamadas. No quedan autorizadas llamadas API mientras siga vigente la instrucción de trabajar sin saldo.

## Consumo medible de la corrida corregida

520.741 tokens de entrada y 309.676 de salida registrados; costo calculado por `usage` y precios congelados: **USD 3,4823022**. No es factura conciliada ni consumo total de la cuenta. Intentos fallidos sin `usage` tienen costo desconocido; no se presume costo cero ni se usan para demostrar eficiencia de B. El ensayo exploratorio y smoke son gastos separados.

## Validaciones técnicas ejecutadas

| Comando | Resultado | Duración aproximada |
| --- | --- | --- |
| `node --test evals/project-master/*.test.mjs` | 11/11 PASS | 1,3 s |
| `npx tsc --noEmit` | PASS, exit 0 | 8,9 s |
| `npm run lint` | PASS, exit 0 | 29,0 s |
| `npm run build` | PASS, exit 0 | 15,6 s |
| Suite `src`, `scripts`, `evals`, concurrencia 4 | 524/524 PASS | 122,5 s |

Ninguno de tests/typecheck/lint estaba colgado: solo el generador seguía activo. Se ejecutaron separadamente, con observación de hasta 30 s por llamada y límite operativo de 120 s sin progreso para validadores. La suite completa tuvo progreso continuo. Build dejó advertencias no bloqueantes de tamaño de chunks y clasificación estática de rutas.

## Pendientes y continuidad

Se continúa la implementación local F3 con A conforme al fallback autorizado. La comparación A/B y sus dos revisiones independientes quedan **PENDIENTES EXTERNOS por saldo**, además de la revisión humana previa al piloto. No se cambiará el manifiesto ni se sobrescribirán resultados para forzar una decisión. Cualquier futura recuperación debe preservar éxitos y separar los intentos fallidos de cuota, sin presentarlos como un nuevo experimento desde cero ni como fallos semánticos.

No se escribieron datos pedagógicos de QA ni históricos durante F2. El rollback mantiene el pipeline A existente y deja intacta la base. Las dos modificaciones ajenas `environment-api.json` y `environment-web.json` quedan fuera del checkpoint.

## Reducción aprobada posterior: techo de USD 3 adicionales

El usuario redujo F2 a 12–18 casos, máximo dos repeticiones seleccionadas por caso, sin repetir ninguna salida válida. La selección de menor costo usa **una repetición pareada por caso**. Hay **10 casos completos y 26 parejas históricas disponibles**: ocho casos de edad 3 en P1–P4, con/sin contexto nuevo, y dos de edad 4 en P1. Se exportaron veinte salidas codificadas y ordenadas por ID ciego; el archivo no revela brazo, costos ni latencias. Los 63 éxitos originales permanecen íntegros y no se descartaron los fallos del archivo fuente.

Para alcanzar doce casos con edad 5 y dificultad adicional, faltan solo dos salidas A: `base-5-p4-baseline` repetición histórica 2 y `hard-holiday` repetición histórica 3; ambos B ya existen. El índice 3 del último es un identificador histórico, no una solicitud de generar tres repeticiones. No se generan casos adicionales que ya tienen una pareja suficiente.

El saldo continúa agotado. No se invocaron modelos para completaciones ni revisión: **gasto adicional USD 0 / límite USD 3**. La evaluación independiente permanece pendiente; no se sustituyó por una rúbrica heurística presentada como juicio pedagógico. Se continúa F3–F12 con A como fallback, conforme a la instrucción de usar lo disponible cuando la comparación no sea concluyente.

| Métrica del subconjunto pareado disponible | A (10 salidas) | B (10 salidas) |
| --- | ---: | ---: |
| Tokens entrada | 120.892 | 42.670 |
| Tokens salida | 51.900 | 46.022 |
| Costo medible acumulado USD | 0,622445 | 0,493808 |
| Costo mediano medible USD | 0,059837 | 0,049629 |
| Latencia P50 s | 115,45 | 108,34 |
| Latencia P95 s | 141,49 | 293,78 |
| Reintentos | 0 | 3 |
| Intentos sin costo conocido | 0 | 3 |
| Correcciones docentes/rúbrica | Pendientes | Pendientes |

Los 80 fallos de proveedor A y 73 B de la corrida completa se registran separadamente: no se borran ni se reinterpretan como fallos curriculares. El subconjunto selecciona supervivientes por disponibilidad, no puntajes, y **no representa la matriz completa**. B tiene menor costo registrado pero tres intentos de costo desconocido y mayor P95; esto no permite afirmar eficiencia ni mejor pedagogía. La rúbrica/umbrales del Plan Maestro se conservan, pero no se aplican una decisión sin revisiones. El selector sin API pasó su regresión (12/12 tests F2 tras añadirla) y verificó que el archivo fuente no cambió durante la exportación.

Artefactos locales: `.local/test-results/project-master-f2/reduced/protocol-and-metrics.json` y `blind-bundles.json`. No usar nuevamente el runner completo; cualquier futura ejecución reducida debe reservar un costo máximo por petición y descontarlo del techo acumulado antes de cada llamada, incluida revisión/reintentos. El selector no ejecuta llamadas.
