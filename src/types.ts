/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Patente = 'CEL' | 'TC' | 'MAJ' | 'CAP' | '1ºTEN' | '2ºTEN' | 'ASP. OF' | 'AL. OF' | 'ST' | '1ºSGT' | '2ºSGT' | '3ºSGT' | 'CB' | 'SD';

export type Funcao = string;

export type Quadro = 'QOPM' | 'QOAPM' | 'QOCPM' | 'QPPM';

export type Role = 'USUARIO' | 'COMANDANTE' | 'ADMIN';

export interface Afastamento {
  id: string;
  motivo: 'FÉRIAS' | 'LICENÇA' | 'LUTO' | 'ATESTADO' | 'OUTROS';
  dataInicio: string; // YYYY-MM-DD
  dataFim: string; // YYYY-MM-DD
}

export interface Militar {
  id: string;
  nome: string;
  nomeGuerra: string;
  patente: Patente;
  funcao: Funcao;
  quadro: Quadro;
  role: Role;
  companhia: string;
  especialidade: string;
  statusProntidao: 'PRONTO' | 'EM_SERVICO' | 'FOLGA' | 'CONFLITO';
  chaveDigital: string;
  biometriaAtiva: boolean;
  pinSegurança: string;
  matriculaFuncional?: string;
  numero?: string;
  setor?: string;
  afastamentos?: Afastamento[];
}

export interface Escala {
  id: string;
  militarId: string;
  postoServico: string;
  data: string; // YYYY-MM-DD
  horaInicio: string; // HH:MM
  horaFim: string; // HH:MM
  turno: 'TURNO A' | 'TURNO B' | '24H';
}
export type PermutaStatus = 
  | 'PENDENTE_SUBSTITUTO' 
  | 'ALTERACAO_SOLICITADA' 
  | 'PENDENTE_GESTOR' 
  | 'APROVADO' 
  | 'REJEITADO' 
  | 'REJEITADO_SUBSTITUTO'
  | 'AJUSTE_GESTOR'
  | 'SEM_EFEITO';

export interface Permuta {
  id: string;
  escalaSubstituidaId: string;
  militarSubstituidoId: string;
  militarSubstitutoId: string;
  dataSolicitacao: string;
  dataRealizacao: string; // YYYY-MM-DD
  horaInicio: string;
  horaFim: string;
  turno: 'TURNO A' | 'TURNO B' | '24H';
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
  motivoSemEfeito?: string;
  dataCancelamentoAutomatico?: string;
}

export interface Alerta {
  id: string;
  prioridade: 'CRÍTICA' | 'ALTA' | 'OPERACIONAL' | 'SISTEMA';
  titulo: string;
  conteudo: string;
  datahora: string;
  color?: string;
  icon?: string;
  velocidade?: number;
  tamanho?: number;
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

export interface BackupSnapshot {
  id: string;
  timestamp: string;
  tipo: 'AUTO' | 'MANUAL';
  autor: string;
  quantidadeMilitares: number;
  quantidadeEscalas: number;
  quantidadePermutas: number;
  militares: Militar[];
  escalas: Escala[];
  permutas: Permuta[];
  alertas: Alerta[];
  logs: BlockchainLog[];
}

export interface AppConfig {
  id: string;
  brasaoEsquerdoUrl: string;
  brasaoDireitoUrl: string;
}

