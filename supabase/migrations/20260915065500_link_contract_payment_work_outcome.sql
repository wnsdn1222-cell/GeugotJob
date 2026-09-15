-- Keep contract, payment, and work-outcome states connected.

create function private.enforce_contract_confirmation_dependencies()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = 'confirmed' and new.status <> 'confirmed' and exists (
    select 1 from public.payment_preparations p
    where p.introduction_id = new.introduction_id and p.charge_status <> 'blocked'
  ) then
    raise exception '결제 가능 또는 테스트 완료 상태를 차단으로 되돌린 뒤 계약 확인을 변경해야 합니다.';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_contract_confirmation_dependencies() from public, anon, authenticated;

create trigger enforce_contract_confirmation_dependencies
  before update on public.contract_confirmations
  for each row execute function private.enforce_contract_confirmation_dependencies();

create function private.enforce_work_outcome_contract_gate()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.contract_confirmations c
    where c.introduction_id = new.introduction_id and c.status = 'confirmed'
  ) then
    raise exception '계약 체결 확인 후에만 근무 결과를 기록할 수 있습니다.';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_work_outcome_contract_gate() from public, anon, authenticated;

create trigger enforce_work_outcome_contract_gate
  before insert or update on public.work_outcomes
  for each row execute function private.enforce_work_outcome_contract_gate();
