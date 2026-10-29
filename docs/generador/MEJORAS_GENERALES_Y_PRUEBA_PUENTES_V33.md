# V33 · organización, revisión del proyecto y Word práctico

Fecha: 2026-10-28. Alcance: variante local documental, rama `codex/ayni-documentos-pruebas`. Autorización: mejorar los puntos de la auditoría P04 y probar otro proyecto. No se reescribe P04, el año, los proyectos ni el chat docentes; no hay despliegue.

## Problema y cambio general

La auditoría de agua encontró una comparación ambigua, un cierre sin contraste explícito entre ideas y observaciones y páginas finales casi vacías. Un prompt por sí solo no hacía obligatorio organizar estos elementos ni corregía la paginación.

El prompt documental pasa a `ayni-documents-project-v33`. Las actividades nuevas usan `activityPlanning.version=3`:

- `organization`, obligatorio: quién actúa, si la experiencia es común/por parejas/individual, orden y momentos de registro; en comparaciones, qué se conserva y qué se modifica. El servidor lo incorpora una sola vez al inicio de la guía guardada, que consumen pantalla y Word. El prompt pide no duplicarlo en la apertura.
- `projectReview`, obligatorio y no nulo únicamente en la última fecha: recuperar ideas/intenciones iniciales, contrastarlas con observaciones/registros o uso de la creación y compartir qué se sostiene/cambiaría, además de próximas preguntas. No convertir todo proyecto en un experimento ni exigir explicación oral formal a los niños de tres años. Se incorpora al cierre canónico; el resto de fechas exige null.
- Referentes seleccionados por pertinencia de la actuación y la revisión, no automáticamente los primeros del catálogo. La presencia del campo o de un ID no prueba calidad semántica; esa parte se revisa leyendo la prueba real.

El esquema y la validación de actividad individual/lote aplican el mismo contrato. Se reserva espacio antes de componer la guía: apertura de hasta 2039 + organización de 360 + salto, cierre de hasta 1939 + revisión de 460 + salto; ambos caben en 2400. Mantiene lectura histórica V2. Maestro, materias, edades y secuencia existente se conservan. No cambia el transporte durable: anual/maestro/actividad/lote siguen consultando el mismo response ID sin POST por cada polling.

## Presentación Word V3

Solo fuentes nuevas V33/actividad V3 guardan `document_presentation_version=3`. Presentaciones anteriores mantienen sus renderizadores y textos. La plantilla conserva styles.xml y todos sus recursos gráficos; no se cambian colores ni tipografía.

La guía muestra «Para qué» y «Materiales» como etiquetas breves y mantiene Inicio, Desarrollo y Cierre. El apoyo por edades se mantiene junto. Criterios/evidencias por edad siguen completos; las citas debajo de cada competencia indican edad, orden del desempeño y página impresa. Los IDs/textos oficiales completos permanecen en el JSON congelado. Un enlace final abre el Programa Curricular oficial. El registro docente queda vacío, en dos líneas compactas; no se inventan actuaciones ni niveles.

Se compacta el anexo curricular y se evita repetir una larga bibliografía, sin reducir el tamaño de lectura de la guía. No se promete un número fijo de páginas: depende de edades, competencias y longitud; en la prueba son 3–4 por actividad y 7 de proyecto, incluida portada. Las últimas páginas contienen contenido curricular, no solo registro/bibliografía.

## Prueba real diferente: puentes

Almacén aislado `generador-qa-secuencia-v30-r1-guide-v33`, aula ficticia LILA de 3, 4 y 5 años, cuatro estudiantes. Caso: un puente de papel entre cajas se dobló al pasar un muñeco; investigar/construir alternativas. El contexto de prueba no ordena específicamente registrar entre intentos: esa mejora procede de las reglas generales.

Una preparación completa con IA real: maestro y primera actividad + lote de cinco + lote de cuatro. Tres creaciones, sin regeneración de contenido ni llamada de evaluación añadida; coste registrado USD 0.520653. Ajustes de maquetación se verificaron reexportando los mismos contenidos, sin pagar nuevas generaciones. No se afirma que haya una segunda generación completa ni que el comportamiento esté demostrado para todos los temas.

Recorrido: planificación con los niños → observar papel → papel/cartón → apoyo central → plegado → construir con lo probado → conectar lugares del juego → ajustar mayor distancia → explicar a otra pareja → revisar ideas y pruebas. Se mantienen nueve enlaces consecutivos con aporte/nuevo reto.

