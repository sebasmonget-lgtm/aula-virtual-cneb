-- Autorizada expresamente y aplicada el 2026-10-12.
-- Migración registrada: 202610130001_admin_only_ai_usage.sql.
-- Requiere que la tabla y la política ya existan, según migración 202609270002.
-- La base compartida también sirve a Producción: aplicar modifica su acceso directo.
begin;
alter policy teacher_read_own_ai_usage on public.ai_usage_events
  using (((select auth.jwt()) -> 'app_metadata' ->> 'ayni_role') = 'admin');
commit;
-- Rollback autorizado por separado:
-- alter policy teacher_read_own_ai_usage on public.ai_usage_events
--   using (teacher_id = auth.uid());
