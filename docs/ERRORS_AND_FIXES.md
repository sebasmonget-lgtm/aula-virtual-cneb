# Errores y soluciones

## 2026-10-02 — Bloqueo de generación anual en Preview por ruta de compilación

**Síntoma registrado antes de corregir.** En el Preview de `b94cd6e`, Guardar y generar propuestas conserva la idea y la preparación QA, pero falla con `ENOENT` al abrir `/vercel/path0/skills/crear-plan-anual/references/criterios-cneb.md`; no se obtiene un plan vigente. Nota previa fuera del repositorio: `ayni-preview-annual-blocker-before-fix.md`.

**Causa raíz.** El cargador personalizado usa `new URL(..., import.meta.url)`, convertido por el bundle Next en una ubicación del servidor de compilación. Los recursos ya están incluidos por `outputFileTracingIncludes`; los cargadores anuales anteriores usan el directorio de ejecución.

**Corrección mínima y validación local.** Se resuelven las mismas dos referencias mediante `path.join(process.cwd(), ...)`, conservando archivos, textos, validación y reglas. La regresión ejecuta el módulo desde un directorio separado con referencias propias. 13 pruebas focales de cargador, personalización y preferencias PASS; typecheck, lint y build Next con webpack PASS. El trazado de la ruta API contiene ambas referencias y sus archivos existen. La validación remota posterior debe hacerse desde el commit correctivo; el commit original no se declara apto para producción. Reversión: revertir este cambio de resolución, sin alterar datos QA ni históricos.

**Prevención.** Comprobar generación real desde el paquete desplegado y la lectura desde un directorio de ejecución distinto; build READY y carga del shell no garantizan que los recursos dinámicos sean legibles.

## 2026-10-01 — Publicación desde una rama que omitía correcciones aprobadas

**Síntoma.** Después de publicar el mapa anual reaparecieron la ausencia de sugerencias de Jev y la sustitución de nombres al transcribir observaciones espontáneas.

**Causa raíz.** La rama del mapa partió de `af522a5` y no incorporó `2d251bb`, `f78b58b`, `e082f94` y `f8b2653`, existentes en otra rama/worktree. Faltaban la normalización LF del hash del clasificador en Windows y el uso de transcripción literal para archivos adjuntos espontáneos.

**Solución validada.** Merge de ambas historias en `codex/annual-year-map`, conservando las trazas de personalización, el mapa y el acceso a actividades concretas. La prueba de continuidad antigua se ajustó a la entrevista de nueve pasos aprobada. Pasaron 55 pruebas focales, typecheck, lint y build. En navegador local, una observación ficticia obtuvo una sugerencia real de Jev para cantidad, quedó pendiente de decisión docente y conservó su nombre. La prueba de audio confirma RAW exacto sin reescritura ni reemplazo por marcadores. Además, el alta empieza sin edad: con otros datos completos sigue bloqueada y solo permite avanzar tras elegir; una prueba de servidor cubre ausencia, edades inválidas y 3/4/5.

**Prevención.** Usar la rama consolidada en el checkout principal y verificar ancestros de los cambios aprobados antes de desplegar. Los worktrees anteriores son referencias históricas; no continuar producto desde sus bases. Mantener los experimentos no publicados fuera del commit. Reversión de código mediante el despliegue anterior; no hay migración ni modificación de datos remotos.

## 2026-10-01 — Reincorporación fallaba aunque quedaba un tramo lectivo libre

**Síntoma.** Al retirar una propuesta de mitad de año, «Incorporar al final» fallaba si el último bimestre estaba lleno, pese a quedar libre el tramo de la propuesta retirada.

**Causa raíz.** La bandeja intentaba agregar siempre la propuesta después de la última fila y le asignaba el bimestre de esa fila.

**Solución validada.** «Incorporar al año» prueba posiciones del bimestre original y acepta la primera compatible con el calendario. El recorrido local volvió a retirar y reincorporar una propuesta, guardó, recargó y confirmó la nueva versión. La prueba focal de inserción, typecheck, lint y build pasaron.

**Prevención.** La prueba de reincorporación cubre el caso de último bimestre lleno con un tramo anterior libre.

## 2026-10-01 — Una observación guiada devolvía «Recurso no encontrado»

**Síntoma.** Al guardar una nota desde una experiencia guiada del diagnóstico, la API respondía 404 aunque la experiencia aparecía en la interfaz.

**Causa raíz.** La autorización genérica interpretaba `experienceId` como UUID de `learning_experiences`. Las guías diagnósticas usan IDs editoriales del catálogo versionado. El rechazo ocurría antes de la validación específica de la guía.

**Solución validada.** Solo en `/api/diagnostics/experience-observations` se omite esa interpretación genérica. La autorización sigue comprobando el alumno y el servicio verifica que experiencia y aspecto sean aplicables al aula. Una prueba cubre el ID editorial válido, un alumno ajeno y el rechazo del mismo ID en rutas de proyectos.

**Prevención.** Distinguir los identificadores editoriales del catálogo de los UUID de recursos persistidos en el límite HTTP.

## 2026-10-01 — El clasificador V2.4 no cargaba en un checkout Windows

**Síntoma.** La prueba del adaptador V2.4 fallaba con «V2.4 no coincide con la versión congelada» antes de llamar a Jev.

**Causa raíz.** Git había convertido `current-v2.mjs` a CRLF en Windows. El SHA-256 esperado corresponde a los bytes LF del archivo versionado, sin cambio semántico del código.

**Solución validada.** La verificación normaliza solo los finales de línea del código fuente a LF antes de calcular su hash; el prompt sigue verificándose en bytes. La prueba del adaptador volvió a pasar. El modelo, prompt y umbrales permanecen congelados.

**Prevención.** Verificar los hashes de archivos de texto versionados sobre su representación LF canónica o fijar `eol=lf` en `.gitattributes` para los siguientes archivos congelados.

## 2026-10-01 — Calendario perdía la actividad y Hoy confundía observación cotidiana con diagnóstico

**Síntoma.** «Ver actividad» abría la portada de Planificar; «Observar» podía abrir el diagnóstico inicial aunque la intención fuera registrar una observación cotidiana.

**Causa raíz.** Calendario enviaba una función sin argumentos y descartaba el ID de actividad y experiencia. Hoy usaba Diagnóstico como destino alternativo para toda actividad sin criterio.

**Solución validada.** El ID y la experiencia viajan hasta la ficha exacta; talleres se muestran en una ficha propia del Calendario. «Observar» abre el diálogo cotidiano existente cuando no hay actividad con criterio. Se verificaron en navegador local los dos tipos de actividad pasada y el diálogo cotidiano; faltan escenarios de hoy y futuro en un aula con esos datos. Tests focales, typecheck, lint y build pasaron.

**Prevención.** Las pruebas de navegación deben conservar el ID seleccionado y cubrir experiencias de proyecto, unidad y taller; el destino de observación se decide por capacidad disponible, no por el nombre del botón.

## 2026-10-01 — Tres alumnos indistinguibles al registrar el diagnóstico

**Síntoma.** En el aula QA «Auditoría 5 años», las tarjetas de los tres alumnos, las entrevistas y la ficha de observación mostraban solo «Prueba». Una docente no podía identificar con seguridad a Prueba Uno, Dos o Tres antes de guardar evidencia.

**Causa raíz.** Las consultas de los espacios diagnósticos devolvían solo `preferred_name` o `first_name` como `name`, aunque el apellido estaba guardado. La interfaz presentaba fielmente ese dato incompleto.

**Solución validada.** Las lecturas autorizadas de experiencias y revisión diagnóstica componen el nombre visible con nombre preferido (o nombre) y apellido. No se modifican registros ni autorizaciones. Pasaron diez pruebas de ambos servicios, typecheck, lint, build Vinext y build Next.js. El commit `4c67e25` se publicó en el despliegue `dpl_4tbGw2GVBdmVwaPBKJu2ZFeMxcPP`; `/health` y `/api/auth/config` respondieron 200, y `/api/diagnostics` sin sesión respondió 401 esperado. En la sesión docente, las entrevistas y la revisión diagnóstica muestran «Prueba Uno», «Prueba Dos» y «Prueba Tres».

**Prevención.** Las pantallas donde se atribuyen entrevistas, observaciones o valoraciones deben distinguir alumnos con el mismo nombre de pila antes de habilitar el guardado.

## 2026-09-30 — Diagnóstico no cargaba con el esquema PostgreSQL de staging

**Síntoma.** La interfaz muestra «No se pudo cargar el diagnóstico local» y bloquea el recorrido natural hacia el plan anual. Los eventos de Vercel registran `GET /api/diagnostics` con estado 500 bajo la sesión docente (por ejemplo, request ID `18b34d7e-2dca-4977-adc3-35c86919dc44`); las rutas vecinas de diagnóstico y planificación devolvieron 200. El cliente reemplaza el fallo por el mismo texto genérico.

**Causa confirmada.** `observation_references.performance_ids` es `jsonb` en las migraciones locales y `uuid[]` en las migraciones de Supabase. Dos consultas del API llamaban `jsonb_array_elements_text` y `jsonb_array_length` directamente sobre la columna. Una prueba con las migraciones Supabase reproduce el rechazo de la consulta anterior por tipo incompatible. La misma incompatibilidad afectaba la validación del POST diagnóstico heredado. Los logs de la función solo emitían un evento sanitizado, sin excepción SQL; el smoke autenticado posterior confirmó la recuperación de la ruta que devolvía 500.

**Solución validada.** Ambas consultas convierten la columna con `to_jsonb` antes de usar las funciones JSONB. La prueba de paridad ejecuta esas expresiones contra ambos esquemas. Pasaron la prueba de paridad, nueve pruebas funcionales de Auth/diagnóstico, typecheck, lint, build Vinext y build Next.js. No hay migración ni cambio de datos. El commit `7118001` se desplegó en el proyecto staging de Vercel (`dpl_A9UzhvmTLv5gjVPUDLkyoHBN6zb4`) y se asignó a `project-0w0pq.vercel.app`. El smoke sin sesión dio 200 para `/health` y `/api/auth/config`, y 401 esperado para `/api/diagnostics`; con la sesión docente, los logs registraron `GET /api/diagnostics` 200 y la interfaz abrió «Observar», una experiencia guiada y su relación curricular con tres competencias.

**Prevención.** La paridad de esquema debe incluir tipos de columnas y consultas críticas, además de nombres de tablas y columnas. El mensaje cliente debe conservar un código seguro o `request_id` para distinguir autenticación de fallos internos en futuras incidencias.

## 2026-09-30 — Alta inicial completada pero acceso administrativo pendiente

**Síntoma.** Supabase Auth muestra una cuenta «Sebastian» confirmada y sin ingresos previos, pero Ayni responde «Revisa tu DNI y contraseña». El primer intento usó el DNI ficticio preparado por QA, distinto del DNI que el propietario introdujo durante el alta. Un intento posterior con el DNI usado en el alta también falló; no se ha determinado todavía si la contraseña introducida al crear la cuenta coincide con la del ingreso.

**Causa confirmada y tratamiento.** El formulario de alta regresaba al inicio sin mensaje de éxito, lo que ocultaba la diferencia entre la clave de configuración, el DNI del alta y la contraseña de ingreso. Se añadió un mensaje explícito tras crear la cuenta y una recuperación inicial con clave privada, limitada al único administrador que nunca ha ingresado. Permite sustituir DNI y contraseña sin duplicar cuentas. La recuperación real y el primer ingreso en staging aún deben verificarse; después se retira `AYNI_ADMIN_SETUP_KEY` y se redespliega.

**Prevención.** Confirmar el DNI elegido y el mensaje de alta antes de probar el ingreso. Probar el caso completo en staging y no declarar el acceso resuelto solo porque Auth contiene un usuario confirmado.

## 2026-09-30 — Vercel CLI incluía archivos privados locales en el manifest

**Síntoma.** `vercel deploy --dry --json` del staging nuevo incluyó más de siete mil archivos de `.local/`, entre ellos `.local/vercel-ayni-staging/auth.json`, aunque Git los ignoraba. No se ejecutó el despliegue con ese manifest.

**Causa raíz.** La CLI no usó la exclusión de `.local/` de `.gitignore` al construir el paquete de archivos. La lista de exclusión propia de Vercel no cubría esa carpeta personalizada.

**Solución validada.** Se añadió `.vercelignore` con `.local/`, secretos y artefactos de ejecución excluidos. Un dry run posterior detectó todavía la entrada de directorio vacía `.local` (sin archivos); se excluyó también su nombre exacto. El manifest final contiene 1631 archivos y cero rutas `.env*`, `.local`, `.local/`, `.codex/`, `node_modules/`, `.next/` o `auth.json`; conserva los archivos de aplicación revisados. No se imprimió ni subió el contenido del archivo de autenticación.

**Prevención.** Antes de cada despliegue CLI desde este checkout, ejecutar un dry run y rechazar cualquier manifest que incluya secretos o carpetas locales. Conservar `.vercelignore` al cambiar el proceso de publicación.

## 2026-09-30 — Vercel no reconocía la CA de PostgreSQL de Supabase

**Síntoma.** El primer despliegue de `ayni4/ayni-aula-staging` compiló y quedó `READY`, pero `/health` devolvió HTTP 500. Los logs de la Function mostraron `SELF_SIGNED_CERT_IN_CHAIN` al conectar con PostgreSQL.

**Causa raíz.** El adaptador exigía verificar TLS, pero Node en Vercel no tenía la CA raíz de Supabase entre sus autoridades de confianza. El build no abre una conexión y no detectó el problema.

**Solución validada.** Se incorporó la CA pública descargada desde Database Settings del proyecto nuevo, con huella SHA-256 comprobada, y se aplica solo a hosts de Supabase con `rejectUnauthorized: true`. Una conexión de prueba al pooler con contraseña deliberadamente incorrecta llegó al rechazo PostgreSQL `28P01`, confirmando que superó la verificación TLS. La prueba del adaptador, typecheck, lint y build pasaron. El despliegue corregido `dpl_GfYuLZak6ocGnqH63zGVQdaPAs5a` devolvió 200 en `/health` (`engine=postgres`), `/` y `/api/auth/config`; `/api/auth/session` sin credenciales devolvió 401. Los logs de esas peticiones no mostraron errores.

**Prevención.** Probar `/health` en la Function desplegada y revisar logs antes de anunciar un despliegue funcional. Renovar la CA antes de su vencimiento de 2031, sin desactivar la verificación del certificado ni registrar credenciales.

## 2026-09-30 — Clave nueva de Supabase enviada como JWT

**Síntoma.** Al preparar staging se observó que los adaptadores de Storage y la herramienta administrativa enviaban la nueva clave `sb_secret_…` tanto en `apikey` como en `Authorization: Bearer`. Supabase documenta que esa cabecera Bearer se interpreta como JWT y puede devolver `Invalid JWT`.

**Causa raíz.** El código se escribió para la clave `service_role` antigua, que sí es un JWT, antes de seleccionar las claves nuevas del proyecto Ayni.

**Solución validada.** Un helper común envía las claves `sb_secret_…` solo en `apikey` y conserva Bearer para JWT antiguos. Las pruebas HTTP simuladas de Storage y Auth admin verifican ambas rutas; la verificación con la instancia real sigue pendiente del despliegue.

**Prevención.** Al incorporar una clave nueva, probar las cabeceras y una operación real de Storage y Auth admin en staging. Nunca imprimir ni guardar claves en los tests o el repositorio.

## 2026-09-30 — Rutas de plantillas en el bundle de Next

**Síntoma.** La página de Next compilaba, pero `/health` y `/api/auth/config` respondieron 500 en una prueba `next start` con identidad local.

**Causa y alcance.** Primero, rutas relativas a `import.meta.url` de módulos empaquetados ya no apuntaban al árbol fuente. Tras corregirlas, el servidor de producción rechazó deliberadamente `AYNI_AUTH_MODE=local`; esa protección no se desactivó. El segundo 500 no demuestra un fallo de staging, que aún carece de la conexión PostgreSQL y Auth real para probarlo.

**Corrección comprobada.** Recursos curriculares, plantillas, guías e inventario se resuelven desde la raíz y se incluyen en el trace de Next. El build Next, typecheck, lint y las pruebas locales de documentos, plan anual y adaptadores pasaron. La invocación directa del puente con identidad local en `NODE_ENV=test` devolvió 200 en `/health`, `/api/auth/config` y `/api/auth/session`; todavía falta repetir en la Function real con PostgreSQL/Auth y descargar un Word.

**Prevención.** Ejecutar smoke en el runtime final con sus variables reales; una compilación exitosa ni una prueba local demuestran que los archivos empaquetados o la autenticación de staging funcionan.

## 2026-09-29 — Fechas discordantes en el diagnóstico de QA

**Síntoma.** El Word mostraba «Período de recojo: 16/03/2026–27/03/2026» y, más adelante, «Registros revisados: 28/09/2026». La diferencia no estaba señalada.

**Causa raíz.** En la copia local de QA, el período previsto del diagnóstico quedó en marzo, mientras que las observaciones incluidas en el snapshot confirmado tienen fecha civil 28/09/2026. Es una discrepancia de datos de esa copia; el exportador anterior presentaba ambos rangos sin distinguir su significado.

**Solución validada.** El Word separa «Período previsto de recojo» de «Registros revisados» y muestra una advertencia explícita cuando alguna observación cae fuera del período. No se cambiaron fechas ni observaciones. La prueba cubre un registro dentro y otro fuera del período; el PDF de la copia local muestra la advertencia.

**Prevención.** Revisar la fecha civil de los registros del snapshot antes de usar el diagnóstico como documento final. Corregir una fecha de origen solo con confirmación y trazabilidad docente; la presentación no debe ocultar la discordancia.

## 2026-09-29 — El Word de actividad ocultaba el apartado de observaciones

**Síntoma.** La actividad mostraba «Qué observar» en los referentes curriculares, pero el Word descargado antes de registrar evidencias no mostraba el apartado «Registro de observaciones y evidencias».

**Causa raíz.** El exportador eliminaba toda la sección VI cuando la actividad aún no tenía observaciones docentes, junto con la tabla vacía de la plantilla.

**Solución validada.** Se conserva el título de la sección y se muestra «Aún no hay observaciones registradas» con la indicación de registrarlas en Hoy. La tabla solo aparece cuando existen registros reales; la reflexión docente sigue ausente hasta que se escriba. Se comprobó el DOCX sin marcadores, la variante con taller y el PDF de una actividad de prueba.

**Prevención.** El test del exportador cubre actividades sin observaciones y con observaciones reales, además de la plantilla con taller. No se rellenan observaciones ni valoraciones por inferencia.

## 2026-09-29 — QA diagnóstico sin sugerencias de Jev

**Síntoma.** Las 12 observaciones diagnósticas del aula ficticia contaban para «Observar» (6/6), pero cada tarjeta solo ofrecía elegir una competencia manualmente.

**Causa raíz.** La importación correctiva usó `classifierEnabled=false`, dejando las filas con `classifier_status='disabled'` y sin versión V2.4. El flujo V2.4 solo procesa automáticamente filas propias pendientes.

**Solución validada.** Tras respaldar PGlite y comprobar los 12 IDs sin decisiones docentes, se marcaron únicamente esas filas como pendientes `CURRENT_V2_4_RAW`. La cola existente produjo 8 sugerencias y 4 abstenciones, visibles en la UI; ninguna se confirmó. Entrevistas 6/6, observados 6/6, Resumir pendiente y ordinarias 0. Ver `docs/qa/six-students-diagnostic-correction-2026-09-29.md`.

**Prevención.** Cuando un QA debe probar recomendaciones, cargar la observación mediante el flujo diagnóstico con V2.4 activo y comprobar `classifier_status` además del contador de alumnos observados.

## 2026-09-29 — Dataset QA de 5 años cargado en observaciones ordinarias

**Síntoma.** Había seis entrevistas confirmadas y 24 observaciones ordinarias, pero Diagnóstico → «2. Observar» mostraba 0/6.

**Causa raíz.** El script de carga usó `ordinary_observations`, mientras el contador diagnóstico consulta por alumno `diagnostic_experience_observations`, `diagnostic_spontaneous_observations` y observaciones de sesiones diagnósticas. Las notas ordinarias no alimentan ese paso.

**Solución validada.** Con respaldo previo y comprobación de los 24 IDs/textos, se retiraron únicamente esas filas de QA y se registraron O1 y O2 de cada alumno como 12 observaciones espontáneas diagnósticas, sin clasificar ni invocar IA. Se conservaron las seis entrevistas. API e interfaz muestran Conocer 6/6, Observar 6/6, Resumir pendiente; ordinarias 0. Ver `docs/qa/six-students-diagnostic-correction-2026-09-29.md`.

