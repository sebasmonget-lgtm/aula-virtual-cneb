# Recorrido inicial de Ayni · implementación V2

Fecha: 2026-10-03. Base: `055c77e`, último commit de `origin/codex/annual-year-map`, comprobado con fetch al comenzar y antes del cierre. Incluye las correcciones consolidadas de `b94cd6e` y `f8b2653`. Se revisó la auditoría `outputs/ayni-auditoria-y-rediseno-anual-2026-10-02.md` junto con memoria, decisiones, errores e implementación. No hubo despliegue ni cambios de cuentas.

## Antes y después

Antes la profesora pasaba por entrevistas extensas, revisiones de diagnóstico, síntesis/prioridades y un preplan que luego podía recibir nuevas decisiones en su formalización. El calendario anual podía asignar solo 146 de las 172 fechas elegibles del caso auditado.

Ahora puede registrar entrevistas parciales y actuaciones, abrir Mi año, reconocer las fuentes disponibles, aportar una o varias ideas opcionales, preparar doce propuestas, revisar sus detalles, reunir indicaciones, aplicar juntas las modificaciones necesarias y confirmar. El Word renderiza exactamente ese objeto confirmado. Las entrevistas y observaciones siguen disponibles al continuar el año.

## Seis preguntas, todas opcionales

1. Qué disfruta hacer el niño, con ejemplo y posibilidad de expresar lo que no le interesa.
2. Cómo juega, solo o con otras personas.
3. Qué suele contar, preguntar, construir o explorar.
4. Qué lenguas escucha o usa y cómo se comunica.
5. Qué experiencias, actividades o costumbres familiares/comunitarias son significativas.
6. Qué más necesita conocer la profesora para acompañarlo y facilitar su participación.

Estas preguntas aportan intereses, actuaciones reportadas, comunicación, contexto y condiciones útiles para decidir oportunidades. Se quitaron del formulario nuevo los trámites de expectativas, autonomía y datos del hogar; las respuestas históricas siguen guardadas. Los campos «otro», ejemplos libres, negaciones, fecha, sujeto y fuente permanecen en el snapshot privado. No hay inferencia de intereses por palabras clave.

