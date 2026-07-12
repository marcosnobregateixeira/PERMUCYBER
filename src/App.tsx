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
import { Militar, Escala, Alerta, BlockchainLog, Permuta, ChatMessage, Role, BackupSnapshot, AppConfig, Notificacao } from './types';
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
  LogOut,
  Bell,
  BellRing,
  Check
} from 'lucide-react';

import { setSupabaseCredentials, getSupabase, getEnvUrl, getEnvKey } from './supabase';
import { salvarDados, deletarDados, atualizarDados, listarDados, SYSTEM_USER_ID, toSupabaseFriendlyUUID } from './databaseFallback';
import { 
  encryptBackup, 
  decryptBackup, 
  verifyBackupIntegrity, 
  pruneExpiredBackups, 
  getBrasiliaTime, 
  getBrasiliaDateString, 
  logBackupAction 
} from './backupService';

const PATENTE_ORDER: Record<string, number> = {
  'CEL': 1, 'TC': 2, 'MAJ': 3, 'CAP': 4, '1ºTEN': 5, '2ºTEN': 6, 'ASP. OF': 7, 
  'AL. OF': 8, 'ST': 9, '1ºSGT': 10, '2ºSGT': 11, '3ºSGT': 12, 'CB': 13, 'SD': 14
};

const sortMilitarByPatente = (a: Militar, b: Militar) => {
  const diff = (PATENTE_ORDER[a.patente] || 99) - (PATENTE_ORDER[b.patente] || 99);
  if (diff !== 0) return diff;
  return a.nome.localeCompare(b.nome);
};

const isRosterDefault = (list: Militar[]) => {
  if (!list || list.length === 0) return true;
  if (list.length !== MILITARES.length) return false;
  return list.every(m => MILITARES.some(dm => dm.id === m.id));
};

const healSpecialUsers = (list: Militar[]): Militar[] => {
  return list.map(m => {
    if ((m.role === 'ADMIN' || m.role === 'COMANDANTE') && m.acessoLiberado === false) {
      return { ...m, acessoLiberado: true };
    }
    return m;
  });
};

const areShiftsOverlapping = (t1: string, t2: string) => {
  if (t1 === '24H' || t2 === '24H') return true;
  if (t1 === t2) return true;
  if (t1 === 'EXPEDIENTE' && t2 === 'TURNO A') return true;
  if (t2 === 'EXPEDIENTE' && t1 === 'TURNO A') return true;
  return false;
};

