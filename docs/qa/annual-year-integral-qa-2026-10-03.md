# Mi año: QA integral del editor — 2026-10-03

## Alcance y estado

Continúa ADR 113/114 y el cierre de alcance contextual. La verificación integral funcional de esta ronda queda documentada con servidores y vista estables. Se trabaja en la misma aula QA con datos ficticios por autorización del usuario, sobre la copia recuperable preparada. El activo V1 y otros planes se conservaron durante QA. No se requieren migraciones SQL. El 4 de octubre el usuario autorizó posteriormente publicar también en producción, después del smoke de staging.

Este informe acredita las operaciones ejecutadas y diferencia la aprobación de una candidata dentro del ejercicio QA de la revisión humana de su pertinencia pedagógica. La revisión visual complementaria de escritorio/móvil cerró sin nuevos P0/P1/P2 materiales. Ese cierre no implica aprobación semántica de la candidata.

## Upgrade y estructura del año

Se ejecutó el upgrade explícito por UI de la copia: quince tramos, once de dos semanas y cuatro de tres. La auditoría `.local/editor-integral-db-audit.txt` verifica 172 días elegibles y 172 asignados, cero huecos y cero solapamientos. Las tres posiciones inicialmente vacías se ocuparon desde las alternativas QA, sin operaciones IA nuevas.

La duración y las fechas permanecen ligadas al tramo. Acogida/Gestión/feriados no se convierten en tarjetas movibles. Las protecciones de pasado, trabajo desarrollado, propiedad y CAS continúan en servidor. El caso de dos semanas y nueve días lectivos por el feriado de 29 de junio y la correspondencia con Project Master siguen cubiertos en la regresión; no se generaron actividades pagadas para repetir ese caso.

La auditoría final `.local/editor-integral-db-audit-final.txt`, revisión 13, confirma quince propuestas ocupadas, una en Biblioteca, quince slots, proporción 11/4 e integridad 172/172 sin huecos ni solapamientos. Hay siete acciones estructurales guardadas con `ai_calls = 0`. El hash de todos los demás planes permanece idéntico: `36e4a5877c546f4d67403406aa01a708`.

Solo se limpiaron números heredados de los títulos de tres alternativas ficticias QA. `.local/editor-qa-fixture-titles.sql` comprueba propiedad/revisión/hash en una transacción y guarda los títulos anteriores en el historial. Esta corrección de fixtures no reescribe títulos históricos del producto.

## Chat real, candidata y sustitución

La conversación real preparó una unidad sobre plantas. Luna recogió la intención y el pipeline pedagógico generó/revisó/reparó la fila. La candidata se presentó con sus detalles y pasó a Biblioteca mediante «Guardar en Biblioteca» antes de ocupar una posición. Se conservó el contenido del resto del año.

Se sustituyó la propuesta del tramo 14 desde Biblioteca. El preview mostró estos cambios determinísticos en cantidades de propuestas:

| Competencia | Antes | Después |
| --- | ---: | ---: |
| Lee | 1 | 2 |
| Cantidad | 3 | 2 |
| Indaga | 2 | 3 |
| TIC | 2 | 1 |
| Aprende | 2 | 1 |

La propuesta desplazada quedó en Biblioteca, conservada para reincorporación. La comparación no mide niveles, logros ni cantidad de actividades y no impone balance igual entre competencias.

**Revisión pedagógica pendiente.** La intención incluía explícitamente Crea; la candidata desarrolló Indaga y Lee, pero omitió Crea. Este desajuste requiere revisión humana. La validez del contrato, la revisión automática y la acción de guardado en el ejercicio QA no constituyen aprobación semántica de esa omisión. No se añadieron competencias solo para corregir un contador.

## Drag físico ejecutado

Se ejecutó un gesto real de arrastrar y soltar mediante CUA desde el tramo 12 al 15, con snap e intercambio. La vista confirmó el cambio de duración 2→3 de la propuesta entrante y 3→2 de la desplazada; ilustraciones y títulos siguieron a sus propuestas. `drag-antes.jpg` y `drag-despues.jpg` registran ambos estados. La auditoría estructural identifica ambos IDs y posiciones de origen/destino, con `ai_calls = 0` y sin operaciones IA nuevas. Esta evidencia sí incluye un gesto físico en navegador, además de las pruebas de API.

## Retirada, pendientes y persistencia

Retirar la colecta original del tramo 15 dejó catorce propuestas ocupadas y una posición vacía; confirmar quedó bloqueado. «Indicaciones de propuestas en Biblioteca» mostró su pendiente local. Se eliminó mediante «Quitar indicación» y el único pendiente global permaneció sin aplicarse. La reincorporación por UI al tramo 15 fue exitosa y restauró las quince posiciones ocupadas.

