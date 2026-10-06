-- Run only during an explicitly authorized staging/deployment operation.
-- First store ayni_preparation_endpoint and ayni_preparation_dispatch_secret in Vault.
-- Match the secret to the server-only AYNI_PREPARATION_DISPATCH_SECRET environment variable.
-- Never put its value in this file, terminal output or documentation.
-- Requires pg_cron, pg_net and pgcrypto enabled by the project owner.
create or replace function private.dispatch_preparation_tick() returns bigint
language plpgsql security definer set search_path='' as $$
declare
  endpoint text;
  dispatch_secret text;
  timestamp_text text:=floor(extract(epoch from now()))::bigint::text;
  nonce_text text:=gen_random_uuid()::text;
  signature_text text;
begin
  select decrypted_secret into endpoint from vault.decrypted_secrets where name='ayni_preparation_endpoint';
  select decrypted_secret into dispatch_secret from vault.decrypted_secrets where name='ayni_preparation_dispatch_secret';
  if endpoint is null or endpoint !~ '^https://[^/]+/api/internal/preparation/run$' or length(dispatch_secret)<32 then
    raise exception 'Private preparation dispatcher configuration is missing';
  end if;
  signature_text:=encode(extensions.hmac(timestamp_text||'.'||nonce_text,dispatch_secret,'sha256'),'hex');
  return net.http_post(url:=endpoint,headers:=jsonb_build_object('Content-Type','application/json',
    'x-ayni-dispatch-time',timestamp_text,'x-ayni-dispatch-nonce',nonce_text,'x-ayni-dispatch-signature',signature_text),
    body:='{}'::jsonb,timeout_milliseconds:=290000);
end;
$$;
revoke all on function private.dispatch_preparation_tick() from public,anon,authenticated;
select cron.schedule('ayni-preparation-dispatch','10 seconds','select private.dispatch_preparation_tick()');
-- Rollback dispatch only: select cron.unschedule('ayni-preparation-dispatch');
-- Retain durable jobs, prepared activities and their private results.
