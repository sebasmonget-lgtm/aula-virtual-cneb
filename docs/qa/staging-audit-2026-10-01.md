# Auditoría funcional del aula QA en Vercel — 1 de octubre de 2026

## Alcance y estado

Se auditó `project-0w0pq.vercel.app` con la sesión docente del aula ficticia «Auditoría 5 años» y sus tres alumnos de prueba. La revisión siguió diagnóstico, plan anual, unidad, actividad, calendario, perfiles, biblioteca y evaluación. No se consultaron fuentes web externas para validar contenidos MINEDU/CNEB.

El recorrido cubrió diagnóstico, plan anual, unidad, actividad, evidencia y valoración con datos ficticios. Mientras se probaba, el diagnóstico y el plan anual pasaron a confirmados sin una acción nuestra de confirmación. No se atribuye ese cambio a una sesión concreta. El bloqueo al avanzar la unidad U02 tuvo una causa técnica reproducible, descrita abajo; después de corregirlo se confirmó una unidad y una actividad. La valoración posterior es una **simulación de QA**, no una evaluación pedagógica de un niño real.

## Documentos revisados hasta ahora

| Tipo | Muestra única | Comprobación |
| --- | --- | --- |
| Diagnóstico del aula | `diagnostico-aula-2026-3f6939da.docx` | DOCX íntegro, 401 709 bytes, sin marcadores `{{…}}`. Explicita 1 de 3 niños observados, 1 de 3 entrevistas y que el registro de 30/09/2026 cae fuera del período diagnóstico previsto 16–27/03/2026. La síntesis evita generalizar el dato de un niño. |
| Plan anual | `plan-anual-2026-8a7c9633.docx` | DOCX íntegro, 9 484 769 bytes, sin marcadores `{{…}}`. Recoge 12 propuestas, cuatro períodos, punto de partida cauteloso y oportunidades por competencia. El archivo contiene 23 imágenes, varias de aproximadamente 0,7–0,9 MB; conviene optimizar su tamaño. |
| Unidad | `unidad-2026-052c6843.docx` | DOCX íntegro, 420 190 bytes, ocho tablas, nueve imágenes, sin marcadores `{{…}}`. Explica que el registro diagnóstico es puntual y no representa al grupo; contiene propósito, criterios y ruta de diez actividades. |
| Actividad | `actividad-2026-435289ce.docx` | DOCX íntegro, 399 965 bytes, siete tablas, cinco imágenes, sin marcadores `{{…}}`. Incluye preparación, secuencia, mediación y evidencia individual esperada. |

La vista previa de la aplicación permitió revisar contenido y procedencia. El renderizador DOCX no pudo generar páginas porque este entorno no tiene `soffice.exe`; **la paginación y el aspecto final en Word no están verificados**.

## Hallazgos

