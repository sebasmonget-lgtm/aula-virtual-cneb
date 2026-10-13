# Mi año: QA autónomo secuencial — 13/10/2026

Base de producto b70cb3b, documentación cce2027, árbol inicialmente limpio. La cuenta QA estaba vacía tras la limpieza expresamente solicitada inmediatamente antes: cero aulas, niños y registros. Se crea por UI una nueva aula ficticia de cinco años, QA Mi año 13 octubre / QA Anual, y cinco niños Ensayo Anual. No se reconstruyen datos borrados. Restricciones: una sola generación anual controlada, conservar datos creados y calendario, sin migraciones ni publicación de Producción.

## Corrección focal previa a generación

La API conserva la propuesta IA en ai_snapshot, pero el editor recuperado no comunicaba processing ni distinguía una propuesta preparada del texto docente vigente. Ahora expone estado/expiración sin token de lease, permite consultar el estado sin generar y ofrece usar explícitamente la propuesta conservada. Una petición que termina después de desmontar el editor no aplica ni vuelve a guardar su resultado sobre correcciones más recientes. No se añade worker, cola ni tabla; el resultado sigue durable en el mecanismo existente y la exclusión por lease/cache permanece.

Instrumentación mínima: duración HTTP del proveedor en provider_metadata, tiempos de fuentes antes/después, DB y conexión del contexto de medición existente y tiempo antes de persistir. No registra SQL, prompts, nombres ni secretos. Server-Timing se activa únicamente para la ruta adicional de sugerencia grupal; las optimizaciones de guardado existentes no se sustituyen. Las medidas de DB/proveedor son intervalos que pueden solaparse con lectura de fuentes/telemetría, no deben sumarse ciegamente.

La Preview base no incluía los flags del reloj QA. Se habilita la función ya existente solo en el nuevo despliegue Preview y para el UUID QA autorizado; conserva el valor predeterminado 16/02/2026 08:00, la firma privada y la separación del tiempo real de seguridad/facturación. No se cambia configuración de Producción, reglas curriculares ni calendario.

Typecheck, lint de cambios y Next webpack PASS. 49 pruebas focales PASS: proveedor/diagnóstico/reloj (18), recorrido/calendario/recuperación anual (31). Ninguna generación real en estas suites. El recorrido cloud y sus tiempos/costos se registrarán al cierre.

Rollback: volver al commit de producto b70cb3b y a sus flags de despliegue; no eliminar datos ni ai_snapshot. Campos de estado y timings opcionales son compatibles con clientes anteriores. No cambia modelo ni reasoning effort del resumen/plan.

## Recorrido real: resumen y conversación

Preview de producto 8b65bd7: https://ayni-aula-staging-du1nnygzj-ayni4.vercel.app. El reloj visible conserva 16/02/2026 08:00 Lima. Cinco niños ficticios, cuatro entrevistas parcialmente respondidas y confirmadas, una entrevista pendiente y cinco observaciones activas de 16/02. Una observación del propio fixture, creada antes de recuperar el reloj, fue retirada por UI conservando historial y sustituida por su equivalente con fecha QA; no se borró historial ni evidencia.

El resumen manual se autoguardó y sobrevivió a recargar. Un doble clic en Preparar resumen con Ayni produjo una sola operación facturada. Se recargó durante su procesamiento; el texto docente se conservó, se recuperó processing, y Consultar estado recuperó la propuesta lista sin nueva generación. Usar el resumen preparado requirió una decisión explícita y mostró Guardando hasta persistir. La propuesta distingue registros observados de intereses familiares, no generaliza una necesidad grupal y no asigna niveles.

Medición de servidor de esa única síntesis: 77,527 s antes de almacenar; HTTP al proveedor 74,065 s (95,5%), paso de proveedor incluyendo registro de uso 74,872 s; lectura de fuentes previa 1,230 s y posterior 1,171 s. DB del contexto de petición antes de almacenar 2,676 s / 23 consultas y conexión 0,679 s: incluye autorización y tramos de fuentes/telemetría, no se suma a los anteriores. Estas métricas excluyen la última escritura y la llegada/actualización visual. La observación visual estuvo espaciada para probar recarga y recuperación; su tiempo incluye interacción del agente y no es una medición precisa de latencia navegador-servidor. El HTTP del proveedor incluye red hacia OpenAI y razonamiento/salida, sin poder separar estos dos componentes. Costo estimado US$0,0324135, gpt-6.1-sol sin cambio de esfuerzo o calidad; 3634 tokens de entrada y 2333 de salida. No se promete reducir ese tiempo con ajustes de consultas que representan una fracción pequeña.

