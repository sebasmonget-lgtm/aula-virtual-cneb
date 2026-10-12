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

## UX-QA-02 — Logo e interacción de controles

El propietario aprueba implementar en «Configura tu aula» un botón reconocible «Seleccionar logo», reemplazando el selector nativo visible en inglés. Mantener estilo, carga privada, vista previa, límites existentes y posibilidad de continuar sin logo. Antes de este ajuste, observación de solo lectura de la Preview `7q5bnhrz5` confirmó sesión QA abierta, reloj 16/02/2026 08:00 Lima y formulario sin guardar.

Criterio general aprobado para revisar pantalla por pantalla durante el QA:

- Botones con borde, fondo y estados visuales claros.
- Cursor de mano en controles clicables disponibles; los campos de texto conservan el cursor de edición.
- Respuesta sutil al pasar el mouse y al presionar.
- Foco visible al navegar por teclado.
- Controles deshabilitados claramente diferenciados y sin aparentar disponibilidad.
- Aplicar también a controles plegables, enlaces de acción y otros elementos interactivos.
- Conservar el estilo actual y evitar efectos exagerados.

Alcance de esta implementación: configuración inicial y controles que la acompañan. Las reglas CSS solo se activan si existe el marcador de esta pantalla; no cambian otras pantallas. El criterio general queda pendiente de revisión e implementación autorizada para cada pantalla posterior. No modificar backend, IA, credenciales, migraciones ni datos remotos.

Implementación: botón secundario «Seleccionar logo» accesible por teclado, input nativo oculto, nombre del archivo anunciado como estado y botón «Quitar logo». Conserva generador de iniciales, formatos PNG/JPG/WebP y máximo 2 MB. El único botón principal continúa siendo «Guardar aula y añadir niños». Foco turquesa, cursor, borde, hover y respuesta de pulsación discretos; controles no disponibles atenuados con cursor de prohibición. Transiciones desactivadas cuando se solicita movimiento reducido.

Prueba funcional local con HTTP/PGlite independiente: Enter sobre «Seleccionar logo» abre el selector, selección muestra archivo y vista previa; quitar y volver a seleccionar el mismo archivo funciona; generación de iniciales y colores se conservan. Guardado con logo: **506 ms** clic→confirmación local, recuperación mediante GET confirma el logo privado y cero niños. Sin escrituras remotas ni llamadas IA. Foco por Tab/Shift+Tab, cursor pointer disponible, not-allowed y opacidad .45 deshabilitado comprobados mediante navegador. Hover y active definidos e inspeccionados en CSS; su percepción con mouse queda para revisión humana en Preview.

Escritorio 1366×900 y móvil 390×844 inspeccionados, sin desbordamiento horizontal. Capturas y recibos privados en `.local/setup-interactions-qa/`. Typecheck inicial y posterior a Next, lint de fuente, Vinext y Next/webpack final PASS; 15 pruebas focales PASS/0 SKIP (logo, fechas y preparación del piloto). Next falló inicialmente en WasmHash y pasó tras apartar su caché: no atribuir el fallo al componente ni declarar PASS para la ejecución fallida. Detector Impeccable: cero anti-patrones; aviso sobre un fondo de cuadrícula preexistente fuera de alcance. Rollback: revertir este ajuste o utilizar Preview anterior `ea70731`; sin cambios de datos que revertir. No avanzar al registro de niños.

### UX-QA-02: publicación

Commit `60926019dfbfd2b764d7087d973b485b8019c9ec`, árbol limpio al publicar en rama QA. Preview https://ayni-aula-staging-1xa69uk5b-ayni4.vercel.app/ — `dpl_A7oKhDwkoKVR8BA32aUTE1MMQURy`, READY, target Preview, equipo/proyecto y SHA exacto verificados. Build cloud Next PASS. Flags exclusivos del reloj QA conservados.

