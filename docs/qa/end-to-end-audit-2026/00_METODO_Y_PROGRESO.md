# Auditoría end to end de Ayni 2026

Inicio: 27 de septiembre de 2026, noche de Lima. Auditoría del producto existente, sin correcciones ni despliegue.

## Entorno y límites

- Aula de QA independiente, docente `d97b5d03-b64d-405e-9de5-ae6e407bf126`, datos PGlite nuevos en `.local/qa/end-to-end-audit-2026/pgdata`.
- UI `http://localhost:5175`, API local `http://127.0.0.1:8790`. El aula de la usuaria en 5173/8788 no se reinicia ni modifica.
- Las migraciones originales incluyen un ejemplo histórico para otra identidad. No se usa, copia ni transforma ese ejemplo. La identidad de QA empieza sin perfil, aula, estudiantes ni documentos.
- Los archivos de recursos son compartidos por el servidor original, pero las nuevas referencias son UUID y están autorizadas por docente. No se borran recursos existentes.
- Todo dato pedagógico se ingresa por pantallas. Lectura interna posterior solo para reconciliación y diagnóstico. El export local está habilitado únicamente en la API de QA, sin origen web y en loopback.
- Capturas, exportaciones, logs y scripts de auditoría permanecen en esta carpeta o en `.local/qa/end-to-end-audit-2026`. No se modifica código del producto.
- Una simulación no equivale a validación por una docente o especialista independiente. Los aciertos se contrastan con un ground truth diseñado antes del ingreso, no con respuestas del propio modelo.
- PASS: comportamiento y resultado comprobados. PARTIAL: resultado incompleto o con limitación. FAIL: resultado observado contrario al criterio. NO PROBADO: no ejecutado, nunca se presenta como éxito.

## Recorrido y resultado

1. Aislar entorno, guardar baseline y preparar ground truth.
2. Configuración, 15 alumnos y entrevistas.
3. Diagnóstico guiado y espontáneo, Jev real, grupo y prioridades.
4. Plan anual, calendario y exportación.
5. Proyectos, unidades, actividades y talleres; ejecución y evidencia.
6. P1: valoración docente, conclusiones, informes y consolidado.
7. Reajuste y recorridos P2, P3 y P4 con mejora, contradicción y evidencia escasa.
8. Cierre anual, documentos, UX responsive, integridad y costos.
9. Hallazgos y recomendaciones sin implementación.

## Registro

Auditoría cerrada con bloqueo reproducido en la confirmación del plan anual nuevo. No se completó el ciclo de cuatro períodos ni el cierre anual. Sí se completaron onboarding, 15 entrevistas, diagnóstico, Jev real, resumen y prioridades; se generó el borrador anual, se probaron las salidas independientes alcanzables y las barreras de evaluación sin evidencia de los cuatro períodos.

El estado exacto, costos, límites y diez acciones recomendadas están en `01_RESUMEN_EJECUTIVO.md`. La matriz no transforma pasos bloqueados en PASS. Las pruebas unitarias se registran aparte y no sustituyen el recorrido de la docente.

Se revisaron los documentos de memoria, decisiones y errores del proyecto antes de actuar. No se actualizaron esos archivos para respetar la instrucción de crear únicamente archivos de auditoría. Los hallazgos nuevos se documentan aquí para una decisión posterior, sin arreglos.
