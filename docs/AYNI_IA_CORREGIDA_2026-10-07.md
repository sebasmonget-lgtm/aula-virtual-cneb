# Handoff — arquitectura de IA corregida

## Alcance y Git

Solicitud: ejecutar el paquete maestro corregido del 7 de octubre. Base remota y árbol inicial limpio: `6c70c4be02b9358543196cbc6c302ac98101ab64`. Rama: `codex/ayni-ai-corrected-20261007`. ADR 119 y los apartados vigentes de PRODUCT/DESIGN/PROJECT_MEMORY sustituyen los checkpoints anteriores. No se crean ni editan migraciones aplicadas.

El SHA final, IDs/URLs de Preview y Production, READY, alias, flags efectivos y smoke posterior se guardan en **`.local/corrected-delivery.json`**. Este recibo posterior al commit evita modificar el SHA entre ambos despliegues. No contiene secretos. La publicación solo procede desde un commit subido y limpio, Preview aprobado y Production del mismo SHA. Si el recibo no contiene ambas aprobaciones, no declarar la entrega publicada.

## Implementación

- Router v4.0.0: Sol activo 6.1; diagnóstico/año/Project Master high; tarjeta y realineación condicional medium; conversaciones, actividades, talleres y downstream Luna. Fallos de transporte no disparan fallback de modelo.
- Diagnóstico: alias y fuentes separados por observación, familia y comentario docente. Cada afirmación cita fuentes y respeta individuo/subgrupo/decisión/desconocimiento. La propuesta IA y sus citas permanecen en snapshot separado del texto confirmado; recargar no requiere generar de nuevo.
- Año: quince tramos deterministas, una generación high y reparación solo tras fallo. Movimientos/fechas/biblioteca/cobertura son código. Background guarda un response ID privado antes del primer poll; consulta la misma respuesta, con leases/revisión/fingerprint. La expiración exige reintento explícito con aviso; no hay regeneración automática.
- Proyecto: conversación Luna con hasta tres respuestas, turnos originales guardados antes del proveedor, texto de apoyo neutralizado al enviarlo. Avanzar al maestro conserva conversación y procedencia. Preview/Dependents/formal modernos son código; una llamada high incluye criterios por competencia, recorrido y blueprint por cada fecha confirmada. Confirmar no prepara todos los días.
- Día: actividad Luna desde blueprint. Taller opcional directo a pedido; contenedor confirmado inmutable, actividades/criterios separados, guardas de historia/ownership/revisión/duplicado. Tiempo/material/lugar no habilitan realineación; propósito/acciones y motivo explícito sí.
- Evaluación: Assessment Context determinista de CNEB, criterios y actividades realizadas. Análisis sin entrevista ni letra; raw evidence y nivel docente mandan en conclusión, análisis previo es auxiliar. Informe familiar copia las secciones canónicas de logro y usa familia solo en recomendaciones. Fingerprint familiar invalida una recomendación pendiente cuando cambia entrevista. Acuerdos escritos por docente, omitidos en Word si están vacíos. Consolidado y cierre por código; lectura histórica conservada.
- QA: trazas detalladas requieren fixture sintética explícita y se rechazan en Production. Un flag por sí solo no captura sesiones docentes. No enviar fotos ni grabaciones por defecto. Ruta Jev raw requiere flag y decisión de privacidad explícita; captura manual sigue disponible.

Archivos principales: router/context/provider/trazas y servicios de diagnóstico, año/jobs, conversación/proyecto, assessment/conclusión/familia; handlers de período/batches/taller; componentes de año/proyecto/diagnóstico/taller/criterio/evaluación/familia y Word. El manifiesto exacto es `git show --stat` del SHA del recibo. Inventario y costes actualizados en `docs/AI_WORKFLOW_INVENTORY.md` y `docs/AI_COST_MODEL.md`.

## Validación técnica y funcional

