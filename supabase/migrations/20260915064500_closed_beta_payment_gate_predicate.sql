-- Isolate the payment gate predicate so it can be verified without writing
-- customer or authentication data.

create function private.closed_beta_payment_transition_allowed(
  contract_status text,
  payment_method_status text,
  payment_consent_status text,
  introduction_mode text,
  desired_charge_status text,
  paid_operations_enabled boolean
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when desired_charge_status = 'blocked' then true
    when contract_status <> 'confirmed' then false
    when payment_method_status <> 'test_registered' then false
    when payment_consent_status <> 'agreed' then false
    when desired_charge_status = 'test_completed' then introduction_mode = 'development'
    when desired_charge_status = 'eligible' then
      introduction_mode = 'development' or paid_operations_enabled
    else false
  end;
$$;

revoke all on function private.closed_beta_payment_transition_allowed(text, text, text, text, text, boolean)
from public, anon, authenticated;

create or replace function private.enforce_closed_beta_payment_gate()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  contract_status text;
  introduction_mode text;
begin
  if new.charge_status = 'blocked' then
    return new;
  end if;

  select c.status, i.operating_mode
  into contract_status, introduction_mode
  from public.contract_confirmations c
  join public.manual_introductions i on i.id = c.introduction_id
  where c.introduction_id = new.introduction_id;

  if not private.closed_beta_payment_transition_allowed(
    contract_status,
    new.payment_method_status,
    new.payment_consent_status,
    introduction_mode,
    new.charge_status,
    (select private.paid_introduction_operations_enabled())
  ) then
    if contract_status is distinct from 'confirmed' then
      raise exception '계약 체결 확인 전에는 결제 가능 상태로 변경할 수 없습니다.';
    elsif new.payment_method_status <> 'test_registered'
       or new.payment_consent_status <> 'agreed' then
      raise exception '테스트 결제수단 등록과 결제 동의가 필요합니다.';
    elsif introduction_mode = 'production' then
      raise exception '유료직업소개사업 등록 확인 전에는 운영 결제를 활성화할 수 없습니다.';
    else
      raise exception '허용되지 않은 결제 상태 변경입니다.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_closed_beta_payment_gate() from public, anon, authenticated;
