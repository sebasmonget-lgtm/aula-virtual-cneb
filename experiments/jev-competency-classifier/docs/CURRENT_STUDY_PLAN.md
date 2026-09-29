# Experimento autónomo autorizado

Autorización: petición del usuario adjunta `d41b502e-3a19-45d5-8002-a071e7ef4d8c/Pasted text.txt`. Reemplaza el gate de adjudicación humana DEV por adjudicación de Codex leyendo la rúbrica; conserva el test externo congelado y prohíbe adjudicar con Jev/Luna o acomodar gold a respuestas.

Respaldo previo: 32e5d01, tag `codex/jev-before-autonomous-study-2026-09-28`. Original Ayni tiene trabajo ajeno en curso; todo este experimento permanece en su worktree separado y bajo `experiments/jev-competency-classifier`.

Gold DEV fijado antes de proveedores: SHA-256 `3cc4f1f0cc09763bfae90f002d270dfc62d9597df0583e581283b143818ff320`. 80 casos, tres ambiguos, ocho abstenciones y cuatro formatos identificables ficticios. Origen `codex_rubric`, no humano independiente. No modificar ninguna etiqueta después de respuestas.

Primera corrida: A/B/C/D originales de esta fase, tres repeticiones, sin cambio de prompts, thresholds, KB, modelos ni filtro. Los cambios preparatorios solo admiten el origen de adjudicación autorizado y corrigen su descripción en reportes.

Hasta tres revisiones V2.1–V2.3 basadas únicamente en errores DEV; cada revisión evaluada en los mismos 80 casos con tres repeticiones. No hay obligación de agotar las revisiones si los errores restantes no justifican otro cambio. Versiones y resultados anteriores conservados. Prompts de V1 y Luna, thresholds y modelos fijos.

Selección lexicográfica: primaria aceptable, falsas abstenciones, sobreclasificación, privacidad FP/FN, estabilidad; latencia y costo para desempate. El 85% es orientativo. Evidencia no verificable se informa como limitación. Los gates de revisión humana de la fase previa son indicadores, no bloquean la elección autónoma expresamente autorizada; si no se cumplen, reportar sus incumplimientos.

Cerrar `DEV_FINAL_REPORT.md` y snapshot de candidato **antes de abrir el test final**. Una sola evaluación del candidato sobre los 28 casos, una repetición de observación, sin ajuste posterior. Comparar con 69.70% / 74.24% históricos; sus tres repeticiones previas y el nuevo test de una pasada tienen incertidumbre distinta. No atribuir todo el delta a V2: privacidad corregida es un factor común; la ablación A/B/C/D en DEV ayuda a separar factores, mientras una sola corrida final no identifica causalmente sus aportes.

Estimación inicial US$0.5016/ciclo completo A/B/C/D (2400 llamadas máximas). Repetir hasta cuatro ciclos da US$2.0064 estimados, más test final y verificaciones indispensables. Tarifas existentes congeladas; no es un techo monetario garantizado. El ledger usará costo proveedor Jev y tokens reales con tarifa Luna, separado de estimaciones, sin sustituir desconocidos por cero.

No integrar ni desplegar en Ayni. Commits por adjudicación/preparación, iteración relevante, cierre DEV y cierre TEST. Rollback por revert de estos commits, manteniendo gold/resultados privados archivados. Las credenciales se leen solo en memoria desde el archivo local autorizado y nunca se imprimen ni copian al worktree.
