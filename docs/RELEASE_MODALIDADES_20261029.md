# Dos modalidades de Ayni en Vercel — 29 de octubre de 2026

## Solicitud y alcance

La usuaria autorizó expresamente publicar en el Ayni existente y reutilizar su configuración actual de Vercel y Supabase. Esta autorización sustituye para esta publicación la regla inicial de cuentas nuevas. Se conserva el alta administrada; al crear una cuenta se elige «Acompañamiento del aula» o «Solo generar documentos». Una cuenta nueva sin elección puede decidir al configurar Ayni. Las cuentas con aula previa conservan el recorrido diario, sin conversión automática.

Se integra la variante documental validada: colegio, una o varias edades, alumnos, chat para Mi año, conversación por proyecto, preparación recuperable, Word y ZIP, formatos nominales y Biblioteca. Los nuevos documentos comparten política y presentación con el original. Hoy, observaciones y evaluación siguen en el recorrido diario. El generador deja sus registros en blanco para completarlos en Word.

## Arquitectura y permisos

`AYNI_DOCUMENT_GENERATOR_CLOUD=1` habilita el servicio con Auth Supabase y PostgreSQL. La elección se guarda en `profiles.preferences.ayni_product_mode`, con identidad de sesión, validación en servidor e inmutabilidad desde que se elige o hay un aula existente. El alta administrada conserva también la modalidad en metadata de Auth. Ninguna identidad del cuerpo de una petición concede acceso.

El generador reutiliza el motor V2 para una o varias edades. Su adaptador PostgreSQL usa transacciones breves con `SET LOCAL ROLE ayni_document_server` y claims de la docente verificada. El rol es NOLOGIN/NOBYPASSRLS; hereda lectura autenticada y recibe políticas propias de escritura sobre datos del generador. Los navegadores no son miembros de ese rol y mantienen el Data API privado de solo lectura. Los IDs de proveedor solo los lee el backend. El rol y los claims no quedan en conexiones del pool. Los factories locales mantienen sus restricciones.

Las tareas se guardan en PostgreSQL. Next `after` drena trabajo por docente, con lease y llamadas fuera de transacciones; la continuación va al mismo deployment con firma que incluye la docente, vence en dos minutos y consume un nonce una vez. Los checkpoints recuperan el mismo response ID. Se permite un reintento explícito y limitado según el contrato existente, sin volver a generar por una simple recarga.

## Migraciones, conservación y rollback

Se aplicaron 19 migraciones aditivas del laboratorio que aún no estaban en cloud, incluida la nueva `202610290001_document_generator_cloud.sql`, después de dos ensayos con ROLLBACK. No se editaron migraciones aplicadas. `scripts/prepare-document-cloud-migrations.mjs` prepara SQL transaccional con ledger y SHA-256 normalizado; repetir el plan conserva los pasos aplicados y rechaza cambios de hash. El preparador no aplica nada por sí mismo. El ledger real registra los 19 pasos.

Línea base de 33 tablas de identidad y fuentes pedagógicas: hashes y multiplicidades por fila de las columnas originales. Las 262 filas anteriores se conservaron sin cambios tras migraciones y smoke; se admiten los registros nuevos de QA. Los datos del laboratorio de la docente en localhost no se importan a otra cuenta ni se eliminan.

Rollback preferido del generador: nueva candidata del mismo código con `AYNI_DOCUMENT_GENERATOR_CLOUD=0`; las cuentas documentales quedan en mantenimiento y conservan sus datos, sin entrar al lector V1. No retirar tablas ni fuentes nuevas. La versión estable previa es `dpl_42BheizR5zMcc6ap8yDqX9vi6bsQ` / `1946e79`; no promoverla a ciegas sobre cuentas V2. Conservar los flags del reloj QA restringido y del proveedor original. No se cambian cuentas ni se abre registro anónimo.

## Validación local ejecutada

- GitHub main verificado: `26e51f3`; checkout de publicación aislado, sin sustituir los árboles locales previos.
- 66 regresiones aprobadas: planificación, Word común, Hoy, autenticación y API documental.
- 11 pruebas nuevas/focalizadas de alta y cloud aprobadas: modalidad persistida en Auth y perfil, RLS de una y tres edades, año/proyecto/actividades/ZIP, reintento, privacidad del checkpoint, firma, identidad alterada, caducidad y replay.
- Typecheck, lint y Next webpack build aprobados. Una advertencia React previa, sin errores de lint. Verificación estática cloud aprobada.
- Detector de cinco componentes sin hallazgos. Recorrido local con clics: elección documental → colegio → una edad → niña ficticia → chat anual sin diagnóstico; navegación documental correcta. Revisión visual de escritorio; todavía no acredita el navegador de producción ni un celular físico.
- Las pruebas de integración de este cambio usan proveedores fixture; la comparación pedagógica previa con IA real está en `PLANNING_DOCUMENTS_REAL_QA.md`. La candidata se comprobará además con IA real en una cuenta QA nueva.

## Publicación

Publicada el 28 de octubre de 2026, 22:45 de Lima (29 de octubre UTC):

