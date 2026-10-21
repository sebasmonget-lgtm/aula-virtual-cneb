# API temporal de QA para tareas pesadas

Solicitud: activar el paquete de 10M por un día y usarlo en Ayni. Corrección posterior: conservar Luna con su API actual y destinar Mirai a tareas de Sol. No cambiar producción ni la conexión de Codex.

## Implementación

Solo servidor: AYNI_TEXT_API_PROFILE=mirai, AYNI_TEXT_API_BASE_URL=https://api.miraiapi.com/v1 y AYNI_TEXT_API_KEY privada. Sol 6.1, Sol 6 y Astra usan ese gateway cuando está activado. La política actual sigue seleccionando Sol 6.1; no se añade Astra automáticamente. Luna 6 y transcripción conservan la conexión anterior. Una configuración parcial falla sin enviar la clave anterior al destino nuevo. Clave cifrada mediante Windows DPAPI fuera del repositorio; copia cloud solo en la Preview QA autorizada.

## Evidencia

Código canjeado y cuota inicial 10.000.000. Catalog API autenticado: seis modelos GPT y swe-2. Dos comprobaciones sintéticas: Responses JSON estricto high y flujo real OpenAIProvider/factory con background completado, modelo declarado gpt-6.1-sol. No constituyen verificación independiente de autenticidad. Ningún dato de alumnos enviado ni contenido pedagógico guardado por estas comprobaciones.

El portal muestra multiplicadores (Sol 6.1 3x, Astra 3,5x). Primer request: 102 tokens mostrados, 474 de cuota consumidos; no asumir que cuota equivale a tokens simples multiplicados por una sola tarifa. Respuesta API con usage cero: se conserva como desconocido en metadatos y sin precio oficial en ledger. El panel es referencia de saldo. Paquete activado aproximadamente 20/10/2026 21:24 Lima, vigencia de un día.

Validaciones y recibos locales: .local/mirai-qa-20261020/. 37 pruebas PASS; typecheck (tsc --noEmit), lint y build Vinext PASS. Dos llamadas sintéticas reales PASS. Publicación pendiente de smoke en Preview. Rollback: restaurar alias previo y retirar las tres variables de texto; OPENAI_API_KEY original no se reemplaza.
