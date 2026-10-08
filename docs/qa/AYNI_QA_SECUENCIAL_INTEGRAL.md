# QA secuencial integral — 7 de octubre de 2026

Mandato: PDF de QA secuencial del 7 de octubre, subordinado al paquete maestro corregido para arquitectura. Esta ronda no autoriza modificar Production. Los resultados de rondas anteriores no cuentan como aceptación de esta historia.

## Entorno y límites

- Inicio: 2026-10-08 01:53:31 UTC. Parada absoluta: 03:53:31 UTC; máximo 120 minutos y USD 3 estimados, con reserva para usage desconocido.
- Rama aislada: `codex/ayni-sequential-qa-20261007`; base `e2bcd35ed377618fc520f07e00b4bee0f3b84d0f`. Fetch de todas las ramas ejecutado; árbol inicial limpio.
- Preview observado: `dpl_2EtpBSsgWjH6C3jhanhmLvnt51BL`; Production observado: `dpl_BQ8jr9TVGXgDjsyu8oNN5bhy3QuH`, ambos sobre e2bcd35. Cuenta nueva ayni4, proyecto ayni-aula-staging. Alias habitual Production: https://project-0w0pq.vercel.app.
- Recorrido en navegador real sobre Next local 5166 y API 8896, con profesora y base nuevas segregadas. Snapshot reversible previo a mutaciones. Ningún alumno real, foto ni grabación enviado a IA.
- Solo el reloj de la API aislada representa el 23 de marzo de 2026. El sistema y Production conservan su fecha; la cabecera local todavía muestra octubre. Las fechas de observación se introdujeron explícitamente.
- CNEB 4.1.0; routing v4.0.0. Flags ordinary observations y F8 habilitados localmente. Jev raw permanece deshabilitado; selección manual.
- Topes: tres invocaciones por etapa, dos ciclos de corrección por checkpoint, diez lotes globales, doce Sol high, diez Sol medium/low, treinta Luna, treinta y seis Jev, seis transcripciones, tres suites completas y dos ciclos de build.
- Trazas y capturas completas quedan en `.local/ayni-sequential-qa-20261007/`, ignorada por Git. El proxy local cuenta POST efectivos y separa sondeos GET del mismo response ID. No permite llamadas nuevas con usage pendiente o incierto.

## Fuentes y primeros gates

Historia única: aula Celeste, cinco años, seis niños. Cuatro entrevistas parciales confirmadas, una pausada recuperada después de recarga y una sin respuestas. Seis observaciones efectivas de cinco niños; un niño sin observaciones. El conteo hasta veinte es reporte familiar y no evidencia escolar de cantidad.

Setup y alta múltiple ejecutados con clicks: tres altas desktop y tres móviles, opcionales vacíos admitidos y salida explícita «Terminé». Entrevistas y observaciones se alternaron sin pérdida del borrador. Se comprobó autoguardado y recuperación de entrevista pendiente. El doble clic de guardar creó una sola observación. Una corrección conserva el original y una revisión efectiva; el motivo está registrado en la auditoría de esta ronda, porque el producto no ofrece un campo de motivo para esa revisión.

Incidente del harness: `fill` del input date cambió el DOM sin actualizar React. Tras otra selección, la fecha volvió a octubre. Se retiró ese registro mediante recuperación histórica y se introdujo marzo usando teclado; el cambio persistió después de rerender y recarga. Ninguna IA utilizó esa fuente errónea. No se atribuye este incidente al producto.

## Hallazgos

### SQ-01 — P1 — checkpoint 3 — pérdida de fuentes por filtro incorrecto