Las seis preguntas son una selección de producto, basada en la necesidad de conocer intereses, necesidades, experiencias y contexto que orientan la planificación; no son una lista obligatoria MINEDU. Referentes: [Programa Curricular de Educación Inicial, apartado III](https://www.minedu.gob.pe/curriculo/pdf/programa-curricular-educacion-inicial.pdf), [guía de planificación](https://repositorio.minedu.gob.pe/handle/20.500.12799/6518) y [cartilla de evaluación diagnóstica](https://repositorio.minedu.gob.pe/handle/20.500.12799/12683?show=full). Los IDs y capacidades consumidos por el planificador proceden de la base curricular versionada existente; no se inventan referencias.

## Observación e interpretación

Observar abre primero la captura espontánea existente: escribir o dictar una actuación durante el juego o la jornada. Se guarda antes de clasificarla. La sugerencia curricular automática mantiene su configuración existente y puede no estar disponible; elegir/confirmar competencias es opcional para avanzar al año. Las experiencias guiadas se ofrecen para conocer mejor aspectos poco registrados, sin convertirse en pruebas ni requisitos.

El snapshot integra observaciones diagnósticas libres/guiadas y registros ordinarios, con correcciones vigentes y exclusión de anulados. Los registros ordinarios sin atribución confirmada permanecen disponibles sin inventar competencias. Se distinguen contexto espontáneo/guiado, actuación registrada y valoración; oportunidad prevista, participación posible, asistencia y valoración confirmada quedan desconocidas cuando la fuente no las demuestra.

Ayni puede proponer avance concreto, necesidad de acompañamiento o información ambigua. Cada interpretación requiere actuaciones existentes y alcance individual/subgrupo; ocho registros del mismo niño siguen siendo individuales. Un reporte familiar o una competencia vacía no permite inferir desempeño. Las interpretaciones solo se solicitan cuando orientan materialmente decisiones del año; se muestran con sus actuaciones y requieren revisión docente explícita al confirmar. Nunca asignan logro/no logro ni niveles finales.

Currículo aplicable, necesidades sustentadas y aspectos poco conocidos se tratan por separado. No se prioriza automáticamente lo menos observado. La cobertura requiere oportunidades completas: acción infantil, condiciones, mediación, observación, apoyos y capacidades oficiales. Puede lograrse en propuestas o momentos recurrentes, sin cuotas iguales por competencia ni exclusión de competencias aplicables.

## Conversación y cambios

Hay un único asistente. Cambiar con Ayni enfoca el texto y vincula automáticamente la propuesta. Agregar indicación guarda un ChangeSet de hasta veinte intenciones, con IDs, fecha y alcance, sin llamar a IA. Se pueden retirar indicaciones. Aplicar cambios reúne todas las pendientes y modifica únicamente filas autorizadas; Mantener, ver detalle, explicar fuentes, retirar, mover, copiar y confirmar son operaciones en código.

Una revisión del año vigente crea otro borrador. Las propuestas cuyo inicio ya pasó, las vinculadas a proyectos y las mantenidas están protegidas; no se regenera todo ese borrador. Considerar nuevos registros actualiza el snapshot, conserva fuentes históricas para trazabilidad y añade una intención revisable. El año vigente sigue igual hasta confirmar la nueva versión. Cambios incompatibles con trabajo protegido o calendario devuelven una incidencia explícita.

## IA y costo

| Operación | Modelo y esfuerzo | Llamadas normales |
|---|---|---:|
| Generación pedagógica completa | GPT-6 Sol high | 1 |
| Revisión semántica global | GPT-6 Sol medium | 1 |
| Interpretar alcance global de cambios | GPT-6 Luna low | 1, solo al aplicar cambios globales |
| Aplicar/reparar filas afectadas | GPT-6 Sol medium | 1 por lote |
| Revisión de cambios | GPT-6 Sol medium | 1 por lote |
| Mensajes, calendario, permisos, confirmación, Word | Código | 0 |

Crear un año normalmente usa dos llamadas. Cambiar una propuesta usa dos; un lote con alcance global usa tres. Una incidencia determinística identificada en una fila admite una reparación localizada antes de revisar; una incidencia semántica localizada admite una reparación y una segunda revisión, como máximo dos llamadas adicionales; una incidencia global/protegida o una reparación fallida conserva el borrador y requiere una acción explícita. No hay reintentos automáticos en bucle. La salida incompleta se rechaza y permite reintentar conservando la preparación.

Se conserva el routing de modelos existente. Se añadieron workflows explícitos para alcance, revisión y reparación. Los prompts separan fuentes de instrucciones y prohíben negaciones invertidas, generalizaciones, intereses/visitas/recursos inventados, niveles, competencias nominales y experiencias realizadas ficticias. Se envía solo una copia anonimizada: sin IDs de fuente ni nombres conocidos, contactos o multimedia. El texto original permanece en el ámbito privado autorizado.

Las métricas incluyen operaciones/modelo/esfuerzo, uso de tokens, costo estimado con versión de tarifa, tiempo, regeneraciones, correcciones e IDs/cantidad de propuestas afectadas. El registro de uso existente conserva llamadas facturables; el contenido confirmado conserva sus métricas y el tiempo hasta confirmación queda junto al contenido formal. Incidencias de calendario/proveedor/validación se emiten como eventos sin texto privado; las revisiones registran cantidad de incidencias.

## Calendario

`annual-journey-calendar.mjs` optimiza globalmente mediante programación dinámica sobre las semanas del calendario efectivo de `loadEffectiveCalendar`. La acogida consume su etapa propia; el resto se distribuye entre exactamente doce ventanas de dos o tres semanas. Los límites deben ser lunes/viernes lectivos y ninguna ventana atraviesa una semana completa de gestión. Los feriados interiores se descuentan sin eliminar toda la semana. El objetivo minimiza cambios de fechas y desequilibrio; no impone tres propuestas por bimestre ni hardcodea el reparto auditado.

Cada fecha lectiva tiene exactamente un propietario: etapa inicial o propuesta. Se comprueban conteos, unicidad, referencias, fechas de filas/slots y asignaciones. La regresión auditada obtiene 172/172, cero huecos y cero solapamientos. No hay garantía de solución para cualquier combinación de restricciones: un calendario imposible se rechaza explícitamente antes de gastar IA.

Se guarda versión y huella del calendario efectivo, incluida la etapa inicial y los overrides. Reordenar recalcula y valida; modificar solo contenido conserva las fechas. Confirmar vuelve a comprobar fuentes y calendario. Los proyectos nuevos derivados de V2 toman sus fechas de esta misma asignación y rechazan divergencias del calendario efectivo. La planificación diaria sigue consumiendo `loadEffectiveCalendar`; el Word imprime las fechas y versión guardadas del año confirmado, como documento histórico estable.

## Arquitectura, permisos y rollback

No fue necesaria una migración: se usan JSONB versionados, `annual_plans`, `project_slots`, `annual_plan_formal_content` y las fuentes existentes. `journey_version: 2` identifica el contrato nuevo. Las rutas `/api/annual-journey` se ejecutan bajo la identidad autenticada y verifican docente, aula y propietario del año. Persistencia/confirmación usan transacciones, locks anuales, CAS de revisión y protección de IDs. Se mantienen las políticas RLS y las rutas autenticadas existentes; no se modificó ni probó una instalación Supabase remota.

Se reemplazaron para V2 la extracción anual por regex, la generación ligera seguida de formalización pedagógica posterior, la distribución greedy por bimestre y la edición nominal de competencias por reajuste bimestral. Los planes históricos conservan sus servicios, exportadores y calendario guardado. El reajuste bimestral antiguo remite las versiones V2 a Cambiar con Ayni, sin agregar IDs nominales.

El workspace anterior permanece para leer/gestionar versiones antiguas. `NEXT_PUBLIC_AYNI_ANNUAL_JOURNEY=0` devuelve su entrada anterior; conserva el lector/exportador V2 para planes ya confirmados. Para rollback completo, revertir los commits de presentación/servicio manteniendo esos lectores y sin borrar filas, IDs, fuentes, adjuntos ni versiones. No hay migraciones aplicadas que revertir.

## Validación y pendiente de piloto

87 pruebas focales, typecheck, lint, build y detector de UI pasaron. Se probó en navegador real con dos niños ficticios y proveedor local simulado: entrevista parcial → observación libre sin clasificación → resumen → ideas → doce tarjetas → dos indicaciones → actualización de fuentes → aplicar sobre una sola propuesta → reordenar → confirmar → descargar Word. Las pruebas PostgreSQL también verifican identidad, CAS, recuperación, protección de pasado, nuevos registros y dos exportaciones con XML pedagógico idéntico sin llamadas adicionales.

No se evaluó la calidad del modelo real en esta ejecución ni se consumió API de pago. Antes del piloto corresponde ejecutar casos reales anonimados con revisión de una especialista/docentes, comprobar latencia/costo y suficiencia de las oportunidades, ampliar el vocabulario seguro de lenguas si fuera necesario, probar dictado con permisos explícitos y validar el smoke en staging y RLS remoto con las cuentas nuevas. Publicar exige solicitud expresa, commit identificable, árbol limpio y las comprobaciones del proyecto. Detalle de pruebas y límites en docs/qa/annual-journey-v2-2026-10-03.md.
