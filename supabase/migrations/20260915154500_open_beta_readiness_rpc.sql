-- Expose only non-sensitive readiness flags to authenticated administrators.

create function public.get_open_beta_readiness()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare settings private.platform_settings;
begin
  if (select auth.uid()) is null or not (select private.is_admin()) then
    raise exception '운영자만 오픈 베타 설정 상태를 확인할 수 있습니다.';
  end if;
  select * into settings from private.platform_settings where singleton = true;
  return jsonb_build_object(
    'commute_method', settings.commute_distance_method,
    'nearby_threshold_km', settings.nearby_threshold_km,
    'distance_provider_configured', nullif(trim(settings.distance_provider_name), '') is not null,
    'wage_confirmation_policy_configured', nullif(trim(settings.wage_incident_confirmation_policy_version), '') is not null,
    'employer_restriction_policy_configured', nullif(trim(settings.employer_restriction_policy_version), '') is not null,
    'paid_operations_enabled', settings.paid_introduction_operations_enabled and settings.paid_introduction_registration_verified_at is not null,
    'payment_integration_verified', settings.payment_integration_verified_at is not null and nullif(trim(settings.payment_provider_name), '') is not null
  );
end;
$$;

revoke all on function public.get_open_beta_readiness() from public, anon;
grant execute on function public.get_open_beta_readiness() to authenticated;

