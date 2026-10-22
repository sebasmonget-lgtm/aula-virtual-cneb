# Tutorial horizontal de Ayni Aula

## Alcance autorizado

La persona usuaria solicita rehacer el tutorial mediante navegación secuencial y grabación real de computadora en horizontal. Autoriza expresamente borrar, sin crear respaldo, el contenido de la cuenta habitual de QA. Los fallos se documentan y el recorrido continúa. Aclaración posterior: solicita poder ocultar/mostrar el reloj QA mediante código y una combinación de teclas. Esa mejora queda autorizada en local; no se ha solicitado todavía su publicación.

Sitio: https://ayni-aula-qa-20261019.vercel.app/. Producción queda fuera del alcance. Cuenta habitual comprobada por su aula CELESTE, docente Elena y UUID interno terminado en 357bf2.

## Reinicio comprobado

Reinicio administrativo acotado a la base QA `lqrkhdjdxcejyamzrwoi`: ensayo transaccional con rollback y ejecución posterior correctos. Se eliminan 1149 filas propias en 40 tablas y 17 archivos propios. Se preservan Auth, RLS, catálogos y las demás cuentas mediante comparación de huellas antes y después. No se crea respaldo del contenido eliminado. Los recibos guardan esquema, conteos y huellas; no son una copia recuperable de los datos borrados.

Recibos privados sin publicar en `.local/tutorial-horizontal-20261021`. El acceso se conserva para empezar nuevamente por la configuración del aula. Comprobación visual realizada: formulario «Crea tu salón» vacío, sin estudiantes ni configuración anterior. Fecha de inicio de demostración preparada en 16 de marzo de 2026, fuera de las tomas finales.

## Grabación y entregables

En curso. Se comprueba primero un tramo corto con Snagit instalado. Mantener navegador, zoom y encuadre de computadora constantes. La edición visual precede a la narración femenina en español. Se requieren MP4, SRT, narración, guion con tiempos y montaje editable. No declarar el tutorial terminado hasta revisar exportación y contenido completos.

## Incidencias del producto

Ninguna incidencia nueva comprobada hasta este punto. Registrar aquí síntoma, pasos, alcance, causa conocida o indeterminada, alternativa usada para continuar y estado, sin corregir aplicación durante la grabación.

## Incidencias de la herramienta de grabación

- El selector de ventana de Snagit permanece superpuesto al navegador. La herramienta de control enumera la ventana principal pero no la superficie de selección; al intentar seleccionar Chrome rechaza la entrada porque el punto pertenece a Snagit. Reabrir Snagit y los atajos dirigidos a sus ventanas enumeradas no liberan la selección. Se solicita una pulsación física de Escape. Es un límite de automatización del grabador, no un fallo comprobado de Ayni.
- Prueba de captura FFmpeg/GDI de la ventana Chrome: archivo 1920 × 1080 a 30 fps, imagen negra; descartado. La captura del escritorio conserva resolución y texto, pero mientras siga el selector registra su imagen congelada y varios punteros. También descartada. No se presentan estos archivos como tramo aceptado ni se sustituyen por un montaje de capturas.

## Costos y validación

Todavía no se han solicitado nuevas generaciones pedagógicas ni de voz para este tutorial. No hay despliegues por este trabajo.

## Atajo solicitado para ocultar el reloj

Cambio mínimo en `qa-clock-control.tsx`: Ctrl + Alt + Q alterna la visibilidad del control. Un botón visible permite ocultarlo y explica cómo recuperarlo. La preferencia se conserva en sessionStorage de esa pestaña, incluido tras recargar; no cambia cookies del reloj, fechas pedagógicas, API, autenticación, datos ni permisos. El listener solo se instala cuando el servidor devuelve un reloj QA válido. Se evita mostrar texto del reloj durante la carga inicial cuando todavía no se conoce la preferencia; una comprobación fallida continúa mostrando el error.

Prueba funcional en navegador sobre el componente real con un endpoint local simulado, sin conectar datos de aulas: ocultar mediante teclado, consultar la fecha pedagógica todavía activa (16/03/2026), recargar y conservar ocultamiento, mostrar otra vez desde un campo en edición sin perder su contenido y ocultar mediante botón. Correcto. Captura privada `reloj-oculto-verificado.png`. Esta prueba no acredita publicación ni funcionamiento en el alias cloud actual.

Typecheck correcto. Lint correcto, con la advertencia histórica de dependencias en `diagnostic-generation-control.tsx`. Build canónico Vinext correcto. La primera iteración de lint rechazó inicializar estado directamente desde un efecto; se trasladó la lectura de preferencia al callback asíncrono de la comprobación ya existente y se repitieron las validaciones.

Rollback: revertir únicamente la mejora de visibilidad. No hay migraciones ni datos que restaurar por ese cambio. La persona usuaria autoriza expresamente publicar solo en QA y continuar el video. Publicación y smoke en curso; Producción fuera de alcance. El video permanece pendiente; los clips de comprobación descartados no son un tutorial entregable.
