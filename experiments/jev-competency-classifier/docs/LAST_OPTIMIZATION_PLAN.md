# Único intento final V2.4

Autorización: archivo adjunto `da00a4d0-a544-4fd1-8c04-11f41a9bcc8e`, leído íntegro. Respaldo anterior: `06a61cb`. Todo bajo el programa experimental; sin cambios en Ayni, BD ni routing.

1. Autopsia de ocho casos sin proveedores. Observaciones originales y cuerpos reconstruidos privados en `LAST_OPTIMIZATION_ERROR_AUTOPSY.md` y `results/last-optimization-autopsy/`. Revisar gold, no modificarlo.
2. TEST2 sintético de 40 casos y adjudicación Codex autorizada antes de proveedores, SHA de bytes. No confundir nuevo conjunto congelado con gold externo humano: mismo autor conoce errores y redacta V2.4.
3. Una sola V2.4; prompt propio en archivo nuevo, V2.3 conservada. Parámetro opcional de instrucción adicional en el builder, sin cambio de requests anteriores ni de arquitectura/thresholds. No cambiar Luna ni anonimizador.
4. Una corrida, cuatro brazos: V1 RAW corregido de privacidad; V2.3 RAW como CURRENT_V2_RAW; V2.4 RAW; V2.4 CLEAN. Sin INTERPRET ni repetir TEST1. Máximo 360 llamadas; 324 si los cuatro Privacy son bloqueados por todos los brazos. Sin retry ni cache. Máximo estimado usando hipótesis previas: USD 0.0786 aproximadamente; medición reemplaza presupuesto, no tarifa inventada.
5. Congelar prompt, fuentes y criterios antes de llamadas. Gate atómico persistente; no eliminarlo ante fracaso. Escribir resultados por brazo antes de seguir para preservar llamadas parciales. Fallo de autenticación/crédito/rate limit detiene corrida. No cambiar prompt tras resultados, ni rerun para obtener mejores respuestas.
6. Criterio previamente especificado: mejora clara = al menos dos primarias aceptables adicionales respecto V1 en los 28 curriculares; falsas abstenciones no superiores; cero incremento de sobreclasificaciones; Privacy FP/FN cero; secundarias incorrectas no superiores. Es criterio de decisión pequeño exploratorio, no significancia. Preferir RAW si CLEAN corrige como máximo un caso (2.5% de 40 o 3.57% de 28), aunque exceda 1 punto por granularidad. No integrar automáticamente.

Validación: pruebas con fetch simulado, guard de fuga de etiquetas y presupuesto; syntax/typecheck local, lint y build. Rollback: volver al respaldo o utilizar prompt V2.3 conservado; conservar resultados y freezes. No rollback de datos porque no se escriben datos de producto.

## Comprobación adicional autorizada de threshold

Antes de congelar V2.4 se simularon confidence 0.50/0.45/0.40 offline, únicamente con DEV existente, para RAW y CLEAN de los cuatro ciclos. En V2.3 no cambia ninguna decisión; el gate de las abstenciones restantes es suficiencia 0.70. Se conserva confidence 0.50. TEST2 no participa en la elección. `config/last-threshold-dev.json` y `docs/LAST_THRESHOLD_DEV.md` guardan resultados y procedencia; su SHA queda incluido en el freeze final. No se modificó suficiencia ni el threshold de secundarias.

Preflight antes de proveedores: 62/62 pruebas, lint, build y syntax/typecheck de 76 archivos PASS. La prueba de replay compara los requests V2.3 nuevos con el snapshot anterior byte por byte: el parámetro opcional solo afecta V2.4. Las cuatro observaciones Privacy ficticias se bloquean antes de modelos, con cero llamadas. Ninguna etiqueta, ID ni adjudicación del caso entra en el input de proveedor.
