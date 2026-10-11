# QA interactivo de Ayni — 2026-10-11

## Acuerdo del recorrido

- Preview: https://ayni-aula-staging-2wy9l0jb4-ayni4.vercel.app/
- Producto de referencia: `5bafbd802ff892f14280fc9181a77dce900bbf0f`, rama `codex/ayni-ux-simplificacion-20261011`.
- Checkout inicial limpio en `dcc1b36` (documentación posterior al commit de producto).
- Producción excluida. Una pantalla y una acción a la vez; avanzar solo con indicación de la persona usuaria. No completar formularios, crear registros ni aplicar propuestas de diseño automáticamente.
- Inicio simulado previsto: 16 de febrero de 2026; progresión hasta diciembre. Aún no se ha configurado.
- Cualquier eliminación requiere presentar primero el alcance y obtener confirmación explícita. Conservar credenciales.

## Comprobación inicial

La Preview se abrió visible en el navegador integrado de Codex. La sesión existente accedió a la interfaz docente sin introducir credenciales. Se consultó únicamente el perfil para identificar la cuenta; no se editaron ni guardaron campos.

La pantalla muestra un perfil docente y un aula con cuatro niños y cuatro entrevistas confirmadas. No se muestra una marca de cuenta QA. El nombre de perfil editable no demuestra por sí solo que la identidad autenticada sea exclusivamente de pruebas, ni que los datos sean ficticios. La exclusividad QA queda **pendiente de confirmar** antes de preparar una eliminación.

No se ejecutaron eliminaciones, cambios de reloj, generaciones de IA, pruebas de guardado ni despliegues. No se declara medición de carga: las observaciones de pantalla de esta apertura no constituyen una medición instrumentada.

## Reloj existente: inspección preliminar

Existe `src/lib/qa-daily-clock.mjs`. `AYNI_QA_DAILY_CLOCK=1` exige proceso `NODE_ENV=test`, clon local en un directorio permitido y ausencia de `DATABASE_URL`. Lee `AYNI_QA_DATE` y `AYNI_QA_TIME` al inicializar el servidor; el dashboard puede exponer `today.qa_clock` y mostrar un aviso.

Este mecanismo se limita a la jornada y no altera los cierres H34. No ofrece actualmente un control interactivo para Preview. No se habilitó ni se relajaron sus protecciones. La preparación posterior deberá definir aislamiento por cuenta/entorno y cobertura temporal antes de comenzar el año simulado.

## Pendientes para la siguiente autorización

1. Confirmar que la cuenta abierta y sus registros son exclusivamente QA.
2. Inspeccionar alcance de reinicio por propietario, dependencias y archivos privados, manteniendo Auth y credenciales. Presentar inventario antes de pedir confirmación de borrado.
3. Preparar el control de fecha y hora limitado a QA, en rama aislada si requiere código, con validación y Preview conforme a las reglas del proyecto.

## Registro de pantallas y acciones

| Paso | Pantalla / acción | Resultado | Estado |
|---|---|---|---|
| 0 | Abrir Preview visible y consultar perfil | Sesión disponible; exclusividad QA sin evidencia suficiente | Esperando respuesta de la persona usuaria |

Todavía no se inició el recorrido pedagógico ni se formularon propuestas de diseño.

## Autorización de reinicio e inventario actual

La persona usuaria confirmó expresamente que la cuenta y registros son QA y autorizó borrar todo. La autorización conserva el alcance original: esta cuenta, manteniendo credenciales y sin afectar otras cuentas ni Producción.

Consulta remota de solo lectura en el proyecto nuevo `eetdkmmspicboijcmnzv`: el aula de cuatro niños corresponde a docente `34d53f3f-5707-4bb6-9009-8190df357bf2` y aula `3bd18998-dee6-4ae6-86ff-56d84d784dc2`. Existe otra docente con el mismo nombre y tres niños, fuera del alcance. No reutilizar el aula congelada del reinicio del 9 de octubre.

Inventario actual por los 65 ámbitos del procedimiento anterior: **352 filas en 17 tablas**, cero objetos privados de Storage; usuario Auth con rol docente existente. Incluye cuatro niños, cuatro entrevistas, tres observaciones diagnósticas, sus decisiones/contextos, calendario de 305 días, configuración y seis registros de consumo IA. No hay planes anuales, actividades, evaluaciones confirmadas ni informes familiares en esos ámbitos. El inventario no equivale a respaldo completo ni a ensayo de eliminación; antes de ejecutar deben releerse esquema/FKs/triggers y congelarse IDs actuales.

