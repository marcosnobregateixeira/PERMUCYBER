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
 * Tenta salvar no Firebase Firestore primeiro. Se falhar ou exceder a cota, salva no Supabase.
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

  // --- FASE 1: TENTAR FIREBASE ---
  try {
    if ((window as any).simulateFirebaseOffline === true) {
      throw new Error("SimulatedFirebaseError: Quota exceeded (Simulado pelo painel de controle)");
    }
    console.log("[Fallback DB] Tentando salvar registro no Firebase Firestore...");
    const docRef = doc(db, TABLE_NAME, recordId);
    await setDoc(docRef, record);
    console.log("[Fallback DB] ✓ Registro salvo com sucesso no Firebase Firestore!");
    return { success: true, source: 'firebase', id: recordId, data: record };
  } catch (firebaseError: any) {
    console.warn("[Fallback DB] ⚠️ Falha no Firebase Firestore ao salvar dados:", firebaseError);
    
    if (isFirebaseQuotaError(firebaseError)) {
      console.warn("[Fallback DB] 🚨 Cota do Firebase Excedida! Ativando redundância automática do Supabase.");
    } else {
      console.warn("[Fallback DB] 🚨 Falha técnica no Firebase. Redirecionando para o Supabase.");
    }

    // --- FASE 2: REDUNDÂNCIA NO SUPABASE ---
    if (!supabase) {
      throw new Error(
        "Falha ao salvar no Firebase e o Supabase secundário não foi configurado ou está nulo nas variáveis de ambiente."
      );
    }

    console.log("[Fallback DB] Tentando salvar registro no Supabase...");
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
      console.error("[Fallback DB] ❌ Falha catastrófica: Ambos os bancos falharam. Erro Supabase:", error);
      throw new Error(`Erro ao salvar em ambos os backends. Detalhes Supabase: ${error.message}`);
    }

    console.log("[Fallback DB] ✓ Registro salvo com sucesso no Supabase!");
    return { success: true, source: 'supabase', id: recordId, data: data ? data[0] : record };
  }
}

/**
 * 2. ATUALIZAR DADOS
 * Tenta atualizar no Firebase Firestore. Se falhar, tenta no Supabase.
 * Podemos passar um `sourceHint` caso já saibamos onde o registro reside, para economizar requisições.
 */
export async function atualizarDados(
  id: string,
  fields: Partial<Omit<AppDataRecord, 'id' | 'user_id' | 'criado_em'>>,
  sourceHint?: 'firebase' | 'supabase'
): Promise<{ success: boolean; source: 'firebase' | 'supabase' }> {
  
  // Se houver um hint sugerindo Supabase, tentamos primeiro o Supabase
  if (sourceHint === 'supabase') {
    if (!supabase) throw new Error("Supabase não está configurado.");
    console.log("[Fallback DB] Atualizando dados diretamente no Supabase por indicação de Hint...");
    const { error } = await supabase
      .from(TABLE_NAME)
      .update(fields)
      .eq('id', id);

    if (error) throw new Error(`Erro ao atualizar no Supabase: ${error.message}`);
    return { success: true, source: 'supabase' };
  }

  // --- TENTATIVA PADRÃO: FIREBASE PRIMEIRO ---
  try {
    if ((window as any).simulateFirebaseOffline === true) {
      throw new Error("SimulatedFirebaseError: Quota exceeded (Simulado pelo painel de controle)");
    }
    console.log("[Fallback DB] Tentando atualizar registro no Firebase Firestore...");
    const docRef = doc(db, TABLE_NAME, id);
    await setDoc(docRef, fields, { merge: true });
    console.log("[Fallback DB] ✓ Registro atualizado com sucesso no Firebase Firestore!");
    return { success: true, source: 'firebase' };
  } catch (firebaseError: any) {
    console.warn("[Fallback DB] ⚠️ Falha ao atualizar dados no Firebase Firestore:", firebaseError);

    // --- FALLBACK AUTOMÁTICO PARA SUPABASE ---
    if (!supabase) {
      throw new Error("Falha no Firebase e o cliente Supabase de fallback não está configurado.");
    }

    console.log("[Fallback DB] Tentando atualizar registro no Supabase como alternativa de contingência...");
    const { error } = await supabase
      .from(TABLE_NAME)
      .update(fields)
      .eq('id', id);

    if (error) {
      console.error("[Fallback DB] ❌ Falha em ambos os bancos na atualização. Erro Supabase:", error);
      throw new Error(`Ambos os backends falharam ao atualizar. Detalhes Supabase: ${error.message}`);
    }

    console.log("[Fallback DB] ✓ Registro atualizado com sucesso no Supabase!");
    return { success: true, source: 'supabase' };
  }
}

