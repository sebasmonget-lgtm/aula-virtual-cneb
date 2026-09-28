# Auditoría integral de Ayni: resultado ejecutivo

Fecha: noche del 27/09/2026, America/Lima. Producto local existente. Sin arreglos, cambios de arquitectura, despliegue ni datos reales de menores. Este documento reúne resultado, costos y prioridades; los informes 02–19 y evidencias permiten reproducirlos.

## Veredicto

**Una profesora nueva NO pudo completar el recorrido anual.** Se pudo configurar el aula, registrar entrevistas y observaciones, usar Jev real, confirmar el diagnóstico y prioridades y generar un borrador anual pertinente. La confirmación de ese plan falla incluso sin editarlo. Es un BLOCKER reproducido y su causa está localizada. No hay proyecto/actividad propios para registrar evidencia del período, por lo que no se completaron P1–P4, reajustes ni cierre anual.

No se sustituyó la interfaz por SQL o endpoints de escritura. Se buscaron alternativas normales: confirmar original tras recargar, abrir taller desde Biblioteca, Calendario/Hoy y Evaluar. Ninguna permite salvar el requisito del plan confirmado. Se continuó auditando las pantallas/documentos alcanzables y las barreras de los cuatro períodos. No se fabricaron niveles ni se usaron fixtures de otra docente para simular un año terminado.

Por tanto, **Ayni no está validado todavía como un ciclo pedagógico completo para una profesora que empieza desde cero**. Eso no significa que todos sus módulos estén mal; significa que la cadena crítica se rompe y los módulos posteriores permanecen sin prueba real de este recorrido.

## Qué se probó y con qué aula

Entorno independiente en localhost:5175/API 8790, base nueva, docente ficticia Lucía Palomino Quispe, IEI Semillas del Valle QA, Exploradores, 15 alumnos de edad curricular 5 años. El entorno original de la usuaria 5173/8788 se preservó. Ningún código/recurso de producto cambió respecto del baseline de 1,038 archivos.

La muestra se diseñó antes de ingresar datos: 9 niños requieren mediación en acuerdos/turnos; 11 familias comparten interés por naturaleza; Mateo participa mejor en pareja y con anticipación; Inés/Thiago muestran fortalezas distintas; Omar tiene información insuficiente; Valeria mejora en una nota posterior; Bruno actúa distinto en dos contextos. Los niveles futuros del ground truth eran hipótesis, no resultados automáticos.

Datos ingresados por UI: 15 estudiantes, 15 entrevistas confirmadas, 5 observaciones guiadas de cinco niños y 24 espontáneas, 1 comentario individual opcional, 3 textos grupales revisados, 3 prioridades confirmadas y 12 propuestas anuales reales. Textos con errores leves, Gabi, frases cortas, ambigüedad, dos competencias y anécdotas. Los nacimientos intentados no quedaron persistidos: no se declara validado ese campo ni se atribuye el resultado a un bug sin prueba del control antes del envío.

## Alcance ejecutado, sin nota global

| Etapa | Resultado |
| --- | --- |
| Onboarding, perfil, logo de iniciales y aula | PASS; opcionales y fechas escolares precargadas |
| Nombres e entrevistas | PASS; guardado confirma y vuelve a lista. Volver sin guardar pierde texto |
| Diagnóstico y mapa | PASS con 3 correcciones docentes de clasificación; ausencia no se volvió C |
| Resumen automático del grupo | PARTIAL: detecta acuerdos, omite interés agregado y detalles concretos |
| Resumen confirmado y prioridades | PASS: decisiones docentes justificadas, comentarios individuales no obligatorios |
| Borrador anual | PARTIAL: responde al aula; 11/12 competencias aplicables previstas, TIC pendiente |
| Guardar/confirmar Mi año | FAIL, H08 BLOCKER |
| Proyectos/unidades/actividades | NO PROBADOS: acceso bloqueado, no salidas propias |
| Taller desde Biblioteca | FAIL como vía independiente: requiere proyecto confirmado |
| Evaluación sin evidencia P1/P2/P3/P4 | PASS en barreras negativas; NO demuestra cierres completos |
| Assessment/conclusiones/familias con datos | NO PROBADOS |
| Consolidado vacío/Excel | PASS de consistencia vacía y descarga; no matemática con valoraciones reales |
| Reajustes y cierre anual | NO PROBADOS por bloqueo; objetivo anual no alcanzado |
| Word diagnóstico | PARTIAL: datos/textos confirmados coinciden, derivaciones presentan fallos; visual/paginación no verificadas |
| UX móvil | PARTIAL: perfil legible; tabla anual difícil de consultar/editar |

