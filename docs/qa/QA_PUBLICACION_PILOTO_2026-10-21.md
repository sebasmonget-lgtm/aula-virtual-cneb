# Publicación de la versión final para piloto

Solicitud expresa del 21 de octubre: commit de todos los cambios finales, verificar la versión más reciente, incorporar a main y publicar en Producción. Video pausado. No se autoriza sustituir la aplicación por un montaje ni mostrar datos QA como datos del piloto.

## Plan mínimo y reversión

Conservar el código funcional de la rama QA y guardar las notas pendientes sobre el ensayo Mirai; ese ensayo no cambia la conexión vigente. El archivo de routing aparece modificado por finales de línea CRLF, sin diferencia de contenido respecto de HEAD. Comparar ramas tras fetch y aceptar únicamente avance rápido. Registrar el SHA completo de compilación y exigir checkout limpio. Ejecutar typecheck, lint, build Next webpack y regresiones funcionales aplicables; comprobar staging antes de mover el dominio público.

Producción y QA tienen proyectos Supabase distintos. Revisar esquema, permisos y configuración efectiva antes de publicar. Conservar las fuentes y las cuentas existentes; no transferir la demostración de QA. El reloj de QA debe estar desactivado y la aplicación debe conservar Auth/RLS. No cambiar modelos, prompts o concurrencia durante esta entrega.

Reversión de aplicación: conservar deployment anterior dpl_H19YWzRdGjkgh8y72QAd1qBty7Mf y la asignación previa del dominio. Las migraciones, si hicieran falta, deben ser aditivas, con respaldo y sin editar fuentes ya aplicadas. Una compilación correcta no acredita por sí sola funcionamiento en Producción. Estado inicial: preparado, publicación pendiente.
