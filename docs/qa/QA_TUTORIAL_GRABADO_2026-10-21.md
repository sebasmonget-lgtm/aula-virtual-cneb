# Tutorial grabado de Ayni · 21 de octubre de 2026

La usuaria rechazó el montaje anterior por voz robótica, capturas pequeñas y explicación insuficiente. Pidió grabar el uso completo, mouse suave y PC como vista principal; celular únicamente en un segmento breve. Se rehace como recorrido explicado sobre el aula QA ya preparada, sin cambios de aplicación ni despliegues.

## Grabación y contenido

Se captura la pestaña autorizada de Ayni en el navegador integrado por tramos mientras se navega, abre formularios, escribe un ejemplo y descarga documentos. No se captura el escritorio, otras ventanas, conversaciones, claves o la entrada de contraseñas. Resolución fuente PC 1585×892 dentro de viewport 1600×900; móvil 430×920 de viewport. Salida 1920×1080 a 30 fps, con la aplicación como imagen principal, sin el panel de títulos que reducía las capturas anteriores.

El montaje usa 55 tramos (54 distintos), más de 4.600 cuadros originales. Conserva movimientos de la interfaz; prolonga algunas pausas para leer y ajusta pequeños intervalos a la narración. No es una toma continua ni representa tiempos reales de generación. El cursor se añade y suaviza en edición sobre las posiciones de las acciones registradas; no se dibujan clics en coordenadas fuera del encuadre. No se afirma movimiento humano del mouse. Subtítulos en banda inferior y aviso de datos/imágenes generados y voz IA.

Duración comprobada: **513,77 segundos (8:34)**, móvil **17,87 segundos** (menos del 4 %); el resto es PC. Recibo y verificación final conservan la duración real del archivo. Capítulos:

1. Bienvenida y finalidad de Ayni.
2. Perfil, colegio, logo, inscripción, nacimiento/foto, perfil infantil, familia, entrevista y botón de dictado.
3. Observaciones libres/guiadas, escritura concreta, fotografía opcional, fecha, criterio, selección infantil y diagnóstico vigente.
4. Chat directo, fuentes/prioridades, mapa anual, selección de proyecto, propósito, recorrido, materiales y documento anual.
5. Hoy, asistencia, actividad por momentos, criterio/observación, dictado/foto, calendario/cumpleaños y biblioteca de talleres.
6. Evaluación por competencia/niño, evidencias, análisis, decisión docente, informe familiar, recomendaciones, descargas, consolidado, pendientes, carpetas y vista móvil breve.

Se verifican descargas reales desde la interfaz: diagnóstico Word, anual Word, informe familiar Word y consolidado Excel. No se abren Word/Excel mediante la automatización nativa que había sido detenida en el turno anterior; las lecturas se muestran en la propia aplicación. No se usa ni se sortea esa herramienta bloqueada: el recorrido nuevo se controla y captura exclusivamente mediante las APIs del navegador autorizado.

## Alcance y preservación

El video lo dice expresamente: se usa un año ya preparado y una actualización diagnóstica, no nuevas generaciones instantáneas. Se muestra dónde dictar/tomar/adjuntar foto; no se graba una nueva prueba física de micrófono o cámara. La vista móvil es el navegador redimensionado. La toma del cierre sigue mostrando pendientes y botón deshabilitado; no se inventan valoraciones para habilitarlo.

No se guardan nuevas entrevistas, asistencia, observaciones, notas o cierres. El texto de ejemplo se retira sin guardarlo; la entrevista se restaura a sus datos confirmados sin confirmar una nueva versión. La revisión posterior compara 66 tablas con la copia previa: **64 iguales**; cambian solamente `student_context_snapshots` y `document_artifacts`. La inspección confirma una nueva fila derivada en cada tabla, por consulta del perfil/descarga; las filas anteriores permanecen iguales. No declarar por ello «cero escrituras» o «66 tablas intactas». Los registros pedagógicos fuente y el consumo de IA dentro de Ayni conservan sus hashes.

