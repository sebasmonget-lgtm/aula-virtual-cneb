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

## Preview publicada y punto de espera

Nueva Preview: https://ayni-aula-staging-f9yzgr1u6-ayni4.vercel.app/ — `dpl_4gGromARSqVsffsYSEEK8tCKzeg9`, READY, target Preview, commit `d24b5357929daaf472bf35b64099243ea8bd747e`, rama `codex/ayni-qa-reloj-20261011`. Se desplegó desde árbol limpio, con flags exclusivos del despliegue. Recibos privados confirman proyecto/equipo esperados y Production sin cambio: `dpl_EgekhWXwVjaM9iCcRc8mpJn2Eoc4` / `ea206bf179841f6a85f43dbec95c391a47b12674`. No se promovió la versión mejorada ni el reloj a Production.

Smoke de lectura: ingreso visible en IAB; `/api/auth/config` 200 con modo Supabase (0,768 s); `/api/qa/clock` sin sesión Ayni devuelve 401 (0,578 s). Las solicitudes usan autenticación existente de Vercel para atravesar su protección, sin modificar permisos. El primer fetch público siguió el redireccionamiento SSO a HTML 200; se descartó como evidencia de API. Estos tiempos aislados no miden ingreso, guardado de observaciones ni rendimiento anual.

La sesión permanecía abierta en el host anterior tras el reinicio, pero el nuevo host muestra «Bienvenida a Ayni» con DNI y contraseña vacíos. Queda visible en el Side Panel, esperando ingreso manual con la cuenta QA conservada. No se introdujeron credenciales, completaron formularios ni crearon registros. El reloj está implementado y validado localmente con inicio 16/02/2026 08:00 Lima; **su comprobación autenticada en la Preview nueva está pendiente**. Captura privada `preview-login.png`, recibos `deployment-receipt.json`, `project-receipt.json` y `preview-smoke.json`.

Siguiente acción bajo control del propietario: iniciar sesión y verificar el reloj antes de configurar el aula. No avanzar al recorrido sin indicación expresa.

## Comprobación autenticada de la pantalla inicial

Observación posterior del Side Panel, sin introducir credenciales ni interactuar con formularios: sesión docente abierta en la nueva Preview; control autorizado visible «QA · 16 de febrero de 2026 · 08:00 · Lima». Su visibilidad confirma el permiso de servidor para la identidad QA específica. Se resuelve el pendiente de comprobación autenticada del reloj inicial.

Pantalla «Configura tu aula»: Institución, Docente y Sección vacíos; edad sin elegir; año 2026; botón «Guardar aula y añadir niños» deshabilitado. La docente debe registrar sus datos básicos y elegir 5 años para este recorrido. No se rellenaron campos, cambió el reloj, guardó el aula ni comprobó ningún botón mediante clic. Sin medición de carga instrumentada. Evidencia privada `preview-qa-initial.png`.

Estado: esperando opinión de la persona usuaria e indicación «Siguiente» antes de actuar. Sin propuesta de diseño implementada.

## UX-QA-01 — Decisión final de diseño para «Configura tu aula»

**Estado: diseño aprobado; implementación autorizada posteriormente y realizada en la rama QA actual.** Pantalla: «Configura tu aula». La instrucción posterior sustituye la postergación inicial y autoriza publicar únicamente Preview. Esperar revisión humana antes de avanzar al registro de niños.

Problema señalado: los datos institucionales ocultos en paneles plegables pueden quedar sin completar porque muchas profesoras no volverán a buscarlos, aunque después los necesiten para personalizar sus documentos Word. Objetivo: agrupar claramente la información que se registra una sola vez, manteniendo un formulario sencillo.

Organización aprobada, con todos los campos visibles y claramente ordenados:

1. Mostrar desde el inicio «Datos de tu colegio»: institución, UGEL, distrito, código modular, director(a) y logo.
2. Mostrar debajo «Datos de tu aula»: nombre de la profesora, sección, edad y año escolar.
Los datos no indispensables pueden seguir siendo opcionales. Explicar que los datos institucionales se utilizarán para personalizar los documentos; recomendar el logo y permitir continuar sin él. Mantener accesible la edición posterior de cualquier dato.

Simplificación aprobada:

1. No mostrar el calendario MINEDU ni el apartado para modificar sus fechas durante la configuración inicial. Aplicar automáticamente el calendario correspondiente al año escolar seleccionado.
2. No mostrar las opciones de castellano como segunda lengua ni educación religiosa en esta pantalla.
3. Conservar internamente el calendario, su edición y las configuraciones curriculares especiales. Permitir configurarlas posteriormente desde un lugar apropiado cuando sean necesarias; ese lugar todavía no se ha definido.
4. Mantener un único botón principal: «Guardar aula y añadir niños».

Estos criterios sustituyen la propuesta anterior de calendario plegable y configuraciones curriculares secundarias dentro de la configuración inicial. Ocultar los controles iniciales no implica eliminar sus funcionalidades. El calendario automático es un requisito aprobado, no una validación de las fechas oficiales o de la cobertura de otros años.

Las dos imágenes adjuntas por la persona usuaria son referencias conceptuales de la agrupación y el texto de ayuda; no prueban una interfaz funcional ni autorizan copiar su apariencia. La segunda imagen omite el año escolar, pero la propuesta escrita sí lo incluye: conservarlo en «Datos de tu aula». No se ha acordado añadir campos obligatorios; el requisito explícito es permitir continuar sin logo.

Criterios de comprobación: dos secciones visibles y legibles en Side Panel, opcionalidad de los datos no indispensables, continuidad sin logo, aplicación automática del calendario del año seleccionado, ausencia de calendario y opciones curriculares en la configuración inicial, acceso posterior a esas funcionalidades y a la edición de datos, personalización de Word y único botón principal con el texto aprobado. El registro inicial fue solo documental; las comprobaciones posteriores se detallan abajo.

