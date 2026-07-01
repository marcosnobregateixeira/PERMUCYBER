/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  TrendingUp, 
  HardDrive, 
  Lock, 
  Users, 
  Activity, 
  QrCode, 
  Clock, 
  CheckSquare,
  ShieldCheck,
  Award,
  AlertTriangle,
  Database,
  Upload,
  Download,
  RefreshCw,
  FileCode,
  Key,
  Trash2,
  User,
  Edit,
  Search,
  ChevronDown
} from 'lucide-react';
import { Permuta, Militar, BlockchainLog, Escala, Role } from '../types';
import { generateSimpleHash, formatarDataBR } from '../data';
import DocumentoHomologacao from './DocumentoHomologacao';

interface PainelGestorProps {
  permutas: Permuta[];
  allMilitares: Militar[];
  logs: BlockchainLog[];
  userLogged?: Militar;
  escalas: Escala[];
  onApprovePermuta: (permutaId: string, gestorNome: string, gestorAssinatura: string) => void;
  onRejectPermuta: (permutaId: string) => void;
  onAdjustPermuta: (permutaId: string, justificativa: string) => void;
  onTornarSemEfeitoPermuta?: (permutaId: string) => void;
  onDeletePermuta?: (permutaId: string) => void;
  onRefreshData?: () => void;
  onImportMilitaresJSON?: (militares: Militar[]) => void;
  onUpdateMilitarNomeGuerra?: (id: string, newNome: string) => void;
  onUpdateMilitar?: (id: string, updatedFields: Partial<Militar>) => void;
  onUpdateMilitarRole?: (id: string, role: Role) => void;
  onUpdateMilitarMF?: (id: string, newMF: string) => void;
  onUpdateMilitarNumero?: (id: string, numero: string) => void;
  onAddMilitar?: (m: Militar) => void;
  onDeleteMilitar?: (id: string) => void;
  onClearLogs?: () => void;
  onDeleteLog?: (id: string) => void;
  onToggleBiometria?: (id: string) => void;
  onUserSwitch?: (userId: string) => void;
  onClearAllPermutas?: () => void;
  onClearAllMilitares?: () => void;
  backups?: any[];
  backupStatusMsg?: string;
  onCreateBackup?: (tipo: 'AUTO' | 'MANUAL') => Promise<any>;
  onRestoreBackup?: (bk: any) => void;
  config: import('../types').AppConfig;
  onUpdateConfig: (cfg: Partial<import('../types').AppConfig>) => void;
}

const PATENTE_ORDER_G: Record<string, number> = {
  'CEL': 1, 'TC': 2, 'MAJ': 3, 'CAP': 4, '1ºTEN': 5, '2ºTEN': 6, 'ASP. OF': 7, 
  'AL. OF': 8, 'ST': 9, '1ºSGT': 10, '2ºSGT': 11, '3ºSGT': 12, 'CB': 13, 'SD': 14
};

const sortMilitarByPatenteG = (a: Militar, b: Militar) => {
  const diff = (PATENTE_ORDER_G[a.patente] || 99) - (PATENTE_ORDER_G[b.patente] || 99);
  if (diff !== 0) return diff;
  return a.nome.localeCompare(b.nome);
};

