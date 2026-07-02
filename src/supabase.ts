import { createClient } from '@supabase/supabase-js';

// Função para limpar as chaves de aspas acidentais, barras finais ou sufixos de rota REST
const cleanSupabaseUrl = (url: string): string => {
  let cleaned = url.trim();
  
  // Remove aspas duplas ou simples se o usuário colou o valor com aspas
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  
  // Remove o sufixo /rest/v1 ou /rest/v1/ que causa erro de path no PostgREST
  cleaned = cleaned.replace(/\/rest\/v1\/?$/, '');
  
  // Remove barra final se houver
  if (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  
  return cleaned;
};

const cleanSupabaseKey = (key: string): string => {
  let cleaned = key.trim();
  
  // Remove aspas duplas ou simples se o usuário colou o valor com aspas
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  
  return cleaned;
};

// Recupera as credenciais do Supabase a partir das variáveis de ambiente do Vite e limpa-as
const rawUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const rawKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

const supabaseUrl = cleanSupabaseUrl(rawUrl);
const supabaseAnonKey = cleanSupabaseKey(rawKey);

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
