# Recuperación de Mi año sin perder la conversación · 2026-10-27

## Alcance autorizado

La usuaria solicita corregir ahora el bloqueo de generación y conservar lo escrito. Se mantiene pendiente la observación sobre amplitud de los proyectos y alcance del chat anual. No se cambia la política pedagógica v23, el contenido del chat, matrícula o plantillas; no se modifica el checkout original ni se publica.

## Diagnóstico comprobado y límites

El trabajo anual había fallado dos veces con `generation_failed`. No quedaron causas detalladas de esos dos intentos. Se detuvo únicamente el launcher identificado de la variante, con cero trabajos activos, y se hizo un respaldo íntegro del almacén en `.local/backups/fix-annual-20261027`, además de la instantánea API privada `.local/fix-annual-before.json`.

Una llamada controlada con el transporte anterior reproduce un fallo sin respuesta HTTP: `OpenAIProviderError`, motivo `provider_error`, estado nulo y causa `TypeError`. No había eventos de uso anual registrados antes de esa reproducción y tampoco se recuperó su respuesta; esto no demuestra consumo cero. El error aislado de manifest no explica este fallo. No se afirma qué intermediario o componente de red produjo el corte.

El transporte síncrono espera el objeto completo. La generación válida posterior tarda 382776 ms, más de seis minutos. Recibir internamente los eventos de la respuesta permite completar esa misma clase de solicitud larga y validar después el objeto entero. Referencia técnica consultada: [documentación oficial de OpenAI sobre streaming](https://developers.openai.com/api/docs/guides/streaming-responses). El tiempo de espera configurado de diez minutos y lease de once minutos ya existían y no se aumentan como parte del arreglo.

## Cambio mínimo

`OpenAIProvider` y su factory admiten `streamResponse`, desactivado por defecto. El runtime lo activa solamente para el año del generador documental. Se usa el helper del SDK instalado `responses.stream(...).finalResponse()`, con límite total mediante AbortSignal, `store:false`, esquema estricto, mismo modelo/razonamiento y `maxRetries:0`. No se publican fragmentos al usuario ni se aplican respuestas parciales. Background y el Ayni diario mantienen su ruta anterior.

La cola conserva códigos controlados para servicio inaccesible, saldo, ocupación, respuesta inválida y errores de proveedor. Una conexión perdida sin respuesta se considera incierta. Los eventos operacionales registran solo ID de tarea, tipo de trabajo, estado y código permitido; no errores crudos, claves ni textos. La interfaz muestra mensajes útiles según el código. Sin migraciones ni modificación de resultados inmutables o de permisos.

## Prueba real y recuperación

Dos llamadas nuevas durante esta corrección: una reproducción fallida con transporte anterior y una generación exitosa con streaming; ningún retry automático. La segunda devuelve 15 posiciones y supera `validateMultiAgeAnnualProposal`: edades, competencias, referentes oficiales, cobertura y esquema. Uso informado: 38798 tokens de entrada (38795 en caché), 20694 de salida y 59492 totales. El consumo de los intentos sin respuesta permanece desconocido.

La respuesta completa se conserva de manera privada en `.local/fix-annual-provider-response.json`, con el resultado validado aparte. Para recuperar el trabajo solicitado se utiliza el flujo existente `retryMultiAgeGeneration` y `runMultiAgeGenerationStep`, leyendo esa respuesta ya recibida: se verifica la misma huella de fuentes, se repiten las validaciones y se guarda el trabajo como ready. Cero llamadas pagadas durante esa recuperación. No se fuerza el estado mediante un UPDATE manual ni se elimina el límite de tres intentos.

Al abrir la interfaz, el guardado automático existente crea el plan anual solicitado. Se abre «Conversar con Ayni», se comprueba el historial y se vuelve a Mi año. Quedan un plan activo con 15 propuestas, cero proyectos desarrollados y cero actividades. Conversación de once turnos, colegio y cuatro estudiantes idénticos por comparación exacta antes y después. SHA256 de conversación: `34723e5f39e84b94349a298ede101c96acbe7550e502f815c735519c6e8a89e1`. Descarga Word anual HTTP 200 y XML sin marcadores pendientes. Evidencias privadas: `.local/fix-annual-recovery.json`, `.local/fix-annual-preservation.json`. Captura: `output/generador-documentos/mi-ano-recuperado-20261027.png`.

Variante activa: almacén `generador-prueba-chat-20261027-reinicio`, launcher 20296, web 5185 y API 8805. Se abre una nueva pestaña funcional porque la anterior había quedado en una página interna de conexión rechazada durante la parada; no se sortean avisos de seguridad.

## Validación y reversión

28 pruebas distintas PASS: 14 del proveedor, una de clasificación/privacidad de errores y 13 de persistencia, cola, modo documental y flujo/editorial. Incluyen reconstrucción SSE con el SDK real usando HTTP simulado, rechazo de streams incompletos, ausencia de duplicación y opt-in limitado al año documental. Typecheck, lint completo y build PASS; lint completo conserva un aviso React previo y lint de archivos modificados no informa problemas. Las repeticiones no se suman como pruebas nuevas. API y recorrido manual de navegador completados; no se genera un proyecto como parte del arreglo.

Rollback técnico: desactivar `streamResponse` en el runtime y revertir sus opciones en factory/proveedor, junto con los cambios de códigos y mensajes si fuera necesario. Copias anteriores de los tres archivos de transporte en el respaldo local. Mantener el plan válido, el chat y los alumnos; no restaurar la base anterior para revertir código. El respaldo completo de datos se usa solo ante una recuperación explícita que la requiera.
