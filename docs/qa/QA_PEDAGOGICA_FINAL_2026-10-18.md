# Última ronda de generaciones y documentos pedagógicos

Fecha: 18 de octubre de 2026. Base: `6c2e285`, rama `codex/planning-recovery-20261018`. Se comprobó el remoto mediante fetch: el último commit remoto seguía siendo `85bb7c2`; esta rama conserva encima las correcciones `c552629` y `6c2e285`. Solicitud vigente: generar nuevas muestras, revisar utilidad docente y coherencia pedagógica, corregir fallos focales, hacer commit y publicar únicamente en Preview.

## Resultado y límites

**Muestra favorable para continuar el QA en Preview. No es certificación para Producción.** Se generaron con IA real un anual de quince propuestas para cinco años, un proyecto de ciencias de cuatro fechas y otro de arte/comunicación para tres años de tres fechas, más sus siete actividades diarias. Se leyeron ambos proyectos completos, sus criterios, mediación, continuidad y todas las diarias; se revisaron propósitos, acciones y distribución del anual. Los contratos estructurales y la revisión semántica se evaluaron por separado.

Los materiales son viables, los retos tienen continuidad y los criterios describen actuaciones observables. Las actividades distinguen qué prepara/hace la docente, qué pueden hacer los niños y qué registrar. Las salidas no inventan observaciones, valoraciones ni ejecución. Los dos proyectos ofrecen oportunidades reales para ambas competencias; no se exige poner dos etiquetas en cada día.

Datos exclusivamente ficticios y ejecución local de los servicios reales del repositorio. Ninguna escritura pedagógica cloud. La confirmación del contexto y las fechas son fixtures de auditoría, no una acción docente demostrada por interfaz. No se repitió el E2E anual completo ni se validaron Auth/RLS/Storage cloud. La revisión la realizó este agente con referentes oficiales; falta una revisión independiente por docentes y prueba de uso en aula.

## Muestra y revisión pedagógica

La [rúbrica](../../evals/project-master/final-pedagogy-20261018.json) se escribió antes de las generaciones. No se envió al proveedor. Las huellas de las skills/servicios se fijaron antes de los proyectos y diarias —el anual ya había terminado— y se comprobaron al cerrar. No se cambiaron prompts, modelos, esfuerzo ni payloads de generación para favorecer los resultados de esta ronda. Los cambios principales fueron documentales y no reescriben las salidas guardadas. Una comprobación adicional del contrato familiar vigente detectó después una omisión de contexto y motivó una corrección de proyección, descrita a continuación.

