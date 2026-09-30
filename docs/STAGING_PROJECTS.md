# Proyectos nuevos de staging (2026-09-30)

Estos recursos se crearon en cuentas separadas de los proyectos anteriores. Son para datos ficticios hasta completar la validación de aislamiento, archivos privados y el flujo docente completo.

| Servicio | Proyecto | Estado |
| --- | --- | --- |
| Supabase | [ayni-aula-staging](https://supabase.com/dashboard/project/eetdkmmspicboijcmnzv), organización `Ayni Aula` (Free), región São Paulo | Instancia saludable; aún sin migraciones, usuarios docentes ni pruebas de Auth/RLS/Storage reales. |
| Vercel | [ayni-aula-staging](https://vercel.com/ayni4/ayni-aula-staging), equipo `ayni` (Hobby) | Proyecto vacío; sin Git conectado ni despliegue. Preset Next.js y build `npx next build --webpack`. Uso del código para entrenamiento desactivado en este proyecto. |

Supabase se creó con exposición automática de tablas desactivada y RLS automático activado. La contraseña de base de datos se generó en el navegador y no se guardó en este repositorio. Si no quedó en el gestor de contraseñas de la cuenta, restablecerla desde Supabase antes de enlazar la CLI. Nunca copiarla a un commit, log o mensaje.

## Puertas antes de publicar Ayni

1. Adaptar la API HTTP independiente de `scripts/local-db-server.mjs` a una ejecución compatible con Vercel o alojarla en un backend persistente bajo el mismo sitio HTTPS; eliminar dependencias de disco efímero. La compilación de la interfaz por sí sola no entrega `/api`.
2. Conectar Storage privado para logos y adjuntos de entrevista; verificar también evidencias y documentos. Mantener bloqueadas las rutas sin adaptador remoto.
3. Aplicar `supabase/migrations/*.sql` en orden al proyecto nuevo, sin editar migraciones antiguas, y comprobar el esquema y las políticas contra Supabase real.
4. Configurar variables privadas en los servicios, crear dos docentes ficticias mediante la herramienta administrativa y probar ingreso con DNI, renovación de sesión, aislamiento cruzado, archivos y descargas.
5. Hacer commit identificable, dejar el checkout limpio, desplegar primero a staging y ejecutar smoke test. Conectar Git a Vercel solo cuando el backend y los valores de entorno estén listos, pues la conexión puede iniciar un despliegue.

Rollback: mantener los proyectos sin despliegue ni datos reales mientras se prepara la integración. Los cambios de esquema futuros requieren una migración compensatoria o restauración de respaldo verificado.
