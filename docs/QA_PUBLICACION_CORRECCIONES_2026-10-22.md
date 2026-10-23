# Publicación de correcciones del informe externo · 22 de octubre de 2026

## Resultado y versión efectiva

Solicitud expresa de la usuaria: publicar las correcciones para las profesoras y probar antes. Publicación final comprobada el 22 de octubre de 2026 a las 7:20 p. m., hora de Lima.

- Enlace: https://project-0w0pq.vercel.app/
- Aplicación: 1946e799df0daf2ae6e1fb5d987755c185c387ee.
- Deployment: dpl_42BheizR5zMcc6ap8yDqX9vi6bsQ; región gru1, target Production.
- Main contiene el commit de aplicación. Los commits posteriores de este recibo son documentales: comprobar equivalencia de app/src/scripts/public/configuración antes de anunciar otra versión.
- Candidata sin asignación automática de dominios, preparada desde checkout limpio. La promoción se realizó después de las comprobaciones de candidata y descargas. Alias y target Production verificados por API; página pública recargada y comprobada en navegador.

## Validación ejecutada

164 pruebas locales: las 138 regresiones de las correcciones, 25 adicionales de observaciones/atribución/reloj y una de agrupación de carpetas. Typecheck y build Vinext aprobados; lint sin errores, con un aviso previo en diagnostic-generation-control. Next webpack compiló en Vercel para cada candidata publicada.

La candidata final pasó 137 comprobaciones: 53 generales, 59 del caso del informe y 25 del reloj. El dominio público final pasó 140: 56 generales, 59 del caso y 25 del reloj. Los recibos de estos dos destinos corresponden al commit final, no sustituidos por los de la primera candidata.

Acceso anónimo rechazado en API privada; autenticación existente y fotos privadas conservadas. Perfil de los tres niños de revisión muestra cada observación ordinaria vigente una vez, con texto corregido y fecha observada exactos, sin exponer rutas de medios. El diagnóstico devuelve estado de vigencia. Mi año, proyectos, actividades, evaluación del período, lotes y cierre histórico consultables. Las fuentes, notas y conclusiones consultadas coinciden con las líneas base.

Por destino se descargaron siete Word válidos: tres de la otra cuenta docente y cuatro del caso revisado (año, diagnóstico, taller y cierre). La ficha de huevos se descargó como una página infantil; el texto nativo de la candidata incluye la condición de la historia y la consigna. La imagen renderizada muestra encabezado, instrucción e ilustración sin superposición. La recuperación familiar por fallo de IA fue probada en integración local, sin reintentar ni guardar el lote pendiente real del revisor.

En navegador público, la sesión existente abre Hoy y Documentos. La carpeta activa muestra Fecha prevista y Preparado; las etiquetas corregidas no dependen de una lista alternativa. Captura de evidencia privada en .local/report-production-20261022-final/public-document-folders.png.

## Conservación, configuración y límites

Huellas verificadas por APIs autorizadas: la otra cuenta conserva sus 10 niños, 30 observaciones libres diagnósticas y 35 guiadas; el caso revisado conserva 3 niños y 10 observaciones ordinarias. Se compararon registros, textos/fechas, plan y conjuntos consultados de valoraciones, conclusiones e informes. No se crearon observaciones, asistencias, notas o conclusiones para hacer pasar el smoke.

No se ejecutaron migraciones ni nuevas generaciones IA. Descargar puede crear o reutilizar archivos derivados y consultar perfiles puede refrescar snapshots; no se confunden esos derivados con las fuentes docentes. Se renovaron sesiones existentes sin cambiar contraseñas ni enviar mensajes. Las pruebas del reloj solo manejan cookies firmadas, verifican aislamiento y restablecimiento; permanece oculto inicialmente y autorizado únicamente para la cuenta de QA existente.

QA sigue en dpl_7wKLPEYG4DNVRqNAAXaqC8sZgWpv. Variables globales, protecciones de Vercel, autenticación y RLS sin cambios. Se conservaron las opciones de deployment del reloj restringido y proveedor de texto de producción.

La lectura directa de tablas por REST respondió 403. Se respetó esa restricción y se usaron las APIs docentes; no se ampliaron grants. La conservación acreditada corresponde a los dos escenarios autorizados, no a una auditoría global de todas las docentes, contraseñas o bytes de Storage. Tampoco es un nuevo ensayo pedagógico anual completo ni validación real de cada futura respuesta de IA. F07 y F10 siguen con los límites documentados en QA_INFORME_EXTERNO_CORRECCIONES_2026-10-22.md.

## Detalle descubierto durante la publicación

4162301 fue candidata y luego versión pública con sus comprobaciones aprobadas. La inspección visual detectó una etiqueta de DocumentTree aún anterior. Se corrigió en 1946e79, se probaron tipos/lint/build, agrupación y el componente real local; se creó otra candidata limpia, repitiendo las comprobaciones antes de promover. No se declaró cerrado el trabajo con ese detalle pendiente. Recibos iniciales y finales separados en .local/report-production-20261022/ y .local/report-production-20261022-final/.

## Rollback

Deployment previo inmediato: dpl_6LSNsiJmPG7YRnQjkV3b2dr7jCiY, misma corrección principal sin el ajuste final de carpetas. Versión estable previa a toda esta publicación: dpl_FauD214LpJNRYEgt3Gav8LkTzxf1 / 0210191. Promover el deployment elegido con CLI y comprobar alias, configuración y smoke; no restaura ni borra datos. El rollback de aplicación no requiere migración. Un push a main no publica Vercel en este proyecto.