**Prevención.** Para QA del Diagnóstico inicial, verificar el predicado real de `diagnosticStepProgressForTeacher` antes de cargar datos. No reutilizar el script histórico de observaciones ordinarias para este fin.

## 2026-09-29 — Falsos bloqueos del filtro V2.4 ante verbos iniciales

**Síntoma.** QA-JEV-01 («Estaba…») y QA-JEV-03 («Tomó…») quedaban `privacy_blocked` sin llegar a Jev, aunque eran observaciones ficticias curriculares.

**Causa raíz.** El filtro conservador de mayúsculas trataba verbos iniciales no incluidos en `SAFE_START` como posibles nombres. El producto decidió eliminar íntegramente el filtro previo para `CURRENT_V2_4_RAW`, no ampliar una lista de excepciones.

**Solución validada.** Se retiró el filtro y el estado de este flujo, se conservó y envió RAW exacto, y las migraciones 0068 / 202609290003 transforman filas antiguas preservando decisiones docentes. Los cinco casos QA llegaron a Jev; 49 pruebas relacionadas, typecheck, lint y build pasaron. QA-JEV-05 sugirió PS_CONVIVE frente a MAT_FORMA aproximado; no se ajustó el clasificador.

**Prevención.** Mantener una prueba de frontera que compare byte a byte el RAW persistido con el entregado al clasificador, incluidos nombres, mayúsculas, correo, dirección y espacios. Cualquier cambio futuro de tratamiento de datos debe ser una decisión de producto explícita y documentada.

## 2026-09-28 — F10: timeout del arranque HTTP con concurrencia libre

**Síntoma.** `node --test` reportó 595/596; `auth-http.test.mjs` no observó al servidor iniciar dentro de su plazo mientras otras pruebas PGlite/Word corrían en paralelo.

**Causa comprobada.** El test pasó aislado (1/1) y la suite completa pasó con `--test-concurrency=4` (596/596), sin cambio de código de producto. La saturación del runner es la explicación consistente con estos resultados; no se atribuye el timeout a F10.

**Solución validada.** Limitar la concurrencia de la suite general a cuatro procesos en este host y mantener comandos por separado. No repetir ninguna llamada IA.

**Prevención.** Ejecutar suites de integración que arrancan PGlite/servidores con concurrencia controlada y reportar por separado los fallos de infraestructura.

## 2026-09-28 — F9: reajuste incompatible con huella de evidencia F8

**Síntoma.** Un cierre que incorporaba una observación ordinaria confirmada podía quedar rechazado como «nueva información» al aceptar un reajuste, aunque las fuentes no hubieran cambiado.

**Causa raíz.** La ruta de cierre F8 usaba `includeOrdinary`, pero la verificación transaccional de reajuste llamaba al lector de períodos sin esa opción.

**Solución validada.** Pasar el mismo flag a la transacción y probar con una observación ordinaria confirmada: el cálculo legacy rechaza la huella F8 y el cálculo corregido acepta la nueva versión sin tocar raw ni cierre.

**Prevención.** Los consumidores de una huella de cierre deben usar exactamente la misma proyección de fuentes que la produjo; ampliar las pruebas cruzadas en cada nueva fuente evaluable.

## 2026-09-28 — F8: navegador QA no disponible en el host

**Síntoma.** El CLI `agent-browser` no estaba instalado; el navegador integrado agotó el tiempo al navegar y luego devolvió `User unavailable`.

**Causa comprobada.** Fallo de disponibilidad de la superficie de automatización, no del servidor: Vite respondió `GET /` 200, la API QA respondió en 8796 y el build pasó. No se pudo inspeccionar visualmente el DOM.

**Tratamiento.** Se registró el límite de QA y no se declaró verificación visual. Se ejecutaron pruebas de modelo/API en clon restaurado y la suite completa; F12 debe reintentar el recorrido de interfaz cuando el navegador esté disponible.

**Prevención.** Distinguir la salud del servidor de la disponibilidad del controlador de navegador; no convertir un HTTP 200 en una afirmación de QA visual.

## 2026-09-28 — F7: flags y URL incompletos en harness QA

**Síntoma.** La página QA mostró desconexión pese a que la API local estaba disponible; después, «Hoy» contó una observación pendiente, pero la cola indicó que la captura no estaba habilitada.

**Causa raíz.** El proceso Vite recibió `NEXT_PUBLIC_LOCAL_DB_URL` en vez del contrato real `NEXT_PUBLIC_AYNI_API_URL`; el backend se inició con la revisión F6 activada pero sin `AYNI_ORDINARY_OBSERVATIONS=1`.

**Solución validada.** Reiniciar solo los procesos QA con URL y flags correctos. La UI cargó los cuatro destinos y «Hoy» abrió la observación pendiente real del clon. No se alteró código de producción para encubrir el error de configuración.

**Prevención.** Los comandos de QA deben declarar ambos flags dependientes y usar el nombre de URL importado por `local-database.ts`; verificar ruta `/health` y la cola antes del recorrido visual.

## 2026-09-28 — F6: criterio histórico sin ID de competencia V4

**Síntoma.** Una captura guiada QA con criterio activo de un taller histórico no podía conservar la atribución elegida porque la fila tenía `competency_v4_id` nulo.

**Causa raíz.** El primer validador de F6 suponía que todos los criterios de actividad ya habían migrado al catálogo V4. Los talleres anteriores conservan un UUID de competencia heredada válido y no deben recibir un mapeo V4 inventado.

**Solución validada.** Admitir el criterio activo perteneciente a la actividad autorizada, guardar su ID y texto en el snapshot y conservar el UUID legacy sin transformarlo. La QA en clon verificó captura, recarga y visualización; el cotejo histórico permaneció intacto.

**Prevención.** Probar criterios V4 y legacy en cada frontera de observación/evaluación y resolver equivalencias únicamente mediante fuente curricular autorizada, no por nombre ni por suposición.

## 2026-09-28 — F5: exportación e importación de tablas raw desalineadas

**Síntoma.** Dos pruebas de traslado fallaron después de añadir las tablas de observación al export local.

**Causa raíz.** El importador de Supabase mantenía una lista cerrada y aún no incluía `ordinary_observations` ni `ordinary_observation_revisions`.

**Solución validada.** Incorporar ambas tablas en orden de dependencia, sin tocar datos ni repetir capturas QA. Las 25 pruebas focales, la suite completa (580/580), typecheck, lint y build pasaron.

**Prevención.** Cada tabla nueva de export debe actualizar el orden de importación y pasar la prueba de paridad antes del checkpoint.

## 2026-09-28 — F5: identidad implícita y dictado reescrito en captura previa

**Síntoma.** La ventana legacy de evidencia iniciaba con el tercer niño preseleccionado y «Guardar y siguiente» seleccionaba automáticamente otro. El propósito anterior de dictado de observación devolvía una versión reescrita por IA. Esto permitía asociar por descuido un texto a un niño no elegido expresamente y no conservaba la transcripción literal para el nuevo contrato raw.

**Causa raíz.** La captura de evidencia antigua combinaba hecho observado, criterio e interacción rápida; el alumno quedaba como estado implícito de la vista. El servicio de audio compartía una etapa de edición con la nota de observación.

**Solución validada.** F5 crea captura ordinaria separada con alumno obligatorio sin default, backend que valida `student_id` del aula y jamás extrae nombres del texto. `raw_observation` devuelve transcripción literal sin segunda llamada de reescritura; la ruta legacy también inicia sin alumno y exige reelección al continuar. Pruebas SQL/servicio y QA UI confirman el caso con nombre contradictorio, original intacto y revisión append-only.

**Prevención.** Las futuras atribuciones Jev se referirán al ID de observación y a su `student_id` persistido; jamás reasignarán alumno por texto. Mantener test de contradicción nombre/texto y de micrófono con identidad seleccionada antes de habilitar un flujo nuevo.

## 2026-09-28 — F4: cotejo de clon con proyecciones reconstruibles

**Síntoma.** La comparación inicial de todas las tablas contra el snapshot F3 falló tras confirmar una actividad QA; `ai_usage_events` añadió una fila fixture con costo cero, `competency_display_labels.updated_at` se refrescó al abrir la API y el mapa derivado de período agregó dos entradas/una versión y refrescó cinco filas anteriores.

**Causa raíz.** La verificación trataba eventos de uso nuevos y proyecciones reconstruibles como fuentes históricas inmutables, mezclando semánticas de tablas. No hubo pérdida de las 26 actividades, evidencias, valoraciones ni cierres históricos.

**Solución validada.** Cotejar las 69 tablas fuente/historia por contenido, los registros anteriores de actividad/criterio/agenda/ejecución y el nuevo ActivityV3 por IDs. Auditar por separado las dos proyecciones y el uso fixture, registrando altas/refrescos sin ocultarlos. Conservar el `updated_at` real del catálogo en DB y comparar solo etiqueta/área/ID para esta tabla de presentación. Reporte `.local/test-results/f4/history.json`.

**Prevención.** Separar fuentes confirmadas, eventos aditivos y proyecciones recalculables en cada auditoría de fase; nunca inferir corrupción de datos pedagógicos por un contador de proyección distinto sin conciliar IDs.

## 2026-09-28 — F3: historial, recarga y harness QA

**Síntoma/causa.** Regeneración sucesora podía sustituir filas históricas sin overrides explícitos; V3 debía conservar string `starting_point` para Word/copia. Volver a Mi año podía usar versiones obsoletas en memoria. `vinext dev` no abrió puerto; CLI ignora `--config`; preview rechazado por entorno. Primera restauración chocó con semillas demo de migraciones.

**Solución validada.** Retener fila completa pasada/con registro y proyectar refs V3 legacy sin reescribirla. Conservar string/snapshot. Recargar listado y limpiar avisos al elegir propuesta. Harness QA con Vite/config independiente sin emulador Cloudflare, misma app/plugin local, API autorizada sobre clon. En clon nuevo vaciar únicamente semillas antes de importar; 71/71 tablas cotejadas iguales. Clon fallido preservado y original intacto. UI confirma V1 futura y V2 legacy con cinco fixtures/cero llamadas pagadas; datos históricos cotejados intactos.

**Prevención.** Comparar historia al añadir derivados y nunca normalizar confirmados. Validadores separados: primer lint bajo carga conjunta con build superó 120 s, detenido Ctrl+C y pasó aislado. Suite 541/541 en 131,5 s mantuvo progreso. No repetir resultados A/B por incidentes del harness ni confundirlos con corrupción de F2.

## 2026-09-28 Informes familiares P4 rechazados y recuperados (H49)

**Síntoma.** Los primeros intentos reales de informe familiar de Alma y Omar devolvieron `family_report_schema_mismatch`; no se guardó una salida inválida. Cada segundo intento por UI produjo un informe revisado, confirmado y descargado. Las cuatro llamadas facturables permanecen en el ledger; no equiparar dos documentos finales con dos llamadas.

**Causa conocida y límite.** La salida no superó el contrato local estricto `validateFamilyReport`; la subregla exacta no se conoce porque no se conservó texto rechazado con datos de menores. No atribuirlo a un campo, modelo o proveedor específico sin telemetría segura. No se modificó el validador ni hubo fix de producto en este corte.

**Solución operativa validada y prevención.** Reintento explícito por docente bajo el **mismo contrato**: dos informes completos, sin marcadores pendientes en Word XML. Para reparar la recurrencia, instrumentar solo subcódigo no sensible/intento/uso, construir regresiones anonimizadas, mantener rechazo seguro y medir éxito/costo por informe final. La validación de contenido evitó persistir los dos intentos fallidos, pero no evitó su costo. Ver auditoría 10, 15 y 16.

## 2026-09-28 Integridad del análisis y conclusión del período (H35/H36/H37/H39)

**Causas y soluciones.** H35 (`551409f`) compara el contexto autorizado completo al validar el marco, no una proyección sin su fingerprint. H36 (`ebaec81`) conserva SQL DATE civil en la copia para IA y en la huella, evitando que medianoche UTC se trunque como el día anterior local. H37 (`e949f54`) compara los campos del snapshot, no el orden de claves JSONB. H39 (`c6921bb`) distingue la preposición española A de una calificación explícita, manteniendo prohibidos niveles, notas y comparaciones.

**Validación.** Regresiones fallaron antes y pasaron después: respectivamente 15, 36, 26 y 42 relacionadas, con typecheck/lint/build PASS. UI: marco vigente admitido, análisis con fechas correctas, B docente de Bruno y su misma conclusión confirmados; conclusión de Alma antes rechazada y después confirmada. No se desactivaron fingerprints, ownership ni conflictos reales. Los intentos facturados rechazados se mantienen en el ledger; timeouts sin usage no se estiman como cero.

**Prevención.** Fixtures con contexto no nulo, SQL DATE real y pending serializado en JSONB. Probar expresiones españolas positivas y menciones de calificación negativas. Los juicios docentes simulados no son adjudicación experta ni prueba de precisión del modelo. No penalizar apoyos de acceso como si fueran falta de logro.

## 2026-09-28 Fidelidad diagnóstica y plazo del marco (H31/H32)

**Síntomas y causas.** Word diagnóstico usaba el día UTC, contaba asociaciones como notas, incluía áreas no aplicables en pendientes y omitía el registro más reciente. El Assessment Master multicompetencia heredaba timeout de 30 s.

**Soluciones validadas.** H31 (`223acbe`) convierte solo instantes a Lima, respeta fechas civiles y banderas, cuenta notas únicas y muestra primer/último registro con N de M. H32 (`e8cdbde`) pasa 180 s solo al maestro de evaluación. Regresiones fallaron antes; 26/26 relacionadas + typecheck/lint/build PASS. Descarga real diagnóstica después: 27 notas únicas, sin áreas desactivadas, sin placeholders; XML verificado, render visual NO PROBADO por ausencia de LibreOffice. El reintento UI produjo un marco de seis competencias, sin niveles ni actuaciones inventadas, luego guardado y confirmado por docente. El intento fallido sin usage conserva costo desconocido.

**Prevención.** Distinguir instante y fecha civil; contar entidades por ID y asociaciones por competencia. Asignar timeout según duración del workflow, no heredar el de clasificación en maestros largos. No alterar snapshots históricos para hacerlos coincidir con decisiones posteriores.

## 2026-09-27 Confirmar par diario bloqueado por orden JSONB (H26)

**Síntoma.** Actividad+taller guardados mantenían «Guarda los cambios» y confirmación deshabilitada.

**Causa raíz.** La comparación del taller usaba stringify bruto, no igualdad de contenido frente al objeto recargado.

**Solución validada.** Reusar la igualdad semántica de H22; listas siguen ordenadas y editar/retirar taller exige guardar. JSONB real y contrato de integración + 11 relacionadas, typecheck, lint y build PASS. UI recargó el borrador guardado y confirmó el par diario sin regeneración.

**Prevención.** No comparar objetos persistidos JSONB por orden de inserción de claves. Las pruebas de cambios deben cubrir también recursos vinculados.

## 2026-09-27 Talleres actualizaban una columna inexistente (H25)

**Síntoma.** El maestro se generaba pero guardar las decisiones devolvía error genérico.

**Causa raíz.** La tabla `learning_experiences` no tiene `updated_at`; tres UPDATE de talleres la asumían existente. El flujo de proyectos usa la revisión del trigger, sin esa columna.

**Solución validada.** Retirar las tres asignaciones a `updated_at` en guardar, confirmar y archivar maestros. Una regresión usa todas las migraciones y los handlers reales: guarda, rechaza revisión obsoleta, confirma y archiva al confirmar una nueva versión. 13 relacionadas, typecheck, lint y build PASS. UI guardó y confirmó el mismo maestro sin otra generación.

**Prevención.** Probar handlers de persistencia con el esquema migrado, no solo propuestas simuladas; conservar revisión optimista y transacción.

## 2026-09-27 DATE de PostgreSQL rechazado en actividades (H24)

**Síntoma.** La propuesta del 30/03, dentro del proyecto 30/03–10/04, no se podía guardar.

**Causa raíz.** Convertir DATE con `String(date).slice(0,10)` daba día de semana en lugar de fecha ISO; se comparaban rangos incompatibles. Regresión SQL real reprodujo el rechazo.

**Solución validada.** Reusar `annualCalendarDay` en límites, edición/confirmación de actividad y calendario del proyecto. 16 pruebas relacionadas, typecheck, lint y build PASS. Tras reiniciar solo API QA, el mismo borrador se guardó y confirmó por UI sin regenerarlo.

**Prevención.** Normalizar DATE con el helper existente antes de comparar o validar; probar objetos Date reales además de strings. No convertir UTC DATE a día local ni debilitar límites del calendario.

## 2026-09-27 Confirmar días del proyecto fallaba por inferencia SQL (H23)

**Síntoma.** Calendario mostraba ocho días válidos, pero confirmar devolvía error genérico.

**Causa raíz.** CASE con parámetro y NULL infería texto, incompatible con `confirmed_by` UUID. Regresión reprodujo SQLSTATE 42804 antes del fix.

**Solución validada.** Cast explícito `$2::uuid` en la consulta existente. Test con SQL real valida confirmación, identidad, revisión y vuelta a borrador. 14 relacionadas, typecheck, lint y build PASS; UI confirmó ocho días después de reiniciar solo QA.

**Prevención.** Probar persistencia de ramas CASE con el tipo real de columna; no exponer detalles SQL en UI. No requiere migración ni cambio de permisos.

## 2026-09-27 El paquete de traslado omitía los costos de IA (H19)

**Síntoma.** La paridad export/import fallaba porque `ai_usage_events` se exportaba pero no estaba en el orden de importación; un traslado perdería el ledger por docente.

**Causa raíz.** Se añadió la tabla al exportador sin añadirla al importador. El remapeo de `teacher_id` ya existía.

**Solución validada.** Añadir la tabla después de perfiles. Regresión CLI offline con evento ficticio verifica paquete SQL, conteo, identidad remapeada, tokens, importe y procedencia de costo. 16/16 combinadas, suite integrada 466/466, typecheck, lint y build PASS. No se aplicó SQL a Supabase ni se usaron cuentas existentes.

**Prevención.** Probar paridad de tablas y contenido de una transferencia real, no solo nombres.

## 2026-09-27 La regresión de reajuste dependía de la medianoche UTC (H18)

**Síntoma.** Un test de protección del pasado fallaba de noche en Lima, aunque el servicio aplicaba correctamente el día local.

**Causa raíz.** El fixture creaba fechas relativas en UTC; antes de las 05:00 UTC «ayer» podía coincidir con hoy en Lima. También derivaba el año desde UTC.

**Solución validada.** Fixtures relativos al día civil America/Lima y reloj controlado a ambos lados de medianoche y cambio de año. Los cinco tests de reajuste pasan; suite integrada 466/466, typecheck, lint y build PASS. No cambió la protección productiva de fechas pasadas.

**Prevención.** Controlar reloj y zona en tests del dominio calendario. No debilitar una regla de integridad para adaptar un fixture.

## 2026-09-27 JSONB hacía parecer editadas las decisiones del proyecto (H22)

**Síntoma.** Tras generar preguntas y criterios, la UI mostraba éxito pero ocultaba el paso de preguntas y bloqueaba el mapa.

**Causa raíz.** `JSON.stringify` dependía del orden de claves, que JSONB no conserva. La comparación semánticamente falsa afectaba decisiones, dependencias y mapa.

**Solución validada.** Comparación canónica de objetos con listas ordenadas. Regresión con round-trip PGlite y cambios pedagógicos reales; 12 pruebas relacionadas, typecheck, lint y build PASS. El mismo borrador QA mostró cuatro preguntas sin regeneración y permitió pasar al recorrido.

**Prevención.** Comparar valores JSON, no orden de inserción de claves. Conservar la detección de cambios de contenido y secuencia. Sin migración ni alteración del aula original.

## 2026-09-27 El schema del documento anual permitía cardinalidades rechazadas después (H21)

**Síntoma.** Después de confirmar correctamente el preplan QA, una llamada real para el Word terminó con desarrollo incompleto, sin perder el plan vigente.

**Causa comprobada.** El esquema formal no incluía el mínimo/máximo de cuatro criterios, límites de listas/textos ni la cantidad exacta de detalles que exige `validateAnnualFormal`. La salida rechazada no se persistió; no se conoce cuál condición falló en aquel intento.

**Solución validada.** Esquema y prompt expresan los mismos límites, con cantidad dinámica de detalles desde el preplan confirmado. 37 pruebas relacionadas, typecheck, lint y build PASS; reintento UI PASS después de `87e0d32`, Word listo en Documentos. Mismo modelo y validador, sin regeneración automática. Fidelidad/render del archivo sigue pendiente.

**Prevención.** Toda restricción de cardinalidad local debe estar en Structured Outputs cuando sea compatible; probar cantidades editadas (1, 10, 12 y 20), no solo el formato inicial. Conservar el costo de llamadas rechazadas y distinguir plan confirmado de documento pendiente.

