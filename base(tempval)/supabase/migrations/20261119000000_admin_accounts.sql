-- Operações Auth e PostgreSQL não compartilham uma transação. A reserva por alvo
-- impede alterações concorrentes e mantém o acesso negado até a confirmação.
create table public.admin_account_operations (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null unique references public.users(id) on delete cascade,
  actor_id uuid not null references public.users(id),
  action text not null check (action in ('bloquear', 'reativar', 'desativar', 'redefinir-senha')),
  previous_status public.user_status not null,
  created_at timestamptz not null default now()
);
alter table public.admin_account_operations enable row level security;
revoke all on public.admin_account_operations from public, anon, authenticated;
grant all on public.admin_account_operations to service_role;

create function public.admin_assert_actor(p_actor_id uuid)
returns void language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.users where id = p_actor_id
    and role = 'it_admin' and status = 'active' and not must_change_password) then
    raise exception 'Admin TI required' using errcode = '42501';
  end if;
end;
$$;

create function public.admin_create_account(
  p_actor_id uuid, p_target_id uuid, p_role public.user_role, p_status public.user_status
)
returns jsonb language plpgsql set search_path = '' as $$
declare v_user public.users;
begin
  perform public.admin_assert_actor(p_actor_id);
  if p_status not in ('pending', 'active') then
    raise exception 'Invalid initial status' using errcode = '22023';
  end if;
  select * into v_user from public.users where id = p_target_id for update;
  if not found then raise exception 'Account not found' using errcode = 'P0002'; end if;
  if v_user.status <> 'pending' or v_user.role <> 'employee'
    or exists(select 1 from public.admin_account_operations where target_user_id = p_target_id) then
    raise exception 'Account already managed' using errcode = '55P03';
  end if;
  -- Necessariamente DEPOIS de Auth Admin createUser e do trigger de senha.
  update public.users set role = p_role, status = p_status, must_change_password = true
    where id = p_target_id returning * into v_user;
  insert into public.audit_logs(actor_id, action, target_user_id, details)
    values(p_actor_id, 'account.created', p_target_id,
      jsonb_build_object('role', p_role, 'status', p_status, 'must_change_password', true));
  return to_jsonb(v_user);
end;
$$;

create function public.admin_start_account_operation(p_actor_id uuid, p_target_id uuid, p_action text)
returns jsonb language plpgsql set search_path = '' as $$
declare v_user public.users; v_operation_id uuid;
begin
  perform public.admin_assert_actor(p_actor_id);
  if p_action not in ('bloquear', 'reativar', 'desativar', 'redefinir-senha') then
    raise exception 'Invalid operation' using errcode = '22023';
  end if;
  if p_actor_id = p_target_id then
    raise exception 'Cannot manage own account' using errcode = '22023';
  end if;
  select * into v_user from public.users where id = p_target_id for update;
  if not found then raise exception 'Account not found' using errcode = 'P0002'; end if;
  if exists(select 1 from public.admin_account_operations where target_user_id = p_target_id) then
    raise exception 'Operation in progress' using errcode = '55P03';
  end if;
  insert into public.admin_account_operations(target_user_id, actor_id, action, previous_status)
    values(p_target_id, p_actor_id, p_action, v_user.status) returning id into v_operation_id;
  update public.users set status = 'blocked' where id = p_target_id;
  insert into public.audit_logs(actor_id, action, target_user_id, details)
    values(p_actor_id, 'account.operation_started', p_target_id,
      jsonb_build_object('operation_id', v_operation_id, 'operation', p_action, 'previous_status', v_user.status));
  return jsonb_build_object('operacao_id', v_operation_id, 'conta', to_jsonb(v_user));
end;
$$;

create function public.admin_finish_account_operation(p_actor_id uuid, p_operation_id uuid, p_success boolean)
returns jsonb language plpgsql set search_path = '' as $$
declare v_operation public.admin_account_operations; v_user public.users; v_status public.user_status;
begin
  perform public.admin_assert_actor(p_actor_id);
  -- Mesma ordem de locks da preparação: usuário, depois reserva.
  select * into v_operation from public.admin_account_operations where id = p_operation_id;
  if not found then raise exception 'Operation not found' using errcode = 'P0002'; end if;
  perform 1 from public.users where id = v_operation.target_user_id for update;
  select * into v_operation from public.admin_account_operations where id = p_operation_id for update;
  if not found or v_operation.actor_id <> p_actor_id then
    raise exception 'Invalid operation owner' using errcode = '42501';
  end if;
  v_status := case
    when not p_success then case when v_operation.previous_status = 'disabled' then 'disabled'::public.user_status else 'blocked'::public.user_status end
    when v_operation.action = 'reativar' then 'active'::public.user_status
    when v_operation.action = 'desativar' then 'disabled'::public.user_status
    when v_operation.action = 'bloquear' then 'blocked'::public.user_status
    else v_operation.previous_status
  end;
  -- O trigger on_auth_password_changed pode ter zerado a marca. Reaplicar aqui.
  update public.users set status = v_status,
    must_change_password = case when v_operation.action = 'redefinir-senha' then true else must_change_password end
    where id = v_operation.target_user_id returning * into v_user;
  insert into public.audit_logs(actor_id, action, target_user_id, details)
    values(p_actor_id, case when p_success then
      case v_operation.action when 'reativar' then 'account.reactivated' when 'desativar' then 'account.disabled'
        when 'bloquear' then 'account.blocked' else 'account.password_reset' end
      else 'account.operation_failed' end, v_operation.target_user_id,
      jsonb_build_object('operation_id', v_operation.id, 'operation', v_operation.action,
        'previous_status', v_operation.previous_status, 'status', v_status));
  delete from public.admin_account_operations where id = p_operation_id;
  return to_jsonb(v_user);
end;
$$;

-- Nenhuma RPC de gestão (inclusive a marca de senha) é chamável pelo cliente.
revoke all on function public.admin_assert_actor(uuid) from public, anon, authenticated;
revoke all on function public.admin_create_account(uuid, uuid, public.user_role, public.user_status) from public, anon, authenticated;
revoke all on function public.admin_start_account_operation(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.admin_finish_account_operation(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_assert_actor(uuid) to service_role;
grant execute on function public.admin_create_account(uuid, uuid, public.user_role, public.user_status) to service_role;
grant execute on function public.admin_start_account_operation(uuid, uuid, text) to service_role;
grant execute on function public.admin_finish_account_operation(uuid, uuid, boolean) to service_role;
