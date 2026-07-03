/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { Shield, Cpu, RefreshCw, Radio, HardDrive, Compass, Command, FileCode } from 'lucide-react';
import { Militar } from '../types';

interface MilitaryMobileFrameProps {
  children: React.ReactNode;
  userLogged?: Militar;
  allUsers: Militar[];
  onUserSwitch: (userId: string) => void;
  networkSecured: boolean;
  onRefreshData: () => void;
  onImportMilitaresJSON?: (militares: Militar[]) => void;
  onUpdateMilitarNomeGuerra?: (id: string, newNome: string) => void;
  isLoggedIn?: boolean;
  theme?: string;
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
  isLoggedIn = false,
  theme
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
    <div className={`min-h-screen bg-[#020507] text-[#00e5ff] font-sans overflow-x-hidden hologram-grid flex flex-col items-center justify-center p-0 md:p-6 select-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0b1c24] via-[#03080a] to-[#010304] ${theme === 'pmce' ? 'theme-pmce' : theme === 'light' ? 'theme-light' : theme === 'contrast' ? 'theme-contrast' : theme === 'pmce-light' ? 'theme-pmce-light' : ''}`}>
      {/* Background Holographic Sweep */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-cyber-blue animate-scanline" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#00e5ff1b,#00000000_60%)]" />
      </div>

      <div className={`w-full max-w-lg bg-hud-bg md:rounded-[40px] border border-hud-border/80 neon-border-blue md:h-[840px] md:max-h-[92vh] flex flex-col overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.8),_0_0_30px_rgba(0,229,255,0.15)] ${theme === 'pmce' ? 'theme-pmce' : theme === 'light' ? 'theme-light' : theme === 'contrast' ? 'theme-contrast' : theme === 'pmce-light' ? 'theme-pmce-light' : ''}`}>
        {/* CRT Scanline overlay effect */}
        <div className="absolute inset-0 scanlines pointer-events-none opacity-40 z-50 rounded-[40px]" />

        {/* Micro Tech Gaskets, Screws & Grid corners */}
        <div className="absolute top-2 left-6 z-20 hidden md:block">
          <div className="flex space-x-1.5 opacity-60">
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-blue animate-pulse" />
            <span className="text-[9px] font-mono tracking-widest text-cyber-cyan">PERMUCYBER v4.95-SYS</span>
          </div>
        </div>

        {/* Core Screen Space with Custom military background */}
        <div className={`flex-1 flex flex-col items-stretch overflow-y-auto relative p-0 ${(theme === 'light' || theme === 'pmce-light') ? 'bg-[#FFFFFF] text-slate-900' : theme === 'contrast' ? 'bg-[#030608] text-white' : 'bg-[#040d11]/95 text-slate-100'}`}>
          {children}
        </div>

        {/* Bottom Hardware Bezel/Footer controls */}
        <div className="h-10 bg-[#020507] border-t border-hud-border/40 px-6 flex items-center justify-between text-cyber-blue/60 font-mono text-[10px] relative z-20">
          <div className="flex items-center space-x-1">
            <img
              src="https://i.imgur.com/4IMCWbp.jpeg"
              alt="Logo"
              className="w-4 h-4 rounded-full mr-1 object-cover border border-cyber-cyan/30"
              referrerPolicy="no-referrer"
            />
            <span className="text-[9px] uppercase tracking-wider text-cyber-cyan">Diretoria de Saúde</span>
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
