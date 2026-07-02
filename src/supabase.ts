import { createClient } from '@supabase/supabase-js';

// Recupera as credenciais do Supabase a partir das variáveis de ambiente do Vite
const supabaseUrl = ((import.meta as any).env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = ((import.meta as any).env.VITE_SUPABASE_ANON_KEY || '').trim();

// Função auxiliar para validar se o URL possui um esquema HTTP ou HTTPS válido
const isValidHttpUrl = (urlString: string) => {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
};

/**
 * Cliente Supabase inicializado de forma segura.
 * Se as variáveis de ambiente não estiverem presentes ou forem inválidas,
 * o cliente será nulo para evitar travamentos, emitindo um aviso no console.
 */
let initializedSupabase = null;

if (supabaseUrl && supabaseAnonKey && isValidHttpUrl(supabaseUrl)) {
  try {
    initializedSupabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error("❌ Erro ao instanciar o cliente Supabase:", error);
  }
}

export const supabase = initializedSupabase;

if (!supabase) {
  console.warn(
    "⚠️ Supabase: Cliente não configurado ou credenciais inválidas. Adicione chaves VITE_SUPABASE_URL (iniciando com http/https) e VITE_SUPABASE_ANON_KEY válidas no painel de configurações ou arquivo .env."
  );
}
