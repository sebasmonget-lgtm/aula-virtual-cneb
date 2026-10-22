# Tutorial horizontal de Ayni Aula

## Alcance autorizado

La persona usuaria solicita rehacer el tutorial mediante navegación secuencial y grabación real de computadora en horizontal. Autoriza expresamente borrar, sin crear respaldo, el contenido de la cuenta habitual de QA. Los fallos se documentan y el recorrido continúa. Posteriormente autoriza publicar únicamente en QA el atajo para ocultar el reloj, usar un logo genérico y completar por código los registros repetitivos. Solicita movimientos y desplazamientos pausados y conservar consumo.

Sitio: https://ayni-aula-qa-20261019.vercel.app/. Producción queda fuera del alcance. Cuenta habitual comprobada por su aula CELESTE, docente Elena y UUID interno terminado en 357bf2.

## Reinicio comprobado

Reinicio administrativo acotado a la base QA `lqrkhdjdxcejyamzrwoi`: ensayo transaccional con rollback y ejecución posterior correctos. Se eliminan 1149 filas propias en 40 tablas y 17 archivos propios. Se preservan Auth, RLS, catálogos y las demás cuentas mediante comparación de huellas antes y después. No se crea respaldo del contenido eliminado. Los recibos guardan esquema, conteos y huellas; no son una copia recuperable de los datos borrados.

Recibos privados sin publicar en `.local/tutorial-horizontal-20261021`. El acceso se conserva para empezar nuevamente por la configuración del aula. Comprobación visual realizada: formulario «Crea tu salón» vacío, sin estudiantes ni configuración anterior. Fecha de inicio de demostración preparada en 16 de marzo de 2026, fuera de las tomas finales.

## Grabación y entregables

MP4 exportado de 15:55, ocho capítulos, 1920 × 1080 a 30 fps. Grabación real de escritorio, encuadre constante y acciones a velocidad original; cortes de esperas idénticas. Banda editorial fija de 70 píxeles sobre el aviso superior del navegador. Narración femenina española reutilizada, subtítulos separados e incorporados como pista opcional. Se entregan narración, guion con tiempos, montaje JSON, fuentes, medios limpios y script reproducible. Salida: `outputs/Ayni-video-horizontal-2026-10-21`. Decodificación completa de 955 segundos sin errores; cien subtítulos monotónicos y segmentos de voz sin solapamiento. Se inspeccionaron visualmente 75 muestras distribuidas por el recorrido, además de las revisiones de tomas. El muestreo automático no detectó pantallas oscuras ajenas a la aplicación; las tomas nativas tapadas se descartaron antes de editar.

## Incidencias del producto

- Fotografía en observación cotidiana: el API guarda los adjuntos sintéticos, pero la tarjeta de observación guardada consultada en pantalla presenta texto y competencias, sin miniatura. Causa no investigada en este recorrido. Se conserva la procedencia sintética y no se promete análisis de la foto. Pendiente de revisar; sin cambio de aplicación.
- Historial cotidiano: «Ver observaciones» presenta una lista global acotada; con muchos registros no aparecen los anteriores de un niño. La vista consultada usa los primeros veinte registros del historial. Se continuó con la cronología de evidencias de Evaluar y los documentos. Pendiente de revisar navegación/filtro; los registros se conservaron.
- La propuesta anterior se ve en «Otras propuestas», mientras que al entrar en «Crear otro proyecto» la biblioteca del diálogo puede indicar que no hay alternativas. Causa indeterminada. Se verificó la conservación real de la propuesta y se continuó; sin corrección durante el video.

## Incidencias de la herramienta de grabación