| Severidad | Pantalla | Hallazgo y evidencia | Estado |
| --- | --- | --- | --- |
| Alta | Diagnóstico | Las tres tarjetas, entrevistas y fichas decían solo «Prueba», lo que impedía atribuir observaciones sin riesgo de confusión. Las dos consultas diagnósticas omitían el apellido. | Corregido en `4c67e25`, desplegado en `dpl_4tbGw2GVBdmVwaPBKJu2ZFeMxcPP`; la interfaz ya distingue Uno, Dos y Tres. |
| Alta | Unidad U02 | «Continuar a preguntas» terminó dos veces en un `version_conflict` literal, incluso desde el borrador recién abierto. PostgreSQL serializa `revision bigint` como texto y el servidor exigía un número; la petición se rechazaba antes de llamar a IA. | Corregido en `913dc5a`, desplegado en `dpl_7ZwGav2GxxUVcDCnWdAwSfCHd7rA`. La sesión docente llegó a preguntas, recorrido y criterios; el calendario guardó diez días. |
| Media | Plan anual | El archivo de 9,5 MB incluye imágenes pesadas para un documento de doce propuestas. Puede dificultar descarga o envío con conexión limitada. | Pendiente de optimización; no bloquea el flujo. |
| Media | Cronología del aula QA | La planificación confirmada cubre marzo–diciembre de 2026, aunque la prueba ocurre al final de septiembre. La unidad en preparación U02 estaba fechada en abril. La interfaz prioriza ese borrador y no advierte de la fecha pasada en la tarjeta inicial. | Pendiente de revisar con el flujo de la docente; no se cambió la fecha para forzar avance. |
| Alta | Perfil individual | La lista de aula distingue «Prueba Uno», «Prueba Dos» y «Prueba Tres», pero el encabezado de la ficha de Uno volvía a decir solo «Prueba». Si se alternan fichas, es fácil confundir al destinatario de una evidencia o entrevista. | Corregido en `2a74248`, desplegado en `dpl_ECovzoWmUdx3ezPEgbLi83uHELia`; la ficha y el resumen muestran «Prueba Uno». |
| Alta | Evaluación, cambio de bimestre | Al cambiar de B3 a B1, `/api/period-evaluations/overview` devolvió 409 mientras otras secciones consultaban el mapa del mismo período; la pantalla permanecía en «Cargando registros…». También se observó una solicitud de detalle 422 con la competencia seleccionada del período anterior. | La sincronización del mapa ahora lee la última versión y escribe bajo un bloqueo transaccional por aula y período. La pantalla informa el error y permite reintentar; el detalle espera una selección válida para el nuevo período. |
| Media | Vista previa de la unidad | «Nuestro punto de partida» y «Qué necesita el grupo» repiten el mismo párrafo; cada etapa del recorrido repite su descripción bajo «Qué podrían hacer los niños». | Registrado; no impide preparar la unidad. |
| Media | Word de la unidad | El documento salta de la sección III a la V; no aparece un encabezado IV en párrafos ni tablas. | Registrado para corregir la plantilla. No bloquea su descarga ni la actividad. |
| Media | Actividad y calendario | La lista de actividades muestra fecha ISO cruda (`2026-04-13T00:00:00.000Z`); «Ver actividad» desde el calendario llevó a la portada de Planificar, sin abrir esa actividad. | Registrado; la actividad se pudo abrir desde su flujo y Biblioteca. |
| Media | Navegación de observaciones | En un día sin actividad programada, «Observar» de Hoy abre el diagnóstico ya confirmado. El flujo ordinario de evidencias está ligado a la actividad del día. | Registrado; puede confundir a docentes que buscan una observación cotidiana. |
| Alta | Registro tardío de evidencia | La actividad confirmada de 13/04 solo ofrecía «Abrir Hoy», que en 01/10 no contiene esa actividad. Aunque el servidor acepta evidencia vinculada a una actividad activa y la fecha de esa actividad, no había acceso desde la ficha. | Se añadió «Registrar evidencia de esta actividad» junto al criterio confirmado, con la fecha visible. La profesora debe describir lo observado; el servidor conserva la vinculación y la fecha de la actividad. |
| Alta | Identidad al registrar evidencia | El formulario abierto desde la actividad mostraba tres casillas idénticas «Prueba» para Prueba Uno, Dos y Tres; no era seguro escoger a quién atribuir el registro. | El dashboard del aula ahora muestra nombre y apellido en la lista usada por el formulario de evidencia. |
| Alta | Cargas intermitentes | Después de promover la corrección de nombres, Planificar y la lista de actividades fallaron intermitentemente. Los logs de Vercel muestran `EMAXCONNSESSION` y límite de 15 clientes del pool de base de datos. | El pool de cada instancia serverless se redujo a una conexión y su inactividad a un segundo. El recorrido de QA volvió a cargar Planificar, la actividad, evidencia y Evaluar; no se hizo una prueba de carga. |
| Alta | Conclusión descriptiva | La IA señaló correctamente que una observación explícitamente ficticia no sustenta avances reales. Tras confirmar una valoración de QA con justificación, «Preparar conclusión» devolvió `descriptive_conclusion_schema_mismatch`. | La confirmación forzaba `information_status=sufficient` aunque el análisis era insuficiente. Se corrigió para conservar la insuficiencia y se añadió una conclusión escrita por la docente con validación de servidor. En Vercel se confirmó la conclusión QA. |
| Alta | Informe familiar | Con una conclusión QA confirmada, «Generar propuesta» devolvió `family_report_schema_mismatch` y no ofreció borrador. El origen exacto dentro de la salida de IA no está disponible. | Se añadió una alternativa basada solo en conclusiones confirmadas, con el mismo validador y aviso visible. No hace otra llamada de IA. En Vercel se guardó, confirmó y descargó un informe QA. |
| Alta | Identidad en Word familiar | El Word de Prueba Uno decía «Informe a la familia de Prueba»; el aula tiene tres alumnos con nombre de pila Prueba. | La proyección de Biblioteca y el documento ahora incluye el apellido. Pendiente de comprobar en Vercel. |
| Condición de datos | Evaluación e informes | Bimestre 3 muestra 0 evidencias de actividad. En B1 se guardó una observación ficticia para Prueba Uno, se confirmó un marco de evaluación V1 y una valoración de QA. Reprogramar la actividad QA de abril al 01/10 devuelve «no es un día de clase disponible». | No se atribuye el nivel de QA a un niño real. Los informes requieren una conclusión confirmada y su resultado debe seguir marcado como prueba. |

## Validaciones técnicas ejecutadas

Para la corrección de identificación diagnóstica: 10 pruebas de servicios, `tsc --noEmit`, lint, build Vinext y build Next.js pasaron. En el despliegue candidato, `/health` y `/api/auth/config` respondieron 200, y `/api/diagnostics` sin sesión respondió 401 esperado. La sesión docente cargó nombres completos después de promover la versión.

