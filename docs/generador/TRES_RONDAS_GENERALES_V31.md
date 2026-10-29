# Tres rondas generales de generación y revisión

## Petición y alcance

Comprobar proyectos utilizables en varios temas y corregir Ayni, no retocar un examen o sus Word manualmente. Tres casos sintéticos de diez días: plantas (3/4/5 años, cuatro niños), tienda de juego (4/5 años, seis niños) y movimiento en el patio (3/4 años, cuatro niños). Se reutiliza la preparación, validación, persistencia y exportación reales, con almacenes independientes. El anual y las conversaciones de preparación del caso son fixtures; no se afirma haber probado tres chats reales ni generado tres años con IA.

Tres rondas temáticas no equivalen a tres llamadas: se revisaron maestros antes de continuar y se regeneraron lotes concretos ante hallazgos, conservando las respuestas anteriores. No se modifican proyectos docentes. Los datos de aula, recursos y episodios de los casos QA son ficticios y no se atribuyen a la usuaria.

## Hallazgos y cambios generales

1. Una prueba podía compartir objetos con el tema sin aportar suficiente información a la pregunta inicial. El maestro ahora comprueba pertinencia frente al reto, distingue observación de explicación causal y no fuerza experimentos, señales o presentaciones como fases vacías. En plantas, se comparan la misma hoja y sus partes/momentos, y el cuidado de las macetas se revisa con señales actuales; no se presenta el agua como solución del amarillamiento.
2. La selección provisional de referentes del anual se copiaba al maestro aunque su criterio necesitara otra actuación. Solo al generar un maestro V4 nuevo, documentProjectAnnualIntentContext proyecta sus oportunidades sin esos IDs provisionales. Conserva título, intención, edades, indicaciones, chat completo y calendario; curriculum mantiene el catálogo oficial completo y el esquema restringe sus IDs. El anual original, la captura persistida y su huella no cambian. Actividades siguen heredando los referentes del maestro validado. V3 y anteriores conservan su contexto.
3. Un criterio diario de agrupación añadía correspondencia no sostenida claramente por los pasos. Se exige relacionar cada verbo evaluado con una acción de esa actividad, sin copiar todo el criterio del proyecto. Agrupar, contar, emparejar, inferir y acordar no se intercambian por compartir competencia. El lote regenerado concreta una muestra por caja para ubicar grupos y reserva los pedidos/entregas para experiencias posteriores.
4. Las instrucciones condicionales seguían quedando en «verificar si corresponde». Dos regeneraciones con el perfil rutinario, pese a precisar el prompt, mantuvieron parte de esa vaguedad; no se dieron por resolución del hallazgo. Se aclara que diseñar procedimientos propuestos no equivale a inventar observaciones, y se compara el perfil de redacción focalizada ya configurado en Ayni.

No se añaden prohibiciones por tema, reemplazos de textos generados ni tratamientos específicos para aprobar un ejemplo. Las reglas se aplican a todos los maestros/actividades documentales nuevos. En materiales, las instrucciones comunes ahora incluyen explícitamente planificación V4.

## Perfil de escritura y comparación real

document-generator-ai-routing.mjs selecciona focused_writing (gpt-6.1-sol, low) para workflow activity solo cuando documentsOnly=true. El runtime y los constructores de petición usan la misma función, evitando discrepancias de modelo. Maestro, anual, chat y política diaria original conservan su selección; AI_ROUTING_POLICY no se modifica. El perfil documental tiene versión 4.0.1-documents-v31 y no configura reintentos ni un fallback sobre sí mismo. El resultado editorial nuevo se identifica como ayni-documents-project-v31; contrato de datos V4 y esquemas protegidos anteriores permanecen.

Se comparan entradas equivalentes de las últimas cuatro actividades de plantas y las primeras cinco de movimiento. La escritura focalizada sí concreta: revisar humedad superficial y agua acumulada; no regar con humedad/agua acumulada/incertidumbre; ofrecer vertido lento hacia la tierra solo con necesidad y drenaje confirmados, sin cantidades inventadas; alternativa de conservar una referencia. En movimiento especifica cómo cambiar un tramo usando una tela, conectar la llegada y acordar pases suaves sin alturas ni rendimiento obligatorio. No se modifica ninguna respuesta a mano.

