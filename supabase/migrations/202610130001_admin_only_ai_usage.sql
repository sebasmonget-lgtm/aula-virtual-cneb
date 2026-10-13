-- Autorización expresa del propietario: restringir únicamente la lectura de costos.
-- No modifica datos ni privilegios de escritura; también afecta a la base compartida.
alter policy teacher_read_own_ai_usage on public.ai_usage_events
  using (((select auth.jwt()) -> 'app_metadata' ->> 'ayni_role') = 'admin');
