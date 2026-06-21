/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { Shield, Cpu, RefreshCw, Radio, HardDrive, Compass, Command, FileCode } from 'lucide-react';
import { Militar } from '../types';

interface MilitaryMobileFrameProps {
  children: React.ReactNode;
  userLogged: Militar;
  allUsers: Militar[];
  onUserSwitch: (userId: string) => void;
  networkSecured: boolean;
  onRefreshData: () => void;
  onImportMilitaresJSON?: (militares: Militar[]) => void;
  onUpdateMilitarNomeGuerra?: (id: string, newNome: string) => void;
  isLoggedIn?: boolean;
}

export default function MilitaryMobileFrame({
  children,
  userLogged,
  allUsers,
  onUserSwitch,
  networkSecured,
  onRefreshData,
  onImportMilitaresJSON,
  onUpdateMilitarNomeGuerra,
  isLoggedIn = false
}: MilitaryMobileFrameProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleJSONFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!Array.isArray(parsed)) {
          alert('Erro: O arquivo JSON deve conter uma lista (array) de policiais.');
          return;
        }

        // Validate basic fields
        const isValid = parsed.every(m => m.id && m.nome && m.nomeGuerra && m.patente);
        if (!isValid) {
          alert('Erro: Cada policial no JSON precisa ter os campos obrigatórios: id, nome, nomeGuerra, patente.');
          return;
        }

        if (onImportMilitaresJSON) {
          onImportMilitaresJSON(parsed);
          alert(`Sucesso! ${parsed.length} policiais importados para o sistema tático.`);
        }
      } catch (err) {
        alert('Erro: Arquivo JSON corrompido ou formato inválido.');
      }
    };
    reader.readAsText(file);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };
  return (
    <div className="min-h-screen bg-[#020507] text-[#00e5ff] font-sans overflow-x-hidden hologram-grid flex flex-col items-center justify-center p-0 md:p-6 select-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0b1c24] via-[#03080a] to-[#010304]">
      {/* Background Holographic Sweep */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-cyber-blue animate-scanline" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#00e5ff1b,#00000000_60%)]" />
      </div>

      <div className="w-full max-w-lg bg-hud-bg md:rounded-[40px] border border-hud-border/80 neon-border-blue md:h-[840px] md:max-h-[92vh] flex flex-col overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.8),_0_0_30px_rgba(0,229,255,0.15)]">
        {/* CRT Scanline overlay effect */}
        <div className="absolute inset-0 scanlines pointer-events-none opacity-40 z-50 rounded-[40px]" />

        {/* Micro Tech Gaskets, Screws & Grid corners */}
        <div className="absolute top-2 left-6 z-20 hidden md:block">
          <div className="flex space-x-1.5 opacity-60">
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-blue animate-pulse" />
            <span className="text-[9px] font-mono tracking-widest text-[#00b0ff]">PERMUCYBER v4.95-SYS</span>
          </div>
        </div>

        {/* Top Phone Notch / Camera Bar */}
        <div className="h-7 bg-[#040c0f] border-b border-hud-border/40 px-5 flex items-center justify-between text-[11px] font-mono text-cyber-blue/80 relative z-30">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <Command className="w-3.5 h-3.5 text-cyber-blue" />
              <input
                type="text"
                defaultValue="DIRETORIA DE SAÚDE/PMCE"
                className="font-bold text-cyber-cyan text-[8px] md:text-xs bg-transparent border-none outline-none focus:ring-0 focus:bg-cyber-blue/10 p-0 m-0 w-44 uppercase transition-all rounded px-1"
                title="Editar Nome do Comando"
              />
            </div>
          </div>
          
          {/* Dynamic Laser Camera Simulation */}
          <div className="absolute left-1/2 transform -translate-x-1/2 w-20 h-4 bg-[#020507] rounded-b-xl border-x border-b border-hud-border/50 flex justify-center items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-cyber-red animate-pulse" />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-cyber-cyan bg-cyber-cyan/10 px-1 border border-cyber-cyan/30 rounded uppercase font-bold tracking-tighter" title={`Acesso: ${userLogged.role}`}>
              [{userLogged.role}] {userLogged.patente.slice(0, 3)}. {userLogged.nomeGuerra.split(' ')[1] || userLogged.nomeGuerra}
            </span>
            <span className="w-2 h-2 rounded-full bg-cyber-green animate-ping" />
          </div>
        </div>

        {/* Core Screen Space with Custom military background */}
        <div className="flex-1 flex flex-col items-stretch overflow-y-auto relative bg-[#040d11]/95 text-slate-100 p-0">
          {children}
        </div>

        {/* Bottom Hardware Bezel/Footer controls */}
        <div className="h-10 bg-[#020507] border-t border-hud-border/40 px-6 flex items-center justify-between text-cyber-blue/60 font-mono text-[10px] relative z-20">
          <div className="flex items-center space-x-1">
            <Shield className="w-3.5 h-3.5 text-cyber-blue animate-pulse" />
            <span className="text-[9px] uppercase tracking-wider text-cyber-cyan">MODO TÁTICO ATIVO</span>
          </div>
          <div className="flex space-x-3 items-center">
            <span className="text-[9px]">ENCRYPTED SECURE FEED</span>
            <div className="flex space-x-0.5">
              <span className="w-1 h-2 bg-cyber-green"></span>
              <span className="w-1 h-2 bg-cyber-green"></span>
              <span className="w-1 h-2 bg-cyber-green"></span>
              <span className="w-1 h-2 bg-cyber-blue animate-pulse"></span>
            </div>
          </div>
        </div>
      </div>

      {/* External instruction overlay to guide user in desktop previews */}
      <div className="hidden md:flex flex-col items-center mt-4 max-w-sm text-center">
        <p className="text-[11px] text-slate-400 leading-relaxed bg-[#051115]/50 border border-hud-border/20 p-2.5 rounded-md">
          <strong className="text-cyber-green uppercase block mb-1">PROTÓTIPO MILITAR MULTIPAPEL</strong>
          Acesse a área do Comando no menu para gerenciar militares, importar .JSON, e simular diferentes papeis táticos.
        </p>
      </div>
    </div>
  );
}
