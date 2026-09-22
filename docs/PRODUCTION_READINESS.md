# Preparación para piloto de Ayni Aula (2026-09-22)

## Estado y arquitectura

**Clasificación: apto para ensayo local con datos ficticios. No apto aún para datos reales.** La interfaz usa el API de `scripts/local-db-server.mjs` en `127.0.0.1`, PGlite persistente y la Knowledge Base v4. El servidor construye los bundles, decide el modelo con el router v4, valida las salidas y conserva los metadatos de generación. No se aplicaron migraciones a Supabase, no se conectó Auth y no se hizo despliegue. El servidor local usa `AYNI_LOCAL_TEACHER_ID` como identidad *de simulación del proceso*, no como autorización de una petición. No debe exponerse en una red ni desplegarse como backend real.

La cadena implementada es diagnóstico → plan anual → proyecto/unidad → actividad → criterio → evidencia observada → assessment → conclusión descriptiva → informe familiar. Cada salida de IA es una propuesta; los hechos pedagógicos usados en assessments e informes requieren confirmación docente. `family_report` comunica conclusiones confirmadas; no hace un assessment nuevo.

## Cambios de preparación ya implementados

- `ai_pending_generations` persiste el handoff servidor entre generar y guardar en PostgreSQL con vencimiento de 24 horas; se recupera tras recrear el store/reiniciar el proceso con la misma base. Su payload es privado: en Supabase la tabla tiene RLS habilitada **sin política de cliente**. No se exporta como contenido pedagógico permanente. El navegador conserva únicamente el ID opaco. Si vence, se debe regenerar la propuesta.
- Alta local de docente, institución, año, calendario básico, aula 3/4/5 y sección; importación individual o CSV de alumnos con validación, límites y transacciones. `AYNI_LOCAL_TEACHER_ID` distinto permite ensayar un aula independiente. Un índice impide dos aulas activas por docente. El dashboard y el roster se filtran por el aula del docente local.
- Adaptador `createLocalPrivateEvidenceStorage()` guarda fotos bajo `teacher/student/opaque-id`, con MIME/tamaño limitados; la referencia queda en DB, no se expone como respuesta de creación ni se envía al modelo. La migración Supabase crea el bucket privado `student-evidence` y políticas que exigen docente y estudiante propios. **No existe aún un adaptador Supabase Storage activo.** La UI no muestra la foto recuperada.
- RLS añadida a las tres tablas del Plan Anual y las tres tablas de referencia curricular que carecían de ella. Las tablas de referencia son solo lectura para usuarios autenticados. La suite comprueba cobertura de RLS para todas las tablas públicas creadas en migraciones. RLS **no está probado contra Supabase real**.
- Índices únicos de versión para assessment y conclusión; los drafts/actives ya tenían índices únicos parciales. El cálculo `max(version)+1` conserva una posible colisión concurrente, que ahora falla de forma segura por constraint y debe recibir manejo/reintento transaccional en el backend real.
- La exportación local con datos de menores está deshabilitada salvo `AYNI_ALLOW_LOCAL_EXPORT=1`; sigue limitada a loopback y a procesos sin `Origin`. La importación offline ya reconoce assessment, conclusión e informe familiar. El importador actual exige una sola identidad local, revisión explícita del usuario Auth destino y revisión curricular; las fotos no se transfieren automáticamente.
- Eventos operativos de fallos inesperados y Storage registran códigos y request IDs, sin volcar errores crudos, claves, contextos, fotos ni notas. Los errores controlados de generación aún necesitan trazas sanitizadas más completas en el backend real.

## Configuración local

`npm run db:local` lee `.env.local`. `NEXT_PUBLIC_LOCAL_DATABASE_URL` o `NEXT_PUBLIC_AYNI_API_URL` apuntan al API local. `AYNI_LOCAL_TEACHER_ID` es un UUID de prueba opcional; si falta se usa la docente ficticia del seed. Para probar el onboarding de una docente nueva, use un UUID ficticio diferente. `OPENAI_API_KEY` es solo de servidor; las suites usan mocks y no realizan llamadas externas. `AYNI_ALLOW_LOCAL_EXPORT=1` habilita temporalmente `npm run db:export` para respaldo deliberado; vuelva a deshabilitarlo. `.env.local` y `.local/` están ignorados por Git. Nunca use `NEXT_PUBLIC_` para secretos.

## Datos de menores y límites de confianza

| Dato | Almacenamiento | Proveedor de IA |
| --- | --- | --- |
| Identidad del niño, UUID, aula, fuente y huellas | Backend/DB; snapshots pedagógicos sin fotos | Identidad neutral y contexto mínimo; IDs y huellas excluidos |
| Nota observada confirmada, assessment y conclusión | Backend/DB; la docente decide qué confirmar | Texto relevante depurado y anónimo según workflow |
| Foto, multimedia, `media_path`, base64 | Storage local privado; bucket privado previsto | Excluidos por defecto |
| Modelo, tokens, response ID, provenance | Backend/DB en metadata | No se añaden como datos pedagógicos |

Los snapshots v4 conservan fuentes y estados pedagógicos; los informes familiares no retroalimentan el assessment. No se ha hecho una evaluación legal formal ni se ha obtenido consentimiento para datos reales.

## Hallazgos por prioridad

### Bloqueantes para un piloto con datos reales

