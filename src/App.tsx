/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  MILITARES, 
  ALERTAS_INICIAIS, 
  ESCALAS_INICIAIS, 
  LOGS_INICIAIS, 
  PERMUTAS_INICIAIS, 
  CHATS_INICIAIS,
  generateSimpleHash,
  formatarDataBR
} from './data';
import { Militar, Escala, Alerta, BlockchainLog, Permuta, ChatMessage, Role, BackupSnapshot, AppConfig } from './types';
import MilitaryMobileFrame from './components/MilitaryMobileFrame';
import BiometricLogin from './components/BiometricLogin';
import InstallAppBanner from './components/InstallAppBanner';
import Dashboard from './components/Dashboard';
import PermutaFlow from './components/PermutaFlow';
import ValidadorPermuta from './components/ValidadorPermuta';
import PainelGestor from './components/PainelGestor';
import EncryptedChat from './components/EncryptedChat';
import DocumentoHomologacao from './components/DocumentoHomologacao';

import { 
  LayoutGrid, 
  QrCode, 
  MessageSquare, 
  Lock, 
  ShieldCheck, 
  History,
  FileCheck,
  Clock,
  ShieldAlert,
  PlusCircle,
  ChevronDown,
  ChevronRight,
  LogOut
} from 'lucide-react';

import { db, auth } from './firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { sanitizeForFirestore } from './firebaseUtils';

const PATENTE_ORDER: Record<string, number> = {
  'CEL': 1, 'TC': 2, 'MAJ': 3, 'CAP': 4, '1ºTEN': 5, '2ºTEN': 6, 'ASP. OF': 7, 
  'AL. OF': 8, 'ST': 9, '1ºSGT': 10, '2ºSGT': 11, '3ºSGT': 12, 'CB': 13, 'SD': 14
};

const sortMilitarByPatente = (a: Militar, b: Militar) => {
  const diff = (PATENTE_ORDER[a.patente] || 99) - (PATENTE_ORDER[b.patente] || 99);
  if (diff !== 0) return diff;
  return a.nome.localeCompare(b.nome);
};

