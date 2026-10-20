# Revisión de plantillas y exportaciones de Ayni

## Alcance y resultado

Base `738d0cb04597e60c50ae4f4325642d587475e3cd`, rama `codex/qa-corrections-20261019`. Revisión de todas las familias de exportación activas y sus lectores históricos, incluyendo rutas que la revisión anterior no había cubierto. Las muestras actuales quedan verificadas en formato, con las limitaciones explícitas de esta matriz. No es una nueva aprobación del contenido generado por IA ni del recorrido anual completo.

Se renderizaron con Microsoft Word local 32 DOCX y 315 páginas, incluyendo casos anteriores y corregidos. La inspección visual se hizo por familias mediante contactos y páginas individuales de los defectos; no equivale a certificar manualmente cada página a tamaño de impresión. Se utilizaron datos guardados de QA para anual, proyecto y actividad; los demás casos son fixtures locales ficticios, sin escrituras pedagógicas cloud. Cero llamadas pagadas de IA.

## Matriz de cobertura

| Familia | Comprobación | Resultado acotado |
| --- | --- | --- |
| Plan anual actual, quince proyectos | Lectura canónica autorizada de Preview; render local con código corregido, portada, tabla y encabezados. 51 páginas frente a 50 anteriores por reservar espacio al encabezado. | PASS de apertura y geometría; revisión visual de muestra. Sigue siendo extenso por el contenido y la procedencia conservados. |
| Anual histórico unificado, flexible y veinte proyectos | Ejecución de todos los renderizadores; archivos abiertos con Word. Flexible histórico 17→13 páginas sin retirar sus doce propuestas. | PASS de contratos y muestra visual. Los lectores de doce/veinte propuestas son compatibilidad; no cambian los quince proyectos actuales. |
| Diagnóstico unificado y anterior | Render de ambos; casos con información insuficiente y 25 niños. | PASS de muestra. Caso pequeño 6→5 páginas, con firmas conservadas; caso de 25 niños, 12 páginas. |
| Proyecto y unidad | Archivo guardado de QA y fixture del renderizador unificado; lector genérico anterior. | PASS de apertura, contenido y muestra visual. Proyecto guardado: 10 páginas. |
| Actividad diaria | Documento guardado de QA, criterios múltiples, sin evidencias, con observaciones/reflexión, y lector antiguo. | PASS de contratos y muestra visual. Documento guardado: 4 páginas; conserva carátula y guía. |
| Actividad con taller | Plantilla original retenida, taller opcional, numeración y tabla compacta. | PASS de muestra de 4 páginas; la tabla breve del taller se mantiene completa. |
| Informe familiar | Sin foto y con foto opcional en regresiones; dos competencias, acuerdos y campos ausentes en muestra local. | PASS de formato y conservación. Muestra completa 2→1 página sin suprimir textos; no inventa la valoración que no viene de la fuente. |
| Cierre bimestral Word | Veinte entradas y un pendiente ficticios; nombres, competencia, nivel, conclusión y evidencia. | PASS de muestra. Registros agrupados en filas que permanecen juntas cuando caben. 7 páginas; no se convierten pendientes en C. |
| Talleres y fichas PDF | 246 combinaciones taller/edad generadas por test, A4 y título comprobados. Doce familias de recursos, dos fichas MINEDU y encabezado largo renderizados como muestras. | PASS estructural de las 246 variantes; PASS visual de las familias muestreadas. No implica revisar pedagógicamente las 100 propuestas una por una. |
| Consolidado Excel | Dos hojas importadas y renderizadas con Artifact Tool; lectura de XML y regresiones de valoración/conclusión, permisos y CORS. | PASS de muestra. Excel no fue revisado en impresión física ni con Excel nativo. |
| Consolidado CSV | Flujos HTTP locales de valoración confirmada y pendientes; descarga derivada del mismo consolidado. | PASS funcional. No tiene diseño de página propio. |
| ZIP | Pruebas de manifiesto, hashes, mismos bytes, aislamiento entre docentes/aulas. | PASS funcional. Empaqueta los artefactos; no es otra plantilla. |

Los DOCX de `assets/templates/` que no tienen ruta de producción activa son referencias retenidas, no nuevos productos independientes para certificar. Las entrevistas y el informe agregado del aula no tienen una exportación Word independiente en el dispatcher actual; sus fuentes se reutilizan donde corresponde.

## Defectos corregidos

