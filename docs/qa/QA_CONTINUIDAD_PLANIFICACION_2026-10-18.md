# Continuidad de planificación — 18 de octubre de 2026

Base: `85bb7c284bfd7c1789bc1ee176bc9f944524c992`. Rama: `codex/planning-recovery-20261018`.
Cambios locales; sin commit, push ni despliegue en esta ronda. Sin escrituras cloud, migraciones, borrados o llamadas pagadas.

## Hallazgos y correcciones

| ID | Síntoma / causa | Corrección | Estado |
| --- | --- | --- | --- |
| CONT-01 | El cliente solo retomaba trabajos anuales `queued`; una lease vencida o un timeout de consulta terminaban en una petición manual. | Servidor publica elegibilidad para continuar desde respuesta identificada o etapa sin llamada pendiente. Cliente continúa con espera creciente. Máximo tres recuperaciones automáticas por trabajo, persistidas y revalidadas bajo bloqueo. | Backend y UI con API simulada PASS. |
| CONT-02 | Mientras se leía el trabajo anual existente podía montarse el chat inicial; una lectura del plan anterior a la finalización también podía dejar el chat abierto. | Esperar el trabajo guardado antes de montar la conversación; si ya terminó, volver a leer el plan. La acción explícita de actualizar la preparación sigue disponible. | UI con API simulada y compilación PASS. |
| CONT-03 | Una llamada de proyecto podía quedar `uncertain` aunque su resultado ya estuviera persistido. | Leer resultado canónico del paso antes de pedir reintento: criterios, proyecto o actividad. Exigir aceptación docente previa, propiedad, versión, contexto/decisiones o huella de proyecto. Volver a la misma cola existente, sin nueva llamada de IA ni modificación individual de actividades. | PGlite PASS. |
| CONT-04 | Añadir decisiones después de `ready` ya era posible, pero poco visible; desde el tercer aporte se sustituía la respuesta por un cierre genérico. | Etiqueta visible «¿Quieres añadir otra decisión?» y acción «Agregar decisión». Conservar la respuesta al aporte adicional y el cierre sin nuevas preguntas obligatorias. | PGlite y UI escritorio/móvil PASS. |
| CONT-05 | Las guías de 5 años no ofrecían momentos de aprendizaje autónomo ni TIC; las otras edades sí tenían cubierta la aplicabilidad curricular vigente. | Catálogo v4.6 añade dos experiencias y cinco momentos propios. El validador y pruebas verifican cobertura conjunta por edad y L2/Religión. | Catálogo, PGlite y UI real local PASS. |

Un conflicto de fuentes invalida explícitamente la elegibilidad que pudiera quedar de un timeout previo. Una respuesta perdida sin ID recuperable, un resultado expirado, un error de contenido, un cambio de fuentes o el agotamiento de recuperaciones no se reintentan silenciosamente. Se conserva el avance y la decisión explícita cuando repetir una llamada podría tener costo. No se promete que cualquier fallo desaparezca automáticamente.

## Validación ejecutada

