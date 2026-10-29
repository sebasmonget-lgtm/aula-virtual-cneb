# Dos pruebas reales de coherencia secuencial

## Alcance y resultado

Petición posterior al maestro V4: comprobar dos generaciones y corregir si es necesario. Dos proyectos completos aislados, con cuatro estudiantes ficticios de 3, 4, 4 y 5 años: alimentación de catorce días y cuidado del entorno de diez. No se generan años ni chats reales nuevos. Los dos maestros y veinticuatro actividades se aceptan sin errores ni reintentos; siete llamadas reales y coste registrado estimado USD 0.366560000. Evidencia: output/generador-documentos/secuencia-proyecto-v30/verificacion-dos.

Alimentación conserva la intención de preparar y compartir, con una receta y alimentos listos autorizados expresamente en el contexto ficticio QA. Juego y preguntas → consulta de receta → prueba de mezcla → consulta del orden → servicio y organización → recordatorios probados → preparación real → recomendaciones y revisión. No atribuir esos recursos ni acuerdos QA a la usuaria.

Entorno parte de los comentarios de llegada sobre basura. Planificar → observar dos zonas → segunda mirada por una duda → comparación de condiciones con papel limpio → construir una alternativa → probarla durante una creación → escribir/revisar invitaciones → compartir y revisar. La acción concreta queda al alcance del aula; no se presenta como solución acreditada de la basura de las calles. Las dos observaciones tienen preguntas distintas; elaborar y revisar mensajes tienen un uso posterior reconocible.

## Hallazgo y corrección en Ayni

La lectura del primer lote de alimentación detectó una superposición parcial: el ensayo de servicio añadía cambiar participantes, dificultad prevista para otra fecha, sin concretar suficientemente el traslado con cuchara de mainAction. Causa: al detallar actividades se añadía un reto curricular general aunque el maestro distinguiera las acciones; progression declaraba continuidad sin reflejarla siempre en los momentos.

Se precisa DOCUMENT_GENERATOR_DAILY_ROUTE_RULES: ejecutar la acción central del día, retomar el aporte anterior dentro de inicio/desarrollo, reservar las dificultades de otras fechas y focalizar criterios sin exigir todo el alcance del referente cada día. Se mantiene contrato V4, lectores y versiones anteriores. El ajuste no añade llamadas de revisión al flujo normal.

Se regenera únicamente el lote de cinco actividades afectado mediante una llamada real adicional, en otro almacén QA. Maestro y otros dos lotes se reproducen desde respuestas previamente validadas, con cached_replay y sin atribuirles consumo nuevo; se recorre de nuevo el flujo de validación, guardado y exportación completo. No se hace un tercer maestro real ni se retocan Word a mano.

La respuesta revisada hace explícito trasladar agua con cucharas en el ensayo de servicio, consulta las preguntas iniciales al leer la receta y vincula la segunda lectura con la prueba de mezcla. Persisten habilidades de cantidad en varias experiencias: el ajuste mejora la diferencia entre procedimientos, no acredita ausencia absoluta de repetición. La prueba semántica se limita a estos dos casos; la validez de enlaces no garantiza por sí sola coherencia universal.

Llamada correctiva: USD 0.007129300. Total de esta petición: ocho llamadas reales, USD 0.373689300. Fuente final de alimentación: output/generador-documentos/secuencia-proyecto-v30/verificacion-dos-ajuste/iteracion-01. Se conservan todas las respuestas originales para comparar.

## Word y ZIP

Primera exportación: veintiséis Word/110 páginas renderizadas e inspeccionadas en trece hojas de contacto. Después del ajuste se renderizan de nuevo los cinco Word cambiados (19 páginas). Los diez restantes de alimentación conservan exactamente todas sus partes salvo fechas de docProps/core.xml; se reutilizan sus renders ya inspeccionados, con recibo render-reuse.json. Los documentos se exportan mediante Ayni, sin modificación editorial externa.

Conjunto final: alimentación quince Word/64 páginas, entorno once Word/48 páginas; 112 páginas. Guías con los tres momentos completos, tablas y papelería Ayni conservadas, sin texto fuera de página. Guías de prueba/servicio y ruta abiertas además individualmente. Existen todavía páginas breves de registro/referencias; no se declara reducción del total de páginas ni una auditoría de documentación institucional completa.

Ambos ZIP coinciden con las partes OOXML de los veintiséis Word individuales: 1018 partes comprobadas. verification-final.json y zip-verification.json registran conteos, ruta V4, fechas, competencias/edades y enlaces consecutivos.

## Gates, activación y conservación

Treinta y seis regresiones distintas PASS, repetidas tras la corrección sin contarlas dos veces. Typecheck, lint y build finales PASS; un aviso React previo sin errores. Logs .local/verificacion-dos-final-*. Herramienta QA ampliada con sufijo de ejecución, selección de caso y reproducción explícita por posición; sin reintentos automáticos. El cotejo inicial entre PowerShell y Node normaliza exclusivamente representaciones ISO del mismo timestamp, no contenido pedagógico.

Se activa el párrafo nuevo en la variante local, launcher 31584 y mismo almacén generador-prueba-chat-20261027-reinicio. Antes del reinicio no había trabajos queued/running. Respaldo propio verificacion-dos-before-activation. La usuaria había avanzado también P04 durante el trabajo: captura final de los dieciséis ámbitos conserva veinticinco turnos, no solo veinte anteriores. Workspace/planes, cuatro alumnos y veintiséis cuerpos Word idénticos antes/después; web HTTP 200. Recibo .local/verificacion-dos-activation-preservation.json. No se toca el checkout original ni se publica.

Reversión mínima: retirar el párrafo nuevo de las reglas diarias y reiniciar solo la variante; conservar lectores V4 y datos posteriores. No restaurar respaldos sobre trabajo docente nuevo. No commit, push ni despliegue.
