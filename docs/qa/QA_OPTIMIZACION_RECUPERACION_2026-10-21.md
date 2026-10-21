# Recuperación y optimización conservadora — 21 de octubre de 2026

## Alcance autorizado

La usuaria autoriza optimizar recuperación, duplicados, reutilización y preparación independiente, registrando tiempos y costos. Condición principal: preservar el código y contenido que ya funcionan. La conversación adjunta sobre uso masivo se trata como hipótesis, no como prueba de capacidad.

## Diseño previo y límites

1. Completar primero un flujo vertical de diagnóstico recuperable: identificador del proveedor guardado al comenzar, consulta del mismo resultado, autorización servidor, exclusión concurrente, fuentes vigentes y confirmación docente intactas. Mantener la ruta síncrona compatible y los Word actuales.
2. Conservar modelo, esfuerzo, instrucciones pedagógicas, currículo y validadores. Extraer la construcción de la solicitud sin cambiar su contenido y comprobar igualdad de solicitudes; no reducir fuentes para ahorrar tokens.
3. Reutilizar la cola/dispatcher firmado existente. Separar creación de consulta, limitar esperas y reconocer incertidumbre sin repetir automáticamente una creación cuyo resultado se desconoce. Saldo y autenticación requieren intervención; demoras no equivalen a documento inválido.
4. Hacer configurable la concurrencia de preparación con valor actual por defecto. No elevar límites en QA ni Producción. Las pruebas de carga son aisladas con proveedor simulado; no acreditan capacidad cloud contratada.
5. Mantener los lotes independientes existentes, la regeneración selectiva y las fuentes/versiones. Probar recuperación parcial y ausencia de duplicación antes de ampliar módulos.

Máximo de seis llamadas reales nuevas para toda esta campaña, incluidos fallos y reparaciones, con contador persistente antes de enviar. Consultar un ID no es una nueva generación. La mayoría de comprobaciones usa respuestas simuladas. El límite de seis es un techo, no un objetivo. Recibos privados en `.local/optimizacion-recuperacion-20261021/`; sin secretos ni datos de menores en Git.

Permisos: mismos propietarios, aula activa y fuentes verificadas en servidor; sin nuevas cuentas ni cambios de RLS. Usar columnas JSON existentes; no modificar migraciones aplicadas. Sin envío de medios a IA. Cambios preparados primero localmente; QA solo tras commit identificado, checkout limpio, staging y smoke. Producción fuera de alcance.

Rollback: conservar el lector recuperable mientras existan respuestas en curso; resolver o detener sus trabajos antes de volver a un servidor anterior. Con la cola vacía se puede revertir el commit y restaurar el alias previo. Nunca borrar identificadores, evidencias ni resultados confirmados para recuperar una generación.

## Estado

Finalizado y publicado solo en QA, código `5a6f81634fb22ebabc5c845d5fa2ed54b4c3b90f`, deployment `dpl_8BEetmESi7yxa63UeMPVnWEQyiAB`. Producción conserva `dpl_H19YWzRdGjkgh8y72QAd1qBty7Mf`. Las anotaciones de pendientes siguientes describen etapas anteriores; el cierre comprobado está al final.

## Implementación comprobada localmente

El diagnóstico guarda un trabajo en `ai_snapshot`, reutiliza la misma propuesta vigente y persiste el ID al recibirlo del proveedor. Sus consultas posteriores recuperan ese ID. Creación y consultas tienen leases distintas, exclusión SQL entre instancias y un único dispatcher acotado. La continuación usa la firma/nonce del scheduler existente. Sin esquemas nuevos ni cambios de permisos.

La ruta síncrona sigue compatible; no puede sobrescribir un trabajo recuperable activo o incierto. Una creación sin ID que se interrumpe queda incierta y exige una acción docente explícita para repetir; una consulta interrumpida conserva el ID. Se respeta Retry-After, con consultas acotadas y como máximo dos creaciones ante rechazo 429. Saldo/autenticación y respuestas expiradas detienen la recuperación automática. No se envía una nueva creación porque se haya recargado una página.

La pantalla puede consultar el avance y aplicar la propuesta solo por decisión de la profesora; no reemplaza texto mientras escribe ni confirma automáticamente. Se conserva el borrador y el diagnóstico confirmado. Un resultado con fuentes cambiadas no se presenta como vigente. El consumo de una respuesta background se identifica por docente, flujo e ID mediante hash: recuperarla dos veces no inserta dos eventos.