## 2026-09-27 El calendario persistido invalidaba el propio preplan anual (H08)

**Síntoma.** Un preplan recién generado se recargaba con doce propuestas, pero guardar una edición válida o confirmar intacto devolvía «Revisa los datos de la propuesta 1».

**Causa raíz.** Persistencia añadía cuatro campos derivados no reconocidos por el validador estricto de filas. La revalidación también ejecutaba un UPDATE idéntico que incrementaba la revisión optimista antes de confirmar.

**Solución validada en regresión y UI.** El validador del round-trip admite únicamente los metadatos derivados conocidos, devuelve campos editables y conserva el esquema del modelo estricto. Las fechas/días se recalculan desde el calendario de servidor; el UPDATE se omite cuando JSONB es igual. Las dos regresiones fallaron antes y pasan después sobre PGlite con todas las migraciones, incluyendo persistir/recargar/confirmar intacto y editar/guardar/recargar/confirmar. 63 tests relacionados, typecheck, lint y build PASS. El mismo preplan QA se confirmó intacto desde la UI después de `60210c3`: «Mi año vigente · versión 1».

**Prevención.** Probar el objeto enriquecido que vuelve de PostgreSQL, no solo el objeto inicial del modelo. Un recalculo sin cambios no debe mutar una revisión. Mantener rechazo de campos desconocidos, IDs no aplicables y revisiones obsoletas. Sin migración ni cambios en el aula original; ver ADR 084.

## 2026-09-27 La revisión opcional de cada niño seguía bloqueando el resumen del aula

**Síntoma.** El acceso individual estaba al final de una tabla ancha, el resumen exigía comentarios confirmados de todos los niños y su información se recortaba dentro de un scroll. Mover solo el botón no habría permitido avanzar sin revisar a cada niño.

**Causa raíz.** Interfaz y servidor compartían una regla de completitud individual obligatoria. La huella grupal dependía de todos los comentarios, en vez de las fuentes disponibles. La síntesis de Ayni también asumía comentarios de cada niño como única fuente.

**Solución validada.** Los accesos quedan debajo del mapa; el comentario es opcional y sin generación individual. El snapshot v2 usa padrón y fuentes actuales más comentarios vigentes disponibles. Pruebas aisladas confirman resumen y prioridades sin comentarios, preservan versiones confirmadas y rechazan confirmación tras cambiar fuentes o padrón. La sugerencia grupal usa una proyección anónima, acotada y solo por solicitud, con ausencia de información explícita. La información de aula crece con la página y la navegación coloca volver y avanzar en lados opuestos. La transcripción de comentario/resumen es literal y los permisos rechazan alumnos/aulas ajenas y scopes ambiguos antes de llamar al proveedor. Ver ADR 083.

El exportador Word asumía además un comentario por cada niño. Ahora cuenta solo comentarios existentes; el test del XML verifica cero cuando no se registraron, mantiene todos los nombres autorizados y las observaciones, y no afirma que haya comentarios confirmados inexistentes. No se hizo revisión visual del Word en este cambio.

**Prevención.** Cubrir la ruta vertical interfaz/servidor/exportación: algo descrito como opcional no debe ser una precondición oculta ni inflar conteos del informe. Los snapshots nuevos necesitan lectura compatible de versiones históricas y detección de fuentes nuevas, aun sin comentarios individuales. Mantener ejemplos como placeholders, no autocompletarlos como evaluaciones.

## 2026-09-27 Reconsultar observaciones informaba éxito sin una recomendación

**Síntoma.** «Sugerir con Jev» parecía no hacer nada; la UI seguía mostrando todas las competencias y podía informar una actualización exitosa aunque la nota hubiera sido bloqueada o el modelo se hubiera abstenido.

**Causa raíz.** La presentación trataba HTTP 200 como clasificación exitosa, sin distinguir privacidad, suficiencia o indisponibilidad. Exponía el catálogo completo antes de obtener una candidata, pese a existir guardado y clasificación automáticos en segundo plano.

**Solución validada.** Se deriva y expone un estado cerrado sin texto interno sensible. La tarjeta de Ayni presenta automáticamente principal/adicionales, carga y mensajes específicos; un error de consulta permite reintentar y el catálogo solo aparece al editar. La ruta genérica autorizada conserva el alias anterior y la respuesta tardía no sobrescribe una decisión docente. Las pruebas incluyen bloqueo de privacidad, abstención, error, acceso entre docentes y carrera con confirmación manual. Guardar una nota ficticia desde la UI produjo automáticamente `MAT_CANTIDAD`; abrir, añadir una segunda opción y cancelar no guardó cambios.

**Prevención.** Probar resultados vacíos además del camino exitoso. Derivar feedback del resultado de dominio, no del código HTTP; mantener las selecciones locales durante el polling y condicionar escrituras asíncronas a no tener clasificación docente.

## 2026-09-27 La etiqueta numérica de observaciones ficticias bloqueó su clasificación

**Síntoma.** Las doce espontáneas del lote local se guardaron y proyectaron al perfil, pero permanecieron por revisar sin sugerencias ni fuente de clasificación. No demuestra un fallo o falta de precisión del modelo.

**Causa raíz comprobada.** Su prefijo `[PRUEBA FICTICIA · OBS-20260927]` contiene un número de ocho dígitos. `anonymousDecisionText` rechaza números de siete o más dígitos como posibles identificadores antes de cualquier llamada externa. Una comprobación local aceptó 0/12 notas con el prefijo y 12/12 al retirarlo solamente en memoria, sin llamar a IA.

**Solución validada.** Se retira únicamente el prefijo inicial conocido de prueba al construir el texto temporal del modelo; la nota guardada permanece idéntica. Todas las reglas de privacidad se aplican al cuerpo. Las pruebas mantienen bloqueados identificadores/información familiar incluso con la marca, marcas desconocidas y prefijos no iniciales. La reconsulta real de las 12 filas produjo 10 recomendaciones y 2 abstenciones de Jev, sin errores; ninguna competencia quedó confirmada por la prueba y las entrevistas se conservaron. Una nota nueva con marca ficticia obtuvo automáticamente `MAT_CANTIDAD` desde la UI. Estos resultados verifican conexión/flujo, no aciertos adjudicados por especialistas.

**Prevención.** Mantener el filtro numérico general. En futuros fixtures preferir una marca visible no numérica y conservar fecha/identificador en el reporte local; comprobar admisibilidad con el mismo anonimizador antes de guardarlos. Nunca borrar la marca de las fuentes guardadas ni aceptar datos privados por pertenecer a un fixture.

## 2026-09-27 Los nombres históricos conservaban caja irregular en las entrevistas

**Síntoma.** La lista de entrevistas y sus preguntas seguían mostrando un nombre con mayúsculas mezcladas, aunque la lista principal de alumnos ya usaba capitalización legible.

**Causa raíz.** Diagnóstico recibía el nombre histórico directamente y el editor familiar lo interpolaba sin pasar por la función compartida de presentación.

**Solución validada.** La lista y los encabezados infantiles del diagnóstico, y el nombre usado en las preguntas y la impresión de la entrevista, reutilizan `displayPersonName`. No se reescriben alumnos ni entrevistas. Las pruebas de nombres y el contrato del flujo protegen esas llamadas; la lista se verificó en el navegador local.

**Prevención.** Aplicar la función de presentación en cada nueva vista de nombres históricos, sin confundir el formato visible con una corrección de identidad.

## 2026-09-27 Los campos editables parecían deshabilitados o texto plano

**Síntoma.** En «Mi aula» los campos de nombre no tenían estilo de control. En el alta inicial, un equipo con preferencia de modo oscuro mostraba los `Input` en gris pese a que la página es clara.

**Causa raíz.** El formulario de niños usaba elementos `<input>` sin clases fuera de `ayni-workflow`. Además, los componentes compartidos mantenían `dark:bg-input/30`, activado por la preferencia del sistema aunque Ayni no cambia su paleta; los bordes de entrada eran demasiado pálidos.

**Solución validada.** «Mi aula» usa campos compartidos con etiquetas persistentes, bordes visibles, envío semántico y estado de carga. Se retiró el fondo oscuro heredado y se fijó el borde compartido a `#71869d`, con contraste calculado de 3,75:1 sobre blanco. En el navegador local, con preferencia oscura activa, el fondo efectivo pasó a blanco y el borde al color previsto. Typecheck, lint, build y el contrato del flujo deben pasar antes de cerrar el cambio.

**Prevención.** Revisar el estilo computado con preferencias claras y oscuras cuando la app use una sola paleta. Proteger etiquetas, mensajes de carga y contraste de controles con pruebas de contrato; no depender del placeholder para identificar un campo.

## 2026-09-27 OpenRouter impidió la nueva prueba real de Jev

**Síntoma.** Al probar el nuevo flujo docente de dos decisiones con la clave del experimento, ambas solicitudes recibieron HTTP 402 y no devolvieron clasificaciones.

**Causa observada.** OpenRouter rechazó la cuenta por crédito insuficiente o límite de gasto. No se infiere la configuración exacta de la cuenta solo a partir del código HTTP.

**Solución validada.** Tras añadir crédito a la misma cuenta, la clave experimental volvió a responder con la versión efectiva `typesafe/jev-1.13-20260917`. El adaptador convierte 402 en `insufficient_credits` sin guardar ni mostrar la clave, la observación o el cuerpo de respuesta. Se completaron 154 llamadas clasificatorias de la nueva composición y pruebas reales de imagen y ficha con datos ficticios. La configuración Jev se habilitó solo en el backend local.

**Prevención y pendiente.** Comprobar crédito y límite de la clave antes de otra evaluación; repetir con presupuesto explícito y etiquetas expertas nuevas. El proveedor no debe impedir guardar la observación ni la confirmación manual. El puerto 4179 pertenece al experimento; la app principal se abrió en `localhost:5173` con su API local en 8788.

## 2026-09-27 El anonimizado de Jev ocultaba acciones observables

**Síntoma.** Notas como «Dibujó círculos» o «Señaló tres bloques» llegaban al clasificador como «[persona] círculos» o «[persona] tres bloques». En 28 de 30 notas anonimizadas del conjunto difícil se introducía al menos un marcador, aunque la comparación previa había omitido esta capa.

**Causa raíz.** Una expresión regular sustituía toda palabra capitalizada de tres o más letras que no estuviera en una lista breve de verbos; incluía verbos y conectores al inicio de frases.

**Solución validada.** Se amplió una lista cerrada de actuaciones y conectores no identificadores, manteniendo la sustitución previa de nombres conocidos y la redacción de capitalizados desconocidos. En el mismo conjunto, los marcadores bajaron de 28 a 3 notas; una nota continúa rechazada por la regla de privacidad. Pruebas comprueban que se conservan verbos y conectores, que un nombre desconocido se oculta y que un nombre conocido coincidente con un verbo también se neutraliza. El resultado pedagógico necesita evaluación separada; esta prueba verifica el texto, no la exactitud de Jev.

**Prevención.** Pasar los datasets de evaluación por el mismo anonimizador que usa el servidor y registrar por separado notas aceptadas, modificadas y enviadas a revisión. No ampliar vocabulario a partir de un caso real sin revisar la implicación de privacidad.

## 2026-09-27 El límite de cuatro candidatas seguía el orden curricular, no las puntuaciones

**Síntoma.** Si más de cuatro `noul` superaban el umbral, una competencia con puntuación mayor podía omitirse por aparecer después en la KB.

**Causa raíz.** El código aplicaba `filter(...).slice(0, 4)` sobre los IDs en orden original.

**Solución validada.** Ordena las candidatas por puntuación descendente y desempata por ID antes de limitar. Una prueba con cinco candidatas y puntuaciones ascendentes verifica que se conservan las cuatro mayores. Se aplica también al máximo de tres en planificación emergente. No se cambió el umbral ni se confirma ninguna competencia automáticamente.

**Prevención.** Probar los límites de listas con más candidatos válidos que plazas disponibles; separar orden semántico de orden de almacenamiento.

## 2026-09-26 La evaluación real trataba edad y competencia confirmada como ausentes

**Síntoma.** Project, Unit y Activity devolvían propuestas prudentes pero pendientes; la validación rechazaba sus rutas o la competencia aunque el input interno sí tenía edad e IDs.

**Causa raíz.** `AIContextBundle` filtraba correctamente las tarjetas por edad, pero no declaraba de forma explícita `target_age` ni `confirmed_competency_ids`. Además, el fixture comparativo de Project/Unit usaba el alias incorrecto `competencyIds`.

**Solución validada.** Se añadieron ambos campos explícitos al bloque curricular autorizado, se corrigió el fixture y las Skills indican conservar esas decisiones. Una repetición real completó Project, Unit, Activity e Informe Familiar sin fallback.

**Prevención.** Las pruebas del contrato verifican ahora edad objetivo e IDs confirmados; los evals reales usan los mismos nombres de campo que producción.

## 2026-09-26 Assessment Master parecía desactualizado al intentar confirmarlo

**Síntoma.** Un marco recién generado y guardado pasaba la consulta de estado, pero la confirmación respondía que la planificación o los criterios habían cambiado.

**Causa raíz.** La confirmación recalculaba la huella usando el ID del registro `assessment_masters` como si fuera el ID de `evaluation_periods`. La fuente quedaba estructuralmente distinta aunque ningún criterio hubiera cambiado.

**Solución validada.** La confirmación construye explícitamente el período con `evaluation_period_id`, fechas y etiqueta antes de recalcular el snapshot. Una prueba crea dos docentes y aulas, genera y confirma el marco propio, bloquea accesos cruzados y comprueba que cambiar la revisión de un criterio sí marca el marco como desactualizado.

## 2026-09-26 El router declaraba rutas que no podían ejecutarse

**Síntoma.** Una tarea `decision` podía devolver `provider: "typesafe"` aunque el factory no implementaba ese proveedor. El booleano `allow_escalation` tampoco indicaba qué modelo usar, por qué motivo ni cuántos intentos estaban permitidos.

**Causa raíz.** La política mezclaba capacidades previstas con implementaciones productivas y no existía un contrato explícito de fallback en la orquestación.

**Solución validada.** Las decisiones, Taller y materiales quedan como `unavailable`; el factory no crea providers para planes inactivos. Actividad declara un único fallback Luna/medium → Sol/low, ejecutado por la orquestación solo tras una validación de calidad. Las pruebas demuestran que Auth, rate limit y timeout no escalan y que contexto y schema son idénticos entre intentos.

**Prevención.** Todo workflow nuevo debe aportar provider, contrato, validadores y benchmark antes de marcarse productivo. La suite de routing comprueba que política, factory y generador no declaren capacidades incompatibles.

## 2026-09-25 Las propuestas vinculadas a fechas escolares quedaban demasiado temprano

**Síntoma.** En una prueba real de generación, Sol propuso Fiestas Patrias en una fila que comenzaba en junio y Navidad/cierre en otra que terminaba a inicios de diciembre, aunque ambos títulos eran pertinentes.

**Causa raíz.** Los doce espacios iniciales se asignaban consecutivamente dentro de cada bimestre sin reservar las semanas lectivas cercanas a esos acontecimientos. El prompt no indicaba en qué fila ubicar cada uno.

**Solución validada.** El calendario intenta reservar julio para la sexta propuesta y diciembre para la duodécima, sin cruzar semanas de gestión ni forzar el calendario propio de una institución. El prompt asocia explícitamente los cuatro acontecimientos a sus filas. El código conserva los meses y duraciones calculados aun si la respuesta de Sol difiere. Una prueba real con datos ficticios devolvió doce propuestas, con Fiestas Patrias en julio y Navidad/cierre en diciembre; también pasaron la prueba focalizada, typecheck, lint y build.

**Prevención.** Verificar fechas reales de los espacios sugeridos además de contar propuestas y comprobar el esquema de respuesta. Mantener la opción docente de mover, editar o eliminar cualquier propuesta.

## 2026-09-25 Un registro nuevo bloqueaba el plan aunque existía síntesis confirmada

**Síntoma.** Planificar mostraba «Hay información diagnóstica nueva» y deshabilitaba la generación tras añadir una observación, incluso con una síntesis grupal confirmada.

**Causa raíz.** La generación exigía que la huella de todas las fuentes siguiera idéntica, mezclando registros nuevos con la decisión grupal confirmada por la docente.

**Solución validada.** El plan usa la última síntesis grupal confirmada y conserva su ID. Una síntesis nueva confirmada sí produce un conflicto que requiere revisar el plan. El recorrido deja regresar al diagnóstico con un clic. Typecheck, lint, build y pruebas focalizadas verifican el cambio.

**Prevención.** Separar la vigencia de una decisión docente de la llegada de datos sin sintetizar; probar ambos casos en el flujo de planificación.

## 2026-09-24 Una base Supabase vacía no tenía versión curricular activa

**Síntoma.** Tras aplicar el esquema, el contexto del aula no podía elegir una versión curricular activa, aunque el flujo local sí podía hacerlo.

**Causa raíz.** El seed de PGlite aportaba esa fila de metadatos y el esquema Supabase solo creaba la tabla. No se debe copiar el contenido curricular ficticio del seed local.

**Solución validada en migraciones simuladas.** `202609240011_staging_curriculum_version.sql` inserta una versión activa solo cuando falta, sin inventar competencias ni desempeños. La prueba de paridad aplica las migraciones completas desde cero.

**Prevención.** Comparar también los datos de configuración indispensables, además de tablas y columnas, antes de conectar staging real.

## 2026-09-24 La confirmación simultánea devolvía un error genérico

**Síntoma.** La segunda solicitud de confirmación de la misma valoración, o una confirmación con evidencia nueva, podía devolver `422` o un texto suelto aunque los datos habían cambiado.

**Causa raíz.** La validación previa a la transacción trataba la ausencia de borrador confirmado y la huella obsoleta como errores de formulario.

**Solución validada localmente.** Esos casos devuelven `409 version_conflict`; la transacción vuelve a leer borrador y evidencias antes de escribir. Pruebas concurrentes verifican una sola valoración y una sola versión de cierre.

**Prevención.** Los cambios de versión o de fuentes se expresan como conflictos estructurados y se prueban con dos solicitudes sobre la misma revisión.

## 2026-09-24 Una propuesta de IA podía presentarse como hallazgo confirmado

**Síntoma.** Al preparar nivel y conclusión en una misma ficha, el constructor antiguo de conclusiones etiquetaba el análisis recibido como `teacher_confirmed_findings`, aunque en ese punto solo era una propuesta de IA.

**Causa raíz.** El workflow anterior generaba la conclusión después de confirmar el análisis; el nuevo flujo presenta ambas propuestas antes de la confirmación docente.

**Solución validada localmente.** La conclusión preliminar recibe las observaciones reales y el estado informativo, sin pasar el análisis de IA como hallazgo docente. El constructor antiguo conserva su ruta de evaluación ya confirmada. Una prueba del generador verifica el contexto enviado al proveedor.

**Prevención.** Distinguir en los contratos de IA las propuestas de los hallazgos docentes confirmados, incluso si comparten la misma ficha.

## 2026-09-24 La exportación local incluía tablas que el importador no aceptaba

**Síntoma.** La prueba de preparación para Supabase detectó que la exportación incluía calendario, proyectos y períodos que faltaban en el orden de importación.

**Causa raíz.** Los cambios del calendario y la evaluación habían ampliado `exportTables` sin actualizar `tableOrder` ni los campos de usuario de la preparación del traslado.

**Solución validada localmente.** El importador incluye esas tablas en orden de dependencias y remapea `confirmed_by` y `level_confirmed_by` a la cuenta nueva. La prueba de paridad de tablas vuelve a pasar.

**Prevención.** Mantener la prueba de igualdad exportador/importador y de los identificadores docentes al añadir entidades transferibles.

## 2026-09-24 El cierre podía perder competencias sin observaciones

**Síntoma.** Una vista basada solo en evidencias no mostraba las competencias previstas en el plan anual sin registros; se podía interpretar el cierre como completo con información omitida.

**Causa raíz.** El mapa de evidencias se construía a partir de filas observadas, no del alcance curricular del período.

**Solución validada localmente.** La evaluación toma competencias de criterios de actividades y de proyectos calendarizados del plan anual, las combina con observaciones reales y muestra explícitamente las fichas sin evidencias. La exclusión docente exige motivo y no oculta competencias con registros o valoración. Una prueba PGlite comprueba ambos casos.

**Prevención.** Calcular el cierre desde las competencias previstas y las fichas de todos los niños, no únicamente desde lo observado.

## 2026-09-24 «Desarrollar esta propuesta» parecía no responder

**Síntoma.** Al elegir una propuesta del plan anual, la profesora permanecía viendo la tarjeta y parecía que no se abría ningún editor.