La comparación sigue el criterio de revisar utilidad, hechos, voz y resultados en tareas representativas de [OpenAI Docs](https://developers.openai.com/api/docs/guides/model-selection). La guía orienta el método; el resultado de calidad procede de estas respuestas, no de una garantía del proveedor.

Coste y tiempo medidos de esos dos lotes: plantas USD 0.141433500/80.695 s; movimiento USD 0.125116000/66.329 s. Son estimaciones registradas por la aplicación, no facturación verificada. El perfil cuesta más por lote que Luna; mantiene una llamada por lote, sin una revisión IA adicional. No se promete menor latencia general ni un coste fijo por proyecto. Conservar el perfil rutinario para el Ayni diario evita trasladar ese coste al flujo original.

## Evidencia final

| Caso | Edades | Actividades | Word | Páginas |
|---|---|---:|---:|---:|
| Plantas | 3, 4, 5 | 10 | 11 | 50 |
| Tienda de juego | 4, 5 | 10 | 11 | 44 |
| Movimiento | 3, 4 | 10 | 11 | 44 |

Fuentes finales bajo output/generador-documentos/secuencia-proyecto-v30: triada-redaccion/iteracion-01, triada-general-final/iteracion-02 y triada-redaccion/iteracion-03. verification.json en triada-resumen comprueba 27 transiciones consecutivas, fechas/títulos/focos del maestro, edades/referentes oficiales y cero observaciones diagnósticas/evaluaciones creadas. Los tres ZIP contienen exactamente las partes de sus Word individuales (1161 archivos OOXML comprobados, excluyendo directorios del conteo).

Treinta y tres Word finales/138 páginas revisadas en hojas de contacto; las guías críticas también a tamaño individual. Guías de Inicio/Desarrollo/Cierre completas, sin texto fuera de página y con la misma papelería/colores/fuentes de Ayni. Hay páginas breves de registros/referencias y matrices que continúan por filas; no se promete reducción de páginas. Para seis archivos de tienda y seis de movimiento reutilizados, se comprobaron idénticas todas las partes excepto fechas de docProps/core.xml antes de reutilizar el render inspeccionado. Los archivos modificados se renderizan de nuevo. No se entregan PDF/PNG de QA como documentos docentes.

Total de esta petición: 16 llamadas reales exitosas, 10 reproducciones de respuestas ya pagadas identificadas cached_replay y sin nuevo consumo, cero reintentos automáticos y cero fallos técnicos durante las llamadas reales. 450330 tokens de entrada, 120157 de salida; coste estimado acumulado USD 1.248741950. Dos maestros preliminares de plantas y las variantes de lotes no aprobadas se conservan para comparar. No se afirma que todas las muestras finales se generaran íntegramente con el perfil nuevo: nueve actividades finales son de escritura focalizada; las otras veintiuna pasaron la revisión con el perfil anterior. El maestro de cada proyecto usa su perfil global original.

## Regresiones, activación y límites

Cuarenta y nueve pruebas distintas PASS, typecheck/build PASS y lint sin errores con aviso React previo. Incluyen API aislada una edad/multiedad, permisos, atomicidad, conservación del chat, ruta V4, fuentes históricas, Word y aislamiento del nuevo perfil. El test nuevo de contexto compara anuales equivalentes con distintas selecciones provisionales y asegura la misma petición del maestro sin modificar la fuente. Primera ejecución tras la proyección detectó cuatro regresiones del proveedor simulado: dependía de los IDs retirados del breve anual. El fixture ahora obtiene referencias del catálogo oficial cuando esa selección no se recibe; validadores reales no se debilitan. Se conserva el log anterior, y la ejecución final completa pasa.

Dos incidencias de preparación del evaluador, previas a cualquier IA: demasiados referentes por oportunidad (máximo tres) y uso del constructor multiedad con una edad. Se corrige el fixture y se usan aulas 3/4/5, 4/5 y 3/4, sin cambiar límites de producción ni presentar una prueba real de generación de aula de edad única. La API de una edad sí pasó su regresión existente.

Activación local: launcher 37572, mismo almacén generador-prueba-chat-20261027-reinicio, respaldo triada-v31-before-activation. Antes del reinicio no había tareas queued/running. La usuaria creó otro proyecto durante las pruebas; se incluye en la captura final. Workspace, planes, cuatro alumnos, veinticinco turnos en dieciséis ámbitos y treinta y ocho cuerpos Word (incluido anual activo) idénticos antes/después. Web/API operativas, web HTTP 200. Recibo .local/triada-v31-activation-preservation.json. Cero cambios al checkout original, migraciones, publicación, commit o push.

La revisión valida estas tres situaciones y las regresiones, no una certificación universal de cualquier tema, duración o suficiencia de todo chat. En plantas la causa del amarillamiento sigue abierta; no se inventa una conclusión para cerrar el proyecto. El juicio docente sobre condiciones reales sigue siendo necesario, con propuestas concretas para observar y participar.

Rollback: volver al resolver rutinario para documentos si se prioriza coste; retirar la proyección del contexto y los párrafos nuevos de V31 si fuera preciso. Reiniciar solo la variante, mantener lectores V4, fuentes y trabajo posterior. No restaurar respaldos sobre nuevos datos docentes.
