# Consolidado e informe del aula

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