- El selector de ventana de Snagit permanece superpuesto al navegador. La herramienta de control enumera la ventana principal pero no la superficie de selección; al intentar seleccionar Chrome rechaza la entrada porque el punto pertenece a Snagit. Reabrir Snagit y los atajos dirigidos a sus ventanas enumeradas no liberan la selección. Se solicita una pulsación física de Escape. Es un límite de automatización del grabador, no un fallo comprobado de Ayni.
- Prueba de captura FFmpeg/GDI de la ventana Chrome: archivo 1920 × 1080 a 30 fps, imagen negra; descartado. La captura del escritorio conserva resolución y texto, pero mientras siga el selector registra su imagen congelada y varios punteros. También descartada. No se presentan estos archivos como tramo aceptado ni se sustituyen por un montaje de capturas.
- Un diálogo nativo «Guardar como» quedó por encima de Chrome tras descargar el diagnóstico. El control DOM siguió navegando por debajo y varias tomas de escritorio quedaron tapadas. Se detectó al inspeccionar los fotogramas, se cerró el diálogo y se descartaron las tomas afectadas. Los tramos posteriores se regrabaron consultando datos ya guardados para evitar duplicarlos. Los ejemplos iniciales completos de entrevista y observaciones libre/guiada sí conservan escritura y guardado visibles.
- La descarga Excel se completó resolviendo el diálogo fuera de toma con el teclado. Se comprobó el archivo local real. No se cambió configuración ni permisos del navegador.
- Una llamada del arnés para iniciar otra actividad falló después de completar las asistencias repetidas. No se conservó causa suficiente para atribuirla al producto. Solo se declara realizada la jornada confirmada por UI; las otras siete actividades permanecen preparadas y sus observaciones guardadas.

## Costos y validación

Lectura final del ledger de esta cuenta reiniciada: 92 eventos pedagógicos registrados, USD 0,586032897 de costo conocido y cero eventos sin precio registrado. No es una factura ni incluye los tokens de esta conversación o el costo histórico de la voz reutilizada. Cero llamadas TTS nuevas. El único despliegue de esta solicitud fue el atajo del reloj en QA; no se publicaron las incidencias encontradas ni cambios en Producción.

## Atajo solicitado para ocultar el reloj

Cambio mínimo en `qa-clock-control.tsx`: Ctrl + Alt + Q alterna la visibilidad del control. Un botón visible permite ocultarlo y explica cómo recuperarlo. La preferencia se conserva en sessionStorage de esa pestaña, incluido tras recargar; no cambia cookies del reloj, fechas pedagógicas, API, autenticación, datos ni permisos. El listener solo se instala cuando el servidor devuelve un reloj QA válido. Se evita mostrar texto del reloj durante la carga inicial cuando todavía no se conoce la preferencia; una comprobación fallida continúa mostrando el error.

Prueba funcional en navegador sobre el componente real con un endpoint local simulado, sin conectar datos de aulas: ocultar mediante teclado, consultar la fecha pedagógica todavía activa (16/03/2026), recargar y conservar ocultamiento, mostrar otra vez desde un campo en edición sin perder su contenido y ocultar mediante botón. Correcto. Captura privada `reloj-oculto-verificado.png`. Esta prueba no acredita publicación ni funcionamiento en el alias cloud actual.

Typecheck correcto. Lint correcto, con la advertencia histórica de dependencias en `diagnostic-generation-control.tsx`. Build canónico Vinext correcto. La primera iteración de lint rechazó inicializar estado directamente desde un efecto; se trasladó la lectura de preferencia al callback asíncrono de la comprobación ya existente y se repitieron las validaciones.

Rollback: revertir únicamente la mejora de visibilidad. No hay migraciones ni datos que restaurar por ese cambio. La publicación QA y sus smoke checks se completaron como se detalla a continuación. Producción fuera de alcance. Los clips de comprobación descartados no forman parte de la entrega.

## Publicación y avance comprobado

Atajo publicado solo en QA: abfc507135c60f99776e3ac844b848d487c626f5, deployment dpl_EbWGK1E3RkhMWMuwX7bvSSZEvVPW. Dieciocho smoke checks staging/alias correctos, 66 huellas de fuentes preservadas, Producción conserva dpl_B4ccwivp6ZtpbsiGKLYwPm767fAk. Reloj oculto por teclado y preferencia conservada tras recargar el alias. El helper Git antiguo faltaba; el push se completó con el CLI instalado y autenticado, sin modificar configuración global ni imprimir claves.