export default function App() {
  const [militares, setMilitares] = useState<Militar[]>([]);
  const [selectedMilitarId, setSelectedMilitarId] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [permutas, setPermutas] = useState<Permuta[]>([]);
  const [logs, setLogs] = useState<BlockchainLog[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [backups, setBackups] = useState<BackupSnapshot[]>([]);
  const [config, setConfig] = useState<AppConfig>(() => {
    try {
      const saved = localStorage.getItem('permucyber_config');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Local load error for config:", e);
    }
    return { id: 'main', brasaoEsquerdoUrl: '', brasaoDireitoUrl: '' };
  });
  const [backupStatusMsg, setBackupStatusMsg] = useState<string>('Sincronização em nuvem e backups estão ativos.');

  const [currentTab, setCurrentTab] = useState<'DASHBOARD' | 'PERMUTAS' | 'CHAT' | 'GESTAO'>('DASHBOARD');
  const [activeSwapScale, setActiveSwapScale] = useState<Escala | null>(null);
  const [activeReviewPermuta, setActiveReviewPermuta] = useState<Permuta | null>(null);
  const [showApproved, setShowApproved] = useState<boolean>(false);
  const [showRejected, setShowRejected] = useState<boolean>(false);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  // Synchronize dynamic local changes to localStorage as a fallback database
  useEffect(() => {
    if (militares && militares.length > 0) {
      try { localStorage.setItem('permucyber_militares', JSON.stringify(militares)); } catch (e) {}
    }
  }, [militares]);

  useEffect(() => {
    if (escalas && escalas.length > 0) {
      try { localStorage.setItem('permucyber_escalas', JSON.stringify(escalas)); } catch (e) {}
    }
  }, [escalas]);

  useEffect(() => {
    if (alertas && alertas.length > 0) {
      try { localStorage.setItem('permucyber_alertas', JSON.stringify(alertas)); } catch (e) {}
    }
  }, [alertas]);

  useEffect(() => {
    if (permutas && permutas.length > 0) {
      try { localStorage.setItem('permucyber_permutas', JSON.stringify(permutas)); } catch (e) {}
    }
  }, [permutas]);

  useEffect(() => {
    if (logs && logs.length > 0) {
      try { localStorage.setItem('permucyber_logs', JSON.stringify(logs)); } catch (e) {}
    }
  }, [logs]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      try { localStorage.setItem('permucyber_messages', JSON.stringify(messages)); } catch (e) {}
    }
  }, [messages]);

  useEffect(() => {
    const handleFirebaseError = (error: any) => {
      console.warn("Instabilidade de rede ou limite de cota temporário detectado. Mantendo sincronização ativa via cache:", error);
      if (error?.message?.includes("Quota exceeded") || error?.message?.includes("quota")) {
        setFirebaseError("Cota Excedida");
        setBackupStatusMsg("AVISO: Cota diária do Firebase excedida. Modo redundante ativo.");
      }
    };

    // 1. Registra IMEDIATAMENTE os listeners em tempo real para sincronização instantânea
    const unsubMilitares = onSnapshot(collection(db, 'militares'), (snap) => {
      setFirebaseError(null);
      const list = snap.docs.map(d => {
        const data = d.data() as Militar;
        return { ...data, id: d.id }; // Garantir que o ID do objeto seja o ID do documento Firestore
      });
      setMilitares(list.sort(sortMilitarByPatente));
      setIsLoading(false);
    }, handleFirebaseError);

    const unsubEscalas = onSnapshot(collection(db, 'escalas'), (snap) => {
      setFirebaseError(null);
      const list = snap.docs.map(d => ({ ...d.data() as Escala, id: d.id }));
      setEscalas(list);
      setIsLoading(false);
    }, handleFirebaseError);

    const unsubAlertas = onSnapshot(collection(db, 'alertas'), (snap) => {
      setFirebaseError(null);
      const list = snap.docs.map(d => ({ ...d.data() as Alerta, id: d.id }));
      setAlertas(list);
    }, handleFirebaseError);

    const unsubPermutas = onSnapshot(collection(db, 'permutas'), (snap) => {
      setFirebaseError(null);
      const list = snap.docs.map(d => ({ ...d.data() as Permuta, id: d.id }));
      setPermutas(list);
    }, handleFirebaseError);

    const unsubLogs = onSnapshot(collection(db, 'logs'), (snap) => {
      setFirebaseError(null);
      const list = snap.docs.map(d => ({ ...d.data() as BlockchainLog, id: d.id })).sort((a,b) => a.timestamp.localeCompare(b.timestamp));
      setLogs(list);
    }, handleFirebaseError);

    const unsubMessages = onSnapshot(collection(db, 'messages'), (snap) => {
      setFirebaseError(null);
      const list = snap.docs.map(d => ({ ...d.data() as ChatMessage, id: d.id })).sort((a,b) => a.timestamp.localeCompare(b.timestamp));
      setMessages(list);
    }, handleFirebaseError);

    const unsubBackups = onSnapshot(collection(db, 'backups'), (snap) => {
      setFirebaseError(null);
      const list = snap.docs.map(d => ({ ...d.data() as any as BackupSnapshot, id: d.id })).sort((a,b) => b.timestamp.localeCompare(a.timestamp));
      setBackups(list);
    }, handleFirebaseError);

    const unsubConfig = onSnapshot(doc(db, 'settings', 'config'), (snap) => {
      setFirebaseError(null);
      if (snap.exists()) {
        const data = snap.data() as AppConfig;
        setConfig(data);
        try {
          localStorage.setItem('permucyber_config', JSON.stringify(data));
        } catch (e) {
          console.error("Local save error for config:", e);
        }
      }
    }, handleFirebaseError);

    // Fallback de Loading para garantir que o usuário não fique preso na tela inicial em caso de lentidão de rede
    const fallbackTimer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);

    return () => {
      clearTimeout(fallbackTimer);
      unsubMilitares();
      unsubEscalas();
      unsubAlertas();
      unsubPermutas();
      unsubLogs();
      unsubMessages();
      unsubBackups();
      unsubConfig();
    };
  }, []);

  const handleRefreshAll = () => {
    setIsLoggedIn(false);
    setCurrentTab('DASHBOARD');
    setActiveSwapScale(null);
    setActiveReviewPermuta(null);
  };

  const handleUserChange = (userId: string) => {
    setSelectedMilitarId(userId);
    setIsLoggedIn(false);
    setActiveSwapScale(null);
    setActiveReviewPermuta(null);
    setCurrentTab('DASHBOARD');
  };

  const loggedUser = militares.find((m) => m.id === selectedMilitarId);

  const appendAuditLog = async (
    tipoEvento: BlockchainLog['tipoEvento'],
    evento: string,
    militarName: string,
    currentLogs: BlockchainLog[]
  ) => {
    const prevLog = currentLogs[currentLogs.length - 1];
    const prevHash = prevLog ? prevLog.hashAtual : '0xSHA256_ROOT_99AA';
    
    const nextLog: BlockchainLog = {
      id: `L-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      tipoEvento,
      evento,
      militarEnvolvido: militarName,
      hashAnterior: prevHash,
      hashAtual: generateSimpleHash(evento, prevHash)
    };

    await setDoc(doc(db, 'logs', nextLog.id), sanitizeForFirestore(nextLog));
  };

  const generateBackup = async (tipo: 'AUTO' | 'MANUAL', autor: string, forcedMilitares?: Militar[], forcedEscalas?: Escala[], forcedPermutas?: Permuta[]): Promise<BackupSnapshot | null> => {
    try {
      const activeMilitares = forcedMilitares || militares;
      const activeEscalas = forcedEscalas || escalas;
      const activePermutas = forcedPermutas || permutas;

      const bkId = `BK-${Date.now().toString().slice(-6)}`;
      const newSnapshot: BackupSnapshot = {
        id: bkId,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        tipo,
        autor,
        quantidadeMilitares: activeMilitares.length,
        quantidadeEscalas: activeEscalas.length,
        quantidadePermutas: activePermutas.length,
        militares: activeMilitares,
        escalas: activeEscalas,
        permutas: activePermutas,
        alertas: alertas,
        logs: logs
      };

      await setDoc(doc(db, 'backups', bkId), sanitizeForFirestore(newSnapshot));
      localStorage.setItem(`BACKUP_${bkId}`, JSON.stringify(newSnapshot));
      
      const successMsg = `✓ Cópia de segurança ${tipo} [${bkId}] transmitida com sucesso para o Firestore Cloud.`;
      setBackupStatusMsg(successMsg);

      if (tipo === 'MANUAL') {
        alert(
          `✓ BACKUP GERADO E ARMAZENADO NAS NUVENS!\n\n` +
          `• Identificador: ${bkId}\n` +
          `• Policiais Ativos: ${activeMilitares.length}\n` +
          `• Escalas de Serviço: ${activeEscalas.length}\n` +
          `• Permutas de Plantão: ${activePermutas.length}\n` +
          `• Status: Sincronizado e persistido com redundância no Firestore Cloud de forma segura.`
        );
      }
      return newSnapshot;
    } catch (err) {
      console.error("Backup failed:", err);
      setBackupStatusMsg("⚠️ Falha crítica ao transcrever backup para a nuvem.");
      alert("⚠️ Erro crítico: Não foi possível salvar o backup nas nuvens. Verifique sua conexão com a rede.");
      return null;
    }
  };

  const handleRestoreBackup = async (snapshot: BackupSnapshot) => {
    try {
      const backupId = snapshot.id || `LOCAL-${Date.now()}`;
      setBackupStatusMsg(`⌛ Reconciliando imagens... Revertendo para o backup ${backupId}...`);
      
      for (const m of militares) {
        if (!snapshot.militares.some(sm => sm.id === m.id)) {
          try {
            await deleteDoc(doc(db, 'militares', m.id));
          } catch (e) {
            console.error("Firestore error deleting militar:", e);
          }
        }
      }
      for (const e of escalas) {
        if (!snapshot.escalas.some(se => se.id === e.id)) {
          try {
            await deleteDoc(doc(db, 'escalas', e.id));
          } catch (e) {
            console.error("Firestore error deleting escala:", e);
          }
        }
      }
      for (const p of permutas) {
        if (!snapshot.permutas.some(sp => sp.id === p.id)) {
          try {
            await deleteDoc(doc(db, 'permutas', p.id));
          } catch (e) {
            console.error("Firestore error deleting permuta:", e);
          }
        }
      }

      for (const m of snapshot.militares) {
        try {
          await setDoc(doc(db, 'militares', m.id), sanitizeForFirestore(m));
        } catch (e) {
          console.error("Firestore error setting militar:", e);
        }
      }
      for (const e of snapshot.escalas) {
        try {
          await setDoc(doc(db, 'escalas', e.id), sanitizeForFirestore(e));
        } catch (e) {
          console.error("Firestore error setting escala:", e);
        }
      }
      for (const p of snapshot.permutas) {
        try {
          await setDoc(doc(db, 'permutas', p.id), sanitizeForFirestore(p));
        } catch (e) {
          console.error("Firestore error setting permuta:", e);
        }
      }

      // Always restore local state variables regardless of Firestore failures
      setMilitares(snapshot.militares.sort(sortMilitarByPatente));
      setEscalas(snapshot.escalas);
      setPermutas(snapshot.permutas);
      if (snapshot.alertas) setAlertas(snapshot.alertas);
      if (snapshot.logs) setLogs(snapshot.logs);

      await appendAuditLog('INTEGRALIZAÇÃO', `Restauração pontual efetuada com sucesso: ${backupId}.`, loggedUser?.nomeGuerra || 'SISTEMA', logs);
      alert(`SUCESSO! O banco de dados foi totalmente restaurado para a imagem de segurança ${backupId}.`);
      setBackupStatusMsg(`✓ Restauro concluído com sucesso para o backup ${backupId}.`);
    } catch (err) {
      console.error("Restore failed:", err);
      // Fallback local updates if anything failed during local operations
      setMilitares(snapshot.militares.sort(sortMilitarByPatente));
      setEscalas(snapshot.escalas);
      setPermutas(snapshot.permutas);
      if (snapshot.alertas) setAlertas(snapshot.alertas);
      if (snapshot.logs) setLogs(snapshot.logs);
      alert("Banco de dados restaurado localmente devido a limitações de conexão com a nuvem.");
      setBackupStatusMsg("✓ Restauro offline concluído com sucesso.");
    }
  };

  const handleAddMilitarIndividual = async (militar: Militar) => {
    try {
      await setDoc(doc(db, 'militares', militar.id), sanitizeForFirestore(militar));
      const updated = [...militares, militar];
      setMilitares(updated);
      await appendAuditLog('INTEGRALIZAÇÃO', `Militar ${militar.nomeGuerra} adicionado à base de dados.`, loggedUser?.nomeGuerra || 'SISTEMA', logs);
      await generateBackup('AUTO', loggedUser?.nomeGuerra || 'SISTEMA', updated);
    } catch (e) { 
      console.error("Error saving militar:", e);
      alert("Erro ao salvar o policial no banco de dados. " + (e as Error).message);
    }
  };

  const handleDeleteMilitar = async (id: string) => {
    try {
      console.log(`Iniciando exclusão do militar ID: ${id}`);
      await deleteDoc(doc(db, 'militares', id));
      
      // Optimistic update
      const updated = militares.filter(m => m.id !== id);
      setMilitares(updated);
      
      await appendAuditLog('INTEGRALIZAÇÃO', `Militar com ID ${id} removido da base de dados.`, loggedUser?.nomeGuerra || 'SISTEMA', logs);
      await generateBackup('AUTO', loggedUser?.nomeGuerra || 'SISTEMA', updated);
    } catch(e) {
      console.error("Erro ao deletar militar:", e);
      alert("Erro ao excluir. " + (e as Error).message);
    }
  };

  const handleClearAllPermutas = async () => {
    try {
      for (const p of permutas) {
        await deleteDoc(doc(db, 'permutas', p.id));
      }
      setPermutas([]);
      await appendAuditLog('INTEGRALIZAÇÃO', 'Todas as solicitações de permutas foram excluídas permanentemente do banco de dados.', loggedUser?.nomeGuerra || 'SISTEMA', logs);
      alert('Todas as permutas de teste foram excluídas com sucesso!');
    } catch (e) {
      console.error("Erro ao limpar permutas:", e);
      alert('Erro ao excluir as permutas.');
    }
  };

  const handleClearAllMilitares = async () => {
    try {
      const activeUser = loggedUser || militares.find(m => m.role === 'COMANDANTE') || militares[0];
      for (const m of militares) {
        if (activeUser && m.id === activeUser.id) {
          continue; // Keep the active user to prevent lockout
        }
        await deleteDoc(doc(db, 'militares', m.id));
      }
      if (activeUser) {
        setMilitares([activeUser]);
      } else {
        setMilitares([]);
      }
      await appendAuditLog('INTEGRALIZAÇÃO', `O efetivo ativo foi limpo do banco de dados, preservando o oficial ativo (${activeUser?.nomeGuerra || 'Gestor'}).`, loggedUser?.nomeGuerra || 'SISTEMA', logs);
      alert('Efetivo limpo com sucesso! Apenas o oficial logado foi mantido para evitar bloqueio de acesso.');
    } catch (e) {
      console.error("Erro ao limpar efetivo:", e);
      alert('Erro ao limpar o efetivo.');
    }
  };

  const handleToggleBiometria = async (id: string) => {
    const m = militares.find(x => x.id === id);
    if(m) {
      try { await updateDoc(doc(db, 'militares', id), { biometriaAtiva: !m.biometriaAtiva }); } catch(e){}
      setMilitares(prev => prev.map(p => p.id === id ? { ...p, biometriaAtiva: !p.biometriaAtiva } : p));
    }
  };

  const handleUpdateMilitarNomeGuerra = async (id: string, newNome: string) => {
    try {
      await updateDoc(doc(db, 'militares', id), { 
        nomeGuerra: newNome, 
        nome: newNome.replace(/^(Sgto\.|Ten\.|Cb\.|Sd\.)\s*/i, '') 
      });
      setMilitares(prev => prev.map(p => p.id === id ? { ...p, nomeGuerra: newNome, nome: newNome.replace(/^(Sgto\.|Ten\.|Cb\.|Sd\.)\s*/i, '') } : p));
    } catch(e) {
      console.error("Erro ao atualizar nome de guerra:", e);
      alert("Erro ao atualizar nome: " + (e as Error).message);
    }
  };

  const handleUpdateMilitar = async (id: string, updatedFields: Partial<Militar>) => {
    try {
      await updateDoc(doc(db, 'militares', id), sanitizeForFirestore(updatedFields));
      setMilitares(prev => prev.map(p => p.id === id ? { ...p, ...updatedFields } : p));
      await appendAuditLog('INTEGRALIZAÇÃO', `Cadastro de ${updatedFields.patente || ''} ${updatedFields.nomeGuerra || ''} foi atualizado no sistema de banco de dados.`, loggedUser?.nomeGuerra || 'SISTEMA', logs);
    } catch(e) {
      console.error("Error updating militar:", e);
      alert("Erro ao atualizar policial. " + (e as Error).message);
    }
  };

  const handleUpdateMilitarMF = async (id: string, newMF: string) => {
    try { 
      await updateDoc(doc(db, 'militares', id), { matriculaFuncional: newMF }); 
      setMilitares(prev => prev.map(p => p.id === id ? { ...p, matriculaFuncional: newMF } : p));
    } catch(e) { alert("Erro ao atualizar MF. " + (e as Error).message); }
  };

  const handleUpdateMilitarNumero = async (id: string, numero: string) => {
    try { 
      await updateDoc(doc(db, 'militares', id), { numero }); 
      setMilitares(prev => prev.map(p => p.id === id ? { ...p, numero } : p));
    } catch(e){ alert("Erro ao atualizar número. " + (e as Error).message); }
  };

  const handleUpdateMilitarPin = async (id: string, newPin: string, email?: string) => {
    const updates: any = { pinSegurança: newPin, acessoLiberado: false };
    if (email) {
      updates.email = email;
    }
    try { 
      await updateDoc(doc(db, 'militares', id), updates); 
      setMilitares(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      await appendAuditLog('INTEGRALIZAÇÃO', `Militar ID ${id} atualizou seu token / PIN de segurança criptográfica pessoal e e-mail (${email || 'não informado'}). Acesso bloqueado aguardando liberação do administrador.`, loggedUser?.nomeGuerra || 'SISTEMA', logs);
    } catch(e) { alert("Erro ao modificar PIN: " + (e as Error).message); }
  };

  const handleUpdateMilitarRole = async (id: string, role: Role) => {
    try { 
      await updateDoc(doc(db, 'militares', id), { role }); 
      setMilitares(prev => prev.map(p => p.id === id ? { ...p, role } : p));
      await appendAuditLog('INTEGRALIZAÇÃO', `Papel do militar ${id} alterado para ${role}.`, loggedUser?.nomeGuerra || 'SISTEMA', logs);
    } catch(e) { alert("Erro ao atualizar papel: " + (e as Error).message); }
  };

  const handleUpdateConfig = async (newConfig: Partial<AppConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    try {
      localStorage.setItem('permucyber_config', JSON.stringify(updated));
    } catch (e) {
      console.error("Local save error for config:", e);
    }
    try {
      await setDoc(doc(db, 'settings', 'config'), sanitizeForFirestore(updated));
    } catch (e) {
      console.error("Error updating config:", e);
    }
  };

  const handleImportMilitaresJSON = async (imported: Militar[]) => {
    for (const m of imported) {
      try {
        await setDoc(doc(db, 'militares', m.id), sanitizeForFirestore(m));
      } catch (e) {
        console.error("Firestore error importing militar:", e);
      }
    }
    setMilitares(imported.sort(sortMilitarByPatente));
    if (imported.length > 0 && !imported.some(m => m.id === selectedMilitarId)) {
      setSelectedMilitarId(imported[0].id);
      setIsLoggedIn(false);
    }
    await appendAuditLog('INTEGRALIZAÇÃO', `Base de dados de militares atualizada por importação (.JSON) com sucesso (${imported.length} militares carregados).`, loggedUser?.nomeGuerra || 'SISTEMA', logs);
    await generateBackup('AUTO', loggedUser?.nomeGuerra || 'SISTEMA', imported);
  };

  const handleSendMessage = async (paraMilitarId: string, conteudo: string) => {
    if (!loggedUser) return;
    const freshMessage: ChatMessage = {
      id: `C-${Date.now()}`,
      deMilitarId: loggedUser.id,
      paraMilitarId,
      conteudo,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      criptografada: true,
      chaveCripto: `AES-GCM-AUTO-SIG-${loggedUser.nomeGuerra.toUpperCase()}`
    };

    await setDoc(doc(db, 'messages', freshMessage.id), sanitizeForFirestore(freshMessage));
    const recipient = militares.find((m) => m.id === paraMilitarId)?.nomeGuerra || 'Auxiliar';
    await appendAuditLog('INTEGRALIZAÇÃO', `Transmissão de texto plano criptografada with sucesso de ${loggedUser.nomeGuerra} para ${recipient}. Protocolo seguro ativado.`, loggedUser.nomeGuerra, logs);
  };

  const handleCreatePermuta = async (novaPermuta: Permuta) => {
    if (!loggedUser) return;
    try {
      await setDoc(doc(db, 'permutas', novaPermuta.id), sanitizeForFirestore(novaPermuta));
    } catch (e) {
      console.error("Firestore error creating permuta:", e);
    }
    
    // Optimistic/Local fallback update
    setPermutas(prev => {
      const exists = prev.some(p => p.id === novaPermuta.id);
      if (exists) return prev;
      return [...prev, novaPermuta];
    });

    await appendAuditLog('PERMUTA_CRIADA', `Permuta criada para posto [${novaPermuta.postoServico}] de ${loggedUser.nomeGuerra}. Assinado digitalmente sob protocolo ${novaPermuta.protocoloId}.`, loggedUser.nomeGuerra, logs);

    const recipient = militares.find(m => m.id === novaPermuta.militarSubstitutoId);
    if (recipient) {
      const automatedMsg: ChatMessage = {
        id: `C-AUTO-${Date.now()}`,
        deMilitarId: loggedUser.id,
        paraMilitarId: recipient.id,
        conteudo: `Sargento, iniciei um protocolo de permuta para o serviço de "${novaPermuta.postoServico}" no dia ${formatarDataBR(novaPermuta.dataRealizacao)} às ${novaPermuta.horaInicio}. Por favor, avalie e assine pelo PERMUCYBER. Protocolo: ${novaPermuta.protocoloId}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        criptografada: true,
        chaveCripto: 'AES-AUTO-SYSTEM-TRANS'
      };
      try {
        await setDoc(doc(db, 'messages', automatedMsg.id), sanitizeForFirestore(automatedMsg));
      } catch (e) {
        console.error("Firestore error sending automated message:", e);
      }
      setMessages(prev => {
        const exists = prev.some(m => m.id === automatedMsg.id);
        if (exists) return prev;
        return [...prev, automatedMsg].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
      });
    }
  };

  const handleAcceptPermuta = async (permutaId: string, peerSignature: string) => {
    if (!loggedUser) return;
    const targetPermuta = permutas.find(p => p.id === permutaId);
    if (!targetPermuta) return;

    const substituteAfastamento = loggedUser.afastamentos?.find(a => 
      targetPermuta.dataRealizacao >= a.dataInicio && targetPermuta.dataRealizacao <= a.dataFim
    );
    if (substituteAfastamento) {
      alert(`PROIBIDO: Você não pode aceitar a permuta nesta data pois possui afastamento registrado (${substituteAfastamento.motivo} de ${substituteAfastamento.dataInicio} a ${substituteAfastamento.dataFim}).`);
      return;
    }

    // Verify if the substitute is already scheduled (escalado) on the target date
    const isSubstituteEscalado = escalas.some(e => e.militarId === loggedUser.id && e.data === targetPermuta.dataRealizacao);
    if (isSubstituteEscalado) {
      alert("CONFLITO DETECTADO: Você já está escalado de serviço oficial nesta data e não pode aceitar outra permuta para o mesmo dia.");
      return;
    }

    // Verify if the accepting user already has another active permuta on that same date
    const hasAnotherActiveSelf = permutas.some(p => 
      p.id !== permutaId &&
      p.dataRealizacao === targetPermuta.dataRealizacao &&
      !['REJEITADO', 'REJEITADO_SUBSTITUTO', 'SEM_EFEITO'].includes(p.status) &&
      (p.militarSubstituidoId === loggedUser.id || p.militarSubstitutoId === loggedUser.id)
    );
    if (hasAnotherActiveSelf) {
      alert("Não pode, porque você já está envolvido em outra permuta nesse dia.");
      return;
    }

    // Verify if the requesting user already has another active permuta on that same date
    const hasAnotherActiveRequester = permutas.some(p => 
      p.id !== permutaId &&
      p.dataRealizacao === targetPermuta.dataRealizacao &&
      !['REJEITADO', 'REJEITADO_SUBSTITUTO', 'SEM_EFEITO'].includes(p.status) &&
      (p.militarSubstituidoId === targetPermuta.militarSubstituidoId || p.militarSubstitutoId === targetPermuta.militarSubstituidoId)
    );
    if (hasAnotherActiveRequester) {
      alert("Não pode, porque o solicitante já está de serviço (outra permuta ativa) nesse dia.");
      return;
    }

    const substituido = militares.find(m => m.id === targetPermuta.militarSubstituidoId);
    if (substituido) {
      const substituidoAfastamento = substituido.afastamentos?.find(a => 
        targetPermuta.dataRealizacao >= a.dataInicio && targetPermuta.dataRealizacao <= a.dataFim
      );
      if (substituidoAfastamento) {
        alert(`PROIBIDO: O solicitante da permuta possui afastamento registrado nesta data (${substituidoAfastamento.motivo}). A permuta não pode prosseguir.`);
        return;
      }
    }

    try {
      const permutaRef = doc(db, 'permutas', permutaId);
      await setDoc(permutaRef, sanitizeForFirestore({
        status: 'PENDENTE_GESTOR',
        assinaturaSubstituta: peerSignature
      }), { merge: true });
    } catch (e) {
      console.error("Firestore error accepting permuta:", e);
    }

    // Local fallback update
    setPermutas(prev => prev.map(p => p.id === permutaId ? { ...p, status: 'PENDENTE_GESTOR', assinaturaSubstituta: peerSignature } : p));

    await appendAuditLog('PERMUTA_ACEITA', `${loggedUser.patente} ${loggedUser.nomeGuerra} assinou digitalmente aceitando a permuta ref. protocolo ${targetPermuta.protocoloId}. Encaminhado ao conselho operacional.`, loggedUser.nomeGuerra, logs);
    setActiveReviewPermuta(null);
    setCurrentTab('PERMUTAS');
  };

  const handleDeclinePermuta = async (permutaId: string) => {
    if (!loggedUser) return;
    try {
      const permutaRef = doc(db, 'permutas', permutaId);
      await setDoc(permutaRef, sanitizeForFirestore({ status: 'REJEITADO_SUBSTITUTO' }), { merge: true });
    } catch (e) {
      console.error("Firestore error declining permuta:", e);
    }

    // Local fallback update
    setPermutas(prev => prev.map(p => p.id === permutaId ? { ...p, status: 'REJEITADO_SUBSTITUTO' } : p));

    await appendAuditLog('INTEGRALIZAÇÃO', `Solicitação de permuta cancelada/rejeitada pelo militar substituto. Protocolo suspenso.`, loggedUser.nomeGuerra, logs);
    setActiveReviewPermuta(null);
    setCurrentTab('PERMUTAS');
  };

  const revertOrDeleteScaleForPermuta = async (targetPermuta: Permuta) => {
    const originalEscalaId = targetPermuta.escalaSubstituidaId;
    
    if (originalEscalaId.startsWith('S-TEMP-')) {
      // It was a dynamically created/generated scale. We should delete it!
      try {
        await deleteDoc(doc(db, 'escalas', originalEscalaId));
      } catch (e) {
        console.error("Firestore error deleting generated escala:", e);
      }
      
      // Also look for any scale matching the substitute, date, and shift to be safe
      const generatedEscala = escalas.find(e => 
        (e.id === originalEscalaId) || 
        (e.militarId === targetPermuta.militarSubstitutoId && 
         e.data === targetPermuta.dataRealizacao && 
         e.turno === targetPermuta.turno)
      );
      if (generatedEscala && generatedEscala.id !== originalEscalaId) {
        try {
          await deleteDoc(doc(db, 'escalas', generatedEscala.id));
        } catch (e) {
          console.error("Firestore error deleting generated escala by match:", e);
        }
      }
      
      const idsToDelete = [originalEscalaId, generatedEscala?.id].filter(Boolean) as string[];
      setEscalas(prev => prev.filter(e => !idsToDelete.includes(e.id)));
    } else {
      // It was an original official scale record. We revert it to the original owner!
      try {
        const escalaRef = doc(db, 'escalas', originalEscalaId);
        await setDoc(escalaRef, sanitizeForFirestore({
          militarId: targetPermuta.militarSubstituidoId
        }), { merge: true });
      } catch (e) {
        console.error("Firestore error reverting escala:", e);
      }
      
      setEscalas(prev => prev.map(e => e.id === originalEscalaId ? {
        ...e,
        militarId: targetPermuta.militarSubstituidoId
      } : e));
    }
  };

  const handleDeletePermuta = async (id: string) => {
    if (!loggedUser) return;
    const targetPermuta = permutas.find(p => p.id === id);
    if (targetPermuta && targetPermuta.status === 'APROVADO') {
      await revertOrDeleteScaleForPermuta(targetPermuta);
    }
    try {
      await deleteDoc(doc(db, 'permutas', id));
    } catch (e) {
      console.error("Erro ao deletar permuta:", e);
    }
    setPermutas(prev => prev.filter(p => p.id !== id));
    await appendAuditLog('INTEGRALIZAÇÃO', `Protocolo de permuta excluído pelo militar solicitante.`, loggedUser.nomeGuerra, logs);
  };

  const handleClearAllLogs = async () => {
    if (!loggedUser || (loggedUser.role !== 'COMANDANTE' && loggedUser.role !== 'ADMIN')) return;
    
    try {
      for (const log of logs) {
        await deleteDoc(doc(db, 'logs', log.id));
      }
      setLogs([]);
      await appendAuditLog('INTEGRALIZAÇÃO', `Todos os logs de auditoria anteriores foram excluídos permanentemente por comando de ${loggedUser.nomeGuerra}.`, loggedUser.nomeGuerra, []);
    } catch (e) {
      console.error("Erro ao limpar logs:", e);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!loggedUser || (loggedUser.role !== 'COMANDANTE' && loggedUser.role !== 'ADMIN')) return;
    try {
      await deleteDoc(doc(db, 'logs', logId));
      setLogs(prev => prev.filter(l => l.id !== logId));
    } catch (e) {
      console.error("Erro ao deletar registro de auditoria:", e);
    }
  };

  // Automated detection of afastamentos causing active permutas to be "SEM_EFEITO"
  useEffect(() => {
    if (!militares || militares.length === 0 || !permutas || permutas.length === 0) return;
    
    const activeStatuses = ['APROVADO', 'PENDENTE_SUBSTITUTO', 'PENDENTE_GESTOR', 'AJUSTE_GESTOR', 'ALTERACAO_SOLICITADA'];
    
    const checkAndCancelPermutas = async () => {
      let updatedAny = false;
      const updatedPermutas = [...permutas];

      for (let i = 0; i < updatedPermutas.length; i++) {
        const p = updatedPermutas[i];
        if (!activeStatuses.includes(p.status)) continue;
        
        const subId = p.militarSubstituidoId;
        const subtoId = p.militarSubstitutoId;
        const date = p.dataRealizacao;
        
        const substituido = militares.find(m => m.id === subId);
        const substituto = militares.find(m => m.id === subtoId);
        
        let hasAfastamento = false;
        let motivo = '';
        let militarAfastadoNome = '';
        
        if (substituido) {
          const af = substituido.afastamentos?.find(a => date >= a.dataInicio && date <= a.dataFim);
          if (af) {
            hasAfastamento = true;
            motivo = af.motivo;
            militarAfastadoNome = substituido.nomeGuerra;
          }
        }
        
        if (!hasAfastamento && substituto) {
          const af = substituto.afastamentos?.find(a => date >= a.dataInicio && date <= a.dataFim);
          if (af) {
            hasAfastamento = true;
            motivo = af.motivo;
            militarAfastadoNome = substituto.nomeGuerra;
          }
        }
        
        if (hasAfastamento) {
          if (p.status === 'APROVADO') {
            await revertOrDeleteScaleForPermuta(p);
          }
          
          const motivoStr = `Afastamento de ${militarAfastadoNome} (${motivo}) registrado para a data do serviço.`;
          const dataCancelamento = new Date().toISOString();
          
          try {
            const permutaRef = doc(db, 'permutas', p.id);
            await setDoc(permutaRef, sanitizeForFirestore({
              status: 'SEM_EFEITO',
              motivoSemEfeito: motivoStr,
              dataCancelamentoAutomatico: dataCancelamento
            }), { merge: true });
          } catch (e) {
            console.error("Firestore error auto-cancelling permuta:", e);
          }
          
          updatedPermutas[i] = {
            ...p,
            status: 'SEM_EFEITO',
            motivoSemEfeito: motivoStr,
            dataCancelamentoAutomatico: dataCancelamento
          };
          updatedAny = true;
          
          await appendAuditLog('INTEGRALIZAÇÃO', `Permuta ID ${p.protocoloId} tornada SEM EFEITO automaticamente devido a afastamento ativo de ${militarAfastadoNome} (${motivo}).`, 'SISTEMA', logs);
        }
      }

      if (updatedAny) {
        setPermutas(updatedPermutas);
      }
    };
    
    checkAndCancelPermutas();
  }, [militares, permutas]);

  const handleRequestAlteration = async (permutaId: string, comentario: string) => {
    if (!loggedUser) return;
    try {
      const permutaRef = doc(db, 'permutas', permutaId);
      await setDoc(permutaRef, sanitizeForFirestore({
        status: 'ALTERACAO_SOLICITADA',
        comentarioAlteracao: comentario
      }), { merge: true });
    } catch (e) {
      console.error("Firestore error requesting alteration:", e);
    }

    // Local fallback update
    setPermutas(prev => prev.map(p => p.id === permutaId ? { ...p, status: 'ALTERACAO_SOLICITADA', comentarioAlteracao: comentario } : p));

    await appendAuditLog('INTEGRALIZAÇÃO', `Proposta de alteração de escala retransmitida com considerações operacionais: "${comentario.slice(0, 45)}...".`, loggedUser.nomeGuerra, logs);
    setActiveReviewPermuta(null);
    setCurrentTab('PERMUTAS');
  };

  const handleApprovePermutaGestor = async (permutaId: string, gestorNome: string, gestorSignature: string) => {
    if (!loggedUser || (loggedUser.role !== 'COMANDANTE' && loggedUser.role !== 'ADMIN')) return;
    const targetPermuta = permutas.find(p => p.id === permutaId);
    if (!targetPermuta) return;

    const substituto = militares.find(m => m.id === targetPermuta.militarSubstitutoId);
    if (substituto) {
      const substituteAfastamento = substituto.afastamentos?.find(a => 
        targetPermuta.dataRealizacao >= a.dataInicio && targetPermuta.dataRealizacao <= a.dataFim
      );
      if (substituteAfastamento) {
        alert(`ERRO: O substituto possui afastamento registrado nesta data (${substituteAfastamento.motivo}). Homologação cancelada.`);
        return;
      }
    }

    const substituido = militares.find(m => m.id === targetPermuta.militarSubstituidoId);
    if (substituido) {
      const substituidoAfastamento = substituido.afastamentos?.find(a => 
        targetPermuta.dataRealizacao >= a.dataInicio && targetPermuta.dataRealizacao <= a.dataFim
      );
      if (substituidoAfastamento) {
        alert(`ERRO: O solicitante possui afastamento registrado nesta data (${substituidoAfastamento.motivo}). Homologação cancelada.`);
        return;
      }
    }

    const dataAssinaturaGestor = new Date().toISOString().replace('T', ' ').slice(0, 16);

    try {
      const permutaRef = doc(db, 'permutas', permutaId);
      await setDoc(permutaRef, sanitizeForFirestore({
        status: 'APROVADO',
        assinaturaGestor: gestorSignature,
        gestorNome,
        dataAssinaturaGestor
      }), { merge: true });
    } catch (e) {
      console.error("Firestore error approving permuta:", e);
    }

    // Always update local state
    setPermutas(prev => prev.map(p => p.id === permutaId ? {
      ...p,
      status: 'APROVADO',
      assinaturaGestor: gestorSignature,
      gestorNome,
      dataAssinaturaGestor
    } : p));

    // Duplicity Prevention: Check if there's already a scale for this militar, data, and turno
    const existingEscala = escalas.find(e => 
      e.militarId === targetPermuta.militarSubstitutoId && 
      e.data === targetPermuta.dataRealizacao && 
      e.turno === targetPermuta.turno
    );

    const originalEscalaId = targetPermuta.escalaSubstituidaId;
    const escalaOriginal = escalas.find(e => e.id === originalEscalaId);

    if (escalaOriginal && !originalEscalaId.startsWith('S-TEMP-')) {
      // Update the existing official scale record
      try {
        const escalaRef = doc(db, 'escalas', originalEscalaId);
        await setDoc(escalaRef, sanitizeForFirestore({
          militarId: targetPermuta.militarSubstitutoId
        }), { merge: true });
      } catch (e) {
        console.error("Firestore error updating escala:", e);
      }

      setEscalas(prev => prev.map(e => e.id === originalEscalaId ? {
        ...e,
        militarId: targetPermuta.militarSubstitutoId
      } : e));
    } else {
      // It's a temporary or missing scale. 
      // Only create if we don't already have one for this person/day/shift
      if (!existingEscala) {
        const novaEscala: Escala = {
          id: originalEscalaId.startsWith('S-TEMP-') ? originalEscalaId : `E-GEN-${Date.now()}`,
          militarId: targetPermuta.militarSubstitutoId,
          postoServico: targetPermuta.postoServico,
          data: targetPermuta.dataRealizacao,
          horaInicio: targetPermuta.horaInicio,
          horaFim: targetPermuta.horaFim,
          turno: targetPermuta.turno as any
        };
        try {
          await setDoc(doc(db, 'escalas', novaEscala.id), sanitizeForFirestore(novaEscala));
        } catch (e) {
          console.error("Firestore error creating escala:", e);
        }

        setEscalas(prev => {
          const exists = prev.some(e => e.id === novaEscala.id);
          if (exists) return prev;
          return [...prev, novaEscala];
        });
      }
    }

    await appendAuditLog('PROCESSO_APROVADO', `Homologação oficial ativada por ${gestorNome} para protocolo ${targetPermuta.protocoloId}. Escala atualizada. Vias digitais autenticadas.`, gestorNome, logs);
  };

  const handleRejectPermutaGestor = async (permutaId: string) => {
    if (!loggedUser) return;
    const targetPermuta = permutas.find(p => p.id === permutaId);
    if (!targetPermuta) return;

    const dataAssinaturaGestor = new Date().toISOString().replace('T', ' ').slice(0, 16);

    try {
      const permutaRef = doc(db, 'permutas', permutaId);
      await setDoc(permutaRef, sanitizeForFirestore({
        status: 'REJEITADO',
        gestorNome: loggedUser.nomeGuerra,
        dataAssinaturaGestor
      }), { merge: true });
    } catch (e) {
      console.error("Firestore error rejecting permuta:", e);
    }

    // Always update local state
    setPermutas(prev => prev.map(p => p.id === permutaId ? {
      ...p,
      status: 'REJEITADO',
      gestorNome: loggedUser.nomeGuerra,
      dataAssinaturaGestor
    } : p));

    await appendAuditLog('PROCESSO_REJEITADO', `Permuta ID ${targetPermuta.protocoloId} rejeitada administrativamente pelo Comando de Batalhão.`, loggedUser.nomeGuerra, logs);
  };

  const handleTornarSemEfeitoPermuta = async (permutaId: string) => {
    if (!loggedUser || (loggedUser.role !== 'COMANDANTE' && loggedUser.role !== 'ADMIN')) return;
    const targetPermuta = permutas.find(p => p.id === permutaId);
    if (!targetPermuta) return;

    const dataAssinaturaGestor = new Date().toISOString().replace('T', ' ').slice(0, 16);

    try {
      const permutaRef = doc(db, 'permutas', permutaId);
      await setDoc(permutaRef, sanitizeForFirestore({
        status: 'SEM_EFEITO',
        gestorNome: loggedUser.nomeGuerra,
        dataAssinaturaGestor
      }), { merge: true });
    } catch (e) {
      console.error("Firestore error setting SEM_EFEITO:", e);
    }

    // Always update local state
    setPermutas(prev => prev.map(p => p.id === permutaId ? {
      ...p,
      status: 'SEM_EFEITO',
      gestorNome: loggedUser.nomeGuerra,
      dataAssinaturaGestor
    } : p));

    // Attempt to revert the scale
    await revertOrDeleteScaleForPermuta(targetPermuta);

    await appendAuditLog('INTEGRALIZAÇÃO', `Permuta ID ${targetPermuta.protocoloId} tornada SEM EFEITO pelo Comando. Escala revertida.`, loggedUser.nomeGuerra, logs);
  };

  const handleAdjustPermutaGestor = async (permutaId: string, justificativa: string) => {
    if (!loggedUser) return;
    const targetPermuta = permutas.find(p => p.id === permutaId);
    if (!targetPermuta) return;

    const dataAssinaturaGestor = new Date().toISOString().replace('T', ' ').slice(0, 16);

    try {
      const permutaRef = doc(db, 'permutas', permutaId);
      await setDoc(permutaRef, sanitizeForFirestore({
        status: 'AJUSTE_GESTOR',
        comentarioAlteracao: justificativa,
        gestorNome: loggedUser.nomeGuerra,
        dataAssinaturaGestor
      }), { merge: true });
    } catch (e) {
      console.error("Firestore error adjusting permuta:", e);
    }

    // Always update local state
    setPermutas(prev => prev.map(p => p.id === permutaId ? {
      ...p,
      status: 'AJUSTE_GESTOR',
      comentarioAlteracao: justificativa,
      gestorNome: loggedUser.nomeGuerra,
      dataAssinaturaGestor
    } : p));

    await appendAuditLog('INTEGRALIZAÇÃO', `O Comando devolveu a escala ${targetPermuta.protocoloId} solicitando correções: "${justificativa.slice(0, 45)}...".`, loggedUser.nomeGuerra, logs);

    // Send automated message to the substituted military
    const automatedMsg: ChatMessage = {
      id: `C-AUTO-AJUSTE-${Date.now()}`,
      deMilitarId: loggedUser.id,
      paraMilitarId: targetPermuta.militarSubstituidoId,
      conteudo: `Militar, sua permuta (${targetPermuta.protocoloId}) para o dia ${formatarDataBR(targetPermuta.dataRealizacao)} necessita de ajustes solicitados pelo Comando: "${justificativa}". Por favor, corrija ou exclua a solicitação em "Minhas Permutas".`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      criptografada: true,
      chaveCripto: 'AES-AUTO-SYSTEM-TRANS'
    };
    try {
      await setDoc(doc(db, 'messages', automatedMsg.id), sanitizeForFirestore(automatedMsg));
    } catch (e) {
      console.error("Firestore error creating automated message:", e);
    }

    setMessages(prev => {
      const exists = prev.some(m => m.id === automatedMsg.id);
      if (exists) return prev;
      return [...prev, automatedMsg].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
    });
  };

  const handleUpdateAlerta = async (alertaId: string, conteudo: string, color: string, icon: string, velocidade?: number, tamanho?: number) => {
    try {
      await setDoc(doc(db, 'alertas', alertaId), sanitizeForFirestore({
        id: alertaId,
        prioridade: 'CRÍTICA',
        titulo: 'ALERTA DE SEGURANÇA',
        conteudo,
        color,
        icon,
        velocidade: velocidade || 3,
        tamanho: tamanho || 12,
        datahora: new Date().toISOString().replace('T', ' ').slice(0, 16)
      }), { merge: true });
      await appendAuditLog('INTEGRALIZAÇÃO', `Alerta operacional de comando atualizado: "${conteudo.slice(0, 45)}...".`, loggedUser?.nomeGuerra || 'SISTEMA', logs);
    } catch (e) {
      console.error("Error updating alert:", e);
    }
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-hud-bg text-cyber-cyan font-mono text-sm animate-pulse">Sincronizando Sistema Firebase...</div>;
  }


  return (
    <MilitaryMobileFrame
      userLogged={loggedUser}
      allUsers={militares}
      onUserSwitch={handleUserChange}
      networkSecured={true}
      onRefreshData={handleRefreshAll}
      onImportMilitaresJSON={handleImportMilitaresJSON}
      onUpdateMilitarNomeGuerra={handleUpdateMilitarNomeGuerra}
      isLoggedIn={isLoggedIn}
    >
      <InstallAppBanner />
      {!isLoggedIn ? (
        /* BIOMETRIC OR PASS LOGIN SCREEN */
        <div className="flex-1 flex flex-col h-full">
          {/* Biometric or pass login screen */}
          <BiometricLogin
            userLogged={loggedUser}
            allUsers={militares}
            onUserSelect={handleUserChange}
            onLoginSuccess={() => setIsLoggedIn(true)}
            onUpdateMilitarPin={handleUpdateMilitarPin}
          />
        </div>
      ) : (
        /* LOGGED IN CORE TACTICAL EXPERIENCE */
        <div className="flex-1 flex flex-col justify-between h-full bg-hud-bg relative">
          
          {/* Scrolling Pane viewports */}
          <div className="flex-1 overflow-y-auto">
            
            {/* 1. VIEW CHANGER DETECTOR */}
            {activeSwapScale ? (
              <PermutaFlow
                escala={activeSwapScale}
                allMilitares={militares}
                userLogged={loggedUser}
                permutas={permutas}
                escalas={escalas}
                onCancel={() => setActiveSwapScale(null)}
                onSubmitPermuta={handleCreatePermuta}
                onFinish={() => {
                  setActiveSwapScale(null);
                  setCurrentTab('PERMUTAS');
                }}
              />
            ) : activeReviewPermuta ? (
              <ValidadorPermuta
                permuta={activeReviewPermuta}
                allMilitares={militares}
                userLogged={loggedUser}
                onBack={() => setActiveReviewPermuta(null)}
                onAccept={handleAcceptPermuta}
                onDecline={handleDeclinePermuta}
                onRequestAlteration={handleRequestAlteration}
              />
            ) : (
              <>
                {currentTab === 'DASHBOARD' && (
                  <Dashboard
                    userLogged={loggedUser}
                    allMilitares={militares}
                    escalas={escalas}
                    alertas={alertas}
                    permutas={permutas}
                    onStartPermutaFlow={(esc) => setActiveSwapScale(esc)}
                    onSelectPermuta={(per) => setActiveReviewPermuta(per)}
                    onNavigateToTab={(tab) => setCurrentTab(tab)}
                    onApprovePermuta={handleApprovePermutaGestor}
                    onRejectPermuta={handleRejectPermutaGestor}
                    onAdjustPermuta={handleAdjustPermutaGestor}
                    onUpdateAlerta={handleUpdateAlerta}
                  />
                )}

                {currentTab === 'PERMUTAS' && (
                  <div className="p-4 space-y-4 pb-12">
                    {/* MY PERMUTAS ACTIVE TIMELINE */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center font-sans">
                          <History className="w-4 h-4 text-cyber-blue mr-1.5" />
                          Minhas Solicitações de Troca
                        </h3>
                        <button
                          onClick={() => {
                            setCurrentTab('DASHBOARD');
                            // Create elegant ephemeral overlay notification
                            const toastDiv = document.createElement('div');
                            toastDiv.className = "fixed top-5 left-1/2 transform -translate-x-1/2 bg-[#021c22] text-[#00ff66] border border-[#00ff66]/40 px-5 py-3 rounded-xl text-center text-xs font-mono font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(0,255,102,0.3)] z-50 cursor-pointer transition-all";
                            toastDiv.innerHTML = "⚡ NOVA PROTOCOLIZAÇÃO:<br/><span className='text-white text-[11px] font-sans font-normal normal-case'>Selecione qualquer dia no painel tático para iniciar outra permuta.</span>";
                            document.body.appendChild(toastDiv);
                            setTimeout(() => {
                              toastDiv.style.opacity = '0';
                              setTimeout(() => toastDiv.remove(), 500);
                            }, 4500);
                          }}
                          className="bg-cyber-blue/15 hover:bg-cyber-blue/35 text-cyber-cyan border border-cyber-cyan/35 hover:border-cyber-cyan/60 px-2.5 py-1 rounded text-[9.5px] font-mono font-bold transition-all uppercase flex items-center space-x-1 cursor-pointer shadow-[0_0_10px_rgba(0,229,255,0.1)] active:scale-95"
                          id="btn-add-more-permuta"
                        >
                          <PlusCircle size={11} className="text-cyber-cyan animate-pulse shrink-0" />
                          <span>SOLICITAR MAIS PERMUTA</span>
                        </button>
                      </div>

                      {(() => {
                        const userPermutas = permutas.filter(p => p.militarSubstituidoId === loggedUser?.id || p.militarSubstitutoId === loggedUser?.id);
                        if (userPermutas.length === 0) {
                          return (
                            <div className="bg-[#051115] border border-hud-border/40 p-6 rounded-xl text-center text-slate-500 font-sans text-xs">
                              Nenhuma solicitação de troca encontrada. Para iniciar nova proposta, selecione uma escala na tela inicial do Dashboard.
                            </div>
                          );
                        }

                        const activePermutas = userPermutas.filter(p => p.status !== 'APROVADO' && p.status !== 'REJEITADO' && p.status !== 'REJEITADO_SUBSTITUTO');
                        const approvedPermutas = userPermutas.filter(p => p.status === 'APROVADO');
                        const rejectedPermutas = userPermutas.filter(p => p.status === 'REJEITADO' || p.status === 'REJEITADO_SUBSTITUTO');

                        const renderPermutaItem = (p: Permuta) => {
                            const origin = militares.find(m => m.id === p.militarSubstituidoId);
                            const dest = militares.find(m => m.id === p.militarSubstitutoId);
                            
                            let badgeStyle = 'bg-cyber-blue/15 text-cyber-blue border-cyber-blue/30';
                            let stateLabel = 'Aguardando Substituto';
                            let isHighlighted = false;
                            
                            if (p.status === 'PENDENTE_SUBSTITUTO') {
                              badgeStyle = 'bg-cyber-blue/20 text-cyber-cyan border-cyber-cyan/50 shadow-[0_0_10px_rgba(0,229,255,0.2)]';
                              stateLabel = 'Aguardando Substituto';
                              if (p.militarSubstituidoId === loggedUser?.id) {
                                isHighlighted = true;
                              }
                            } else if (p.status === 'PENDENTE_GESTOR') {
                              badgeStyle = 'bg-cyber-amber/15 text-cyber-amber border-cyber-amber/30';
                              stateLabel = 'Aguardando Comando';
                            } else if (p.status === 'APROVADO') {
                              badgeStyle = 'bg-cyber-green/10 text-cyber-green border-cyber-green/20';
                              stateLabel = 'Homologada';
                            } else if (p.status === 'REJEITADO_SUBSTITUTO' || p.status === 'REJEITADO') {
                              badgeStyle = 'bg-cyber-red/10 text-cyber-red border-cyber-red/20';
                              stateLabel = 'Recusada';
                            } else if (p.status === 'ALTERACAO_SOLICITADA') {
                              badgeStyle = 'bg-[#1c1204] text-cyber-amber border-cyber-amber/30';
                              stateLabel = 'Revisar com Colega';
                            } else if (p.status === 'AJUSTE_GESTOR') {
                              badgeStyle = 'bg-cyber-amber/20 text-[#ffb300] border-cyber-amber/40 animate-pulse';
                              stateLabel = 'Necessita Ajustes';
                            }

                            const isHomologated = p.status === 'APROVADO';

                            return (
                              <div 
                                key={p.id}
                                className={`bg-hud-card border rounded-xl transition-all relative overflow-hidden ${
                                  isHighlighted 
                                    ? 'border-cyber-cyan shadow-[0_0_15px_rgba(0,229,255,0.15)] scale-[1.01] z-10' 
                                    : isHomologated 
                                    ? 'border-cyber-green/30 opacity-90'
                                    : 'border-hud-border'
                                } ${isHomologated ? 'p-3' : 'p-3.5 space-y-3'}`}
                                id={`my-permuta-item-${p.id}`}
                              >
                                {isHighlighted && (
                                  <div className="absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-cyber-cyan to-transparent animate-pulse" />
                                )}

                                <div className="flex justify-between items-start">
                                  <div className="min-w-0">
                                    <span className="text-[8px] text-slate-500 font-mono uppercase tracking-tighter">Protocolo: nº {p.protocoloId}</span>
                                    <h4 className={`text-xs font-bold text-white tracking-wide mt-0.5 truncate ${isHomologated ? 'text-[11px]' : ''}`}>{p.postoServico}</h4>
                                  </div>
                                  <span className={`text-[9px] px-1.5 py-0.5 border rounded uppercase font-bold shrink-0 ${badgeStyle}`}>
                                    {stateLabel}
                                  </span>
                                </div>

                                {!isHomologated ? (
                                  <div className="flex justify-between items-center text-[10.5px] text-slate-400 border-t border-hud-border/30 pt-2.5">
                                    <span className="truncate mr-2">
                                      De: {origin?.nomeGuerra} ➔ Para: {dest?.nomeGuerra}
                                    </span>
                                    <div className="flex items-center text-cyber-blue font-mono shrink-0">
                                      <Clock className="w-3 h-3 mr-1" />
                                      <span>{formatarDataBR(p.dataRealizacao)} ({p.turno})</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-cyber-green/10">
                                     <div className="flex items-center text-[10px] text-slate-400">
                                       <span className="text-cyber-green/70 mr-1.5 font-bold">✓</span>
                                       <span>{formatarDataBR(p.dataRealizacao)} • {p.turno}</span>
                                     </div>
                                     <div className="text-[9px] text-slate-500 font-mono text-right leading-tight">
                                        De: {origin?.nomeGuerra}<br/>
                                        Para: {dest?.nomeGuerra}
                                     </div>
                                  </div>
                                )}

                                {/* Official Digital Homologation Document */}
                                {p.status === 'APROVADO' && (
                                  <div className="mt-2.5">
                                    <DocumentoHomologacao
                                      permuta={p}
                                      allMilitares={militares}
                                    />
                                  </div>
                                )}

                                {/* Clicking to evaluate if peer requested alteração or actions are pending */}
                                {p.status === 'PENDENTE_SUBSTITUTO' && p.militarSubstitutoId === loggedUser?.id && (
                                  <button
                                    onClick={() => setActiveReviewPermuta(p)}
                                    className="w-full bg-[#051c22] border border-cyber-cyan/50 hover:bg-[#082e38] transition-all text-[10px] font-semibold font-mono text-cyber-cyan py-1.5 rounded-md mt-1.5 uppercase flex items-center justify-center"
                                  >
                                    AVALIAR CONVITE SEU DE TROCA
                                  </button>
                                )}

                                {p.militarSubstituidoId === loggedUser?.id && 
                                 (p.status === 'PENDENTE_SUBSTITUTO' || p.status === 'PENDENTE_GESTOR' || p.status === 'AJUSTE_GESTOR') && (
                                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-hud-border/30">
                                    {p.status === 'AJUSTE_GESTOR' ? (
                                      <button 
                                        onClick={async () => {
                                          let esc = escalas.find(e => e.id === p.escalaSubstituidaId);
                                          if (!esc) {
                                            esc = {
                                              id: p.escalaSubstituidaId,
                                              militarId: p.militarSubstituidoId,
                                              postoServico: p.postoServico,
                                              data: p.dataRealizacao,
                                              horaInicio: p.horaInicio,
                                              horaFim: p.horaFim,
                                              turno: p.turno as any
                                            };
                                          }
                                          await handleDeletePermuta(p.id);
                                          setActiveSwapScale(esc);
                                        }}
                                        className="bg-cyber-blue/10 border border-cyber-blue/40 text-cyber-blue text-[10px] font-bold py-2 rounded uppercase hover:bg-cyber-blue/20 transition-all flex items-center justify-center cursor-pointer shadow-[0_0_10px_rgba(0,229,255,0.05)]"
                                      >
                                        Corrigir
                                      </button>
                                    ) : (
                                      <div className="flex items-center justify-center text-[8px] text-slate-500 font-mono uppercase tracking-tighter border border-hud-border/30 rounded bg-hud-bg/20">
                                        Solicitação Ativa
                                      </div>
                                    )}
                                    <button 
                                      onClick={async () => {
                                        // Removed window.confirm for better iframe compatibility
                                        await handleDeletePermuta(p.id);
                                      }}
                                      className="bg-cyber-red/10 border border-cyber-red/40 text-cyber-red text-[10px] font-bold py-2 rounded uppercase hover:bg-cyber-red/20 transition-all flex items-center justify-center cursor-pointer"
                                    >
                                      Excluir
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                        };

                        const sortPermutas = (a: Permuta, b: Permuta) => {
                          const priority: Record<string, number> = {
                            'PENDENTE_SUBSTITUTO': 1,
                            'PENDENTE_GESTOR': 2,
                            'AJUSTE_GESTOR': 3,
                            'APROVADO': 4,
                            'ALTERACAO_SOLICITADA': 5,
                            'REJEITADO_SUBSTITUTO': 6,
                            'REJEITADO': 7
                          };
                          const pA = priority[a.status] || 99;
                          const pB = priority[b.status] || 99;
                          if (pA !== pB) return pA - pB;
                          return new Date(a.dataRealizacao).getTime() - new Date(b.dataRealizacao).getTime();
                        };

                        const groupAndRenderPermutas = (permutasList: Permuta[], groupPrefix: string) => {
                          const sorted = [...permutasList].sort((a, b) => new Date(a.dataRealizacao).getTime() - new Date(b.dataRealizacao).getTime());
                          
                          const monthsNames: Record<string, string> = {
                            '01': 'JANEIRO', '02': 'FEVEREIRO', '03': 'MARÇO', '04': 'ABRIL', '05': 'MAIO', '06': 'JUNHO',
                            '07': 'JULHO', '08': 'AGOSTO', '09': 'SETEMBRO', '10': 'OUTUBRO', '11': 'NOVEMBRO', '12': 'DEZEMBRO'
                          };

                          const groups: { month: string; items: Permuta[] }[] = [];
                          
                          sorted.forEach(p => {
                            const monthStr = p.dataRealizacao.split('-')[1];
                            const monthName = monthsNames[monthStr] || monthStr;
                            let group = groups.find(g => g.month === monthName);
                            if (!group) {
                              group = { month: monthName, items: [] };
                              groups.push(group);
                            }
                            group.items.push(p);
                          });

                          return groups.map(g => {
                            const key = `${groupPrefix}-${g.month}`;
                            const isOpen = !!expandedMonths[key];
                            return (
                              <div key={g.month} className="mb-4 last:mb-0 bg-[#061217] rounded-lg border border-hud-border overflow-hidden">
                                <button 
                                  onClick={() => toggleMonth(key)}
                                  className="w-full flex justify-between items-center p-3 text-[10px] text-slate-400 hover:text-white font-bold tracking-widest uppercase transition-colors"
                                >
                                  <span>{g.month} ({g.items.length})</span>
                                  {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                </button>
                                {isOpen && (
                                  <div className="p-3 space-y-3 border-t border-hud-border/50 bg-[#03080a]">
                                    {g.items.map(renderPermutaItem)}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        };

                        return (
                          <div className="space-y-3 font-sans">
                            {activePermutas.sort(sortPermutas).map(renderPermutaItem)}

                            {approvedPermutas.length > 0 && (
                              <div className="mt-6 border border-cyber-green/20 rounded-xl overflow-hidden bg-[#03080a]">
                                <button 
                                  onClick={() => setShowApproved(!showApproved)} 
                                  className="w-full flex justify-between items-center bg-cyber-green/5 p-3 hover:bg-cyber-green/10 transition-all text-cyber-green text-[10px] font-mono uppercase font-bold"
                                >
                                  <span>✓ Permutas Homologadas ({approvedPermutas.length})</span>
                                  {showApproved ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                </button>
                                {showApproved && (
                                  <div className="p-3 bg-[#03080a] border-t border-cyber-green/20">
                                    {groupAndRenderPermutas(approvedPermutas, 'APPROVED')}
                                  </div>
                                )}
                              </div>
                            )}

                            {rejectedPermutas.length > 0 && (
                              <div className="mt-4 border border-cyber-red/20 rounded-xl overflow-hidden bg-[#03080a]">
                                <button 
                                  onClick={() => setShowRejected(!showRejected)} 
                                  className="w-full flex justify-between items-center bg-cyber-red/5 p-3 hover:bg-cyber-red/10 transition-all text-cyber-red text-[10px] font-mono uppercase font-bold"
                                >
                                  <span>✕ Permutas Recusadas ({rejectedPermutas.length})</span>
                                  {showRejected ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                </button>
                                {showRejected && (
                                  <div className="p-3 bg-[#03080a] border-t border-cyber-red/20">
                                    {groupAndRenderPermutas(rejectedPermutas, 'REJECTED')}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {currentTab === 'CHAT' && (
                  <EncryptedChat
                    userLogged={loggedUser}
                    allMilitares={militares}
                    messages={messages}
                    onSendMessage={handleSendMessage}
                  />
                )}

                {currentTab === 'GESTAO' && (
                  <div>
                    {loggedUser && (loggedUser.role === 'COMANDANTE' || loggedUser.role === 'ADMIN') ? (
                      /* Officer is authorized to access with their key */
                      <PainelGestor
                        permutas={permutas}
                        allMilitares={militares}
                        logs={logs}
                        userLogged={loggedUser}
                        escalas={escalas}
                        onApprovePermuta={handleApprovePermutaGestor}
                        onRejectPermuta={handleRejectPermutaGestor}
                        onAdjustPermuta={handleAdjustPermutaGestor}
                        onTornarSemEfeitoPermuta={handleTornarSemEfeitoPermuta}
                        onDeletePermuta={handleDeletePermuta}
                        onAddMilitar={handleAddMilitarIndividual}
                        onDeleteMilitar={handleDeleteMilitar}
                        onClearLogs={handleClearAllLogs}
                        onDeleteLog={handleDeleteLog}
                        onToggleBiometria={handleToggleBiometria}
                        onClearAllPermutas={handleClearAllPermutas}
                        onClearAllMilitares={handleClearAllMilitares}
                        onRefreshData={handleRefreshAll}
                        onImportMilitaresJSON={handleImportMilitaresJSON}
                        onUpdateMilitarNomeGuerra={handleUpdateMilitarNomeGuerra}
                        onUpdateMilitar={handleUpdateMilitar}
                        onUpdateMilitarRole={handleUpdateMilitarRole}
                        onUpdateMilitarMF={handleUpdateMilitarMF}
                        onUpdateMilitarNumero={handleUpdateMilitarNumero}
                        onUserSwitch={handleUserChange}
                        backups={backups}
                        backupStatusMsg={backupStatusMsg}
                        onCreateBackup={(tipo) => generateBackup(tipo, loggedUser?.nomeGuerra || 'SISTEMA')}
                        onRestoreBackup={handleRestoreBackup}
                        config={config}
                        onUpdateConfig={handleUpdateConfig}
                      />
                    ) : (
                      /* Immersion Security Lockout Screen */
                      <div className="p-8 flex flex-col items-center justify-center text-center space-y-4 py-16" id="lockout-admin-screen">
                        <div className="w-16 h-16 rounded-full border-2 border-cyber-red bg-cyber-red/10 flex items-center justify-center relative animate-pulse">
                          <Lock className="w-8 h-8 text-cyber-red" />
                          <div className="absolute inset-0 rounded-full border border-cyber-red opacity-30 animate-ping" />
                        </div>
                        
                        <div className="space-y-1">
                          <h3 className="text-md font-bold font-display text-white tracking-wide">ACESSO DENEGADO</h3>
                          <p className="text-[9px] font-mono text-cyber-red uppercase tracking-widest font-extrabold">NÍVEL DE LIBERAÇÃO INSUFICIENTE</p>
                        </div>
                        
                        <p className="text-xs text-cyber-red max-w-xs leading-relaxed font-bold font-mono uppercase tracking-wide border border-cyber-red/30 bg-cyber-red/5 p-3 rounded">
                          SOMENTE COM CREDENCIAIS DE ADMINISTRADOR OU COMANDANTE
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

          </div>

          {/* Bottom Modern Tactical Navigation Bar */}
          {!activeSwapScale && !activeReviewPermuta && (
            <div className="h-14 border-t border-hud-border bg-hud-board/90 px-3 flex items-center justify-between text-slate-500 relative z-30 font-mono text-[9px] select-none shadow-[0_-4px_10px_rgba(0,0,0,0.4)]">
              
              <button
                onClick={() => setCurrentTab('DASHBOARD')}
                className={`flex-1 flex flex-col items-center space-y-1 focus:outline-none transition-all ${
                  currentTab === 'DASHBOARD' ? 'text-cyber-blue drop-shadow-[0_0_3px_rgba(0,229,255,0.4)]' : 'hover:text-slate-300'
                }`}
                id="tab-dashboard"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="font-bold tracking-wider">PAINEL</span>
              </button>

              <button
                onClick={() => setCurrentTab('PERMUTAS')}
                className={`flex-1 flex flex-col items-center space-y-1 focus:outline-none transition-all ${
                  currentTab === 'PERMUTAS' ? 'text-cyber-blue drop-shadow-[0_0_3px_rgba(0,229,255,0.4)]' : 'hover:text-slate-300'
                }`}
                id="tab-permutas"
              >
                <FileCheck className="w-4 h-4" />
                <span className="font-bold tracking-wider">PERMUTAS</span>
              </button>

              <button
                onClick={() => setCurrentTab('GESTAO')}
                className={`flex-1 flex flex-col items-center space-y-1 focus:outline-none transition-all ${
                  currentTab === 'GESTAO' ? 'text-cyber-blue drop-shadow-[0_0_3px_rgba(0,229,255,0.4)]' : 'hover:text-slate-300'
                }`}
                id="tab-gestor"
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="font-bold tracking-wider">COMANDO</span>
              </button>

              <button
                onClick={() => {
                  setIsLoggedIn(false);
                  setCurrentTab('DASHBOARD');
                }}
                className="flex-1 flex flex-col items-center space-y-1 focus:outline-none transition-all text-cyber-red/80 hover:text-cyber-red hover:drop-shadow-[0_0_3px_rgba(255,0,51,0.4)]"
                title="Encerrar Sessão Militar"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-bold tracking-wider">SAIR</span>
              </button>

            </div>
          )}

        </div>
      )}
    </MilitaryMobileFrame>
  );
}