Smoke remoto de lectura PASS: Auth/config 200 (0,579 s), reloj QA 401 sin sesión Ayni (0,616 s), ajustes 401 sin sesión (0,461 s), health 200 (2,417 s). Tiempos aislados de API, no de carga de pantalla ni guardado. Consulta posterior confirma Production intacta `dpl_EgekhWXwVjaM9iCcRc8mpJn2Eoc4` / `ea206bf179841f6a85f43dbec95c391a47b12674`.

Preview abierta visible en Side Panel. El host nuevo pide ingreso manual QA; no se introducen credenciales ni transfieren cookies. Pendiente comprobación visual autenticada y aceptación humana. Capturas locales acreditan el ajuste; no equivalen a verificación autenticada remota. No guardar aula ni avanzar a registro de niños sin indicación del propietario.


## UX-QA-03 — Guardado lento y calendario oficial compartido

Decisión del propietario: corregir la espera aproximada de 40 s y los dos indicadores antes de continuar. Asociar automáticamente el año al crear la cuenta; calendario MINEDU precargado por año, compartido y de solo lectura. Conservar actividades, agenda, evidencias y evaluaciones por aula. Años futuros se incorporan solo con fuente oficial publicada. No avanzar al registro de niños ni desplegar Production.

Verificación remota de solo lectura: POST original de Preview devuelve 201; Celeste quedó creada una sola vez, cero niños, año 2026 y logo PNG conservado. La ruta anterior confirmaba el aula y luego esperaba dashboard completo; ensureSchoolCalendar hacía **305 INSERT secuenciales**, además de consultas del panel. No hay IA en este guardado. pg_stat_statements agregado: 1830 llamadas, 406,63 ms totales de ejecución SQL, media 0,22 ms y máximo 15,45 ms. Es un agregado de varias creaciones, no el desglose de la solicitud original. El reporte de 40 s no llevaba trazas por fase; Vercel exige un complemento de pago para métricas históricas ampliadas. No se compra ni se inventa un desglose retrospectivo. La medición local previa de 506 ms no representaba la latencia de Supabase remoto.

Cambio mínimo preparado: fuente compartida en las tablas actuales; migración aditiva 202610110001 / local 0074 permite versiones oficiales sin propietario y agrega setup_submission JSONB, separado del contexto pedagógico, para reintentos idempotentes. No se crean tablas, bases ni infraestructura adicional. Conserva todas las versiones propias, IDs referenciados y políticas de propiedad. RLS añade exclusivamente lectura autenticada de la base oficial; las escrituras directas continúan revocadas. La precarga añade una versión y 305 días mediante un único INSERT de conjunto, una sola vez. Leer un calendario o guardar un aula ya no crea días. Versiones históricas conservan precedencia y referencias.

Año asociado en app_metadata de Auth en el alta, junto con el rol validado por servidor; se provisiona school_years con fechas oficiales y se recupera en cuentas anteriores al abrir el alta. La fecha civil de Lima determina el año de cuenta, sin usar el reloj QA para seguridad. Si el calendario aún no está publicado, no se inventan límites ni filas. La pantalla recibe el año del servidor. Las fechas del alta y de los ajustes posteriores se validan en servidor; feriados/gestión/fines de semana no admiten el bypass anterior confirmOfficialException. Mi año recibe bloques oficiales no editables y conserva las incidencias del aula aparte; agenda, proyectos, Hoy y evaluaciones conservan sus registros.

Nuevo guardado: snapshot mínimo de un aula recién confirmada por COMMIT, sin esperar el panel completo. Un reintento devuelve el aula ya existente con datos actuales, nunca un snapshot vacío. Lock por docente y clave/fingerprint evitan duplicados y cambios de payload con la misma clave. Ante una respuesta perdida de COMMIT, el servidor consulta si el aula existe y conserva el logo vinculado; si no puede determinar el resultado, no elimina el archivo. Solo existe el indicador **«Guardando aula…»**; campos bloqueados mientras se envía, formulario conservado ante fallos, sin éxito anticipado.

Ensayo de migración remoto con rollback y aplicación final PASS: **84 tablas** protegidas, incluidas Auth y Storage, conservan sus recuentos y huellas de filas originales. Aplicación atómica registrada como 202610110001; consulta independiente confirma migración aplicada, 305 días compartidos, Celeste y logo original conservados. Las escrituras directas continúan denegadas. La base actual es exclusivamente de pruebas, según autorización explícita; la adición mantiene compatibilidad con el despliegue anterior de Production.

