-- Independente do PR de contas. Não altera o gate is_active_authorized_user().
-- Todas as mudanças de grupos e seus eventos pertencem à mesma transação.
create function public.admin_manage_release_group(
  p_actor_id uuid,
  p_action text,
  p_group_id uuid default null,
  p_name text default null,
  p_description text default null,
  p_user_id uuid default null
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_group public.release_groups;
  v_action text;
  v_details jsonb;
  v_changed boolean := true;
  v_count integer;
  v_enabled boolean;
begin
  -- O ator vem do guard do servidor. O lock também impede uma revogação de
  -- status/senha concorrente de atravessar a autorização desta transação.
  perform 1 from public.users where id = p_actor_id and role = 'it_admin'
    and status = 'active' and not must_change_password for share;
  if not found then
    raise exception 'Admin TI required' using errcode = '42501';
  end if;
  if p_action is null or p_action not in ('criar', 'habilitar', 'desabilitar', 'incluir', 'remover') then
    raise exception 'Invalid group operation' using errcode = '22023';
  end if;

  if p_action = 'criar' then
    if p_group_id is not null or p_user_id is not null or p_name is null
      or length(btrim(p_name)) not between 1 and 100
      or (p_description is not null and length(btrim(p_description)) > 500) then
      raise exception 'Invalid group data' using errcode = '22023';
    end if;
    insert into public.release_groups(name, description, is_enabled)
      values(btrim(p_name), nullif(btrim(p_description), ''), false)
      returning * into v_group;
    v_action := 'release_group.created';
    v_details := jsonb_build_object('is_enabled', false);
  else
    if p_group_id is null or p_name is not null or p_description is not null then
      raise exception 'Invalid group data' using errcode = '22023';
    end if;
    -- Serializa habilitação, desabilitação e composição do mesmo grupo.
    select * into v_group from public.release_groups where id = p_group_id for update;
    if not found then raise exception 'Group not found' using errcode = 'P0002'; end if;
    if p_action in ('habilitar', 'desabilitar') then
      if p_user_id is not null then raise exception 'Unexpected user' using errcode = '22023'; end if;
      v_enabled := p_action = 'habilitar';
      v_changed := v_group.is_enabled is distinct from v_enabled;
      v_details := jsonb_build_object('previous_is_enabled', v_group.is_enabled, 'is_enabled', v_enabled);
      if v_changed then
        update public.release_groups set is_enabled = v_enabled where id = p_group_id returning * into v_group;
      end if;
      v_action := case when v_enabled then 'release_group.enabled' else 'release_group.disabled' end;
    else
      if p_user_id is null then raise exception 'User required' using errcode = '22023'; end if;
      perform 1 from public.users where id = p_user_id for share;
      if not found then raise exception 'User not found' using errcode = 'P0002'; end if;
      if p_action = 'incluir' then
        insert into public.release_group_members(release_group_id, user_id, added_by)
          values(p_group_id, p_user_id, p_actor_id) on conflict do nothing;
        get diagnostics v_count = row_count;
        v_action := 'release_group.member_added';
      else
        delete from public.release_group_members where release_group_id = p_group_id and user_id = p_user_id;
        get diagnostics v_count = row_count;
        v_action := 'release_group.member_removed';
      end if;
      v_changed := v_count > 0;
      v_details := jsonb_build_object('is_enabled', v_group.is_enabled);
    end if;
  end if;

  if v_changed then
    insert into public.audit_logs(actor_id, action, target_user_id, details)
      values(p_actor_id, v_action, p_user_id,
        v_details || jsonb_build_object('group_id', v_group.id, 'group_name', v_group.name));
  end if;
  return jsonb_build_object('grupo', to_jsonb(v_group), 'alterado', v_changed);
end;
$$;

-- Invoker, sem SECURITY DEFINER: somente o servidor com service_role executa.
revoke all on function public.admin_manage_release_group(uuid, text, uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.admin_manage_release_group(uuid, text, uuid, text, text, uuid) to service_role;
grant select, insert, update, delete on public.release_groups, public.release_group_members to service_role;
grant select on public.users to service_role;
grant select, insert on public.audit_logs to service_role;
grant usage, select on sequence public.audit_logs_id_seq to service_role;

-- Acesso de leitura continua sujeito às policies existentes; sem escrita direta
-- do navegador nem edição/exclusão de eventos de auditoria por authenticated.
revoke insert, update, delete, truncate, references, trigger
  on public.release_groups, public.release_group_members, public.audit_logs from anon, authenticated;

create index audit_logs_actor_created_id_idx on public.audit_logs(actor_id, created_at desc, id desc);
create index audit_logs_action_created_id_idx on public.audit_logs(action, created_at desc, id desc);
create index audit_logs_created_id_idx on public.audit_logs(created_at desc, id desc);
