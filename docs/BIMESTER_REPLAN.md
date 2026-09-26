# Cierre y reajuste del bimestre

El asistente de cinco pasos vive en **Evaluar** y aparece en **Hoy** al terminar un período. Usa las valoraciones docentes, evidencias y cierres existentes. La propuesta es determinista: Ayni distingue bajo logro confirmado de falta de evidencia, y la profesora elige las prioridades y cada cambio. No se envían datos de menores a IA.

## Datos y permisos

- `GET /api/period-evaluations/replan` calcula el resumen a partir del mapa y las estadísticas vigentes del período. Solo acepta el aula propia mediante el contexto de autorización del servidor.
- `POST /api/period-evaluations/close` conserva el cierre documental y su manifiesto inmutable. La revisión exige que el cierre siga vigente.
- `POST /api/period-evaluations/replan/confirm` verifica de nuevo docente, aula, período, cierre, plan activo, revisión del plan, currículo aplicable y estado futuro de cada propuesta. Una transacción crea la siguiente versión de `annual_plans`, copia los `project_slots` sin mover fechas, registra las filas cambiadas en `annual_plan_changes`, archiva el plan previo y activa el nuevo.
- `annual_plans.generation_metadata` guarda el período y versión de cierre de origen, prioridades, decisiones sobre propuestas y talleres, y docente que confirmó. Los proyectos, unidades, actividades y evidencias existentes conservan sus referencias al plan histórico. Un mismo cierre no puede producir dos reajustes.
- Si el plan anterior ya tenía contenido formal, la nueva versión lo deriva y actualiza solo las competencias de las propuestas reajustadas. Así el Word de la versión vigente puede representar esas decisiones sin otra llamada de IA. El contenido de la versión anterior permanece intacto.
- «Mi año» muestra la versión confirmada como «Reajuste Bimestre N» y mantiene disponibles las versiones anteriores.
- Solo se agrega una competencia a propuestas que comienzan después del cierre y de la fecha actual de Lima, y que todavía no tienen un proyecto o unidad desarrollados. Para cambiar uno ya desarrollado se utiliza su propio flujo de versiones. Los talleres del catálogo se recomiendan solo cuando corresponden a edad y lenguaje; la decisión queda guardada para prepararla después.

No se añadió una migración: se reutilizan las tablas versionadas existentes. La versión nueva es una copia estructurada con modificaciones puntuales; no se regenera el Plan Anual con IA.

## Reversión

Ocultar la entrada al asistente y desactivar sus dos rutas nuevas deja intactos los cierres y las versiones ya confirmadas. El plan anterior sigue como documento histórico. No se revierte una versión confirmada por edición directa.

## Verificación

`src/lib/bimester-replan-service.test.mjs` cubre resumen sin inferir bajo logro de la falta de observaciones, catálogo de talleres, permisos entre dos docentes, rechazo de propuestas pasadas o ya desarrolladas, versionado, contenido formal derivado, trazabilidad y conservación de descendientes.

La prueba integrada anterior intentaba confirmar la conclusión dentro del mismo paso de valoración y fallaba con «Guarda los cambios del borrador antes de confirmar». Se actualizó la prueba para confirmar la valoración y después la conclusión, con una respuesta ficticia del modelo. Esta secuencia reproduce el flujo vigente y vuelve a verificar el cierre, su historial y el aislamiento entre aulas.