**Causa raíz.** El editor sí se creaba, pero se mostraba después de las doce propuestas, fuera de la pantalla visible; tampoco recibía el foco.

**Solución validada localmente.** Al elegir una propuesta, abrir un borrador o consultar una experiencia confirmada, la vista se desplaza al editor y le da foco. Se deja espacio para el encabezado fijo. Se comprobó el clic y la posición visible del editor en el navegador local.

**Prevención.** Si una acción abre contenido lejos del control que la inició, llevar a la persona al resultado y hacer visible el cambio de estado.

## 2026-09-23 Planes anuales duplicables y difíciles de revisar

**Síntoma.** La cuenta podía generar más de un plan para el mismo año en aulas distintas y el resultado aparecía como un formulario extenso antes de verse como documento. Esto confundía la revisión docente y podía causar llamadas al modelo innecesarias.

**Causa raíz.** La unicidad anterior estaba limitada a borradores del mismo aula/año; el servidor permitía nuevas versiones y la UI mostraba los campos editables como vista principal.

**Solución validada localmente.** El servidor comprueba el año escolar de la cuenta antes de generar o insertar y una migración aditiva impide dos planes vigentes por año. El plan se presenta primero como documento legible, con encabezado institucional; la edición queda en una acción separada. Se añadieron pruebas de migración, presentación y guard previo al modelo. Los planes históricos se preservan.

**Prevención.** Hacer cumplir reglas de unicidad en servidor y base de datos, y mantener el documento estructurado legible como vista principal de una propuesta pedagógica.

## 2026-09-23 La síntesis por competencia fragmentaba la mirada del niño

**Síntoma.** La docente debía alternar entre competencias para interpretar a un mismo niño, aunque necesitaba considerar también la entrevista familiar y observaciones aún no clasificadas.

**Causa raíz.** El editor tomaba cada competencia como unidad de revisión y el progreso contaba síntesis separadas.

**Solución validada localmente.** Una vista por niño muestra entrevista y observaciones antes de un solo comentario docente; la matriz curricular queda como mapa de registros. La nueva tabla versionada protege la confirmación y detecta fuentes nuevas. Las revisiones anteriores por competencia siguen accesibles como historial.

**Prevención.** La competencia organiza la observación, pero el diagnóstico inicial requiere una interpretación integral del niño y confirmación docente explícita.

## 2026-09-23 Un texto de guía podía confirmarse como interpretación docente

**Síntoma.** Una síntesis confirmada mostraba conteos técnicos y la instrucción «Revisa estas actuaciones y redacta tu interpretación», en lugar de una interpretación de la profesora.

**Causa raíz.** `prepareDiagnosticSynthesis()` precargaba ese texto en `summary_text`, y la confirmación validaba solo que no estuviera vacío.

**Solución validada localmente.** Los nuevos borradores comienzan con `summary_text` vacío. Las notas observadas se muestran por separado, guardar/confirmar rechazan textos de guía antiguos y la vista señala las confirmaciones históricas que requieren una versión docente nueva.

**Prevención.** Los textos instructivos y ejemplos deben ser ayuda visual, nunca valores guardables como juicio pedagógico.

## 2026-09-23 La revisión diagnóstica exigía demasiados saltos

**Síntoma.** Para revisar a un niño había que abrir primero su lista de competencias, entrar a una competencia, escribir la síntesis y volver varias veces. El acceso al resumen grupal aparecía tras una sola síntesis, sin mostrar el avance de todos los niños observados.

**Causa raíz.** La interfaz usaba la competencia como pantalla independiente y contaba cualquier síntesis confirmada como si el niño estuviera revisado.

**Solución validada localmente.** La pantalla del niño reúne todas las observaciones y síntesis por competencia. El avance cuenta solo competencias observadas y aplicables con síntesis confirmada posterior a sus observaciones; el botón «Revisar aula» aparece al completar los niños con registros. La edición local sin guardar bloquea la salida accidental. Se añadieron pruebas de progreso y una revisión visual local.

**Prevención.** Para señalar un paso terminado, calcularlo desde fuentes y confirmaciones vigentes, no desde la existencia de una única fila.

## 2026-09-23 La revisión inicial no era un diagnóstico trazable

**Síntoma.** Guardar la revisión solo completaba una sesión, sin interpretar por niño/competencia, conservar fuentes ni dar prioridades grupales confirmadas a la planificación.

**Causa raíz.** Las observaciones de experiencias v4 y la marca `reviewed` no tenían una entidad intermedia de síntesis docente. Las políticas iniciales de Supabase permitían escritura directa en las nuevas tablas, capaz de eludir la validación semántica del servidor.

**Solución validada localmente.** Borradores individuales y grupales con snapshots de fuentes calculados en servidor, confirmación versionada e inmutable, revisión cronológica y StudentContext separado por procedencia. Una migración adicional revoca escritura directa autenticada en Supabase. Las pruebas PGlite cubren obsolescencia, versiones, aislamiento y cobertura; RLS real sigue pendiente de staging.

**Prevención.** Nunca equiparar `reviewed` con una conclusión por competencia. Las síntesis no confirmadas no entran en StudentContext ni planificación, y las fuentes no se aceptan desde el navegador.

## 2026-09-22 La guía diagnóstica reemplazaba observaciones repetidas

**Síntoma.** Registrar nuevamente al mismo niño y referente actualizaba la fila previa. Un segundo día de observación no quedaba como hecho independiente.

**Causa raíz.** `student_observations` tiene unicidad por `diagnostic_entry_id + reference_id` y el POST legacy usa `ON CONFLICT DO UPDATE`.

**Solución validada localmente.** El flujo por experiencias v4 escribe observaciones acumulativas con competencia v4, experiencia, aspecto y fecha. Pruebas PGlite registran dos veces el mismo aspecto, continúan otro día y verifican tres registros distintos sin seleccionar automáticamente a los demás niños.

**Prevención.** Mantener hechos observados como registros append-only y calcular cobertura por niños distintos, separando falta de registro de un estado observado con información insuficiente.

## 2026-09-22 El inicio omitía la evaluación diagnóstica

**Síntoma.** Un aula configurada sin plan ni actividades abría Hoy y sugería crear directamente el plan anual, aunque la docente todavía no había revisado el diagnóstico inicial.

**Causa raíz.** El recorrido de Planificar comenzaba en el plan anual y no consultaba `diagnostic_sessions` ni las observaciones guardadas.

**Solución validada.** Añadir el diagnóstico al recorrido persistido, abrir Niños/Evaluar como primer destino según haya estudiantes y exigir una revisión docente explícita antes de recomendar el plan. La revisión puede declarar información insuficiente y no inventa resultados; los planes históricos siguen accesibles. Las pruebas cubren el orden del recorrido, la idempotencia de la revisión y el aislamiento por docente.

**Prevención.** Calcular los siguientes pasos desde registros del servidor y distinguir “observaciones en curso” de “revisión guardada”.

## 2026-09-22 Comparación de snapshots JSONB de conclusión

**Síntoma.** Una conclusión recién regenerada no podía confirmarse aunque el assessment fuente seguía intacto.

**Causa raíz.** La comparación serializaba objetos completos con `JSON.stringify`; PostgreSQL `jsonb` reordena claves y producía un falso cambio.

**Solución validada.** Comparar por campos estables (`assessment_id`, versión, timestamps, estado y hash de details) y normalizar el contenido antes de calcular SHA-256. Una prueba con PGlite verifica guardar, regenerar y confirmar, así como el bloqueo ante un cambio real del assessment.

**Prevención.** Nunca usar el orden de claves de objetos JSONB como criterio de igualdad de snapshots.

## 2026-09-22 Extracción textual no fiable del Programa Curricular de Inicial

**Síntoma.** Los extractores preservaron Unicode, pero produjeron diferencias de segmentación de palabras y orden de bloques por la maquetación del PDF.

**Decisión.** Se registraron las huellas SHA-256 de los PDF y se dejó el maestro oficial en estado de transcripción pendiente. No se escribió texto corrupto ni se promovió contenido semántico como fuente oficial.

**Prevención.** La siguiente ingestión debe contrastar una representación visual/OCR de cada página, conservar página/sección/hash por elemento y ejecutar una segunda pasada antes de crear registros oficiales.

**Control implementado.** Los extractores preservan Unicode crítico en el piloto. `scripts/reconstruct-curriculum-reading-order.py` clasifica diferencias de orden de bloques por tokens geométricos, sin reescribir palabras; las discrepancias pendientes son de maquetación, no de tildes o eñes corruptas.

## 2026-09-22 Señal estadística sensible a evidencias repetidas

**Síntoma.** El conteo inicial podía ocultar competencias sin uso y transformar varias evidencias de un mismo niño —o un único caso con apoyo— en una señal grupal.

**Solución.** Partir del currículo aplicable por edad, usar el último estado marcado por estudiante/competencia y exigir cobertura y umbrales configurables para la señal interna.

**Prevención.** Las pruebas separan ausencia de planificación, información insuficiente, registros históricos y necesidad observada grupal.

## 2026-09-22 Estado síncrono dentro de efecto al cargar un perfil de niño

**Síntoma.** El linter de React detectó un `setState` síncrono dentro de un efecto al iniciar la carga del perfil pedagógico.

**Causa raíz.** El indicador de carga se actualizaba al reaccionar a un cambio de selección, en lugar de hacerlo en el evento que selecciona al niño.

**Solución.** Mover el inicio de carga al manejador de selección y mantener el efecto únicamente para sincronizar la respuesta asíncrona, con cancelación lógica ante desmontaje.

**Prevención.** Revisar `react-hooks/set-state-in-effect` en cada componente nuevo y ejecutar lint antes de consolidar un bloque.

## 2026-09-21 Cierre de actividad omitido después del horario

**Síntoma.** Al terminar un bloque instruccional, el estado diario podía avanzar directamente al siguiente bloque o al cierre de jornada sin ofrecer el cierre breve de la actividad.

**Causa raíz.** El resolvedor consideraba solo bloques vigentes o futuros; no identificaba la última actividad sin completar cuyo horario ya había terminado.

**Solución.** Incorporar un estado `closure` y una acción primaria `close_block`, con la opción secundaria de mantener el bloque como actual si la docente lo extendió.

**Prevención.** Las pruebas de `resolveDailyState` cubren ahora el intervalo entre un bloque terminado y el siguiente.

## 2026-09-21 Renderizador DOCX sin LibreOffice disponible

**Síntoma.** El renderizador empaquetado no pudo convertir la Actualización 03 a PNG porque `soffice.exe` no estaba disponible en la ruta del runtime.

**Impacto.** No afecta a la aplicación. Se extrajeron e inspeccionaron las imágenes de referencia incrustadas y el contenido DOCX se leyó estructuralmente.

**Prevención.** Restaurar el binario LibreOffice empaquetado antes de requerir una entrega DOCX con validación visual.

## 2026-09-20 Scripts auxiliares del starter no encontraron npm

**Síntoma.** Los scripts auxiliares de instalación y build intentaron resolver `node_modules/npm/bin/npm-cli.js` dentro del proyecto y terminaron con `MODULE_NOT_FOUND`.

**Causa raíz.** En el entorno Windows, la detección de la ruta de npm produjo una ruta relativa al directorio de trabajo.

**Solución.** Ejecutar `npm ci` y `npm run build` con la ruta absoluta del npm instalado en el host, conservando el `package-lock.json` del starter.

**Prevención.** Verificar primero la ruta resuelta de npm en Windows y usar el instalador empaquetado cuando su detección sea correcta.

## 2026-09-20 Docker Desktop no pudo iniciar

**Síntoma.** Docker Desktop cerró al iniciar con un error en `sailor-ingest.sock`; la API `dockerDesktopLinuxEngine` no estaba disponible.

**Causa raíz.** Fallo del runtime local de Docker al crear o renombrar su socket de ingestión. No se confirmó una causa más profunda y no se restableció la aplicación para evitar afectar otros entornos.

**Solución.** Adoptar PGlite, un PostgreSQL embebido persistente que no requiere Docker, para el desarrollo local. Mantener migraciones Supabase específicas para Auth y RLS. Posteriormente Docker Desktop se actualizó a 4.91.0 y se aislaron carpetas temporales dañadas; `hello-world` funcionó, sin Factory Reset. La decisión de PGlite se mantiene por independencia del daemon.

**Prevención.** No hacer que el flujo local dependa de un daemon externo. Validar la equivalencia de esquema y conteos antes de importar al futuro staging Supabase.

## 2026-09-20 PGlite no creó el directorio padre

**Síntoma.** El primer arranque terminó con `ENOENT` al intentar crear `.local/pgdata`.

**Causa raíz.** El adaptador NodeFS de PGlite crea el directorio de datos, pero requiere que su directorio padre ya exista.

**Solución.** Crear `.local` de forma idempotente antes de inicializar PGlite.

**Prevención.** Toda ruta local persistente debe preparar explícitamente su directorio padre antes de abrir el motor.

## 2026-09-21 Exportación concurrente de PGlite

**Síntoma.** El logo guardado en una ejecución local no apareció tras reiniciar el servidor; existía un exportador que abría el mismo directorio de PGlite en otro proceso mientras el servidor seguía activo.

**Causa raíz probable.** Acceso concurrente no coordinado al directorio persistente de PGlite. El exportador no debía abrir otra instancia sobre la misma carpeta mientras el servidor estaba activo.

**Solución.** Añadir una ruta de exportación solo en `127.0.0.1` sin origen de navegador y hacer que `db:export` use siempre el proceso servidor. La exportación exige que `db:local` esté encendido.

**Prevención.** Centralizar todas las lecturas/escrituras de la base local en un solo proceso durante desarrollo. Probar persistencia tras reiniciar, además de comprobar la respuesta inmediata del API.
# Errores y soluciones

## 2026-09-22 Importador desalineado con jornada local

**Síntoma.** El export local incluía horario, ejecución diaria, asistencia, excepciones y snapshots que el importador no enumeraba.

**Causa raíz.** El orden de importación no se actualizó al crecer el modelo local.

**Solución validada.** Se añadió el conjunto completo de tablas operativas al orden dependiente y una validación bidireccional entre tablas exportadas e importadas. El dry run con el export local actual no reportó problemas.

**Prevención.** Toda nueva tabla exportada debe añadirse a `tableOrder` o declararse explícitamente como excepción antes de generar un paquete.

## 2026-09-22 Alta de aula rechazaba fechas válidas

**Síntoma.** La primera creación de aula devolvía «El año escolar ya existe con otras fechas» aunque acababa de insertarse.

**Causa raíz.** PGlite devuelve columnas `date` como `Date`; comparar `String(date).slice(0, 10)` con ISO devolvía texto del día de semana.

**Solución validada.** Normalizar `Date` a ISO antes de comparar. La prueba de onboarding con dos docentes y aula nueva ejecuta todas las migraciones locales.

**Prevención.** Probar servicios de persistencia con el driver real, no solo con mocks.

## 2026-09-22 Tablas de Plan Anual sin RLS

**Síntoma.** Auditoría de migraciones detectó seis tablas públicas nuevas sin `enable row level security`: tres de planificación y tres de referencia curricular.

**Causa raíz.** Sus migraciones originales crearon tablas pero no incluyeron políticas.

**Solución validada localmente.** Nueva migración Supabase habilita RLS, propiedad docente para planes y solo lectura autenticada para referencias. Una prueba enumera todas las tablas creadas y verifica cobertura de RLS. Falta aplicar y probar la migración en staging real.

**Prevención.** Mantener el test de cobertura de migraciones y probar denegación cruzada con dos usuarios antes de datos reales.

## 2026-09-22 Borradores y errores de carga en flujos v4

**Síntoma.** Plan Anual informaba de un borrador existente, pero no lo abría tras recargar; permitía iniciar otra propuesta. Otras pantallas interpretaban respuestas HTTP fallidas como listas vacías. En Activity y Project/Unit, un fallo al refrescar la lista después de guardar o confirmar podía dar a entender que la escritura había fallado.

**Causa raíz.** Los componentes no comprobaban `response.ok` en todas las lecturas ni separaban el resultado de la escritura del refresco posterior. El editor anual no vinculaba el draft recibido con `planId` y `proposal`.

**Solución validada localmente.** Reabrir el mismo borrador anual, impedir generar otro mientras existe y rechazar también una segunda creación en el servidor local. Ofrecer reintento de carga y distinguir los mensajes de escritura completada con lista pendiente de actualizar. Los editores v4 revisados bloquean confirmar cuando el contenido visible difiere del borrador guardado.

**Prevención.** Mantener pruebas de continuidad del editor y de estados de error, además de comprobar en una prueba funcional que el borrador recargado conserva su ID. Una respuesta HTTP fallida nunca debe representarse como ausencia de datos pedagógicos.

## 2026-09-22 Consulta de experiencias devolvía HTTP 500

**Síntoma.** Planificar → Experiencias mostraba un error de carga; `GET /api/learning-experiences` devolvía 500 con el aula local configurada.

**Causa raíz.** La consulta ordenaba por `created_at`, columna que no existe en `learning_experiences` según las migraciones locales. Además, la lista mezclaba filas legacy de proyecto y taller sin el esquema v4, capaces de abrir un editor v4 incompleto.

**Solución validada localmente.** Ordenar por `starts_on` e `id`; comprobar la consulta contra todas las migraciones en PGlite y verificar HTTP 200 en el servidor local. Los editores de Project/Unit y Activity muestran solamente experiencias v4 compatibles y dejan los registros históricos para sus flujos legacy.

**Prevención.** Ejecutar consultas de rutas críticas contra el esquema real migrado en tests, y filtrar por contrato antes de abrir editores tipados.

## 2026-09-22 Validación y unicidad incompletas del Plan Anual

**Síntoma.** El servidor local aceptaba una propuesta anual editada con listas malformadas, competencias no aplicables o año escolar distinto, y podía confirmar ese borrador. Dos solicitudes de creación simultáneas podían superar la comprobación de borrador existente.

**Causa raíz.** La validación del modelo comprobaba solo parte de `annual-plan-v1` y no se reutilizaba en el límite de persistencia. La unicidad del borrador dependía de una consulta previa sin constraint de base de datos.

**Solución validada localmente.** Un contrato compartido valida campos, elementos de listas, experiencias, año y competencias aplicables en generación, guardado y confirmación. Migraciones nuevas local y Supabase crean un índice único parcial para el borrador por aula/año. La suite ensaya casos malformados y la restricción en PGlite; Supabase real sigue sin probarse.

**Prevención.** Mantener el contrato como fuente única y probar tanto el rechazo semántico antes de persistir como el constraint ante escrituras concurrentes. Revisar duplicados antes de aplicar la migración a una base existente.

## 2026-09-22 Avance visual confundía visitas con trabajo terminado

**Síntoma.** La navegación entre pantallas podía parecer un progreso completado aunque no existiera un plan, experiencia o actividad confirmada. Tras recargar, la docente debía averiguar dónde estaba su borrador.

**Causa raíz.** El estado de la secuencia se infería de la pestaña abierta y no de los registros guardados.

**Solución validada localmente.** Un resolver consulta plan, experiencias y actividades del servidor; distingue pendiente, borrador y confirmado y abre el paso recomendado al entrar en Planificar. Las pruebas cubren borradores, registros confirmados y exclusión de planes anteriores.

**Prevención.** Las marcas de progreso y la siguiente acción deben derivarse de datos persistidos. Una pantalla visitada no equivale a una etapa pedagógica terminada.

## 2026-09-22 Continuación de evaluación desaparecía al recargar

**Síntoma.** Después de confirmar un análisis o conclusión aparecía una tarjeta para continuar, pero al recargar esa recomendación desaparecía aunque el registro siguiera confirmado. Un perfil con evidencias legacy podía sugerir un análisis v4 que no estaba disponible.

**Causa raíz.** La tarjeta dependía de un estado temporal del componente y la recomendación del perfil contaba evidencias sin distinguir su contrato curricular.

**Solución validada localmente.** Mostrar la continuación a partir de análisis y conclusiones confirmados recuperados del servidor. Un resolvedor puro clasifica cada competencia por registros v4, cantidad de evidencias y confirmaciones; las evidencias legacy no ofrecen acciones v4. Las pruebas cubren prioridad, ausencia de datos y determinismo.

**Prevención.** Las acciones posteriores a una confirmación deben renderizarse también al reabrir el registro. Validar aplicabilidad de la acción con datos reales antes de mostrarla.

## 2026-09-22 El plan anual mostró un error de actividad tras una espera larga

**Síntoma.** Al preparar el primer borrador anual, la pantalla Planificar terminó mostrando «No pudimos preparar la actividad». El motivo concreto de esa solicitud anterior no se puede reconstruir porque la respuesta solo incluía un mensaje genérico.

