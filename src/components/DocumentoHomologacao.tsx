/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ShieldCheck, 
  Calendar, 
  Clock, 
  FileSignature, 
  Award, 
  Fingerprint
} from 'lucide-react';
import { Permuta, Militar } from '../types';

interface DocumentoHomologacaoProps {
  permuta: Permuta;
  allMilitares: Militar[];
  compact?: boolean;
}

export function obterPartesData(dateStr: string) {
  if (!dateStr) return { dia: '00', mes: '00', ano: '0000', mesExtenso: 'Dezembro' };
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const dia = parts[2].padStart(2, '0');
    const mesCode = parts[1];
    const ano = parts[0];
    const meses = {
      '01': 'Janeiro',
      '02': 'Fevereiro',
      '03': 'Março',
      '04': 'Abril',
      '05': 'Maio',
      '06': 'Junho',
      '07': 'Julho',
      '08': 'Agosto',
      '09': 'Setembro',
      '10': 'Outubro',
      '11': 'Novembro',
      '12': 'Dezembro'
    };
    const mesExtenso = meses[mesCode as keyof typeof meses] || 'Junho';
    return { dia, mes: mesCode, ano, mesExtenso };
  }
  return { dia: '00', mes: '00', ano: '0000', mesExtenso: 'Dezembro' };
}

