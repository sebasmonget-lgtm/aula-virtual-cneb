# Actividad: criterio principal y recorrido pedagógico

## Problema y solución

Una actividad con cinco criterios podía mostrar Oralidad como principal y, al lado, una evidencia de Convivencia. Los criterios nuevos se insertaban con el mismo `display_order=0`; la consulta elegía la primera fila sin relacionarla con `details.competency_id`.

El guardado asigna orden explícito. Las lecturas existentes priorizan la competencia principal declarada, sin reescribir datos históricos. Documentos, detalles, Word y la proyección usada en Hoy conservan cada criterio con su propia evidencia. Si falta el criterio principal no se sustituye silenciosamente por otro. Las competencias adicionales siguen disponibles; detalles las muestra en un desplegable con el estilo existente.

Los códigos de competencia en prosa de planificación se presentan con las etiquetas compartidas de Ayni. Las observaciones literales y los referentes oficiales no se transforman. El prompt pide nombres comprensibles en la prosa y reserva IDs para campos estructurados.

## Word

Portada de actividad sin desbordamiento de la vista breve; propósito íntegro en el cuerpo. Se conservan criterios por momento y se evita repetir sus focos/evidencia completa. El registro gana ancho para la observación cuando no hay adjuntos, sin ocultar archivos si existen. Encabezados repetidos y cada registro nominal se mantienen juntos. Se conserva la papelería, fuente, ilustraciones y paleta de Ayni.

Proyecto conserva el tramo anual de 2–3 semanas y aclara cuántos días se eligieron realmente. Si una actividad integra varias competencias, la ruta presenta criterios y evidencias con ancho legible, evitando tres columnas con dos celdas vacías durante páginas enteras. No se recortan los referentes oficiales.

## Recorrido efectuado

- Cuenta sintética QA: diez entrevistas confirmadas, cincuenta observaciones diagnósticas activas y diez comentarios individuales. Se preserva el dictado de Abril.
- Nuevo mapa del proyecto 15 válido sin reparación tras corregir contexto de reparación y cantidad de días; una actividad real disponible el 18 de diciembre. No se inventan actividades en días pasados.
- Treinta observaciones ordinarias guardadas por la API canónica, una capturada desde Hoy: tres por niño, criterio e identidad comprobados. La descarga con esos treinta registros y la reflexión docente se renderizó y revisó en sus 17 páginas. La misma fuente con la primera maquetación revisada tenía 21 páginas.
- Copia local aislada: proyecto 13 con diez actividades en dos semanas. Un mapa y diez actividades generados; recorrido completo en 337,352 segundos. Pregunta inicial → comparación → registros → revisión de ideas → explicación → nueva prueba → repetición → aclaración → respuesta con evidencias → intercambio final. Sin escrituras remotas ni medios enviados a IA.
- La copia desplaza únicamente sus fechas de fuentes sintéticas para revisar planificación futura; no acredita ejecución real ni revalida diagnósticos clonados. Manifiesto y fuentes fuera de Git.
- Guardado de 29 observaciones ordinarias: 245–414 ms, media 268,76 ms por petición, excluido inicio de autenticación y consultas. No se atribuye esta medición a la interacción completa de una profesora.

## Validación y publicación

Regresiones de orden arbitrario de SQL, vínculo criterio/evidencia, otro propietario, transacción/rollback, conservación literal y exportación con/sin archivos. Typecheck, lint y build Vinext ejecutados correctamente en esta ronda; el resultado final de la suite y la publicación se registra en el recibo de entrega. Las versiones finales publicadas deben descargarse y comprobarse después de publicar; las maquetas locales no se presentan como descargas de Vercel.

Evaluación, conclusiones, informes familiares e informe del aula siguen en revisión durante esta entrega. Treinta decisiones de demostración se guardan únicamente en la cuenta QA para recorrer el flujo; no son calificaciones de niños reales ni una regla automática para asignar letras con una sola actuación.

## Datos, coste y rollback

Sin migraciones, cambios de permisos ni escrituras en Producción. Sin reclasificar observaciones ni modificar originales confirmados. La suma provisional anterior a evaluación es USD 0,77534191 por 21 llamadas registradas (incluye la secuencia local); cinco intentos del gateway tienen consumo desconocido y se contabilizan aparte. No equivale a una factura ni al saldo vigente de un plan prepago.

Rollback: revertir este cambio de presentación/orden y devolver el alias QA a la Preview previa 4ad5349. Los datos canónicos y documentos confirmados conservan su historial. No cambiar el alias de Producción. El archivo de router de IA ajeno a esta ronda queda fuera del commit.
