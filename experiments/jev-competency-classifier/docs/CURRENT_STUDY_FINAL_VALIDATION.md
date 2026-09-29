# Validación y cierre del experimento autónomo

## Alcance y autorización

Solicitud autónoma adjunta d41b502e-3a19-45d5-8002-a071e7ef4d8c. Todo el diff de esta fase queda en experiments/jev-competency-classifier del worktree codex/jev-luna-benchmark. No se modificó Ayni, producción, BD ni routing. El directorio original tiene trabajo ajeno previo; no se limpió ni sobrescribió.

## Gates ejecutados

- 57/57 pruebas automáticas; cero fallos o skips. Mocks no consumen API. Incluyen mapping canónico, edad null, fuga expected/gold/correct_answer/acceptable_primary/acceptable_secondary, privacidad familiar/identificadores, billing fallido y lock de TEST único.
- npm.cmd run typecheck: sintaxis Node de 69 archivos; no se presenta como typecheck TypeScript.
- npm.cmd run lint: reglas de secretos y ESLint del experimento, sin errores.
- npm.cmd run build: build local dist generado. No despliegue.
- Prueba funcional real: cuatro ciclos DEV completos A/B/C/D, 80 casos ×3; luego un candidato ×28 ×1. Sin retries.

## Inmutabilidad comprobada después de TEST

- DEV SHA-256: 3cc4f1f0cc09763bfae90f002d270dfc62d9597df0583e581283b143818ff320. 80/80 Codex por rúbrica antes de Jev/Luna; ningún cambio de expected.
- TEST original y copia privada SHA-256: c8dcf899eaa4a7d15d6bee414a56e3f575f39bb81e38663766c83a52e4c483ef. 28/28 y edad ausente/null, sin inventarla.
- Las nueve fuentes/tarifas de inferencia del candidato coinciden con config/current-study-candidate.json después del TEST. Modelos typesafe/jev-1.13 y gpt-6-luna; thresholds y prompts V1/Luna conservados.
- Una carpeta current-final-* y un lock completed; no segunda evaluación.
- DEV cerrado en commit e5464a3 y tag codex/jev-dev-candidate-closed-2026-09-29, antes de parsear TEST. Respaldo previo 32e5d01/tag codex/jev-before-autonomous-study-2026-09-28.

## Versiones y procedencia

- c9ba4fd: adjudicación autónoma autorizada y gold congelado.
- a4c6ac4: análisis offline y gate de evaluación final única.
- da3fab6: V2.1.
- 17414d9: V2.2.
- b764785: V2.3, tercera y última revisión.
- e5464a3: selección/cierre DEV previo a TEST.

- V2: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier\results\current-dev-2026-09-29T04-52-16-894Z-81d4fee8; status completed; calls 2280; total 0.2366997480000004; subtotal conocido 0.2366997480000004; costos desconocidos 0.
- V2.1: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-12-18-668Z-46e6e4f9; status completed; calls 2280; total desconocido; subtotal conocido 0.2744614460000003; costos desconocidos 3.
- V2.2: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-32-39-991Z-091f0284; status completed; calls 2280; total 0.29275886400000023; subtotal conocido 0.29275886400000023; costos desconocidos 0.
- V2.3: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-51-53-054Z-5ee378a1; status completed; calls 2280; total 0.30587362600000034; subtotal conocido 0.30587362600000034; costos desconocidos 0.

TEST único: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier\results\current-final-2026-09-29T11-59-24-143Z; 84 llamadas; Jev proveedor US$0.00909573; Luna cálculo tarifario sobre tokens reales US$0.0018788; total mixto US$0.01097453. Subtotal conocido de todo el estudio US$1.120768214; tres intentos de red DEV sin costo conocido. No se inventa total completo ni factura Luna.

## Resultado y límites

Candidato seleccionado V2.3/CURRENT_V2_LUNA_CLEAN. DEV 203/204=99.51%; TEST 16/22=72.73%, exact decision 20/28=71.43%. No se confirmó la transferencia del resultado sintético. No integración recomendada todavía; confianza baja. DEV no exigía secundarias y TEST exige cuatro: cobertura insuficiente, no recall demostrado. TEST no contiene positivos de privacidad. 45 citas DEV del candidato no alineadas; 10 primarias TEST con cita no alineada (ver ledger para IDs). El alineador valida texto, no pedagogía ni fidelidad de limpieza.

## Preservación y revisión

Raw-results, summaries, runs y outputs de proveedores se conservan localmente en directorios únicos ignorados por Git. Se distinguen de outputs mock mediante execution_mode y el índice cerrado de corridas live. Gold DEV ficticio, snapshots, análisis y reportes se versionan; el test privado y observaciones reales no se añaden al repositorio.

El working tree experimental se dejará limpio tras el commit final. No push, despliegue, integración ni cambio posterior de prompts/thresholds/gold. Los reportes posteriores son análisis, no entrenamiento. No ejecutar otro ciclo de este estudio cerrado. Una fase nueva requeriría solicitud aparte y gold docente nuevo.
