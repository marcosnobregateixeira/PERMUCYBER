/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  FileSignature
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
}

export default function Dashboard({
  userLogged,
  allMilitares,
  escalas,
  alertas,
  permutas,
  onStartPermutaFlow,
  onSelectPermuta,
  onNavigateToTab
}: DashboardProps) {
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number>(21); // default 21-06-2026
  const [expandedHomologationId, setExpandedHomologationId] = useState<string | null>(null);
  
  // Custom filter scales for LOGGED user
  const userEscalas = escalas.filter((e) => e.militarId === userLogged.id);
  
  // Pending swaps related to this user
  const pendentesSubstituto = permutas.filter(
    (p) => p.militarSubstitutoId === userLogged.id && p.status === 'PENDENTE_SUBSTITUTO'
  );
  
  const pendentesGestor = permutas.filter(
    (p) => p.status === 'PENDENTE_GESTOR'
  );

  const minhasPermutasAtivas = permutas.filter(
    (p) => (p.militarSubstituidoId === userLogged.id || p.militarSubstitutoId === userLogged.id)
  );

  const [selectedMonth, setSelectedMonth] = useState<'MAIO' | 'JUNHO' | 'JULHO'>('JUNHO');

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

  return (
    <div className="flex-1 flex flex-col space-y-4 p-4 pb-16 bg-hud-bg text-slate-100 select-none">
      
      {/* TACTICAL ALERT BANNER TICKER */}
      <div className="bg-[#100706]/70 border border-cyber-red/30 p-2.5 rounded-lg flex items-start space-x-2.5 shadow-[0_0_15px_rgba(255,61,0,0.1)] relative overflow-hidden">
        {/* Pulsing red laser bar */}
        <div className="absolute top-0 bottom-0 left-0 w-1 bg-cyber-red animate-pulse" />
        <ShieldAlert className="w-5 h-5 text-cyber-red shrink-0 animate-bounce mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-1.5">
            <span className="text-[9px] font-bold font-mono px-1 bg-cyber-red/20 text-cyber-red rounded">ALERTA OPERACIONAL DE COMANDO</span>
            <span className="text-[8px] text-slate-500 font-mono">FATAL BROADCAST</span>
          </div>
          <marquee className="text-xs text-slate-200 mt-1 font-mono tracking-tight" scrollamount="3">
            {alertas[0]?.conteudo || "STATUS DE ATENÇÃO EXPEDIDO - COBERTURA RADAR CRÍTICA S-500 ATIVA - PROTOCOLOS DE PRONTIDÃO LEVEL 3 EXPEDIDOS DE IMEDIATO"}
          </marquee>
        </div>
      </div>

      {/* QUICK STATUS HUD WIDGETS */}
      <div className="grid grid-cols-2 gap-3">
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
        <div className="bg-hud-card border border-hud-border rounded-xl p-3 flex flex-col relative overflow-hidden">
          <span className="text-[9px] font-mono text-cyber-cyan tracking-wider uppercase">PERMUTAS PROTOCOLADAS</span>
          <div className="flex items-baseline space-x-2 mt-1 text-cyber-blue text-2xl font-bold font-display neon-text-blue">
            <span>{myInasCount(permutas, userLogged.id)}</span>
            <span className="text-xs text-slate-400 font-mono">REGISTROS</span>
          </div>
          <div className="flex items-center space-x-1 text-[8px] text-slate-500 font-mono mt-2">
            <Zap className="w-3 h-3 text-cyber-blue shrink-0 animate-bounce" />
            <span>INTEGRADOS COM HASH INVIOLÁVEL</span>
          </div>
        </div>
      </div>

      {/* ACTION ALERTS: SWAPS REQUIRING ATTENTION */}
      {pendentesSubstituto.length > 0 && (
        <div className="bg-[#042029]/80 border border-cyber-cyan/50 p-3 rounded-xl flex flex-col relative overflow-hidden shadow-[0_0_12px_rgba(0,229,255,0.15)] animate-pulse">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9px] font-mono font-bold text-cyber-cyan flex items-center uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-cyber-cyan mr-1.5 animate-ping" />
              Solicitação recebida
            </span>
            <span className="text-[8px] font-mono bg-cyber-cyan/20 text-cyber-cyan px-1 border border-cyber-cyan/30 rounded uppercase font-bold">REQUER AÇÃO</span>
          </div>
          
          {pendentesSubstituto.map((p) => {
            const subsBy = allMilitares.find(m => m.id === p.militarSubstituidoId);
            return (
              <div 
                key={p.id} 
                onClick={() => onSelectPermuta(p)}
                className="flex items-center justify-between cursor-pointer bg-hud-bg/60 p-2 rounded border border-hud-border/50 hover:bg-hud-card hover:border-cyber-cyan transition-all"
              >
                <div>
                  <h4 className="text-xs font-bold font-display text-white">{p.postoServico}</h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Origem: <strong className="text-cyber-cyan">{subsBy?.nomeGuerra || 'Sarg.'}</strong> • Data: {formatarDataBR(p.dataRealizacao)}
                  </p>
                </div>
                <div className="flex items-center text-[10px] text-cyber-cyan font-mono font-bold bg-cyber-cyan/10 px-1.5 py-1 rounded border border-cyber-cyan/20">
                  <span>ANALISAR</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* GESTOR ALERTS: TO APPROVE QUEUE IF OFFICER LOGGED */}
      {userLogged.id === 'M-202' && pendentesGestor.length > 0 && (
        <div className="bg-[#1c1809]/80 border border-cyber-amber/50 p-3 rounded-xl flex flex-col relative overflow-hidden shadow-[0_0_12px_rgba(255,179,0,0.15)]">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9px] font-mono font-bold text-cyber-amber flex items-center uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-cyber-amber mr-1.5 animate-ping" />
              CONSELHO DE REVISÃO MILITAR
            </span>
            <span className="text-[8px] font-mono bg-cyber-amber/20 text-cyber-amber px-1 border border-cyber-amber/30 rounded uppercase font-bold">PENDENTE ASSINATURA</span>
          </div>
          
          <div className="space-y-1.5">
            {pendentesGestor.map((p) => {
              const subsBy = allMilitares.find(m => m.id === p.militarSubstituidoId);
              const repl = allMilitares.find(m => m.id === p.militarSubstitutoId);
              return (
                <div 
                  key={p.id} 
                  onClick={() => onNavigateToTab('P_GESTOR')}
                  className="flex items-center justify-between cursor-pointer bg-hud-bg/60 p-2 rounded border border-hud-border/50 hover:bg-hud-card hover:border-cyber-amber transition-all"
                  id={`gestor-queue-item-${p.id}`}
                >
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{p.postoServico}</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                      {subsBy?.nomeGuerra} ➔ {repl?.nomeGuerra} • {formatarDataBR(p.dataRealizacao)}
                    </p>
                  </div>
                  <div className="flex items-center text-[9px] text-[#ffb300] font-mono font-bold bg-[#ffb300]/10 px-1.5 py-1 rounded border border-[#ffb300]/20 shrink-0 ml-1">
                    <span>REVISAR FILA</span>
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
          <h3 className="text-xs font-bold font-display text-white tracking-wider flex items-center uppercase">
            <CalendarIcon className="w-4 h-4 text-cyber-blue mr-1.5" />
            CALENDÁRIO TÁTICO MENSAL
          </h3>
          
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
            const isTodaySimulated = day === 20 && selectedMonth === 'JUNHO';

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
                    turno: 'MANHÃ'
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

      {/* LIST OF ESCALAS DO REGIMENTO (POSTS LIST) */}
      <div className="bg-hud-card border border-hud-border rounded-xl p-3.5 flex flex-col">
        <div className="flex justify-between items-center mb-2.5">
          <h3 className="text-xs font-bold font-display text-white tracking-wider flex items-center uppercase">
            <Zap className="w-4 h-4 text-cyber-green mr-1.5 animate-pulse" />
            VETORES DE ESCALA REGISTRADOS
          </h3>
          <span className="text-[9px] font-mono text-slate-400 bg-hud-card/60 px-1.5 py-0.5 rounded border border-hud-border">
            {userEscalas.length} DISPOSTAS
          </span>
        </div>

        <div className="space-y-2">
          {userEscalas.map((esc) => {
            const correspondingPermuta = permutas.find(p => p.escalaSubstituidaId === esc.id);
            let statusText = 'CONFIRMADO';
            let statusStyle = 'bg-cyber-green/10 text-cyber-green border-cyber-green/30';
            let interactive = true;
            
            if (correspondingPermuta) {
              if (correspondingPermuta.status === 'PENDENTE_SUBSTITUTO') {
                statusText = 'AGUARDANDO PEER';
                statusStyle = 'bg-cyber-blue/15 text-cyber-blue border-cyber-blue/30';
                interactive = false;
              } else if (correspondingPermuta.status === 'PENDENTE_GESTOR') {
                statusText = 'REVISÃO GESTOR';
                statusStyle = 'bg-cyber-amber/15 text-cyber-amber border-cyber-amber/30';
                interactive = false;
              } else if (correspondingPermuta.status === 'APROVADO') {
                statusText = 'PERMUTA CONCLUÍDA';
                statusStyle = 'bg-cyber-green/20 text-[#00ff66] border-cyber-green/40 shadow-[0_0_8px_rgba(0,255,102,0.1)]';
                interactive = false;
              } else if (correspondingPermuta.status === 'REJEITADO' || correspondingPermuta.status === 'REJEITADO_SUBSTITUTO') {
                statusText = 'CANCELADA/INTERROMPIDA';
                statusStyle = 'bg-cyber-red/10 text-cyber-red border-cyber-red/20';
                interactive = true;
              }
            }

            return (
              <div 
                key={esc.id}
                className="bg-hud-bg/60 border border-hud-border/70 rounded-lg p-3 flex flex-col space-y-1.5 relative hover:border-cyber-cyan/40 hover:bg-hud-card/30 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-white">{esc.postoServico}</h4>
                    <span className="text-[9px] font-mono text-slate-500 bg-hud-card p-0.5 px-1.5 rounded inline-block mt-0.5">
                      VETOR ID {esc.id} • DATA: {formatarDataBR(esc.data)}
                    </span>
                  </div>
                  <span className={`text-[8px] font-mono px-1.5 py-0.5 border rounded uppercase font-bold tracking-tight ${statusStyle}`}>
                    {statusText}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-hud-border/30 pt-2 mt-1">
                  <span className="flex items-center">
                    <Clock className="w-3.5 h-3.5 text-cyber-cyan mr-1.5" />
                    {esc.horaInicio} às {esc.horaFim} ({esc.turno})
                  </span>
                  {interactive && (
                    <button
                      onClick={() => onStartPermutaFlow(esc)}
                      className="text-cyber-cyan hover:text-white flex items-center text-[10px] bg-cyber-cyan/10 hover:bg-cyber-cyan/30 px-2 py-1 rounded border border-cyber-cyan/30 transition-all"
                    >
                      SOLICITAR TROCA
                    </button>
                  )}
                  {!interactive && correspondingPermuta?.status === 'APROVADO' && (
                    <button
                      onClick={() => setExpandedHomologationId(expandedHomologationId === esc.id ? null : esc.id)}
                      className="text-cyber-green hover:text-white flex items-center text-[9px] uppercase font-bold bg-cyber-green/10 hover:bg-cyber-green/30 px-2 py-1 rounded border border-cyber-green/30 transition-all cursor-pointer"
                    >
                      {expandedHomologationId === esc.id ? 'Ocultar Certificado' : 'Ver Homologação'}
                    </button>
                  )}
                </div>

                {expandedHomologationId === esc.id && correspondingPermuta && (
                  <div className="border-t border-hud-border/30 pt-2.5 mt-2 animate-fade-in">
                    <DocumentoHomologacao
                      permuta={correspondingPermuta}
                      allMilitares={allMilitares}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

// Helper to secure dynamic dashboard statistics
function myInasCount(permutas: Permuta[], userId: string): number {
  return permutas.filter(p => p.militarSubstituidoId === userId || p.militarSubstitutoId === userId).length;
}
