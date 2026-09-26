# Evaluación de routing y modelos GPT-6

Esta suite está separada de los unit tests y **no se ejecuta en CI**. Usa escenarios ficticios para Plan Anual, Proyecto, Unidad, Actividad, criterio/evidencia, valoración, conclusión descriptiva e informe familiar.

## Ejecución autorizada

1. Configurar `OPENAI_API_KEY` fuera del repositorio.
2. Configurar `AYNI_RUN_MODEL_EVALS=1`.
3. Opcionalmente copiar `pricing.example.json` fuera del repositorio, verificar o actualizar sus precios fechados y establecer `AYNI_MODEL_PRICES_PATH` a ese archivo.
4. Ejecutar `npm run eval:ai-routing-v4`.

Cada ejecución escribe `results.json` y `blind-review.json` dentro de `evals/ai-routing-v4/results/<fecha>`. La carpeta está ignorada por Git. El archivo ciego omite modelo y routing para que la revisión pedagógica humana valore calidad, sustento, adecuación a la edad, claridad y continuidad sin conocer el modelo.

Las métricas automáticas cubren schema, IDs curriculares permitidos, aplicabilidad validada por el contrato, señal de sustento, repetición exacta, privacidad, tokens, latencia y costo estimado cuando se proporciona una tabla de precios actualizada. Ausencia de hechos inventados, calidad pedagógica y coherencia con el contexto requieren revisión humana; ninguna heurística automática las confirma por sí sola.
