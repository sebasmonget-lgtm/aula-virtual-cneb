# Ruta diaria y materiales básicos — v27, 2026-10-27

## Alcance y causa

Se corrige Ayni, sin editar contenidos Word a mano. La situación parte del episodio comunicado por la docente e identifica niños, aula e institución. El primer día planifica el proyecto completo con los niños y los básicos del aula se presuponen. Solo variante independiente `codex/ayni-documentos-pruebas`; sin migraciones, publicación, commit ni cambios al checkout original. Los guardados no se regeneran.

El maestro anterior describía fases, pero no fijaba una entrada por fecha. Los lotes podían reiterar experiencias y posponer observar o actuar. Seleccionar únicamente referentes de cuidado de materiales estrechaba los criterios de convivencia. La política de recursos por confirmar limitaba los básicos innecesariamente.

## Solución en código y prompts

Solo los proyectos nuevos reciben planificación versión 3. `dailyRoute` guarda posición, fecha, título, propósito, etapa, acción, foco de evidencia, decisión infantil y competencias. Se valida orden/cantidad de fechas, títulos/acciones propios, cobertura del proyecto y oportunidades de explorar y probar/crear, además de planificar y revisar. Son decisiones de producto, no una lista obligatoria atribuida al MINEDU.

Las actividades reciben sus entradas del maestro. JSON Schema fija título, fecha y competencias, y hereda referentes validados; el servidor comprueba nuevamente su correspondencia antes de escribir. Los textos desarrollan la acción/evidencia del día. El validador estructural no mide toda similitud de significado ni sustituye revisión pedagógica. Versiones 1/2 y preparaciones anteriores siguen siendo legibles, sin backfill.

El primer día recupera saberes/preguntas, propone experiencias conectadas, organiza orden/materiales/ayudas y cómo registrar/revisar/compartir. Panel por construir con aportes reales, sin respuestas inventadas; maestro flexible ante esas decisiones. Un proyecto nuevo necesita al menos dos días; una selección contradictoria se rechaza antes de consumir IA, sin afectar preparaciones anteriores.

Papel, lápices, crayones, cartón limpio, goma/cinta escolar y recipientes limpios se permiten como `assumed_basic`, sin avisos en Word ni inventario previo. `confirmed` distingue disponibilidad expresamente confirmada y `to_verify` recursos/condiciones especiales. Una restricción explícita prevalece; no se asumen dispositivos, compras, salidas ni ayuda adicional.

## Dos iteraciones reales

Dos almacenes QA aislados, estudiantes ficticios de 3/4/4/5 años y una copia del tramo P02. El contexto de prueba describe niños que al llegar comentan basura cerca del colegio. No se usa ni modifica el chat docente en estas generaciones. El año QA y sus cuatro intercambios de contexto se preparan con fixture: cero llamadas anuales/chat pagadas. Se prueba IA real del maestro y actividades, no un nuevo diálogo real.

Cada ronda tiene tres llamadas: maestro/primer día, lote de cinco y lote de cuatro. Seis llamadas sin fallos ni reintentos automáticos. Word y ZIP proceden de los escritores/renderizadores de la aplicación.

| Ronda | Revisión | Tiempo de proveedor acumulado | Coste registrado estimado USD |
|---|---|---|---|
| 1 | Maestro y 10 actividades; ruta concreta. Detecta convivencia aún centrada en útiles y básicos marcados confirmados. | 289606 ms | 0.1520176 |
| 2 | Planificación/acuerdos según edad y básicos asumidos; observación, contraste, prueba, cuidado, escritura y revisión. Maestro y 10 actividades completos. | 337022 ms | 0.1639031 |

Total: 141810 tokens de entrada, 40370 de salida y coste estimado USD 0.3159207. El segundo maestro tarda 227576 ms y sus lotes 63601/45846 ms; no se promete duración fija.

