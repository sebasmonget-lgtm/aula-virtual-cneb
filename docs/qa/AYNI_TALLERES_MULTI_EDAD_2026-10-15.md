# Ampliación de talleres por varias edades — Preview

Petición: ampliar la biblioteca y admitir propuestas para más de una edad. Base producto d976f07, HEAD previo 8e91d1c, rama codex/mi-ano-simple-preview. Producción y datos existentes fuera de alcance.

## Contenido

36 talleres: 24 previos conservados y doce nuevos. Diez nuevos admiten 3/4/5; escritura y lectura de guía, 4/5. En conjunto son 58 variantes y 18/20/20 opciones para 3/4/5. Diez competencias principales cubiertas por la biblioteca ampliada; sin afirmar cobertura exhaustiva del CNEB.

Nuevos: Así me siento y pido ayuda; Una caja de cosas que me gustan; Acuerdos para jugar juntos; Cuidamos nuestro rincón de juego; Mensajes que llegan a alguien; Caminos que inventa mi cuerpo; Bailamos una idea; Rampas y ruedas: probamos caminos; Un mercado para nuestros pedidos; Un museo de objetos curiosos; Leemos pistas para cuidar los libros; Texturas para imaginar.

Cada adaptación tiene propósito, acción infantil, mediación docente, criterio observable, evidencia y duración. Etapas breves, materiales concretos, preparación/seguridad e inclusión; sin caligrafía/copia, exposición emocional obligatoria, carreras competitivas ni asignación de niveles. Dos imprimibles originales: tiras-de-mensajes.png y cuidamos-los-libros.png, con SVG/procedencia. Los cuatro anteriores no cambiaron al regenerar los seis.

Referencia: Programa Curricular de Educación Inicial, https://repositorio.minedu.gob.pe/handle/20.500.12799/4548 y KB local v4.1.0 con IDs/aplicabilidad por edad. Contenido editorial Ayni; no transcripción oficial, certificación MINEDU ni validación pedagógica humana. Se verificó que escritura no se asigne a 3 años. No se trasladan competencias religiosas/segunda lengua/transversales sin contexto.

## Implementación y protecciones

Una tarjeta por identidad; campo ages y adaptaciones explícitas. Sin adaptación, una edad no autoriza el guardado. Servidor resuelve según aula propia, conserva reglas de fecha lectiva/idempotencia, snapshots versionados con edad. Búsqueda sobre el propósito de la edad elegida. Biblioteca reutiliza tipografías, pictogramas y tarjetas; navegación principal intacta.

Misma persistencia canónica, sin migraciones/RLS ni otro motor/almacén de observación. Seleccionar no llama IA. Actividades existentes no se reescriben; Word formal y guía común usan datos de la adaptación guardada. Rollback: producto d976f07, conservando filas/snapshots.

## Verificaciones realizadas

- 47 pruebas automatizadas PASS: catálogo, recursos, las 58 variantes publicadas/abiertas en tres aulas ficticias con sus criterios y replay, edades no autorizadas, propiedad, calendario, observaciones, ejecución, Word y regresiones previas.
- Typecheck, lint y build Next webpack finales PASS. Cinco pruebas focales repetidas tras el último ajuste de presentación también PASS; son parte de las 47 distintas, no se suman dos veces.
- QA de navegador en fixture PGlite de 35 niños ficticios: 18/20/20 tarjetas por edad y 36 sin filtro. Guía emocional de 3 años y escritura de 5 años muestran consignas/criterios diferentes. Taller compartido de escritura añadido desde móvil a 27/10; abierto en Hoy con materiales, preparación, tres momentos y botón de observación junto al criterio. No se inició ejecución ni se registraron observaciones nuevas para esta comprobación.
- Word descargado desde UI conserva título, criterio y mediación de 5 años. Archivo privado de verificación: .local/workshop-expansion-20261015/word-check.json. Plantilla/exportador existente, sin afirmar nueva revisión impresa de Word.
- Dos PNG originales inspeccionados visualmente; separación final de las notas de la tira corregida antes de publicar.
- Relectura HTTP local del taller elegido mantiene tres momentos y criterio de escritura de 5 años. Los dos nuevos PNG servidos son idénticos a sus archivos. Recibo privado ui-receipt.json. La búsqueda por propósito de 3 años encuentra la adaptación correspondiente; tipo gráfico-plástico unificado con el piloto para evitar filtros duplicados.
- Escritorio 1440 y móvil 390: sin overflow horizontal ni imágenes rotas. Capturas locales privadas en .local/workshop-expansion-20261015.
- Proveedor QA restringido a loopback, cero llamadas pagadas ni escrituras pedagógicas cloud. No hardware de voz/cámara ni aplicación en aula con niños reales.

## Publicación

Pendiente commit de producto, Preview, smoke y comprobación de Producción intacta. No promoción a Producción.
