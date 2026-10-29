# Revisión final para demostración local

## Corrección posterior: temas de la muestra

La usuaria detectó que los quince tramos mostraban «Invitación compartida N». La revisión inicial había comprobado recorrido y archivos pero no detectó la pobreza de los ejemplos visibles; por eso no bastaba para declarar la demostración lista. Se corrige la muestra editorial del generador con quince temas, propósitos e invitaciones distintos y competencias elegidas según el tema, conservando IDs oficiales y edades. La ruta cotidiana y el proveedor de IA real no se modifican. No se presenta esta selección fija como una interpretación de las indicaciones del chat.

El preview conserva ahora año versión 2 y primer proyecto versión 2. Los catorce tramos sin actividad se actualizan mediante nueva versión anual; el primer tramo mantiene su propuesta anual original protegida y muestra el título vigente del proyecto, «Nos conocemos jugando». El Word anual conserva esa propuesta original en el tramo protegido; la nueva versión del proyecto contiene el título y propósito revisados. No se reescribe historia para homogeneizar sus títulos.

Las tres descargas anteriores se cotejaron antes/después por SHA256 del XML principal de Word y son idénticas. Alumnos, actividad anterior y ausencia de observaciones se conservan. Hay quince títulos visibles únicos y ninguno usa «Invitación compartida N», comprobados en API y DOM. Captura y estados antes/después en `output/generador-documentos/temas-demostracion/`. Se utilizó exclusivamente la API canónica de revisión/confirmación, sin SQL directo.

26 pruebas PASS: once del generador y quince de documentos/versionado multiedad; tipos/lint/build correctos con avisos previos. La regresión verifica temas y propósitos distintos y conservación del tramo preparado al regenerar una propuesta simulada. Si se quiere deshacer la revisión de contenido, crear otra versión con la propuesta anterior mediante los controles normales; las versiones originales siguen conservadas. Sigue siendo una demostración editorial con IA simulada y no una planificación pedagógica validada para un aula real.

## Estado

Lista para mostrar el recorrido de la variante independiente en este equipo: `http://127.0.0.1:5185/#mi-ano`. La identidad y los datos son locales y ficticios; el proveedor multiedad está en simulación. No se probó un alta pública nueva ni una llamada de IA real. No se publicó el proyecto ni se modificó la carpeta original.

## Recorrido ejecutado desde la interfaz

1. Mi aula: Ana Prueba (3), Luis Prueba (4) y Sofía Prueba (5), matrícula y acceso a correcciones.
2. Conversación anual: envío de una indicación de prueba sobre cuentos, plantas, materiales y patio; respuesta simulada y selección explícita de la indicación para próximas propuestas.
3. Mi año: preparación simulada, apertura, guardado de borrador y confirmación de la versión 1.
4. Proyecto y actividad: preparación simulada de la primera actividad, revisión de criterios de 3/4/5 y confirmación. Quedan tres documentos guardados: año, proyecto y actividad. No se añadieron observaciones, notas o resultados de evaluación.
5. Documentos: carpetas de año/aula, lectura del plan y descarga Word real desde navegador. Los tres documentos guardados devuelven DOCX válidos por HTTP.
6. Biblioteca: búsqueda con y sin resultados, selección de edad 3/5, descarga del material PDF de «Miramos el cuento de Lila» desde navegador. La revisión anterior cubre las 252 variantes y 90 imprimibles.
7. Recarga de la aplicación y comprobación de recuperación del año confirmado y los alumnos.

## Ajustes finales

El lector de documentos reutilizado mostraba otra cabecera «Documentos» dentro de la del generador. Ahora la variante conserva una sola cabecera principal en una edad y multiedad; el lector cotidiano mantiene su presentación anterior. En una edad el generador tampoco ofrece el acceso de preparación de diagnóstico observado, pues sus instrumentos vacíos están en Formatos. Los dos selectores de contenido exponen su selección mediante `aria-pressed`.

Revisión visual en escritorio 1440×900 y móvil emulado 390×844, conservando el diseño de Ayni. En móvil se comprobó ancho de página de 375 CSS px dentro de un viewport de 390, sin desborde horizontal de página; la línea de tiempo conserva su desplazamiento interno previsto. Un único H1 visible en Documentos después de la corrección. No es una prueba en un teléfono físico ni una auditoría exhaustiva de accesibilidad.

## Validación

- `npm run test:documentos-generador`: 11 PASS, cero fallos; incluye API aislada de una edad y multiedad.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`: salida cero. Advertencia histórica de lint en `diagnostic-generation-control.tsx:28` y avisos previos de dependencias/tamaño en build.
- Detector Impeccable sobre los cuatro componentes modificados: salida cero, sin hallazgos.
- Consola de navegador sin errores capturados durante el recorrido comprobado.
- Se conserva la revisión anterior de 35 pruebas relacionadas y 18 DOCX/87 páginas. Los ajustes de esta revisión no modifican exportadores Word ni plantillas.

Evidencia: `output/generador-documentos/revision-final-demo/`, con estados inicial/final ficticios, manifiesto de tres descargas y capturas de escritorio/móvil. La preparación y confirmación de las muestras se hizo mediante los controles de la aplicación; no se insertaron documentos directamente en SQL.

## Cómo mostrarla

Mi aula → Mi año y conversación → Documentos (formatos y planes guardados) → Biblioteca. Explicar que los ejemplos de respuesta son simulados y que observaciones, valoraciones y conclusiones quedan a cargo de la profesora en Word.

El enlace requiere este equipo y el launcher local encendido. Se puede reiniciar con `npm run dev:documentos:qa` desde este worktree; su almacén persistente es exclusivo. Para retirar un ejemplo, conservar primero los archivos necesarios y usar el flujo normal de versiones o un almacén de demostración nuevo; no borrar el almacén original de Ayni. Cuentas nuevas remotas, IA real y revisión docente de contenido real continúan pendientes para un piloto publicado.
