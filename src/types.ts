/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Patente = 'Soldado' | 'Cabo' | 'Sargento' | 'Subtenente' | 'Tenente' | 'Capitão';

export interface Militar {
  id: string;
  nome: string;
  nomeGuerra: string;
  patente: Patente;
  companhia: string;
  especialidade: string;
  statusProntidao: 'PRONTO' | 'EM_SERVICO' | 'FOLGA' | 'CONFLITO';
  chaveDigital: string;
  biometriaAtiva: boolean;
  pinSegurança: string;
}

export interface Escala {
  id: string;
  militarId: string;
  postoServico: string;
  data: string; // YYYY-MM-DD
  horaInicio: string; // HH:MM
  horaFim: string; // HH:MM
  turno: 'MANHÃ' | 'TARDE' | 'NOITE' | 'ESTENDIDO';
}

export type PermutaStatus = 
  | 'PENDENTE_SUBSTITUTO' 
  | 'ALTERACAO_SOLICITADA' 
  | 'PENDENTE_GESTOR' 
  | 'APROVADO' 
  | 'REJEITADO' 
  | 'REJEITADO_SUBSTITUTO'
  | 'AJUSTE_GESTOR';

export interface Permuta {
  id: string;
  escalaSubstituidaId: string;
  militarSubstituidoId: string;
  militarSubstitutoId: string;
  dataSolicitacao: string;
  dataRealizacao: string; // YYYY-MM-DD
  horaInicio: string;
  horaFim: string;
  turno: 'MANHÃ' | 'TARDE' | 'NOITE' | 'ESTENDIDO';
  postoServico: string;
  comentarioAlteracao?: string;
  status: PermutaStatus;
  assinaturaSubstituida?: string;
  assinaturaSubstituta?: string;
  assinaturaGestor?: string;
  gestorNome?: string;
  dataAssinaturaGestor?: string;
  protocoloId: string; // PEM-YYYYMMDD-XXXX
  qrCode: string;
  auditoriaHash: string;
}

export interface Alerta {
  id: string;
  prioridade: 'CRÍTICA' | 'ALTA' | 'OPERACIONAL' | 'SISTEMA';
  titulo: string;
  conteudo: string;
  datahora: string;
}

export interface BlockchainLog {
  id: string;
  timestamp: string;
  tipoEvento: 'LOGIN' | 'ASSINATURA' | 'PERMUTA_CRIADA' | 'PERMUTA_ACEITA' | 'PROCESSO_APROVADO' | 'PROCESSO_REJEITADO' | 'INTEGRALIZAÇÃO';
  evento: string;
  militarEnvolvido: string;
  hashAnterior: string;
  hashAtual: string;
}

export interface ChatMessage {
  id: string;
  deMilitarId: string;
  paraMilitarId: string;
  conteudo: string;
  timestamp: string;
  criptografada: boolean;
  chaveCripto: string;
}
