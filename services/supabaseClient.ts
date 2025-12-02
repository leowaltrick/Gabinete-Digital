import { createClient } from '@supabase/supabase-js';

const SUPABASE_PROJECT_ID = 'yioefhebxsohutdypxqd';
const supabaseUrl = `https://${SUPABASE_PROJECT_ID}.supabase.co`;
const supabaseKey = 'sb_publishable_ltKmfB3EreWKb757l0c6mw__0FBPSeR';

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export const isSupabaseConfigured = () => !!supabase;