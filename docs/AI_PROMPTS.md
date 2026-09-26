# Contratos y routing de IA

## Límites comunes

Toda generación productiva se ejecuta en servidor. `prepareAIRequestV4()` construye el único `AIContextBundle` autorizado y filtrado estrictamente a la edad del aula. OpenAI usa Responses API, Structured Outputs y `maxRetries: 0`. Código vuelve a validar competencias, fuentes, versiones, calendario y propiedad antes de persistir.

No se envían nombres, rutas privadas, fotos, grabaciones ni archivos completos por defecto. La IA propone borradores. Nunca inventa evidencia real ni confirma el nivel final.

## Política GPT-6 v3.0.0

`src/lib/ai-execution-router-v4.mjs` es la única fuente de modelos:

| Tier | Modelo | Reasoning | Uso |
| --- | --- | --- | --- |
| `structured_light` | GPT-6 Luna | low | texto breve y clasificación cerrada |
| `routine_generation` | GPT-6 Luna | medium | actividad, valoración individual, conclusión e informe familiar |
| `focused_writing` | GPT-6 Sol | low | redacción formal desde Plan Master y fallback de actividad o conclusión |
| `judgment_generation` | GPT-6 Sol | medium | Project Master, realineación de criterio y Assessment Master |
| `global_planning` | GPT-6 Sol | high | Plan Anual Master |

GPT-6 Astra no tiene ruta productiva ni fallback.

## Project Master

Sol/medium crea una vez el mapa del proyecto. Cada blueprint conserva posición, propósito, competencia principal y secundarias posibles, intención pedagógica, criterio, evidencia esperada, variaciones aceptables, foco de observación, materiales, mediación, continuidad y flexibilidad. La profesora revisa el mapa antes de confirmar.

Luna/medium desarrolla solo una actividad y recibe el Project Master confirmado, la fila exacta, filas vecinas, posición y contexto vigente. Al confirmar la actividad, código materializa el criterio heredado en la misma transacción. `criterion_realignment` usa Sol/medium solo para una modificación incompatible; `criterion_and_evidence` ya no genera criterios normales.

## Assessment Master

Sol/medium prepara un marco por aula y período con las competencias realmente trabajadas y criterios confirmados. Guarda fuentes y huella, admite revisión docente, versiones y detección de cambios. No recibe expedientes individuales ni asigna niveles.

Después de confirmar el marco, Luna/medium aplica su entrada de competencia al conjunto anonimizado de evidencias de cada niño. Sol/medium se reserva para validación fallida, contradicción no resuelta o revisión profunda explícita. La conclusión se solicita después de confirmar la valoración y el informe familiar usa únicamente conclusiones confirmadas.

## Skills y evaluación

- Plan Anual: `skills/crear-plan-anual/`.
- Proyecto/Unidad: `skills/crear-proyecto-unidad/`.
- Actividad: `skills/crear-actividad/`.
- Diagnóstico: `skills/crear-evaluacion-diagnostica/`.

La suite `evals/ai-routing-v4/` requiere `AYNI_RUN_MODEL_EVALS=1` y una clave configurada. Sus fixtures cubren Plan Anual, Project, Unit, Activity, realineación de criterio, Assessment Master, Assessment, conclusión e informe familiar. Registra schema, grounding, IDs, tokens, latencia y costo opcional, y genera una revisión pedagógica ciega.
