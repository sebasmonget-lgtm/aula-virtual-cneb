# Modelo de datos inicial

El modelo mantiene `owner_id` en los agregados principales y usa relaciones explícitas. Las políticas RLS comparan siempre con `auth.uid()`; la interfaz no es una barrera de autorización.

## Fase 0 y Fase 1

- `profiles`: preferencias mínimas de la docente.
- `curriculum_versions`, `levels`, `age_grades`, `curriculum_areas`, `competencies`, `capacities`, `standards`, `performances`: currículo oficial versionado.
- `school_years`, `classrooms`, `students`, `calendar_events`: aula activa, nómina y calendario.

## Primer flujo vertical

- `learning_experiences` agrupa unidad, proyecto o taller.
- `activities` representa el trabajo cotidiano.
- `activity_criteria` contiene solo los criterios relevantes para esa actividad.
- `evidences` registra lo que un estudiante hizo, dijo o produjo. Cada evidencia nueva asociada a un criterio requiere una marca observacional docente (`demonstrated`, `with_support`, `not_yet_demonstrated` o `insufficient_information`); la nota es opcional y no contiene un nivel final automático.

La migración reproducible está en `supabase/migrations/202609200001_initial_cneb.sql`.

## Desarrollo local

PGlite usa `local-db/migrations` y persiste en `.local/pgdata`. La API local conserva los mismos UUID, nombres de entidades y relaciones relevantes que las migraciones Supabase. Los campos propios de Auth/RLS se prueban posteriormente en staging.

La actualización 01 añade `institution_profiles`, `institution_assets`, `competency_observation_guides`, `document_templates` y `document_versions`. Se extiende el modelo existente; no se duplican aulas, competencias ni evidencias.

La actualización de evidencia conserva las notas históricas y añade la marca observacional nullable para compatibilidad. La API actual exige la marca para toda evidencia nueva vinculada a un criterio. Las actividades exponen todos sus `activity_criteria` planificados, no solo el primero.