- Escenario: observación del dibujo de una niña que dice «mi hermana», intereses familiares sobre animales y notas en Exploración/Conversación.
- Reproducción: guardar las fuentes naturales, preparar la síntesis y auditar el payload efectivo de Responses.
- Esperado: conservar el hecho observado, los momentos y el contexto familiar confirmado por separado, eliminando identidades y datos privados.
- Observado, intento 1: una observación quedó fuera; una entrevista confirmada llegó vacía; momentos y comienzos de frases fueron reemplazados por `[persona]`. No se confirmó ese output ni se usó downstream.
- Causa demostrada: `diagnosticGroupProposalSources` reutilizaba `anonymousDecisionText`, filtro de Jev que rechaza cualquier mención de madre, hermana o abuela. Su vocabulario tampoco preservaba los momentos. La Skill aún decía que no recibía contexto familiar, contradiciendo el contrato efectivo.
- Corrección acotada: proyección específica del diagnóstico con el neutralizador existente de planificación, exclusión conservadora de contactos/domicilio/DNI, vocabulario pedagógico ampliado y referencia de Skill alineada. Jev mantiene su filtro y opt-in.
- Archivos: `diagnostic-assessment-v4.mjs`, `annual-journey-privacy.mjs`, `ai-diagnostic-evaluation-service.test.mjs`, referencia `fuentes-y-criterio.md`.
- Regresión: prueba PGlite conserva «mi hermana» y sigue excluyendo la nota con domicilio/teléfono; 3/3 pruebas de diagnóstico PASS. Lote focal previo PASS. Intentos 2 y 3 conservaron las fuentes; el intento 3 se confirmó después de corregir SQ-02.
- Rollback: revertir el commit de esta ronda; no hay migraciones ni modificaciones de Production. No se reutiliza la salida del intento 1.

## Estado de ejecución

**Veredicto: PARCIAL.** Última salida upstream aprobada: Mi año V1 confirmado, quince tarjetas. Primer eslabón bloqueado: creación de tarjeta nueva, checkpoint 6, por el límite de parada configurado. Los checkpoints 7–12 no se ejecutaron. No se afirma que estén implementados o aceptados por esta ronda.

### SQ-02 — P2 — checkpoint 3 — alias técnicos en el texto docente

- Intento 2: fuentes preservadas y afirmaciones sustentadas, pero la prosa mostró `child_N`.
- Causa demostrada: el prompt pedía citar alias en cada afirmación, además de `source_refs`.
- Corrección: citar únicamente en metadatos; validador rechaza el patrón `child_N` en los tres campos visibles. Regresión focal 3/3 PASS. Intento 3 aprobado y confirmado; dos ciclos de corrección consumidos en este checkpoint, ningún cuarto intento permitido. El guard implementado distingue mayúsculas y minúsculas; no se afirma cobertura de variantes como `Child_N`.
- Efecto: intento 2 tampoco confirmado ni utilizado en Mi año.

### SQ-03 — P2 — checkpoint 5 — alias en fundamentos anuales

- Reproducción: abrir «El año completo» y los detalles de las tarjetas generadas; fundamentos e interpretaciones muestran Child_N.
- Esperado: lenguaje docente, manteniendo sujetos y citas en metadatos.
- Observado: las fuentes, alcances individuales y decisiones son correctos, pero algunos textos muestran los alias técnicos. Evidencia: output bruto `provider/call-7-output.json` y vista anual.
- Causa: el contrato anual conserva los alias para vincular actuaciones y no los excluye de la prosa visible. Los handlers y la interfaz anual no se modificaron en esta rama.
- Corrección: pendiente por parada; no se limpiaron los outputs para aparentar aprobación. El gate pedagógico y de calendario pasó, mientras el caso G mantiene FAIL en microcopy. No afecta la autoridad ni la identidad de las fuentes.

## Recorrido y matrices finales

Las palabras PASS se limitan a las comprobaciones indicadas. No incluyen hardware, autenticación real de la nueva profesora en nube, importación, fotografías o etapas no recorridas. Capturas activas desktop y mobile guardadas; se descartó una captura de pestaña de fondo que no correspondía al viewport. En móvil se comprobó 390×844 en DOM y ausencia de scroll horizontal en las pantallas revisadas. Next Dev Tools interceptó una acción de la navegación móvil; se cerró su overlay y se retomó desde escritorio. No se atribuye ese overlay al build de Production.