Para `version_conflict`: prueba de integridad 5/5, typecheck, lint y ambos builds pasaron. El despliegue `dpl_7ZwGav2GxxUVcDCnWdAwSfCHd7rA` pasó smoke y está vinculado al alias de QA. La unidad generó preguntas, mapa y Word; se confirmó una actividad y su Word. Durante la confirmación hubo dos respuestas 500 transitorias en progreso y documentos; al reintentar, Biblioteca mostró la unidad confirmada. La causa de esos dos 500 no está identificada, por lo que no se atribuye al cambio de revisión.

Para el nombre del perfil: `node --check`, typecheck, lint y ambos builds pasaron. El candidato `dpl_ECovzoWmUdx3ezPEgbLi83uHELia` respondió en `/health` y `/api/auth/config`, y rechazó `/api/diagnostics` sin sesión como se esperaba. Tras promoverlo, la ficha de «Prueba Uno» mostró nombre y apellido.

Para el cambio de bimestre, la sincronización del mapa pasó 11 pruebas, la evaluación integrada 23, typecheck, lint y ambos builds. Después de promover `dpl_oC5C4Q1ttwmsktmLDfxjP9wFmiuu`, B1 cargó los registros y el detalle.

Para el acceso tardío a evidencia y nombres completos, typecheck, lint y ambos builds pasaron. Los despliegues `dpl_ANQm4vxJ9vBmKDk19bQ4xm1MbB2e` y `dpl_8H5U58HLErdu6atMfNyh6sc5hkTp` permitieron abrir el formulario desde la actividad confirmada, distinguir a los tres alumnos y guardar la observación QA.

Para las conexiones, pasaron cinco pruebas del adaptador y autenticación, typecheck, lint y ambos builds. `dpl_4GqMbk6tcdbckedqnfPz8FJybPkn` pasó smoke y quedó activo; Planificar, actividad, evidencia y Evaluar cargaron durante el recorrido. No se ensayó carga concurrente.

Para la conservación de información insuficiente y la conclusión docente, pasaron 24 pruebas de evaluación integrada, typecheck, lint y builds Vinext y Next.js. Queda comprobar el recorrido en Vercel antes de cerrar el hallazgo.

El candidato `dpl_C7AZ498gV1omChw43VhxniLDedmF` pasó smoke en `/health` y `/api/auth/config` y se promovió al alias de QA. En la sesión docente, «Escribir yo» permitió guardar la conclusión «SIMULACIÓN QA: Esta observación ficticia no permite describir el progreso de un niño real…»; la ficha cambió a «Confirmada». En Informe a familias apareció esa conclusión, pero su etiqueta «Información suficiente» refleja la valoración guardada antes de la corrección y contradice el texto cauteloso. La primera generación familiar falló por esquema. El informe familiar no se confirmó ni descargó en esa versión.

Para el fallback del informe familiar, 18 pruebas de informe e integración, typecheck, lint y ambos builds pasaron. Queda la comprobación en Vercel.

El despliegue `dpl_BrkYoXAMcrBcqgFaHFncmVJu1yJH` pasó smoke y se promovió. En la web, la siguiente propuesta familiar activó el fallback y mostró «La propuesta de IA no pasó la revisión…». Se guardó y confirmó un único informe familiar QA, y se descargó `informe-familia-2026-cf7e5a2a.docx` (10 144 bytes). El archivo es ZIP íntegro, sin marcadores y contiene la advertencia «SIMULACIÓN QA»; no inventa ejemplos. Su título omitió el apellido, lo que dio lugar a la corrección posterior. El renderizador no pudo crear páginas porque falta `soffice.exe`; no se validó su paginación. El informe sigue mostrando «Información confirmada» por el estado legado de la valoración QA, pese a que el texto advierte que no hay evidencia real. **No debe compartirse con una familia.**

Para el título del Word familiar, las 14 pruebas de Biblioteca y exportación, typecheck, lint y ambos builds pasaron. Queda comprobar el nuevo Word en Vercel.

## Valoración ficticia de QA

La observación de Prueba Uno se registró desde la actividad confirmada de 13/04 y dice explícitamente «SIMULACIÓN QA (no corresponde a un niño real)». La IA respondió «Información insuficiente» y explicó que el único registro de prueba no puede considerarse actuación individual. Para probar el guardado y la confirmación, se seleccionó manualmente A con la justificación: «SIMULACIÓN QA: selecciono A únicamente para comprobar el guardado, la confirmación y los informes. No representa una evaluación pedagógica real; una sola observación ficticia es insuficiente». La aplicación confirmó la valoración y pidió conclusión. Esta prueba mostró la conversión incorrecta de insuficiente a suficiente descrita arriba.

## Pendiente para completar la auditoría

El usuario autorizó explícitamente observaciones y valoraciones ficticias para QA. Se creó un borrador de versión 2 de «Mi año» con una propuesta QA del 28/09 al 09/10, pero no se confirmó ni se generó un segundo plan Word. Validar visualmente la paginación DOCX cuando haya un renderizador Word disponible. Requiere validación pedagógica externa la correspondencia oficial fina de criterios, capacidades y referentes CNEB; aquí se revisó coherencia interna sin consultar MINEDU fuera de la aplicación.