- Código: `edc945ed4397f96f2e06f7749400d7e0ddcf0063`, checkout limpio; integrado en GitHub main sin force push.
- Deployment: `dpl_5XTix7ANZpJ5P3Np6AmpvPGrjDcj`, READY, región gru1. Candidata: `https://ayni-aula-staging-hwaxramgj-ayni4.vercel.app`.
- Alias público verificado: `https://project-0w0pq.vercel.app/`; alias predeterminado también apunta al mismo deployment. Flag documental de producción persistido, sin sustituir los flags anteriores del reloj y proveedor.
- Smoke candidata real: cuentas docentes ficticias separadas; dos modalidades persistidas, colegio y tres alumnos, permisos 401/403/404, panel/Hoy diario, seis formatos nominales y taller Word/PDF. Chat anual real y plan de quince propuestas guardados; Word anual descargado y contexto conservado. Continuaciones firmadas recibidas; el anual mantuvo un único intento.
- Smoke público: nueve comprobaciones aprobadas, sin regenerar IA: modalidades, aislamiento, año/nómina conservados, Hoy y el mismo contenido de todas las partes del Word anual (se excluyen fechas técnicas de creación/modificación).
- Navegador público, sesión existente: Hoy y Mi año cargan con su aula y planificación previas. Solo lectura, sin registrar observaciones ni modificar proyectos.

**Límite de la validación real:** la llamada del chat del proyecto falló con `provider_quota_exhausted`, un intento. Una petición mínima posterior con la clave del Ayni original devolvió HTTP 429, `code=credit_balance_exhausted`, `type=insufficient_quota`. La captura de gasto mensual proporcionada por el usuario no muestra el saldo de créditos. No se cambiaron claves, límites ni facturación, ni se insistió regenerando. El proyecto y sus tres actividades nuevos en Vercel no quedaron certificados con IA real por esta causa externa. El flujo completo con proveedor fixture y RLS sí pasó antes de publicar; la comparación real previa de doce Word permanece en su informe, pero no sustituye esta prueba cloud pendiente.

La CLI 63.1.2 movió el alias predeterminado al crear la candidata aun con `--skip-domain`; se restauró de inmediato al estable y se comprobó que el alias público seguía estable durante el smoke. La promoción final fue explícita y ambos destinos se verificaron por API. No se relajó SSO: el smoke de la URL inmutable usó el permiso de automatización existente, sin crear credenciales nuevas.

## Prueba completada tras la recarga y correcciones cloud

El usuario informó una recarga de USD 20 y autorizó continuar con pocas generaciones. Se recuperó el mismo chat de proyecto con un reintento explícito tras el rechazo de cuota; no se regeneró el anual. Proyecto «Comidas que podemos combinar»: planificación con niños → probar combinaciones, repartos y pedidos → revisar y ajustar pedidos. Cuatro competencias, tres actividades fechadas y conectadas; primera actividad de planificación. El maestro y el lote tuvieron un intento cada uno.

La prueba real detectó dos diferencias del despliegue que los fixtures no acreditaban: BIGINT string frente a número al iniciar y dos ilustraciones ausentes del paquete serverless al exportar. Correcciones generales `5673d00` y `262c5bf`, documentadas en ERRORS_AND_FIXES. Se reprodujo la decodificación en regresión cloud, preservando rechazo de una versión realmente obsoleta. Comprobación del trace generado de Next para ambas imágenes y plantillas. Typecheck, lint (aviso React previo), build y 26 pruebas focalizadas aprobados. El typecheck independiente se repitió después del build, evitando la eliminación concurrente de `.next/types`.

Candidata final desde checkout limpio `262c5bfdf28716dc16c89a8463ae1317baf4f00b`: `dpl_CXTWQd9jWCraoqxPH1rVfxRMinw2`, URL `https://ayni-aula-staging-6jkpwi2h0-ayni4.vercel.app`. Smoke completo real aprobado: año conservado, proyecto, tres actividades, cuatro Word del ZIP, nombres de tres alumnos y persistencia al recargar. Promovida al alias público el 28 de octubre, 23:13 de Lima. Los dos aliases se comprobaron; smoke público de diez comprobaciones pasó con el mismo contenido del anual y ZIP de cuatro documentos. Las 262 fuentes anteriores de 33 tablas siguen intactas. Cuentas ficticias de prueba inhabilitadas al cerrar.

Se renderizaron los cuatro Word, 26 páginas, y se revisaron las cuatro láminas de páginas, con ampliaciones de guía y registro nominal. Se mantuvo la estética y no se editaron los textos generados ni las plantillas. La tercera actividad deja espacio amplio antes de la guía, que sigue junta en la siguiente página; el último punto de cierre del proyecto continúa en la siguiente. Son aspectos de paginación mejorables, sin texto perdido ni impedimento de descarga. Este smoke no certifica todos los futuros resultados pedagógicos.

Consumo registrado de las respuestas exitosas, estimado a tarifa estándar oficial consultada el 28 de octubre: chat anual USD 0,0004595; anual USD 0,3754; después de la recarga, chat de proyecto USD 0,0009971, maestro/primera actividad USD 0,141466 y lote de otras dos USD 0,103876. Total registrado posterior a recarga: USD 0,2463391. Estas estimaciones por tokens no son una conciliación de la factura ni incluyen todas las pruebas locales históricas. Los registros cloud de consumo no cubren todos los trabajos, por lo que no permiten atribuir los USD 29,31 mostrados por el usuario. Las comprobaciones posteriores fueron consultas, exportación, render y publicación, sin nuevas generaciones.
