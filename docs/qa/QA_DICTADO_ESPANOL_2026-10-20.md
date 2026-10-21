# Dictado: detectar español y devolver español

## Incidente comprobado

En la entrevista inicial del enlace QA se mostraba «No se pudo transcribir el audio. Puedes escribir la observación». Dos peticiones de las 20:14:03 y 20:14:29 de Lima devolvieron 503. Los eventos guardaban solamente `audio_transcription_failed`, sin causa tipificada: no permiten determinar si falló el proveedor, expiró la llamada o se recibió texto vacío. No atribuirlo a micrófono, falta de saldo, archivo incompatible o claves sin evidencia.

Una voz generada de control pasó en el endpoint real de QA (HTTP 200, 1.687 ms), sin guardar respuestas pedagógicas. Un reintento de la grabación conservada de la persona usuaria terminó en 200, devolvió `пожалуйста,` y el formulario la guardó automáticamente como borrador. La persona usuaria confirmó que había leído opciones en español: correr, saltar y leer, y pidió explícitamente detectar español y devolver español.

Se quitó únicamente ese texto incorrecto por UI. Se comprobó «Sin respuestas todavía», 0/8 y confirmación deshabilitada; no se sustituyó por un relato supuesto. El audio original se liberó al completarse la transcripción mediante el comportamiento previo de la aplicación y no se conserva una copia para evaluar nuevamente sus palabras. El reintento no confirmó la entrevista. Evidencia de limpieza fuera del montaje promocional: `outputs/ayni-recorrido-20261020/hallazgos/002-dictado-borrador-limpio.jpg`.

## Causa del guardado incorrecto y corrección

El código anterior solicitaba `language: "es"` a `gpt-4o-mini-transcribe`, pero aceptaba cualquier texto no vacío. La indicación del idioma no validaba el resultado ni evitaba que llegara al autoguardado. No había una comprobación del idioma detectado.

