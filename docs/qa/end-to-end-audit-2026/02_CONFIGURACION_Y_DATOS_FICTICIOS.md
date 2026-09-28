# Configuración y datos ficticios

Se creó una identidad local nueva y una base de QA independiente. Comprobación de solo lectura antes de la UI: 0 perfiles, 0 aulas y 0 llamadas de IA para la docente QA. Las migraciones originales conservan fixtures de otra identidad, que no se usan en este recorrido. Captura: `screenshots/01-aula-15-alumnos.png`.

Por la interfaz se registraron IEI Semillas del Valle QA, Lucía Palomino Quispe, sección Exploradores, 5 años, año 2026, distrito Valle Claro QA, UGEL de prueba y dirección ficticia María Saavedra Torres. Se creó logo SV mediante la opción del producto. Las fechas sugeridas fueron 02/03/2026 y 31/12/2026, incluyendo gestión; no se cambiaron en el onboarding.

Se añadieron 15 alumnos uno a uno mediante nombre y apellido. Se mezclaron mayúsculas y minúsculas en los datos de entrada. Los 15 aparecen normalizados, incluyendo tildes. Se omitió deliberadamente la fecha de Omar para probar que es opcional. No se empleó importar CSV ni SQL.

Limitación detectada al reconciliar: las 15 fechas de nacimiento quedaron `null`, pese a que se intentó rellenar fechas durante la automatización. No hay evidencia suficiente del valor del control inmediatamente antes de cada envío para atribuirlo al producto. Por tanto NO se declara validada la persistencia de nacimiento ni se abre un bug confirmado de pérdida de fechas. Las fechas del ground truth son diseño de la muestra, no datos efectivamente guardados. La edad curricular sí es 5 años por configuración del aula. No se corrigió el estado con SQL.

Se completaron 15 entrevistas con datos ficticios de familia, castellano, intereses, autonomía y relaciones, y un apoyo de anticipación/grupo pequeño para Mateo. Omar tiene contexto breve, no competencia inferida. Guardar confirmó la entrevista y devolvió a la lista. El panorama mostró intereses frecuentes cuentos y naturaleza, sin convertirlos en niveles. Captura: `screenshots/02-entrevistas-confirmadas.png`.

El recorrido es acelerado: reloj real septiembre de 2026 y año pedagógico simulado 2026. Los módulos sin selector de fecha conservan la fecha real; esta limitación se distingue de la cronología de actividades/períodos que permita el producto.

## Restricciones de la medición

No se graba audio del ambiente ni se usan voces, fotos o datos reales. La prueba de audio real requiere una fuente ficticia controlada y entrada de micrófono autorizada; mientras no se pueda ejecutar, no se declara validada. El control de texto está ejecutado.
