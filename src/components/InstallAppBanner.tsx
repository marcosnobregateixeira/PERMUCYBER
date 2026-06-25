import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
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
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
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
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      // We've used the prompt, and can't use it again, throw it away
      setDeferredPrompt(null);
    } else if (isIOS) {
      alert("Para instalar no iOS: toque no botão 'Compartilhar' no Safari e selecione 'Adicionar à Tela de Início'.");
    } else {
      alert("Para instalar, acesse as opções do seu navegador e escolha 'Instalar aplicativo' ou 'Adicionar à tela inicial'.");
    }
  };

  if (!showBanner) return null;

  return (
    <div className="bg-[#061217] border-b border-cyber-cyan/30 p-3 flex items-center justify-between shadow-[0_4px_15px_rgba(0,229,255,0.1)] z-50">
      <div className="flex items-center space-x-3 text-white">
        <div className="bg-cyber-cyan/20 p-2 rounded-lg border border-cyber-cyan/40">
          <Download className="w-5 h-5 text-cyber-cyan animate-pulse" />
        </div>
        <div>
          <h4 className="font-bold text-[11px] font-mono uppercase tracking-wider text-cyber-cyan">Baixar Aplicativo</h4>
          <p className="text-[9px] text-slate-400 font-sans mt-0.5">Disponível para Android, iOS e Computador.</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={handleInstallClick}
          className="bg-cyber-cyan hover:bg-[#00b3cc] text-black font-bold font-mono uppercase text-[9px] px-3 py-1.5 rounded transition-all shadow-[0_0_10px_rgba(0,229,255,0.4)]"
        >
          Instalar
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="p-1.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
