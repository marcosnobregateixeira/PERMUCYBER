import { collection, doc, setDoc, getDocs, deleteDoc, query, where, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { supabase } from './supabase';

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
}

/**
 * Nome da coleção no Firestore e da tabela no Supabase
 */
const TABLE_NAME = 'dados_app';

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
 * 1. SALVAR DADOS (CRIAR REGISTRO)
 * Tenta salvar no Supabase primeiro (opção principal). Se falhar ou estiver indisponível,
 * salva no Firebase Firestore (fallback).
 */
export async function salvarDados(
  userId: string,
  titulo: string,
  descricao: string,
  dadosJson: any
): Promise<{ success: boolean; source: 'firebase' | 'supabase'; id: string; data: AppDataRecord }> {
  // Gerar um ID único que sirva para ambos os bancos se necessário
  const recordId = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const record: AppDataRecord = {
    id: recordId,
    user_id: userId,
    titulo: titulo,
    descricao: descricao,
    dados_json: dadosJson,
    criado_em: new Date().toISOString()
  };

  // --- FASE 1: TENTAR SUPABASE PRIMEIRO (PRINCIPAL) ---
  if (supabase) {
    try {
      console.log("[Fallback DB] Tentando salvar registro no Supabase (Principal)...");
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert([
          {
            id: record.id,
            user_id: record.user_id,
            titulo: record.titulo,
            descricao: record.descricao,
            dados_json: record.dados_json,
            criado_em: record.criado_em
          }
        ])
        .select();

      if (error) {
        throw new Error(error.message);
      }

      console.log("[Fallback DB] ✓ Registro salvo com sucesso no Supabase!");
      return { success: true, source: 'supabase', id: recordId, data: data ? data[0] : record };
    } catch (supabaseError: any) {
      console.warn("[Fallback DB] ⚠️ Falha no Supabase ao salvar dados. Acionando fallback automático do Firebase:", supabaseError);
    }
  } else {
    console.log("[Fallback DB] Supabase não configurado ou offline. Direcionando direto para o Firebase.");
  }

  // --- FASE 2: REDUNDÂNCIA NO FIREBASE ---
  try {
    if ((window as any).simulateFirebaseOffline === true) {
      throw new Error("SimulatedFirebaseError: Quota exceeded (Simulado pelo painel de controle)");
    }
    console.log("[Fallback DB] Tentando salvar registro no Firebase Firestore (Fallback)...");
    const docRef = doc(db, TABLE_NAME, recordId);
    await setDoc(docRef, record);
    console.log("[Fallback DB] ✓ Registro salvo com sucesso no Firebase Firestore!");
    return { success: true, source: 'firebase', id: recordId, data: record };
  } catch (firebaseError: any) {
    console.error("[Fallback DB] ❌ Falha catastrófica: Ambos os bancos falharam ao salvar o registro.", firebaseError);
    throw new Error(`Erro ao salvar em ambos os backends. Detalhes Firebase: ${firebaseError.message || firebaseError}`);
  }
}

/**
 * 2. ATUALIZAR DADOS
 * Tenta atualizar no Supabase primeiro. Se falhar ou estiver indisponível,
 * tenta atualizar no Firebase Firestore.
 */
export async function atualizarDados(
  id: string,
  fields: Partial<Omit<AppDataRecord, 'id' | 'user_id' | 'criado_em'>>,
  sourceHint?: 'firebase' | 'supabase'
): Promise<{ success: boolean; source: 'firebase' | 'supabase' }> {
  
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
  if (supabase) {
    try {
      console.log("[Fallback DB] Tentando atualizar registro no Supabase (Principal)...");
      const { error } = await supabase
        .from(TABLE_NAME)
        .update(fields)
        .eq('id', id);

      if (error) throw new Error(error.message);

      console.log("[Fallback DB] ✓ Registro atualizado com sucesso no Supabase!");
      return { success: true, source: 'supabase' };
    } catch (supabaseError: any) {
      console.warn("[Fallback DB] ⚠️ Falha ao atualizar dados no Supabase. Acionando fallback do Firebase:", supabaseError);
    }
  }

  // --- FALLBACK AUTOMÁTICO PARA FIREBASE ---
  try {
    if ((window as any).simulateFirebaseOffline === true) {
      throw new Error("SimulatedFirebaseError: Quota exceeded (Simulado pelo painel de controle)");
    }
    console.log("[Fallback DB] Tentando atualizar registro no Firebase Firestore (Fallback)...");
    const docRef = doc(db, TABLE_NAME, id);
    await setDoc(docRef, fields, { merge: true });
    console.log("[Fallback DB] ✓ Registro atualizado com sucesso no Firebase Firestore!");
    return { success: true, source: 'firebase' };
  } catch (firebaseError: any) {
    console.error("[Fallback DB] ❌ Falha em ambos os bancos na atualização.", firebaseError);
    throw new Error(`Ambos os backends falharam ao atualizar. Detalhes Firebase: ${firebaseError.message || firebaseError}`);
  }
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
  
  if (sourceHint === 'firebase') {
    console.log("[Fallback DB] Deletando diretamente no Firebase por indicação de Hint...");
    await deleteDoc(doc(db, TABLE_NAME, id));
    return { success: true, source: 'firebase' };
  }

  let deletedInSupabase = false;
  let deletedInFirebase = false;

  // 1. Tenta Supabase primeiro (Principal)
  if (supabase) {
    try {
      console.log("[Fallback DB] Removendo registro do Supabase (Principal)...");
      const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id);
      if (!error) {
        deletedInSupabase = true;
        console.log("[Fallback DB] ✓ Registro removido do Supabase com sucesso.");
      } else {
        console.warn("[Fallback DB] Falha ao deletar no Supabase:", error.message);
      }
    } catch (err) {
      console.warn("[Fallback DB] Erro ao deletar no Supabase:", err);
    }
  }

  // 2. Tenta Firebase (seja como fallback ou para sincronização)
  try {
    if ((window as any).simulateFirebaseOffline === true) {
      throw new Error("SimulatedFirebaseError: Quota exceeded (Simulado)");
    }
    console.log("[Fallback DB] Removendo registro do Firebase Firestore (Fallback/Sincronização)...");
    await deleteDoc(doc(db, TABLE_NAME, id));
    deletedInFirebase = true;
    console.log("[Fallback DB] ✓ Registro removido do Firebase Firestore.");
  } catch (err) {
    console.warn("[Fallback DB] Erro ao tentar deletar no Firebase:", err);
  }

  if (!deletedInFirebase && !deletedInSupabase) {
    throw new Error("Falha ao deletar o registro em ambos os bancos de dados.");
  }

  return {
    success: true,
    source: (deletedInFirebase && deletedInSupabase) ? 'both' : (deletedInSupabase ? 'supabase' : 'firebase')
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
  if (supabase) {
    try {
      console.log("[Fallback DB] Buscando registros no Supabase para o usuário:", userId);
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error("[Fallback DB] Erro ao consultar Supabase:", error.message);
      } else if (data) {
        data.forEach((row: any) => {
          result.push({
            id: row.id,
            user_id: row.user_id,
            titulo: row.titulo,
            descricao: row.descricao,
            dados_json: row.dados_json,
            criado_em: row.criado_em
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
          result.push({ ...(doc.data() as AppDataRecord), id: doc.id });
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
