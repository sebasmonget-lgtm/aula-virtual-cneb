# Referencias docentes y foco diario — 2026-10-26

## Qué aportan los ejemplos

La usuaria compartió un proyecto de octubre y dos actividades para ilustrar una estructura más familiar y simple, expresamente sin considerarlos modelos pedagógicos perfectos. Se leyeron los tres DOCX y se renderizaron copias locales. Los originales en Descargas no se modificaron.

El proyecto tiene unas 2509 palabras y las actividades unas 1224 y 1362. Las tres copias renderizadas ocuparon seis páginas cada una; las actividades incluyen instrumento y fichas anexas. Su sencillez es principalmente organizativa: identificación concentrada, matriz de aprendizajes, ruta con actividad/estrategia/materiales y tabla de momentos. No se toma su tamaño de letra o cantidad de páginas como objetivo.

El proyecto articula comunicación oral, lectura, escritura y arte; los días focalizan diferentes competencias. Esa separación es pertinente para Ayni: varias competencias en el recorrido no implican exigirlas todas en cada actividad.

No se copiaron datos, experiencias o diálogos infantiles de los archivos. La lectura detecta inconsistencias de fechas entre nombres de archivo, proyecto y actividades; encabezado de cuatro años con contenidos de tres y cinco; valores/enfoques que necesitan revisión; y un desempeño de trazos en espuma repetido en una actividad de letras móviles. Hay respuestas atribuidas anticipadamente a niños. No se presentan como evidencia de aprendizajes ni como ejemplos de registro para generar.

## Ajuste general

Prompt final `ayni-documents-v17`. Conserva la elección de situaciones abiertas y recorrido de varios días, prioridades concretas, rutinas continuas y selección curricular pertinente. Añade una distinción explícita entre todas las competencias del maestro y las focalizadas cada día.

El servidor activa `activity_competency_policy=relevant_subset` solo en el generador documental V2 con contexto de proyecto. Una actividad puede usar un subconjunto no vacío de las competencias autorizadas; conserva todas las edades y sus referentes. El mismo criterio se aplica por actividad de un lote. Se siguen rechazando competencias ajenas, edades cruzadas, referencias incorrectas, fechas o ediciones distintas. El modo diario mantiene su exigencia anterior. No se cambian esquemas DB ni autorización.

El escritor ya conservaba todas las competencias anuales en el maestro aunque el primer día focalizara menos; ahora el generador y el validador de lotes permiten aprovechar ese contrato. Una regresión completa prepara ocho días de una competencia cada uno, alterna entre las dos del proyecto y comprueba el maestro completo y las exportaciones. La política no declara aprendizajes logrados ni certifica cobertura real por generar una propuesta.

En Word se conserva la estética de Ayni y la portada aprobada. El desarrollo de cada actividad usa una tabla Momento/Qué haremos. La ruta del proyecto incorpora fecha/actividad, propuesta breve y materiales del día, con «por verificar» cuando corresponde. Si ya hay días preparados, esa tabla evita repetir otra tabla de fases generales; el recorrido general completo sigue guardado. Los IDs y páginas curriculares se mantienen en una referencia compacta al final. Criterios y evidencias por edad, apoyos y campos de registro permanecen; las fuentes no se reescriben.

La ruta obtiene materiales únicamente de las actividades autorizadas de la misma edición. No inventa recursos ni genera nada al descargar. Los lectores por defecto y los binarios de plantilla permanecen; el cambio práctico se elige solo en las descargas del generador y su ZIP.

## Evidencias y límites

Evidencia en `output/generador-documentos/ejemplos-docentes-20261026/`: textos de referencia para el análisis, renders, dos exportaciones de lectura de los datos guardados y logs. Las referencias son materiales proporcionados por la usuaria, no fuentes oficiales. El sustento curricular sigue siendo el Programa Curricular y las guías MINEDU citados en `PROYECTOS_ABIERTOS_Y_GUIA_PRACTICA.md`.

No se hizo otra llamada real de IA después de los dos ensayos anteriores; el último había agotado el tiempo de respuesta. El cambio de foco diario se valida con simulación y persistencia/lectura reales del flujo local. No se da por validada su calidad semántica en IA real para cualquier tema. Las fuentes del año y los tres proyectos existentes permanecen iguales; el nuevo reparto de competencias afecta solo a próximas generaciones, mientras las descargas cambian de presentación.

Rollback: retirar la política y restaurar la validación de igualdad del conjunto por día; conservar las fuentes ya guardadas. Retirar los cambios opcionales del cuerpo práctico vuelve al render anterior; no borrar ni reconstruir documentos históricos. Sin commit, push, migraciones ni despliegue.