Pruebas: suite completa **778 PASS / 0 FAIL / 0 SKIP** tras corregir dos fixtures HTTP con límites editables antiguos y conservar la compatibilidad del servicio sin clave de reintento con el esquema histórico. Después se añadieron guardas para que Hoy y los conteos de proyectos prioricen feriados/gestión/fines de semana frente a excepciones antiguas, sin modificar ni eliminar esas filas: **42 pruebas focales PASS / 0 SKIP** sobre el código final. Aislamiento entre docentes, RLS, referencias históricas, reintentos, COMMIT incierto y rollback comprobados. Recibos privados en .local/setup-performance-qa/.

Prueba de navegador local con backend real PGlite y proxy de fallos: el primer POST confirma en servidor pero se devuelve 503 simulado. Aparece un único progreso; no muestra éxito y conserva todos los campos. Reintento con la misma clave: HTTP 200 en 159 ms, clic→frame 168 ms y preparación frontend <1 ms. La demora artificial de 1,5 s es exclusiva del proxy de prueba y no se incluye como rendimiento de producto. No se registra ningún niño.

Medición remota preparada: endpoint y panel diagnóstico exclusivos de docente QA, Preview, Origin válido y flags de prueba. Tres casos: reproducción del recorrido secuencial con logo, corregido con logo y corregido básico. Cada uno usa clones temporales de tablas en una transacción que termina obligatoriamente en rollback. El aula Celeste y su logo no se usan como datos ficticios ni se reemplazan. El propietario autorizó retirar **únicamente los dos logos ficticios** creados por esta prueba. El HTTP de este arnés incluye preparación de clones, rollback, comprobación del reintento y limpieza; la fase de guardado se informa por separado, sin confundirla con un alta ordinaria.

Pendientes de esta ronda: medir antes/después en Supabase/Storage reales, registrar fases y límites, publicar Preview con commit limpio, comprobar Production intacta y mostrar el resultado en Side Panel. Rollback de aplicación: Preview 6092601; la migración es aditiva y compatible, sin borrar datos ni restaurar calendarios privados. Desactivar los flags del arnés al cerrar la medición.

Validación previa al despliegue: typecheck posterior a Next, lint de fuente, Next/webpack y Vinext finales PASS. Detector de los componentes modificados sin hallazgos. La prueba funcional local confirma indicador único, formulario conservado y reintento confirmado por servidor. Sin más rediseños. Recibos finales: typecheck-release, lint-release, next-release, vinext-release, calendar-final-guards y full-final en .local/setup-performance-qa/.


### UX-QA-03: Preview de medición

Commit de producto 28bdde05cea93f659372478ebaaebcaefc2750ef, árbol limpio al publicar. Preview https://ayni-aula-staging-a5hfavnq9-ayni4.vercel.app/ — dpl_A2dX7oaWLWVU1jYqCZWLia5F6wwi READY, target Preview, SHA/equipo/proyecto verificados. Build cloud Next PASS. Smoke HTTP de lectura PASS: config 200, reloj/ajustes/diagnóstico sin sesión 401, health 200. Tiempos de la comprobación simultánea fría: 4,620 / 4,630 / 4,642 / 2,997 / 2,990 s; no son tiempos de guardar ni de la pantalla completa. Production sigue dpl_EgekhWXwVjaM9iCcRc8mpJn2Eoc4 / ea206bf179841f6a85f43dbec95c391a47b12674 según recibo independiente posterior.

Side Panel muestra el ingreso de esta nueva Preview. Se pide ingreso manual QA, sin introducir credenciales ni transferir cookies. La comparación remota requiere esa sesión; no declarar aún tiempos de guardado Supabase. Flags del diagnóstico habilitados exclusivamente en esta Preview para la medición autorizada y pendientes de desactivar en la entrega final. No se avanzó al registro de niños.