**Causa raíz comprobada.** El servicio del plan anual reutilizaba el traductor de errores de Activity. Además, el cliente OpenAI conservaba los dos reintentos automáticos del SDK con un plazo de 30 segundos por intento, por lo que un fallo transitorio o un timeout podía prolongar la espera sin explicar qué ocurrió.

**Solución validada localmente.** El plan anual tiene mensajes propios, clasificación segura en su respuesta HTTP y una indicación visible durante la espera. El provider realiza una sola solicitud por clic, y el plan anual permite hasta 90 segundos para generar una propuesta amplia. Pruebas con mocks cubren clasificación, plazo y ausencia de reintentos; la preparación del contexto del aula local pasó sin llamar al modelo.

**Prevención.** No reutilizar mensajes de otro workflow. Mantener motivo seguro en errores de generación y probar el comportamiento del SDK ante reintentos y plazos sin hacer llamadas reales en la suite.

**Actualización 2026-09-23.** El plan anual rediseñado realiza dos llamadas secuenciales sin reintentos: plan maestro y desarrollo del documento. Cada una dispone de hasta 180 segundos; la pantalla avisa que la espera puede durar varios minutos. Los fallos de cualquiera de las etapas no crean un borrador y conservan una categoría segura para la docente. Esta actualización sustituye el plazo anterior de 90 segundos para este workflow.
# Plan anual antiguo descargado con numerosos campos «Pendiente de completar» (2026-09-23)

- **Síntoma:** el Word de un plan activo anterior mostraba cuadros vacíos para fortalezas, necesidades, intereses y competencias, además de párrafos densos de prioridades.
- **Causa:** ese plan se guardó antes de confirmar el diagnóstico grupal y su propuesta histórica no tenía IDs de competencias; la plantilla interpretaba cada campo ausente como una tarea manual pendiente.
- **Solución validada:** la proyección de descarga recupera datos grupales confirmados para campos ausentes del plan activo, y la plantilla omite apartados que todavía carecen de fuente real. Las experiencias se muestran de forma compacta, los bimestres son la organización predeterminada y se evita duplicar decisiones. El archivo se abrió en Word y las pruebas comprueban que no aparece la frase «Pendiente de completar por la docente».
- **Prevención:** pruebas de exportación con propuestas v1 sin competencias ni diagnóstico en su snapshot, además de revisión visual del Word tras cambios de plantilla.

## 2026-09-23 El Word rediseñado conservaba frases genéricas de la plantilla

**Síntoma.** En una prueba de 26 páginas, la síntesis decía que se había construido a partir de entrevistas y observaciones sin distinguir sus funciones; el cierre mencionaba unidades y sesiones aunque el plan nuevo contiene proyectos y actividades. Cuando un proyecto tenía una sola competencia aparecía la frase de relleno «Se prioriza la competencia eje».

**Causa raíz.** Word dividió una frase entre varios elementos de texto XML, por lo que un reemplazo literal no la encontró. La plantilla también contenía texto editorial fijo y el renderizador completaba la competencia de soporte ausente con una explicación redundante.

**Solución validada.** El renderizador sustituye la frase completa por párrafo, distingue la entrevista como contexto de la observación docente, ajusta el cierre a proyectos y actividades y omite la línea de soporte cuando no existe otra competencia. Una prueba descarga el plan desde un registro guardado y verifica autorización y ausencia de placeholders. El Word se abrió de nuevo con textos más largos y mantuvo 26 páginas legibles.

## 2026-09-23 Encabezado duplicado, UGEL ausente y proyectos de muestra repetidos

**Síntoma.** La vista previa Word mostraba dos franjas de encabezado, «UGEL: No registrada» pese a existir en Ayni y veinte proyectos casi idénticos que solo cambiaban de número.

**Causa raíz.** La plantilla traía una franja en el encabezado de página y otra en la portada; además repetía el título de desarrollo en cada ficha. La vista previa ficticia se creó sin perfil institucional y con un fixture repetitivo. La proyección de un borrador tampoco completaba campos institucionales vacíos desde el perfil actualizado.

**Solución validada.** Se deja una franja solo en portada y un título de desarrollo en la primera ficha; el Word carga logo y UGEL del perfil autorizado cuando faltan en el borrador. Los cuadros diagnósticos pasan a frases completas basadas en datos confirmados. El contrato rechaza títulos numerados y repeticiones excesivas de situaciones, motivos, propósitos y productos. Una nueva vista previa con veinte proyectos diferentes se abrió en Word y se revisó en 26 páginas, con el logo y la UGEL locales. Las pruebas automatizadas usan providers simulados.

## 2026-09-23 Fechas SQL y desbordamiento del Word detectados en prueba real

**Síntoma.** El primer intento de prueba del plan anual se detuvo antes del modelo con `calendar_invalid`. Después de normalizar fechas, la generación real funcionó, pero el Word puso prioridades en una página casi vacía y desplazó la firma a otra página.

**Causa raíz.** PGlite entrega fechas SQL como objetos `Date` y la agenda esperaba `AAAA-MM-DD`. En la exportación, listas extensas del modelo se volcaron completas en celdas con espacio limitado y repitieron información ya visible. Un campo de flexibilidad incluso decía que las fechas aún no estaban calculadas.

**Solución validada.** El contexto del servidor normaliza los días en UTC antes de generar y guardar el snapshot. La exportación resume prioridades y contexto, usa indicaciones breves para evaluación y flexibilidad, y completa orientaciones diarias desde estrategias existentes cuando el modelo no propone enfoques. La propuesta completa sigue en el borrador. La prueba real hizo dos llamadas previstas, una por etapa, produjo veinte títulos y productos distintos, y el Word revisado se abrió en 27 páginas sin hojas casi vacías. No se guardó ni confirmó un plan nuevo.

**Prevención.** Comprobar frases visibles en el DOCX generado y revisar visualmente las páginas de diagnóstico, proyecto y cierre, además de validar que no queden campos de plantilla.

## 2026-09-23 Veinte proyectos de diez días ignoraban semanas no lectivas

**Síntoma.** El plan trataba la adaptación como el primer proyecto y asignaba fechas a veinte proyectos de diez días aunque los periodos lectivos de 2026 no daban espacio para ese recorrido. Podía mostrar días de gestión o interrupciones como parte de un proyecto.

**Causa raíz.** El contrato exigía veinte proyectos y un cálculo por días de lunes a viernes entre los límites generales del año; no distinguía los cuatro bloques lectivos, la gestión, las excepciones ni la etapa diagnóstica.

**Solución.** Las nuevas generaciones usan doce propuestas y una etapa inicial independiente. Un planificador determinista ocupa dos o tres semanas lectivas, con cierre en viernes, dentro de cuatro bloques. Excluye semanas enteramente interrumpidas; un feriado de un día conserva el resto de la semana, pero no permite comenzar o cerrar en un día sin clases. Falla antes de llamar a IA cuando el calendario no permite completar el plan. Se guardan los slots calculados y se revalidan al confirmar. Los planes históricos siguen disponibles.

**Prevención.** Pruebas del calendario oficial 2026, gestión, suspensiones y feriados, duración editable y compatibilidad del formato anterior. Revisar visualmente el Word después de cambiar su plantilla.

## 2026-09-23 Word diagnóstico inválido al ocultar el logo ausente

**Síntoma.** Microsoft Word informó que una vista previa `.docx` parecía corrupta, aunque todos sus XML eran bien formados.

**Causa raíz.** Al no existir logo institucional, el renderizador eliminaba el párrafo completo que contenía el dibujo. La celda de portada quedó sin su párrafo obligatorio en WordprocessingML.

**Solución validada.** Se conserva el párrafo y se retira solo el nodo del dibujo. El documento sin logo se abrió en Word y se exportó a PDF; el caso también tiene prueba automatizada. La revisión visual detectó una firma aislada y un cuadro dividido por saltos, por lo que la plantilla derivada conserva los saltos de sección originales y omite el bloque de firma que no corresponde a un dato confirmado.

## 2026-09-23 Bloques pegados en los Word diagnóstico y anual

**Síntoma.** En el informe diagnóstico, la tabla de competencias terminaba pegada al título de prioridades. En el plan anual, el cuadro de periodos tocaba el título del cronograma y las fichas tenían poco espacio interno.

**Causa raíz.** Los bloques consecutivos son tablas de Word sin un párrafo separador. La plantilla también usa interlineado y márgenes internos muy compactos. Un primer aumento global de márgenes hizo que el cronograma de doce filas se partiera, por lo que no era apropiado para todos los cuadros.

**Solución validada.** Se añadieron espacios cortos entre los bloques afectados y se amplió solo el relleno de las fichas y la etapa inicial; se dejó compacto el cronograma. Cuando la tabla diagnóstica tiene al menos diez competencias, el título de decisiones comienza en la página siguiente junto con su contenido. Los documentos ficticios se abrieron en Microsoft Word y se exportaron a PDF para revisar la página diagnóstica y las páginas de calendario y proyecto. El plan conserva sus doce filas en una página y sus 17 páginas totales.

## 2026-09-23 La descarga Word no se iniciaba desde Documentos

**Síntoma.** La app mostraba el plan anual guardado y el botón de descarga, pero al pulsarlo el navegador integrado no guardaba ningún archivo ni mostraba un error.

**Causa raíz.** El cliente recuperaba correctamente el DOCX mediante `fetch`, pero intentaba descargarlo con un enlace temporal `blob:` creado y pulsado por JavaScript. Ese gesto no produjo un evento de descarga en el navegador integrado. El endpoint autorizado sí devolvía el Word completo.

**Solución.** Documentos presenta ahora un enlace de descarga normal a la ruta autorizada del servidor, con `download` y `Content-Disposition: attachment`; ya no depende de un objeto `blob:` ni de un clic programático. La ruta real del plan guardado respondió HTTP 200 con un DOCX de 385364 bytes, que se dejó también en Descargas para acceso inmediato. Typecheck, lint, build y las 16 pruebas de documentos pasaron. El navegador integrado aún no mostró un evento de descarga verificable al pulsar el enlace; debe comprobarse el guardado desde un navegador estándar antes de dar por resuelto ese entorno.

**Cierre del caso en el navegador integrado.** Un enlace HTTP de descarga tampoco guardó el archivo allí. Como la profesora usa la misma computadora que ejecuta el servidor local, Documentos incorpora «Guardar Word en Descargas»: la ruta POST vuelve a autorizar el documento, genera el Word y lo escribe en la carpeta Descargas del usuario del proceso. Reutiliza el archivo si el contenido es idéntico y nunca sobrescribe una versión distinta. La interfaz muestra el nombre guardado; la prueba funcional desde el navegador integrado mostró «Word guardado en Descargas: plan-anual-2026-8a16fde6-3.docx» y se verificó que el archivo de 385364 bytes existe. El enlace HTTP permanece como opción para otros dispositivos.

## 2026-09-23 Un plan anterior seguía descargándose con la plantilla antigua

**Síntoma.** Después de habilitar la descarga, la profesora obtuvo un plan de seis experiencias con el diseño y los textos antiguos, aunque el generador actual ya preparaba doce propuestas.

**Causa raíz.** La descarga transforma el plan guardado según su `plan_format`; el plan confirmado de 2026 no tenía este campo y conservaba la propuesta antigua. El arreglo de descarga solo hizo accesible ese mismo archivo. La interfaz y los índices impedían crear un borrador nuevo mientras existía el plan activo.

**Solución validada.** Se permite una sola versión activa y un solo borrador por año escolar. La docente puede preparar una versión actualizada del plan histórico; el servidor comprueba el aula, año, ID activo, formato anterior y generación antes de guardar. La versión anterior sigue vigente hasta confirmar la nueva. Una generación real con dos llamadas a IA produjo doce proyectos distintos y se guardó como borrador v2; el plan v1 permanece activo. Documentos avisa cuando se abre un plan anterior. Typecheck, lint, build y pruebas del plan y documentos pasaron.

**Revisión del Word.** Microsoft Word mostró páginas vacías causadas por saltos al final de tablas llenas. El exportador eliminó los saltos redundantes antes de las secciones III, V y VII y el salto posterior al primer proyecto; también abrevia una nota de ajuste solo en el Word. El borrador revisado se abrió en Word y se exportó a PDF de 17 páginas, sin páginas vacías; portada, cronograma y fichas se inspeccionaron visualmente. Para prevenir la regresión, verificar paginación real además de contratos y marcadores XML.

## 2026-09-24 Contexto de otra edad y residuos de plantilla en DOCX unificados

**Síntoma.** El paquete de currículo podía incluir focos de edades distintas a la del aula. Las plantillas nuevas traían una imagen de logo de ejemplo, instrucciones editoriales y saltos de página que producían páginas casi vacías. La plantilla de actividad conservaba un encabezado de Planificación Anual.

**Causa raíz.** El constructor reenviaba la propiedad `ages` completa de la tarjeta CNEB. Los marcadores de Word estaban resueltos, pero imágenes, encabezados y saltos son partes independientes del OOXML.

**Solución validada.** El paquete de IA limita `ages` y la selección por edad antes de llamar al proveedor. El exportador retira la imagen de ejemplo, inserta el logo institucional autorizado cuando existe, corrige el encabezado y elimina saltos redundantes en la copia generada. Los cuatro DOCX se abrieron en Microsoft Word y se exportaron a PDF para inspección visual. Las pruebas comprueban la proyección de edad, los marcadores, la privacidad nominal y las rutas de datos heredados.

## 2026-09-24 La actividad con una observación dejaba una página casi vacía

**Síntoma.** La nueva plantilla de actividad generaba cinco páginas con un solo registro; la reflexión docente terminaba sola en la última.

**Causa raíz.** El exportador insertaba textos genéricos de síntesis y ajustes en filas de la sección VII aunque la docente no los había escrito. Estas filas empujaban el cierre real a otra página.

**Solución validada.** Se omiten esas filas y la instrucción editorial de la sección VI en la copia generada. La reflexión se muestra solo si existe un cierre docente guardado. El mismo ejemplo quedó en cuatro páginas tras abrirlo y exportarlo con Microsoft Word; se inspeccionó la última página y las pruebas comprueban que el registro nominal y su criterio proceden de la base. Para prevenirlo, renderizar tanto una actividad sin observaciones como otra con observaciones y revisar la paginación.

## 2026-09-24 Proyectos de un plan sustituido desaparecían del recorrido

**Síntoma.** Al pasar a una nueva versión anual, `planning-journey` solo contaba experiencias cuyo `annual_plan_id` coincidía con el plan vigente. Además, el servidor exigía que el plan padre siguiera activo al confirmar un proyecto borrador.

**Causa raíz.** Una misma condición se usaba para dos preguntas distintas: qué propuestas sirven para trabajo nuevo y qué proyectos ya existen. Archivar un plan no invalida sus proyectos ni la procedencia del borrador.

**Solución y prevención.** El recorrido incluye experiencias guardadas vinculadas a cualquier versión del aula; la UI muestra su versión de origen. La generación de trabajo nuevo sigue leyendo solo el plan vigente, mientras guardar una generación ya iniciada y confirmar un borrador validan su propuesta contra el plan padre activo o histórico. Una prueba con V1, V2 y proyectos de ambos estados comprueba que no se reasignan ni desaparecen.

## 2026-09-24 Archivar un proyecto ocultaba sus actividades anteriores

**Síntoma.** La selección de actividades y su consulta exigían que el proyecto o unidad padre estuviera activo. Al confirmar una nueva versión, las actividades ligadas a la versión anterior dejaban de verse o de poder terminarse.

**Causa raíz.** La misma condición `status='active'` se usaba para iniciar actividades nuevas y para leer o terminar las ya existentes. La base local tampoco tenía `updated_at` en `learning_experiences`, a diferencia del esquema remoto.

**Solución validada.** La ruta de creación conserva el requisito de versión vigente. La consulta de actividades y la edición o confirmación de borradores existentes admiten un padre histórico; la pantalla lo identifica y oculta el formulario para crear actividades nuevas allí. La transición de versión local cambia solo el estado, compatible con ambos esquemas. Las pruebas persisten V1, V2 y una actividad que conserva su `experience_id` original.

## 2026-09-24 Confirmación de Criterio V2 respondía sin la fila confirmada

**Síntoma.** El servidor completaba la confirmación de Criterio V2, pero enviaba una respuesta vacía al navegador.

**Causa raíz.** `confirmCriterionVersion()` ya devuelve la fila confirmada; la ruta intentaba leer `result.rows[0]` como si recibiera el objeto de consulta de PostgreSQL.

**Solución y prevención.** La ruta envía directamente la fila devuelta. La prueba de servicio de Criterio V2 y el recorrido integrado comprueban el estado confirmado y la permanencia del `criterion_id` de las evidencias históricas. Al integrar servicios, revisar su contrato de retorno además del efecto en la base.
## 2026-09-24 Un selector de recurso confundía la ruta de importación

**Síntoma.** La prueba HTTP con Auth devolvía 404 al importar alumnos, aunque la docente estuviera autenticada.

**Causa raíz.** La autorización previa interpretaba `/api/students/import` como si `import` fuese un ID de alumno.

**Solución y prevención.** La ruta reservada se excluye del analizador de IDs. La prueba HTTP crea dos aulas, importa un alumno y comprueba accesos propios y cruzados antes de considerar completo un cambio en el límite común.

## 2026-09-25 Typecheck fallaba después del build de vinext

**Síntoma.** `npx tsc --noEmit` pasaba antes de compilar, pero después del build señalaba que `AppRoutes`, `LayoutRoutes` y `ParamMap` no existían en `.next/types/routes.d.ts`.

**Causa raíz.** Quedó un `validator.ts` generado por Next.js junto a los tipos de rutas generados por vinext. El validador esperaba exportaciones del generador anterior.

**Solución y prevención.** `tsconfig.json` excluye únicamente los validadores generados por Next.js, incluidos los de desarrollo; conserva los tipos de rutas de vinext. Verificar typecheck también después del build.

## 2026-09-25 El diagnóstico parecía evidencia de la valoración del período

**Síntoma.** La matriz mostraba una observación diagnóstica y la ficha de evaluación indicaba cero evidencias, sin explicar que se trataba de fuentes diferentes.

**Causa raíz.** La cobertura podía contar observaciones diagnósticas como registros de seguimiento, mientras la valoración del período solo leía evidencias de actividades. La interfaz llamaba “registros” a ambas cifras.

**Solución y prevención.** La ficha y el historial muestran los antecedentes diagnósticos separados de las evidencias del período; la matriz identifica cada fuente en sus dos vistas. El antecedente permanece fuera del cálculo de la valoración y su huella de confirmación. Las pruebas cubren antecedente sin evidencia y antecedente con evidencias. Revisar siempre los textos de conteo junto con la procedencia del dato.

## 2026-09-25 Las sugerencias de observación quedaban desactualizadas tras guardar

**Síntoma.** “Podrías observar hoy” seguía mostrando el motivo anterior hasta recargar la página.

**Causa raíz.** Las sugerencias se consultaban solo al abrir la actividad, sin depender de los registros nuevos.

**Solución y prevención.** Cada guardado incrementa una revisión de evidencias y vuelve a consultar las sugerencias. Mientras llega la respuesta, se oculta la lista anterior para no presentar motivos obsoletos. En una prueba aislada, Diego pasó de “Aún no tenemos registros” a “Solo tenemos registros de una situación” sin recargar la página.

## 2026-09-25 Los tests de documentos no creaban la tabla de desarrollo formal

**Síntoma.** La consulta de un Plan Anual histórico falló en pruebas con `relation annual_plan_formal_content does not exist`.

**Causa raíz.** Tres fixtures construían un esquema mínimo manual y no incluían la tabla aditiva que ahora se consulta para encontrar el Word derivado.

**Solución y prevención.** Se añadió la tabla mínima a esos fixtures y se repitieron las suites de Word y Documentos. Cuando una lectura canónica incorpore una tabla nueva, revisar también los esquemas mínimos de sus pruebas además de la paridad de migraciones.

## 2026-09-26 Los planes históricos no podían iniciar el nuevo flujo de proyecto

**Síntoma.** Las doce propuestas se mostraban, pero al desarrollar una perteneciente a un plan anterior la API respondía que no pertenecía al Plan Anual.

**Causa raíz.** Los planes históricos tienen filas por posición y espacios de calendario, pero no `proposal_id`. El flujo nuevo usaba únicamente ese identificador. Además, la primera migración de retrocompatibilidad contenía una expresión regular incompleta para una de las actualizaciones y ya había sido aplicada localmente.

**Solución y prevención.** El servidor acepta el ID estable de `project_slots` para planes históricos y conserva el índice de origen. La interfaz normaliza ambos formatos. Se añadió una migración posterior que corrige el backfill sin editar la migración aplicada. Una prueba real con API creó contexto, propósitos, preguntas, criterios y un mapa de ocho actividades a partir del plan histórico vigente.

