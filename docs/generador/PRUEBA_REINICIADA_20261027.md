# Prueba reiniciada desde Mi año · 2026-10-27

Petición expresa: «mejor borra desde el plan anual, los nombres dejalos». Sustituye la restricción anterior de conservar la planificación visible; no autoriza generar un año nuevo por la usuaria.

Se reutiliza `scripts/prepare-clean-generator-trial.mjs` para preparar un almacén nuevo con colegio, docente, aula y los cuatro estudiantes existentes. Se comparan exactamente nombres, apellidos, nombres preferidos, edades, fechas de nacimiento y matrícula; también institución, docente, sección, edades, UGEL, distrito, dirección y código institucional del contexto. El calendario anterior no era institucional. No se copian planificación, proyectos, actividades ni trabajos de IA.

Almacén activo: `generador-prueba-chat-20261027-reinicio`. Launcher local: 24680. Puertos de variante: 5185/8805. El almacén anterior `generador-prueba-chat-20261025` conserva el estado previo como respaldo recuperable; no se borran directorios ni se toca el Ayni original. Reversión: detener únicamente el launcher de variante identificado y ejecutar el mismo lanzador con el almacén anterior, sin clean-start.

Verificación funcional: API confirma cero planes anuales, proyectos, actividades, documentos y trabajos; cuatro estudiantes e identidad del colegio coincidentes. IA real continúa configurada, sin llamadas nuevas. Navegador abierto en `http://127.0.0.1:5185/#mi-ano`: muestra «Conversa con Ayni», pregunta inicial sobre espacios disponibles, campo vacío y botón «Crear Mi año». No se responde el chat ni se genera contenido. Captura: `output/generador-documentos/reinicio-anual-20261027.png`; comparación privada local en `.local/reinicio-anual-20261027-before.json` y `-after.json`.

No hay cambios de implementación, prompts o plantillas en esta operación. Se usa el código ya validado y el formato mejorado de las descargas. No se ejecutan de nuevo typecheck, lint o build por un cambio de datos de prueba; se valida el flujo aplicable mediante API y navegador.
