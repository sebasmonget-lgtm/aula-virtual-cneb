# Persistencia y preparación con IA de Unidocencia

## Alcance

Continuación local del recibo 08 sobre `26e51f3`, conservando la interfaz compartida de Ayni. No se publica, hace push, aplica migraciones remotas, abre `.local/pgdata` ni usa las cuentas Vercel/Supabase. La modalidad sigue requiriendo la elección expresa inicial; no se convierten aulas V1.

Se implementan dos capas completas: almacenamiento local durable y propuestas recuperables para diagnóstico individual, Mi año y actividad con criterios por edad. La confirmación de observaciones, diagnósticos, planes, actividades, notas, conclusiones e informes sigue siendo docente. Esta fase no habilita una cuenta multiedad persistente en producción ni completa los otros pendientes funcionales del recibo 08.

## Almacenamiento y migraciones

`openMultiAgePersistentDb` solo admite un nombre, no una ruta o conexión externa. Crea `.local/multi-age-stores/<nombre>/`, con marcador de propiedad e identidad estable, bloqueo de proceso y PGlite propio. Rechaza rutas ascendentes, enlaces, carpetas con contenido ajeno, un marcador incorrecto u otra apertura activa. Un bloqueo de un proceso terminado se recupera con exclusión de otros recuperadores; un bloqueo de recuperación abandonado falla de forma cerrada y requiere inspección local.

El registro `multi_age_local_migrations` guarda SHA-256 y ejecuta cada migración una vez en transacción. Una alteración de un archivo ya aplicado impide abrir el almacén; no modifica ese archivo ni adopta la base anterior. Los archivos legados que ya contienen BEGIN/COMMIT se ejecutan bajo la transacción del registro local. No se editó ninguna migración aplicada.

Se agregan `0079_multi_age_generation_jobs.sql` / `202610230001_multi_age_generation_jobs.sql` y la continuación aditiva `0080_multi_age_generation_history.sql` / `202610230002_multi_age_generation_history.sql`. Esta última conserva el resultado original inmutable cuando deja de estar vigente; la API no lo ofrece para aplicación. Los documentos derivados guardan el ID de preparación. El SQL Supabase está preparado y probado en PGlite con roles/RLS; **no aplicado a Supabase real**. La cola es distinta de ambas colas anteriores, valida propiedad/contrato también por trigger y permite a authenticated leer solo sus filas, sin escritura directa.

## Propuestas y recuperación

`multi_age_generation_jobs` conserva tipo, destinatario, huella de fuentes, modo del proveedor, intento, lease, estado y resultado validado. Las fuentes infantiles no se duplican como solicitudes crudas en esa tabla. Las huellas incluyen instrucciones y esquema; la serialización canónica evita depender del orden de claves JSONB al reiniciar.

Los pedidos equivalentes se agrupan por docente, tarea, fuentes y proveedor. Un ejecutor reclama una tarea de forma atómica; consultar o recargar no solicita IA. Estados: queued, running, ready, failed, interrupted y stale. Los resultados no contienen una confirmación docente. Las tareas listas se leen sin regenerar; antes de mostrarlas o aplicarlas se vuelven a verificar fuentes, matrícula y linaje anual. Una respuesta inválida o con IDs de otra edad/niño no se aplica.

No se reintentan fallos automáticamente. Una llamada interrumpida puede haber generado consumo: queda pendiente de reintento explícito, con aviso y máximo tres intentos. Al reiniciar se conservan cola/resultados y se marcan las llamadas en curso como interrumpidas; no se promete recuperar una respuesta perdida del proveedor. No hay cadena adicional de reparación automática. Mi año dispone de 300 s por intento (lease de 360 s); diagnóstico/actividad conservan 90 s. La espera ocurre en el ejecutor local, sin mantener una solicitud de pantalla abierta.

La aplicación exige una versión vigente antes de confirmar. Esa comprobación ocurre dentro de la transacción y después de consultar el recibo idempotente, para que una respuesta perdida de confirmación no duplique una actividad ni falle porque la tarea ya quedó histórica.

## IA, fuentes y permisos

El runtime tiene tres modos explícitos: off, fixture y openai. Por defecto está apagado. El launcher no hereda claves generales ni credenciales cloud. OpenAI exige `AYNI_MULTI_AGE_OPENAI_API_KEY` en el proceso servidor; no se pasa al proceso frontend. No hay URL de proveedor configurable ni fallback a Mirai u otra cuenta.

Se reutilizan el router, factory, SDK, modelos y razonamiento de Ayni. Una opción aditiva `store:false` se utiliza solo aquí; las llamadas anteriores conservan su comportamiento. El resultado conserva metadatos acotados y uso cuando está disponible; no se guardan claves, headers o errores crudos en logs/documentación. Una llamada sin usage no se anuncia como gratuita.

Diagnóstico recibe únicamente las observaciones del niño y su edad curricular; los relatos familiares siguen siendo contexto separado. Mi año recibe revisiones guardadas, información pendiente, calendario y currículo de cada grupo. Actividad recibe además la posición anual confirmada; no se propone una actividad desligada del año. Nombres, nacimiento, fotos, grabaciones y adjuntos no se incorporan por defecto al contexto. La validación de estructura/IDs no equivale a demostrar toda la calidad pedagógica del texto.

Se consultó [OpenAI Docs sobre Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs): el contrato JSON estricto se combina con validación pedagógica y de fuentes en servidor; no se toma el esquema como prueba de veracidad.

