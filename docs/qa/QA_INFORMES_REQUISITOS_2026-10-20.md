# Requisitos de informes y continuidad de evaluación · 20/10/2026

Solicitud: impedir informes antes de terminar la evaluación, quitar navegación repetida, agilizar guardado y completar las notas restantes de la cuenta QA.

## Comportamiento

- Evaluar moderno abre directamente el bimestre de la fecha, con selector manual y pestañas Evaluación / Informe a familias / Consolidado. El recorrido histórico conserva compatibilidad.
- Informe a familias presenta «Primero termina la evaluación del bimestre», una frase y botón de regreso. No monta el generador mientras el servidor no declare ready.
- Se requieren valoraciones actuales y conclusiones vinculadas a esas valoraciones en todos los pares con fuentes. Para los informes se necesita también texto de AD; el cierre formal conserva su regla previa. Sin evidencia no obliga a poner nota. No se exige haber cerrado el bimestre para redactar informes.
- El servidor revalida fuentes al generar/guardar lotes. La ruta individual para bimestres/trimestres también valida todo el aula; omitir periodId no evita el requisito si las fechas coinciden. Los informes históricos de intervalos sin tipo formal mantienen compatibilidad.

## Guardado

La transacción conserva autorización, revisión, huella de evidencias, bloqueo de período, archivo de versiones anteriores, invalidación del informe y evento docente. Invalida el snapshot derivado bajo el mismo bloqueo de refresco. La ficha del niño reconstruye ese snapshot a partir de fuentes actuales; ningún consumidor utiliza su payload como fuente canónica. No hay tarea de nota sin esperar ni reintento ciego. El siguiente alumno solo aparece tras acuse canónico.

Baseline real QA: tres POST de guardado de la versión81b9c2a tardaron6254/6259/6252ms; las lecturas de ficha tardaron4489/2914/2903ms. No comparar esos tiempos con los mocks locales. La medición posterior Preview queda en .local/evaluar-informes-20261020/grades-saved.private.json y el resumen de entrega, sin publicar nombres ni secretos.

## Datos y validación

Baseline leído:10 niños,140 observaciones,260 atribuciones,430 asistencias,120 análisis listos y10 notas docentes de Lectura. La persona usuaria autoriza completar las demás notas. Selección manual tras leer los120 análisis:110 pendientes,94 A y16 B; se conservan las10 originales sin modificación. Tres notas del plan se guardan por la API anterior para medir baseline. El resto usa la API autenticada y sus controles. No se generan nuevas observaciones, no se regeneran análisis, no se envían medios ni se usa IA para elegir notas. Las conclusiones e informes permanecen para la revisión docente posterior.

Comprobaciones ejecutadas/recibos: regresiones y funcionales de período/familia, typecheck, ESLint, builds Vinext y Next webpack. La evidencia final se contrasta en los logs del directorio local de entrega; los reintentos de fixtures incompatibles no se contabilizan como PASS. UI local real con API simulada verifica bloqueo, botón hacia evaluación y diseño escritorio/390px; detector sin incidencias. Capturas en outputs/evaluar-informes-20261020. Smoke de Preview y conteo final de notas se ejecutan después del commit y no sustituyen pruebas de interacción.

## Publicación y rollback

Solo Preview en el proyecto staging y base QA lqrkhdjdxcejyamzrwoi; alias ayni-aula-qa-20261019.vercel.app. Producción queda en dpl_H19YWzRdGjkgh8y72QAd1qBty7Mf /9a0920230350cd6b9050f35683a1f35d459e78c7. Commit limpio, push, build remoto y smoke antes de mover el alias.

Rollback de código: revertir este commit o restaurar el alias a la Preview81b9c2a, sin tocar notas ni análisis. No hay migración. La caché eliminada es derivada y se reconstruye al abrir la ficha. Las notas QA son versiones canónicas editables desde Corregir valoración; conservar los IDs previos y el plan/recibos privados para revisar las decisiones añadidas.


## Optimización adicional validada

La primera medición HTTP no demostró mejora consistente tras invalidar la caché:5857/7965/6682ms (~6835ms), frente al baseline~6255ms. No se declara esa ronda más rápida. Se identifican y corrigen dos tramos adicionales: carga global de notas/borradores en la ficha individual y lectura/reenvío de todo el historial de eventos.

La proyección individual mantiene los mismos datos/snapshots de su par, sin datos de otros niños o competencias. La ausencia de registros vuelve a las reglas de alcance del aula. El evento se añade mediante un solo upsert JSONB y conserva reapertura y secciones ajenas, incluso con eventos concurrentes. El contexto derivado sigue invalidado transaccionalmente y reconstruido en la ficha.

Benchmark real con PostgreSQL temporal, mismo endpoint,3 pares por variante:antes3555/3540/3457ms y40 consultas; después2680/2682/2722ms y31 consultas. Media3517→2695ms (~23%). Excluye HTTP/Auth y refresco del snapshot; las seis notas se limitan a tablas temporales, no al aula QA.91 regresiones PASS, typecheck/lint/builds PASS. La verificación posterior de la Preview y la comparación HTTP de pares QA restantes se registran en recibos locales de entrega.

La población real de QA se concilia desde GET de cada par, con nivel/análisis esperados antes de conservar un acuse recuperado. Se registraron503 de sesión y400 de selectores al aumentar peticiones, sin causa SQL individual disponible; no se afirma que el llenado careciera de incidencias. Los recibos y conteo final deben demostrar120 pares activos únicos,10 notas originales con hash intacto, y conservación de observaciones/asistencias/análisis.



## Verificación de región

API del deployment97716be:regions=[iad1]. Host del pool QA:sa-east-1. Se prepara entrega con --regions gru1 (CLI63.1.2 lo soporta) para eliminar los viajes SQL entre Estados Unidos y Brasil. La selección se aplica únicamente a esta Preview, sin editar vercel.json ni configuración global de Producción. La prueba de smoke y la muestra de guardados deben confirmar región y comportamiento antes de mover el alias. No se atribuye toda la demora a este factor sin medición. Recibos de región y entrega en .local/evaluar-region-20261020. Rollback:alias al deployment previo, conservando los datos; desplegar de nuevo con iad1 si fuera necesario.