Conversación: una apertura y una respuesta docente (dos llamadas, gpt-6-luna ya configurado), costo estimado conjunto US$0,0021991. Pregunta inicial retoma macetas, bloques, mercado y construcción, y pide participación familiar/recursos/restricciones. Respuesta ficticia aporta materiales reutilizados, parque y mercado, relatos castellano/quechua, salidas autorizadas, ausencia de tabletas/impresora y diversidad sin compras ni efemérides repetidas. Extrae seis decisiones verificables, se recuperan mensajes tras recargar y una corrección manual de recursos se autoguarda sin otra llamada IA. No obliga a turnos redundantes. La única generación anual se inicia desde ese contexto; doble clic y recarga conservan un solo trabajo y una sola respuesta del proveedor.

## Plan generado y edición por UI

Una sola generación anual con gpt-6.1-sol high, 7152 tokens de entrada y 13789 de salida; costo estimado US$0,1557685. Métrica durable de generación 298,214 s; la revisión determinística terminó unos 305 s después de preparar el trabajo. El siguiente sondeo/recuperación visual se observó aproximadamente a los 344 s. El evento duration_ms=373 corresponde al último retrieve de una respuesta background, NO a toda la elaboración del proveedor; no se interpreta como ahorro ni latencia total. Una respuesta proveedor, un trabajo, ninguna reparación anual ni regeneración completa adicional.

Acogida 16–27 marzo, quince tramos 30 marzo–18 diciembre: 11 de dos semanas y 4 de tres; 172/172 fechas asignadas, cero huecos, solapamientos, fines de semana, feriados o gestión asignados, cero overrides del aula. Cruce real con school_calendar_days PASS. Calendario contrastado con RM 501-2025-MINEDU: https://www.gob.pe/institucion/minedu/normas-legales/7380466-501-2025-minedu. Quince tramos es decisión de Ayni, no exigencia MINEDU.

Por UI: intercambiar tramos 1/2 y recuperar orden, retirar a Biblioteca, sustituir una propuesta ocupada mostrando impacto curricular, recargar conservando la alternativa y el tramo vacío, recuperarla y restaurar las quince propuestas. No requiere IA para estos cambios. Las fechas permanecen fijas y no se pierde ninguna propuesta.

Problema real al aplicar una indicación focal: invalid_scope por exigir a la IA devolver literalmente las oportunidades cotidianas e interpretaciones globales y comparar su copia con el original. La indicación sigue guardada y el plan original se conserva; costo del intento fallido US$0,0521235 (9054 entrada/2949 salida). El mensaje de error estaba fuera del Sheet e invisible mientras éste estaba abierto. Corrección mínima: esquema del cambio focal admite únicamente replacements para el número autorizado; se omiten los campos globales de ese request y el servidor los conserva desde el plan original. IDs/autorización/protecciones/cobertura/revisión siguen comprobándose; una devolución que intenta modificar campos globales se rechaza por esquema. El mensaje de error se muestra también dentro del panel. No cambia el contrato global, modelo, calendario ni esquema SQL. Pruebas focales verifican conservación exacta de decisiones globales y propuestas ajenas, pendientes independientes, rechazo de cambios fuera de alcance, versiones y recuperación. Validación cloud posterior pendiente al publicar el arreglo.

Corrección focal validada por UI en commit 1e95ebd / Preview c9ftpdbsa: Aplicar cambios consume la indicación y actualiza solo la primera propuesta; 17,956 s de paso proveedor, US$0,0261585, 7216 entrada/812 salida. Cruce de payloads antes/después confirma igualdad de las otras 14 propuestas, calendario, oportunidades cotidianas e interpretaciones. Costo del mismo ajuste baja 49,8%, salida 72,5%, entrada 20,3%; la operación anterior fue fallida y no conservó duración de proveedor, por lo que no se informa una mejora de tiempo porcentual inventada. Tiempo visual observado con consultas espaciadas incluye al agente.

Segundo problema real: filtro de privacidad convirtió el verbo Construimos de un título solicitado en [persona]; también ocultaba Conserva/Cambia/Permite/Mantén en las instrucciones. Se amplía únicamente vocabulario cerrado de diez verbos pedagógicos habituales; nombres conocidos se neutralizan antes del vocabulario, nombres desconocidos/contactos siguen ocultos. Prueba cubre el título, instrucciones, un nombre conocido que coincide con palabra admitida, nombre desconocido y DNI. No se libera reconocimiento general de mayúsculas ni se cambian permisos. Se deja una corrección de título guardada por UI para validar después de publicar este pequeño arreglo.

Corrección de título validada por UI en d1ae579 / Preview 4vyrj22v6: Construimos lugares para jugar. Último ajuste focal 14,902 s de proveedor y US$0,025746; no se volvió a generar el año. Confirmar Mi año esperó confirmación del servidor y recuperó V1 Vigente. Lista móvil muestra 15 tarjetas, ancho de página 375 con viewport 390 (sin desbordamiento); también se comprobó espera/marca QA y calendario en móvil.

