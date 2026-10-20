# Carátula y gráfica circular del informe familiar

Pedido: mejorar la carátula usando las otras plantillas y mostrar asistencia/tardanza/falta en círculo con tres colores, días, porcentajes y total. Se inspecciona la primera hoja de la plantilla de proyectos existente y se reutiliza su adorno inferior, sin generación de imágenes ni envío de fotos a IA.

Modelo común de lectura: cantidades excluyentes, faltas justificadas incluidas con aclaración, días sin registro fuera del círculo. Porcentajes sobre registros conocidos y redondeo independiente a una décima; cantidades iguales nunca tienen porcentajes distintos para forzar suma cien. Aclaración breve cuando los porcentajes redondeados no suman exactamente cien. Un período sin información no se presenta como ausencia. Se conserva el calendario autorizado y el corte, fuentes y datos versionados. No migraciones ni cambios de permisos. Pantalla y Word consumen el mismo modelo; dibujo determinista y valores nativos en el documento.

Se mantienen carátula independiente y una hoja por competencia. Cabecera con foto, datos en cuadrícula, resumen breve, asistencia y leyenda de notas, reutilizando tonos de Ayni. No reescritura del contenido pedagógico. Rollback del código o del alias anterior conserva todas las versiones y datos.

Empaquetado: adorno en assets/templates, incluido en el trace servidor. El centro del SVG usa contornos de diez dígitos y dos leyendas fijas Poppins, generados una vez con build-attendance-glyphs.py y licencia OFL conservada. No consultas de fuentes durante la descarga. Un HTTP 200 por sí solo no aprueba la presentación: la prueba real detectó glifos ausentes en el primer Preview, por lo que se restauró el alias previo antes de corregirlos.

Recibos privados: `.local/qa-caratula-circular-20261020`. Pruebas de redondeo, cantidades, pendientes, justificada, círculo y Word; regresiones de documentos/propiedad. Antes de declarar publicada la entrega deben constar typecheck/lint/build, inspección renderizada, smoke de Preview, comparación de datos y release.json con SHA/alias. No afirmar cobertura total de Ayni ni calidad de generaciones futuras.