## Dónde se rompe la historia pedagógica

Hay enlaces genuinos: necesidad de acuerdos → prioridad → varias propuestas de juego/huerto/reparto; interés por naturaleza → huerto y semillas; fortalezas → exploración/cantidad y expresión. Se leyeron los resultados, no solo el código que «manda contexto».

Dos rupturas preceden al bloqueo: el agregado Naturaleza 11/15 está en pantalla pero no en el bundle del resumen grupal; lo añadió la docente antes de confirmar. El Word nominal recorta primeras notas y no refleja en esa sección el cambio posterior de Valeria o la diferencia contextual de Bruno.

La ruptura principal: el servidor agrega cuatro campos de calendario al borrador y luego su validador estricto rechaza esos mismos campos. Editar fila 2 rechaza fila 1; confirmar original también. El dato persistido falla en una reproducción de solo lectura; una proyección estricta pasa únicamente en memoria y no fue aplicada. El plan sigue draft. Hasta arreglar ese round-trip, la secuencia plan→proyecto→actividad→evidencia→assessment→informe→reajuste no puede demostrarse.

La [matriz de trazabilidad](<C:/Users/ASUS/Documents/ChatGPT/Asistente CNEB/docs/qa/end-to-end-audit-2026/13_TRAZABILIDAD_CURRICULAR.md>) distingue los cinco patrones y cada eslabón PASS/PARTIAL/FAIL. No trata el buen preplan como ejecución anual ni las notas diagnósticas como evidencia del bimestre.

## Jev e IA: resultados defendibles, no infalibles

Se auditó el híbrido actual del flujo docente: Choice principal y Noul para adicionales, dos llamadas concurrentes por nota. Jev efectivo typesafe/jev-1.13-20260917, KB 4.1.0. No se compararon dos métodos separados ni se cambiaron umbrales durante esta prueba.

En 24 notas predefinidas: 21 resultados correctos, 1 discutible solo por orden de dos competencias y 2 omisiones del sistema. Una omisión no llegó a Jev: «para que mamá se acuerde» bloqueó escritura emergente por el filtro local. La otra fue identidad explícita que Jev dejó sin candidato. Se corrigieron por la UI; se mantuvo la salida original para no contabilizar intervención docente como acierto automático.

Se distinguieron oralidad/arte sobre insectos de indagación; anécdotas de asistencia/conducta no recibieron competencia. El conjunto multietiqueta de Valeria era defendible, pero Usar recomendación adoptó solo la principal y la docente agregó la secundaria. Confianza numérica no disponible: no se conserva, pese a existir metadata de decisión. No se inventaron porcentajes ni se extrapoló esta muestra diseñada a accuracy poblacional.

Las tres llamadas OpenAI reales respetaron Sol medium para grupo/prioridades y Sol high para preplan, router 3.0.0. No hubo assessment, informe, proyecto o audio real; modelos de esos flujos se identificaron solo en código/tests. Jev para imagen/ficha existe en la implementación, pero NO se probó en el recorrido bloqueado. Su decisión es sobre metadatos, no visión de píxeles/PDF.

## Problemas curriculares y de documentos

El mapa/planning respeta religión/L2 desactivados; el Word en «Qué continuaremos observando» vuelve a nombrarlos. Es un error determinista de aplicabilidad, no del modelo. La fecha del Word/lista es 28/09 UTC mientras la UI de notas indica 27/09 Lima. El Word cuenta 28 asociaciones como registros cuando son 27 notas curriculares únicas; hay 29 notas brutas y dos no curriculares.

Los tres textos grupales y datos de docente/institución sí están exactamente en el Word real descargado. Pero la vista previa no abarca todo lo exportado y sus prioridades genéricas no son la revisión de prioridades confirmada después. La estructura ZIP/XML se inspeccionó; no se pudo renderizar con LibreOffice porque falta en el runtime. No se certifican saltos, páginas vacías, impresión ni legibilidad visual de Word.

Los cuatro períodos evitan valorar sin criterios/evidencia; no convierten diagnóstico en nivel. El Excel vacío mantiene ese ámbito sin inventar celdas. Informe de progreso Word/PDF y exportación SIAGIE se anuncian pendientes. No se puede prometer cierre documental completo.

## Funcionalidad, UX y pruebas técnicas

20 hallazgos: 1 BLOCKER, 8 HIGH, 6 MEDIUM, 4 LOW, 1 COSMETIC. Ningún CRITICAL de nivel final incorrecto fue demostrado porque no se llegaron a generar valoraciones; ese riesgo queda sin validar, no exonerado.

