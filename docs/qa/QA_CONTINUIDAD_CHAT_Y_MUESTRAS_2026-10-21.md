# Continuidad del chat y muestras pedagógicas

## Alcance y diseño previo

La usuaria autoriza pruebas adicionales de recuperación, tiempos, peticiones simultáneas y nuevas muestras revisadas con MINEDU/CNEB, conservando lo que funciona. Su aclaración posterior pide eliminar la pantalla intermedia y mantener en backend lo que sea necesario: Familias → Observar → Ayni → Mi año.

La matriz ya tenía «Continuar con Ayni»; durante el QA abrimos su acceso secundario al diagnóstico. Hay dos fricciones comprobadas en código: captura conduce obligatoriamente a la matriz y el callback anual no identifica conversación, por lo que un año existente abre su consulta. Además, salir del editor diagnóstico mediante «Continuar a Mi año» confirmaba el borrador. Por pedido explícito se elimina DiagnosticBriefReview de ambos recorridos, se retira su acceso y el enlace antiguo redirige al chat, conservando el backend y los documentos existentes.

Cambio mínimo vertical: acceso principal directo al chat, matriz de observaciones como consulta secundaria, intención de conversación explícita y sin generar año/confirmar diagnóstico al navegar. La conversación ya recibe entrevistas y observaciones mediante snapshot canónico; no necesita aprobar una síntesis IA. Sin cambios en modelos, currículo, prompts, RLS, migraciones o datos históricos. Abrir una conversación sin historial mantiene la primera respuesta de chat prevista por el producto; no se confunde esa respuesta con generar el diagnóstico o el año.

Validación: pruebas de continuidad con y sin año guardado, fuentes del chat sin diagnóstico confirmado, guardado antes de salir y cero confirmaciones/generaciones al navegar. Gates typecheck/lint/build y revisión real de escritorio/móvil antes de publicar en QA. Rollback de componentes conserva fuentes, propuestas y documentos; no borrar trabajos ni reescribir confirmados.

Nuevas generaciones: techo conservador de seis creaciones reales en toda esta ronda, incluyendo fallos; contador persistente antes de enviar, consultas separadas. Copia aislada de datos sintéticos QA, sin medios ni escrituras pedagógicas remotas para las muestras. Conservar quince proyectos de dos o tres semanas y plantillas aprobadas. Registrar tiempos, costos y limitaciones; simulaciones y peticiones de lectura no acreditan capacidad masiva de generaciones.

## Estado

Primer código de navegación `408a81a` publicado solo en QA: 66 comprobaciones de Preview/alias PASS, build limpio, typecheck y lint. 114 regresiones PASS. Enlace antiguo abierto por UI llega al chat, conserva dos mensajes docentes anteriores y el año existente. Backend diagnóstico y documentos intactos; no se confirma el borrador v4. La respuesta inicial actualiza la conversación con fuentes vigentes y no genera un año.

## Muestras y mejora pedagógica general

Seis creaciones máximas alcanzadas: diagnóstico, proyecto maestro, actividad inicial, informe familiar, primera respuesta del chat actualizado y actividad revisada. Diagnóstico recuperado en copia local tras 210,328 s sin consultas y con la base cerrada; una creación, una consulta al volver y nota docente conservada. Once lecturas válidas. Proyecto de dos semanas y diez actividades en 197,689 s; primera actividad 11,826 s, redacción familiar 13,158 s y actividad revisada 15,277 s aproximadamente, con tiempos exactos en recibos. No se regenera el plan anual aprobado.

La primera actividad añadía «la prueba aún no se realiza», aunque el mapa solo pedía recoger anticipaciones antes de organizar una comparación. Ajuste general en el generador diario: no introducir prohibiciones ausentes del mapa y permitir un primer intento después de anticipar, con recursos/condiciones autorizados, sin adelantar la comparación sistemática ni cambiar el criterio. La nueva muestra conserva el propósito, criterio, referencias oficiales y momentos observacionales; recoge la anticipación y permite probar una posición. No es una nueva regla normativa del MINEDU que obligue a experimentar cada día: es una mejora didáctica situada, coherente con exploración y planificación flexible del Programa de Inicial (pp.36–37 y185–190).

Diagnóstico diferencia observación, interpretación y contexto familiar; sus lecturas hablan de algunos niños y conservan referencias. Proyecto conserva preguntas, primeras ideas, decisiones, pruebas, comparación, comunicación y respuesta provisional, con apoyos y flexibilidad. Informe familiar preserva conclusiones originales y una redacción accesible por competencia, sin notas de IA, comparaciones entre niños o tareas obligatorias. Ninguna muestra acredita ejecución ni evaluación real. El proyecto reutiliza el caso sintético local autorizado de dos semanas de la ronda anterior, con su procedencia declarada; no se trasladan esas fuentes ajustadas a QA. Diagnóstico y familia usan copia actual con fechas originales. Plantillas conservadas.

Archivos oficiales CNEB y Programa de Inicial descargados de minedu.gob.pe: hashes coinciden con el catálogo versionado. Se consultan planificación flexible, criterios/evidencias y exploración/indagación. El repositorio de guías devuelve verificación de seguridad en esta consulta; no se declara lectura nueva íntegra de esas guías ni certificación MINEDU.

Ensayo cloud de lectura: doce peticiones, tres simultáneas, misma cuenta; mediana384 ms, rango213–2677 ms, sin errores ni generaciones. No es prueba de muchas docentes generando a la vez. Las pruebas de veinte docentes siguen siendo simuladas; no se sube concurrencia cloud ni se cambia hosting o conexiones.

Después de abrir el chat: 64 tablas pedagógicas sin cambios, año y diagnósticos intactos, conversaciones anteriores conservadas y una conversación nueva que arrastra los dos mensajes docentes. Una nueva llamada Luna, US$0,0041053. Total ronda US$0,2257692 estimados por seis creaciones; cero costos nuevos desconocidos. Los siete intentos históricos sin precio siguen separados. Dos fallos del harness ocurrieron después de producir salidas válidas (selección de estado del informe y columna de medición); se corrigieron sin repetir esas generaciones. No son cuatro fallos de Ayni ni llamadas extra.

Pendiente al escribir: gates/publicación del ajuste de instrucción diario, inspección final de Word y cierre de entrega. El viewport móvil solicitado al navegador no cambió sus píxeles; no se declara una nueva comprobación móvil real.

### Ajuste final de presentación

La inspección visual encontró un título de criterio dividido entre páginas en la actividad. Causa: fila de observación divisible; solución acotada al Word de actividad: mantener cada bloque de observación unido y los referentes cortos con su título. Los demás consumidores del layout conservan su comportamiento por defecto. Sin cambios en texto, decisiones ni plantillas gráficas. Muestra final de actividad: cinco páginas legibles, sin el título cortado; nuevo total de muestras: 36 páginas. Rollback: revertir únicamente el ajuste de paginación. Las pruebas Word existentes y gates se repetirán desde commit limpio antes de publicar el ajuste.
