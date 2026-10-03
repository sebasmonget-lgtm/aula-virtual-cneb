# QA V2: recuperación y recorrido — 2026-10-03

## Base y reproducción

El Preview `dpl_FCrTHmEABesXTohq3z76Nwesk5uX`, el checkout y `origin/codex/qa-ayni-v2` tenían SHA `b142a90f6ced31afa1b4a650806e5cf07e375aa7`. La referencia consolidada seguía en `055c77e`. Vercel no está integrado con Git en este proyecto: el CLI de la cuenta nueva `ayni4` publica builds con SHA explícito.

Se conservaron tres entrevistas, doce actuaciones, ideas y borrador del aula QA. Antes de editar el producto se volvió a pulsar Preparar mi año: la ejecución llegó a una incidencia global de la revisión semántica, **no al mismo error original de alcance**. La respuesta original del modelo no había sido persistida; no puede recuperarse su índice ni sus fact_keys exactos.

La causa del mensaje original es verificable en el contrato: una interpretación individual combina sujetos distintos, o una fuente tiene sujeto desconocido. Las doce fuentes visibles tenían sujetos conocidos y alcance individual: el caso compatible con esos datos es una interpretación individual que mezcló niños. La validación la rechazó, antes de llamar al revisor; el catch solo reparaba errores con proposal_id, ausente en este error. Una hipótesis opcional bloqueaba todo el plan.

También se reconstruyeron las fuentes visibles por niño en un aula local aislada. Una corrida del servicio anterior con proveedor real no produjo conflicto de alcance: el revisor detectó tres incidencias de sustento/capacidades, la reparación localizada y la segunda revisión pasaron (cuatro llamadas). Las respuestas quedaron únicamente en archivos privados ignorados. Esto no se presenta como reproducción exacta ni como certificación pedagógica.

## Correcciones

El validador permanece estricto. Las hipótesis opcionales sin actuaciones o alcance compatible se separan en insufficient_interpretations sin ampliar su alcance ni conservar su conclusión como necesidad/avance. El revisor verifica razones/apoyos dependientes. La respuesta original se conserva en el checkpoint privado. La prosa global admite una reparación acotada sin regenerar las doce filas; las sustituciones se limitan a IDs autorizados. Una revisión fallida nunca confirma.

El recorrido tiene CTA explícito hacia Preparar mi año y matriz opcional de niño × competencia. Cero, uno y dos o más registros son cantidades, no calificaciones ni suficiencia pedagógica. La matriz incluye observaciones ordinarias independientemente del flag de clasificación; sugerencias automáticas y notas sin atribución no se convierten en cobertura confirmada. Siempre permite continuar, registrar una nota libre o abrir una guía aplicable.

Se revisaron las 22 opciones de siete experiencias del catálogo editorial diagnostic-v4.4, preservando IDs, competencias, referentes y snapshots históricos. Dibujos, trazos y escrituras sustituyen «marcas». Conserva su estado development_fixture; no se declara validación oficial. Ayni muestra actuaciones individuales, reportes y desconocimientos, y recoge preferencias/decisiones docentes en un intercambio breve. Las ideas se guardan con la preparación y no se convierten automáticamente en intereses observados. Conversación y navegación: cero IA.

Jobs privados reutilizan ai_pending_generations. Etapas: fuentes, calendario, generación, validación, revisión. Prepare crea el ID; cada run realiza como máximo una llamada real al proveedor y persiste su respuesta. GET recupera progreso después de refresh. Los pasos en cola continúan desde respuestas guardadas, con los mismos IDs/calendario; una caída en revisión no repite la generación. Leases y token cercan workers simultáneos/tardíos; CAS y huellas se comprueban al iniciar y guardar. Un borrador cambiado requiere actualizar la preparación, conserva el checkpoint y no entra en un bucle de reintentos automáticos. Vigencia: 24 horas, sin purga global ni borrado de otras cuentas.

Normalmente hay dos llamadas: generar + revisar. Una reparación semántica suma reparación + segunda revisión. Los mensajes de ChangeSet siguen sin IA. Continúan 12 propuestas, 172/172, cero huecos/solapamientos, versiones, protección del pasado y congelación antes del Word; el renderizador solo presenta el mismo objeto confirmado.

## Verificación

91 casos focales existentes PASS y cinco regresiones de recuperación PASS. Incluyen alcance de dos sujetos, razón dependiente, conteos neutros, permisos, refresh/lectura de job, exclusión concurrente, proveedor fallido, reanudación, CAS y confirmación. Las regresiones previas conservan calendario íntegro, regeneración localizada, versiones y XML Word idéntico sin llamadas nuevas.

Navegador real sobre QA reconstruido: Familias → Observar → matriz → guía opcional → continuar con competencias vacías → conversación → preparar → refresh durante generación → caída controlada en revisión → reintentar → doce propuestas → revisar → confirmar. El proveedor **simulado** recibió una generación, una revisión fallida y una revisión exitosa; cero llamadas en conversación/navegación. Verifica recuperación/UX, no calidad semántica real. Capturas privadas ignoradas: .local/v2-fix-*.jpg.

Typecheck, lint, build, catálogo y revisión estática se ejecutan antes del Preview. SHA final y smoke remoto se informan en la entrega y se contrastan con Vercel. No se publica producción ni se alteran datos QA actuales, corpus oficial o migraciones aplicadas.

## Rollback y límites

Volver el alias QA al Preview b142a90 revierte servicio/presentación conservando datos, versiones y jobs privados. No hay migración nueva. Los lectores históricos y Word permanecen disponibles.

Una conexión de navegador interrumpida puede dejar una función trabajando; se consulta el estado persistido. Si la función termina abruptamente, la lease expirada permite reanudar. No se garantiza ejecución indefinida sin una página que despache los siguientes pasos. La revisión docente sigue siendo necesaria; los conteos no certifican suficiencia pedagógica.
