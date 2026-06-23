/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Lock, ShieldAlert, Cpu, Terminal, RefreshCw, KeyRound } from 'lucide-react';
import { ChatMessage, Militar } from '../types';

interface EncryptedChatProps {
  userLogged: Militar;
  allMilitares: Militar[];
  messages: ChatMessage[];
  onSendMessage: (paraMilitarId: string, conteudo: string) => void;
}

export default function EncryptedChat({
  userLogged,
  allMilitares,
  messages,
  onSendMessage
}: EncryptedChatProps) {
  const [typingText, setTypingText] = useState<string>('');
  const [showKeyInfo, setShowKeyInfo] = useState<boolean>(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const isLeadership = userLogged.role === 'ADMIN' || userLogged.role === 'COMANDANTE';

  // Calculate potential recipients based on role
  const potentialRecipients = allMilitares.filter(m => {
    if (m.id === userLogged.id) return false;
    if (userLogged.role === 'USUARIO') {
      // Users only send to Command as a whole
      return m.role === 'ADMIN' || m.role === 'COMANDANTE';
    }
    // Leadership can contact any regular user
    return m.role === 'USUARIO';
  });

  // Identify active conversations for leadership
  const incomingMessageSenders = Array.from(new Set(
    messages
      .filter(m => m.paraMilitarId === 'COMANDO' || (isLeadership && m.paraMilitarId === userLogged.id))
      .map(m => m.deMilitarId)
  )).map(id => allMilitares.find(m => m.id === id)).filter(m => m && m.id !== userLogged.id) as Militar[];

  // For users, they always send to 'COMANDO' conceptually, but we pick one to show in UI
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');

  useEffect(() => {
    if (!selectedRecipientId && potentialRecipients.length > 0) {
      if (isLeadership && incomingMessageSenders.length > 0) {
        setSelectedRecipientId(incomingMessageSenders[0].id);
      } else {
        setSelectedRecipientId(potentialRecipients[0].id);
      }
    }
  }, [potentialRecipients, selectedRecipientId, incomingMessageSenders, isLeadership]);

  // Sort potential recipients: those with messages to the top
  const sortedRecipients = [...potentialRecipients].sort((a, b) => {
    const aHasMsg = messages.some(m => (m.deMilitarId === a.id && (m.paraMilitarId === userLogged.id || m.paraMilitarId === 'COMANDO')) || (m.deMilitarId === userLogged.id && m.paraMilitarId === a.id));
    const bHasMsg = messages.some(m => (m.deMilitarId === b.id && (m.paraMilitarId === userLogged.id || m.paraMilitarId === 'COMANDO')) || (m.deMilitarId === userLogged.id && m.paraMilitarId === b.id));
    if (aHasMsg && !bHasMsg) return -1;
    if (!aHasMsg && bHasMsg) return 1;
    return 0;
  });

  // Filter messages for the current view
  const activeChatMessages = messages.filter((m) => {
    if (isLeadership) {
      // Leadership sees their own messages to this user, 
      // AND messages from this user to 'COMANDO' or to THEM specifically
      return (m.deMilitarId === userLogged.id && m.paraMilitarId === selectedRecipientId) ||
             (m.deMilitarId === selectedRecipientId && (m.paraMilitarId === 'COMANDO' || m.paraMilitarId === userLogged.id));
    } else {
      // User sees their own messages to 'COMANDO' or specific Admins,
      // AND any messages sent directly to THEM from any leadership
      const recipientMilitar = allMilitares.find(mil => mil.id === m.paraMilitarId);
      const senderMilitar = allMilitares.find(mil => mil.id === m.deMilitarId);
      
      const involvedMe = m.deMilitarId === userLogged.id || m.paraMilitarId === userLogged.id;
      if (!involvedMe) return false;

      // If I'm the sender, I only see it if I sent it to leadership or 'COMANDO'
      if (m.deMilitarId === userLogged.id) {
        return m.paraMilitarId === 'COMANDO' || (recipientMilitar?.role === 'ADMIN' || recipientMilitar?.role === 'COMANDANTE');
      }
      // If I'm the recipient, I only see it if it came from leadership
      return senderMilitar?.role === 'ADMIN' || senderMilitar?.role === 'COMANDANTE';
    }
  });

  const recipientMilitar = allMilitares.find(m => m.id === selectedRecipientId);

  // Auto-scroll chat screen to lowest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedRecipientId]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typingText.trim()) return;

    // Users send to 'COMANDO' (virtual ID for shared inbox), Admins send to specific users
    const targetId = userLogged.role === 'USUARIO' ? 'COMANDO' : selectedRecipientId;
    onSendMessage(targetId, typingText.trim());
    setTypingText('');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#03080a] text-slate-100 select-none pb-12 h-full" id="encrypted-chat-container">
      
      {/* CHANNEL SELECT ROTATION HEADER */}
      <div className="p-3 bg-hud-board border-b border-hud-border flex flex-col space-y-2">
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
          <span className="flex items-center text-cyber-blue uppercase tracking-widest font-bold">
            <Terminal className="w-3.5 h-3.5 mr-1" /> CANAL DE COMUNICAÇÃO SELETIVA
          </span>
          <span className="text-cyber-green flex items-center font-bold">
            <Lock className="w-3 h-3 mr-1" strokeWidth={2.5} /> AES-256 SECURED
          </span>
        </div>

        {/* Recipient Dropdown Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono text-slate-500 uppercase shrink-0">
            {userLogged.role === 'USUARIO' ? 'CONTATO COMANDO:' : 'ENV PERFIL:'}
          </span>
          <select
            value={selectedRecipientId}
            onChange={(e) => setSelectedRecipientId(e.target.value)}
            className="flex-1 bg-[#051115] border border-hud-border rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyber-blue font-mono"
            id="chat-recipient-select"
          >
            {sortedRecipients.map((rec) => {
              const hasUnread = messages.some(m => m.deMilitarId === rec.id && m.paraMilitarId === userLogged.id);
              return (
                <option key={rec.id} value={rec.id} className="bg-hud-bg text-white">
                  {hasUnread ? '📩 ' : ''}{rec.patente.slice(0, 3)}. {rec.nomeGuerra.split(' ')[1] || rec.nomeGuerra} {userLogged.role !== 'USUARIO' ? `(${rec.especialidade.slice(0, 15)}...)` : ''}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* SPECIAL NOTICE FOR USERS */}
      {userLogged.role === 'USUARIO' && (
        <div className="mx-3 mt-3 bg-cyber-blue/5 border border-cyber-blue/20 p-2 rounded flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-cyber-blue shrink-0 animate-pulse" />
          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter">
            Este canal é destinado a perguntas e sugestões ao Comando. Suas mensagens são privadas e seguras.
          </span>
        </div>
      )}

      {/* ACTIVE CONVERSATIONS FOR LEADERSHIP */}
      {(userLogged.role === 'ADMIN' || userLogged.role === 'COMANDANTE') && incomingMessageSenders.length > 0 && (
        <div className="px-3 py-2 bg-[#051115] border-b border-hud-border/30 overflow-x-auto whitespace-nowrap scrollbar-hide flex items-center space-x-2">
          <span className="text-[8px] font-mono text-cyber-blue uppercase font-bold shrink-0">Conversas:</span>
          {incomingMessageSenders.map(sender => (
            <button
              key={sender.id}
              onClick={() => setSelectedRecipientId(sender.id)}
              className={`px-2 py-1 rounded text-[9px] font-mono transition-all border ${
                selectedRecipientId === sender.id
                  ? 'bg-cyber-blue/20 border-cyber-blue text-white shadow-[0_0_5px_rgba(0,229,255,0.2)]'
                  : 'bg-hud-card border-hud-border text-slate-400 hover:text-white hover:border-slate-500'
              }`}
            >
              {sender.nomeGuerra.split(' ')[1] || sender.nomeGuerra}
            </button>
          ))}
        </div>
      )}

      {/* SYMMETRIC ENTROPY WARNING CARD */}
      {showKeyInfo && (
        <div className="mx-3 mt-3 bg-[#0d2128]/70 border border-cyber-cyan/30 p-2.5 rounded-lg flex items-start space-x-2 relative">
          <KeyRound className="w-4 h-4 text-cyber-cyan shrink-0 animate-pulse mt-0.5" />
          <div className="flex-1 text-[9px] font-mono">
            <span className="text-cyber-cyan font-bold block uppercase mb-0.5">ALGORITMO GRADIENTE COMPILADO</span>
            Canal cifrado fim-a-fim. Handshake simétrico ativo com chave do nó:<br />
            <span className="text-cyber-blue font-semibold max-w-[200px] block truncate text-[8.5px]">
              {userLogged.chaveDigital} ↔ {recipientMilitar?.chaveDigital || 'SAT-DECRYPT-NODE'}
            </span>
          </div>
          <button 
            onClick={() => setShowKeyInfo(false)}
            className="text-slate-500 hover:text-white px-1 leading-none text-xs"
          >
            ×
          </button>
        </div>
      )}

      {/* ACTIVE MESSAGES SCROLL LIST */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-3.5 max-h-[300px]"
        id="chat-messages-scroll"
      >
        {activeChatMessages.length === 0 ? (
          <div className="py-12 text-center text-slate-600 font-mono text-[11px] uppercase tracking-widest">
            Sem transmissões ativas com {recipientMilitar?.nomeGuerra || 'peer'}.<br />
            Inicie um novo diálogo criptografado abaixo.
          </div>
        ) : (
          activeChatMessages.map((msg) => {
            const isMe = msg.deMilitarId === userLogged.id;
            const sender = isMe ? userLogged : allMilitares.find(m => m.id === msg.deMilitarId);
            const senderName = sender?.nomeGuerra || (msg.deMilitarId === 'COMANDO' ? 'COMANDO' : 'Militar');

            return (
              <div 
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                {/* Meta details */}
                <div className="flex items-center space-x-1 mb-1 text-[8px] font-mono text-slate-500 px-1">
                  <span className="font-bold text-cyber-blue">{senderName}</span>
                  <span>•</span>
                  <span>{msg.timestamp.split(' ')[1] || msg.timestamp}</span>
                </div>

                {/* Secure cryptographic bubble container */}
                <div className={`p-2.5 rounded-xl text-xs relative border leading-relaxed break-words ${
                  isMe 
                    ? 'bg-[#00e5ff0d] border-cyber-cyan/30 text-slate-100 rounded-tr-none' 
                    : 'bg-[#152026] border-hud-border/70 text-slate-200 rounded-tl-none'
                }`}>
                  <p>{msg.conteudo}</p>
                  
                  {/* Embedded decrypt lock tag */}
                  <div className="flex items-center space-x-1.5 justify-end mt-1.5 opacity-40 hover:opacity-100 transition-all font-mono text-[6.5px]">
                    <Lock className="w-2 h-2 text-cyber-green" strokeWidth={3} />
                    <span className="uppercase text-cyber-green shrink-0">DECRYPTED AES-GCM</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* TRANSMIT KEYPAD CORE TEXT FIELD */}
      <form onSubmit={handleSend} className="p-3 border-t border-hud-border/50 bg-[#051115]/90 flex items-center space-x-2 relative z-10 mt-auto">
        <input
          type="text"
          value={typingText}
          onChange={(e) => setTypingText(e.target.value)}
          placeholder={userLogged.role === 'USUARIO' 
            ? "Transmitir pergunta ou sugestão criptografada para o Comando..." 
            : `Responder para ${recipientMilitar?.nomeGuerra || 'militar'}...`}
          className="flex-1 bg-[#020709] border border-hud-border text-xs rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyber-blue focus:ring-1 focus:ring-cyber-blue font-sans"
          id="chat-typing-input"
        />
        
        <button
          type="submit"
          disabled={!typingText.trim()}
          className={`p-2.5 rounded-lg font-mono tracking-wider transition-all duration-300 ${
            typingText.trim()
              ? 'bg-cyber-blue text-black hover:bg-cyber-cyan shadow-[0_0_8px_rgba(0,229,255,0.3)] cursor-pointer'
              : 'bg-hud-card text-slate-500 border border-hud-border cursor-not-allowed'
          }`}
          id="chat-send-btn"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}
