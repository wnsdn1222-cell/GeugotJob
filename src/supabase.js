import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && publishableKey && !url.includes('YOUR_PROJECT'));

export const supabase = isSupabaseConfigured
  ? createClient(url, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

function requireSupabase() {
  if (!supabase) throw new Error('Supabase 환경 변수가 설정되지 않았습니다.');
  return supabase;
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
