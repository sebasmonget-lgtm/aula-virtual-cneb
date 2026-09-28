# Hallazgos de la auditoría

Registro final. Solo se consideran comprobados los pasos ejecutados; se distingue causa reproducida de hipótesis. No se implementaron arreglos. Los hallazgos de tests no se presentan como acciones pedagógicas fallidas en la UI.

## H01 Respuesta de entrevista perdida al volver

Severidad: MEDIUM. Categoría: UX y datos. Estado: reproducido.

Pasos: abrir entrevista de Bruno sin respuestas; escribir en la primera respuesta «Su papá y una tía se alternan para acompañarlo.»; pulsar Volver; volver a abrir entrevista. Resultado: campo vacío, sin aviso de cambios pendientes, borrador ni opción de recuperación. El alumno sigue Sin respuestas. Reingreso manual permitió continuar.

Causa probable: estado del formulario solo en memoria del componente hasta Guardar. Recomendación: aviso de salida con cambios y/o borrador local recuperable. No se implementó ninguna corrección.

## H02 Observación diagnóstica sin fecha editable

Severidad: LOW. Categoría: funcional y trazabilidad. Estado: comprobado en guiada y espontánea.

Las pantallas permiten niño, contexto y texto, pero no fecha del hecho. Guardar muestra 27/09/2026. Para una docente que registra notas recogidas antes, fecha de registro y fecha observada quedan confundidas. En esta auditoría limita reconstruir un diagnóstico de marzo sin saltarse la interfaz. Se continúa con la fecha real y se documenta la simulación acelerada; no se alteró reloj ni base.

Recomendación: distinguir fecha observada y creación, con valor por defecto hoy y posibilidad de editar dentro del año escolar.

## H03 Nota curricular bloqueada por una referencia familiar común

Severidad: HIGH. Categoría: IA, funcional y curricular. Reproducido en J18.

La nota describe escritura emergente para recordar semillas. La frase «para que mamá se acuerde» dispara `privacy_blocked`; el modelo nunca recibe la nota. La UI dice que Ayni no puede recomendar, sin distinguir un bloqueo local de una incertidumbre curricular. La función `anonymousDecisionText` rechaza cualquier palabra familiar mediante `FAMILY`, aun sin nombre, contacto o identificador. La corrección manual de escritura funcionó.

Recomendación: revisar minimización de datos y falsos positivos con una política aprobada, mantener privacidad pero permitir contexto no identificable. Separar motivo técnico y resultado del modelo en la auditoría. No se cambió el filtro.

## H04 Omisión en identidad con expresión de necesidad y preferencia

Severidad: MEDIUM. Categoría: IA y curricular. Reproducido en J24.

La nota contiene gusto por construir, incomodidad con ruido y solicitud de un lugar tranquilo. El híbrido Jev devuelve sin candidatos y la UI solicita más detalle. Fuente Jev comprobada; se eligió identidad manualmente. No se conoce si falló suficiencia, Choice o confianza porque se descartan los números. Recomendación: analizar por competencia, preservar resultados y contrastar anonimización/abstención con notas de identidad antes de cambiar umbrales globalmente.

## H05 Probabilidades y decisiones sin trazabilidad a la observación

Severidad: HIGH. Categoría: IA y trazabilidad.

Los logs registran modelo, KB, tokens, costo y latencia, pero no ID de observación/request de negocio. La tabla de observaciones no conserva confianza ni probabilidades; el libro de costos se atribuye a docente y workflow pero no a documento o etapa pedagógica. Permite totalizar gasto, no reconstruir plenamente una decisión o un costo por documento con reintentos. Recomendación: correlación segura por IDs no personales, resultado estructurado versionado, estado/latencia/intento y motivo de abstención. No registrar prompts con datos de menores por defecto.

## H06 Estado Listo con una nota sin evidencia clasificable

Severidad: LOW. Categoría: UX y pedagogía.

Observar llega a Listo 15/15 al guardar la nota de llegada tardía de Omar. El mapa conserva correctamente cero competencias para Omar, sin nivel C. No hay fallo de nivel observado, pero el marcador Listo puede confundirse con suficiencia diagnóstica. Recomendación: distinguir registros realizados de cobertura o evidencia suficiente.

## H07 Interés agregado visible pero fuera del contexto del resumen

Severidad: HIGH. Categoría: IA, trazabilidad y pedagogía.

La pantalla muestra Naturaleza en 11/15 entrevistas. La propuesta automática de resumen no lo utiliza. La inspección del paquete enviado por `ai-diagnostic-evaluation-service.mjs` confirma contexto con edad, cantidad, comentarios y notas por alias; no incluye el agregado de intereses. La docente debió añadir huerto/insectos/semillas al campo de planificación antes de confirmar.

