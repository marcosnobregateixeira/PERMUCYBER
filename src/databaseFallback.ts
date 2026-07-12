import { supabase, getSupabase } from './supabase';

/**
 * Interface para representar a estrutura dos dados que serão armazenados
 * exclusivamente na tabela correspondente do Supabase.
 */
export interface AppDataRecord {
  id: string;          // UUID no Supabase
  user_id: string;     // Identificação do usuário proprietário do registro
  titulo: string;      // Título descritivo
  descricao: string;   // Descrição detalhada
  dados_json: any;     // Dados complementares em formato JSON
  criado_em?: string;  // Data de criação
  origem?: 'supabase' | 'local'; // Identificador de persistência
}

/**
 * Nome da tabela no Supabase
 */
const TABLE_NAME = 'dados_app';
export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
export const BACKUP_USER_ID = '00000000-0000-0000-0000-000000000001';

function isValidUUID(uuid: string) {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

/**
 * Converte qualquer string em um formato UUID válido para o Supabase (Postgres).
 */
export function toSupabaseFriendlyUUID(str: string): string {
  if (isValidUUID(str)) return str;
  
  let hex = "";
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16);
  }
  
  const suffix = "abcdef0123456789";
  const fullHex = (hex + suffix.repeat(2)).substring(0, 32);
  
  return [
    fullHex.substring(0, 8),
    fullHex.substring(8, 12),
    fullHex.substring(12, 16),
    fullHex.substring(16, 20),
    fullHex.substring(20, 32)
  ].join('-');
}

/**
 * Auxiliar para gerar um UUID
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 1. SALVAR DADOS (CRIAR/UPSERT REGISTRO)
 * Utiliza exclusivamente o Supabase para persistência.
 */
export async function salvarDados(
  userId: string,
  titulo: string,
  descricao: string,
  dadosJson: any,
  customId?: string
): Promise<{ success: boolean; source: 'supabase'; id: string; data: AppDataRecord }> {
  const recordId = customId || generateUUID();
  const supabaseRecordId = toSupabaseFriendlyUUID(recordId);
  const finalUserId = (userId && isValidUUID(userId)) ? userId : SYSTEM_USER_ID;

  const record: AppDataRecord = {
    id: recordId,
    user_id: finalUserId,
    titulo: titulo,
    descricao: descricao,
    dados_json: dadosJson,
    criado_em: new Date().toISOString()
  };

  const supabaseClient = getSupabase();
  if (!supabaseClient) {
    console.error("[Fallback DB] Supabase não configurado.");
    return { success: false, source: 'supabase', id: recordId, data: record };
  }

  try {
    console.log(`[Fallback DB] Gravando no Supabase (ID: ${recordId})...`);
    
    const { data, error } = await supabaseClient
      .from(TABLE_NAME)
      .upsert(
        {
          id: supabaseRecordId,
          user_id: finalUserId,
          titulo: titulo,
          descricao: descricao,
          dados_json: dadosJson,
          criado_em: record.criado_em
        },
        { onConflict: 'id' }
      )
      .select();

    if (error) throw new Error(error.message);

    console.log("[Fallback DB] ✓ Registro salvo no Supabase.");
    const savedData = data && data.length > 0 ? data[0] : record;
    return { success: true, source: 'supabase', id: recordId, data: { ...savedData, origem: 'supabase' } };
  } catch (err: any) {
    console.error("[Fallback DB] Erro Supabase:", err.message);
    return { success: false, source: 'supabase', id: recordId, data: record };
  }
}

/**
 * 2. ATUALIZAR DADOS
 */
export async function atualizarDados(
  id: string,
  fields: Partial<Omit<AppDataRecord, 'id' | 'user_id' | 'criado_em'>>,
  _sourceHint?: string
): Promise<{ success: boolean; source: 'supabase' }> {
  const supabaseId = toSupabaseFriendlyUUID(id);
  const supabaseClient = getSupabase();

  if (!supabaseClient) return { success: false, source: 'supabase' };

  try {
    console.log(`[Fallback DB] Atualizando no Supabase (ID: ${id})...`);
    const updatePayload: any = {
      ...fields,
      criado_em: new Date().toISOString()
    };
    const { error } = await supabaseClient
      .from(TABLE_NAME)
      .update(updatePayload)
      .eq('id', supabaseId);

    if (error) throw new Error(error.message);
    return { success: true, source: 'supabase' };
  } catch (err) {
    console.warn("[Fallback DB] Erro ao atualizar no Supabase:", err);
    return { success: false, source: 'supabase' };
  }
}

/**
 * 3. DELETAR DADOS
 */
export async function deletarDados(
  id: string,
  _sourceHint?: string
): Promise<{ success: boolean; source: 'supabase' }> {
  const supabaseId = toSupabaseFriendlyUUID(id);
  const supabaseClient = getSupabase();

  if (!supabaseClient) return { success: false, source: 'supabase' };

  try {
    console.log(`[Fallback DB] Removendo do Supabase (ID: ${id})...`);
    const { error } = await supabaseClient.from(TABLE_NAME).delete().eq('id', supabaseId);
    if (error) throw new Error(error.message);
    return { success: true, source: 'supabase' };
  } catch (err) {
    console.warn("[Fallback DB] Erro ao deletar no Supabase:", err);
    return { success: false, source: 'supabase' };
  }
}

/**
 * 4. LISTAR REGISTROS
 */
export async function listarDados(
  userId: string
): Promise<{ success: boolean; data: AppDataRecord[]; sourcesUsed: 'supabase'[] }> {
  const result: AppDataRecord[] = [];
  const supabaseClient = getSupabase();

  if (!supabaseClient) return { success: false, data: [], sourcesUsed: [] };

  try {
    console.log("[Fallback DB] Buscando no Supabase para usuário:", userId);
    const { data, error } = await supabaseClient
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    if (data) {
      data.forEach((row: any) => {
        const originalId = row.dados_json?.id || row.id;
        result.push({
          id: originalId,
          user_id: row.user_id,
          titulo: row.titulo,
          descricao: row.descricao,
          dados_json: row.dados_json,
          criado_em: row.criado_em,
          origem: 'supabase'
        });
      });
    }
    return { success: true, data: result.sort((a, b) => {
      const dateA = a.criado_em ? new Date(a.criado_em).getTime() : 0;
      const dateB = b.criado_em ? new Date(b.criado_em).getTime() : 0;
      return dateB - dateA;
    }), sourcesUsed: ['supabase'] };
  } catch (err) {
    console.error("[Fallback DB] Erro ao listar do Supabase:", err);
    return { success: false, data: [], sourcesUsed: [] };
  }
}