Aula nueva Jardín Brisas, Elena Vargas Medina, CELESTE, cinco años, 2026. Logo escolar genérico guardado por API canónica: la extensión del navegador rechazó acceso a archivos locales. No se cambian permisos de la extensión. Primer niño grabado por UI; nueve altas repetidas y fechas completadas por API. Nueve entrevistas preparadas por API y una completada/confirmada en la toma. Libre de Abril: sugerencia real de Convivencia, revisada y guardada. Guiada de Valentina: criterio y competencia Identidad visibles, guardado real. Repeticiones completan 51 libres y diez guiadas; dos fotos sintéticas de objetos corresponden a las situaciones descritas y su procedencia se conserva. No son evidencias reales de menores.

Avance de demostración anunciado del 16 al 27 de marzo. Anual de quince propuestas, un intento, desde 03:38:57 hasta 03:43:14 UTC (aproximadamente 257 s), confirmado por UI. Se conservan materiales disponibles, patio pequeño, ausencia de salidas/compras familiares y participación voluntaria. Diagnóstico revisado, corregido, confirmado y descargado; el Word conserva «Usaremos cajas y tapas del aula».

Grabación continua real con FFmpeg/GDI de escritorio, 1920 × 1080 y salida CFR 30 fps. Se conserva el área de aplicación sin cambios de zoom ni ampliaciones parciales. La banda editorial excluye el aviso de depuración; el reloj QA se oculta antes de grabar. Se descartan el comienzo con Codex y todas las tomas tapadas. Los medios incluidos en el editable contienen únicamente tramos limpios. Los desplazamientos nuevos se hicieron con pasos cortos y pausas; se conservan las entradas visibles de la grabación y no se añade un cursor simulado. La preferencia subjetiva sobre su naturalidad queda para revisión de la persona usuaria.

## Resultado funcional final

Quince propuestas anuales, con «Sombras que cambian en la pared» en el segundo tramo y la anterior conservada. Primer proyecto completo: ocho actividades preparadas para ocho días lectivos, respetando feriados. Jornada del 30 de marzo realizada por UI con asistencia variada, observación guiada, libre de reparto con sugerencia real de Cantidad y reflexión guardada. Las tomas de reemplazo consultan lo ya guardado; no se vuelven a generar propuestas para repetir una toma.

Las repeticiones autorizadas aportan observaciones y asistencia de un periodo ficticio. Se elige B en el ejemplo UI y se guardan por API las restantes valoraciones conservadoras del escenario, con justificaciones explícitas sobre el alcance parcial observado. No se presentan como decisiones reales sobre menores. Treinta valoraciones y conclusiones confirmadas, diez informes familiares guardados y cierre real confirmado por la interfaz. El ajuste docente de Joaquín y la propuesta de acuerdo familiar se conservaron.

Consulta final del servidor: 118 observaciones cotidianas, treinta valoraciones y conclusiones, diez informes guardados y cierre vigente (`closed: true`, `current: true`). Se preservan además las 61 observaciones iniciales y las 420 asistencias del escenario. El navegador queda en Documentos, con reloj oculto y fecha de demostración del 15 de mayo.

Descarga final: veintidós Word y un Excel. ZIP/XML válidos, datos de aula correctos, anual con la propuesta de sombras, diagnóstico con corrección docente y primera actividad con observaciones y reflexión. Excel descargado por UI, con treinta valores B cotejados. El archivo es referencia de Ayni y no una carga directa a SIAGIE. No se repitió una auditoría visual completa de las plantillas; se verificaron integridad y los contenidos relevantes para esta entrega.

Errores del arnés, no fallos comprobados de Ayni: un POST inicial de observación usó timestamp donde el contrato requiere fecha civil, fue rechazado sin guardar; se corrigió la llamada. Una escritura pausada superó el plazo de la herramienta, se comprobó el texto visible y se completó sin duplicar ni enviar dos veces. No se altera aplicación por esas incidencias.
