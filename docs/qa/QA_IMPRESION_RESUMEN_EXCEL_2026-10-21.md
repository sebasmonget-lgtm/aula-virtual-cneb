# Impresión del resumen del Excel

La descarga real contiene las treinta notas y conclusiones exactas, pero al imprimir su hoja Resumen aparece una segunda página casi vacía con la continuación de una frase. El XML declaraba ajustar a una página sin activar fitToPage en las propiedades de esa hoja. El consolidado ya activaba esa propiedad y se conserva.

Cambio mínimo: activar la propiedad existente en Resumen. No se modifica ningún valor, fórmula, celda, ancho, estilo, nombre de hoja o criterio de exportación. No hay IA, migración o edición de datos. Se verifica comparando todas las celdas del archivo nuevo con la descarga anterior y renderizando la impresión con LibreOffice. Reversión: retirar únicamente sheetPr/pageSetUpPr de la hoja Resumen. Publicación QA y descarga real se registrarán tras las comprobaciones.