## Voz y sincronización

Nueva voz sintética **Marin**, modelo `gpt-4o-mini-tts`, con instrucciones de español latinoamericano, tono cercano y pausas conversacionales; no es la voz básica de Windows ni una voz clonada. Se generan una introducción y cinco capítulos. Una petición inicial del segundo capítulo agota 120 s; se conserva como intento de costo incierto y se repite solo ese capítulo. Los seis audios terminados se reutilizan durante toda la edición: no se vuelve a llamar a IA por cambios de video.

Una transcripción `whisper-1`, idioma español y marcas de palabra, permite alinear los subtítulos y los capítulos con la voz. Solo se envía la narración genérica del tutorial; ninguna foto, voz o grabación infantil. El cotejo del texto alcanza más del 98 % de coincidencia y se conservan el guion correcto y los tiempos, sin adoptar errores ortográficos de la transcripción como texto del producto.

Se normaliza el contenedor WAV recibido para leer su duración real: su cabecera de streaming no representa una duración finita para `wave` de Python. Durante la exportación se corrigen la lectura UTF-8 explícita en Windows y la interacción de `setpts`/`shortest` con el relleno de pausas del cursor. Las versiones preliminares que fallaban duración/sincronización no se entregan como finales. Se comprueban duración efectiva coincidente con la voz, seis capítulos en metadata, pistas H.264/AAC, subtítulos UTF-8 dentro del plazo y decodificación completa. Se inspeccionan cuadros de diecinueve instantes y se ajusta el tramo móvil para ver el micrófono y la fotografía. El exit code del render por sí solo no acredita calidad.

## Costos y tiempos

Nuevas generaciones pedagógicas dentro de Ayni: **0**, consumo del aula sin cambios. La voz del video tiene su contabilidad separada: **7 solicitudes de síntesis** (6 terminadas, 1 timeout) y **1 de sincronización**. No son ocho generaciones de documentos pedagógicos.

La síntesis devuelve audio binario sin tokens de uso: importe exacto no determinado, incluido el intento agotado; **no registrar USD 0**. La tarifa publicada es USD 0,60 por millón de tokens de texto de entrada y USD 12 por millón de tokens de audio de salida; falta el uso para multiplicarla. Whisper informa 514 segundos: subtotal calculable según USD 0,006/min = **USD 0,0514**, separado de los importes de voz sin determinar. Es un cálculo de tarifa, no una factura. El acumulado histórico de Ayni se conserva sin mezclar estas partidas.

Tiempos de cada toma, solicitudes y render final en la carpeta entregable. Las operaciones independientes se solapan; no sumar sus tiempos como duración total. Montajes medidos: 71,617 s y 71,949 s (rechazados por QA de sincronización), 110,298 s (exportación completa correcta) y 64,594 s (ajuste móvil y exportación final, reutilizando los demás tramos). La primera petición del segundo capítulo agotó el plazo y algunos selectores del arnés se corrigieron; esos tramos no se usan en el montaje y no requieren cambios del producto. Son iteraciones del artefacto de video, no fallos de generación pedagógica ni cambios de Ayni.

Fuentes oficiales consultadas: [voz e instrucciones](https://developers.openai.com/api/docs/guides/text-to-speech), [tarifas del modelo de voz](https://developers.openai.com/api/docs/models/gpt-4o-mini-tts), [marcas de transcripción](https://developers.openai.com/api/docs/guides/speech-to-text), [tarifa Whisper](https://developers.openai.com/api/docs/models/whisper-1).

## Entrega y reversión

Carpeta nueva `outputs/Ayni-tutorial-completo-2026-10-21`: MP4, SRT editable, narración, guion, capítulos, comprobaciones, tiempos y costos. La versión anterior se conserva como histórica; no usarla como tutorial vigente. Archivos temporales/cuadros originales y recibos privados bajo `.local/ayni-tutorial-v2`, sin credenciales en la entrega. Reversión: conservar o retirar estos artefactos; no hay código, migración ni deployment de aplicación que revertir.
