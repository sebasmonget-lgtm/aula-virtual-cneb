# Logo del colegio y capturas del recorrido

Fecha: 20 de octubre de 2026. Corrección local validada; publicación QA pendiente de solicitud expresa.

## Hallazgo y alcance

En el recorrido nuevo, la imagen PNG se cargó desde el formulario, apareció en la vista previa y se guardó vinculada a la institución. Al volver a Configura tu aula, el navegador mostró una imagen rota. La inspección del elemento confirmó `naturalWidth = 0` y una URL `http://127.0.0.1:8788/api/assets/...` dentro de la Preview HTTPS. La lectura privada del archivo almacenado fue correcta: 168.871 bytes y cabecera PNG válida. No hace falta volver a subirlo.

La causa está en `scripts/local-db-server.mjs`: tanto el tablero completo como la respuesta inicial después del alta construían el logo con el origen local. La corrección comparte un origen determinado por el modo de autenticación: URL relativa `/api/assets/:id` para Auth Supabase y origen del API local para la ejecución local separada. Se aplica a cualquier institución que consulte esos caminos, incluidos logos ya guardados; no modifica sus archivos ni las fuentes pedagógicas.

La autorización sigue en servidor por ID de logo y propietario. No se convierte Storage en público, no se modifica RLS y no se introduce una migración. Las descargas de documentos mantienen su lectura privada independiente, ya comprobada por las pruebas existentes.

## Validación ejecutada

- Once pruebas PASS: frontera HTTP, configuración inicial, relectura del tablero, logo/documentos y recuperación del alta. HTTP real local, Auth Supabase simulado y PGlite temporal; no equivale a validación visual de la corrección en Vercel.
- El logo remoto usa la ruta relativa tanto en la respuesta inicial como al recargar; el API entrega imagen al propietario, devuelve 401 sin sesión y 404 a otro docente. La ejecución local conserva una URL absoluta con su puerto correcto. Aula sin logo devuelve `null`.
- Lint, `tsc --noEmit`, build Vinext y build Next webpack PASS. `git diff --check` PASS. Advertencias de dependencias/tamaño en Vinext no impiden el build.
- En QA se completaron exclusivamente los datos del colegio/aula y se cargó un logo por UI. Cero alumnos añadidos, observaciones, IA de Ayni o documentos generados en este recorrido nuevo.

No se ha publicado esta corrección. Después de una publicación autorizada: reabrir Configura tu aula, comprobar dimensiones naturales positivas de la imagen y captura visual; recargar y repetir. Mantener el mismo archivo y los datos existentes. No declarar que el enlace QA está corregido antes de esa comprobación.

### Comprobación de los últimos cambios antes de la entrega

La persona usuaria acepta continuar con la condición de conservar los últimos commits y pushes. `git fetch origin` confirma como base `9bc5b26`, sin commits de diferencia entre HEAD y la rama remota `codex/qa-corrections-20261019`. Se conserva la carátula reciente y sus cifras de asistencia dibujadas como contornos. Solo hay cambios de producto en el origen del logo; el resto de archivos modificados son sus pruebas y documentación de esta auditoría.

La ampliación de regresión sobre esa base suma 53 pruebas PASS, incluyendo informes familiares, gráfica/porcentajes, carátula, Word canónico, permisos y alta. Typecheck, lint y los dos builds ya se ejecutaron con el mismo cambio de código. No se restaura ningún archivo de versiones antiguas. Se prepara un commit nuevo y una Preview regional en gru1 con la base QA aislada, smoke previo a mover el alias y comparación de huellas de los datos actuales. El resultado efectivo, SHA y preservación de Producción se registran en `.local/logo-release-20261020/release.json`; una preparación no equivale a publicación comprobada. La verificación visual del navegador y la primera captura con logo deben realizarse después del cambio de alias.

Rollback: revertir únicamente el origen del logo y sus comprobaciones añadidas. No requiere restauración de datos; los archivos privados continúan vinculados.

## Capturas para tutorial y promoción

La persona usuaria solicita conservar capturas de cada paso revisado para montar después un video rápido. No se ha creado un video ni se ha publicado material.

Destino ignorado por Git: `outputs/ayni-recorrido-20261020/`. `secuencia.json` conserva orden, título, descripción, estado e imagen de cada escena. `capturas/002-anade-a-tus-ninos.jpg` muestra el paso de matrícula vacío. La configuración queda pendiente de una toma con el logo corregido en QA. `hallazgos/001-configuracion-logo-roto.jpg` se conserva como evidencia y se excluye del montaje promocional.

Mantener los originales completos y usar las pantallas realmente recorridas. El control del reloj QA puede retirarse del encuadre durante la edición del video; no ocultarlo modificando el DOM para fingir otro entorno. No añadir niños ni avanzar el diagnóstico automáticamente para completar las escenas. Los siguientes pasos se incorporan conforme se revisen con la persona usuaria.