| Caso maestro | Estado | Evidencia de esta ronda |
|---|---|---|
| A Setup, opcionales y logo | NO VERIFICADO | Setup básico y opcionales vacíos PASS; logo no ensayado. |
| B Mi aula, altas múltiples y foto | NO VERIFICADO | Seis altas UI, desktop/mobile PASS; importación/foto no ensayadas. |
| C Familias y observar sin orden fijo | PASS | Cuatro entrevistas confirmadas, borrador recuperado, seis notas; alternancia y recarga. |
| D Síntesis diagnóstica real | PASS | Tres invocaciones; intento 3 confirmado, claims y fuentes revisados. |
| E Mi año con diagnóstico incompleto | PASS | Dos entrevistas pendientes no impiden preparar y confirmar Mi año. El camino sin ninguna síntesis no se ensayó aparte. |
| F Conversación anual trazable | PASS | Tres llamadas Luna, dos respuestas docentes; source_turn/support_text y edición final. |
| G Quince slots, timeline y Biblioteca | FAIL | Calendario y pedagogía PASS; SQ-03 abierto en microcopy. |
| H Intercambiar, retirar y añadir sin IA | PASS | Swap 1/2, retiro y reposición 15; cero llamadas, V1 activa idéntica. Drag físico no ensayado. |
| I Nueva propuesta | BLOCKED | Límite de tiempo antes del proveedor; cero invocaciones. |
| J Conversación de proyecto | BLOCKED | Parada; no recorrido de esta historia. |
| K Project Master y fechas reales | BLOCKED | Parada; no recorrido de esta historia. |
| L Actividad Luna desde blueprint | BLOCKED | Parada; no recorrido de esta historia. |
| M Taller opcional | BLOCKED | Parada; no recorrido de esta historia. |
| N Cambios logísticos/materiales | BLOCKED | Parada; no recorrido de esta historia. |
| O Observación contextual | BLOCKED | Parada; solo se capturaron fuentes iniciales espontáneas. |
| P Espontánea manual/Jev opcional | PASS | Selector manual, corrección, original y doble clic; Jev raw deshabilitado, no benchmark real. |
| Q Contexto determinista y análisis Luna | BLOCKED | Parada; tests complementarios no sustituyen UI ni IA real. |
| R Sin evidencia distinto de C | NO VERIFICADO | Un niño sin notas; Evaluar no abierto en esta historia. |
| S AD/A/B/C docente | BLOCKED | Parada; ninguna letra asignada. |
| T Conclusiones batch | BLOCKED | Parada; ninguna generación de esta historia. |
| U Informe familiar | BLOCKED | Parada; ninguna generación de esta historia. |
| V Acuerdos solo docentes | BLOCKED | Parada; ningún informe de esta historia. |
| W Consolidado y Excel | BLOCKED | Parada; ningún archivo descargado de esta historia. |
| X Cerrar, reabrir, corregir y recerrar | BLOCKED | Parada; no se ensayó sobre esta base. |
| Y Word, foto e históricos | BLOCKED | Parada; no se verificaron documentos de esta historia. |

| Pipeline | Estado | Invocaciones reales | Última autoridad o bloqueo |
|---|---|---:|---|
| 0 Inicio | PASS | 0 | Aula y seis altas guardadas. |
| 1 Familias | PASS | 0 | Cuatro confirmadas, dos pendientes. |
| 2 Observar | PASS | 0 | Seis vigentes; original y revisión conservados. |
| 3 Diagnóstico | PASS | 3 | Intentos 1/2 no confirmados; intento 3 confirmado V1. |
| 4 Conversación anual | PASS | 3 | Dos respuestas docentes; contexto revisado y confirmado al crear el año. |
| 5 Mi año | PASS pedagógico | 1 | V1 activa, quince tramos; SQ-03 menor abierto. |
| 6 Editar/crear tarjeta | BLOCKED | 0 | Parte estructural PASS, V2 borrador; tarjeta nueva bloqueada por tiempo. |
| 7 Proyecto | BLOCKED | 0 | Parada global, no se usó una tarjeta nueva inexistente. |
| 8 Actividad/taller | BLOCKED | 0 | Parada global. |
| 9 Aula contextual | BLOCKED | 0 | Parada global. |
| 10 Evaluar | BLOCKED | 0 | Parada global. |
| 11 Conclusiones | BLOCKED | 0 | Parada global. |
| 12 Familia/cierre | BLOCKED | 0 | Parada global. |

