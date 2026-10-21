# Acceso al documento de evaluación diagnóstica

## Problema encontrado en el recorrido desde cero

Después de confirmar el año, Documentos muestra la carpeta de evaluación diagnóstica vacía y sin acción para prepararla. La nueva pantalla de entrevistas y observaciones permite capturar y consultar la matriz, pero no crear el documento. El generador y su recuperación siguen funcionando en servidor; su interfaz anterior queda interceptada por la ruta nueva de entrevistas.

## Cambio mínimo

Documentos incorpora «Preparar diagnóstico de mi aula». Es opcional e independiente de Continuar con Ayni. Consulta las fuentes guardadas y, por acción expresa, usa los mismos servicios de borrador y preparación recuperable. La propuesta lista aparece directamente en el editor. La docente puede corregir los tres textos y las lecturas por competencia, guardar para después o confirmar. Confirmar abre el documento canónico para consultar y descargar Word.

Se reutilizan Button, AsyncButton, Textarea, estados de Ayni y el editor de lecturas existente. Escritorio y móvil conservan el mismo diseño. No se añade una pantalla obligatoria antes del chat, revisión individual, prioridades ni confirmación de notas. No cambian prompts, modelos, snapshots, autorización, RLS, almacenamiento ni plantillas.

Abrir la pantalla solo consulta. Recuperar un borrador escrito, un trabajo activo o una respuesta lista evita otra llamada a IA. Un fallo no se reintenta al abrir; los estados inciertos conservan la decisión expresa de repetir. La consulta periódica nunca reemplaza texto que la docente esté editando. Cambios sin guardar usan la protección existente de navegación, sin copiar datos privados al almacenamiento del navegador.

## Validación y límites

35 pruebas relacionadas PASS, incluidas nueve del acceso y recuperación, concurrencia, ID durable, incertidumbre, textos docentes, permisos, consulta y Word. Typecheck y build canónico Vinext PASS. Lint general: cero errores y una advertencia preexistente en diagnostic-generation-control.tsx. Detector mecánico de las dos superficies cambiadas sin hallazgos. La prueba UI de generación, recuperación, edición, confirmación, descarga y móvil continúa después del despliegue QA; no declararla ejecutada por estas pruebas locales.

## Prevención y reversión

Al simplificar una ruta, revisar por interfaz que cada documento conserve una entrada visible desde cero y desde una cuenta con año confirmado. Probar el acceso y una recuperación sin otra generación. Reversión acotada: retirar el botón y el componente nuevo; los documentos y trabajos persistidos siguen disponibles en servidor y no se borran ni se migran. Producción no se modifica en esta ronda.

## Comprobación por interfaz

Publicado solo en QA como 2c3d36a, con 24 comprobaciones HTTP y fuentes conservadas. Pantallas de escritorio 1366 y móvil 390 sin desbordamiento horizontal. Un diagnóstico se prepara por UI; entre la solicitud y el evento de uso transcurren unos 150 s, no incluye el tiempo posterior de lectura. Costo estimado del evento USD 0,0960885. Se sale a otra pantalla y se recupera la propuesta, se revisan once lecturas por competencia, se edita una frase, se guarda para después y se recupera exactamente esa corrección sin nueva IA. Confirmar abre el documento canónico. Descarga Word real, render de catorce páginas iniciado y revisión visual en curso. Fechas de registros y recojo inicial coinciden del 16 al 27 de marzo.

Dos detalles encontrados durante la comprobación: al guardar para después hay que refrescar la lista de Documentos; el seguimiento individual del lector solo mostraba nombres cuando no había comentarios opcionales, aunque el Word sí mostraba extractos observados. Se refresca la lista al volver y se comparte la misma proyección literal de seguimiento entre lector y Word. No se inventan interpretaciones ni recomendaciones individuales para llenar el espacio.
