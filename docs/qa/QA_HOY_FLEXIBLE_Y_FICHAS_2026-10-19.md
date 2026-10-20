# QA de preparación breve, Hoy flexible y fichas · 19 de octubre de 2026

Base: 738d0cb04597e60c50ae4f4325642d587475e3cd. Rama codex/qa-corrections-20261019. Cambios locales, junto con la revisión documental anterior que sigue pendiente de publicación. Sin commit ni despliegue nuevos en esta ronda.

## Cambios y alcance comprobado

| Solicitud | Implementación y comprobación |
|---|---|
| Revisar antes del Plan Maestro | Preparar proyecto abre el chat existente en modo breve: propósito guardado, materiales y entrada opcional. La acción sin cambios pasa al calendario sin llamar a IA. Texto sin enviar, turno pendiente o propuesta sin aplicar impiden saltarse el ajuste. UI comprobada hasta confirmar días, sin iniciar generación pagada. |
| Confirmar materiales antes de preparar | La propia aceptación protegida del proyecto registra disponibilidad; no hay una segunda casilla durante el trabajo. Regresión HTTP del inicio y recuperación de borrador antiguo. |
| Calendario simple | El lateral muestra actividades del día elegido y el proyecto de ese día. Se retiran tarjetas de próximo proyecto, próxima actividad y calendario oficial; sus reglas y excepciones permanecen. Consulta escritorio y marco móvil de 390 px. |
| Botones reconocibles | El componente común ghost adquiere borde y fondo. Conserva foco y estado deshabilitado; se inspeccionan acciones de los flujos tocados. No constituye auditoría exhaustiva de cada botón de toda la aplicación. |
| Menú Mi aula | Componente DropdownMenu existente: cierre comprobado por clic fuera, Escape y selección de destino. Opciones con altura mínima de 44 px. |
| Aula con año creado | Se oculta la invitación de matrícula a comenzar diagnóstico/crear Mi año cuando hay un plan activo o borrador. En UI local con plan activo no aparece. |
| Actividad todo el día | El código vigente ya utiliza todos los bloques del día; no filtra por hora. HTTP local compara los mismos tres IDs a las 08:00, 14:00, 21:30 y 23:59. UI nocturna muestra principal, actividad adelantada y taller. El cierre sigue siendo manual. |
| Anterior/siguiente | Consulta de las guías confirmadas del proyecto mediante companions y hermanos canónicos existentes. Probado avanzar y retroceder sin editar, regenerar, reprogramar o cerrar por navegar. Los límites de ejecución histórica continúan; consultar una guía anterior no traslada una jornada registrada. |
| Observación libre visible | Botón junto a Comiencen y los demás momentos, fuera de materiales. Abre el diálogo libre existente sin competencia impuesta, confirmado en UI. No se crean observaciones durante esta prueba. |
| Terminar y taller | En el último momento, cierre opcional con Terminar y elegir taller o Solo terminar. Se recorre la actividad local activa por los tres momentos, se cierra manualmente y se abre la biblioteca. No se agrega un taller automáticamente. |
| Encabezados | Marca pequeña o retirada del encabezado móvil con año creado; institución y aula permanecen. PDF sin Ayni en la banda superior, con pie discreto. |
| Fichas nítidas | Los diez originales Ayni usan texto PDF nativo extraído del subconjunto SVG interno; las ilustraciones se rasterizan aparte. No se reconstruyen textos de fichas oficiales o archivos ajenos. Encabezados personalizados y hojas A4 conservados. |
| Lenguaje e ilustraciones | Catálogo 1.4.0: revisión de frases completas y simplificaciones como quien escucha, formas de moverse y escribir a su manera; sin cambiar nombres oficiales de competencias ni snapshots históricos. Instructivo de agua con cuatro imágenes distintas creadas mediante image_gen y reducidas a 600 px; prompts y procedencia en assets/workshop-resources/ILLUSTRATIONS.json. |

## Hallazgo de la cuenta QA actual

Lectura autenticada de la Preview y su calendario: 19/10/2026 a las 21:31 contiene únicamente el taller Adivinamos y buscamos las pistas, ya terminado. No existe actividad principal guardada para esa fecha. La ausencia observada no corresponde a ocultarla por ser de noche. No se inventó una actividad ni se generó un proyecto para ocultar esa ausencia. La lectura no modificó registros.

## Evidencia y regresión

- 49 pruebas de regresión PASS: talleres, persistencia HTTP, edades, ejecución en otra fecha con permisos, calendario, recuperación del proyecto y texto nativo de PDF. Prueba inicial desactualizada esperaba versión1.3.0; se actualizó a1.4.0 y la batería completa pasó. Revisión editorial posterior repite las pruebas de contenido, flujo y biblioteca; se informa por separado por ser solapada.
- Texto extraíble validado con pypdf en cinco PDF: agua697 caracteres, adivinanzas670, cuento824, cantidades210 y poema688; una página A4 cada uno. Poppler renderiza tres muestras; inspección visual de agua y adivinanzas, incluyendo la versión final con ilustraciones distintas.
- PDF de las246 variantes por edad generado y abierto por la prueba. Esto no certifica una nueva curaduría pedagógica individual de246 actividades.
- Typecheck, lint, build Vinext y build Next webpack ejecutados; recibos en .local/qa-flexible-20261019/. No invocar validación de Preview de estos cambios hasta su publicación.
- UI real local contra API y PGlite en copia desechable de una muestra anterior: diez alumnos, proyecto con seis actividades. No se usa la siembra para simular una generación exitosa ni una acción de interfaz fallida.
- Hash de activities/companions idéntico antes y después de navegar y cerrar manualmente: 416c4f54d20e95c22ed95eb4ed85c6bbf8bb2289e6a856b7cf48b9e1d5926bc1. Cambian solo los registros de ejecución local requeridos por el recorrido.
- Capturas en outputs/qa-flexible-20261019/: Calendario, Hoy de noche, guía con observación libre, revisión antes de preparar y marco móvil. PDF de muestra Pintamos-con-agua.pdf.

## Límites, costos y rollback

No se hicieron llamadas a la API de IA de Ayni, no se generó un nuevo Plan Maestro ni se evaluó una respuesta nueva del chat. Se reutilizan su guardado y revisión versionada existentes. Las cuatro ilustraciones se generaron con la herramienta integrada image_gen, no con las credenciales API de Ayni. El acumulado conservador anterior de la API de Ayni permanece USD4,75075397 del máximo USD6; no se atribuye un precio no disponible a la herramienta de imágenes.

Sin migraciones ni escrituras pedagógicas cloud. Producción y Preview no reciben cambios. Los Word/PDF históricos no se sobrescriben. Para rollback antes de publicar, revertir únicamente estos cambios de componentes, catálogo1.4.0, renderizador de fichas y recursos; mantener separadas las correcciones documentales anteriores. Los recibos de disponibilidad conservan compatibilidad JSON sin migración.