Además del bloqueo: taller dependiente de proyecto, Hoy→Observar ambiguo hacia diagnóstico, pérdida silenciosa al salir de entrevista, tabla anual poco manejable a 390×844 y documentos derivados no completamente revisables. Los campos claros, entrevistas en una columna, clasificación automática y comentarios opcionales sí facilitan trabajo. Se estiman 370–570 acciones de interacción automatizada, no un benchmark de tiempo de profesora; los módulos bloqueados no tienen tiempo observado.

Typecheck, lint y build pasan. Suite completa de 98 archivos: 461 pruebas, 459 pasan y 2 fallan. Una depende de yesterday UTC frente a hoy Lima; otra detecta `ai_usage_events` ausente del importador (68 tablas exportadas, 67 admitidas). Las pruebas aisladas no detectaron la confirmación anual real. No hubo cambios del producto, reset del aula original, commit ni despliegue.

## Costo de la prueba y costo anual orientativo

49 llamadas registradas: 46 OpenRouter y 3 OpenAI. **US$0.087422752 en ledger mixto**: US$0.006730752 costo informado por OpenRouter y US$0.080692 calculados con tokens reales/tarifa OpenAI. El contador US$0.0874 coincide. No es una factura íntegra conciliada: no hubo acceso a cargos OpenAI ni conciliación bancaria/gateway. Llamadas y fuentes están en CSV/JSON.

| Supuesto anual para 15 alumnos | Bajo | Realista | Intensivo |
| --- | --- | --- | --- |
| Regeneraciones adicionales supuestas | 5% | 20% | 75% |
| Observaciones Jev / audio minutos | 300 / 180 | 900 / 600 | 1,800 / 1,500 |
| API anual por profesora/aula | $3.41 | $7.32 | $17.28 |
| Mensual, 10 meses escolares | $0.34 | $0.73 | $1.73 |
| Anual por alumno | $0.23 | $0.49 | $1.15 |

**Son proyecciones hipotéticas, NO un año validado.** Suponen los modelos actuales, sobres de tokens explícitos, sin caché, precios Standard y volúmenes definidos. Proyectos, actividades, assessments, familias, audio y selecciones Jev de recursos no se midieron: se indican por salida en el informe 15. No incluyen alojamiento, base, almacenamiento, soporte, impuestos, conversión monetaria ni margen. No usarlas todavía como costo comercial definitivo. Fuente de tarifas: [OpenAI](https://developers.openai.com/api/docs/pricing), [Jev/OpenRouter](https://openrouter.ai/typesafe/jev-1.13).

## LAS 10 COSAS QUE CORREGIRÍA ANTES DEL PILOTO

1. El bloqueo de guardar/confirmar plan con calendario derivado, con regresión UI de profesora nueva.
2. La ruta coherente de actividad/taller independiente y observación cotidiana hacia su período.
3. Aplicabilidad curricular consistente en toda descarga, no solo tablas/pantalla.
4. Selección de evidencia reciente, progreso y contradicción en resúmenes nominales.
5. Vista previa/versión/fidelidad de prioridades, fechas Lima y unidades de conteo del documento.
6. Inclusión de intereses agregados anónimos en el resumen diagnóstico automático.
7. Falsos positivos de privacidad y omisiones Jev, con muestra nueva y sin bajar umbrales a ciegas.
8. Correlación de decisiones, confianza, intentos y costos, incluida paridad export/import.
9. Alcance real de informes finales del piloto y sus formatos descargables.
10. Recuperación de entrevista, consulta móvil y pruebas con reloj controlado.

No se implementó ninguna. La prueba de aceptación de un piloto debe volver a empezar desde cero, completar un flujo vertical, comparar historia/evaluación/consolidado y luego recorrer los cuatro períodos. Autorización/RLS real, audio ficticio controlado, documentos renderizados y conciliación de costos también siguen pendientes. No se reutilizaron ni probaron cuentas de producción.

## Entrega y límites

Se conservan los 17 informes solicitados, ground truth previo, respuestas originales, llamadas/costos, snapshots de solo lectura, capturas, Word y Excel reales. El entorno QA queda disponible en [localhost:5175](http://localhost:5175/) con su borrador bloqueado; el original en 5173 no se tocó. Scripts de arranque no deben relanzarse sobre procesos ya activos; las instrucciones están en timeline.

Lo pendiente no se oculta: audio, nacimiento persistido, cancelar/reintentar proveedor, red lenta, Word visual, proyectos/actividades reales, niveles/conclusiones/familias personalizados, consolidado con niveles, reajustes y cierre anual. El motivo de cerrar la ejecución es el bloqueo técnico concreto de la cadena, no falta de voluntad de continuar ni aprobación del sistema.
