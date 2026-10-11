# Implementación de simplificación UX de Ayni · 11/10/2026

Autorizada por el propietario después de la auditoría. Rama aislada: `codex/ayni-ux-simplificacion-20261011`; base de producto `e3a107f`, auditoría conservada en `0fe1e4c`. Producción queda fuera de esta autorización. Las comprobaciones usan únicamente datos ficticios; no se reutilizan aulas reales.

## Etapa 1 · Observación confiable

- El diálogo protege texto, foto y corrección pendientes al cerrar, cambiar a un registro del historial, cancelar o registrar otra observación. Navegación del workspace y recarga tienen guardas; grabación, guardado y preparación de foto impiden salir mientras están activos.
- Segunda y siguientes correcciones parten de la versión vigente. La versión actual es principal; el original permanece consultable. Se conserva identidad, RAW, motivo, CAS e historial.
- Los errores de revisión se presentan como errores aunque exista un registro guardado. Texto y `clientRequestId` se conservan tras fallo para reintento; no se agregan llamadas IA ni escrituras de fondo.
- No se añadieron APIs, migraciones ni almacenamiento de datos pedagógicos en el navegador. El texto pendiente se conserva en memoria mientras la ventana está abierta; una salida deliberadamente confirmada lo descarta. No se promete recuperación de ese borrador después de cerrar el navegador.

Reproducción funcional: harness privado con los componentes real anterior y corregido, Chromium headless, viewport 390×844, transporte simulado y niña ficticia QA. Versión anterior: cierre sin guarda y segunda corrección desde RAW reproducidos; versión nueva: ambos PASS. Estas pruebas de interacción no certifican un backend remoto ni el diseño visual completo. Artefactos privados: `.local/ux-simplificacion/`.

Pruebas automatizadas: 15 casos iniciales PASS (helpers, captura y servicios PGlite de observación/atribución); nueva regresión de dos correcciones sucesivas comprueba RAW inmutable, revisión 3, historial de ambas correcciones y listado vigente. El primer intento de esa prueba asumió que la respuesta de revisión incluía `corrected_text`; ese campo se obtiene del listado y el cliente ya lo conserva. Se corrigió la expectativa de prueba, sin cambiar el servicio.

Typecheck y lint focal exit 0. Builds Next webpack y Vinext exit 0. Nueva regresión PGlite: 9/9 casos del servicio PASS, incluyendo dos correcciones sucesivas. En total se ejecutaron 16 casos focales distintos satisfactoriamente. Vinext conserva avisos del empaquetador sobre `eval` en PGlite y tamaño de chunks; no son fallos de compilación.

## Plan y límites

Siguientes etapas: período/borradores de evaluación; contexto/chat anual; configuración/matrícula/diagnóstico; año/proyectos/Hoy/Calendario; informes/documentos; integración y Preview. Se conservan cinco destinos, quince tramos, biblioteca, calendario, ejecución/confirmación docente y generación gradual de actividades.

Pendientes generales: Preview de esta rama, recorrido integrado, capturas con estilos de escritorio/móvil, zoom 200 %, hardware físico y aislamiento remoto de dos docentes. Los resultados históricos no se heredan como resultados nuevos. No se hará publicación en Producción.

Rollback de etapa 1: revertir su commit de UI/hook/helper. Los registros y contratos existentes siguen siendo compatibles; no hay migración que revertir.
