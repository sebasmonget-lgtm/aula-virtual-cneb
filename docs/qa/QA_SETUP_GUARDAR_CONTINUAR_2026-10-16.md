# Guardar aula y continuar: bloqueo sin explicación

Base: `a70ab02057f1a3a259bb5c7fd835c75bda3e9eb0`. Rama: `codex/fix-setup-submit-20261016`.

La usuaria informó que el botón permanecía deshabilitado y que pudo continuar tras recargar. No se inspeccionó ni modificó su cuenta cloud después de esa recuperación; por tanto, no se afirma haber identificado el evento exacto de su navegador.

## Reproducción y causa demostrada

En una base local nueva, con docente y colegio ficticios, se montó el componente real `PilotSetup`. Una acción exclusiva del harness restauró los valores DOM de institución, docente, sección, edad y año sin emitir eventos input/change, simulando restauración/autocompletado. Todos los campos se veían completos, pero el botón seguía deshabilitado porque `complete` consultaba únicamente el borrador React. El formulario no explicaba qué consideraba pendiente.

## Corrección

- El botón permanece disponible para validar, salvo al guardar o leer un logo.
- Se mantienen required/minLength y las validaciones del servidor. Un formulario incompleto dirige al campo inválido y muestra una explicación.
- Al enviar se leen los campos visibles mediante `FormData`, con nombres estables, y se sincroniza el borrador. Se preservan logo, colores y demás opciones existentes.
- La validación nativa también captura los valores visibles antes de actualizar React, para conservar los otros campos restaurados.
- Se conservan bloqueo de doble envío, submissionId, cola de autoguardado y calendario oficial. Sin cambios de endpoints, modelos, base o permisos.

## Resultado ejecutado

1. Antes del cambio, restauración completa: botón deshabilitado.
2. Después, envío vacío: explicación visible y foco en institución.
3. Restauración completa sin eventos: botón disponible; un clic guarda y continúa sin recargar.
4. El workspace real recupera el aula como configurada y ofrece añadir niños.
5. Al abrir «Editar aula», se recuperan del servidor institución, nombre y sección exactos. Dashboard local confirma edad 5 y cero niños; no se inventó matrícula.
6. En móvil de 390 px, restaurar todo salvo sección y pulsar guardar enfoca sección, conserva institución/docente/edad/año y muestra el aviso; no se envía una creación incompleta.

Pruebas: 29 PASS, 0 FAIL en `pilot-setup-form`, `pilot-setup-draft`, `planning-journey` y `workflow-ui-continuity`. Incluyen lectura de campos restaurados frente a un borrador obsoleto, campos opcionales borrados expresamente, conservación del logo y rechazo por el validador canónico de datos vacíos/edades no admitidas. TypeScript, lint y builds Vinext/Next PASS. Detector de UI: sin hallazgos. El harness usa un sustituto de next/image; sus avisos de preload/unoptimized no aparecen en el build Next.

No se efectuaron llamadas de IA ni escrituras cloud. Las bases locales anteriores se conservan. Publicación exclusivamente Preview, commit identificable y smoke posterior. Rollback: revertir el commit o volver al Preview `https://ayni-aula-staging-9ifp0fqsi-ayni4.vercel.app/`; no requiere restaurar datos ni migraciones.

Evidencia: [bloqueo reproducido](evidence/setup-submit-20261016/bloqueo-reproducido.png), [formulario recuperado](evidence/setup-submit-20261016/formulario-recuperado.png), [continuación correcta](evidence/setup-submit-20261016/continuacion-correcta.png) y [validación móvil](evidence/setup-submit-20261016/validacion-movil.png).
