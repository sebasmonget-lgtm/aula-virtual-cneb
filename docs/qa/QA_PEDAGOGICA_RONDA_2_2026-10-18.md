# Reauditoría pedagógica de generaciones y generalización — 18/10/2026

## Alcance y criterio de aprobación

Solicitud: guardar las correcciones anteriores, generar de nuevo Mi año, proyectos y actividades con IA real, revisar su sentido pedagógico y medir tiempos/costos. Durante la ejecución, la usuaria pidió distinguir corrección de causas compartidas de ajustes que solo favorecen los ejemplos del QA.

Base de esta ronda: `c552629`, rama `codex/planning-recovery-20261018`. Ese commit guarda las correcciones previas; el informe anterior es [QA_PEDAGOGICA_PROYECTOS_ACTIVIDADES_2026-10-18.md](QA_PEDAGOGICA_PROYECTOS_ACTIVIDADES_2026-10-18.md). La base remota comprobada al inicio del trabajo fue `85bb7c2`. Esta ronda no se publicó ni escribió en Vercel/Supabase. Datos ficticios, llamadas de texto mediante servicios reales del repositorio y presupuesto acotado. No son pruebas de una profesora real ni un nuevo E2E por interfaz.

Una respuesta JSON válida no demuestra calidad pedagógica. Se separan: contratos verificables, lectura semántica de las salidas, presentación Word y recorrido operativo. La revisión semántica la realizó este agente, contrastando referentes oficiales; no es revisión ciega de un especialista externo ni validación de eficacia en aula.

## Diseño de la muestra

- Aula ficticia de cuatro años y veinte niños; ocho observaciones individuales de seis niños y dos entrevistas familiares, conservando su origen y alcance. Las entrevistas no acreditan logros.
- Mi año nuevo: quince propuestas, calendario completo de 172 fechas lectivas asignadas sin huecos ni solapamientos; todas con dos o más competencias principales y sin TIC al no contar con dispositivo.
- Tres proyectos derivados de ese anual: cantidad/convivencia, lectura/comunicación oral y motricidad/aprendizaje autónomo. Cada muestra usa cinco fechas confirmadas de su tramo. Se generaron sus quince actividades diarias completas.
- Lectura tuvo comparación A/B: mismo contexto, decisiones, modelo, esquema y fechas; solo cambia una instrucción pedagógica de la skill. Se conservan ambas versiones del proyecto. Las cinco actividades se generaron de B, sin mezclar secuencias.
- Tras la observación de la usuaria, se fijaron dos casos adicionales de tres y cinco años antes de generarlos. No se ajustó el prompt después de leer sus resultados. Inputs y rúbrica están en [heldout-pedagogy-20261018.json](../../evals/project-master/heldout-pedagogy-20261018.json); la rúbrica no se envió al proveedor.

Las cinco fechas son muestras completas del recorrido solicitado, no todas las fechas de cada tramo anual de dos o tres semanas. Tampoco se generaron las quince secuencias del año.

