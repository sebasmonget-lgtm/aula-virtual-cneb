# Estado del flujo principal de Unidocencia

23 de octubre de 2026. Rama local `codex/multiedad-local-20261022`, sin commit nuevo ni publicación.

El recorrido principal V2 está integrado en los componentes de Ayni y probado por servicios y API para grupos de 3, 4 y 5 años. Esta fase cerró talleres compartidos, calendario institucional, apertura del siguiente año y matrícula durante el año. No habilita Unidocencia para aulas existentes ni convierte aulas de edad única.

| Recorrido | Comprobación local |
| --- | --- |
| Crear aula y matricular | Elección explícita, grupos por niño, nacimiento opcional, ingreso confirmado, autorización y RLS |
| Conocer al niño y su familia | Observaciones por edad, ocho preguntas familiares, avances, confirmación, diagnóstico individual y síntesis grupal con fuentes separadas |
| Mi año y proyectos | Calendario compartido, quince tramos, versiones, edición de proyectos, reorganización de tramos libres y conservación de actividades |
| Preparar actividades | Conversación con Ayni y lotes con criterios y referencias por edad; revisión docente y detección de fuentes obsoletas |
| Talleres | Setenta propuestas con adaptación completa para las tres edades, selección docente de referentes, Hoy, observaciones, Word y ocho recursos gráficos originales |
| Evaluación | Observaciones propias, valoraciones y conclusiones confirmadas, informes, Consolidado y Excel; cierre, reapertura y versiones |
| Documentos | Identidad, edades, referencias y contenido congelados en cada versión; índice de actividades por edición del proyecto |
| Otro año | Cuatro cierres vigentes, continuidad por niño, calendario propio, nuevas matrículas sin traslado de evidencias y descargas históricas |

La regresión final ejecutó **158 pruebas distintas, 158 PASS**, en 29 archivos de Unidocencia. Una comprobación adicional de paridad de esquema local/Supabase pasó: **159 pruebas distintas** en total. Se repitieron las dos pruebas HTTP de talleres y transición con las dependencias nativas de la aplicación; ambas pasaron. No se suman esos reintentos al total de pruebas distintas. Tipos, lint y build terminaron con salida cero. Lint mantiene un aviso previo en `diagnostic-generation-control.tsx`; build mantiene los avisos previos de PGlite/chunks/clasificación de rutas de Vinext. `git diff --check` no detectó errores.

La prueba de transición preserva nueve Word y el contenido del Excel anterior tras dos reinicios, luego prepara una actividad nueva para 3/4/5 sin evidencias trasladadas. Las pruebas de ingreso tardío conservan exactamente el cierre anterior y verifican traslado de una fecha previamente confirmada durante el upgrade. Las filas V1 conservan datos y forma serializada exactos.

La vista local original sigue en `http://127.0.0.1:5175/`, con tres niños, dos proyectos, cuatro actividades y catorce documentos. Se compararon sus valores, documentos y huella anual antes/después del reinicio y las migraciones. Solo se agregó el dato de presentación `experience_type` en actividades; las fuentes y valores anteriores se conservaron. IA real en esta fase: cero llamadas. Escrituras remotas: cero. No se usaron cuentas actuales de Supabase/Vercel, no se hizo push ni despliegue.

Evidencias reproducibles en `.local/multi-age-main-20261023/cierre-local/`: `full-suite.log`, `native-app-exports.log`, `typecheck.log`, `lint.log`, `build.log` y `preview-preservation.json`. Las pruebas HTTP tienen recibos propios en las carpetas `talleres/` y `transicion-anual/`. El Word del taller se revisó en sus tres páginas.

Antes de considerarlo listo para aulas reales faltan la revisión visual/interactiva en escritorio y móvil y la validación de Auth/RLS y smoke tests en staging con cuentas nuevas. Work mantiene deshabilitado el navegador; no se sustituyó esa revisión por afirmar que la compilación prueba la interfaz. Staging y publicación no se ejecutaron.

Límites funcionales explícitos: el calendario institucional admite actualmente cuatro bimestres de nueve semanas; rectificar una fecha de ingreso o una transición confirmada requiere un flujo específico adicional. Esta fase no agrega dictado/transcripción V2, adjuntos ni enlace público del cuestionario familiar, ni una generación IA independiente para la síntesis grupal. El flujo básico usa texto, revisión docente y síntesis sustentada. Las muestras de IA real de fases anteriores siguen siendo las pruebas limitadas documentadas en los entregables 12 y 13, no una certificación de toda salida posible.

Detalle de implementación, migraciones, seguridad y rollback: entregables 20 a 23 de esta carpeta. Mantener los snapshots y las bases sintéticas al deshabilitar una pantalla; no borrar historia ni revertir migraciones aplicadas para volver al recorrido V1.