## Interfaz y comandos

Se conservan el frame, cinco destinos, timeline, lector, carpetas y navegación de Evaluar. Solo se añade el control de preparación en los formularios existentes. La propuesta se abre para revisión explícita y puede editarse; no reemplaza un plan al llegar. Se advierte antes de sustituir campos con cambios sin guardar. Volver a la versión guardada no genera ni escribe. Las simulaciones se identifican y no se muestran como resultados de IA real al cambiar de proveedor.

- `npm run dev:multiedad:app`: base temporal, IA apagada, comportamiento de prueba previo.
- `npm run dev:multiedad:persistente`: almacén separado `unidocencia`, IA apagada.
- `npm run dev:multiedad:qa`: almacén separado y simulación identificada, sin tráfico de IA.
- `AYNI_MULTI_AGE_STORE_NAME` selecciona otro nombre propio; no permite elegir una base V1.
- Para conectar IA: configurar la clave propia fuera del repositorio y `AYNI_MULTI_AGE_AI_MODE=openai` en el proceso servidor. No pegar claves en el chat ni escribirlas en estos recibos.
- `npm run test:multiedad:persistencia`: pruebas de reinicio, tareas y recorrido HTTP completo.

La vista de esta entrega utiliza `qa-persistencia-20261023`, con datos ficticios preparados por el test HTTP, no mediante otra matrícula manual. Conserva siete documentos y cinco tareas. Evidencia de escritorio 1366 y viewport móvil 390 en `.local/multi-age-main-20261023/persistencia-ia/`; no es prueba en celular físico.

## Verificación y límites

101 pruebas distintas PASS: 41 multiedad, 7 API principal, 11 persistencia/generación y 42 de proveedor, paridad de esquema y continuidad/navegación. Rondas repetidas no se suman. Typecheck, lint y build Vinext PASS; lint conserva solo la advertencia histórica de `diagnostic-generation-control.tsx`, build conserva advertencias de dependencias/chunks/clasificación.

El HTTP real reinicia el proceso varias veces, recupera matrícula y borradores, genera propuestas simuladas de las tres edades, conserva las notas/conclusiones y descarga siete Word. Se prueban aislamiento de docentes, CSRF/origen, reintentos, errores sin datos privados, límite de intentos, actualización de fuentes durante una llamada, RLS y rechazo de migraciones alteradas. El cliente OpenAI se ejercita también con transporte simulado, JSON estricto, edad propia y `store:false`.

La muestra de IA real tiene recibo aparte, producido por `scripts/multi-age-ai-smoke.mjs --use-configured-text-key`: utiliza explícitamente la clave de texto de `.env.local` en memoria y fuentes inventadas en una base nueva, sin cambiar el archivo ni activar esa clave en el preview. No cargar todas las variables de ese archivo al launcher. Resultados y uso quedan privados bajo `persistencia-ia/live-*`; comprobar su recibo antes de declarar éxito. El smoke puede retomar su propio almacén con `--resume-store=ai-smoke-<marca>`; un intento fallido exige además `--retry-interrupted`. Los diagnósticos ya confirmados no vuelven a generarse.

**Resultado real comprobado:** `live-1792771763510/receipt.json` contiene `status:passed`: cinco respuestas válidas de `gpt-6.1-sol` (tres diagnósticos, año y actividad), seis intentos contando el timeout anual inicial. El segundo intento anual tardó 244,4 s y conservó quince posiciones, cobertura y referentes propios. Se revisaron las tres lecturas individuales y la organización/primera posición/actividad; las lecturas citan únicamente sus registros, la organización explicita pendientes y una profesora, y la actividad conserva tres variantes de PS_IDENTIDAD con sus IDs oficiales. No se presenta esta muestra como certificación de todas las decisiones pedagógicas del año. Subtotal estimado del ledger: USD 0,2410782 para las cinco respuestas medidas; el primer intento anual tiene consumo incierto y no se incluye como gratuito ni como costo total. El almacén real `ai-smoke-1792771763510` se reabrió con las migraciones nuevas: cuatro documentos exportables y una actividad con criterios 3/4/5 conservados. La prueba real no completó nuevas notas/familias: esa continuidad y los siete Word se comprobaron en el recorrido HTTP con proveedor simulado. No se suman ambas muestras como una sola ejecución manual.

Al cerrar esta fase seguían pendientes persistencia/Auth/RLS en staging real, conversación y edición anual por IA, varias actividades por proyecto, competencias diferentes entre grupos en la interfaz de preparación, correcciones versionadas, diagnóstico grupal, talleres, Excel y los demás casos del recibo 08. Notas/conclusiones/informes conservan su flujo manual confirmado. El respaldo de la fase anterior y el trabajo local previo permanecen. La continuación local de conversación y actividades sucesivas, con sus límites actuales, se registra en [el recibo 10](10_CONVERSACION_Y_VARIAS_ACTIVIDADES.md).

## Rollback

Detener el launcher preserva el almacén. Volver al comando temporal no lo borra ni migra sus filas a V1. Quitar el flag conserva el gate anterior sin consultar tablas V2; no eliminar datos para volver a una edad escalar. Para una futura actualización, crear migración nueva y comprobar copia/restauración antes de cualquier rollout. Esta fase prueba reinicio local, no backup/restauración ni disponibilidad cloud.
