# Edición de proyectos y reorganización de Mi año

23 de octubre de 2026. Continuación local autorizada en `codex/multiedad-local-20261022`, base `26e51f3`. Sin commit, push, publicación, cuentas cloud ni migraciones remotas. Esta fase amplía el recorrido V2 de los recibos 08–16 manteniendo la interfaz de Ayni.

## Recorrido docente

En **Mi año → Actividades del proyecto → Editar proyecto y ver versiones**, la profesora puede cambiar título, propósito compartido, organización de inicio/desarrollo/cierre y redacción del criterio y posible registro de cada edad. Confirma motivo y que la nueva versión orientará actividades futuras. Se mantienen las competencias, edades, momentos para observar y referentes oficiales del proyecto: esta fase no cambia su conjunto de competencias ni realinea automáticamente las actividades ya preparadas.

La edición agrega una versión confirmada; no modifica el maestro original ni las actividades existentes. Las guías, criterios, fechas, observaciones, notas, conclusiones e informes anteriores conservan sus datos. Cada actividad nueva queda vinculada a la versión de proyecto que la originó. Si cambia semánticamente un criterio, recibe un ID propio con enlace a su predecesor; los criterios que conservan el mismo contenido mantienen su identidad. Las variantes de 3/4/5 años nunca intercambian referentes.

El historial muestra la versión inicial y las ediciones, organización, criterios por edad y motivo. El mapa anual y el selector de proyectos muestran la edición vigente del proyecto. Al abrir una actividad preparada se sigue consultando su contenido confirmado. El Word de esa actividad resuelve la versión de maestro y año con la que se guardó; no usa el maestro actual para reconstruir un documento antiguo.

En **Mi año → Reorganizar tramos de Mi año** se intercambian dos propuestas en las fechas de sus tramos. Se guarda un borrador para revisar y confirmar con motivo. También sigue disponible crear otro borrador y editar las propuestas libres, organización y oportunidades cotidianas. El calendario conserva sus quince posiciones, fechas lectivas y límites ya instalados.

**Los tramos con proyectos preparados conservan su lugar, propuesta y fechas.** Tampoco se cambian los tramos de un bimestre cerrado sin reabrirlo. La profesora puede editar el proyecto para próximas actividades; esta operación no mueve una actividad, reescribe una observación o recaptura una evidencia. Reordenar proyectos ya materializados junto con sus actividades y reprogramar sus fechas no forman parte de esta fase. Se opta por conservar esos anclajes y reorganizar las propuestas libres, evitando mover silenciosamente registros históricos.

Confirmar la nueva versión anual archiva la anterior y guarda vínculos con **los mismos proyectos**, sin clonarlos ni cambiar sus IDs o el padre de sus actividades. Pueden coexistir proyectos originados en distintas versiones del año dentro del año vigente. Es posible seguir preparando actividades de un proyecto conservado después de otra reorganización. Las versiones anuales anteriores siguen descargables desde Mi año y Documentos.

## Persistencia y permisos

Migraciones nuevas `0085_multi_age_planning_revisions.sql` y `202610230007_multi_age_planning_revisions.sql`: `multi_age_project_versions` guarda ediciones inmutables y `multi_age_annual_project_links` conserva la colocación de proyectos en cada versión anual. Las tablas validan docente/aula/proyecto/año/tramo, secuencia y predecesor de edición, y no admiten modificación o borrado del historial. Los vínculos se insertan mientras el nuevo año está en borrador y se confirman en la misma transacción que su activación. RLS permite leer lo propio y no concede escritura directa a clientes; las escrituras pasan por el servidor y el gate V2.

POST `/api/multi-age/projects/edit` confirma la edición, y GET de la misma ruta consulta proyecto e historial. POST `/api/multi-age/annual/reorder` guarda el intercambio en el borrador mediante el mismo servicio anual. Las rutas reciben identidad de la autenticación habitual, validan propiedad y usan bloqueo de aula y recibos idempotentes. La edición exige huella del maestro y de sus actividades; una pestaña desactualizada no reemplaza una versión más reciente. Los períodos cerrados se comprueban en servidor y, para la edición de proyecto, también mediante trigger SQL.

Cada borrador anual guarda qué versión activa reemplaza y una huella de proyectos, ediciones, actividades y períodos protegidos. Guardar y confirmar verifican que los tramos preparados permanezcan iguales. Si aparece otra actividad, cambia una edición o difiere qué períodos están cerrados, la confirmación se rechaza y permite actualizar el borrador. Se conserva todo el trabajo hasta que la docente confirme una revisión vigente. No se relaja el control de matrícula/diagnóstico actual ni la validación de cobertura y referentes por edad.

El contenido original de `learning_experiences` queda intacto; la consulta actual proyecta la edición más reciente. Las actividades nuevas guardan `project_revision_id`, huella de maestro, año de origen de su confirmación y título de proyecto congelado. La descarga histórica usa esos identificadores; las actividades anteriores sin esos campos conservan su lector original. No hay backfill de maestros, actividades o fuentes, ni se convierte un aula V1.

La preparación individual y por lote recibe propósito, organización y criterios de la edición vigente. Una propuesta anterior a la edición o reorganización queda obsoleta y conserva su resultado guardado; no se confirma ni invoca automáticamente otra llamada. Se conserva la forma de las huellas anteriores cuando el proyecto no tiene una edición, evitando invalidar trabajos ajenos al cambio por añadir campos de presentación. Modelos y textos base de prompts siguen vigentes; la ampliación está en el contexto autorizado del proyecto. No se afirma haber realizado una nueva evaluación pedagógica con IA real.

## Pruebas ejecutadas

