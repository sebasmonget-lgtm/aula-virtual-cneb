# Biblioteca de talleres en Hoy

Base: 37a3590, rama codex/mi-ano-simple-preview. Alcance aprobado: talleres preparados por competencia, tipo y edad, con toda la información necesaria para guiar y observar en Hoy. Solo Preview. Cuenta QA cloud reiniciada conservada; no se pobló para estas pruebas.

## Contenido pedagógico

Catálogo inicial de 24 talleres, ocho para cada edad de 3, 4 y 5 años. Se reutilizan los seis pilotos de biblioteca-talleres y se añaden dieciocho propuestas originales con retos, mediación, criterios y evidencia diferenciados por edad. No es una cobertura exhaustiva de todas las competencias del CNEB ni una certificación MINEDU.

| Tipo | Competencia principal | Talleres por edad |
| --- | --- | --- |
| Psicomotricidad | PSICO_MOTRICIDAD | 3, 4, 5 |
| Gráfico plástico | COM_ARTE | 3, 4, 5 |
| Lectura | COM_LECTURA | 3, 4, 5 |
| Matemática cantidades | MAT_CANTIDAD | 3, 4, 5 |
| Matemática formas | MAT_FORMA | 3, 4, 5 |
| Ciencia | CYT_INDAGA | 3, 4, 5 |
| Música | COM_ARTE | 3, 4, 5 |
| Juego dramático | COM_ORAL | 3, 4, 5 |

Cada taller incluye propósito, materiales concretos, preparación/seguridad, acción docente e infantil por momento, criterio observable y evidencia esperada. Una sola competencia pertinente por taller; no se agregan secundarias decorativas. No se inventan inventarios, observaciones o niveles. La docente revisa antes de elegir y conserva la decisión pedagógica.

Referencias: CNEB, Programa Curricular de Educación Inicial y guías de planificación/interacciones en la KB versionada. Las pruebas verifican IDs y referencias de edad. Las propuestas nuevas son redacción Ayni, no citas oficiales. Fuentes primarias: https://www.minedu.gob.pe/curriculo/pdf/programa-curricular-educacion-inicial.pdf y https://repositorio.minedu.gob.pe/handle/20.500.12799/6518. La revisión pedagógica humana y la aplicación en aula siguen siendo necesarias; no se declaran realizadas.

Recursos originales: cuento breve La semilla de Lila, tarjetas de cantidades, tarjetas de formas y registro de exploración. PNG imprimibles con fuentes SVG y procedencia en assets/workshop-resources; cuatro páginas inspeccionadas visualmente. Se reutilizan las tarjetas motoras del piloto de cinco años mediante el descargador existente. Las fichas externas del inventario se mantienen intactas, sin publicar rutas locales inexistentes en Vercel.

## Flujo y protección

Hoy → Elegir taller → filtros/revisión → día lectivo → Añadir a la jornada → guía común de Hoy. Se puede elegir un taller sin actividad principal preparada. No hay IA en este recorrido ni sexta opción de navegación. Primero competencias sin ejecución y luego menor cobertura nominal válida y antigüedad, sin inferencias de nivel.

Servidor: aula/año propios, edad del aula, calendario efectivo y fechas vigentes; una elección por día, bloqueo de aula, idempotencia y reloj no controlable por cuerpo HTTP. Snapshots inmutables de catálogo en tablas existentes. El cambio del catálogo no altera elecciones previas. La ejecución anticipada conserva programación e historia. Observaciones, fotografías privadas y evaluación usan sus servicios actuales; fotos no enviadas a IA. Los talleres históricos mantienen sus lectores.

## Validación realizada

- 46 pruebas automatizadas distintas PASS: catálogo y recursos, publicación de los 24 talleres en las tres edades, guías y criterios, propiedad, fechas, idempotencia, historial, cobertura, ejecución, observaciones, Word y regresiones de talleres anteriores.
- Typecheck, lint y Next webpack build finales PASS. Una ejecución de tsc simultánea al build perdió archivos temporales .next/types; se repitió después de terminar el build y pasó. Esos dos controles deben ejecutarse secuencialmente. Recibo de publicación pendiente.
- QA HTTP con PGlite aislado de 35 niños ficticios: 23 comprobaciones PASS. Taller de ciencia preparado para 23/10 y desarrollado el 20/10, sin cambiar fecha prevista; avance, cierre, guiada y libre; Word de 400306 bytes con observaciones reales del fixture. Recibo privado .local/workshop-library-20261015/functional.json.
- QA navegador: filtros de edad 3/4/5 con ocho tarjetas cada uno; elección de lectura para 26/10, guía por momentos, criterio de lectura, observación nominal guardada con contador y Word descargado desde UI. Recurso cuento descargado desde la ficha.
- Escritorio 1440 y móvil 390: sin overflow horizontal ni imágenes rotas en la biblioteca; modal de observación conserva ancho móvil. Pictogramas, paleta y fuentes originales.
- Capturas privadas: library-desktop-final.jpg, library-mobile.jpg, workshop-detail-mobile.jpg, guide-mobile.jpg, guided-observation-mobile.jpg y guía en .local/workshop-library-20261015. Full-page puede mostrar artefactos de stitching del encabezado fijo; para entrega usar captura de viewport.
- Cero llamadas pagadas; proveedores QA restringidos a loopback. Sin migraciones ni escrituras pedagógicas cloud. No se probó micrófono/cámara físicos ni impresión en papel. El Word reutiliza la plantilla actual y se verificó descarga/contenido, sin declarar nueva inspección impresa de sus páginas.

## Publicación

Producto: d976f07fec6d0e8a9e06f17bb9e0eb690782cde9, publicado en GitHub en codex/mi-ano-simple-preview.

Preview: https://ayni-aula-staging-dqfhsyfp4-ayni4.vercel.app · deployment dpl_9cVzVNVPeeqvmvRiqc7ATWJrAfh4 · READY · target null · SHA exacto comprobado. Next cloud PASS y 16 smoke por CLI autorizada PASS: cuatro imprimibles y pictograma 200; rutas privadas sin sesión docente 401; inicio, health y auth/config 200. Nuevo dominio abre el login Ayni. No se inició sesión ni se añadieron datos pedagógicos cloud para este QA; el recorrido funcional autenticado se probó con PGlite/35 niños ficticios.

Producción reconsultada conserva dpl_H19YWzRdGjkgh8y72QAd1qBty7Mf y SHA 9a0920230350cd6b9050f35683a1f35d459e78c7. Sin promoción, migraciones ni cambios de RLS. Proveedores/servidores locales de QA apagados después de la captura; navegación temporal limpiada y viewport restablecido. La página interna de error del navegador impidió cerrar una pestaña temporal; no afectó al QA, completado en una pestaña HTTP nueva permitida.

Descarga UI comprobada adicionalmente: Word de lectura conserva título, criterio y observación nominal del niño; PNG descargado idéntico al original. Recibo privado ui-downloads.json. Captura de entrega de la guía: guide-desktop-viewport.jpg.

Este recibo se añade en un commit documental posterior; no cambia el código del Preview.
