# Memoria del proyecto Ayni Aula

## Estado actual

Proyecto nuevo iniciado el 20 de septiembre de 2026. Existe un shell responsive de la pantalla Hoy con navegación corta, actividad del día, perfil institucional editable, logo SVG generado localmente, registro rápido de evidencia y diagnóstico por referente observable conectado a PostgreSQL local embebido mediante PGlite. No hay conexión con servicios externos.

## Alcance implementado

- Identidad visual y shell PWA responsive.
- Tema visual inspirado en la referencia entregada por la usuaria: fondo azul muy claro, texto azul marino, acento turquesa, tarjetas blancas y paneles de ayuda pastel. El diagnóstico muestra datos reales del perfil/aula y cobertura calculada de la base local, no cifras copiadas de la imagen.
- Navegación principal: Hoy, Planificar, Niños, Evaluar, Documentos y Biblioteca.
- Hoy es el inicio docente: resuelve la jornada desde el horario local, destaca un único siguiente paso (asistencia, actividad, evidencia o cierre) y enlaza actividades o talleres sin duplicarlos.
- Modo Jornada: asistencia rápida por estudiante, estado diario centralizado, inicio/cierre de bloques y extensión manual. Las evidencias permanecen opcionales y heredan el contexto de actividad/criterio. Las actividades con pasos planificados abren un ejecutor guiado que conserva el paso actual en la jornada.
- Flujo de evidencia con marca observacional docente obligatoria por criterio para registros nuevos; la nota y una foto son opcionales. Las actividades pueden exponer varios criterios planificados y la evidencia sigue siendo una acción secundaria durante la actividad. La acción “Guardar y siguiente” avanza solo al siguiente niño disponible y nunca reinicia la lista.
- Módulo Niños funcional: lista, perfil pedagógico y trayectorias por competencia basadas en registros reales. `StudentContextService` genera snapshots JSON deterministas sin multimedia ni texto de IA.
- `StatisticsService` local calcula cobertura por aula y por competencia, presencia reciente en planificación y marcas observacionales. Su contrato se reutilizará para UI, informes, Excel e IA, sin duplicar lógica.
- Primer flujo vertical persistente: actividad actual → seleccionar estudiante → describir evidencia → guardar en PostgreSQL local → actualizar cobertura.
- Migración inicial para Supabase con entidades de Fase 0 y Fase 1, más las relaciones mínimas necesarias para el flujo de evidencia.
- Políticas RLS preparadas, sin aplicar a ninguna cuenta.
- Migraciones locales reproducibles y exportación JSON versionada para una futura importación controlada.
- Esquema incremental para perfil institucional, logo, guías de observación y plantillas según la actualización 01.
- Diagnóstico guiado con datos precargados, lista de competencias, cobertura por estudiantes, registro por referente/estado observacional y guardado para continuar después.
- Catálogo local ilustrativo de dos referentes vinculado a un desempeño de muestra. La interfaz lo advierte y el importador bloquea su paso a producción por defecto.
- Preparador de importación Supabase con dry run, validación curricular, mapeo explícito del usuario nuevo, SQL transaccional y manifiesto de logos. Incluye las tablas de jornada, asistencia y snapshots; preserva rutas de fotos como referencias privadas, sin copiarlas. No ejecuta cambios externos.
- La fuente vigente para cualquier IA de Inicial 3–5 es `knowledge/cneb-initial-3-5/v4.0.0/`: contiene 245 knowledge units, 14 competency cards y 13 workflows versionados.
- El runtime v4 ya implementa `loadKnowledgeBaseV4()`, `retrieveKnowledgeV4()` y `buildAIContext()`. Valida integridad, edad, workflow, aplicabilidad, contexto obligatorio, límites y provenance antes de producir un `AIContextBundle`.
- El runtime v4 no lee PDFs. No hay extracción ni transcripción de PDF pendiente para esta arquitectura y no debe crearse un `official-corpus` como ruta alternativa.
- `prepareAIRequestV4()` prepara el `AIContextBundle` y metadata del workflow para la capa generativa, sin HTTP, proveedores ni selección fuera del bundle. La futura IA debe consumir ese bundle y nunca leer documentos directamente.
- La jerarquía vigente de producción es `annual_plan` → `learning_experience` (`project` | `unit`; `workshop` futuro) → `activity` → evidencia/evaluación. El plan anual propone; la docente confirma. Project y Unit se materializan como `learning_experiences` y todavía no generan actividades automáticamente.
- La pantalla Planificar integra `activity` mediante el backend local: precarga aula, edad y materiales, recibe solo una propuesta validada editable y no muestra metadata técnica. La propuesta no se guarda automáticamente; falta una operación local de creación de actividades aprobada antes de persistirla.
- Existe una capa de generación v4 para `activity` y `annual_plan`: `generateAIWorkflowV4()` entrega solo una copia inmutable del `AIContextBundle` y valida una salida estructurada antes de devolverla. `OpenAIProvider` usa la Responses API con Structured Outputs strict cuando recibe `OPENAI_API_KEY`; no hay clave en el repositorio, no hay llamadas durante pruebas y no se habilitaron otros proveedores externos. `createAIProviderForPlan()` centraliza su construcción y `npm run smoke:openai-activity` deja preparada una prueba real ficticia que no se ejecuta en CI ni durante desarrollo normal.
- La política central de routing decide el modelo y `reasoning_effort` antes de cualquier llamada: Code resuelve tareas deterministas; TypeSafe/Jev queda para decisiones estructuradas; Luna usa `none`, Terra `low` y Sol `medium`. `OpenAIProvider` ejecuta exclusivamente el plan recibido y rechaza discrepancias de modelo.
- Los otros 9 workflows no generan todavía mediante modelo. `annual_plan`, `project`, `unit` y `activity` son los workflows habilitados mediante modelo. La interfaz, Supabase, despliegue, PDFs, embeddings, vector DB y Jev legacy siguen fuera de esta capa.
- v3, los catálogos `curriculum/` heredados, Jev y `CNEB_Inicial_AI_KnowledgePack_v2` se conservan solo como histórico, compatibilidad y pruebas legacy; no son dependencias de la arquitectura v4.
- Auditoría de consumidores de Jev (2026-09-22): `jev-decision.mjs` solo se importa desde `jev-decision.test.mjs` y `jev-benchmark.test.mjs`; no tiene consumidores productivos activos. Las integraciones nuevas deben importar únicamente `prepare-ai-request-v4.mjs`.