## Primer proyecto

Ver proyecto desde la primera tarjeta abre su propósito, ambas competencias y ocho días de clase (30 marzo–10 abril), excluyendo por UI 2/3 abril y fines de semana. Una sola preparación con doble clic, un solo proyecto y un solo trabajo durable. Se recargó durante Plan Maestro, se recuperó Continuar proyecto y el resultado apareció con dos criterios y ocho previsiones del mapa, ninguna actividad desarrollada ni evaluación generada. Plan Maestro: elecciones de refugio/camino/rincón, ayuda voluntaria, acuerdos según lo que ocurre, cierre sin producto/presentación obligatoria; no infiere niveles de familiares. Trabajo 197 s desde creado a succeeded, de 12:56:35.701Z a 12:59:52.662Z; observación visual espaciada aproximadamente 253 s. Costos US$0,073441 (gpt-6.1-sol / 5269 entrada, 6027 salida) y US$0,000035154 de selección de ilustración abstracta ya existente (project_image / Jev). No se subieron fotos ni se enviaron evidencias privadas a IA. No se confirmó el proyecto: queda listo para revisión humana.

Incidencia focal de UI: pese a map_review, cabecera decía Por preparar, y recarga perdía la propuesta elegida aunque datos/trabajo se conservaran. Corrección mínima en SimpleProjectWorkspace: Preparado para revisar solo con map_review/resultado durable, conserva Confirmado para proyecto activo; persiste UUID de propuesta en ubicación mediante helper existente, recuperándolo al recargar/salir/volver. Sin nuevas peticiones, IA ni cambios de datos. Prueba cloud posterior pendiente. Rollback de esta corrección: revertir el commit de UI, datos siguen disponibles desde Continuar proyecto.

## Evaluación pedagógica y revisión humana

Las propuestas se ajustan a Inicial de cinco años: elecciones y juego real con cajas/bloques, prueba de puentes, mercado, cuentos, macetas, recorridos corporales, sonidos, escritura con destinatario, relatos bilingües y revisión de estrategias. Las cinco actuaciones concretas sustentan propuestas iniciales y cuatro interpretaciones individuales; cuando no existe antecedente, la justificación declara responsabilidad curricular. Las entrevistas aportan intereses familiares, nunca niveles ni desempeños acreditados. Materiales existentes/reutilizados, aportes y participación voluntarios, alternativas sin salidas ni compras, atención a castellano/quechua y sin suponer dominio docente de ambas lenguas. Se mantienen IDs y capacidades oficiales de la versión CNEB de Inicial cargada; la comprobación determinística no sustituye la revisión pedagógica humana.

| Competencia | Propuestas | B1/B2/B3/B4 | Oportunidad cotidiana |
| --- | ---: | --- | --- |
| Construye su identidad | 3 | 1/0/0/2 | Sí |
| Convive y participa | 4 | 2/0/1/1 | Sí |
| Motricidad | 2 | 0/1/1/0 | Sí |
| Comunicación oral | 5 | 1/2/0/2 | Sí |
| Lectura | 2 | 0/1/0/1 | Sí |
| Escritura | 2 | 0/1/1/0 | Sí |
| Arte | 3 | 0/1/1/1 | Sí |
| Cantidad | 2 | 1/0/1/0 | Sí |
| Forma/movimiento/localización | 4 | 1/1/1/1 | Sí |
| Indagación | 3 | 0/1/2/0 | Sí |
| TIC | 0 | 0/0/0/0 | Condicional, sin acceso confirmado |
| Aprendizaje autónomo | 3 | 1/0/1/1 | Sí |

Hay variedad y cobertura, pero la distribución no es uniforme por bimestre: cantidad, lectura y motricidad tienen dos propuestas, sostenidas además en rutinas concretas. TIC aparece como oportunidad eventual condicionada a dispositivo/permisos, no como cobertura material garantizada ni actuación atribuida sin equipo. La docente debe revisar su viabilidad y decidir cómo concretarla, y revisar progresión/distribución según lo que observe durante el año. No se suman rutinas al conteo de propuestas para inflar la matriz.

Limitación del fixture con reloj QA: observaciones tienen fecha pedagógica 16/02, pero confirmaciones de entrevistas/resumen y decisiones conservan sellos técnicos reales de octubre. La IA incluyó una cautela sobre antecedentes posteriores al 16/02. Conviene revisar esa frase en este plan simulado y distinguir fecha de registro/confirmación de fecha pedagógica en una futura decisión de dominio; no se altera el reloj, los sellos existentes ni se genera otro plan para ocultarlo. Los recursos y posibilidades comunitarias de este caso son ficticios; antes de usar un aula real, confirmar seguridad, autorizaciones, apoyos lingüísticos, útiles para escritura y acceso digital. El primer proyecto queda preparado y pendiente de confirmación docente; no se generaron actividades individuales, evaluaciones ni evidencias retrospectivas.

