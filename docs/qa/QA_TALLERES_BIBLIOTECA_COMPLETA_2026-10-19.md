# Revisión de la biblioteca completa de talleres — 19/10/2026

> Actualización posterior: la persona usuaria decidió separar la guía de Hoy del material infantil. La descarga conjunta descrita abajo queda como evidencia histórica, sustituida por `QA_IMPRIMIBLES_SEPARADOS_2026-10-19.md`.

Base: `738d0cb04597e60c50ae4f4325642d587475e3cd`, rama `codex/qa-corrections-20261019`. Cambios locales posteriores a la revisión de Hoy y fichas; no constituyen un nuevo despliegue. Se conservan los cambios anteriores del checkout.

## Alcance comprobado

- 100 propuestas distintas, 246 variantes por edad, 14 tipos y diez competencias de cinco áreas. No se cuentan las adaptaciones de una propuesta como talleres nuevos.
- Lectura editorial de los cuatro archivos que componen el catálogo: pilotos, familias iniciales, propuestas multiedad y ampliación. Se revisaron propósito, materiales, preparación, inicio/desarrollo/cierre, criterio y evidencia. Las adaptaciones conservan desafíos distintos por edad; el contrato curricular vigente comprueba su aplicabilidad.
- Matriz de los 100 títulos: `QA_TALLERES_COBERTURA_2026-10-19.csv`.
- Catálogo nuevo `1.5.0`. Mismos IDs estables; cambiar «Creamos un paisaje sonoro» por «Inventamos los sonidos de un lugar» no rompe referencias anteriores. El taller de puente de papel conserva también su ID.

## Problemas y correcciones

| ID | Problema reproducido | Causa y solución |
| --- | --- | --- |
| T100-01 | 64 talleres sin hoja infantil descargaban tres tarjetas genéricas con acciones del niño y el mismo adorno repetido. Los que tenían ficha no incluían guía docente individual. | El generador usaba la ficha como sustituto del taller. Todas las descargas por taller incluyen ahora propósito, competencia canónica, preparación/materiales, criterio, evidencia y los tres momentos con acciones de profesora y niños. Las hojas infantiles pertinentes se anexan después. |
| T100-02 | Inicio y cierre idénticos en las 18 variantes de las seis familias iniciales. | Se escribieron acciones concretas para cuento, reparto, construcción, agua, música y viaje imaginado. Los criterios y el desarrollo por edad siguen diferenciados. |
| T100-03 | Vocabulario abstracto y frases poco prácticas en distintas familias. | Corrección en la fuente editorial, sin filtro que altere observaciones. Ejemplos: «grafías» → «trazos o letras a su manera»; «combinación cromática» → colores elegidos; «característica perceptual» → color, forma o tamaño que observa. Se reescribieron las frases completas y se revisó concordancia. En modelado se sustituye «Distingue sostener la obra de imponer su forma» por ayuda concreta cuando una parte de masa se cae. |
| T100-04 | Diez fichas usaban el mismo dibujo de cabecera; cuentos y cuidado de libros tenían esquemas repetidos. | Cabeceras relacionadas con cada recurso, escenas para los dos cuentos, cuatro acciones diferentes para libros, charco con reflejo, sol/luna y seis movimientos corporales. Se conservan cantidades exactas y formas geométricas claras, sin añadir objetos decorativos que confundan el conteo. |
| T100-05 | Las tarjetas motoras antiguas quedaban fuera de la mejora y el enlace viejo seguía rasterizando el texto. | Nueva ficha Ayni de seis acciones, enlazada al catálogo por el mismo ID de recurso. La antigua URL autenticada entrega esa misma ficha con texto nativo. Los archivos originales de referencia y los PDF oficiales permanecen intactos. |

## Ilustraciones y recursos

Once familias originales Ayni: cantidades, formas, recorrido motor, registro de exploración, cuento de Lila, mensajes, cuidado de libros, cuento de Nina, poema del charquito, adivinanzas e instructivo de agua.

Seis generaciones mediante la herramienta integrada de imágenes producen quince archivos optimizados nuevos: doce apoyos de hasta 320 px, un charco de 600 px y dos tiras de cuento de 1080 px de ancho. La herramienta no expone un parámetro de calidad/resolución; se pidió detalle sencillo o medio según uso y se ajustó el tamaño final con Sharp. Se conservaron las cuatro ilustraciones de agua de la ronda anterior. No se enviaron fotografías de niños ni se usaron claves de la aplicación para generar imágenes.

Archivos y especificaciones de prompts: `assets/workshop-resources/ILLUSTRATIONS.json`; procedencia/generador: `assets/workshop-resources/PROVENANCE.json`. Las imágenes contienen solo dibujos; texto PDF nativo, seleccionable, con encabezado del colegio/aula y logo opcional. No se atribuye autoría MINEDU al material Ayni.

Un taller corporal o de creación libre no necesita una hoja para que todos produzcan lo mismo. Todos tienen guía para la docente; se entrega material infantil cuando ayuda a la experiencia. No se rellenan huecos con fichas de otra competencia.

## Validación

- 28 pruebas automatizadas PASS: impresión, contratos editoriales, aplicabilidad por edad, selección, calendario, permisos, persistencia, replay, observaciones y Word de la guía. Incluyen recorrer las 246 variantes; ese recorrido no se suma como 246 tests independientes.
- Exportación real de 246 PDF y once recursos independientes. Extracción con pypdf: ningún campo requerido omitido, todos los materiales y ambas voces de los tres momentos presentes. Control de márgenes de texto generado por Ayni, sin interpretar como coordenadas propias las matrices internas de los PDF oficiales anexados.
- Revisión visual: 200 páginas de guía representativas de los 100 títulos mediante diez planchas; once recursos infantiles renderizados con Poppler y revisión a mayor tamaño de ejemplos. No equivale a lectura visual de las 572 páginas de todas las edades ni a aplicación presencial en un aula.
- UI local con diez alumnos ficticios: biblioteca de 5 años muestra 84 propuestas compatibles, incluidas multiedad. Búsqueda y apertura de Nina y modelado; descarga del PDF desde el enlace real. Sin programar talleres ni modificar evidencias durante esta comprobación.
- Typecheck, lint, build Vinext y build Next webpack: PASS. Evidencias y logs locales en `.local/qa-workshops-all-20261019/`.

## Integridad, costos y límites

Sin migraciones, cambios en modelos/prompts de la aplicación, escrituras pedagógicas cloud ni modificaciones de Producción. Los cambios editoriales se aplican a selecciones nuevas del catálogo; no se actualizan snapshots de talleres ya guardados, observaciones ni Word históricos.

Cero llamadas pagadas a la API de generación de la aplicación. El último acumulado conservador de QA sigue en USD 4,75075397, máximo autorizado USD 6; las seis llamadas a la herramienta integrada de imágenes no entregan un costo monetario verificable, por lo que no se les inventa un precio.

Esta ronda verifica la biblioteca, sus guías y recursos. No certifica de nuevo la generación IA de proyectos, el año completo ni la preparación para Producción.

Rollback: retirar solo los cambios de esta ampliación en los cuatro archivos de catálogo, generador de recursos, impresión y pruebas; regenerar las fichas correspondientes y conservar los cambios previos de Hoy/plantillas. No usar restauración total a HEAD sobre este checkout compartido: borraría trabajo anterior todavía sin commit. No hay datos que revertir.