| Grupo de pruebas distintas | Resultado |
| --- | --- |
| `npm run test:multiedad:proyectos` | 9 PASS: ocho de núcleo/SQL y uno HTTP persistente |
| `npm run test:multiedad` | 41 PASS |
| `multi-age-activity-document.test.mjs`, `multi-age-conversation-activities.test.mjs`, `multi-age-activity-batch.test.mjs`, `multi-age-persistence-generation.test.mjs` | 32 PASS |
| `npm run test:multiedad:correcciones` | 9 PASS |
| `npm run test:multiedad:cierres` | 12 PASS |
| `multi-age-app.test.mjs`, `multi-age-persistent-app.test.mjs` | 12 PASS, incluida conservación de la ruta de aula de una edad |
| `scripts/database-schema-parity.test.mjs` | 1 PASS |

Total: **116 pruebas distintas PASS**, sin contar repeticiones ni volver a sumar pruebas de fases anteriores no ejecutadas aquí.

El núcleo ejecuta edición, generaciones simuladas por edad, intercambio de tramos, confirmación anual, continuación del proyecto, borrador obsoleto por nueva actividad, actualización, cierre, reapertura y nueva edición en los esquemas local y Supabase temporal. Comprueba referentes incorrectos, otro propietario, recibos duplicados, edición obsoleta, tramos preparados/cerrados, inmutabilidad y aislamiento entre docentes. Una nota por niño conserva su huella aunque cambie el maestro destinado a futuras actividades. La respuesta simulada recibe la edición y criterios 3/4/5 actuales; una propuesta anterior se conserva obsoleta sin nueva llamada.

La prueba HTTP crea una base propia nueva con servicios canónicos y datos ficticios, sin adoptar una cuenta existente. La aplicación principal realiza dos reorganizaciones, confirma Mi año hasta v3, edita un proyecto hasta v3, conserva otro proyecto independiente y prepara cuatro actividades en total. Reinicia varias veces y continúa el mismo proyecto sin duplicarlo. Compara exactamente el XML de **siete Word anteriores**: año original, actividad original, tres informes familiares y dos actividades preparadas antes de otra revisión. Compara además cada fila canónica inicial de actividades, criterios, observaciones, notas, conclusiones e informes: todas permanecen iguales. El escenario HTTP es manual y tiene IA apagada; los proveedores del núcleo son simulados explícitos. **Cero IA real en esta fase.**

`npx tsc --noEmit`, `npm run lint` y `npm run build`: PASS. Lint mantiene una advertencia previa de dependencias de `useEffect` en `diagnostic-generation-control.tsx`; build conserva avisos anteriores de PGlite/eval, tamaño de chunks y clasificación estática. Detector mecánico de los tres componentes sin hallazgos en la pasada de integración. `git diff --check` correcto para archivos seguidos; no sustituye la revisión de todos los archivos nuevos sin seguimiento.

La primera prueba de fixture persistente rechazó correctamente aulas sintéticas V1 de las migraciones iniciales al comprobar cualquier docente. Se acotó el guard al propietario nuevo del almacenamiento: no se borra ni se adopta ninguna de esas aulas. Otro intento completó las acciones y validaciones pero agotó 150 segundos al cerrar dos veces un proceso auxiliar terminado por señal: `exitCode` permanece null en ese caso. Se corrigió `stopMultiAgeHttpFixture` para reconocer también `signalCode`. Prueba aislada final: 18,4 segundos; suite nueva final: nueve PASS en 35,6 segundos. No fue una corrección de datos pedagógicos ni se amplió el timeout para ocultarla.

**Límite visual:** `cua.getState()` confirma que Work mantiene deshabilitado el navegador local. No se realizaron el recorrido interactivo de los nuevos formularios, capturas ni validación desktop/móvil, y no se usa otro automatizador para eludir esa configuración. Tipos, detector, build y HTTP no equivalen a esa revisión. Durante el desarrollo, la recarga en caliente llegó a combinar frontend nuevo con el servidor anterior; se reinició el preview con ambos actualizados. El estado final de API comprueba las propiedades de protección y versiones requeridas; queda pendiente la inspección visual habilitada.

## Preview, pendientes y rollback

Preview: `http://127.0.0.1:5175/`, base ficticia independiente `planning-b4e7d5c1-2028-4f2f-b0d3-727021910033`, IA apagada. Estado comprobado por API: edades 3/4/5, dos proyectos, cuatro actividades, año v3, proyecto principal v3 y todos los proyectos vinculados al año activo. Las bases anteriores de correcciones, cierres y lotes se conservan. Evidencias privadas ignoradas por Git: `.local/multi-age-main-20261023/proyectos/receipt.json` y `state.json`.

Esta fase completa la edición de los campos descritos y la reorganización de tramos libres conservando proyectos preparados. Continúan pendientes la revisión visual, Word del maestro e índice de actividades en Documentos, diagnóstico grupal/cuestionario familiar completos, talleres, calendario institucional, ingreso tardío, transición anual, voz, ampliación de revisión pedagógica IA y staging con cuentas nuevas y Auth/RLS reales. Cambiar competencias/referentes del proyecto o mover actividades preparadas exigiría otro flujo de revisión y reprogramación, con protección de fuentes y fechas.

Rollback: apagar escrituras V2 y retirar acceso a nuevas ediciones/reorganizaciones, conservando lectores de versiones y vínculos anuales. No volver al lector que exige que todos los proyectos pertenezcan físicamente al año activo ni al que resuelve toda actividad con el maestro actual. Mantener tablas, recibos, referencias de cada actividad y documentos históricos. No editar ni borrar migraciones aplicadas; corregir mediante otra migración. No se han usado cuentas actuales de Supabase/Vercel, migrado datos remotos ni publicado. La publicación requiere autorización expresa posterior y los gates del proyecto.