Validación de cierre: 23 pruebas de generación/lotes/preparación PASS, incluidas ocho actividades de foco variable y maestro completo. La primera ejecución conjunta de las suites de 34 y 42 produjo una espera running/ready en el ensayo HTTP y aserciones anteriores sobre el nombre de una columna y las claves de la ruta. Se conservaron los logs: se actualizó la lista explícita de campos permitidos con materiales (vacíos en fuentes antiguas) y los encabezados del nuevo formato, manteniendo igualdad de ZIP/XML y controles de privacidad. Los tres archivos afectados se repitieron de forma aislada: 15 pruebas PASS. No se aumentó el límite de espera para ocultar el fallo. Tipos, lint y build finales PASS con avisos previos. Los restantes casos de las suites iniciales habían pasado; no se presenta una ejecución conjunta fallida como PASS.

Las dos exportaciones finales de lectura se renderizaron y revisaron en sus 14 páginas: actividad de cinco y proyecto de nueve (catorce días ya guardados). Sin palabras fuera de página. Las listas largas de recursos idénticas se referencian al primer día que las enumera, conservando sus textos originales. La descarga HTTP final funciona; el snapshot completo sigue idéntico: tres proyectos, 32 actividades y cuatro alumnos. El servidor local quedó reiniciado con v17.
## 2026-10-27 — Referencia adicional sobre los grillos

Archivo aportado: `(U) 01-10-26 INICIAL ¿De qué se alimentan los grillos cantarines de maxi (2).docx`. Revisado por extracción completa y render de sus tres páginas, sin modificar el original. Corresponde a una actividad diaria para 4 años, no a la planificación completa de varios días. Se usa como referencia de trabajo docente, no como modelo normativo ni texto para copiar.

Aprovechar: pregunta específica que orienta la jornada; experiencia concreta y fácil de imaginar; organización en equipos, preparación de materiales, acciones sucesivas, formas de recoger información y cierre conectado con la pregunta. En Ayni la sencillez debe conservar esta concreción: no basta escribir explorar, conversar y compartir sin precisar qué se hará.

Revisar antes de trasladar: respuestas infantiles y conclusiones ya redactadas de antemano; ficha y comunicación oral planteadas como evidencia única para todos; lista inicial de recursos que omite materiales usados después; competencia TIC cuya actuación infantil no queda desarrollada; tiempos y datos que requieren ajuste al aula. No trasladar nombres ni citas infantiles a proyectos nuevos, ni dar por confirmados recursos de este ejemplo. No repetir rutinas completas dentro de todos los documentos cuando su consulta separada baste. Las afirmaciones sobre alimentación o manejo de animales requieren verificación específica antes de proponerlas; no se validaron como contenido científico en esta revisión.

El objetivo de referencia es una guía docente ejecutable —qué preparar, qué proponer, qué pueden decidir los niños, cómo acompañar y qué registrar— manteniendo la identidad visual de Ayni y sus fuentes curriculares oficiales. Sin cambios de prompts, aplicación, datos guardados ni llamadas a IA en esta revisión.
## 2026-10-27 — Proyecto completo Pequeños exploradores de insectos

Referencia adicional recibida como texto: proyecto 11, Pequeños exploradores de insectos. Se leyó su situación, reto, propósito, actuación de cierre, diez actividades, matrices y calendario. Su tabla qué haré / cómo lo haré / qué necesitaré precisa el objetivo de uso: que otra profesora pueda imaginar y preparar una experiencia, con acciones, materiales, organización y acompañamiento concretos.

No se copian identificación, escenas, nombres infantiles ni recursos al contexto de otras aulas. La referencia contiene errores de copia, como evidencias de moscas bajo la actividad de abejas, fechas mezcladas y diferencias entre edades informadas y matrices. Sus competencias, desempeños y afirmaciones científicas no reemplazan el catálogo oficial ni se adoptan como validados.

Aplicación mínima v21: reglas compartidas de generación de proyecto y actividades exigen acciones visibles con objeto/lugar y materiales coherentes; los verbos explorar, registrar o socializar solos no bastan. Se describe una intervención docente aplicable y una decisión infantil, con palabras comunes. Cada día aporta algo al reto común; evitar tanto catálogo de temas sin vínculo como repetición diaria de observar/dibujar/contar. El propósito breve anticipa una experiencia concreta para que también sea útil en la ruta. La conversación propone escenas realizables con los recursos recibidos. No obliga a fichas, exposiciones, diálogos ni resultados predeterminados.

La ruta Word práctica cambia únicamente dos rótulos a Qué haremos y Qué necesitamos; los textos y datos guardados siguen intactos. Revisión de presentación con la muestra existente de plantas y la plantilla Ayni, sin regenerar contenido. Diez regresiones editoriales, preparación y fidelidad PASS; typecheck/lint/build ejecutados. No se hicieron llamadas de IA adicionales en esta ampliación; las rondas v18–v20 son evidencia anterior, no una validación real del nuevo prompt v21. Rollback: retirar las reglas nuevas y devolver los rótulos, conservando los registros y sus fuentes. Los tres proyectos, 32 actividades y cuatro alumnos se conservan por hash.