1. Implementar backend real con identidad por petición derivada de Auth verificada. El API PGlite actual comparte una identidad por proceso y no es una frontera de seguridad multiusuario. Sustituir repositorios locales sin duplicar reglas de negocio ni confiar en IDs de cliente.
2. Aplicar migraciones en un proyecto **nuevo** de Supabase staging y verificar RLS con dos usuarios reales en todas las rutas; el test local de dos docentes demuestra separación por consultas de aula, pero **no** equivale a una prueba de Auth/RLS real.
3. Conectar el adaptador privado de Supabase Storage, probar lectura/escritura/borrado cruzados y estrategia de transferencia de fotos. El bucket/políticas están definidos pero no ejecutados.
4. Configurar backups y probar restauración, gestión de secretos, entorno de despliegue y logs sanitizados antes de ingresar datos de menores.
5. Ejecutar manualmente el flujo entero con dos docentes y en móvil, incluyendo fallos de red, borradores reabiertos, confirmaciones rechazadas y recuperación tras reinicio. No hay evidencia de esta validación en staging.

### Importantes antes de producción amplia

- Resolver `max(version)+1` en el backend transaccional con bloqueo/advisory lock o reintento acotado por violación única; los constraints ya evitan versiones duplicadas.
- Completar observabilidad de errores controlados del proveedor, DB y confirmaciones con códigos seguros; definir retención y supresión de metadatos.
- Preparar importación multiusuario o por aula, revisión de datos demo y migración privada de archivos. El importador offline actual es deliberadamente de una docente.
- Revisar pantallas vacías y flujo móvil con docentes reales; la revisión de código eliminó ejemplos ficticios del dashboard, pero no reemplaza pruebas de uso.

### Mejora posterior

- Paginación e índices basados en métricas de uso reales, recursos documentales/PDF derivados de datos confirmados, integración administrativa externa. No agregar otros workflows pedagógicos antes del piloto.

## Plan de staging (no ejecutado)

1. Crear cuentas/proyectos **nuevos** de Supabase y hosting. Configurar URL, anon key y service role solo en servidor; preparar OpenAI con clave de servidor y límites. No reutilizar cuentas existentes.
2. Respaldar la base local antes de cualquier transferencia. Revisar que no haya datos demo ni secretos. Comprobar que export/import incluyen las tablas esperadas y que cada docente se mapea explícitamente a un `auth.users.id` válido.
3. Aplicar migraciones Supabase en orden lexicográfico, desde `202609200001_initial_cneb.sql` hasta `202609220023_version_uniqueness.sql`, en una instancia vacía. Revisar FKs, índices, estados y políticas. Verificar la tabla `ai_pending_generations` solo con rol de servidor. No subir el JSON exportado a un repositorio.
4. Integrar Auth y un API real que resuelva `teacher_id = auth.uid()` por petición, verifique pertenencia aula→alumno→actividad→criterio→evidencia y conserve la lógica v4 existente. RLS es segunda barrera; no confiar solo en la UI.
5. Integrar el bucket `student-evidence` privado. Probar acceso docente propio, denegación a otro docente, URL firmada de corta duración si se implementa vista, límite de 3 MB y MIME, borrado y respaldo. Mantener multimedia fuera del provider.
6. Configurar backups automáticos y hacer una restauración de prueba; fijar política de retención y procedimiento de rollback. Para rollback de código, volver al commit anterior; para esquema, restaurar backup verificado o aplicar migración compensatoria nueva, nunca editar migraciones ya aplicadas.
7. Ejecutar smoke manual con datos ficticios: alta de dos docentes/aulas, CSV, diagnóstico, plan anual, proyecto/unidad, actividad, criterio, evidencia, assessment, conclusión e informe familiar. Probar generación mock primero; cualquier llamada real al proveedor requiere autorización separada. Verificar rechazo cruzado de lectura/escritura en alumnos, planificación, criterios, fotos, assessments, conclusiones e informes; repetir en móvil, reload y errores de red.

## READY FOR PILOT

| Criterio | Estado |
| --- | --- |
| Pipeline pedagógico v4 y confirmación docente | Implementado y probado localmente |
| Onboarding e importación CSV | Implementado localmente; probar en staging |
| Pending generations durable | Implementado en PGlite/PostgreSQL; verificar en backend real |
| Auth por petición e aislamiento de dos docentes | **PENDIENTE DE STAGING** |
| RLS de todas las tablas sensibles | SQL preparado y cobertura estática; **PENDIENTE DE STAGING** |
| Storage privado y permisos por estudiante | SQL/adaptador local preparados; **PENDIENTE DE STAGING** |
| Backups y restauración | **PENDIENTE DE STAGING** |
| Secretos, CORS, logs y configuración del backend real | **PENDIENTE DE STAGING** |
| Generación IA real controlada y recuperación ante fallo | Pipeline/mock probado; **PENDIENTE DE STAGING** |
| Flujo completo con dos docentes, móvil y fallos | **PENDIENTE DE STAGING** |
| Privacidad/consentimiento para datos reales | **PENDIENTE DE STAGING** |

**Decisión:** se puede ensayar con datos ficticios en local. Para pasar a piloto con datos reales deben cerrarse todos los puntos marcados `PENDIENTE DE STAGING` y documentarse los resultados de prueba.
