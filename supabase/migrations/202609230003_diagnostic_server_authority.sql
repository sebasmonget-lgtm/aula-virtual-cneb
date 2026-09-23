-- Diagnostic writes must pass through the authenticated server, which validates
-- classroom, age, applicability and source snapshots. Direct browser writes
-- could otherwise forge a source record despite row-level ownership checks.
drop policy if exists diagnostic_experience_insert_own on public.diagnostic_experience_observations;
drop policy if exists diagnostic_review_insert_own on public.diagnostic_competency_reviews;
drop policy if exists diagnostic_review_update_draft on public.diagnostic_competency_reviews;
drop policy if exists diagnostic_group_insert_own on public.diagnostic_group_reviews;
drop policy if exists diagnostic_group_update_draft on public.diagnostic_group_reviews;

revoke insert, update, delete on public.diagnostic_experience_observations from authenticated;
revoke insert, update, delete on public.diagnostic_competency_reviews from authenticated;
revoke insert, update, delete on public.diagnostic_group_reviews from authenticated;

-- Existing SELECT policies continue to isolate each teacher's own classroom.
