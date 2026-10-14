# Calendario antes de preparar y actividad visual — 14/10/2026

Base 9df3aa5, codex/mi-ano-simple-preview. Solo Preview; Production/datos reales excluidos. Reutiliza ProjectCalendarReview, calendario oficial, selección guardada y preparación durable; no motores, modelos, migraciones, RLS ni biblioteca de imágenes nuevos.

## Cambio mínimo y protecciones
Preparar proyecto abre y enfoca el calendario inline antes de generar Master/actividades. Cuenta días, selección con check, fines de semana/feriados/gestión bloqueados; selección modificada participa en guarda de navegación. Confirmar días y preparar acepta una sola vez. API nueva aceptación exige selectedDates explícito antes de mutaciones, valida rango/calendario mediante contratos existentes. Replay de un trabajo ya aceptado conserva días/checkpoints aunque el cliente antiguo no reenvíe la selección. Bloques publicados no vuelven al calendario ni se regeneran.

ActivityReadingView reemplaza exclusivamente presentación de consulta: tarjetas con pictogramas existentes, materiales/preparación, pasos y orientación/criterio/evidencia. Se preserva cada texto; divide Inicio/Desarrollo/Cierre solo si está etiquetado correctamente. Para acciones sin etapas explícitas reutiliza la secuencia V3 ya establecida: situación → acciones → cierre. Textos ambiguos conservan bloque íntegro. No resume con IA ni sobrescribe contenido guardado/Word. Taller guardado continúa visible. Consulta tiene anterior/siguiente, posición/total y Word por exportador existente; ejecución y registro usan flujo existente únicamente para actividad de Hoy. Futuras permanecen en consulta.

Documento propio añade lista compacta de actividades autorizadas del mismo proyecto/propuesta y aula; omite borradores/otras propuestas, conserva versiones históricas. Consulta desde URL obtiene secuencia aunque no venga de lista en memoria.

## Validación ejecutada
33 pruebas distintas: contenido íntegro/etapas, biblioteca/Word/propietario, preparación/replay/confirmación de días, calendario y bloqueos, navegación, continuación y HTTP auth. 32 de 33 pasaron en última tanda simultánea; HTTP no arrancó su fixture bajo carga de builds. Repetición aislada de las dos pruebas HTTP PASS. Typecheck, lint de fuentes, Vinext build y Next build PASS (advertencias preexistentes de tracing).

UI/API/PGlite aislados con 35 alumnos ficticios: año confirmado, calendario abierto sin IA, 19 octubre excluido; nueve actividades del 20 al 30 octubre, sin fines de semana. Feriados 8/9 diciembre y fechas fuera del tramo rechazados por API, y botones de feriados deshabilitados en UI. Intento sin selección rechazado. Proyecto aceptado reabierto sin otra generación. Provider fixture: once respuestas (año, Master, nueve actividades), cero pagadas. Lecturas/replay/exportación posteriores: cero llamadas.

Consulta completa y siguiente actividad PASS, Word HTTP 200, DOCX 399245 bytes y XML conserva Inicio/Desarrollo/Cierre/materiales. Clic Word desde UI llegó a endpoint 200; Chrome no entregó evento de descarga al controlador, por lo que no se declara verificado el evento nativo. Exportador/content verificados directamente. Capturas escritorio/móvil y calendario, ancho móvil 375 px igual a scrollWidth; viewport temporal restablecido. Captura fullPage de Chrome falló por timeout, usadas capturas de viewport. Evidencia privada .local/activity-calendar-20261014. No mutaciones cloud ni llamadas pagadas.

## Publicación y rollback
Pendiente recibo de commit/Preview READY y smoke. Rollback de código c452e01 conserva Master, selecciones y actividades. No revertir ni eliminar datos.