| ID | Síntoma y causa | Corrección y prevención |
| --- | --- | --- |
| PT01 | Encabezados de la papelería ocupaban más altura que el margen superior; algunos títulos y tablas comenzaban sobre la banda. | Margen superior mínimo de 72 pt en el renderer unificado, conservando márgenes mayores, portada, tipografía e ilustraciones. Regresión de contenido, idempotencia y márgenes laterales. |
| PT02 | Firmas solas y títulos diagnósticos separados de su sección. Saltos duros y títulos construidos como tablas con párrafos vacíos. | Flujo natural después de la portada, limpieza de final vacío y títulos nativos que conservan los runs/iconos originales. Lectura y decisión permanecen juntas; seguimiento individual no separa el apoyo de su contexto. Render de 2 y 25 niños. |
| PT03 | El anual flexible histórico dejaba pocas filas en una página antes de otro salto forzado. | Solo la portada impone salto. Regresión conserva las doce propuestas históricas y todos sus campos. |
| PT04 | Informe familiar y cierre usaban un formato básico distinto del resto; acuerdos podían quedar solos. Cierre mostraba el tipo genérico Documento y separaba nombre de valoración. | Identificación compacta, identidad Ayni, campos familiares menos fragmentados y registros de cierre agrupados. Valores y fuentes permanecen iguales. Los lectores genéricos anteriores reciben la misma identidad visual al volver a exportar. |
| PT05 | Taller breve partido entre páginas y numeración VIII después de secciones retiradas. | Tabla breve unida y numeración dependiente de secciones presentes. Las tablas largas conservan la posibilidad de fluir. |
| PT06 | Colegio largo sobrepuesto al aula en PDF; imágenes cortas pegadas al pie dejando un gran hueco superior. | Geometría del encabezado según líneas reales, espacio para nombre y logo, ficha alineada debajo y escalada dentro del área restante. Regresión vertical/horizontal, con/sin logo. |
| PT07 | El recurso Pintamos con agua todavía decía marcas, pese a la petición de lenguaje sencillo. | Se cambia a líneas/dibujo en el generador y se regeneran el SVG y PNG correspondientes. Los otros nueve recursos quedan idénticos. |

## Validación

- 56 pruebas de documentos, artefactos privados, ZIP, cierres, currículo conservado y PDF: PASS.
- 9 pruebas HTTP adicionales de H34 y Excel más el flujo HTTP de valoración, cierre y CSV confirmado: 10 PASS.
- `npx tsc --noEmit`, lint, build Vinext y build Next webpack: PASS final. Una ejecución de typecheck en paralelo con Next encontró tipos generados temporalmente ausentes; se repitió después del build. No fue un error de código ni se alteró tsconfig para ocultarlo.
- Tres lecturas de documentos guardados del Preview: HTTP 200. Los DOCX corregidos se renderizaron localmente; no se presenta esto como una nueva descarga del código aún no desplegado.
- Comprobación geométrica de páginas: sin caracteres fuera de la hoja en las muestras. El cotejo textual automático no es un certificado de fidelidad total: el extractor puede intercalar columnas y no decodificar ciertos glifos de fuentes antiguas; los casos se contrastaron visualmente.
- No se modificaron prompts, modelos, datos guardados, migraciones, niveles ni cierres. Nuevas revisiones de artefacto conservan los archivos anteriores: anual journey v5, anual unificado layout2, flexible layout2, proyecto layout7, actividad layout11, diagnóstico layout3 e informes/cierres layout2.

## Evidencia, pendientes y publicación

Evidencia reproducible local en `.local/template-audit-20261019/`: fixtures, recibo de lecturas canónicas sin secretos, logs, render.json, geometría y PNG/PDF. Auth y cuerpos privados permanecen ignorados por Git. Muestra final para revisión en `outputs/qa-plantillas-20261019/`.

Persisten dos límites de producto: el anual conserva muchas páginas de procedencia y las fichas de los cien talleres no equivalen a cien fichas MINEDU curadas. Esta ronda no recorta historia ni convierte tarjetas docentes en fichas oficiales. Tampoco certifica cambios universales de paginación en todas las versiones de Word o impresoras.

Cambios locales sin nueva publicación en esta ronda. Preview sigue en el despliegue anterior; Producción no se modificó. Rollback: revertir los archivos de presentación y sus etiquetas de revisión del diff de esta ronda, sin borrar fuentes ni artefactos anteriores. No requiere migración ni rollback de datos.