Referentes: [Programa curricular de Educación Inicial de MINEDU](https://www.minedu.gob.pe/curriculo/pdf/programa-curricular-educacion-inicial.pdf), copia oficial local consultada, páginas impresas 105, 125, 175 y 180. Se contrastaron autonomía corporal, lectura de ilustraciones/inferencias, cantidad en situaciones concretas y relaciones espaciales por edad. No se atribuye a MINEDU una prohibición general de leer por entregas: esa decisión depende del texto y de la intención docente.

## Qué se corrigió en mecanismos compartidos

| Problema | Causa y corrección | Alcance y límite |
|---|---|---|
| Texto legítimo mutilado y contexto perdido | El commit previo elimina filtros de palabras/nombres sobre prosa pedagógica y mantiene exclusión de medios/rutas privadas y autorización. | Corrige una transformación compartida de entradas. No garantiza que la IA interprete cualquier texto correctamente; no elimina Auth/RLS. |
| Competencia seleccionada sin oportunidad en el recorrido | El contrato comprueba la unión de competencias de todas las actividades y conserva decisiones/fuentes. | Evita omisión estructural; una etiqueta no acredita desarrollo real. La pertinencia se revisa semánticamente. No exige dos competencias en cada día. |
| Timeout al preparar el proyecto | Una espera síncrona perdió el resultado sin ID recuperable. El flujo moderno de preparación ahora usa la respuesta identificada en segundo plano y persiste el checkpoint dentro del trabajo existente. | Recupera la misma respuesta, conserva etapa y huella de contexto, almacena resultados completos antes de una reparación y evita repetir la creación/contabilización. No reduce por sí solo la latencia del modelo. Una creación sin ID sigue incierta y no se reintenta silenciosamente. |
| Cuento breve estirado para llenar días | La instrucción no distinguía primer encuentro completo, entregas justificadas y relecturas con otros propósitos. Se incorpora ese criterio general a la skill del proyecto. | La comparación A/B mejora esta muestra. El caso adicional por entregas prueba la excepción; dos casos no demuestran generalización universal. |

La recuperación reutiliza el proveedor, cola, JSON del trabajo, control de versión y autorización existentes. No añade una cola, tabla ni migración. La capacidad de recuperación se pasa internamente por el ejecutor; un cuerpo HTTP externo no puede suministrar un ID arbitrario del proveedor. El cambio se limita al Master del proyecto preparado mediante el trabajo moderno. El endpoint directo/legacy conserva su ejecución síncrona y no se certifica aquí para generaciones largas.

Cuando una reparación queda pendiente, se conserva también la respuesta principal completada, evitando volver a leerla y sumar nuevamente su uso. Cambiar decisiones/contexto rechaza la reutilización por huella antes de llamar al proveedor. Un reintento con posible repetición exige el reconocimiento explícito ya existente; solo entonces se limpia el checkpoint.

## Resultados pedagógicos de la muestra principal

### Mi año — PASS estructural / revisión semántica favorable con reservas

Quince propuestas variadas, con retos de juego, comunicación, cantidad, espacio, exploración y arte. La situación de partida utiliza los registros como ejemplos individuales y ofrece invitaciones al aula sin inventar una necesidad de todo el grupo. Los proyectos no dependen de visitas, animales o un huerto inexistentes.

Reserva: algunas formulaciones hablan de «indicios de avance» a partir de una actuación aislada. Es preferible describir lo observado y reservar la afirmación de progreso temporal para registros comparables. No se introduce una cuota de observaciones: cantidad y suficiencia son conceptos diferentes. El sello automático `deterministic-v3/passed` comprueba reglas estructurales; no es aprobación curricular independiente.

El mismo cuento aparece en tres propuestas del año con preguntas distintas. Puede sostener relecturas, pero esa reiteración depende del repertorio confirmado del fixture y no demuestra variedad suficiente de textos para un aula real.

### Cantidad / convivencia — PASS en esta muestra

«Un vaso para cada muñeco»: reparto inicial, coordinación de tareas, faltantes/sobrantes, revisión después de mover objetos y reunión final. Los criterios de cantidad aparecen como foco guiado en tres días; convivencia en dos. Se proponen relaciones uno a uno y revisiones concretas, sin exigir escritura de números ni explicaciones formales de conservación de cantidad.

Las actuaciones esperadas no se convierten en observaciones realizadas. Los niños pueden pedir materiales, revisar y colaborar; el cierre vuelve al reto de distribuir vasos. Una futura mejora editorial sería dar un ejemplo inicial de colección pequeña, sin confundir el conteo esperado para la edad con un límite universal de objetos para toda exploración.

### Lectura / comunicación — mejora A/B observada

A distribuía un cuento confirmado de seis páginas entre tres días de primera lectura. No se había dado una razón de extensión o decisión docente para fragmentarlo. B ofrece el relato completo en el primer encuentro y luego cambia el propósito: comparar primeras imágenes, explorar alternativas, relacionar pistas y compartir una interpretación. Reconoce que el desenlace ya se conoce.

La primera actividad de B indica leer las seis páginas sin interrumpir constantemente; acepta gestos y señalamientos y no convierte las anticipaciones en una prueba de aciertos. Los criterios guiados de lectura se distribuyen en tres días y los de oralidad en dos. El argumento ficticio de seis páginas fue proporcionado íntegro; no es prueba de fidelidad a cualquier libro externo.

### Motricidad / autonomía — PASS con reserva de pertinencia de recursos

«Pasos que podemos cambiar»: trayecto amplio, curva, transporte opcional de caja, cambio de referencia y elección/revisión del recorrido. Motricidad es foco guiado en tres días y autonomía en dos. No se fabrica un desempeño oficial específico de cuatro años para autonomía: se usa la orientación del ciclo. Se observa la elección y revisión en la acción, sin exigir una explicación extensa.

Seguridad: piso revisado, cuerdas planas supervisadas, recorridos despejados, caja que no tape la vista, cambio de objetos estando detenidos y ausencia de competencia por rapidez. La actividad con dibujo no considera que dibujar sustituya una prueba corporal.

Reserva compartida con matemática: el cuento aparece como apoyo sin ser necesario para esos retos. El runner incluyó su argumento en el contexto adicional de los tres proyectos. Eso sesga la muestra; no se atribuye exclusivamente al modelo. Recurso disponible no significa recurso obligatorio. El caso adicional corporal excluye cuentos y ayuda a distinguir esa dependencia del fixture.

## Casos reservados y resultados

Congelación: `2026-10-18T14:00:49.629Z`, antes de la solicitud 22. Se guardaron SHA-256 de casos/rúbrica, ambas skills y los dos servicios de generación. Al finalizar (`14:05:46.515Z`) las huellas eran idénticas. No se corrigió el prompt usando estas salidas. Las huellas y métricas se publican en [METRICAS.json](QA_PEDAGOGICA_RONDA_2_2026-10-18_METRICAS.json).

| Caso no usado para ajustar | Resultado observado | Evaluación limitada |
|---|---|---|
| Tres años, espacio/movimiento, tres fechas, sin diagnóstico ni cuento | Invitación docente honesta; explorar movimiento, abrir paso a la pelota y probar nueva disposición. Motricidad tiene un foco guiado y espacio dos. Solo pelotas, cajas y patio; seguridad y participación sentada/en movimiento. | PASS del mapa y primera diaria. No inventó intereses ni exigió explicación abstracta. No se desarrollaron las otras dos diarias. |
| Cinco años, cuento físico de 24 páginas sin argumento recibido, decisión explícita de dos entregas, cinco fechas | Conserva las dos primeras lecturas consecutivas y el corte elegido por la docente. No inventa personajes, frases ni sucesos. Después busca relaciones y organiza conversación/recomendación. Lectura tiene tres focos guiados y oralidad dos. | PASS del mapa y primera diaria. La excepción legítima sigue funcionando; no se generaron las otras cuatro diarias ni se comprobó un ejemplar físico real. |

Se leyeron ambos mapas completos, criterios, mediación, continuidad y las dos diarias. Las competencias se desarrollan en acciones pertinentes, no solo en etiquetas. En el caso de tres años se acepta mover, señalar y pedir ayuda; no se exigen nombres geométricos. En lectura se permite escuchar sin intervenir, no se califica una anticipación por acertar y el relato conocido deja de tratarse como sorpresa.

Esto prueba dos transferencias concretas, no una tasa de éxito general. El contexto principal tenía bastante orientación docente y un cuento confirmado incluido en tres proyectos; los casos nuevos usan decisiones más breves. Sigue faltando una revisión independiente y mayor diversidad lingüística/cultural, de apoyos y de recursos. Estos casos pasan a regresión desde ahora; no deben seguir llamándose reservados en futuras iteraciones.

## Tiempos y costos reconciliados

Tiempos completos según inicio/fin del ledger, incluyendo consultas de respuestas en segundo plano; no se usa el tiempo de la última consulta como si fuese toda la generación.

| Generación | Tiempo completo | Estimación estándar de uso conocido (USD) |
|---|---:|---:|
| Mi año, 15 propuestas | 392,191 s (6 min 32 s) | 0,173126 |
| Proyecto cantidad, cinco fechas | 293,332 s (4 min 53 s) | 0,063274 |
| Proyecto lectura A | 137,812 s (2 min 18 s) | 0,070306 |
| Proyecto movimiento | 148,581 s (2 min 29 s) | 0,064272 |
| Proyecto lectura B | 107,580 s (1 min 48 s) | 0,060616 |
| Proyecto espacio/movimiento, tres años | 117,581 s (1 min 58 s) | 0,054860 |
| Proyecto lectura por entregas, cinco años | 160,299 s (2 min 40 s) | 0,076878 |
| 17 diarias (15 principales y dos adicionales) | 6,311–11,644 s; media 8,718 s | detalle en JSON/CSV |

Además hubo un intento síncrono de lectura con timeout aproximadamente a los 180 s, sin ID ni uso devuelto. No se incluye como generación exitosa ni se le asigna costo cero. Se conserva reserva de **USD 0,7896**. Las recuperaciones conocidas posteriores consultaron el mismo ID; los proyectos A/B son dos generaciones deliberadas distintas, no reintentos ocultos.

25 creaciones en esta ronda: 24 completadas y una incierta. Subtotal estándar de las llamadas con uso conocido: **USD 0,59003611**. No representa la factura total porque falta el consumo del intento incierto. Control conservador de la ronda, incluyendo toda su reserva: **USD 1,76104225**. QA previo reconciliado: **USD 1,424285332**. Acumulado conservador: **USD 3,185327582**, dentro del máximo autorizado de USD 5. Techo asignado conjunto antes de ampliar la muestra: USD 4,924285332. Se cerró el transporte pagado al terminar.

Se usa el tarifario versionado del servicio y reservas conservadoras existentes; no se cambian modelos ni esfuerzo. No hay comprobante de facturación de la cuenta ni se atribuyen al QA consumos de otros usuarios. La menor duración de lectura B no demuestra una optimización de rendimiento: solo hay una muestra por variante. La latencia de Mi año y proyectos sigue siendo una fricción real. La recuperación corrige continuidad, no velocidad.

## Documentos y presentación

Se exportaron mediante los generadores Word reales del repositorio veinte documentos iniciales: anual, tres proyectos vigentes, proyecto de lectura A conservado y quince actividades. También se exportaron los dos proyectos adicionales y sus primeras diarias. Se convirtieron copias ficticias de solo lectura a PDF mediante Microsoft Word local, según autorización explícita previa; se extrajo el contenido y se renderizaron sus páginas.

Inspección visual de muestra: contactos del anual, proyecto de cantidad y proyecto de movimiento, además de las cuatro páginas y detalle de la secuencia de la primera actividad de lectura. También se inspeccionaron los contactos del proyecto adicional de tres años y de la primera diaria por entregas. El contenido de las diecisiete actividades se leyó en JSON. Renderizar todos los documentos no equivale a revisar visualmente cada página a resolución completa.

Pendientes de presentación reproducidos, P2: última página casi vacía en el proyecto de movimiento y algunas actividades; anual de 21 páginas con fuentes y etiquetas técnicas extensas. Se conservan los artefactos y se documentan; no se amplía esta corrección a un rediseño de plantillas ni se sobrescriben documentos históricos. La muestra diaria inspeccionada conserva texto legible y roles/fases separados.

## Pruebas, integridad y límites

- Suite amplia de regresión: **937/937 PASS**, cero fallidas/omitidas. Incluye planificación, actividades, evaluación, documentos y recuperación. Se ejecutó antes del último ajuste de caché de resultados completos del Master.
- Suite focal posterior a ese ajuste: **37/37 PASS**. Recuperación identificada, reparación acotada, contexto distinto, trabajo y ejecutor. Tras precisar el nombre de un test, nueva ejecución del subconjunto de cuatro archivos: **21/21 PASS**. Estos números se solapan: no se suman como pruebas únicas.
- Typecheck, ESLint (fuentes, excluyendo `.local`, `outputs`, `dist` y `.next`), build Next y build Vinext: **PASS**. Vinext mantiene su advertencia de clasificación estática de algunas rutas; no se presenta como fallo de ejecución.
- Contratos reales: anual completo, tres mapas principales y quince diarias PASS; herencia exacta de propósito, criterio, evidencia, ID de ruta/competencia y separación de tres fases. Dos mapas adicionales y sus primeras diarias pasan los mismos validadores de los servicios y la comprobación de herencia.
- Control de gasto, 25 creaciones/24 resultados/una incertidumbre, conservación de la reserva y congelación de fuentes: PASS. Ninguna segunda creación usada para recuperar una respuesta ya identificada.
- A/B: igualdad de todos los campos de la petición salvo `instructions`; no se cambiaron modelos, esquema ni contexto durante la comparación.

No se cambian modelos, niveles docentes, observaciones, fechas históricas, número de tramos ni edición de actividades confirmadas. La generación usa los mismos servicios y contratos de la aplicación, pero el contexto confirmado y la persistencia de checkpoints de esta auditoría son fixtures locales: no sustituyen una confirmación UI. No se ejecutó un nuevo recorrido anual completo por interfaz, ni Auth/RLS/Storage cloud. No se afirma que la aplicación esté lista para Producción por estas generaciones.

Rollback: revertir el commit de esta ronda y reiniciar la versión anterior del servicio; no hay migraciones ni escrituras cloud que deshacer. No reutilizar a ciegas un trabajo en curso con otra versión/contexto: la huella protege su recuperación. Mantener los resultados previos y la incertidumbre de la llamada sin ID; no borrar su reserva para aparentar menor costo.

## Respuesta a la preocupación por «estudiar para el examen»

Las regresiones de código prueban invariantes compartidos: preservar texto, cubrir competencias, heredar decisiones, recuperar la misma respuesta y rechazar contexto diferente. Eso corrige mecanismos, aunque no demuestra comprensión pedagógica universal. La calidad semántica requiere variedad de contextos, revisar resultados reales y mantener casos que no se usaron para ajustar el prompt.

Esta ronda registra el antes y el después, congela el código antes de los casos adicionales y conserva hallazgos desfavorables. Tras usar estos casos, dejan de ser reservados: sirven para regresión; futuras comparaciones necesitan otros. Las próximas muestras deberían incluir otra lengua/contexto cultural, proyectos de ciencias con recursos limitados y evidencia ambigua sin convertir poca información en dificultad. No se añaden filtros de palabras ni excepciones por título para hacer pasar ejemplos.

Conclusión limitada: hay mejoras de causas compartidas demostradas y mejora editorial observada en lectura; siguen pendientes la latencia, presentación Word y mayor cobertura semántica independiente. No existe garantía de que otras situaciones no produzcan errores nuevos.

## Evidencia local privada

`.local/pedagogical-round2-20261018/`: requests/responses ficticios, fixtures, ledger, snapshots, checkpoints, hashes, salidas A/B, JSON diarios, logs, validaciones y render Word. `outputs/pedagogical-round2-20261018/`: documentos exportados. No se incorporan credenciales, cabeceras de autorización ni datos reales al repositorio. Los informes públicos incluyen métricas y conclusiones; las respuestas completas permanecen como evidencia local.
