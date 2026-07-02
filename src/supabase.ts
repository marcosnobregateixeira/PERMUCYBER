import { createClient } from '@supabase/supabase-js';

// Função para limpar as chaves de aspas acidentais, barras finais ou sufixos de rota REST
export const cleanSupabaseUrl = (url: string): string => {
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

export const cleanSupabaseKey = (key: string): string => {
  let cleaned = key.trim();
  
  // Remove aspas duplas ou simples se o usuário colou o valor com aspas
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  
  return cleaned;
};

// Função auxiliar para validar se o URL possui um esquema HTTP ou HTTPS válido
export const isValidHttpUrl = (urlString: string) => {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
};

// Carrega as credenciais iniciais tentando localStorage primeiro, depois .env
const getInitialCredentials = () => {
  const localUrl = localStorage.getItem('VITE_SUPABASE_URL');
  const localKey = localStorage.getItem('VITE_SUPABASE_ANON_KEY');

  if (localUrl && localKey) {
    return {
      url: cleanSupabaseUrl(localUrl),
      key: cleanSupabaseKey(localKey),
      isLocal: true
    };
  }

  const envUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

  return {
    url: cleanSupabaseUrl(envUrl),
    key: cleanSupabaseKey(envKey),
    isLocal: false
  };
};

const initial = getInitialCredentials();

/**
 * Cliente Supabase inicializado de forma segura.
 * Pode ser reatribuído dinamicamente via setSupabaseCredentials.
 */
export let supabase = null;

if (initial.url && initial.key && isValidHttpUrl(initial.url)) {
  try {
    supabase = createClient(initial.url, initial.key);
  } catch (error) {
    console.error("❌ Erro ao instanciar o cliente Supabase inicial:", error);
  }
}

/**
 * Atualiza as credenciais do Supabase dinamicamente no localStorage e recria o cliente
 */
export function setSupabaseCredentials(url: string, key: string): boolean {
  const cleanedUrl = cleanSupabaseUrl(url);
  const cleanedKey = cleanSupabaseKey(key);

  if (!cleanedUrl || !cleanedKey || !isValidHttpUrl(cleanedUrl)) {
    return false;
  }

  try {
    localStorage.setItem('VITE_SUPABASE_URL', cleanedUrl);
    localStorage.setItem('VITE_SUPABASE_ANON_KEY', cleanedKey);
    supabase = createClient(cleanedUrl, cleanedKey);
    console.log("✓ Cliente Supabase atualizado com novas credenciais dinâmicas!");
    return true;
  } catch (error) {
    console.error("❌ Erro ao instanciar Supabase dinamicamente:", error);
    return false;
  }
}

/**
 * Limpa as credenciais locais do Supabase e retorna para as do .env
 */
export function clearSupabaseCredentials() {
  localStorage.removeItem('VITE_SUPABASE_URL');
  localStorage.removeItem('VITE_SUPABASE_ANON_KEY');
  
  const envUrl = cleanSupabaseUrl((import.meta as any).env.VITE_SUPABASE_URL || '');
  const envKey = cleanSupabaseKey((import.meta as any).env.VITE_SUPABASE_ANON_KEY || '');

  if (envUrl && envKey && isValidHttpUrl(envUrl)) {
    try {
      supabase = createClient(envUrl, envKey);
    } catch (e) {
      supabase = null;
    }
  } else {
    supabase = null;
  }
}

if (!supabase) {
  console.warn(
    "⚠️ Supabase: Cliente não configurado ou credenciais inválidas. Adicione chaves VITE_SUPABASE_URL (iniciando com http/https) e VITE_SUPABASE_ANON_KEY válidas no painel de configurações ou arquivo .env."
  );
}