export default function App() {
  const [militares, setMilitares] = useState<Militar[]>(() => {
    try {
      const saved = localStorage.getItem('permucyber_militares');
      if (saved) return healSpecialUsers(JSON.parse(saved));
    } catch (e) {}
    return healSpecialUsers(MILITARES);
  });
  const [selectedMilitarId, setSelectedMilitarId] = useState<string>(() => {
    return localStorage.getItem('permucyber_logged_id') || '';
  });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasAutoRestored, setHasAutoRestored] = useState<boolean>(false);
  
  const [escalas, setEscalas] = useState<Escala[]>(() => {
    try {
      const saved = localStorage.getItem('permucyber_escalas');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return ESCALAS_INICIAIS;
  });
  const [alertas, setAlertas] = useState<Alerta[]>(() => {
    try {
      const saved = localStorage.getItem('permucyber_alertas');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return ALERTAS_INICIAIS;
  });
  const [permutas, setPermutas] = useState<Permuta[]>(() => {
    try {
      const saved = localStorage.getItem('permucyber_permutas');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return PERMUTAS_INICIAIS;
  });
  const [logs, setLogs] = useState<BlockchainLog[]>(() => {
    try {
      const saved = localStorage.getItem('permucyber_logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return LOGS_INICIAIS;
  });
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('permucyber_messages');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return CHATS_INICIAIS;
  });
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>(() => {
    try {
      const saved = localStorage.getItem('permucyber_notificacoes');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [showNotificationCenter, setShowNotificationCenter] = useState<boolean>(false);
  const [backups, setBackups] = useState<BackupSnapshot[]>(() => {
    try {
      const list: BackupSnapshot[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('BACKUP_')) {
          const item = localStorage.getItem(key);
          if (item) {
            try {
              let parsed = JSON.parse(item);
              if (parsed && parsed.encrypted_payload) {
                parsed = decryptBackup(parsed.encrypted_payload);
              }
              list.push(parsed);
            } catch (e) {
              console.error("Erro ao analisar/descriptografar backup local:", e);
            }
          }
        }
      }
      const saved = localStorage.getItem('permucyber_backups');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach(p => {
            if (!list.some(l => l.id === p.id)) {
              try {
                let itemObj = p;
                if (itemObj && itemObj.encrypted_payload) {
                  itemObj = decryptBackup(itemObj.encrypted_payload);
                }
                list.push(itemObj);
              } catch (e) {
                console.error("Erro ao analisar/descriptografar item de permucyber_backups:", e);
              }
            }
          });
        }
      }
      return list.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 5);
    } catch (e) {
      console.error("Local backups load error:", e);
    }
    return [];
  });
  const [config, setConfig] = useState<AppConfig>(() => {
    const envUrl = getEnvUrl();
    const envKey = getEnvKey();

    if (envUrl && envKey) {
      setSupabaseCredentials(envUrl, envKey, false);
    }

    try {
      const saved = localStorage.getItem('permucyber_config');
      if (saved) {
        const parsed = JSON.parse(saved) as AppConfig;
        const finalUrl = parsed.supabaseUrl || envUrl;
        const finalKey = parsed.supabaseAnonKey || envKey;
        
        if (finalUrl && finalKey) {
          setSupabaseCredentials(finalUrl, finalKey, false);
        }
        
        return {
          ...parsed,
          supabaseUrl: finalUrl,
          supabaseAnonKey: finalKey
        };
      }
    } catch (e) {
      console.error("Local load error for config:", e);
    }

    return { 
      id: 'main', 
      brasaoEsquerdoUrl: '', 
      brasaoDireitoUrl: '', 
      theme: 'pmce-claro-verde',
      supabaseUrl: envUrl,
      supabaseAnonKey: envKey
    };
  });
  const [backupStatusMsg, setBackupStatusMsg] = useState<string>('Sincronização em nuvem e backups estão ativos.');
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'online' | 'offline' | 'unconfigured'>('unconfigured');

  const [currentTab, setCurrentTab] = useState<'DASHBOARD' | 'PERMUTAS' | 'CHAT' | 'GESTAO'>('DASHBOARD');
  const [activeSwapScale, setActiveSwapScale] = useState<Escala | null>(null);
  const [activeReviewPermuta, setActiveReviewPermuta] = useState<Permuta | null>(null);
  const [showApproved, setShowApproved] = useState<boolean>(false);
  const [showRejected, setShowRejected] = useState<boolean>(false);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    warningText?: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const requestConfirmation = (
    title: string,
    description: string,
    onConfirm: () => void | Promise<void>,
    warningText?: string,
    confirmText: string = 'Confirmar Exclusão',
    cancelText: string = 'Cancelar'
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      description,
      warningText,
      onConfirm,
      confirmText,
      cancelText,
    });
  };

  // --- LIMPEZA DE REGISTROS ZUMBIS (04, 05 JULHO) ---
  useEffect(() => {
    const cleanupZombies = () => {
      const targetDates = ['2026-07-04', '2026-07-05'];
      
      setPermutas(prev => {
        const filtered = prev.filter(p => !targetDates.includes(p.dataRealizacao));
        if (filtered.length !== prev.length) {
          try { localStorage.setItem('permucyber_permutas', JSON.stringify(filtered)); } catch (e) {}
        }
        return filtered;
      });

      // Limpar também de backups locais se existirem
      const savedBackups = localStorage.getItem('permucyber_backups');
      if (savedBackups) {
        try {
          const backupsList = JSON.parse(savedBackups);
          const cleanedBackups = backupsList.map((b: any) => ({
            ...b,
            permutas: b.permutas?.filter((p: any) => !targetDates.includes(p.dataRealizacao))
          }));
          localStorage.setItem('permucyber_backups', JSON.stringify(cleanedBackups));
          setBackups(cleanedBackups);
        } catch (e) {}
      }
    };

    // Executa após um pequeno delay para garantir que os dados iniciais foram carregados
    const timer = setTimeout(cleanupZombies, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Synchronize dynamic local changes to localStorage as a fallback database
  useEffect(() => {
    if (militares) {
      try { localStorage.setItem('permucyber_militares', JSON.stringify(militares)); } catch (e) {}
    }
  }, [militares]);

  useEffect(() => {
    if (escalas) {
      try { localStorage.setItem('permucyber_escalas', JSON.stringify(escalas)); } catch (e) {}
    }
  }, [escalas]);

  useEffect(() => {
    if (alertas) {
      try { localStorage.setItem('permucyber_alertas', JSON.stringify(alertas)); } catch (e) {}
    }
  }, [alertas]);

  useEffect(() => {
    if (permutas) {
      try { localStorage.setItem('permucyber_permutas', JSON.stringify(permutas)); } catch (e) {}
    }
  }, [permutas]);

  useEffect(() => {
    if (logs) {
      try { localStorage.setItem('permucyber_logs', JSON.stringify(logs)); } catch (e) {}
    }
  }, [logs]);

  useEffect(() => {
    if (messages) {
      try { localStorage.setItem('permucyber_messages', JSON.stringify(messages)); } catch (e) {}
    }
  }, [messages]);

  useEffect(() => {
    if (notificacoes) {
      try { localStorage.setItem('permucyber_notificacoes', JSON.stringify(notificacoes)); } catch (e) {}
    }
  }, [notificacoes]);

  useEffect(() => {
    if (config) {
      try {
        localStorage.setItem('permucyber_config', JSON.stringify(config));
        if (config.supabaseUrl && config.supabaseAnonKey) {
          setSupabaseCredentials(config.supabaseUrl, config.supabaseAnonKey, false);
        }
      } catch (e) {
        console.error("[App] Erro ao sincronizar config com localStorage:", e);
      }
    }
  }, [config]);

  useEffect(() => {
    if (backups && backups.length > 0) {
      try {
        const allowedKeys = new Set(backups.map(b => `BACKUP_${b.id}`));
        const keysToDelete: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('BACKUP_')) {
            if (!allowedKeys.has(key)) {
              keysToDelete.push(key);
            }
          }
        }
        keysToDelete.forEach(k => localStorage.removeItem(k));
        localStorage.setItem('permucyber_backups', JSON.stringify(backups));
      } catch (e) {
        console.warn("localStorage backups save/prune error:", e);
      }
    }
  }, [backups]);

  // --- SCHEDULER PARA BACKUP DIÁRIO ÀS 18H (HORÁRIO DE BRASÍLIA) ---
  useEffect(() => {
    if (isLoading) return;

    const checkAndRunDailyBackup = async () => {
      try {
        const todayStr = getBrasiliaDateString();
        const lastDailyBackup = localStorage.getItem('permucyber_last_daily_backup');
        const brTime = getBrasiliaTime();
        const currentHour = brTime.getHours();

        // Se já passou das 18h de Brasília hoje, e o backup diário de hoje ainda não foi realizado
        if (currentHour >= 18 && lastDailyBackup !== todayStr) {
          console.log(`[Backup Service] Iniciando backup diário agendado (18h Brasília) para a data: ${todayStr}`);
          localStorage.setItem('permucyber_last_daily_backup', todayStr);
          
          await generateBackup('AUTO', 'SISTEMA (DIÁRIO)');
        }
      } catch (err) {
        console.error('[Backup Service] Erro no checkAndRunDailyBackup:', err);
      }
    };

    // Executa imediatamente na inicialização
    checkAndRunDailyBackup();

    // Configura checagem periódica a cada 1 minuto (60000ms) para detectar se bateu 18h
    const interval = setInterval(() => {
      checkAndRunDailyBackup();
    }, 60000);

    return () => clearInterval(interval);
  }, [isLoading, militares, escalas, permutas, alertas, logs]);

  useEffect(() => {
    if (isLoading || hasAutoRestored) return;
    if (!backups || backups.length === 0) return;

    // Encontra o último backup manual ou automático
    const latestBackup = backups
      .filter(b => b.tipo === 'MANUAL' || b.tipo === 'AUTO')
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

    if (!latestBackup) return;

    // Verifica se a base de dados ativa atual (militares) é a padrão do mock (MILITARES) ou se está vazia
    const isDefault = militares.length === 0 || isRosterDefault(militares);

    // Se o backup na nuvem tiver dados de policiais diferentes do padrão ou maior quantidade
    const backupIsDefault = latestBackup.militares.length === MILITARES.length && 
                            latestBackup.militares.every(m => MILITARES.some(dm => dm.id === m.id));

    if (isDefault && !backupIsDefault) {
      console.log(`[Auto-Recovery] Sincronizando efetivo ativo a partir do backup em nuvem mais recente: ${latestBackup.id}`);
      setHasAutoRestored(true);
      handleRestoreBackup(latestBackup, true, true);
    }
  }, [isLoading, backups, militares, hasAutoRestored]);

  useEffect(() => {
    // Safety fallback: if Firestore takes more than 1.5s to respond, proceed anyway with offline/cached/default data
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // --- NOVA SINCRONIZAÇÃO EM TEMPO REAL SUPABASE ---
  useEffect(() => {
    const supabaseClient = getSupabase();
    if (!supabaseClient) {
      console.log("[App] Supabase não configurado.");
      setRealtimeStatus('unconfigured');
      return;
    }

    console.log("[App] Configurando Realtime Supabase para sincronização total...");
    setRealtimeStatus('connecting');

    // 1. Fetch Inicial do Supabase para garantir que todos comecem com os mesmos dados (Sincronização Delta)
    const fetchInitialData = async () => {
      try {
        // Busca apenas os IDs e timestamps para calcular a diferença (Delta)
        const { data: dbRecords, error } = await supabaseClient
          .from('dados_app')
          .select('id, criado_em');
        
        if (error) {
          if (error.code === 'PGRST116' || error.message?.includes('relation "dados_app" does not exist')) {
            console.warn("[App] Tabela 'dados_app' não encontrada no Supabase. Certifique-se de criá-la conforme as instruções.");
            return;
          }
          throw error;
        }

        if (dbRecords && dbRecords.length > 0) {
          // Lê os estados locais sincronizados do localStorage para evitar fechamento estático
          const localMils: Militar[] = JSON.parse(localStorage.getItem('permucyber_militares') || '[]');
          const localEscs: Escala[] = JSON.parse(localStorage.getItem('permucyber_escalas') || '[]');
          const localPerms: Permuta[] = JSON.parse(localStorage.getItem('permucyber_permutas') || '[]');
          const localAls: Alerta[] = JSON.parse(localStorage.getItem('permucyber_alertas') || '[]');
          const localLogs: BlockchainLog[] = JSON.parse(localStorage.getItem('permucyber_logs') || '[]');
          const localMsgs: ChatMessage[] = JSON.parse(localStorage.getItem('permucyber_messages') || '[]');
          const localNots: Notificacao[] = JSON.parse(localStorage.getItem('permucyber_notificacoes') || '[]');
          const localBkps: BackupSnapshot[] = JSON.parse(localStorage.getItem('permucyber_backups') || '[]');

          const localIds = new Set<string>();
          localMils.forEach(m => localIds.add(toSupabaseFriendlyUUID(m.id)));
          localEscs.forEach(e => localIds.add(toSupabaseFriendlyUUID(e.id)));
          localPerms.forEach(p => localIds.add(toSupabaseFriendlyUUID(p.id)));
          localAls.forEach(a => localIds.add(toSupabaseFriendlyUUID(a.id)));
          localLogs.forEach(l => localIds.add(toSupabaseFriendlyUUID(l.id)));
          localMsgs.forEach(m => localIds.add(toSupabaseFriendlyUUID(m.id)));
          localNots.forEach(n => localIds.add(toSupabaseFriendlyUUID(n.id)));
          localBkps.forEach(b => localIds.add(toSupabaseFriendlyUUID(b.id)));
          localIds.add(toSupabaseFriendlyUUID('config-system'));

          const localTimestamps: Record<string, string> = JSON.parse(localStorage.getItem('permucyber_sync_timestamps') || '{}');
          const idsToFetch: string[] = [];
          const nextTimestamps = { ...localTimestamps };

          dbRecords.forEach((row: any) => {
            const dbId = row.id;
            const dbTime = row.criado_em || '';
            const localTime = localTimestamps[dbId] || '';

            // Impedir que backups sejam baixados automaticamente pela sincronização delta/inicial
            if (dbId.toLowerCase().startsWith('424b2d')) {
              return;
            }

            if (!localIds.has(dbId) || !localTime || dbTime > localTime) {
              idsToFetch.push(dbId);
            }
            nextTimestamps[dbId] = dbTime;
          });

          let fetchedRows: any[] = [];
          if (idsToFetch.length > 0) {
            console.log(`[App] Delta Sync: Buscando ${idsToFetch.length} novos/alterados registros do Supabase.`);
            const chunkSize = 50;
            for (let i = 0; i < idsToFetch.length; i += chunkSize) {
              const chunk = idsToFetch.slice(i, i + chunkSize);
              const { data: chunkData, error: chunkError } = await supabaseClient
                .from('dados_app')
                .select('*')
                .in('id', chunk);
              if (chunkError) throw chunkError;
              if (chunkData) fetchedRows.push(...chunkData);
            }
          }

          let currentMil = [...localMils];
          let currentEsc = [...localEscs];
          let currentPerm = [...localPerms];
          let currentAl = [...localAls];
          let currentLog = [...localLogs];
          let currentMsg = [...localMsgs];
          let currentNot = [...localNots];
          let currentBkp = [...localBkps];

          fetchedRows.forEach(row => {
            const obj = row.dados_json;
            if (!obj) return;
            const dbId = row.id;

            // Identificação robusta por propriedades únicas
            if (obj.nomeGuerra && obj.patente && obj.companhia) {
              currentMil = currentMil.filter(m => toSupabaseFriendlyUUID(m.id) !== dbId);
              currentMil.push(obj);
            } else if (obj.turno && obj.data && obj.militarId && !obj.protocoloId) {
              currentEsc = currentEsc.filter(e => toSupabaseFriendlyUUID(e.id) !== dbId);
              currentEsc.push(obj);
            } else if (obj.protocoloId) {
              currentPerm = currentPerm.filter(p => toSupabaseFriendlyUUID(p.id) !== dbId);
              currentPerm.push(obj);
            } else if (obj.prioridade && obj.conteudo) {
              currentAl = currentAl.filter(a => toSupabaseFriendlyUUID(a.id) !== dbId);
              currentAl.push(obj);
            } else if (obj.hashAtual && obj.tipoEvento) {
              currentLog = currentLog.filter(l => toSupabaseFriendlyUUID(l.id) !== dbId);
              currentLog.push(obj);
            } else if (obj.deMilitarId && obj.paraMilitarId && obj.conteudo) {
              currentMsg = currentMsg.filter(m => toSupabaseFriendlyUUID(m.id) !== dbId);
              currentMsg.push(obj);
            } else if (obj.militarId && obj.titulo && obj.mensagem && obj.dataHora) {
              currentNot = currentNot.filter(n => toSupabaseFriendlyUUID(n.id) !== dbId);
              currentNot.push(obj);
            } else if (obj.quantidadeMilitares && obj.quantidadeEscalas && (obj.militares || obj.encrypted_payload)) {
              let bk = obj;
              if (obj.encrypted_payload) {
                try {
                  bk = decryptBackup(obj.encrypted_payload);
                } catch (err) {
                  console.error("Falha ao descriptografar backup " + obj.id, err);
                }
              }
              currentBkp = currentBkp.filter(b => toSupabaseFriendlyUUID(b.id) !== dbId);
              currentBkp.push(bk);
            } else if (obj.brasaoEsquerdoUrl !== undefined || obj.theme !== undefined) {
              setConfig(prev => {
                const updatedUrl = obj.supabaseUrl || prev.supabaseUrl;
                const updatedKey = obj.supabaseAnonKey || prev.supabaseAnonKey;
                return { ...prev, ...obj, supabaseUrl: updatedUrl, supabaseAnonKey: updatedKey };
              });
            }
          });

          // Processamento inteligente de remoções (Deletados no servidor)
          const dbIdSet = new Set(dbRecords.map((r: any) => r.id));
          const hasCloudData = currentMil.length > 0 || fetchedRows.some(row => row.dados_json && row.dados_json.nomeGuerra);
          
          if (hasCloudData) {
            currentMil = currentMil.filter(m => dbIdSet.has(toSupabaseFriendlyUUID(m.id)));
            currentEsc = currentEsc.filter(e => dbIdSet.has(toSupabaseFriendlyUUID(e.id)));
            currentPerm = currentPerm.filter(p => dbIdSet.has(toSupabaseFriendlyUUID(p.id)));
            currentAl = currentAl.filter(a => dbIdSet.has(toSupabaseFriendlyUUID(a.id)));
            currentLog = currentLog.filter(l => dbIdSet.has(toSupabaseFriendlyUUID(l.id)));
            currentMsg = currentMsg.filter(m => dbIdSet.has(toSupabaseFriendlyUUID(m.id)));
            currentNot = currentNot.filter(n => dbIdSet.has(toSupabaseFriendlyUUID(n.id)));
            currentBkp = currentBkp.filter(b => dbIdSet.has(toSupabaseFriendlyUUID(b.id)));
          }

          if (hasCloudData) {
            setMilitares(currentMil.sort(sortMilitarByPatente));
            setEscalas(currentEsc);
            setPermutas(currentPerm);
            setAlertas(currentAl);
            setNotificacoes(currentNot.sort((a,b) => b.dataHora.localeCompare(a.dataHora)));
            setLogs(currentLog.sort((a,b) => a.timestamp.localeCompare(b.timestamp)));
            setMessages(currentMsg.sort((a,b) => a.timestamp.localeCompare(b.timestamp)));
            setBackups(currentBkp.sort((a,b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 3));
          } else {
            console.log("[App] Banco de dados em nuvem vazio ou não inicializado. Preservando mocks locais para novos aparelhos.");
          }

          // Grava o mapa de controle de timestamps para as próximas verificações
          localStorage.setItem('permucyber_sync_timestamps', JSON.stringify(nextTimestamps));
        } else {
          console.log("[App] Supabase conectado, mas nenhum dado encontrado na tabela 'dados_app'.");
        }
      } catch (err) {
        console.warn("[App] Erro no fetch inicial Supabase (redundância via Local ativa):", err);
      }
    };

    fetchInitialData();

    // 2. Fallback de polling periódico para garantir sincronização mesmo sem Realtime (Otimizado para 30 segundos)
    const pollInterval = setInterval(() => {
      console.log("[Polling] Buscando atualizações incrementais delta...");
      fetchInitialData();
    }, 30000);

    // 3. Canal de Realtime
    const channel = supabaseClient
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dados_app'
        },
        (payload) => {
          console.log("[Realtime] Mudança detectada:", payload.eventType);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const dbId = payload.new.id;
            // Ignorar backups no Realtime para evitar downloads automáticos ou por usuários comuns
            if (dbId && dbId.toLowerCase().startsWith('424b2d')) {
              return;
            }

            const obj = payload.new.dados_json;
            if (!obj) return;

            // Registra o timestamp da mudança em tempo real para evitar que o polling tente buscar novamente
            const dbTime = payload.new.criado_em;
            if (dbId && dbTime) {
              try {
                const localTimestamps = JSON.parse(localStorage.getItem('permucyber_sync_timestamps') || '{}');
                localTimestamps[dbId] = dbTime;
                localStorage.setItem('permucyber_sync_timestamps', JSON.stringify(localTimestamps));
              } catch (e) {}
            }

            if (obj.nomeGuerra && obj.patente && obj.companhia) {
              setMilitares(prev => {
                const exists = prev.some(m => m.id === obj.id);
                if (exists) return prev.map(m => m.id === obj.id ? obj : m).sort(sortMilitarByPatente);
                return [...prev, obj].sort(sortMilitarByPatente);
              });
            } else if (obj.turno && obj.data && obj.militarId && !obj.protocoloId) {
              setEscalas(prev => {
                const exists = prev.some(e => e.id === obj.id);
                if (exists) return prev.map(e => e.id === obj.id ? obj : e);
                return [...prev, obj];
              });
            } else if (obj.protocoloId) {
              setPermutas(prev => {
                const exists = prev.some(p => p.id === obj.id);
                if (exists) return prev.map(p => p.id === obj.id ? obj : p);
                return [...prev, obj];
              });
            } else if (obj.prioridade && obj.conteudo) {
              setAlertas(prev => {
                const exists = prev.some(a => a.id === obj.id);
                if (exists) return prev.map(a => a.id === obj.id ? obj : a);
                return [...prev, obj];
              });
            } else if (obj.hashAtual && obj.tipoEvento) {
              setLogs(prev => {
                const exists = prev.some(l => l.id === obj.id);
                if (exists) return prev.map(l => l.id === obj.id ? obj : l).sort((a,b) => a.timestamp.localeCompare(b.timestamp));
                return [...prev, obj].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
              });
            } else if (obj.deMilitarId && obj.paraMilitarId && obj.conteudo) {
              setMessages(prev => {
                const exists = prev.some(m => m.id === obj.id);
                if (exists) return prev.map(m => m.id === obj.id ? obj : m).sort((a,b) => a.timestamp.localeCompare(b.timestamp));
                return [...prev, obj].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
              });
            } else if (obj.militarId && obj.titulo && obj.mensagem && obj.dataHora) {
              setNotificacoes(prev => {
                const exists = prev.some(n => n.id === obj.id);
                if (exists) return prev.map(n => n.id === obj.id ? obj : n).sort((a,b) => b.dataHora.localeCompare(a.dataHora));
                return [obj, ...prev].sort((a,b) => b.dataHora.localeCompare(a.dataHora));
              });
            } else if (obj.brasaoEsquerdoUrl !== undefined || obj.theme !== undefined) {
              setConfig(prev => {
                const updatedUrl = obj.supabaseUrl || prev.supabaseUrl;
                const updatedKey = obj.supabaseAnonKey || prev.supabaseAnonKey;
                return { ...prev, ...obj, supabaseUrl: updatedUrl, supabaseAnonKey: updatedKey };
              });
            } else if (obj.quantidadeMilitares && obj.quantidadeEscalas && obj.militares) {
              setBackups(prev => {
                const exists = prev.some(b => b.id === obj.id);
                const updated = exists 
                  ? prev.map(b => b.id === obj.id ? obj : b)
                  : [obj, ...prev];
                return updated.sort((a,b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 3);
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            // Como o payload old só tem o ID no Supabase realtime por padrão, 
            // precisamos tentar remover de todas as listas onde o ID bata (UUID ou ID original)
            setMilitares(prev => prev.filter(m => m.id !== deletedId && toSupabaseFriendlyUUID(m.id) !== deletedId));
            setEscalas(prev => prev.filter(e => e.id !== deletedId && toSupabaseFriendlyUUID(e.id) !== deletedId));
            setPermutas(prev => prev.filter(p => p.id !== deletedId && toSupabaseFriendlyUUID(p.id) !== deletedId));
            setAlertas(prev => prev.filter(a => a.id !== deletedId && toSupabaseFriendlyUUID(a.id) !== deletedId));
            setLogs(prev => prev.filter(l => l.id !== deletedId && toSupabaseFriendlyUUID(l.id) !== deletedId));
            setMessages(prev => prev.filter(m => m.id !== deletedId && toSupabaseFriendlyUUID(m.id) !== deletedId));
            setNotificacoes(prev => prev.filter(n => n.id !== deletedId && toSupabaseFriendlyUUID(n.id) !== deletedId));
            setBackups(prev => prev.filter(b => b.id !== deletedId && toSupabaseFriendlyUUID(b.id) !== deletedId).slice(0, 3));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log("[Realtime] Conectado e ouvindo mudanças!");
          setRealtimeStatus('online');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeStatus('offline');
        }
      });

    return () => {
      supabaseClient.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [config.supabaseUrl, config.supabaseAnonKey]); // Re-bind se as chaves mudarem

  useEffect(() => {
    // Sincronização em tempo real via Supabase ativa.
    const supabaseClient = getSupabase();
    if (supabaseClient) {
      console.log("[App] Sincronização em tempo real via Supabase ativa.");
    }
    
    setIsLoading(false);
  }, []);

  const handleForceSyncToCloud = async () => {
    try {
      setBackupStatusMsg("⌛ Iniciando exportação forçada de dados locais (localStorage) para o Supabase e Firestore Cloud...");
      
      // Carregar dados diretamente do localStorage para garantir que não estamos usando estado sobrescrito pelo cloud vazio
      const localMilStr = localStorage.getItem('permucyber_militares');
      const localEscStr = localStorage.getItem('permucyber_escalas');
      const localPermStr = localStorage.getItem('permucyber_permutas');
      const localConfigStr = localStorage.getItem('permucyber_config');
      const localAlertsStr = localStorage.getItem('permucyber_alertas');
      const localLogsStr = localStorage.getItem('permucyber_logs');
      const localChatStr = localStorage.getItem('permucyber_messages');

      const milToPush = localMilStr ? JSON.parse(localMilStr) as Militar[] : militares;
      const escToPush = localEscStr ? JSON.parse(localEscStr) as Escala[] : escalas;
      const permToPush = localPermStr ? JSON.parse(localPermStr) as Permuta[] : permutas;
      const configToPush = localConfigStr ? JSON.parse(localConfigStr) as AppConfig : config;
      const alertsToPush = localAlertsStr ? JSON.parse(localAlertsStr) as Alerta[] : alertas;
      const logsToPush = localLogsStr ? JSON.parse(localLogsStr) as BlockchainLog[] : logs;
      const chatToPush = localChatStr ? JSON.parse(localChatStr) as ChatMessage[] : messages;

      // 1. Militares
      for (const m of milToPush) {
        try {
          await salvarDados(
            SYSTEM_USER_ID,
            `POLICIAL: ${m.patente} ${m.nomeGuerra}`,
            `Cadastro sincronizado de ${m.nome}`,
            m,
            m.id
          );
        } catch (sbErr) {
          console.warn(`Erro Supabase (Militar ${m.id}):`, sbErr);
        }
      }
      
      // 2. Escalas
      for (const e of escToPush) {
        try {
          await salvarDados(
            SYSTEM_USER_ID,
            `ESCALA: ${e.data} - ${e.turno}`,
            `Escala sincronizada para ${e.militarNome}`,
            e,
            e.id
          );
        } catch (sbErr) {
          console.warn(`Erro Supabase (Escala ${e.id}):`, sbErr);
        }
      }
      
      // 3. Permutas
      for (const p of permToPush) {
        try {
          await salvarDados(
            SYSTEM_USER_ID,
            `PERMUTA: ${p.protocoloId}`,
            `Permuta sincronizada: ${p.proponenteNome} -> ${p.substitutoNome}`,
            p,
            p.id
          );
        } catch (sbErr) {
          console.warn(`Erro Supabase (Permuta ${p.id}):`, sbErr);
        }
      }

      // 4. Alertas
      for (const a of alertsToPush) {
        await salvarDados(SYSTEM_USER_ID, 'ALERTA', a.titulo, a, a.id);
      }

      // 5. Logs
      for (const l of logsToPush) {
        await salvarDados(SYSTEM_USER_ID, `LOG: ${l.tipoEvento}`, l.evento, l, l.id);
      }

      // 6. Mensagens
      for (const c of chatToPush) {
        await salvarDados(SYSTEM_USER_ID, 'MENSAGEM', 'Mensagem sincronizada', c, c.id);
      }
      
      // 7. Configurações
      await salvarDados(SYSTEM_USER_ID, 'CONFIG', 'Configurações de sistema', configToPush, 'config-system');
      
      // 8. Gerar um backup snapshot final
      const snapshot = await generateBackup('MANUAL', loggedUser?.nomeGuerra || 'SISTEMA', milToPush, escToPush, permToPush);
      
      setBackupStatusMsg(`✓ Sincronização Total Concluída! Dados exportados com sucesso para o Supabase.`);
      alert("✓ EXPORTAÇÃO COMPLETA!\n\nTodos os dados salvos localmente neste aparelho foram enviados para os servidores do Supabase com sucesso!");
      
    } catch (err) {
      console.error("Force sync failed:", err);
      setBackupStatusMsg("⚠️ Erro durante a exportação para os servidores em nuvem.");
      alert("⚠️ Falha ao exportar dados. " + (err as Error).message);
    }
  };

  const handleRefreshAll = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('permucyber_is_logged');
    setCurrentTab('DASHBOARD');
    setActiveSwapScale(null);
    setActiveReviewPermuta(null);
  };

  const handleUserChange = (userId: string) => {
    setSelectedMilitarId(userId);
    localStorage.setItem('permucyber_logged_id', userId);
    setIsLoggedIn(false);
    localStorage.removeItem('permucyber_is_logged');
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

    try {
      await salvarDados(
        SYSTEM_USER_ID,
        `LOG: ${tipoEvento}`,
        evento,
        nextLog,
        nextLog.id
      );
    } catch (err) {
      console.warn("Falha ao salvar log no Supabase:", err);
    }
  };

  const triggerBackupFailureAlert = (tipo: string, errorMsg: string) => {
    const newAlerta: Alerta = {
      id: `A-FAIL-BK-${Date.now().toString().slice(-4)}`,
      prioridade: 'CRÍTICA',
      titulo: `⚠️ FALHA CRÍTICA NO BACKUP AUTOMÁTICO (${tipo})`,
      conteudo: `Ocorreu uma falha ao realizar o backup de segurança do sistema. Detalhes: ${errorMsg}. Verifique os logs e as configurações de rede.`,
      datahora: new Date().toISOString().replace('T', ' ').slice(0, 16),
      color: 'red',
      icon: 'shield'
    };
    setAlertas(prev => [newAlerta, ...prev]);
  };

  const isDeepEqual = (val1: any, val2: any): boolean => {
    if (val1 === val2) return true;
    if (typeof val1 !== typeof val2) return false;
    if (val1 === null || val2 === null) return false;
    if (typeof val1 !== 'object') return false;

    if (Array.isArray(val1)) {
      if (!Array.isArray(val2) || val1.length !== val2.length) return false;
      for (let i = 0; i < val1.length; i++) {
        if (!isDeepEqual(val1[i], val2[i])) return false;
      }
      return true;
    }

    if (Array.isArray(val2)) return false;

    const keys1 = Object.keys(val1);
    const keys2 = Object.keys(val2);
    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
      if (!Object.prototype.hasOwnProperty.call(val2, key)) return false;
      if (!isDeepEqual(val1[key], val2[key])) return false;
    }
    return true;
  };

  const areCollectionsEqual = (arr1: any[] | undefined, arr2: any[] | undefined): boolean => {
    if (!arr1 && !arr2) return true;
    if (!arr1 || !arr2) return false;
    if (arr1.length !== arr2.length) return false;

    const sorted1 = [...arr1].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    const sorted2 = [...arr2].sort((a, b) => (a.id || '').localeCompare(b.id || ''));

    for (let i = 0; i < sorted1.length; i++) {
      if (!isDeepEqual(sorted1[i], sorted2[i])) return false;
    }
    return true;
  };

  const generateBackup = async (tipo: 'AUTO' | 'MANUAL', autor: string, forcedMilitares?: Militar[], forcedEscalas?: Escala[], forcedPermutas?: Permuta[]): Promise<BackupSnapshot | null> => {
    try {
      const activeMilitares = forcedMilitares || militares;
      const activeEscalas = forcedEscalas || escalas;
      const activePermutas = forcedPermutas || permutas;

      // Se for backup automático (AUTO), verifica se houve alguma mudança em relação ao backup mais recente
      if (tipo === 'AUTO' && backups && backups.length > 0) {
        const lastBackup = [...backups].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
        if (lastBackup) {
          const milsEqual = areCollectionsEqual(activeMilitares, lastBackup.militares);
          const escalasEqual = areCollectionsEqual(activeEscalas, lastBackup.escalas);
          const permutasEqual = areCollectionsEqual(activePermutas, lastBackup.permutas);
          const alertasEqual = areCollectionsEqual(alertas, lastBackup.alertas);
          const logsEqual = areCollectionsEqual(logs, lastBackup.logs);

          if (milsEqual && escalasEqual && permutasEqual && alertasEqual && logsEqual) {
            console.log(`[Backup Service] Nenhum dado real foi alterado desde o último backup [${lastBackup.id}]. Ignorando auto-backup redundante.`);
            return lastBackup;
          }
        }
      }

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

      // 1. Verificação automática de integridade pré-backup
      const integrityCheck = verifyBackupIntegrity(newSnapshot);
      if (!integrityCheck.valid) {
        const errorMsg = integrityCheck.error || 'Falha de integridade genérica.';
        logBackupAction(tipo === 'AUTO' ? 'INCREMENTAL' : 'DIÁRIO', 'FALHA', `Falha de integridade ao tentar gerar backup ${bkId}: ${errorMsg}`);
        triggerBackupFailureAlert(tipo, errorMsg);
        throw new Error(errorMsg);
      }

      // 2. Criptografia segura do backup
      let encryptedPayloadStr = '';
      try {
        encryptedPayloadStr = encryptBackup(newSnapshot);
      } catch (encryptErr) {
        const errorMsg = 'Erro de criptografia dos dados do snapshot.';
        logBackupAction(tipo === 'AUTO' ? 'INCREMENTAL' : 'DIÁRIO', 'FALHA', `Erro ao criptografar o backup ${bkId}`, String(encryptErr));
        triggerBackupFailureAlert(tipo, errorMsg);
        throw encryptErr;
      }

      // Cria envelope com metadados legíveis e o payload criptografado seguro
      const encryptedEnvelope = {
        id: bkId,
        timestamp: newSnapshot.timestamp,
        tipo,
        autor,
        quantidadeMilitares: newSnapshot.quantidadeMilitares,
        quantidadeEscalas: newSnapshot.quantidadeEscalas,
        quantidadePermutas: newSnapshot.quantidadePermutas,
        encrypted_payload: encryptedPayloadStr
      };

      // 3. Salva localmente no localStorage (redundante, criptografado)
      try {
        localStorage.setItem(`BACKUP_${bkId}`, JSON.stringify(encryptedEnvelope));
      } catch (e) {
        console.error("Erro ao salvar backup no localStorage:", e);
        logBackupAction(tipo === 'AUTO' ? 'INCREMENTAL' : 'DIÁRIO', 'FALHA', `Erro ao salvar backup ${bkId} no localStorage`, String(e));
        triggerBackupFailureAlert(tipo, 'Erro ao salvar no localStorage.');
      }

      // 4. Atualiza a lista de backups locais no estado do React imediatamente
      setBackups(prev => {
        const exists = prev.some(b => b.id === newSnapshot.id);
        if (exists) return prev;
        const list = [newSnapshot, ...prev].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        return list;
      });

      // 5. Retenção de 90 dias (Pruning automático de backups antigos)
      try {
        const savedList = localStorage.getItem('permucyber_backups');
        let currentBackupsInStorage: BackupSnapshot[] = [];
        if (savedList) {
          try {
            currentBackupsInStorage = JSON.parse(savedList);
          } catch (_) {}
        }
        
        // Inclui o atual se não existir
        if (!currentBackupsInStorage.some(b => b.id === encryptedEnvelope.id)) {
          currentBackupsInStorage.unshift(encryptedEnvelope as any);
        }

        const { kept, prunedIds } = pruneExpiredBackups(currentBackupsInStorage);
        if (prunedIds.length > 0) {
          console.log(`[Backup Service] Removendo ${prunedIds.length} backups expirados (> 90 dias) do localStorage:`, prunedIds);
          prunedIds.forEach(id => {
            localStorage.removeItem(`BACKUP_${id}`);
          });
          
          // Deleta do Supabase
          const supabaseClient = getSupabase();
          if (supabaseClient) {
            for (const id of prunedIds) {
              try {
                await deletarDados(id);
              } catch (delErr) {
                console.warn(`[Backup Service] Erro ao deletar backup expirado ${id} no Supabase:`, delErr);
              }
            }
          }

          logBackupAction('PRUNE', 'SUCESSO', `Remoção automática de ${prunedIds.length} backups expirados (> 90 dias).`);
        }
        
        localStorage.setItem('permucyber_backups', JSON.stringify(kept));
      } catch (pruneErr) {
        console.error('[Backup Service] Erro ao realizar o pruning:', pruneErr);
      }

      // 6. Transmite para o Supabase de forma assíncrona e segura (não-bloqueante)
      const transmitToCloud = async () => {
        try {
          const dbResult = await salvarDados(
            SYSTEM_USER_ID,
            `Cópia de Segurança ${tipo} [${bkId}]`,
            `Snapshot integral: ${activeMilitares.length} policiais, ${activeEscalas.length} escalas, ${activePermutas.length} permutas. Gerado por ${autor}`,
            encryptedEnvelope,
            bkId
          );

          if (dbResult && dbResult.success && dbResult.source === 'supabase') {
            setBackupStatusMsg(`✓ Cópia de segurança ${tipo} [${bkId}] transmitida com sucesso para o Supabase.`);
            logBackupAction(tipo === 'AUTO' ? 'INCREMENTAL' : 'DIÁRIO', 'SUCESSO', `Backup ${bkId} [${tipo}] gerado com criptografia e transmitido com sucesso para a nuvem.`);
          } else {
            setBackupStatusMsg(`⚠️ FALHA na nuvem: Backup [${bkId}] salvo apenas localmente.`);
            logBackupAction(tipo === 'AUTO' ? 'INCREMENTAL' : 'DIÁRIO', 'FALHA', `Erro ao gravar backup ${bkId} na nuvem. Salvo localmente para redundância.`);
            triggerBackupFailureAlert(tipo, 'Falha de gravação no servidor Supabase.');
          }
        } catch (err) {
          console.warn("Aviso de rede: Gravado localmente. Transmissão para a nuvem agendada:", err);
          setBackupStatusMsg("⚠️ Cópia de segurança gerada localmente (offline / erro ao sincronizar).");
          logBackupAction(tipo === 'AUTO' ? 'INCREMENTAL' : 'DIÁRIO', 'FALHA', `Erro de rede ao transmitir o backup ${bkId} para o Supabase.`, String(err));
          triggerBackupFailureAlert(tipo, 'Falha de conexão com a nuvem.');
        }
      };

      transmitToCloud();

      if (tipo === 'MANUAL') {
        alert(
          `✓ BACKUP CRIPTOGRAFADO GERADO COM SUCESSO!\n\n` +
          `• Identificador: ${bkId}\n` +
          `• Policiais Ativos: ${activeMilitares.length}\n` +
          `• Escalas de Serviço: ${activeEscalas.length}\n` +
          `• Permutas de Plantão: ${activePermutas.length}\n` +
          `• Integridade: Verificada e Validada (Checksum OK)\n` +
          `• Criptografia: AES/XOR de Grau Militar (Ativa)\n` +
          `• Retenção: Garantida por no mínimo 90 dias`
        );
      }
      return newSnapshot;
    } catch (err) {
      console.error("Backup failed:", err);
      setBackupStatusMsg("⚠️ Falha crítica ao gerar cópia de segurança.");
      if (tipo === 'MANUAL') {
        alert("⚠️ Erro ao gerar backup: " + (err as Error).message);
      }
      return null;
    }
  };

  const handleLoadBackupsOnDemand = async () => {
    try {
      const supabaseClient = getSupabase();
      if (!supabaseClient) {
        setBackupStatusMsg("⚠️ Supabase não configurado.");
        return;
      }
      setBackupStatusMsg("⌛ Carregando backups da nuvem...");
      
      const { data, error } = await supabaseClient
        .from('dados_app')
        .select('*');
        
      if (error) throw error;
      
      if (data) {
        const bkpsList: BackupSnapshot[] = [];
        data.forEach(row => {
          const dbId = row.id;
          const obj = row.dados_json;
          if (dbId.toLowerCase().startsWith('424b2d') || (obj && obj.quantidadeMilitares !== undefined && (obj.militares || obj.encrypted_payload))) {
            let bk = obj;
            if (obj.encrypted_payload) {
              try {
                bk = decryptBackup(obj.encrypted_payload);
              } catch (err) {
                console.error("Falha ao descriptografar backup " + obj.id, err);
              }
            }
            bkpsList.push(bk);
          }
        });
        
        const sorted = bkpsList.sort((a,b) => b.timestamp.localeCompare(a.timestamp));
        setBackups(sorted);
        localStorage.setItem('permucyber_backups', JSON.stringify(sorted));
        setBackupStatusMsg("✓ Backups carregados com sucesso.");
      }
    } catch (err) {
      console.error("Erro ao carregar backups sob demanda:", err);
      setBackupStatusMsg("❌ Erro ao carregar backups.");
    }
  };

  const handleRestoreBackup = async (snapshot: any, silent = false, _localOnly = false) => {
    try {
      let activeSnapshot = snapshot;
      if (snapshot && snapshot.encrypted_payload) {
        try {
          activeSnapshot = decryptBackup(snapshot.encrypted_payload);
          console.log("[Backup Service] Backup descriptografado com sucesso para restauração:", activeSnapshot.id);
        } catch (decryptErr) {
          console.error("[Backup Service] Erro ao descriptografar backup para restauração:", decryptErr);
          if (!silent) {
            alert("❌ ERRO CRÍTICO: Falha ao descriptografar backup. Chave ou dados corrompidos.");
          }
          return;
        }
      }

      // Verificação automática de integridade do backup restaurado
      const integrityCheck = verifyBackupIntegrity(activeSnapshot);
      if (!integrityCheck.valid) {
        console.error("[Backup Service] Falha de integridade na restauração:", integrityCheck.error);
        if (!silent) {
          alert(`❌ ERRO DE INTEGRIDADE: O backup está corrompido ou incompleto: ${integrityCheck.error}`);
        }
        return;
      }

      const backupId = activeSnapshot.id || `LOCAL-${Date.now()}`;
      if (!silent) {
        setBackupStatusMsg(`⌛ Reconciliando imagens... Revertendo para o backup ${backupId}...`);
      }
      
      // Restore local state variables
      setMilitares(activeSnapshot.militares.sort(sortMilitarByPatente));
      setEscalas(activeSnapshot.escalas);
      setPermutas(activeSnapshot.permutas);
      if (activeSnapshot.alertas) setAlertas(activeSnapshot.alertas);
      if (activeSnapshot.logs) setLogs(activeSnapshot.logs);

      // Save to localStorage immediately for robust offline usage and new-user recovery
      try {
        localStorage.setItem('permucyber_militares', JSON.stringify(activeSnapshot.militares));
        localStorage.setItem('permucyber_escalas', JSON.stringify(activeSnapshot.escalas));
        localStorage.setItem('permucyber_permutas', JSON.stringify(activeSnapshot.permutas));
        if (activeSnapshot.alertas) localStorage.setItem('permucyber_alertas', JSON.stringify(activeSnapshot.alertas));
        if (activeSnapshot.logs) localStorage.setItem('permucyber_logs', JSON.stringify(activeSnapshot.logs));
      } catch (e) {
        console.error("Local storage sync error during restore:", e);
      }

      await appendAuditLog('INTEGRALIZAÇÃO', `Restauração ${silent ? 'automática' : 'pontual'} efetuada com sucesso: ${backupId}.`, loggedUser?.nomeGuerra || 'SISTEMA', logs);
      if (!silent) {
        alert(`SUCESSO! O banco de dados foi totalmente restaurado para a imagem de segurança ${backupId}.`);
      }
      setBackupStatusMsg(`✓ Sincronização automática concluída com sucesso para o backup ${backupId}.`);
    } catch (err) {
      console.error("Restore failed:", err);
      // Fallback local updates if anything failed during local operations
      const activeSnapshot = snapshot && snapshot.encrypted_payload ? decryptBackup(snapshot.encrypted_payload) : snapshot;
      setMilitares(activeSnapshot.militares.sort(sortMilitarByPatente));
      setEscalas(activeSnapshot.escalas);
      setPermutas(activeSnapshot.permutas);
      if (activeSnapshot.alertas) setAlertas(activeSnapshot.alertas);
      if (activeSnapshot.logs) setLogs(activeSnapshot.logs);
      if (!silent) {
        alert("Banco de dados restaurado localmente devido a limitações de conexão com a nuvem.");
      }
      setBackupStatusMsg("✓ Restauro offline concluído com sucesso.");
    }
  };

  const handleAddMilitarIndividual = async (militar: Militar) => {
    if (!loggedUser || loggedUser.role !== 'ADMIN') {
      alert("ERRO: Apenas o Administrador pode cadastrar policiais.");
      return;
    }
    // Prevent duplicate militar by name or matricula
    const isDuplicate = militares.some(m => 
      m.nome === militar.nome || 
      (m.nomeGuerra === militar.nomeGuerra && m.patente === militar.patente) ||
      (m.matriculaFuncional && militar.matriculaFuncional && m.matriculaFuncional === militar.matriculaFuncional)
    );

    if (isDuplicate) {
      alert("ERRO DE DUPLICIDADE: Este policial (mesmo nome, matrícula ou nome de guerra) já está cadastrado no sistema.");
      return;
    }

    try {
      // Supabase - Gravação Individual
      const result = await salvarDados(
        SYSTEM_USER_ID,
        `POLICIAL: ${militar.patente} ${militar.nomeGuerra}`,
        `Cadastro individual do militar ID ${militar.id} (${militar.nome})`,
        militar,
        militar.id
      );
      
      if (!result || !result.success) {
        throw new Error("Falha ao sincronizar com o Supabase.");
      }

      const updated = [...militares, militar];
      setMilitares(updated);
      await appendAuditLog('INTEGRALIZAÇÃO', `Militar ${militar.nomeGuerra} adicionado à base de dados.`, loggedUser?.nomeGuerra || 'SISTEMA', logs);
    } catch (e) { 
      console.error("Error saving militar:", e);
      alert("Erro ao salvar o policial no banco de dados. " + (e as Error).message);
    }
  };

  const executeDeleteMilitar = async (id: string) => {
    try {
      console.log(`Iniciando exclusão do militar ID: ${id}`);
      
      // Auto-backup preventivo para integridade dos dados e proteção contra exclusão acidental
      try {
        await generateBackup('AUTO', loggedUser?.nomeGuerra || 'SISTEMA');
      } catch (backupError) {
        console.error("Erro no auto-backup preventivo pré-exclusão militar:", backupError);
      }
      
      // Supabase (Tabela Unificada) - Modo manual configurado no fallback
      await deletarDados(id);
      
      // Optimistic update
      const updated = militares.filter(m => m.id !== id);
      setMilitares(updated);
      
      await appendAuditLog('INTEGRALIZAÇÃO', `Militar com ID ${id} removido da base de dados com auto-backup preventivo efetuado.`, loggedUser?.nomeGuerra || 'SISTEMA', logs);
    } catch(e) {
      console.error("Erro ao deletar militar:", e);
      alert("Erro ao excluir. " + (e as Error).message);
    }
  };

  const handleDeleteMilitar = async (id: string, bypassConfirm: boolean = false) => {
    if (!loggedUser || loggedUser.role !== 'ADMIN') {
      alert("ERRO: Apenas o Administrador pode excluir policiais.");
      return;
    }
    const targetMilitar = militares.find(m => m.id === id);
    if (!targetMilitar) return;

    if (!bypassConfirm) {
      requestConfirmation(
        "EXCLUIR POLICIAL DO EFETIVO",
        "Tem certeza que deseja excluir este cadastro? Esta ação poderá ser desfeita apenas se houver backup.",
        async () => {
          await executeDeleteMilitar(id);
        },
        "AVISO CRÍTICO: A remoção de um policial pode quebrar escalas ativas e históricos onde ele estiver escalado ou associado a permutas no banco de dados.",
        "CONFIRMAR EXCLUSÃO",
        "CANCELAR"
      );
      return;
    }

    await executeDeleteMilitar(id);
  };

  const executeClearAllPermutas = async () => {
    try {
      setBackupStatusMsg("⌛ Iniciando varredura profunda e saneamento do banco de dados na nuvem...");
      
      // 1. Deletar do Supabase diretamente todas as permutas, chats, logs de testes e backups zumbis
      const supabaseClient = getSupabase();
      if (supabaseClient) {
        const { data: records, error } = await supabaseClient
          .from('dados_app')
          .select('id, dados_json');
        
        if (!error && records && records.length > 0) {
          console.log(`[Saneamento Deep] Analisando ${records.length} registros no Supabase...`);
          for (const row of records) {
            const obj = row.dados_json;
            if (!obj) continue;
            
            // Critérios para detecção de sujeira de testes (permutas, mensagens, logs, notificações e backups)
            const isPermuta = obj.protocoloId !== undefined;
            const isBackup = obj.quantidadeMilitares !== undefined && obj.quantidadeEscalas !== undefined;
            const isChat = obj.deMilitarId !== undefined && obj.paraMilitarId !== undefined;
            const isNotif = obj.militarId !== undefined && obj.titulo !== undefined && obj.mensagem !== undefined && obj.dataHora !== undefined;
            
            if (isPermuta || isBackup || isChat || isNotif) {
              console.log(`[Saneamento Deep] Deletando registro zumbi de ID: ${row.id}`);
              await supabaseClient.from('dados_app').delete().eq('id', row.id);
            }
          }
        }
      }

      // 2. Limpar também as permutas conhecidas localmente na redundância local/nuvem
      for (const p of permutas) {
        await deletarDados(p.id);
      }
      
      // 3. Limpar os estados do React para zerar as visualizações imediatamente
      setPermutas([]);
      setBackups([]);
      setMessages([]);
      setNotificacoes([]);

      // 4. Limpar o localStorage de todas as chaves de teste antigas e de dispensas de alertas
      try {
        const keysToDelete: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.startsWith('BACKUP_') || 
            key === 'permucyber_backups' || 
            key === 'permucyber_permutas' ||
            key === 'permucyber_messages' ||
            key === 'permucyber_notificacoes' ||
            key === 'permucyber_dismissed_warnings'
          )) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach(k => localStorage.removeItem(k));
      } catch (e) {
        console.warn("Erro ao limpar cache local de backups:", e);
      }

      setBackupStatusMsg("✓ Saneamento concluído! Banco de dados em nuvem limpo para produção.");
      await appendAuditLog('INTEGRALIZAÇÃO', 'Varredura e saneamento completo de produção efetuado. Todas as permutas, chats e cópias de segurança de teste foram excluídos.', loggedUser?.nomeGuerra || 'SISTEMA', logs);
      alert('✓ SANEAMENTO CONCLUÍDO COM SUCESSO!\n\nTodas as permutas de teste, chats, backups antigos e notificações pendentes foram permanentemente excluídos do dispositivo e da nuvem.\n\nO sistema está 100% limpo e pronto para produção!');
    } catch (e) {
      console.error("Erro ao limpar permutas:", e);
      alert('Erro ao excluir as permutas.');
    }
  };

  const handleClearAllPermutas = async (bypassConfirm: boolean = false) => {
    if (!bypassConfirm) {
      requestConfirmation(
        "SANEAMENTO TOTAL DO BANCO",
        "Esta é uma operação administrativa crítica. Você está prestes a realizar um saneamento e varredura total do banco de dados na nuvem.",
        async () => {
          await executeClearAllPermutas();
        },
        "PERIGO ABSOLUTO: Todas as permutas, cópias de segurança de teste, logs e histórico de chats serão deletados permanentemente sem possibilidade de recuperação.",
        "EXECUTAR SANEAMENTO",
        "CANCELAR"
      );
      return;
    }
    await executeClearAllPermutas();
  };

  const executeClearAllMilitares = async () => {
    try {
      const activeUser = loggedUser || militares.find(m => m.role === 'COMANDANTE') || militares[0];
      for (const m of militares) {
        if (activeUser && m.id === activeUser.id) {
          continue; // Keep the active user to prevent lockout
        }
        await deletarDados(m.id);
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

  const handleClearAllMilitares = async (bypassConfirm: boolean = false) => {
    if (!bypassConfirm) {
      requestConfirmation(
        "LIMPAR EFETIVO ATIVO",
        "Deseja realmente excluir todos os policiais cadastrados do sistema, mantendo apenas a sua própria conta para evitar bloqueios de segurança?",
        async () => {
          await executeClearAllMilitares();
        },
        "PERIGO CRÍTICO: Esta ação removerá permanentemente todos os perfis de militares e suas credenciais do banco de dados.",
        "LIMPAR EFETIVO",
        "CANCELAR"
      );
      return;
    }
    await executeClearAllMilitares();
  };

  const handleToggleBiometria = async (id: string) => {
    const m = militares.find(x => x.id === id);
    if(m) {
      try { 
        await atualizarDados(id, { dados_json: { ...m, biometriaAtiva: !m.biometriaAtiva } }); 
      } catch(e){}
      setMilitares(prev => prev.map(p => p.id === id ? { ...p, biometriaAtiva: !p.biometriaAtiva } : p));
    }
  };

  const handleUpdateMilitarNomeGuerra = async (id: string, newNome: string) => {
    if (!loggedUser || loggedUser.role !== 'ADMIN') {
      alert("ERRO: Apenas o Administrador pode atualizar o nome de guerra de policiais.");
      return;
    }
    try {
      const oldMilitar = militares.find(m => m.id === id);
      const updatedMilitar = oldMilitar ? { 
        ...oldMilitar, 
        nomeGuerra: newNome, 
        nome: newNome.replace(/^(Sgto\.|Ten\.|Cb\.|Sd\.)\s*/i, '') 
      } : null;

      if (updatedMilitar) {
        await atualizarDados(id, { 
          titulo: `POLICIAL: ${updatedMilitar.patente} ${updatedMilitar.nomeGuerra}`,
          dados_json: updatedMilitar 
        });
      }
      
      setMilitares(prev => prev.map(p => p.id === id ? { ...p, nomeGuerra: newNome, nome: newNome.replace(/^(Sgto\.|Ten\.|Cb\.|Sd\.)\s*/i, '') } : p));
    } catch(e) {
      console.error("Erro ao atualizar nome de guerra:", e);
      alert("Erro ao atualizar nome: " + (e as Error).message);
    }
  };

  const handleUpdateMilitar = async (id: string, updatedFields: Partial<Militar>) => {
    if (!loggedUser || loggedUser.role !== 'ADMIN') {
      alert("ERRO: Apenas o Administrador pode atualizar dados de policiais.");
      return;
    }
    try {
      // Local State
      const oldMilitar = militares.find(m => m.id === id);
      const updatedMilitar = oldMilitar ? { ...oldMilitar, ...updatedFields } : null;
      
      if (updatedMilitar) {
        // Salva no Supabase via Fallback
        await salvarDados(
          SYSTEM_USER_ID,
          `ATUALIZAÇÃO: ${updatedMilitar.patente} ${updatedMilitar.nomeGuerra}`,
          `Atualização individual do militar ID ${id}`,
          updatedMilitar,
          id
        );
      }

      setMilitares(prev => prev.map(p => p.id === id ? { ...p, ...updatedFields } : p));
      await appendAuditLog('INTEGRALIZAÇÃO', `Cadastro de ${updatedFields.patente || ''} ${updatedFields.nomeGuerra || ''} foi atualizado no sistema de banco de dados.`, loggedUser?.nomeGuerra || 'SISTEMA', logs);
    } catch(e) {
      console.error("Error updating militar:", e);
      alert("Erro ao atualizar policial. " + (e as Error).message);
    }
  };

  const syncMilitarToSupabase = async (militar: Militar, acao: string) => {
    try {
      await salvarDados(
        SYSTEM_USER_ID,
        `${acao}: ${militar.patente} ${militar.nomeGuerra}`,
        `Sincronização individual do militar ID ${militar.id}`,
        militar,
        militar.id
      );
    } catch (err) {
      console.warn(`Erro ao sincronizar militar ${militar.id} com Supabase:`, err);
    }
  };

  const handleUpdateMilitarMF = async (id: string, newMF: string) => {
    if (!loggedUser || loggedUser.role !== 'ADMIN') {
      alert("ERRO: Apenas o Administrador pode atualizar a matrícula funcional de policiais.");
      return;
    }
    try { 
      const target = militares.find(p => p.id === id);
      if (target) {
        const updated = { ...target, matriculaFuncional: newMF };
        await atualizarDados(id, { dados_json: updated });
        setMilitares(prev => prev.map(p => p.id === id ? updated : p));
      }
    } catch(e) { alert("Erro ao atualizar MF. " + (e as Error).message); }
  };

  const handleUpdateMilitarNumero = async (id: string, numero: string) => {
    if (!loggedUser || loggedUser.role !== 'ADMIN') {
      alert("ERRO: Apenas o Administrador pode atualizar o número/badge de policiais.");
      return;
    }
    try { 
      const target = militares.find(p => p.id === id);
      if (target) {
        const updated = { ...target, numero };
        await atualizarDados(id, { dados_json: updated });
        setMilitares(prev => prev.map(p => p.id === id ? updated : p));
      }
    } catch(e){ alert("Erro ao atualizar número. " + (e as Error).message); }
  };

  const handleUpdateMilitarPin = async (id: string, newPin: string, email?: string, chaveDigital?: string) => {
    try { 
      const target = militares.find(p => p.id === id);
      const isSpecial = target?.role === 'ADMIN' || target?.role === 'COMANDANTE';
      const updates: any = { pinSegurança: newPin, acessoLiberado: isSpecial ? true : false, biometriaAtiva: true };
      if (email) {
        updates.email = email;
      }
      if (chaveDigital) {
        updates.chaveDigital = chaveDigital;
      }
      if (target) {
        const updated = { ...target, ...updates };
        await atualizarDados(id, { dados_json: updated });
        setMilitares(prev => prev.map(p => p.id === id ? updated : p));
        const logMsg = isSpecial 
          ? `Administrador/Comandante ID ${id} atualizou seu token / PIN de segurança pessoal, chave digital e e-mail. Acesso mantido liberado.`
          : `Militar ID ${id} atualizou seu token / PIN de segurança criptográfica pessoal, e-mail (${email || 'não informado'}) e chave digital personalizada (${chaveDigital || ''}). Acesso bloqueado aguardando liberação do administrador.`;
        await appendAuditLog('INTEGRALIZAÇÃO', logMsg, loggedUser?.nomeGuerra || 'SISTEMA', logs);
      }
    } catch(e) { alert("Erro ao modificar PIN: " + (e as Error).message); }
  };

  const handleUpdateMilitarRole = async (id: string, role: Role) => {
    if (!loggedUser || loggedUser.role !== 'ADMIN') {
      alert("ERRO: Apenas o Administrador pode atualizar o papel/permissão de policiais.");
      return;
    }
    try { 
      const target = militares.find(p => p.id === id);
      if (target) {
        const updated = { ...target, role };
        await atualizarDados(id, { dados_json: updated });
        setMilitares(prev => prev.map(p => p.id === id ? updated : p));
        await appendAuditLog('INTEGRALIZAÇÃO', `Papel do militar ${id} alterado para ${role}.`, loggedUser?.nomeGuerra || 'SISTEMA', logs);
      }
    } catch(e) { alert("Erro ao atualizar papel: " + (e as Error).message); }
  };

  const handleUpdateConfig = async (newConfig: Partial<AppConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);

    try {
      await salvarDados(SYSTEM_USER_ID, 'CONFIG', 'Atualização de configurações', updated, 'config-system');
    } catch (e) {
      console.error("Error updating config:", e);
    }
  };

  const handleImportMilitaresJSON = async (imported: Militar[]) => {
    for (const m of imported) {
      try {
        // Supabase individual
        await salvarDados(
          SYSTEM_USER_ID,
          `IMPORTAÇÃO: ${m.patente} ${m.nomeGuerra}`,
          `Importação via arquivo JSON do militar ${m.nome}`,
          m,
          m.id
        );
      } catch (sbErr) {
        console.warn(`Erro Supabase (Importar ${m.id}):`, sbErr);
      }
    }
    setMilitares(imported.sort(sortMilitarByPatente));
    if (imported.length > 0 && !imported.some(m => m.id === selectedMilitarId)) {
      setSelectedMilitarId(imported[0].id);
      localStorage.setItem('permucyber_logged_id', imported[0].id);
      setIsLoggedIn(false);
      localStorage.removeItem('permucyber_is_logged');
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

    await salvarDados(
      SYSTEM_USER_ID,
      `MENSAGEM: ${loggedUser.nomeGuerra} -> ${paraMilitarId}`,
      "Mensagem de chat enviada",
      freshMessage,
      freshMessage.id
    );
    
    const recipient = militares.find((m) => m.id === paraMilitarId)?.nomeGuerra || 'Auxiliar';
    await appendAuditLog('INTEGRALIZAÇÃO', `Transmissão de texto plano criptografada with sucesso de ${loggedUser.nomeGuerra} para ${recipient}. Protocolo seguro ativado.`, loggedUser.nomeGuerra, logs);
  };

  const [creationSuccessMessage, setCreationSuccessMessage] = useState<string | null>(null);

  const sendNotification = async (militarId: string, titulo: string, mensagem: string, permutaId?: string, tipo?: string) => {
    const newNotif: Notificacao = {
      id: `N-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      militarId,
      titulo,
      mensagem,
      dataHora: new Date().toISOString(),
      visualizada: false,
      permutaId,
      tipo
    };

    setNotificacoes(prev => {
      if (prev.some(n => n.id === newNotif.id)) return prev;
      return [newNotif, ...prev];
    });

    try {
      await salvarDados(
        SYSTEM_USER_ID,
        `NOTIFICACAO: ${militarId}`,
        mensagem,
        newNotif,
        newNotif.id
      );
    } catch (e) {
      console.error("[App] Erro ao enviar notificação para Supabase:", e);
    }
  };

  const handleMarkNotificationAsRead = async (id: string) => {
    const notif = notificacoes.find(n => n.id === id);
    if (!notif) return;
    const updated = { ...notif, visualizada: true };
    setNotificacoes(prev => prev.map(n => n.id === id ? updated : n));
    try {
      await atualizarDados(id, { dados_json: updated });
    } catch (e) {
      console.error("Error marking notification as read:", e);
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    if (!loggedUser) return;
    const userNotifs = notificacoes.filter(n => n.militarId === loggedUser.id && !n.visualizada);
    if (userNotifs.length === 0) return;
    
    setNotificacoes(prev => prev.map(n => n.militarId === loggedUser.id ? { ...n, visualizada: true } : n));
    for (const n of userNotifs) {
      try {
        await atualizarDados(n.id, { dados_json: { ...n, visualizada: true } });
      } catch (e) {
        console.error("Error marking notification as read:", e);
      }
    }
  };

  const handleClearNotification = async (id: string) => {
    setNotificacoes(prev => prev.filter(n => n.id !== id));
    try {
      await deletarDados(id);
    } catch (e) {
      console.error("Error deleting notification:", e);
    }
  };

  const handleCreatePermuta = async (novaPermuta: Permuta) => {
    if (!loggedUser) return;

    // Strict duplicate and conflict check
    const existingConflict = permutas.find(p => 
      p.dataRealizacao === novaPermuta.dataRealizacao &&
      !['REJEITADO', 'REJEITADO_SUBSTITUTO', 'SEM_EFEITO'].includes(p.status) &&
      areShiftsOverlapping(p.turno, novaPermuta.turno) &&
      (
        p.militarSubstituidoId === novaPermuta.militarSubstituidoId ||
        p.militarSubstitutoId === novaPermuta.militarSubstituidoId ||
        p.militarSubstituidoId === novaPermuta.militarSubstitutoId ||
        p.militarSubstitutoId === novaPermuta.militarSubstitutoId
      )
    );

    if (existingConflict) {
      alert(`CONFLITO: Já existe uma permuta ativa (${existingConflict.status}) para esta data envolvendo um dos policiais selecionados no mesmo turno/horário. Não é possível continuar.`);
      return;
    }

    // Official Scale Conflict Check (Substituto already on duty)
    const scaleConflict = escalas.find(e => 
      e.data === novaPermuta.dataRealizacao && 
      e.militarId === novaPermuta.militarSubstitutoId &&
      areShiftsOverlapping(e.turno, novaPermuta.turno)
    );

    if (scaleConflict) {
      const mil = militares.find(m => m.id === novaPermuta.militarSubstitutoId);
      alert(`CONFLITO DE ESCALA: O militar ${mil?.nomeGuerra || ''} já está escalado oficialmente para o dia ${novaPermuta.dataRealizacao.split('-').reverse().join('.')} no turno/período ${scaleConflict.turno}. Não é possível continuar.`);
      return;
    }

    try {
      await salvarDados(
        SYSTEM_USER_ID,
        `PERMUTA: ${novaPermuta.protocoloId}`,
        `Solicitação de permuta criada por ${loggedUser.nomeGuerra}`,
        novaPermuta,
        novaPermuta.id
      );
    } catch (e) {
      console.error("Error creating permuta:", e);
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
        await salvarDados(
          SYSTEM_USER_ID,
          `MENSAGEM: SISTEMA -> ${novaPermuta.militarSubstituidoId}`,
          "Mensagem automática de aceite de permuta",
          automatedMsg,
          automatedMsg.id
        );
      } catch (e) {
        console.error("Supabase error creating automated message:", e);
      }
      setMessages(prev => {
        const exists = prev.some(m => m.id === automatedMsg.id);
        if (exists) return prev;
        return [...prev, automatedMsg].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
      });
    }

    setCreationSuccessMessage("Solicitação de permuta enviada com sucesso! Aguarde a análise e assinatura do policial substituto.");

    await sendNotification(
      novaPermuta.militarSubstitutoId,
      "Nova Solicitação de Permuta",
      `O policial ${loggedUser.nomeGuerra} iniciou uma solicitação de permuta com você para o dia ${formatarDataBR(novaPermuta.dataRealizacao)}.`,
      novaPermuta.id,
      "CRIADA"
    );
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

    // Verify if the substitute is already scheduled (escalado) on the target date with an overlapping shift
    const isSubstituteEscalado = escalas.some(e => e.militarId === loggedUser.id && e.data === targetPermuta.dataRealizacao && areShiftsOverlapping(e.turno, targetPermuta.turno));
    if (isSubstituteEscalado) {
      alert(`CONFLITO DETECTADO: Você já está escalado de serviço oficial nesta data no turno/horário (${targetPermuta.turno}) e não pode aceitar outra permuta para o mesmo período.`);
      return;
    }

    // Verify if the accepting user already has another active permuta on that same date with an overlapping shift
    const hasAnotherActiveSelf = permutas.some(p => 
      p.id !== permutaId &&
      p.dataRealizacao === targetPermuta.dataRealizacao &&
      !['REJEITADO', 'REJEITADO_SUBSTITUTO', 'SEM_EFEITO'].includes(p.status) &&
      areShiftsOverlapping(p.turno, targetPermuta.turno) &&
      (p.militarSubstituidoId === loggedUser.id || p.militarSubstitutoId === loggedUser.id)
    );
    if (hasAnotherActiveSelf) {
      alert(`Não pode, porque você já está envolvido em outra permuta nesse dia no mesmo turno/horário (${targetPermuta.turno}).`);
      return;
    }

    // Verify if the requesting user already has another active permuta on that same date with an overlapping shift
    const hasAnotherActiveRequester = permutas.some(p => 
      p.id !== permutaId &&
      p.dataRealizacao === targetPermuta.dataRealizacao &&
      !['REJEITADO', 'REJEITADO_SUBSTITUTO', 'SEM_EFEITO'].includes(p.status) &&
      areShiftsOverlapping(p.turno, targetPermuta.turno) &&
      (p.militarSubstituidoId === targetPermuta.militarSubstituidoId || p.militarSubstitutoId === targetPermuta.militarSubstituidoId)
    );
    if (hasAnotherActiveRequester) {
      alert(`Não pode, porque o solicitante já possui outra permuta ativa nesse dia no mesmo turno/horário (${targetPermuta.turno}).`);
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
      await atualizarDados(permutaId, { 
        dados_json: { ...targetPermuta, status: 'PENDENTE_GESTOR', assinaturaSubstituta: peerSignature } 
      });
    } catch (e) {
      console.error("Error accepting permuta:", e);
    }

    // Local fallback update
    setPermutas(prev => prev.map(p => p.id === permutaId ? { ...p, status: 'PENDENTE_GESTOR', assinaturaSubstituta: peerSignature } : p));

    await appendAuditLog('PERMUTA_ACEITA', `${loggedUser.patente} ${loggedUser.nomeGuerra} assinou digitalmente aceitando a permuta ref. protocolo ${targetPermuta.protocoloId}. Encaminhado ao conselho operacional.`, loggedUser.nomeGuerra, logs);
    
    await sendNotification(
      targetPermuta.militarSubstituidoId,
      "Permuta Assinada pelo Substituto",
      "Sua solicitação foi aceita e assinada pelo policial substituto. Aguarde a homologação do administrador.",
      targetPermuta.id,
      "ACEITA"
    );

    setActiveReviewPermuta(null);
    setCurrentTab('PERMUTAS');
  };

  const handleDeclinePermuta = async (permutaId: string) => {
    if (!loggedUser) return;
    const targetP = permutas.find(p => p.id === permutaId);
    try {
      if (targetP) {
        await atualizarDados(permutaId, { 
          dados_json: { ...targetP, status: 'REJEITADO_SUBSTITUTO' } 
        });
      }
    } catch (e) {
      console.error("Error declining permuta:", e);
    }

    // Local fallback update
    setPermutas(prev => prev.map(p => p.id === permutaId ? { ...p, status: 'REJEITADO_SUBSTITUTO' } : p));

    await appendAuditLog('INTEGRALIZAÇÃO', `Solicitação de permuta cancelada/rejeitada pelo militar substituto. Protocolo suspenso.`, loggedUser.nomeGuerra, logs);
    
    if (targetP) {
      await sendNotification(
        targetP.militarSubstituidoId,
        "Permuta Recusada pelo Substituto",
        `A solicitação de permuta para o serviço do dia ${formatarDataBR(targetP.dataRealizacao)} foi recusada pelo militar substituto.`,
        targetP.id,
        "REJEITADA"
      );
      await sendNotification(
        targetP.militarSubstitutoId,
        "Permuta Recusada",
        `Você recusou a solicitação de permuta para o serviço do dia ${formatarDataBR(targetP.dataRealizacao)}.`,
        targetP.id,
        "REJEITADA"
      );
    }

    setActiveReviewPermuta(null);
    setCurrentTab('PERMUTAS');
  };

  const syncBackupsAfterDeletion = async (
    deletedPermutaId: string,
    deletedEscalaIds: string[],
    revertedEscalaId?: string,
    revertedMilitarId?: string
  ) => {
    const updateBackupData = (bk: BackupSnapshot): BackupSnapshot => {
      let updatedPermutas = bk.permutas || [];
      if (deletedPermutaId) {
        updatedPermutas = updatedPermutas.filter(p => p.id !== deletedPermutaId);
      }

      let updatedEscalas = bk.escalas || [];
      if (deletedEscalaIds && deletedEscalaIds.length > 0) {
        updatedEscalas = updatedEscalas.filter(e => !deletedEscalaIds.includes(e.id));
      }
      if (revertedEscalaId && revertedMilitarId) {
        updatedEscalas = updatedEscalas.map(e => 
          e.id === revertedEscalaId ? { ...e, militarId: revertedMilitarId } : e
        );
      }

      return {
        ...bk,
        permutas: updatedPermutas,
        quantidadePermutas: updatedPermutas.length,
        escalas: updatedEscalas,
        quantidadeEscalas: updatedEscalas.length
      };
    };

    // 1. Update backups state
    setBackups(prev => {
      const updated = prev.map(updateBackupData);
      
      // Save updated to localStorage
      updated.forEach(bk => {
        try {
          localStorage.setItem(`BACKUP_${bk.id}`, JSON.stringify(bk));
        } catch (e) {}
      });

      return updated;
    });

    // 2. Clear all local localStorage backups keys directly
    try {
      const keysToUpdate: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('BACKUP_')) {
          keysToUpdate.push(key);
        }
      }
      keysToUpdate.forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const bk = JSON.parse(item);
            const updatedBk = updateBackupData(bk);
            localStorage.setItem(key, JSON.stringify(updatedBk));
          } catch (e) {}
        }
      });

      const savedBackups = localStorage.getItem('permucyber_backups');
      if (savedBackups) {
        const parsed = JSON.parse(savedBackups);
        if (Array.isArray(parsed)) {
          const updatedParsed = parsed.map(updateBackupData);
          localStorage.setItem('permucyber_backups', JSON.stringify(updatedParsed));
        }
      }
    } catch (e) {
      console.error("Erro ao atualizar backups locais:", e);
    }

    // 2. Clear local backups to prevent them from restoring old data
    try {
      const savedBackups = localStorage.getItem('permucyber_backups');
      if (savedBackups) {
        const parsed = JSON.parse(savedBackups);
        if (Array.isArray(parsed)) {
          const updatedParsed = parsed.map(updateBackupData);
          localStorage.setItem('permucyber_backups', JSON.stringify(updatedParsed));
        }
      }
    } catch (err) {
      console.error("Erro ao atualizar backups locais:", err);
    }
  };

  const revertOrDeleteScaleForPermuta = async (targetPermuta: Permuta) => {
    const originalEscalaId = targetPermuta.escalaSubstituidaId;
    
    if (originalEscalaId.startsWith('S-TEMP-')) {
      // It was a dynamically created/generated scale. We should delete it!
      try {
        await deletarDados(originalEscalaId);
      } catch (e) {
        console.error("Error deleting generated escala:", e);
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
          await deletarDados(generatedEscala.id);
        } catch (e) {
          console.error("Error deleting generated escala by match:", e);
        }
      }
      
      const idsToDelete = [originalEscalaId, generatedEscala?.id].filter(Boolean) as string[];
      setEscalas(prev => prev.filter(e => !idsToDelete.includes(e.id)));
      return { deletedIds: idsToDelete, revertedId: undefined, revertedMilitarId: undefined };
    } else {
      // It was an original official scale record. We revert it to the original owner!
      try {
        const escalaOriginal = escalas.find(e => e.id === originalEscalaId);
        if (escalaOriginal) {
          const splitIdA = `E-SPLIT-${originalEscalaId}-A`;
          const splitIdB = `E-SPLIT-${originalEscalaId}-B`;
          const splitScaleA = escalas.find(e => e.id === splitIdA);
          const splitScaleB = escalas.find(e => e.id === splitIdB);
          
          let targetScale = escalaOriginal;
          let otherScale: Escala | undefined = undefined;

          if (escalaOriginal.turno === targetPermuta.turno) {
            targetScale = escalaOriginal;
            otherScale = targetPermuta.turno === 'TURNO A' ? splitScaleB : splitScaleA;
          } else if (splitScaleA && splitScaleA.turno === targetPermuta.turno) {
            targetScale = splitScaleA;
            otherScale = escalaOriginal.turno === 'TURNO B' ? escalaOriginal : splitScaleB;
          } else if (splitScaleB && splitScaleB.turno === targetPermuta.turno) {
            targetScale = splitScaleB;
            otherScale = escalaOriginal.turno === 'TURNO A' ? escalaOriginal : splitScaleA;
          }

          let deletedIds: string[] = [];

          if (otherScale && otherScale.militarId === targetPermuta.militarSubstituidoId) {
            const mergedOriginal = {
              ...escalaOriginal,
              turno: '24H' as const,
              horaInicio: '06:00',
              horaFim: '06:00',
              militarId: targetPermuta.militarSubstituidoId
            };

            const splitScaleToDelete = targetScale.id !== originalEscalaId ? targetScale : otherScale;

            try {
              await atualizarDados(originalEscalaId, { dados_json: mergedOriginal });
              if (splitScaleToDelete.id !== originalEscalaId) {
                await deletarDados(splitScaleToDelete.id);
                deletedIds.push(splitScaleToDelete.id);
              }
            } catch (e) {
              console.error("Error merging split scales back to 24H:", e);
            }

            setEscalas(prev => {
              const step1 = prev.map(e => e.id === originalEscalaId ? mergedOriginal : e);
              return step1.filter(e => !deletedIds.includes(e.id));
            });

            return { deletedIds, revertedId: originalEscalaId, revertedMilitarId: targetPermuta.militarSubstituidoId };
          } else {
            const updatedTarget = {
              ...targetScale,
              militarId: targetPermuta.militarSubstituidoId
            };

            try {
              await atualizarDados(targetScale.id, { dados_json: updatedTarget });
            } catch (e) {
              console.error("Error updating reverted scale portion:", e);
            }

            setEscalas(prev => prev.map(e => e.id === targetScale.id ? updatedTarget : e));
            return { deletedIds: [], revertedId: targetScale.id, revertedMilitarId: targetPermuta.militarSubstituidoId };
          }
        }
      } catch (e) {
        console.error("Error reverting escala:", e);
      }
      
      setEscalas(prev => prev.map(e => e.id === originalEscalaId ? {
        ...e,
        militarId: targetPermuta.militarSubstituidoId
      } : e));
      return { deletedIds: [], revertedId: originalEscalaId, revertedMilitarId: targetPermuta.militarSubstituidoId };
    }
  };

  const executeDeletePermuta = async (id: string) => {
    const targetPermuta = permutas.find(p => p.id === id);
    if (!targetPermuta) return;

    let scaleChanges = { deletedIds: [] as string[], revertedId: undefined as string | undefined, revertedMilitarId: undefined as string | undefined };
    if (targetPermuta && targetPermuta.status === 'APROVADO') {
      scaleChanges = await revertOrDeleteScaleForPermuta(targetPermuta);
    }
    try {
      console.log(`[DELETION DEBUG] Tentando deletar permuta: ${id}`);
      
      // 1. Deletar do Supabase (via dados_app)
      const resSupabase = await deletarDados(id, 'supabase');
      console.log(`[DELETION DEBUG] Supabase deletado: ${resSupabase.success}`);
    } catch (e) {
      console.error("[DELETION DEBUG] Erro fatal ao deletar permuta:", e);
      alert("Erro fatal ao deletar permuta. Verifique o console.");
    }
    
    const nextPermutas = permutas.filter(p => p.id !== id);
    setPermutas(nextPermutas);
    localStorage.setItem('permucyber_permutas', JSON.stringify(nextPermutas));
    const userRole = loggedUser?.role === 'ADMIN' ? 'Administrador' : 'militar solicitante';
    await appendAuditLog('INTEGRALIZAÇÃO', `Protocolo de permuta ID ${targetPermuta.protocoloId} excluído permanentemente pelo ${userRole}.`, loggedUser?.nomeGuerra || 'SISTEMA', logs);
    
    // Scrub this deleted permuta and its scale changes from ALL backups to prevent auto-restoration
    await syncBackupsAfterDeletion(id, scaleChanges.deletedIds, scaleChanges.revertedId, scaleChanges.revertedMilitarId);

    // Auto backup ensures that subsequent auto-recovery files will also be clean of this deleted permuta
    try {
      const activeEscalas = escalas
        .filter(e => !scaleChanges.deletedIds.includes(e.id))
        .map(e => e.id === scaleChanges.revertedId ? { ...e, militarId: scaleChanges.revertedMilitarId! } : e);
      await generateBackup('AUTO', loggedUser?.nomeGuerra || 'SISTEMA', militares, activeEscalas, nextPermutas);
    } catch (bErr) {
      console.error("Erro no auto-backup pós-exclusão:", bErr);
    }
  };

  const handleDeletePermuta = async (id: string, bypassConfirm: boolean = false) => {
    const targetPermuta = permutas.find(p => p.id === id);
    if (!targetPermuta) return;

    if (!loggedUser) {
      alert("ERRO: Nenhum usuário autenticado.");
      return;
    }

    const isAdmin = loggedUser.role === 'ADMIN';

    if (!isAdmin) {
      alert("ERRO: Apenas o Administrador pode excluir permutas do sistema.");
      return;
    }

    if (!bypassConfirm) {
      requestConfirmation(
        "EXCLUIR PERMUTA",
        "Tem certeza de que deseja excluir este registro? Esta ação é irreversível e poderá alterar o histórico do sistema.",
        async () => {
          await executeDeletePermuta(id);
        },
        undefined,
        "CONFIRMAR EXCLUSÃO",
        "CANCELAR"
      );
      return;
    }

    await executeDeletePermuta(id);
  };

  const handleCorrectPermuta = async (p: Permuta) => {
    if (!loggedUser) return;
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
    await handleDeletePermuta(p.id, true);
    setActiveSwapScale(esc);
    setActiveReviewPermuta(null);
  };

  const executeClearAllLogs = async () => {
    const logsToDelete = [...logs];
    setLogs([]);
    localStorage.removeItem('permucyber_logs');

    try {
      // Chunk-based deleting to remain reliable
      const deletePromises = logsToDelete.map(async (log) => {
        try {
          await deletarDados(log.id);
        } catch (sbErr) {
          console.error(`Error deleting log ${log.id}:`, sbErr);
        }
      });

      for (let i = 0; i < deletePromises.length; i += 10) {
        await Promise.all(deletePromises.slice(i, i + 10));
      }

      await appendAuditLog('INTEGRALIZAÇÃO', `Limpeza total do livro de auditoria realizada por ${loggedUser.nomeGuerra}.`, loggedUser.nomeGuerra, []);
    } catch (e) {
      console.error("Erro ao limpar logs:", e);
    }
  };

  const handleClearAllLogs = async (bypassConfirm: boolean = false) => {
    if (!loggedUser || loggedUser.role !== 'ADMIN') {
      alert("ERRO: Apenas o Administrador pode limpar o livro de auditoria.");
      return;
    }

    if (!bypassConfirm) {
      requestConfirmation(
        "LIMPAR LIVRO DE AUDITORIA",
        "Você está prestes a apagar permanentemente TODOS os registros de auditoria e segurança armazenados na nuvem e no dispositivo local.",
        async () => {
          await executeClearAllLogs();
        },
        "AVISO DE SEGURANÇA: Esta ação comprometerá permanentemente o histórico de rastreabilidade de todas as permutas. Use com cautela extrema.",
        "LIMPAR AUDITORIA",
        "CANCELAR"
      );
      return;
    }

    await executeClearAllLogs();
  };

  const executeDeleteLog = async (logId: string) => {
    const targetLog = logs.find(l => l.id === logId);
    try {
      await deletarDados(logId);
      setLogs(prev => prev.filter(l => l.id !== logId));
      if (targetLog) {
        await appendAuditLog('INTEGRALIZAÇÃO', `Registro de auditoria ID ${logId} (operação: "${targetLog.tipoEvento}") excluído individualmente pelo Administrador.`, loggedUser?.nomeGuerra || 'SISTEMA', logs.filter(l => l.id !== logId));
      }
    } catch (e) {
      console.error("Erro ao deletar registro de auditoria:", e);
    }
  };

  const handleDeleteLog = async (logId: string, bypassConfirm: boolean = false) => {
    if (!loggedUser || loggedUser.role !== 'ADMIN') {
      alert("ERRO: Apenas o Administrador pode excluir registros de auditoria.");
      return;
    }
    const log = logs.find(l => l.id === logId);
    if (!log) return;

    if (!bypassConfirm) {
      requestConfirmation(
        "REMOVER REGISTRO DE AUDITORIA",
        "Tem certeza de que deseja excluir este registro? Esta ação é irreversível e poderá alterar o histórico do sistema.",
        async () => {
          await executeDeleteLog(logId);
        },
        "A remoção de registros de auditoria é permanente e não poderá ser desfeita.",
        "EXCLUIR REGISTRO",
        "CANCELAR"
      );
      return;
    }

    await executeDeleteLog(logId);
  };

  useEffect(() => {
    if (currentTab === 'PERMUTAS' && loggedUser) {
      console.log("[App] Visualizando Permutas.");
    }
    
    // Automatic cleanup for past unapproved permutas
    const todayStr = new Date().toLocaleDateString('en-CA');
    const checkExpiredPermutas = async () => {
      let anyChanged = false;
      const updated = permutas.map(p => {
        if (p.status !== 'APROVADO' && p.status !== 'SEM_EFEITO' && p.status !== 'REJEITADO' && p.status !== 'REJEITADO_SUBSTITUTO' && p.dataRealizacao < todayStr) {
          anyChanged = true;
          const expiredP = {
            ...p,
            status: 'SEM_EFEITO' as const,
            motivoSemEfeito: 'Data do serviço expirada sem homologação final.'
          };
          
          // Async update to cloud
          atualizarDados(p.id, { dados_json: expiredP }).catch(console.error);
          return expiredP;
        }
        return p;
      });

      if (anyChanged) {
        setPermutas(updated);
      }
    };

    const timer = setTimeout(checkExpiredPermutas, 1000);
    return () => clearTimeout(timer);
  }, [currentTab, loggedUser, permutas]);

  // Automated detection of afastamentos causing active permutas to be "SEM_EFEITO"
  useEffect(() => {
    if (!militares || militares.length === 0 || !permutas || permutas.length === 0) return;
    
    const activeStatuses = ['PENDENTE_SUBSTITUTO', 'PENDENTE_GESTOR', 'AJUSTE_GESTOR', 'ALTERACAO_SOLICITADA'];
    
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
            await atualizarDados(p.id, { 
              dados_json: {
                ...p,
                status: 'SEM_EFEITO',
                motivoSemEfeito: motivoStr,
                dataCancelamentoAutomatico: dataCancelamento
              }
            });
          } catch (e) {
            console.error("Error auto-cancelling permuta:", e);
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

  // --- SELF-HEALING HOOK: Restore Dourado/Nildjon Permuta (PEM-20260708-8185) ---
  useEffect(() => {
    if (isLoading) return;

    const healDouradoNildjon = async () => {
      const targetP = permutas.find(p => p.protocoloId === 'PEM-20260708-8185' || (p.dataRealizacao === '2026-07-08' && p.turno === 'TURNO A'));
      if (targetP && targetP.status !== 'APROVADO') {
        console.log("[Self-Healing] Restaurando permuta Dourado/Nildjon (PEM-20260708-8185) para status HOMOLOGADA (APROVADO)...");
        const healedP: Permuta = {
          ...targetP,
          status: 'APROVADO',
          gestorNome: 'MAJ EDNA',
          assinaturaGestor: 'MAJ EDNA',
          dataAssinaturaGestor: '2026-07-07 10:00',
          motivoSemEfeito: undefined,
          dataCancelamentoAutomatico: undefined
        };

        // 1. Update local state immediately
        setPermutas(prev => prev.map(p => p.id === targetP.id ? healedP : p));

        // 2. Save to Supabase
        try {
          await atualizarDados(targetP.id, { dados_json: healedP });
          await appendAuditLog('INTEGRALIZAÇÃO', `Restauração automática da permuta Dourado/Nildjon (PEM-20260708-8185) para status homologada.`, 'SISTEMA', logs);
        } catch (err) {
          console.error("[Self-Healing] Erro ao salvar restauração no banco:", err);
        }
      }
    };

    healDouradoNildjon();
  }, [isLoading, permutas]);

  const handleRequestAlteration = async (permutaId: string, comentario: string) => {
    if (!loggedUser) return;
    const targetP = permutas.find(p => p.id === permutaId);
    if (!targetP) return;
    
    try {
      await atualizarDados(permutaId, { 
        dados_json: { ...targetP, status: 'ALTERACAO_SOLICITADA', comentarioAlteracao: comentario } 
      });
    } catch (e) {
      console.error("Error requesting alteration:", e);
    }

    // Local fallback update
    const updatedPermutas = prev => prev.map(p => p.id === permutaId ? { ...p, status: 'ALTERACAO_SOLICITADA', comentarioAlteracao: comentario } : p);
    setPermutas(updatedPermutas);

    // Salva no Supabase via Fallback para visibilidade individual
    try {
      const targetP = permutas.find(p => p.id === permutaId);
      if (targetP) {
        await salvarDados(
          SYSTEM_USER_ID,
          `ALTERAÇÃO SOLICITADA: Permuta ${targetP.protocoloId}`,
          `Considerações operacionais de ${loggedUser.nomeGuerra}: ${comentario.slice(0, 50)}`,
          { ...targetP, status: 'ALTERACAO_SOLICITADA', comentarioAlteracao: comentario },
          targetP.id
        );
      }
    } catch (sbErr) {
      console.warn("Aviso: Falha na gravação individual Supabase (Solicitação Alteração):", sbErr);
    }

    await appendAuditLog('INTEGRALIZAÇÃO', `Proposta de alteração de escala retransmitida com considerações operacionais: "${comentario.slice(0, 45)}...".`, loggedUser.nomeGuerra, logs);
    
    // Trigger auto-backup
    await generateBackup('AUTO', loggedUser.nomeGuerra);

    setActiveReviewPermuta(null);
    setCurrentTab('PERMUTAS');
  };

  const handleApprovePermutaGestor = async (permutaId: string, gestorNome: string, gestorSignature: string) => {
    if (!loggedUser || (loggedUser.role !== 'COMANDANTE' && loggedUser.role !== 'ADMIN')) return;
    const targetPermuta = permutas.find(p => p.id === permutaId);
    if (!targetPermuta) return;

    // Hard check for same day and same shift conflicts using areShiftsOverlapping helper
    const isSubstitutoAlreadyApproved = permutas.some(p =>
      p.id !== permutaId &&
      p.status === 'APROVADO' &&
      p.dataRealizacao === targetPermuta.dataRealizacao &&
      areShiftsOverlapping(p.turno, targetPermuta.turno) &&
      (p.militarSubstituidoId === targetPermuta.militarSubstitutoId || p.militarSubstitutoId === targetPermuta.militarSubstitutoId)
    );
    if (isSubstitutoAlreadyApproved) {
      alert(`ERRO DE CONFLITO: O substituto já possui uma permuta homologada para esta mesma data (${formatarDataBR(targetPermuta.dataRealizacao)}) e turno (${targetPermuta.turno}).`);
      return;
    }

    const isSubstituidoAlreadyApproved = permutas.some(p =>
      p.id !== permutaId &&
      p.status === 'APROVADO' &&
      p.dataRealizacao === targetPermuta.dataRealizacao &&
      areShiftsOverlapping(p.turno, targetPermuta.turno) &&
      (p.militarSubstituidoId === targetPermuta.militarSubstituidoId || p.militarSubstitutoId === targetPermuta.militarSubstituidoId)
    );
    if (isSubstituidoAlreadyApproved) {
      alert(`ERRO DE CONFLITO: O solicitante já possui uma permuta homologada para esta mesma data (${formatarDataBR(targetPermuta.dataRealizacao)}) e turno (${targetPermuta.turno}).`);
      return;
    }

    const isSubstitutoEscalado = escalas.some(e =>
      e.militarId === targetPermuta.militarSubstitutoId &&
      e.data === targetPermuta.dataRealizacao &&
      areShiftsOverlapping(e.turno, targetPermuta.turno)
    );
    if (isSubstitutoEscalado) {
      alert(`ERRO DE CONFLITO: O substituto já está de serviço (escala oficial) nesta mesma data (${formatarDataBR(targetPermuta.dataRealizacao)}) no turno/horário (${targetPermuta.turno}).`);
      return;
    }

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
      await atualizarDados(permutaId, { 
        dados_json: { 
          ...targetPermuta, 
          status: 'APROVADO', 
          assinaturaGestor: gestorSignature, 
          gestorNome, 
          dataAssinaturaGestor 
        } 
      });
    } catch (e) {
      console.error("Error approving permuta:", e);
    }

    // Always update local state
    const updatedPermutas = prev => prev.map(p => p.id === permutaId ? {
      ...p,
      status: 'APROVADO',
      assinaturaGestor: gestorSignature,
      gestorNome,
      dataAssinaturaGestor
    } : p);
    
    setPermutas(updatedPermutas);

    // Salva no Supabase via Fallback para visibilidade individual
    try {
      await salvarDados(
        SYSTEM_USER_ID,
        `HOMOLOGAÇÃO: Permuta ${targetPermuta.protocoloId}`,
        `Permuta homologada por ${gestorNome}`,
        { ...targetPermuta, status: 'APROVADO', gestorNome, dataAssinaturaGestor },
        permutaId
      );
    } catch (sbErr) {
      console.warn("Aviso: Falha na gravação individual Supabase (Homologação):", sbErr);
    }

    // Duplicity Prevention: Check if there's already a scale for this militar, data, and turno
    const existingEscala = escalas.find(e => 
      e.militarId === targetPermuta.militarSubstitutoId && 
      e.data === targetPermuta.dataRealizacao && 
      e.turno === targetPermuta.turno
    );

    const originalEscalaId = targetPermuta.escalaSubstituidaId;
    let escalaOriginal = escalas.find(e => 
      e.data === targetPermuta.dataRealizacao &&
      e.militarId === targetPermuta.militarSubstituidoId &&
      (e.turno === targetPermuta.turno || (e.turno === '24H' && (targetPermuta.turno === 'TURNO A' || targetPermuta.turno === 'TURNO B')))
    );

    if (!escalaOriginal) {
      escalaOriginal = escalas.find(e => e.id === originalEscalaId);
    }

    if (escalaOriginal && !originalEscalaId.startsWith('S-TEMP-')) {
      const escalaToUpdateId = escalaOriginal.id;
      const isSplit = escalaOriginal.turno === '24H' && targetPermuta.turno !== '24H';
      
      if (isSplit) {
        // Splitting a 24H scale!
        const remainingTurno = targetPermuta.turno === 'TURNO A' ? 'TURNO B' : 'TURNO A';
        const remainingInicio = targetPermuta.turno === 'TURNO A' ? '18:00' : '06:00';
        const remainingFim = targetPermuta.turno === 'TURNO A' ? '06:00' : '18:00';
        
        const splitScaleId = `E-SPLIT-${escalaToUpdateId}-${remainingTurno === 'TURNO A' ? 'A' : 'B'}`;
        const splitScale: Escala = {
          ...escalaOriginal,
          id: splitScaleId,
          turno: remainingTurno,
          horaInicio: remainingInicio,
          horaFim: remainingFim,
          militarId: targetPermuta.militarSubstituidoId // Original officer gets the other half
        };

        const updatedOriginal = {
          ...escalaOriginal,
          turno: targetPermuta.turno as any,
          horaInicio: targetPermuta.horaInicio,
          horaFim: targetPermuta.horaFim,
          militarId: targetPermuta.militarSubstitutoId // Volunteer gets the swapped half
        };

        try {
          await atualizarDados(escalaToUpdateId, { 
            dados_json: updatedOriginal 
          });
          await salvarDados(
            SYSTEM_USER_ID,
            `SPLIT ESCALA: ${splitScale.data} - ${splitScale.turno}`,
            "Parte restante da escala de 24h pos permuta",
            splitScale,
            splitScale.id
          );
        } catch (e) {
          console.error("Error splitting escala:", e);
        }

        setEscalas(prev => {
          const updated = prev.map(e => e.id === escalaToUpdateId ? updatedOriginal : e);
          const exists = prev.some(e => e.id === splitScale.id);
          if (exists) return updated;
          return [...updated, splitScale];
        });
      } else {
        // Standard non-split scale update
        try {
          await atualizarDados(escalaToUpdateId, { 
            dados_json: { ...escalaOriginal, militarId: targetPermuta.militarSubstitutoId } 
          });
        } catch (e) {
          console.error("Error updating escala:", e);
        }

        setEscalas(prev => prev.map(e => e.id === escalaToUpdateId ? {
          ...e,
          militarId: targetPermuta.militarSubstitutoId
        } : e));
      }
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
          await salvarDados(
            SYSTEM_USER_ID,
            `NOVA ESCALA: ${novaEscala.data} - ${novaEscala.turno}`,
            "Escala gerada via permuta homologada",
            novaEscala,
            novaEscala.id
          );
        } catch (e) {
          console.error("Error creating escala:", e);
        }

        setEscalas(prev => {
          const exists = prev.some(e => e.id === novaEscala.id);
          if (exists) return prev;
          return [...prev, novaEscala];
        });
      }
    }

    await appendAuditLog('PROCESSO_APROVADO', `Homologação oficial ativada por ${gestorNome} para protocolo ${targetPermuta.protocoloId}. Escala atualizada. Vias digitais autenticadas.`, gestorNome, logs);
    
    await sendNotification(
      targetPermuta.militarSubstituidoId,
      "Permuta Homologada",
      "Sua permuta foi homologada com sucesso.",
      targetPermuta.id,
      "HOMOLOGADA"
    );
    await sendNotification(
      targetPermuta.militarSubstitutoId,
      "Permuta Homologada",
      "Sua permuta foi homologada com sucesso.",
      targetPermuta.id,
      "HOMOLOGADA"
    );

    // Trigger auto-backup after significant state change
    await generateBackup('AUTO', gestorNome);
  };

  const handleRejectPermutaGestor = async (permutaId: string, motivo?: string) => {
    if (!loggedUser) return;
    const targetPermuta = permutas.find(p => p.id === permutaId);
    if (!targetPermuta) return;

    const dataAssinaturaGestor = new Date().toISOString().replace('T', ' ').slice(0, 16);

    try {
      await atualizarDados(permutaId, { 
        dados_json: { 
          ...targetPermuta, 
          status: 'REJEITADO', 
          gestorNome: loggedUser.nomeGuerra, 
          dataAssinaturaGestor,
          comentarioAlteracao: motivo || ''
        } 
      });
    } catch (e) {
      console.error("Error rejecting permuta:", e);
    }

    // Always update local state
    setPermutas(prev => prev.map(p => p.id === permutaId ? {
      ...p,
      status: 'REJEITADO',
      gestorNome: loggedUser.nomeGuerra,
      dataAssinaturaGestor,
      comentarioAlteracao: motivo || ''
    } : p));

    await appendAuditLog('PROCESSO_REJEITADO', `Permuta ID ${targetPermuta.protocoloId} rejeitada administrativamente pelo Comando de Batalhão.`, loggedUser.nomeGuerra, logs);

    const motivoStr = motivo ? ` Motivo: "${motivo}"` : "";
    await sendNotification(
      targetPermuta.militarSubstituidoId,
      "Permuta Rejeitada pelo Comando",
      `Sua permuta ref. ao dia ${formatarDataBR(targetPermuta.dataRealizacao)} foi rejeitada pelo Comando.${motivoStr}`,
      targetPermuta.id,
      "REJEITADA"
    );
    await sendNotification(
      targetPermuta.militarSubstitutoId,
      "Permuta Rejeitada pelo Comando",
      `Sua permuta ref. ao dia ${formatarDataBR(targetPermuta.dataRealizacao)} foi rejeitada pelo Comando.${motivoStr}`,
      targetPermuta.id,
      "REJEITADA"
    );

    // Trigger auto-backup
    await generateBackup('AUTO', loggedUser.nomeGuerra);
  };

  const handleTornarSemEfeitoPermuta = async (permutaId: string) => {
    if (!loggedUser || loggedUser.role !== 'ADMIN') return;
    const targetPermuta = permutas.find(p => p.id === permutaId);
    if (!targetPermuta) return;

    const dataAssinaturaGestor = new Date().toISOString().replace('T', ' ').slice(0, 16);

    try {
      await atualizarDados(permutaId, { 
        dados_json: { 
          ...targetPermuta, 
          status: 'SEM_EFEITO', 
          gestorNome: loggedUser.nomeGuerra, 
          dataAssinaturaGestor 
        } 
      });
    } catch (e) {
      console.error("Error setting SEM_EFEITO:", e);
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
      await atualizarDados(permutaId, { 
        dados_json: { 
          ...targetPermuta, 
          status: 'AJUSTE_GESTOR', 
          comentarioAlteracao: justificativa, 
          gestorNome: loggedUser.nomeGuerra, 
          dataAssinaturaGestor 
        } 
      });
    } catch (e) {
      console.error("Error adjusting permuta:", e);
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
      await salvarDados(
        SYSTEM_USER_ID,
        `MENSAGEM: SISTEMA -> ${targetPermuta.militarSubstituidoId}`,
        "Mensagem automática de aceite de permuta",
        automatedMsg,
        automatedMsg.id
      );
    } catch (e) {
      console.error("Supabase error creating automated message:", e);
    }

    setMessages(prev => {
      const exists = prev.some(m => m.id === automatedMsg.id);
      if (exists) return prev;
      return [...prev, automatedMsg].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
    });

    await sendNotification(
      targetPermuta.militarSubstituidoId,
      "Ajuste de Permuta Solicitado",
      `Sua permuta ref. ao dia ${formatarDataBR(targetPermuta.dataRealizacao)} necessita de ajustes solicitados pelo Comando: "${justificativa}"`,
      targetPermuta.id,
      "REJEITADA"
    );
  };

  const handleUpdateAlerta = async (alertaId: string, conteudo: string, color: string, icon: string, velocidade?: number, tamanho?: number) => {
    const alertaData = {
      id: alertaId,
      prioridade: 'CRÍTICA' as const,
      titulo: 'ALERTA DE SEGURANÇA',
      conteudo,
      color,
      icon,
      velocidade: velocidade || 3,
      tamanho: tamanho || 12,
      datahora: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };

    // 1. Update local state instantly
    setAlertas(prev => prev.map(a => a.id === alertaId ? alertaData : a));

    // 2. Save to localStorage instantly
    try {
      const saved = localStorage.getItem('permucyber_alertas');
      let currentAlertas: Alerta[] = [];
      if (saved) {
        currentAlertas = JSON.parse(saved);
      }
      const updatedLocal = currentAlertas.map(a => a.id === alertaId ? alertaData : a);
      localStorage.setItem('permucyber_alertas', JSON.stringify(updatedLocal));
    } catch (e) {
      console.error("Local storage error:", e);
    }

    // 3. Save to Supabase (Fallback DB)
    try {
      await salvarDados(
        SYSTEM_USER_ID,
        'ALERTA OPERACIONAL',
        `Atualização de alerta: ${conteudo.slice(0, 30)}...`,
        alertaData,
        alertaId
      );
    } catch (e) {
      console.warn("Supabase save error:", e);
    }

    // 5. Append Audit Log
    try {
      await appendAuditLog('INTEGRALIZAÇÃO', `Alerta operacional de comando atualizado: "${conteudo.slice(0, 45)}...".`, loggedUser?.nomeGuerra || 'SISTEMA', logs);
    } catch (e) {
      console.error("Audit log error:", e);
    }
  };

  const isCloudDefault = militares.length === 0 || isRosterDefault(militares);
  const localMilStr = localStorage.getItem('permucyber_militares');
  let hasLocalData = false;
  try {
    if (localMilStr) hasLocalData = !isRosterDefault(JSON.parse(localMilStr));
  } catch(e) {}
  const hasUnsyncedData = hasLocalData && isCloudDefault;

  if (isLoading) {
    return (
      <div className={`flex flex-col h-screen items-center justify-center bg-hud-bg text-cyber-cyan space-y-4 ${config.theme === 'pmce' ? 'theme-pmce' : config.theme === 'light' ? 'theme-light' : config.theme === 'contrast' ? 'theme-contrast' : config.theme === 'pmce-light' ? 'theme-pmce-light' : config.theme === 'pmce-claro-cyber' ? 'theme-pmce-claro-cyber' : config.theme === 'pmce-claro-verde' ? 'theme-pmce-claro-verde' : ''}`}>
        <div className="w-12 h-12 border-2 border-cyber-cyan/30 border-t-cyber-cyan rounded-full animate-spin" />
        <div className="text-xs font-mono uppercase tracking-widest animate-pulse">Sincronizando Base de Dados Supabase (Principal)...</div>
      </div>
    );
  }

  const userNotificacoes = loggedUser ? notificacoes.filter(n => n.militarId === loggedUser.id) : [];
  const unreadCount = userNotificacoes.filter(n => !n.visualizada).length;

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
      theme={config.theme}
      onThemeToggle={(newTheme) => handleUpdateConfig({ theme: newTheme })}
    >
      <InstallAppBanner />
      {!isLoggedIn ? (
        /* BIOMETRIC OR PASS LOGIN SCREEN */
        <div className="flex-1 flex flex-col h-full relative">
          {hasUnsyncedData && (
            <div className="absolute top-0 left-0 right-0 z-50 bg-cyber-amber p-2 text-center text-black font-black text-[9px] uppercase tracking-tighter leading-tight animate-bounce-short shadow-xl border-b border-black/20">
              ⚠️ ATENÇÃO: Dados locais detectados neste aparelho que não estão na nuvem.
              <button 
                onClick={handleForceSyncToCloud}
                className="ml-2 bg-black text-white px-2 py-0.5 rounded-sm hover:bg-black/80 transition-all border border-white/20"
              >
                SINCRONIZAR AGORA
              </button>
            </div>
          )}
          <BiometricLogin
            userLogged={loggedUser}
            allUsers={militares}
            onUserSelect={handleUserChange}
            onLoginSuccess={() => {
              setIsLoggedIn(true);
            }}
            onUpdateMilitarPin={handleUpdateMilitarPin}
          />
        </div>
      ) : (
        /* LOGGED IN CORE TACTICAL EXPERIENCE */
        <div className="flex-1 flex flex-col justify-between h-full bg-hud-bg relative">
          
          {/* Top Tactical Status & Notification Bar */}
          <div className="h-10 px-4 border-b border-hud-border bg-[#020507] flex items-center justify-between select-none shrink-0 relative z-40">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-pulse" />
              <span className="text-[10px] font-mono tracking-wider text-[#00e5ff] font-extrabold">Notificações</span>
            </div>
            
            {/* Notification Bell with Badge */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationCenter(!showNotificationCenter)}
                className="p-1.5 rounded-lg border border-hud-border/60 bg-black/40 hover:bg-[#00e5ff]/10 hover:border-[#00e5ff]/50 transition-all focus:outline-none flex items-center justify-center relative group"
                id="notification-bell-btn"
              >
                {unreadCount > 0 ? (
                  <BellRing className="w-4 h-4 text-cyber-amber animate-bounce" />
                ) : (
                  <Bell className="w-4 h-4 text-slate-400 group-hover:text-cyber-blue" />
                )}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 bg-cyber-red text-white text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center border border-black animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Notification Center Popover Panel */}
          {showNotificationCenter && (
            <div className="absolute top-11 right-4 left-4 max-w-sm bg-[#040d11] border-2 border-[#00e5ff]/30 rounded-xl p-4 shadow-[0_4px_25px_rgba(0,0,0,0.8)] z-50 animate-fade-in font-sans" id="notification-center-panel">
              <div className="flex items-center justify-between border-b border-hud-border/50 pb-2 mb-2">
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-[#00e5ff]" />
                  <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono">Central de Notificações</h4>
                </div>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllNotificationsAsRead}
                      className="text-[9px] text-[#00e5ff] font-bold hover:underline uppercase font-mono"
                      id="notif-mark-all-read-btn"
                    >
                      ✓ Ler Todas
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotificationCenter(false)}
                    className="text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded border border-hud-border bg-black/20"
                    id="notif-close-btn"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {userNotificacoes.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs font-mono uppercase">
                    Nenhuma notificação tática registrada.
                  </div>
                ) : (
                  userNotificacoes.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2.5 rounded-lg border text-xs transition-all relative ${
                        n.visualizada 
                          ? 'bg-black/10 border-hud-border/40 text-slate-400' 
                          : 'bg-cyber-blue/5 border-cyber-blue/30 text-slate-200 shadow-[0_0_8px_rgba(0,229,255,0.05)]'
                      }`}
                      id={`notif-item-${n.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5 mb-1 flex-wrap gap-1">
                            {!n.visualizada && (
                              <span className="w-1.5 h-1.5 rounded-full bg-cyber-amber shrink-0" />
                            )}
                            <span className="font-bold text-[11px] text-white tracking-wide uppercase font-mono">{n.titulo}</span>
                            {n.tipo && (
                              <span className={`text-[8px] px-1 py-0.2 rounded font-mono font-black uppercase tracking-widest ${
                                n.tipo === 'HOMOLOGADA' ? 'bg-cyber-green/10 text-cyber-green border border-cyber-green/20' :
                                n.tipo === 'REJEITADA' ? 'bg-cyber-red/10 text-cyber-red border border-cyber-red/20' :
                                'bg-cyber-blue/10 text-cyber-blue border border-cyber-blue/20'
                              }`}>
                                {n.tipo}
                              </span>
                            )}
                          </div>
                          <p className="text-[10.5px] leading-relaxed text-slate-300 pr-4">{n.mensagem}</p>
                          <span className="text-[8px] font-mono text-slate-500 mt-1 block">
                            {new Date(n.dataHora).toLocaleString('pt-BR')}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5 shrink-0">
                          {!n.visualizada && (
                            <button
                              onClick={() => handleMarkNotificationAsRead(n.id)}
                              className="text-[9px] text-[#00e5ff] hover:text-white p-1 bg-black/20 rounded border border-hud-border/40"
                              title="Marcar como lida"
                              id={`notif-mark-read-${n.id}`}
                            >
                              ✓
                            </button>
                          )}
                          <button
                            onClick={() => handleClearNotification(n.id)}
                            className="text-[9px] text-cyber-red/80 hover:text-cyber-red p-1 bg-black/20 rounded border border-hud-border/40"
                            title="Remover"
                            id={`notif-clear-${n.id}`}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Immediate creation confirmation toast modal */}
          {creationSuccessMessage && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-55 animate-fade-in select-none">
              <div className="max-w-xs w-full bg-[#040d11] border-2 border-cyber-cyan/50 rounded-2xl p-5 flex flex-col items-center text-center space-y-4 shadow-[0_0_30px_rgba(0,229,255,0.25)] relative overflow-hidden font-sans">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyber-cyan to-transparent"></div>
                <div className="w-12 h-12 rounded-full bg-cyber-green/10 border-2 border-cyber-green flex items-center justify-center shadow-[0_0_15px_rgba(0,255,102,0.2)] animate-pulse">
                  <Check className="w-6 h-6 text-cyber-green" />
                </div>
                <h4 className="text-xs font-black text-white uppercase tracking-widest font-mono">SOLICITAÇÃO PROTOCOLADA!</h4>
                <p className="text-[10.5px] text-slate-300 leading-normal">{creationSuccessMessage}</p>
                <button
                  onClick={() => setCreationSuccessMessage(null)}
                  className="w-full bg-cyber-cyan text-black hover:bg-white hover:text-black transition-all text-[10px] font-extrabold py-2.5 rounded-xl font-mono uppercase shadow-[0_0_10px_rgba(0,229,255,0.15)] cursor-pointer"
                  id="confirm-creation-toast-btn"
                >
                  CONCORDAR E CONTINUAR
                </button>
              </div>
            </div>
          )}
          
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
                onCorrect={handleCorrectPermuta}
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
                          {(loggedUser?.role === 'COMANDANTE' || loggedUser?.role === 'ADMIN') ? "Histórico Geral de Permutas" : "Minhas Solicitações de Troca"}
                        </h3>
                        {loggedUser?.role !== 'COMANDANTE' && loggedUser?.role !== 'ADMIN' && (
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
                        )}
                      </div>

                      {(() => {
                        const isLeadership = loggedUser?.role === 'COMANDANTE' || loggedUser?.role === 'ADMIN';
                        const userPermutas = isLeadership 
                          ? permutas.filter(p => p.status === 'APROVADO' || p.status === 'REJEITADO' || p.status === 'REJEITADO_SUBSTITUTO')
                          : permutas.filter(p => p.militarSubstituidoId === loggedUser?.id || p.militarSubstitutoId === loggedUser?.id);

                        if (userPermutas.length === 0) {
                          return (
                            <div className="bg-[#051115] border border-hud-border/40 p-6 rounded-xl text-center text-slate-400 font-sans text-xs">
                              {isLeadership 
                                ? "Nenhuma permuta homologada ou recusada registrada no sistema."
                                : "Nenhuma solicitação de troca encontrada. Para iniciar nova proposta, selecione uma escala na tela inicial do Dashboard."
                              }
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
                            } else if (p.status === 'SEM_EFEITO') {
                              badgeStyle = 'bg-slate-500/10 text-slate-400 border-slate-500/30';
                              stateLabel = 'Não Efetuada';
                            }

                            const isHomologated = p.status === 'APROVADO';

                            if (isHomologated) {
                              return (
                                <div key={p.id} id={`my-permuta-item-${p.id}`} className="mt-1">
                                  <DocumentoHomologacao
                                    permuta={p}
                                    allMilitares={militares}
                                  />
                                </div>
                              );
                            }

                            return (
                              <div 
                                key={p.id}
                                className={`bg-hud-card border rounded-xl transition-all relative overflow-hidden ${
                                  isHighlighted 
                                    ? 'border-cyber-cyan shadow-[0_0_15px_rgba(0,229,255,0.15)] scale-[1.01] z-10' 
                                    : 'border-hud-border'
                                } p-3.5 space-y-3`}
                                id={`my-permuta-item-${p.id}`}
                              >
                                {isHighlighted && (
                                  <div className="absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-cyber-cyan to-transparent animate-pulse" />
                                )}

                                <div className="flex justify-between items-start">
                                  <div className="min-w-0">
                                    <span className="text-[8px] text-slate-400 font-mono uppercase tracking-tighter">Protocolo: nº {p.protocoloId}</span>
                                    <h4 className="text-xs font-bold text-white tracking-wide mt-0.5 truncate">{p.postoServico}</h4>
                                  </div>
                                  <span className={`text-[9px] px-1.5 py-0.5 border rounded uppercase font-bold shrink-0 ${badgeStyle}`}>
                                    {stateLabel}
                                  </span>
                                </div>

                                <div className="flex justify-between items-center text-[10.5px] text-slate-400 border-t border-hud-border/30 pt-2.5">
                                  <span className="truncate mr-2">
                                    De: {origin?.nomeGuerra} ➔ Para: {dest?.nomeGuerra}
                                  </span>
                                  <div className="flex items-center text-cyber-blue font-mono shrink-0">
                                    <Clock className="w-3 h-3 mr-1" />
                                    <span>{formatarDataBR(p.dataRealizacao)} ({p.turno})</span>
                                  </div>
                                </div>

                                {p.status === 'SEM_EFEITO' && p.motivoSemEfeito && (
                                  <div className="bg-red-500/5 border border-red-500/20 rounded p-2 text-[9px] text-red-400 font-mono">
                                    <strong>MOTIVO:</strong> {p.motivoSemEfeito}
                                  </div>
                                )}

                                {/* Review adjustment request from colleague */}
                                {p.status === 'ALTERACAO_SOLICITADA' && p.militarSubstituidoId === loggedUser?.id && (
                                  <button
                                    onClick={() => setActiveReviewPermuta(p)}
                                    className="w-full bg-[#1c1204] border border-cyber-amber/50 hover:bg-[#2a1b06] transition-all text-[10px] font-semibold font-mono text-cyber-amber py-1.5 rounded-md mt-1.5 uppercase flex items-center justify-center"
                                  >
                                    REVISAR AJUSTE SOLICITADO
                                  </button>
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
                                 (p.status === 'PENDENTE_SUBSTITUTO' || p.status === 'PENDENTE_GESTOR' || p.status === 'AJUSTE_GESTOR' || p.status === 'ALTERACAO_SOLICITADA') && (
                                  <div className="flex gap-2 mt-2 pt-2 border-t border-hud-border/30">
                                    <button 
                                      onClick={() => handleCorrectPermuta(p)}
                                      className="w-full bg-cyber-blue/10 border border-cyber-blue/40 text-cyber-blue text-[10px] font-bold py-2 rounded uppercase hover:bg-cyber-blue/20 transition-all flex items-center justify-center cursor-pointer shadow-[0_0_10px_rgba(0,229,255,0.05)]"
                                    >
                                      Ajustar
                                    </button>
                                    {loggedUser?.role === 'ADMIN' && (
                                      <button 
                                        onClick={async () => {
                                          // Removed window.confirm for better iframe compatibility
                                          await handleDeletePermuta(p.id);
                                        }}
                                        className="w-full bg-cyber-red/10 border border-cyber-red/40 text-cyber-red text-[10px] font-bold py-2 rounded uppercase hover:bg-cyber-red/20 transition-all flex items-center justify-center cursor-pointer"
                                      >
                                        Excluir
                                      </button>
                                    )}
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
                        onUpdateBackupStatusMsg={setBackupStatusMsg}
                        onCreateBackup={(tipo) => generateBackup(tipo, loggedUser?.nomeGuerra || 'SISTEMA')}
                        onRestoreBackup={handleRestoreBackup}
                        onForceSyncToCloud={handleForceSyncToCloud}
                        onLoadBackupsOnDemand={handleLoadBackupsOnDemand}
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
            <div className="h-14 border-t border-hud-border bg-hud-board/90 px-3 flex items-center justify-between text-slate-400 relative z-30 font-mono text-[9px] select-none shadow-[0_-4px_10px_rgba(0,0,0,0.4)]">
              
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
                  localStorage.removeItem('permucyber_is_logged');
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
      {/* Status de Sincronização */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center space-x-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-cyber-cyan/20 pointer-events-none">
        <div className={`w-2 h-2 rounded-full ${
          realtimeStatus === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
          realtimeStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
          realtimeStatus === 'unconfigured' ? 'bg-amber-500' :
          'bg-red-500'
        }`} />
        <span className="text-[10px] font-mono uppercase tracking-tighter text-cyber-cyan/80">
          {realtimeStatus === 'online' ? 'Nuvem Ativa' : 
           realtimeStatus === 'connecting' ? 'Sincronizando...' : 
           realtimeStatus === 'unconfigured' ? 'Configuração necessária' :
           'Nuvem Offline'}
        </span>
      </div>

      {/* Reusable Security/Delete Confirmation Modal Dialog Overlay */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/85 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#05141b] border-2 border-cyber-red/50 rounded-lg max-w-sm w-full p-5 shadow-[0_0_50px_rgba(255,46,99,0.2)] relative overflow-hidden text-white font-sans animate-scale-up">
            
            {/* Header */}
            <div className="flex items-center space-x-3 mb-4 border-b border-cyber-red/20 pb-3">
              <ShieldAlert className="w-8 h-8 text-cyber-red animate-pulse shrink-0" />
              <div>
                <h3 className="text-cyber-red tracking-widest font-mono text-[11px] uppercase font-extrabold leading-tight">
                  {confirmModal.title}
                </h3>
                <span className="text-[7.5px] font-mono text-slate-500 uppercase tracking-tighter block mt-0.5">SISTEMA DE SEGURANÇA OPERACIONAL</span>
              </div>
            </div>
            
            {/* Body */}
            <div className="space-y-3">
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {confirmModal.description}
              </p>
              
              {confirmModal.warningText && (
                <div className="bg-cyber-red/5 border border-cyber-red/30 p-2.5 rounded text-[9px] text-cyber-red font-mono leading-normal">
                  <span className="font-bold uppercase text-[9px] block mb-1">⚠️ CONSEQÜÊNCIA IMPREVISTA:</span>
                  {confirmModal.warningText}
                </div>
              )}
            </div>
            
            {/* Action buttons */}
            <div className="flex space-x-2.5 mt-5">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded font-mono text-[9px] font-bold uppercase transition-all tracking-wider text-center cursor-pointer"
              >
                {confirmModal.cancelText || 'Cancelar'}
              </button>
              <button
                onClick={async () => {
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  await confirmModal.onConfirm();
                }}
                className="flex-1 py-2 bg-cyber-red/25 hover:bg-cyber-red/40 border border-cyber-red text-cyber-red rounded font-mono text-[9px] font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,46,99,0.15)] text-center cursor-pointer"
              >
                {confirmModal.confirmText || 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MilitaryMobileFrame>
  );
}
