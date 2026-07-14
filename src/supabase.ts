import { createClient } from '@supabase/supabase-js';
import { wrapSupabaseWithTracker } from './supabaseTracker';

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

const DEFAULT_SUPABASE_URL = "https://wihgsykwdgmsiklyvgpe.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_XwUSJhBWSfo_5SN35b5waw_jQAJTSga";

export const getEnvUrl = (): string => {
  try {
    // @ts-ignore
    const envUrl = import.meta.env.VITE_SUPABASE_URL;
    if (envUrl && envUrl.trim() !== "" && envUrl.includes("supabase.co")) {
      return envUrl;
    }
  } catch (e) {}
  return DEFAULT_SUPABASE_URL;
};

export const getEnvKey = (): string => {
  try {
    // @ts-ignore
    const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (envKey && envKey.trim() !== "") {
      return envKey;
    }
  } catch (e) {}
  return DEFAULT_SUPABASE_ANON_KEY;
};

// Carrega as credenciais iniciais tentando localStorage primeiro, depois permucyber_config, depois .env
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

  // Tenta recuperar do config global salvo localmente
  try {
    const savedConfig = localStorage.getItem('permucyber_config');
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      if (parsed.supabaseUrl && parsed.supabaseAnonKey) {
        return {
          url: cleanSupabaseUrl(parsed.supabaseUrl),
          key: cleanSupabaseKey(parsed.supabaseAnonKey),
          isLocal: true
        };
      }
    }
  } catch (e) {
    console.error("[Supabase] Erro ao ler permucyber_config no init:", e);
  }

  const envUrl = getEnvUrl();
  const envKey = getEnvKey();

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
    const rawClient = createClient(initial.url, initial.key);
    supabase = wrapSupabaseWithTracker(rawClient);
  } catch (error) {
    console.error("❌ Erro ao instanciar o cliente Supabase inicial:", error);
  }
}

/**
 * Atualiza as credenciais do Supabase dinamicamente no localStorage e recria o cliente
 */
export function setSupabaseCredentials(url: string, key: string, saveToLocal: boolean = true): boolean {
  const cleanedUrl = cleanSupabaseUrl(url);
  const cleanedKey = cleanSupabaseKey(key);

  if (!cleanedUrl || !cleanedKey || !isValidHttpUrl(cleanedUrl)) {
    return false;
  }

  try {
    if (saveToLocal) {
      localStorage.setItem('VITE_SUPABASE_URL', cleanedUrl);
      localStorage.setItem('VITE_SUPABASE_ANON_KEY', cleanedKey);
    }
    const rawClient = createClient(cleanedUrl, cleanedKey);
    supabase = wrapSupabaseWithTracker(rawClient);
    console.log(`✓ Cliente Supabase inicializado para: ${cleanedUrl}`);
    console.log("👉 Dica: Certifique-se de que a tabela 'dados_app' existe e que as permissões RLS estão desativadas ou configuradas para permitir INSERT anônimo se você não estiver usando Auth.");
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
  
  const envUrl = cleanSupabaseUrl(getEnvUrl());
  const envKey = cleanSupabaseKey(getEnvKey());

  if (envUrl && envKey && isValidHttpUrl(envUrl)) {
    try {
      const rawClient = createClient(envUrl, envKey);
      supabase = wrapSupabaseWithTracker(rawClient);
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

/**
 * Retorna o cliente Supabase atual ativo de forma segura.
 */
export function getSupabase() {
  if (supabase) return supabase;

  // Tenta re-inicializar se estiver nulo, usando as credenciais do .env ou localStorage
  const localUrl = localStorage.getItem('VITE_SUPABASE_URL');
  const localKey = localStorage.getItem('VITE_SUPABASE_ANON_KEY');
  
  let configUrl = '';
  let configKey = '';
  try {
    const savedConfig = localStorage.getItem('permucyber_config');
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      if (parsed.supabaseUrl && parsed.supabaseAnonKey) {
        configUrl = parsed.supabaseUrl;
        configKey = parsed.supabaseAnonKey;
      }
    }
  } catch (e) {}

  const envUrl = getEnvUrl();
  const envKey = getEnvKey();

  const url = cleanSupabaseUrl(localUrl || configUrl || envUrl);
  const key = cleanSupabaseKey(localKey || configKey || envKey);

  if (url && key && isValidHttpUrl(url)) {
    try {
      const rawClient = createClient(url, key);
      supabase = wrapSupabaseWithTracker(rawClient);
      console.log("✓ Cliente Supabase re-inicializado com sucesso.");
    } catch (error) {
      console.error("❌ Erro ao re-instanciar o cliente Supabase:", error);
    }
  }
  
  return supabase;
}