export default function DocumentoHomologacao({
  permuta,
  allMilitares,
  compact = false
}: DocumentoHomologacaoProps) {
  const substituido = allMilitares.find(m => m.id === permuta.militarSubstituidoId);
  const substituto = allMilitares.find(m => m.id === permuta.militarSubstitutoId);
  const gestorObj = permuta.gestorNome ? allMilitares.find(m => 
    m.nomeGuerra.toUpperCase() === permuta.gestorNome!.toUpperCase() ||
    m.nome.toUpperCase().includes(permuta.gestorNome!.toUpperCase())
  ) : undefined;
  
  const dateParts = obterPartesData(permuta.dataRealizacao);
  const dataExtenso = `${dateParts.dia} de ${dateParts.mesExtenso} de ${dateParts.ano}`;

  return (
    <div className={`bg-slate-950/90 border border-cyber-cyan/40 rounded-xl overflow-hidden font-sans shadow-lg text-slate-200 mt-2 ${compact ? 'p-3 text-[11px]' : 'p-4.5 text-xs'}`}>
      
      {/* Title / Header */}
      <div className="flex items-center justify-between border-b border-cyber-cyan/30 pb-2.5 mb-3">
        <div className="flex items-center space-x-2">
          <Award className="w-5 h-5 text-cyber-cyan shrink-0 animate-pulse" />
          <div>
            <h4 className="text-[12px] font-bold text-white uppercase tracking-wider">
              CERTIDÃO
            </h4>
          </div>
        </div>
        <div className={`rounded px-2 py-0.5 text-[9px] font-mono font-bold tracking-tight shrink-0 flex items-center space-x-1 border ${
          permuta.status === 'SEM_EFEITO' 
            ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' 
            : 'bg-cyber-green/10 text-cyber-green border-cyber-green/30'
        }`}>
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{permuta.status === 'SEM_EFEITO' ? 'TORNADO SEM EFEITO' : 'HOMOLOGADA'}</span>
        </div>
      </div>

      {/* Main Metadata layout */}
      <div className="space-y-3">
        
        {/* SECTION 1: DATAS E HORÁRIOS */}
        <div className="grid grid-cols-2 gap-2 bg-[#020709] p-2 rounded-lg border border-hud-border/40">
          <div className="flex flex-col space-y-1">
            <span className="text-[8px] font-mono text-slate-400 uppercase font-bold tracking-wider block">
              <Calendar className="w-3 h-3 text-cyber-cyan inline mr-1 -mt-0.5" />
              Data do Serviço
            </span>
            <div className="text-[11px] font-bold text-cyber-cyan font-mono leading-tight">
              {dataExtenso}
            </div>
            <span className="text-[8.5px] text-slate-400 font-mono italic">
              ({dateParts.dia}/{dateParts.mes}/{dateParts.ano})
            </span>
          </div>

          <div className="flex flex-col space-y-1 border-l border-hud-border/30 pl-2">
            <span className="text-[8px] font-mono text-slate-400 uppercase font-bold tracking-wider block">
              <Clock className="w-3 h-3 text-cyber-cyan inline mr-1 -mt-0.5" />
              Escala de Horário
            </span>
            <div className="text-[11px] font-bold text-white font-mono leading-tight">
              {permuta.horaInicio} às {permuta.horaFim}
            </div>
            <span className="text-[8.5px] text-[#ffb300] font-mono font-bold uppercase">
              Turno: {permuta.turno}
            </span>
          </div>
        </div>

        {/* SECTION 2: POLICIAIS SUBSTITUTO E SUBSTITUÍDO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          
          {/* SUBSTITUÍDO */}
          <div className="bg-hud-bg/60 border border-hud-border/50 rounded-lg p-2.5">
            <span className="text-[8px] font-mono text-cyber-red uppercase font-bold tracking-wider block mb-1.5 border-b border-cyber-red/20 pb-0.5">
              Policial Substituído (Sairá)
            </span>
            <div className="space-y-1 font-sans">
              <div className="text-xs font-black text-white">
                {substituido ? `${substituido.patente} ${substituido.nomeGuerra.replace(/Sgto\.|Cb\.|Ten\./g, '')}` : 'Não Identificado'}
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">
                Nome: <span className="text-slate-200">{substituido?.nome || '—'}</span>
              </div>
              <div className="text-[9px] text-slate-500 font-mono uppercase tracking-tight">
                Comp/Setor: {substituido?.setor || substituido?.companhia || '—'}
              </div>
              {permuta.assinaturaSubstituida && (
                <div className="border-t border-hud-border/20 pt-1.5 mt-1.5 text-[8px] text-cyber-cyan/80 font-mono flex items-center">
                  <Fingerprint className="w-3 h-3 text-cyber-cyan mr-1 shrink-0" />
                  <span className="truncate">Sign: {permuta.assinaturaSubstituida}</span>
                </div>
              )}
            </div>
          </div>

          {/* SUBSTITUTO */}
          <div className="bg-[#051318]/40 border border-cyber-cyan/25 rounded-lg p-2.5">
            <span className="text-[8px] font-mono text-cyber-green uppercase font-bold tracking-wider block mb-1.5 border-b border-cyber-green/20 pb-0.5">
              Policial Substituto (Assumirá)
            </span>
            <div className="space-y-1 font-sans">
              <div className="text-xs font-black text-white">
                {substituto ? `${substituto.patente} ${substituto.nomeGuerra.replace(/Sgto\.|Cb\.|Ten\./g, '')}` : 'Não Identificado'}
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">
                Nome: <span className="text-slate-200">{substituto?.nome || '—'}</span>
              </div>
              <div className="text-[9px] text-slate-500 font-mono uppercase tracking-tight">
                Comp/Setor: {substituto?.setor || substituto?.companhia || '—'}
              </div>
              {permuta.assinaturaSubstituta && (
                <div className="border-t border-hud-border/20 pt-1.5 mt-1.5 text-[8px] text-cyber-green/80 font-mono flex items-center">
                  <Fingerprint className="w-3 h-3 text-cyber-green mr-1 shrink-0" />
                  <span className="truncate">Sign: {permuta.assinaturaSubstituta}</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* SECTION 3: HOMOLOGAÇÃO COMANDO */}
        <div className="bg-[#051110] border border-cyber-green/20 rounded-lg p-2.5 flex flex-col space-y-1.5 relative overflow-hidden font-sans">
          <div className="absolute top-0 right-0 p-1 opacity-10">
            <FileSignature className="w-16 h-16 text-cyber-green -rotate-12" />
          </div>
          
          <div className="flex items-center space-x-1.5">
            <FileSignature className="w-3.5 h-3.5 text-cyber-green shrink-0" />
            <span className="text-[8px] font-mono text-cyber-green uppercase font-bold tracking-widest">
              Homologação Registrada por Autoridade de Comando
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-sans">
            <div>
              <span className="text-slate-400 block text-[9px]">CHEFE IMEDIATO/ESCALANTE:</span>
              <span className="text-white font-extrabold block text-[11px] uppercase">
                {gestorObj ? `${gestorObj.patente} ${gestorObj.nomeGuerra}` : (permuta.gestorNome || 'SISTEMA')}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px]">Autorizado em:</span>
              <span className="text-cyber-green font-bold block text-[10px] font-mono">
                {permuta.dataAssinaturaGestor || '2026-06-20 12:44'}
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
