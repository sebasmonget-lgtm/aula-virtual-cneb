# Errores relevantes de CURRENT DEV

## Privacidad por mera mención familiar

- Síntoma: AG-02/MN-01 se bloquearon antes de Luna; dibujar a la familia y mencionar mamá en un cuento también activaban privacidad.
- Causa: `anonymousDecisionText` comprueba FAMILY antes/después de anonimizar; una palabra familiar completa basta para devolver null. El runner transforma null en bloqueo común y omite proveedores.
- Solución: nuevo filtro experimental contextual, común a las cuatro variantes. Retirar veto léxico familiar y conservar identificadores/anonimización; detectar dirección concreta, sin alterar clasificadores durante este paso.
- Validación: tres pruebas de privacidad pasan, incluidas ambas frases obligatorias, identificadores ficticios reales en formato y equivalencia con V1 para textos sin familia. No se reabrieron etiquetas del test final.
- Prevención: regresiones obligatorias; separar mejora común de privacidad de mejora V2 y conservar ruta histórica.

## Costo desconocido de Luna fallida

- Síntoma detectado al revisar el nuevo runner: un error de red sin `billing` podía confundirse con brazo sin Luna y sumar US$0.
- Causa: el valor null representaba tanto «no se intentó Luna» como «se intentó sin usage disponible».
- Solución: registrar intento con costo/usage desconocidos y latencia medida. Salida pagada inválida conserva billing conocido; HTTP 401/402/403/429 detiene solicitudes posteriores.
- Validación: prueba de HTTP402 confirma Luna INTERPRET no se intenta después, costo total null y una llamada sin costo conocido. La prueba de JSON inválido conserva tokens y cargo tarifario positivo.
- Prevención: contar intentos y procedencia por separado; nunca reemplazar costo desconocido por cero.

## Pérdida de verbos por anonimización heredada

- Síntoma observado en DEV: palabras iniciales como «Preparó», «Escribió», «Mezcló», «Llevó», «Giró» y «Lanzó» se sustituyen por `[persona]`, aunque son acciones y no nombres. Puede desaparecer evidencia central antes de Luna/Jev.
- Causa: anonimización por palabra con mayúscula y lista cerrada `SAFE_WORDS`, conservada de V1 en el filtro común. Retirar el veto familiar no elimina este comportamiento.
- Tratamiento en este experimento: se documenta la entrada dañada; no se cambia el filtro durante la optimización V2 y no se reconstruyen verbos ausentes mediante el gold. No se declara corregido.
- Verificación: inspección local de `devInferenceInput` sobre DEV, sin llamadas ni apertura de TEST; los verbos listados no pertenecen a `SAFE_WORDS`. Los errores se analizan sobre lo que realmente recibe cada proveedor.
- Prevención futura pendiente: revisar anonimizador con ejemplos de nombres y acciones antes de una prueba integrada, bajo solicitud nueva. Las métricas actuales corresponden al filtro medido y congelado.

## Reconstrucción contextual por Luna y evidencia no alineada

- Síntoma real: DEV057/V2.3/r1 perdió «Llevó» antes de Luna; CLEAN agregó «llevó» e INTERPRET «avanzó». En este caso coincidieron con el sentido del original, pero se infirieron desde una entrada incompleta. CLEAN acertó la competencia y su cita no se alineó por la reformulación.
- Causa: interacción entre anonimización heredada y normalización generativa. JSON schema no garantiza fidelidad de hechos ni una cita literal. D−C tampoco es una ablación pura de una frase: ambos prompts generan limpiezas nuevas.
- Tratamiento: documentado en `docs/current-study/LUNA_INPUT_FAITHFULNESS.md`; prompts/filtro sin cambios. Se conserva el acierto contra gold y se informa por separado el riesgo de contenido y evidencia. No se declara corregido.
- Verificación: comparación local de entrada efectiva, salida Luna y resultado del ledger; ningún modelo decide el gold. En DEV075/V2.1/r3 la sobreclasificación D tuvo interpretación null y no se atribuye a una frase inexistente.
- Prevención pendiente: en una fase futura revisar conservación de hechos y citas con docentes; no promover automáticamente una puntuación sintética alta a registros reales.
# Cierre del único V2.4 — 2026-09-29

**Síntoma.** TEST1 V2.3 CLEAN tuvo ocho decisiones completas erróneas; algunas abstenciones tenían suficiencia alta. En TEST2, CLEAN volvió a abstenerse por confidence inferior a 0.50 en dos casos que RAW sí clasificó.

**Causa observada.** Anonimizador de lista cerrada oculta verbos/conectores y puede crear falsos sujetos; CLEAN fusionó sujetos históricos y no garantiza conservación semántica. Gold histórico contiene ambigüedades y secundarias incompatibles con el criterio conservador. Son factores plausibles concurrentes, no causas aisladas mediante experimentos. Confidence y suficiencia son gates independientes: en DEV V2.3 bajar confidence offline de 0.50 a 0.45/0.40 no cambió ninguna salida porque las abstenciones restantes fallaban suficiencia 0.70.

**Intervención validada.** Una sola corrección general de prompt V2.4, con prioridades fuente visual/lectura, proceso de indagación, propuesta de convivencia y secundarias independientes. Threshold 0.50 conservado y cerrado antes de TEST2. Cuatro brazos ×40×1, 324 intentos, cero fallos; V2.4 RAW 28/28 acceptable primary y 39/40 exact decision. Sin cambiar anonimizador ni Luna. CLEAN 26/28 y 37/40; no se corrigió después. 62 pruebas, lint, build y syntax/typecheck PASS.

**Prevención / límites.** No inferir que formato JSON asegura fidelidad; no seleccionar threshold con TEST2 ni rellenar costo desconocido con cero. Mantener gold y freeze, conservar locks. La mejora V2.4 frente V2.3 depende de una primaria y pierde una secundaria; misma exact decision. No validar integración con un gold sintético creado por el propio autor. Cierre definitivo de prompt; recomendación de revisión docente supervisada, sin integración.

