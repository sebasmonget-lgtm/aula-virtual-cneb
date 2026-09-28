# Usabilidad, imperfecciones y trabajo docente

La prueba fue automatizada por interfaz en computadora y una vista responsive 390×844; no es un estudio con profesoras reales ni una certificación WCAG. Se conservó la misma app y se restableció el viewport al terminar.

## Lo que facilita el trabajo

Campos con etiquetas y contornos visibles; Añadir alumno explícito; preguntas de entrevista en una columna y sin ocultar secciones; Guardar confirma entrevista y vuelve a alumnos. El comentario por niño es opcional. Las competencias no llenan toda la pantalla al registrar una observación: Ayni recomienda automáticamente y la docente puede cambiar/agregar. Los ejemplos de experiencia guiada aparecen directamente. Navegación de planificación indica qué falta y no marca como completado solo por visitar una pantalla.

Año escolar y semanas de gestión vienen precargados. El mapa distingue Sin observaciones de niveles. Los textos del contador distinguen costo aproximado y estimaciones. Son resultados comprobados, no recomendaciones de rediseño.

## Fricción observada

| Situación | Impacto para la docente | Evidencia |
| --- | --- | --- |
| Volver desde entrevista sin guardar | Pierde respuesta sin aviso; debe escribirla otra vez | H01 |
| Guardar/confirmar plan dice revisar fila 1 | No explica qué dato es inválido ni da recuperación viable | H08 |
| Taller ofrece Biblioteca pero exige proyecto después | Camino aparentemente disponible termina sin alternativa | H09 |
| Hoy→Observar abre diagnóstico | No sabe si está anotando diagnóstico o evidencia del período | H10 |
| Observar Listo 15/15 incluye anécdota insuficiente | Puede confundir registro realizado con suficiencia | H06 |
| Jev falla por «mamá» y muestra respuesta genérica | Parece falta de detalle curricular, no filtro local | H03 |
| Tabla anual en celular requiere horizontal + vertical | Difícil asociar título, razón y acción; no hay pista visible de deslizamiento | H15 |
| Word completo no coincide con alcance de preview | Confirma tres textos sin revisar todas las derivaciones exportadas | H14 |
| Exportar SIAGIE deshabilitado y Word/PDF progreso futuros | No completa los documentos esperados para familias/cierre | H17 |

En celular, el área de tabla mide aproximadamente 308 px y su contenido 934 px. Editar permanece fijo a la derecha y deja poco ancho para datos. Al deslizar se leen justificaciones sin el título de la fila visible; las filas crecen por el contenido de otras columnas. La página exterior no desborda, por lo que no se etiqueta automáticamente como fallo de reflow WCAG: las tablas tienen excepciones. Capturas 07–09 muestran la dificultad real.

Como referencia para revisar controles, WCAG 2.2 AA tiene un mínimo de 24 CSS px con excepciones, no una obligación universal de 44 px. No se midieron sistemáticamente contraste, foco, teclado, lector de pantalla o todos los tamaños de objetivo. Fuentes: [WCAG 2.2](https://www.w3.org/TR/wcag/), [tamaño mínimo de objetivos](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum).

## Escenarios de imperfección

| Escenario | Resultado |
| --- | --- |
| Código modular, nombre preferido u otros opcionales vacíos | PASS: permiten avanzar |
| Fecha de nacimiento opcional vacía | PASS; persistencia de una fecha NO VALIDADA, ver 02 |
| Mayúsculas/minúsculas y tildes | PASS: nombres normalizados en lista |
| Errores leves, notas cortas/largas, abreviación Gabi | Clasificación real ejecutada; resultados en 08 |
| Nota vaga o anécdota no curricular | PASS: abstención en J15/J20, no C |
| Nota multicompetencia | PARTIAL: conjunto acertado, adoptar solo principal requirió agregar secundaria |
| Volver antes de guardar entrevista | FAIL: pierde texto sin aviso |
| Refrescar plan guardado | PASS: recupera borrador original; no regenera ni pierde doce propuestas |
| Editar plan después de generar | FAIL: guardar edición no funciona |
| Confirmar original | FAIL: no es workaround |
| Generación anual duplicada accidental | No se hizo una segunda llamada; borrador guardado impide repetir Proponer como paso normal. Idempotencia de dos clics concurrentes NO PROBADA |
| Regenerar/cancelar generación en curso | NO PROBADO: no se ejecutó cancelación; no se declara ahorro o reembolso |
| Cero evidencias del período | PASS: cuatro barreras sin generar valoraciones/informes |
| Dictado y grabación hasta soltar | Control visible; audio/transcripción real NO PROBADOS |
| Sin red, timeout, cuota/402 en esta auditoría | NO PROBADOS; fallos históricos no se presentan como resultados actuales |

## Trabajo aproximado, no benchmark humano

«Acción» es pulsar, seleccionar o llenar un control. Los rangos se reconstruyen del recorrido, no de un contador exhaustivo. Los tiempos son ventanas de automatización, con lectura/documentación entre ellas; una profesora puede tardar bastante más.

| Proceso | Acciones aproximadas | Inputs/decisiones esenciales | Tiempo observado aproximado |
| --- | --- | --- | --- |
| Perfil y aula | 20–30 | 3 datos obligatorios, edad/año; opcionales y logo | 1–2 min |
| 15 alumnos | 45–65 | 30 textos de nombre/apellido; 15 altas | 1–2 min automatizados; fechas no validadas |
| 15 entrevistas | 140–200 | Aproximadamente 5 respuestas textuales por alumno, lenguas/intereses; 15 guardados | 2–4 min automatizados |
| 5 notas guiadas | 20–30 | 5 textos; seleccionar niño/foco; sin nivel final | Cerca de 1 min |
| 24 espontáneas/Jev | 100–160 | 24 textos, contextos/apoyo; revisión y 3 correcciones | 3–5 min incluyendo comprobaciones |
| Mapa, comentario Mateo, grupo y prioridades | 20–35 | 1 comentario individual, 3 textos grupales revisados, 3 prioridades confirmadas | 4–6 min con documentación |
| Plan anual | 8–15 más lectura | 1 generación, 1 edición fallida, 2 rutas de confirmación/recarga | ~51 s inicio→ledger; varios min de revisión |
| Barreras de evaluación/documentos | 20–35 | 4 períodos; preparación sin evidencia; informe/Excel/Word | 3–5 min de exploración |

Total orientativo de interacción: 370–570 acciones; no sumar estos minutos como tiempo de trabajo docente real. No hay regeneraciones exitosas en los tres flujos OpenAI medidos. El ahorro demostrado es organizar/reutilizar entrevistas y clasificar/preproponer; el bloqueo consume revisión y evita aprovechar el resto del sistema. No se estimó el esfuerzo real de cerrar un año porque no se pudo ejecutar.