La segunda ruta diferencia: planificar; observar y registrar; contrastar ideas con registros; probar ubicaciones de un recipiente; poner en práctica una acción; observar de nuevo y revisar; escribir mensajes; probar su comprensión; compartir una práctica; revisar y recoger próximas preguntas. Retomar una acción con otra finalidad permite progresión, sin repetir diez veces una preparación.

Se comprueban 10 fechas/títulos/focos por ronda y los referentes heredados por competencia/edad (31 menciones primera, 96 segunda; no son aprendizajes logrados). Se leen situación, momentos y criterios/evidencias de las 20 actividades. No se dan por observadas respuestas/resultados infantiles.

Evidencias: `output/generador-documentos/revision-p02-ruta-v27/iteracion-01/` y `iteracion-02/`: solicitudes/respuestas sin claves, maestro, documentos, uso, verificación, Word/ZIP. La entrega es `iteracion-02`.

## Presentación y validación

Misma Poppins, papelería, ilustraciones, colores y estilos originales. Solo versión 3: portada diaria sin propósito duplicado, guía junta, ruta del proyecto en dos columnas con acción breve por fecha, registro/referencias agrupados y apoyos del maestro sin partir cada párrafo entre páginas.

Veintidós Word, 96 páginas renderizadas: todas revisadas en hojas de contacto; guía de día 1 y situación revisadas también a tamaño individual. Cero errores de render o texto fuera de página. Inicio/desarrollo/cierre completos en una página de contenido. Maestro de ocho páginas y actividades de cuatro, incluyendo portada, apoyos, evaluación/referencias: no se afirma reducir el total. El ajuste final de continuidad de apoyos vuelve a renderizar el maestro de entrega sin cambiar textos.

Sesenta regresiones PASS: API una edad/multiedad, reanudación, aislamiento, referentes, ruta y estilos. Se actualizan expectativas antiguas de ruta y una fixture de dos días; los primeros fallos se conservan en logs, no se declaran éxitos. Typecheck, lint y build ejecutados; lint conserva un aviso React previo, sin errores. Las verificaciones posteriores del ajuste de paginación quedan en logs finales v27.

Activación en mismo almacén `generador-prueba-chat-20261027-reinicio`, con respaldo previo. Comparación exacta de workspace, planes y ambas conversaciones; hashes del cuerpo XML de los 11 Word docentes iguales. Cuatro alumnos, quince turnos y diez actividades intactos. Recibos privados `.local/project-route-v27-preservation.json`, `project-route-v27-user-before.json` y `project-route-v27-word-before.json`.

## Referencias, límites y reversión

Se conservan los referentes oficiales versionados del Programa Curricular de Inicial y la planificación flexible de la guía MINEDU ya revisada. No se presenta un formato único obligatorio ni un número de páginas prescrito.

- https://repositorio.minedu.gob.pe/handle/20.500.12799/6518
- https://www.minedu.gob.pe/curriculo/pdf/programa-curricular-educacion-inicial.pdf

Las dos rondas verifican un caso de entorno/cuidado, no todos los temas. Se mantiene manejo de interrupciones/recuperación, sin promesa de ausencia absoluta de fallos de proveedor o de calidad semántica.

Los datos no requieren reversión porque no se reescriben. Puede retirarse `planningVersion:3` de nuevas preparaciones y su schema asociado; mantener lectores de versión 3 si existen proyectos nuevos guardados. Recuperar respaldo solo ante incidencia comprobada, servidor detenido y preservando trabajo docente posterior.

Cierre final: trece comprobaciones de Word/estilos repetidas tras el ajuste de continuidad PASS; typecheck, lint (cero errores, un aviso React previo) y build finales completados. Maestro final re-renderizado e inspeccionado con los apoyos completos en página 7. ZIP cotejado con los once Word exportados, 48 páginas sin texto fuera de página. Launcher final 26744, web/API operativas y segunda comparación de datos y once cuerpos Word idéntica; respaldo anterior conservado.
