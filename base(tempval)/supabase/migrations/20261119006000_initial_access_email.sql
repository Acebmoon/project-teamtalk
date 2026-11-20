-- Apenas metadados de entrega: nenhuma senha, token, hash de credencial ou corpo.
create table public.initial_access_deliveries (
  target_user_id uuid primary key references public.users(id) on delete cascade,
  id uuid not null unique default gen_random_uuid(),
  actor_id uuid not null references public.users(id),
  operation_id uuid,
  state text not null check (state in ('pending', 'sent', 'failed', 'used')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.initial_access_deliveries enable row level security;
revoke all on public.initial_access_deliveries from public, anon, authenticated;
grant all on public.initial_access_deliveries to service_role;

create function public.initial_access_allowed(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists(select 1 from public.initial_access_deliveries d
    where d.target_user_id = p_user_id
      and (d.state in ('pending', 'failed') or (d.state = 'sent' and d.expires_at <= now())));
$$;
revoke all on function public.initial_access_allowed(uuid) from public, anon, authenticated;

-- A validade também protege JWTs existentes e chamadas diretas ao Supabase.
create or replace function public.is_active_authorized_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.users u where u.id = (select auth.uid())
    and u.status = 'active' and public.initial_access_allowed(u.id)
    and (u.role = 'it_admin' or exists(
      select 1 from public.release_group_members m join public.release_groups g on g.id = m.release_group_id
      where m.user_id = u.id and g.is_enabled)));
$$;
create or replace function public.is_active_it_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.users u where u.id = (select auth.uid())
    and u.role = 'it_admin' and u.status = 'active' and not u.must_change_password
    and public.initial_access_allowed(u.id));
$$;
create or replace function public.admin_assert_actor(p_actor_id uuid)
returns void language plpgsql set search_path = '' as $$
begin
  if not exists(select 1 from public.users where id = p_actor_id
    and role = 'it_admin' and status = 'active' and not must_change_password
    and public.initial_access_allowed(id)) then
    raise exception 'Admin TI required' using errcode = '42501';
  end if;
end;
$$;
grant execute on function public.initial_access_allowed(uuid) to service_role;

-- A reserva do PR #100 fica retida durante Auth, preparo, envio e confirmação.
create function public.guard_pending_initial_email()
returns trigger language plpgsql set search_path = '' as $$
declare v_target uuid;
begin
  if tg_op = 'DELETE' then v_target := old.target_user_id; else v_target := new.target_user_id; end if;
  if exists(select 1 from public.initial_access_deliveries
    where target_user_id = v_target and state = 'pending') then
    raise exception 'Initial email pending reconciliation' using errcode = '55P03';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.guard_pending_initial_email() from public, anon, authenticated;
create trigger guard_pending_initial_email before insert or delete on public.admin_account_operations
for each row execute function public.guard_pending_initial_email();

create function public.admin_prepare_initial_email(
  p_actor_id uuid, p_target_id uuid, p_operation_id uuid, p_validity_hours integer
)
returns jsonb language plpgsql set search_path = '' as $$
declare v_user public.users; v_delivery public.initial_access_deliveries;
begin
  perform public.admin_assert_actor(p_actor_id);
  if p_actor_id = p_target_id or p_validity_hours not between 1 and 168 or p_validity_hours is null then
    raise exception 'Invalid initial email' using errcode = '22023';
  end if;
  select * into v_user from public.users where id = p_target_id for update;
  if not found then raise exception 'Account not found' using errcode = 'P0002'; end if;
  if p_operation_id is null then
    if v_user.status <> 'pending' or v_user.role <> 'employee'
      or exists(select 1 from public.admin_account_operations where target_user_id = p_target_id) then
      raise exception 'Invalid creation' using errcode = '55P03';
    end if;
  elsif not exists(select 1 from public.admin_account_operations where id = p_operation_id
    and target_user_id = p_target_id and actor_id = p_actor_id and action = 'redefinir-senha') then
    raise exception 'Invalid operation owner' using errcode = '42501';
  end if;
  if exists(select 1 from public.initial_access_deliveries where target_user_id = p_target_id and state = 'pending') then
    raise exception 'Email already pending' using errcode = '55P03';
  end if;
  insert into public.initial_access_deliveries(target_user_id, actor_id, operation_id, state, expires_at)
    values(p_target_id, p_actor_id, p_operation_id, 'pending', now() + make_interval(hours => p_validity_hours))
    on conflict(target_user_id) do update set id = gen_random_uuid(), actor_id = excluded.actor_id,
      operation_id = excluded.operation_id, state = 'pending', expires_at = excluded.expires_at, created_at = now()
    returning * into v_delivery;
  -- Sempre APÓS a senha ter sido escrita no Auth (o trigger pode ter zerado a marca).
  update public.users set must_change_password = true where id = p_target_id;
  insert into public.audit_logs(actor_id, action, target_user_id, details)
    values(p_actor_id, 'initial_access.email_prepared', p_target_id,
      jsonb_build_object('delivery_id', v_delivery.id, 'expires_at', v_delivery.expires_at));
  return jsonb_build_object('id', v_delivery.id, 'expires_at', v_delivery.expires_at);
end;
$$;

create function public.admin_finish_initial_email(p_actor_id uuid, p_delivery_id uuid, p_success boolean)
returns void language plpgsql set search_path = '' as $$
declare v_delivery public.initial_access_deliveries;
begin
  perform public.admin_assert_actor(p_actor_id);
  select * into v_delivery from public.initial_access_deliveries where id = p_delivery_id;
  if not found then raise exception 'Delivery not found' using errcode = 'P0002'; end if;
  perform 1 from public.users where id = v_delivery.target_user_id for update;
  select * into v_delivery from public.initial_access_deliveries where id = p_delivery_id for update;
  if not found or v_delivery.actor_id <> p_actor_id then
    raise exception 'Invalid delivery owner' using errcode = '42501';
  end if;
  if v_delivery.state <> 'pending' or p_success is null or (p_success and v_delivery.expires_at <= now()) then
    raise exception 'Invalid delivery state' using errcode = '22023';
  end if;
  update public.initial_access_deliveries set state = case when p_success then 'sent' else 'failed' end
    where id = p_delivery_id;
  update public.users set must_change_password = true where id = v_delivery.target_user_id;
  insert into public.audit_logs(actor_id, action, target_user_id, details)
    values(p_actor_id, case when p_success then 'initial_access.email_sent' else 'initial_access.email_failed' end,
      v_delivery.target_user_id, jsonb_build_object('delivery_id', v_delivery.id));
end;
$$;

-- A troca definitiva consome a credencial. Expiração/entrega pendente não podem
-- ser contornadas por updateUser direto no Auth; redefinições TI usam a reserva.
create or replace function public.clear_first_access_on_password_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_delivery public.initial_access_deliveries;
begin
  perform 1 from public.users where id = new.id for update;
  select * into v_delivery from public.initial_access_deliveries where target_user_id = new.id for update;
  if found and v_delivery.state <> 'used'
    and not exists(select 1 from public.admin_account_operations where target_user_id = new.id and action = 'redefinir-senha') then
    if v_delivery.state <> 'sent' or v_delivery.expires_at <= now()
      or not exists(select 1 from public.users where id = new.id and status = 'active') then
      raise exception 'Initial credential unavailable' using errcode = '42501';
    end if;
    update public.initial_access_deliveries set state = 'used' where target_user_id = new.id;
  end if;
  update public.users set must_change_password = false where id = new.id;
  return new;
end;
$$;

revoke all on function public.admin_prepare_initial_email(uuid, uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.admin_finish_initial_email(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_prepare_initial_email(uuid, uuid, uuid, integer) to service_role;
grant execute on function public.admin_finish_initial_email(uuid, uuid, boolean) to service_role;