- 114 pruebas PASS en catorce archivos: `annual-journey-recovery`, `initial-journey`, `complete-project-preparation`, `preparation-jobs`, `annual-context-draft`, `annual-journey`, `annual-experience-context`, `project-flow-service`, `preparation-background`, `diagnostic-editorial`, `diagnostic-experiences-v4`, `diagnostic-ui-flow`, `diagnostic-sources-v4`, `initial-diagnostic-progress`.
- Inyección de timeout al recuperar una respuesta identificada: una sola creación del proveedor simulado, dos consultas, mismo trabajo, publicación final y contador automático persistido.
- Resultado desconocido: recuperación automática rechazada antes de otra llamada. Conflicto tras timeout: se detiene la continuación automática. Propiedad, leases y lectura sin duplicados conservadas.
- Proyecto: resultado canónico del proyecto recuperado; otro contexto no se reutiliza. Actividad ya guardada con checkpoint perdido recuperada por lectura; otro propietario/revisión rechazados. Diez actividades publicadas una sola vez.
- Cuarto aporte docente guardado y recibido en contexto; fuentes familiares siguen siendo contexto, no evidencia.
- UI real de conversación montada con API de fixture explícitamente simulada, sin IA: envío después de `ready`, confirmación visible y capturas 1366×1000 / 390×844. No desbordamiento horizontal en móvil.
- Backend funcional: PGlite aislado. No se probó la cuenta real de la usuaria ni se reprodujo su mensaje exacto, que no se conservó.
- Tras restablecer el navegador se completó la recuperación anual simulada: llega a «Mi año está listo para revisar» automáticamente, dos invocaciones del mismo trabajo (`automaticResume:true` y continuación), sin reenviar el chat. Estado desconocido: cero invocaciones automáticas y acción explícita conservada. Recibos privados `recovered-receipt.json` y `uncertain-receipt.json`. No equivale a una llamada de IA real ni reproduce el mensaje original de la usuaria.
- Diagnóstico real local: se revisaron los cinco momentos nuevos, se guardó un hecho ficticio de Ana en autonomía desde el criterio y se recargó. El registro, competencia y priorización se conservan. UI actual `InterviewsWorkspace`/`GuidedObservationWorkspace`, además del lector anterior. Capturas escritorio/móvil; no se prueba uso físico de cámara, micrófono ni intervención de niños reales.
- `validate:diagnostic-catalog`, typecheck, lint de producto, Vinext y Next webpack PASS. Recibos en `.local/planning-recovery-20261018/`. El lint sin exclusiones recorrió también `.local` y sus bundles de QA, con errores ajenos al producto; repetir excluyendo `.local` y `outputs` pasó. Un typecheck simultáneo con Next leyó tipos generados mientras se recreaban; la ejecución final secuencial tras el build pasó (`typecheck-complete.log`).

Capturas del chat:

![Decisión adicional en escritorio](../../outputs/planning-recovery-20261018/decision-desktop.png)

![Decisión adicional en celular](../../outputs/planning-recovery-20261018/decision-mobile.png)

![Año recuperado automáticamente; API simulada](../../outputs/planning-recovery-20261018/recovered-year-desktop.png)

## Semanas de evaluación diagnóstica inicial

La docente aclaró que se refiere a las **semanas de evaluación diagnóstica**, no a reservar otra etapa al final de cada bimestre. El conjunto de experiencias debe ofrecer oportunidades para las competencias aplicables al aula; no todas dentro de cada actividad ni una calificación automática. Se mantienen las dos semanas iniciales y los quince proyectos sin cambiar sus fechas.

Catálogo `diagnostic-v4.6`: nueve experiencias / 27 momentos. Las siete anteriores conservan contenido e IDs; se añaden «Probamos nuestro plan» (tres momentos: meta, estrategia, revisión) y «Creamos un mensaje digital» (dos: exploración acompañada y creación/revisión). Son exclusivas de 5 años según los referentes por edad de la KB vigente. TIC declara una condición de recurso: solo realizarla si se dispone de un dispositivo adecuado, con acompañamiento, sin conexión ni imágenes de personas. La disponibilidad no se presume; no tener dispositivo no produce evidencia ni dificultad. Religión y castellano L2 conservan los flags existentes. No se fuerza escritura o transversales a edades sin desempeño especificado en el contrato vigente.

El validador comprueba las doce combinaciones de edad × aplicabilidad L2/Religión. Que una competencia tenga una oportunidad no demuestra que se realizó, que se observó a todos ni que exista evidencia suficiente. La observación libre, priorización y avance sin cuotas siguen disponibles. Las nuevas observaciones usan las tablas, criterio, versión y permisos existentes; los snapshots históricos no se reescriben.

Referencia primaria contrastada: [Programa Curricular de Educación Inicial, MINEDU](https://www.minedu.gob.pe/curriculo/pdf/programa-curricular-educacion-inicial.pdf), apartado VII de competencias transversales; referentes por edad en KB v4. Revisión editorial interna, sin certificación externa ni validación de campo.

![Autonomía: momento y registro ficticio recuperado](../../outputs/planning-recovery-20261018/diagnostic-autonomy-desktop.png)

![TIC: condición de dispositivo y acompañamiento](../../outputs/planning-recovery-20261018/diagnostic-digital-desktop.png)

## Rollback y límites

Revertir los archivos de esta rama a la base indicada. No hay esquema nuevo ni transformación de registros pedagógicos. Los campos de recuperación son metadatos aditivos en los trabajos existentes y pueden ignorarse en la versión anterior. Se conserva el historial y el almacenamiento canónico. Producción y Preview no cambiaron en esta ronda.