Ejemplo A03: misma separación, cajas y muñeco; primero papel, registrar, después cartón, registrar antes de tocar el montaje. A10 retoma pregunta e ideas iniciales y pregunta qué pueden sostener y qué prueba les ayuda; si faltan registros, distingue memoria de observación actual. Los apoyos admiten señalar/mostrar en tres años. No se atribuyen resultados reales a niños ficticios.

Conteo de focos diarios: Indaga 6, Forma/movimiento/localización 3, Comunicación oral 3, Convive 3. Cuatro competencias de proyecto, 45 variantes de criterios diarios por edad. Se validaron 132 menciones de referentes oficiales de maestro/actividades contra IDs, textos, edades y huellas del catálogo; revisar pertinencia pedagógica sigue siendo distinto de validar pertenencia.

## Evidencia y comprobaciones ejecutadas

Raíz: `output/generador-documentos/secuencia-proyecto-v30/guide-v33/iteracion-01/`:

- `master.json`, `documents.json`, tres requests/responses y `usage.json`: fuentes de la prueba.
- `quality-checks.json`: diez organizaciones, revisión solo en día final, fechas/títulos/enlaces del maestro, criterios/evidencias presentes en Word, once documentos del ZIP equivalentes a exportaciones individuales (salvo metadatos core), estilos y arte intactos.
- `word/render-audit.json`: once Word, 42 páginas, cero fallos de render/cero palabras fuera de página; diez guías completas en una página. Últimas páginas: mínimo 127 palabras, con contenido curricular.
- Cinco hojas de contacto inspeccionadas completas; A01 página 3, A03 página 2 y A10 página 2 abiertas a tamaño individual. Render con LibreOffice empaquetado, no Microsoft Word de escritorio. Raíz corta `.local/guide-v33-approved` para evitar incidencia de rutas Windows.
- Ensayo de maquetación con textos idénticos y varias combinaciones de edades/competencias antes de cerrar diseño: un caso de tres edades/una competencia pasa de cuatro a tres páginas, sin suprimir texto. Es regresión de maquetación intermedia, no otra generación IA.

64 pruebas PASS en nueve archivos: planificación, ruta, preparación, guards, fidelidad, lotes, documentos, documento de actividad y persistencia/generación. Incluye recuperación durable y versiones históricas. Typecheck y build PASS; lint sin errores, con aviso React previo en diagnostic-generation-control.tsx. Logs privados `.local/guide-v33-final-tests.log`, `guide-v33-typecheck.log`, `guide-v33-lint.log`, `guide-v33-build.log`. Se actualizó una aserción anual obsoleta para comprobar títulos reales, nombres oficiales y IDs congelados, en lugar de frases retiradas de la plantilla; no se cambió el anual productivo.

## Activación y conservación

Sin trabajos docentes activos. Respaldo del almacén detenido: `.local/backups/guide-v33-before-activation`. Reinicio únicamente de variante local, launcher PID 4264; web 5185/API 8805 devuelven HTTP 200. Registro `.local/guide-v33-server.log`; no se copian secretos a documentación ni al repositorio.

Después del reinicio se comparó la instantánea previa: workspace y planes idénticos, los 16 ámbitos de chat idénticos (27 turnos), cuatro alumnos y los cuerpos de los 49 Word idénticos por SHA256. Recibo `.local/guide-v33-activation-preservation.json`. El proyecto de agua original no se presenta como corregido: las mejoras se aplican a futuras generaciones y al ejemplo aislado.

Rollback: volver a emitir el contrato/prompt anteriores para preparaciones futuras, conservando lectores de planning V2/V3 y presentación 2/3 para las fuentes ya guardadas. No borrar almacenes ni restaurar un respaldo sobre datos nuevos automáticamente. No hay migraciones de datos en V33. Para revertir maquetación futura, mantener la elección de presentación en la confirmación de fuentes; no retocar el histórico.

Límite: los campos obligatorios, validadores y pruebas evitan omisiones estructurales conocidas. Una prueba real positiva no garantiza toda decisión pedagógica futura ni ausencia de fallos externos; no se declara certificación MINEDU. El control de contexto, la secuencia y la revisión humana siguen siendo necesarios.
