# Cincuenta observaciones y publicación QA

## Solicitud y datos

La usuaria autoriza commit, Vercel, capturas y al menos cinco observaciones por alumno de distintas competencias, incluyendo libres y guiadas. Añade revisar tiempos de tareas repetitivas. Se conserva la cuenta QA y la estética existente; no se generan niveles, diagnóstico ni Mi año.

Resultado comprobado en servidor: diez niños, exactamente cinco observaciones activas por niño, dos libres y tres guiadas. Total: veinte libres y treinta guiadas. Siete niños tienen información en cuatro competencias; Emilia, Mateo y Valentina en cinco. Los hechos son ejemplos sintéticos expresamente autorizados, repartidos entre el 15 y el 18 de diciembre por el reloj QA. No constituyen evidencia real ni suficiencia diagnóstica por cantidad.

La comparación individual verifica los cincuenta textos, alumno, competencia y fecha esperados. Los veinte originales siguen presentes. Se conservan trece archivos privados, incluidas las dos fotos generadas de flotación/puente; no se subieron nuevos medios ni cambió el consumo de IA. Entrevistas siguen en borrador y no se confirmó evaluación alguna.

## Hallazgo durante captura seguida y corrección

La verificación nominal completa detectó cuatro observaciones guiadas nuevas bajo un alumno distinto del esperado. Contar cincuenta textos no detecta ese error: tres alumnos tenían seis y tres tenían cuatro; otro intercambio se compensaba en el total. Los veinte registros originales estaban bien asociados.

La grilla se ordenaba otra vez cuando llegaba una actualización de cobertura. Durante la automatización rápida hubo movimiento de objetivos entre la selección y el registro. La solución conserva el orden al abrir el diálogo, aunque se actualicen los conteos; incluye «Guardar y registrar otro» y búsquedas. Al cerrar y volver a abrir, la prioridad se calcula de nuevo. No cambia criterio, competencia ni estilo visual.

Las cuatro asociaciones incorrectas se retiraron mediante la API canónica, conservando originales e historial, y se crearon sus reemplazos bajo el niño previsto con fecha y texto exactos. No se reasignaron filas mediante SQL ni se borró historial. La verificación final cuenta solo registros activos: cincuenta, cinco por cada alumno.

Nueva regresión comprueba que un cambio de conteos no reordena un selector abierto. Prueba funcional aislada: Alberto pasa de cero a uno mientras permanece primero; Carlos se selecciona después y su texto se guarda bajo su propio ID. Los dos pares alumno/texto se verificaron con el lector canónico. Typecheck, lint focal, Vinext y Next webpack PASS; veintiuna pruebas focales PASS, además de las treinta de la primera entrega. Se repetirán las treinta y una combinadas en el checkout limpio de publicación.

## Tiempos y mejora pendiente

Cuatro POST guiados medidos desde el cliente de QA: 640, 565, 590 y 603 ms; media 599,5 ms. `Server-Timing` informa 105,7–183,4 ms totales de servidor y 33,6–45,8 ms de actualización del contexto. No son medidas del tiempo humano para escribir, del dictado ni de cualquier red/dispositivo. Los retiros tardaron 241–868 ms. No se repitieron llamadas de IA para esta medición.

El código actual dispara tres lecturas de actualización en el contenedor y dos en la lista remontada después de un guardado guiado. Son cinco GET potenciales por registro, además del POST. Se propone compartir el resultado confirmado y consultar una sola proyección para reducir lecturas, conservando texto, historial, fotos y cobertura autorizada. No se implementa esa refactorización amplia sin medir el flujo completo. La corrección ya implementada evita que esas respuestas muevan los nombres durante la selección.

Desde esta revisión se registrarán tiempos y consultas repetidas en los próximos pasos del QA. Separar tiempo de captura, procesamiento y revisión; no llamar «rápido» a un proceso completo a partir de una sola petición.

## Publicación

Primera entrega: commit `0e4d2e67e39644840eac0312b44b27eb98fdf95a`, GitHub sincronizado y worktree administrado limpio, Preview `dpl_81116BWH5Y4hAryeeLuajnLucBVw` en gru1. Cuarenta y cuatro comprobaciones PASS entre Preview y alias, con veinte registros previos/trece archivos intactos y Producción `dpl_H19YWzRdGjkgh8y72QAd1qBty7Mf` preservada. Después se incorporaron los treinta ejemplos autorizados.

La corrección de orden requiere un segundo commit y la misma secuencia de staging/smoke antes del alias. Recibos de la primera entrega en `.local/guided-release-20261020/`; verificación nominal fuera de Git en `outputs/ayni-recorrido-20261020/verificacion-50-observaciones.json`. No incluir datos nominales, fotografías o credenciales en el repositorio.

Rollback de la corrección: volver al deployment anterior sin modificar observaciones ni historial. Preferir mantener la grilla estable; la versión previa puede mover objetivos durante la captura seguida. No tocar el archivo concurrente `ai-execution-router-v4.mjs` ni publicar su modificación sin terminar.
