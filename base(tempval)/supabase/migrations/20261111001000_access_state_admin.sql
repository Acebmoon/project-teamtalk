-- Amplia a RPC existente sem criar uma segunda consulta de estado no middleware.
create or replace function public.get_access_state()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'authorized', (select public.is_active_authorized_user()),
    'must_change_password', coalesce((
      select u.must_change_password
      from public.users u
      where u.id = (select auth.uid())
    ), false),
    'it_admin', (select public.is_active_it_admin())
  );
$$;

revoke all on function public.get_access_state() from public, anon;
grant execute on function public.get_access_state() to authenticated;
