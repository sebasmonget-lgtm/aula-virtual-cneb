# Evaluar: continuidad del lote y extensión orientativa

## Problema comprobado

La Preview d101bb2 pausaba todo el lote cuando fallaba uno de tres análisis. La interfaz no distinguía una respuesta rechazada de errores de conexión o guardado. El lote QA existente se encontró pausado en 41/120; al retomarlo desde la interfaz avanzó hasta 61/120 y volvió a pausarse. Su payload anterior solo conserva un mensaje genérico: no permite atribuir esos fallos concretos al conteo de palabras, al proveedor ni a la base de datos.

Se encontraron además dos bloqueos del cliente: un error local persistía aunque la consulta posterior confirmara que el servidor podía continuar; una consulta de avance fallida no programaba la siguiente consulta.

## Cambio vertical

- Ocho llamadas independientes como techo, con contexto común por petición y un escritor para persistencia/checkpoints. Incluye el trabajo de concurrencia documentado en QA_EVALUAR_CONCURRENCIA_2026-10-20.md.
- Estado individual de fallos por niño/competencia, con categoría y número de intentos, sin mensajes SQL, secretos ni textos privados adicionales. Compatible con el lote histórico, sin borrar ni regenerar resultados guardados.
- Continuar primero con los análisis todavía no intentados. Una respuesta recibida y rechazada admite como máximo una regeneración automática; si vuelve a fallar queda pendiente mientras se conservan las demás. No hay bucle de reintentos.
- Timeout o resultado incierto no se vuelve a solicitar automáticamente. Errores de saldo, credenciales, límite del proveedor, contexto compartido o fuentes cambiadas detienen el grupo con una causa breve. Un reintento explícito conserva el conteo histórico.
- Reconciliar el estado del servidor tras una conexión interrumpida y mantener consultas periódicas si una lectura falla. La ejecución conserva el modelo actual conducido por el cliente: salir y regresar recupera el checkpoint; no se promete un trabajador autónomo con el navegador cerrado.

## Nueva indicación sobre longitud

La persona usuaria pide mejorar el prompt y evitar rechazos por pequeñas diferencias de palabras. Se sustituye la regla anterior estricta: **30–70 palabras es una orientación**, preferiblemente unas 50; el margen de aceptación es 20–100. Dos o tres oraciones también es una recomendación, sin rechazar por la puntuación. Espacios y saltos de línea se normalizan sin reescribir ni truncar contenido. No se rellena texto para alcanzar un mínimo.

El prompt explicita una organización sencilla: actuación observada, interpretación según edad y apoyo registrado o próximo foco pertinente. No inventar apoyo, dificultades ni necesidad de seguir observando cuando ya hay sustento. Se mantienen identidad exacta del niño/competencia, referencias propias y de la edad, formato estructurado y prohibición de sugerir notas. Luna low continúa sin fallback. La tolerancia de formato no certifica automáticamente la calidad pedagógica de cualquier respuesta.

Guía oficial consultada para claridad de instrucciones y separación de datos/contexto: [OpenAI, Prompt engineering](https://developers.openai.com/api/docs/guides/prompt-engineering). Los márgenes y la política de recuperación son decisiones del producto, no garantías del proveedor.

## Pruebas ejecutadas

80 pruebas distintas PASS: 49 de análisis breve/evaluación y 31 de recuperación, contexto, adaptador de base de datos, preparación e interfaz existente. Incluyen 120 pares sin duplicados, pico de ocho proveedores/un escritor, preservación de resultados ante conflicto, respuestas inválidas acotadas, timeout sin repetición automática y cero notas confirmadas por IA. Límites 19/20/29/30/70/71/100/101, espacios/saltos y rechazo de niño, fuentes o notas ajenos comprobados.

UI real local con API simulada: POST interrumpido seguido de consulta válida y continuación (dos acciones simuladas); primera consulta fallida seguida de recuperación (dos consultas, una acción); pendiente con reanudación explícita. No confundir estas pruebas con llamadas reales de IA ni con el lote cloud. Captura en outputs/evaluar-recuperacion-20261020/local-pendientes.png.

Lint, TypeScript y builds Vinext/Next webpack se ejecutan para la entrega; sus resultados y los del smoke Preview se conservan en .local/evaluar-paralelo-20261020/. La publicación efectiva y avance posterior del lote se verifican mediante recibos locales y la respuesta de entrega. No declarar completados los 120 antes de verificarlo.

## Datos, límites y rollback

La lectura QA posterior a la reanudación conserva 10 niños, 140 observaciones, 430 asistencias y todos los IDs de análisis existentes; cero notas confirmadas. No migración, reset de cuenta, modificación de notas ni imágenes enviadas a IA. Presupuesto QA máximo vigente USD 6; no se repite el benchmark pagado.

Rollback: revertir juntos recuperación de lotes, techo de concurrencia/contexto compartido, reconciliación del cliente y tolerancia/prompt. El payload adicional failures es compatible y no requiere migración ni borrar datos. Un revert recupera también las reglas anteriores más estrictas; no invalida ni elimina textos ya guardados. Preview se valida con commit limpio y smoke antes de mover exclusivamente el alias QA; Producción se conserva.
