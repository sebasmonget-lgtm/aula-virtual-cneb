# Cierre de la auditoría pedagógica de QA

## Resultado y alcance

Revisión desde entrevistas hasta informes familiares, con datos sintéticos autorizados. Diez entrevistas confirmadas (80 respuestas), cincuenta observaciones diagnósticas activas (20 libres/30 guiadas), diez comentarios individuales, diagnóstico v2 confirmado con once lecturas por competencia, plan anual activo con quince propuestas y proyecto 15 con la actividad disponible al cierre del calendario. Se mantiene la decisión de quince proyectos de dos o tres semanas; no se atribuye al MINEDU.

Se contrastaron las interpretaciones con sus fuentes, distinguiendo entrevista familiar de observación del aula, ayuda recibida de dificultad e interpretación de nivel de logro. Fuentes primarias: CNEB, Programa Curricular de Inicial, orientaciones MINEDU de diagnóstico, planificación y proyectos y norma de evaluación 094-2020/modificatoria 048-2024. Se consultaron los apartados pertinentes, sin afirmar certificación oficial ni lectura íntegra de todas las publicaciones. Los PDF de orientaciones generales 2026 que devolvieron una verificación de seguridad no se presentan como leídos.

## Generación y correcciones

- Diagnóstico: lectura y siguiente paso por competencia con respaldo de esa competencia; seguimiento nominal basado en comentario confirmado y disponibilidad antes de sugerir tecnología. Sin niveles automáticos ni cuotas de suficiencia.
- Anual: quince propuestas revisadas, lenguaje sencillo, decisiones infantiles, recursos reales del aula, escritura propia y apoyos. Word de 54 a 40 páginas conservando contenido.
- Proyecto: reparación recibe tarea y cardinalidad completas. Una fecha elegida admite alternativas con criterios propios, sin inventar cinco actividades en ese día ni exigir todas las alternativas a cada niño.
- Actividad: orden explícito de criterios y selección por competencia principal declarada. Hoy, detalles y Word mantienen cada criterio con su evidencia. No se reescriben observaciones literales. Word con treinta registros y reflexión: 17 páginas frente a 21 de la primera maqueta con los mismos registros.
- Evaluación: treinta análisis y treinta conclusiones contrastados individualmente con fuentes. Diez informes familiares de cuatro páginas, con ejemplos, apoyos y propuestas opcionales para casa. Sin convertir asistencia no registrada en faltas.

Treinta valoraciones A son decisiones explícitas del escenario sintético para recorrer el flujo, no notas elegidas por IA ni una validación de notas reales con una sola actuación. Se conserva la separación entre valoración docente, conclusión y redacción para familias.

## Segundo recorrido y límite del cierre

Proyecto 13 generado en una copia local aislada: dos semanas y diez actividades, con avance desde pregunta, comparación y registros hasta revisión de ideas y comunicación con evidencia. Se ajustaron fechas de fuentes solo en esa copia; no se modificó el calendario remoto ni se revalidaron huellas de diagnósticos clonados. Un mapa y diez actividades, sin reparaciones, 337,352 segundos. No se enviaron fotos ni grabaciones a IA.

En QA se guardaron treinta observaciones ordinarias (tres por niño), con identidad/criterio/texto cruzados entre fuente canónica y Word. La actividad se terminó con reflexión docente desde la interfaz. Los diez informes familiares están guardados; no se enviaron a familias.

El servidor rechazó correctamente cerrar el año: 90 pares niño–competencia aplicables sin valoración vigente. No se inventaron notas para superar el bloqueo. El año permanece abierto. Una muestra local del formato de cierre se revisó en sus 18 páginas; no se guardó como cierre confirmado ni acredita un cierre real. El informe del aula usa el consolidado actual; no se reactivó la ruta antigua de IA deshabilitada.

## Iteraciones, tiempos y coste

Máximo seis intentos por generación individual, nunca excedido: anual 4; diagnóstico 4; mapa del proyecto 15, 3 contando reparación rechazada; mapa del proyecto 13, 1; once actividades con un intento cada una; treinta análisis con uno; veintinueve conclusiones con uno y una con dos por interrupción; diez informes con uno. Recuperar un resultado y volver a maquetar no cuentan como nueva llamada.

Guardados ordinarios: 29 peticiones, 245–414 ms, media 268,76 ms. Valoraciones: 29 peticiones, 302–373 ms, media 319,90 ms. Excluyen escribir, abrir la ficha y autenticar el ejecutor; no equivalen al tiempo total de una profesora. Preparaciones reanudan solo pendientes: se recuperó la conclusión interrumpida sin repetir otras 29. No se degradó el modelo para reducir tiempos.

Subtotal con precio registrado: **USD 0,839244575 por 91 llamadas** (80 remotas y 11 de la copia local). Seis intentos adicionales con consumo desconocido: tres anuales y dos diagnósticos sin resultado del gateway, más una conclusión interrumpida. No se consideran gratuitos ni es factura/saldo del paquete. Excluye fotos y cargas de etapas anteriores. Se respetaron las rutas existentes Sol 6.1 para planificación y Luna para flujos cotidianos. Override de conexión limitado al deployment QA; no una variable por rama.

## Publicación y comprobación final

Código c26f8ddb97eb4645085fb6eee6fcaf4c3bd54973, deployment dpl_3ABHBcuvTU4XMXZRKAvWbc9KE6Fr, región gru1, alias https://ayni-aula-qa-20261019.vercel.app/. Typecheck, lint, build y 40 pruebas de regresión correctos; compilación Vercel y 50 smoke checks correctos antes/después del alias, incluidos los treinta textos literales y la reflexión en la descarga. Se preservaron datos, ledger y trece archivos privados. Producción no cambió. Sin migraciones ni cambios de permisos.

Revisión visual de 25 Word finales, 189 páginas: anual 40, diagnóstico 14, proyectos 12 y 13, actividad con observaciones 17, diez actividades de secuencia 53 y diez informes familiares 40. Contenido y estilos XML del proyecto/actividad descargados coinciden con las maquetas renderizadas. Reporte de entrega de seis páginas revisado. Capturas publicadas en escritorio y móvil, índice y guion actualizados; todavía no hay video montado.

Artefactos fuera de Git: outputs/qa-pedagogico-e2e-20261020/Reporte-revision-pedagogica-Ayni.docx, revision-final.json, iterations.json; outputs/ayni-recorrido-20261020/secuencia.json y guion-video.txt. Recibos privados en .local/activity-pedagogical-release-20261021/ y .local/e2e-pedagogico-20261020/. No guardar en Git fuentes nominales, credenciales ni trazas privadas.

Rollback de presentación/prompts: devolver alias QA al deployment anterior de 4ad5349 y revertir los cambios de código pertinentes, sin tocar históricos ni Producción. El archivo de router modificado por otro trabajo queda fuera de estos commits.
