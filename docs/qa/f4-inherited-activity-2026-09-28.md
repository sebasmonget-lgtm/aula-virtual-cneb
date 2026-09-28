# F4 — Actividad heredada y ejecución QA

28/09/2026. Rama `codex/nuevo-ayni-f4`; entrada F3 `17e8556`, baseline H34 `5efa58a`. Sin despliegue ni llamadas API pagadas.

## Flujo y contrato

`NEXT_PUBLIC_AYNI_ACTIVITY_INHERITED=1` muestra la fila confirmada del proyecto con propósito, fecha, competencia, criterio y evidencia, sin pedir que la profesora vuelva a escribirlos. El aporte para el día y materiales son opcionales. El proveedor solo recibe la fila, vecinas, posición y contexto permitido; el material de la fila se hereda. La respuesta se ajusta a la fila confirmada en servidor. `AYNI_ACTIVITY_INHERITED=1` persiste `ActivityV3` exclusivamente en proyectos V3 confirmados; contratos entrantes no pueden activar la ruta por sí mismos. Los textos pedagógicos siguen en `activities.details`, sin duplicar mapa ni añadir columnas.

Una segunda competencia exige selección docente, criterio propio y evidencia esperada propia; la referencia al criterio general del proyecto y el override docente quedan en el snapshot. Confirmar actividad inserta todos los criterios separados y agenda la actividad en una transacción. Si cualquier inserción falla, actividad, criterio y agenda regresan al borrador. Taller opcional conserva la misma transacción existente. Versiones antiguas siguen leyendo por adaptador y conservan su experiencia/blueprint exactos. Una nueva copia se prepara como borrador; no reasigna evidencias antiguas.

Flag UI/servidor apagados por defecto. Reversión: apagar ambos flags, sin borrar ActivityV3 ya confirmadas; la lectura y confirmación de borradores V3 existentes siguen disponibles. Sin migración: `activities.experience_id`, `details.route_item_id`, `activity_criteria` y la agenda ya ofrecen los vínculos necesarios. F5 agregará entidad raw separada; esta fase no crea observaciones ni niveles.

## Prueba de interfaz y datos

Export de F3 `.local/qa-backups/f3-checkpoint-full.json` restaurado en clon nuevo `.local/qa-backups/f4-restored`: 71/71 tablas iguales al iniciar, sin tocar base original. Fixture local OpenAI solamente `activity-v1`, una respuesta válida de prueba, `usage` cero, una fila `ai_usage_events` de costo cero; no evalúa pertinencia curricular. Reloj de jornada QA aislado (`NODE_ENV=test`, directorio clon, fecha/hora explícitas) mostró 19/10/2026 09:10, sin alterar reloj del equipo ni fechas de cierres H34.

Por UI: Planificar → proyecto V3 “Los cuentos se mueven con nosotros” → fila 1 del 19/10/2026. Fecha, propósito y criterio quedaron heredados sin reingreso. “Preparar día” devolvió propuesta fixture. Se añadió explícitamente `COM_ARTE` con criterio/evidencia propios al primario `COM_LECTURA`. Guardar borrador y confirmar dejó actividad `84639d6b-9f1b-4004-865d-138d21be8c5b` activa. Hoy mostró agenda 09:00, materiales y tres pasos; se avanzó 1→2→3 y se terminó por UI. El observador DB posterior verificó `project_id`/versión 1/blueprint exactos, dos criterios activos con refs distintos, una agenda y una ejecución completada. No se creó evidencia ni nota de estudiante.

69 tablas fuente/históricas quedaron iguales al snapshot, incluido las 26 actividades, criterios, evidencias, valoraciones y cierres anteriores. Dos tablas derivadas de mapa de período se recalcularon: entradas 24→26 (cinco filas anteriores actualizadas, ninguna perdida), versiones 49→50 (ninguna anterior modificada). Se informa esta diferencia explícitamente; no se presenta como inmutabilidad de proyecciones. `competency_display_labels.updated_at` se refrescó al arrancar API QA, sin cambio de etiquetas. Reporte `.local/test-results/f4/history.json`.

## Gates y límites

Pruebas focales: herencia sin input, override, fecha/vecinas/materiales, criterio separado, validación de pertenencia, taller, rollback y versiones. Suite completa 547/547, `npx tsc --noEmit` PASS, `npm run lint` PASS, `npm run build` PASS y QA de interfaz+verificación de base descritos arriba. La suite detectó una aserción antigua dependiente de espacios en el código TSX; se normalizó el formato antes de comparar y se repitió completa. Sin Supabase real, RLS staging, juicio experto sobre texto fixture, foto, dictado ni E2E anual. El uso real de OpenAI en F4 no se smokeó para no gastar fuera de lo indispensable; schema/producto previo permanece cubierto por tests existentes.
