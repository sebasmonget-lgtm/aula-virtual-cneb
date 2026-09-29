# Auditoría de privacidad del experimento CURRENT DEV

## Regla anterior y causa

`src/luna-benchmark-dataset.mjs` llama a `anonymousDecisionText` del módulo Ayni `src/lib/jev-competency-suggestion.mjs` desde `inferenceInput`. Cuando observación o contexto resultan null, `runLunaBenchmark` crea `privacy_blocked` en todos los brazos y no llama a Luna ni Jev.

La regla anterior prueba FAMILY antes y después de neutralizar nombres:

```text
mamá/mama, papá/papa, madre, padre, abuela/abuelo, tía/tío,
hermana/hermano, familia, domicilio, dirección, teléfono, vivienda
```

Basta una palabra completa, independientemente del contexto. Según los falsos positivos ya documentados del benchmark, AG-02 contenía menciones familiares en una representación y MN-01 «mamá» en el cuento; ambas coincidieron con FAMILY. No se reabrió el test ni sus etiquetas para ajustar. «Casa» y «nombre» no pertenecen a FAMILY; nombres conocidos o posibles se neutralizan por separado.

## Cambio mínimo experimental

`src/current-dev-privacy.mjs` conserva límites, identificadores (correo, URL, 7+ dígitos), neutralización de nombres, UUID, rutas y material codificado, y la lista cerrada de palabras seguras. Retira el veto por sustantivos familiares. Una dirección concreta, con indicador de residencia/dirección y vía+número, se bloquea por `identifiable_address`; no por la palabra «domicilio» sola. Las razones quedan en resultados sin registrar datos identificables en logs.

Se aplica exactamente el mismo filtro a las cuatro variantes nuevas. CURRENT_V1_RAW significa prompt V1 con privacidad experimental corregida, no identidad con el baseline histórico de privacidad. La mejora del filtro es un cambio común y debe separarse de la mejora del prompt al interpretar una futura evaluación final.

V1 histórico, PARALLEL, módulos de Ayni y resultados congelados permanecen intactos. Este detector es una regla limitada y auditable de identificadores, no un clasificador universal de toda información sensible.

## Pruebas y reversión

Pruebas obligatorias: «Dibujó a su familia y dijo quién era cada persona.» y «En el cuento dijo que al final venía su mamá.» pasan sin bloqueo. Se comprueban correo, URL, teléfono, dirección concreta y nombres neutralizados; textos sin familia conservan la salida V1. Revertir el commit de DEV elimina el nuevo camino, sin modificar datos ni resultados anteriores. Respaldo: `codex/jev-current-before-dev-v2-2026-09-28` en `c02d0b9`.
