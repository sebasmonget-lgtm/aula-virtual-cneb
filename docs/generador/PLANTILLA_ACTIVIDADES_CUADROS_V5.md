# Actividades documentales con cuadros · presentación 5

28/10/2026. Cambio de presentación solicitado por la usuaria a partir del Word de P11/A01. No cambia prompts, contenido pedagógico, selección curricular ni proyectos guardados.

## Resultado

La portada, tipografía Poppins, tamaños de letra, encabezados e ilustraciones Ayni se mantienen. La guía usa tres cuadros de ancho completo con títulos y acentos verde, azul y naranja para Inicio, Desarrollo y Cierre. Los pasos conservan su numeración y texto. Propósito y materiales permanecen fuera de columnas estrechas. Los apoyos de 3, 4 y 5 años se distinguen por filas de color suave, sin un modelo de respuesta nuevo. Las competencias, criterios, evidencias, momentos y referentes se mantienen completos.

Dos muestras con las mismas fuentes reales del P11: A01 y A14, esta última la guía más larga de las catorce. Cada una ocupa cuatro páginas: portada; guía con los tres momentos completos; decisiones y apoyos por edad; currículo y registro. A01 aumenta de tres a cuatro páginas para dar espacio a los apartados; A14 conserva cuatro. Esta decisión favorece la lectura frente a comprimir texto. No se presenta como requisito del MINEDU.

Los ejemplos se guardan en `output/generador-documentos/plantilla-actividad-v5/`. Sus textos proceden de las exportaciones reales auditadas: no se generó contenido nuevo ni se reescribieron las instrucciones desde Codex. La comparación de palabras conserva el contenido completo, descontando solo etiquetas de navegación y cambios de puntuación al pasar a cuadros. Los originales permanecen intactos.

## Alcance y compatibilidad

- `activityCardsWordBody` construye únicamente la presentación 5 de actividades prácticas; los renderizadores previos conservan su ruta.
- Al confirmar una actividad documental nueva que antes emitiría presentación 4 se guarda presentación 5. El proyecto sigue con presentación 4; no se migra su fuente ni ninguna actividad ya guardada.
- El lector reconoce 5. El renderizador utiliza el nuevo cuerpo solo al exportar esa versión con `practical:true`.
- Los momentos de observación se imprimen seguidos de la evidencia, evitando un salto de párrafo innecesario; no se omiten ni alteran.
- No hay migraciones ni cambios de interfaz web o del Ayni original. No hay llamadas de IA añadidas.

## Iteración visual

La primera prueba con todos los apartados en tablas aumentaba el número de páginas y partía Cierre en A14. Se retiraron las columnas de preparación, se mantuvo el ancho completo para los momentos y se separó el acompañamiento del sustento curricular. Los apoyos en dos columnas también añadían saltos; se sustituyeron por filas completas con la edad al inicio. Se revisaron los PNG de las ocho páginas finales, incluyendo portadas, y las dos guías completas ampliadas. No se entregan las imágenes/PDF de QA como si fueran Word finales.

## Validaciones ejecutadas

- Dos Word reales remaquetados; ocho páginas renderizadas con el renderizador empaquetado. Ninguna palabra fuera de página; los tres momentos completos están en la página 2 de ambas muestras; tablas de currículo y registro juntos en página 4.
- Pruebas de conservación de instrucciones, apoyos, criterios, evidencias, estilos y recursos gráficos; lectura histórica sin cambios. Flujo vertical confirma presentación 5 en primer día y lotes, con proyecto en 4.
- 42 pruebas PASS en seis archivos. Typecheck y build PASS. Lint sin errores, con el aviso React preexistente en `diagnostic-generation-control.tsx:28`.
- Se encontró un fixture antiguo que ejecutaba `.filter()` sobre el wire curricular que ahora es un objeto. Se corrigió solo el arnés de prueba para seleccionar una entrada por clave y alinear la ruta diaria si está presente; se mantiene la prueba de que el proyecto conserva varias competencias y la primera actividad puede focalizar una.
- Logs `.local/activity-cards-v5-delivery-{tests,typecheck,lint,build}.log`; auditoría `quality-checks.json` y `content-fidelity.json` en la carpeta de muestras.

## Activación y conservación

Reinicio únicamente de la variante local, desde el mismo ejecutable y argumentos verificados. Respaldo del almacén detenido: `.local/backups/activity-cards-v5-before-activation/store`. Nuevo launcher 44068; web 5185 y API 8805 operativas, web HTTP 200.

Comparación antes/después: workspace, planes y dieciséis ámbitos de chat idénticos; cuatro estudiantes, 36 turnos y 75 cuerpos Word con hashes idénticos. Recibo `.local/activity-cards-v5-activation-preservation.json`. No se regeneraron documentos docentes ni se utilizaron llamadas nuevas de IA.

Rollback: volver a emitir presentación 4 para actividades futuras en la confirmación; mantener el lector y el renderizador 5 para documentos que ya se hayan creado. No quitar la versión de una fuente histórica ni restaurar un almacén de pruebas sobre datos de la usuaria.

## Límites

El renderizado se verificó en las dos muestras concretas, no en todas las longitudes posibles. Word puede variar levemente respecto de LibreOffice o de la vista previa. La nueva separación admite más páginas que la versión compacta en actividades cortas; no se reduce el texto para obtener una cantidad fija de hojas.
