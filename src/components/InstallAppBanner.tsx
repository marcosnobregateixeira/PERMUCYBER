import React, { useState, useEffect } from 'react';
import { Download, X, ExternalLink, Info } from 'lucide-react';

export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Check if we are inside an iframe
    setIsInIframe(window.self !== window.top);

    // Check if it's iOS
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // If not standalone (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    
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
      // Fallback instructions
      setShowInstructions(true);
    }
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="bg-[#061217] border-b border-cyber-cyan/30 p-3 flex items-center justify-between shadow-[0_4px_15px_rgba(0,229,255,0.1)] z-40 relative">
        <div className="flex items-center space-x-3 text-white">
          <div className="bg-cyber-cyan/20 p-2 rounded-lg border border-cyber-cyan/40">
            <Download className="w-5 h-5 text-cyber-cyan animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-[11px] font-mono uppercase tracking-wider text-cyber-cyan">Baixar Aplicativo</h4>
            <p className="text-[9px] text-slate-400 font-sans mt-0.5">Disponível para Android, iOS e PC.</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isInIframe ? (
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-cyber-cyan hover:bg-[#00b3cc] text-black font-bold font-mono uppercase text-[9px] px-3 py-1.5 rounded transition-all shadow-[0_0_10px_rgba(0,229,255,0.4)] flex items-center space-x-1"
            >
              <span>Abrir App</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          ) : (
            <button
              onClick={handleInstallClick}
              className="bg-cyber-cyan hover:bg-[#00b3cc] text-black font-bold font-mono uppercase text-[9px] px-3 py-1.5 rounded transition-all shadow-[0_0_10px_rgba(0,229,255,0.4)] flex items-center space-x-1"
            >
              <span>Instalar</span>
            </button>
          )}
          <button
            onClick={() => setShowBanner(false)}
            className="p-1.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Manual Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#03080a] border border-cyber-cyan/30 p-5 rounded-xl max-w-sm w-full">
            <div className="flex items-start mb-4 text-cyber-cyan">
              <Info className="w-6 h-6 mr-3 shrink-0" />
              <div>
                <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-white">Instruções de Instalação</h3>
              </div>
            </div>
            
            <div className="space-y-4 text-sm text-slate-300 font-sans leading-relaxed">
              {isIOS ? (
                <p>Este aplicativo não é baixado pela App Store. Para instalar no <strong>iOS (iPhone/iPad)</strong>:<br/><br/>1. Abra este link no navegador <strong>Safari</strong>.<br/>2. Toque no botão de <strong className="text-white">Compartilhar</strong> (quadrado com seta para cima) na barra inferior.<br/>3. Role para baixo e selecione <strong className="text-white">"Adicionar à Tela de Início"</strong>.</p>
              ) : (
                <p>Este aplicativo não precisa da Play Store, ele é instalado direto pelo navegador.<br/><br/>Para instalar no seu <strong>Android</strong> ou <strong>Computador</strong>:<br/><br/>1. Abra o menu de opções do seu navegador (três pontinhos no canto superior).<br/>2. Selecione <strong className="text-white">"Instalar aplicativo"</strong> ou <strong className="text-white">"Adicionar à tela inicial"</strong>.</p>
              )}
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              className="mt-6 w-full bg-hud-card hover:bg-hud-card/80 border border-hud-border text-white font-bold py-2.5 rounded-lg font-mono text-[11px] uppercase transition-all"
            >
              FECHAR
            </button>
          </div>
        </div>
      )}
    </>
  );
}
