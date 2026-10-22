# API temporal de QA para tareas pesadas

Solicitud: activar el paquete de 10M por un día y usarlo en Ayni. Corrección posterior: conservar Luna con su API actual y destinar Mirai a tareas de Sol. No cambiar producción ni la conexión de Codex.

## Implementación

Solo servidor: AYNI_TEXT_API_PROFILE=mirai, AYNI_TEXT_API_BASE_URL=https://api.miraiapi.com/v1 y AYNI_TEXT_API_KEY privada. Sol 6.1, Sol 6 y Astra usan ese gateway cuando está activado. La política actual sigue seleccionando Sol 6.1; no se añade Astra automáticamente. Luna 6 y transcripción conservan la conexión anterior. Una configuración parcial falla sin enviar la clave anterior al destino nuevo. Clave cifrada mediante Windows DPAPI fuera del repositorio; copia cloud solo en la Preview QA autorizada.

## Evidencia

Código canjeado y cuota inicial 10.000.000. Catalog API autenticado: seis modelos GPT y swe-2. Dos comprobaciones sintéticas: Responses JSON estricto high y flujo real OpenAIProvider/factory con background completado, modelo declarado gpt-6.1-sol. No constituyen verificación independiente de autenticidad. Ningún dato de alumnos enviado ni contenido pedagógico guardado por estas comprobaciones.

El portal muestra multiplicadores (Sol 6.1 3x, Astra 3,5x). Primer request: 102 tokens mostrados, 474 de cuota consumidos; no asumir que cuota equivale a tokens simples multiplicados por una sola tarifa. Respuesta API con usage cero: se conserva como desconocido en metadatos y sin precio oficial en ledger. El panel es referencia de saldo. Paquete activado aproximadamente 20/10/2026 21:24 Lima, vigencia de un día.

Validaciones y recibos locales: .local/mirai-qa-20261020/. 37 pruebas PASS; typecheck (tsc --noEmit), lint y build Vinext PASS. Dos llamadas sintéticas reales PASS. Publicación completada: fuente `926e93fd7ec635c9fe80b4f047a5314d1316cf82`, Preview `dpl_4vsZ85WqVQHj49JjwqMRXZzLiNws` en gru1 y alias https://ayni-aula-qa-20261019.vercel.app. Diez smoke checks PASS entre Preview y alias; conexión sintética local del factory real PASS. No se generó un plan ni se enviaron alumnos a Mirai. Credenciales persistidas cifradas únicamente en el target Preview del proyecto; producción `dpl_H19YWzRdGjkgh8y72QAd1qBty7Mf` intacta. Checkout aislado limpio y commit subido al desplegar; documentos de otra revisión preservados en la carpeta principal. Rollback: restaurar alias previo y retirar las tres variables de texto; OPENAI_API_KEY original no se reemplaza.


Saldo observado tras las dos llamadas: 9.998.863 de cuota; 299 tokens indicados en historial, 1.137 unidades descontadas. Vencimiento aproximado 21/10/2026 21:24 Lima, derivado de la vigencia de un día. Recibos privados y captura con clave enmascarada fuera de Git.


## 2026-10-21 — Llamada pesada directa solicitada

Un solo POST autenticado directo a /v1/responses, sin Vercel ni reintentos. Solicitud real de generación anual capturada desde el servicio de Ayni, con contexto totalmente inventado: quince propuestas, doce competencias, gpt-6.1-sol high, JSON Schema estricto, background=true/store=false, límite de salida de 24.576 tokens y 32.722 caracteres de petición. Espera local máxima de 300 segundos.

Resultado: HTTP 524 tras 126,2 segundos; server Cloudflare y HTML «miraiapi.com | 524: A timeout occurred», con mensaje de espera agotada del servidor de origen. Sin ID, JSON ni contenido del plan. No alcanzó el timeout local. No se valida contenido pedagógico inexistente ni se deduce el modelo subyacente. No se probaron otros formatos. El código corresponde a esta prueba; no determina retrospectivamente todas las fallas anteriores.

Según documentación oficial de Cloudflare, 524 indica conexión al origen sin respuesta HTTP a tiempo; el límite por defecto documentado es 125 segundos. Aumentar únicamente el límite de Ayni no elimina este corte externo. Recibo y diagnóstico sin clave: .local/mirai-heavy-20261021/result.json y diagnostico.txt. Petición y respuesta originales se conservan fuera de Git. Sin despliegues, cambios de conexión, datos pedagógicos, migraciones ni llamadas adicionales de IA.

Fuente: https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-524/


Control corto posterior: mismo modelo solicitado gpt-6.1-sol y razonamiento high, JSON Schema estricto y background=true. Un único POST con contexto inventado: HTTP 200/completed en 27,1 segundos y 46 palabras en JSON válido. Confirma funcionamiento de esta solicitud corta; no valida la llamada anual larga ni demuestra el modelo subyacente. Usage volvió a informar ceros y no se interpreta como coste cero. Recibo privado: .local/mirai-heavy-20261021/short-result.json. Sin cambios de configuración publicados.
