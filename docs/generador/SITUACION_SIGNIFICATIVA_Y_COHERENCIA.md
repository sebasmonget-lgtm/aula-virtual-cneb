# Situación significativa y coherencia de documentos — 2026-10-26

## Comportamiento

Política documental v11: la IA responde por qué se eligió el proyecto. Relaciona contexto o escenario cotidiano posible, oportunidad de aprendizaje y sentido de la experiencia. Puede inferir situaciones aunque la profesora aporte poco; se redactan como posibilidades y no como observaciones, déficits, intereses confirmados o recursos existentes. Se respetan restricciones y negaciones. El chat sigue reuniendo contexto sin pedir diagnóstico; sus resúmenes no convierten las hipótesis en datos docentes.

El anual dispone de hasta 1000 caracteres para rationale. La primera preparación de un proyecto V2 recibe projectPlanning: situación significativa y recorrido general. En esa misma llamada se prepara la primera actividad con su propia secuencia. No hay una llamada adicional por proyecto. Si un anual anterior no tiene rationale, la IA puede desarrollar el origen del nuevo proyecto desde su tema, competencias e indicaciones vigentes.

El servidor valida y guarda projectPlanning desde el resultado privado del trabajo autorizado, nunca desde un campo enviado por la interfaz. Se conserva en learning_experiences.details con document_planning_version=1; no hay migración. El lector inmutable y el Word usan ese maestro. Las siguientes actividades reciben su situación y recorrido; los documentos antiguos conservan su mecanismo de lectura y no se regeneran. Los parámetros de render originales mantienen sus defaults diarios.

También se retiraron repeticiones de presentación: invitación una vez por proyecto anual, apoyos una vez en el proyecto y etiquetas vacías en las tablas anuales adaptadas. No se borran campos pedagógicos guardados. Las plantillas originales se conservan.

## Pruebas realizadas

Dos llamadas reales, con datos ficticios y sin tocar el almacén de la profesora:

1. Tres propuestas anuales con contexto escaso: integración, agua y relatos. Las tres situaciones explican una elección desde posibilidades; dos competencias por edad, campos distintos, apoyos específicos, referentes oficiales válidos y restricciones respetadas. 120.5 s.
2. Proyecto y primera actividad del primer caso: justificación propia, recorrido de varias actividades distinto del primer día, identidad y convivencia para 3/4/5 años, criterios/evidencias diferentes y cierre voluntario. 88.5 s. El plazo de la primera preparación documental se amplió a 180 s para no quedar pegado a 90 s; reserva existente 360 s suficiente, sin reintentos automáticos. El resto de actividades y el modo diario conservan su plazo. Nuevo plazo validado por contrato, sin tercera llamada real.

Recibos: output/generador-documentos/coherencia-20261026/round-01 y round-02. Modelo y uso registrados sin claves. La prueba anual real es una muestra de tres posiciones, no un nuevo año completo validado con IA.

Reproducción sin red de esas respuestas a través de los escritores reales: scripts/audit-generator-content-chain.mjs. Año de estructura con las tres filas reales y doce fixtures explícitamente ficticios, proyecto y actividad guardados/recuperados/exportados. Comprobaciones: texto completo, dos competencias y tres edades, secuencias independientes, invitación/apoyos sin duplicar y cero evaluaciones/observaciones inventadas.

Render final de esos tres Word: 48 + 9 + 8 = 65 páginas; cero palabras fuera de página. Inspección visual del proyecto completo, actividad completa y primeras 14 páginas del anual, que contienen las tres propuestas reales. Los doce fixtures restantes sirven a la comprobación estructural; no se presentan como proyectos producidos por IA. La revisión previa de los demás formatos y biblioteca consta en PLANTILLAS_ORIGINALES_RESTAURADAS.md; las siete clases de instrumentos vuelven a pasar pruebas de contenido vacío y selección de alumnos.

29 pruebas del generador PASS. Otras baterías de generación, lotes, versiones, lectura privada, preservación, persistencia y Word PASS; 36 y 11 en sus ejecuciones respectivas, con solapamientos. Regresiones nuevas rechazan un maestro incompleto y comprueban que el Word conserva el maestro general en vez del primer día. Typecheck, lint, build y git diff --check correctos; avisos anteriores de hooks/PGlite/chunks permanecen.

Hash de año, proyecto, ocho actividades y cuatro estudiantes de la profesora idéntico antes/después y tras reiniciar la variante con su almacén habitual. Navegador muestra el mismo año y proyecto preparado. No cambios al checkout original, cloud, migraciones ni despliegue.

## Rollback

Restaurar política/esquema anteriores solo para próximas generaciones y mantener el lector opcional de document_planning_version=1 para los nuevos maestros que se hayan guardado. Conservar todos los resultados y documentos existentes. No usar la base de la profesora como fixture ni regenerar su contenido al descargar.
