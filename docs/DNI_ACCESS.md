# Acceso docente con DNI

## Flujo

- Cada profesora recibe una cuenta individual en el proyecto nuevo de Supabase Auth. El administrador verifica su identidad y crea la cuenta; Ayni no ofrece registro público.
- La pantalla pide DNI de ocho dígitos y contraseña. El servidor transforma el DNI en un alias técnico mediante HMAC-SHA-256 con `AYNI_DNI_LOGIN_PEPPER` y `AYNI_DNI_ALIAS_DOMAIN`; el DNI no se envía a Supabase Auth ni se guarda en sus metadatos. La contraseña se valida en Supabase Auth. El alias no se muestra a la docente.
- Cada petición verifica el token con Supabase y distingue `app_metadata.ayni_role=teacher` o `admin`. El UUID Auth determina el aula y los datos propios; el navegador no puede escoger otro `teacherId`. Las rutas pedagógicas rechazan administradores; las rutas administrativas rechazan docentes. RLS y las comprobaciones de propiedad del backend siguen siendo necesarias.
- Si olvida la contraseña, la docente solicita un reinicio al administrador. No hay recuperación por correo ni enlace público. El administrador verifica la identidad fuera de Ayni y entrega la nueva contraseña por un canal privado.
- El inicio de sesión conserva una cookie privada de renovación. Cada uso de Ayni renueva automáticamente el plazo de 30 días de inactividad. Si vence el token corto de Supabase, el servidor lo renueva con el refresh token y vuelve a verificar la identidad antes de atender la petición. Tras 30 días sin uso, exige ingresar de nuevo. Cerrar sesión elimina las tres cookies y solicita revocar la sesión en Supabase.

## Configuración privada

En el backend y la terminal de administración configurar `AYNI_SUPABASE_URL`, `AYNI_SUPABASE_PUBLISHABLE_KEY`, `AYNI_DNI_LOGIN_PEPPER` y `AYNI_DNI_ALIAS_DOMAIN`. El backend necesita además `AYNI_SESSION_SIGNING_KEY`. Ambas claves deben ser aleatorias, estables y de al menos 32 caracteres; guardarlas en el gestor de secretos del entorno. Una rotación de la clave DNI sin migrar los alias dejaría inaccesibles las cuentas; rotar la clave de sesión cerrará las sesiones existentes. El dominio técnico debe mantenerse igual en el servidor y en la herramienta de administración. Ninguno de esos valores lleva prefijo `NEXT_PUBLIC_`.

El panel administrativo usa `AYNI_SUPABASE_SERVICE_ROLE_KEY` **solo en el servidor** para listar cuentas, crear docentes y restablecer sus contraseñas. La interfaz nunca recibe la clave. Las contraseñas existentes no son legibles: Supabase Auth almacena verificadores, por lo que el panel ofrece únicamente asignar una nueva. El directorio muestra nombre, rol, fechas e importes registrados de IA por docente, sin alias de DNI, contraseña ni contenido pedagógico. El nombre se registra al crear la cuenta; las cuentas anteriores pueden figurar «Sin nombre». Los importes pueden mezclar cargos informados y estimados, y no incluyen llamadas sin precio, uso anterior a la instrumentación ni infraestructura.

Para iniciar el primer administrador, el propietario guarda `AYNI_ADMIN_SETUP_KEY` como secreto de 32+ caracteres en el proyecto Vercel nuevo, vuelve a desplegar y abre «Configurar primer administrador» en el acceso de Ayni. Introduce allí esa misma clave, su DNI, nombre y contraseña de 12+ caracteres. El servidor solo permite el alta mientras no exista ningún usuario con rol `admin`; deriva el alias de DNI con la clave existente. Después del alta se elimina `AYNI_ADMIN_SETUP_KEY` de Vercel y se vuelve a desplegar. No enviar la clave ni contraseñas por chat. Si se pierde la contraseña del único administrador, la recuperación requiere acceso de propietario al proyecto Supabase y una operación administrativa verificada.

La herramienta `node scripts/teacher-account-admin.mjs create` o `reset` sigue disponible como alternativa privada; requiere además `AYNI_SUPABASE_SERVICE_ROLE_KEY` **solo en la terminal administrativa**. Pide DNI y contraseña sin mostrarlos en pantalla y no los imprime. El alta marca `app_metadata.ayni_role=teacher` y confirma el alias técnico. Configurar Supabase Auth sin registro público para el piloto.

## Validación antes de publicar

1. Crear dos cuentas docentes ficticias en el nuevo staging y un aula distinta para cada una.
2. Comprobar ingreso, cierre de sesión, contraseña incorrecta, reinicio por administrador, renovación después de vencer el token corto y salida tras 30 días de inactividad.
3. Verificar que ambas ven su propio plan, documentos, evaluaciones y consolidado, y que no pueden leer ni modificar recursos ajenos mediante UI, API o Storage.
4. Comprobar RLS real con los dos usuarios y que un usuario Auth sin `ayni_role=teacher` recibe 401.
5. Verificar en Supabase real el dominio de alias y el alta sin correo. Las pruebas locales solo simulan Auth.

Rollback de código: volver al commit previo en staging y restaurar la configuración previa. Las cuentas creadas permanecen; cualquier cambio de alias o clave exige un plan de migración explícito. No editar migraciones aplicadas.
