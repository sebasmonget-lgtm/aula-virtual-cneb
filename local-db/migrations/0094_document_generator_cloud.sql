begin;
create table document_generator_worker_state (
 teacher_id uuid primary key references profiles(user_id),lease_token uuid not null,lease_until timestamptz not null
);
create table document_generator_dispatch_receipts (
 nonce uuid primary key,teacher_id uuid not null references profiles(user_id),accepted_at timestamptz not null default now()
);
create function guard_ayni_product_mode() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare previous text:=old.preferences->>'ayni_product_mode'; chosen text:=new.preferences->>'ayni_product_mode';
begin
 if chosen is not null and chosen not in ('daily','documents') then raise exception 'Modalidad de Ayni inválida.' using errcode='23514';end if;
 if previous is not null and chosen is distinct from previous then raise exception 'La modalidad de esta cuenta se conserva.' using errcode='23514';end if;
 if previous is null and chosen='documents' and exists(select 1 from classrooms where teacher_id=new.user_id) then raise exception 'No se convierte una cuenta con aula existente.' using errcode='23514';end if;
 return new;
end $$;
create trigger profiles_product_mode_guard before update of preferences on profiles for each row execute function guard_ayni_product_mode();
commit;