### UX-QA-03: medición remota y conservación

Navegador autenticado QA, reloj 16/02/2026 08:00 Lima, misma Preview/Supabase/Storage. Un solo clic al diagnóstico autorizado ejecutó tres escenarios. No se introdujeron datos en el aula Celeste ni se registraron niños.

| Fase medida | Anterior con logo | Corregido con logo | Corregido básico |
|---|---:|---:|---:|
| Guardado transaccional central | 2,146 s | 2,107 s | 1,364 s |
| Generar calendario | 36,229 s / 305 INSERT | 0 s / 0 INSERT | 0 s / 0 INSERT |
| Cargar dashboard completo | 1,686 s | No se requiere | No se requiere |
| Total central servidor | 40,061 s | 2,108 s | 1,364 s |
| Subida real a Storage, incluida en guardado | 0,466 s | 0,430 s | Sin logo |
| Normalizar logo, incluido en guardado | 17,44 ms | 18,19 ms | <1 ms |
| Consultas + espera de red central | 39,546 s / 334 consultas | 1,658 s / 14 consultas | 1,363 s / 12 consultas |
| Autenticación, fuera del núcleo | 184 ms | 226 ms | 167 ms |
| Adquirir conexión, fuera del núcleo | 707 ms | <1 ms | 682 ms |
| HTTP del arnés completo | 44,607 s | 6,514 s | 5,248 s |
| HTTP menos servidor del arnés | 248 ms | 240 ms | 277 ms |

El calendario representa aproximadamente 90,4 % del tiempo central anterior. El arnés HTTP incluye clones temporales, prueba de reintento, rollback y limpieza de Storage; no presentar sus 5,248/6,514 s como guardado normal. Las fases se superponen: SQL/red y logo están incluidos en guardado; no sumarlas dos veces. SQL/red mide la espera del cliente PostgreSQL, no exclusivamente CPU en Supabase. El núcleo usa SAVEPOINT/RELEASE dentro de una transacción externa para garantizar rollback; el flujo real COMMIT y la respuesta perdida se verificaron en las pruebas funcionales locales y de servicio.

Objetivo básico <2 s: conseguido para el núcleo remoto de guardado (1,364 s), sin acreditar aún un clic→pantalla normal <2 s. Auth, conexión fría y transporte pueden llevar una solicitud normal por encima de ese umbral; no se modifica el límite de conexiones ni su liberación rápida por una promesa no medida. Se elimina el cuello de botella real de 36 s sin alterar seguridad, región ni límites del pool. El frontend local tarda <1 ms en preparar y 168 ms clic→confirmación de reintento. Mantener la medición de esperas en el resto del QA.

Los tres informes confirman idempotencia, rollback y retirada de los dos únicos logos ficticios creados. Consulta independiente posterior: una sola aula QA activa, cero niños, logo original vinculado y cinco objetos Storage, como antes. Lecturas detalladas posteriores coinciden en 83 tablas; únicamente preparation_dispatch_receipts varía por nonces efímeros de dos minutos del programador preexistente. La huella global inicial/final NO coincide y no se declara tal comparación como PASS. Código existente de dispatch y la variación aislada entre lecturas explican ese registro técnico; no hay trabajos pendientes ni aumento de ai_usage_events. No se modifica ni se detiene ese proceso fuera de alcance. Recibos privados: remote-measurements.json, benchmark-before/after, fingerprint-detail-one/two y conservation-receipt. La comparación atómica de 84 tablas durante la migración sí fue PASS.

Fuente oficial, feriados y gestión, ausencia de inserciones al consultar, protección de ediciones, referencias históricas, planificación anual/proyectos y Hoy se validan con los casos funcionales de calendario. Los registros particulares siguen en sus tablas propias. Años sin fuente publicada permanecen explícitamente no disponibles. El recorrido manual completo hasta diciembre y documentos Word siguen pendientes de las pantallas posteriores; no declararlos validados por estas pruebas.

Se prepara entrega final de Preview con ambos flags de benchmark desactivados y reloj QA conservado. Revisión humana pendiente. No avanzar a niños.