**Conflicto de aislamiento detectado:** las configuraciones locales de Preview (`.local/handoff-preview.env`) y Producción (`.local/release-all-production.env`) apuntan al mismo proyecto Supabase. El editor autenticado confirma que la cuenta existe en ese proyecto. No se puede prometer un reinicio exclusivo de Preview mientras ambas aplicaciones compartan esa base. La etiqueta `main PRODUCTION` de Supabase por sí sola no prueba el enlace; el hallazgo se basa en la igualdad de ambas configuraciones disponibles, sin imprimir secretos.

No se ejecutó DELETE, COMMIT de reinicio, borrado de archivos, migración ni despliegue. No se hicieron llamadas de generación IA. Se requiere resolver con la persona usuaria si autoriza específicamente borrar esta cuenta QA en la base compartida (visible también desde Producción), o si exige aislar primero un backend exclusivo de Preview. Esta aclaración surge de una consecuencia nueva, no de falta de autorización para borrar la cuenta QA.

Inventario y captura privados en `.local/reset-open-account-20261011/`; contienen solo recuentos y evidencia de perfil, sin credenciales. La lectura directa de `/api/auth/session` como navegación de IAB fue bloqueada por el navegador; no se extrajeron cookies ni tokens. Se contrastó el perfil y el recuento del aula con la consulta administrativa remota.

## Reinicio ejecutado con alcance aprobado

El propietario aclaró que no hay usuarios ni datos reales y autorizó explícitamente reutilizar la base compartida, reiniciar las 352 filas identificadas y conservar credenciales, configuración global y otras cuentas. Esto permite el reinicio de esa identidad compartida; sigue excluyendo cualquier publicación del código en Production.

Se releyeron esquema, FKs y triggers remotos: 82 tablas base, 65 ámbitos de cuenta, sin tablas nuevas sin clasificar. Respaldo privado de las 352 filas, sin Auth ni credenciales. Eliminación por IDs congelados y orden de dependencias, bajo transacción y locks. Guardas previas de identidad, contenido JSONB/recuento, Auth y seguridad. Solo dos triggers de inmutabilidad se suspenden dentro de esa transacción y se restauran antes de comprobar y confirmar. No se alteran RLS ni FKs.

Ensayo con rollback PASS. Ejecución `RESET_PASS`, exactamente 352 filas. Consulta independiente posterior: **0 filas propias**, **0 objetos Storage**, huella de Auth intacta, huella de RLS/políticas/triggers/constraints intacta y **81/81 tablas protegidas sin cambios**. El dispatcher se conserva mediante huella bajo lock del mismo ensayo/transacción, pues sus nonces expiran naturalmente. La sesión existente siguió disponible y la UI mostró «Configura tu aula», sin rellenar ningún campo.

Respaldo, restauración, SQL, recuentos y recibos en `.local/reset-open-account-20261011/`. La restauración es administrativa, no una papelera del producto; no reinsertar filas automáticamente cuando comience la nueva historia. No había archivos que respaldar ni borrar. Los dos errores del harness y sus correcciones validadas se registran en `ERRORS_AND_FIXES.md`.

## Reloj preparado en rama aislada

Rama `codex/ayni-qa-reloj-20261011`, basada en `dcc1b36` sobre producto `5bafbd8`. Sin migración, nueva base, cambio de RLS o configuración global. Variables exclusivas del nuevo despliegue Preview: `AYNI_QA_PREVIEW_CLOCK=1`, `AYNI_QA_TEACHER_ID` para la identidad autorizada y flag de presentación `NEXT_PUBLIC_AYNI_QA_CLOCK=1`.

Control plegable antes del aula, visible únicamente tras autorización de servidor. Inicio **16 de febrero de 2026, 08:00, America/Lima**. Permite fechas válidas de 2026 y hora 00:00–23:59. PUT exige sesión docente/ID permitido y Origin autorizado. Cookie firmada HTTP-only/Secure por host; no se guarda información de alumnos en el navegador ni se crea un registro para el reloj. Una modificación explícita protege trabajo pendiente y recarga tras respuesta confirmada; navegar o recargar conserva la fecha de ese host. Un nuevo host de Preview puede requerir nueva sesión y empieza con la fecha inicial.

