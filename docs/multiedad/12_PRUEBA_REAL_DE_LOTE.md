# Prueba de lote con IA real y revisión por edad

## Resultado

Se prueba el lote solicitado en el almacén separado `ai-smoke-1792771763510`, que contiene solo el aula y los tres niños ficticios de las muestras anteriores. Se confirma después de revisar el resultado original; no se evalúan niños reales ni se publican cambios. Se conserva Ayni y no se cambian los prompts/modelos del producto para obtener un resultado favorable.

Una llamada a `gpt-6-luna`, workflow `activity`, devuelve las tres propuestas de PS_IDENTIDAD para 3/4/5. Una tentativa, sin reintentos ni timeout, duración del proveedor 33,7 s. Uso: 5714 tokens de entrada y 2772 de salida. Costo estimado del ledger de esta llamada: **USD 0,0021001750**; no es factura ni costo de fases anteriores.

Recibo privado: `.local/multi-age-main-20261023/lotes/live-1792777992571/receipt.json`, estado `confirmed_after_review`. Conserva contexto, salida original, tarea preparada, referentes oficiales, revisión de QA del fixture, snapshots y capturas. `calls:1`, `attempts:1`, `preparationPreservedWorkspace:true`, `historyPreserved:true`, `confirmationReplayed:true`, `reopenVerified:true`, `originalOutputPreserved:true`, `chronologicalOrderVerified:true`. `jobStatus:ready` corresponde a la preparación; `persistedJobStatus:stale` indica que ya se materializó la posición y su salida se conserva como historia.

## Variedad revisada

Se mantienen la competencia, el maestro y la indicación docente previa de usar solo bloques. La variedad se evalúa dentro de esos límites, no como tres proyectos o competencias diferentes.

| Posición y fecha | Actividad real | Diferencia de la experiencia |
| --- | --- | --- |
| 3 · 2026-04-01 | Elegimos una forma para los bloques | Elegir entre apilar, poner en fila o agrupar, probando y cambiando de opción. |
| 4 · 2026-04-06 | Probamos cambios en la construcción | Decidir mover, agregar, quitar o conservar una parte de una construcción. |
| 5 · 2026-04-07 | Construcciones con caminos distintos | Formar y modificar un recorrido propio y compartir una elección si desea hacerlo. |

Los títulos y las secuencias son distintos. Las tres propuestas admiten mirar antes de participar, cambiar de elección y compartir voluntariamente. La docente acompaña por turnos y mantiene a los demás a la vista; no se encarga a los mayores cuidar a los menores. No se inventan materiales adicionales, observaciones, dificultades ni notas. Ordenar o construir es la situación de juego: el foco evaluativo de este proyecto sigue siendo identidad/preferencias, no la calidad matemática o estética del producto.

## Criterios por edad

Se revisan las nueve variantes contra los textos oficiales instalados, además de comprobar edad/competencia/ID y herencia exacta del maestro. Catálogo versionado local `curriculum/official/initial-performances-v1.json`, validado por hash; referentes seleccionados: `PCI2016.PS_IDENTIDAD.3.01`, `.4.01` y `.5.01`, páginas impresas 78–79.

| Edad | Foco revisado en las tres actividades | Correspondencia con su referente |
| --- | --- | --- |
| 3 | Elegir cómo jugar con bloques y comunicar la preferencia mediante palabras, gestos o acciones; sin exigir explicar por qué. | Intereses/preferencias y su expresión a través de palabras, acciones, gestos o movimientos. |
| 4 | Expresar qué prefiere y reconocer que otro niño puede elegir algo distinto. | Reconocer intereses/preferencias y diferenciarlos de los de otros en el grupo. |
| 5 | Comunicar una preferencia propia y distinguirla de otra; en caminos también puede expresar una característica relacionada con su elección. | Reconocer intereses/preferencias/características/cualidades y diferenciarlos mediante palabras o acciones. |

Los focos de 4 y 5 se solapan legítimamente en preferencias. No se exige abarcar todo el desempeño de 5 años en cada actividad ni se introduce una explicación oral obligatoria para aparentar mayor dificultad. Si un niño no realiza la comparación prevista, la propuesta no acredita que ya la haya realizado: se registra solo lo observado. La revisión docente sigue siendo necesaria para adaptar cualquier propuesta a su aula real.

Esta muestra verifica una competencia y tres actividades. No acredita automáticamente toda combinación de competencias, los lotes máximos de cinco con IA real ni todo el año. El máximo de cinco y los demás casos negativos sí se ejercitan con proveedor simulado en la suite local.

## Persistencia e interfaz

El helper `scripts/multi-age-batch-smoke.mjs` separa preparar de confirmar: primero requiere `--use-configured-text-key`, escribe la salida y cierra la base; después `--review-receipt=...` exige revisión aprobada del mismo hash antes de confirmar. El helper usa explícitamente la clave local de texto en memoria y solo fuentes ficticias; no modifica `.env.local`, credenciales cloud ni la configuración del preview. No hay reintentos automáticos.

Antes de la revisión no se crean actividades. Tras la confirmación hay cinco en el mismo proyecto: dos anteriores y tres nuevas. Se conservan el maestro, sus IDs/referentes y el contenido de las actividades anteriores, estudiantes, notas/informes disponibles. La confirmación repetida recupera los mismos IDs; reabrir la base conserva el contenido y la salida de IA original. La comparación de snapshots serializa fechas consistentemente y reconoce que la primera actividad V2 histórica ocupa posición 1 aunque no tenga ese campo.

El navegador principal se cambia únicamente al almacén ficticio de la muestra real para poder leerla. La base simulada `qa-persistencia-20261023` permanece conservada. El preview se inicia con IA desactivada para consultar sin nuevas llamadas; los textos guardados siguen siendo los resultados reales de esta prueba. Se usa la interfaz existente y sus bloques **Qué observar en cada edad**. Capturas `proyecto-real.png` y `criterios-reales-por-edad.png` en el directorio privado del recibo: escritorio 1366, cinco actividades y lector de la quinta. El selector se observa en orden 1–5 después de corregirlo. No se guardan observaciones inventadas desde la pantalla.

## Hallazgo corregido y validación local

La revisión visual detectó que el selector de Hoy ordenaba el lote como 1,2,5,4,3: las tres nuevas filas comparten `created_at` por transacción y el desempate UUID no representa el recorrido. Se cambia únicamente la lectura del workspace V2 para ordenar por fecha lectiva y posición, conservando posición 1 para el contrato histórico. No se altera ninguna fila ni se migra contenido. Se añade una comprobación de orden cronológico/posiciones a la prueba del lote máximo.

Después de la corrección: **19 pruebas PASS** en `npm run test:multiedad:lote`, incluidas RLS, rollback, fuentes obsoletas, relectura tras reinicios y conservación de notas/informes. Typecheck, lint y build Vinext PASS; permanecen una advertencia lint histórica y los avisos de dependencias/tamaños/clasificación del build. No se suman las 123 pruebas del recibo 11 como nuevas ejecuciones de esta fase.

Sin nueva migración, commit, push, staging ni publicación. Continúan pendientes las cuentas propias/Auth/RLS en staging, otros contextos pedagógicos, voz V2, edición de maestros, reorganización anual, Word V2 de proyecto/actividad, Excel y cierres. Las pruebas posteriores de COM_ORAL/MAT_CANTIDAD y el ajuste de prompt por sus hallazgos se documentan en [el recibo 13](13_LOTES_REALES_COMUNICACION_MATEMATICA.md). El resultado satisfactorio de esta muestra no equivale a un rollout autorizado.
