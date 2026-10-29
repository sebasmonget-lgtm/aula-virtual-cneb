# Prueba completa de animales V35

2026-10-28. Solicitud: generar un proyecto con Ayni y revisar si cumple los requisitos acordados. Almacenes QA aislados; no crear ni regenerar proyectos de la profesora. Contexto de prueba preparado como mensajes sintéticos; maestro y diez actividades generados con IA real mediante las funciones, cola y proveedores productivos. No se presenta como prueba manual de clicks ni del chat anual.

## Resultado pedagógico revisado

Proyecto «¿Qué descubrimos de los animales que conocemos?», aula LILA/Jardín de Prueba, 3/4/5 años, cuatro alumnos ficticios, diez días. Foco creado desde interés general, sin entregar un episodio: cómo se mueven los animales conocidos y qué partes utilizan. La situación es concreta, en pasado, marcada una sola vez como «Situación de partida propuesta.»; no se confunde con un registro real. Los niños pueden modificar pregunta/animales al planificar.

Lectura completa del maestro, los diez desarrollos y sus criterios/evidencias. Cumple:

- A01 construye el plan completo con los niños: preguntas, experiencias, materiales, conservación de información y cómo compartirla. No se limita a decidir la primera actividad.
- Secuencia: planear → observar un animal → consultar una duda → comparar con otro → agrupar/contar partes visibles → buscar otros movimientos del mismo animal → revisar una idea con información nueva → contrastar ideas y registros → elegir información que comunicar → revisar y compartir respuestas provisionales. Nueve enlaces consecutivos correctos.
- Las consultas/observaciones reaparecen con objetivos distintos. A03 responde una duda del primer registro, A06 busca otra manera de moverse y A09 selecciona información para comunicar. A07 verifica una idea y A08 compara la información acumulada. No son diez actividades aisladas ni la misma tarea con otros títulos.
- Materiales y acciones están expresados como guía para actuar, con organización de una profesora/cuatro niños y decisiones infantiles. Diez campos de organización y revisión de proyecto únicamente en la última fecha.
- Cierre A10 compara qué pensaban con lo observado/consultado, pide apoyo para la respuesta y admite conclusiones provisionales. Distingue recuerdos de registros disponibles.
- Tres competencias explícitas: Indaga en ocho actividades, Lectura en tres y Cantidad en una. Son focos de experiencias, sin cuota MINEDU de frecuencias iguales. Cantidad sirve a la comparación, no se añade a todas las actividades por relleno.
- 36 variantes diarias por edad y nueve del maestro: 45 en total. Apoyos de tres años admiten gestos/señalamientos, sin exigir exposición o comparación verbal. Conteo de 4/5 años se ajusta a hasta cinco/diez, sin obligar a llegar al máximo ni exigir numerales escritos.
- 72 menciones de referentes oficiales válidas por ID, edad y texto. Indaga 4/5 del maestro incluye comparación/comunicación; A01 selecciona preguntas/acciones, A03/A08 seleccionan comparación y A10 comparación/comunicación. Cuatro menciones diarias pertenecen al catálogo autorizado pero quedan fuera del array del maestro: prueba real de selección independiente funcionando.
- Observaciones y resultados reales permanecen vacíos. No se asignan niveles ni se inventan logros.

**Pendiente expresamente aplazado por el usuario:** recursos informativos. Libros, textos/secuencias ilustradas y alternativas preparadas a mano se prevén, pero el paquete no proporciona todas esas fuentes listas. No se aprueba ese punto como resuelto. La revisión no equivale a una certificación administrativa MINEDU ni a una garantía de toda generación futura.

## Fallos encontrados y correcciones generales

1. **Patrones de idioma duplicados.** Un recorrido sobre objetos compartidos del esquema anteponía anclas varias veces y el decodificador devolvía salida vacía. WeakSet e idempotencia evitan duplicaciones en maestro/actividad/lote. A/B técnico y detalles en `VALIDACION_REAL_V34_Y_ESQUEMA_COMPARTIDO.md`.
2. **Competencias/edades repetidas en el maestro.** El array con anyOf permitía tres familias que fueran dos veces Indaga y una Lectura, con edades repetidas para incluir más referentes, dejando fuera Cantidad. Nuevo formato privado por claves de competencia y edad obliga a una entrada por identidad autorizada. Se traduce a las listas canónicas del dominio al recibir; no se fusionan duplicados ni se inventan entradas. El esquema respeta las edades autorizadas de las oportunidades anuales. La selección de referentes por actividad sigue limitada al catálogo de su competencia/edad. Compatible con fuentes anteriores y respuestas privadas antiguas en lista.
3. **Fase de creación obligatoria.** El validador rechazaba una investigación que culminaba comunicando porque no tenía la etiqueta create_or_try. Ahora admite probar/crear o comunicar además de explorar/investigar, planificar y cerrar; no obliga a fabricar un producto. Mantiene controles de fechas, posiciones, acciones, enlaces y cobertura.
4. **Nombre técnico de esquema demasiado largo.** El nuevo nombre tenía 69 caracteres. La API admite 64; el proveedor conserva nombres cortos y normaliza los largos con prefijo y hash estable, sin perder distinción. Regresión incluida. El SDK instalado documenta el límite en resources/responses/responses.d.ts; no se cambian modelos ni se añaden reintentos automáticos.
5. **Guía partida y registro solo.** En presentación 3, A10 continuaba el cierre en otra página y dejaba una última de 40 palabras de registro/referencias. La comprobación automática anterior solo buscaba encabezados, lo cual no bastaba. Se cambia la QA para comprobar los textos completos de Inicio/Desarrollo/Cierre. Presentación nueva 4 ajusta espacios/interlineado y agrupa enfoques con el currículo antes de condiciones, conservando tamaño de letra, estilos y arte. Las presentaciones anteriores mantienen su salida.

