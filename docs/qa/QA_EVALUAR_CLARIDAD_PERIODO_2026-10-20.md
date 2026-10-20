# Evaluar: fecha de entrada y observaciones guardadas

## Hallazgo

La captura correspondía a Bimestre 1. Chrome tenía el reloj QA en 16/02/2026; el navegador integrado lo tenía en 18/12/2026. El primer bimestre no tiene estas observaciones: las 140 notas del QA están en Bimestre 4. Comprobación de solo lectura sobre la base QA aislada: mismos hashes de alumnos, observaciones, valoraciones/borradores y asistencia que antes de la publicación 7b5f505; diez niños, 260 vínculos de competencia, 430 asistencias de 43 días, cero valoraciones confirmadas. No hubo borrado ni necesidad de recrear datos.

## Correcciones

- Entrar por la navegación principal Evaluar reinicia la consulta con la fecha vigente enviada por el servidor (reloj QA únicamente donde esté habilitado). Una elección manual sigue permitida dentro del espacio; los enlaces directos e historial conservan su período explícito. Antes del inicio se muestra el primer bimestre; entre períodos, el último terminado; después del año, el último.
- La tarjeta muestra niños con observaciones y competencias observadas, calculados sin duplicar pares. Desaparecen «por confirmar» y el contador ambiguo de pendientes de observación.
- Preparación: «Ayni resume lo observado. Tú eliges la nota.», con Preparar análisis y Ver observaciones. El vacío identifica el bimestre concreto y remite al selector, sin afirmar que no existen observaciones en la cuenta.
- Captura, consulta, corrección y fichas de observación dicen Guardar/guardada. Guardar observación ya conserva las competencias elegidas en la misma acción del usuario; la recuperación de un fallo de persistencia se llama Reintentar guardar competencias. Se conservan estados internos versionados y permisos, sin aprobar por código propuestas de IA ni asignar notas.
- La confirmación de valoraciones, informes y cierres sigue siendo explícita y docente.

## Validación

91 regresiones PASS de evaluación, perfil breve, preparación, referentes, selección de período, adaptadores y servicios de observación/atribución, continuidad y planificación. Una prueba adicional recorre los inicios y cierres de los cuatro bimestres y el cambio manual: selección 4/4 PASS, tres ya incluidas en las 91. Total 92 pruebas distintas. Lint, TypeScript, Vinext y Next webpack PASS; detector visual sin hallazgos.

UI local con TeacherWorkspace real y API simulada, sin escrituras: abre B4 con fecha 18/12, permite B1, informa el vacío de B1 y vuelve a B4 al pulsar Evaluar. Preparación habilitada con evidencias, sin llamadas al generador al entrar. Escritorio y móvil 390px revisados. Las notas anteriores/confirmaciones/persistencia se cubren con regresiones de servicio, no con nuevas decisiones en la cuenta QA. Capturas: outputs/evaluar-claridad-20261020.

Publicación solicitada dentro del QA: solo Preview tras commit identificable, árbol limpio y smoke. El recibo de despliegue se registra localmente después de la publicación; no se declara completada antes de verificarlo. Cero IA pagada en esta corrección. Producción excluida.

## Rollback

Revertir este cambio de presentación y entrada. No hay migraciones ni cambios de esquema, fuentes pedagógicas, notas, documentos o evidencias; no hay que restaurar datos.