## Uso, límites y parada

Siete POST reales al proveedor: cuatro Sol 6.1 high y tres Luna medium. **USD 0,2639562 estimados** según usage efectivo, incluyendo cached tokens; no es una factura. Coste incierto: cero. Computación local, consultas HTTP y sondeos se separan del coste de modelo. Mi año utilizó una generación background, `store=false`, 85 sondeos y aproximadamente 342 segundos; doble clic, recarga y salida/retorno conservaron el response ID. Ningún sondeo se cuenta como invocación nueva.

Consumo: Sol high 4/12; Sol medium/low 0/10; Luna 3/30; Jev 0/36; transcripción 0/6. Diagnóstico 3/3 intentos y 2/2 ciclos de corrección; Mi año 1/3. Dos lotes de corrección de producto. Una conversación anual, dos respuestas docentes; tres llamadas incluyendo su inicio. Un intento inicial de conversación fue rechazado por el control local de checkpoint antes del proveedor y quedó registrado aparte. Nueva tarjeta: un intento UI bloqueado por tiempo, cero proveedor.

El proxy quedó cerrado. Detectó la reentrada a las 04:54:56 UTC, posterior al deadline fijo 03:53:31, y rechazó antes de enviar. No se reinició el presupuesto ni se certifican 120 minutos de trabajo activo: la ronda utilizó una parada conservadora por reloj y no tiene telemetría fiable para descontar la pausa entre mensajes. Después del bloqueo solo se cerraron evidencias, documentación, validaciones y entrega del código ya modificado; no hubo nuevas correcciones ni IA.

## Validaciones y límites prácticos

- Baseline: lint y typecheck exit 0, 19 pruebas críticas PASS; Auth/Origin local y arranque comprobados. Cuenta y almacenamiento nuevos, snapshot previo a mutaciones.
- Regresión focal de la proyección: 10 pruebas PASS y, después del ajuste del prompt, 3 pruebas PASS.
- Suites completas: 3/3 usadas. Primera interrumpida por saturación. Segunda amplia: 820/825 PASS, cinco fallos de utilidades/experimentos registrados. Tercera, todos los `*.test.mjs` de src/lib, scripts y evals con concurrencia 2: **758/758 PASS**, exit 0. No cuarta suite.
- Lint final, `tsc --noEmit`, Next `next build --webpack` y Vinext `npm run build`: exit 0. Ciclo local de builds final ejecutado; Vinext mantiene avisos de clasificación estática de rutas/chunks, sin fallo.
- La prueba de hashes del experimento Jev se invalida al cambiar una dependencia de producto. No se renovó artificialmente y no se afirma precisión de Jev real. La prueba mock experimental también mostró una carrera de rename en Windows. No son aceptación ni rechazo de la nueva cadena pedagógica.
- Auth/ownership/RLS cubiertos por pruebas del producto y smoke privado sin sesión. No se creó una cuenta docente ficticia en Supabase ni se recorrió esta historia autenticada en Preview: los secretos Sensitive no eran exportables. UI y siete llamadas corresponden al entorno local segregado. Hardware, Word/Excel, cierre e invalidación selectiva de esta historia no verificados.

## Publicación y continuación

La entrega se identifica por el commit de esta rama y su Preview, registrados después del commit en el recibo privado `handoff.json` y en la respuesta final. El Preview base sigue identificado arriba; no se confunde con el Preview nuevo. No hay migraciones, secretos, cambios de RLS ni flags de Production. La comprobación final compara el deployment ID y SHA de Production con el baseline.

Rollback: revertir el commit de esta ronda o dejar de usar su Preview. La V1 y la revisión V2, snapshots y trazas permanecen en el almacenamiento segregado; no restaurar esta base sobre Supabase. Para otra ronda, usar explícitamente un nuevo límite y retomar desde la V1 anual aprobada o la V2 revisada y confirmada, corregir SQ-03 y volver a verificar las fuentes. Las etapas 6–12 requieren nueva evidencia; no heredan PASS de otras historias.