La consulta de un trabajo ya solicitado también puede reactivar su dispatcher si se perdió una continuación. La lease global impide ejecutar varios drains por las consultas simultáneas; no se inicia una creación por leer un borrador sin trabajo. En el primer staging, los controles de acceso devolvieron 401/404 correctamente; se corrigió la expectativa del smoke (un confirmado no editable se oculta con 404, no 422). El alias QA no se movió durante esa comprobación.

La revisión del recorrido principal identificó también `DiagnosticBriefReview`, además del editor anterior. Ambos usan el trabajo recuperable. El editor moderno conserva guardado automático, navegación y «Usar el resumen preparado»; recibir la respuesta solo ofrece la propuesta, sin sustituir lo que la profesora escribió durante la espera. Se refuerza esa comprobación mediante el guardado canónico mientras la respuesta está en curso. La prueba de continuidad consulta el componente extraído para verificar la misma etiqueta, en lugar de exigir que su literal permanezca en el archivo padre.

`AYNI_PREPARATION_CONCURRENCY` permite 1–6; por defecto sigue en 2. `AYNI_PREPARATION_PER_TEACHER_CONCURRENCY` conserva 2 por defecto y permite reservar lugares al subir el límite global deliberadamente. Configuración inválida vuelve al valor conservador. No se han cambiado variables cloud. Esto no representa un límite global para todas las llamadas de IA: el diagnóstico tiene su propia cola de dos y la evaluación por lotes mantiene sus políticas existentes.

Los lotes de evaluación e informes ya reutilizan resultados actuales, comparten contexto y retoman lo pendiente. Se conservaron sus servicios; las pruebas comprueban guardado parcial, fallo de contexto, timeout y fuentes nuevas sin repetir resultados correctos.

## Evidencia y mediciones

168 pruebas distintas PASS: diagnóstico nuevo y anterior, leases, veinte diagnósticos simulados con dos respuestas activas, veinte docentes en preparación con límites 2/4/6, sin duplicados, permisos, Word, evaluación, informes y recuperación selectiva. Typecheck, lint y build PASS. Se repetirá el gate desde checkout limpio antes del release; no se sumarán esas repeticiones al conteo.

La solicitud real anterior y la nueva coinciden íntegramente: hash `7d2fb55a5a3643f995ef4fd5ffcb5d24ea8687f67119016fe2b1c4232815870b`. Mismo modelo Sol 6.1 high, skill, fuentes, currículo, instrucciones y schema. No se abrevia ni elimina texto pedagógico. Se optimiza el ciclo de trabajo, no el análisis. No hacen falta nuevas generaciones para cambiar un Word o recuperar una respuesta.

Ensayo real en copia local aislada: una creación, ID recibido y primer paso devuelto a los 2,325 s; 21 consultas de esa misma respuesta; resultado válido a los 130,049 s. Once lecturas revisadas y diferenciadas, fuentes explícitas, sin notas automáticas; borrador no confirmado. US$0,098631 estimados, cero costos nuevos desconocidos y cero escrituras remotas. Se usó una de las seis llamadas reales máximas de la campaña hasta este punto. No demuestra una generación más rápida que los 107 s anteriores; demuestra recuperación sin otra creación. El primer paso incluye preparación local y no equivale a latencia HTTP cloud.

Se verificaron estudiantes y doce grupos de registros en las columnas comunes de la copia: fuentes, comentarios, plan, proyecto, actividad, criterios, observaciones, informes, conclusiones y diagnósticos confirmados intactos. Los medios se excluyeron deliberadamente y las columnas exclusivas remotas requieren el smoke cloud. Fechas DATE comparadas como fechas, sin trasladar el día del hecho.

## Problemas y prevención

- Síntoma: una espera agotada se interpretaba como fallo y no había ID temprano que consultar. Causa: el diagnóstico esperaba la respuesta completa dentro de una sola solicitud. Solución: trabajo persistente e ID inicial, sin repetir creaciones inciertas. Prevención: pruebas de interrupción, lease expirada, 429, saldo y consulta del mismo resultado.
- Síntoma: recuperar una respuesta podría duplicar la estimación de consumo tras una interrupción de guardado. Causa: eventos con UUID nuevo en cada consulta terminada. Solución: identidad estable solo para respuestas background, manteniendo la atribución docente. Prevención: prueba de identidad repetida y aislamiento entre docentes; las llamadas ordinarias mantienen su comportamiento.
- La revisión UI local completa encontró un timeout del transporte de desarrollo Vinext/Vite antes de cargar la página. No se atribuye a pedagogía ni a capacidad cloud y no se cambia código de producto para eludirlo. La revisión visual final se hará sobre el build de staging antes de declarar el flujo validado visualmente.