Recomendación: incorporar patrones familiares anónimos como contexto, diferenciados de evidencia observada. Medir que sobrevivan hasta plan, experiencia y actividad. No enviar por defecto textos de familia ni nombres. No se modificó el paquete.

## H08 Plan generado no puede guardarse ni confirmarse

Severidad: BLOCKER. Categorías: funcional, datos, trazabilidad. Estado: reproducido en UI y con dato persistido real en memoria.

Editar únicamente propósito de fila 2 → Listo → Guardar cambios rechaza fila 1. Refrescar y confirmar las doce filas originales SIN edición da el mismo error. Resultado: plan draft, cero proyectos/actividades propios; alternativas taller/calendario no evitan el requisito. Mensaje «Revisa los datos de la propuesta 1» sin motivo recuperable.

Causa comprobada: servidor enriquece filas con period_label/planned_start_date/planned_end_date/planned_instructional_days después de validarlas. Guardado y confirmación las revalidan con whitelist que prohíbe esos campos. La proyección permitida pasa en memoria; el original falla. No se aplicó esa proyección. Solución recomendada: separar contratos de entrada/datos derivados y probar el round-trip completo; no hacer más permisivo el schema del modelo sin distinguir datos del servidor. Rollback recomendado de un futuro arreglo: revertir contrato/código, conservar versiones previas y verificar compatibilidad de borradores; no borrar planes para ocultar el defecto.

Evidencias: annual-save-error-dom, annual-confirm-original-error-dom, invariants.json. Antes del piloto este bloqueo debe desaparecer con una profesora nueva por UI, no solo en unit tests.

## H09 Taller no puede comenzar independiente de un proyecto

Severidad: HIGH. Categorías: funcional, pedagógico, UX. Estado: reproducido.

Planificar → Taller → Biblioteca → Mural del lugar que compartimos → Usar en actividad exige confirmar proyecto/unidad. Impide probar un taller autónomo y la única alternativa del recorrido bloqueado. Causa: generador de actividad depende del parent confirmado aun con recurso taller. Recomendación: definir qué talleres pueden ser independientes y asegurar un flujo vertical propio con contexto/criterio; no convertir cualquier recurso en un nuevo módulo. No se cambió la dependencia.

## H10 Observar desde Hoy retorna al diagnóstico

Severidad: HIGH. Categorías: UX, funcional, trazabilidad. Estado: reproducido después de diagnóstico/prioridades confirmados.

Hoy → Observar → Anotar observación abre experiencia/observación diagnóstica, no evidencia de actividad del período. Puede inducir a colocar notas cotidianas en el registro que luego no alimenta evaluación del período. No se afirma que una actividad confirmada existente carezca de evidencia: esta identidad nunca pudo crearla. Recomendación: diferenciar destino diagnóstico/actividad y ofrecer ruta comprensible cuando no hay actividad; comprobar que una nota del día llega al período correcto.

## H11 Fechas de diagnóstico/exportación cambian al día UTC

Severidad: LOW. Categorías: datos, documento. Estado: reproducido.

UI de observaciones dice 27/09/2026 y Word/biblioteca 28/09/2026 en la misma noche Lima. Código `slice(0,10)` toma UTC de observed_at/created_at. El Word muestra rango 28/09–28/09; no la fecha local del hecho. Recomendación: política de fechas civiles observadas y zona Lima consistente. No cambiar timestamps de auditoría UTC; convertir para presentación.

## H12 Word recomienda observar competencias no aplicables

Severidad: HIGH. Categorías: curricular, documento, datos. Estado: reproducido en archivo real.

Con religión=false y castellano_l2=false, «Qué continuaremos observando» nombra religión y castellano como segunda lengua. Las tablas especiales se eliminan correctamente, pero la lista missing usa los 14 competencyFields sin filtrar flags. No es alucinación del modelo: derivación determinista de plantilla. Recomendación: aplicar una sola política de aplicabilidad en todas las secciones y testear descarga completa con flags true/false.

## H13 Resumen nominal exportado privilegia primeras notas

Severidad: MEDIUM. Categorías: pedagógico, documento, trazabilidad. Estado: reproducido en snapshot/export y código.

Bruno y Valeria tienen notas posteriores positivas/contextuales, pero su sección nominal utiliza solo las primeras dos. `childObservations.slice(0,2)` excluye la mejora de Valeria y el cambio contextual de Bruno de esa sección. La nota de Valeria sí aparece en tabla de cantidad y ambas siguen en base; no se afirma pérdida de datos ni error de assessment. Recomendendación: representación explícita de reciente, cambio y contradicción, con revisión docente, no recorte cronológico ciego.

## H14 Alcance de vista previa y prioridades distinto del Word

Severidad: MEDIUM. Categorías: documento, UX, trazabilidad. Estado: reproducido.

