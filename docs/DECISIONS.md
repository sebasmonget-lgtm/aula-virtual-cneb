# Decisiones de arquitectura

## ADR 008 Referencia visual del diagnóstico

**Decisión.** Adaptar la interfaz a la referencia visual proporcionada (azul marino, turquesa y acentos pastel, navegación lateral clara, tarjetas y lista de competencias con progreso), conservando el nombre Ayni Aula, la estructura de datos y los flujos reales existentes. La imagen es una guía estética; sus nombres, conteos y estados no son datos del proyecto.

**Consecuencia.** El diseño se aplica al tema global, perfil y diagnóstico sin introducir dependencias externas ni cambiar el modelo pedagógico.

## ADR 001 Servicios externos aislados

**Problema.** El equipo dispone de conexiones existentes de Vercel y Supabase que no pertenecen a este proyecto.

**Decisión.** No usar, enlazar ni modificar esas cuentas. El repositorio solo incluye contratos, migraciones y variables vacías. La conexión se hará más adelante con cuentas nuevas y primero en staging.

**Consecuencia.** El desarrollo persiste datos en PostgreSQL embebido local y no está desplegado.

## ADR 005 PostgreSQL local sin Docker

**Problema.** Docker Desktop falló en el equipo por sockets locales; se necesitaba continuidad de desarrollo sin depender del daemon.

**Opciones consideradas.** Supabase CLI local con Docker; SQLite; PostgreSQL embebido con PGlite.

**Decisión.** Usar PGlite para el desarrollo local. Conserva semántica PostgreSQL, funciona sin daemon y persiste en una carpeta ignorada por Git. Mantener migraciones Supabase separadas para Auth, RLS y Storage, con nombres e IDs de dominio equivalentes.

**Consecuencia.** El flujo puede desarrollarse y probarse localmente; la seguridad real de Supabase debe validarse después en staging.

## ADR 006 Diagnóstico basado en referentes revisados

**Decisión.** Cada marca observacional se vincula a un referente de competencia y edad, y cada referente a uno o más `performance_ids`. Los estados son operativos, no niveles oficiales. El catálogo de muestra se identifica como tal y no se exporta a producción por defecto. Notas y archivos son opcionales.

**Consecuencia.** Una observación aislada nunca determina una conclusión ni actualiza el plan anual automáticamente. La síntesis requiere revisión y confirmación docente.

## ADR 007 Importación Supabase offline primero

**Decisión.** La exportación local pasa por validación curricular y genera un paquete SQL/manifiesto revisable. El importador no toma credenciales ni escribe en cuentas externas. El UUID de Auth del proyecto nuevo se indica explícitamente al generar el paquete.

**Consecuencia.** La aplicación de migraciones, subida privada de logos y pruebas RLS quedan para un proyecto nuevo de staging.

## ADR 002 Fuente de verdad estructurada

**Decisión.** Currículo, aula, planificación, actividad, criterio y evidencia viven como datos relacionados. Los textos de IA y los DOCX/PDF son resultados derivados y regenerables.

## ADR 003 IA con confirmación docente

**Decisión.** La IA propone y organiza. No inventa hechos sobre estudiantes ni confirma niveles finales. Toda conclusión o valoración queda asociada a confirmación docente.

## ADR 004 Currículo versionado

**Decisión.** Los textos oficiales se almacenan por versión y se referencian por ID estable. Una experiencia o actividad no guarda una reformulación libre de la competencia como sustituto del dato oficial.
