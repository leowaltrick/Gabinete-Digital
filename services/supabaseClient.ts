import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
// ID do projeto extraído da sua URI anterior
const SUPABASE_PROJECT_ID = 'yioefhebxsohutdypxqd';
const supabaseUrl = `https://${SUPABASE_PROJECT_ID}.supabase.co`;

// Chave Pública (Publishable Key) extraída da sua imagem
// Esta chave é segura para usar no navegador
const supabaseKey = 'sb_publishable_ltKmfB3EreWKb757l0c6mw__0FBPSeR';

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export const isSupabaseConfigured = () => !!supabase;