# Publicación de la versión final para piloto

Solicitud expresa del 21 de octubre: commit de todos los cambios finales, verificar la versión más reciente, incorporar a main y publicar en Producción. Video pausado. No se autoriza sustituir la aplicación por un montaje ni mostrar datos QA como datos del piloto.

## Plan mínimo y reversión

Conservar el código funcional de la rama QA y guardar las notas pendientes sobre el ensayo Mirai; ese ensayo no cambia la conexión vigente. El archivo de routing aparece modificado por finales de línea CRLF, sin diferencia de contenido respecto de HEAD. Comparar ramas tras fetch y aceptar únicamente avance rápido. Registrar el SHA completo de compilación y exigir checkout limpio. Ejecutar typecheck, lint, build Next webpack y regresiones funcionales aplicables; comprobar staging antes de mover el dominio público.

Producción y QA tienen proyectos Supabase distintos. Revisar esquema, permisos y configuración efectiva antes de publicar. Conservar las fuentes y las cuentas existentes; no transferir la demostración de QA. El reloj de QA debe estar desactivado y la aplicación debe conservar Auth/RLS. No cambiar modelos, prompts o concurrencia durante esta entrega.

Reversión de aplicación: conservar deployment anterior dpl_H19YWzRdGjkgh8y72QAd1qBty7Mf y la asignación previa del dominio. Las migraciones, si hicieran falta, deben ser aditivas, con respaldo y sin editar fuentes ya aplicadas. Una compilación correcta no acredita por sí sola funcionamiento en Producción. Estado inicial: preparado, publicación pendiente.

## Resultado final comprobado

Publicado en https://project-0w0pq.vercel.app/ con commit **58b76428111090acde82066ba3f8164c45d1715e**, deployment **dpl_B4ccwivp6ZtpbsiGKLYwPm767fAk**, región gru1. `origin/main` y la rama QA avanzaron juntos al mismo commit mediante push atómico; no hubo force push. El código de app/src/public/scripts/supabase y sus configuraciones coincide exactamente con ee4bfb1, último código funcional probado en QA. Los commits posteriores hasta 58b7642 contienen documentación. Esta entrada posterior documenta el resultado; no cambia la aplicación ni requiere otra publicación.

Gates del commit exacto: 151 pruebas correctas, typecheck, lint sin errores (una advertencia histórica) y build Next webpack. Candidata construida con configuración de Producción mediante `--prod --skip-domain`: 32 comprobaciones antes de promover el dominio; después, 34 comprobaciones en el dominio público. Auth real de la cuenta QA ya existente en Producción, matrícula propia, consultas, foto privada, acceso ajeno rechazado, origen ajeno rechazado y rutas del reloj QA deshabilitadas. El dominio abre sin sesión de Vercel y Ayni conserva su autenticación. No se relajaron las protecciones del proyecto.

Respaldo privado previo: 82 tablas / 1093 filas y 15 archivos, con metadatos Auth/Storage fuera de Git. Se aplicó únicamente 202610190001_isolated_preparation_queue.sql, pendiente en Producción: tabla nueva, RLS y SELECT propio; INSERT/UPDATE/DELETE de cliente denegados. No se editaron migraciones aplicadas ni se transfirieron datos desde QA. Comparación tras migrar: 81 tablas idénticas y recibos temporales de dispatch renovados por el proceso operativo existente. Auth y Storage intactos. Tras consultas de evaluación se inicializaron cuatro bimestres del año activo; los cuatro períodos anteriores y todos los registros pedagógicos previos se conservaron. La cuenta docente ve diez niños propios y cero ajenos bajo RLS.

Tres descargas reales en candidata y otras tres en Producción: anual, proyecto y actividad, seis archivos Word ZIP válidos. La cuenta histórica de Producción no tiene diagnóstico ni informe familiar descargables; no se generaron para simular esa comprobación. Las muestras de esos tipos se habían revisado en QA. Cero llamadas nuevas a IA. Navegador real: Hoy, Mi año y Evaluar cargaron correctamente; Documentos consultado. No se repite la prueba física de celular ni se crea una cuenta para cada futura participante.

Se conservan la versión anterior como rollback y el alias QA en dpl_D89mBBPSZLrerN6VwLmrFwxhScYv. Recibos privados en .local/pilot-production-20261021: gates, backups, migración, RLS, despliegue, smoke, descargas y release-final.json. Para compartir: enlace público anterior y cuenta propia de Ayni para cada profesora. El video permanece pausado por solicitud expresa; el montaje anterior no está aprobado.
