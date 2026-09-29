# V2.3: última revisión autorizada

V2.2 completo: RAW y CLEAN 98.53% en cada repetición; INTERPRET 98.04% agregado. Cero sobreclasificaciones y privacidad FP/FN. DEV059 fue falsa abstención en los nueve resultados V2 (tres brazos por tres repeticiones): Choice eligió Motricidad con confianza 0.82–1.00, mientras suficiencia estuvo entre 0.36 y 0.60. La observación adjudicada antes de proveedores contiene coordinación de dedos y soporte mantenido firme. «Giró» fue ocultado por el anonimizador común: no se reconstruye ese verbo en el prompt.

Cambio mínimo: aclarar en la regla motriz y el noul de suficiencia que estabilizar/controlar un soporte mientras se usan dedos/manos puede ser evidencia de coordinación fina, sin exigir recorrido corporal, explicación verbal, propósito académico ni producto final. Conservar el límite de manipulación incidental sin control/ajuste observado. Regla general: no incluye IDs, tornillos, citas de casos ni respuestas gold.

Mismos 80 registros, misma KB/filtro, mismos modelos y thresholds, prompts V1/Luna intactos. Tres repeticiones A/B/C/D, sin ajustes durante la corrida. Snapshot `config/current-study-versions/V2.3.json` y resultados anteriores preservados. Gold SHA 3cc4f1f0cc09763bfae90f002d270dfc62d9597df0583e581283b143818ff320.

Al terminar se seleccionará la mejor variante observada, incluso si no es V2.3. No habrá V2.4 ni otra revisión. Congelar fuentes/modelos antes de una única pasada del test de 28 casos; no optimizar después. Rollback de fuente/prompt por snapshot de la versión seleccionada antes de TEST.
