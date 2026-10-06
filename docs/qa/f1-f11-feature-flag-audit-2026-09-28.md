# Auditoría de activación F1–F11 — 28/09/2026

## Alcance y regla

Se revisaron las lecturas `AYNI_*` y `NEXT_PUBLIC_AYNI_*` en `src/` y `scripts/`, los componentes alternativos y los fallbacks de runtime. Los flags de las funciones ya aprobadas de F1–F11 ahora consideran la variable ausente como **activada**; `=0` solicita rollback explícito. `.env.local` no define ninguno de esos flags, por lo que esta comprobación cubre el comportamiento real sin configurarlos manualmente. No se cambió ni la base de la profesora ni una versión histórica confirmada.

La excepción deliberada es el **proveedor Jev de F6**: el Plan Maestro §5 y §7 exige opt-in y conjunto experto antes de activarlo por defecto. La captura, cola y revisión curricular sí son predeterminadas; sin Jev, la cola funciona manualmente y no pierde la nota bruta. En este QA local existen `AYNI_JEV_ENABLED=1` y `AYNI_JEV_COMPETENCIES=1`, pero eso no justifica encender el proveedor en otros entornos.

| Fase | Funcionalidad y condición | Variable ausente ahora | Lo que ve la profesora en `localhost:5173` sin flags de fase | Coincide |
| --- | --- | --- | --- | --- |
| F1 | DTO/lectura V3: `AYNI_PLANNING_V3_READ` | V3 activo | Propuestas y proyectos vigentes con procedencia; datos V2 conservan adaptador de lectura | Sí; el adaptador histórico no es un modo predeterminado de creación |
| F2 | Decisión del bake-off | Sin flag runtime | Pipeline A conservador; B sigue experimental, sin nueva generación en esta auditoría | Sí |
| F3 | Proyecto simple: `AYNI_PROJECT_SIMPLE` y `NEXT_PUBLIC_AYNI_PROJECT_SIMPLE` | API y UI nuevas | Doce propuestas, confirmación directa y mapa de actividades al abrir una propuesta confirmada | Sí |
| F4 | Actividad heredada: `AYNI_ACTIVITY_INHERITED` y `NEXT_PUBLIC_AYNI_ACTIVITY_INHERITED` | API y UI nuevas | Desde un proyecto V3, blueprint, propósito, competencia, criterio y evidencia heredados; se piden fecha y aportes opcionales | Sí; proyectos históricos conservan su editor compatible |
| F5 | Observación bruta: `AYNI_ORDINARY_OBSERVATIONS` y `NEXT_PUBLIC_AYNI_ORDINARY_OBSERVATIONS` | API y UI nuevas | «Registrar observación», alumno obligatorio y nota antes de cualquier sugerencia | Sí |
| F6 | Cola/revisión: `AYNI_CURRICULAR_REVIEW` y `NEXT_PUBLIC_AYNI_CURRICULAR_REVIEW`; Jev: `AYNI_JEV_ENABLED` + `AYNI_JEV_COMPETENCIES` + clave | Cola activa; Jev opt-in | «Revisar observaciones» muestra la nota original y decisiones docentes. Jev se usa únicamente donde esté configurado explícitamente | Sí, con excepción de seguridad curricular prescrita por el plan |
| F7 | Navegación: `NEXT_PUBLIC_AYNI_F7_NAV` | Cuatro destinos | **Hoy · Planificar · Mi aula · Documentos**; Calendario/Biblioteca dentro de Planificar y Diagnóstico/Evaluación dentro de Mi aula | Sí |
| F8 | Trayectoria/evaluación: `AYNI_F8_EVALUATION` y `NEXT_PUBLIC_AYNI_F8_TRAJECTORY` | API y UI nuevas | Perfil de alumna con trayectoria Diagnóstico/P1–P4 y evaluación desde Mi aula | Sí |
| F9 | Reajuste compacto: `NEXT_PUBLIC_AYNI_F9_REPLAN` | Nuevo reajuste activo | Acceso a «Comenzar revisión» desde Evaluación. El panel de propuesta compacta requiere un período cerrado y vigente; el clon visual no lo tenía | Parcialmente verificado en UI; tests cubren la condición de cierre |
| F10 | Artefactos estables: `AYNI_DOCUMENT_ARTIFACTS` y `NEXT_PUBLIC_AYNI_F10_ARTIFACTS` | API y UI nuevas | Documentos muestra plan/proyecto confirmados, versión y descarga estable; endpoint de artefactos responde 200 | Sí para lectura/listado; no se creó un artefacto nuevo en este QA |
| F11 | Árbol/sync: `AYNI_DOCUMENT_SYNC` y `NEXT_PUBLIC_AYNI_F11_DOCUMENTS` (requiere F10) | API y UI nuevas | Árbol año/aula/proyecto→actividad, «Sincronizar con mi laptop» y alternativa ZIP | Sí para acceso; picker real/dispositivo físico siguen pendientes de F12 |

## Condiciones que no son flags de estas fases

- `AYNI_AUTH_MODE`, `AYNI_DB_MODE`, URL/puerto, claves y `NEXT_PUBLIC_AYNI_API_URL` seleccionan infraestructura/identidad, no autorizan saltar funciones. La URL pública tiene fallback local `127.0.0.1:8788` si no se configura.
- `AYNI_ALLOW_LOCAL_EXPORT` sigue apagado salvo `=1` por privacidad; `AYNI_TEST_AUTH_PGLITE` y `AYNI_QA_*` son herramientas de test/QA, no rutas de la profesora.
- `AYNI_JEV_PROJECT_IMAGE` y `AYNI_JEV_WORKSHOP_SHEET` permanecen opt-in por la misma regla experimental del Plan Maestro. `AYNI_AI_PROVIDER`/`AYNI_AI_MODEL` son configuración de proveedor, no un switch de F1–F11.
- Los componentes legacy siguen disponibles solo para `=0` y para leer/continuar datos históricos que no cumplen V3. No se reescriben confirmados ni migraciones.

## Verificación visual y técnica

Se inspeccionó la experiencia en `localhost:5173` con el aula QA existente y, para recorrer pantallas sin tocarla, un clon local aislado en `localhost:5174`/API `8799`. En el clon se abrieron los cuatro destinos, Calendario, Biblioteca, Diagnóstico, Evaluación, un proyecto confirmado, el formulario de actividad heredada, captura de observación con alumno obligatorio, cola de revisión, trayectoria de alumna, acceso a reajuste y árbol/sincronización de Documentos. Se evitó hacer llamadas pagadas o editar datos originales. El clon no contiene un cierre de período para atravesar el último panel de F9; esto no se declara como QA visual completado. La activación por defecto de cada gate se comprobó en código y con `.env.local` sin flags de fase. El test del fixture H34 reducido declara `includeOrdinary: false` explícitamente porque no tiene las tablas F5–F8; los tests de F8 usan el esquema completo.

Rollback: para una función concreta, poner sus flags de UI/API en `0` deliberadamente y reiniciar ambos procesos. Nunca revertir migraciones aditivas ni borrar nuevas observaciones/artefactos.
