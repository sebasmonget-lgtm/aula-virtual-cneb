# Ayni: chat y recorrido coherentes — 2026-10-13

Base `14af802`, rama `codex/observaciones-inicial-qa`, fetch 0/0 con origin. Production anterior `dc02a73714f25fe4c222cdcf038b32a56c5b6d46`, deployment `dpl_ErioWNTaEcdGfjZoZgjW3axcEpAs`. No se restaura un commit antiguo. El prompt adjunto propone Preview, pero la solicitud directa posterior autoriza Production tras validación.

## Lista de correcciones completadas

1. Mismo formato de fila libre/guiada, con etiqueta de origen correspondiente.
2. Editar y menú de tres puntos compartidos, incluido Eliminar observación guiada.
3. Menú cierra por clic exterior; conserva foco/Escape del dropdown existente.
4. Retiro guiado autorizado, con CAS/replay y original/evidencia privada conservados.
5. Retiradas las rutas de historial de esta preparación; enlace antiguo conduce a la tabla.
6. Sin acceso duplicado al resumen: es la continuación de captura.
7. Eliminado Volver a mi preparación y regresos duplicados de la captura.
8. Un regreso al paso anterior y continuación destacada a la derecha; chat vuelve a tabla.
9. Mismo componente para las cuatro etapas en portada, formularios y chat.
10. Chat siguiendo mockup: contexto compacto a la izquierda, conversación protagonista a la derecha; en móvil el contexto se pliega.
11. Eliminado el bloque grande Revisar mis ideas y proyectos; editor contextual en panel lateral para decisiones, recursos e historia declarada. Fuentes originales se editan desde su recorrido.
12. Preguntas simples sobre condiciones faltantes, cierre con decisiones vigentes y Crear Mi año; conserva dictado, chips, recuperación, errores y conversación opcional.

## Comparación

La versión antigua aportaba conversación y contexto, pero otro esquema visual. La base reciente conservaba persistencia/CAS y entrada directa al chat, aunque mostraba contexto en un formulario extenso. Esta entrega recupera la presentación del mockup manteniendo el backend reciente: separación de fuentes reales, controles compactos, contexto efectivo editable y generación existente. No introduce resúmenes de IA, intereses supuestos ni niveles del grupo.

## Validación ejecutada

- Typecheck: `npx tsc --noEmit`, PASS.
- Lint completo: `npm run lint -- --ignore-pattern .local`, PASS sin advertencias.
- Build: `npx next build --webpack`, PASS, Next 16.3.4.
- 63 pruebas focales PASS: resumen del chat, retiro guiado, contexto CAS, conversación, diagnóstico, personalización, recuperación anual, flujo y biblioteca.
- 32 pruebas de evaluación PASS con fixture alineado al esquema existente.
- 7 pruebas HTTP/autorización PASS. Total 102; sin declarar validación de hardware.

Harness aislado `.local/consistent-chat-20261013/`: 35 alumnos ficticios, componentes reales, API local y PGlite con migraciones existentes. Navegador: registro guiado, menú exterior y retiro confirmado, registro libre, captura → tabla → chat; edición de una decisión, añadido de recursos y proyecto, eliminación de otro elemento, guardado incierto/conflicto y reintento. Una solicitud de preparar año; generación mediante transporte QA local, 3 llamadas físicas, 0 pagadas. GET del borrador anual confirma texto editado, recursos e historia. No se generan años ni se escriben observaciones de prueba en cloud.

Escritorio y 390 px: panel de dos columnas y contexto plegado en móvil; conversación móvil clientWidth/scrollWidth 342/342, sin desbordamiento. Capturas `chat-desktop.png` y `chat-mobile.png` dentro del harness ignorado. La generación ficticia valida integración/persistencia, no calidad de respuestas de un modelo real. Pruebas del proveedor controlado confirman que contexto manual no añade llamadas IA y no se reincorporan turnos ya importados. Calendario/IDs estables/contratos de año preservados.

## Publicación y rollback

Primera publicación `f39c47a05d34bcf3cbddcbf1349c7804a92143e3`, deployment `dpl_8aYjnn2WyyvBLF7JrGp3Go4vQYxM`, READY; 12 smoke previos PASS y promoción del mismo build. La comprobación final reprodujo EMAXCONNSESSION en /health y carga anual: límite de 15 conexiones en modo sesión. El reintento de lectura recuperó los datos y expuso una entrada vacía de UI; CHAT-02 corrige ese estado. Verificado localmente con 503 sostenido y botón de recuperación hasta chat visible, sin recargar. Build/typecheck/lint del ajuste PASS. No presentar la recuperación como solución permanente del pool.

Pendiente recibo de la publicación final con CHAT-02. Sin migraciones, secretos en repositorio, cambios de variables cloud, permisos o main. Rollback identificado: deployment anterior citado arriba; conserva eventos privados, pero su servidor anterior no filtraba retiros guiados (ADR-132), por lo que una reversión requiere revisar estos eventos.
