# Validación final del único V2.4

## Permisos y alcance

Autorización explícita de último intento acotado y de análisis de thresholds offline. Respaldo `06a61cb`; cierre de configuración previo a TEST2 `528cd35`. Solo cambios en `experiments/jev-competency-classifier`. Sin integración, deploy, BD, routing ni cambios de Ayni. Se conservan las ramas/observaciones originales fuera de este worktree.

## Orden comprobado

- Autopsia de ocho casos: sin proveedores, SHA `8db6ce309ca88502796142abc3c9bbad402177144e439b56b589bbfce0316c98`. Fuentes V2.3 verificadas antes de extensión del builder. Archivo completo privado e ignorado por Git; resumen de hipótesis sin observaciones completas versionado.
- TEST2 gold congelado a las 12:27:12 UTC; confidence replay DEV 0.50/0.45/0.40 antes de cerrar configuración.
- Freeze V2.4 a las 12:34:32 UTC, threshold 0.50. Prompt SHA `271b4b8298a5b8c2132160f7514d69c45f8f59cf686aa2a2a2edd0892cbd0867`.
- TEST2 único a partir de las 12:35:54 UTC. Un lock persistente lo marca completed; no hubo paid retries, repetición, corrida diagnóstica pagada anterior ni ajuste posterior.
- SHA TEST2: `a206defd4c8f07b9d435e977f9e4894346f07aff1f05a771f5d91e79955f058d`. 40 casos, 28 curriculares, 8 abstenciones y 4 Privacy ficticios.
- SHA histórico intacto: `c8dcf899eaa4a7d15d6bee414a56e3f575f39bb81e38663766c83a52e4c483ef`.

## Verificación funcional real

- 160 evaluaciones completas (40×4×1), 324 intentos físicos: 288 Jev y 36 Luna.
- Ningún error de proveedor; 324 registros de costo y 324 cuerpos de request guardados. Cero expected/gold/acceptable/ID/adjudication del caso en payloads; labels solo en scoring.
- 4/4 Privacy bloqueados antes de APIs en todos los brazos. 8/8 abstenciones correctas en todos los brazos. No equivale a sensibilidad universal fuera de esos formatos ficticios.
- Acceptable primary: V1 25/28, V2.3 27/28, V2.4 RAW 28/28, V2.4 CLEAN 26/28. Exact decisions: 34/40, 39/40, 39/40, 37/40.
- RAW pierde Oral secundaria en TEST2_038. CLEAN además abstiene TEST2_017 y TEST2_039. Sin reparaciones posteriores.
- Total mixto conocido US$0.055906572: Jev reportado US$0.052943772 y Luna tarifario sobre usage real US$0.002962800. Cero llamadas con costo desconocido. Sin doble facturación de reasoning tokens.

## Pruebas automáticas

Preflight: 62/62 pruebas PASS, lint PASS, build PASS, syntax/typecheck 76 archivos PASS. Pruebas significativas nuevas:

1. Requests V2.3 del snapshot previo iguales byte por byte tras añadir campo opcional; solo V2.4 usa la instrucción adicional.
2. Guard de labels e ID y límite de llamadas actúan antes del fetch externo.
3. Segundo claim del mismo TEST2 es rechazado, también si el primero no terminó.
4. Confidence 0.50 y suficiencia 0.70 son gates independientes, inclusivos y sin reducción accidental.
5. Schema, mapping y SHA reales de TEST2/prompt se verifican; gold e IDs quedan fuera de inferencia; edades null.

Comprobación final tras añadir el reporter: suite 62/62 PASS, lint PASS, build PASS y syntax/typecheck de 77 archivos PASS. Estas pruebas usan fetch simulado, no suman consumo.

## Conservación

`prepareLastTest()` verifica otra vez hashes de las fuentes congeladas, cuatro dependencias de producción, prompt, gold y análisis de threshold. El reporter solo calcula informes offline. `.gitattributes` fija LF para gold y archivos con SHA de bytes exactos; se comprueban también sus blobs de Git antes del commit final. Un incidente local de `.gitignore` que dejó de excluir dist se corrigió antes de proveedores: patrones originales repuestos, dist queda local e ignorado, sin archivos de build ni secretos publicados.

Resultados íntegros locales: `results/last-test2-2026-09-29T12-35-54-356Z/`. Resumen y tabla sintética completa versionados en `docs/last-optimization/`. La autopsia y los originales históricos privados permanecen fuera de Git. No se borran locks ni se regeneran snapshots. No existe V2.5/V2.6.

## Límites

Gold nuevo sintético y adjudicado por el mismo autor de prompt; sin validación externa docente. Una repetición no mide estabilidad. 28/28 no valida precisión perfecta futura. V2.4 gana un solo caso sobre V2.3 y pierde una secundaria; su exact decision está empatado. CLEAN falla grounding lexical en 11 sugerencias, frente a cero RAW; no se equipara esa métrica a distorsión semántica. La recomendación es prueba supervisada de RAW, sin integración automática y sin continuar ajustes de prompt.
