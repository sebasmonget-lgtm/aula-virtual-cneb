# Biblioteca de cien talleres — Preview

Petición: al menos cien talleres listos y variados por competencias/áreas. Base 4b16966, producto anterior fbc1264. Rama codex/mi-ano-simple-preview. Sin Producción ni datos reales.

## Repertorio disponible

100 títulos e identidades distintas, no 100 adaptaciones contadas varias veces. 36 previos y 64 nuevos originales. 246 variantes: 78 elegibles para 3 años, 84 para 4 y 84 para 5. Cada elección usa la edad del aula validada por servidor.

| Competencia principal | Talleres |
|---|---:|
| Motricidad autónoma | 16 |
| Creación artística | 20 |
| Lectura | 12 |
| Comunicación oral | 10 |
| Escritura | 5 |
| Cantidad | 10 |
| Forma, movimiento y localización | 9 |
| Indagación | 10 |
| Identidad | 4 |
| Convivencia | 4 |
| **Total** | **100** |

Cinco áreas: Personal Social, Psicomotriz, Comunicación, Matemática, Ciencia y Tecnología. Arte incluye gráfico-plástico, música, danza y teatro; no se valora una manualidad uniforme. Identidad y convivencia parten de decisiones y relaciones reales; no se cubren con una ficha coloreada. Competencia principal pertinente por taller; regla de dos competencias sigue siendo de proyectos, no una cuota artificial de talleres.

Las 64 nuevas experiencias tienen materiales, preparación/seguridad, apertura y cierre propios, criterio/acción infantil/mediación específicos por edad y evidencia posible. La evidencia nunca se presenta como observación real. Retos de cantidad ajustados (correspondencia/agrupación a los 3, conteo hasta cinco a los 4, hasta diez o agregar/quitar hasta cinco según situación a los 5); escritura a su manera solo 4/5, sin copia/caligrafía. Contextos motrices a nivel del suelo, sin carreras de eliminación ni exigir posturas únicas.

Cuatro imprimibles originales adicionales: La torre de Nina, Charquito de cielo, Adivinanzas con pistas y Pintamos con agua. Diez originales públicos en total, más las tarjetas motoras previas. SVG/PNG y procedencia versionados, seis anteriores intactos. No se importó ni redistribuyó automáticamente el inventario de 389 fichas externas ni se afirma tener un taller por cada ficha. Recursos de lectura muestran el soporte escrito que se consultará; materiales corporales/manipulativos no requieren fabricar una hoja para llenar.

Referencias de diseño: KB v4.1 versionada, aplicabilidad por edad, activity_design y projects_units_workshops (CNEB/PCI/planificación/interacciones). Contenido editorial Ayni, sin atribuir redacción o certificación MINEDU ni revisión pedagógica humana. Consulta web al repositorio MINEDU mostró verificación de seguridad; no se eludió ni se tomó como validación del contenido.

## Implementación y seguridad

Mismo helper de adaptación, catálogo 1.2.0 y snapshot canónico con edad, sin cambios de esquema ni permisos. Sin IA al seleccionar ni nuevo motor. Las instancias previas conservan sus datos. Ranking vigente prioriza competencias sin ejecución y menor cobertura nominal válida; cantidad no es nivel de aprendizaje. Mismos filtros con cantidad visible de resultados, sin submenús/pantallas nuevos.

Rollback: revertir catálogo/importación y contador, conservar los PNG nuevos para las actividades ya elegidas. Sus guías, criterios y Word continúan legibles; no se eliminan filas ni registros.

## Validación ejecutada

- 48 pruebas distintas PASS de biblioteca, pilotos/recursos, talleres anteriores, persistencia, calendario, ejecución, observaciones y Word. Seis focales se repitieron al ampliar Word a diez competencias; no se suman dos veces.
- Todas las 246 variantes seleccionadas, reintentadas y abiertas en PGlite bajo tres aulas/edades propias. Criterio, preparación, acciones, metadata de edad/versión y tres momentos verificados.
- Diez Word completos generados y comprobados, uno de las nuevas propuestas por competencia. Una aserción inicial ignoraba que la plantilla separa las frases con viñetas; se normalizó el texto de prueba, sin modificar contenido o motor Word. Repetición PASS.
- Typecheck, lint y Next webpack build PASS. Código cliente solo añade cantidad de resultados con estilos existentes.
- QA navegador con 35 niños ficticios: 78/84/84 por edad, 100 sin filtro y 14 talleres motrices para 5 años. Búsqueda por pelotas y elección del nuevo taller para 28/10 abre la guía común de Hoy, sin iniciarlo. Materiales/preparación, momentos, criterio/motricidad y botón Registrar observación en desarrollo presentes; libre independiente.
- Word descargado desde UI conserva título, criterio y mediación de 5 años; cuatro PNG servidos idénticos a los archivos locales. Relectura HTTP conserva el taller y tres bloques. Recibo privado .local/workshop-100-20261015/ui-receipt.json.
- Cuatro imprimibles inspeccionados visualmente, sin recortes ni superposiciones de texto. No se afirma nueva inspección impresa de Word ni validación en aula real.
- Escritorio 1440 y móvil 390, sin overflow ni imágenes rotas. Capturas library-desktop.jpg, library-mobile.jpg, library-mobile-cards.jpg, taller-mobile.jpg y guide-mobile.jpg en el directorio privado. Captura de entrega local ficticia; no confundir con sesión cloud.
- Cero llamadas pagadas; transporte QA restringido a loopback. Sin migraciones/RLS ni escrituras pedagógicas cloud. Cámara/micrófono físicos no probados; no se registraron nuevas observaciones en UI para esta entrega.

## Publicación

Producto c3d0e973b966f5bb499fae9270b515c9d9322371, publicado en GitHub en codex/mi-ano-simple-preview.

Preview https://ayni-aula-staging-p70wwsrkl-ayni4.vercel.app · deployment dpl_7sMNRcPfQCAvu6fMT8rmNaxondsN · READY target null y SHA exacto verificados. Build Next cloud PASS y 22 smoke PASS: diez imprimibles/pictograma/inicio/health/config 200, rutas privadas sin sesión 401. Comprobaciones independientes en lotes de cuatro mediante CLI oficial, con resultados individuales conservados. Nuevo dominio abre login Ayni; no se autenticó ni se escribió en la cuenta cloud reiniciada.

Producción reconsultada conserva dpl_H19YWzRdGjkgh8y72QAd1qBty7Mf y 9a0920230350cd6b9050f35683a1f35d459e78c7, iguales al baseline. Sin promoción, DDL/RLS ni cambios de datos cloud. Recibos preview.json, preview-smoke.json y production-final.json en el directorio privado del QA. Working tree limpio al publicar; recibo documental posterior sin cambios de producto.

QA local apagado controladamente, pestaña temporal cerrada y viewport restablecido. Preview nuevo conservado como entregable; captura library-desktop.jpg muestra cien talleres en el fixture ficticio.