## 2026-09-26 Un ejemplo de contexto válido era rechazado por longitud

**Síntoma.** Luna devolvía una vista previa estructurada válida, pero la API respondía «No pudimos preparar las opciones del proyecto».

**Causa raíz.** El contrato de salida permitía texto, mientras la validación posterior limitaba el ejemplo opcional a 250 caracteres. La respuesta real tenía 298 caracteres y el mensaje no distinguía esa causa.

**Solución y prevención.** El límite del ejemplo se alineó con el uso visible a 500 caracteres y se mantuvieron límites estrictos para contexto y propósitos. La misma llamada real pasó después del ajuste.

## 2026-09-26 La migración del calendario intentaba modificar actividades confirmadas

**Síntoma.** Al aplicar la nueva migración sobre una base con actividades confirmadas, el backfill de `planned_date` era rechazado por el trigger de inmutabilidad.

**Causa raíz.** El nuevo campo se intentó completar mediante un `UPDATE` general. El trigger protege correctamente todo cambio en una actividad confirmada y no distingue un backfill histórico de una edición pedagógica.

**Solución validada.** La migración deja `planned_date` nulo en actividades históricas y la lectura usa `occurs_on` como respaldo. Las actividades nuevas guardan ambos campos desde su creación. El trigger actualizado solo admite cambios auditados de fecha y estado de ejecución; título, propósito, contenido y relación pedagógica continúan inmutables. La paridad local/Supabase, la copia de versiones y los casos históricos pasaron sus pruebas.

**Prevención.** Las migraciones aditivas no deben reescribir filas confirmadas cuando el valor puede derivarse de forma segura. Probar siempre una base con documentos históricos antes de dar por válida una migración.

## 2026-09-26 El análisis individual incluía una recomendación de AD/A/B/C

**Síntoma.** El contrato anterior del assessment pedía `suggested_level` y la misma generación preparaba texto de conclusión antes de que la profesora confirmara su valoración. Esto mezclaba análisis de evidencias, juicio docente y comunicación final.

**Causa raíz.** El flujo trataba el nivel sugerido y la conclusión como campos auxiliares del borrador, aunque AD/A/B/C corresponde exclusivamente a la decisión docente sobre el conjunto de evidencias.

**Solución validada.** `assessment-v3` elimina los campos de nivel del schema y el validador rechaza cualquier campo adicional. La profesora guarda y confirma su valoración sin preselección; después se habilita una llamada separada para la conclusión, ligada mediante snapshot a la valoración confirmada. Cero evidencias detiene el flujo antes del proveedor. Las pruebas comprueban que la salida de IA no contiene letras, que la conclusión requiere valoración y que evidencia nueva exige revisión.

**Prevención.** Mantener análisis, valoración y conclusión como etapas y contratos separados. Cualquier modelo futuro para assessment debe pasar el schema estricto sin campos de calificación.

## 2026-09-26 La extensión de KB traía ámbitos incompatibles con el runtime vigente

**Síntoma.** Algunas unidades v4.1 contenían `content` como lista y `workflow_scope` con nombres de áreas (`science`, `mathematics`, `personal_social`) o el workflow antiguo `materials`. La validación estricta rechazaba el corpus fusionado.

**Causa raíz.** El paquete fue preparado para una matriz anterior de 13 workflows; Ayni ya tiene 16. Un ámbito de área no es un workflow.

**Solución validada.** Se normalizaron las listas como texto y los ámbitos por los IDs vigentes, con `materials` mapeado a `material_generation`. El loader valida todo ámbito contra el registro actual y la suite recorre las unidades nuevas.

**Prevención.** Compilar extensiones contra los contratos del repositorio en HEAD y validar los IDs antes de activar una versión de KB.

## 2026-09-26 Una fuente de 5 años podía aparecer al recuperar didáctica para 3 años

**Síntoma.** Una unidad transversal con alcance 3–5 referenciaba una guía específica para 5 años y podía enviarse al modelo en un contexto de 3 años.

**Causa raíz.** El filtro por edad miraba `age_scope` de la unidad pero no la compatibilidad de las fuentes adicionales.

**Solución validada.** En la compilación v4.1 se retiraron de cada unidad las referencias de fuentes incompatibles con su edad; cuando todas las fuentes eran específicas, se restringió el alcance de la unidad. Un caso de retrieval de 3 años verifica la exclusión.

**Prevención.** Validar edad de unidad y procedencia de cada fuente al fusionar corpus nuevos.

La revisión del corpus completo detectó además dos resúmenes de fuentes de lectura/escritura de v4.0 con `competency_id` nulo y sin ámbito de competencia. En v4.1 se les añadieron `COM_LECTURA` y `COM_ESCRITURA` como IDs aplicables, sin tocar v4.0. La prueba de integridad verifica ahora que todas las referencias con condición de edad o competencia la respeten.

## 2026-09-26 El ordenamiento de unidades generales podía producir NaN

**Síntoma.** Para una competencia confirmada, ciertas unidades generales sin `applicable_competency_ids` recibían `NaN` en la puntuación y alteraban el ranking.

**Causa raíz.** `Number(undefined)` se aplicaba al resultado de una comprobación opcional.

**Solución validada.** La comprobación se convierte primero a booleano y luego a número. Las pruebas de recuperación y contexto para competencias confirmadas pasan con orden determinista.

**Prevención.** Exigir puntuaciones finitas para metadatos opcionales en nuevos componentes del ranking.

## 2026-09-26 La normalización de líneas de Git podía invalidar el manifest de la KB

**Síntoma.** El loader validaba los hashes del árbol de trabajo, pero algunos blobs preparados para el commit tenían bytes diferentes. En Windows, Git podía convertir finales de línea al preparar o extraer archivos.

**Causa raíz.** El manifest verifica SHA-256 de bytes exactos y la nueva carpeta no tenía una política de finales de línea.

**Solución validada.** Se normalizaron los archivos de v4.1 a LF y `.gitattributes` fija `eol=lf` solo para esa versión. Una comprobación independiente leyó los 80 blobs del índice de Git y comparó cada hash con el manifest; todos coincidieron.

**Prevención.** Comprobar integridad tanto en el árbol de trabajo como en el índice antes de confirmar nuevas versiones de KB.

## 2026-09-26 La finalización de escenas intentó duplicar tres metadatos

**Síntoma.** Al procesar la primera colección, tres escenas de muestra con nombres de archivo cortos recibieron un segundo JSON con el mismo ID.

**Causa raíz.** El script comprobaba únicamente si existía un JSON con el nombre derivado del ID; las muestras ya tenían JSON homónimos de sus JPEG, pero esos nombres eran diferentes.

**Solución validada.** El finalizador carga primero todos los metadatos existentes y omite cualquier ID ya catalogado. Se retiraron los tres duplicados creados por el intento y el constructor del índice validó 61 IDs únicos.

**Prevención.** Comprobar unicidad por ID y ruta en el constructor del índice; conservar nombres de JPEG y JSON homónimos aunque el ID sea más largo.

## 2026-09-27 H28: evidencia del taller confirmado rechazada

**Síntoma.** Registrar una nota de un taller confirmado devuelve que su criterio no coincide con la competencia; los IDs sí coinciden.

**Causa raíz.** El guard exigía `competency_status`, presente en activity-v1 pero ausente por contrato en workshop-v1. La confirmación atómica ya había confirmado el taller y su propio criterio.

**Solución validada.** El guard reconoce la confirmación del taller exclusivamente desde columnas del join autorizado (tipo, fecha de confirmación, actividad vinculada, índice e igualdad de competencia). Rechaza borradores, competencias distintas y estados explícitamente no confirmados. 15/15 pruebas relacionadas, typecheck, lint y build PASS. Sin cambio de esquema o notas históricas; la repetición UI queda registrada en el informe E2E.

**Prevención.** Probar el recorrido persistir → confirmar par diario → admitir criterio para evidencia, no solo que existan los dos bloques en Hoy.

## 2026-09-27 H29: maestro de talleres con plazo demasiado breve

**Síntoma.** Preparar diez sugerencias de taller termina en timeout sin guardar una propuesta.

**Causa raíz.** El workflow largo de Sol heredaba el plazo predeterminado de 30 segundos del proveedor, mientras las demás planificaciones usan 120/180 segundos.

**Solución validada.** Solo `generateWorkshopMaster` recibe 180 segundos; modelos, reintentos, validaciones y talleres diarios se conservan. 20/20 pruebas relacionadas, typecheck, lint y build PASS. El intento sin usage se registra como costo desconocido, no cero.

**Prevención.** Comprobar las opciones de proveedor de cada workflow largo, además del modelo y de la forma de salida.
## 2026-09-28 — Criterio de otra competencia al confirmar actividad con dos competencias

Síntoma: guardar evidencia falla porque actividad principal y criterio heredado tienen IDs diferentes. Causa: mapa mezcla primer elemento de `competency_ids` con `criterion_competency_id`. Solución: principal canónica del mapa deriva del criterio; herencia respeta el ID visible confirmado de la actividad. Recuperación docente explícita confirma un criterio alineado y archiva el incompatible solo si no tiene evidencias. Se preservan IDs, notas e históricos. Validación: 27/27 relacionadas, typecheck/lint/build; UI pendiente en H30 del registro de correcciones. Prevención: regresiones de mapa con dos IDs y persistencia SQL, no solo casos monocompetencia.

## 2026-09-28 — Corrección docente de valoración confirmada inaccesible

Síntoma: el campo de análisis confirmado permitía escribir pero no ofrecía guardar una revisión. Causa: la UI ocultaba las acciones ante cualquier nivel previo; el modelo priorizaba la valoración activa sobre un nuevo borrador. Solución: iniciar revisión por el endpoint existente, campo confirmado solo lectura, borrador prioritario, huella/progreso sensibles a revisión y conclusiones bloqueadas hasta reconfirmar. Historial anterior conservado/archivado, no reescrito. Validación: dos regresiones antes fallidas; 29/29 relacionadas y typecheck/lint/build PASS. Prevención: probar corregir interpretación sin cambiar evidencias, no solo evidencias nuevas. UI en H41 del registro E2E.

## 2026-09-28 — Feedback para planificar omite niveles y competencias valoradas

Síntoma: Evaluar contiene necesidad mayoritaria B y fortalezas A, pero Planificar solo muestra ausencias y cinco competencias iniciales. Causa: agregación por coincidencia literal de frases de IA y truncamiento posicional; decisiones manuales no aportaban arrays. Solución: distribución docente determinista, pendientes y registros reales del período, competencias valoradas primero y sin recorte arbitrario; una necesidad individual no se generaliza. 26/26 relacionadas y typecheck/lint/build PASS. Prevención: comprobar integración de decisiones manuales y fortalezas fuera de primeros IDs. UI en H40 E2E.

## 2026-09-28 — Nombres de compañeros en copia de evaluación para proveedor

Síntoma: conclusión e informe familiar repiten un nombre de compañero citado en los registros. Causa: sanitización conocía solo al niño evaluado. Solución: tras autorización, obtener nombres del mismo aula y neutralizarlos en copia para assessment/conclusión/familia, incluidas variantes sin tildes. No se reescriben fuentes ni historial. Regresiones con SQL y nombres de pares: 56/56 relacionadas, 3/3 focales finales, typecheck/lint/build PASS. Prevención: incluir compañeros en pruebas de privacidad; no afirmar anonimización universal de nombres desconocidos. UI en H43 E2E.

## 2026-09-28 — El nuevo flujo de proyecto/unidad ignoraba las evaluaciones elegidas

Síntoma: resumen P1 visible y opt-in marcado, pero preview P2 solo describe el diagnóstico inicial. Causa: el componente nuevo y sus tres rutas no transportaban/cargaban el período, a diferencia del flujo legado. Solución localizada: opt-in explícito, autorización de período en servidor, snapshot agregado conservado entre preview/decisiones/master e instrucciones que distinguen datos actuales del diagnóstico. Un preview sin decisiones puede actualizarse por UI y revisión optimista; un mapa/confirmado no se borra. Validación inicial: 4 regresiones rojas, 19/19 relacionadas verdes, typecheck/build PASS; logs y repetición UI en H45. Prevención: probar el input del proveedor desde el flujo actualmente visible, no solo el resumen agregado o el generador legado.

## 2026-09-28 — Captura de evidencia con pie fuera de pantalla

Síntoma: criterio extenso deja los botones fuera del viewport y el cuerpo no se desplaza. Causa: diálogo sin altura máxima ni scroll interno. Solución: flex, máximo 90dvh, cuerpo desplazable y cabecera/pie no contraíbles. 22/22 relacionadas, typecheck/lint/build PASS; guardado real por clic en QA. Prevención: probar criterios completos, no solo una línea. H46, commit 5d98048.

## 2026-09-28 — Evidencia capturada al alumno equivocado sin recuperación por UI

Síntoma: cuatro notas QA de la captura automatizada quedaron asociadas a la selección anterior. Causa de esa selección no reproducida; limitación confirmada: ninguna acción de corregir alumno. Solución mínima: reasociación docente de notas sin media/sin evaluación afectada, misma aula y propiedad verificadas, motivo e historial, revisión optimista/bloqueo de período y refresco de ambos contextos. 25/25 relacionadas, typecheck repetido/lint/build PASS; cuatro correcciones UI y conciliación 10/10. Prevención: conciliar alumno-texto-fecha después de captura, no solo contar filas; no corregir QA con SQL. H47, commit 919e381.

## 2026-09-28 — H34 exigía letras por competencias solo previstas

**Síntoma.** P1–P4 mostraban como obligatorios pares alumno–competencia nacidos de «Mi año» o de criterios aún no trabajados. El cierre pedía letras/conclusiones incluso sin evidencia suficiente.

**Causa raíz.** El `scope` mezclaba planificación con ejecución y el manifiesto aceptaba únicamente filas calificadas. La interfaz de reajuste heredaba esa misma exigencia.

**Solución validada.** Alcance basado en trabajo real, estados pendientes explícitos sin letra, cierre intermedio con `pending_entries`, cierre anual con comprobación de valoraciones vigentes de todos los pares aplicables, salidas separadas y seguimiento posterior. Un borrador docente también preserva el alcance y no puede ocultarse retirando la competencia. 38/38 pruebas focales, typecheck, lint y build PASS; P1/P2 cerraron por UI QA, P3 por API QA, P4 rechazó 163 pares nunca valorados. La interfaz no permite pulsar P3/P4 antes de su fecha de fin real; no se modificó esa guarda. Ver `docs/qa/end-to-end-audit-2026/21_H34_FASE_1.md`.

**Prevención.** Probar previstas sin trabajo, pendientes con/sin evidencia, las cuatro letras, huella tras evidencia posterior, los cuatro períodos, Excel y seguimiento; mantener la decisión de nivel exclusivamente docente.

## 2026-09-28 — Reinicio de PGlite QA dejó checkpoint inválido

**Síntoma.** Al reiniciar la API QA para el E2E H34, PGlite no abrió el directorio QA anterior y reportó que no encontraba un checkpoint válido.

**Causa raíz observada.** El proceso QA se detuvo mientras la base embebida aún necesitaba un cierre limpio; el directorio y una copia hecha tras detenerlo conservaron el mismo estado inválido. No se atribuye corrupción a las tablas de producto ni a la base original de la usuaria.

**Recuperación validada.** Se preservaron ambos directorios, se creó un directorio QA nuevo desde el último export JSON de la auditoría y se conciliaron 138 evidencias, 68 versiones de valoración, 32 conclusiones y 24 actividades QA sin cambios de contenido. Dos actividades semilla regeneraron timestamps de instalación. El export no incluía todas las tablas, por lo que no se presenta como recuperación byte a byte ni como sustituto del directorio original. La API QA activa usa el directorio restaurado; 5173/8788 de la usuaria no se tocaron.

**Prevención.** Para futuras pruebas con PGlite, detener mediante cierre limpio de la propia API y comprobar backup recuperable antes de reiniciar. No forzar el fin del proceso ni abrir el mismo directorio desde dos instancias.

## 2026-09-28 — Fixture de Documentos incompleto al añadir procedencia F1

**Síntoma.** La suite completa falló al abrir un proyecto de prueba con `column ps.proposal_id does not exist`.

**Causa raíz.** El fixture reducido de `document-library-service.test.mjs` creaba `project_slots` sin una columna que sí existe en las migraciones local y Supabase vigentes. La consulta nueva de procedencia hizo visible esa divergencia.

**Solución validada.** Se agregó `proposal_id` nullable al fixture; la prueba focal de Documentos y la suite completa volvieron a pasar (539/539 con concurrencia 4). No hubo migración ni cambio de datos.

**Prevención.** Cuando un servicio incorpora una columna de una tabla ya migrada, actualizar y ejecutar también los fixtures mínimos que simulan esa tabla; comprobar la paridad de esquema antes de atribuir el fallo al servicio.

## 2026-09-28 — Espera de bake-off F2 confundida con validación técnica

**Síntoma.** La ejecución prolongada parecía corresponder a tests/typecheck/lint bloqueados.

**Diagnóstico.** La inspección de procesos mostró únicamente `run-bakeoff.mjs` activo (PID 73516); ninguno de los tres validadores estaba ejecutándose. No se detectó cuelgue técnico ni corrupción de resultados. No se detuvo el generador ni se repitieron parejas A/B guardadas.

**Validación.** Se ejecutaron los comandos por separado: `node --test evals/project-master/*.test.mjs` (11/11, 1,3 s), `npx tsc --noEmit` (8,9 s), `npm run lint` (29,0 s), y build (15,6 s), todos con exit code 0. Las sesiones se observaron en ventanas de hasta 30 s; el límite operativo para detener exclusivamente un validador sin progreso es 120 s. Ninguno alcanzó ese límite. El build conserva advertencias no bloqueantes sobre tamaño de chunks y clasificación estática de rutas.

**Regresión adicional.** La suite completa descubierta en `src`, `scripts` y `evals` pasó 524/524 con concurrencia 4 en 122,5 s; mantuvo progreso durante la ejecución. No se realizaron nuevas llamadas A/B desde los validadores.

**Incidente externo posterior.** El generador recibió 153 fallos etiquetados `rate_limited`; una comprobación mínima del proveedor confirmó `credit_balance_exhausted` / `insufficient_quota` (429). El usuario confirmó saldo negativo y ordenó continuar sin pruebas API. Se canceló el lanzador de revisión ciega, se verificó un snapshot antes de detener el generador y se comprobó el checkpoint final: 216 registros, 63 válidos. Los 39 registros de control conservaron su SHA-256. A queda como fallback autorizado, no como ganador experimental; comparación y revisión ciega pendientes externas. El runner actual agrupa cuota agotada y rate limit temporal bajo el mismo código: no reintentar automáticamente una corrida con este síntoma ni eliminar sus fallos. No hubo cambio de manifiesto ni regeneración de éxitos.

**Prevención.** Separar los validadores de las llamadas facturables, comunicar su finalización y revisar los checkpoints de generación. La evaluación ciega debe comenzar solo después de finalizar el generador: ambos escriben el mismo archivo y no deben ejecutarse simultáneamente.

## 2026-09-28 — Avance diagnóstico desactualizado tras guardar desde el mapa

**Síntoma.** En F12 QA se guardó por UI una observación para cada uno de seis niños. El mapa mostraba los seis registros, pero el paso «Observar» seguía en 1/6 hasta recargar la página; después mostró 6/6.

**Causa raíz.** El mapa recargaba su propio `DiagnosticReviewWorkspace` tras guardar, pero no actualizaba el `DiagnosticWorkspace` del componente padre, del que depende el contador de pasos.

**Corrección.** El guardado exitoso del mapa avisa al padre, que vuelve a cargar el diagnóstico, igual que ya hacía el flujo de observación espontánea. No cambia persistencia ni valoración. Typecheck, lint, build y suite completa 603/603 pasaron; falta repetir la actualización visual en un clon con un niño aún sin observación.

**Prevención.** Los componentes que modifican registros usados por un indicador de progreso compartido deben invalidar también la lectura del indicador; probar el contador inmediatamente después de guardar, sin depender de recarga manual.
## 2026-09-29 — Contrato HTTP anterior asumía sugerencia automática con flag apagado

**Síntoma.** `scripts/auth-http.test.mjs` esperaba `privacy_blocked` al pedir una sugerencia en una nota familiar mientras el flag V2.4 estaba apagado.

**Causa raíz.** La prueba codificaba el flujo anterior, que podía llamar al clasificador aun sin el nuevo flag. El contrato del piloto exige guardar y clasificar manualmente sin Jev cuando el flag está apagado.

**Corrección.** La ruta devuelve estado `unavailable` para ese intento y la lista muestra `classifier_enabled=false` y `classifier_status=disabled`; se mantiene la comprobación de acceso entre docentes. La prueba se actualizó para verificar ese contrato y el endpoint de métricas aislado por aula.

