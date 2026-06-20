/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fingerprint, Shield, Cpu, Lock, KeyRound, AlertTriangle, ChevronRight, CornerDownRight } from 'lucide-react';
import { Militar } from '../types';

interface BiometricLoginProps {
  userLogged: Militar;
  allUsers: Militar[];
  onUserSelect: (userId: string) => void;
  onLoginSuccess: () => void;
}

export default function BiometricLogin({ userLogged, allUsers, onUserSelect, onLoginSuccess }: BiometricLoginProps) {
  const [stage, setStage] = useState<'BIOMETRIC' | 'PIN_2FA' | 'SUCCESS'>('BIOMETRIC');
  const [scanState, setScanState] = useState<'IDLE' | 'SCANNING' | 'GRANTED' | 'FAILED'>('IDLE');
  const [pin, setPin] = useState<string>('');
  const [errorText, setErrorText] = useState<string | null>(null);

  // Simulated biometric scan trigger
  const handleStartScan = () => {
    if (scanState === 'SCANNING') return;
    setScanState('SCANNING');
    setErrorText(null);

    setTimeout(() => {
      if (userLogged.biometriaAtiva) {
        setScanState('GRANTED');
        setTimeout(() => {
          setStage('PIN_2FA');
        }, 800);
      } else {
        setScanState('FAILED');
        setErrorText('RECONHECIMENTO BIOMÉTRICO FALHOU - ID NÃO INTEGRADO');
        setTimeout(() => setScanState('IDLE'), 2000);
      }
    }, 2200);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    // Default pin verification based on logged user
    if (pin === userLogged.pinSegurança) {
      setStage('SUCCESS');
      setTimeout(() => {
        onLoginSuccess();
      }, 1000);
    } else {
      setErrorText('CÓDIGO DE ACESSO CRIPTOGRÁFICO INVÁLIDO');
      // Subtle shake or pattern failure
    }
  };

  const handleKeypadPress = (num: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + num);
      setErrorText(null);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-hud-bg text-cyber-blue relative overflow-hidden h-full">
      {/* Background grids */}
      <div className="absolute inset-0 hologram-grid opacity-10 pointer-events-none" />

      {/* Military Branding Upper Section */}
      <div className="relative z-10 flex flex-col items-center mt-3 text-center">
        <div className="flex items-center space-x-1.5 md:space-x-2 text-cyber-blue drop-shadow-[0_0_10px_rgba(0,229,255,0.4)]">
          <Shield className="w-8 h-8 text-cyber-blue animate-pulse" />
          <h1 className="text-3xl font-extrabold font-display tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyber-blue via-cyber-cyan to-white">
            PERMUCYBER
          </h1>
        </div>
        <p className="text-[9px] font-mono tracking-[0.3em] text-[#00b0ff]/80 uppercase mt-1">
          SISTEMA DE PERMUTAS
        </p>
        <div className="w-16 h-[1.5px] bg-gradient-to-r from-transparent via-cyber-blue to-transparent mt-2" />
      </div>

      {/* Main interactive block with AnimatePresence */}
      <div className="flex-1 flex items-center justify-center py-6 relative z-10">
        <AnimatePresence mode="wait">
          {stage === 'BIOMETRIC' && (
            <motion.div
              key="biometric"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, x: -100 }}
              className="w-full flex flex-col items-center max-w-sm"
              id="bio-login-container"
            >
              {/* Dropdown to SELECT active police/military officer from saved archived registration */}
              <div className="w-full mb-4.5 bg-hud-board/60 border border-hud-border/80 p-3 rounded-xl flex flex-col space-y-1.5 shadow-lg relative z-20">
                <label className="text-[10px] font-mono text-cyber-cyan uppercase tracking-wider font-bold flex items-center justify-between">
                  <span>AUTENTICAR IDENTIDADE REGISTRADA</span>
                  <span className="text-cyber-green text-[8px] animate-pulse">● CONECTADO_BANCO</span>
                </label>
                <select
                  value={userLogged.id}
                  onChange={(e) => onUserSelect(e.target.value)}
                  className="w-full bg-[#051319] border border-cyber-cyan/35 text-xs font-mono text-white p-2 rounded-md outline-none focus:border-cyber-cyan hover:border-cyber-cyan transition-all cursor-pointer"
                >
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id} className="bg-[#051319] text-white">
                      [{u.id}] {u.nome} - {u.patente}
                    </option>
                  ))}
                </select>
                <p className="text-[8.5px] font-mono text-slate-400">
                  Banco de dados cadastral arquivado e homologado centralizadamente.
                </p>
              </div>

              {/* Profile Card Mockup containing name, patente, and specialty/função pulled from registry */}
              <div className="w-full bg-[#07141a]/95 rounded-xl border border-hud-border p-4.5 mb-5 relative overflow-hidden flex flex-col space-y-3.5 shadow-[0_6px_20px_rgba(0,0,0,0.6)]">
                {/* Visual grid decor */}
                <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-cyber-green rounded-full animate-ping" />
                </div>
                
                {/* Upper ID card block */}
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded bg-cyber-cyan/10 border border-cyber-cyan/30 flex items-center justify-center overflow-hidden relative shrink-0">
                    <div className="absolute inset-0 bg-[#00e5ff09]" />
                    <Cpu className="w-6 h-6 text-cyber-cyan opacity-80" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[8px] text-cyber-cyan font-mono uppercase tracking-widest font-extrabold">CONSULTANDO CADASTRO OFICIAL</div>
                    <div className="text-[13px] font-extrabold font-display text-white truncate uppercase tracking-wide">
                      {userLogged.nome}
                    </div>
                    <div className="text-[9px] font-mono text-slate-300 font-bold">
                      ID REGISTRO: <span className="text-cyber-green">{userLogged.id}</span>
                    </div>
                  </div>
                </div>

                {/* Database archived parameters (Nome, Patente, Função) */}
                <div className="border-t border-hud-border/40 pt-2.5 grid grid-cols-2 gap-2 text-[9px] font-mono">
                  <div className="flex flex-col">
                    <span className="text-slate-500 uppercase font-bold">PATENTE / POSTO:</span>
                    <span className="text-white font-bold text-[10px] uppercase">{userLogged.patente}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 uppercase font-bold">COMPANHIA:</span>
                    <span className="text-slate-300 truncate">{userLogged.companhia}</span>
                  </div>
                  <div className="col-span-2 flex flex-col border-t border-hud-border/20 pt-1.5">
                    <span className="text-slate-500 uppercase font-bold">FUNÇÃO OPERACIONAL CADASTB:</span>
                    <span className="text-cyber-cyan font-bold leading-tight">{userLogged.especialidade}</span>
                  </div>
                </div>
              </div>

              {/* Holographic Fingerprint scan box */}
              <button
                onClick={handleStartScan}
                className={`relative w-44 h-44 rounded-full flex flex-col items-center justify-center focus:outline-none transition-all duration-500 border overflow-hidden ${
                  scanState === 'SCANNING'
                    ? 'bg-cyber-cyan/5 border-cyber-blue shadow-[0_0_25px_rgba(0,229,255,0.2)]'
                    : scanState === 'GRANTED'
                    ? 'bg-cyber-green/5 border-cyber-green shadow-[0_0_25px_rgba(0,255,102,0.3)]'
                    : scanState === 'FAILED'
                    ? 'bg-cyber-red/5 border-cyber-red shadow-[0_0_25px_rgba(255,61,0,0.3)]'
                    : 'bg-[#051319]/25 border-hud-border/80 hover:border-cyber-cyan/40 hover:bg-cyber-cyan/5'
                }`}
                id="fingerprint-scan-btn"
              >
                {/* Fingerprint Laser Scanner Beam line */}
                {scanState === 'SCANNING' && (
                  <motion.div
                    initial={{ y: -70 }}
                    animate={{ y: 70 }}
                    transition={{ repeat: Infinity, duration: 1.1, repeatType: "reverse" }}
                    className="absolute left-0 right-0 h-[2px] bg-cyber-blue shadow-[0_0_10px_#00e5ff] z-20"
                  />
                )}

                {/* Ambient pulse effect */}
                <div className="absolute inset-2 border border-cyber-cyan/10 rounded-full animate-pulse pointer-events-none" />
                
                {scanState === 'SCANNING' && (
                  <span className="absolute inset-0 rounded-full border border-cyber-blue opacity-50 animate-pulse-ring pointer-events-none" />
                )}

                <Fingerprint
                  className={`w-20 h-20 transition-all duration-300 ${
                    scanState === 'SCANNING'
                      ? 'text-cyber-blue scale-105'
                      : scanState === 'GRANTED'
                      ? 'text-cyber-green scale-105'
                      : scanState === 'FAILED'
                      ? 'text-cyber-red scale-95'
                      : 'text-cyber-cyan/70 hover:text-cyber-cyan'
                  }`}
                />

                <span className="text-[9px] font-mono tracking-widest mt-2 uppercase text-cyber-cyan/80">
                  {scanState === 'SCANNING'
                    ? 'DIRETRIZ DE ESCANEAMENTO...'
                    : scanState === 'GRANTED'
                    ? 'BIOMETRIA AUTORIZADA'
                    : scanState === 'FAILED'
                    ? 'SISTEMA NEGADO'
                    : 'VERIFICAR BIOMETRIA'}
                </span>
              </button>

              <div className="mt-6 flex flex-col items-center text-center">
                <p className="text-xs text-slate-400 max-w-[280px]">
                  Pressione o painel holográfico acima para simular a validação biométrica de segurança.
                </p>
                {errorText && (
                  <div className="mt-3 text-[10px] font-mono text-cyber-red animate-pulse flex items-center bg-cyber-red/10 border border-cyber-red/30 px-3 py-1.5 rounded">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" /> {errorText}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {stage === 'PIN_2FA' && (
            <motion.div
              key="pin-2fa"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="w-full flex flex-col items-center max-w-sm"
              id="pin-login-container"
            >
              {/* Shield header */}
              <div className="flex flex-col items-center text-center mb-5">
                <Lock className="w-8 h-8 text-cyber-amber animate-pulse mb-1.5" />
                <h3 className="text-md font-bold font-display text-white">DUPLO FATOR TÁTICO</h3>
                <p className="text-[10px] font-mono text-cyber-amber">TOKEN INDIVIDUAL REQUERIDO</p>
              </div>

              {/* Pin dots indicator */}
              <div className="flex space-x-4 mb-6">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className={`w-3.5 h-3.5 rounded-full border transition-all duration-300 ${
                      pin.length > index
                        ? 'bg-cyber-blue border-cyber-blue shadow-[0_0_8px_#00e5ff]'
                        : 'bg-transparent border-hud-border/80'
                    }`}
                  />
                ))}
              </div>

              {/* Keypad wrapper */}
              <div className="grid grid-cols-3 gap-2.5 w-full bg-[#061217] p-4 rounded-xl border border-hud-border select-none">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleKeypadPress(num)}
                    className="h-11 rounded-lg border border-hud-border/50 bg-hud-card font-mono text-lg font-bold text-white hover:border-cyber-blue/50 hover:bg-cyber-blue/10 active:bg-cyber-blue/25 transition-all flex items-center justify-center focus:outline-none"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="h-11 rounded-lg border border-hud-border/40 text-cyber-red bg-hud-card select-none text-xs font-mono font-bold hover:bg-cyber-red/10 flex items-center justify-center focus:outline-none"
                >
                  DEL
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="h-11 rounded-lg border border-hud-border/50 bg-hud-card font-mono text-lg font-bold text-white hover:border-cyber-blue/50 hover:bg-cyber-blue/10 flex items-center justify-center focus:outline-none"
                >
                  0
                </button>
                <button
                  type="submit"
                  onClick={handlePinSubmit}
                  disabled={pin.length < 4}
                  className={`h-11 rounded-lg font-mono text-[11px] font-bold uppercase transition-all flex items-center justify-center focus:outline-none ${
                    pin.length === 4
                      ? 'bg-cyber-green text-black hover:bg-cyber-green/90 shadow-[0_0_10px_rgba(0,255,102,0.4)]'
                      : 'bg-hud-card border border-hud-border/40 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  ENTRAR
                </button>
              </div>

              {/* Demo Hint */}
              <div className="mt-4 text-center">
                <span className="text-[9px] font-mono text-slate-500 bg-hud-card border border-hud-border p-1.5 rounded inline-block">
                  PIN DEMO DO {userLogged.nomeGuerra.toUpperCase()}: <span className="text-cyber-green font-bold">{userLogged.pinSegurança}</span>
                </span>
                {errorText && (
                  <div className="mt-5 text-[10px] font-mono text-cyber-red animate-pulse flex items-center justify-center bg-cyber-red/10 border border-cyber-red/30 px-3 py-1.5 rounded">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1 shrink-0" /> {errorText}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {stage === 'SUCCESS' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center text-center space-y-4"
              id="login-success-container"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-cyber-green flex items-center justify-center bg-cyber-green/10">
                  <KeyRound className="w-8 h-8 text-cyber-green animate-bounce" />
                </div>
                <div className="absolute inset-0 rounded-full border border-cyber-green opacity-40 animate-ping" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold font-display text-white">CHAVE INTEGRALIZADA</h3>
                <p className="text-xs font-mono text-cyber-green">SETOR OPERACIONAL DESBLOQUEADO</p>
              </div>

              <div className="font-mono text-[8px] text-[#00e5ff]/50 bg-hud-card p-2 border border-hud-border rounded text-left leading-relaxed">
                HASH DE ENTRADA CONEXÃO COMPRIDA:<br />
                <span className="text-cyber-blue font-bold">{userLogged.chaveDigital}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Credentials Info */}
      <div className="relative z-10 text-center border-t border-hud-border/40 pt-4 pb-1">
        <p className="text-[10px] font-mono text-slate-400">
          CONEXÃO DIGITAL PROTOCOLIZADA HIERARQUICAMENTE
        </p>
        <p className="text-[8px] font-mono text-[#00b0ff]/40 mt-0.5">
          IP SECURE PERMUCYBER: 127.0.0.1 // SAT CHANNEL: BRAVO-3000
        </p>
      </div>
    </div>
  );
}