La recarga conservó el plan. Seleccionar «V2 Histórica» abrió doce propuestas con el banner que conserva fechas; volver a V3 abrió quince. No hubo upgrade automático al cambiar de versión. La aplicación pedagógica por alcance está probada en integración; no se volvió a invocar IA para aplicar esos pendientes en esta cuenta.

## Recuperación de candidata y permisos

Una respuesta de generación falló después de guardar la candidata en la base. El panel ahora consulta por GET la sesión existente cuando la respuesta falla; si hay candidata guardada, la recupera y muestra sin pedir otra generación. No borra la intención ni abre automáticamente una conversación nueva.

La integración verifica GET con candidata idéntica y ningún request IA adicional; otra cuenta recibe 404. Se mantienen los guards de propiedad y sesión existentes. El smoke remoto sin autenticación obtiene 401 en API; esta evidencia no reemplaza una nueva auditoría completa de RLS. No cambian sus políticas.

## Llamadas IA y checks

La nueva propuesta real registra nueve requests en `payload.calls`: dos de Luna y siete del pipeline de generación/revisión/reparación, incluyendo el reintento. Son llamadas de esta ronda. Las cuatro entradas en `metrics.operations` del plan son heredadas de la preparación anterior y no se suman a estas nueve ni acreditan cuatro llamadas nuevas. Upgrade, rellenar posiciones, sustitución, drag y conteos/deltas no añadieron operaciones IA. No se calcula gasto monetario porque no se dispone aquí de una conciliación de costo de esos requests.

- Suite focal final: 69/69 PASS, `.local/editor-integral-focal.txt`.
- Project Master/calendario: 8/8 PASS, `.local/editor-integral-project-master.txt`; subconjunto incluido en la validación, sin sumar casos repetidos. Las pruebas de integración utilizan proveedor simulado; no son las nueve llamadas reales de la nueva unidad ni acreditan un Project Master pagado en esta ronda.
- Typecheck `npx tsc --noEmit`, lint `npm run lint`, Next `npx next build` y Vinext `npm run build`: PASS finales, exit 0. Logs `.local/editor-integral-{typecheck,lint,next-build,vinext-build}.txt`.
- Auditoría inicial y final del borrador: `.local/editor-integral-db-audit.txt` y `.local/editor-integral-db-audit-final.txt`. El contador de operaciones heredado se mantiene separado del contador de la sesión nueva; el estado final conserva nueve llamadas nuevas y cuatro operaciones heredadas.

## Móvil y capturas

Verificación móvil real a 390 × 844 px: ancho de página medido de 375 px, sin desbordamiento horizontal global. La matriz tiene `clientWidth = 342` y `scrollWidth = 1440`, scroll horizontal propio y primera columna sticky. La recarga y consulta de quince se distinguen de la primera medición temporal sobre doce.

Capturas comprobadas en `.local/editor-final-screenshots/`: `timeline-inicio.jpg`, `timeline-hoy.jpg`, `biblioteca-candidata.jpg`, `candidata-detalles.jpg`, `chat-nueva-propuesta.jpg`, `chat-enviado.jpg`, `delta-curricular.jpg`, `matriz-indaga.jpg`, `filtro-timeline-indaga.jpg`, `panel-propuesta.jpg`, `drag-antes.jpg`, `drag-despues.jpg`, `movil-timeline.jpg`, `movil-matriz.jpg`, `biblioteca-indicacion.jpg`, `historico-conservado.jpg` y `panel-local-pendiente.jpg`.

La recaptura `timeline-medio.jpg` muestra HOY y el detalle abierto del feriado del 8 de octubre. El revisor abrió las seis capturas complementarias de móvil, drag, candidata expandida, feriado y pendiente de Biblioteca y cerró el alcance visual/funcional sin nuevos defectos materiales. Permanecen pendientes la revisión humana de Crea y el recibo de SHA/URL/smoke del deployment final.

## Publicación y reversión

La autorización original limitaba la publicación a staging QA. El usuario la amplió explícitamente el 4 de octubre a producción. Se publicará el mismo commit identificado y limpio, primero en staging con smoke, después en producción y con smoke del destino. El commit exacto, URLs y resultados se entregarán en un recibo posterior al commit para evitar una referencia circular en este informe versionado. La publicación final sigue pendiente en este checkpoint; no se atribuye al preview anterior el código de esta reparación.

La copia previa y su borrador archivado permanecen recuperables. Un rollback de código/alias debe leer contratos de doce y quince, Biblioteca, slots nullable e historial; no devolver un deployment limitado a doce después de haber guardado quince. No borrar candidatos persistidos por un error de respuesta ni regenerarlos sin comprobar primero la sesión. No se revierte SQL.
