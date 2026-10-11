# UX antes y después — QA del 9–10 de octubre de 2026

Recorrido observado de datos sintéticos, no estudio con docentes reales. Se conserva el sistema visual existente. Capturas privadas referenciadas abajo; no se publican nombres ni evidencia en Git. Móvil real 390×844 y escritorio 1366×900. Captura Chrome antigua 12-annual-before-mobile no representa móvil y queda excluida.

| Pantalla | Antes / problema | Decisión | Después / comprobación |
|---|---|---|---|
| Alta y Mi aula | Necesidad de continuar matrícula sin quedar en diagnóstico | Conservar altas continuas y retorno | Seis altas; tres móvil y tres escritorio, datos conservados |
| Diagnóstico | Entrevista parcial y niño sin notas podían confundirse con evidencia escolar | Conservar fuentes separadas y confirmación | Cuatro confirmadas; borrador excluido, ausencia pendiente |
| Mi año | Lectura mostraba matriz de 72 checks y bloque duplicado de planificación | Eliminar ruido de lectura; editar una competencia y sus bimestres | Tarjetas como entrada; edición disponible cuando se solicita |
| Proyecto | Cinco frases prellenadas, demasiado cuerpo, ordinal basado en actividades preparadas | Eliminar frases y falso avance; resumir propósito/criterios/ruta | Dos criterios breves, siguiente día y CTA principal; ruta de ocho días recuperable |
| Hoy | Dashboard retenía actividades anteriores después de guardar nueva | Combinar retorno con actualización de fuentes | Preparar día → guardar → volver a Hoy → abrir; calendario/retorno sin F5 |
| Evaluar | Cobertura técnica y cuatro acciones repetidas por fila | Conservar tres espacios; dos acciones principales por fila | Evidencia → letra y sustento → conclusión → familias; regeneración en detalle |
| Sustento | Tres notas ocultaban motivo aunque análisis indicaba insuficiencia | Compartir condición para campo y confirmación | Sustento visible antes de elegir/confirmar letra |
| Calendario | Contenedor técnico Talleres solicitados y fechas pasadas como realizadas | Eliminar contenedor de lista y supuesto de ejecución | Actividades y talleres reales; fecha de servidor, ningún logro por mera planificación |
| Consolidado | Revisión y cierre debían preservar ausencia y versiones | Conservar control docente y formatos canónicos | A/B y cuatro pendientes sin C, dos cierres, Word/Excel íntegros |

Acciones observadas desde proyecto abierto: preparar siguiente actividad, guardar borrador, confirmar, ir a Hoy y abrir actividad (cinco acciones; seis si se cuenta entrar desde tarjeta). No hay comparación cronometrada de ese mismo recorrido antes: no publicar un porcentaje de ahorro. Cambio estático verificable: cinco sugerencias→cero, cuatro acciones por fila→dos, matriz de lectura de 72 checks→cero; edición se conserva. No contar botones ocultos como acciones realizadas.

Capturas antes: visual/04-annual*, visual/06-project*, visual/08-today*, visual/09-eval*, 12-project-before-desktop.png; archivos exactos en manifiesto privado. Después: visual/12-project-final-desktop.png y mobile.png; 12-today-final-*, 12-activity-final-mobile.png, 12-evaluate-final-mobile.png, 12-consolidated-final-*, 12-calendar-final-*. Sustento y cierre: 11-observation-corrected-mobile.png, 11-reclosed-desktop.png/mobile.png. Comparar solo misma pantalla, viewport y estado pedagógico; los cambios de fecha/datos se identifican como recorrido, no diferencia visual pura.

Se comprobó retorno, F5, estado vacío, error, carga anual larga recuperable y foco de teclado visible. Scroll móvil sin bloqueo en pantallas finales revisadas. Zoom 200% no verificado: intentos de atajo no cambiaron DPR/dimensiones. Foto/importación por API no acredita UX de cámara/importación. Micrófono físico pendiente. G2 permanece bloqueado por zoom; piloto con profesora real es validación posterior con consentimiento y cuenta autorizada.
