/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  ShieldAlert, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  AlertOctagon, 
  TrendingUp, 
  Zap, 
  Users, 
  Activity,
  FileSignature,
  Edit2,
  Save,
  AlertTriangle,
  Info,
  Cpu,
  X,
  ShieldCheck
} from 'lucide-react';
import { Militar, Escala, Alerta, Permuta } from '../types';
import { formatarDataBR } from '../data';
import DocumentoHomologacao from './DocumentoHomologacao';

interface DashboardProps {
  userLogged: Militar;
  allMilitares: Militar[];
  escalas: Escala[];
  alertas: Alerta[];
  permutas: Permuta[];
  onStartPermutaFlow: (escala: Escala) => void;
  onSelectPermuta: (permuta: Permuta) => void;
  onNavigateToTab: (tab: 'DASHBOARD' | 'PERMUTA' | 'HISTORICO' | 'P_GESTOR' | 'CHAT') => void;
  onApprovePermuta?: (permutaId: string, gestorNome: string, gestorSignature: string) => void;
  onRejectPermuta?: (permutaId: string) => void;
  onAdjustPermuta?: (permutaId: string, justificativa: string) => void;
  onUpdateAlerta?: (alertaId: string, conteudo: string, color: string, icon: string) => void;
}

export default function Dashboard({
  userLogged,
  allMilitares,
  escalas,
  alertas,
  permutas,
  onStartPermutaFlow,
  onSelectPermuta,
  onNavigateToTab,
  onApprovePermuta,
  onRejectPermuta,
  onAdjustPermuta,
  onUpdateAlerta
}: DashboardProps) {
  const today = new Date();
  const realDay = today.getDate();
  const monthNames: Record<number, string> = {
    4: 'MAIO',
    5: 'JUNHO',
    6: 'JULHO'
  };
  const realMonth = monthNames[today.getMonth()] || 'JUNHO';

  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number>(realDay); 
  const [expandedHomologationId, setExpandedHomologationId] = useState<string | null>(null);
  const [showAjusteParaId, setShowAjusteParaId] = useState<string | null>(null);
  const [justificativaAjuste, setJustificativaAjuste] = useState('');
  const [showHomologadasModal, setShowHomologadasModal] = useState(false);
  const [modalFilter, setModalFilter] = useState<'TODAS' | 'MINHAS'>('TODAS');
  const [activeVisualizedPermutaId, setActiveVisualizedPermutaId] = useState<string | null>(null);
  
  // Alert banner states
  const [isEditingAlert, setIsEditingAlert] = useState(false);
  const [alertText, setAlertText] = useState(alertas[0]?.conteudo || "STATUS DE ATENÇÃO EXPEDIDO - COBERTURA RADAR CRÍTICA S-500 ATIVA");
  const [alertColor, setAlertColor] = useState('red');
  const [alertIcon, setAlertIcon] = useState('shield');

  useEffect(() => {
    if (!isEditingAlert && alertas && alertas.length > 0) {
      setAlertText(alertas[0].conteudo);
      setAlertColor(alertas[0].color || 'red');
      setAlertIcon(alertas[0].icon || 'shield');
    }
  }, [alertas, isEditingAlert]);
  
  // Custom filter scales for LOGGED user
  const userEscalas = escalas.filter((e) => e.militarId === userLogged.id);
  
  // Pending swaps related to this user
  const pendentesSubstituto = permutas.filter(
    (p) => p.militarSubstitutoId === userLogged.id && p.status === 'PENDENTE_SUBSTITUTO'
  );
  
  const pendentesGestor = permutas
    .filter((p) => p.status === 'PENDENTE_GESTOR')
    .sort((a, b) => new Date(a.dataSolicitacao).getTime() - new Date(b.dataSolicitacao).getTime());

  const minhasPermutasAtivas = permutas.filter(
    (p) => (p.militarSubstituidoId === userLogged.id || p.militarSubstitutoId === userLogged.id)
  );

  const [selectedMonth, setSelectedMonth] = useState<'MAIO' | 'JUNHO' | 'JULHO'>(realMonth as any);

  // Full Month configuration for Maio, Junho, and Julho 2026
  const monthConfigs = {
    MAIO: {
      name: 'MAIO 2026',
      totalDays: 31,
      blanksCount: 5,
      monthCode: '05'
    },
    JUNHO: {
      name: 'JUNHO 2026',
      totalDays: 30,
      blanksCount: 1,
      monthCode: '06'
    },
    JULHO: {
      name: 'JULHO 2026',
      totalDays: 31,
      blanksCount: 3,
      monthCode: '07'
    }
  };

  const currentMonthConfig = monthConfigs[selectedMonth];
  const totalDays = currentMonthConfig.totalDays;
  const blanks = Array(currentMonthConfig.blanksCount).fill(null);
  const monthDays = Array.from({ length: totalDays }, (_, i) => i + 1);
  const gridCells = [...blanks, ...monthDays];

  const getDayScale = (day: number | null) => {
    if (!day) return null;
    const dateStr = `2026-${currentMonthConfig.monthCode}-${day.toString().padStart(2, '0')}`;
    return escalas.find((e) => e.militarId === userLogged.id && e.data === dateStr);
  };

  const handleMonthChange = (month: 'MAIO' | 'JUNHO' | 'JULHO') => {
    setSelectedMonth(month);
    // If Day 31 is selected but selected month only has 30 days, clip to 30.
    if (selectedCalendarDay === 31 && month === 'JUNHO') {
      setSelectedCalendarDay(30);
    }
  };

  const handleApprove = (pId: string) => {
    if (!onApprovePermuta) return;
    const gestorAssinatura = `COMAS-CENTRAL::${userLogged.nomeGuerra.toUpperCase()}::SECURE-CRYPTO-OK-${Math.floor(Math.random()*1000).toString(16).toUpperCase()}`;
    onApprovePermuta(pId, userLogged.nomeGuerra, gestorAssinatura);
  };

  const handleReject = (pId: string) => {
    if (!onRejectPermuta) return;
    onRejectPermuta(pId);
  };

  const handleSendAdjust = (pId: string) => {
    if (!onAdjustPermuta || !justificativaAjuste) return;
    onAdjustPermuta(pId, justificativaAjuste);
    setShowAjusteParaId(null);
    setJustificativaAjuste('');
  };

  return (
    <div className="flex-1 flex flex-col space-y-4 p-4 pb-16 bg-hud-bg text-slate-100 select-none">
      
      {/* TACTICAL ALERT BANNER TICKER */}
      <div className={`bg-[#100706]/70 border border-cyber-${alertColor}/30 p-2.5 rounded-lg flex flex-col shadow-[0_0_15px_rgba(${alertColor === 'red' ? '255,61,0' : alertColor === 'amber' ? '255,179,0' : alertColor === 'blue' ? '0,229,255' : '0,255,102'},0.1)] relative overflow-hidden transition-all duration-300`}>
        {/* Pulsing laser bar */}
        <div className={`absolute top-0 bottom-0 left-0 w-1 bg-cyber-${alertColor} animate-pulse`} />
        
        <div className="flex items-start space-x-2.5 w-full">
          {alertIcon === 'shield' && <ShieldAlert className={`w-5 h-5 text-cyber-${alertColor} shrink-0 animate-bounce mt-0.5`} />}
          {alertIcon === 'triangle' && <AlertTriangle className={`w-5 h-5 text-cyber-${alertColor} shrink-0 animate-bounce mt-0.5`} />}
          {alertIcon === 'info' && <Info className={`w-5 h-5 text-cyber-${alertColor} shrink-0 animate-bounce mt-0.5`} />}
          {alertIcon === 'zap' && <Zap className={`w-5 h-5 text-cyber-${alertColor} shrink-0 animate-bounce mt-0.5`} />}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <span className={`text-[9px] font-bold font-mono px-1 bg-cyber-${alertColor}/20 text-cyber-${alertColor} rounded`}>ALERTA OPERACIONAL DE COMANDO</span>
              </div>
              {(userLogged.role === 'COMANDANTE' || userLogged.role === 'ADMIN') && (
                <button 
                  onClick={() => {
                    if (isEditingAlert) {
                      const alertId = (alertas && alertas[0] && alertas[0].id) ? alertas[0].id : 'A-01';
                      if (onUpdateAlerta) {
                        onUpdateAlerta(alertId, alertText, alertColor, alertIcon);
                      }
                    }
                    setIsEditingAlert(!isEditingAlert);
                  }} 
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {isEditingAlert ? <Save className="w-3.5 h-3.5 text-cyber-green animate-pulse" /> : <Edit2 className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
            
            {!isEditingAlert ? (
              <marquee className="text-xs text-slate-200 mt-1 font-mono tracking-tight" scrollamount="3">
                {alertText}
              </marquee>
            ) : (
              <div className="mt-2 space-y-2 animate-fade-in">
                <input
                  type="text"
                  value={alertText}
                  onChange={(e) => setAlertText(e.target.value)}
                  className={`w-full bg-black/50 border border-cyber-${alertColor}/50 rounded p-1 text-xs text-white font-mono focus:outline-none focus:border-cyber-${alertColor}`}
                  placeholder="Digite a mensagem do alerta..."
                />
                <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                  <div className="flex space-x-2 bg-black/40 p-1.5 rounded border border-slate-800">
                    {['red', 'amber', 'blue', 'green'].map(c => (
                      <button
                        key={c}
                        onClick={() => setAlertColor(c)}
                        className={`w-4 h-4 rounded-full bg-cyber-${c} border border-transparent ${alertColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-black' : 'hover:opacity-80'}`}
                      />
                    ))}
                  </div>
                  <div className="flex space-x-2 bg-black/40 p-1 rounded border border-slate-800">
                     <button onClick={() => setAlertIcon('shield')} className={`p-1 rounded transition-colors ${alertIcon === 'shield' ? 'bg-cyber-blue/20 text-cyber-blue' : 'text-slate-400 hover:text-white'}`}><ShieldAlert className="w-4 h-4" /></button>
                     <button onClick={() => setAlertIcon('triangle')} className={`p-1 rounded transition-colors ${alertIcon === 'triangle' ? 'bg-cyber-blue/20 text-cyber-blue' : 'text-slate-400 hover:text-white'}`}><AlertTriangle className="w-4 h-4" /></button>
                     <button onClick={() => setAlertIcon('info')} className={`p-1 rounded transition-colors ${alertIcon === 'info' ? 'bg-cyber-blue/20 text-cyber-blue' : 'text-slate-400 hover:text-white'}`}><Info className="w-4 h-4" /></button>
                     <button onClick={() => setAlertIcon('zap')} className={`p-1 rounded transition-colors ${alertIcon === 'zap' ? 'bg-cyber-blue/20 text-cyber-blue' : 'text-slate-400 hover:text-white'}`}><Zap className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* OPERATOR CURRENT ACCESS IDENTITY CARD */}
      <div className="bg-[#051319]/90 border border-hud-border/80 rounded-xl p-3 flex items-center justify-between shadow-[0_4px_15px_rgba(0,176,255,0.05)] relative overflow-hidden" id="operator-identity-card">
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyber-cyan/40" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#00e5ff]/40" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#00e5ff]/40" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#00e5ff]/40" />
        
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-cyber-blue/10 border-2 border-cyber-blue/30 flex items-center justify-center relative shrink-0">
            <Cpu className="w-5 h-5 text-cyber-blue animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="text-[7.5px] font-mono tracking-widest text-slate-400 uppercase">IDENTIDADE OPERACIONAL ATIVA</div>
            <div className="text-xs font-extrabold text-white uppercase flex items-center gap-1.5 truncate">
              <span>{userLogged.patente} {userLogged.nomeGuerra}</span>
              <span className="text-[9px] text-[#00ff66]/70 font-normal">({userLogged.id})</span>
            </div>
            <div className="text-[9.5px] font-sans text-slate-400 truncate">
              {userLogged.nome}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0 flex flex-col items-end justify-center">
          <span className="text-[7.5px] font-mono tracking-widest text-slate-400 uppercase block mb-0.5">TIPO DE ACESSO</span>
          <div className={`px-2.5 py-1 rounded text-[10px] font-mono font-black tracking-wider uppercase border ${
            userLogged.role === 'ADMIN'
              ? 'bg-cyber-red/10 border-cyber-red text-cyber-red shadow-[0_0_8px_rgba(255,61,0,0.2)]'
              : userLogged.role === 'COMANDANTE'
              ? 'bg-cyber-amber/10 border-cyber-amber text-cyber-amber shadow-[0_0_8px_rgba(255,179,0,0.2)]'
              : 'bg-cyber-blue/10 border-cyber-blue text-cyber-blue'
          }`}>
            {userLogged.role}
          </div>
        </div>
      </div>

      {/* QUICK STATUS HUD WIDGETS */}
      {(userLogged.role === 'ADMIN' || userLogged.role === 'COMANDANTE') && (
        <div className="grid grid-cols-2 gap-3" id="admin-exclusive-cards">
          {/* Radar scope representation */}
          <div className="bg-hud-card border border-hud-border rounded-xl p-3 flex flex-col relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-20 h-20 border border-cyber-cyan/15 rounded-full pointer-events-none flex items-center justify-center">
              {/* Sweep radar ray */}
              <div className="w-[1px] h-10 bg-gradient-to-t from-cyber-cyan to-transparent origin-bottom animate-radar" style={{ transformOrigin: 'bottom center' }} />
              <div className="w-12 h-12 border border-cyber-cyan/10 rounded-full" />
            </div>
            <span className="text-[9px] font-mono text-cyber-cyan tracking-wider uppercase">FATOR DE REPOUSO</span>
            <div className="flex items-baseline space-x-1 mt-1 text-cyber-green text-2xl font-bold font-display neon-text-green">
              <span>94.8%</span>
              <span className="text-[10px] text-slate-400 font-mono tracking-normal">Acolhido</span>
            </div>
            <div className="flex items-center space-x-1 text-[8px] text-slate-500 font-mono mt-2">
              <Activity className="w-3 h-3 text-cyber-green shrink-0 animate-pulse" />
              <span>INTERVALO COERENTE DE 12h+</span>
            </div>
          </div>

          {/* Scalability quick index */}
          <div 
            id="card-permutas-protocoladas"
            onClick={() => setShowHomologadasModal(true)}
            className="bg-hud-card border border-hud-border rounded-xl p-3 flex flex-col relative overflow-hidden cursor-pointer hover:border-cyber-blue hover:bg-cyber-blue/5 transition-all duration-200 group active:scale-[0.98]"
          >
            <span className="text-[9px] font-mono text-cyber-cyan tracking-wider uppercase group-hover:text-white transition-colors">PERMUTAS PROTOCOLADAS</span>
            <div className="flex items-baseline space-x-2 mt-1 text-cyber-blue text-2xl font-bold font-display neon-text-blue group-hover:brightness-110 transition-all font-mono">
              <span>{myInasCount(permutas, userLogged.id)}</span>
              <span className="text-xs text-slate-400 font-mono">REGISTROS</span>
            </div>
            <div className="flex items-center space-x-1 text-[8px] text-slate-500 font-mono mt-2">
              <Zap className="w-3 h-3 text-cyber-blue shrink-0 animate-bounce group-hover:text-cyber-cyan transition-colors" />
              <span className="text-slate-400 group-hover:text-slate-200 transition-colors uppercase">CLIQUE PARA VER HOMOLOGADOS</span>
            </div>
          </div>
        </div>
      )}

      {/* ACTION ALERTS: SWAPS REQUIRING ATTENTION */}
      {pendentesSubstituto.length > 0 && (
        <div className="bg-gradient-to-r from-cyber-blue/20 to-cyber-blue/5 border-2 border-cyber-blue p-4 rounded-xl flex flex-col relative overflow-hidden shadow-[0_0_20px_rgba(0,229,255,0.4)] animate-pulse shadow-cyber-blue/30 backdrop-blur-sm">
          <div className="flex items-center space-x-3 mb-3">
            <div className="bg-cyber-blue text-black p-2 rounded-full animate-bounce">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display text-white uppercase tracking-wider neon-text-blue">
                Ação Requerida
              </h3>
              <p className="text-[10px] sm:text-xs font-mono text-cyber-blue uppercase mt-0.5">
                Você tem {pendentesSubstituto.length} solicitação(ões) de permuta pendente(s)
              </p>
            </div>
          </div>
          
          <div className="space-y-2 mt-1">
            {pendentesSubstituto.map((p) => {
              const subsBy = allMilitares.find(m => m.id === p.militarSubstituidoId);
              return (
                <div 
                  key={p.id} 
                  onClick={() => onSelectPermuta(p)}
                  className="bg-black/60 border border-cyber-blue/40 rounded-lg p-3 hover:bg-cyber-blue/10 hover:border-cyber-blue transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyber-blue/10 to-transparent translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300" />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/30 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                          Urgente
                        </span>
                        <h4 className="text-sm font-bold text-white uppercase">{p.postoServico}</h4>
                      </div>
                      <p className="text-xs text-slate-300 font-mono mt-1.5 flex items-center">
                        <Users className="w-3 h-3 mr-1.5 text-cyber-blue" />
                        {subsBy?.patente} {subsBy?.nomeGuerra} deseja permutar com você
                      </p>
                      <p className="text-xs text-slate-400 font-mono mt-1">
                        Dia do Serviço: <strong className="text-white">{formatarDataBR(p.dataRealizacao)}</strong>
                      </p>
                    </div>
                    
                    <button className="bg-cyber-blue text-black font-bold font-mono text-xs py-2 px-4 rounded-md uppercase hover:bg-white transition-colors flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(0,229,255,0.2)] group-hover:shadow-[0_0_15px_rgba(0,229,255,0.4)]">
                      <span>Analisar e Assinar</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* GESTOR ALERTS: TO APPROVE QUEUE IF OFFICER LOGGED */}
      {(userLogged.role === 'COMANDANTE' || userLogged.role === 'ADMIN') && pendentesGestor.length > 0 && (
        <div className="bg-gradient-to-r from-cyber-amber/20 to-cyber-amber/5 border-2 border-cyber-amber p-4 rounded-xl flex flex-col relative overflow-hidden shadow-[0_0_20px_rgba(255,179,0,0.4)] animate-pulse shadow-cyber-amber/30 backdrop-blur-sm">
          <div className="flex items-center space-x-3 mb-3">
            <div className="bg-cyber-amber text-black p-2 rounded-full animate-bounce">
              <FileSignature className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display text-white uppercase tracking-wider neon-text-amber" style={{ textShadow: '0 0 10px rgba(255,179,0,0.8)' }}>
                Ação Requerida (Gestor)
              </h3>
              <p className="text-[10px] sm:text-xs font-mono text-cyber-amber uppercase mt-0.5">
                Existem {pendentesGestor.length} permuta(s) pendente(s) de homologação
              </p>
            </div>
          </div>
          
          <div className="space-y-4 mt-2">
            {pendentesGestor.map((p, index) => {
              const subsBy = allMilitares.find(m => m.id === p.militarSubstituidoId);
              const repl = allMilitares.find(m => m.id === p.militarSubstitutoId);
              return (
                <div key={p.id} className={`bg-black/60 border ${index === 0 ? 'border-cyber-amber' : 'border-cyber-amber/20 opacity-80'} rounded-lg p-3 relative overflow-hidden hover:bg-cyber-amber/5 transition-all`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-cyber-amber/10 to-transparent translate-x-[-100%] hover:translate-x-0 transition-transform duration-300" />
                  
                  <div className="relative z-10 flex flex-col lg:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`bg-cyber-amber/20 text-cyber-amber border border-cyber-amber/30 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${index === 0 ? 'animate-pulse' : ''}`}>
                          {index === 0 ? 'PRÓXIMO DA FILA' : `FILA: ${index + 1}/${pendentesGestor.length}`}
                        </span>
                        <h4 className="text-sm font-bold text-white uppercase">{p.postoServico} - {p.turno}</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="bg-black/40 p-2 rounded border border-cyber-red/30">
                          <span className="text-[8px] text-cyber-red uppercase font-mono block mb-1">Substituído</span>
                          <span className="text-xs text-cyber-red font-bold flex items-center">
                            <Users className="w-3.5 h-3.5 mr-1.5 opacity-80" />
                            {subsBy?.patente} {subsBy?.nomeGuerra}
                          </span>
                        </div>
                        <div className="bg-black/40 p-2 rounded border border-cyber-green/30">
                          <span className="text-[8px] text-cyber-green uppercase font-mono block mb-1">Substituto (Assumirá)</span>
                          <span className="text-xs text-cyber-green font-bold flex items-center">
                            <Users className="w-3.5 h-3.5 mr-1.5 opacity-80" />
                            {repl?.patente} {repl?.nomeGuerra}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-3 mb-1">Dia do Serviço: <strong className="text-white">{formatarDataBR(p.dataRealizacao)}</strong></p>
                    </div>

                    <div className="flex flex-col justify-end min-w-[200px] shrink-0">
                      {showAjusteParaId === p.id ? (
                        <div className="space-y-2 bg-[#0a0f12] border border-cyber-blue/25 rounded-lg p-2.5 animate-fade-in w-full">
                          <span className="text-[8.5px] font-mono text-cyber-cyan uppercase block font-bold">DESCREVA OS ERROS / OBSERVAÇÕES:</span>
                          <textarea
                            value={justificativaAjuste}
                            onChange={(e) => setJustificativaAjuste(e.target.value)}
                            className="w-full bg-[#030608] border border-cyber-cyan/30 text-white rounded p-2 text-xs h-16 resize-none focus:outline-none focus:border-cyber-cyan transition-all"
                            placeholder="Ex: Refazer de acordo com o BG nº 123..."
                          />
                          <div className="flex justify-end space-x-2 pt-1">
                            <button
                              onClick={() => {
                                setShowAjusteParaId(null);
                                setJustificativaAjuste('');
                              }}
                              className="px-3 py-1.5 rounded text-[9px] font-mono font-bold uppercase hover:bg-slate-800 text-slate-400 transition-all border border-slate-700"
                            >
                              CANCELAR
                            </button>
                            <button
                              onClick={() => handleSendAdjust(p.id)}
                              className="px-3 py-1.5 rounded text-[9px] font-mono font-bold uppercase bg-cyber-blue text-black hover:bg-cyber-cyan transition-all"
                            >
                              ENVIAR DESPACHO
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                           <button
                             onClick={() => handleReject(p.id)}
                             className="bg-cyber-red/10 text-cyber-red border border-cyber-red/30 hover:bg-cyber-red hover:text-white transition-all font-mono font-bold py-2 rounded text-[9px] uppercase flex flex-col items-center justify-center shadow-[0_0_8px_rgba(255,61,0,0.1)] group"
                           >
                             <XCircle className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                             <span>REJEITAR</span>
                           </button>
  
                           <button
                             onClick={() => setShowAjusteParaId(p.id)}
                             className="bg-cyber-blue/10 text-cyber-blue border border-cyber-blue/30 hover:bg-cyber-blue hover:text-black transition-all font-mono font-bold py-2 rounded text-[9px] uppercase flex flex-col items-center justify-center shadow-[0_0_8px_rgba(0,229,255,0.1)] group"
                           >
                             <AlertOctagon className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                             <span>AJUSTE</span>
                           </button>
  
                           <button
                             onClick={() => handleApprove(p.id)}
                             className="bg-cyber-green text-black hover:bg-[#00ff66] transition-all font-mono font-bold py-2 rounded text-[9px] uppercase flex flex-col items-center justify-center shadow-[0_0_8px_rgba(0,255,102,0.3)] hover:shadow-[0_0_15px_rgba(0,255,102,0.5)] group"
                           >
                             <CheckCircle2 className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                             <span>HOMOLOGAR</span>
                           </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TURNS CALENDAR - CALENDÁRIO DE TURNOS */}
      <div className="bg-hud-card border border-hud-border rounded-xl p-3.5 flex flex-col relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 pb-2.5 border-b border-hud-border/30">
          <div className="flex flex-col">
            <h3 className="text-xs font-bold font-display text-white tracking-wider flex items-center uppercase">
              <CalendarIcon className="w-4 h-4 text-cyber-blue mr-1.5" />
              CALENDÁRIO TÁTICO MENSAL
            </h3>
            <div className="text-[9px] font-mono text-cyber-green mt-1 flex items-center">
              <span className="w-1.5 h-1.5 bg-cyber-green rounded-full mr-1.5 animate-pulse" />
              HOJE: {formatarDataBR(today.toISOString().split('T')[0])}
            </div>
          </div>
          
          {/* Month selector controls */}
          <div className="flex items-center space-x-1.5 bg-[#030d11] p-1 rounded-lg border border-hud-border/50 shrink-0">
            <button
              onClick={() => handleMonthChange('MAIO')}
              className={`px-2.5 py-1 rounded text-[9.5px] font-mono font-bold tracking-wide transition-all cursor-pointer ${
                selectedMonth === 'MAIO'
                  ? 'bg-cyber-blue/20 text-[#00e5ff] border border-cyber-cyan/35 shadow-[0_0_6px_rgba(0,229,255,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent'
              }`}
              title="Ver Mês Anterior (Maio 2026)"
            >
              MAIO
            </button>
            <button
              onClick={() => handleMonthChange('JUNHO')}
              className={`px-2.5 py-1 rounded text-[9.5px] font-mono font-bold tracking-wide transition-all cursor-pointer ${
                selectedMonth === 'JUNHO'
                  ? 'bg-cyber-blue/20 text-[#00e5ff] border border-cyber-cyan/35 shadow-[0_0_6px_rgba(0,229,255,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent'
              }`}
              title="Mês Atual Simulador (Junho 2026)"
            >
              JUNHO
            </button>
            <button
              onClick={() => handleMonthChange('JULHO')}
              className={`px-2.5 py-1 rounded text-[9.5px] font-mono font-bold tracking-wide transition-all cursor-pointer ${
                selectedMonth === 'JULHO'
                  ? 'bg-cyber-blue/20 text-[#00e5ff] border border-cyber-cyan/35 shadow-[0_0_6px_rgba(0,229,255,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent'
              }`}
              title="Ver Próximo Mês (Julho 2026)"
            >
              JULHO
            </button>
          </div>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[8px] font-mono font-bold text-slate-400">
          <div>DOM</div>
          <div>SEG</div>
          <div>TER</div>
          <div>QUA</div>
          <div>QUI</div>
          <div>SEX</div>
          <div>SÁB</div>
        </div>

        {/* Calendar grid (Dynamic month configurator) */}
        <div className="grid grid-cols-7 gap-1">
          {gridCells.map((day, index) => {
            if (day === null) {
              return (
                <div key={`empty-${index}`} className="aspect-square bg-hud-bg/20 rounded border border-transparent opacity-10" />
              );
            }

            const hasScale = getDayScale(day);
            const isSelected = selectedCalendarDay === day;
            const isTodaySimulated = day === realDay && selectedMonth === realMonth;

            return (
              <button
                key={`day-${day}`}
                type="button"
                onClick={() => setSelectedCalendarDay(day)}
                className={`aspect-square rounded-md border flex flex-col items-center justify-center transition-all relative overflow-hidden text-xs cursor-pointer ${
                  isSelected
                    ? 'bg-cyber-blue/15 border-cyber-blue text-white shadow-[0_0_8px_rgba(0,229,255,0.25)] font-bold'
                    : hasScale
                    ? 'bg-cyber-cyan/5 border-cyber-cyan/40 text-[#00e5ff] font-semibold hover:bg-cyber-cyan/15 hover:border-cyber-cyan'
                    : 'bg-[#03090b]/40 border-hud-border/40 text-slate-500 hover:border-hud-border/70 hover:bg-hud-card/50'
                }`}
              >
                <span className="z-10">{day}</span>

                {/* Simulated 'Today' border accent */}
                {isTodaySimulated && (
                  <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-cyber-green rounded-br" title="Hoje" />
                )}

                {/* Dot marker indicating active duty on this day */}
                {hasScale && (
                  <span className="w-1 h-1 rounded-full bg-cyber-amber mt-0.5 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day header in standard format: 00-00-0000 */}
        <div className="mt-3 bg-hud-bg/85 border border-hud-border/60 p-2.5 rounded-lg">
          <div className="text-[9px] font-mono text-slate-400 mb-1.5 flex justify-between">
            <span>DATA SELECIONADA:</span>
            <span className="text-cyber-cyan font-bold">
              {formatarDataBR(`2026-${currentMonthConfig.monthCode}-${selectedCalendarDay.toString().padStart(2, '0')}`)}
            </span>
          </div>

          {getDayScale(selectedCalendarDay) ? (
            (() => {
              const scale = getDayScale(selectedCalendarDay)!;
              return (
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="text-[8px] font-mono uppercase bg-[#ffb300]/15 text-cyber-amber px-1.5 py-0.5 border border-cyber-amber/25 rounded inline-block font-bold">
                      SERVIÇO ESCALADO DISPONÍVEL
                    </div>
                    <h4 className="text-xs font-bold text-white tracking-wide">{scale.postoServico}</h4>
                    <div className="flex flex-col space-y-0.5 text-[10px] font-mono text-slate-400">
                      <span className="flex items-center">
                        <Clock className="w-3.5 h-3.5 text-cyber-cyan mr-1 shrink-0" />
                        {scale.horaInicio} - {scale.horaFim} ({scale.turno})
                      </span>
                      <span className="flex items-center">
                        <MapPin className="w-3.5 h-3.5 text-cyber-cyan mr-1 shrink-0" />
                        QG BASE MILITAR REGIMENTAL
                      </span>
                    </div>
                  </div>
                  {/* Action button to trigger swap */}
                  <button
                    onClick={() => onStartPermutaFlow(scale)}
                    className="bg-cyber-blue text-black hover:bg-cyber-cyan transition-all text-[9.5px] font-bold py-1.5 px-2 rounded-md font-mono shrink-0 flex items-center space-x-1 uppercase cursor-pointer"
                    id={`swap-trigger-btn-${scale.id}`}
                  >
                    <span>PERMUTAR</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })()
          ) : (
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="text-[8px] font-mono uppercase bg-[#00e5ff]/15 text-cyber-cyan px-1.5 py-0.5 border border-cyber-cyan/35 rounded inline-block font-bold">
                  VOLUNTARIADO / SERVIÇO AVULSO
                </div>
                <h4 className="text-xs font-bold text-white tracking-wide">Sem escala prévia designada para este dia</h4>
                <div className="flex flex-col space-y-0.5 text-[10px] font-mono text-slate-400">
                  <span className="flex items-center">
                    <Clock className="w-3.5 h-3.5 text-cyber-cyan mr-1 shrink-0 animate-pulse" />
                    Turno e horário customizáveis para permuta
                  </span>
                </div>
              </div>

              {/* Action button to trigger swap */}
              <button
                onClick={() => {
                  const simulatedScale: Escala = {
                    id: `S-TEMP-${Date.now()}`,
                    militarId: userLogged.id,
                    postoServico: 'SERVIÇO DE GUARDA DO QUARTEL',
                    data: `2026-${currentMonthConfig.monthCode}-${selectedCalendarDay.toString().padStart(2, '0')}`,
                    horaInicio: '08:00',
                    horaFim: '20:00',
                    turno: 'TURNO A'
                  };
                  onStartPermutaFlow(simulatedScale);
                }}
                className="bg-cyber-blue text-black hover:bg-cyber-cyan transition-all text-[9.5px] font-bold py-1.5 px-3 rounded-md font-sans shrink-0 flex items-center space-x-1 uppercase cursor-pointer"
                id="custom-swap-trigger-btn"
              >
                <span>PERMUTAR</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>



      {showHomologadasModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="modal-permutas-homologadas">
          <div className="bg-[#051115] border border-cyber-cyan/40 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col relative shadow-[0_0_30px_rgba(0,176,255,0.15)] animate-scale-up">
            {/* Hologram side brackets */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyber-cyan/60" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyber-cyan/60" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyber-cyan/60" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyber-cyan/60" />

            {/* Header */}
            <div className="p-4 border-b border-hud-border flex items-center justify-between bg-[#040d10]" id="modal-header">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-cyber-green shrink-0 animate-pulse" />
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                    Permutas Homologadas
                  </h3>
                  <p className="text-[9px] font-mono text-slate-400 uppercase tracking-tight">
                    Cópia segura de registros autenticados em blockchain
                  </p>
                </div>
              </div>
              <button 
                id="btn-close-homologadas"
                onClick={() => {
                  setShowHomologadasModal(false);
                  setActiveVisualizedPermutaId(null);
                }} 
                className="p-1 px-2 rounded bg-cyber-red/10 border border-cyber-red/30 text-cyber-red hover:bg-cyber-red/20 active:scale-95 transition-all text-xs flex items-center gap-1 font-mono font-bold cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>SAIR</span>
              </button>
            </div>

            {/* Filter Toggle */}
            <div className="p-3 bg-[#030a0d] border-b border-hud-border/50 flex space-x-2" id="modal-filters">
              <button
                id="btn-filter-todas"
                onClick={() => {
                  setModalFilter('TODAS');
                  setActiveVisualizedPermutaId(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded text-[10px] font-mono tracking-wider font-bold border transition-all cursor-pointer ${
                  modalFilter === 'TODAS'
                    ? 'bg-cyber-blue font-extrabold text-black border-cyber-blue shadow-[0_0_8px_rgba(0,176,255,0.2)]'
                    : 'bg-[#020507] text-slate-400 border-hud-border hover:border-slate-500'
                }`}
              >
                TODAS AS REGISTRADAS
              </button>
              <button
                id="btn-filter-minhas"
                onClick={() => {
                  setModalFilter('MINHAS');
                  setActiveVisualizedPermutaId(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded text-[10px] font-mono tracking-wider font-bold border transition-all cursor-pointer ${
                  modalFilter === 'MINHAS'
                    ? 'bg-cyber-blue font-extrabold text-black border-cyber-blue shadow-[0_0_8px_rgba(0,176,255,0.2)]'
                    : 'bg-[#020507] text-slate-400 border-hud-border hover:border-slate-400'
                }`}
              >
                MINHAS HOMOLOGADAS
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3 bg-[#020709]/55" id="modal-content">
              {(() => {
                const homologated = permutas.filter(p => p.status === 'APROVADO');
                const filtered = homologated.filter(p => {
                  if (modalFilter === 'MINHAS') {
                    return p.militarSubstituidoId === userLogged.id || p.militarSubstitutoId === userLogged.id;
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center" id="empty-homologadas">
                      <Zap className="w-10 h-10 text-slate-600 mx-auto mb-2 animate-pulse" />
                      <p className="text-xs font-mono text-slate-400 uppercase">Nenhum registro homologado encontrado</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">Status operacional regular. Nenhum protocolo homologado nesta categoria.</p>
                    </div>
                  );
                }

                return filtered.map((permuta) => {
                  const subBy = allMilitares.find(m => m.id === permuta.militarSubstituidoId);
                  const subRepl = allMilitares.find(m => m.id === permuta.militarSubstitutoId);
                  const isExpanded = activeVisualizedPermutaId === permuta.id;

                  return (
                    <div 
                      key={permuta.id} 
                      className={`bg-[#050e12] border rounded-lg p-3 transition-all duration-200 ${
                        isExpanded ? 'border-cyber-cyan shadow-[0_0_12px_rgba(0,229,255,0.1)]' : 'border-hud-border/70 hover:border-slate-600'
                      }`}
                      id={`item-homologacao-${permuta.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-mono text-cyber-cyan font-bold">{permuta.protocoloId}</span>
                            <span className="text-[8px] font-mono bg-cyber-green/10 border border-cyber-green/30 text-cyber-green px-1.5 py-0.2 rounded font-semibold uppercase">HOMOLOGADA</span>
                          </div>
                          
                          <div className="text-xs font-black text-white mt-1 uppercase tracking-wide truncate flex items-center space-x-1">
                            <span>{permuta.postoServico}</span>
                          </div>
                          
                          <div className="text-[10px] text-slate-400 font-mono mt-1">
                            Data: <span className="text-slate-200">{formatarDataBR(permuta.dataRealizacao)}</span> | Turno: <span className="text-[#ffb300] font-bold">{permuta.turno}</span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-[9px] font-mono text-slate-400">
                            <span className="text-cyber-red/80">SAI: {subBy?.patente} {subBy?.nomeGuerra}</span>
                            <span>➔</span>
                            <span className="text-cyber-green/80">ENTRA: {subRepl?.patente} {subRepl?.nomeGuerra}</span>
                          </div>
                        </div>

                        <button
                          id={`btn-detail-${permuta.id}`}
                          onClick={() => setActiveVisualizedPermutaId(isExpanded ? null : permuta.id)}
                          className={`text-[9px] font-mono font-bold uppercase py-1 px-2.5 rounded border active:scale-95 transition-all self-center shrink-0 cursor-pointer ${
                            isExpanded 
                              ? 'bg-cyber-cyan/10 border-cyber-cyan text-cyber-cyan' 
                              : 'bg-cyber-green/10 border-cyber-green/30 text-cyber-green hover:bg-cyber-green/20'
                          }`}
                        >
                          {isExpanded ? 'Ocultar' : 'Certificado'}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 border-t border-hud-border/40 pt-3 animate-fade-in overflow-hidden" id={`expanded-doc-${permuta.id}`}>
                          <DocumentoHomologacao
                            permuta={permuta}
                            allMilitares={allMilitares}
                            compact={true}
                          />
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer lock indicator */}
            <div className="p-3 bg-[#03090b] border-t border-hud-border text-center text-[8.5px] font-mono text-slate-500 tracking-wider flex items-center justify-center space-x-1.5" id="modal-footer">
              <Cpu className="w-3.5 h-3.5 text-cyber-cyan shrink-0 animate-spin" style={{ animationDuration: '4s' }} />
              <span>SISTEMA INTEGRALIZADO SOB ENCRIPTAÇÃO ASSIMÉTRICA MILITAR</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Helper to secure dynamic dashboard statistics
function myInasCount(permutas: Permuta[], userId: string): number {
  return permutas.filter(p => p.militarSubstituidoId === userId || p.militarSubstitutoId === userId).length;
}
