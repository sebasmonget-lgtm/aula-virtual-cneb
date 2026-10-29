# Conversación propia del proyecto y situación del aula

Solicitud del 26 de octubre de 2026: describir directamente a los niños del aula en la situación significativa, planificar con ellos como primera actividad y reunir contexto específico antes de desarrollar cada proyecto. Mi año es una previsión flexible. No modifica el proyecto de alimentación ni otros documentos guardados.

## Decisión pedagógica

La guía MINEDU de proyectos en Inicial (2019), página impresa 21, distingue la planificación con los niños: recoger saberes, preguntas y propuestas; prever las actividades claves e incorporar nuevas inquietudes durante el proceso. No obliga a un único formato ni a generar por anticipado actividades rígidas para todo el año. Fuente consultada: https://repositorio.minedu.gob.pe/bitstream/handle/20.500.12799/6517/Gu%C3%ADa%20de%20orientaci%C3%B3n%20para%20desarrollar%20proyectos%20de%20aprendizaje%20en%20Educaci%C3%B3n%20Inicial.pdf?isAllowed=y&sequence=1

Ayni v18 recoge contexto adulto por proyecto. La primera actividad nueva se llama Planificamos el proyecto con los niños, con registro de sus aportes reales por recoger. Las demás actividades son previsiones ajustables; la aplicación aún no transforma automáticamente el recorrido a partir de ese registro. La conversación no es una observación ni un diagnóstico. El chat anual no desarrolla por sí solo todas las actividades.

La situación identifica institución, aula y edades desde datos existentes, distrito solo si fue registrado, acciones o intereses conocidos, necesidad y oportunidad de aprendizaje. No usa fórmulas La profesora señala o La docente indica. Puede proponer conexiones futuras, nunca episodios o citas infantiles ficticias. Los documentos conservan la presentación práctica y la plantilla aprobada.

## Cambio mínimo y permisos

Antes de preparar un tramo nuevo se reutiliza MultiAgeConversation y la cola existente, con scope propio document-project:plan:slot. Se autoriza servidor por docente, aula V2, modalidad documentos y plan activo. Otro docente o tramo ajeno se rechaza. No hay tablas, migraciones ni credenciales nuevas. El modo diario conserva su recorrido.

Elegir días reemplaza el salto directo al calendario. Preparar captura solo turnos docentes terminados y sus identificadores, con revisión para detectar cambios mientras se eligen días. La copia queda en metadata interna de la preparación y viaja a todos los lotes; las sugerencias del asistente no se aceptan como instrucciones. El payload público no admite documentPreparation. Se canonicaliza la copia antes de su huella para que el orden de claves de JSONB no invalide fuentes al recuperar. Los proyectos existentes abren sus documentos y actividades sin reescritura.

La selección curricular sigue delimitada por la propuesta anual conservada. Esta entrega no permite añadir competencias fuera de ese conjunto desde el chat ni retitula automáticamente el año; modificar el alcance curricular requiere una revisión del plan. No se afirma que la aplicación ya incorpore automáticamente aportes infantiles posteriores.

## Verificación

22 pruebas PASS: preparación y reanudación, contexto por proyecto y por lote, aislamiento de docentes/tramos/chat anual, correcciones y ausencia de nombres de estudiantes, matriz/Word, HTTP multiedad y una edad, compatibilidad con conversación diaria. Typecheck, lint y build PASS; warning previo de dependencia React en diagnostic-generation-control y avisos previos de build. Lint del archivo nuevo se repitió limpio después de retirar un parámetro sin uso.

Primer intento de regresión detectó diferencias de huella por orden de JSONB; se corrigió canonicalizando el contexto. Un test nuevo omitió su request ID y luego consultó position en el objeto incorrecto: se corrigieron ambos fixtures y la batería final pasó. Logs iniciales conservados; no se declaran esas ejecuciones como exitosas.

UI: por clics, Mi año → Bimestre 2 → proyecto pendiente → chat propio y Elegir días deshabilitado hasta una respuesta terminada. Inspección visual del ancho del panel. Recorrido de envío/generación completo probado con API y proveedor simulado, no con un envío real en el aula de la usuaria. Sin llamadas IA adicionales. Se conserva por hash workspace y planning de su prueba: tres proyectos, 32 actividades, cuatro estudiantes. Registros en .local/project-chat-v18-*.

Copia editorial corregida: output/generador-documentos/proyecto-alimentacion-aula-20261026. Mantiene colegio, aula, docente, período y 14 fechas; amplía la situación y cambia la primera propuesta. No actualiza la base. Se renderiza con plantilla original y se verifican estilos y medios idénticos.

## Rollback

Retirar la entrada de chat por tramo y los parámetros opcionales annualPlanId/annualSlotId de la conversación, junto al snapshot interno de las nuevas preparaciones; conservar los registros ya creados como historia. Volver a la política previa solo para futuras generaciones. No borrar datos ni revertir archivos ajenos de este working tree. Sin publicación, commit ni cambios al checkout original.
