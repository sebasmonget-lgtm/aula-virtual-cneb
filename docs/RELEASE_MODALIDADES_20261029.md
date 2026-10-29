# Dos modalidades de Ayni en Vercel — 29 de octubre de 2026

## Solicitud y alcance

La usuaria autorizó expresamente publicar en el Ayni existente y reutilizar su configuración actual de Vercel y Supabase. Esta autorización sustituye para esta publicación la regla inicial de cuentas nuevas. Se conserva el alta administrada; al crear una cuenta se elige «Acompañamiento del aula» o «Solo generar documentos». Una cuenta nueva sin elección puede decidir al configurar Ayni. Las cuentas con aula previa conservan el recorrido diario, sin conversión automática.

Se integra la variante documental validada: colegio, una o varias edades, alumnos, chat para Mi año, conversación por proyecto, preparación recuperable, Word y ZIP, formatos nominales y Biblioteca. Los nuevos documentos comparten política y presentación con el original. Hoy, observaciones y evaluación siguen en el recorrido diario. El generador deja sus registros en blanco para completarlos en Word.

## Arquitectura y permisos

`AYNI_DOCUMENT_GENERATOR_CLOUD=1` habilita el servicio con Auth Supabase y PostgreSQL. La elección se guarda en `profiles.preferences.ayni_product_mode`, con identidad de sesión, validación en servidor e inmutabilidad desde que se elige o hay un aula existente. El alta administrada conserva también la modalidad en metadata de Auth. Ninguna identidad del cuerpo de una petición concede acceso.

El generador reutiliza el motor V2 para una o varias edades. Su adaptador PostgreSQL usa transacciones breves con `SET LOCAL ROLE ayni_document_server` y claims de la docente verificada. El rol es NOLOGIN/NOBYPASSRLS; hereda lectura autenticada y recibe políticas propias de escritura sobre datos del generador. Los navegadores no son miembros de ese rol y mantienen el Data API privado de solo lectura. Los IDs de proveedor solo los lee el backend. El rol y los claims no quedan en conexiones del pool. Los factories locales mantienen sus restricciones.

Las tareas se guardan en PostgreSQL. Next `after` drena trabajo por docente, con lease y llamadas fuera de transacciones; la continuación va al mismo deployment con firma que incluye la docente, vence en dos minutos y consume un nonce una vez. Los checkpoints recuperan el mismo response ID. Se permite un reintento explícito y limitado según el contrato existente, sin volver a generar por una simple recarga.

## Migraciones, conservación y rollback

Se necesitan 19 migraciones aditivas del laboratorio que aún no estaban en cloud, incluida la nueva `202610290001_document_generator_cloud.sql`. No se editan migraciones aplicadas. `scripts/prepare-document-cloud-migrations.mjs` prepara SQL transaccional con ledger y SHA-256 normalizado; repetir el plan conserva los pasos aplicados y rechaza cambios de hash. No aplica nada por sí mismo. Ensayo real contra Supabase con ROLLBACK aprobado; fuentes existentes aún sin modificar al escribir este recibo.

Línea base de 33 tablas de identidad y fuentes pedagógicas: hashes y multiplicidades por fila de las columnas originales. Después se comprobará que todas las filas previas siguen presentes sin cambios, admitiendo únicamente los registros nuevos de QA. Los datos del laboratorio de la docente en localhost no se importan a otra cuenta ni se eliminan.

Rollback preferido del generador: nueva candidata del mismo código con `AYNI_DOCUMENT_GENERATOR_CLOUD=0`; las cuentas documentales quedan en mantenimiento y conservan sus datos, sin entrar al lector V1. No retirar tablas ni fuentes nuevas. La versión estable previa es `dpl_42BheizR5zMcc6ap8yDqX9vi6bsQ` / `1946e79`; no promoverla a ciegas sobre cuentas V2. Conservar los flags del reloj QA restringido y del proveedor original. No se cambian cuentas ni se abre registro anónimo.

## Validación local ejecutada

- GitHub main verificado: `26e51f3`; checkout de publicación aislado, sin sustituir los árboles locales previos.
- 66 regresiones aprobadas: planificación, Word común, Hoy, autenticación y API documental.
- 11 pruebas nuevas/focalizadas de alta y cloud aprobadas: modalidad persistida en Auth y perfil, RLS de una y tres edades, año/proyecto/actividades/ZIP, reintento, privacidad del checkpoint, firma, identidad alterada, caducidad y replay.
- Typecheck, lint y Next webpack build aprobados. Una advertencia React previa, sin errores de lint. Verificación estática cloud aprobada.
- Detector de cinco componentes sin hallazgos. Recorrido local con clics: elección documental → colegio → una edad → niña ficticia → chat anual sin diagnóstico; navegación documental correcta. Revisión visual de escritorio; todavía no acredita el navegador de producción ni un celular físico.
- Las pruebas de integración de este cambio usan proveedores fixture; la comparación pedagógica previa con IA real está en `PLANNING_DOCUMENTS_REAL_QA.md`. La candidata se comprobará además con IA real en una cuenta QA nueva.

## Publicación

Pendiente de crear candidata desde commit identificable y árbol limpio, smoke contra la candidata, conservación de fuentes y promoción del alias público. Este documento no declara una publicación realizada.
