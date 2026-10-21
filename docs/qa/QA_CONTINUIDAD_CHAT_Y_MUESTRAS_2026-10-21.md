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

Seis creaciones máximas alcanzadas: diagnóstico, proyecto maestro, actividad inicial, informe familiar, primera respuesta del chat actualizado y actividad revisada. Diagnóstico recuperado en copia local tras 210,328 s sin consultas y con la base cerrada; una creación, una consulta al volver y nota docente conservada. Once lecturas válidas. Proyecto de dos semanas y diez actividades en 197,689 s; primera actividad 11,826 s, redacción familiar 13,158 s y actividad revisada 15,930 s (traza: 15,551 s), con tiempos exactos en recibos. No se regenera el plan anual aprobado.

La primera actividad añadía «la prueba aún no se realiza», aunque el mapa solo pedía recoger anticipaciones antes de organizar una comparación. Ajuste general en el generador diario: no introducir prohibiciones ausentes del mapa y permitir un primer intento después de anticipar, con recursos/condiciones autorizados, sin adelantar la comparación sistemática ni cambiar el criterio. La nueva muestra conserva el propósito, criterio, referencias oficiales y momentos observacionales; recoge la anticipación y permite probar una posición. No es una nueva regla normativa del MINEDU que obligue a experimentar cada día: es una mejora didáctica situada, coherente con exploración y planificación flexible del Programa de Inicial (pp.36–37 y185–190).

Diagnóstico diferencia observación, interpretación y contexto familiar; sus lecturas hablan de algunos niños y conservan referencias. Proyecto conserva preguntas, primeras ideas, decisiones, pruebas, comparación, comunicación y respuesta provisional, con apoyos y flexibilidad. Informe familiar preserva conclusiones originales y una redacción accesible por competencia, sin notas de IA, comparaciones entre niños o tareas obligatorias. Ninguna muestra acredita ejecución ni evaluación real. El proyecto reutiliza el caso sintético local autorizado de dos semanas de la ronda anterior, con su procedencia declarada; no se trasladan esas fuentes ajustadas a QA. Diagnóstico y familia usan copia actual con fechas originales. Plantillas conservadas.

Archivos oficiales CNEB y Programa de Inicial descargados de minedu.gob.pe: hashes coinciden con el catálogo versionado. Se consultan planificación flexible, criterios/evidencias y exploración/indagación. El repositorio de guías devuelve verificación de seguridad en esta consulta; no se declara lectura nueva íntegra de esas guías ni certificación MINEDU.

Ensayo cloud de lectura: doce peticiones, tres simultáneas, misma cuenta; mediana384 ms, rango213–2677 ms, sin errores ni generaciones. No es prueba de muchas docentes generando a la vez. Las pruebas de veinte docentes siguen siendo simuladas; no se sube concurrencia cloud ni se cambia hosting o conexiones.

Después de abrir el chat: 64 tablas pedagógicas sin cambios, año y diagnósticos intactos, conversaciones anteriores conservadas y una conversación nueva que arrastra los dos mensajes docentes. Una nueva llamada Luna, US$0,0041053. Total ronda US$0,2257692 estimados por seis creaciones; cero costos nuevos desconocidos. Los siete intentos históricos sin precio siguen separados. Dos fallos del harness ocurrieron después de producir salidas válidas (selección de estado del informe y columna de medición); se corrigieron sin repetir esas generaciones. No son cuatro fallos de Ayni ni llamadas extra.

El ajuste diario se publicó primero en e247ab0 (66 checks PASS). La inspección final detectó el detalle de paginación documentado abajo. El control de tamaño del navegador no tuvo efecto inmediato; al recargar se comprobó una vista estrecha del chat. El recorrido móvil completo sigue pendiente.

### Ajuste final de presentación

La inspección visual encontró un título de criterio dividido entre páginas en la actividad. Causa: fila de observación divisible; solución acotada al Word de actividad: mantener cada bloque de observación unido y los referentes cortos con su título. Los demás consumidores del layout conservan su comportamiento por defecto. Sin cambios en texto, decisiones ni plantillas gráficas. Muestra final de actividad: cinco páginas legibles, sin el título cortado; nuevo total de muestras: 36 páginas. Rollback: revertir únicamente el ajuste de paginación. Las pruebas Word existentes y gates se repetirán desde commit limpio antes de publicar el ajuste.


## Cierre verificado

Código final `67369618289a7ecb3a7efb34f61426a53f600def`, deployment `dpl_FgC4fZFXqSdH3mEqvD1maR55DZaG`, Preview `https://ayni-aula-staging-59gogaffv-ayni4.vercel.app`, alias QA habitual, región gru1. 66 comprobaciones Preview/alias PASS, fuentes y consumo sin cambios durante smoke; Producción sigue en dpl_H19YWzRdGjkgh8y72QAd1qBty7Mf. Commit limpio y sincronizado utilizado para publicar.

Gates finales desde checkout limpio: typecheck 4,544 s, lint 28,723 s y build canónico 15,617 s PASS; 28 pruebas Word PASS. Las 114 regresiones verificaron la navegación/servicios antes de los dos ajustes finales; las 24 de actividad verificaron el prompt; hay pruebas compartidas y no se suman como únicas. Una invocación directa errónea de Next/Turbopack falló por el enlace node_modules del worktree: el proyecto utiliza scripts/run-framework.mjs (vinext), cuyo build pasó. Se conserva esa incidencia de control en tiempos, sin modificar el framework ni atribuirla a fallo funcional de Ayni.

Se inspeccionaron 36 páginas nuevas: diagnóstico 14, proyecto 13, actividad 5 e informe 4. Reporte de dos páginas revisado. El plan anual de cuarenta páginas se incluye byte idéntico al ya auditado, sin regeneración ni nueva afirmación de revisión completa. Las salidas son borradores aislados, sin confirmar ni enviar a familias. Las proyecciones de descarga usan los renderers canónicos: diagnóstico unificado y bloques pedagógicos de actividad; se corrigió el arnés de exportación antes de entregar, sin cambiar esas plantillas ni datos en línea.

La recarga final conservó el chat actual, sus dos decisiones docentes y el año previo; 64 tablas, diagnósticos, archivos y conversaciones anteriores intactos. La captura 014a documenta el chat en vista estrecha; 013a/013b quedan históricas y excluidas del montaje. No hay video montado ni comprobación completa móvil. No se afirma capacidad de generaciones masivas.

Techo final: seis creaciones reales, US$0,2257692 estimados nuevos, cero costos nuevos desconocidos. Acumulado conocido US$1,37547862 por 102 llamadas; siete intentos históricos sin precio separados. No hubo nuevas fotos/audio enviados a IA. Entrega: outputs/Ayni-chat-y-muestras-2026-10-21 y ZIP homónimo, con seis Word, captura, tiempos, costos, hashes y alcance. Ver recibos privados en .local/continuidad-chat-muestras-20261021. No se toca el trabajo paralelo de Mirai.