Suite final **758/758 PASS**, sin omisiones/cancelaciones; lint, typecheck, Next webpack y Vinext **exit 0**. Logs: `.local/corrected-suite-final2.log`, `corrected-lint-final3.log`, `corrected-typecheck-final3.log`, `corrected-next-final3.log` y `corrected-vinext-final3.log`. Las comprobaciones focales de fuentes también pasaron. No se declara que una compilación local sustituya el build y smoke de Vercel.

HTTP ficticio adicional: `corrected-http-extra.json` comprueba cambio logístico, taller duplicado y actividad ajena con cero llamadas adicionales. `corrected-conversation-http.json` comprueba refresh Preview y Dependents por código, una conversación Luna simulada, repetición idempotente y conservación del source_turn/support_text. Ruta PGlite del job comprueba recarga, poll temprano sin create, identidad ajena bloqueada, ID privado oculto y finalización con una creación/una recuperación. No se cuentan proveedores simulados como IA pagada.

| Casos del PDF | Evidencia ejecutada |
| --- | --- |
| A–C, setup/aula/entrevista/observación | Suite de onboarding, fotos/logo privados, entrevistas y diagnóstico; regresiones HTTP/propiedad |
| D–G, diagnóstico/año/conversación/quince | Proveedor real, validadores de fuentes/calendario, jobs/PGlite, revisión desktop/mobile |
| H–I, estructura/tarjeta | Pruebas del editor/biblioteca/intercambio/historia e intención de candidata; operaciones de estructura sin IA |
| J–K, conversación/maestro | HTTP idempotente y procedencia; Luna real adicional; maestro high real con diez fechas exactas y reparación acotada |
| L–N, actividad/taller/criterio | Actividad Luna real; taller mock → revisar → guardar en UI; HTTP sin llamadas por logística/duplicado/actividad ajena; política y versiones |
| O–P, observación contextual/espontánea | Suite de captura, idempotencia, privacidad y clasificación opcional/manual; no cámara/micrófono físico |
| Q–S, evaluación/insuficiencia/nivel | Contexto calculado, análisis real, autoridad de evidencia y confirmación docente; abrir Evaluar sin generación |
| T–V, batches/familia/acuerdos | Suite de lotes y estado durable; informe real con conclusiones canónicas; entrevista cambiada rechaza pendiente; acuerdos vacíos no aparecen |
| W–Y, consolidado/cierre/Word/historia | Pruebas de consolidado/Excel, cerrar/bloquear/reabrir/corregir/recerrar y exportaciones privadas/históricas |

La matriz combina pruebas automatizadas y recorrido local; no significa que se haya repetido manualmente cada caso en cloud. El smoke cloud comprueba READY/SHA, salud PostgreSQL, Auth Supabase, Origin, rechazo sin sesión, flags, páginas y lectura con sesión existente. Vercel no permite extraer los ocho valores Sensitive. No se crearon cuentas nuevas de QA cloud ni se alteraron sus planes para el smoke; los intentos de fixture pararon antes de cualquier mutación al faltar URL de conexión válida.

## Muestra con proveedor real

Solo datos ficticios: seis niños, actuaciones consistentes, pocas observaciones, contradicción, progreso, un niño sin evidencia y reportes familiares que no se confunden con aula. Traces incluyen payload efectivo, prompt/hash, fuentes, modelo/effort, raw output, validadores, propuesta visible, destino downstream, usage, coste y latencia. Quedan fuera del repositorio en `.local/modern-ai-qa`; no publicarlas como datos productivos.

| Etapa aprobada | Modelo / effort | ms | USD estimados |
| --- | --- | ---: | ---: |
| Diagnóstico | 6.1 Sol high | 59041 | 0.040592 |
| Año con horizonte restante (5 propuestas, 15 tramos) | 6.1 Sol high | 164376 | 0.092292 |
| Project Master de diez días | 6.1 Sol high | 146805 | 0.090730 |
| Actividad | Luna medium | 6017 | 0.0013179 |
| Análisis | Luna medium | 7352 | 0.0009772 |
| Conclusión con nivel docente B y evidencia escasa | Luna medium | 4335 | 0.0007453 |
| Informe familiar | Luna medium | 6399 | 0.0007524 |
| Año completo sin observaciones (15 propuestas, background, 56 polls) | 6.1 Sol high | 319466 | 0.143516 |
| Conversación de proyecto adicional | Luna medium | 3904 | 0.0001176 |