## Decisiones recientes

- No reutilizar Vercel ni Supabase existentes.
- Usar PGlite como PostgreSQL local sin Docker y mantener la app local hasta disponer de cuentas nuevas y un entorno de staging.
- Separar evidencia observada de evaluación pedagógica.
- Usar datos estructurados como fuente de verdad; IA y documentos son derivados.

## Próximo trabajo recomendado

1. Conectar los siguientes workflows solamente a través de `generateAIWorkflowV4()` y conservar la confirmación docente de toda propuesta o conclusión.
2. Añadir carga/normalización de logo aportado por institución, consentimiento y las siguientes clases de evidencia multimedia privadas (audio/video).
3. Implementar síntesis editable/confirmable y su conexión condicionada con el plan anual.
4. Crear proyectos nuevos de Supabase y hosting/staging; aplicar migraciones y comprobar RLS/Storage con dos usuarios de prueba.
5. Completar importación en staging solo después de validar identidad, respaldos y RLS.
6. Crear la interfaz de radar de competencias y, en una fase posterior, reutilizar sus estadísticas para Excel sin duplicar cálculos.

## Riesgos

- OpenAI está habilitado únicamente detrás de `createAIProviderForPlan()` para `activity`, `annual_plan`, `project` y `unit`; las pruebas normales usan mocks y los demás workflows permanecen sin generación.
- No se ha realizado revisión legal de datos personales de menores.
- PGlite no reproduce Auth, Storage ni RLS; esas capas se validarán en el nuevo staging Supabase.
- El diagnóstico local no permite concluir niveles formales ni pasar prioridades al plan anual; las pantallas de resultados/conclusiones son preparatorias.
- La asistencia y las excepciones de calendario están persistidas localmente; sus políticas RLS se aplicarán y probarán recién en el nuevo staging Supabase.



