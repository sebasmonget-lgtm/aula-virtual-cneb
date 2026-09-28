# Configuración y datos ficticios

Se creó una identidad local nueva y una base de QA independiente. Comprobación de solo lectura antes de la UI: 0 perfiles, 0 aulas y 0 llamadas de IA para la docente QA. Las migraciones originales conservan fixtures de otra identidad, que no se usan en este recorrido. Captura: `screenshots/01-aula-15-alumnos.png`.

Por la interfaz se registraron IEI Semillas del Valle QA, Lucía Palomino Quispe, sección Exploradores, 5 años, año 2026, distrito Valle Claro QA, UGEL de prueba y dirección ficticia María Saavedra Torres. Se creó logo SV mediante la opción del producto. Las fechas sugeridas fueron 02/03/2026 y 31/12/2026, incluyendo gestión; no se cambiaron en el onboarding.

Se añadieron 15 alumnos uno a uno mediante nombre y apellido. Se mezclaron mayúsculas y minúsculas en los datos de entrada. Los 15 aparecen normalizados, incluyendo tildes. Se omitió deliberadamente la fecha de Omar para probar que es opcional. No se empleó importar CSV ni SQL.

Limitación detectada al reconciliar: las 15 fechas de nacimiento quedaron `null`, pese a que se intentó rellenar fechas durante la automatización. No hay evidencia suficiente del valor del control inmediatamente antes de cada envío para atribuirlo al producto. Por tanto NO se declara validada la persistencia de nacimiento ni se abre un bug confirmado de pérdida de fechas. Las fechas del ground truth son diseño de la muestra, no datos efectivamente guardados. La edad curricular sí es 5 años por configuración del aula. No se corrigió el estado con SQL.

Se completaron 15 entrevistas con datos ficticios de familia, castellano, intereses, autonomía y relaciones, y un apoyo de anticipación/grupo pequeño para Mateo. Omar tiene contexto breve, no competencia inferida. Guardar confirmó la entrevista y devolvió a la lista. El panorama mostró intereses frecuentes cuentos y naturaleza, sin convertirlos en niveles. Captura: `screenshots/02-entrevistas-confirmadas.png`.

El recorrido es acelerado: reloj real septiembre de 2026 y año pedagógico simulado 2026. Los módulos sin selector de fecha conservan la fecha real; esta limitación se distingue de la cronología de actividades/períodos que permita el producto.

## Restricciones de la medición

No se graba audio del ambiente ni se usan voces, fotos o datos reales. La prueba de audio real requiere una fuente ficticia controlada y entrada de micrófono autorizada; mientras no se pueda ejecutar, no se declara validada. El control de texto está ejecutado.

## Continuación después de los fixes

QA conserva frontend 5175/API 8790 y `.local/qa/end-to-end-audit-2026/pgdata`; original 5173/API 8788 permanece separado. El harness `audit-business-clock.mjs` afecta solo ahora del proceso QA validando puerto, identidad y directorio exactos; nunca se importa en producto ni abre una segunda instancia de PGlite en el mismo directorio. Las fechas persistidas explícitas no se reescriben. Las fechas de P1 avanzaron por marzo/abril y gestión de mayo; P2 por 8, 10, 15, 16 de junio y gestión del 27 de julio. El diagnóstico inicial sigue fechado en septiembre: no se backdateó para aparentar un año cronológicamente perfecto desde marzo.

H47 reinició únicamente la API QA para aplicar su migración nueva. Los PIDs actuales están en `environment-api.json`; el puerto original y su base no recibieron esa migración durante la auditoría. La huella del dashboard original permanece `29b7c96d36bca81fc781fe36cd9fd9acecb334d468a4f85888454a05ed09a1e9` en `p2-five-assessed-qa-snapshot` (comprobación GET, sin escrituras). La prueba sigue siendo local, de aula ficticia y sin despliegue, no una validación multiusuario o móvil real.

P3 avanzó por 31/8 (dos episodios separados por hora), 1/9, 2/9 y gestión del 12/10. Tres cierres diarios fueron guardados explícitamente por UI. Durante gestión se confirmaron marco, cinco valoraciones/conclusiones y un informe familiar; se descargó Excel. `p3-five-assessed` confirma otra vez la misma huella del original. La interfaz cliente conserva el encabezado de fecha real: no se presenta el harness como una funcionalidad docente disponible ni se certifica cronología diagnóstica retroactiva.

P4 avanzó por 3/11, 5/11, 9/11, 11/11 y 12/11 con cinco actividades y cierres diarios, luego al 21/12 para revisar valoración y familia. Las 24 notas P4 se ingresaron desde UI y se conciliaron con los casos escritos antes de capturarlas. El reloj de negocio afectó únicamente QA; el cliente original siguió mostrando la fecha real de septiembre (H44). El snapshot final `p4-family-final` confirmó la misma huella del aula original. Los datos ficticios se conservan y no equivalen a un año cronológicamente observado con una docente real.
