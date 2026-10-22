# Impresión del resumen del Excel

La descarga real contiene las treinta notas y conclusiones exactas, pero al imprimir su hoja Resumen aparece una segunda página casi vacía con la continuación de una frase. El XML declaraba ajustar a una página sin activar fitToPage en las propiedades de esa hoja. El consolidado ya activaba esa propiedad y se conserva.

Cambio mínimo: activar la propiedad existente en Resumen. No se modifica ningún valor, fórmula, celda, ancho, estilo, nombre de hoja o criterio de exportación. No hay IA, migración o edición de datos. Se verifica comparando todas las celdas del archivo nuevo con la descarga anterior y renderizando la impresión con LibreOffice. Reversión: retirar únicamente sheetPr/pageSetUpPr de la hoja Resumen. Publicación QA y descarga real se registrarán tras las comprobaciones.

## Resultado comprobado

ee4bfb102cab2694972707b9597977bae0bd12d1 publicado solo en QA: deployment dpl_D89mBBPSZLrerN6VwLmrFwxhScYv, 24 comprobaciones staging/alias correctas, 66 huellas de fuentes conservadas y Producción intacta. Trece pruebas focales, typecheck, lint y build Next webpack correctos; lint conserva un aviso histórico. Cero nuevas llamadas IA y cero escrituras pedagógicas en la publicación.

Descarga real posterior: treinta filas, diez niños, tres competencias, 23 A y 7 B. Todas las celdas coinciden con el archivo previo y las treinta conclusiones conservan exactamente el texto confirmado. LibreOffice produce seis páginas en total, con Resumen en una sola página y las treinta conclusiones completas. Recibos privados: release-excel-print/release.json y excel-verification.json. No se vuelve a publicar por esta actualización documental.
