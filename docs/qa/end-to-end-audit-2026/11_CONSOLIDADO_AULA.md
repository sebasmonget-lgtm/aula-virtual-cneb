# Consolidado e informe del aula

## Corte posterior — cuatro XLSX reales no vacíos

P1, P2, P3 y P4 se descargaron desde **Revisar aula** y se cotejaron celda por celda con la exportación QA de solo lectura mediante `audit-consolidado-continue.mjs`; los cuatro dieron PASS, incluidas las celdas realmente vacías. Resumen: P1 150 pares/5 A/11 B/134 pendientes; P2 105/1 A/4 B/100; P3 135/2 A/3 B/130; P4 120/3 A/2 B/115. Ninguno contiene C/AD fabricadas ni convierte una observación individual en letra sin confirmación docente. P4 muestra 3 competencias con alguna actividad, 5 valoraciones confirmadas y 115 pendientes; el botón **Cerrar período** está deshabilitado. **Preparar informe del aula** también está deshabilitado; «Ver informe» responde «Aún no hay informe». No se declara informe narrativo del aula ni distribución de un período formalmente cerrado. Los XLSX se inspeccionaron matemáticamente, no como render visual ni formato SIAGIE.

## ANTES DEL FIX — auditoría original

Estado: consolidado vacío y exportación negativa PASS; coherencia matemática con assessments no vacíos NO PROBADA.

## Lo observado

Revisar aula en P3/P4 tiene quince niños, cero competencias trabajadas, cero valoraciones confirmadas, cero pendientes y cero con cobertura incompleta. El cero de pendientes representa un ámbito vacío, no que quince alumnos estén realmente evaluados. Cerrar período permanece deshabilitado.

Preparar informe del aula sin valoraciones muestra «Confirma al menos la mitad de las valoraciones antes de preparar el informe del aula». No consume una llamada de IA. Protege contra inventar una interpretación del grupo desde un consolidado sin base.

Se descargó el Excel real de P3 por el enlace de la UI. Es un libro válido, una hoja y cinco columnas: Alumno, Competencia, Valoración, Conclusión descriptiva, Período. No contiene filas de evaluación, fórmulas ni valores C fabricados. La importación/inspección de solo lectura con el runtime de hojas y su render están en `consolidado-inspect.json` y `consolidado-preview-1.png`. No se editó el archivo original.

Los encabezados están completos como valores, pero el render con anchos predeterminados recorta algunos títulos, H20 COSMETIC. Exportar para SIAGIE figura deshabilitado con Próximamente. El Excel genérico de Ayni NO equivale a formato oficial homologado ni a importación SIAGIE validada.

## Límite matemático

La igualdad comprobada es 0 valoraciones individuales = 0 celdas/conclusiones en el consolidado = 0 filas de evaluación exportadas. No demuestra suma de AD/A/B/C, denominadores, porcentajes, insuficiencia por alumno ni coherencia de un informe real. Los tests correspondientes con fixtures no reemplazan esa validación.

## Diferencia con el resumen diagnóstico

El Word del diagnóstico dice 28 registros revisados; el snapshot contiene 27 notas curriculares únicas y 28 asociaciones nota–competencia por una observación multietiqueta. Las notas brutas son 29 (5 guiadas + 24 espontáneas); dos espontáneas no son curriculares. La discrepancia es de unidad de conteo: H16. No hubo pérdida de la nota ni asignación de nivel por este conteo.

## DESPUÉS DEL FIX — consolidado P1 no vacío

Se descargó `evidencias/consolidado-p1-confirmado.xlsx` por la UI de Revisar aula. Una hoja, cinco columnas y 150 parejas alumno–competencia, más cabecera. Comparación automática de solo lectura, celda por celda, con el endpoint autorizado del mismo período: **PASS**, A=5, B=11, C=0, AD=0, pendientes=134, conclusiones=16. No hay valoración de Omar ni letra por ausencia de evidencia. El script no modifica el libro ni los datos QA (`audit-consolidado-continue.mjs`, `consolidado-p1-inspect.json`).

La suma de decisiones individuales coincide con distribución de aula/exportación. P1 planificación ahora muestra 3 A/11 B/1 pendiente en convivencia y las dos fortalezas A específicas fuera de los primeros IDs (H40). Registro insuficiente no se equipara a nivel bajo. Informe grupal formal sigue bloqueado por su prerrequisito de mitad de valoraciones (16/150); no hay informe generado desde este consolidado incompleto ni cierre aprobado. La captura `25-p1-consolidado-niveles-pendientes.png` muestra esta barrera.

La inspección del XLSX es matemática y estructural; no se certifica su render visual ni formato SIAGIE. H31 corrigió aparte el conteo del Word diagnóstico a 27 registros únicos; ese documento no alimenta las letras del consolidado del período.

## DESPUÉS DEL FIX — consolidado P2

Descarga real por UI y conciliación de solo lectura de `consolidado-p2-confirmado.xlsx`: 105 parejas, quince niños, siete competencias, cinco conclusiones. **A=1, B=4, C=0, AD=0, pendientes=100**; cabecera y todas las celdas coinciden con la proyección del período. La matriz diferencia Camila con información insuficiente (una nota vaga), cantidad con una observación por cuatro niños aún no valorada y competencias sin registro. No se suman las letras P1 como si fueran decisiones P2. Cierre e informe global permanecen deshabilitados; la prueba matemática no los convierte en PASS. Resultado reproducible: `consolidado-p2-inspect.json`.

## DESPUÉS DEL FIX — consolidado P3

`consolidado-p3-confirmado.xlsx` descargado por UI: 135 parejas/15 niños/9 competencias. Cinco conclusiones y letras confirmadas: A=2/B=3/C=0/AD=0/pending=130. **PASS celda por celda**, sin arrastrar P1/P2 ni completar vacíos con C. La pantalla indica dos competencias trabajadas, cinco valoraciones, 130 pendientes y nueve competencias con cobertura incompleta. Cierre e informe de aula siguen deshabilitados. `consolidado-p3-inspect.json` conserva el contraste; render visual y SIAGIE no probados.
