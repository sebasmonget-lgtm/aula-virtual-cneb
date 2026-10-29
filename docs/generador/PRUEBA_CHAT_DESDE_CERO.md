# Prueba nueva desde el chat — 2026-10-25

Petición: conservar colegio y alumnos para que la docente converse y genere su propio año.

Almacén nuevo: `generador-prueba-chat-20261025`, en el checkout separado del generador. Fuente: servidor local de `generador-prueba-limpia`, conservado sin cambios. Se copiaron mediante servicios existentes JARDIN 428, CELESTE, docente y cuatro alumnos con edades 3/4/4/5. No se trasladan chat, diagnóstico, planes, proyectos, actividades ni trabajos de IA.

Arranque para retomar esta prueba (no crea ni reinicia datos):

```powershell
node scripts/dev-document-generator.mjs --from-zero --trial-store=generador-prueba-chat-20261025 --key-env='C:/Users/ASUS/Documents/ChatGPT/Asistente CNEB/.env.local'
```

La lectura de la clave de texto ya fue autorizada; solo se entrega al servidor. No se heredan credenciales de Vercel ni Supabase. Preparar rechaza destinos existentes; arrancar limita el nombre del almacén y rechaza rutas externas o combinarlo con QA.

Validación: 4 alumnos, 0 planes/proyectos/actividades/trabajos. En navegador se abrió Mi aula, se verificaron los cuatro nombres/edades y se pulsó Conversar con Ayni. Queda el saludo inicial, respuesta vacía y Crear Mi año disponible. No se enviaron respuestas ni se generó el año; no se hicieron llamadas al proveedor durante esta preparación. HTTP 200; tres pruebas del launcher PASS; `npx tsc --noEmit`, lint y build con salida 0 (avisos anteriores de lint/PGlite/chunks/vinext). Captura: `output/generador-documentos/prueba-chat-desde-cero.png`.

Rollback: detener el launcher y arrancar con `--from-zero --clean-start` para retomar `generador-prueba-limpia`. Los otros almacenes y el checkout original siguen conservados. La prueba nueva guarda el progreso al utilizarla y no se vacía al reiniciar.

## Verificación del contexto sin diagnóstico

Revisión posterior solicitada: la política v7 explora entorno/comunidad, espacios, materiales/sectores, intereses reportados, prioridades anuales, participación familiar/lenguas, jornada y condiciones de calendario/clima. Pide una cuestión por turno; procura seis ámbitos concretos antes de ofrecer cerrar, sin un número fijo de mensajes, sin repetir información ya aportada y respetando el cierre expreso de la docente. El chat no crea planes: el botón inicia ese trabajo.

Se probó la política existente sin modificarla con tres llamadas reales en una base temporal en memoria y datos ficticios, usando los mismos servicios/proveedor. Tras «Tenemos patio y un salón» preguntó por situaciones comunitarias. Tras «Quiero empezar con acogida y convivencia» distinguió esa prioridad inicial del resto del año y siguió explorando. A «¿Tengo que hacer o enviarte un diagnóstico?» contestó directamente «No, no necesitas hacer ni enviarme un diagnóstico» y retomó el contexto. No invitó prematuramente a generar. Cero planes, proyectos y trabajos distintos de conversación en QA. Coste estimado total: USD 0.000949735. Recibo/transcripción: `output/generador-documentos/contexto-chat-20261025/receipt.json`.

Pruebas de flujo del generador y conversación/actividades: 9 PASS; incluyen la ruta original de una edad, fuentes y separación entre aulas. No hubo cambios de código, reinicio ni generación del año en esta verificación. La conversación de la usuaria sigue con solo el saludo inicial, cuatro alumnos y cero planes/proyectos/actividades, comprobado en UI y estado local. Se deja abierta para que ella converse y genere. La muestra valida estos casos concretos; las respuestas futuras dependen de lo que cuente la docente.
