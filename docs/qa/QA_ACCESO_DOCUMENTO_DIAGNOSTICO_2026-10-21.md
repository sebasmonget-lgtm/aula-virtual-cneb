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
