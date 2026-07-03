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
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  Edit3, 
  QrCode, 
  AlertTriangle,
  Lock,
  Compass,
  CornerDownRight,
  ShieldCheck
} from 'lucide-react';
import { Permuta, Militar } from '../types';
import { generateSimpleHash, formatarDataBR } from '../data';

interface ValidadorPermutaProps {
  permuta: Permuta;
  allMilitares: Militar[];
  userLogged?: Militar;
  onBack: () => void;
  onAccept: (permutaId: string, assinatura: string) => void;
  onDecline: (permutaId: string) => void;
  onRequestAlteration: (permutaId: string, comentario: string) => void;
}

export default function ValidadorPermuta({
  permuta,
  allMilitares,
  userLogged,
  onBack,
  onAccept,
  onDecline,
  onRequestAlteration
}: ValidadorPermutaProps) {
  const [altComment, setAltComment] = useState<string>('');
  const [showAltInput, setShowAltInput] = useState<boolean>(false);

  const militarSubstituido = allMilitares.find(m => m.id === permuta.militarSubstituidoId);
  const militarSubstituto = allMilitares.find(m => m.id === permuta.militarSubstitutoId);

  const handleAcceptClick = () => {
    const sigText = `CYBERSIGN::${userLogged?.nomeGuerra?.toUpperCase() || 'UNKNOWN'}::${Math.floor(Date.now()/100).toString(16).toUpperCase()}::ACCEPT-PEER`;
    onAccept(permuta.id, sigText);
  };

  const handleSendAlteration = () => {
    if (!altComment) return;
    onRequestAlteration(permuta.id, altComment);
  };

  return (
    <div className="flex-1 flex flex-col p-4 bg-[#03080a] text-slate-100 select-none pb-12" id="validador-permuta-container">
      {/* HEADER SECTION */}
      <div className="flex items-center space-x-3 mb-4 border-b border-hud-border/40 pb-3">
        <button 
          onClick={onBack}
          className="p-1.5 rounded bg-hud-card border border-hud-border text-[#00e5ff] hover:bg-cyber-blue/10 transition-all focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">REVISAR SOLICITAÇÃO</h2>
          <p className="text-[10px] text-slate-400">Dados da proposta de troca de serviço entre colegas</p>
        </div>
      </div>

      <div className="space-y-4 font-sans">

        {/* COMPARATIVE ROADMAP TIMELINE (Antes vs Depois) */}
        <div className="bg-[#051115] border border-hud-border/80 rounded-xl p-3.5 relative overflow-hidden">
          <span className="text-[9px] font-semibold text-cyber-blue tracking-wider uppercase block">Fluxo da Troca de Serviço</span>
          
          <div className="mt-3.5 space-y-4 relative">
            {/* Connection line */}
            <div className="absolute left-8 top-5 bottom-5 w-[1px] bg-hud-border" />

            {/* Line item 1: Substituído */}
            <div className="flex items-start space-x-3 relative z-10">
              <div className="w-16 text-right shrink-0">
                <span className="text-[8px] text-slate-400 block uppercase">SUBSTITUÍDO</span>
                <span className="text-xs font-bold text-[#ffb300] leading-none block mt-0.5">
                  {militarSubstituido?.nomeGuerra}
                </span>
              </div>
              <div className="w-4 h-4 rounded-full bg-cyber-amber border-2 border-hud-bg shadow-[0_0_8px_#ffb300] shrink-0 mt-1" />
              <div className="flex-1 min-w-0 bg-hud-card border border-hud-border/50 rounded-lg p-2.5">
                <h4 className="text-xs font-bold text-white truncate">{militarSubstituido?.setor || permuta.postoServico}</h4>
                <div className="flex items-center space-x-2 text-[11px] text-slate-300 font-semibold mt-1.5">
                  <Clock className="w-4 h-4 text-cyber-cyan shrink-0" />
                  <span>{formatarDataBR(permuta.dataRealizacao)} @ {permuta.horaInicio} - {permuta.horaFim} ({permuta.turno})</span>
                </div>
              </div>
            </div>

            {/* Transition marker */}
            <div className="flex justify-center my-1 font-mono">
              <div className="bg-cyber-cyan/10 border border-cyber-cyan/30 px-2.5 py-0.5 rounded text-[8px] text-cyber-cyan uppercase font-bold">
                SUBSTITUIÇÃO DE SERVIÇO
              </div>
            </div>

            {/* Line item 2: Substituto */}
            <div className="flex items-start space-x-3 relative z-10">
              <div className="w-16 text-right shrink-0">
                <span className="text-[8px] text-slate-400 block uppercase font-mono">SUBSTITUTO</span>
                <span className="text-xs font-bold text-cyber-green leading-none block mt-0.5">
                  {militarSubstituto?.nomeGuerra}
                </span>
              </div>
              <div className="w-4 h-4 rounded-full bg-cyber-green border-2 border-hud-bg shadow-[0_0_8px_#00ff66] shrink-0 mt-1" />
              <div className="flex-1 min-w-0 bg-[#06171a] border border-cyber-green/40 rounded-lg p-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white truncate">Candidato Indicado</h4>
                </div>
                <div className="flex items-center space-x-2 text-[9px] text-slate-400 mt-1">
                  <Clock className="w-3.5 h-3.5 text-cyber-green" />
                  <span className="text-cyber-green">Ficará responsável pela escala inteira neste turno</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SENDER REMARKS IF THERE IS ONE */}
        {permuta.comentarioAlteracao && (
          <div className="bg-[#1c1204]/40 border border-[#ffb300]/20 p-3 rounded-lg text-xs leading-relaxed text-slate-300">
            <span className="text-[8px] text-cyber-amber block font-bold uppercase mb-1">OBSERVAÇÃO DO SOLICITANTE:</span>
            "{permuta.comentarioAlteracao}"
          </div>
        )}

        {/* DECISION CORE PANEL */}
        {!showAltInput ? (
          <div className="space-y-4">
            
            {/* BUTTONS ROW: DECLINE, CHANGE REQUEST, ACCEPT */}
            <div className="flex flex-col space-y-2 pt-2">
              <button
                type="button"
                onClick={handleAcceptClick}
                className="w-full text-xs font-bold py-3 rounded-lg font-mono uppercase transition-all flex items-center justify-center space-x-1.5 bg-cyber-green text-black hover:bg-[#00ff66]/90 shadow-[0_0_15px_rgba(0,255,102,0.4)]"
                id="accept-swap-btn"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>CONFIRMAR E ACEITAR TROCA</span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowAltInput(true)}
                  className="bg-[#12191c] border border-hud-border hover:bg-hud-card transition-all text-[11px] font-bold py-2.5 rounded-lg font-mono uppercase text-[#00e5ff] flex items-center justify-center"
                  id="request-alteration-btn"
                >
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                  <span>SUGERIR AJUSTE</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDecline(permuta.id)}
                  className="bg-cyber-red/10 border border-[#441118]/30 hover:bg-cyber-red/20 transition-all text-[11px] font-bold py-2.5 rounded-lg font-mono uppercase text-cyber-red flex items-center justify-center"
                  id="decline-swap-btn"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  <span>RECUSAR PEDIDO</span>
                </button>
              </div>
            </div>

          </div>
        ) : (
          /* ALTERATION MODE */
          <div className="bg-hud-card border border-hud-border rounded-xl p-3.5 space-y-3.5">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-semibold text-[#ffb300] tracking-wider uppercase block">PROPOSTA DE REPACTUAÇÃO</span>
              <button
                onClick={() => setShowAltInput(false)}
                className="text-[9px] text-slate-400 hover:text-white"
              >
                RETORNAR
              </button>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Sugira um ajuste no horário ou na escala para que o solicitante possa reavaliar e adaptar a proposta.
            </p>

            <textarea
              value={altComment}
              onChange={(e) => setAltComment(e.target.value)}
              placeholder="Descreva o ajuste desejado (Ex: 'Se pudermos inverter para o turno da NOITE ou reprogramar para o dia 22...')"
              className="w-full bg-[#051115] border border-hud-border rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyber-blue font-mono resize-none h-20"
            />

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowAltInput(false)}
                className="bg-[#12191c] border border-hud-border text-xs font-bold py-2 rounded-lg font-mono uppercase text-slate-400"
              >
                VOLTAR
              </button>
              
              <button
                type="button"
                onClick={handleSendAlteration}
                disabled={!altComment}
                className={`text-xs font-bold py-2 rounded-lg font-mono uppercase transition-all ${
                  altComment
                    ? 'bg-cyber-blue text-black hover:bg-cyber-cyan shadow-[0_0_8px_rgba(0,229,255,0.25)]'
                    : 'bg-hud-card text-slate-400 border border-hud-border cursor-not-allowed'
                }`}
                id="submit-alteration-btn"
              >
                ENVIAR AJUSTE
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
