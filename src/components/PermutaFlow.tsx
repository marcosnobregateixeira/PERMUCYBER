/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Clock, 
  MapPin, 
  User, 
  ShieldCheck, 
  Sparkles, 
  FileEdit, 
  AlertTriangle, 
  Edit3,
  HelpCircle,
  Calendar,
  PlusCircle,
  CheckCheck
} from 'lucide-react';
import { Escala, Militar, Permuta } from '../types';
import { generateSimpleHash, formatarDataBR } from '../data';

interface PermutaFlowProps {
  escala: Escala;
  allMilitares: Militar[];
  userLogged: Militar;
  escalas: Escala[];
  onCancel: () => void;
  onSubmitPermuta: (novaPermuta: Permuta) => any;
  onFinish: () => void;
}

export default function PermutaFlow({
  escala,
  allMilitares,
  userLogged,
  escalas,
  onCancel,
  onSubmitPermuta,
  onFinish
}: PermutaFlowProps) {
  const [selectedSubstituteId, setSelectedSubstituteId] = useState<string>('');
  const [useAIAdvice, setUseAIAdvice] = useState<boolean>(true);
  const [comentario, setComentario] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmittedSuccessfully, setIsSubmittedSuccessfully] = useState<boolean>(false);
  const [lastProtocolId, setLastProtocolId] = useState<string>('');
  const [lastSubstituteName, setLastSubstituteName] = useState<string>('');
  
  // Custom date selection & monthly schedule
  const [selectedMonth, setSelectedMonth] = useState<'MAIO' | 'JUNHO' | 'JULHO'>(() => {
    if (escala.data.includes('-05-')) return 'MAIO';
    if (escala.data.includes('-07-')) return 'JULHO';
    return 'JUNHO';
  });
  const [selectedDate, setSelectedDate] = useState<string>(escala.data);
  const [postoServico] = useState<string>('DIRETORIA DE SAÚDE');

  // Custom hours for shift trade
  const [customHoraInicio, setCustomHoraInicio] = useState<string>(escala.horaInicio);
  const [customHoraFim, setCustomHoraFim] = useState<string>(escala.horaFim);
  const [customTurno, setCustomTurno] = useState<'TURNO A' | 'TURNO B' | '24H'>(
    ['TURNO A', 'TURNO B', '24H'].includes(escala.turno) ? (escala.turno as any) : 'TURNO A'
  );
  
  // Signature pad states
  const [isSigned, setIsSigned] = useState<boolean>(false);
  const [digitalSignatureHex, setDigitalSignatureHex] = useState<string>('');
  const [manualSignaturePoints, setManualSignaturePoints] = useState<{ x: number; y: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
    const mCode = selectedMonth === 'MAIO' ? '05' : selectedMonth === 'JULHO' ? '07' : '06';
    const dateStr = `2026-${mCode}-${day.toString().padStart(2, '0')}`;
    return escalas.find((e) => e.militarId === userLogged.id && e.data === dateStr);
  };

  // Sync selected date change to load any scheduled duty parameters
  useEffect(() => {
    const activeScaleOnDay = escalas.find((e) => e.militarId === userLogged.id && e.data === selectedDate);
    if (activeScaleOnDay) {
      setCustomHoraInicio(activeScaleOnDay.horaInicio);
      setCustomHoraFim(activeScaleOnDay.horaFim);
      setCustomTurno(activeScaleOnDay.turno);
    }
  }, [selectedDate, escalas, userLogged.id]);

  // Pre-calculate AI Match compatibility score for matching levels (ALL other officers available)
  const militaresDisponiveis = allMilitares.filter(
    (m) => m.id !== userLogged.id
  );

  const candidatesWithAI = militaresDisponiveis.map((c) => {
    // Check conflicts: Has scale on target day and shift?
    const hasConflictScale = escalas.some(
      (e) => e.militarId === c.id && e.data === selectedDate
    );
    
    let score = 95;
    let reason = `Apto para o serviço. Especialidade de [${c.especialidade}] disponível.`;
    let status: 'RECOMMENDED' | 'COMPATIBLE' | 'BLOCKED' = 'RECOMMENDED';

    // If patente is different, mark compatible but keep selectable
    if (c.patente !== userLogged.patente) {
      score = 85;
      reason = `Rank diferente (${c.patente} vs ${userLogged.patente}). Habilitado para solicitação.`;
      status = 'COMPATIBLE';
    }

    if (hasConflictScale) {
      score = 45;
      reason = 'ATENÇÃO: Possui escala designada nesta data (alerta de choque/descanso). Habilitado para solicitação.';
      status = 'COMPATIBLE';
    } else {
      if (c.patente === userLogged.patente) {
        if (c.especialidade === 'MÉDICO' || c.especialidade === 'ENFERMEIRO' || c.especialidade === 'TEC. ENFERMAGEM') {
          score = 98;
          reason = `Altamente recomendado. Mesma patente (${c.patente}) e função de [${c.especialidade}] possui total homologação tática.`;
          status = 'RECOMMENDED';
        } else if (c.especialidade === 'SOBREAVISO') {
          score = 90;
          reason = `Apto para o serviço. Mesma patente (${c.patente}) e pronto para acionamento secundário.`;
          status = 'RECOMMENDED';
        }
      }
    }

    return {
      militar: c,
      score,
      reason,
      status
    };
  });

  // Sort by score
  const sortedAIAdvice = [...candidatesWithAI].sort((a, b) => b.score - a.score);

  useEffect(() => {
    // If we have canvas, hook listeners
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
      }
    }
  }, [canvasRef.current]);

  const handleStartDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    // Get correct coordinates
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const handleDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
      setManualSignaturePoints((prev) => [...prev, { x, y }]);
      setIsSigned(true);
    }
  };

  const handleStopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setManualSignaturePoints([]);
    setIsSigned(false);
    setDigitalSignatureHex('');
  };

  const handleGenerateAutomatedSignature = () => {
    // Generate simulated military SHA-256 signature cipher
    const cipher = `CYBERSIGN::${userLogged.nomeGuerra.toUpperCase()}::${Math.floor(Date.now()/100).toString(16).toUpperCase()}::LEVEL_4`;
    setDigitalSignatureHex(cipher);
    setIsSigned(true);

    // Draw something on canvas programmatically to make it look active
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.strokeStyle = '#00ff66';
        ctx.moveTo(10, 40);
        ctx.lineTo(60, 20);
        ctx.lineTo(120, 60);
        ctx.lineTo(190, 10);
        ctx.stroke();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubstituteId || !isSigned) return;

    setIsSubmitting(true);
    try {
      // Create unique protocol id, QR string, and audit hashes
      const protocolDateFormatted = selectedDate.replace(/-/g, '');
      const protocoloId = `PEM-${protocolDateFormatted}-${Math.floor(Math.random() * 9000 + 1000)}`;
      const signText = digitalSignatureHex || `DECADIGITAL::${userLogged.nomeGuerra.toUpperCase()}::${JSON.stringify(manualSignaturePoints).slice(0, 30)}`;
      
      // Find if user has actual scale on selected day to link properly
      const matchedScaleOnDay = escalas.find((esc) => esc.militarId === userLogged.id && esc.data === selectedDate);
      
      // Generate simulated blockchain log
      const hash = generateSimpleHash(`${userLogged.id}_requests_swap_${selectedSubstituteId}_scale_${matchedScaleOnDay?.id || escala.id}`, 'PREV_HASH_F88B');

      // Make ID fully unique when creating multiple permutas in sequence
      const uniqueId = `P-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 100)}`;

      const substitute = allMilitares.find(m => m.id === selectedSubstituteId);
      const subName = substitute ? `${substitute.patente} ${substitute.nomeGuerra}` : 'policial indicado';

      const novaPermuta: Permuta = {
        id: uniqueId,
        escalaSubstituidaId: matchedScaleOnDay ? matchedScaleOnDay.id : escala.id,
        militarSubstituidoId: userLogged.id,
        militarSubstitutoId: selectedSubstituteId,
        dataSolicitacao: new Date().toISOString().split('T')[0],
        dataRealizacao: selectedDate,
        horaInicio: customHoraInicio,
        horaFim: customHoraFim,
        turno: customTurno,
        postoServico: postoServico,
        status: 'PENDENTE_SUBSTITUTO',
        comentarioAlteracao: comentario || undefined,
        assinaturaSubstituida: signText,
        protocoloId,
        qrCode: `PERMUCYBER_SECURE::${protocoloId}::BLOCKHASH::${hash.slice(0, 16)}`,
        auditoriaHash: hash
      };

      await onSubmitPermuta(novaPermuta);
      
      setLastProtocolId(protocoloId);
      setLastSubstituteName(subName);
      setIsSubmittedSuccessfully(true);
    } catch (err) {
      console.error(err);
      alert("Houve uma falha ao processar solicitação nas nuvens.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmittedSuccessfully) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#03080a] text-slate-100 select-none pb-12 animate-fade-in" id="new-permuta-success-screen">
        <div className="max-w-md w-full bg-hud-card border border-[#00f7ff]/30 rounded-2xl p-6 flex flex-col items-center text-center space-y-4 shadow-[0_0_25px_rgba(0,229,255,0.15)] relative overflow-hidden">
          
          {/* Cyber matrix grid glow decoration */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyber-cyan to-transparent"></div>
          
          {/* Large badge icon animated check */}
          <div className="w-16 h-16 rounded-full bg-cyber-green/10 border-2 border-cyber-green flex items-center justify-center shadow-[0_0_20px_rgba(0,255,102,0.25)] animate-pulse mb-2">
            <CheckCheck className="w-9 h-9 text-cyber-green" />
          </div>

          <h3 className="text-xs font-black text-white uppercase tracking-widest font-mono">
            PERMUTA PROTOCOLADA COM SUCESSO!
          </h3>
          
          <p className="text-[11px] text-slate-300 leading-relaxed font-sans px-2">
            A proposta para <strong>{postoServico}</strong> no dia <strong>{formatarDataBR(selectedDate)}</strong> ({customTurno}) foi criptografada e enviada para aprovação do parceiro <strong>{lastSubstituteName}</strong>.
          </p>

          <div className="w-full bg-[#020709] border border-hud-border/70 rounded-xl p-3 text-left space-y-1.5 font-mono text-[10px]">
            <div className="flex justify-between items-center text-[9.5px] text-slate-400">
              <span>CÓDIGO PROTOCOLO:</span>
              <span className="text-cyber-cyan font-bold">{lastProtocolId}</span>
            </div>
            <div className="flex justify-between items-center text-[9.5px] text-slate-400 border-t border-hud-border/30 pt-1.5">
              <span>SISTEMA DE HASHING:</span>
              <span className="text-slate-500 uppercase">SHA-256 SECURE</span>
            </div>
            <div className="text-[8.5px] text-cyber-green font-semibold uppercase tracking-wider flex items-center gap-1 mt-1 font-sans bg-cyber-green/10 px-2 py-1 rounded border border-cyber-green/35">
              <span className="w-1.5 h-1.5 bg-cyber-green rounded-full animate-ping shrink-0" />
              INTEGRIDADE DA ASSINATURA ELETRÔNICA CERTIFICADA
            </div>
          </div>

          {/* DYNAMIC REDIRECT/CHAIN BUTTONS */}
          <div className="w-full flex flex-col gap-2.5 pt-4">
            {/* BUTTON TO ADD MORE PERMUTAS IN SEQUENCE */}
            <button
              onClick={() => {
                // Reset flow so they can request another one easily
                setSelectedSubstituteId('');
                setComentario('');
                setIsSigned(false);
                setDigitalSignatureHex('');
                setManualSignaturePoints([]);
                setIsSubmittedSuccessfully(false);
                setSearchTerm('');
              }}
              className="w-full bg-cyber-cyan text-black hover:bg-white hover:text-black transition-all text-xs font-bold py-3 px-4 rounded-xl font-mono uppercase flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(0,229,255,0.25)] select-none cursor-pointer"
              id="success-btn-add-another"
            >
              <PlusCircle className="w-4 h-4 text-black shrink-0" />
              <span>➕ ADICIONAR OUTRA PERMUTA</span>
            </button>

            {/* BUTTON TO FINISH AND GO VIEW THE LIST OF SWAPS */}
            <button
              onClick={onFinish}
              className="w-full bg-[#12191c] hover:bg-hud-card border border-hud-border/80 transition-all text-slate-300 hover:text-white text-xs font-bold py-3 px-4 rounded-xl font-mono uppercase flex items-center justify-center space-x-2 cursor-pointer"
              id="success-btn-finish"
            >
              <span>🗂️ CONCLUIR E IR PARA MINHAS TROCAS</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 bg-[#03080a] text-slate-100 select-none pb-12" id="new-permuta-container">
      {/* HEADER SECTION */}
      <div className="flex items-center space-x-3 mb-4 border-b border-hud-border/40 pb-3 font-sans">
        <button 
          onClick={onCancel}
          className="p-1.5 rounded bg-hud-card border border-hud-border text-[#00e5ff] hover:bg-cyber-blue/10 transition-all focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">SOLICITAR TROCA DE ESCALA</h2>
          <p className="text-[10px] text-slate-400">Preencha os dados abaixo para propor uma substituição</p>
        </div>
      </div>

      {/* CORE ACTIVE SCALE DETAILS / CALENDAR SELECTOR */}
      <div className="bg-hud-card border border-hud-border/80 rounded-xl p-3.5 mb-4 relative overflow-hidden font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <span className="text-[10px] font-bold text-cyber-cyan tracking-wider uppercase block">
            Selecione a Data no Calendário
          </span>
          
          {/* Month selector controls */}
          <div className="flex items-center space-x-1 bg-[#030d11] p-1 rounded-lg border border-hud-border/50 shrink-0 select-none">
            {['MAIO', 'JUNHO', 'JULHO'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMonth(m as any)}
                className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-bold transition-all ${
                  selectedMonth === m
                    ? 'bg-cyber-blue/20 text-[#00e5ff] border border-cyber-cyan/35'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[8px] font-mono font-bold text-slate-400 select-none">
          <div>DOM</div>
          <div>SEG</div>
          <div>TER</div>
          <div>QUA</div>
          <div>QUI</div>
          <div>SEX</div>
          <div>SÁB</div>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 select-none">
          {gridCells.map((day, index) => {
            if (day === null) {
              return (
                <div key={`empty-${index}`} className="aspect-square bg-hud-bg/20 rounded border border-transparent opacity-10" />
              );
            }

            const isTodaySimulated = day === 20 && selectedMonth === 'JUNHO';
            // Is this date selected?
            const monthCode = selectedMonth === 'MAIO' ? '05' : selectedMonth === 'JULHO' ? '07' : '06';
            const dateStr = `2026-${monthCode}-${day.toString().padStart(2, '0')}`;
            const isSelected = selectedDate === dateStr;
            const hasScale = getDayScale(day);

            return (
              <button
                key={`day-${day}`}
                type="button"
                onClick={() => setSelectedDate(dateStr)}
                className={`aspect-square rounded-md border flex flex-col items-center justify-center transition-all relative overflow-hidden text-xs cursor-pointer ${
                  isSelected
                    ? 'bg-cyber-blue/15 border-cyber-blue text-white shadow-[0_0_8px_rgba(0,229,255,0.25)] font-bold'
                    : hasScale
                    ? 'bg-cyber-cyan/5 border-cyber-cyan/35 text-[#00e5ff] font-semibold hover:bg-cyber-cyan/15 hover:border-cyber-cyan'
                    : 'bg-[#03090b]/40 border-hud-border/40 text-slate-500 hover:border-hud-border/70 hover:bg-hud-card/50'
                }`}
              >
                <span className="z-10">{day}</span>
                {isTodaySimulated && (
                  <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-cyber-green rounded-br" />
                )}
                {hasScale && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyber-amber mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected date details */}
        <div className="mt-3 bg-[#030d11] p-2.5 rounded-lg border border-hud-border/40 flex flex-col space-y-1.5">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-slate-400">Data e Posto do Serviço a Permutar:</span>
            <span className="text-cyber-cyan font-bold font-mono">{formatarDataBR(selectedDate)}</span>
          </div>

          <div className="space-y-1">
            <span className="text-[8px] text-slate-400 block uppercase font-mono">Posto de Serviço</span>
            <div className="w-full bg-[#020709] border border-hud-border rounded-lg px-2.5 py-1.5 text-xs text-white font-bold">
              {postoServico}
            </div>
          </div>

          <div className="text-[9.5px] leading-normal mt-1">
            {getDayScale(parseInt(selectedDate.split('-')[2])) ? (
              <span className="text-cyber-amber font-mono flex items-center">
                <span className="w-1.5 h-1.5 bg-cyber-amber rounded-full mr-1.5 animate-pulse" />
                Você possui escala oficial neste dia ({postoServico}).
              </span>
            ) : (
              <span className="text-slate-400 font-mono flex items-center">
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full mr-1.5" />
                Sem escala oficial nesta data. Proposta de serviço avulsa.
              </span>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 font-sans">
        
        {/* IA SUGGESTS RECOMMENDATION SUB-PANEL */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
              <Sparkles className="w-3.5 h-3.5 text-cyber-green mr-1.5 shrink-0" />
              Militar Substituto
            </h4>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setUseAIAdvice(!useAIAdvice)}
                className={`text-[9.5px] font-mono px-2.5 py-0.5 rounded border transition-all cursor-pointer ${
                  useAIAdvice 
                    ? 'bg-cyber-green/10 text-cyber-green border-cyber-green/30' 
                    : 'bg-hud-card text-slate-500 border-hud-border hover:text-white'
                }`}
              >
                {useAIAdvice ? 'Sugeridos por IA' : 'Todos os Policiais'}
              </button>
            </div>
          </div>

          {/* Quick search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Digite o nome, patente ou especialidade para pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#020709] border border-hud-border/80 focus:border-cyber-blue focus:outline-none rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono"
              id="militare-search-input"
            />
          </div>

          {/* Candidates selector cards */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {(() => {
              const filteredList = sortedAIAdvice.filter((item) => {
                const matchSearch =
                  item.militar.nomeGuerra.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  item.militar.especialidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  item.militar.patente.toLowerCase().includes(searchTerm.toLowerCase());
                
                if (useAIAdvice) {
                  // Only high compatibility scores when AI suggestions are active
                  return matchSearch && item.score >= 80;
                }
                return matchSearch;
              });

              if (filteredList.length === 0) {
                return (
                  <div className="text-center py-6 text-slate-500 text-xs font-mono border border-dashed border-hud-border/40 rounded-xl bg-[#03090b]/40">
                    Nenhum policial encontrado para a pesquisa.
                  </div>
                );
              }

              return filteredList.map((item) => {
                const isSelected = selectedSubstituteId === item.militar.id;
                const isBlocked = false;

                return (
                  <div
                    key={item.militar.id}
                    onClick={() => setSelectedSubstituteId(item.militar.id)}
                    className={`border rounded-xl p-3 flex flex-col justify-between transition-all relative overflow-hidden ${
                      isSelected
                        ? 'bg-cyber-cyan/15 border-cyber-blue shadow-[0_0_10px_rgba(0,229,255,0.2)] cursor-pointer'
                        : 'bg-hud-card/60 border-hud-border/70 hover:border-cyber-cyan/50 hover:bg-hud-card cursor-pointer'
                    }`}
                    id={`ia-candidate-${item.militar.id}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-cyber-cyan/15 border border-cyber-cyan/35 flex items-center justify-center font-bold text-xs text-cyber-cyan">
                          {item.militar.nomeGuerra.split('.')[1]?.slice(0, 3).trim().toUpperCase() || 'SGT'}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-white mb-0.5">
                            {item.militar.patente} {item.militar.nomeGuerra}
                          </h5>
                          <p className="text-[9px] text-slate-400 uppercase tracking-wide font-mono">
                            {item.militar.especialidade}
                          </p>
                        </div>
                      </div>

                      {/* IA Match rate */}
                      <div className="text-right">
                        <span className={`text-[11px] font-bold ${
                          item.score > 80 ? 'text-cyber-green' : item.score > 50 ? 'text-cyber-amber' : 'text-cyber-red'
                        }`}>
                          {item.score}%
                        </span>
                        <span className="text-[7px] text-slate-500 block uppercase">Compatibilidade</span>
                      </div>
                    </div>

                    {/* AI reason explanation */}
                    <div className="bg-hud-bg/40 border-t border-hud-border/20 pt-2 mt-2 flex items-start space-x-1">
                      <Sparkles className={`w-3 h-3 shrink-0 mt-0.5 ${isBlocked ? 'text-cyber-red' : 'text-cyber-cyan'}`} />
                      <p className={`text-[9px] leading-relaxed ${isBlocked ? 'text-cyber-red/80' : 'text-slate-300'}`}>
                        {item.reason}
                      </p>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* DYNAMIC TIME SELECTOR REVEALED ON SELECTION */}
        {selectedSubstituteId && (
          <div className="bg-[#03151b] border border-cyber-blue/35 rounded-xl p-3.5 space-y-3 font-sans" id="custom-time-selector">
            <div className="flex items-center space-x-1.5 text-cyber-cyan border-b border-cyber-blue/25 pb-2">
              <Clock className="w-4 h-4 text-cyber-blue" />
              <span className="text-[10px] font-bold text-cyber-cyan tracking-wider uppercase">
                HORÁRIO REPACTUADO
              </span>
            </div>
            <p className="text-[10.5px] text-slate-300 leading-snug">
              Confirme o regime de turno e a faixa de horário que o voluntário irá cumprir:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[8px] text-slate-400 block uppercase font-mono">Hora de Início</label>
                <select
                  value={customHoraInicio}
                  onChange={(e) => setCustomHoraInicio(e.target.value)}
                  className="w-full bg-[#020709] border border-hud-border hover:border-cyber-cyan/50 focus:border-cyber-blue focus:outline-none rounded-lg px-2 py-1 text-xs text-white font-mono font-bold"
                >
                  {Array.from({ length: 48 }).map((_, i) => {
                    const hour = Math.floor(i / 2).toString().padStart(2, '0');
                    const minute = (i % 2 === 0) ? '00' : '30';
                    const time = `${hour}:${minute}`;
                    return <option key={time} value={time}>{time}</option>;
                  })}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] text-slate-400 block uppercase font-mono">Hora de Fim</label>
                <select
                  value={customHoraFim}
                  onChange={(e) => setCustomHoraFim(e.target.value)}
                  className="w-full bg-[#020709] border border-hud-border hover:border-cyber-cyan/50 focus:border-cyber-blue focus:outline-none rounded-lg px-2 py-1 text-xs text-white font-mono font-bold"
                >
                  {Array.from({ length: 48 }).map((_, i) => {
                    const hour = Math.floor(i / 2).toString().padStart(2, '0');
                    const minute = (i % 2 === 0) ? '00' : '30';
                    const time = `${hour}:${minute}`;
                    return <option key={time} value={time}>{time}</option>;
                  })}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] text-slate-400 block uppercase font-mono">Regime de Turno</label>
                <select
                  value={customTurno}
                  onChange={(e) => setCustomTurno(e.target.value as any)}
                  className="w-full bg-[#020709] border border-hud-border hover:border-cyber-cyan/50 focus:border-cyber-blue focus:outline-none rounded-lg px-2 py-1 text-xs text-cyber-blue font-bold font-mono"
                >
                  <option value="TURNO A">TURNO A</option>
                  <option value="TURNO B">TURNO B</option>
                  <option value="24H">24H</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* COMPREHENSIVE TEXT REMARK/COMMENT */}
        <div className="space-y-1.5 font-sans">
          <label className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center">
            <FileEdit className="w-3.5 h-3.5 mr-1" /> JUSTIFICATIVA OU OBSERVAÇÃO (OPCIONAL)
          </label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Digite o motivo da troca ou compensações de serviço combinadas..."
            className="w-full bg-[#051115] border border-hud-border rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyber-blue focus:ring-1 focus:ring-cyber-blue resize-none h-16"
          />
        </div>

        {/* SECURITY DIGITAL SECURE SIGNATURE */}
        <div className="space-y-2 font-sans">
          <label className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-cyber-cyan" /> ASSINATURA DO SOLICITANTE
            </span>
            <span className="text-[8px] text-cyber-amber bg-cyber-amber/15 px-1 rounded uppercase font-bold">OBRIGATÓRIO</span>
          </label>

          <div className="bg-[#051115] border border-hud-border rounded-xl p-3 space-y-2.5">
            {/* Pad drawing area */}
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={280}
                height={80}
                onMouseDown={handleStartDrawing}
                onMouseMove={handleDrawing}
                onMouseUp={handleStopDrawing}
                onMouseLeave={handleStopDrawing}
                onTouchStart={handleStartDrawing}
                onTouchMove={handleDrawing}
                onTouchEnd={handleStopDrawing}
                className="w-full bg-[#020709] border border-hud-border/40 rounded-lg cursor-crosshair h-20 shadow-inner"
              />
              
              {/* Overlay guides */}
              {!isSigned && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-500 text-[10.5px] uppercase tracking-wider">
                  Assine na tela ou use a assinatura automática
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={handleGenerateAutomatedSignature}
                className="text-[9.5px] bg-cyber-green/10 text-cyber-green border border-cyber-green/30 px-3 py-1.5 rounded transition-all flex items-center space-x-1 uppercase font-bold font-mono"
                id="sign-secure-token-btn"
              >
                <Edit3 className="w-3 h-3" />
                <span>ASSINAR AUTOMATICAMENTE</span>
              </button>
              
              <button
                type="button"
                onClick={handleClearSignature}
                className="text-[9px] text-cyber-red bg-[#1a0508]/40 border border-[#441118]/30 px-3 py-1.5 rounded hover:bg-[#340b10] transition-all uppercase font-bold font-mono"
              >
                LIMPAR
              </button>
            </div>

            {digitalSignatureHex && (
              <div className="p-1 px-2.5 bg-[#00ff66]/10 border border-[#00ff66]/30 rounded text-[9.5px] text-cyber-green flex items-center space-x-1.5 font-sans justify-center py-1.5 animate-pulse-subtle">
                <ShieldCheck className="w-4 h-4 shrink-0 text-cyber-green" />
                <span className="font-bold uppercase tracking-wider">✓ Assinatura digital vinculada e homologada</span>
              </div>
            )}
          </div>
        </div>

        {/* DISMISS / TRANSMIT OPERATIONAL BUTTON ACTIONS */}
        <div className="grid grid-cols-2 gap-3.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-full bg-[#12191c] border border-hud-border hover:bg-hud-card transition-all text-xs font-bold py-2.5 rounded-lg font-mono uppercase text-slate-300"
          >
            CANCELAR
          </button>
          
          <button
            type="submit"
            disabled={!selectedSubstituteId || !isSigned}
            className={`w-full text-xs font-bold py-2.5 rounded-lg font-mono uppercase transition-all flex items-center justify-center space-x-1.5 ${
              selectedSubstituteId && isSigned
                ? 'bg-cyber-blue text-black hover:bg-cyber-cyan shadow-[0_0_15px_rgba(0,229,255,0.4)]'
                : 'bg-hud-card border border-hud-border text-slate-500 cursor-not-allowed'
            }`}
            id="transmit-permuta-btn"
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>ENVIAR SOLICITAÇÃO</span>
          </button>
        </div>

      </form>
    </div>
  );
}