/**
 * 3. DELETAR DADOS
 * Remove o registro de ambos os bancos ou do que responder com sucesso.
 */
export async function deletarDados(
  id: string,
  sourceHint?: 'firebase' | 'supabase'
): Promise<{ success: boolean; source: 'firebase' | 'supabase' | 'both' }> {
  
  if (sourceHint === 'supabase') {
    if (!supabase) throw new Error("Supabase não configurado.");
    console.log("[Fallback DB] Deletando diretamente no Supabase por indicação de Hint...");
    const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id);
    if (error) throw new Error(`Erro ao deletar no Supabase: ${error.message}`);
    return { success: true, source: 'supabase' };
  }

  let deletedInFirebase = false;
  let deletedInSupabase = false;

  // Tenta Firebase
  try {
    if ((window as any).simulateFirebaseOffline === true) {
      throw new Error("SimulatedFirebaseError: Quota exceeded (Simulado pelo painel de controle)");
    }
    console.log("[Fallback DB] Removendo registro do Firebase Firestore...");
    await deleteDoc(doc(db, TABLE_NAME, id));
    deletedInFirebase = true;
    console.log("[Fallback DB] ✓ Registro removido do Firebase Firestore.");
  } catch (err) {
    console.warn("[Fallback DB] Falha ao deletar no Firebase. Tentando Supabase...", err);
  }

  // Tenta Supabase se configurado
  if (supabase) {
    try {
      console.log("[Fallback DB] Removendo registro do Supabase para manter integridade...");
      const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id);
      if (!error) {
        deletedInSupabase = true;
        console.log("[Fallback DB] ✓ Registro removido do Supabase.");
      }
    } catch (err) {
      console.warn("[Fallback DB] Erro não crítico ao tentar deletar no Supabase:", err);
    }
  }

  if (!deletedInFirebase && !deletedInSupabase) {
    throw new Error("Falha ao deletar o registro em ambos os bancos de dados.");
  }

  return {
    success: true,
    source: (deletedInFirebase && deletedInSupabase) ? 'both' : (deletedInFirebase ? 'firebase' : 'supabase')
  };
}

/**
 * 4. LISTAR REGISTROS DE UM USUÁRIO
 * Tenta buscar do Firebase primeiro. Se falhar ou estiver com cota estourada,
 * consulta o Supabase e mescla os dados para garantir continuidade de uso sem interrupções.
 */
export async function listarDados(
  userId: string
): Promise<{ success: boolean; data: AppDataRecord[]; sourcesUsed: ('firebase' | 'supabase')[] }> {
  const result: AppDataRecord[] = [];
  const sourcesUsed: ('firebase' | 'supabase')[] = [];

  // --- FASE 1: OBTER DO FIREBASE ---
  try {
    if ((window as any).simulateFirebaseOffline === true) {
      throw new Error("SimulatedFirebaseError: Quota exceeded (Simulado pelo painel de controle)");
    }
    console.log("[Fallback DB] Buscando registros no Firebase Firestore para o usuário:", userId);
    const q = query(collection(db, TABLE_NAME), where('user_id', '==', userId));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      result.push({ ...(doc.data() as AppDataRecord), id: doc.id });
    });
    sourcesUsed.push('firebase');
    console.log(`[Fallback DB] ✓ ${result.length} registros obtidos do Firebase.`);
  } catch (firebaseError: any) {
    console.warn("[Fallback DB] ⚠️ Falha ao ler dados do Firebase Firestore:", firebaseError);
  }

  // --- FASE 2: OBTER DO SUPABASE (Sempre que o Firebase falhar ou se quisermos garantir dados completos)
  // Caso o Firebase tenha falhado ou retornado vazio mas o Supabase tenha sido configurado, consultamos ele.
  if (supabase && (sourcesUsed.length === 0 || result.length === 0)) {
    try {
      console.log("[Fallback DB] Consultando dados no Supabase para contingência...");
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error("[Fallback DB] Erro ao consultar Supabase:", error.message);
      } else if (data) {
        data.forEach((row: any) => {
          // Evitar duplicados caso já tivéssemos trazido do Firebase
          if (!result.some(r => r.id === row.id)) {
            result.push({
              id: row.id,
              user_id: row.user_id,
              titulo: row.titulo,
              descricao: row.descricao,
              dados_json: row.dados_json,
              criado_em: row.criado_em
            });
          }
        });
        sourcesUsed.push('supabase');
        console.log(`[Fallback DB] ✓ ${data.length} registros carregados do Supabase.`);
      }
    } catch (err) {
      console.error("[Fallback DB] Erro catastrófico ao ler do Supabase:", err);
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