## Tiempos y costos del recorrido controlado

| Operación | Tiempo durable de servidor/trabajo | Costo aproximado USD |
| --- | --- | ---: |
| Resumen del aula | 77,527 s antes de persistir; HTTP proveedor 74,065 s | 0,032414 |
| Conversación anual, apertura + una respuesta | Sin cronometraje HTTP desglosado | 0,002199 |
| Único plan anual, 15 propuestas | 298,214 s de generación; ~305 s hasta revisión terminada | 0,155769 |
| Ajuste focal rechazado antes del arreglo | Duración proveedor no conservada; no se atribuye tiempo del agente a Ayni | 0,052124 |
| Ajuste focal corregido | 17,956 s de paso proveedor | 0,026159 |
| Corrección focal de título | 14,902 s de paso proveedor | 0,025746 |
| Preparar primer proyecto, Plan Maestro + selección de ilustración | 197 s desde trabajo creado a succeeded | 0,073476 |
| Total del recorrido y reproducción/corrección de errores | Una generación anual; sin actividades desarrolladas | **0,367885** |

Costos OpenAI son estimaciones del ledger con versión de precios 2026-10-10, no factura. Selección de ilustración usa costo reportado por proveedor. Las consultas UI espaciadas, recargas y tiempos del intermediario de pruebas impiden comparar los tiempos observados como latencia precisa de una profesora. No se repite una generación costosa para obtener medias ni se afirma un antes/después de velocidad sin métricas comparables. Optimización del cambio focal comprobable: salida de 2949 a 812 tokens, costo -49,8%, éxito preservando exactamente alcance; modelo/esfuerzo del flujo no se rebajan.

## Cierre y entrega

Preview final de producto: https://ayni-aula-staging-8hac4md3s-ayni4.vercel.app, commit **19113a1030330abb7bc090cb0d814733bc9df8d9**, despliegue READY dpl_DMSp1iFunwFqmiSkUmBia5YX1pth. Se publicó con árbol limpio, build local/cloud, typecheck, lint y pruebas focales; seis smoke PASS. Correcciones de resumen/proveedor/calendario: 49 pruebas focales; cambio de alcance: 23; vocabulario: 28; proyecto/recuperación: 10. Estas suites se solapan, no se presentan como suma de casos distintos. No se realizó auditoría general. Producción sigue en dpl_2KDEnPFk7UqyvPa7At3t1RW7sLqy / d595ffebd05d50a1971c8389f4c3d758f22a39a7, verificada nuevamente al cierre. Ninguna migración, cambio de permisos ni despliegue de Producción.

La última Preview recupera V1 Vigente y el primer proyecto preparado. Recargar conserva la propuesta abierta por URL; cerrar sesión muestra acceso, reingresar con cuenta QA devuelve al mismo proyecto con Preparado para revisar, dos criterios y mapa de ocho días. No se llama a IA al recuperar. El año se deja confirmado y el proyecto pendiente de confirmación humana. Los cinco niños activos del fixture se conservan, cuatro entrevistas, cinco observaciones activas y seis históricas (una retirada recuperable), un plan anual, un trabajo anual, un proyecto, un trabajo de proyecto y cero actividades desarrolladas. Nueve eventos de uso, total US$0,367885254. Se deja la Preview abierta para seguir QA; la URL previa 5704x75jz corresponde a código anterior y no incorpora estas correcciones.

Límite visual: espera anual/lista de quince propuestas/calendario inicial del proyecto se verificaron a 390 px antes de reconectar el sidepanel. Tras la reconexión, el control de viewport no aplicó el tamaño solicitado a las pestañas recuperadas (DOM continuó 1366/1280); no se declara como validación móvil nueva del último estado preparado. Se conservan las capturas anteriores de móvil y la evidencia real de escritorio final, sin modificar código para el intermediario. Conviene una última mirada humana al Plan Maestro en el teléfono.

Los cuatro cambios son reversibles por sus commits: 8b65bd7 (recuperación resumen/instrumentación), 1e95ebd (alcance y error del panel), d1ae579 (vocabulario), 19113a1 (estado y selección de proyecto). Las comprobaciones React de estos cambios no añaden efectos de generación, peticiones nuevas, listeners de navegación ni dependencia a paquetes; se reutilizan helpers existentes y los estados se derivan de confirmaciones durables. No se aplicó cambio SQL en Supabase. Este cierre se guarda en un commit solo documental posterior; no exige otro despliegue ni generación.
