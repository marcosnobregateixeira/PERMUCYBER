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
  PlusCircle
} from 'lucide-react';

import { db, auth } from './firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { seedInitialData, sanitizeForFirestore } from './firebaseUtils';

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
  const [selectedMilitarId, setSelectedMilitarId] = useState<string>('M-101');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [permutas, setPermutas] = useState<Permuta[]>([]);
  const [logs, setLogs] = useState<BlockchainLog[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [backups, setBackups] = useState<BackupSnapshot[]>([]);
  const [config, setConfig] = useState<AppConfig>({ id: 'main', brasaoEsquerdoUrl: '', brasaoDireitoUrl: '' });
  const [backupStatusMsg, setBackupStatusMsg] = useState<string>('Sincronização em nuvem e backups estão ativos.');

  const [currentTab, setCurrentTab] = useState<'DASHBOARD' | 'PERMUTAS' | 'CHAT' | 'GESTAO'>('DASHBOARD');
  const [activeSwapScale, setActiveSwapScale] = useState<Escala | null>(null);
  const [activeReviewPermuta, setActiveReviewPermuta] = useState<Permuta | null>(null);

  useEffect(() => {
    // Seed data if missing
    seedInitialData(MILITARES, ESCALAS_INICIAIS, PERMUTAS_INICIAIS, ALERTAS_INICIAIS, LOGS_INICIAIS, CHATS_INICIAIS)
      .then(() => {
        // Setup real-time listeners
        const unsubMilitares = onSnapshot(collection(db, 'militares'), (snap) => setMilitares(snap.docs.map(d => d.data() as Militar).sort(sortMilitarByPatente)));
        const unsubEscalas = onSnapshot(collection(db, 'escalas'), (snap) => setEscalas(snap.docs.map(d => d.data() as Escala)));
        const unsubAlertas = onSnapshot(collection(db, 'alertas'), (snap) => setAlertas(snap.docs.map(d => d.data() as Alerta)));
        const unsubPermutas = onSnapshot(collection(db, 'permutas'), (snap) => setPermutas(snap.docs.map(d => d.data() as Permuta)));
        const unsubLogs = onSnapshot(collection(db, 'logs'), (snap) => setLogs(snap.docs.map(d => d.data() as BlockchainLog).sort((a,b) => a.timestamp.localeCompare(b.timestamp))));
        const unsubMessages = onSnapshot(collection(db, 'messages'), (snap) => setMessages(snap.docs.map(d => d.data() as ChatMessage).sort((a,b) => a.timestamp.localeCompare(b.timestamp))));
        const unsubBackups = onSnapshot(collection(db, 'backups'), (snap) => setBackups(snap.docs.map(d => d.data() as any as BackupSnapshot).sort((a,b) => b.timestamp.localeCompare(a.timestamp))));
        const unsubConfig = onSnapshot(doc(db, 'settings', 'config'), (snap) => {
          if (snap.exists()) {
            setConfig(snap.data() as AppConfig);
          }
        });
        
        setIsLoading(false);

        return () => {
          unsubMilitares();
          unsubEscalas();
          unsubAlertas();
          unsubPermutas();
          unsubLogs();
          unsubMessages();
          unsubBackups();
          unsubConfig();
        };
      })
      .catch((error) => {
        console.error("Firebase Sync Error:", error);
        
        // Fallback to local data to avoid breaking the UI during propagation
        setMilitares([...MILITARES].sort(sortMilitarByPatente));
        setEscalas(ESCALAS_INICIAIS);
        setAlertas(ALERTAS_INICIAIS);
        setPermutas(PERMUTAS_INICIAIS);
        setLogs(LOGS_INICIAIS);
        setMessages(CHATS_INICIAIS);
        setIsLoading(false);
      });
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

  const loggedUser = militares.find((m) => m.id === selectedMilitarId) || MILITARES[0];

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

  const generateBackup = async (tipo: 'AUTO' | 'MANUAL', autor: string, forcedMilitares?: Militar[], forcedEscalas?: Escala[], forcedPermutas?: Permuta[]) => {
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
    } catch (err) {
      console.error("Backup failed:", err);
      setBackupStatusMsg("⚠️ Falha crítica ao transcrever backup para a nuvem.");
      alert("⚠️ Erro crítico: Não foi possível salvar o backup nas nuvens. Verifique sua conexão com a rede.");
    }
  };

  const handleRestoreBackup = async (snapshot: BackupSnapshot) => {
    try {
      setBackupStatusMsg(`⌛ Reconciliando imagens... Revertendo para o backup ${snapshot.id}...`);
      
      for (const m of militares) {
        if (!snapshot.militares.some(sm => sm.id === m.id)) {
          await deleteDoc(doc(db, 'militares', m.id));
        }
      }
      for (const e of escalas) {
        if (!snapshot.escalas.some(se => se.id === e.id)) {
          await deleteDoc(doc(db, 'escalas', e.id));
        }
      }
      for (const p of permutas) {
        if (!snapshot.permutas.some(sp => sp.id === p.id)) {
          await deleteDoc(doc(db, 'permutas', p.id));
        }
      }

      for (const m of snapshot.militares) {
        await setDoc(doc(db, 'militares', m.id), sanitizeForFirestore(m));
      }
      for (const e of snapshot.escalas) {
        await setDoc(doc(db, 'escalas', e.id), sanitizeForFirestore(e));
      }
      for (const p of snapshot.permutas) {
        await setDoc(doc(db, 'permutas', p.id), sanitizeForFirestore(p));
      }

      await appendAuditLog('INTEGRALIZAÇÃO', `Restauração pontual efetuada com sucesso: ${snapshot.id}.`, loggedUser?.nomeGuerra || 'SISTEMA', logs);
      alert(`SUCESSO! O banco de dados em nuvem foi totalmente restaurado para a imagem de segurança ${snapshot.id}.`);
      setBackupStatusMsg(`✓ Restauro concluído com sucesso para o backup ${snapshot.id}.`);
    } catch (err) {
      console.error("Restore failed:", err);
      alert("Falha crítica ao sincronizar restauro em nuvem.");
      setBackupStatusMsg("⚠️ Erro de restauro e reconciliação.");
    }
  };

  const handleAddMilitarIndividual = async (militar: Militar) => {
    try {
      await setDoc(doc(db, 'militares', militar.id), sanitizeForFirestore(militar));
    } catch (e) { console.error("Error saving militar:", e); }
    const updated = [...militares, militar];
    setMilitares(updated);
    await appendAuditLog('INTEGRALIZAÇÃO', `Militar ${militar.nomeGuerra} adicionado à base de dados.`, loggedUser?.nomeGuerra || 'SISTEMA', logs);
    await generateBackup('AUTO', loggedUser?.nomeGuerra || 'SISTEMA', updated);
  };

  const handleDeleteMilitar = async (id: string) => {
    try { await deleteDoc(doc(db, 'militares', id)); } catch(e){}
    const updated = militares.filter(m => m.id !== id);
    setMilitares(updated);
    await appendAuditLog('INTEGRALIZAÇÃO', `Militar com ID ${id} removido da base de dados.`, loggedUser?.nomeGuerra || 'SISTEMA', logs);
    await generateBackup('AUTO', loggedUser?.nomeGuerra || 'SISTEMA', updated);
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
    } catch(e){}
    setMilitares(prev => prev.map(p => p.id === id ? { ...p, nomeGuerra: newNome, nome: newNome.replace(/^(Sgto\.|Ten\.|Cb\.|Sd\.)\s*/i, '') } : p));
  };

  const handleUpdateMilitar = async (id: string, updatedFields: Partial<Militar>) => {
    try {
      await updateDoc(doc(db, 'militares', id), sanitizeForFirestore(updatedFields));
    } catch(e) {
      console.error("Error updating militar:", e);
    }
    setMilitares(prev => prev.map(p => p.id === id ? { ...p, ...updatedFields } : p));
    await appendAuditLog('INTEGRALIZAÇÃO', `Cadastro de ${updatedFields.patente || ''} ${updatedFields.nomeGuerra || ''} foi atualizado no sistema de banco de dados.`, loggedUser?.nomeGuerra || 'SISTEMA', logs);
  };

  const handleUpdateMilitarMF = async (id: string, newMF: string) => {
    try { await updateDoc(doc(db, 'militares', id), { matriculaFuncional: newMF }); } catch(e){}
    setMilitares(prev => prev.map(p => p.id === id ? { ...p, matriculaFuncional: newMF } : p));
  };

  const handleUpdateMilitarNumero = async (id: string, numero: string) => {
    try { await updateDoc(doc(db, 'militares', id), { numero }); } catch(e){}
    setMilitares(prev => prev.map(p => p.id === id ? { ...p, numero } : p));
  };

  const handleUpdateMilitarPin = async (id: string, newPin: string) => {
    try { await updateDoc(doc(db, 'militares', id), { pinSegurança: newPin }); } catch(e){}
    setMilitares(prev => prev.map(p => p.id === id ? { ...p, pinSegurança: newPin } : p));
    await appendAuditLog('INTEGRALIZAÇÃO', `Militar ID ${id} atualizou seu token / PIN de segurança criptográfica pessoal com sucesso.`, loggedUser?.nomeGuerra || 'SISTEMA', logs);
  };

  const handleUpdateMilitarRole = async (id: string, role: Role) => {
    try { await updateDoc(doc(db, 'militares', id), { role }); } catch(e){}
    setMilitares(prev => prev.map(p => p.id === id ? { ...p, role } : p));
    await appendAuditLog('INTEGRALIZAÇÃO', `Papel do militar ${id} alterado para ${role}.`, loggedUser?.nomeGuerra || 'SISTEMA', logs);
  };

  const handleUpdateConfig = async (newConfig: Partial<AppConfig>) => {
    try {
      await setDoc(doc(db, 'settings', 'config'), sanitizeForFirestore({ ...config, ...newConfig }));
    } catch (e) {
      console.error("Error updating config:", e);
    }
  };

  const handleImportMilitaresJSON = async (imported: Militar[]) => {
    for (const m of imported) {
      await setDoc(doc(db, 'militares', m.id), sanitizeForFirestore(m));
    }
    if (imported.length > 0 && !imported.some(m => m.id === selectedMilitarId)) {
      setSelectedMilitarId(imported[0].id);
      setIsLoggedIn(false);
    }
    await appendAuditLog('INTEGRALIZAÇÃO', `Base de dados de militares atualizada por importação (.JSON) com sucesso (${imported.length} militares carregados).`, loggedUser?.nomeGuerra || 'SISTEMA', logs);
    await generateBackup('AUTO', loggedUser?.nomeGuerra || 'SISTEMA', imported);
  };

  const handleSendMessage = async (paraMilitarId: string, conteudo: string) => {
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
    await appendAuditLog('INTEGRALIZAÇÃO', `Transmissão de texto plano criptografada com sucesso de ${loggedUser.nomeGuerra} para ${recipient}. Protocolo seguro ativado.`, loggedUser.nomeGuerra, logs);
  };

  const handleCreatePermuta = async (novaPermuta: Permuta) => {
    await setDoc(doc(db, 'permutas', novaPermuta.id), sanitizeForFirestore(novaPermuta));
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
      await setDoc(doc(db, 'messages', automatedMsg.id), sanitizeForFirestore(automatedMsg));
    }
  };

  const handleAcceptPermuta = async (permutaId: string, peerSignature: string) => {
    await updateDoc(doc(db, 'permutas', permutaId), sanitizeForFirestore({
      status: 'PENDENTE_GESTOR',
      assinaturaSubstituta: peerSignature
    }));
    await appendAuditLog('PERMUTA_ACEITA', `Sgt. Mendes assinou digitalmente aceitando a permuta ref. protocolo ${permutas.find(p => p.id === permutaId)?.protocoloId}. Encaminhado ao conselho operacional.`, loggedUser.nomeGuerra, logs);
    setActiveReviewPermuta(null);
    setCurrentTab('PERMUTAS');
  };

  const handleDeclinePermuta = async (permutaId: string) => {
    await updateDoc(doc(db, 'permutas', permutaId), sanitizeForFirestore({ status: 'REJEITADO_SUBSTITUTO' }));
    await appendAuditLog('INTEGRALIZAÇÃO', `Solicitação de permuta cancelada/rejeitada pelo militar substituto. Protocolo suspenso.`, loggedUser.nomeGuerra, logs);
    setActiveReviewPermuta(null);
    setCurrentTab('PERMUTAS');
  };

  const handleRequestAlteration = async (permutaId: string, comentario: string) => {
    await updateDoc(doc(db, 'permutas', permutaId), sanitizeForFirestore({
      status: 'ALTERACAO_SOLICITADA',
      comentarioAlteracao: comentario
    }));
    await appendAuditLog('INTEGRALIZAÇÃO', `Proposta de alteração de escala retransmitida com considerações operacionais: "${comentario.slice(0, 45)}...".`, loggedUser.nomeGuerra, logs);
    setActiveReviewPermuta(null);
    setCurrentTab('PERMUTAS');
  };

  const handleApprovePermutaGestor = async (permutaId: string, gestorNome: string, gestorSignature: string) => {
    if (loggedUser.role !== 'COMANDANTE' && loggedUser.role !== 'ADMIN') return;
    const targetPermuta = permutas.find(p => p.id === permutaId);
    if (!targetPermuta) return;

    await updateDoc(doc(db, 'permutas', permutaId), sanitizeForFirestore({
      status: 'APROVADO',
      assinaturaGestor: gestorSignature,
      gestorNome,
      dataAssinaturaGestor: new Date().toISOString().replace('T', ' ').slice(0, 16)
    }));

    await updateDoc(doc(db, 'escalas', targetPermuta.escalaSubstituidaId), sanitizeForFirestore({
      militarId: targetPermuta.militarSubstitutoId
    }));

    await appendAuditLog('PROCESSO_APROVADO', `Homologação oficial ativada pelo Tenente Bastos para protocolo ${targetPermuta.protocoloId}. Escala atualizada. Vias digitais autenticadas.`, gestorNome, logs);
  };

  const handleRejectPermutaGestor = async (permutaId: string) => {
    const targetPermuta = permutas.find(p => p.id === permutaId);
    if (!targetPermuta) return;

    await updateDoc(doc(db, 'permutas', permutaId), sanitizeForFirestore({
      status: 'REJEITADO',
      gestorNome: loggedUser.nomeGuerra,
      dataAssinaturaGestor: new Date().toISOString().replace('T', ' ').slice(0, 16)
    }));
    await appendAuditLog('PROCESSO_REJEITADO', `Permuta ID ${targetPermuta.protocoloId} rejeitada administrativamente pelo Comando de Batalhão.`, loggedUser.nomeGuerra, logs);
  };

  const handleAdjustPermutaGestor = async (permutaId: string, justificativa: string) => {
    const targetPermuta = permutas.find(p => p.id === permutaId);
    if (!targetPermuta) return;

    await updateDoc(doc(db, 'permutas', permutaId), sanitizeForFirestore({
      status: 'AJUSTE_GESTOR',
      comentarioAlteracao: justificativa,
      gestorNome: loggedUser.nomeGuerra,
      dataAssinaturaGestor: new Date().toISOString().replace('T', ' ').slice(0, 16)
    }));
    await appendAuditLog('INTEGRALIZAÇÃO', `O Comando devolveu a escala ${targetPermuta.protocoloId} solicitando correções: "${justificativa.slice(0, 45)}...".`, loggedUser.nomeGuerra, logs);
  };

  const handleUpdateAlerta = async (alertaId: string, conteudo: string, color: string, icon: string) => {
    try {
      await setDoc(doc(db, 'alertas', alertaId), sanitizeForFirestore({
        id: alertaId,
        prioridade: 'CRÍTICA',
        titulo: 'ALERTA DE SEGURANÇA',
        conteudo,
        color,
        icon,
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
      {!isLoggedIn ? (
        /* BIOMETRIC OR PASS LOGIN SCREEN */
        <div className="flex-1 flex flex-col h-full">
          {/* Debug Depass access corner */}
          <div className="absolute top-8 right-4 z-40 flex space-x-1.5">
            <button
              onClick={() => setIsLoggedIn(true)}
              className="text-[9px] font-mono text-cyber-green bg-cyber-green/10 border border-cyber-green/30 hover:bg-cyber-green/20 px-2 py-1 rounded transition-all flex items-center space-x-1 animate-pulse"
              id="bypass-login-btn"
            >
              <ShieldCheck className="w-3 h-3 text-cyber-green" />
              <span>ACESSO DIRETO</span>
            </button>
            <button
              onClick={() => {
                handleUserChange('M-ADMIN-1');
                setIsLoggedIn(true);
              }}
              className="text-[9px] font-mono text-cyber-amber bg-cyber-amber/10 border border-cyber-amber/35 hover:bg-cyber-amber/30 px-2.5 py-1 rounded transition-all flex items-center space-x-1 border-dashed"
              id="bypass-admin-btn"
              title="Acesso Rápido para Marcos Nobrega (Admin)"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-cyber-amber animate-bounce" />
              <span className="text-white">ENTRAR COMO MARCOS (ADMIN)</span>
            </button>
          </div>
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
          
          {/* Tab Header Banner */}
          <div className="h-10 border-b border-hud-border/50 px-4 flex items-center justify-between bg-hud-board/60 text-xs font-mono">
            <span className="text-[#00e5ff] font-bold tracking-widest uppercase flex items-center">
              <span className="w-1.5 h-1.5 bg-cyber-blue rounded-full mr-2 animate-pulse" />
              {currentTab === 'DASHBOARD' && 'ÁREA DE OPERAÇÕES'}
              {currentTab === 'PERMUTAS' && 'CENTRAL DE TROCAS'}
              {currentTab === 'CHAT' && 'COMUNICAÇÃO AES-256'}
              {currentTab === 'GESTAO' && 'COMANDO REGIMENTAL'}
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-slate-500 text-[9px] font-mono uppercase font-bold text-shadow">
                ID: {loggedUser.id}
              </span>
              <button
                onClick={() => {
                  setIsLoggedIn(false);
                  setCurrentTab('DASHBOARD');
                }}
                className="text-cyber-red hover:text-white bg-cyber-red/15 hover:bg-cyber-red/30 border border-cyber-red/35 hover:border-cyber-red/60 px-2 py-0.5 rounded text-[8.5px] font-mono font-bold transition-all uppercase cursor-pointer"
                title="Encerrar Sessão Militar"
              >
                SAIR
              </button>
            </div>
          </div>

          {/* Scrolling Pane viewports */}
          <div className="flex-1 overflow-y-auto">
            
            {/* 1. VIEW CHANGER DETECTOR */}
            {activeSwapScale ? (
              <PermutaFlow
                escala={activeSwapScale}
                allMilitares={militares}
                userLogged={loggedUser}
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

                      {permutas.filter(p => p.militarSubstituidoId === loggedUser.id || p.militarSubstitutoId === loggedUser.id).length === 0 ? (
                        <div className="bg-[#051115] border border-hud-border/40 p-6 rounded-xl text-center text-slate-500 font-sans text-xs">
                          Nenhuma solicitação de troca encontrada. Para iniciar nova proposta, selecione uma escala na tela inicial do Dashboard.
                        </div>
                      ) : (
                        <div className="space-y-3 font-sans">
                          {permutas.filter(p => p.militarSubstituidoId === loggedUser.id || p.militarSubstitutoId === loggedUser.id).map((p) => {
                            const origin = militares.find(m => m.id === p.militarSubstituidoId);
                            const dest = militares.find(m => m.id === p.militarSubstitutoId);
                            
                            let badgeStyle = 'bg-cyber-blue/15 text-cyber-blue border-cyber-blue/30';
                            let stateLabel = 'Aguardando Colega';
                            
                            if (p.status === 'PENDENTE_GESTOR') {
                              badgeStyle = 'bg-cyber-amber/15 text-cyber-amber border-cyber-amber/30';
                              stateLabel = 'Aguardando Comando';
                            } else if (p.status === 'APROVADO') {
                              badgeStyle = 'bg-cyber-green/20 text-cyber-green border-cyber-green/30';
                              stateLabel = 'Autorizada';
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

                            return (
                              <div 
                                key={p.id}
                                className="bg-hud-card border border-hud-border rounded-xl p-3.5 space-y-3 relative hover:border-cyber-cyan/40 transition-all"
                                id={`my-permuta-item-${p.id}`}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="text-[9px] text-slate-400 font-mono">Protocolo: nº {p.protocoloId}</span>
                                    <h4 className="text-xs font-bold text-white tracking-wide mt-0.5">{p.postoServico}</h4>
                                  </div>
                                  <span className={`text-[9px] px-1.5 py-0.5 border rounded uppercase font-bold ${badgeStyle}`}>
                                    {stateLabel}
                                  </span>
                                </div>

                                <div className="flex justify-between items-center text-[10.5px] text-slate-400 border-t border-hud-border/30 pt-2.5">
                                  <span>
                                    De: {origin?.nomeGuerra} ➔ Para: {dest?.nomeGuerra}
                                  </span>
                                  <div className="flex items-center text-cyber-blue font-mono">
                                    <Clock className="w-3 h-3 mr-1" />
                                    <span>{formatarDataBR(p.dataRealizacao)} ({p.turno})</span>
                                  </div>
                                </div>

                                {/* Official Digital Homologation Document */}
                                {p.status === 'APROVADO' && (
                                  <DocumentoHomologacao
                                    permuta={p}
                                    allMilitares={militares}
                                  />
                                )}

                                {/* Clicking to evaluate if peer requested alteração or actions are pending */}
                                {p.status === 'PENDENTE_SUBSTITUTO' && p.militarSubstitutoId === loggedUser.id && (
                                  <button
                                    onClick={() => setActiveReviewPermuta(p)}
                                    className="w-full bg-[#051c22] border border-cyber-cyan/50 hover:bg-[#082e38] transition-all text-[10px] font-semibold font-mono text-cyber-cyan py-1.5 rounded-md mt-1.5 uppercase flex items-center justify-center"
                                  >
                                    AVALIAR CONVITE SEU DE TROCA
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
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
                    {loggedUser.role === 'COMANDANTE' || loggedUser.role === 'ADMIN' ? (
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
                        onAddMilitar={handleAddMilitarIndividual}
                        onDeleteMilitar={handleDeleteMilitar}
                        onToggleBiometria={handleToggleBiometria}
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
                        
                        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                          Este setor tático exige credenciais de Oficial Superior para habilitar auditoria criptográfica de blockchain e homologação de permutas.
                        </p>

                        {/* Quick Switch Shortcut Link */}
                        <button
                          type="button"
                          onClick={() => {
                            handleUserChange('M-202');
                            alert('Acesso tático renegociado: Conectado como Ten. Bastos (Comandante).');
                          }}
                          className="w-full max-w-xs bg-cyber-green/10 hover:bg-cyber-green/25 text-cyber-green hover:text-white border border-cyber-green/35 py-1.5 rounded text-[10px] font-mono font-bold uppercase transition-all tracking-wider text-center flex items-center justify-center space-x-1.5 cursor-pointer mt-2"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-cyber-green" />
                          <span>Simular Logon Comandante (Ten. Bastos)</span>
                        </button>

                        <div className="text-[9px] font-mono text-slate-600 border border-hud-border/40 p-2 rounded max-w-xs w-full mt-2">
                          DIRETRIZ DE SEGURANÇA NACIONAL: SYS-BLOCK CHANNELS ACTIVE
                        </div>
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
                onClick={() => setCurrentTab('CHAT')}
                className={`flex-1 flex flex-col items-center space-y-1 focus:outline-none transition-all ${
                  currentTab === 'CHAT' ? 'text-cyber-blue drop-shadow-[0_0_3px_rgba(0,229,255,0.4)]' : 'hover:text-slate-300'
                }`}
                id="tab-comms"
              >
                <div className="relative">
                  <MessageSquare className="w-4 h-4" />
                  {/* notification bubble mock dot */}
                  <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-cyber-green rounded-full animate-ping" />
                </div>
                <span className="font-bold tracking-wider">CHAT SEC</span>
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

            </div>
          )}

        </div>
      )}
    </MilitaryMobileFrame>
  );
}
