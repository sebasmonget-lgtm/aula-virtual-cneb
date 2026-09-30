# Acceso docente con DNI

## Flujo

- Cada profesora recibe una cuenta individual en el proyecto nuevo de Supabase Auth. El administrador verifica su identidad y crea la cuenta; Ayni no ofrece registro público.
- La pantalla pide DNI de ocho dígitos y contraseña. El servidor transforma el DNI en un alias técnico mediante HMAC-SHA-256 con `AYNI_DNI_LOGIN_PEPPER` y `AYNI_DNI_ALIAS_DOMAIN`; el DNI no se envía a Supabase Auth ni se guarda en sus metadatos. La contraseña se valida en Supabase Auth. El alias no se muestra a la docente.
- Cada petición verifica el token con Supabase y exige `app_metadata.ayni_role=teacher`. El UUID Auth determina el aula y los datos propios; el navegador no puede escoger otro `teacherId`. RLS y las comprobaciones de propiedad del backend siguen siendo necesarias.
- Si olvida la contraseña, la docente solicita un reinicio al administrador. No hay recuperación por correo ni enlace público. El administrador verifica la identidad fuera de Ayni y entrega la nueva contraseña por un canal privado.

## Configuración privada

En el backend y la terminal de administración configurar `AYNI_SUPABASE_URL`, `AYNI_SUPABASE_PUBLISHABLE_KEY`, `AYNI_DNI_LOGIN_PEPPER` y `AYNI_DNI_ALIAS_DOMAIN`. La clave HMAC debe ser aleatoria y estable, con al menos 32 caracteres; guardarla en el gestor de secretos del entorno. Una rotación sin migrar los alias dejaría inaccesibles las cuentas. El dominio técnico debe mantenerse igual en el servidor y en la herramienta de administración. Ninguno de esos valores lleva prefijo `NEXT_PUBLIC_`.

La herramienta `node scripts/teacher-account-admin.mjs create` o `reset` requiere además `AYNI_SUPABASE_SERVICE_ROLE_KEY` **solo en la terminal administrativa**. Pide DNI y contraseña sin mostrarlos en pantalla y no los imprime. Nunca ejecutar esta herramienta en el navegador ni publicar esa clave. El alta marca `app_metadata.ayni_role=teacher` y confirma el alias técnico. Configurar Supabase Auth sin registro público para el piloto.

## Validación antes de publicar

1. Crear dos cuentas docentes ficticias en el nuevo staging y un aula distinta para cada una.
2. Comprobar ingreso, cierre de sesión, contraseña incorrecta y reinicio por administrador.
3. Verificar que ambas ven su propio plan, documentos, evaluaciones y consolidado, y que no pueden leer ni modificar recursos ajenos mediante UI, API o Storage.
4. Comprobar RLS real con los dos usuarios y que un usuario Auth sin `ayni_role=teacher` recibe 401.
5. Verificar en Supabase real el dominio de alias y el alta sin correo. Las pruebas locales solo simulan Auth.

Rollback de código: volver al commit previo en staging y restaurar la configuración previa. Las cuentas creadas permanecen; cualquier cambio de alias o clave exige un plan de migración explícito. No editar migraciones aplicadas.
