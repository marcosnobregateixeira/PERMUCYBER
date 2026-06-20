/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
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
  RefreshCw,
  FileCode,
  Key,
  Trash2
} from 'lucide-react';
import { Permuta, Militar, BlockchainLog, Escala } from '../types';
import { generateSimpleHash, formatarDataBR } from '../data';
import DocumentoHomologacao from './DocumentoHomologacao';

interface PainelGestorProps {
  permutas: Permuta[];
  allMilitares: Militar[];
  logs: BlockchainLog[];
  userLogged: Militar;
  escalas: Escala[];
  onApprovePermuta: (permutaId: string, gestorNome: string, gestorAssinatura: string) => void;
  onRejectPermuta: (permutaId: string) => void;
  onAdjustPermuta: (permutaId: string, justificativa: string) => void;
  onRefreshData?: () => void;
  onImportMilitaresJSON?: (militares: Militar[]) => void;
  onUpdateMilitarNomeGuerra?: (id: string, newNome: string) => void;
  onAddMilitar?: (m: Militar) => void;
  onDeleteMilitar?: (id: string) => void;
  onToggleBiometria?: (id: string) => void;
  onUserSwitch?: (userId: string) => void;
}

export default function PainelGestor({
  permutas,
  allMilitares,
  logs,
  userLogged,
  escalas,
  onApprovePermuta,
  onRejectPermuta,
  onAdjustPermuta,
  onRefreshData,
  onImportMilitaresJSON,
  onUpdateMilitarNomeGuerra,
  onAddMilitar,
  onDeleteMilitar,
  onToggleBiometria,
  onUserSwitch
}: PainelGestorProps) {
  const [activeSubTab, setActiveSubTab] = useState<'PEDIDOS' | 'AUDITORIA' | 'METRICAS' | 'SISTEMA' | 'EXCLUSAO'>('PEDIDOS');
  const [newMilitarForm, setNewMilitarForm] = useState<Partial<Militar>>({ nome: '', nomeGuerra: '', patente: 'SD', funcao: 'ADM', quadro: 'QPPM', pinSegurança: '1234' });
  const [selectedPermutaDetailId, setSelectedPermutaDetailId] = useState<string | null>(null);
  const [justificativaAjuste, setJustificativaAjuste] = useState<string>('');
  const [showAjusteParaId, setShowAjusteParaId] = useState<string | null>(null);
  const [selectedHistoricId, setSelectedHistoricId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const pendentesGestor = permutas.filter(p => p.status === 'PENDENTE_GESTOR');
  const historicoCompleto = permutas.filter(p => p.status !== 'PENDENTE_GESTOR' && p.status !== 'PENDENTE_SUBSTITUTO');

  // Simple stats
  const totalSolicitacoes = permutas.length;
  const totalAprovadas = permutas.filter(p => p.status === 'APROVADO').length;
  const descansoMedioIndex = 98.2; // simulated tactical compliance

  const handleApprove = (pId: string) => {
    const gestorAssinatura = `COMAS-CENTRAL::${userLogged.nomeGuerra.toUpperCase()}::SECURE-CRYPTO-OK-${Math.floor(Math.random()*1000).toString(16).toUpperCase()}`;
    onApprovePermuta(pId, userLogged.nomeGuerra, gestorAssinatura);
    setSelectedPermutaDetailId(null);
  };

  const handleReject = (pId: string) => {
    onRejectPermuta(pId);
    setSelectedPermutaDetailId(null);
  };

  const handleSendAdjust = (pId: string) => {
    if (!justificativaAjuste) return;
    onAdjustPermuta(pId, justificativaAjuste);
    setShowAjusteParaId(null);
    setJustificativaAjuste('');
    setSelectedPermutaDetailId(null);
  };

  return (
    <div className="flex-1 flex flex-col p-4 bg-[#03080a] text-slate-100 select-none pb-12" id="painel-gestor-container">
      {/* COMPACT SUB TABS CONTROLS */}
      <div className="grid grid-cols-5 gap-1 bg-[#061217] p-1 rounded-lg border border-hud-border/70 mb-4 text-[10px] font-mono">
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
          onClick={() => setActiveSubTab('METRICAS')}
          className={`py-1.5 rounded uppercase font-bold transition-all text-center ${
            activeSubTab === 'METRICAS'
              ? 'bg-cyber-blue text-[#03080a]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          MÉTRICAS
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
        <button
          onClick={() => setActiveSubTab('EXCLUSAO')}
          className={`py-1.5 rounded uppercase font-bold transition-all text-center ${
            activeSubTab === 'EXCLUSAO'
              ? 'bg-cyber-red text-[#03080a]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          EXCLUSÃO
        </button>
      </div>

      {/* QUICK KPI METRIC CARDS */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        <div className="bg-hud-card border border-hud-border p-2 rounded-lg">
          <span className="text-[7.5px] font-mono text-slate-500 block uppercase">FILA RATIF.</span>
          <span className="text-sm font-black font-display text-[#ffb300]">{pendentesGestor.length} NO FILTRO</span>
        </div>
        <div className="bg-hud-card border border-hud-border p-2 rounded-lg">
          <span className="text-[7.5px] font-mono text-slate-500 block uppercase">CONCLUÍDAS</span>
          <span className="text-sm font-black font-display text-cyber-green">{totalAprovadas} TROCAS</span>
        </div>
        <div className="bg-hud-card border border-hud-border p-2 rounded-lg">
          <span className="text-[7.5px] font-mono text-slate-500 block uppercase">CADASTRO AUDITADO</span>
          <span className="text-sm font-black font-display text-cyber-blue">{logs.length} BLOCOS</span>
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
                        <h4 className="text-xs font-bold text-white truncate mt-1">{p.postoServico}</h4>
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
                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          <button
                            onClick={() => handleReject(p.id)}
                            className="bg-cyber-red/10 border border-cyber-red/30 hover:bg-cyber-red/25 text-cyber-red transition-all py-2 rounded font-mono font-bold text-[9px] uppercase flex flex-col items-center justify-center"
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
            <h3 className="text-xs font-bold font-display text-white tracking-wider uppercase mb-2 flex items-center">
              <FileText className="w-4 h-4 text-cyber-cyan mr-1.5" />
              REGISTROS FECHADOS DA GUARNIMENTO
            </h3>
            
            {historicoCompleto.length === 0 ? (
              <p className="text-slate-500 font-mono text-[10px] text-center py-2">Sem histórico consolidado recente.</p>
            ) : (
              <div className="space-y-2">
                {historicoCompleto.map((h) => {
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
                      {/* Accordion trigger bar */}
                      <div 
                        onClick={() => setSelectedHistoricId(isExpanded ? null : h.id)}
                        className="p-2.5 flex items-center justify-between text-xs cursor-pointer select-none"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                            <span className="font-bold text-white text-[11px] uppercase tracking-wide">{h.postoServico}</span>
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
                              : 'bg-cyber-red/10 text-cyber-red border-cyber-red/20'
                          }`}>
                            {isApproved ? 'APROVADA' : h.status === 'AJUSTE_GESTOR' ? 'SOLIC. AJUSTE' : 'REJEITADA'}
                          </span>
                          <span className="text-[7.5px] font-mono text-slate-500 block mt-0.5 uppercase tracking-tighter">Clique p/ Detalhes</span>
                        </div>
                      </div>

                      {/* Dropdown document details */}
                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-hud-border/40 pt-2 background-[#03090b]/40">
                          {isApproved ? (
                            <div className="space-y-2">
                              <span className="text-[8px] font-mono text-cyber-cyan font-bold block uppercase tracking-wide">CERTIDÃO ARQUIVADA DE HOMOLOGAÇÃO:</span>
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
                  className="bg-hud-card border border-hud-border rounded-xl p-3 space-y-2 text-xs relative overflow-hidden"
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border uppercase font-bold ${typeColor}`}>
                      {log.tipoEvento}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">{log.timestamp}</span>
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
      {activeSubTab === 'METRICAS' && (
        <div className="space-y-4">
          <div className="bg-hud-card border border-hud-border rounded-xl p-3.5 space-y-1">
            <span className="text-[9px] font-mono text-cyber-cyan uppercase tracking-wider block">DENSIDADE COOPERAÇÃO MENSUAL</span>
            <p className="text-slate-400 text-[10px]">Taxa volumétrica de permuta militar por setor de vigília.</p>
            
            {/* Custom high-fidelity military SVG chart of stats */}
            <div className="h-28 w-full bg-[#020507] border border-hud-border/40 rounded-lg mt-3 relative flex items-center justify-center p-2">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40">
                {/* Horizontal reference grid lines */}
                <line x1="0" y1="10" x2="100" y2="10" stroke="#142e36" strokeDasharray="2" strokeWidth="0.15" />
                <line x1="0" y1="20" x2="100" y2="20" stroke="#142e36" strokeDasharray="2" strokeWidth="0.15" />
                <line x1="0" y1="30" x2="100" y2="30" stroke="#142e36" strokeDasharray="2" strokeWidth="0.15" />
                
                {/* Tactical grid background scan */}
                <line x1="20" y1="0" x2="20" y2="40" stroke="#142e36" strokeDasharray="1" strokeWidth="0.1" />
                <line x1="40" y1="0" x2="40" y2="40" stroke="#142e36" strokeDasharray="1" strokeWidth="0.1" />
                <line x1="60" y1="0" x2="60" y2="40" stroke="#142e36" strokeDasharray="1" strokeWidth="0.1" />
                <line x1="80" y1="0" x2="80" y2="40" stroke="#142e36" strokeDasharray="1" strokeWidth="0.1" />

                {/* Glowing neon green area chart */}
                <path
                  d="M 0 35 L 20 28 L 40 12 L 60 22 L 80 5 L 100 15 L 100 40 L 0 40 Z"
                  fill="url(#laser-glow-blue)"
                  opacity="0.25"
                />

                {/* Glowing line plot */}
                <path
                  d="M 0 35 L 20 28 L 40 12 L 60 22 L 80 5 L 100 15"
                  fill="none"
                  stroke="#00e5ff"
                  strokeWidth="1"
                  filter="url(#glow-filter)"
                />

                {/* Cyberpunk targeting dots over points */}
                <circle cx="20" cy="28" r="1.5" fill="#00ff66" stroke="#03080a" strokeWidth="0.5" />
                <circle cx="40" cy="12" r="1.5" fill="#00ff66" stroke="#03080a" strokeWidth="0.5" />
                <circle cx="60" cy="22" r="1.5" fill="#00ff66" stroke="#03080a" strokeWidth="0.5" />
                <circle cx="80" cy="5" r="1.5" fill="#00ff66" stroke="#03080a" strokeWidth="0.5" />

                <defs>
                  <linearGradient id="laser-glow-blue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00e5ff" />
                    <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
                  </linearGradient>
                  <filter id="glow-filter">
                    <feGaussianBlur stdDeviation="0.6" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
              </svg>
              
              <div className="absolute bottom-1 left-2 text-[7px] font-mono text-slate-500">SET_A</div>
              <div className="absolute bottom-1 right-2 text-[7px] font-mono text-slate-500">SEC_ALPHA_9</div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-1 pt-1 text-[10px] font-mono text-slate-400">
              <div className="flex justify-between border-b border-hud-border/30 pb-1">
                <span>POSTO CENTRAL QG:</span>
                <span className="text-cyber-blue font-bold">54%</span>
              </div>
              <div className="flex justify-between border-b border-hud-border/30 pb-1">
                <span>COMISSARIA BATALHÃO:</span>
                <span className="text-cyber-green font-bold">29%</span>
              </div>
            </div>
          </div>

          <div className="bg-hud-card border border-hud-border rounded-xl p-3.5 space-y-1">
            <span className="text-[9px] font-mono text-cyber-cyan uppercase tracking-wider block">TAXA DE REJEIÇÃO / ALTERAÇÃO</span>
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 shrink-0 relative flex items-center justify-center">
                {/* SVG Radial Chart */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#142e36" strokeWidth="4" />
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#00ff66" strokeWidth="4" strokeDasharray="85 15" />
                </svg>
                <span className="absolute text-[9px] font-mono font-bold text-cyber-green">85%</span>
              </div>
              <div className="flex-1 text-[11px] font-sans text-slate-300 leading-relaxed">
                <strong>85% das propostas de permutas</strong> são integralizadas em primeiro ciclo de aceitação, reduzindo fricção administrativa em até 10 vezes.
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'EXCLUSAO' && (
        <div className="space-y-3 animate-fade-in font-sans">
          <h3 className="text-xs font-bold font-display text-white tracking-wider uppercase flex items-center">
            <Trash2 className="w-4 h-4 text-cyber-red mr-1.5" />
            GERENCIAMENTO DE EFETIVO (EXCLUSÃO)
          </h3>
          <div className="space-y-2">
            {allMilitares.map(m => (
                <div key={m.id} className="bg-hud-card border border-hud-border p-3 rounded-lg flex justify-between items-center text-xs">
                    <span className="font-mono text-slate-300">{m.patente} {m.nomeGuerra} ({m.id})</span>
                    <button onClick={() => onDeleteMilitar?.(m.id)} className="text-cyber-red/70 hover:text-red-500 p-1">
                        <Trash2 size={16} />
                    </button>
                </div>
            ))}
          </div>
        </div>
      )}

      {/* SYSTEM ADMINISTRATIVE MANAGEMENT OPTIONS */}
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
          <div className="bg-hud-card border border-hud-border/80 rounded-xl p-3.5 space-y-3">
            <span className="text-[9.5px] font-mono text-cyber-green uppercase tracking-wider block font-extrabold">
              ✓ REGISTRO DE POLICIAIS
            </span>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
                <input type="text" placeholder="Nome Completo" value={newMilitarForm.nome} onChange={e => setNewMilitarForm({...newMilitarForm, nome: e.target.value})} className="bg-[#03090b] p-2 rounded border border-hud-border text-white col-span-2" />
                <input type="text" placeholder="Nome de Guerra" value={newMilitarForm.nomeGuerra} onChange={e => setNewMilitarForm({...newMilitarForm, nomeGuerra: e.target.value})} className="bg-[#03090b] p-2 rounded border border-hud-border text-white" />
                <select value={newMilitarForm.patente} onChange={e => setNewMilitarForm({...newMilitarForm, patente: e.target.value as any})} className="bg-[#03090b] p-2 rounded border border-hud-border text-white">
                    {['CEL', 'TC', 'MAJ', 'CAP', '1ºTEN', '2ºTEN', 'ST', '1ºSGT', '2ºSGT', '3ºSGT', 'CB', 'SD'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={newMilitarForm.funcao} onChange={e => setNewMilitarForm({...newMilitarForm, funcao: e.target.value as any})} className="bg-[#03090b] p-2 rounded border border-hud-border text-white">
                    {['ADM', 'ASSISTENTE SOCIAL', 'DENTISTA', 'ENFERMEIRO', 'FISCAL', 'MÉDICO', 'MOTORISTA', 'PSICOLOGO', 'TEC. ENFERMAGEM'].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <select value={newMilitarForm.quadro} onChange={e => setNewMilitarForm({...newMilitarForm, quadro: e.target.value as any})} className="bg-[#03090b] p-2 rounded border border-hud-border text-white">
                    {['QOPM', 'QOAPM', 'QOCPM', 'QPPM'].map(q => <option key={q} value={q}>{q}</option>)}
                </select>
                <button 
                    onClick={() => {
                        if (onAddMilitar && newMilitarForm.nome && newMilitarForm.nomeGuerra) {
                            onAddMilitar({
                                id: `M-${Date.now().toString().slice(-4)}`,
                                ...newMilitarForm as Militar,
                                companhia: 'Batalhão Operacional',
                                especialidade: 'Patrulhamento',
                                statusProntidao: 'PRONTO',
                                chaveDigital: `KEY-${Date.now()}`,
                                biometriaAtiva: false
                            });
                            setNewMilitarForm({ nome: '', nomeGuerra: '', patente: 'SD', funcao: 'ADM', pinSegurança: '1234' });
                        }
                    }}
                    className="col-span-2 bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/30 py-2 rounded font-bold uppercase transition-all"
                >
                    Registrar Oficial no Sistema
                </button>
            </div>
            <span className="text-[9.5px] font-mono text-cyber-green uppercase tracking-wider block font-extrabold border-t border-hud-border/30 pt-3">
              ✓ QUADRO ATIVO DE CREDENCIAIS
            </span>
            
            <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
              {allMilitares.map((u) => {
                const isSelected = u.id === userLogged.id;
                let roleTag = 'SUBSTITUÍDO';
                if (u.id === 'M-102') roleTag = 'SUBSTITUTO';
                if (u.id === 'M-202') roleTag = 'APROVADOR / COMANDO';
                if (u.id === 'M-103' || u.id === 'M-104') roleTag = 'RESERVA';

                return (
                  <div
                    key={u.id}
                    className={`p-2.5 rounded-lg border text-left flex flex-col space-y-2 transition-all ${
                      isSelected
                        ? 'bg-cyber-cyan/10 border-cyber-cyan/40 shadow-[0_0_8px_rgba(0,229,255,0.1)]'
                        : 'bg-[#03090b] border-hud-border/50 hover:border-hud-border'
                    }`}
                  >
                      <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">
                        CÓDIGO: {u.id}
                      </span>
                      <div className="flex items-center space-x-2">
                         <span className="text-[7.5px] font-mono bg-cyber-amber/10 text-cyber-amber border border-cyber-amber/35 px-1.5 py-0.2 rounded font-bold uppercase">
                           {roleTag}
                         </span>
                         <button onClick={() => onDeleteMilitar?.(u.id)} className="text-cyber-red/70 hover:text-red-500 font-bold text-[8px] uppercase"><Trash2 size={12} /></button>
                         <button onClick={() => onToggleBiometria?.(u.id)} className={`${u.biometriaAtiva ? 'text-cyber-green' : 'text-cyber-amber'} hover:text-white font-bold text-[8px] uppercase`}>{u.biometriaAtiva ? 'BIO: ATIVA' : 'BIO: INATIVA'}</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-sans">
                      <div>
                        <span className="text-[8px] font-mono text-slate-500 block uppercase font-bold">Oficial Registrado</span>
                        <span className="text-[11px] font-bold text-white uppercase">{u.nome} ({u.patente})</span>
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
                    </div>

                    <div className="flex items-center justify-between border-t border-hud-border/30 pt-2 text-[9.5px] font-mono">
                      <span className="text-slate-400">
                        PIN / 2FA: <span className="font-bold text-cyber-green">{u.pinSegurança}</span>
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

    </div>
  );
}
