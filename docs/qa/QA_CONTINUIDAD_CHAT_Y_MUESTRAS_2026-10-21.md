# Continuidad del chat y muestras pedagógicas

## Alcance y diseño previo

La usuaria autoriza pruebas adicionales de recuperación, tiempos, peticiones simultáneas y nuevas muestras revisadas con MINEDU/CNEB, conservando lo que funciona. Su aclaración posterior pide eliminar la pantalla intermedia y mantener en backend lo que sea necesario: Familias → Observar → Ayni → Mi año.

La matriz ya tenía «Continuar con Ayni»; durante el QA abrimos su acceso secundario al diagnóstico. Hay dos fricciones comprobadas en código: captura conduce obligatoriamente a la matriz y el callback anual no identifica conversación, por lo que un año existente abre su consulta. Además, salir del editor diagnóstico mediante «Continuar a Mi año» confirmaba el borrador. Por pedido explícito se elimina DiagnosticBriefReview de ambos recorridos, se retira su acceso y el enlace antiguo redirige al chat, conservando el backend y los documentos existentes.

Cambio mínimo vertical: acceso principal directo al chat, matriz de observaciones como consulta secundaria, intención de conversación explícita y sin generar año/confirmar diagnóstico al navegar. La conversación ya recibe entrevistas y observaciones mediante snapshot canónico; no necesita aprobar una síntesis IA. Sin cambios en modelos, currículo, prompts, RLS, migraciones o datos históricos. Abrir una conversación sin historial mantiene la primera respuesta de chat prevista por el producto; no se confunde esa respuesta con generar el diagnóstico o el año.

Validación: pruebas de continuidad con y sin año guardado, fuentes del chat sin diagnóstico confirmado, guardado antes de salir y cero confirmaciones/generaciones al navegar. Gates typecheck/lint/build y revisión real de escritorio/móvil antes de publicar en QA. Rollback de componentes conserva fuentes, propuestas y documentos; no borrar trabajos ni reescribir confirmados.

Nuevas generaciones: techo conservador de seis creaciones reales en toda esta ronda, incluyendo fallos; contador persistente antes de enviar, consultas separadas. Copia aislada de datos sintéticos QA, sin medios ni escrituras pedagógicas remotas para las muestras. Conservar quince proyectos de dos o tres semanas y plantillas aprobadas. Registrar tiempos, costos y limitaciones; simulaciones y peticiones de lectura no acreditan capacidad masiva de generaciones.

## Estado

Implementación y comprobaciones pendientes. No se declara publicación ni calidad de nuevas muestras hasta obtener evidencia.
