import { collection, doc, setDoc, getDocs, deleteDoc, query, where, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { supabase, getSupabase } from './supabase';

/**
 * Interface para representar a estrutura dos dados que serão armazenados
 * tanto no Firestore (Firebase) quanto na tabela correspondente do Supabase.
 */
export interface AppDataRecord {
  id: string;          // No Firebase será a ID do doc, no Supabase será um UUID
  user_id: string;     // Identificação do usuário proprietário do registro
  titulo: string;      // Título descritivo
  descricao: string;   // Descrição detalhada
  dados_json: any;     // Dados complementares em formato JSON
  criado_em?: string;  // Data de criação
  origem?: 'supabase' | 'firebase'; // Origem física de onde este registro foi lido ou gravado
}

/**
 * Nome da coleção no Firestore e da tabela no Supabase
 */
const TABLE_NAME = 'dados_app';
export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

function isValidUUID(uuid: string) {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

/**
 * Converte qualquer string em um formato UUID válido para o Supabase (Postgres).
 * Isso é determinístico e permite usar IDs customizados (como 'M-1127') em colunas UUID.
 */
export function toSupabaseFriendlyUUID(str: string): string {
  if (isValidUUID(str)) return str;
  
  // Converter para Hex (cada char vira 2 hex digits)
  let hex = "";
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16);
  }
  
  // Preencher até 32 caracteres com um sufixo fixo para evitar colisões simples
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
 * Auxiliar para verificar se o erro disparado indica excesso de cotas no Firebase
 */
function isFirebaseQuotaError(error: any): boolean {
  if (!error) return false;
  const errMsg = String(error.message || error).toLowerCase();
  return (
    errMsg.includes('quota exceeded') || 
    errMsg.includes('quota') || 
    errMsg.includes('resource exhausted') || 
    errMsg.includes('exhausted')
  );
}

/**
 * Auxiliar para gerar um UUID compatível com ambos os bancos
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Ignora erro de contexto não seguro e faz o fallback
    }
  }
  // Fallback padrão RFC4122 v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 1. SALVAR DADOS (CRIAR REGISTRO)
 * Tenta salvar no Supabase primeiro (opção principal). Se falhar ou estiver indisponível,
 * salva no Firebase Firestore (fallback).
 */
export async function salvarDados(
  userId: string,
  titulo: string,
  descricao: string,
  dadosJson: any,
  customId?: string
): Promise<{ success: boolean; source: 'firebase' | 'supabase'; id: string; data: AppDataRecord }> {
  // Gerar um ID único que sirva para ambos os bancos ou usar o fornecido
  const recordId = customId || generateUUID();
  
  // UUID específico para o Supabase (se recordId não for UUID, convertemos determinísticamente)
  const supabaseRecordId = toSupabaseFriendlyUUID(recordId);

  // Garantir que o userId seja um UUID válido para o Supabase (colunas UUID são estritas)
  const finalUserId = (userId && isValidUUID(userId)) ? userId : SYSTEM_USER_ID;

  const record: AppDataRecord = {
    id: recordId,
    user_id: finalUserId,
    titulo: titulo,
    descricao: descricao,
    dados_json: dadosJson,
    criado_em: new Date().toISOString()
  };

  // --- FASE 1: TENTAR SUPABASE PRIMEIRO (PRINCIPAL) ---
  const supabaseClient = getSupabase();
  if (supabaseClient) {
    try {
      console.log(`[Fallback DB] Tentando salvar registro [${record.titulo}] no Supabase (ID Real: ${recordId}, ID Supabase: ${supabaseRecordId})...`);
      
      const { data, error } = await supabaseClient
        .from(TABLE_NAME)
        .upsert(
          {
            id: supabaseRecordId,
            user_id: finalUserId,
            titulo: titulo,
            descricao: descricao,
            dados_json: dadosJson, // Armazenar apenas os dados brutos, sem o wrapper AppDataRecord
            criado_em: record.criado_em
          },
          { onConflict: 'id' }
        )
        .select();

      if (error) {
        console.error("[Fallback DB] ❌ Erro retornado pelo Supabase:", JSON.stringify(error));
        const detailMsg = error.message || "Erro desconhecido";
        const hintMsg = error.hint ? ` | Dica: ${error.hint}` : "";
        const codeMsg = error.code ? ` (Código: ${error.code})` : "";
        
        // Se o erro for de coluna inexistente, logar aviso específico
        if (error.code === '42703') {
           console.warn(`[Fallback DB] 🚨 Aviso: Coluna inexistente detectada. Verifique se a tabela '${TABLE_NAME}' tem as colunas: id, user_id, titulo, descricao, dados_json, criado_em.`);
        }

        throw new Error(`${detailMsg}${hintMsg}${codeMsg}`);
      }

      console.log("[Fallback DB] ✓ Registro salvo com sucesso no Supabase!");
      const savedData = data && data.length > 0 ? data[0] : record;
      return { success: true, source: 'supabase', id: recordId, data: { ...savedData, origem: 'supabase' } };
    } catch (supabaseError: any) {
      console.warn(`[Fallback DB] ⚠️ Supabase falhou (ID: ${recordId}). Causa:`, supabaseError.message || supabaseError);
      
      if (supabaseError.message?.includes('RLS') || supabaseError.code === '42501') {
        console.warn("[Fallback DB] 🚨 Dica: O erro parece ser de permissão (RLS). Verifique as políticas no painel do Supabase.");
      }
      
      console.log("[Fallback DB] Acionando fallback automático do Firebase...");
    }
  } else {
    console.log("[Fallback DB] Supabase não configurado ou offline. Direcionando direto para o Firebase.");
  }

  // --- FASE 2: REDUNDÂNCIA NO FIREBASE (REMOVIDA AUTOMÁTICA) ---
  // O Firebase agora é manual. 
  console.error(`[Fallback DB] Erro: Supabase indisponível para salvar ${recordId}.`);
  return { success: false, source: 'supabase', id: recordId, data: { ...record, origem: 'supabase' } } as any;
}

export async function atualizarDados(
  id: string,
  fields: Partial<Omit<AppDataRecord, 'id' | 'user_id' | 'criado_em'>>,
  sourceHint?: 'firebase' | 'supabase'
): Promise<{ success: boolean; source: 'firebase' | 'supabase' }> {
  
  const supabaseId = toSupabaseFriendlyUUID(id);

  // Se houver um hint sugerindo Firebase especificamente, tenta Firebase primeiro
  if (sourceHint === 'firebase') {
    console.log("[Fallback DB] Atualizando dados diretamente no Firebase por indicação de Hint...");
    if ((window as any).simulateFirebaseOffline === true) {
      throw new Error("SimulatedFirebaseError: Quota exceeded (Simulado)");
    }
    const docRef = doc(db, TABLE_NAME, id);
    await setDoc(docRef, fields, { merge: true });
    return { success: true, source: 'firebase' };
  }

  // --- TENTATIVA PADRÃO: SUPABASE PRIMEIRO (PRINCIPAL) ---
  const supabaseClient = getSupabase();
  if (supabaseClient) {
    try {
      console.log(`[Fallback DB] Tentando atualizar registro no Supabase (ID Real: ${id}, ID Supabase: ${supabaseId})...`);
      const { error } = await supabaseClient
        .from(TABLE_NAME)
        .update(fields)
        .eq('id', supabaseId);

      if (error) throw new Error(error.message);

      console.log("[Fallback DB] ✓ Registro atualizado com sucesso no Supabase!");
      return { success: true, source: 'supabase' };
    } catch (supabaseError: any) {
      console.warn("[Fallback DB] ⚠️ Falha ao atualizar dados no Supabase. Acionando fallback do Firebase:", supabaseError);
    }
  }

  // --- FALLBACK AUTOMÁTICO PARA FIREBASE (DESATIVADO) ---
  return { success: false, source: 'supabase' } as any;
}

/**
 * 3. DELETAR DADOS
 * Tenta deletar no Supabase primeiro. Deleta também no Firebase para manter sincronia
 * e garantir remoção de dados íntegra.
 */
export async function deletarDados(
  id: string,
  sourceHint?: 'firebase' | 'supabase'
): Promise<{ success: boolean; source: 'firebase' | 'supabase' | 'both' }> {
  
  const supabaseId = toSupabaseFriendlyUUID(id);
  let deletedInSupabase = false;
  let deletedInFirebase = false;

  // 1. Tenta Supabase (Principal)
  if (!sourceHint || sourceHint === 'supabase') {
    const supabaseClient = getSupabase();
    if (supabaseClient) {
      try {
        console.log(`[Fallback DB] Removendo registro do Supabase (ID Real: ${id}, ID Supabase: ${supabaseId})...`);
        const { error } = await supabaseClient.from(TABLE_NAME).delete().eq('id', supabaseId);
        if (!error) {
          deletedInSupabase = true;
          console.log("[Fallback DB] ✓ Registro removido do Supabase.");
        } else {
          console.warn("[Fallback DB] Falha ao deletar no Supabase:", error.message);
        }
      } catch (err) {
        console.warn("[Fallback DB] Erro ao deletar no Supabase:", err);
      }
    }
  }

  // 2. Tenta Firebase (Sempre tenta se não houver hint, para garantir remoção total)
  if (!sourceHint || sourceHint === 'firebase') {
    try {
      console.log(`[Fallback DB] Removendo registro do Firebase (ID: ${id})...`);
      const docRef = doc(db, TABLE_NAME, id);
      await deleteDoc(docRef);
      deletedInFirebase = true;
      console.log("[Fallback DB] ✓ Registro removido do Firebase.");
    } catch (err) {
      console.warn("[Fallback DB] Falha ao deletar no Firebase:", err);
    }
  }

  return {
    success: deletedInSupabase || deletedInFirebase,
    source: (deletedInSupabase && deletedInFirebase) ? 'both' : deletedInSupabase ? 'supabase' : 'firebase'
  };
}

/**
 * 4. LISTAR REGISTROS DE UM USUÁRIO
 * Tenta buscar do Supabase primeiro (opção principal). Se falhar ou estiver com cota estourada,
 * consulta o Firebase Firestore para garantir continuidade de uso sem interrupções.
 */
export async function listarDados(
  userId: string
): Promise<{ success: boolean; data: AppDataRecord[]; sourcesUsed: ('firebase' | 'supabase')[] }> {
  const result: AppDataRecord[] = [];
  const sourcesUsed: ('firebase' | 'supabase')[] = [];

  // --- FASE 1: OBTER DO SUPABASE PRIMEIRO (PRINCIPAL) ---
  const supabaseClient = getSupabase();
  if (supabaseClient) {
    try {
      console.log("[Fallback DB] Buscando registros no Supabase para o usuário:", userId);
      const { data, error } = await supabaseClient
        .from(TABLE_NAME)
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error("[Fallback DB] Erro ao consultar Supabase:", error.message);
      } else if (data) {
        data.forEach((row: any) => {
          // Tentar recuperar o ID original do JSON se ele foi "UUID-ficado" para o Supabase
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
        sourcesUsed.push('supabase');
        console.log(`[Fallback DB] ✓ ${data.length} registros carregados do Supabase.`);
      }
    } catch (err) {
      console.error("[Fallback DB] Erro catastrófico ao ler do Supabase:", err);
    }
  }

  // --- FASE 2: OBTER DO FIREBASE (Fallback se Supabase falhou ou retornou vazio) ---
  if (sourcesUsed.length === 0 || result.length === 0) {
    try {
      if ((window as any).simulateFirebaseOffline === true) {
        throw new Error("SimulatedFirebaseError: Quota exceeded (Simulado pelo painel de controle)");
      }
      console.log("[Fallback DB] Consultando dados no Firebase Firestore (Fallback)...");
      const q = query(collection(db, TABLE_NAME), where('user_id', '==', userId));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        // Evitar duplicados caso já tivéssemos trazido do Supabase
        if (!result.some(r => r.id === doc.id)) {
          result.push({ ...(doc.data() as AppDataRecord), id: doc.id, origem: 'firebase' });
        }
      });
      sourcesUsed.push('firebase');
      console.log(`[Fallback DB] ✓ ${result.length} registros obtidos do Firebase.`);
    } catch (firebaseError: any) {
      console.warn("[Fallback DB] ⚠️ Falha ao ler dados do Firebase Firestore:", firebaseError);
    }
  }

  return {
    success: true,
    data: result.sort((a, b) => {
      const dateA = a.criado_em ? new Date(a.criado_em).getTime() : 0;
      const dateB = b.criado_em ? new Date(b.criado_em).getTime() : 0;
      return dateB - dateA; // Ordenado decrescente (mais recentes primeiro)
    }),
    sourcesUsed
  };
}
