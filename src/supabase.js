import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && publishableKey && !url.includes('YOUR_PROJECT'));
export const isJobInfoMvpDevelopment = import.meta.env.VITE_JOB_INFO_MVP_MODE === 'development';
export const isClosedBetaDevelopment = import.meta.env.VITE_CLOSED_BETA_MODE === 'development';
export const isOpenBetaDevelopment = import.meta.env.VITE_OPEN_BETA_MODE === 'development';
export const isServiceLaunchDevelopment = import.meta.env.VITE_SERVICE_LAUNCH_MODE === 'development';
export const draftConsentVersion = 'mvp-draft-2026-09-15';

export const supabase = isSupabaseConfigured
  ? createClient(url, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

function requireSupabase() {
  if (!supabase) throw new Error('Supabase 환경 변수가 설정되지 않았습니다.');
  return supabase;
}

async function getCurrentUser() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw error ?? new Error('로그인이 필요합니다.');
  return data.user;
}

async function recordConsent(consentType) {
  const client = requireSupabase();
  const user = await getCurrentUser();
  const { data, error } = await client.from('consent_records').insert({
    user_id: user.id,
    consent_type: consentType,
    document_version: draftConsentVersion,
    is_draft: true,
    operating_mode: 'development'
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

async function retryJwtClockSkew(operation, attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!/JWT issued at future/i.test(error?.message ?? '') || attempt === attempts - 1) throw error;
      await new Promise((resolve) => window.setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function signUpWithEmail({ email, password, fullName, role }) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { full_name: fullName.trim(), role },
      emailRedirectTo: `${window.location.origin}/`
    }
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail({ email, password }) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function getMyProfile() {
  const client = requireSupabase();
  return retryJwtClockSkew(async () => {
    const { data, error } = await client.from('profiles').select('id, role, full_name, phone').single();
    if (error) throw error;
    return data;
  });
}

export async function loadMvpData(role) {
  const client = requireSupabase();
  if (role === 'employer') {
    const [companyResult, jobsResult, intentsResult] = await Promise.all([
      client.from('employers').select('id, company_name, business_number, city, contact_name, contact_email, contact_phone, workplace_address').maybeSingle(),
      client.from('job_postings').select('id, title, job_category, city, company_name, workplace_address, employment_type, work_days, work_hours, wage_type, wage_amount, wage_notes, headcount, starts_on, ends_on, description, publication_status, operating_mode, created_at, applications:job_applications(id, applicant_name, contact_email, contact_phone, message, status, created_at)').order('created_at', { ascending: false }),
      client.from('service_intents').select('id, needs, usage_intent, preferred_contact, created_at').order('created_at', { ascending: false })
    ]);
    if (companyResult.error) throw companyResult.error;
    if (jobsResult.error) throw jobsResult.error;
    if (intentsResult.error) throw intentsResult.error;
    return { role, details: companyResult.data, jobs: jobsResult.data ?? [], applications: [], contacts: [], intents: intentsResult.data ?? [] };
  }

  const [workerResult, jobsResult, applicationsResult, contactsResult, intentsResult] = await Promise.all([
    client.from('workers').select('id, nationality, job_category, city, experience_months, availability_date, contact_email, contact_phone, experience_summary, desired_conditions').maybeSingle(),
    client.from('job_postings').select('id, title, job_category, city, company_name, workplace_address, employment_type, work_days, work_hours, wage_type, wage_amount, wage_notes, headcount, starts_on, ends_on, description, publication_status, operating_mode, created_at').eq('publication_status', 'published').eq('is_active', true).order('created_at', { ascending: false }),
    client.from('job_applications').select('id, job_posting_id, message, status, created_at').order('created_at', { ascending: false }),
    client.from('job_contacts').select('job_posting_id, contact_name, contact_email, contact_phone, preferred_channel'),
    client.from('service_intents').select('id, needs, usage_intent, preferred_contact, created_at').order('created_at', { ascending: false })
  ]);
  for (const result of [workerResult, jobsResult, applicationsResult, contactsResult, intentsResult]) {
    if (result.error) throw result.error;
  }
  return {
    role,
    details: workerResult.data,
    jobs: jobsResult.data ?? [],
    applications: applicationsResult.data ?? [],
    contacts: contactsResult.data ?? [],
    intents: intentsResult.data ?? []
  };
}

export async function saveEmployerProfile(values) {
  const client = requireSupabase();
  const user = await getCurrentUser();
  await recordConsent('profile_storage');
  await recordConsent('employer_contact_disclosure');
  const { error: profileError } = await client.from('profiles').update({
    full_name: values.full_name,
    phone: values.contact_phone || null,
    updated_at: new Date().toISOString()
  }).eq('id', user.id);
  if (profileError) throw profileError;
  const { data, error } = await client.from('employers').upsert({
    profile_id: user.id,
    company_name: values.company_name,
    business_number: values.business_number || null,
    city: values.city || null,
    contact_name: values.contact_name,
    contact_email: values.contact_email || null,
    contact_phone: values.contact_phone || null,
    workplace_address: values.workplace_address || null,
    updated_at: new Date().toISOString()
  }, { onConflict: 'profile_id' }).select().single();
  if (error) throw error;
  return data;
}

export async function saveWorkerProfile(values) {
  const client = requireSupabase();
  const user = await getCurrentUser();
  await recordConsent('profile_storage');
  const { error: profileError } = await client.from('profiles').update({
    full_name: values.full_name,
    phone: values.contact_phone || null,
    updated_at: new Date().toISOString()
  }).eq('id', user.id);
  if (profileError) throw profileError;
  const { data, error } = await client.from('workers').upsert({
    profile_id: user.id,
    nationality: values.nationality,
    job_category: values.job_category,
    city: values.city,
    experience_months: values.experience_months,
    availability_date: values.availability_date || null,
    contact_email: values.contact_email || null,
    contact_phone: values.contact_phone || null,
    experience_summary: values.experience_summary || null,
    desired_conditions: values.desired_conditions || null
  }, { onConflict: 'profile_id' }).select().single();
  if (error) throw error;
  return data;
}

export async function createJobPosting(values) {
  const client = requireSupabase();
  const consentRecordId = await recordConsent('employer_contact_disclosure');
  const { data, error } = await client.rpc('create_job_posting_with_contact', {
    p_title: values.title,
    p_job_category: values.job_category,
    p_city: values.city,
    p_company_name: values.company_name,
    p_workplace_address: values.workplace_address,
    p_employment_type: values.employment_type,
    p_work_days: values.work_days,
    p_work_hours: values.work_hours,
    p_wage_type: values.wage_type,
    p_wage_amount: values.wage_amount,
    p_wage_notes: values.wage_notes || '',
    p_headcount: values.headcount,
    p_starts_on: values.starts_on || null,
    p_ends_on: values.ends_on || null,
    p_description: values.description || '',
    p_contact_name: values.contact_name,
    p_contact_email: values.contact_email || '',
    p_contact_phone: values.contact_phone || '',
    p_preferred_channel: values.preferred_channel,
    p_consent_record_id: consentRecordId,
    p_operating_mode: 'development'
  });
  if (error) throw error;
  return data;
}

export async function applyToJob({ jobPostingId, workerId, message, contactEmail, contactPhone }) {
  const client = requireSupabase();
  const consentRecordId = await recordConsent('application_sharing');
  const { data, error } = await client.from('job_applications').insert({
    job_posting_id: jobPostingId,
    worker_id: workerId,
    applicant_name: '지원자',
    message: message || null,
    contact_email: contactEmail || null,
    contact_phone: contactPhone || null,
    consent_record_id: consentRecordId
  }).select().single();
  if (error) throw error;
  return data;
}

export async function logDirectContact(applicationId, channel) {
  const client = requireSupabase();
  const { data, error } = await client.from('contact_events').insert({
    application_id: applicationId,
    channel
  }).select().single();
  if (error) throw error;
  return data;
}

export async function saveServiceIntent({ role, needs, usageIntent, preferredContact }) {
  const client = requireSupabase();
  const user = await getCurrentUser();
  const consentRecordId = await recordConsent('service_intent');
  const { data, error } = await client.from('service_intents').insert({
    user_id: user.id,
    audience: role,
    needs,
    usage_intent: usageIntent,
    preferred_contact: preferredContact,
    consent_record_id: consentRecordId,
    operating_mode: 'development'
  }).select().single();
  if (error) throw error;
  return data;
}

export async function loadReservations() {
  const client = requireSupabase();
  return retryJwtClockSkew(async () => {
    const { data, error } = await client
      .from('reservations')
      .select('id, reservation_type, title, reserved_at, ends_at, status, location, notes')
      .order('reserved_at', { ascending: true });
    if (error) throw error;
    return data;
  });
}

export async function createReservation(reservation) {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) throw authError ?? new Error('로그인이 필요합니다.');

  const { data, error } = await client
    .from('reservations')
    .insert({ ...reservation, user_id: authData.user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function cancelReservation(id) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('reservations')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function loadClosedBetaConsole() {
  const client = requireSupabase();
  const [profiles, participants, jobs, workers, introductions] = await Promise.all([
    client.from('profiles').select('id, role, full_name').in('role', ['worker', 'employer']).order('created_at'),
    client.from('closed_beta_participants').select('profile_id, participant_role, active, operating_mode, created_at'),
    client.from('job_postings').select('id, employer_id, title, job_category, city, company_name, workplace_address, employment_type, work_days, work_hours, wage_type, wage_amount, wage_notes, description, actual_conditions_confirmed, employer:employers!job_postings_employer_id_fkey(profile_id, company_name)'),
    client.from('workers').select('id, profile_id, job_category, city, experience_months, availability_date, experience_summary, desired_conditions, profile:profiles!workers_profile_id_fkey(full_name)'),
    client.from('manual_introductions').select('id, job_posting_id, worker_id, operator_id, employer_feedback, comparison_notes, selection_reason, conditions_reviewed_at, status, operating_mode, introduced_at, created_at, contract:contract_confirmations(id, status, confirmation_method, evidence_reference, confirmed_at), payment:payment_preparations(id, payer_profile_id, payment_method_status, payment_consent_status, amount_krw, price_basis, provider_mode, charge_status, test_completed_at), outcome:work_outcomes(id, attendance_status, first_shift_status, contract_outcome, outcome_notes, recorded_at)').order('created_at', { ascending: false })
  ]);
  for (const result of [profiles, participants, jobs, workers, introductions]) {
    if (result.error) throw result.error;
  }
  return {
    profiles: profiles.data ?? [], participants: participants.data ?? [], jobs: jobs.data ?? [],
    workers: workers.data ?? [], introductions: introductions.data ?? []
  };
}

export async function saveClosedBetaParticipant({ profileId, participantRole, active = true }) {
  const client = requireSupabase();
  const user = await getCurrentUser();
  const { data, error } = await client.from('closed_beta_participants').upsert({
    profile_id: profileId,
    participant_role: participantRole,
    approved_by: user.id,
    active,
    operating_mode: 'development',
    updated_at: new Date().toISOString()
  }, { onConflict: 'profile_id' }).select().single();
  if (error) throw error;
  return data;
}

export async function createManualIntroduction(values) {
  const client = requireSupabase();
  const user = await getCurrentUser();
  const { data, error } = await client.from('manual_introductions').insert({
    job_posting_id: values.jobPostingId,
    worker_id: values.workerId,
    operator_id: user.id,
    employer_feedback: values.employerFeedback || null,
    comparison_notes: values.comparisonNotes,
    selection_reason: values.selectionReason,
    conditions_reviewed_at: new Date().toISOString(),
    status: 'selected',
    operating_mode: 'development'
  }).select().single();
  if (error) throw error;
  return data;
}

export async function saveContractConfirmation({ introductionId, status, confirmationMethod, evidenceReference }) {
  const client = requireSupabase();
  const user = await getCurrentUser();
  const confirmed = status === 'confirmed';
  const { data, error } = await client.from('contract_confirmations').upsert({
    introduction_id: introductionId,
    status,
    confirmation_method: confirmationMethod || null,
    evidence_reference: evidenceReference || null,
    confirmed_by: confirmed ? user.id : null,
    confirmed_at: confirmed ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  }, { onConflict: 'introduction_id' }).select().single();
  if (error) throw error;
  return data;
}

export async function savePaymentPreparation({ introductionId, payerProfileId, chargeStatus }) {
  const client = requireSupabase();
  const testCompleted = chargeStatus === 'test_completed';
  const { data, error } = await client.from('payment_preparations').upsert({
    introduction_id: introductionId,
    payer_profile_id: payerProfileId,
    payment_method_status: 'test_registered',
    payment_consent_status: 'agreed',
    consented_at: new Date().toISOString(),
    amount_krw: 19000,
    price_basis: 'temporary_validation',
    provider_mode: 'unconnected_test',
    charge_status: chargeStatus,
    test_completed_at: testCompleted ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  }, { onConflict: 'introduction_id' }).select().single();
  if (error) throw error;
  return data;
}

export async function saveWorkOutcome(values) {
  const client = requireSupabase();
  const user = await getCurrentUser();
  const { data, error } = await client.from('work_outcomes').upsert({
    introduction_id: values.introductionId,
    attendance_status: values.attendanceStatus,
    first_shift_status: values.firstShiftStatus,
    contract_outcome: values.contractOutcome,
    outcome_notes: values.outcomeNotes || null,
    recorded_by: user.id,
    recorded_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, { onConflict: 'introduction_id' }).select().single();
  if (error) throw error;
  return data;
}

export async function loadOpenBetaConsole() {
  const client = requireSupabase();
  const [closedBeta, readiness, commutes, wageResponses, wageReviews, accessControls, criteria, feePayments, reuseIntentions, operatingCosts] = await Promise.all([
    loadClosedBetaConsole(),
    client.rpc('get_open_beta_readiness'),
    client.from('commute_assessments').select('id, introduction_id, distance_method, distance_km, nearby_threshold_km, is_nearby, status, evidence_note, assessed_at'),
    client.from('wage_payment_responses').select('id, introduction_id, worker_id, response, response_note, responded_at, updated_at'),
    client.from('wage_incident_reviews').select('id, response_id, status, review_basis, policy_version, reviewed_at, created_at'),
    client.from('employer_access_controls').select('employer_id, status, related_review_id, policy_version, decision_basis, decided_at, updated_at'),
    client.from('matching_criterion_records').select('id, introduction_id, criterion_name, observation, status, created_at').order('created_at', { ascending: false }),
    client.from('fee_payment_records').select('id, introduction_id, payer_profile_id, amount_krw, status, provider_name, external_payment_id, paid_at, created_at').order('created_at', { ascending: false }),
    client.from('reuse_intentions').select('id, profile_id, introduction_id, response, response_note, responded_at').order('responded_at', { ascending: false }),
    client.from('operating_costs').select('id, cost_date, category, amount_krw, description, evidence_reference, created_at').order('cost_date', { ascending: false })
  ]);
  for (const result of [readiness, commutes, wageResponses, wageReviews, accessControls, criteria, feePayments, reuseIntentions, operatingCosts]) {
    if (result.error) throw result.error;
  }
  return {
    ...closedBeta,
    readiness: readiness.data ?? {},
    commutes: commutes.data ?? [], wageResponses: wageResponses.data ?? [],
    wageReviews: wageReviews.data ?? [], accessControls: accessControls.data ?? [],
    criteria: criteria.data ?? [], feePayments: feePayments.data ?? [],
    reuseIntentions: reuseIntentions.data ?? [], operatingCosts: operatingCosts.data ?? []
  };
}

export async function loadOpenBetaMemberData() {
  const client = requireSupabase();
  const user = await getCurrentUser();
  const [{ data: worker, error: workerError }, { data: introductions, error: introductionError }, { data: reuseIntentions, error: reuseError }] = await Promise.all([
    client.from('workers').select('id').eq('profile_id', user.id).maybeSingle(),
    client.from('manual_introductions').select('id, worker_id, status, created_at, job:job_postings!manual_introductions_job_posting_id_fkey(title, company_name), outcome:work_outcomes(id, contract_outcome), commute:commute_assessments(distance_km, nearby_threshold_km, is_nearby, status), wage:wage_payment_responses(id, response, response_note, responded_at, review:wage_incident_reviews(status))').order('created_at', { ascending: false }),
    client.from('reuse_intentions').select('id, introduction_id, response, response_note, responded_at').eq('profile_id', user.id).order('responded_at', { ascending: false })
  ]);
  if (workerError) throw workerError;
  if (introductionError) throw introductionError;
  if (reuseError) throw reuseError;
  return { worker, introductions: introductions ?? [], reuseIntentions: reuseIntentions ?? [] };
}

export async function calculateCommuteAssessment(introductionId) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('calculate_commute_assessment', { p_introduction_id: introductionId });
  if (error) throw error;
  return data;
}

export async function saveWagePaymentResponse({ introductionId, workerId, response, responseNote }) {
  const client = requireSupabase();
  const { data, error } = await client.from('wage_payment_responses').upsert({
    introduction_id: introductionId,
    worker_id: workerId,
    response,
    response_note: responseNote || null,
    responded_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, { onConflict: 'introduction_id' }).select().single();
  if (error) throw error;
  return data;
}

export async function saveReuseIntention({ introductionId, response, responseNote }) {
  const client = requireSupabase();
  const user = await getCurrentUser();
  const { data, error } = await client.from('reuse_intentions').insert({
    profile_id: user.id,
    introduction_id: introductionId || null,
    response,
    response_note: responseNote || null
  }).select().single();
  if (error) throw error;
  return data;
}

export async function saveMatchingCriterion({ introductionId, criterionName, observation, status }) {
  const client = requireSupabase();
  const user = await getCurrentUser();
  const { data, error } = await client.from('matching_criterion_records').insert({
    introduction_id: introductionId,
    criterion_name: criterionName,
    observation,
    status,
    recorded_by: user.id
  }).select().single();
  if (error) throw error;
  return data;
}

export async function saveOperatingCost({ costDate, category, amountKrw, description, evidenceReference }) {
  const client = requireSupabase();
  const user = await getCurrentUser();
  const { data, error } = await client.from('operating_costs').insert({
    cost_date: costDate,
    category,
    amount_krw: amountKrw,
    description: description || null,
    evidence_reference: evidenceReference || null,
    recorded_by: user.id
  }).select().single();
  if (error) throw error;
  return data;
}

export async function loadDemoRecords() {
  if (!supabase) return null;
  const [employers, workers] = await Promise.all([
    supabase.from('demo_employers').select('id, demo_code, display_name, city, industry, data_label', { count: 'exact' }).order('id').limit(6),
    supabase.from('demo_workers').select('id, demo_code, display_name, city, job_category, experience_months, data_label', { count: 'exact' }).order('id').limit(6)
  ]);
  if (employers.error) throw employers.error;
  if (workers.error) throw workers.error;
  return {
    employerCount: employers.count ?? 0,
    workerCount: workers.count ?? 0,
    employers: employers.data ?? [],
    workers: workers.data ?? []
  };
}

export async function loadServiceLaunchConsole() {
  const client = requireSupabase();
  const [openBeta, cases, events, feedback] = await Promise.all([
    loadOpenBetaConsole(),
    client.from('service_cases').select('id, introduction_id, stage, operating_mode, created_at, updated_at').order('updated_at', { ascending: false }),
    client.from('service_case_events').select('id, service_case_id, from_stage, to_stage, source, created_at').order('created_at', { ascending: false }),
    client.from('employer_feedback_records').select('id, introduction_id, work_outcome_id, feedback_type, feedback_text, recorded_by, created_at').order('created_at', { ascending: false })
  ]);
  for (const result of [cases, events, feedback]) if (result.error) throw result.error;
  return { ...openBeta, serviceCases: cases.data ?? [], caseEvents: events.data ?? [], employerFeedback: feedback.data ?? [] };
}

export async function loadServiceLaunchMemberData() {
  const client = requireSupabase();
  const [openBeta, cases, events, feedback] = await Promise.all([
    loadOpenBetaMemberData(),
    client.from('service_cases').select('id, introduction_id, stage, operating_mode, created_at, updated_at').order('updated_at', { ascending: false }),
    client.from('service_case_events').select('id, service_case_id, from_stage, to_stage, source, created_at').order('created_at', { ascending: false }),
    client.from('employer_feedback_records').select('id, introduction_id, feedback_type, feedback_text, created_at').order('created_at', { ascending: false })
  ]);
  for (const result of [cases, events, feedback]) if (result.error) throw result.error;
  return { ...openBeta, serviceCases: cases.data ?? [], caseEvents: events.data ?? [], employerFeedback: feedback.data ?? [] };
}

export async function syncServiceCase(introductionId) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('sync_service_case', { p_introduction_id: introductionId, p_operating_mode: 'development' });
  if (error) throw error;
  return data;
}

export async function saveEmployerFeedback({ introductionId, workOutcomeId, feedbackType, feedbackText }) {
  const client = requireSupabase();
  const user = await getCurrentUser();
  const { data, error } = await client.from('employer_feedback_records').insert({
    introduction_id: introductionId,
    work_outcome_id: workOutcomeId || null,
    feedback_type: feedbackType,
    feedback_text: feedbackText,
    recorded_by: user.id
  }).select().single();
  if (error) throw error;
  return data;
}

export async function loadRecommendedWorkers() {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('matches')
    .select(`
      id, score, status, explanation, distance_km,
      worker:workers!matches_worker_id_fkey(
        id, nationality, visa_type, job_category, city, experience_months,
        availability_date, reliability_score, communication_score, skill_score, attendance_rate,
        profile:profiles!workers_profile_id_fkey(full_name)
      )
    `)
    .order('score', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data;
}

export async function requestWithdrawal(amount) {
  if (!supabase) return { demo: true };
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error('로그인이 필요합니다.');

  const { data, error } = await supabase
    .from('withdrawal_requests')
    .insert({ user_id: userId, amount })
    .select()
    .single();

  if (error) throw error;
  return data;
}