## Metodología vigente: implementar y revisar una pantalla cada vez

Por instrucción posterior del propietario: mostrar pantalla, revisar UX/UI y funcionamiento juntos, registrar decisiones, implementar solo lo aprobado para esa pantalla, validar, actualizar exclusivamente Preview, abrir el resultado en Side Panel y esperar aprobación antes de pasar a la siguiente. Medir esperas perceptibles y corregir las innecesarias. No rediseñar pantallas adicionales, modificar IA o backend sin necesidad ni crear registros remotos durante esta implementación.

Primera implementación autorizada: UX-QA-01 en `codex/ayni-qa-reloj-20261011`. El propietario autorizó adicionalmente un panel plegable mínimo «Configuración del aula» en la página de configuración existente, con edad, año, fechas y opciones curriculares, sin rediseñar el resto.

## UX-QA-01: implementación y comprobaciones locales

Se reutilizan campos, carga privada/generador de logo, botón y contrato de guardado existentes. Colegio y aula son secciones visibles; los datos complementarios y el logo siguen opcionales. Calendario y opciones curriculares no aparecen en el alta inicial. Las fechas oficiales se derivan del año seleccionado; los flags iniciales conservan el valor false existente. El año inicial respeta el reloj QA. Sin nuevas esperas artificiales ni generación IA.

Límite existente hecho explícito: el único calendario oficial versionado disponible es 2026. Otro año muestra aviso y bloquea el alta; no se inventan fechas ni se reutilizan las de 2026 bajo otro año. La creación envía 02/03/2026–31/12/2026, incluidas semanas de gestión.

Panel posterior autorizado: carga solo al abrirlo, permite recuperar y guardar opciones/edad/año/fechas mediante servidor autenticado, filtro de docente y propietario, transacción y comparación del estado previo para rechazar conflictos. No modifica RLS, migraciones, credenciales, datos históricos ni IA. Cambios estructurales se rechazan cuando existen niños, planificación, agenda, jobs o un año compartido con otra aula. Las fechas deben contener los bloques existentes; los ajustes de días siguen en Calendario. Las opciones curriculares permanecen editables. El perfil institucional y logo conservan su edición existente.

Prueba de navegador sobre HTTP real/PGlite local independiente: alta ficticia de 5 años sin logo ni datos opcionales, consulta posterior conserva institución/docente/sección y fechas automáticas; cero niños creados. Clic→confirmación local: **397 ms**. Panel posterior: cambiar Educación religiosa, guardar (**288 ms**) y recargar conserva selección. Estos tiempos incluyen el control de navegador y son locales, no SLA ni mediciones remotas. No se ejecuta el registro de niños en Preview.

Escritorio 1366×900 y móvil 390×844 inspeccionados; móvil sin desbordamiento (390/390). Datos, logo y botón accesibles sin desplegar paneles. Detector Impeccable sin hallazgos; revisión de componentes React conserva estado derivado, carga diferida, errores, guarda de salida y permisos de servidor. Capturas y pruebas privadas en `.local/setup-screen-qa/`. Regresiones focales: 12 PASS/0 SKIP (Auth, calendario, logo, fechas); servicio nuevo: 1 PASS/0 SKIP (ownership, conflicto, fechas inválidas, año no disponible, protección con niño y flags recuperables).

Validaciones: typecheck PASS antes de compilación; lint de fuente completo PASS excluyendo archivos privados/generados; Vinext PASS con avisos conocidos PGlite/eval y chunks; Next/webpack PASS inicial y en reintento final con caché apartada. Un typecheck simultáneo al segundo build leyó archivos de tipos en regeneración y falló; se reejecuta después de finalizar Next. El segundo build falló en WasmHash de la caché Webpack, sin error de fuente; el reintento aislado pasa. Causa concreta del fallo interno no demostrada. No declarar PASS para esas ejecuciones fallidas. Recibos y logs privados en `.local/setup-screen-qa/`; el recibo final de typecheck y Preview acompaña el despliegue.

Pendiente aceptación humana de esta pantalla, prueba remota de guardar por indicación del propietario y revisión de Word; las comprobaciones locales no acreditan esas etapas. Rollback: servir Preview anterior `d24b535` o revertir este cambio; no requiere rollback de datos remotos porque esta implementación no los escribe.

## UX-QA-01: publicación para revisión

Commit de implementación `ea70731df9889f23da3f81bce4b2c046a506953c`, árbol limpio al publicar. Nueva Preview https://ayni-aula-staging-7q5bnhrz5-ayni4.vercel.app/ — `dpl_A5K2xzq52Lh7MRQZVtCvHYWqrzmn`, READY, target Preview, SHA exacto verificado; build cloud Next PASS (~1 minuto según log). Flags del reloj exclusivos del despliegue. Typecheck final después de Next PASS. Recibos privados en `.local/setup-screen-qa/`.

Smoke remoto de lectura PASS: Auth/config 200, reloj y ajustes sin sesión Ayni 401, health 200. Tiempos aislados 0,485 s / 0,468 s / 0,422 s / 2,745 s respectivamente; no equivalen a tiempo de guardar ni a carga completa de la pantalla. Consulta de proyecto posterior al despliegue confirma Production intacta: `dpl_EgekhWXwVjaM9iCcRc8mpJn2Eoc4` / `ea206bf`.

La nueva Preview quedó abierta visible en Side Panel. El host nuevo muestra ingreso con campos vacíos; se solicitó ingreso manual con la cuenta QA, sin introducir credenciales ni copiar cookies. No se guardó el aula remota ni se abrió registro de niños. Pendiente comprobación visual autenticada en este host y aprobación del propietario para continuar.
