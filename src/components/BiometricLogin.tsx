/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Fingerprint, 
  Shield, 
  Cpu, 
  Lock, 
  KeyRound, 
  AlertTriangle, 
  ChevronRight, 
  Sparkles,
  Search,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { Militar } from '../types';

interface BiometricLoginProps {
  userLogged?: Militar;
  allUsers: Militar[];
  onUserSelect: (userId: string) => void;
  onLoginSuccess: () => void;
  onUpdateMilitarPin?: (userId: string, newPin: string, email?: string, chaveDigital?: string) => void;
}

export default function BiometricLogin({ 
  userLogged, 
  allUsers, 
  onUserSelect, 
  onLoginSuccess,
  onUpdateMilitarPin 
}: BiometricLoginProps) {
  const [stage, setStage] = useState<'BIOMETRIC' | 'PIN_2FA' | 'SUCCESS'>('BIOMETRIC');
  const [scanState, setScanState] = useState<'IDLE' | 'SCANNING' | 'GRANTED' | 'FAILED'>('IDLE');
  const [pin, setPin] = useState<string>('');
  const [errorText, setErrorText] = useState<string | null>(null);

  // Search/Autocomplete States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'BIOMETRY' | 'CUSTOM_TOKEN'>('BIOMETRY');
  
  // Track IDs that have scanned and completed biometric verification at least once previously
  const [verifiedIds, setVerifiedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('pm_verified_biometric_ids');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [customTokenInput, setCustomTokenInput] = useState<string>('');
  const [customEmailInput, setCustomEmailInput] = useState<string>('');
  const [customChaveInput, setCustomChaveInput] = useState<string>('');
  const [customSubTab, setCustomSubTab] = useState<'PIN' | 'EMAIL' | 'TOKEN'>('PIN');
  const [tokenSuccessMsg, setTokenSuccessMsg] = useState<string | null>(null);
  const [tokenErrorMsg, setTokenErrorMsg] = useState<string | null>(null);
  const [showFirstTimeSuccessPopup, setShowFirstTimeSuccessPopup] = useState<boolean>(false);

  // First access validation states
  const [matriculaInput, setMatriculaInput] = useState<string>('');
  const [isMatriculaVerified, setIsMatriculaVerified] = useState<boolean>(false);

  const formatMatricula = (value: string) => {
    // Keep only alphanumeric characters and force uppercase
    const cleanValue = value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
    const truncated = cleanValue.substring(0, 12);
    
    let formatted = '';
    if (truncated.length > 0) {
      formatted += truncated.substring(0, 3);
    }
    if (truncated.length > 3) {
      formatted += '.' + truncated.substring(3, 6);
    }
    if (truncated.length > 6) {
      formatted += '-' + truncated.substring(6, 7);
    }
    if (truncated.length > 7) {
      formatted += '-' + truncated.substring(7);
    }
    return formatted;
  };

  // Update searchQuery when user selected defaults
  useEffect(() => {
    setTokenErrorMsg(null);
    setTokenSuccessMsg(null);
    setCustomTokenInput('');
    setCustomEmailInput(userLogged?.email || '');
    setCustomChaveInput(userLogged?.chaveDigital || '');
    setCustomSubTab('PIN');
    setMatriculaInput('');
    setIsMatriculaVerified(false);
  }, [userLogged?.id]);

  // Autocomplete suggestions filter with rank-based sorting
  const PATENTE_ORDER_BIO: Record<string, number> = {
    'CEL': 1, 'TC': 2, 'MAJ': 3, 'CAP': 4, '1ºTEN': 5, '2ºTEN': 6, 'ASP. OF': 7, 
    'AL. OF': 8, 'ST': 9, '1ºSGT': 10, '2ºSGT': 11, '3ºSGT': 12, 'CB': 13, 'SD': 14
  };

  const filteredSuggestions = searchQuery.trim().length >= 3
    ? [...allUsers]
        .filter(u => {
          const query = searchQuery.toLowerCase();
          return (
            u.nomeGuerra.toLowerCase().includes(query) ||
            u.patente.toLowerCase().includes(query) ||
            u.nome.toLowerCase().includes(query)
          );
        })
        .sort((a, b) => {
          const orderA = PATENTE_ORDER_BIO[a.patente] || 99;
          const orderB = PATENTE_ORDER_BIO[b.patente] || 99;
          if (orderA !== orderB) return orderA - orderB;
          return a.nomeGuerra.localeCompare(b.nomeGuerra);
        })
    : [];

  const isSearchActive = searchQuery.trim().length >= 3;
  const isCorrectSearch = userLogged && (
    userLogged.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    userLogged.nomeGuerra.toLowerCase().includes(searchQuery.toLowerCase()) ||
    searchQuery.toLowerCase().includes(userLogged.nomeGuerra.toLowerCase())
  );
  const shouldShowInfo = !!(userLogged && isSearchActive && isCorrectSearch);

  const isFirstTime = userLogged ? (!userLogged.pinSegurança || userLogged.pinSegurança === '1234') : false;

  const handleStartScan = () => {
    if (!shouldShowInfo || !userLogged || scanState === 'SCANNING') return;
    setErrorText(null);

    // Strict validation check for first access matrícula validation before biometric scanning
    if (isFirstTime && !isMatriculaVerified) {
      setErrorText('VALIDAÇÃO NECESSÁRIA: É obrigatório realizar a validação da Matrícula Funcional (M.F) antes da biometria.');
      return;
    }

    setScanState('SCANNING');

    // FIX: Allow admin to bypass biometric check if needed for trouble shooting or if biometrics is actially failing
    if (userLogged?.role === 'ADMIN' || userLogged?.role === 'COMANDANTE') {
      console.warn('Admin/Comandante biometric override bypass.');
      setScanState('GRANTED');
      if (isFirstTime) {
        setTimeout(() => {
          setShowFirstTimeSuccessPopup(true);
          setActiveTab('CUSTOM_TOKEN');
          setScanState('IDLE');
        }, 500);
      } else {
        setStage('PIN_2FA');
      }
      return;
    }

    setTimeout(() => {
      if (userLogged?.biometriaAtiva || isFirstTime) {
        setScanState('GRANTED');
        
        // Check if first time for this particular logged user (has default PIN)
        const isFirstTime = !userLogged?.pinSegurança || userLogged.pinSegurança === '1234';

        setTimeout(() => {
          if (isFirstTime && userLogged) {
            // First time verifying! Show popup and open customization tab
            setShowFirstTimeSuccessPopup(true);
            setActiveTab('CUSTOM_TOKEN');
            setScanState('IDLE');
          } else {
            // Standard login proceed to PIN
            setStage('PIN_2FA');
          }
        }, 1200);
      } else {
        setScanState('FAILED');
        setErrorText('RECONHECIMENTO BIOMÉTRICO FALHOU - COMPATIBILIDADE REGIMENTAL ANALÓGICA');
        setTimeout(() => setScanState('IDLE'), 2000);
      }
    }, 2200);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userLogged) return;
    setErrorText(null);

    // Default or personalized pin security code check
    if (pin === userLogged?.pinSegurança) {
      if (userLogged?.acessoLiberado === false && userLogged?.role !== 'ADMIN' && userLogged?.role !== 'COMANDANTE') {
        setErrorText('SUA CREDENCIAL FOI SALVA, MAS O SEU ACESSO ESTÁ BLOQUEADO AGUARDANDO LIBERAÇÃO DO ADMINISTRADOR.');
        return;
      }
      setStage('SUCCESS');
      setTimeout(() => {
        onLoginSuccess();
      }, 1000);
    } else {
      setErrorText('CÓDIGO DE CREDENCIAL INCOMPATÍVEL COM O DETECTADO NO REGISTRO');
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
    <div className="flex-1 flex flex-col justify-between p-5 bg-hud-bg text-cyber-blue relative overflow-hidden h-full">
      {/* Background decoration */}
      <div className="absolute inset-0 hologram-grid opacity-[0.07] pointer-events-none" />

      {/* Brand Upper Title */}
      <div className="relative z-10 flex flex-col items-center mt-2.5 text-center">
        <div className="flex items-center space-x-2 text-cyber-blue drop-shadow-[0_0_10px_rgba(0,229,255,0.4)]">
          <img
            src="https://i.imgur.com/4IMCWbp.jpeg"
            alt="Logo"
            className="w-8 h-8 rounded-full border border-cyber-cyan/50 shadow-[0_0_8px_rgba(0,229,255,0.4)] object-cover"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-2xl font-black font-display tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyber-blue via-cyber-cyan to-white select-none">
            PERMUCYBER
          </h1>
        </div>
        <p className="text-[8.5px] font-mono tracking-[0.3em] text-[#00b0ff]/80 uppercase mt-0.5">
          PERMUTA DE SERVIÇO
        </p>
        <div className="w-14 h-[1px] bg-gradient-to-r from-transparent via-cyber-blue to-transparent mt-1.5" />
      </div>

      {/* Main Container Area */}
      <div className="flex-1 flex items-center justify-center py-4 relative z-10 min-h-0">
        <AnimatePresence mode="wait">
          {stage === 'BIOMETRIC' && (
            <motion.div
              key="biometric"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, x: -100 }}
              className="w-full flex flex-col items-center max-w-sm"
              id="bio-login-container"
            >
              {/* Autocomplete Input Search & Selection Header */}
              <div className="w-full mb-3.5 bg-hud-board/60 border border-hud-border/80 p-3 rounded-xl flex flex-col space-y-2 shadow-lg relative z-30">
                <label className="text-[9.5px] font-mono text-cyber-cyan uppercase tracking-wider font-extrabold flex items-center justify-between">
                  <span>AUTENTICAR IDENTIDADE REGISTRADA</span>
                  <span className="text-cyber-green text-[8px] animate-pulse flex items-center">
                    <span className="w-1.5 h-1.5 bg-cyber-green rounded-full mr-1" />
                    BANCO ATIVO
                  </span>
                </label>

                {/* Autocomplete Name Search Box */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                    placeholder="Digite seu nome de guerra."
                    className="w-full bg-[#051319] border border-cyber-cyan/35 text-xs font-mono text-white pl-8 pr-3 py-2 rounded-md outline-none focus:border-cyber-blue focus:shadow-[0_0_8px_rgba(0,229,255,0.15)] transition-all placeholder:text-slate-400"
                  />
                  
                  {/* Floating results matched dropdown */}
                  {showSuggestions && searchQuery.trim().length >= 3 && (
                    <div className="absolute left-0 right-0 mt-1 bg-slate-950 border border-cyber-cyan/50 rounded-lg shadow-2xl max-h-48 overflow-y-auto z-50 p-1 divide-y divide-hud-border/40">
                      {filteredSuggestions.length === 0 ? (
                        <div className="p-2.5 text-[10px] text-slate-400 font-mono italic">
                          Mapeamento analógico livre de registros para "{searchQuery}"
                        </div>
                      ) : (
                        filteredSuggestions.map((u) => (
                          <div
                            key={u.id}
                            onMouseDown={() => {
                              onUserSelect(u.id);
                              setSearchQuery(`${u.patente} ${u.nomeGuerra}`);
                              setShowSuggestions(false);
                            }}
                            className="p-2 text-[11px] font-mono hover:bg-cyber-cyan/15 text-slate-200 hover:text-white cursor-pointer transition-all flex justify-between items-center"
                          >
                            <div>
                              <span className="text-white font-bold">{u.patente} {u.nomeGuerra}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* Navigation Tabs (Scanner vs. Token Manager) */}
              <div className="w-full flex border-b border-hud-border/40 mb-3.5 bg-[#051319]/40 rounded-t-lg overflow-hidden relative z-20">
                <button
                  type="button"
                  onClick={() => setActiveTab('BIOMETRY')}
                  className={`flex-1 py-2 text-[9.5px] font-mono uppercase font-bold tracking-wider transition-all border-b-2 flex items-center justify-center space-x-1 ${
                    activeTab === 'BIOMETRY'
                      ? 'border-cyber-cyan text-white bg-cyber-cyan/5'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Fingerprint className="w-3.5 h-3.5 text-cyber-cyan shrink-0" />
                  <span>1. Biometria</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isFirstTime && isMatriculaVerified) {
                      setActiveTab('CUSTOM_TOKEN');
                    } else {
                      setErrorText('A PERSONALIZAÇÃO SÓ É LIBERADA APÓS A VALIDAÇÃO DA MATRÍCULA E DA BIOMETRIA DE PRIMEIRO ACESSO.');
                      setTimeout(() => setErrorText(null), 5000);
                    }
                  }}
                  className={`flex-1 py-1.5 text-[9.5px] font-mono uppercase font-bold tracking-wider transition-all border-b-2 flex items-center justify-center space-x-1 relative ${
                    activeTab === 'CUSTOM_TOKEN'
                      ? 'border-cyber-green text-white bg-cyber-green/5'
                      : (isFirstTime && isMatriculaVerified)
                      ? 'border-transparent text-slate-300 hover:text-white cursor-pointer'
                      : 'border-transparent text-slate-500/70 cursor-not-allowed'
                  }`}
                >
                  <Lock className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'CUSTOM_TOKEN' ? 'text-cyber-green' : 'text-cyber-red/80'}`} />
                  <span>2. Personalizar</span>
                  {!(isFirstTime && isMatriculaVerified) && (
                    <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-cyber-red/20 text-cyber-red border border-cyber-red/30 rounded text-[6.5px] font-extrabold uppercase tracking-tighter">Bloqueado</span>
                  )}
                </button>
              </div>

              {/* TAB CONTENT: Scan Fingerprint Biometry */}
              {activeTab === 'BIOMETRY' && (
                <div className="w-full flex flex-col items-center relative z-10">
                  {/* Selected User Display Profile Board */}
                  <div className="w-full bg-[#07141a]/95 rounded-xl border border-hud-border p-3.5 mb-4 relative overflow-hidden flex flex-col space-y-2.5 shadow-lg">
                    <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-cyber-green rounded-full animate-pulse-ring" />
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded bg-cyber-cyan/15 border border-cyber-cyan/40 flex items-center justify-center relative shrink-0">
                        <Cpu className="w-5 h-5 text-cyber-cyan animate-pulse" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[7.5px] text-cyber-cyan font-mono uppercase tracking-widest font-extrabold">PM Selecionado</div>
                        <div className="text-[12px] font-extrabold text-white truncate uppercase h-5 flex items-center">
                          {userLogged ? (
                            shouldShowInfo ? (
                              isFirstTime ? `${userLogged.patente} ${userLogged.nomeGuerra}` : userLogged.nome
                            ) : "🔒 IDENTIDADE CRIPTOGRAFADA"
                          ) : (
                            <span className="flex space-x-1.5">
                              <span className="w-1.5 h-1.5 bg-cyber-cyan rounded-full animate-pulse"></span>
                              <span className="w-1.5 h-1.5 bg-cyber-cyan rounded-full animate-pulse [animation-delay:200ms]"></span>
                              <span className="w-1.5 h-1.5 bg-cyber-cyan rounded-full animate-pulse [animation-delay:400ms]"></span>
                            </span>
                          )}
                        </div>
                        <div className="text-[8.5px] font-mono text-slate-400 h-4">
                          {userLogged ? (
                            shouldShowInfo ? (
                              <>POST/GRAD: <span className="text-white uppercase font-bold">{userLogged.patente}</span></>
                            ) : (
                              <span className="text-cyber-yellow/80 font-bold">PESQUISE SEU NOME PARA EXIBIR</span>
                            )
                          ) : (
                            <span className="text-[7px] text-slate-600 opacity-40 uppercase tracking-tighter italic">Selecione um Terminal Militar...</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-hud-border/40 pt-2 grid grid-cols-2 gap-2 text-[8.5px] font-mono">
                      <div>
                        <span className="text-slate-400 uppercase font-black">Setor:</span>
                        <p className="text-slate-200 truncate h-3">
                          {userLogged ? (shouldShowInfo ? (userLogged.setor || userLogged.companhia) : 'PROTEGIDO') : '---'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase font-black">Biometria:</span>
                        <p className={userLogged ? (shouldShowInfo ? (userLogged.biometriaAtiva ? 'text-cyber-green font-bold' : 'text-cyber-red font-bold') : 'text-slate-500 font-bold h-3') : 'text-slate-700 font-bold h-3'}>
                          {userLogged ? (shouldShowInfo ? (userLogged.biometriaAtiva ? 'INTEGRADA' : 'INATIVA') : 'PROTEGIDA') : '---'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {shouldShowInfo && isFirstTime && (
                    <div className="w-full flex items-center justify-between px-2 mb-4 text-[8px] font-mono border-b border-hud-border/30 pb-2">
                      <div className="flex items-center space-x-1">
                        <span className="w-3.5 h-3.5 rounded-full bg-cyber-green text-black flex items-center justify-center font-bold">1</span>
                        <span className="text-cyber-green font-bold uppercase">Nome</span>
                      </div>
                      <div className="w-6 h-[1px] bg-hud-border/40" />
                      <div className="flex items-center space-x-1">
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold ${isMatriculaVerified ? 'bg-cyber-green text-black' : 'bg-cyber-cyan text-black animate-pulse'}`}>2</span>
                        <span className={isMatriculaVerified ? 'text-cyber-green font-bold uppercase' : 'text-cyber-cyan font-bold uppercase animate-pulse'}>M.F.</span>
                      </div>
                      <div className="w-6 h-[1px] bg-hud-border/40" />
                      <div className="flex items-center space-x-1">
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold ${isMatriculaVerified ? 'bg-cyber-cyan/35 text-white animate-pulse' : 'bg-slate-800 text-slate-500'}`}>3</span>
                        <span className={isMatriculaVerified ? 'text-cyber-cyan font-bold uppercase animate-pulse' : 'text-slate-500 uppercase'}>Cadastro</span>
                      </div>
                    </div>
                  )}

                  {shouldShowInfo && isFirstTime && !isMatriculaVerified ? (
                    /* 2ª Etapa: Validação de Matrícula Funcional */
                    <div className="w-full bg-[#07141a]/95 rounded-xl border border-cyber-cyan/30 p-4 mb-2 flex flex-col space-y-3.5 shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-1 text-cyber-cyan/5">
                        <Shield className="w-16 h-16" />
                      </div>

                      <div className="flex items-center space-x-2 border-b border-cyber-cyan/20 pb-2">
                        <Shield className="w-4 h-4 text-cyber-cyan shrink-0 animate-pulse" />
                        <div>
                          <h4 className="text-[11px] font-extrabold text-white uppercase tracking-wider">
                            2ª ETAPA: VALIDAÇÃO DE IDENTIDADE
                          </h4>
                          <span className="text-[7.5px] font-mono text-cyber-cyan block tracking-tight uppercase">
                            Reconhecimento Cadastral Obrigatório
                          </span>
                        </div>
                      </div>

                      <p className="text-[9.5px] text-slate-300 leading-relaxed font-sans">
                        Este é o seu primeiro acesso ao Permucyber. Para continuar e personalizar seu PIN e e-mail de segurança, por favor confirme sua <strong className="text-white font-bold">Matrícula Funcional (M.F.)</strong> registrada no cadastro institucional.
                      </p>

                      <div className="flex flex-col space-y-1">
                        <label className="text-[8px] font-bold font-mono text-slate-400 uppercase">
                          Matrícula Funcional (M.F):
                        </label>
                        <input
                          type="text"
                          value={matriculaInput}
                          onChange={(e) => {
                            setMatriculaInput(formatMatricula(e.target.value));
                            setErrorText(null);
                          }}
                          placeholder="000.000-0-0"
                          maxLength={18}
                          className="w-full bg-[#051319] border border-cyber-cyan/35 text-xs font-mono text-white p-2.5 rounded-md outline-none focus:border-cyber-cyan focus:shadow-[0_0_8px_rgba(0,229,255,0.15)] transition-all placeholder:text-slate-500 text-center tracking-[0.1em] font-bold"
                        />

                      </div>

                      {errorText && (
                        <div className="text-[9px] font-mono text-cyber-red bg-cyber-red/10 border border-cyber-red/35 px-2.5 py-1 rounded">
                          ⚠️ {errorText}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (!userLogged) return;
                          setErrorText(null);
                          const inputClean = matriculaInput.replace(/[^0-9A-Z]/gi, '').toUpperCase();
                          if (inputClean.length < 5) {
                            setErrorText('M.F. INCOMPLETA: A matrícula funcional informada está muito curta. Digite a matrícula completa.');
                            return;
                          }
                          const dbClean = (userLogged.matriculaFuncional || '').replace(/[^0-9A-Z]/gi, '').toUpperCase();
                          if (!dbClean || (dbClean && inputClean === dbClean)) {
                            setIsMatriculaVerified(true);
                            setErrorText(null);
                          } else {
                            setErrorText('MATRÍCULA INCORRETA: A matrícula digitada não corresponde ao registro funcional correspondente. Cadastro de PIN bloqueado.');
                          }
                        }}
                        className="w-full bg-cyber-cyan text-black hover:bg-cyber-cyan/90 border border-transparent rounded py-2 text-[10px] font-black font-mono uppercase transition-all tracking-wider text-center cursor-pointer shadow-[0_0_10px_rgba(0,229,255,0.2)]"
                      >
                        VALIDAR REGISTRO CADASTRAL
                      </button>

                      <div className="text-[8px] text-slate-500 font-mono text-center italic">
                        Banco de dados seguro integrado de modo criptográfico
                      </div>
                    </div>
                  ) : (
                    /* 3ª Etapa: Biometria Scanner */
                    <div className="flex flex-col items-center w-full">
                      {isMatriculaVerified && (
                        <div className="mb-3 text-[9px] font-mono text-cyber-green bg-cyber-green/10 border border-cyber-green/35 px-3 py-1 rounded flex items-center space-x-1.5 animate-pulse">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span className="font-bold uppercase tracking-wider">MATRÍCULA VALIDADA COM SUCESSO</span>
                        </div>
                      )}

                      <button
                        onClick={handleStartScan}
                        disabled={!shouldShowInfo || scanState === 'SCANNING'}
                        className={`relative w-36 h-36 rounded-full flex flex-col items-center justify-center focus:outline-none transition-all duration-300 border overflow-hidden cursor-pointer ${
                          !shouldShowInfo 
                            ? 'bg-black/40 border-hud-border/20 grayscale cursor-not-allowed opacity-50'
                            : scanState === 'SCANNING'
                            ? 'bg-cyber-cyan/5 border-cyber-blue shadow-[0_0_25px_rgba(0,229,255,0.2)]'
                            : scanState === 'GRANTED'
                            ? 'bg-cyber-green/5 border-cyber-green shadow-[0_0_25px_rgba(0,255,102,0.3)]'
                            : scanState === 'FAILED'
                            ? 'bg-cyber-red/5 border-cyber-red shadow-[0_0_25px_rgba(255,61,0,0.3)]'
                            : 'bg-[#051319]/25 border-hud-border/80 hover:border-cyber-cyan/40 hover:bg-cyber-cyan/5'
                        }`}
                      >
                        {scanState === 'SCANNING' && (
                          <motion.div
                            initial={{ y: -50 }}
                            animate={{ y: 50 }}
                            transition={{ repeat: Infinity, duration: 1.1, repeatType: "reverse" }}
                            className="absolute left-0 right-0 h-[1.5px] bg-cyber-blue shadow-[0_0_8px_#00e5ff] z-20"
                          />
                        )}

                        <div className="absolute inset-2 border border-cyber-cyan/10 rounded-full animate-pulse pointer-events-none" />

                        <Fingerprint
                          className={`w-16 h-16 transition-all duration-300 ${
                            !shouldShowInfo
                              ? 'text-slate-600 scale-90'
                              : scanState === 'SCANNING'
                              ? 'text-cyber-blue scale-105'
                              : scanState === 'GRANTED'
                              ? 'text-cyber-green scale-105'
                              : scanState === 'FAILED'
                              ? 'text-cyber-red scale-95'
                              : 'text-cyber-cyan/70 hover:text-cyber-cyan'
                          }`}
                        />

                        <span className="text-[8.5px] font-mono tracking-widest mt-1.5 uppercase text-cyber-cyan/80 text-center px-2">
                          {!shouldShowInfo
                            ? 'BUSQUE SEU NOME'
                            : scanState === 'SCANNING'
                            ? 'AUTENTICANDO...'
                            : scanState === 'GRANTED'
                            ? 'AUTORIZADO'
                            : scanState === 'FAILED'
                            ? 'NEGADO'
                            : 'PRESSIONAR SCANNER'}
                        </span>
                      </button>

                      {errorText && (
                        <div className="mt-4 flex flex-col items-center text-center">
                          <div className="text-[9px] font-mono text-cyber-red animate-pulse flex items-center bg-cyber-red/10 border border-cyber-red/35 px-2.5 py-1 rounded">
                            <AlertTriangle className="w-3.5 h-3.5 mr-1" /> {errorText}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT: Modify Secure Token (Unlocked after scanning for first time) */}
              {activeTab === 'CUSTOM_TOKEN' && (
                <div className="w-full bg-[#07141a]/95 rounded-xl border border-cyber-green/40 p-4 relative overflow-hidden flex flex-col space-y-3 shadow-[0_4px_20px_rgba(0,255,102,0.08)] z-10">
                  <div className="absolute top-0 right-0 p-2 text-cyber-green/20">
                    <Lock className="w-14 h-14" />
                  </div>

                  <div className="flex items-center space-x-2 border-b border-cyber-green/25 pb-2">
                    <KeyRound className="w-4.5 h-4.5 text-cyber-green shrink-0 animate-pulse" />
                    <div>
                      <h4 className="text-[11.5px] font-extrabold text-white uppercase tracking-wider">
                        PERSONALIZAR TOKEN INDIVIDUAL
                      </h4>
                      <span className="text-[7.5px] font-mono text-cyber-green block tracking-tight uppercase">
                        Armazenamento Criptográfico Local do Policial
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 font-sans">
                    {/* Sub tabs for customization */}
                    <div className="flex space-x-1 bg-[#041116] p-1 rounded-lg border border-cyber-green/20 text-[9px] font-mono">
                      <button
                        type="button"
                        onClick={() => setCustomSubTab('PIN')}
                        className={`flex-1 py-1 rounded font-bold uppercase transition-all text-center cursor-pointer ${
                          customSubTab === 'PIN'
                            ? 'bg-cyber-green text-black font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        1. PIN / Token
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomSubTab('TOKEN')}
                        className={`flex-1 py-1 rounded font-bold uppercase transition-all text-center cursor-pointer ${
                          customSubTab === 'TOKEN'
                            ? 'bg-cyber-green text-black font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        2. Token Individual
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomSubTab('EMAIL')}
                        className={`flex-1 py-1 rounded font-bold uppercase transition-all text-center cursor-pointer ${
                          customSubTab === 'EMAIL'
                            ? 'bg-cyber-green text-black font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        3. E-mail de Contato
                      </button>
                    </div>

                    {customSubTab === 'PIN' && (
                       <div className="flex flex-col space-y-1">
                        <label className="text-[8.5px] font-bold font-mono text-slate-300 uppercase">
                          Inserir Novo PIN de Segurança (4 dígitos numéricos):
                        </label>
                        <input
                          type="password"
                          maxLength={4}
                          value={customTokenInput}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setCustomTokenInput(val);
                            setTokenErrorMsg(null);
                          }}
                          placeholder="••••"
                          className="w-full bg-[#051319] border border-cyber-green/35 text-xs font-mono text-white p-2 text-center rounded-md outline-none focus:border-cyber-green focus:shadow-[0_0_8px_rgba(0,255,102,0.15)] transition-all tracking-[0.4em]"
                        />
                        <p className="text-[8px] text-slate-400 font-mono">
                          Esse PIN de 4 dígitos será solicitado como autenticação de duplo fator.
                        </p>
                      </div>
                    )}

                    {customSubTab === 'TOKEN' && (
                      <div className="flex flex-col space-y-1">
                        <label className="text-[8.5px] font-bold font-mono text-slate-300 uppercase">
                          Personalizar Token Individual / Chave Digital:
                        </label>
                        <input
                          type="text"
                          value={customChaveInput}
                          onChange={(e) => {
                            setCustomChaveInput(e.target.value.toUpperCase());
                            setTokenErrorMsg(null);
                          }}
                          placeholder="DIGITE SEU TOKEN PERSONALIZADO"
                          className="w-full bg-[#051319] border border-cyber-green/35 text-xs font-mono text-white p-2 rounded-md outline-none focus:border-cyber-green focus:shadow-[0_0_8px_rgba(0,255,102,0.15)] transition-all uppercase font-bold"
                        />
                        <p className="text-[8px] text-slate-400 font-mono">
                          Esse token será a sua assinatura digital criptográfica usada para validar permutas.
                        </p>
                      </div>
                    )}

                    {customSubTab === 'EMAIL' && (
                      <div className="flex flex-col space-y-1">
                        <label className="text-[8.5px] font-bold font-mono text-slate-300 uppercase">
                          Inserir E-mail de Contato:
                        </label>
                        <input
                          type="email"
                          value={customEmailInput}
                          onChange={(e) => {
                            setCustomEmailInput(e.target.value);
                            setTokenErrorMsg(null);
                          }}
                          placeholder="exemplo@pm.gov.br"
                          className="w-full bg-[#051319] border border-cyber-green/35 text-xs font-mono text-white p-2 rounded-md outline-none focus:border-cyber-green focus:shadow-[0_0_8px_rgba(0,255,102,0.15)] transition-all"
                        />
                        <p className="text-[8px] text-slate-400 font-mono">
                          E-mail corporativo ou pessoal para liberação de acesso e auditoria de segurança.
                        </p>
                      </div>
                    )}

                    {tokenErrorMsg && (
                      <p className="text-[9px] text-cyber-red font-mono bg-cyber-red/10 border border-cyber-red/35 px-2 py-1 rounded">
                        ⚠️ {tokenErrorMsg}
                      </p>
                    )}

                    {tokenSuccessMsg && (
                      <p className="text-[9px] text-cyber-green font-mono bg-cyber-green/10 border border-cyber-green/35 px-2 py-1.5 rounded leading-normal">
                        ✓ {tokenSuccessMsg}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1 font-sans">
                      <button
                        type="button"
                        onClick={() => {
                          if (customTokenInput.length !== 4) {
                            setTokenErrorMsg('Preencha os 4 dígitos do PIN na aba PIN / Token.');
                            setCustomSubTab('PIN');
                            return;
                          }
                          const tokenTrimmed = customChaveInput.trim();
                          if (!tokenTrimmed) {
                            setTokenErrorMsg('Personalize seu Token Individual na aba correspondente.');
                            setCustomSubTab('TOKEN');
                            return;
                          }
                          const emailTrimmed = customEmailInput.trim();
                          if (!emailTrimmed) {
                            setTokenErrorMsg('Preencha seu e-mail de contato na aba E-mail.');
                            setCustomSubTab('EMAIL');
                            return;
                          }
                          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                          if (!emailRegex.test(emailTrimmed)) {
                            setTokenErrorMsg('Insira um endereço de e-mail válido.');
                            setCustomSubTab('EMAIL');
                            return;
                          }
                          if (userLogged) {
                            onUpdateMilitarPin?.(userLogged.id, customTokenInput, emailTrimmed, tokenTrimmed);
                            setTokenSuccessMsg('Credencial gravada! Aguardando liberação do administrador para realizar login.');
                          }
                          setCustomTokenInput('');
                          setCustomEmailInput('');
                          setCustomChaveInput('');
                          setTimeout(() => {
                            setTokenSuccessMsg(null);
                            setStage('BIOMETRIC');
                            setActiveTab('BIOMETRY');
                          }, 3500);
                        }}
                        className="bg-cyber-green text-black hover:bg-cyber-green/90 border border-transparent rounded py-2 text-[10px] font-black font-mono uppercase transition-all tracking-wider text-center cursor-pointer shadow-[0_0_10px_rgba(0,255,102,0.2)]"
                      >
                        SALVAR TOKEN
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('BIOMETRY');
                          setStage('PIN_2FA');
                        }}
                        className="bg-transparent border border-hud-border hover:bg-hud-card text-slate-300 rounded py-2 text-[10px] font-bold font-mono uppercase transition-all text-center cursor-pointer"
                      >
                        PULAR / ENTRAR
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
              {/* Back button */}
              <div className="w-full mb-2 flex justify-start">
                <button
                  type="button"
                  onClick={() => setStage('BIOMETRIC')}
                  className="text-slate-400 hover:text-white font-mono text-[9px] uppercase tracking-wider flex items-center space-x-1 border border-hud-border/40 px-2 py-1 rounded bg-hud-bg/20 cursor-pointer"
                >
                  ◀ Voltar Biometria
                </button>
              </div>

              {/* Shield header */}
              <div className="flex flex-col items-center text-center mb-4">
                <Lock className="w-7 h-7 text-cyber-amber animate-pulse mb-1" />
                <h3 className="text-xs font-bold font-display text-white">DUPLO FATOR TÁTICO</h3>
                <p className="text-[8.5px] font-mono text-cyber-amber uppercase tracking-widest">Token Criptográfico Privado</p>
              </div>

              {/* Pin dots indicator */}
              <div className="flex space-x-4 mb-4.5">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full border transition-all duration-300 ${
                      pin.length > index
                        ? 'bg-cyber-blue border-cyber-blue shadow-[0_0_8px_#00e5ff]'
                        : 'bg-transparent border-hud-border/80'
                    }`}
                  />
                ))}
              </div>

              {/* Keypad wrapper */}
              <div className="grid grid-cols-3 gap-2 w-full bg-[#061217] p-3 rounded-xl border border-hud-border select-none">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleKeypadPress(num)}
                    className="h-10 rounded-lg border border-hud-border/50 bg-hud-card font-mono text-base font-bold text-white hover:border-cyber-blue/50 hover:bg-cyber-blue/10 active:bg-cyber-blue/25 transition-all flex items-center justify-center focus:outline-none cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="h-10 rounded-lg border border-hud-border/40 text-cyber-red bg-hud-card select-none text-[10px] font-mono font-bold hover:bg-cyber-red/10 flex items-center justify-center focus:outline-none cursor-pointer"
                >
                  APAGAR
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="h-10 rounded-lg border border-hud-border/50 bg-hud-card font-mono text-base font-bold text-white hover:border-cyber-blue/50 hover:bg-cyber-blue/10 flex items-center justify-center focus:outline-none cursor-pointer"
                >
                  0
                </button>
                <button
                  type="submit"
                  onClick={handlePinSubmit}
                  disabled={pin.length < 4}
                  className={`h-10 rounded-lg font-mono text-[9px] font-bold uppercase transition-all flex items-center justify-center focus:outline-none cursor-pointer ${
                    pin.length === 4
                      ? 'bg-cyber-green text-black hover:bg-cyber-green/90 shadow-[0_0_10px_rgba(0,255,102,0.4)]'
                      : 'bg-hud-card border border-hud-border/40 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  ENTRAR
                </button>
              </div>

              {/* Demo Hint */}
              <div className="mt-3 text-center">
                {errorText && (
                  <div className="mt-3 text-[9px] font-mono text-cyber-red animate-pulse flex items-center justify-center bg-cyber-red/10 border border-cyber-red/35 px-2.5 py-1 rounded">
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
              className="flex flex-col items-center justify-center text-center space-y-3.5"
              id="login-success-container"
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-2 border-cyber-green flex items-center justify-center bg-cyber-green/10 animate-pulse">
                  <KeyRound className="w-7 h-7 text-cyber-green" />
                </div>
                <div className="absolute inset-0 rounded-full border border-cyber-green opacity-40 animate-ping" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold font-display text-white uppercase">Sessão Autenticada</h3>
                <p className="text-[10px] font-mono text-cyber-green">CHAVE INTEGRADA DE CRIPTOGRAFIA</p>
              </div>

              <div className="font-mono text-[7.5px] text-[#00e5ff]/50 bg-hud-card p-2 border border-hud-border rounded text-left leading-relaxed">
                HASH MILITAR ATIVO:<br />
                <span className="text-cyber-blue font-bold tracking-tight">{userLogged?.chaveDigital || '---'}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Popover Alert: FIRST TIME SCANNED BIOMETRICS -> TOKEN INFORMATIVE */}
      {showFirstTimeSuccessPopup && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-950 border border-cyber-green/50 max-w-sm w-full p-5 rounded-xl shadow-[0_0_30px_rgba(0,255,102,0.15)] text-center space-y-4 font-sans">
            <div className="w-12 h-12 bg-cyber-green/10 border border-cyber-green/40 rounded-full flex items-center justify-center mx-auto">
              <Fingerprint className="w-7 h-7 text-cyber-green animate-pulse" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-[12.5px] font-extrabold text-white uppercase tracking-wider">
                TOKEN CRIPTOGRÁFICO VALIDADO!
              </h3>
              <p className="text-[8px] font-mono text-cyber-green uppercase tracking-widest leading-none">
                Primeiro Acesso Detectado
              </p>
            </div>

            <p className="text-[10px] text-slate-400 leading-snug">
              Sua credencial foi autenticada com sucesso. Para sua segurança, é necessário configurar um PIN pessoal (2FA) exclusivo e secreto.
            </p>

            <button
              type="button"
              onClick={() => setShowFirstTimeSuccessPopup(false)}
              className="w-full bg-cyber-green hover:bg-cyber-green/90 text-black font-mono font-bold text-[10px] uppercase py-2 rounded focus:outline-none transition-all cursor-pointer"
            >
              CRIAR MEU PIN DE SEGURANÇA
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