El contexto de tiempo pedagógico se limita a cada petición. Hoy, asistencia, calendario, restricciones de pasado/futuro, revisión anual/de período, cobertura y capturas de observación lo usan. La interfaz de diagnóstico usa esa misma fecha. Preparaciones durables conservan el reloj del origen y solo lo interpretan bajo los permisos de QA en Preview. No se modifica Date global ni SQL now(): seguridad, leases, facturación, timestamps técnicos y confirmaciones/cierres históricos conservan hora real. No se refecha lo ya guardado ni se infiere ejecución por adelantar el calendario.

Rollback del código: volver a la Preview `5bafbd8` o retirar los flags del nuevo despliegue. El entorno Production ignora el mecanismo incluso con flag/cookie copiados; otra cuenta o un administrador no puede habilitarlo desde la UI. La reversión de la Preview no restaura las filas borradas.

## Validación de esta preparación

- Typecheck final PASS. Lint de fuente completo PASS, excluyendo `.local`, `.next` y `dist`: el primer lint incluyó caches/fixtures privados de QA y falló por código generado; también detectó un setState síncrono en el efecto del control nuevo, corregido moviendo la limpieza al evento de reintento. No se modificaron reglas de lint.
- Builds Next/webpack y Vinext PASS. Vinext conserva avisos de dependencias PGlite/eval y tamaño de chunks; no se declaran eliminados.
- 33 regresiones focales PASS (calendario, diagnóstico, evaluación, preparación y estadísticas).
- Suite amplia: 790 casos, 789 PASS y 1 fallo de expectativa del fixture nuevo (se esperaba un campo observed_on en el POST ordinario, cuyo contrato devuelve occurred_at). Se corrigió la expectativa al contrato real y se validó captura con timestamp simulado y recuperación por GET. Reejecución final de Auth/reloj: **7/7 PASS, 0 SKIP**. No se reejecutó toda la suite después de corregir únicamente el fixture.
- Prueba HTTP real en PGlite nueva: reloj antes de configurar aula, Origin ausente/ajeno rechazado, fecha inválida rechazada, cookie recuperable, dashboard con fecha/hora simuladas, observación ficticia guardada el 18/12 a las 10:30 Lima y recuperada por GET. La instancia sin habilitación devuelve 404; solicitudes sin sesión conservan 401. Cero registros remotos creados por estas pruebas.
- Unidad: autorización por entorno/rol/identidad, firma y manipulación de cookie, año/fechas inválidas, medianoche de Lima, concurrencia sin contaminación entre peticiones, tiempo real de seguridad y reloj de preparación durable.
- Control real en fixture de navegador aislado: inicio 16/02 08:00, aplicar 16/03 12:21 y recargar conserva el reloj y fecha del formulario. Observación del ciclo aplicar→pantalla actualizada: 296 ms en el harness local con transporte ficticio, no un SLA remoto ni tiempo de guardar observaciones. Guarda de nota pendiente conserva texto y fecha al cancelar la salida. Escritorio y 390×844 inspeccionados, sin desbordamiento móvil (390/390). Detector Impeccable sin hallazgos; revisión React de los componentes modificados. Capturas privadas `clock-desktop.png` / `clock-mobile.png`.

Esta validación prepara el mecanismo. No acredita el recorrido anual humano, calidad de IA, documentos reales, micrófono/cámara o tiempos remotos de guardar observaciones. No se realizaron generaciones IA para preparar el reloj.

## Estado de publicación comprobado antes de la nueva Preview

Consulta actual por CLI aislada de Vercel (el conector devolvió 403, sin cambiar a otra cuenta): proyecto `ayni4/ayni-aula-staging` / `prj_3GOhE5KykLKbhuULD5rAeXpfbEko`, equipo `team_NBNhb7GhppqLvEnxRxrVk9kl`. No hay Git integration vinculada.

- Preview solicitada: `dpl_JEKHFdGe8mRzTH3744vfwccMct69`, READY, SHA exacto `5bafbd802ff892f14280fc9181a77dce900bbf0f`.
- Production: `dpl_EgekhWXwVjaM9iCcRc8mpJn2Eoc4`, SHA `ea206bf179841f6a85f43dbec95c391a47b12674`.

**La versión mejorada sigue exclusivamente en Preview.** La nueva Preview del reloj tendrá su propio recibo posterior en `.local/reset-open-account-20261011/`, fuera del commit para que este permanezca identificable y limpio. Comprobar allí READY, SHA, smoke y conservación del destino Production antes de presentarla como publicada. No crear el aula ni avanzar a la siguiente pantalla al abrirla.
