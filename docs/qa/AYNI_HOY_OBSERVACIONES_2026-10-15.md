# Hoy: guía práctica y captura de observaciones — Preview

## Resultado y alcance
Base c881f17/72c8f26, rama codex/mi-ano-simple-preview. Continúa los cambios de año completo, Biblioteca, acciones por actividad y Evaluar, ya publicados en el Preview anterior. Hoy mantiene tarjetas, colores y pictogramas actuales. El encabezado ofrece solo Observación libre; la acción Registrar observación aparece inmediatamente después de cada criterio real dentro de su momento, también en consulta previa a iniciar. Conserva automáticamente actividad, criterio, competencia y moment_id; guardar no inicia ni reprograma la actividad.

La guía proyecta únicamente los apartados Inicio/Desarrollo/Cierre explícitos de los campos guardados. Muestra Qué hago ahora, Qué harán los niños y Qué debo observar cuando existe un criterio. Conserva introducciones y texto literal sin resumir ni inventar. Actividades antiguas sin apartados siguen legibles; no se regeneran. El prompt de crear-actividad pide una o dos indicaciones concretas por momento, sin anidar la secuencia completa ni repetir teoría. Word utiliza los campos formales íntegros.

El selector guiado reutiliza la cobertura anual autorizada: orden ascendente por record_count, desempate nominal, todos seleccionables. Gris 0, amarillo 1 y verde/turquesa 2 o más; etiqueta N obs. Los colores no representan nivel de aprendizaje. Un error o una consulta pendiente no se transforma en cero. Se actualiza tras guardar/corregir/anular.

La observación libre comparte con Diagnóstico el selector de competencias extraído, búsqueda, colores/pictogramas y los componentes de voz/foto existentes. Ayni sugiere reutiliza su endpoint de preview con clasificación V2.4; texto únicamente, sin enviar la foto ni heredar la competencia de la actividad. La profesora confirma al guardar, cambia o deja sin competencia. Cambiar el texto invalida una sugerencia anterior, no una decisión manual. El registro sigue en ordinary_observations con sus versiones, media privada y attribution existente, sin duplicar almacenamiento diagnóstico.

Guardar una elección explícita evita una segunda sugerencia en segundo plano. Si falla solamente la atribución, el texto/foto ya guardados permanecen; se informa y permite reintentar solo la confirmación. CAS y revisión de fuente vigentes siguen activos. Sin migraciones, permisos nuevos ni cambios RLS; propiedad y currículo se validan en servidor.

## Validación ejecutada
- 79 pruebas distintas PASS: proyección por momentos e introducciones, orden exacto, captura nominal/idempotencia, criterio y momento válidos, aislamiento docente, foto privada, corrección/anulación, atribuciones/abstención, evaluación solo confirmada vigente, clasificación V2.4, captura diagnóstica y Word.
- Typecheck independiente, ESLint de fuentes (excluyendo el directorio local de artefactos) y Next build PASS. También build vinext PASS.
- QA UI/HTTP PGlite aislado de 35 niños ficticios, sin APIs pagadas ni datos reales. Conteos 0/1/2; una anulada y una libre pendiente no cuentan; libre confirmada en otra competencia tampoco suma a la del criterio. Guardar guiada incrementa 2→3 y conserva development/criterio real.
- Sin botón guiado general; criterio muestra su acción; libre disponible antes de iniciar y en la guía. Una sola secuencia por momento. Abrir/observar no crea ejecución ni altera fechas.
- Libre: sugerencia ficticia de COM_ORAL, cambio manual a MAT_CANTIDAD, foto ficticia privada, fallo 503 simulado solo al atribuir, reintento exitoso con una sola observación/atribución; decisión posterior sin competencia guardada como unclassified. Cambio de texto retira la sugerencia obsoleta.
- Word descargado 399824 bytes; ZIP/XML contiene Inicio/Desarrollo/Cierre formales completos y la observación nominal del niño seleccionado. Fuente de la actividad conserva actual_execution_date=null.
- Escritorio 1440×1000 y móvil 390×844, sin desbordamiento horizontal, botones accesibles y formularios desplazables. Inspección por lotes; capturas con datos ficticios. El shim de next/image de Vite emite un aviso local por unoptimized; no es un error del producto Next.
- Se retiró de una prueba antigua una aserción de código fuente que exigía el botón de impresión eliminado previamente de Entrevistas; se mantienen todas sus pruebas reales de impresión HTML, privacidad, entrevista y versiones.

Capturas locales ficticias:
- [Guía en escritorio](../../.local/hoy-observaciones-20261015/result-desktop.jpg)
- [Prioridad por registros](../../.local/hoy-observaciones-20261015/desktop-priority.jpg)
- [Captura libre y competencias](../../.local/hoy-observaciones-20261015/desktop-free.jpg)
- [Captura guiada móvil](../../.local/hoy-observaciones-20261015/result-mobile.jpg)
- [Captura libre móvil](../../.local/hoy-observaciones-20261015/mobile-free.jpg)

## Talleres: revisión únicamente, no implementado
Ya existen library-resource con tipo workshop, plantillas/maestro, criterios propios, actividad de taller y bloque horario workshop. Se puede reutilizar ese conjunto. Sin embargo la generación directa vincula linked_main_activity_id y exige la competencia de la actividad principal; una biblioteca independiente requiere separar esa condición, guardar procedencia/versión de plantilla y crear un snapshot confirmado al asociar el taller a la jornada. Deben conservarse propietario/RLS, revisión, calendario, colisiones y reglas de un taller por actividad/día, según se decida. No crear otro almacenamiento de observaciones o documentos.
Pedagógicamente, menos registros significa menos evidencia disponible, no menor aprendizaje. La docente debe decidir pertinencia, edad, materiales y tiempo; cada taller necesita su propia competencia, criterio y evidencia, sin forzar relación temática con el proyecto ni asignar niveles automáticamente. No se cambiaron rutas, motor ni catálogo de talleres.

## Límites y rollback
Voz y cámara reutilizan los componentes de Diagnóstico; permisos y captura física no probados. IA real y recorrido autenticado de generación cloud no probados; sugerencias QA respondidas por transporte local falso, sin red externa. No se reescriben registros históricos ni se fuerza una competencia en observaciones libres. Revertir el commit de producto en otro Preview restaura presentación/prompt; datos ordinarios y atribuciones siguen siendo compatibles. Nunca promover a Producción. Recibo de publicación se añadirá después de READY/SHA y smoke.


## Recibo de publicación
Producto 48e7cc3940793b2bfec54d7a0718000319c2dd26 / https://ayni-aula-staging-kjkmaxrp8-ayni4.vercel.app / dpl_EohEQSots2FAcSg4QgFUBRs97thh, READY, target null y SHA exacto comprobados. Next cloud y 38 smoke PASS. Acceso docente visible en navegador; no se inició sesión ni se hicieron mutaciones pedagógicas cloud. Producción conserva dpl_H19YWzRdGjkgh8y72QAd1qBty7Mf / 9a0920230350cd6b9050f35683a1f35d459e78c7. Rama publicada en GitHub, sin promoción. Fixture local apagado, pestaña temporal cerrada y viewport restaurado; Preview abierto como entrega. IA real y permisos físicos de micrófono/cámara pendientes de QA humano.
