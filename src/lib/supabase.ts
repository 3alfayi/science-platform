import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('تنبيه: يرجي التأكد من إضافة VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في ملف .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);