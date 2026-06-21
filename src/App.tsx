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
import { Militar, Escala, Alerta, BlockchainLog, Permuta, ChatMessage, Role } from './types';
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
  AlertTriangle,
  History,
  FileCheck,
  RefreshCw,
  Clock,
  Compass,
  ShieldAlert
} from 'lucide-react';

export default function App() {
  // 1. Core database states synced with LocalStorage
  const [militares, setMilitares] = useState<Militar[]>([]);
  const [selectedMilitarId, setSelectedMilitarId] = useState<string>('M-101'); // Defaults Sgto. Salles
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [permutas, setPermutas] = useState<Permuta[]>([]);
  const [logs, setLogs] = useState<BlockchainLog[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Local navigation states
  const [currentTab, setCurrentTab] = useState<'DASHBOARD' | 'PERMUTAS' | 'CHAT' | 'GESTAO'>('DASHBOARD');
  const [activeSwapScale, setActiveSwapScale] = useState<Escala | null>(null);
  const [activeReviewPermuta, setActiveReviewPermuta] = useState<Permuta | null>(null);

  // Initialize data on mount
  useEffect(() => {
    // Check local storage or seed
    const storedMilitares = localStorage.getItem('pm_militares');
    const storedEscalas = localStorage.getItem('pm_escalas');
    const storedAlertas = localStorage.getItem('pm_alertas');
    const storedPermutas = localStorage.getItem('pm_permutas');
    const storedLogs = localStorage.getItem('pm_logs');
    const storedMessages = localStorage.getItem('pm_messages');

    if (storedMilitares && storedEscalas && storedAlertas && storedPermutas && storedLogs && storedMessages) {
      const parsedMilitares: Militar[] = JSON.parse(storedMilitares);
      
      // Ensure M-ADMIN-1 exists
      if (!parsedMilitares.some(m => m.id === 'M-ADMIN-1')) {
        const adminUser = MILITARES.find(m => m.id === 'M-ADMIN-1');
        if (adminUser) {
          parsedMilitares.push(adminUser);
          localStorage.setItem('pm_militares', JSON.stringify(parsedMilitares));
        }
      }

      const isOutdated = parsedMilitares.length < 10 || parsedMilitares.some(m => m.id === 'M-301' && m.nome === 'Rafael Fontes');
      if (isOutdated) {
        seedDatabase();
      } else {
        setMilitares(parsedMilitares);
        setEscalas(JSON.parse(storedEscalas));
        setAlertas(JSON.parse(storedAlertas));
        setPermutas(JSON.parse(storedPermutas));
        setLogs(JSON.parse(storedLogs));
        setMessages(JSON.parse(storedMessages));
      }
    } else {
      seedDatabase();
    }
  }, []);

  const seedDatabase = () => {
    localStorage.setItem('pm_militares', JSON.stringify(MILITARES));
    localStorage.setItem('pm_escalas', JSON.stringify(ESCALAS_INICIAIS));
    localStorage.setItem('pm_alertas', JSON.stringify(ALERTAS_INICIAIS));
    localStorage.setItem('pm_permutas', JSON.stringify(PERMUTAS_INICIAIS));
    localStorage.setItem('pm_logs', JSON.stringify(LOGS_INICIAIS));
    localStorage.setItem('pm_messages', JSON.stringify(CHATS_INICIAIS));

    setMilitares(MILITARES);
    setEscalas(ESCALAS_INICIAIS);
    setAlertas(ALERTAS_INICIAIS);
    setPermutas(PERMUTAS_INICIAIS);
    setLogs(LOGS_INICIAIS);
    setMessages(CHATS_INICIAIS);
  };

  const handleRefreshAll = () => {
    localStorage.clear();
    seedDatabase();
    setIsLoggedIn(false);
    setCurrentTab('DASHBOARD');
    setActiveSwapScale(null);
    setActiveReviewPermuta(null);
  };

  const saveToLocalStorage = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const handleUserChange = (userId: string) => {
    setSelectedMilitarId(userId);
    // When switching accounts, log them out to trigger biometric login experience
    setIsLoggedIn(false);
    setActiveSwapScale(null);
    setActiveReviewPermuta(null);
    setCurrentTab('DASHBOARD');
  };

  const loggedUser = militares.find((m) => m.id === selectedMilitarId) || MILITARES[0];

  // LOG GENERATOR HELPER
  const appendAuditLog = (
    tipoEvento: BlockchainLog['tipoEvento'],
    evento: string,
    militarName: string,
    currentLogs: BlockchainLog[]
  ): BlockchainLog[] => {
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

    const updated = [...currentLogs, nextLog];
    setLogs(updated);
    saveToLocalStorage('pm_logs', updated);
    return updated;
  };

  const handleAddMilitarIndividual = (militar: Militar) => {
    const updated = [...militares, militar];
    setMilitares(updated);
    saveToLocalStorage('pm_militares', updated);
    appendAuditLog(
      'INTEGRALIZAÇÃO',
      `Militar ${militar.nomeGuerra} adicionado à base de dados.`,
      loggedUser?.nomeGuerra || 'SISTEMA',
      logs
    );
  };

  const handleDeleteMilitar = (id: string) => {
    const updated = militares.filter(m => m.id !== id);
    setMilitares(updated);
    saveToLocalStorage('pm_militares', updated);
    appendAuditLog(
      'INTEGRALIZAÇÃO',
      `Militar com ID ${id} removido da base de dados.`,
      loggedUser?.nomeGuerra || 'SISTEMA',
      logs
    );
  };

  const handleToggleBiometria = (id: string) => {
    const updated = militares.map(m => {
      if (m.id === id) {
        return { ...m, biometriaAtiva: !m.biometriaAtiva };
      }
      return m;
    });
    setMilitares(updated);
    saveToLocalStorage('pm_militares', updated);
  };

  const handleUpdateMilitarNomeGuerra = (id: string, newNome: string) => {
    const updated = militares.map(m => {
      if (m.id === id) {
        return { 
          ...m, 
          nomeGuerra: newNome, 
          nome: newNome.replace(/^(Sgto\.|Ten\.|Cb\.|Sd\.)\s*/i, '') 
        };
      }
      return m;
    });
    setMilitares(updated);
    saveToLocalStorage('pm_militares', updated);
  };

  const handleUpdateMilitarMF = (id: string, newMF: string) => {
    const updated = militares.map(m => {
      if (m.id === id) {
        return { 
          ...m, 
          matriculaFuncional: newMF 
        };
      }
      return m;
    });
    setMilitares(updated);
    saveToLocalStorage('pm_militares', updated);
  };

  const handleUpdateMilitarNumero = (id: string, numero: string) => {
    const updated = militares.map(m => {
      if (m.id === id) {
        return { 
          ...m, 
          numero 
        };
      }
      return m;
    });
    setMilitares(updated);
    saveToLocalStorage('pm_militares', updated);
  };

  const handleUpdateMilitarPin = (id: string, newPin: string) => {
    const updated = militares.map(m => {
      if (m.id === id) {
        return { 
          ...m, 
          pinSegurança: newPin 
        };
      }
      return m;
    });
    setMilitares(updated);
    saveToLocalStorage('pm_militares', updated);
    appendAuditLog(
      'INTEGRALIZAÇÃO',
      `Militar ID ${id} atualizou seu token / PIN de segurança criptográfica pessoal com sucesso.`,
      loggedUser?.nomeGuerra || 'SISTEMA',
      logs
    );
  };

  const handleUpdateMilitarRole = (id: string, role: Role) => {
    const updated = militares.map(m => {
      if (m.id === id) {
        return { ...m, role: role };
      }
      return m;
    });
    setMilitares(updated);
    saveToLocalStorage('pm_militares', updated);
    appendAuditLog(
      'INTEGRALIZAÇÃO',
      `Papel do militar ${id} alterado para ${role}.`,
      loggedUser?.nomeGuerra || 'SISTEMA',
      logs
    );
  };

  const handleImportMilitaresJSON = (imported: Militar[]) => {
    setMilitares(imported);
    saveToLocalStorage('pm_militares', imported);
    if (imported.length > 0 && !imported.some(m => m.id === selectedMilitarId)) {
      setSelectedMilitarId(imported[0].id);
      setIsLoggedIn(false);
    }
    appendAuditLog(
      'INTEGRALIZAÇÃO',
      `Base de dados de militares atualizada por importação (.JSON) com sucesso (${imported.length} militares carregados).`,
      loggedUser?.nomeGuerra || 'SISTEMA',
      logs
    );
  };

  // SEND MESSAGE PROCESS
  const handleSendMessage = (paraMilitarId: string, conteudo: string) => {
    const freshMessage: ChatMessage = {
      id: `C-${Date.now()}`,
      deMilitarId: loggedUser.id,
      paraMilitarId,
      conteudo,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      criptografada: true,
      chaveCripto: `AES-GCM-AUTO-SIG-${loggedUser.nomeGuerra.toUpperCase()}`
    };

    const updatedMsgs = [...messages, freshMessage];
    setMessages(updatedMsgs);
    saveToLocalStorage('pm_messages', updatedMsgs);

    // Append security logging
    const recipient = militares.find((m) => m.id === paraMilitarId)?.nomeGuerra || 'Auxiliar';
    appendAuditLog(
      'INTEGRALIZAÇÃO',
      `Transmissão de texto plano criptografada com sucesso de ${loggedUser.nomeGuerra} para ${recipient}. Protocolo seguro ativado.`,
      loggedUser.nomeGuerra,
      logs
    );
  };

  // CREATE NEW SERVICE SWAP
  const handleCreatePermuta = (novaPermuta: Permuta) => {
    const updatedPermutas = [novaPermuta, ...permutas];
    setPermutas(updatedPermutas);
    saveToLocalStorage('pm_permutas', updatedPermutas);

    // Logging blockchain
    const nextLogs = appendAuditLog(
      'PERMUTA_CRIADA',
      `Permuta criada para posto [${novaPermuta.postoServico}] de ${loggedUser.nomeGuerra}. Assinado digitalmente sob protocolo ${novaPermuta.protocoloId}.`,
      loggedUser.nomeGuerra,
      logs
    );

    // Send automated chat message to recipient to verify!
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
      
      const newChats = [...messages, automatedMsg];
      setMessages(newChats);
      saveToLocalStorage('pm_messages', newChats);
    }

    setActiveSwapScale(null);
    setCurrentTab('PERMUTAS');
  };

  // PEER ACCEPTS OR REJECTS SWAP REQUEST
  const handleAcceptPermuta = (permutaId: string, peerSignature: string) => {
    const updated = permutas.map((p) => {
      if (p.id === permutaId) {
        return {
          ...p,
          status: 'PENDENTE_GESTOR' as const,
          assinaturaSubstituta: peerSignature
        };
      }
      return p;
    });

    setPermutas(updated);
    saveToLocalStorage('pm_permutas', updated);

    appendAuditLog(
      'PERMUTA_ACEITA',
      `Sgt. Mendes assinou digitalmente aceitando a permuta ref. protocolo ${permutas.find(p => p.id === permutaId)?.protocoloId}. Encaminhado ao conselho operacional.`,
      loggedUser.nomeGuerra,
      logs
    );

    setActiveReviewPermuta(null);
    setCurrentTab('PERMUTAS');
  };

  const handleDeclinePermuta = (permutaId: string) => {
    const updated = permutas.map((p) => {
      if (p.id === permutaId) {
        return {
          ...p,
          status: 'REJEITADO_SUBSTITUTO' as const
        };
      }
      return p;
    });

    setPermutas(updated);
    saveToLocalStorage('pm_permutas', updated);

    appendAuditLog(
      'INTEGRALIZAÇÃO',
      `Solicitação de permuta cancelada/rejeitada pelo militar substituto. Protocolo suspenso.`,
      loggedUser.nomeGuerra,
      logs
    );

    setActiveReviewPermuta(null);
    setCurrentTab('PERMUTAS');
  };

  const handleRequestAlteration = (permutaId: string, comentario: string) => {
    const updated = permutas.map((p) => {
      if (p.id === permutaId) {
        return {
          ...p,
          status: 'ALTERACAO_SOLICITADA' as const,
          comentarioAlteracao: comentario
        };
      }
      return p;
    });

    setPermutas(updated);
    saveToLocalStorage('pm_permutas', updated);

    appendAuditLog(
      'INTEGRALIZAÇÃO',
      `Proposta de alteração de escala retransmitida com considerações operacionais: "${comentario.slice(0, 45)}...".`,
      loggedUser.nomeGuerra,
      logs
    );

    setActiveReviewPermuta(null);
    setCurrentTab('PERMUTAS');
  };

  // OFFICERS HANDLES MAJOR VALIDATIONS (APROVADO / REJEITADO)
  const handleApprovePermutaGestor = (permutaId: string, gestorNome: string, gestorSignature: string) => {
    if (loggedUser.role !== 'COMANDANTE' && loggedUser.role !== 'ADMIN') {
      alert('Acesso negado: Apenas Comandantes podem homologar permutas.');
      return;
    }
    const targetPermuta = permutas.find(p => p.id === permutaId);
    if (!targetPermuta) return;

    // 1. Mark swap process as APROVADO
    const updatedPermutas = permutas.map((p) => {
      if (p.id === permutaId) {
        return {
          ...p,
          status: 'APROVADO' as const,
          assinaturaGestor: gestorSignature,
          gestorNome,
          dataAssinaturaGestor: new Date().toISOString().replace('T', ' ').slice(0, 16)
        };
      }
      return p;
    });
    setPermutas(updatedPermutas);
    saveToLocalStorage('pm_permutas', updatedPermutas);

    // 2. SWAP THE SCALE DUTY OWNER!
    // Scale must point to Substitute military instead of Substituted
    const updatedEscalas = escalas.map((esc) => {
      if (esc.id === targetPermuta.escalaSubstituidaId) {
        return {
          ...esc,
          militarId: targetPermuta.militarSubstitutoId // Mendes assume the shift!
        };
      }
      return esc;
    });
    setEscalas(updatedEscalas);
    saveToLocalStorage('pm_escalas', updatedEscalas);

    // 3. Log into blockchain ledger
    appendAuditLog(
      'PROCESSO_APROVADO',
      `Homologação oficial ativada pelo Tenente Bastos para protocolo ${targetPermuta.protocoloId}. Escala atualizada. Vias digitais autenticadas.`,
      gestorNome,
      logs
    );
  };

  const handleRejectPermutaGestor = (permutaId: string) => {
    const targetPermuta = permutas.find(p => p.id === permutaId);
    if (!targetPermuta) return;

    const updatedPermutas = permutas.map((p) => {
      if (p.id === permutaId) {
        return {
          ...p,
          status: 'REJEITADO' as const,
          gestorNome: loggedUser.nomeGuerra,
          dataAssinaturaGestor: new Date().toISOString().replace('T', ' ').slice(0, 16)
        };
      }
      return p;
    });
    setPermutas(updatedPermutas);
    saveToLocalStorage('pm_permutas', updatedPermutas);

    appendAuditLog(
      'PROCESSO_REJEITADO',
      `Permuta ID ${targetPermuta.protocoloId} rejeitada administrativamente pelo Comando de Batalhão.`,
      loggedUser.nomeGuerra,
      logs
    );
  };

  const handleAdjustPermutaGestor = (permutaId: string, justificativa: string) => {
    const targetPermuta = permutas.find(p => p.id === permutaId);
    if (!targetPermuta) return;

    const updatedPermutas = permutas.map((p) => {
      if (p.id === permutaId) {
        return {
          ...p,
          status: 'AJUSTE_GESTOR' as const,
          comentarioAlteracao: justificativa,
          gestorNome: loggedUser.nomeGuerra,
          dataAssinaturaGestor: new Date().toISOString().replace('T', ' ').slice(0, 16)
        };
      }
      return p;
    });
    setPermutas(updatedPermutas);
    saveToLocalStorage('pm_permutas', updatedPermutas);

    appendAuditLog(
      'INTEGRALIZAÇÃO',
      `O Comando devolveu a escala ${targetPermuta.protocoloId} solicitando correções: "${justificativa.slice(0, 45)}...".`,
      loggedUser.nomeGuerra,
      logs
    );
  };

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
          <div className="absolute top-8 right-4 z-40">
            <button
              onClick={() => setIsLoggedIn(true)}
              className="text-[9px] font-mono text-cyber-green bg-cyber-green/10 border border-cyber-green/30 hover:bg-cyber-green/20 px-2 py-1 rounded transition-all flex items-center space-x-1"
              id="bypass-login-btn"
            >
              <ShieldCheck className="w-3 h-3 text-cyber-green" />
              <span>ACESSO DIRETO</span>
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
                  />
                )}

                {currentTab === 'PERMUTAS' && (
                  <div className="p-4 space-y-4 pb-12">
                    {/* MY PERMUTAS ACTIVE TIMELINE */}
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center font-sans">
                        <History className="w-4 h-4 text-cyber-blue mr-1.5" />
                        Minhas Solicitações de Troca
                      </h3>

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
                    {loggedUser.id === 'M-ADMIN-1' ? (
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
                        onUpdateMilitarRole={handleUpdateMilitarRole}
                        onUpdateMilitarMF={handleUpdateMilitarMF}
                        onUpdateMilitarNumero={handleUpdateMilitarNumero}
                        onUserSwitch={handleUserChange}
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
                            handleUserChange('M-ADMIN-1');
                            alert('Acesso tático renegociado: Conectado como 1ºSgt Nobrega (Administrador do Comando).');
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
