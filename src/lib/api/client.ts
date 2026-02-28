import { supabase } from '@/lib/supabase';

export type ApiResult<T> = { data: T | null; error: string | null };

export async function runQuery<T>(fn: () => Promise<{ data: T | null; error: any }>): Promise<ApiResult<T>> {
  try {
    const { data, error } = await fn();
    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Onbekende fout' };
  }
}

export { supabase };