Vista confirmada muestra tres textos grupales. Word incluye además tablas, datos nominales, recomendaciones derivadas y tres encabezados genéricos «Aprovechar fortalezas / Ofrecer oportunidades / Ajustar experiencias». Las tres prioridades confirmadas en el módulo posterior no aparecen como esa lista. Los textos grupales sí coinciden exactamente; no se afirma corrupción de su versión. El diagnóstico exportado no toma la revisión posterior de prioridades y no informa esa diferencia al usuario. Recomendación: aclarar alcance/versión y permitir revisar todo contenido exportable, sin atribuir confirmación docente a derivaciones no vistas.

## H15 Tabla anual difícil de leer en celular

Severidad: MEDIUM. Categoría: UX. Estado: inspección visual 390×844.

308 px de área frente a 934 px de contenido. Acciones fijas ocupan ancho; filas largas, justificación y título no visibles a la vez al deslizar. No hay pista de que falta información a la derecha. Workaround: desktop/deslizamiento cuidadoso. No se declara infracción automática WCAG de una tabla; impacto operativo observado. Capturas 07–09. Recomendación para etapa posterior: comprobar lectura/edición por fila en móvil con docentes, conservar jerarquía y objetivos táctiles; no se rediseñó.

## H16 Conteo de registros cuenta asociaciones multicompetencia

Severidad: LOW. Categorías: datos, documento. Estado: reconciliado.

Word dice 28 registros; son 27 notas curriculares únicas y 28 asociaciones porque J16 tiene dos competencias. 29 notas brutas incluyen dos no curriculares. El doble conteo no creó niveles ni perdió evidencias, pero etiqueta la unidad equivocadamente. Recomendación: distinguir observaciones únicas, asociaciones y niños observados; test de una nota con dos competencias.

## H17 Salidas de progreso/SIAGIE expresamente pendientes

Severidad: HIGH respecto del objetivo de cierre/documentos. Categorías: funcional, documento, UX. Estado: visible en UI; capacidad incompleta, no fallo de un archivo generado.

Informe de progreso dice Word/PDF se añadirán con plantilla posterior; Exportar SIAGIE está deshabilitado. Excel genérico existe, no equivale a esos formatos. No se presenta como probado un informe familiar final descargado. Recomendación: definir entregable disponible en piloto, implementar/validar solo el alcance necesario después de decidir, o comunicar claramente limitación. No prometer cierre documental completo mientras no exista.

## H18 Test de reajuste falla en ventana UTC/Lima

Severidad: MEDIUM. Categorías: datos, calidad de pruebas. Estado: fallo automatizado reproducido, no E2E pedagógico.

Fixture day(-1) usa UTC; regla todayInPeru usa Lima. Durante esta noche, período ends_on=27/09 es el día actual Lima; recibe espera a que termine en vez del error esperado de propuesta pasada. Recomendación: reloj controlado y fechas civiles consistentes en fixtures, probar ambos lados del límite. No se alteró reloj ni producto para hacer pasar el test.

## H19 Importador no contempla ledger de costos

Severidad: HIGH. Categorías: datos, costo, funcional. Estado: test + lectura estática reproducidos.

Exportador tiene 68 tablas, importador 67: falta ai_usage_events. El importador detecta tabla desconocida y rechaza el paquete. La migración Supabase de ai_usage_events sí tiene RLS; no inferir brecha de seguridad por este fallo. Recomendación: paridad de export/import/remapeo de docente y conservación de costos históricos en una migración nueva/flujo probado. No se corrió importación ni se tocaron cuentas Supabase.

## H20 Encabezados del Excel genérico quedan estrechos

Severidad: COSMETIC. Categoría: documento. Estado: render de lectura del archivo real.

Consolidado sin evidencias tiene encabezados completos en las celdas, pero la vista renderizada de columnas predeterminadas recorta Competencia y Conclusión descriptiva. No pierde el texto del archivo ni altera números; requiere ajustar ancho para leer. No se juzgan las filas de evaluación aún inexistentes. Evidencia: consolidado-preview-1.png y consolidado-cells-1.json. Recomendación posterior: revisar anchos/envoltura/impresión del Excel disponible; no se editó el archivo.

## Riesgos y restricciones que NO son bugs comprobados

No se validó persistencia de nacimiento (15 null pese a intento de automatización), grabación/transcripción, cancelación, factura OpenAI, móvil físico, render visual Word ni evaluación con evidencia real de período. La telemetría best-effort puede perder un evento si falla DB, pero no se observó pérdida de estos 49 eventos. El build advierte tamaño de chunks, no se midió rendimiento en red lenta. No hay CRITICAL de nivel final incorrecto demostrado: no se generaron niveles; la imposibilidad de validar ese riesgo es una limitación importante, no un PASS.
