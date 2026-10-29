# Legibilidad Word y vista previa · 2026-10-27

La usuaria confirma que la captura procede de la vista previa de Codex. Allí aparece una fuente con remates; el DOCX declara Poppins y el render independiente la utiliza. No se atribuye una causa interna concreta al visor ni se declara corregido su motor. Las fuentes no están incrustadas: un lector sin Poppins puede sustituirlas.

## Cambio y alcance

Solo la proyección práctica de proyecto y actividad incorpora Poppins explícita en cada run, alineación izquierda y supresión de guiones automáticos. Cuerpo: interlineado 1,2 y 6 pt después; tablas: 1,15 y 4 pt después; encabezados: 8 pt antes y 5 pt después. Los separadores vacíos de tablas reciben altura controlada. La primera columna de la ruta sin días preparados gana ancho para conservar palabras completas. No cambian los maestros binarios, estilos, portada, papelería ni contenido pedagógico guardado; la exportación ordinaria y el plan anual conservan su formato anterior.

La tabla de criterios puede continuar por filas completas con cabecera repetida, en lugar de desplazar una competencia entera dejando un hueco grande. Se conserva unido el registro vacío y se agrupan aparte las referencias; sus líneas se ajustan para no partir una respuesta vacía en dos renglones. No se reduce la fuente ni se recorta información para alcanzar una cantidad de páginas.

## Evidencia

Muestras en `output/generador-documentos/legibilidad-word-20261027`: reexportación del proyecto y primer día reales v23 ya aceptados; cero llamadas IA nuevas. Siete páginas de proyecto y cinco de actividad, doce páginas inspeccionadas individualmente, sin errores de conversión ni palabras fuera de página. La actividad pasa de cuatro a cinco páginas con la separación nueva; materiales, inicio, desarrollo y cierre siguen juntos en la primera página de contenido. Las referencias ocupan la última página. No se presenta esta reexportación como nueva generación de contenido.

La regresión de fidelidad comprueba además fuente explícita, alineación y palabras sin división automática. Diecisiete comprobaciones de exportación/privacidad pasan en el primer punto de control; la prueba de fidelidad ampliada vuelve a pasar después de los últimos ajustes. Typecheck, lint completo y build ejecutados; el lint completo conserva un aviso previo de React. El lint de los dos archivos modificados no tiene avisos.

Reinicio autorizado de la variante después de verificar cero trabajos activos, sin limpieza. Launcher 27808, mismo almacén `generador-prueba-chat-20261025`. Web 5185 y dos descargas reales HTTP 200; OOXML descargado incluye el formato nuevo. Workspace, planning e índice documental son idénticos antes y después, y vuelven a compararse tras descargar: tres proyectos, 32 actividades, cuatro estudiantes. Evidencia local: `.local/legibilidad-preservation.json`. Sin despliegue ni cambios al checkout original.

## Reversión

Retirar `readableBody` y su invocación, restaurar los anchos de ruta y agrupación/longitud de líneas anteriores en `document-generator-practical-word.mjs`; reiniciar únicamente la variante. No revertir bases, versiones guardadas ni plantillas binarias. Los cambios solo se aplican al volver a descargar; los Word previamente descargados permanecen iguales.
