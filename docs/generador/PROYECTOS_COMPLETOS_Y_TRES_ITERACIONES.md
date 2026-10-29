# Proyectos completos y tres iteraciones — 2026-10-26

## Alcance

Solo la variante `codex/ayni-documentos-pruebas`. Mejorar las próximas generaciones, conservar la estética aprobada y no reescribir el año, proyecto, actividades o alumnos de la prueba docente. No se modifican los binarios de las plantillas originales ni se introduce otro paso de confirmación.

## Cambio vertical

El contrato documental de proyecto incorpora `projectPlanning` versión 2: situación significativa, recorrido general, materiales con disponibilidad confirmada o por verificar, acompañamiento y apoyos para cada edad, uno o dos enfoques pertinentes con actitudes e intervención docente, y entre tres y cinco momentos con decisiones infantiles. La situación puede desarrollar hipótesis plausibles que expliquen la elección; nunca se presentan como observaciones realizadas.

Cada actividad incorpora `activityPlanning` versión 2: materiales, acompañamiento/apoyo por edad, participación infantil y aporte al recorrido del proyecto. Los criterios y evidencias previstas siguen vinculados a los referentes oficiales y separados de los registros reales. Los lotes incluyen y validan la planificación de cada fecha; no se pierde al preparar las actividades siguientes.

Los esquemas y validadores viven en `document-generator-project-planning.mjs`. Los contratos de generación documental se seleccionan únicamente en esa modalidad; los contratos diarios mantienen su comportamiento. El servidor obtiene los campos del resultado privado del trabajo autorizado, no del contenido enviado por el cliente. Guarda `document_planning` en el maestro y `activity_document_planning` en cada actividad. No hay migraciones ni escrituras durante la descarga.

Los lectores aceptan el formato anterior. Los nuevos apartados Word aparecen solo cuando existe metadata nueva validada. Los renderizadores usan las tablas, estilos, portada, tipografía, colores e ilustraciones existentes. El maestro muestra recorrido general, cierre completo y la ruta breve de los días preparados de su edición; no copia las actividades completas.

## Tres iteraciones reales aisladas

Almacén ficticio: `generador-qa-proyectos-completos-20261026`. Tres estudiantes ficticios de 3, 4 y 5 años; recursos disponibles: bloques, telas y libros con imágenes. Restricciones: patio cerrado, sin agua para experimentar ni dispositivos digitales. Las posiciones anuales se sembraron como fixture; **no se generó un año real con IA**.

| Ronda | Prompt | Prueba y ajuste |
| --- | --- | --- |
| 1 | v12 | Proyecto y primer día de juego compartido. Situación hipotética, dos enfoques, recursos y apoyos completos. La lectura motivó reducir reiteraciones entre secuencia y apoyos. |
| 2 | v13 | Segundo día del mismo proyecto: imágenes para crear un escenario compartido. Avanza respecto del juego inicial con bloques; ayudas detalladas quedan en su apartado. Después se explicitó que el reto compartido debe movilizar las competencias, sin aumentar indebidamente las exigencias curriculares. |
| 3 | v14 | Proyecto de cuidado del agua y primera actividad. Propone juego simbólico seco con bloques/telas y alternativas condicionadas a las imágenes disponibles. Respeta las restricciones y desarrolla elecciones personales y decisiones compartidas. |

Cada ronda realizó una llamada, sin reintentos automáticos: **tres llamadas**, coste estimado registrado **USD 0.145607175**. Dos llamadas de maestro con `gpt-6.1-sol` y una de actividad con `gpt-6-luna`. El prompt final es `ayni-documents-v14`; la versión estructural de los nombres de esquema es v12 y la metadata persistida es versión 2.

Las tres salidas pasaron generación, validación, guardado autorizado, lectura y exportación Word. Se revisó que cada una conservase dos competencias, criterios diferenciados por edad y ausencia de logros atribuidos. Esto es una revisión de muestras, no una garantía de que cualquier salida futura tendrá calidad pedagógica perfecta.

## Evidencia y protección

Carpeta: `output/generador-documentos/proyectos-completos-20261026/`. `live-summary.json` registra llamadas y coste; cada ronda conserva petición sintética, resultado y Word. No se guardan claves.

Los snapshots de datos docentes antes y después son idénticos: hash `5150c891786acced4d862e224a937b0a7c14921b8e0611ec1b923129a565be51`. Año, proyecto, ocho actividades y cuatro alumnos conservados. Los cuerpos XML de los nueve Word anteriores son idénticos tras reiniciar con el código final. Las muestras no se incorporaron al almacén docente.

Se renderizaron cuatro Word, 38 páginas, sin texto fuera de página. La muestra final P02 incluye proyecto de diez páginas y actividad de nueve; se inspeccionaron individualmente las 19 páginas. La estética es la original. Los espacios de observación/reflexión permanecen vacíos para el registro docente.

La regresión compara `styles.xml` y todos los recursos gráficos originales byte por byte. También comprueba metadata en las ocho actividades preparadas, incluidos los lotes; compatibilidad antigua, aislamiento y ausencia de escritura al descargar. El test de actividad se alineó con el encabezado nativo «competencia · edad», conservando sus comprobaciones de criterios, evidencias, referentes, privacidad e inmutabilidad.

Validación final: `npm run test:documentos-generador`, 34 pruebas PASS; seis archivos de regresión de generación, lotes, persistencia y Word de proyecto/actividad, 42 PASS. Son 76 pruebas distintas. `npx tsc --noEmit`, lint, build y `git diff --check` con salida cero. Lint conserva un aviso previo en `diagnostic-generation-control.tsx`; build conserva los avisos del empaquetador. Los logs finales de los gates y la regresión están en la carpeta de evidencia.

## Límites y rollback

Los resultados previstos no sustituyen evidencias, evaluación real ni registros institucionales. La revisión pedagógica previa permanece como evidencia de los documentos antiguos; estos no se corrigen retrospectivamente. No se declara aprobación del MINEDU. No se modifican cuentas cloud, no hay commit, push ni despliegue.

Para volver atrás, desactivar la nueva selección de esquemas/prompts en generación documental y los apartados opcionales de exportación; mantener lectores compatibles con la metadata ya guardada. No borrar maestros o actividades ni alterar migraciones. Las plantillas binarias originales siguen siendo las mismas.
