# Segunda revisión de legibilidad de documentos

Revisión local de la copia de QA del aula CELESTE, sin cambios en los datos confirmados ni despliegue. Los Word y PDF regenerados están en `.local/qa-documents/2026-09-30/` (fuera de Git).

## Cambios

- **Plan anual:** «Así se podría vivir» usa tres acciones breves según el tema y contexto de cada propuesta. Ya no parafrasea el propósito ni repite el producto. La propuesta del Día del Niño se centra en elegir juegos; la del Día de la Educación Inicial, en recorrer y cambiar un espacio; la unidad de rutas, en seguir un recorrido.
- **Actividad:** el propósito aparece una vez y la secuencia separa situación inicial, preparación docente, acciones de los niños, mediación, preguntas, materiales, cierre y qué observar. El apartado de observaciones realizadas continúa vacío hasta que la docente las registre en Hoy.
- **Proyecto:** origen, evidencias clave, preplanificación, competencias, evaluación y ruta se leen por bloques y viñetas a ancho de página. Se conservan los textos confirmados y los nombres oficiales CNEB.
- **Diagnóstico:** las fuentes y la cobertura dejan de usar la columna estrecha «Estado»; cada competencia muestra evidencia real, lectura inicial y decisión en su propio bloque. El seguimiento por niño también se presenta en bloques. No se deducen niveles finales.
- **Fechas:** la copia de QA tiene período previsto 16/03/2026–27/03/2026 y registros revisados del 28/09/2026. Es una discrepancia de los datos del snapshot. El Word la advierte explícitamente; no se corrigió ninguna fecha sin confirmación docente.

## Comprobación

Se regeneraron desde la base local los cuatro documentos y se abrieron con Microsoft Word para exportarlos a PDF: plan anual 18 páginas, proyecto 10, actividad 5 y diagnóstico 10. Los XML son válidos y no contienen marcadores `{{...}}`. En la revisión visual, la ruta del proyecto y el análisis por competencia ocupan el ancho de página y la actividad muestra los rótulos de acciones, mediación, preguntas y materiales. La extensión del proyecto aumenta respecto a la tabla anterior porque los textos confirmados se muestran con espacio legible.

Pasaron 27 pruebas relacionadas, `npx tsc --noEmit`, `npm run lint` y `npm run build`. La revisión visual cubre los cuatro documentos de la copia; el informe familiar disponible es sintético y conserva la revisión de la etapa anterior.

## Límite

La presentación divide y ordena el texto confirmado, pero no reescribe observaciones ni decisiones docentes. Los párrafos pedagógicos que ya fueron confirmados y siguen siendo densos necesitan una nueva versión revisada por la docente si se desea cambiar su contenido. La discrepancia de fechas debe resolverse en los datos de origen antes de utilizar ese diagnóstico como registro final sin advertencias.
