import React, { useState, useEffect } from 'react';
import { 
  Download, 
  X, 
  ExternalLink, 
  Info, 
  Smartphone, 
  Monitor, 
  Apple, 
  Share2, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type TabType = 'android' | 'ios' | 'pc';

export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('android');
  const [isInIframe, setIsInIframe] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [userOS, setUserOS] = useState<string>('PC');

  useEffect(() => {
    // Check if we are inside an iframe
    const isIframe = window.self !== window.top;
    setIsInIframe(isIframe);

    // Detect User OS
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isAndroidDevice = /Android/i.test(ua);
    
    if (isIOSDevice) {
      setUserOS('iOS');
      setActiveTab('ios');
    } else if (isAndroidDevice) {
      setUserOS('Android');
      setActiveTab('android');
    } else {
      setUserOS('PC');
      setActiveTab('pc');
    }

    // Check if app is already running as standalone (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    
    // Always show in development or if not standalone
    if (!isStandalone) {
      setShowBanner(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      // Show advanced guide
      setShowInstructionsModal(true);
    }
  };

  const openAppInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Top Cybernetic Install Banner */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="bg-[#03090c]/95 border-b border-cyber-cyan/35 p-3 flex flex-col sm:flex-row sm:items-center justify-between shadow-[0_4px_20px_rgba(0,229,255,0.15)] z-40 relative backdrop-blur-md"
      >
        <div className="flex items-center space-x-3 text-white mb-2 sm:mb-0">
          <div className="bg-cyber-cyan/15 p-2 rounded-lg border border-cyber-cyan/40 shadow-[0_0_8px_rgba(0,229,255,0.2)]">
            <Download className="w-5 h-5 text-cyber-cyan animate-pulse" />
          </div>
          <div>
            <h4 className="font-extrabold text-[11px] font-mono uppercase tracking-wider text-cyber-cyan flex items-center gap-1.5">
              <span>Instalar Permuta Cyber</span>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] px-1 py-0.2 rounded font-normal uppercase">PWA Ativo</span>
            </h4>
            <p className="text-[10px] text-slate-400 font-sans mt-0.5">
              Instale na tela de início para acesso rápido, melhor desempenho e uso sem as barras do navegador.
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
          {isInIframe ? (
            <button
              onClick={openAppInNewTab}
              className="bg-cyber-blue hover:bg-cyber-cyan text-black font-black font-mono uppercase text-[9.5px] px-3.5 py-2 rounded-md transition-all duration-300 shadow-[0_0_12px_rgba(0,229,255,0.3)] flex items-center space-x-1.5 hover:scale-[1.03] cursor-pointer"
            >
              <span>Abrir no Navegador</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              {deferredPrompt && (
                <button
                  onClick={handleInstallClick}
                  className="bg-cyber-cyan hover:bg-[#00b3cc] text-black font-black font-mono uppercase text-[9.5px] px-3.5 py-2 rounded-md transition-all duration-300 shadow-[0_0_12px_rgba(0,229,255,0.4)] flex items-center space-x-1 hover:scale-[1.03] cursor-pointer"
                >
                  <span>Instalação Rápida</span>
                </button>
              )}
              <button
                onClick={() => setShowInstructionsModal(true)}
                className="bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 hover:border-cyber-cyan/50 font-bold font-mono uppercase text-[9.5px] px-3.5 py-2 rounded-md transition-all duration-300 flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Como Instalar?</span>
                <HelpCircle className="w-3.5 h-3.5 text-cyber-cyan" />
              </button>
            </>
          )}
          <button
            onClick={() => setShowBanner(false)}
            className="p-1.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Advanced Installation Assistant Modal */}
      <AnimatePresence>
        {showInstructionsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#03080a] border border-cyber-cyan/35 rounded-xl max-w-lg w-full overflow-hidden shadow-[0_0_40px_rgba(0,229,255,0.25)] flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="bg-[#061217] p-4 border-b border-cyber-cyan/20 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-cyber-cyan">
                  <Download className="w-5 h-5 animate-pulse" />
                  <h3 className="text-xs font-black font-mono uppercase tracking-widest text-white">
                    Assistente de Instalação PWA
                  </h3>
                </div>
                <button
                  onClick={() => setShowInstructionsModal(false)}
                  className="text-slate-400 hover:text-white p-1 hover:bg-white/10 rounded-full transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Scrollable Content */}
              <div className="p-5 overflow-y-auto space-y-4">
                
                {/* Iframe warning context if viewing inside AI Studio iframe */}
                {isInIframe && (
                  <div className="bg-amber-950/25 border border-amber-500/40 p-3 rounded-lg flex items-start space-x-2 text-[11px]">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-slate-300">
                      <strong className="text-amber-300 font-mono uppercase tracking-wider block">Visualização Protegida Detectada</strong>
                      <p>Você está visualizando o app em uma janela incorporada. Os navegadores desativam a instalação direta de PWAs dentro de quadros (iframes).</p>
                      <button 
                        onClick={openAppInNewTab}
                        className="mt-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold px-2.5 py-1 rounded text-[10px] uppercase font-mono tracking-wide flex items-center gap-1 transition-all"
                      >
                        <span>Abrir em Tela Cheia</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Subtitle / Explanation */}
                <div className="text-xs text-slate-400 leading-relaxed font-sans">
                  Nosso aplicativo utiliza tecnologia <strong>PWA (Progressive Web App)</strong>. Ele funciona como um aplicativo de sistema nativo, ocupando pouquíssimo espaço, abrindo sem barras de navegação e atualizando-se de forma automática.
                </div>

                {/* Interactive Platform Tabs */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#020507] rounded-lg border border-hud-border">
                  <button
                    onClick={() => setActiveTab('android')}
                    className={`py-2 px-1 rounded-md text-[10px] font-mono uppercase font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                      activeTab === 'android' 
                        ? 'bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Android</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('ios')}
                    className={`py-2 px-1 rounded-md text-[10px] font-mono uppercase font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                      activeTab === 'ios' 
                        ? 'bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Apple className="w-3.5 h-3.5" />
                    <span>iOS (iPhone)</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('pc')}
                    className={`py-2 px-1 rounded-md text-[10px] font-mono uppercase font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                      activeTab === 'pc' 
                        ? 'bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Computador</span>
                  </button>
                </div>

                {/* Tab Instructions Content */}
                <div className="bg-[#020507] border border-hud-border/40 p-4 rounded-lg">
                  {activeTab === 'android' && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 text-cyber-cyan border-b border-cyber-cyan/10 pb-1.5">
                        <Smartphone className="w-4 h-4" />
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Passos para Android (Chrome)</span>
                      </div>
                      
                      <ol className="space-y-3.5 text-xs text-slate-300 font-sans list-none pl-0">
                        <li className="flex items-start gap-2.5">
                          <span className="bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30 rounded-full w-5 h-5 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">1</span>
                          <span>Abra o app no navegador <strong>Google Chrome</strong> (evite navegadores internos de redes sociais).</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30 rounded-full w-5 h-5 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">2</span>
                          <span>Toque no botão de <strong>Instalação</strong> no topo da página, ou nos <strong>3 pontinhos</strong> do canto superior direito do Chrome.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30 rounded-full w-5 h-5 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">3</span>
                          <span>Selecione a opção <strong className="text-white">"Adicionar à Tela de Início"</strong> ou <strong className="text-white">"Instalar Aplicativo"</strong>.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30 rounded-full w-5 h-5 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">4</span>
                          <span>Confirme a instalação. O atalho surgirá na tela inicial e no menu do celular como se fosse nativo!</span>
                        </li>
                      </ol>
                    </div>
                  )}

                  {activeTab === 'ios' && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 text-cyber-cyan border-b border-cyber-cyan/10 pb-1.5">
                        <Apple className="w-4 h-4" />
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Passos para iOS (Safari - iPhone/iPad)</span>
                      </div>
                      
                      <ol className="space-y-3.5 text-xs text-slate-300 font-sans list-none pl-0">
                        <li className="flex items-start gap-2.5">
                          <span className="bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30 rounded-full w-5 h-5 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">1</span>
                          <span>Abra obrigatoriamente este link usando o navegador padrão <strong>Safari</strong> (outros navegadores no iPhone não suportam PWAs).</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30 rounded-full w-5 h-5 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">2</span>
                          <span className="flex flex-col gap-1">
                            <span>Toque no botão de <strong>Compartilhar</strong> na barra de ferramentas inferior do Safari:</span>
                            <span className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded w-fit text-[10px] text-cyber-cyan font-mono mt-0.5">
                              <Share2 className="w-3.5 h-3.5" /> Ícone do menu de compartilhar
                            </span>
                          </span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30 rounded-full w-5 h-5 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">3</span>
                          <span>Role a lista de opções para baixo e selecione <strong className="text-white">"Adicionar à Tela de Início"</strong>.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30 rounded-full w-5 h-5 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">4</span>
                          <span>Clique em <strong>Adicionar</strong> no canto superior direito. O app estará na sua tela inicial!</span>
                        </li>
                      </ol>
                    </div>
                  )}

                  {activeTab === 'pc' && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 text-cyber-cyan border-b border-cyber-cyan/10 pb-1.5">
                        <Monitor className="w-4 h-4" />
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Passos para Computadores (Chrome/Edge)</span>
                      </div>
                      
                      <ol className="space-y-3.5 text-xs text-slate-300 font-sans list-none pl-0">
                        <li className="flex items-start gap-2.5">
                          <span className="bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30 rounded-full w-5 h-5 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">1</span>
                          <span>Abra o app no <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong> no seu PC ou Mac.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30 rounded-full w-5 h-5 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">2</span>
                          <span>Na barra de endereços do topo (onde digita o link), clique no ícone de <strong>Computador com seta de Download</strong> ou sinal de <strong>+</strong> à direita.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30 rounded-full w-5 h-5 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">3</span>
                          <span>Selecione <strong className="text-white">"Instalar"</strong>. Alternativamente, você pode clicar nos 3 pontinhos do navegador e ir em <strong>"Salvar e Compartilhar" &gt; "Instalar página como app"</strong>.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30 rounded-full w-5 h-5 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">4</span>
                          <span>O aplicativo criará um atalho de área de trabalho e abrirá numa janela própria e super rápida!</span>
                        </li>
                      </ol>
                    </div>
                  )}
                </div>

                {/* Highlight benefits card */}
                <div className="bg-[#03151b] border border-cyber-cyan/20 p-3 rounded-lg flex items-center justify-between text-[11px]">
                  <div className="flex items-center space-x-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="font-mono uppercase tracking-wide">Sem download de arquivos .APK ou .EXE adicionais</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">100% Seguro</span>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="bg-[#061217] p-4 border-t border-cyber-cyan/20 flex flex-col sm:flex-row gap-2.5 justify-between items-center">
                <div className="text-[10px] text-slate-400 font-mono">
                  Seu dispositivo atual: <strong className="text-cyber-cyan uppercase">{userOS}</strong>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  {deferredPrompt && (
                    <button
                      onClick={() => {
                        handleInstallClick();
                        setShowInstructionsModal(false);
                      }}
                      className="flex-1 sm:flex-none bg-cyber-cyan hover:bg-[#00b3cc] text-black font-extrabold font-mono text-[10px] uppercase py-2 px-4 rounded transition-all cursor-pointer"
                    >
                      Instalar Agora
                    </button>
                  )}
                  <button
                    onClick={() => setShowInstructionsModal(false)}
                    className="flex-1 sm:flex-none bg-slate-900 hover:bg-slate-800 text-white font-mono text-[10px] uppercase py-2 px-4 rounded border border-slate-700/80 transition-all cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