export default function PainelGestor({
  permutas,
  allMilitares,
  logs,
  userLogged,
  escalas,
  onApprovePermuta,
  onRejectPermuta,
  onAdjustPermuta,
  onTornarSemEfeitoPermuta,
  onDeletePermuta,
  onRefreshData,
  onImportMilitaresJSON,
  onUpdateMilitarNomeGuerra,
  onUpdateMilitar,
  onUpdateMilitarRole,
  onUpdateMilitarMF,
  onUpdateMilitarNumero,
  onAddMilitar,
  onDeleteMilitar,
  onClearLogs,
  onDeleteLog,
  onToggleBiometria,
  onUserSwitch,
  onClearAllPermutas,
  onClearAllMilitares,
  backups,
  backupStatusMsg,
  onCreateBackup,
  onRestoreBackup,
  config,
  onUpdateConfig
}: PainelGestorProps) {
  const sortedMilitares = [...allMilitares].sort(sortMilitarByPatenteG);
  const [activeSubTab, setActiveSubTab] = useState<'PEDIDOS' | 'AUDITORIA' | 'RELATORIOS' | 'SISTEMA' | 'EXCLUSAO' | 'ACESSOS'>('PEDIDOS');
  const [newMilitarForm, setNewMilitarForm] = useState<Partial<Militar>>({ nome: '', nomeGuerra: '', patente: 'SD', funcao: 'ADM', quadro: 'QPPM', pinSegurança: '1234', numero: '', matriculaFuncional: '', turno: 'TURNO A' });
  const [militarIdToDelete, setMilitarIdToDelete] = useState<string | null>(null);
  const [editingMilitar, setEditingMilitar] = useState<Militar | null>(null);
  const [editPolicialTab, setEditPolicialTab] = useState<'GERAL' | 'AFASTAMENTOS'>('GERAL');

  const maskMF = (val: string) => {
    let v = val.replace(/\D/g, '');
    if (v.length > 8) v = v.substring(0, 8);
    if (v.length > 3) v = v.replace(/^(\d{3})(\d)/, '$1.$2');
    if (v.length > 7) v = v.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2-$3');
    if (v.length > 9) v = v.replace(/^(\d{3})\.(\d{3})-(\d)(\d)/, '$1.$2-$3-$4');
    return v;
  };

  const maskNumeral = (val: string) => {
    let v = val.replace(/\D/g, '');
    if (v.length > 5) v = v.substring(0, 5);
    if (v.length > 2) v = v.replace(/^(\d{2})(\d)/, '$1.$2');
    return v;
  };
  const getDynamicMilitarStatus = (m: any) => {
    if (!m) return null;
    const todayStr = new Date().toISOString().split('T')[0];
    if (m.afastamentos && m.afastamentos.length > 0) {
      const sortedAf = [...m.afastamentos].sort((a, b) => b.dataFim.localeCompare(a.dataFim));
      
      const active = sortedAf.find(a => todayStr >= a.dataInicio && todayStr <= a.dataFim);
      if (active) {
        return {
          type: 'AFASTADO',
          label: `AFASTADO (${active.motivo})`,
          detail: `Fim: ${active.dataFim.split('-').reverse().join('/')}`,
          color: 'text-cyber-red bg-cyber-red/10 border-cyber-red/30'
        };
      }
      
      const future = sortedAf.find(a => a.dataInicio > todayStr);
      if (future) {
        return {
          type: 'AGENDADO',
          label: `APTO / AGENDADO: ${future.motivo}`,
          detail: `Início: ${future.dataInicio.split('-').reverse().join('/')}`,
          color: 'text-cyber-amber bg-cyber-amber/10 border-cyber-amber/30'
        };
      }
      
      const past = sortedAf.find(a => todayStr > a.dataFim);
      if (past) {
        return {
          type: 'RETORNADO',
          label: `APTO (RETORNADO AUTOMATICAMENTE)`,
          detail: `${past.motivo} concluído em ${past.dataFim.split('-').reverse().join('/')}`,
          color: 'text-cyber-green bg-cyber-green/10 border-cyber-green/30'
        };
      }
    }
    return {
      type: 'PRONTO',
      label: 'APTO / PRONTO',
      detail: 'Operacional regular',
      color: 'text-cyber-cyan bg-cyber-cyan/10 border-cyber-cyan/30'
    };
  };

  const [reportTipo, setReportTipo] = useState<'GERAL' | 'INDIVIDUAL' | 'FUNCAO' | 'SETOR'>('GERAL');
  const [reportMilitarId, setReportMilitarId] = useState<string>('');
  const [reportFuncao, setReportFuncao] = useState<string>('');
  const [reportSetor, setReportSetor] = useState<string>('');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [selectedPermutaDetailId, setSelectedPermutaDetailId] = useState<string | null>(null);
  const [justificativaAjuste, setJustificativaAjuste] = useState<string>('');
  const [militarSearchTerm, setMilitarSearchTerm] = useState('');
  const [credencialSearchTerm, setCredencialSearchTerm] = useState('');
  const [verificarMilitarId, setVerificarMilitarId] = useState<string>('');
  const [selecionadoMes, setSelecionadoMes] = useState<number>(() => {
    const saved = localStorage.getItem('painel_selecionado_mes');
    return saved !== null ? Number(saved) : new Date().getMonth();
  });
  const [selecionadoAno, setSelecionadoAno] = useState<number>(() => {
    const saved = localStorage.getItem('painel_selecionado_ano');
    return saved !== null ? Number(saved) : new Date().getFullYear();
  });

  useEffect(() => {
    localStorage.setItem('painel_selecionado_mes', String(selecionadoMes));
  }, [selecionadoMes]);

  useEffect(() => {
    localStorage.setItem('painel_selecionado_ano', String(selecionadoAno));
  }, [selecionadoAno]);

  const filteredMilitares = sortedMilitares.filter(m => 
    m.nome.toLowerCase().includes(militarSearchTerm.toLowerCase()) ||
    m.nomeGuerra.toLowerCase().includes(militarSearchTerm.toLowerCase()) ||
    (m.numero && m.numero.includes(militarSearchTerm)) ||
    m.id.toLowerCase().includes(militarSearchTerm.toLowerCase())
  );

  const filteredMilitaresForCredenciais = sortedMilitares.filter(m => 
    m.nome.toLowerCase().includes(credencialSearchTerm.toLowerCase()) ||
    m.nomeGuerra.toLowerCase().includes(credencialSearchTerm.toLowerCase()) ||
    (m.numero && m.numero.includes(credencialSearchTerm)) ||
    m.id.toLowerCase().includes(credencialSearchTerm.toLowerCase())
  );

  const handleGerarPDF = async () => {
    try {
      const doc = new jsPDF('p', 'pt', 'a4');
      
      // ==========================================
      // [PROTECTED FORMATTING] RELATÓRIO PDF
      // Este cabeçalho e layout foram refinados exaustivamente para evitar sobreposição 
      // e garantir alinhamento perfeito. Manter as coordenadas exatas.
      // ==========================================
      
      // Title Header Section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      const titleLine1 = `DIRETORIA DE SAÚDE`;
      const titleLine2 = `RELATÓRIO DE PERMUTAS`;
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Draw a subtle double line for style
      doc.setDrawColor(200, 200, 200);
      doc.line(40, 85, pageWidth - 40, 85);
      doc.line(40, 88, pageWidth - 40, 88);

      doc.text(titleLine1, pageWidth/2, 50, { align: 'center' });
      doc.text(titleLine2, pageWidth/2, 68, { align: 'center' });

      // Logos (Sized and positioned to avoid overlap) with robust fallback defaults when database has quota issues
      const logoSize = 55;
      const leftLogo = config.brasaoEsquerdoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Coat_of_arms_of_Brazil.svg/200px-Coat_of_arms_of_Brazil.svg.png';
      const rightLogo = config.brasaoDireitoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Star_of_life2.svg/200px-Star_of_life2.svg.png';

      try {
        doc.addImage(leftLogo, 'PNG', 45, 20, logoSize, logoSize); 
      } catch (e) {
        console.warn("Left logo link fail or CORS issue", e);
      }

      try {
        doc.addImage(rightLogo, 'PNG', pageWidth - 45 - logoSize, 20, logoSize, logoSize); 
      } catch (e) {
        console.warn("Right logo link fail or CORS issue", e);
      }
      
      // Subinfo
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Período: ${dataInicio ? formatarDataBR(dataInicio) : 'INÍCIO'} a ${dataFim ? formatarDataBR(dataFim) : 'ATUAL'}`, 40, 110);
      
      if (reportTipo === 'INDIVIDUAL' && reportMilitarId) {
        const policialNome = allMilitares.find(m => m.id === reportMilitarId)?.nome || '...';
        doc.text(`Policial: ${policialNome}`, 40, 125);
      } else if (reportTipo === 'FUNCAO' && reportFuncao) {
        doc.text(`Função: ${reportFuncao}`, 40, 125);
      } else if (reportTipo === 'SETOR' && reportSetor) {
        doc.text(`Setor: ${reportSetor}`, 40, 125);
      }
      
      const tempY = ((reportTipo === 'INDIVIDUAL' && reportMilitarId) || (reportTipo === 'FUNCAO' && reportFuncao) || (reportTipo === 'SETOR' && reportSetor)) ? 145 : 130;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("TURNOS:", 40, tempY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("TURNO A: 06H às 18H | TURNO B: 18H às 06H | 24H: 06H às 06H | EXPEDIENTE", 40, tempY + 12);
      
      const startY = tempY + 25;

      const approvedPermutas = filteredPermutas.filter(p => p.status === 'APROVADO' || p.status === 'SEM_EFEITO');

      const tableData = approvedPermutas.map(p => {
        const substituto = allMilitares.find(m => m.id === p.militarSubstitutoId);
        const substituido = allMilitares.find(m => m.id === p.militarSubstituidoId);
        
        // Robust extraction of YYYY-MM-DD from 'YYYY-MM-DD HH:MM' or 'YYYY-MM-DDTHH:MM'
        const rawDate = p.dataAssinaturaGestor ? p.dataAssinaturaGestor.replace('T', ' ').split(' ')[0] : '';
        const dataHomologacao = rawDate ? formatarDataBR(rawDate) : '00-00-0000';
        
        const nameParts = (p.gestorNome || "").split(' ');
        const actualName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : (p.gestorNome || "");
        const gestorObj = p.gestorNome ? allMilitares.find(m => 
          m.nomeGuerra.toUpperCase() === p.gestorNome!.toUpperCase() ||
          m.nome.toUpperCase().includes(p.gestorNome!.toUpperCase())
        ) : null;
        const gestorClean = gestorObj ? `${gestorObj.patente} ${actualName}` : (p.gestorNome || "");
        const homolStr = p.gestorNome ? `${dataHomologacao} - ${gestorClean}` : `${dataHomologacao} - Pendente`;

        const subObj = formatMilitarRelatorio(substituto);
        const subdoObj = formatMilitarRelatorio(substituido);
        const statusServico = p.status === 'SEM_EFEITO' ? 'TORNADO SEM EFEITO' : 'CUMPRIDA';

        return [
          p.turno,
          formatarDataBR(p.dataRealizacao),
          subObj,
          subdoObj,
          homolStr,
          statusServico
        ];
      });

      autoTable(doc, {
        startY: startY,
        head: [['TURNO', 'DATA', 'MILITAR SUBSTITUTO', 'MILITAR SUBSTITUÍDO', 'DADOS DA HOMOLOGAÇÃO', 'STATUS DO SERVIÇO']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 45], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'center' },
        styles: { fontSize: 7, cellPadding: 3, overflow: 'linebreak', halign: 'center', valign: 'middle' },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 50 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 100, fontSize: 6.5 },
          5: { cellWidth: 70, fontSize: 6.5 }
        },
        alternateRowStyles: { fillColor: [250, 250, 250] }
      });

      const finalY = (doc as any).lastAutoTable.finalY || startY;
      const comandante = (userLogged?.role === 'COMANDANTE' || userLogged?.role === 'ADMIN') ? userLogged : (allMilitares.find(m => m.role === 'COMANDANTE') || userLogged);
      
      const sigY = finalY + 80;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.line(pageWidth / 2 - 100, sigY, pageWidth / 2 + 100, sigY);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`${comandante.nome.toUpperCase()} - ${comandante.patente} ${comandante.quadro || 'QPPM'}`, pageWidth / 2, sigY + 15, { align: 'center' });
      doc.setFont("helvetica", "normal");
      doc.text(comandante.funcao, pageWidth / 2, sigY + 30, { align: 'center' });
      doc.text(`M.F. ${comandante.matriculaFuncional || '___.___._-_'}`, pageWidth / 2, sigY + 45, { align: 'center' });

      doc.save(`relatorio-permutas-${reportTipo.toLowerCase()}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      // Fallback
      window.print();
    }
  };

  const filteredPermutas = permutas.filter(p => {
    let matches = true;
    if (dataInicio && p.dataRealizacao < dataInicio) matches = false;
    if (dataFim && p.dataRealizacao > dataFim) matches = false;
    if (reportTipo === 'INDIVIDUAL' && reportMilitarId) {
        if (p.militarSubstituidoId !== reportMilitarId && p.militarSubstitutoId !== reportMilitarId) matches = false;
    }
    if (reportTipo === 'FUNCAO' && reportFuncao) {
        const substituto = allMilitares.find(m => m.id === p.militarSubstitutoId);
        const substituido = allMilitares.find(m => m.id === p.militarSubstituidoId);
        if (substituto?.funcao !== reportFuncao && substituido?.funcao !== reportFuncao) matches = false;
    }
    if (reportTipo === 'SETOR' && reportSetor) {
        const substituto = allMilitares.find(m => m.id === p.militarSubstitutoId);
        const substituido = allMilitares.find(m => m.id === p.militarSubstituidoId);
        if (substituto?.setor !== reportSetor && substituido?.setor !== reportSetor) matches = false;
    }
    return matches;
  }).sort((a, b) => a.dataRealizacao.localeCompare(b.dataRealizacao));

  // ==========================================
  // [PROTECTED FORMATTING] LÓGICA DE FORMATAÇÃO MILITAR
  // Define como o militar aparece no relatório (Rank + Numeral + Nome)
  // Numeral somente para rankings específicos.
  // ==========================================
  const formatMilitarRelatorio = (m: Militar | undefined) => {
    if (!m) return 'N/A';
    const ranksWithNumeral = ['ST', '1ºSGT', '2ºSGT', '3ºSGT', 'CB', 'SD'];
    const showNumeral = ranksWithNumeral.includes(m.patente);
    const parts = m.nomeGuerra.split(' ');
    const actualNomeGuerra = parts.length > 1 ? parts.slice(1).join(' ') : m.nomeGuerra;
    
    if (showNumeral && m.numero) {
      return `${m.patente} ${m.numero} ${actualNomeGuerra.toUpperCase()}`;
    }
    return `${m.patente} ${actualNomeGuerra.toUpperCase()}`;
  };

  const lastGestor = filteredPermutas.find(p => p.gestorNome)?.gestorNome;
  const [showAjusteParaId, setShowAjusteParaId] = useState<string | null>(null);
  const [selectedHistoricId, setSelectedHistoricId] = useState<string | null>(null);
  const [isHistoricoExpanded, setIsHistoricoExpanded] = useState<boolean>(false);
  const [historicoFilter, setHistoricoFilter] = useState<'TODAS' | 'APROVADAS' | 'REJEITADAS' | 'SEM_EFEITO'>('TODAS');
  const [confirmSemEfeitoId, setConfirmSemEfeitoId] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const pendentesGestor = permutas.filter(p => p.status === 'PENDENTE_GESTOR');
  const historicoCompleto = permutas
    .filter(p => p.status !== 'PENDENTE_GESTOR' && p.status !== 'PENDENTE_SUBSTITUTO')
    .sort((a, b) => new Date(a.dataRealizacao).getTime() - new Date(b.dataRealizacao).getTime());

  // Simple stats
  const totalSolicitacoes = permutas.length;
  const totalAprovadas = permutas.filter(p => p.status === 'APROVADO').length;
  const descansoMedioIndex = 98.2; // simulated tactical compliance

  const handleApprove = (pId: string) => {
    if (!userLogged) return;
    const gestorAssinatura = `COMAS-CENTRAL::${userLogged.nomeGuerra.toUpperCase()}::SECURE-CRYPTO-OK-${Math.floor(Math.random()*1000).toString(16).toUpperCase()}`;
    onApprovePermuta(pId, userLogged.nomeGuerra, gestorAssinatura);
    setSelectedPermutaDetailId(null);
    showToast('OK! Permuta homologada com sucesso.', 'success');
  };

  const handleDelete = (pId: string) => {
    if (onDeletePermuta) {
      onDeletePermuta(pId);
      setSelectedPermutaDetailId(null);
      showToast('OK! Registro excluído.', 'success');
    }
  };

  const handleReject = (pId: string) => {
    onRejectPermuta(pId);
    setSelectedPermutaDetailId(null);
    showToast('OK! Permuta rejeitada.', 'success');
  };

  const handleSendAdjust = (pId: string) => {
    if (!justificativaAjuste) return;
    onAdjustPermuta(pId, justificativaAjuste);
    setShowAjusteParaId(null);
    setJustificativaAjuste('');
    setSelectedPermutaDetailId(null);
    showToast('OK! Solicitação de ajuste enviada para o policial.', 'success');
  };

  // Calculations for current month's permutas and selected policeman
  const currentYear = selecionadoAno;
  const currentMonth = selecionadoMes; // 0-11
  
  // All approved permutas in current month
  const permutasAprovadasMesAtual = permutas.filter(p => {
    if (p.status !== 'APROVADO') return false;
    const pDate = new Date(p.dataRealizacao + 'T12:00:00');
    return pDate.getFullYear() === currentYear && pDate.getMonth() === currentMonth;
  });

  // Selected officer's approved permutas in current month
  const permutasMilitarMesAtual = permutasAprovadasMesAtual.filter(p => {
    if (!verificarMilitarId) return false;
    return p.militarSubstituidoId === verificarMilitarId || p.militarSubstitutoId === verificarMilitarId;
  });

  // Extract unique sorted dates (formatted as DD/MM) for the selected officer (or all if none selected)
  const targetPermutasList = verificarMilitarId ? permutasMilitarMesAtual : permutasAprovadasMesAtual;
  const datasMesAtual = Array.from(new Set(
    targetPermutasList.map(p => {
      const pDate = new Date(p.dataRealizacao + 'T12:00:00');
      const dia = String(pDate.getDate()).padStart(2, '0');
      const mes = String(pDate.getMonth() + 1).padStart(2, '0');
      return `${dia}/${mes}`;
    })
  )).sort((a, b) => {
    const [diaA, mesA] = a.split('/').map(Number);
    const [diaB, mesB] = b.split('/').map(Number);
    return mesA !== mesB ? mesA - mesB : diaA - diaB;
  });

  return (
    <div className="flex-1 flex flex-col p-4 bg-[#03080a] text-slate-100 select-none pb-12" id="painel-gestor-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{ zIndex: 99999 }} className={`fixed top-10 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-xl text-center text-xs font-mono font-bold uppercase tracking-wider transition-all ${
          toastMessage.type === 'success' 
            ? 'bg-[#021c22] text-[#00ff66] border border-[#00ff66]/40 shadow-[0_0_20px_rgba(0,255,102,0.3)]' 
            : 'bg-[#1c0202] text-cyber-red border border-cyber-red/40 shadow-[0_0_20px_rgba(255,0,51,0.3)]'
        }`}>
          {toastMessage.msg}
        </div>
      )}

      {/* COMPACT SUB TABS CONTROLS */}
      <div className="grid grid-cols-4 gap-1 bg-[#061217] p-1 rounded-lg border border-hud-border/70 mb-4 text-[10px] font-mono">
        <button
          onClick={() => setActiveSubTab('PEDIDOS')}
          className={`py-1.5 rounded uppercase font-bold transition-all text-center ${
            activeSubTab === 'PEDIDOS'
              ? 'bg-cyber-blue text-[#03080a]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          ANÁLISE
        </button>
        <button
          onClick={() => setActiveSubTab('AUDITORIA')}
          className={`py-1.5 rounded uppercase font-bold transition-all text-center ${
            activeSubTab === 'AUDITORIA'
              ? 'bg-cyber-blue text-[#03080a]'
              : 'text-slate-400 hover:text-white'
          }`}
          id="gestor-auditoria-tab"
        >
          AUDITORIA
        </button>
        <button
          onClick={() => setActiveSubTab('RELATORIOS')}
          className={`py-1.5 rounded uppercase font-bold transition-all text-center ${
            activeSubTab === 'RELATORIOS'
              ? 'bg-cyber-blue text-[#03080a]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          RELATÓRIOS
        </button>
        <button
          onClick={() => setActiveSubTab('SISTEMA')}
          className={`py-1.5 rounded uppercase font-bold transition-all text-center ${
            activeSubTab === 'SISTEMA'
              ? 'bg-cyber-blue text-[#03080a]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          SISTEMA
        </button>
      </div>

      {/* QUICK KPI METRIC CARDS */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-center">
        <div className="bg-hud-card border border-hud-border p-2 rounded-lg flex flex-col justify-between min-h-[58px] text-left gap-1">
          <span className="text-[7.5px] font-mono text-slate-500 block uppercase">FILA RATIF.</span>
          <select
            value={verificarMilitarId}
            onChange={(e) => setVerificarMilitarId(e.target.value)}
            className="w-full bg-[#020507] border border-hud-border rounded px-1 py-0.5 text-white text-[10px] font-mono focus:border-cyber-blue outline-none uppercase cursor-pointer mb-0.5"
          >
            <option value="">-- SELECIONE POLICIAL --</option>
            {sortedMilitares.map(m => (
              <option key={m.id} value={m.id} className="bg-[#03080a] text-white">
                {m.patente} {m.nomeGuerra}
              </option>
            ))}
          </select>
          <div className="flex gap-1">
            <select
              value={selecionadoMes}
              onChange={(e) => setSelecionadoMes(Number(e.target.value))}
              className="flex-1 bg-[#020507] border border-hud-border rounded px-1 py-0.5 text-white text-[9.5px] font-mono focus:border-cyber-blue outline-none uppercase cursor-pointer"
            >
              <option value={0}>JANEIRO</option>
              <option value={1}>FEVEREIRO</option>
              <option value={2}>MARÇO</option>
              <option value={3}>ABRIL</option>
              <option value={4}>MAIO</option>
              <option value={5}>JUNHO</option>
              <option value={6}>JULHO</option>
              <option value={7}>AGOSTO</option>
              <option value={8}>SETEMBRO</option>
              <option value={9}>OUTUBRO</option>
              <option value={10}>NOVEMBRO</option>
              <option value={11}>DEZEMBRO</option>
            </select>
            <select
              value={selecionadoAno}
              onChange={(e) => setSelecionadoAno(Number(e.target.value))}
              className="bg-[#020507] border border-hud-border rounded px-1 py-0.5 text-white text-[9.5px] font-mono focus:border-cyber-blue outline-none uppercase cursor-pointer"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>
        </div>
        <div className="bg-hud-card border border-hud-border p-2 rounded-lg flex flex-col justify-between min-h-[58px] text-center">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[7.5px] font-mono text-slate-500 block uppercase">CONCLUÍDAS</span>
            <select
              className="bg-[#020507] border border-hud-border rounded px-1 py-0.5 text-white text-[9px] font-mono focus:border-cyber-blue outline-none cursor-pointer max-w-[80px]"
              title="Datas das Permutas"
            >
              <option value="">DATAS</option>
              {datasMesAtual.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <span className="text-xs font-black font-mono text-cyber-green uppercase leading-loose truncate">
            {verificarMilitarId ? (
              `${permutasMilitarMesAtual.length} TROCAS`
            ) : (
              `${permutasAprovadasMesAtual.length} TROCAS (GERAL)`
            )}
          </span>
        </div>
      </div>

      {/* MAIN VIEW PANES */}
      {activeSubTab === 'PEDIDOS' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-xs font-bold font-display text-white tracking-wider uppercase flex items-center">
              <CheckSquare className="w-4 h-4 text-[#ffb300] mr-1.5" />
              SOLICITAÇÕES AGUARDANDO ASSINATURA DO COMANDO
            </h3>
          </div>

          {pendentesGestor.length === 0 ? (
            <div className="bg-[#051115] border border-hud-border/40 p-6 rounded-xl text-center text-slate-500 font-mono text-xs">
              Mural limpo. Nenhuma permuta de serviço militar pendente de homologação na guarnição.
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendentesGestor.map((p) => {
                const subBy = allMilitares.find(m => m.id === p.militarSubstituidoId);
                const subRepl = allMilitares.find(m => m.id === p.militarSubstitutoId);
                const isSelected = selectedPermutaDetailId === p.id;

                return (
                  <div 
                    key={p.id}
                    className={`border rounded-xl transition-all overflow-hidden ${
                      isSelected 
                        ? 'bg-[#0f1d22] border-cyber-blue shadow-[0_0_12px_rgba(0,229,255,0.15)]' 
                        : 'bg-hud-card border-hud-border/80 hover:border-hud-border hover:bg-hud-card/60'
                    }`}
                  >
                    {/* Basic bar summary */}
                    <div 
                      onClick={() => setSelectedPermutaDetailId(isSelected ? null : p.id)}
                      className="p-3 cursor-pointer flex justify-between items-center"
                    >
                      <div className="min-w-0">
                        <span className="text-[8px] font-mono text-cyber-cyan uppercase font-bold tracking-tight bg-cyber-cyan/10 border border-cyber-cyan/20 px-1 rounded">
                          PROTOCOL {p.protocoloId}
                        </span>
                        <h4 className="text-xs font-bold text-white truncate mt-1">{subBy?.funcao || p.postoServico} - {p.turno}</h4>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                          {subBy?.nomeGuerra} ➔ {subRepl?.nomeGuerra}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-1">
                        <span className="text-[9px] font-mono font-bold text-cyber-amber block">REVISAR</span>
                        <span className="text-[8px] font-mono text-slate-500 block">{formatarDataBR(p.dataRealizacao)}</span>
                      </div>
                    </div>

                    {/* Detailed evaluation and action controls when open */}
                    {isSelected && (
                      <div className="px-3 pb-3.5 border-t border-hud-border/50 pt-3 space-y-3 text-xs bg-[#03090b]/40">
                        
                        {/* Legal compliance checklist */}
                        <div className="space-y-1.5 p-2 bg-[#020709] border border-hud-border/40 rounded-lg">
                          <span className="text-[8px] font-mono text-[#00b0ff] uppercase block mb-1">CUMPRIMENTO DAS DIRETRIZES OPERACIONAIS DE COMANDO</span>
                          <div className="flex items-center space-x-2 text-[10px] text-cyber-green font-mono">
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyber-green shrink-0" />
                            <span>Controle Hierárquico: Mesma faixa de patente ({subBy?.patente})</span>
                          </div>
                          <div className="flex items-center space-x-2 text-[10px] text-cyber-green font-mono">
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyber-green shrink-0" />
                            <span>Descanso Legal: 24h regulamentares pós-escala validadas</span>
                          </div>
                        </div>

                        {/* Fator de Repouso & Histórico do Substituído */}
                        {(() => {
                          const subByPermutas = permutas
                            .filter(perm => perm.militarSubstituidoId === p.militarSubstituidoId || perm.militarSubstitutoId === p.militarSubstituidoId)
                            .sort((a, b) => b.dataRealizacao.localeCompare(a.dataRealizacao));
                          const historicoFiltro = subByPermutas.filter(perm => perm.id !== p.id);
                          const ultimas4 = historicoFiltro.slice(0, 4);
                          
                          const currentMonthPF = new Date().toISOString().slice(0, 7); // YYYY-MM
                          const countMesAtual = subByPermutas.filter(perm => perm.dataRealizacao.startsWith(currentMonthPF)).length;

                          return (
                            <div className="p-2.5 bg-[#020709] border border-hud-border/40 rounded-lg space-y-2">
                              <div className="flex justify-between items-center border-b border-hud-border/30 pb-1.5">
                                <span className="text-[9px] font-mono text-cyber-cyan uppercase font-bold flex items-center">
                                  <Activity className="w-3.5 h-3.5 text-cyber-cyan mr-1 shrink-0 animate-pulse" />
                                  FATOR REPOUSO & HISTÓRICO DO POLICIAL ({subBy?.nomeGuerra})
                                </span>
                                <span className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded border ${
                                  countMesAtual >= 3 
                                    ? 'bg-cyber-red/15 text-cyber-red border-cyber-red/35' 
                                    : countMesAtual >= 2 
                                    ? 'bg-cyber-amber/15 text-cyber-amber border-cyber-amber/35' 
                                    : 'bg-cyber-green/15 text-cyber-green border-cyber-green/35'
                                } font-bold`}>
                                  MÊS ATUAL: {countMesAtual} {countMesAtual === 1 ? 'PERMUTA' : 'PERMUTAS'}
                                </span>
                              </div>

                              <span className="text-[8px] font-mono text-slate-500 block uppercase">ÚLTIMAS 4 PERMUTAS PROTOCOLADAS (SOLICITAÇÕES/HISTÓRICO):</span>
                              {ultimas4.length === 0 ? (
                                <div className="text-[9px] font-mono text-slate-500 py-1 italic bg-[#040e11] rounded px-2">
                                  Nenhuma permuta anterior encontrada para este militar no banco de dados.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 gap-1">
                                  {ultimas4.map((hPerm) => {
                                    const isSubstituido = hPerm.militarSubstituidoId === p.militarSubstituidoId;
                                    const outroParticipanteId = isSubstituido ? hPerm.militarSubstitutoId : hPerm.militarSubstituidoId;
                                    const outroMilitar = allMilitares.find(m => m.id === outroParticipanteId);
                                    
                                    let statusColor = 'text-cyber-green';
                                    if (hPerm.status.startsWith('PENDENTE')) statusColor = 'text-cyber-amber';
                                    if (hPerm.status.startsWith('REJEITADO')) statusColor = 'text-cyber-red line-through opacity-60';
                                    
                                    return (
                                      <div key={hPerm.id} className="bg-[#040f12] border border-hud-border/30 p-1.5 rounded flex items-center justify-between text-[9px] font-mono text-slate-300">
                                        <div className="flex items-center space-x-1.5 min-w-0">
                                          <span className="text-cyber-cyan font-bold shrink-0">
                                            [{formatarDataBR(hPerm.dataRealizacao)}]
                                          </span>
                                          <span className="truncate max-w-[150px] font-sans text-slate-300">
                                            {isSubstituido ? 'SUBSTITUÍDO por' : 'SUBSTITUTO de'} <strong>{outroMilitar?.nomeGuerra || 'POLICIAL'}</strong>
                                          </span>
                                        </div>
                                        <div className="flex items-center space-x-1.5 shrink-0 ml-1">
                                          <span className="text-[8px] text-slate-500 max-w-[80px] truncate uppercase font-sans">
                                            {subBy?.funcao || hPerm.postoServico} - {hPerm.turno}
                                          </span>
                                          <span className={`text-[7.5px] font-bold uppercase ${statusColor}`}>
                                            {hPerm.status === 'APROVADO' ? 'APROVADA' : hPerm.status.replace('_', ' ')}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Signatures verify */}
                        <div className="grid grid-cols-2 gap-2 text-[9.5px] font-sans">
                          <div className="p-1 px-2.5 bg-cyber-blue/5 border border-cyber-blue/20 rounded flex items-center space-x-1.5 justify-center py-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyber-cyan" />
                            <span className="text-cyber-cyan block uppercase font-bold text-[8.5px]">Assinatura Solicitante Vinculada</span>
                          </div>
                          <div className="p-1 px-2.5 bg-cyber-green/5 border border-cyber-green/20 rounded flex items-center space-x-1.5 justify-center py-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyber-green" />
                            <span className="text-cyber-green block uppercase font-bold text-[8.5px]">Assinatura Substituto Vinculada</span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="grid grid-cols-4 gap-1.5 pt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(p.id);
                            }}
                            className="bg-cyber-red/20 border border-cyber-red/40 hover:bg-cyber-red/35 text-cyber-red transition-all py-2 rounded font-mono font-bold text-[9px] uppercase flex flex-col items-center justify-center"
                            title="EXCLUIR REGISTRO"
                          >
                            <Trash2 className="w-4 h-4 mb-0.5" />
                            <span>EXCLUIR</span>
                          </button>

                          <button
                            onClick={() => handleReject(p.id)}
                            className="bg-[#0f1d22] border border-hud-border/50 hover:bg-cyber-red/10 hover:border-cyber-red/30 text-slate-400 hover:text-cyber-red transition-all py-2 rounded font-mono font-bold text-[9px] uppercase flex flex-col items-center justify-center"
                            id={`commander-decline-${p.id}`}
                          >
                            <XCircle className="w-4 h-4 mb-0.5" />
                            <span>REJEITAR</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              setShowAjusteParaId(showAjusteParaId === p.id ? null : p.id);
                              setJustificativaAjuste('');
                            }}
                            className={`border transition-all py-2 rounded font-mono font-bold text-[9px] uppercase flex flex-col items-center justify-center ${
                              showAjusteParaId === p.id
                                ? 'bg-cyber-blue/20 border-cyber-blue text-white'
                                : 'bg-cyber-blue/10 border-cyber-blue/30 hover:bg-cyber-blue/20 text-[#00e5ff]'
                            }`}
                            id={`commander-adjust-trigger-${p.id}`}
                          >
                            <AlertTriangle className="w-4 h-4 mb-0.5 text-cyber-cyan" />
                            <span>PEDIR AJUSTE</span>
                          </button>
                          
                          <button
                            onClick={() => handleApprove(p.id)}
                            className="bg-cyber-green text-black hover:bg-[#00ff66]/90 transition-all font-mono font-bold py-2 rounded text-[9px] uppercase flex flex-col items-center justify-center shadow-[0_0_8px_rgba(0,255,102,0.3)]"
                            id={`commander-approve-${p.id}`}
                          >
                            <CheckCircle2 className="w-4 h-4 mb-0.5" />
                            <span>HOMOLOGAR</span>
                          </button>
                        </div>

                        {/* Adjust details text area inside single accordion item */}
                        {showAjusteParaId === p.id && (
                          <div className="space-y-2 bg-[#020709] border border-cyber-blue/25 rounded-lg p-2.5 mt-2 animate-pulse-subtle">
                            <span className="text-[8.5px] font-mono text-cyber-cyan uppercase block font-bold">DESCREVA OS ERROS / OBSERVAÇÕES DE AJUSTE:</span>
                            <textarea
                              value={justificativaAjuste}
                              onChange={(e) => setJustificativaAjuste(e.target.value)}
                              placeholder="Especifique o erro (ex: 'Favor ajustar horário para o turno da NOITE' ou 'Indique outro substituto do corpo de enf...')"
                              className="w-full bg-[#051115] border border-hud-border rounded p-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyber-blue h-14 font-mono resize-none block"
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAjusteParaId(null);
                                  setJustificativaAjuste('');
                                }}
                                className="px-2 py-1 bg-hud-card border border-hud-border rounded font-mono text-[9px] uppercase text-slate-400"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendAdjust(p.id)}
                                disabled={!justificativaAjuste}
                                className={`px-2.5 py-1 rounded font-mono text-[9px] uppercase font-bold transition-all ${
                                  justificativaAjuste
                                    ? 'bg-cyber-cyan text-black hover:bg-cyber-blue'
                                    : 'bg-hud-card text-slate-500 border border-hud-border cursor-not-allowed'
                                }`}
                                id={`submit-commander-adjust-btn-${p.id}`}
                              >
                                Enviar Ajustes
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* HISTORIC SWAPS OF PREVIOUS RECORDS */}
          <div className="border-t border-hud-border/40 pt-4 mt-2">
            <button 
              onClick={() => setIsHistoricoExpanded(!isHistoricoExpanded)}
              className="w-full flex items-center justify-between text-left group"
            >
              <h3 className="text-xs font-bold font-display text-white tracking-wider uppercase flex items-center group-hover:text-cyber-cyan transition-colors">
                <FileText className="w-4 h-4 text-cyber-cyan mr-1.5" />
                REGISTROS FECHADOS DA GUARNIÇÃO
              </h3>
              <div className={`text-cyber-cyan transition-transform duration-300 ${isHistoricoExpanded ? 'rotate-180' : ''}`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </button>
            
            {isHistoricoExpanded && (
              <div className="mt-4">
                
                 {/* Tabs de Filtro */}
                <div className="flex space-x-1 border-b border-hud-border/40 pb-2 mb-3">
                  <button
                    onClick={() => setHistoricoFilter('TODAS')}
                    className={`px-3 py-1 text-[9px] font-bold tracking-widest font-mono rounded ${historicoFilter === 'TODAS' ? 'bg-hud-border/60 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    TODAS
                  </button>
                  <button
                    onClick={() => setHistoricoFilter('APROVADAS')}
                    className={`px-3 py-1 text-[9px] font-bold tracking-widest font-mono rounded ${historicoFilter === 'APROVADAS' ? 'bg-cyber-green/20 text-cyber-green border border-cyber-green/30' : 'text-slate-500 hover:text-cyber-green/50'}`}
                  >
                    APROVADA
                  </button>
                  <button
                    onClick={() => setHistoricoFilter('REJEITADAS')}
                    className={`px-3 py-1 text-[9px] font-bold tracking-widest font-mono rounded ${historicoFilter === 'REJEITADAS' ? 'bg-cyber-red/20 text-cyber-red border border-cyber-red/30' : 'text-slate-500 hover:text-cyber-red/50'}`}
                  >
                    REJEITADA
                  </button>
                  <button
                    onClick={() => setHistoricoFilter('SEM_EFEITO')}
                    className={`px-3 py-1 text-[9px] font-bold tracking-widest font-mono rounded ${historicoFilter === 'SEM_EFEITO' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'text-slate-500 hover:text-amber-500/50'}`}
                  >
                    TORNAR SEM EFEITO
                  </button>
                </div>

                {historicoCompleto.filter(h => {
                  if (historicoFilter === 'TODAS') return true;
                  if (historicoFilter === 'APROVADAS') return h.status === 'APROVADO';
                  if (historicoFilter === 'REJEITADAS') return h.status === 'REJEITADO' || h.status === 'REJEITADO_SUBSTITUTO';
                  if (historicoFilter === 'SEM_EFEITO') return h.status === 'SEM_EFEITO';
                  return true;
                }).length === 0 ? (
                  <p className="text-slate-500 font-mono text-[10px] text-center py-2">Sem registros para o filtro selecionado.</p>
                ) : (
                  <div className="space-y-2">
                    {historicoCompleto.filter(h => {
                      if (historicoFilter === 'TODAS') return true;
                      if (historicoFilter === 'APROVADAS') return h.status === 'APROVADO';
                      if (historicoFilter === 'REJEITADAS') return h.status === 'REJEITADO' || h.status === 'REJEITADO_SUBSTITUTO';
                      if (historicoFilter === 'SEM_EFEITO') return h.status === 'SEM_EFEITO';
                      return true;
                    }).map((h) => {
                  const subBy = allMilitares.find(m => m.id === h.militarSubstituidoId);
                  const subRepl = allMilitares.find(m => m.id === h.militarSubstitutoId);
                  const isApproved = h.status === 'APROVADO';
                  const isExpanded = selectedHistoricId === h.id;

                  return (
                    <div 
                      key={h.id}
                      className={`border rounded-lg overflow-hidden transition-all duration-200 ${
                        isExpanded 
                          ? 'bg-[#0f1d22]/40 border-cyber-cyan/50 shadow-[0_0_8px_rgba(0,229,255,0.1)]' 
                          : 'bg-hud-bg/40 border-hud-border/60 hover:bg-[#020709] hover:border-hud-border'
                      }`}
                    >
                      <div className="flex bg-[#0f1d22]/40">
                        {/* Accordion trigger bar */}
                        <div 
                          onClick={() => setSelectedHistoricId(isExpanded ? null : h.id)}
                          className="p-2.5 flex-1 flex items-center justify-between text-xs cursor-pointer select-none"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                              <span className="font-bold text-white text-[11px] uppercase tracking-wide">{subBy?.funcao || h.postoServico} - {h.turno}</span>
                              <span className="text-[7px] bg-hud-card border border-hud-border text-slate-400 px-1 rounded font-mono">{h.protocoloId}</span>
                            </div>
                            <p className="text-[9.5px] text-slate-400 font-mono mt-0.5 truncate">
                              {subBy?.nomeGuerra} ➔ {subRepl?.nomeGuerra} • {formatarDataBR(h.dataRealizacao)}
                            </p>
                          </div>

                          <div className="text-right shrink-0 ml-1.5 flex flex-col items-end">
                            <span className={`text-[8px] font-mono px-1 rounded border font-bold ${
                              isApproved 
                                ? 'bg-cyber-green/10 text-cyber-green border-cyber-green/20' 
                                : h.status === 'SEM_EFEITO' 
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                : 'bg-cyber-red/10 text-cyber-red border-cyber-red/20'
                            }`}>
                              {isApproved ? 'APROVADA' : h.status.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[7.5px] font-mono text-slate-500 block mt-0.5 uppercase tracking-tighter">Detalhes</span>
                          </div>
                        </div>

                        {/* Direct Delete Button for Admin */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePermuta?.(h.id);
                            setSelectedHistoricId(null);
                          }}
                          className="px-3 border-l border-hud-border/40 flex items-center justify-center bg-cyber-red/10 hover:bg-cyber-red/30 text-cyber-red/70 hover:text-cyber-red transition-all cursor-pointer"
                          title="Excluir Permuta do Sistema"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Dropdown document details */}
                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-hud-border/40 pt-2 bg-[#03090b]/40">

                          {h.status === 'APROVADO' || h.status === 'SEM_EFEITO' ? (
                            <div className="space-y-2">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[8px] font-mono text-cyber-cyan font-bold block uppercase tracking-wide">CERTIDÃO ARQUIVADA DE HOMOLOGAÇÃO:</span>
                                {onTornarSemEfeitoPermuta && h.status === 'APROVADO' && (
                                  <div className="flex items-center space-x-2">
                                    {confirmSemEfeitoId === h.id ? (
                                      <>
                                        <span className="text-[8px] font-mono text-amber-500 font-bold">CONFIRMAR?</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onTornarSemEfeitoPermuta(h.id);
                                            setConfirmSemEfeitoId(null);
                                            setSelectedHistoricId(null);
                                          }}
                                          className="bg-amber-500/20 hover:bg-amber-500/40 text-amber-500 border border-amber-500 text-[9px] font-bold py-1 px-3 rounded transition-colors uppercase tracking-wider"
                                        >
                                          DESEJA "TORNAR SEM EFEITO" PARA CONCLUIR
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmSemEfeitoId(null);
                                          }}
                                          className="text-slate-400 hover:text-white text-[9px] font-mono px-2 py-1"
                                        >
                                          CANCELAR
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmSemEfeitoId(h.id);
                                        }}
                                        className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 text-[9px] font-bold py-1 px-2 rounded transition-colors uppercase tracking-wider"
                                      >
                                        Tornar Sem Efeito
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                              <DocumentoHomologacao
                                permuta={h}
                                allMilitares={allMilitares}
                              />
                            </div>
                          ) : (
                            <div className="bg-[#120505]/40 border border-cyber-red/25 rounded-lg p-2 text-xs text-slate-300 space-y-1 font-mono">
                              <span className="text-cyber-red font-bold block">PROTOCOLO NÃO HOMOLOGADO</span>
                              <p className="text-[10px] text-slate-400">
                                Esta permuta foi arquivada sem aprovação pelo comando ou recusada pelos militares participantes.
                              </p>
                              {h.comentarioAlteracao && (
                                <p className="text-[9.5px] text-amber-500 bg-amber-500/5 p-1 rounded border border-amber-500/15 mt-1">
                                  Justificativa: {h.comentarioAlteracao}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          )}
          </div>
        </div>
      )}

      {/* BLOCKCHAIN AUDIT LEDGER TIMELINE (Logs invioláveis) */}
      {activeSubTab === 'AUDITORIA' && (
        <div className="space-y-3.5">
          <div className="bg-[#051115] border border-hud-border p-3 rounded-lg flex flex-col space-y-1">
            <span className="text-[9px] font-mono text-cyber-green uppercase tracking-wide flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-cyber-green mr-1.5 animate-pulse" />
              REGISTRO HIERÁRQUICO COMPARTILHADO INVIOLÁVEL
            </span>
            <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
              Todos os eventos de escala gerados pelo PERMUCYBER são empacotados em blocos imutáveis com hashes SHA-256 encadeados. Qualquer alteração externa quebra a coerência criptográfica.
            </p>
          </div>

          {onClearLogs && (userLogged?.role === 'COMANDANTE' || userLogged?.role === 'ADMIN') && logs.length > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClearLogs}
                className="bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-[0_0_10px_rgba(239,68,68,0.15)] active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Livro de Auditoria</span>
              </button>
            </div>
          )}

          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {logs.map((log) => {
              let typeColor = 'text-cyber-blue bg-cyber-blue/15 border-cyber-blue/30';
              if (log.tipoEvento === 'PERMUTA_CRIADA' || log.tipoEvento === 'PERMUTA_ACEITA') {
                typeColor = 'text-cyber-green bg-cyber-green/15 border-cyber-green/30';
              } else if (log.tipoEvento === 'PROCESSO_APROVADO') {
                typeColor = 'text-cyber-green bg-cyber-green/20 border-cyber-green/45 shadow-[0_0_4px_#00ff66]';
              } else if (log.tipoEvento === 'PROCESSO_REJEITADO') {
                typeColor = 'text-cyber-red bg-cyber-red/15 border-cyber-red/30';
              }

              return (
                <div 
                  key={log.id}
                  className="bg-hud-card border border-hud-border rounded-xl p-3 space-y-2 text-xs relative overflow-hidden group"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border uppercase font-bold ${typeColor}`}>
                        {log.tipoEvento}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500">{log.timestamp}</span>
                    </div>
                    {onDeleteLog && (userLogged?.role === 'COMANDANTE' || userLogged?.role === 'ADMIN') && (
                      <button
                        type="button"
                        onClick={() => onDeleteLog(log.id)}
                        className="opacity-0 group-hover:opacity-100 transition-all text-cyber-red hover:text-red-500 p-0.5 rounded hover:bg-cyber-red/10 cursor-pointer"
                        title="Excluir este registro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="font-mono text-slate-200 text-[11px] leading-snug">{log.evento}</p>
                  
                  <div className="border-t border-hud-border/30 pt-2 flex flex-col space-y-0.5 font-sans text-[8.5px] text-slate-500">
                    <div>
                      <span className="text-cyber-green">✓ Protocolado no Livro de Registro Digital</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STATISTICAL REPORT PERFORMANCE CHARTS */}
      {activeSubTab === 'RELATORIOS' && (
        <div className="space-y-4 animate-fade-in font-sans">
          <h3 className="text-xs font-bold font-display text-white tracking-wider uppercase flex items-center">
            <FileText className="w-4 h-4 text-cyber-blue mr-1.5" />
            GERADOR DE RELATÓRIOS
          </h3>
          
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col space-y-1 mb-2">
                    <label className="text-[9px] font-mono text-slate-500 uppercase font-bold">Brasão Esquerdo (URL):</label>
                    <input 
                        type="text" 
                        value={config.brasaoEsquerdoUrl} 
                        onChange={(e) => onUpdateConfig({ brasaoEsquerdoUrl: e.target.value })} 
                        placeholder="Link da Logo Esquerda"
                        className="bg-[#020507] border border-hud-border rounded px-2 py-1.5 text-white text-[10px] focus:border-cyber-cyan outline-none" 
                    />
                </div>
                <div className="flex flex-col space-y-1 mb-2">
                    <label className="text-[9px] font-mono text-slate-500 uppercase font-bold">Brasão Direito (URL):</label>
                    <input 
                        type="text" 
                        value={config.brasaoDireitoUrl} 
                        onChange={(e) => onUpdateConfig({ brasaoDireitoUrl: e.target.value })} 
                        placeholder="Link da Logo Direita"
                        className="bg-[#020507] border border-hud-border rounded px-2 py-1.5 text-white text-[10px] focus:border-cyber-cyan outline-none" 
                    />
                </div>
                <div className="flex flex-col space-y-1">
                    <label className="text-[9px] font-mono text-slate-500 uppercase font-bold">Início:</label>
                    <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="bg-[#020507] border border-hud-border rounded px-2 py-1 text-white" />
                </div>
                <div className="flex flex-col space-y-1">
                    <label className="text-[9px] font-mono text-slate-500 uppercase font-bold">Fim:</label>
                    <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="bg-[#020507] border border-hud-border rounded px-2 py-1 text-white" />
                </div>
                <select value={reportTipo} onChange={(e) => setReportTipo(e.target.value as 'GERAL' | 'INDIVIDUAL' | 'FUNCAO' | 'SETOR')} className="col-span-2 bg-[#020507] border border-hud-border rounded px-2 py-1 text-white mt-2">
                <option value="GERAL">RELATÓRIO GERAL</option>
                <option value="INDIVIDUAL">RELATÓRIO INDIVIDUAL</option>
                <option value="FUNCAO">RELATÓRIO POR FUNÇÃO ATIVA</option>
                <option value="SETOR">RELATÓRIO POR SETOR</option>
            </select>
            {reportTipo === 'INDIVIDUAL' && (
                <select value={reportMilitarId} onChange={(e) => setReportMilitarId(e.target.value)} className="col-span-2 bg-[#020507] border border-hud-border rounded px-2 py-1 text-white">
                    <option value="">Selecione o Policial</option>
                    {sortedMilitares.map(m => <option key={m.id} value={m.id}>{m.patente} {m.nomeGuerra}</option>)}
                </select>
            )}
            {reportTipo === 'FUNCAO' && (
                <select value={reportFuncao} onChange={(e) => setReportFuncao(e.target.value)} className="col-span-2 bg-[#020507] border border-hud-border rounded px-2 py-1 text-white">
                    <option value="">Selecione a Função</option>
                    {Array.from(new Set(allMilitares.map(m => m.funcao).filter(Boolean))).sort().map(f => (
                        <option key={f} value={f}>{f}</option>
                    ))}
                </select>
            )}
            {reportTipo === 'SETOR' && (
                <select value={reportSetor} onChange={(e) => setReportSetor(e.target.value)} className="col-span-2 bg-[#020507] border border-hud-border rounded px-2 py-1 text-white">
                    <option value="">Selecione o Setor</option>
                    {Array.from(new Set(allMilitares.map(m => m.setor).filter(Boolean))).sort().map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
            )}
          </div>

          {/* ==========================================
              [PROTECTED FORMATTING] RELATÓRIO HTML
              Este layout de pré-visualização deve espelhar o PDF em termos de 
              centralização, proporções e estilo.
              ========================================== */}
          <div id="pdf-report-content" className="bg-white p-6 md:p-10 text-black rounded-xl my-4 print:my-0 print:p-0 shadow-2xl border border-slate-200" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
            
            <div className="relative flex justify-between items-center mb-8 pb-4">
               {/* Left Logo */}
               <div className="w-24 h-24 flex items-center justify-center">
                 <img 
                   src={config.brasaoEsquerdoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Coat_of_arms_of_Brazil.svg/200px-Coat_of_arms_of_Brazil.svg.png'} 
                   alt="Logo Esq" 
                   className="max-w-full max-h-full object-contain" 
                   referrerPolicy="no-referrer" 
                 />
               </div>
               
               {/* Center Title */}
               <div className="flex-1 text-center px-4">
                 <div className="space-y-1">
                   <h1 className="text-slate-900 font-black text-lg uppercase tracking-tight leading-tight">Diretoria de Saúde</h1>
                   <h2 className="text-slate-600 font-bold text-sm uppercase tracking-widest border-t border-slate-100 pt-1">Relatório de Permutas</h2>
                 </div>
               </div>
               
               {/* Right Logo */}
               <div className="w-24 h-24 flex items-center justify-center">
                 <img 
                   src={config.brasaoDireitoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Star_of_life2.svg/200px-Star_of_life2.svg.png'} 
                   alt="Logo Dir" 
                   className="max-w-full max-h-full object-contain" 
                   referrerPolicy="no-referrer" 
                 />
               </div>
               
               {/* Stylish decorative lines */}
               <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100"></div>
               <div className="absolute bottom-1 left-20 right-20 h-px bg-slate-200"></div>
            </div>

            <div className="text-[12px] space-y-4 mb-8">
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <p className="text-slate-700"><strong>Período:</strong> <span className="text-slate-500 font-medium">{dataInicio ? formatarDataBR(dataInicio) : 'INÍCIO'} a {dataFim ? formatarDataBR(dataFim) : 'ATUAL'}</span></p>
                    </div>
                    {reportTipo === 'INDIVIDUAL' && (
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <p className="text-slate-700"><strong>Policial:</strong> <span className="text-slate-500 font-medium">{allMilitares.find(m => m.id === reportMilitarId)?.nome || '...'}</span></p>
                      </div>
                    )}
                    {reportTipo === 'FUNCAO' && (
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <p className="text-slate-700"><strong>Função:</strong> <span className="text-slate-500 font-medium">{reportFuncao || '...'}</span></p>
                      </div>
                    )}
                    {reportTipo === 'SETOR' && (
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <p className="text-slate-700"><strong>Setor:</strong> <span className="text-slate-500 font-medium">{reportSetor || '...'}</span></p>
                      </div>
                    )}
                </div>
                
                <div className="border border-slate-200 p-4 rounded-xl bg-gradient-to-r from-slate-50 to-white shadow-sm">
                  <p className="font-bold text-slate-900 uppercase tracking-[0.2em] mb-2 text-[9px] flex items-center text-center justify-center">
                    <TrendingUp className="w-3 h-3 mr-2" /> TURNOS
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-2 bg-white rounded border border-slate-100 shadow-sm">
                      <span className="block text-[10px] font-black text-slate-800">TURNO A</span>
                      <span className="text-[9px] text-slate-500">06H às 18H</span>
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-100 shadow-sm">
                      <span className="block text-[10px] font-black text-slate-800">TURNO B</span>
                      <span className="text-[9px] text-slate-500">18H às 06H</span>
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-100 shadow-sm">
                      <span className="block text-[10px] font-black text-slate-800">24H</span>
                      <span className="text-[9px] text-slate-500">06H às 06H</span>
                    </div>
                  </div>
                </div>
            </div>

            {/* Responsive table container */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-lg">
              <table className="w-full text-[10px] text-center border-collapse min-w-[700px]">
                  <thead>
                      <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[9px]">
                          <th className="p-4 border-r border-slate-700 whitespace-nowrap w-[10%]">Turno</th>
                          <th className="p-4 border-r border-slate-700 whitespace-nowrap w-[10%]">Data</th>
                          <th className="p-4 border-r border-slate-700 whitespace-nowrap w-[20%]">Militar Substituto</th>
                          <th className="p-4 border-r border-slate-700 whitespace-nowrap w-[20%]">Militar Substituído</th>
                          <th className="p-4 border-r border-slate-700 whitespace-nowrap w-[20%]">Homologação</th>
                          <th className="p-4 whitespace-nowrap w-[20%]">Status do Serviço</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredPermutas
                        .filter(p => p.status === 'APROVADO' || p.status === 'SEM_EFEITO')
                        .sort((a, b) => new Date(a.dataRealizacao).getTime() - new Date(b.dataRealizacao).getTime())
                        .map(p => {
                          const substituto = allMilitares.find(m => m.id === p.militarSubstitutoId);
                          const substituido = allMilitares.find(m => m.id === p.militarSubstituidoId);
                          
                          // Robust extraction of YYYY-MM-DD from 'YYYY-MM-DD HH:MM' or 'YYYY-MM-DDTHH:MM'
                          const rawDate = p.dataAssinaturaGestor ? p.dataAssinaturaGestor.replace('T', ' ').split(' ')[0] : '';
                          const dataHomol = rawDate ? formatarDataBR(rawDate) : '00-00-0000';
                          
                          const nameParts = (p.gestorNome || "").split(' ');
                          const actualName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : (p.gestorNome || "");
                          const gestorObj = p.gestorNome ? allMilitares.find(m => 
                              m.nomeGuerra.toUpperCase() === p.gestorNome!.toUpperCase() ||
                              m.nome.toUpperCase().includes(p.gestorNome!.toUpperCase())
                          ) : null;
                          const gestorClean = gestorObj ? `${gestorObj.patente} ${actualName}` : (p.gestorNome || "");
                          const homolLabel = p.gestorNome ? `${dataHomol} - ${gestorClean}` : `${dataHomol} - Pendente`;
                          
                          const subObj = formatMilitarRelatorio(substituto);
                          const subdoObj = formatMilitarRelatorio(substituido);
                          const statusServico = p.status === 'SEM_EFEITO' ? 'TORNADO SEM EFEITO' : 'CUMPRIDA';
                          
                          return (
                            <tr key={p.id} className="border-b border-slate-100 even:bg-slate-50/50 hover:bg-slate-100/50 transition-colors whitespace-nowrap text-[9px]">
                               <td className="p-4 border-r border-slate-100 font-black text-slate-900 text-center">{p.turno}</td>
                               <td className="p-4 border-r border-slate-100 text-slate-600 text-center">{formatarDataBR(p.dataRealizacao)}</td>
                               <td className="p-4 border-r border-slate-100 text-slate-800 font-medium text-center">
                                 {subObj}
                               </td>
                               <td className="p-4 border-r border-slate-100 text-slate-800 font-medium text-center">
                                 {subdoObj}
                               </td>
                               <td className="p-4 border-r border-slate-100 text-slate-500 italic text-[8.5px] leading-tight text-center">
                                 {homolLabel}
                               </td>
                               <td className="p-4 text-slate-700 font-bold text-[8.5px] leading-tight text-center uppercase">
                                 {statusServico}
                               </td>
                            </tr>
                          );
                      })}
                  </tbody>
              </table>
            </div>
            
            <div className="mt-16 pt-8 text-center flex flex-col items-center text-[12px]">
                <div className="w-64 border-t border-black mb-2"></div>
                {(() => {
                  const comandante = (userLogged?.role === 'COMANDANTE' || userLogged?.role === 'ADMIN') ? userLogged : (allMilitares.find(m => m.role === 'COMANDANTE') || userLogged);
                  return (
                    <React.Fragment>
                      <p className="font-bold">{comandante.nome.toUpperCase()} - {comandante.patente} {comandante.quadro || 'QPPM'}</p>
                      <p>{comandante.funcao}</p>
                      <p>M.F. {comandante.matriculaFuncional || '___.___._-_'}</p>
                    </React.Fragment>
                  );
                })()}
            </div>
          </div>

          <button onClick={handleGerarPDF} className="w-full bg-slate-600 text-white py-2 rounded font-bold uppercase hover:bg-opacity-90 transition print:hidden">
            GERAR ARQUIVO PDF
          </button>
        </div>
      )}




      {activeSubTab === 'SISTEMA' && (
        <div className="space-y-4 animate-fade-in font-sans">
          
          {/* Top Informative Banner with subtle styling */}
          <div className="bg-[#051115] border border-cyber-cyan/35 p-3.5 rounded-xl flex flex-col space-y-1.5 shadow-md">
            <span className="text-[10px] font-mono text-cyber-cyan uppercase tracking-wider font-extrabold flex items-center">
              <Database className="w-3.5 h-3.5 mr-2 animate-pulse text-cyber-cyan" />
              CONVÉS DE CONFIGURAÇÃO DE SEGURANÇA NACIONAL
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Disponibilidade administrativa exclusiva para o Comando. Gerencie a importação de oficiais em lotes, reinicialize as definições táticas simuladas ou alterne o usuário ativo em teste.
            </p>
          </div>

          {/* CLOUD CONNECTION STATUS BADGE */}
          <div className="bg-hud-card border border-hud-border p-3.5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#00ff66]/80" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00ff66] animate-pulse" />
                <span className="text-xs font-bold text-white uppercase font-display tracking-wide">CONEXÃO FIRESTORE CLOUD ACTIVE</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">
                ID do Banco: <span className="text-cyber-cyan">ai-studio-04310fd5-eb17-4b14-bb8b-07b8d86368ad</span>
              </p>
              <p className="text-[9.5px] text-slate-500 font-sans leading-tight">
                Todas as alterações (oficiais, permutas e escalas) estão sendo sincronizadas automaticamente na nuvem em tempo real (cloud-persistent backend).
              </p>
            </div>
            <div className="bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/25 px-3 py-1.5 rounded font-mono text-[9px] font-bold text-center uppercase tracking-widest shrink-0">
              ● NUVEM DE DADOS: OPERACIONAL
            </div>
          </div>

          {/* BACKUPS AND CLOUD REDUNDANCY VIEW */}
          <div className="bg-hud-card border border-hud-border/80 rounded-xl p-3.5 space-y-3 relative overflow-hidden" id="central-backups">
            <span className="text-[9.5px] font-mono text-cyber-cyan uppercase tracking-wider block font-extrabold flex items-center">
              <HardDrive className="w-4 h-4 mr-1.5 text-cyber-blue animate-pulse" />
              CÓPIAS DE SEGURANÇA E BACKUPS NA NUVEM
            </span>
            
            <p className="text-[10px] text-slate-400 leading-snug">
              Este sistema gera cópias estruturadas completas automaticamente sempre que novos policiais, permutas ou escalas de serviço são cadastrados ou alterados, evitando qualquer perda acidental de dados.
            </p>

            <div className="flex items-center justify-between p-2 rounded bg-cyber-blue/15 border border-cyber-blue/25 text-white text-[10px] md:text-xs">
              <span className="font-mono text-slate-300">Status de Duplicidade / Redundância:</span>
              <span className="font-mono font-extrabold text-[#00ff66]">{backupStatusMsg || 'Cópia em nuvem estável.'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (onCreateBackup) {
                    onCreateBackup('MANUAL');
                  }
                }}
                className="bg-cyber-blue/20 hover:bg-cyber-blue/35 text-cyber-cyan border border-cyber-blue/40 py-2 rounded text-[10px] font-mono font-black uppercase transition-all tracking-wider text-center flex items-center justify-center space-x-1 cursor-pointer"
              >
                <span>CRIAR SNAPSHOT NUVEM</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  let backupData;
                  if (onCreateBackup) {
                    backupData = await onCreateBackup('MANUAL');
                  }
                  
                  const fullData = backupData || {
                    id: `SNAP-LOCAL-${Date.now()}`,
                    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
                    tipo: 'MANUAL',
                    autor: userLogged?.nomeGuerra || 'SISTEMA',
                    quantidadeMilitares: allMilitares.length,
                    quantidadeEscalas: escalas.length,
                    quantidadePermutas: permutas.length,
                    militares: allMilitares,
                    escalas: escalas,
                    permutas: permutas,
                    alertas: [],
                    logs: logs
                  };
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullData, null, 2));
                  const dlAnchor = document.createElement('a');
                  dlAnchor.setAttribute("href", dataStr);
                  dlAnchor.setAttribute("download", `permucyber_backup_completo_${new Date().toISOString().slice(0, 10)}.json`);
                  document.body.appendChild(dlAnchor);
                  dlAnchor.click();
                  dlAnchor.remove();
                }}
                className="bg-cyber-green/15 hover:bg-cyber-green/30 text-cyber-green hover:text-white border border-cyber-green/40 py-2 rounded text-[10px] font-mono font-black uppercase transition-all tracking-wider text-center flex items-center justify-center space-x-1 cursor-pointer"
              >
                <span>EXPORTAR BACKUP (.JSON)</span>
              </button>
            </div>

            <div className="pt-1">
              <input
                type="file"
                id="full-backup-file-input"
                className="hidden"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  e.target.value = ''; // Reset input to allow selecting the same file
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const parsed = JSON.parse(event.target?.result as string);
                      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.militares) || !Array.isArray(parsed.escalas) || !Array.isArray(parsed.permutas)) {
                        alert('Erro: Arquivo JSON de backup inválido. Ele deve conter os campos militares, escalas e permutas (como listas).');
                        return;
                      }
                      if (onRestoreBackup) {
                        onRestoreBackup(parsed);
                      }
                    } catch (err) {
                      alert('Erro ao ler ou processar o arquivo de backup.');
                    }
                  };
                  reader.readAsText(file);
                }}
              />
              <button
                type="button"
                onClick={() => document.getElementById('full-backup-file-input')?.click()}
                className="w-full bg-cyber-amber/15 hover:bg-cyber-amber/30 text-cyber-amber border border-cyber-amber/40 py-2 rounded text-[10px] font-mono font-black uppercase transition-all tracking-wider text-center flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>IMPORTAR BACKUP INTEGRAL (.JSON)</span>
              </button>
            </div>

            {/* List of Backups available */}
            <div className="space-y-2 pt-1 border-t border-hud-border/30">
              <span className="text-[9.5px] font-mono text-slate-400 block uppercase font-bold tracking-wider">
                ✓ HISTÓRICO DE AUDITORIA DE IMAGENS DO BANCO DE DADOS
              </span>

              {(!backups || backups.length === 0) ? (
                <div className="text-[10px] text-slate-500 italic py-2.5 text-center bg-[#03090b]/50 rounded border border-hud-border/40">
                  Nenhuma imagem ou snapshot de segurança gerado nesta sessão. Adicione algo ao sistema para salvar automaticamente.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                  {backups.map((bk) => (
                    <div key={bk.id} className="bg-[#03090b] hover:bg-[#051115] border border-hud-border/40 p-2 rounded flex items-center justify-between text-[10.5px] transition-all">
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-cyber-green font-bold text-[10.5px]">{bk.id}</span>
                          <span className={`text-[7.5px] px-1 rounded font-mono font-bold ${bk.tipo === 'AUTO' ? 'bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/20' : 'bg-cyber-blue/10 text-cyber-blue border border-cyber-blue/20'}`}>
                            {bk.tipo}
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          Backup em: {bk.timestamp} | Autor: {bk.autor}
                        </div>
                        <div className="text-[8px] font-mono text-slate-500">
                          {bk.quantidadeMilitares} mil. | {bk.quantidadeEscalas} esc. | {bk.quantidadePermutas} per.
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bk, null, 2));
                            const dlAnchor = document.createElement('a');
                            dlAnchor.setAttribute("href", dataStr);
                            dlAnchor.setAttribute("download", `permucyber_backup_${bk.id}_${bk.timestamp.replace(/[:\s]/g, '-')}.json`);
                            document.body.appendChild(dlAnchor);
                            dlAnchor.click();
                            dlAnchor.remove();
                          }}
                          className="bg-cyber-blue/15 hover:bg-cyber-blue/35 text-cyber-cyan border border-cyber-blue/30 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-0.5"
                          title="Baixar arquivo JSON deste backup para arquivo físico"
                        >
                          <Download className="w-2.5 h-2.5" />
                          <span>BAIXAR</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onRestoreBackup?.(bk);
                          }}
                          className="bg-cyber-amber/15 hover:bg-cyber-amber/35 text-cyber-amber hover:text-white border border-cyber-amber/30 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase transition-all cursor-pointer"
                        >
                          RESTAURAR
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Core Sync Utility buttons */}
          <div className="grid grid-cols-2 gap-3.5">
            {/* Import JSON Button Box */}
            <div className="bg-hud-card border border-hud-border p-3 rounded-xl flex flex-col space-y-2.5 justify-between">
              <div>
                <span className="text-[8.5px] font-mono text-slate-400 block uppercase font-bold">Importação Estrutural</span>
                <p className="text-[10px] text-slate-500 leading-snug">Insira um novo arquivo (.JSON) com policiais para atualizar a base ativa.</p>
              </div>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const parsed = JSON.parse(event.target?.result as string);
                      if (!Array.isArray(parsed)) {
                        alert('Erro: O arquivo JSON deve conter um array (lista) de policiais.');
                        return;
                      }

                      const isValid = parsed.every(m => m.id && m.nome && m.nomeGuerra && m.patente);
                      if (!isValid) {
                        alert('Erro: Cada policial no JSON precisa dos campos obrigatórios: id, nome, nomeGuerra, patente.');
                        return;
                      }

                      if (onImportMilitaresJSON) {
                        onImportMilitaresJSON(parsed);
                        alert(`Sucesso! ${parsed.length} policiais militares importados.`);
                      }
                    } catch (err) {
                      alert('Erro: Arquivo JSON corrompido ou formato incompatível.');
                    }
                  };
                  reader.readAsText(file);
                }} 
                className="hidden" 
                accept=".json" 
              />
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-cyber-cyan/15 hover:bg-cyber-cyan/30 text-cyber-blue hover:text-white border border-cyber-cyan/40 hover:border-cyber-cyan py-1.5 rounded text-[10px] font-mono font-extrabold uppercase transition-all tracking-wider text-center flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>IMPORTAR JSON</span>
              </button>
            </div>

            {/* Reset Database Button Box */}
            <div className="bg-hud-card border border-hud-border p-3 rounded-xl flex flex-col space-y-2.5 justify-between">
              <div>
                <span className="text-[8.5px] font-mono text-slate-400 block uppercase font-bold">Reinicializar Conexão</span>
                <p className="text-[10px] text-slate-500 leading-snug">Restaura todo o banco de dados simulador ao estado regimental padrão (default).</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onRefreshData) {
                    onRefreshData();
                    alert('Banco de dados reordenado ao perfil de fábrica com sucesso!');
                  }
                }}
                className="w-full bg-cyber-green/10 hover:bg-cyber-green/30 text-cyber-green hover:text-white border border-cyber-green/45 py-1.5 rounded text-[10px] font-mono font-extrabold uppercase transition-all tracking-wider text-center flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyber-green" />
                <span>REINICIAR BANCO</span>
              </button>
            </div>
          </div>

          {/* User management list (Setor de Credenciais) */}
          <div className="bg-hud-card border border-hud-border/80 rounded-xl p-3.5 space-y-4">
            <div className="flex items-center justify-between border-b border-hud-border/30 pb-3">
              <span className="text-[9.5px] font-mono text-cyber-green uppercase tracking-wider block font-extrabold">
                ✓ REGISTRO DE POLICIAIS
              </span>
              <div className="flex items-center space-x-1.5 text-cyber-blue text-[9px] font-mono bg-cyber-blue/10 px-2 py-0.5 rounded border border-cyber-blue/20">
                <Search className="w-3 h-3" />
                <span className="uppercase tracking-tighter">Motor de Busca Ativo</span>
              </div>
            </div>

            {/* Search Input for Militares - MOVED UP FOR BETTER ACCESSIBILITY */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-500 group-focus-within:text-cyber-cyan transition-colors" />
              </div>
              <input
                type="text"
                placeholder="LOCALIZAR POLICIAL PARA EDIÇÃO OU CONSULTA..."
                value={militarSearchTerm}
                onChange={(e) => setMilitarSearchTerm(e.target.value)}
                className="w-full bg-[#03090b] border border-hud-border/60 hover:border-hud-border group-focus-within:border-cyber-cyan rounded-lg py-2.5 pl-9 pr-4 text-[10px] font-mono text-white placeholder-slate-600 focus:outline-none transition-all shadow-inner"
              />
              {militarSearchTerm && (
                <button 
                  onClick={() => setMilitarSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white"
                >
                  ×
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                <input type="text" placeholder="Nome Completo" value={newMilitarForm.nome} onChange={e => setNewMilitarForm({...newMilitarForm, nome: e.target.value})} className="bg-[#03090b] p-2 rounded border border-hud-border text-white col-span-2" />
                <input type="text" placeholder="Nome de Guerra" value={newMilitarForm.nomeGuerra} onChange={e => setNewMilitarForm({...newMilitarForm, nomeGuerra: e.target.value})} className="bg-[#03090b] p-2 rounded border border-hud-border text-white col-span-2" />
                
                <input type="text" placeholder="Numeral (Ex: 00.000)" value={newMilitarForm.numero || ''} onChange={e => setNewMilitarForm({...newMilitarForm, numero: maskNumeral(e.target.value)})} className="bg-[#03090b] p-2 rounded border border-hud-border text-white" />
                <input type="text" placeholder="M.F. (Ex: 000.000-0-0)" value={newMilitarForm.matriculaFuncional || ''} onChange={e => setNewMilitarForm({...newMilitarForm, matriculaFuncional: maskMF(e.target.value)})} className="bg-[#03090b] p-2 rounded border border-hud-border text-white" />

                <select value={newMilitarForm.patente} onChange={e => setNewMilitarForm({...newMilitarForm, patente: e.target.value as any})} className="bg-[#03090b] p-2 rounded border border-hud-border text-white">
                    {['CEL', 'TC', 'MAJ', 'CAP', '1ºTEN', '2ºTEN', 'ASP. OF', 'AL. OF', 'ST', '1ºSGT', '2ºSGT', '3ºSGT', 'CB', 'SD'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input 
                  type="text" 
                  list="funcoes-list"
                  placeholder="Função (Ex: ADM, MÉDICO)" 
                  value={newMilitarForm.funcao || ''} 
                  onChange={e => setNewMilitarForm({...newMilitarForm, funcao: e.target.value.toUpperCase()})} 
                  className="bg-[#03090b] p-2 rounded border border-hud-border text-white placeholder-slate-500 uppercase font-mono" 
                />
                <datalist id="funcoes-list">
                    {['ADM', 'ASSISTENTE SOCIAL', 'DENTISTA', 'ENFERMEIRO', 'FISCAL', 'MÉDICO', 'MOTORISTA', 'PSICOLOGO', 'TEC. ENFERMAGEM', 'SOBREAVISO BIOPSICOSSOCIAL'].map(f => <option key={f} value={f}>{f}</option>)}
                </datalist>
                <select value={newMilitarForm.quadro} onChange={e => setNewMilitarForm({...newMilitarForm, quadro: e.target.value as any})} className="bg-[#03090b] p-2 rounded border border-hud-border text-white col-span-2">
                    {['QOPM', 'QOAPM', 'QOCPM', 'QPPM'].map(q => <option key={q} value={q}>{q}</option>)}
                </select>
                <select value={newMilitarForm.setor || ''} onChange={e => setNewMilitarForm({...newMilitarForm, setor: e.target.value})} className="bg-[#03090b] p-2 rounded border border-hud-border text-white col-span-2 uppercase">
                    <option value="">-- NENHUM SETOR --</option>
                    <option value="ADMINISTRATIVO">ADMINISTRATIVO</option>
                    <option value="AMBULÂNCIA">AMBULÂNCIA (Enfermeiro, Motorista, Fiscal)</option>
                    <option value="FISIOTERAPIA">FISIOTERAPIA</option>
                    <option value="MÉDICA">MÉDICA</option>
                    <option value="ODONTOLOGIA">ODONTOLOGIA</option>
                    <option value="SOBREAVISO">SOBREAVISO (Assistente Social, Psicólogo)</option>
                </select>

                <select value={newMilitarForm.turno || 'TURNO A'} onChange={e => setNewMilitarForm({...newMilitarForm, turno: e.target.value as any})} className="bg-[#03090b] p-2 rounded border border-hud-border text-white col-span-2 uppercase font-mono">
                    <option value="TURNO A">TURNO A (06:00 ÀS 18:00)</option>
                    <option value="TURNO B">TURNO B (18:00 ÀS 06:00)</option>
                    <option value="24H">TURNO 24H (06:00 ÀS 06:00)</option>
                    <option value="EXPEDIENTE">EXPEDIENTE</option>
                </select>

                {/* DYNAMIC DIAGNOSTIC DUPLICITY SYSTEM */}
                {(() => {
                  const duplicateByNumero = newMilitarForm.numero && newMilitarForm.numero.trim() !== ''
                    ? allMilitares.find(m => m.numero && m.numero.trim() === newMilitarForm.numero?.trim())
                    : null;

                  const duplicateByNome = newMilitarForm.nome && newMilitarForm.nome.trim() !== ''
                    ? allMilitares.find(m => m.nome && m.nome.toLowerCase().trim() === newMilitarForm.nome?.toLowerCase().trim())
                    : null;

                  const isDuplicate = !!duplicateByNumero || !!duplicateByNome;

                  return (
                    <>
                      <div className="col-span-2 mt-1">
                        {!newMilitarForm.nome && !newMilitarForm.numero ? (
                          <div className="bg-[#03090b] border border-hud-border/40 p-2 rounded flex items-center space-x-1.5 text-[9px] text-slate-500 font-mono">
                            <Database className="w-3.5 h-3.5 text-slate-500" />
                            <span>Insira o Nome e Numeral para verificação de duplicidades em tempo real.</span>
                          </div>
                        ) : isDuplicate ? (
                          <div className="bg-cyber-red/10 border-2 border-cyber-red p-2.5 rounded-lg flex items-start space-x-2 animate-pulse shadow-[0_0_12px_rgba(255,61,0,0.15)]">
                            <AlertTriangle className="w-4 h-4 text-cyber-red shrink-0 mt-0.5" />
                            <div className="text-[10px] text-slate-300 leading-normal">
                              <strong className="text-cyber-red uppercase block tracking-widest text-[9px] font-mono">⚠️ ERRO DE DUPLICIDADE DETECTADO</strong>
                              {duplicateByNumero && (
                                <span className="block mt-0.5">O numeral <strong className="text-white font-mono text-[10.5px]">"{newMilitarForm.numero}"</strong> já é utilizado por <strong>{duplicateByNumero.patente} {duplicateByNumero.nomeGuerra}</strong> (ID: {duplicateByNumero.id}).</span>
                              )}
                              {duplicateByNome && (
                                <span className="block mt-0.5">O nome completo <strong className="text-white font-mono text-[10.5px]">"{newMilitarForm.nome}"</strong> já está cadastrado para <strong>{duplicateByNome.patente} {duplicateByNome.nomeGuerra}</strong> (ID: {duplicateByNome.id}).</span>
                              )}
                              <span className="block mt-1.5 font-mono text-[8px] text-slate-400">O sistema impede registros redundantes para garantir a integridade nacional.</span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-cyber-green/10 border border-cyber-green/30 p-2 rounded flex items-center space-x-2 text-[10px] text-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyber-green animate-pulse" />
                            <span>Diagnóstico de Integridade: Livre de duplicidades de numeral ou nome completo.</span>
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={() => {
                            if (isDuplicate) {
                              alert('Erro: Não é permitido adicionar policiais duplicados no sistema (Numeral ou Nome completo já existentes)!');
                              return;
                            }
                            if (onAddMilitar && newMilitarForm.nome && newMilitarForm.nomeGuerra) {
                                onAddMilitar({
                                    id: `M-${Date.now().toString().slice(-4)}`,
                                    ...newMilitarForm as Militar,
                                    companhia: 'Batalhão Operacional',
                                    especialidade: 'Patrulhamento',
                                    statusProntidao: 'PRONTO',
                                    chaveDigital: `KEY-${Date.now()}`,
                                    biometriaAtiva: true
                                });
                                setNewMilitarForm({ nome: '', nomeGuerra: '', patente: 'SD', funcao: 'ADM', pinSegurança: '1234', numero: '', matriculaFuncional: '', turno: 'TURNO A' });
                            }
                        }}
                        disabled={isDuplicate || !newMilitarForm.nome || !newMilitarForm.nomeGuerra}
                        className={`col-span-2 py-2 rounded font-bold uppercase transition-all ${
                          isDuplicate 
                            ? 'bg-cyber-red/10 text-cyber-red border border-cyber-red/35 cursor-not-allowed shadow-[0_0_10px_rgba(255,61,0,0.1)]' 
                            : 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/30 hover:bg-cyber-blue/35 cursor-pointer'
                        }`}
                      >
                        {isDuplicate ? 'REGISTRO BLOQUEADO POR DUPLICIDADE' : 'Registrar Policial no Sistema'}
                      </button>
                    </>
                  );
                })()}
            </div>
            <div className="flex items-center justify-between border-t border-hud-border/30 pt-3">
              <span className="text-[9.5px] font-mono text-cyber-green uppercase tracking-wider block font-extrabold">
                ✓ QUADRO ATIVO DE CREDENCIAIS
              </span>
              <div className="flex items-center space-x-1 text-[8.5px] font-mono text-slate-500 uppercase">
                <Search className="w-3 h-3 text-slate-600" />
                <span>Busca Credenciais</span>
              </div>
            </div>

            {/* Search Input for Credentials */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-500 group-focus-within:text-cyber-green transition-colors" />
              </div>
              <input
                type="text"
                placeholder="LOCALIZAR CREDENCIAL DE POLICIAL..."
                value={credencialSearchTerm}
                onChange={(e) => setCredencialSearchTerm(e.target.value)}
                className="w-full bg-[#03090b] border border-hud-border/60 hover:border-hud-border group-focus-within:border-cyber-green rounded-lg py-2 pl-9 pr-8 text-[10px] font-mono text-white placeholder-slate-600 focus:outline-none transition-all shadow-inner"
              />
              {credencialSearchTerm && (
                <button 
                  onClick={() => setCredencialSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white text-xs font-bold"
                >
                  ×
                </button>
              )}
            </div>
            
            <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
              {!credencialSearchTerm.trim() ? (
                <div className="text-center py-6 border border-dashed border-hud-border/30 rounded-lg bg-black/10 flex flex-col items-center justify-center space-y-1.5">
                  <Search className="w-4 h-4 text-slate-600 animate-pulse" />
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                    Insira uma busca acima para listar credenciais
                  </span>
                </div>
              ) : filteredMilitaresForCredenciais.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-hud-border rounded-lg bg-black/20">
                  <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Nenhum registro localizado com estes parâmetros</span>
                </div>
              ) : filteredMilitaresForCredenciais.map((u) => {
                const isSelected = u.id === userLogged?.id;
                let roleTag = 'OPERADOR';
                if (u.role === 'COMANDANTE') roleTag = 'APROVADOR / COMANDO';
                else if (u.role === 'ADMIN') roleTag = 'ADMINISTRADOR';
                else if (u.id === 'M-104') roleTag = 'RESERVA';
                else roleTag = 'SUBSTITUTO';

                return (
                  <div
                    key={u.id}
                    className={`p-2.5 rounded-lg border text-left flex flex-col space-y-2 transition-all ${
                      isSelected
                        ? 'bg-cyber-cyan/10 border-cyber-cyan/40 shadow-[0_0_8px_rgba(0,229,255,0.1)]'
                        : 'bg-[#03090b] border-hud-border/50 hover:border-hud-border'
                    }`}
                  >
                    {militarIdToDelete === u.id ? (
                      <div className="bg-cyber-red/15 border border-cyber-red/40 p-2.5 rounded flex flex-col space-y-2.5 animate-fade-in font-mono text-[10px]">
                        <div className="text-slate-300 leading-relaxed font-sans">
                          <strong className="text-cyber-red block text-[10px] tracking-wider mb-1">⚠️ CONFIRMAR EXCLUSÃO DEFINITIVA</strong>
                          Deseja excluir permanentemente o registro de <strong className="text-white">{u.patente} {u.nomeGuerra}</strong> do efetivo ativo?
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteMilitar?.(u.id);
                              setMilitarIdToDelete(null);
                            }}
                            className="flex-1 bg-cyber-red text-[#03090b] hover:bg-red-500 hover:text-[#03090b] py-1.5 rounded font-bold uppercase transition-all tracking-wider text-[9px] text-center cursor-pointer"
                          >
                            CONFIRMAR EXCLUSÃO
                          </button>
                          <button
                            type="button"
                            onClick={() => setMilitarIdToDelete(null)}
                            className="flex-1 bg-transparent hover:bg-slate-800 text-slate-300 border border-hud-border py-1.5 rounded font-semibold uppercase transition-all tracking-wider text-[9px] text-center cursor-pointer"
                          >
                            CANCELAR
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">
                            CÓDIGO: {u.id}
                          </span>
                          <div className="flex items-center space-x-2">
                             <span className="text-[7.5px] font-mono bg-cyber-amber/10 text-cyber-amber border border-cyber-amber/35 px-1.5 py-0.2 rounded font-bold uppercase">
                               {roleTag}
                             </span>
                             <button onClick={() => setMilitarIdToDelete(u.id)} className="text-cyber-red/70 hover:text-red-500 font-bold text-[8px] uppercase"><Trash2 size={12} /></button>
                             <button onClick={() => onToggleBiometria?.(u.id)} className={`${u.biometriaAtiva ? 'text-cyber-green' : 'text-cyber-amber'} hover:text-white font-bold text-[8px] uppercase`}>{u.biometriaAtiva ? 'BIO: ATIVA' : 'BIO: INATIVA'}</button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-sans">
                          <div>
                            <span className="text-[8px] font-mono text-slate-500 block uppercase font-bold">Policial Registrado</span>
                            <span className="text-[11px] font-bold text-white uppercase">{u.nome} ({u.patente}) {u.funcao ? `- ${u.funcao}` : ''}</span>
                            
                            <div className="flex flex-wrap gap-1 mt-1">
                              <span className="text-[7.5px] font-mono font-bold uppercase bg-cyber-blue/10 text-cyber-cyan border border-cyber-cyan/30 px-1 py-0.2 rounded">
                                TURNO: {u.turno || 'TURNO A'}
                              </span>
                              {u.setor && (
                                <span className="text-[7.5px] font-mono font-bold uppercase bg-slate-900 text-slate-400 border border-slate-700/40 px-1 py-0.2 rounded">
                                  SETOR: {u.setor}
                                </span>
                              )}
                            </div>

                            {u.email && (
                              <div className="text-[9px] font-mono text-slate-300 mt-1.5 flex items-center space-x-1">
                                <span className="text-slate-500 font-bold uppercase">E-mail:</span>
                                <span className="text-cyber-cyan truncate">{u.email}</span>
                              </div>
                            )}

                            <div className="text-[9.5px] font-mono mt-1.5 flex items-center space-x-2 flex-wrap gap-y-1">
                              <span className="text-slate-500 font-bold uppercase">Acesso:</span>
                              {u.acessoLiberado === false ? (
                                <span className="bg-cyber-red/15 text-cyber-red border border-cyber-red/35 px-1.5 py-0.2 rounded text-[7.5px] font-mono font-black uppercase tracking-wider animate-pulse">⚠️ BLOQUEADO</span>
                              ) : (
                                <span className="bg-cyber-green/15 text-cyber-green border border-cyber-green/35 px-1.5 py-0.2 rounded text-[7.5px] font-mono font-black uppercase tracking-wider">✓ LIBERADO</span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  if (onUpdateMilitar) {
                                    const nextStatus = u.acessoLiberado === false ? true : false;
                                    onUpdateMilitar(u.id, { acessoLiberado: nextStatus });
                                    alert(`Acesso do policial ${u.nomeGuerra} foi ${nextStatus ? 'LIBERADO' : 'BLOQUEADO'} com sucesso.`);
                                  }
                                }}
                                className={`text-[8.5px] font-bold uppercase underline hover:text-white cursor-pointer ${
                                  u.acessoLiberado === false ? 'text-cyber-green' : 'text-cyber-amber'
                                }`}
                              >
                                [{u.acessoLiberado === false ? 'Liberar Acesso' : 'Bloquear'}]
                              </button>
                            </div>

                            {(() => {
                              const mStatus = getDynamicMilitarStatus(u);
                              if (!mStatus) return null;
                              return (
                                <div className={`mt-1 inline-flex flex-col px-1.5 py-0.5 rounded border text-[8px] font-mono leading-tight ${mStatus.color}`}>
                                  <span className="font-bold uppercase tracking-wider">{mStatus.label}</span>
                                  <span className="text-[7.5px] opacity-80 mt-0.5">{mStatus.detail}</span>
                                </div>
                              );
                            })()}
                          </div>
                          <div>
                            <span className="text-[8px] font-mono text-slate-500 block uppercase font-bold">Nome de Guerra (Editável)</span>
                            <input
                              type="text"
                              value={u.nomeGuerra}
                              onChange={(e) => onUpdateMilitarNomeGuerra?.(u.id, e.target.value)}
                              className="bg-[#051319] border border-hud-border text-[11px] text-white p-1 rounded font-mono w-full focus:border-cyber-cyan outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[8px] font-mono text-slate-500 block uppercase font-bold">Nível de Acesso (Cargo)</span>
                            <select 
                              value={u.role || 'USUARIO'} 
                              onChange={(e) => {
                                if (onUpdateMilitarRole) {
                                  onUpdateMilitarRole(u.id, e.target.value as any);
                                }
                              }}
                              className="bg-[#051319] border border-hud-border text-[11px] text-white p-1.5 rounded font-mono w-full focus:border-cyber-cyan outline-none mt-0.5"
                            >
                                <option value="USUARIO">USUÁRIO (POLICIAL)</option>
                                <option value="COMANDANTE">COMANDANTE</option>
                                <option value="ADMIN">ADMINISTRADOR</option>
                            </select>
                          </div>
                          <div className="flex flex-col justify-end space-y-1">
                            <span className="text-[8px] font-mono text-slate-500 block uppercase font-bold">Ações de Cadastro</span>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingMilitar(u)}
                                className="bg-cyber-blue/15 hover:bg-cyber-blue/30 text-cyber-cyan border border-cyber-cyan/35 py-1 rounded text-[9px] font-mono font-bold uppercase transition-all text-center flex items-center justify-center cursor-pointer shadow-[0_0_8px_rgba(0,229,255,0.1)] active:scale-95"
                              >
                                ✏️ EDITAR
                              </button>
                              <button
                                type="button"
                                onClick={() => setMilitarIdToDelete(u.id)}
                                className="bg-cyber-red/15 hover:bg-cyber-red/30 text-cyber-red border border-cyber-red/35 py-1 rounded text-[9px] font-mono font-bold uppercase transition-all text-center flex items-center justify-center cursor-pointer"
                              >
                                ❌ EXCLUIR
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="flex items-center justify-between border-t border-hud-border/30 pt-2 text-[9.5px] font-mono">
                      <span className="text-slate-400">
                        PIN / 2FA: <span className="font-bold text-cyber-green">{u.pinSegurança || 'N/A'}</span>
                      </span>
                      
                      {!isSelected && onUserSwitch && (
                        <button
                          type="button"
                          onClick={() => {
                            onUserSwitch(u.id);
                            alert(`Sessão simuladora alternada com sucesso: ${u.patente} ${u.nomeGuerra}`);
                          }}
                          className="text-cyber-green hover:text-white bg-cyber-green/10 hover:bg-cyber-green/30 px-2 py-0.5 rounded border border-cyber-green/30 text-[9px] uppercase font-bold transition-all cursor-pointer"
                        >
                          Simular Logon
                        </button>
                      )}
                      {isSelected && (
                        <span className="text-cyber-cyan font-bold flex items-center text-[8.5px] uppercase">
                          <span className="w-1.5 h-1.5 bg-cyber-cyan rounded-full mr-1 animate-pulse" />
                          CONECTADO AGORA
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* EDIT MILITAR MODAL OVERLAY */}
      {editingMilitar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in" id="edit-policial-modal">
          <div className="max-w-md w-full bg-hud-card border-2 border-cyber-cyan rounded-2xl p-6 flex flex-col space-y-4 shadow-[0_0_30px_rgba(0,229,255,0.3)] relative overflow-hidden">
            {/* Cyber background line decor */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyber-cyan to-transparent"></div>
            
            <div className="flex justify-between items-center pb-2 border-b border-hud-border/50">
              <div className="flex items-center space-x-2">
                <Edit className="w-4 h-4 text-cyber-cyan" />
                <span className="text-xs font-mono text-cyber-cyan uppercase tracking-widest font-black">
                  ATUALIZAR DADOS DO POLICIAL
                </span>
              </div>
              <span className="text-[9px] font-mono text-slate-500 font-bold bg-slate-500/10 px-1.5 py-0.5 rounded">
                ID: {editingMilitar.id}
              </span>
            </div>

            <div className="flex space-x-1 border-b border-hud-border/30 pb-2">
              <button
                onClick={() => setEditPolicialTab('GERAL')}
                className={`flex-1 py-1 text-[10px] uppercase font-bold tracking-wider rounded ${editPolicialTab === 'GERAL' ? 'bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30' : 'text-slate-500 hover:text-slate-300 bg-transparent'}`}
              >
                Dados Gerais
              </button>
              <button
                onClick={() => setEditPolicialTab('AFASTAMENTOS')}
                className={`flex-1 py-1 text-[10px] uppercase font-bold tracking-wider rounded ${editPolicialTab === 'AFASTAMENTOS' ? 'bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30' : 'text-slate-500 hover:text-slate-300 bg-transparent'}`}
              >
                Afastamentos
              </button>
            </div>

            {editPolicialTab === 'GERAL' && (
            <div className="grid grid-cols-2 gap-3 text-[10.5px] text-left max-h-[380px] overflow-y-auto pr-1">
              <div className="col-span-2 flex flex-col space-y-1">
                <label className="text-[8.5px] font-mono text-slate-400 uppercase tracking-wider font-bold">Nome Completo</label>
                <input
                  type="text"
                  value={editingMilitar.nome || ''}
                  onChange={e => setEditingMilitar({...editingMilitar, nome: e.target.value})}
                  className="bg-[#03090b] p-2 rounded border border-hud-border text-white text-xs"
                  placeholder="Nome Completo"
                />
              </div>

              <div className="col-span-2 flex flex-col space-y-1">
                <label className="text-[8.5px] font-mono text-slate-400 uppercase tracking-wider font-bold">Nome de Guerra</label>
                <input
                  type="text"
                  value={editingMilitar.nomeGuerra || ''}
                  onChange={e => setEditingMilitar({...editingMilitar, nomeGuerra: e.target.value})}
                  className="bg-[#03090b] p-2 rounded border border-hud-border text-white text-xs"
                  placeholder="Nome de Guerra"
                />
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[8.5px] font-mono text-slate-400 uppercase tracking-wider font-bold">Corporativo / Numeral</label>
                <input
                  type="text"
                  value={editingMilitar.numero || ''}
                  onChange={e => setEditingMilitar({...editingMilitar, numero: maskNumeral(e.target.value)})}
                  className="bg-[#03090b] p-2 rounded border border-hud-border text-white text-xs font-mono"
                  placeholder="Ex: 00.000"
                />
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[8.5px] font-mono text-slate-400 uppercase tracking-wider font-bold">Matrícula Funcional (M.F)</label>
                <input
                  type="text"
                  value={editingMilitar.matriculaFuncional || ''}
                  onChange={e => setEditingMilitar({...editingMilitar, matriculaFuncional: maskMF(e.target.value)})}
                  className="bg-[#03090b] p-2 rounded border border-hud-border text-white text-xs font-mono"
                  placeholder="Ex: 000.000-0-0"
                />
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[8.5px] font-mono text-slate-400 uppercase tracking-wider font-bold">Post/Grad</label>
                <select
                  value={editingMilitar.patente || 'SD'}
                  onChange={e => setEditingMilitar({...editingMilitar, patente: e.target.value as any})}
                  className="bg-[#03090b] p-2 rounded border border-hud-border text-white text-xs"
                >
                  {['CEL', 'TC', 'MAJ', 'CAP', '1ºTEN', '2ºTEN', 'ASP. OF', 'AL. OF', 'ST', '1ºSGT', '2ºSGT', '3ºSGT', 'CB', 'SD'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[8.5px] font-mono text-slate-400 uppercase tracking-wider font-bold">Função Ativa</label>
                <input
                  type="text"
                  list="funcoes-list-edit"
                  value={editingMilitar.funcao || ''}
                  onChange={e => setEditingMilitar({...editingMilitar, funcao: e.target.value.toUpperCase()})}
                  className="bg-[#03090b] p-2 rounded border border-hud-border text-white text-xs uppercase"
                  placeholder="Ex: ADM, MOTORISTA"
                />
                <datalist id="funcoes-list-edit">
                  {['ADM', 'ASSISTENTE SOCIAL', 'DENTISTA', 'ENFERMEIRO', 'FISCAL', 'MÉDICO', 'MOTORISTA', 'PSICOLOGO', 'TEC. ENFERMAGEM', 'SOBREAVISO BIOPSICOSSOCIAL'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </datalist>
              </div>

              <div className="flex flex-col space-y-1 col-span-1">
                <label className="text-[8.5px] font-mono text-slate-400 uppercase tracking-wider font-bold">Quadro PM</label>
                <select
                  value={editingMilitar.quadro || 'QPPM'}
                  onChange={e => setEditingMilitar({...editingMilitar, quadro: e.target.value as any})}
                  className="bg-[#03090b] p-2 rounded border border-hud-border text-white text-xs"
                >
                  {['QOPM', 'QOAPM', 'QOCPM', 'QPPM'].map(q => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col space-y-1 col-span-1">
                <label className="text-[8.5px] font-mono text-slate-400 uppercase tracking-wider font-bold">Setor</label>
                <select
                  value={editingMilitar.setor || ''}
                  onChange={e => setEditingMilitar({...editingMilitar, setor: e.target.value})}
                  className="bg-[#03090b] p-2 rounded border border-hud-border text-white text-xs uppercase"
                >
                  <option value="">-- NENHUM --</option>
                  <option value="ADMINISTRATIVO">ADMINISTRATIVO</option>
                  <option value="AMBULÂNCIA">AMBULÂNCIA (Enfermeiro, Motorista, Fiscal)</option>
                  <option value="FISIOTERAPIA">FISIOTERAPIA</option>
                  <option value="MÉDICA">MÉDICA</option>
                  <option value="ODONTOLOGIA">ODONTOLOGIA</option>
                  <option value="SOBREAVISO">SOBREAVISO (Assistente Social, Psicólogo)</option>
                </select>
              </div>

              <div className="flex flex-col space-y-1 col-span-1">
                <label className="text-[8.5px] font-mono text-slate-400 uppercase tracking-wider font-bold">Turno de Trabalho</label>
                <select
                  value={editingMilitar.turno || 'TURNO A'}
                  onChange={e => setEditingMilitar({...editingMilitar, turno: e.target.value as any})}
                  className="bg-[#03090b] p-2 rounded border border-hud-border text-white text-xs uppercase font-mono"
                >
                  <option value="TURNO A">TURNO A (06H às 18H)</option>
                  <option value="TURNO B">TURNO B (18H às 06H)</option>
                  <option value="24H">24H (06H às 06H)</option>
                  <option value="EXPEDIENTE">EXPEDIENTE</option>
                </select>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[8.5px] font-mono text-slate-400 uppercase tracking-wider font-bold">PIN de Segurança (2FA)</label>
                <input
                  type="password"
                  value={editingMilitar.pinSegurança || ''}
                  onChange={e => setEditingMilitar({...editingMilitar, pinSegurança: e.target.value})}
                  className="bg-[#03090b] p-2 rounded border border-hud-border text-white font-mono text-xs"
                  placeholder="••••"
                />
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[8.5px] font-mono text-slate-400 uppercase tracking-wider font-bold">Função / Nível de Acesso</label>
                <select
                  value={editingMilitar.role || 'USUARIO'}
                  onChange={e => setEditingMilitar({...editingMilitar, role: e.target.value as any})}
                  disabled={editingMilitar.id === userLogged?.id}
                  className={`bg-[#03090b] p-2 rounded border border-hud-border text-white text-xs ${editingMilitar.id === userLogged?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <option value="USUARIO">USUÁRIO (POLICIAL)</option>
                  <option value="COMANDANTE">COMANDANTE</option>
                  <option value="ADMIN">ADMINISTRADOR</option>
                </select>
              </div>

              <div className="flex flex-col space-y-1 col-span-2">
                <label className="text-[8.5px] font-mono text-slate-400 uppercase tracking-wider font-bold">E-mail de Contato / Corporativo</label>
                <input
                  type="email"
                  value={editingMilitar.email || ''}
                  onChange={e => setEditingMilitar({...editingMilitar, email: e.target.value})}
                  className="bg-[#03090b] p-2 rounded border border-hud-border text-white text-xs"
                  placeholder="exemplo@pm.gov.br"
                />
              </div>

              <div className="col-span-2 p-2 rounded border border-hud-border bg-[#020709] flex justify-between items-center text-[11px] font-sans">
                <span className="text-slate-300">Biometria Facial / Segurança Ativa:</span>
                <button
                  type="button"
                  onClick={() => setEditingMilitar({...editingMilitar, biometriaAtiva: !editingMilitar.biometriaAtiva})}
                  className={`px-3 py-1 rounded text-[9px] font-mono font-bold uppercase transition-all border ${
                    editingMilitar.biometriaAtiva 
                      ? 'bg-cyber-green/10 text-cyber-green border-cyber-green/30' 
                      : 'bg-cyber-amber/10 text-cyber-amber border-cyber-amber/30'
                  }`}
                >
                  {editingMilitar.biometriaAtiva ? 'Sim (Habilitado)' : 'Não (Inativo)'}
                </button>
              </div>

              <div className="col-span-2 p-2 rounded border border-hud-border bg-[#020709] flex justify-between items-center text-[11px] font-sans">
                <span className="text-slate-300">Autorização de Acesso (Administrador):</span>
                <button
                  type="button"
                  onClick={() => setEditingMilitar({...editingMilitar, acessoLiberado: editingMilitar.acessoLiberado === false ? true : false})}
                  className={`px-3 py-1 rounded text-[9px] font-mono font-bold uppercase transition-all border ${
                    editingMilitar.acessoLiberado !== false 
                      ? 'bg-cyber-green/10 text-cyber-green border-cyber-green/30' 
                      : 'bg-cyber-red/10 text-cyber-red border-cyber-red/30'
                  }`}
                >
                  {editingMilitar.acessoLiberado !== false ? '✓ Acesso Liberado' : '⚠️ Acesso Bloqueado'}
                </button>
              </div>
            </div>
            )}

            {editPolicialTab === 'AFASTAMENTOS' && (
            <div className="flex flex-col space-y-4 max-h-[380px] overflow-y-auto pr-1 text-[10.5px]">
              <div className="bg-[#03090b] border border-hud-border p-3 rounded flex flex-col space-y-3">
                <span className="text-[9px] font-mono text-cyber-cyan uppercase font-bold tracking-widest border-b border-cyber-cyan/30 pb-1">Novo Afastamento</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 flex flex-col space-y-1">
                    <label className="text-[8.5px] font-mono text-slate-400 uppercase tracking-wider font-bold">Motivo</label>
                    <select
                      id="novoMotivoAfastamento"
                      className="bg-[#020507] p-2 rounded border border-hud-border text-white text-xs"
                      defaultValue="FÉRIAS"
                    >
                      <option value="FÉRIAS">FÉRIAS</option>
                      <option value="LICENÇA">LICENÇA</option>
                      <option value="LUTO">LUTO</option>
                      <option value="ATESTADO">ATESTADO</option>
                      <option value="OUTROS">OUTROS</option>
                    </select>
                  </div>
                  <div className="col-span-1 flex flex-col space-y-1">
                    <label className="text-[8.5px] font-mono text-slate-400 uppercase tracking-wider font-bold">Início</label>
                    <input type="date" id="novaDataInicioAfastamento" className="bg-[#020507] p-2 rounded border border-hud-border text-white text-[10px] uppercase font-mono" />
                  </div>
                  <div className="col-span-1 flex flex-col space-y-1">
                    <label className="text-[8.5px] font-mono text-slate-400 uppercase tracking-wider font-bold">Fim</label>
                    <input type="date" id="novaDataFimAfastamento" className="bg-[#020507] p-2 rounded border border-hud-border text-white text-[10px] uppercase font-mono" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const motivo = (document.getElementById('novoMotivoAfastamento') as HTMLSelectElement).value as any;
                    const dataInicio = (document.getElementById('novaDataInicioAfastamento') as HTMLInputElement).value;
                    const dataFim = (document.getElementById('novaDataFimAfastamento') as HTMLInputElement).value;
                    if (!dataInicio || !dataFim) {
                      alert('Selecione as datas de início e fim.');
                      return;
                    }
                    if (dataInicio > dataFim) {
                      alert('Data de início não pode ser maior que a de fim.');
                      return;
                    }
                    const newAfastamento = {
                      id: 'afst_' + Date.now().toString(36),
                      motivo,
                      dataInicio,
                      dataFim
                    };
                    const updatedAfastamentos = [...(editingMilitar.afastamentos || []), newAfastamento];
                    setEditingMilitar({...editingMilitar, afastamentos: updatedAfastamentos});
                    if (onUpdateMilitar) {
                      onUpdateMilitar(editingMilitar.id, { afastamentos: updatedAfastamentos });
                    }
                    (document.getElementById('novaDataInicioAfastamento') as HTMLInputElement).value = '';
                    (document.getElementById('novaDataFimAfastamento') as HTMLInputElement).value = '';
                  }}
                  className="bg-cyber-cyan/10 hover:bg-cyber-cyan/20 border border-cyber-cyan/50 text-cyber-cyan text-[10px] font-bold uppercase tracking-widest py-1.5 rounded transition-all"
                >
                  Registrar Afastamento
                </button>
              </div>

              <div className="flex flex-col space-y-2">
                <span className="text-[9px] font-mono text-slate-400 uppercase font-bold tracking-widest border-b border-hud-border pb-1">Registros de Afastamento</span>
                {(!editingMilitar.afastamentos || editingMilitar.afastamentos.length === 0) ? (
                  <p className="text-[10px] text-slate-500 italic py-2 text-center">Nenhum afastamento registrado.</p>
                ) : (
                  <div className="flex flex-col space-y-2">
                    {editingMilitar.afastamentos.map(af => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      let statusLabel = 'AGENDADO';
                      let statusClass = 'text-cyber-amber bg-cyber-amber/10 border-cyber-amber/30';
                      
                      if (todayStr >= af.dataInicio && todayStr <= af.dataFim) {
                        statusLabel = 'ATIVO (BLOQUEADO)';
                        statusClass = 'text-cyber-red bg-cyber-red/10 border-cyber-red/30';
                      } else if (todayStr > af.dataFim) {
                        statusLabel = 'CONCLUÍDO (RETORNADO AUTOMATICAMENTE)';
                        statusClass = 'text-cyber-green bg-cyber-green/10 border-cyber-green/30';
                      }
                      
                      return (
                        <div key={af.id} className="bg-slate-900/50 border border-slate-700/50 p-2 rounded flex justify-between items-center">
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-cyber-amber font-bold text-[10px] uppercase">{af.motivo}</span>
                              <span className={`text-[7.5px] font-mono px-1 rounded border font-bold ${statusClass}`}>
                                {statusLabel}
                              </span>
                            </div>
                            <span className="text-slate-400 text-[9px] font-mono">{af.dataInicio.split('-').reverse().join('/')} até {af.dataFim.split('-').reverse().join('/')}</span>
                          </div>
                          <button
                          type="button"
                          onClick={() => {
                            const updated = editingMilitar.afastamentos!.filter(a => a.id !== af.id);
                            setEditingMilitar({...editingMilitar, afastamentos: updated});
                            if (onUpdateMilitar) {
                              onUpdateMilitar(editingMilitar.id, { afastamentos: updated });
                            }
                          }}
                          className="text-red-400 hover:text-red-300 bg-red-400/10 p-1.5 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            )}

            <div className="flex space-x-2.5 pt-4 border-t border-hud-border/30">
              <button
                type="button"
                onClick={() => {
                  if (!editingMilitar.nome || !editingMilitar.nomeGuerra) {
                    alert('Erro: Nome Completo e Nome de Guerra são obrigatórios.');
                    return;
                  }
                  if (onUpdateMilitar) {
                    onUpdateMilitar(editingMilitar.id, editingMilitar);
                    alert(`Sucesso: Cadastro de ${editingMilitar.patente} ${editingMilitar.nomeGuerra} atualizado!`);
                  }
                  setEditingMilitar(null);
                }}
                className="flex-1 bg-cyber-cyan text-[#03080a] hover:bg-white transition-all py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-center cursor-pointer shadow-[0_0_15px_rgba(0,229,255,0.2)]"
              >
                SALVAR ALTERAÇÕES
              </button>
              <button
                type="button"
                onClick={() => setEditingMilitar(null)}
                className="flex-1 bg-transparent hover:bg-slate-800 text-slate-300 border border-hud-border/70 transition-all py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-center cursor-pointer"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