**Prevención.** Probar explícitamente los modos encendido y apagado de flags de IA en el límite HTTP, además de los servicios.

## 2026-09-29 — El Word diagnóstico confundía período planificado con fechas de registros

**Síntoma.** El encabezado del diagnóstico mostraba «29/09/2026 – 29/09/2026» cuando todas las observaciones de QA se cargaron el mismo día, aunque la etapa inicial del año tenía dos semanas.

**Causa raíz.** La exportación usaba la primera y la última fecha de observación como período formal. La duración elegida en `initial_stages` y el primer bloque lectivo de `calendar_blocks` no se consultaban.

**Corrección.** El contexto autorizado de exportación calcula el período formal desde el calendario lectivo del año y la duración inicial elegida. Las fechas efectivas de observación siguen apareciendo como procedencia de registros, separadas del período formal. El cálculo reutiliza las reglas de semanas lectivas del plan anual.

**Prevención.** Probar por separado la ventana planificada y la ventana de evidencias, especialmente cuando todos los registros comparten una fecha o fueron capturados después del período inicial.

## 2026-09-29 — Exportación QA del diagnóstico y códigos de unidades

**Síntomas.** El Word diagnóstico mostraba párrafos casi literales de entrevistas en «Intereses identificados» y una prioridad genérica en lugar de las tres confirmadas. El cronograma anual rotulaba las unidades 07 y 11 como P07 y P11.

**Causas.** La exportación diagnóstica leía texto libre de entrevistas y el resumen general, pero no las etiquetas de interés ni la revisión de prioridades confirmada. La agenda flexible asignaba prefijo P a todas las propuestas antes de construir el Word.

**Corrección.** La proyección autorizada del diagnóstico toma las etiquetas de intereses de las últimas entrevistas familiares confirmadas y las prioridades de la revisión confirmada asociada al resumen; el Word indica que los intereses provienen de las familias. La agenda y el Word anual usan el tipo real de cada propuesta para el código P/U. Los dos documentos del aula QA se regeneraron en `.local/qa-documents`, sin modificar los originales ni los datos pedagógicos.

**Validación.** En el Word diagnóstico regenerado figuran las nueve etiquetas de interés y las tres prioridades confirmadas. El plan anual regenerado contiene U07 y U11 tres veces cada uno, y ninguna aparición de P07 o P11. Pasaron las pruebas focales de ambos exportadores.

**Prevención.** Mantener el mismo dato confirmado como fuente del diagnóstico, la UI y Mi año; probar códigos de proyectos y unidades en el cronograma además de las fichas.

## 2026-09-29 — Controles de Proyecto o Unidad y confirmación ambigua

**Síntomas.** La selección mostraba las doce propuestas, una acción de evaluación anterior aunque no había valoraciones, códigos de competencias en contexto y preguntas que solo podían quitarse al final. El recorrido y los criterios aparecían como campos extensos. Un fallo de comunicación al confirmar se mostraba como `Failed to fetch` sin aclarar si se había guardado.

**Causas.** La recomendación se basaba solo en fecha; el checkbox no consideraba el recuento; el contexto y la sugerencia compartían presentación; la selección de preguntas no filtraba elementos intermedios. El cliente exponía el error técnico de red y no consultaba el estado tras una respuesta perdida. La operación de confirmación ya usa una transacción en el servicio de versiones.

**Corrección.** La UI recomienda una propuesta por orden y estado del plan; diferencia datos y sugerencias, pide una revisión única al alterar competencias, filtra preguntas desmarcadas antes del Master, muestra recorrido secuencial y criterios compactos. El calendario muestra meses y registra explícitamente las jornadas excepcionales del aula en una capa distinta de la oficial. Una confirmación repetida del mismo proyecto devuelve el estado activo; si falla la respuesta, el cliente consulta el estado antes de sugerir reintento.

**Límite de reproducción.** La copia local del aula QA contiene un único proyecto en etapa `dependents`, todavía sin mapa confirmable. No se pudo reproducir la petición concreta que mostró `Failed to fetch` ni atribuirle una causa de red precisa sin modificar los datos. Las pruebas de servicio cubren atomicidad de versiones, autorización de calendario, filtro de preguntas y excepciones oficiales; queda pendiente repetir la confirmación en UI cuando exista un mapa listo.

**Prevención.** Mostrar el estado verificado después de confirmaciones con respuesta incierta y probar doble clic/reintento sobre un proyecto listo para confirmar.

## 2026-09-29 — Descarga del proyecto y desbordes Word

**Síntomas.** «Guardar Word» del proyecto 1 daba un error genérico cuando la formalización todavía no estaba lista. El plan anual tenía «CONTINUACIÓN» y hojas casi vacías tras propuestas o firmas; el resumen de portada del proyecto podía desbordarse.

**Causas.** La biblioteca ofrecía descargar antes de `formal_ready`. Las plantillas anuales tenían dos tablas de cronograma, saltos manuales y un párrafo final vacío. Un resumen de portada demasiado largo empujaba contenido a una página nueva.

**Solución validada.** API devuelve un 409 explicativo y la biblioteca permite preparar el Word. Se fusionó el cronograma y se compactó la portada; se corrigieron saltos y espaciados sin tocar el plan confirmado. El proyecto 1 se formalizó en la copia QA y descargó 446 kB. Word abrió los cuatro documentos reales; plan y proyecto cerraron en 18 y 8 páginas, sin hojas aisladas de desborde.

**Prevención.** Probar la transición borrador→Word listo y renderizar muestras reales para detectar cortes que una prueba de XML no muestra.

## 2026-10-01 — Proyecto bloqueado al preparar preguntas por revisión `bigint`

**Síntoma.** «Continuar a preguntas» en la unidad QA devolvió `version_conflict` dos veces, incluso después de volver a abrir el borrador. La pantalla solo mostraba el código técnico.

**Causa raíz.** PostgreSQL entrega `revision bigint` como cadena decimal. El cliente reenviaba esa cadena en `expectedRevision`, pero la validación del servidor exigía un número JavaScript. La petición se rechazaba antes de generar el contenido.

**Corrección.** `expectedRevision` admite cadenas decimales positivas provenientes del API y las convierte únicamente si caben en un entero seguro. Se siguen rechazando valores ambiguos, fraccionarios o inseguros. La pantalla del proyecto muestra el mensaje explicativo del servidor para conflictos reales.

**Validación.** Prueba de versiones con cadenas y entradas inválidas: 5/5. Pasaron `tsc --noEmit`, lint, build Vinext y build Next.js. El despliegue `dpl_7ZwGav2GxxUVcDCnWdAwSfCHd7rA` respondió en `/health` y `/api/auth/config`; en la sesión docente, la unidad U02 avanzó de competencias a tres preguntas, recorrido y criterios sin conflicto.

**Prevención.** Probar un ciclo real PostgreSQL `bigint` → JSON → cliente → mutación; no asumir que el tipo estático de TypeScript transforma el valor recibido.

## 2026-10-01 — Perfil del alumno sin apellido

**Síntoma.** La lista del aula distinguía a Prueba Uno, Dos y Tres, pero el encabezado, resumen y entrevista del perfil de Uno decían solo «Prueba».

**Causa raíz.** La respuesta de `/api/students/:id` devolvía el nombre corto del contexto pedagógico como `student.name` y omitía el apellido aunque `last_name` estaba disponible.

**Corrección.** La proyección del perfil concatena el nombre preferido o nombre y el apellido para la identidad visible, sin cambiar el contexto pedagógico ni el registro fuente.

**Validación.** Pasaron `node --check`, `tsc --noEmit`, lint, build Vinext y build Next.js. El candidato `dpl_ECovzoWmUdx3ezPEgbLi83uHELia` pasó smoke y se promovió; el perfil de «Prueba Uno» mostró el nombre completo en encabezado y resumen.

**Prevención.** Probar estudiantes con el mismo nombre de pila al entrar a sus perfiles, entrevistas y evidencias.

## 2026-10-01 — Evaluación quedaba cargando al cambiar de bimestre

**Síntoma.** Al pasar del tercer al primer bimestre, la consulta general respondió 409 y la pantalla quedó en «Cargando registros…». Una consulta de detalle del período anterior también recibió 422.

**Causa.** El mapa de evaluación se sincronizaba desde varias consultas simultáneas. La lectura de la última versión ocurría fuera de la transacción, de modo que dos solicitudes podían intentar insertar el mismo número de versión. La interfaz no distinguía un fallo de carga del estado de carga y pedía el detalle con la selección anterior antes de validar el nuevo alcance.

**Corrección.** La lectura de versión y la escritura del mapa comparten un bloqueo transaccional por aula y período. La pantalla muestra el error con «Reintentar» y espera a que niño y competencia pertenezcan al alcance cargado antes de pedir el detalle.

**Validación.** La prueba de tres sincronizaciones concurrentes conserva una sola versión del mapa. Pasaron las 11 pruebas del servicio, typecheck, lint y builds Vinext y Next.js. En Vercel, el cambio de B3 a B1 cargó registros y detalle sin quedarse en «Cargando registros…».

**Prevención.** Probar el cambio de período cuando varias tarjetas solicitan el mismo mapa y conservar un estado de error recuperable en toda carga asíncrona.

## 2026-10-01 — Actividad confirmada de un día anterior sin acceso al registro de evidencia

**Síntoma.** Una actividad confirmada del 13/04 remitía a «Hoy» para observar. El 01/10, «Hoy» no mostraba aquella actividad y no había forma visible de completar su evidencia desde la ficha.

**Causa.** La acción de observación estaba conectada solo con los bloques de la jornada actual, aunque el servidor ya autoriza evidencias de actividades activas y las fecha según la actividad.

**Corrección.** La ficha del criterio confirmado abre el mismo formulario de evidencia con su actividad y criterio, e informa la fecha a la que se vincula el registro. No se cambió la autorización del servidor ni se fabricó contenido observado.

**Validación.** Typecheck, lint y builds pasaron. En la web de QA se abrió el formulario desde la actividad confirmada de 13/04, se guardó una observación ficticia para «Prueba Uno» y apareció como evidencia del B1.

**Prevención.** Probar el registro tardío desde una actividad confirmada cuando ya no es el día actual.

## 2026-10-01 — Evidencia con tres alumnos indistinguibles

**Síntoma.** El formulario de evidencia mostraba tres opciones «Prueba» en el aula QA, aunque los apellidos Uno, Dos y Tres existían en los expedientes.

**Causa.** El dashboard entregaba `name` como nombre de pila y `full_name` por separado; el formulario consumía `name`.

**Corrección.** La proyección del dashboard usa el nombre completo para `name` y `full_name`, conservando el identificador estable de cada alumno.

**Validación.** La prueba HTTP del dashboard comprueba el nombre completo en ambos campos. En la web de QA el formulario distinguió «Prueba Uno», «Prueba Dos» y «Prueba Tres».

**Prevención.** Probar toda selección de alumnos con dos o más niños que comparten nombre de pila.

## 2026-10-01 — Límite de conexiones de PostgreSQL en Vercel

**Síntoma.** Planificar y algunas consultas de actividades fallaban de forma intermitente. El log del despliegue mostró `EMAXCONNSESSION`: límite de 15 clientes del pool en modo sesión.

**Causa.** Cada instancia serverless mantenía un pool propio de hasta cinco conexiones con 30 segundos de inactividad. Varias instancias simultáneas agotaban el límite de la base.

**Corrección.** En modo serverless el adaptador usa como máximo una conexión por instancia y cierra la conexión inactiva tras un segundo. La configuración local conserva el comportamiento anterior.

**Validación.** Pasaron las cinco pruebas del adaptador y autenticación, typecheck, lint y builds Vinext y Next.js. Tras promover el cambio, Planificar, la actividad, el formulario de evidencia y Evaluar cargaron durante el recorrido de QA. Esto demuestra el recorrido observado, no una garantía de capacidad bajo carga.

**Prevención.** Dimensionar el pool por instancia según el límite agregado de la base y vigilar errores de capacidad de conexiones durante QA concurrente.

## 2026-10-01 — Una valoración insuficiente se convertía en suficiente al confirmar

**Síntoma.** La IA identificó correctamente que la única evidencia estaba marcada como simulación de QA y que no permitía valorar a un niño real. Tras una valoración docente explícitamente ficticia, «Preparar conclusión» devolvió `descriptive_conclusion_schema_mismatch`.

**Causa raíz.** La confirmación sobrescribía siempre `information_status` con `sufficient` y borraba `insufficiency_reason`. Así la conclusión recibía una afirmación de suficiencia que contradecía el análisis guardado. El mensaje de error técnico no ofrecía una forma de redactar una conclusión cautelosa sin otra llamada de IA.

**Corrección.** La valoración confirmada conserva el estado de información y su razón. Se añadió una opción «Escribir yo» para que la docente redacte y confirme una conclusión, validada por el servidor y guardada con procedencia `teacher_manual`. La opción no asigna nivel ni inventa ejemplos de progreso.

**Validación.** La prueba integrada confirma que un análisis insuficiente sigue siendo insuficiente después de confirmar un nivel de QA, que se rechaza una conclusión con «Nivel A» y que se guarda una conclusión docente cautelosa con su procedencia. El conjunto de evaluación integrada pasó 24/24; typecheck, lint y build Vinext pasaron. La comprobación funcional en Vercel se registrará tras desplegar.

**Prevención.** Separar el nivel elegido por la docente de la suficiencia de las evidencias. Probar el recorrido con información insuficiente y permitir redacción docente cuando una propuesta de IA no se puede validar.

## 2026-10-01 — Propuesta de informe familiar rechazada por validación

**Síntoma.** Tras confirmar una conclusión de QA, «Generar propuesta» en Informe a familias devolvió `family_report_schema_mismatch` y dejó a la docente sin borrador.

**Causa raíz.** La salida de IA no cumplió el contrato estricto del informe; el endpoint devolvía el error directamente. La valoración de QA anterior a la corrección de suficiencia también conserva un estado «suficiente» contradictorio con su texto, lo que dificulta una propuesta coherente. No se dispone del texto rechazado de IA, por lo que no se atribuye el incumplimiento a un campo específico.

**Corrección.** Cuando la propuesta de IA falla específicamente por el esquema, el servidor prepara un borrador determinista con las conclusiones confirmadas, sus ejemplos y próximos pasos, sin inventar avances ni hacer otra llamada de IA. Mantiene el estado de información de la fuente, valida el mismo contrato y marca la procedencia. La interfaz explica el fallback antes de guardar.

**Validación.** La prueba funcional simulada confirma que una salida inválida produce una propuesta válida desde fuentes confirmadas, conserva información insuficiente, no inventa ejemplos, permite guardar borrador y no hace una segunda llamada. También rechaza una conclusión fuente que contiene un nivel prohibido. Pasaron 18 pruebas de informe familiar e integración, typecheck, lint y ambos builds. En Vercel, el fallback mostró su aviso, permitió guardar y confirmar un informe QA y descargar su Word.

**Prevención.** Tratar un fallo de contrato de IA como recuperable cuando existe una fuente docente validada, sin relajar las reglas de contenido ni ocultar la procedencia del borrador.

## 2026-10-01 — Word familiar sin apellido en el título

**Síntoma.** El Word de la familia de Prueba Uno se tituló «Informe a la familia de Prueba». En el aula QA hay tres alumnos cuyo nombre de pila es Prueba.

**Causa raíz.** La proyección de documentos consultaba solo `first_name` y `preferred_name` para el informe familiar; omitía `last_name` tanto en Biblioteca como en el objeto enviado al generador Word.

**Corrección.** Ambas consultas incluyen `last_name` y componen el título con nombre preferido o de pila más apellido.

**Validación.** La prueba de biblioteca comprueba el título completo en listado y detalle; las 14 pruebas de documentos y exportación, typecheck, lint y ambos builds pasaron. El despliegue `dpl_9ZuxMJp17jYyeccNfFc9MwXjhVEQ` pasó smoke y se promovió. El mismo informe descargado después mostró «Prueba Uno», ZIP íntegro, marca QA y ningún marcador. La paginación no pudo renderizarse porque falta `soffice.exe`.

**Prevención.** Revisar identidad completa en títulos y encabezados de archivos cuando varios alumnos comparten nombre de pila.

## 2026-10-02 — Crear Mi año sin recuperación y estados locales engañosos

**Síntoma.** Evidencia nueva bloqueaba confirmación sin una acción clara en pantalla; los bloques revisados localmente parecían confirmados. Una recarga o cambio de módulo podía perder ubicación o cambios no guardados.

**Causa raíz.** La interfaz no usaba la operación de actualización, no distinguía estado de sesión/persistencia y el hash estaba limitado por una bandera. Faltaba control de snapshot en escrituras de preparación.

**Corrección y validación.** Actualizar propuesta conserva campos editados y revalida fuentes; guardado de borrador separado, etiquetas Revisado/pendiente/Confirmado, snapshot con escritura condicionada y recuperación de conflictos. Hash de módulo/subvista y advertencia de cambios pendientes. Chrome completó diagnóstico, evidencia nueva, actualización, generación y confirmación; las regresiones rechazan fuentes antiguas y snapshots de otra pestaña. Ver QA 2026-10-02.

**Prevención.** Vincular Confirmado a estado persistido, representar ubicaciones en URL y acompañar errores recuperables con una acción.

## 2026-10-02 — Semana y Conclusiones no correspondían a sus acciones

**Síntoma.** Las flechas de Semana movían el mes; Conclusiones abría una revisión genérica de alumno.

**Causa raíz.** Navegación compartida basada solo en cursor mensual y entrada de evaluación que no seleccionaba la tarea de conclusiones ni su requisito.

**Corrección y validación.** Helpers de navegación por vista y semana de siete días con intervalo/selección sincronizados; Conclusiones selecciona la tarea lista o explica qué valoración/actividad falta. Regresiones de límites de mes/año y las 23 pruebas de evaluación pasan. Chrome comprobó semana/recarga y la rama sin valoraciones; la rama con valoración lista no se declara validada en navegador.

**Prevención.** Cada entrada debe seleccionar la tarea que anuncia; mantener los requisitos pedagógicos explícitos.

## 2026-10-02 — Falso Comercio local y conflictos de preparación/regeneración

**Síntoma.** Una observación sobre una ventana generaba Comercio local; dos preparaciones iniciales concurrentes podían chocar. La revisión devuelta tras regenerar no correspondía a la persistida después de recalcular slots.

**Causa raíz.** Subcadena `venta` sin límites de palabra, inserción inicial sin idempotencia y dos actualizaciones que incrementaban la revisión del plan.

**Corrección y validación.** Extracción con límites de palabra; inserción idempotente y recuperación del mismo borrador propio; regeneración devuelve revisión/propuesta reales después de persistir slots. Los conflictos ofrecen el borrador autorizado para continuar. Mientras se prepara/regenera, el mapa no se confirma ni cambia de versión. Regresiones con PGlite completo y regeneración real en Chrome mantienen V1 vigente hasta confirmar V2; no se reescriben históricos.

**Hallazgo en QA de dos pestañas.** Abrir un borrador con `refresh` también normalizaba y escribía detalles, causando conflicto entre aperturas simultáneas. La apertura ahora lee el borrador; actualizarlo requiere detalles de la acción explícita. Regresión de aperturas paralelas conserva detalles/snapshot. Dos pestañas reales comprobaron rechazo de un guardado antiguo y recuperación del texto vigente mediante Abrir revisión guardada.

**Prevención.** Probar palabras similares, concurrencia y revisión final de una transacción completa; separar preparación de confirmación anual.

## 2026-10-02 — Valoración omitida del paquete de generación de conclusiones

**Síntoma.** La tarea de Conclusiones mostraba la valoración confirmada, pero el proveedor recibía los hallazgos sin el nivel docente correspondiente.

**Causa raíz.** `buildDescriptiveConclusionInput` incluía `confirmed_achievement_level` y `analysis_status`; el filtro de inputs del workflow los descartaba antes del proveedor.

**Corrección y validación.** Se conservan ambos campos solo en `descriptive_conclusion`. La regresión verifica el paquete real del proveedor y la ausencia de nivel confirmado en análisis preliminar. Chrome generó y confirmó una conclusión ficticia de Bimestre 4 desde valoración B; se verificaron el FK y snapshot de esa valoración, F5 y regreso a la lista. No cambia la autoridad docente ni permite letras de nivel en la conclusión.

**Prevención.** Verificar los datos en la frontera del proveedor, además del input del servicio.

## 2026-10-02 — Fallo de regeneración con mensaje técnico

**Síntoma.** Un fallo del proveedor conservaba ideas y borrador, pero mostraba `provider_error` sin explicar cómo continuar.