Nueve respuestas completadas: **USD 0.3710404**. Los timeouts anteriores no devolvieron usage y su posible cargo queda fuera, no es cero. No hubo repair/fallback en las nueve respuestas aprobadas. Las siete etapas se aprobaron en orden y se revisó el contenido antes de usarlo downstream; no se usaron outputs anuales inválidos para continuar. La muestra anual completa usó preparación ficticia de febrero sin observaciones de octubre para evitar retrospectiva inventada. El proveedor real se ejecutó en checkout no productivo; el smoke remoto no envía registros de la sesión existente a IA.

## Revisión visual

Se preserva el sistema incumbente. Detector único limitado a componentes: tres warnings previos (bounce y borde lateral), documentados sin rediseñar módulos. Corrección mínima de mensaje de conflicto, loading que distingue sugerir de confirmar y recuperación funcional de fuentes/conversación. Capturas válidas 1366×900 y 390×844 en `.local/corrected-captures`: 04 año, 05 proyecto, 06–07 taller revisar/guardar, 08 actividad móvil, 09 período sin evidencia móvil, 10 año móvil, 11–12 diagnóstico; 13–15 citas y recuperación tras recarga. Dos observaciones ficticias guardadas manualmente, una síntesis simulada y cero llamadas adicionales al recargar (`corrected-diagnostic-recovery.json`). 01–02 tenían tamaño inicial incorrecto y no prueban el gate; 03 muestra error previo al ajuste de copy.

Loading, error y success observados; los contenedores móviles de actividad/año no desbordan el documento. La cronología conserva desplazamiento horizontal intencional dentro de su región. Capturas cloud posteriores quedan en el recibo. Revisión humana integral, calidad de captura física de cámara/micrófono y uso prolongado de las quince propuestas siguen siendo el siguiente paso, no otra ronda de rediseño automático.

## Infraestructura, flags y rollback

Solo Vercel `ayni4/ayni-aula-staging`, `prj_3GOhE5KykLKbhuULD5rAeXpfbEko`, y Supabase `eetdkmmspicboijcmnzv`; CLI aislada. Preview tiene `AYNI_F8_EVALUATION`, `NEXT_PUBLIC_AYNI_F8_EVALUATION`, `AYNI_ORDINARY_OBSERVATIONS` y `NEXT_PUBLIC_AYNI_ORDINARY_OBSERVATIONS` a 1. Solo tras aprobar Preview se extienden a Production los mismos cuatro flags públicos/no secretos. No activar QA traces ni consentimiento Jev raw en Production.

Producción anterior exacta: **`dpl_aNZN76kJsHBhrR7hnDFVqr8z6eEd`**, SHA **`001c17fb6170ce5411aa11af114590e1abf7b3b7`**, URL `https://ayni-aula-staging-nvra4b1yy-ayni4.vercel.app`, alias `https://ayni-aula-staging-ayni4.vercel.app`. Antes de promover, crear Production del mismo SHA con `--prod --skip-domain`, comprobarlo y después promover.

Rollback: `npx vercel rollback dpl_aNZN76kJsHBhrR7hnDFVqr8z6eEd --scope ayni4 --global-config .local/vercel-ayni-v2-auth`. Verificar alias, SHA anterior y smoke. Devolver los cuatro flags a su alcance Preview anterior si se desea restaurar también configuración futura; el deployment anterior ya conserva sus variables de build/runtime. No borrar versiones, jobs, snapshots ni datos; no revertir SQL. Consultas de background que expiran requieren continuar explícitamente y pueden generar un nuevo cargo; las ideas/resultados ya guardados se conservan.
