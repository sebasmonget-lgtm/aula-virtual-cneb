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
- La capa semántica para Jev incluye 14 competencias de Inicial y genera runtimes separados para 3, 4 y 5 años. Permanece separada del registro oficial, que está en transcripción pendiente de contraste por página desde PDF MINEDU.
- Jev exige revisión doble (`official_review_status` y `semantic_review_status`) antes de proponer una selección. En desempeños, valida además edad y competencia previamente confirmada. El benchmark contiene 50 situaciones de competencia y casos de desempeño marcados para fallback manual hasta completar el maestro oficial.
- Se integró `CNEB_Inicial_AI_KnowledgePack_v2` como enriquecimiento de las 14 fichas semánticas y 140 candidatos semánticos de desempeño. Sus textos no modifican `curriculum/official`, conservan estado pendiente y los candidatos no ingresan a los runtimes hasta contrastarlos con PDF MINEDU.
- La importación es reproducible con `node scripts/import-cneb-knowledge-pack-v2.mjs <directorio-del-paquete-extraído>`; el ZIP y los PDF de trabajo no se guardan en Git.

## Decisiones recientes

- No reutilizar Vercel ni Supabase existentes.
- Usar PGlite como PostgreSQL local sin Docker y mantener la app local hasta disponer de cuentas nuevas y un entorno de staging.
- Separar evidencia observada de evaluación pedagógica.
- Usar datos estructurados como fuente de verdad; IA y documentos son derivados.

## Próximo trabajo recomendado

1. Sustituir el catálogo ilustrativo por desempeños y referentes CNEB oficiales revisados para 3, 4 y 5 años.
2. Añadir carga/normalización de logo aportado por institución, consentimiento y las siguientes clases de evidencia multimedia privadas (audio/video).
3. Implementar síntesis editable/confirmable y su conexión condicionada con el plan anual.
4. Crear proyectos nuevos de Supabase y hosting/staging; aplicar migraciones y comprobar RLS/Storage con dos usuarios de prueba.
5. Completar importación en staging solo después de validar currículo, identidad y respaldos.
6. Crear la interfaz de radar de competencias y, en una fase posterior, reutilizar sus estadísticas para Excel sin duplicar cálculos.

## Riesgos

- El contenido CNEB incluido en la demo es ilustrativo; antes de producción debe cargarse y validarse desde fuentes oficiales.
- No se ha realizado revisión legal de datos personales de menores.
- PGlite no reproduce Auth, Storage ni RLS; esas capas se validarán en el nuevo staging Supabase.
- El diagnóstico local no permite concluir niveles formales ni pasar prioridades al plan anual; las pantallas de resultados/conclusiones son preparatorias.
- La asistencia y las excepciones de calendario están persistidas localmente; sus políticas RLS se aplicarán y probarán recién en el nuevo staging Supabase.
