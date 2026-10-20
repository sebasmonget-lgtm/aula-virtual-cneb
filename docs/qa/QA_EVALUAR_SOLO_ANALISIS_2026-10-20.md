# Evaluar: análisis breve sin nota sugerida

20/10/2026. Instrucción vigente de la persona usuaria: la IA entrega solo el análisis; AD/A/B/C lo decide la profesora. El párrafo debe tener entre 30 y 70 palabras. Implementado localmente; no publicado.

## Cambio completo

El perfil compacto recibe únicamente nombre/edad, período, competencia y capacidades, un estándar oficial del ciclo II, desempeños oficiales solo de esa edad, criterios previstos y observaciones originales fechadas. No se entrega escala de notas ni calificaciones anteriores, imágenes, asistencia, entrevistas o documentos completos. Las notas previas se consultan por separado para la interfaz docente.

La solicitud pide actuaciones concretas, avances/apoyo realmente registrado y un foco para seguir observando. No inventar autonomía si el registro no especifica apoyo; no completar con dificultades por aspectos no observados. Se mantienen las notas originales y se distingue propósito previsto de hecho observado. No exigir todas las actuaciones ni un mínimo inventado de días.

El esquema assessment-brief-v2 contiene seis campos: competency_id, student_name, information_status, analysis_paragraph, evidence_refs y performance_refs. Se eliminan suggested_level y suggestion_reason; se rechazan claves extra y expresiones explícitas de nota/nivel dentro del párrafo. Se valida nombre, competencia, referencias, un párrafo, dos o tres frases y 30–70 palabras; la instrucción apunta a 40–55 para tener margen. La respuesta se adapta al contrato de análisis previo sin crear niveles.

El detalle y la caché no devuelven ai_suggestion. Se retira el panel, incluidos sus tipos/copia, y una sugerencia antigua en metadatos no se presenta. No se borran metadatos históricos ni se alteran valoraciones docentes, documentos o evidencias. Preparar conserva tres solicitudes simultáneas, guardado/reanudación y confirmación anticipada de cinco segundos; su descripción deja claro que la nota la elige la profesora.

## Referencia del bimestre anterior

Consulta con autorización existente del aula: mismo año y tipo de período, período inmediatamente anterior, mismo niño y competencia. Solo valoración activa confirmada por docente; excluye borradores y versiones archivadas, sin usar notas de otro niño/competencia. Admite registros antiguos sin ID de período mediante fechas exactas. Si el período anterior no tiene nota, muestra esa ausencia sin saltar a un bimestre más antiguo; en el primer período se indica que no hay anterior del año. Se conserva el historial sin enviarlo a la IA.

La referencia aparece junto a la valoración docente, también en casos sin observaciones actuales. Si la profesora elige una nota menor, aparece un aviso informativo para revisar evidencias y contexto. No bloquea ni cambia automáticamente su decisión: no se convierte la expectativa de progreso en una regla de promoción monotónica.

## Comprobación

89 regresiones PASS, incluidas API sin nota/caché histórica, guardado sin valoración automática, concurrencia/reanudación, conflictos reales y control de período, selección correcta de la nota previa, ausencia intermedia, primer bimestre, legado por fechas y acceso ajeno rechazado. Cinco pruebas unitarias del perfil son subconjunto, con límites exactos 29/30/70/71 palabras. Lint, TypeScript y builds Vinext/Next webpack PASS.

UI local con componentes reales y respuestas simuladas: escritorio y móvil de 390px, análisis visible, nota previa A de Bimestre3 identificada como confirmada docente, ningún radio actual marcado, sugerencia heredada ignorada y aviso al elegir B manualmente. Esa A es un dato controlado de la revisión visual; no se insertó en la cuenta QA. Capturas en outputs/evaluar-sin-nota-20261020/.

IA real: tres casos con Luna high y el perfil final, todos válidos, sin nota y con 54/61/63 palabras. No equivale a certificación pedagógica ni comparación completa del formato nuevo entre esfuerzos. Se conservó el hash de todas las valoraciones/borradores cloud. Solo se generó telemetría. El modelo configurado para el producto no se cambia en esta prueba.

Antes de este último límite, un resultado superó las100palabras y fue rechazado. Se orientó a un rango con margen y se comprobó el caso, sin truncar un texto generado ni guardarlo como válido. Tras la aclaración de la persona usuaria, el rango definitivo pasó a30–70 y se verificaron los tres casos de nuevo. Las ejecuciones anteriores se conservan como auditoría histórica y no se mezclan con la validación final.

Costo estimado de las tres verificaciones finales: USD0.001966775. Siete llamadas de verificación de los distintos formatos en total: USD0.006012475. Incluida la ronda high anterior con notas, esta etapa suma USD0.014782610. No es precio fijo del bimestre ni factura. Se mantiene el máximo acumulado QA de USD6.

Sin migraciones, escrituras pedagógicas cloud, commit, push o despliegue. Rollback: Revertir perfil breve y presentación/consulta del historial como grupo; no borrar ni recalcular notas guardadas ni reescribir migraciones. Los contratos y documentos previos permanecen.

## Ejemplos del formato final

### Luciana Torres Medina · 54 palabras

En “La tienda”, Luciana eligió la bolsa roja y pidió sentarse junto a su amiga; no se registró qué hizo al repartir o contar. Por eso, no hay evidencia para valorar cómo compara cantidades ni si necesitó apoyo. Falta observar si entrega objetos uno a uno y expresa qué grupo tiene más o menos.

### Alma Flores Ruiz · 61 palabras

Alma comparó dos versiones, explicó las intenciones del personaje con palabras e ilustraciones y buscó partes del cuento para sostener su propuesta sobre el final. Sus actuaciones muestran interpretación de pistas y razones, en relación con los referentes de su edad. Las notas no precisan el apoyo recibido; conviene observar qué pistas usa al anticipar cómo seguirá o terminará otro texto.

### Daniel Vega Rojas · 63 palabras

Daniel puso tres vasos para cuatro compañeros y dijo que todos tenían uno; cuando la docente señaló al compañero sin vaso, lo reconoció. En otros repartos, entregó un objeto por persona con modelo o apoyo directo, pero al retirar la ayuda volvió a juntar varios objetos con un niño. Conviene observar si reparte y comprueba quién recibió sin esa ayuda, en distintas situaciones.