Se contrastó el [Programa curricular de Educación Inicial de MINEDU](https://www.minedu.gob.pe/curriculo/pdf/programa-curricular-educacion-inicial.pdf), especialmente arte de tres años, indagación de cinco años y relaciones espaciales. La referencia orienta exploración, decisiones propias, comparación y comunicación; no obliga a productos idénticos ni a una respuesta científica recitada. Las pautas operativas de la rúbrica son una interpretación de aplicación, no citas ni una nueva norma curricular.

| Componente | Resultado observado | Estado |
|---|---|---|
| Anual de cinco años | Quince tramos, 172 fechas asignadas sin huecos ni solapamientos. Variedad de ciencias, arte, comunicación, cantidad, espacio, convivencia y motricidad. Dos o más competencias por propuesta; sin TIC al no haber dispositivo. | PASS en esta muestra |
| Contexto y situación significativa | El puente parte de una actuación individual de Fabio y de la intención docente; no afirma que todo el grupo tenga ese interés. El arte de tres años es una invitación docente sin diagnóstico inventado. | PASS |
| Ciencias: «Puentes de papel en prueba» | Primera prueba, cambio en forma, cambio en separación de apoyos y comprobación con registros. Conserva carrito/condiciones al comparar; no exige que el puente sostenga el peso para acreditar participación. | PASS |
| Competencias de ciencias | Indagación tiene tres criterios guiados; forma/movimiento/localización uno, mediante transformación del papel y disposición de apoyos. No es una competencia añadida solo al título. | PASS |
| Arte: «Manchas y trazos que queremos compartir» | Explorar, volver a las creaciones y compartir una elección. Sin plantilla para copiar, obligación de llenar papel o corregir el trabajo anterior. Puede conservarlo y explorar otra posibilidad. | PASS |
| Competencias de arte | Arte tiene dos criterios guiados y comunicación oral uno, con destinatario real, expresiones breves y gestos de apoyo. No se obliga a exponer ante el grupo ni se convierte el silencio en dificultad. | PASS |
| Siete diarias | Propósito, criterio, evidencia esperada e IDs heredados exactamente del mapa. Fases y roles separados; materiales concretos y medidas de seguridad. Los registros siguen siendo oportunidades, no evidencias ya producidas. | PASS con reserva editorial menor |
| Contexto familiar | El relato de Ana y las lenguas que usa su familia se conservan como contexto individual, sin inferir un déficit, nivel o interés grupal. El proyecto no necesita inventar una traducción del quechua. | PASS en alcance limitado |

Ejemplos útiles: ciencias propone cambiar un aspecto por vez, volver a los dibujos y reconstruir una comparación si el registro no es claro. El cierre acepta diferencias y dudas en lugar de imponer «el doblez correcto». Arte permite elegir qué conservar, interlocutor y momento de hablar; la docente no añade significados al dibujo que el niño no expresó.

Reserva editorial P2: una mediación de la primera diaria de arte dice «¿Qué pasa si lo mueves así?» sin describir el gesto. La intención es exploratoria, pero una orientación autosuficiente sería más útil. Se conserva esta salida para no ocultar el límite ni ajustar el prompt contra el último ejemplo. No se observó una ruptura de secuencia ni un criterio inobservable por esa frase. Sigue siendo conveniente ampliar la revisión de apoyos comunicativos para situaciones individuales; esta muestra no las representa todas.

Las cuatro fechas de ciencias son una muestra preparada dentro de un tramo anual de diez fechas, no la secuencia completa de ese tramo. Arte usa otro aula ficticia de tres años; no se presenta como proyecto del anual de cinco años. No se generaron todas las actividades de los quince proyectos.

## Correcciones de documentos

### Finales vacíos por formato residual

Se reprodujeron dos casos de la ronda anterior: un proyecto de nueve páginas con la última vacía y una diaria de cinco páginas con la última vacía. En el XML quedaba un párrafo sin texto con tamaño/espaciado de título, a veces con `keepNext`, después de retirar secciones opcionales.

El exportador de proyectos/actividades limpia únicamente párrafos vacíos terminales. Conserva texto, tablas, dibujos, campos, marcadores y secciones. Si termina en tabla, mantiene el párrafo que Word requiere, con marca de un punto y sin el formato de título. No se aplica indiscriminadamente a otros exportadores.

Render Word local autorizado: proyecto **9→8 páginas**, diaria **5→4 páginas**, igualdad de todos los runs de texto no vacíos antes/después. Los originales se conservaron con su hash. No se redujo la fuente para lograrlo.

### Procedencia anual legible

Antes se repetía el texto completo de las fuentes bajo cada proyecto y luego en el anexo, con etiquetas técnicas. Ahora cada proyecto remite a fuentes numeradas; el texto completo se imprime una sola vez en procedencia, con origen, alcance, fecha y advertencia pertinentes en español. Se conserva la identidad cuando existe una vinculación autorizada; nunca se vincula por posición del roster.

La huella técnica del calendario permanece en los datos canónicos, sin ocupar el Word docente. Las cantidades de asignación/huecos/solapamientos se leen del resultado real, en lugar de escribir ceros fijos. Se corrige también el singular de «1 semana».

La inspección detectó un fallback engañoso: sin estado de revisión, el rótulo decía «revisadas por la docente». Ahora solo lo dice si `interpretation_review.status` es explícitamente `reviewed`; de lo contrario indica pendiente. La confirmación/revisión canónica y las valoraciones no se modifican. La prueba de integración conserva el rótulo correcto al confirmar solo planificación o al revisar explícitamente las interpretaciones.

### Conservación de archivos históricos

Se aumenta la revisión de plantilla de las nuevas descargas: anual `annual-journey-readable-v2`, proyecto `layout2` y actividad `layout4`. El almacenamiento existente conserva inmutables bytes e IDs anteriores y crea un artefacto distinto para la maquetación nueva. Regresión con PGlite/almacenamiento privado local: anterior descargable idéntico, nueva versión creada una sola vez y segundo acceso sin regenerar. No hay migración, backfill ni reescritura de registros pedagógicos.

### Entrevista vigente omitida parcialmente en el contexto anual

La primera muestra usaba campos familiares anteriores, aunque las ocho preguntas ya estaban vigentes. Al revisar la procedencia se inspeccionó también el constructor del snapshot: su enumeración antigua omitía **cinco campos** de las preguntas actuales —identidad/autonomía, lectura/escritura, matemática, exploración y contexto/expectativas familiares—. Por tanto, las muestras anteriores no acreditaban ese recorrido completo.

Corrección de causa: la proyección conserva los campos anteriores y añade las categorías del contrato familiar vigente, sin duplicarlas. Una prueba recorre las ocho preguntas reales del contrato y comprueba sus respuestas en el texto fuente y en el contexto de IA, con `family_report`, alcance individual y ninguna observación/competencia fabricada. No hay backfill de planes históricos ni transformación de la entrevista en evidencia curricular.

Se tradujeron también las etiquetas añadidas por el snapshot a sus campos textuales familiares, conservando cada respuesta y dejando intacto el texto de observaciones. Las selecciones estructuradas de ciertos snapshots anteriores permanecen literales si no cuentan con una representación legible: queda una reserva P2 para ese legado, no se borran ni reinterpretan datos para ocultarla.

Se ejecuta una generación anual adicional con una entrevista ficticia de ocho respuestas, manteniendo modelo e instrucciones. Es un cambio de datos/contexto justificado por el defecto identificado, separado de los casos principales previamente congelados. Su recibo verifica que las ocho respuestas llegaron efectivamente a la petición real. Las quince propuestas adicionales mantienen recursos/fechas/competencias válidos; la lectura de sus motivos y propósitos conserva el alcance individual de la familia. Las tres interpretaciones citan únicamente observaciones docentes, sin usar el relato familiar como evidencia. No se regeneraron ni sustituyeron las siete diarias anteriores.

## Render y utilidad de los Word

Once documentos nuevos: dos muestras de anual, dos proyectos y siete diarias; dos exportaciones adicionales reproducen los casos de maquetación anterior. Se exportaron copias de solo lectura con Microsoft Word local —autorización explícita previa—, se extrajo su contenido y se renderizaron todos los PDF a PNG.

Se inspeccionaron los contactos de las trece salidas y detalles de las páginas de secuencia, currículo y procedencia. Esto no equivale a una revisión humana de cada página al 100 %. La legibilidad se comprobó en detalles, sin detectar texto cortado ni superpuesto en las páginas revisadas.

Se mantiene la plantilla de Ayni, su identidad y los bloques formales. El anual tiene veinte páginas; las diarias nuevas cinco. Algunas terminan con poco texto real o con el aviso de ausencia de observaciones: ya no es el párrafo vacío residual, pero la compactación sigue siendo un P2 de presentación. El Word es preparación formal; la guía cotidiana breve sigue en Hoy. No se declara resuelto todo el diseño documental.

## Tiempos y gasto

Se mide desde creación hasta resultado completo, incluyendo recuperación del mismo ID; no solo la última consulta.

| Generación | Tiempo | Estimación estándar de uso conocido |
|---|---:|---:|
| Anual de quince propuestas | 291,593 s — 4 min 52 s | USD 0,147026 |
| Proyecto ciencias, cuatro fechas | 96,639 s — 1 min 37 s | USD 0,057326 |
| Proyecto arte, tres fechas | 85,624 s — 1 min 26 s | USD 0,048429 |
| Siete diarias | 6,469–15,809 s; media 9,085 s | Desglose en métricas |
| Anual adicional con las ocho respuestas actuales | 330,618 s — 5 min 31 s | USD 0,155589 |

Once creaciones, once respuestas completas. No hubo nueva creación para recuperar una respuesta identificada. Subtotal estándar de esta ronda: **USD 0,419690025**; control conservador: **USD 0,66160075**. QA previo conservador: USD 3,185327582, incluyendo íntegra la reserva del antiguo intento incierto. Acumulado: **USD 3,846928332**, por debajo de USD 5. Techo asignado antes de generar: USD 4,935327582. Transporte pagado cerrado al finalizar.

No es factura de la cuenta ni incluye consumos ajenos. No se reduce la reserva del intento incierto por no conocer su uso. Las duraciones no demuestran una mejora de rendimiento entre rondas: son casos distintos. La espera del anual sigue siendo una fricción aunque su continuidad esté protegida.

[Métricas y huellas](QA_PEDAGOGICA_FINAL_2026-10-18_METRICAS.json).

## Pruebas y publicación

- Suite amplia: **942/942 PASS**, sin fallidas ni omitidas. Incluye las regresiones nuevas de maquetación, procedencia y conservación de archivos.
- Tras corregir el último fallback del rótulo anual: **37/37 PASS** en la suite focal de anual, confirmación/revisión, documentos y almacenamiento. Es un subconjunto solapado; no se suma como pruebas únicas a 940.
- Typecheck, lint, build Vinext y Next, más comprobación estática del puente cloud: PASS. Se repiten las comprobaciones afectadas por la última corrección antes de publicar. Vinext conserva su advertencia de clasificación estática de algunas rutas.
- Contratos del anual, mapas, siete diarias, herencia, tres fases, huellas de generación y presupuesto: PASS con las salidas reales de esta ronda.
- Render y comparación de texto de los dos casos históricos: PASS; las reservas visuales restantes están indicadas arriba.

La publicación se ejecuta después del commit y con árbol limpio, exclusivamente como Preview, con SHA identificable. Se verifica READY, SHA/target, smoke sin sesión sobre recursos y rutas protegidas y conservación del destino de Producción. El recibo real y el enlace se entregan después de esa verificación; este informe no anticipa el resultado cloud. La base compartida impide atribuir a este smoke una validación de Auth/RLS/Storage con datos ficticios cloud.

Rollback: revertir el commit de esta ronda y desplegar otro Preview del commit previo; no ejecutar migraciones ni modificar Producción. Los archivos anteriores permanecen accesibles por ID; una nueva maquetación no permite sobrescribirlos. Cambios de esta ronda limitados a render, revisión de plantilla, proyección familiar al contexto anual y regresiones/documentación; no hay cambio de modelos, prompts ni reglas de negocio.

## Evidencia local

`.local/pedagogical-final-20261018/`: fixture, rúbrica congelada, requests/responses ficticios, checkpoints, ledger, tiempos, validaciones, logs y render. `outputs/pedagogical-final-20261018/`: Word generados. Las respuestas completas permanecen locales y no contienen credenciales. Los secretos de Vercel/Supabase no se imprimen ni se incluyen en el repositorio.
