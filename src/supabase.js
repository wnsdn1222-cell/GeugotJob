import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && publishableKey && !url.includes('YOUR_PROJECT'));

export const supabase = isSupabaseConfigured
  ? createClient(url, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

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