## Generación real y revisión Word

Fuentes reales completas: `output/generador-documentos/secuencia-proyecto-v30/validacion-real-v35/iteracion-02/`. Tres creaciones: maestro+primera actividad, lote de cinco, lote de cuatro. Coste registrado de esta ronda USD 0.4510255. Conserva requests/responses, master, documents y usage. Los intentos anteriores fallidos están separados: V34 rondas 01/02 sin contenido, V34 ronda 03 con maestro rechazado y V35 ronda 01 con nombre largo. No se afirma que la prueba inicial pasara sin incidencias ni que solo hubiera tres peticiones en todo el diagnóstico.

La presentación 4 se verificó reutilizando exactamente esas tres respuestas en otro almacén QA mediante la misma confirmación productiva, sin nuevas llamadas IA ni retoques de contenido pedagógico. Esto evita editar fuentes confirmadas. Un intento de cambiar metadatos de la primera copia QA fue rechazado por su protección de integridad y se revirtió por transacción; no se desactivaron triggers. La copia final usa registros nuevos y sus fingerprints válidos.

Entrega final: `output/generador-documentos/secuencia-proyecto-v30/validacion-real-v35/iteracion-03/`:

- Once Word: proyecto seis páginas, actividades tres/cuatro; 38 páginas en total, frente a cuarenta antes del ajuste. A10 pasa de cuatro a tres; proyecto de siete a seis.
- Diez guías completas en una página, comprobando el texto íntegro de los tres momentos, no solo encabezados.
- Cero errores de render/cero palabras fuera de página. Sin página de solo registro/referencias; sin advertencias del control de maquetación.
- Cinco contactos completos inspeccionados y A10 páginas 2/3 abiertas individualmente. LibreOffice empaquetado, no Word de escritorio.
- styles.xml y todos los recursos gráficos de las plantillas originales idénticos. Criterios/evidencias presentes íntegramente; prosa sin residuos de otros alfabetos.
- ZIP con once Word equivalentes a exportaciones individuales, salvo timestamps core.
- Comparación de contenido semántico con la generación real: idéntico al omitir únicamente versión de presentación y UUIDs de linaje/criterios de la copia QA. No se redactaron actividades nuevas desde Codex.

Evidencia: `quality-checks.json`, `documents.json`, `master.json`, `word/render-audit.json`, cinco contactos y ZIP en la carpeta final. Las métricas de IA se leen de la ronda real 02; la ronda de presentación no cobra nuevas creaciones.

## Pruebas, activación y límites

Pruebas finales y conservación se registran al terminar la activación local. Se preserva como línea base la instantánea `.local/qa-real-v34-activation-before.json`: cuatro alumnos, 32 turnos y sesenta cuerpos Word. No hay publicación remota ni migraciones.

Rollback: conservar lectores de presentación 2/3/4, selección de referentes política 2 y adaptador de listas/objetos para las fuentes o trabajos ya creados. Para futuras generaciones puede revertirse la emisión de formatos nuevos sin eliminar soporte de lectura. Nunca quitar la marca curricular de una fuente con referentes diarios independientes ni sobrescribir datos docentes con un backup de QA.


### Cierre validado y activado
87 pruebas PASS en once archivos, typecheck/build PASS y lint sin errores con el aviso React anterior. La prueba focalizada adicional de seis casos confirma también el filtro de edades autorizadas. Logs `.local/validacion-real-v35-delivery-*.log`. La presentación 4 conserva estilos, tamaño de letra y arte; la QA verifica texto íntegro de los momentos, no solamente sus encabezados.

Activado únicamente en variante local, launcher 9476, con respaldo `.local/backups/qa-real-v35-before-activation`. Tras el reinicio: workspace/planes idénticos, 16 ámbitos de chat/32 turnos idénticos, cuatro alumnos y sesenta cuerpos Word idénticos por hash. Recibo `.local/qa-real-v34-activation-preservation.json`. Web 5185 y API 8805 HTTP 200.

Veredicto final: la prueba de contenido y Word cumple los requisitos revisados; sigue pendiente la provisión de lecturas/imágenes que el usuario aplazó. No se cambió el proyecto P09 ni otro documento docente.