**Corrección y validación.** La respuesta de generación anual indica que las ideas están guardadas, que el plan vigente se conserva y que se puede reintentar con la acción de generar/regenerar. Un HTTP 503 inyectado exclusivamente en transporte localhost confirmó igualdad del borrador, vigente e históricos; después de F5 el reintento regeneró el mismo borrador V3 sin activar ni alterar V2.

**Prevención.** Comprobar la recuperación en navegador con fallo controlado, incluyendo persistencia y ausencia de escrituras en el plan vigente.

## 2026-10-02 — P1 de cambios pendientes, foco anual y contexto accesible

**Síntomas y causas.** El selector anual reemplazaba la propuesta local sin consultar la protección de navegación (D1). El editor era un overlay manual sin gestión de foco (D2). Los inputs de excepción/reprogramación dependían de placeholders y las alternativas de asistencia carecían de grupo nombrado por alumno (I6).

**Corrección.** Reutilizar `ayni-before-navigation`/`canLeaveWorkspace` y la advertencia de recarga en el borrador anual; omitir el aviso para la misma versión. Usar Dialog compartido, foco inicial en Título y retorno al botón de apertura, manteniendo el mapa montado. Añadir labels vinculados y fieldset/legend, conservando reglas y callbacks.

**Validación.** Dos pruebas focales mover/retirar, typecheck, lint, build y diff check pasan. Navegador: editor abierto por teclado en mapa/lista, contención Tab/Shift+Tab, Escape y retorno del foco pasan; asistencia y calendario guardan en copia QA aislada con semántica asociada. D1 conserva el borrador durante la recuperación y permite guardarlo; versiones limpias cambian sin aviso, histórico de solo lectura, vigente/históricos sin cambios según comparación completa. El control nativo de Cancelar/Descartar no se pudo validar de forma fiable. Por autorización del usuario, cierre con tres pruebas focales PASS que ejecutan el guard y manejador reales: Cancelar conserva, Aceptar cambia sin mutar planes y limpio/misma versión no avisa. Sin cambios adicionales de producto ni repetición E2E. Detalle en `docs/qa/p1-ux-validation-2026-10-02.md`.

**Prevención.** Toda sustitución de un borrador debe consultar el guard compartido; usar Dialog para gestionar foco, mantener el disparador montado y nombrar campos/grupos con semántica nativa. Verificar el resultado de una interacción, no solo su intento.

## 2026-10-02 — Ubicación anual/calendario y retorno de Conclusiones

**Síntoma y causa.** La recarga restablecía el día/mes de Calendario y la versión por defecto de Mi año porque estas selecciones eran locales. El detalle de Conclusiones carecía de retorno propio; su foco podía persistir al cambiar a otra vista.

**Solución.** Reutilizar el hash de workspace para fechas civiles validadas y versiones devueltas por la API autorizada, esperando la carga antes de normalizar IDs. Sincronizar la propuesta al cambiar versión y mantener el guard existente de navegación sin un segundo aviso. Retorno a listado del mismo período y limpieza de foco al cambiar vista. El salto al contenido enfoca el main sin sobrescribir el hash del módulo.

**Validación.** 33 pruebas focales PASS, typecheck/lint/build PASS; navegador confirma Semana/F5, V2/F5, V1/Atrás y retorno a Conclusiones de Bimestre 4 en copia QA aislada. Deshacer idea restaura contenido/posición y respeta máximo diez. Detalle y límites en docs/qa/p2p3-ux-closure-2026-10-02.md.

**Prevención.** Persistir selección de presentación con parámetros validados; nunca introducir contenido pedagógico en URL. Mantener un solo guard por interacción y comprobar URL, selección y contenido visibles juntos.


## 2026-10-03 — Interpretación de fuentes y calendario incompleto en el recorrido anual

**Síntoma.** La auditoría encontró negaciones convertidas en intereses, pérdida de respuestas libres/otro, generalización por conteos y 26 fechas sin asignar entre 172 elegibles. La formalización posterior podía introducir contenido que la docente no había confirmado.

**Causa raíz.** Extracción por palabras clave, agregación sin sujeto, asignación greedy independiente por bimestre y dos contratos pedagógicos antes/después de confirmar. El anonimizador de clasificación descartaba además textos familiares enteros y palabras útiles capitalizadas al reutilizarlo para el contexto anual.

**Solución validada.** Snapshot literal por fuente y sujeto, señalización explícita sin inferencia regex, copia anonimizada propia que conserva las lenguas probadas; resolución global sobre calendario efectivo y validación de cada asignación; contrato pedagógico completo antes de confirmación; exportación pura del mismo objeto. La navegación ya no exige confirmar atribuciones individuales. Se conserva contenido histórico y evidencia original privada.

**Validación.** Regresión 172/172, cero huecos/solapamientos; negación, otro, Shipibo-konibo, contradicción, muchos registros de un sujeto, estados de evidencia y reparaciones acotadas; dos Word con XML pedagógico igual y cero nuevas llamadas. Recorrido real de navegador con datos ficticios y proveedor simulado. 87 casos distintos y typecheck/lint/build PASS; límites en informe QA V2.

**Prevención.** No inferir intereses por temas sueltos; conservar fuente/alcance e incertidumbre. Validar estructura, IDs, oportunidades y asignaciones en servidor. Separar copia privada de payload a IA. Toda decisión pedagógica debe existir antes de confirmar. Los errores de SQL se muestran mediante publicErrorMessage y la telemetría de incidencias omite contenido privado.

## 2026-10-03 — Hipótesis opcional bloqueaba el año y generación sin recuperación

**Síntoma.** QA reportó «La interpretación debe conservar el alcance de sus actuaciones». Repetir con las mismas fuentes llegó a una incidencia global del revisor, sin repetir el texto original. El borrador preservaba ideas, pero no respuestas intermedias.

**Causa raíz.** El validador rechaza scope individual con sujetos distintos/desconocidos. La validación previa a revisión solo reparaba errores con proposal_id; una incidencia de interpretación carecía de ese ID y bloqueaba el plan completo. No se persistía la respuesta que permitiría atribuir el fallo original a fact_keys exactos. Una única petición larga también perdía trabajo completado ante error o corte.

**Solución validada.** Mantener el validador; separar hipótesis incompatibles como información insuficiente sin aumentar alcance y revisar razones dependientes. Jobs privados con etapas, salidas y candidatos guardados; una llamada real por run, exclusión por lease/token, CAS y huellas. Refresh recupera la cola; proveedor fallido reintenta revisión sin otra generación. Un CAS/fingerprint cambiado se marca como fallo recuperable para evitar reintentos automáticos en bucle.

**Verificación.** Regresiones específicas con dos sujetos, razón dependiente, permisos, concurrencia, proveedor fallido, reanudación y CAS; calendario 172/172, XML Word y versiones conservados. Navegador real con fuentes QA reconstruidas y proveedor simulado: refresh → fallo → revisión recuperada → confirmar. La respuesta original no es recuperable y no se afirma reproducción exacta. Detalle y límites en docs/qa/annual-journey-v2-recovery-2026-10-03.md.

**Prevención.** Persistir checkpoints privados antes de cambiar de etapa; no publicar conclusiones insuficientes ni promover su alcance. Telemetría limitada a categoría, etapa y conteos, sin datos pedagógicos ni secretos. Distinguir prueba de recuperación simulada de evaluación real del proveedor.

## 2026-10-03 — Sugerencia bloqueada por transacción y foto incompatible con esquema local

**Síntomas y causa.** La sugerencia previa al guardado quedaba esperando porque el IO del proveedor estaba dentro de una transacción PGlite y el registro de uso solicitaba la misma base. La foto devolvía 42703 porque intentaba actualizar students.updated_at, columna inexistente en ese esquema.

**Solución validada.** Claim breve con lease, proveedor fuera de transacción y persistencia condicionada al token; cache sin otra llamada. Foto actualiza solo la columna real nueva, con comparación del path previo y limpieza privada ante conflicto. Regresión del clasificador consulta la misma base durante IO para detectar el deadlock. API y navegador confirmaron sugerencia antes de guardar; pruebas foto upload/read/replace/delete y permisos PASS, con archivo sintético. La migración nullable se verificó en staging conservando RLS y hashes de planes/entrevistas.

**Prevención.** No mantener una transacción abierta durante requests de IA que registran uso en la misma conexión. Verificar contra migraciones y probar operaciones completas de Storage antes de declarar cámara/upload físico validado.

## 2026-10-03 — Segunda competencia docente ausente del contexto anual

**Síntoma y causa.** La captura guardaba dos competencias confirmadas, pero personalizationSources proyectaba únicamente la primary competency de una observación espontánea.

**Solución validada.** El UNION de fuentes conserva competency_ids de cada tipo, incluyendo todo el array confirmado de la profesora. Snapshot, matriz y conversación leen la misma fuente canónica. Regresión captura dos IDs y comprueba ambos antes de editar; eventos mantienen trazabilidad. Navegador mostró comunicación y convivencia en la misma nota sin segunda confirmación.

**Prevención.** Comprobar la proyección downstream además del JSON de guardado; conservar la distinción entre cantidades de registros y evaluación pedagógica.
## 2026-10-03 — Unión de fuentes con revisión de distinta longitud

**Síntoma/causa.** La primera pasada de regresiones del refinamiento falló en personalizationSources: source_revision se agregó a un brazo del UNION y una sustitución que suponía LF omitió los otros brazos en archivos CRLF.

**Solución validada.** Misma proyección en todos los brazos (revisión efectiva espontánea, cero para fuentes sin revisión), IDs/procedencia originales y huella con revisión/texto. Suite de regresión pasó, incluyendo corrección, retiro, contexto anual y permisos. No fue desplegado el estado fallido.

**Prevención.** Aplicar patches verificando coincidencias, normalizar terminadores para scripts locales y ejecutar lectores downstream además del test de escritura antes de publicar.

## 2026-10-03 — Métodos de edición ausentes en la entrada Next

**Síntoma/causa.** El smoke previo al alias detectó HTTP 405 en PATCH/DELETE del preview. La API Node local y su CORS aceptaban los métodos, pero app/api/[...path]/route.js exportaba solo GET/POST/PUT/OPTIONS.

**Solución.** Exponer PATCH y DELETE hacia el mismo bridge/autorización, sin nuevos permisos. Rebuild de los dos runtimes y smoke remoto que exige 401 sin sesión para ambos métodos antes de mover el alias. El preview incompleto no se asignó al QA estable.

**Prevención.** Comprobar los métodos en el deployment además de la API local, incluyendo guard de sesión y assets. No asumir que la prueba local equivale a la entrada serverless.

## 2026-10-03 — Mi año V2 omitía la línea de tiempo acordada

**Síntoma y causa.** QA mostraba doce tarjetas en Mi año aunque ADR 106 había establecido el mapa horizontal con proyectos, feriados y gestión. AnnualJourneyWorkspace no reutilizaba AnnualYearMap, que seguía conectado únicamente al workspace legacy; las afirmaciones anteriores de «Mi año conservado» no cubrían la vista V2 final.

**Solución validada.** Compartir la presentación temporal existente y conectarla a las filas y fechas V2 guardadas. El mapa es principal y la lista secundaria; las acciones siguen siendo V2. La proyección V2 rechaza fechas ausentes o discrepantes sin invocar el scheduler anterior. Pruebas focales 25/25 y navegador ficticio escritorio/móvil verifican selección, feriados, scroll y persistencia de la vista, sin llamadas nuevas al proveedor. Informe: docs/qa/annual-year-map-v2-restoration-2026-10-03.md.

**Prevención.** Verificar también la llegada a Mi año al probar un nuevo recorrido, comparándola con el acuerdo visual vigente. Reutilizar la presentación sin sustituir los contratos ni recalcular fechas congeladas.

## 2026-10-03 — Ilustraciones genéricas o ajenas al tema del proyecto

**Síntoma y causa.** El mapa usaba una hoja como fallback para numerosos proyectos. Al probar la biblioteca nueva, verbos genéricos compartidos («cuidamos», «exploramos») y contexto del aula podían puntuar un dibujo ajeno al sustantivo principal, por ejemplo Tierra en un proyecto del agua.

**Solución validada.** Catálogo de 50 temas, prioridad del título sobre el contexto, omisión de verbos genéricos/materiales y fallback neutral de ideas. Pruebas con 23 títulos y una línea de tiempo ficticia de doce temas verifican imágenes diferenciadas. La extracción del puntuador compartido conserva las pruebas de Word y Jev.

**Prevención.** Ampliar ejemplos de títulos reales anonimizados al agregar vocabulario; comprobar que el propósito genérico no desplaza el tema específico y que un tema desconocido no recibe una imagen arbitraria. Mantener el check de archivos y tamaño del catálogo.

## 2026-10-03 — Tema parcial confundido con salud y títulos ambiguos

**Síntoma y causa.** El mapa podía elegir botiquín para movimiento porque «cuerpo» coincidía parcialmente con «cuidado del cuerpo». Dos proyectos de cuentos recibían el mismo libro pese a enfatizar oralidad y lectura respectivamente. El selector anterior no usaba las competencias del proyecto.

**Solución validada.** Coincidencias de frases completas, normalización de plurales y apoyo de IDs curriculares existentes. Narración y lectura tienen dibujos diferenciados; el tema explícito mantiene prioridad y el fallback curricular exige un rol curado. Las pruebas cubren cuerpo/movimiento, cuentos oral/lectura, agua con escritura, Navidad/solidaridad y IDs desconocidos. 28 pruebas focales PASS y mapa ficticio de doce proyectos verificado en escritorio/móvil sin modificar el plan.

**Prevención.** Probar empates semánticos con competencias reales además del título. No convertir cualquier coincidencia curricular en un tema textual pertinente; mantener imágenes neutrales para casos desconocidos y verificar peso/transparencia de cada nuevo asset.

## 2026-10-03 — Feriado en extremo de semana impedía construir un tramo

**Síntoma y causa.** El solver anterior exigía que el primer lunes y último viernes fueran días lectivos. Un feriado en un extremo invalidaba una semana calendario válida. Reemplazar ciegamente doce por quince también podía reinterpretar calendarios/jobs ya guardados.

**Solución validada.** El editor nuevo construye quince posiciones a partir de semanas calendario dentro de bloques lectivos y mantiene por separado las fechas efectivamente lectivas. El solver/lector histórico de doce se conserva para sus contratos y recuperación; upgrade requiere una acción explícita sobre borrador compatible. Pruebas de feriado interior/lunes/viernes y override conservan límites/duración, comprueban asignación única y el caso de dos semanas/nueve días. Suite focal final 65/65 PASS; HTTP local verifica fechas y swaps sin requests IA.

**Prevención.** Probar límites de semana además de conteos, distinguir versión de editor/contrato y no recalcular históricos al leer. Si ya se persistieron quince tramos, mantener sus lectores/exportadores en cualquier rollback. Ver ADR 113 y docs/qa/annual-year-editor-v3-2026-10-03.md.

## 2026-10-03 — Revisión final requería preview completo y trazabilidad de sustitución

**Síntoma y causa.** La candidata nueva enseñaba acciones y motivo pero omitía campos pedagógicos necesarios para una aprobación informada. El evento estructural inicial identificaba insuficientemente a la propuesta desplazada en un swap/sustitución.

**Solución validada.** El preview incluye competencias y detalles completos del contrato con fuentes pertinentes antes de Guardar en Biblioteca. El historial incluye IDs entrante/desplazado y slots origen/destino; la regresión de swap comprueba esos campos y la suite focal final conserva 65/65 PASS. La captura final del preview queda pendiente; el resultado de las pruebas no equivale a aprobación visual.

**Prevención.** Revisar todos los campos que la docente aprueba y registrar ambos lados de una operación estructural. Mantener separado QA de servidor, primeras capturas y QA final: la recaptura móvil/Biblioteca/matriz/filtro/chat y el drag genuino quedaron bloqueados por conectividad local/política de URL, y no deben declararse ejecutados. Pasos de cierre en docs/qa/annual-year-editor-v3-2026-10-03.md.

## 2026-10-03 — Panel de una propuesta podía aplicar pendientes de otros alcances

**Síntoma y causa.** «Cambiar propuesta con Ayni» reutilizaba pendientes/aplicación de lote completo. Un contexto visual local no se trasladaba de forma explícita al filtro del servidor ni al revisor; podían consumirse indicaciones globales/ajenas.

**Solución validada.** Selección exacta por proposal_id o null en UI/servidor, revisión limitada al ID local y rechazo de cambios fuera de alcance. Solo se retiran pendientes aplicados y solo ellos pasan al historial. La proyección del revisor omite pendientes ajenos (hallazgo P1 de privacidad); recargar limpia el scope desaparecido sin excepción y recupera las indicaciones retiradas por separado (P2). Regresiones de aplicación local/global, pendientes conservados y reparación ajena PASS dentro de la suite corregida final 68/68. Typecheck/lint/Next (`npx next build`)/Vinext finales PASS, exit 0; sin QA visual final.

**Prevención.** Transportar el alcance hasta proveedor, validación, revisión y persistencia; no asumir autorización por el título del panel. Probar pendientes locales de dos propuestas junto con uno global y comprobar qué queda sin aplicar. Si una propuesta se retira, conservar su indicación en una sección independiente con «Quitar indicación»: limpiar un scope inválido no autoriza descartar decisiones docentes.

## 2026-10-03 — Copia histórica de doce confundida con el editor nuevo de quince

**Síntoma y causa.** Una copia preservaba el contrato/calendario anterior de doce y criterios generados que mencionaban esa cantidad. La presentación nueva podía hacer pensar que abrir/copiar equivalía a convertirla en quince.

**Solución y estado.** Criterios nuevos de organización determinísticos solo para editor_version 3; el histórico mantiene sus criterios originales visibles. Banner de doce y presentación semántica compartida sin mutar su JSON literal. Upgrade únicamente explícito del borrador compatible. Se preparó una copia QA recuperable con tres alternativas sin IA y guard transaccional de hashes del activo V1/otros planes; el upgrade por UI sigue pendiente tras deployment. Pruebas actuales PASS acreditan lógica/compatibilidad, no conversión visual ya ejecutada.

**Prevención.** Verificar editor_version y resolved_calendar antes de atribuir cantidad/funcionalidad; distinguir copia, upgrade y confirmación. Mantener el original recuperable y lectores de quince en rollback. La fase integral en cola se retoma tras estabilizar este cierre. Ver ADR 114 y docs/qa/annual-year-scope-closure-2026-10-03.md.

## 2026-10-03 — Respuesta fallida ocultaba una candidata ya guardada

**Síntoma y causa.** El panel mostraba un fallo de generación aunque la candidata ya se había persistido. El estado de la respuesta HTTP se trataba como ausencia de resultado y podía invitar a reiniciar/generar otra vez sin consultar la sesión guardada.

**Solución validada.** El catch del panel intenta GET de la conversación existente; una candidata guardada se recupera y muestra sin IA nueva. La integración comprueba identidad exacta de candidata, mismo contador de calls y 404 para otra cuenta. Suite final 69/69, typecheck/lint/Next/Vinext PASS. La ronda real sobre plantas confirmó que la candidata guardada podía continuar a Biblioteca; la revisión humana de su omisión de Crea sigue pendiente y no se atribuye aprobación semántica al recovery.

**Prevención.** Consultar estado persistido antes de interpretar un error de transporte como falta de resultado. Separar requests de la sesión nueva de métricas heredadas y conservar permisos en recuperación; no repetir una generación únicamente por una respuesta fallida. Detalle y QA integral en docs/qa/annual-year-integral-qa-2026-10-03.md.

## 2026-10-04 — La candidata omitía competencias elegidas por la docente

**Síntoma y causa raíz.** La unidad real de plantas conservó Indaga/Lee, pero omitió Crea solicitado en QA. El filtro de privacidad ocultaba Indaga y Crea como nombres propios; la revisión validaba currículo sin exigir los IDs elegidos.

**Solución validada.** Vocabulario confiable del currículo efectivo en conversación/preparación/cambios; nombres personales y contactos permanecen protegidos. Selección docente explícita de hasta cinco competencias, obligatorias en generación/revisión/reparación de una candidata. El servidor exige oportunidad real, bloquea aprobación incompleta (incluidas candidatas antiguas) y repara solo esa fila. Integración comprueba cero mutaciones del año ante omisión/fallo, revisión cached y permisos; 76/76 focales PASS. La prueba real y los deployments se acreditan separadamente en el recibo posterior al commit, no mediante mocks.

**Prevención.** Comparar intención literal/selección curricular con oportunidades reales antes de aprobar; no confundir revisión formal con cumplimiento de una preferencia. No permitir que aprobar cambie IDs para saltarse el control. Detalles y rollback en docs/qa/annual-proposal-competency-intent-2026-10-04.md.