## Sobre el uso masivo

La conversación adjunta plantea riesgos razonables, pero veinte docentes simuladas no prueban la capacidad real de Vercel, Supabase o la organización de IA. No se verificaron los límites contratados ni se elevó concurrencia automáticamente. Las claves de una misma organización/proyecto no multiplican por sí solas las cuotas. Se preserva el pool y el hosting: no hay medición que justifique sustituirlos o subir sus límites.

Fuentes oficiales consultadas: [OpenAI: background](https://developers.openai.com/api/docs/guides/background), [límites y Retry-After](https://developers.openai.com/api/docs/guides/rate-limits), [latencia](https://developers.openai.com/api/docs/guides/latency-optimization), [Vercel: vida de funciones y waitUntil](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package), [Supabase: conexiones](https://supabase.com/docs/guides/database/connecting-to-postgres). El almacenamiento temporal de respuestas background permite su consulta; se mantiene `store:false` y la proyección anónima existente, sin medios.

## Cierre de QA y prueba real del editor principal

Commit identificado, push, checkout limpio y gates finales PASS: typecheck 7,692 s; lint 34,734 s; build 20,451 s; 41 pruebas focalizadas 23,786 s. Estas últimas se solapan con las 168 regresiones distintas: no se suman como 209. Publicación final 193,275 s y smoke 62,676 s, 66 comprobaciones correctas entre Preview y alias QA. El primer staging se detuvo por una expectativa incorrecta del smoke; los dos previews anteriores nunca sustituyeron el alias. Producción no se movió.

Segundo ensayo real desde el botón del editor principal publicado: aviso pendiente visible a los 683 ms desde el clic (incluye automatización UI, no HTTP puro). Se escribió y guardó una nota, se salió del editor y se volvió. Ayni ofreció el resultado sin reemplazar esa nota ni confirmar el diagnóstico. Nueva solicitud al terminar reutilizó la propuesta: una creación y un único evento de consumo. Dieciocho consultas al proveedor, once lecturas válidas. Resultado persistido aproximadamente a los 179,6 s; el verificador lo detectó a los 186,808 s. La reconsulta HTTP desde un segundo cliente tardó 423,681 ms; no es la solicitud inicial. El proceso completo de ensayo, incluida preparación y espera de la interacción, duró 216,590 s.

La comprobación posterior comparó hashes de 64 tablas, los tres diagnósticos anteriores completos y el historial de consumo. Todo anterior intacto; única adición pedagógica deliberada: borrador v4 sin confirmar, con nota docente y propuesta lista separada. Trece archivos privados conservados. La comparación de fechas de PostgreSQL normaliza solo su representación Date/ISO, sin cambiar valores. No se aplicó la propuesta ni se enviaron medios a IA. El Word confirmado sigue leyendo v3.

Dos creaciones reales de un máximo total de seis: US$0,098631 en copia aislada y US$0,1111735 en QA, total estimado US$0,2098045; cero costos nuevos desconocidos. Acumulado con auditoría anterior: 96 llamadas con precio, US$1,14970942, más siete intentos históricos sin precio. Las consultas de recuperación no cuentan como nuevas generaciones. No se afirma ahorro de duración de la IA: 130 s y unos 180 s siguen siendo esperas largas.

Se comprobó recuperación al navegar y reutilización; no se acredita una prueba prolongada sin ningún cliente consultando. El verificador secundario pausó 80 s, pero la interfaz estuvo abierta parte de ese intervalo. No hay cron configurado en QA: se conserva continuación firmada y reactivación al consultar, sin crear cron ni cambiar infraestructura. Capacidad masiva real y cuotas contratadas siguen sin medirse. Sin nuevas migraciones, permisos, modelos, prompts o variables de concurrencia cloud.

Capturas finales de escritorio `013a` y `013b`, tomadas después de publicar y verificar, añadidas al recorrido para video; dictado en español conserva su segmento. No se montó video. El intento de cambiar viewport no produjo píxeles móviles y no se declara una nueva revisión móvil. Entrega: `outputs/Ayni-optimizaciones-2026-10-21/`, reporte Word, mediciones, costos y verificación; fuentes privadas y recibos permanecen fuera de Git.