Se cambia únicamente el tier de transcripción a `gpt-transcribe`, que devuelve los idiomas detectados en `languages`. Se envía `languages: ["es"]`, sin combinarlo con el parámetro singular antiguo, y un contexto genérico de dictado sin opciones, nombres ni ejemplos que puedan rellenar el contenido. La documentación oficial describe los [campos de idioma y respuesta](https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create) y [su uso para transcribir en el idioma original](https://developers.openai.com/api/docs/guides/speech-to-text).

Antes de devolver texto, el servidor exige texto con voz reconocida y metadatos de español. Otro idioma, mezcla o idioma incierto produce 422, sin campo de transcripción. Una comprobación adicional de escritura impide aceptar cirílico u otros alfabetos incompatibles con una etiqueta española; no identifica inglés por caracteres latinos ni usa listas de palabras para decidir idioma. El caso inglés se rechaza por el idioma detectado. Se conservan tildes, puntuación, nombres y préstamos en frases españolas. No se traduce ni se fabrica una alternativa a un resultado rechazado.

La entrevista, comentario docente, resumen de grupo y observación literal conservan el texto aceptado sin reescritura. Solo la observación que ya permitía edición mantiene ese paso, con instrucción de español y control de escritura antes de responder. El éxito incluye `language: "es"`. No se cambian permisos, documentos, notas o criterios pedagógicos.

El cliente conserva la grabación al recibir error y permite reintentar mediante el comportamiento existente. Configuración ausente, rechazo del audio, voz vacía, idioma incierto, timeout, límite del proveedor y otros fallos reciben mensajes y códigos acotados. Los logs aceptan solamente códigos de una lista fija y HTTP status, sin audio, transcripción ni error crudo del proveedor. El mensaje de recuperación sirve para una respuesta de entrevista, no la llama observación.

No se garantiza exactitud palabra por palabra ni se identifica el idioma mediante una regla curricular. La docente debe revisar lo que se transcribe; un resultado en español todavía puede contener errores de reconocimiento.

## Validación

- 49 pruebas distintas PASS: 36 de audio, idioma, routing, consumo y frontera HTTP; 13 de alta/seguridad. HTTP real local con PGlite temporal y Auth/proveedor simulados: ruso rechazado antes de devolver texto; español aceptado literal; no se crea entrevista por llamar al endpoint; aislamiento de otra docente conservado.
- Casos: ruso real observado, cirílico mal etiquetado, inglés en alfabeto latino, idiomas mezclados, silencio, metadatos ausentes, texto excesivo, nombres y tildes, RAW exacto y errores sin secretos.
- Dos pruebas reales del servicio modificado, con voces generadas de control: español aceptado con `language: es`, inglés rechazado con `language_not_spanish`. Sin audio de menores ni guardados pedagógicos. La voz sintética española se reconoció como «Él gusta correr, saltar y leer.»: valida idioma y contrato, no exactitud perfecta del contenido. La grabación de la persona usuaria no se volvió a enviar al servicio modificado.
- Typecheck, lint, build Vinext y Next webpack PASS; `git diff --check` PASS. Advertencias de dependencias/chunks en Vinext sin fallo.
- En el primer barrido apareció un fallo previo en el test de RLS: su expresión regular cortaba `preparation_jobs_v2` al llegar al dígito. Se corrige la lectura de identificadores SQL y se verifica el nombre completo. La migración ya tenía RLS; no se modifica ni se aplica una migración.

Recibos y audios de control en `.local/qa-audio-20261020/`, ignorado por Git. Se consultaron secretos solo por herramientas existentes, sin imprimirlos. Las pruebas de control enviaron solo voz sintética; el único reintento del audio aportado fue en la misma aplicación, para el mismo propósito solicitado.

## Coste, publicación y rollback

La [tarifa oficial de GPT-Transcribe](https://developers.openai.com/api/docs/models/gpt-transcribe) consultada es USD 0,0045/minuto. El consumo nuevo se estima por duración; las filas y tarifas históricas del modelo anterior se conservan. Una llamada de transcripción por intento; no se añade un clasificador textual ni una segunda llamada para detectar idioma.

Corrección local preparada sobre `a9e9fdd`, que conserva el logo y cumpleaños. No publicada todavía: el enlace QA sigue en `fabda4b`. La publicación requiere solicitud expresa, commit limpio, Preview aislada y smoke de español/idioma rechazado antes del alias. No se ha modificado Producción.

Rollback del cambio de código/modelo y sus pruebas, sin restaurar datos. No usar un fallback automático al modelo antiguo: perdería el metadato que exige la validación de español. Conservar el registro del incidente y no restaurar la palabra incorrecta como respuesta familiar.

## Publicación efectiva autorizada

La persona usuaria pide expresamente commit y subida para continuar QA. Los commits `a9e9fdd` (cumpleaños) y `58a44df6313d5a222c86c624907b881f68573b84` (español) quedan subidos a `codex/qa-corrections-20261019`, sin sustituir los cambios recientes. Árbol limpio y remoto sincronizado al desplegar. Preview `dpl_418kZFSTvnYMSYVAExnfZtDuyQdM`, región gru1, fuente exacta `58a44df`, base aislada `lqrkhdjdxcejyamzrwoi`.

Antes y después de mover `https://ayni-aula-qa-20261019.vercel.app/`, 38 comprobaciones PASS: acceso, identidad, logo privado, diez niños, calendario, avisos de hoy/mañana, año inválido, español aceptado y voz inglesa rechazada. Dos voces sintéticas en cada host, cuatro llamadas de transcripción en total; no se guardó texto de entrevista ni se reintentó la grabación nueva de la persona usuaria. La política exige español, no solo exclusión de inglés: las regresiones locales cubren también ruso, otros alfabetos, metadatos inciertos y mezclas.

Huellas de todas las fuentes pedagógicas y cantidades iguales: un aula, diez niños y once imágenes privadas. El consumo histórico conserva sus huellas; las únicas cuatro filas nuevas son el consumo esperado de los controles sintéticos del nuevo modelo. Producción conserva `dpl_H19YWzRdGjkgh8y72QAd1qBty7Mf`, fuente `9a0920230350cd6b9050f35683a1f35d459e78c7`. No migraciones ni generación de diagnóstico.

La primera ejecución del smoke no llevaba la cookie del reloj QA y encontró la fecha predeterminada de sus propias peticiones. Se detuvo antes de probar audio o mover el alias. El recibo corregido obtiene por PUT una cookie de reloj solo para esas peticiones, usando la fecha visible de la profesora (18 de diciembre, 16:00); no cambia el reloj del navegador ni fuentes pedagógicas. No se debilitó la comprobación de fecha.

Verificación visual del alias en otra pestaña: tortitas/nombres de Mateo y Abril en Calendario, avisos de hoy y mañana con nombres completos en Hoy. Capturas completas guardadas en el recorrido. La pestaña original de entrevistas conserva el audio pendiente de reintentar; no se recarga ni se descarta para actualizar la página. El API nuevo ya atiende ese mismo enlace. Recibos en `.local/qa-dictado-cumple-release-20261020/`, especialmente `release.json`; cierre documental posterior sin cambios al producto publicado.
