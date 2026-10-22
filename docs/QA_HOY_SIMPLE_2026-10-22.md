# Hoy simple · 22 de octubre de 2026

Estado: implementación y validación local; sin despliegue.

## Cambios

- Talleres al final. Se mantienen saludo, cumpleaños condicionales y asistencia.
- Se retiran Consultar actividades de otro día, Actividades anteriores por revisar y Ver otras actividades preparadas. Calendario y flechas conservan navegación. El flujo de revisar pendientes anteriores deja de ofrecerse en Hoy por solicitud expresa; no se borran datos ni API.
- Abrir actividad inicia la prevista hoy y abre la guía mediante el callback existente. Continuar retoma sin otro inicio. Realizadas/no realizadas se consultan.
- Consulta sin botones de registro libre/guiado. Otra fecha requiere Usar esta actividad hoy y confirmación existente.
- Identidad NotebookPen + Observación libre compartida en diagnóstico, Hoy, Hoy vacío y guía activa. Ayuda explica que permite anotar sin preguntas o indicadores. No se altera captura ni clasificación pedagógica.

## Validación ejecutada

- npx tsc --noEmit: PASS.
- npm run lint: PASS, cero errores; una advertencia preexistente de dependencia compleja en diagnostic-generation-control.tsx:28.
- npm run build: PASS (Vinext); advertencias de tamaño de bundle y eval de PGlite.
- node --test src/lib/activity-runner.test.mjs src/lib/activity-today-execution.test.mjs: cuatro pruebas PASS. Incluyen propiedad, fechas, idempotencia y cierre por momentos.
- Detector Impeccable sobre los seis componentes modificados: [] (sin hallazgos), una ejecución.
- UI local con TodayHome, ActivityRunView y ActivityConsultation reales, API/datos sintéticos del recorrido; viewport 1440×900 y 390×844. Jerarquía y controles legibles, sin recortes visibles. Abrir registra un inicio; avanzar al momento 2, volver y continuar conserva el momento y el conteo de un inicio. Libre invoca su callback. Flecha siguiente abre consulta sin botones de captura ni nuevo inicio. Usar otra fecha abre confirmación; cancelada sin escritura.

Límite: la prueba UI usa harness aislado, no acredita guardado remoto ni un nuevo smoke de QA. El adaptador de next/image del harness se corrigió tras detectar un import incompatible con Vite puro; no se cambió el renderer de producto. No se repiten las pruebas cloud anteriores ni se llama IA. Diagnóstico adopta el componente compartido; no se repitió su flujo integral de captura.

## Evidencia y rollback

Capturas: outputs/hoy-simple-20261022/Hoy-computadora.png y Hoy-movil.png. Harness ignorado en .local/hoy-simple-20261022.

Rollback: revertir los seis componentes cambiados, restaurar imports de los dos accesos retirados y retirar free-observation-button.tsx. Sin migraciones, cambios de RLS ni operaciones de datos. No se publicó en QA o producción.
