/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Militar, Escala, Alerta, BlockchainLog, ChatMessage, Permuta } from './types';

export const MILITARES: Militar[] = [
  {
    id: 'M-101',
    nome: 'Victor Salles',
    nomeGuerra: 'Sgto. Salles',
    patente: '3ºSGT',
    quadro: 'QPPM',
    funcao: 'MÉDICO',
    companhia: 'Diretoria de Saúde Militar',
    especialidade: 'MÉDICO',
    statusProntidao: 'EM_SERVICO',
    chaveDigital: 'SECURE-NODE-SALLES-88XBF7',
    biometriaAtiva: true,
    pinSegurança: '1975'
  },
  {
    id: 'M-102',
    nome: 'Thiago Mendes',
    nomeGuerra: 'Sgto. Mendes',
    patente: '3ºSGT',
    quadro: 'QPPM',
    funcao: 'PSICOLOGO',
    companhia: 'Setor de Saúde Mental',
    especialidade: 'PSICÓLOGO',
    statusProntidao: 'FOLGA',
    chaveDigital: 'SECURE-NODE-MENDES-12DF89',
    biometriaAtiva: true,
    pinSegurança: '2048'
  },
  {
    id: 'M-103',
    nome: 'Douglas Rodrigues',
    nomeGuerra: 'Sgto. Rodrigues',
    patente: '3ºSGT',
    quadro: 'QPPM',
    funcao: 'ADM',
    companhia: 'Regimento de Infantaria',
    especialidade: 'SOBREAVISO',
    statusProntidao: 'PRONTO',
    chaveDigital: 'SECURE-NODE-RODRIGUES-44PQ92',
    biometriaAtiva: true,
    pinSegurança: '5112'
  },
  {
    id: 'M-104',
    nome: 'Fábio Toledo',
    nomeGuerra: 'Sgto. Toledo',
    patente: '3ºSGT',
    quadro: 'QPPM',
    funcao: 'DENTISTA',
    companhia: 'Seção de Odontologia Militar',
    especialidade: 'DENTISTA',
    statusProntidao: 'PRONTO',
    chaveDigital: 'SECURE-NODE-TOLEDO-33WE01',
    biometriaAtiva: false,
    pinSegurança: '8890'
  },
  {
    id: 'M-202',
    nome: 'Carlos Bastos',
    nomeGuerra: 'Ten. Bastos',
    patente: '1ºTEN',
    quadro: 'QOPM',
    funcao: 'ADM',
    companhia: 'Comando Geral Regional',
    especialidade: 'ADMINISTRATIVO',
    statusProntidao: 'PRONTO',
    chaveDigital: 'COMMAND-NODE-BASTOS-00ALPHA',
    biometriaAtiva: true,
    pinSegurança: '0300'
  },
  {
    id: 'M-301',
    nome: 'Rafael Pontes',
    nomeGuerra: 'Cb. Pontes',
    patente: 'CB',
    quadro: 'QPPM',
    funcao: 'ENFERMEIRO',
    companhia: 'Corpo de Enfermeiros do Hospital',
    especialidade: 'ENFERMEIRO',
    statusProntidao: 'FOLGA',
    chaveDigital: 'SECURE-NODE-FONTES-77GH77',
    biometriaAtiva: true,
    pinSegurança: '4321'
  },
  {
    id: 'M-302',
    nome: 'Felipe Castro',
    nomeGuerra: 'Cb. Castro',
    patente: 'CB',
    quadro: 'QPPM',
    funcao: 'MOTORISTA',
    companhia: 'Setor de Transportes e Ambulâncias',
    especialidade: 'MOTORISTA',
    statusProntidao: 'PRONTO',
    chaveDigital: 'SECURE-NODE-CASTRO-22WE99',
    biometriaAtiva: true,
    pinSegurança: '2233'
  },
  {
    id: 'M-303',
    nome: 'Marcos Souza',
    nomeGuerra: 'Cb. Souza',
    patente: 'CB',
    quadro: 'QPPM',
    funcao: 'FISCAL',
    companhia: 'Unidade de Fiscalização e Escalas',
    especialidade: 'FISCAL',
    statusProntidao: 'PRONTO',
    chaveDigital: 'SECURE-NODE-SOUZA-64KF29',
    biometriaAtiva: true,
    pinSegurança: '4455'
  },
  {
    id: 'M-304',
    nome: 'Roberto Neves',
    nomeGuerra: 'Cb. Neves',
    patente: 'CB',
    quadro: 'QPPM',
    funcao: 'TEC. ENFERMAGEM',
    companhia: 'Corpo Técnico de Enfermagem',
    especialidade: 'TEC. ENFERMAGEM',
    statusProntidao: 'PRONTO',
    chaveDigital: 'SECURE-NODE-NEVES-81LH03',
    biometriaAtiva: true,
    pinSegurança: '6677'
  },
  {
    id: 'M-305',
    nome: 'Juliana Lima',
    nomeGuerra: 'Cb. Lima',
    patente: 'CB',
    quadro: 'QPPM',
    funcao: 'ASSISTENTE SOCIAL',
    companhia: 'Diretoria de Serviço Social',
    especialidade: 'ASSISTENTE SOCIAL',
    statusProntidao: 'PRONTO',
    chaveDigital: 'SECURE-NODE-LIMA-19AA42',
    biometriaAtiva: true,
    pinSegurança: '8899'
  },
  {
    id: 'M-ADMIN-1',
    nome: 'Marcos da Nobrega Teixeira',
    nomeGuerra: '1ºSgt Nobrega',
    patente: '1ºSGT',
    quadro: 'QOPM',
    funcao: 'ADM',
    companhia: 'Comando Geral',
    especialidade: 'ADMINISTRATIVO',
    statusProntidao: 'PRONTO',
    chaveDigital: 'ADMIN-NODE-NOBREGA-12345',
    biometriaAtiva: true,
    pinSegurança: '0000'
  }
];

export const ALERTAS_INICIAIS: Alerta[] = [
  {
    id: 'A-01',
    prioridade: 'CRÍTICA',
    titulo: 'ALERTA DE SEGURANÇA NIVEL 3',
    conteudo: 'Operação de Alinhamento Multidisciplinar Ativada. Escalas de Ambulância e Odontologia em atenção permanente.',
    datahora: '2026-06-20 às 09:30'
  },
  {
    id: 'A-02',
    prioridade: 'ALTA',
    titulo: 'AUDITORIA DE CRONOGRAMAS',
    conteudo: 'Auditoria geral de escalas de Serviço Social e Psicologia no Comando às 14:00. Todos devem estar aptos.',
    datahora: '2026-06-20 às 11:15'
  },
  {
    id: 'A-03',
    prioridade: 'OPERACIONAL',
    titulo: 'RODÍZIO DE AMBULÂNCIAS',
    conteudo: 'Viatura de Ambulância AMB-03 passará por limpeza asséptica. Substituição temporária autorizada.',
    datahora: '2026-06-20 às 08:00'
  }
];

export const ESCALAS_INICIAIS: Escala[] = [
  {
    id: 'E-01',
    militarId: 'M-101', // Sgto Salles
    postoServico: 'AMBULÂNCIA',
    data: '2026-06-21', // Amanhã
    horaInicio: '08:00',
    horaFim: '16:00',
    turno: 'MANHÃ'
  },
  {
    id: 'E-02',
    militarId: 'M-101', // Sgto Salles
    postoServico: 'PSICOLOGIA',
    data: '2026-06-24',
    horaInicio: '16:00',
    horaFim: '00:00',
    turno: 'TARDE'
  },
  {
    id: 'E-03',
    militarId: 'M-103', // Sgto Rodrigues
    postoServico: 'SERVIÇO SOCIAL',
    data: '2026-06-22',
    horaInicio: '08:00',
    horaFim: '16:00',
    turno: 'MANHÃ'
  },
  {
    id: 'E-04',
    militarId: 'M-104', // Sgto Toledo
    postoServico: 'ODONTOLOGIA',
    data: '2026-06-21',
    horaInicio: '00:00',
    horaFim: '08:00',
    turno: 'TURNO A'
  },
  {
    id: 'E-05',
    militarId: 'M-102', // Sgto Mendes
    postoServico: 'AMBULÂNCIA',
    data: '2026-06-21',
    horaInicio: '08:00',
    horaFim: '16:00',
    turno: 'MANHÃ'
  },
  {
    id: 'E-06',
    militarId: 'M-101', // Sgto Salles
    postoServico: 'SERVIÇO SOCIAL',
    data: '2026-05-15',
    horaInicio: '08:00',
    horaFim: '16:00',
    turno: 'MANHÃ'
  },
  {
    id: 'E-07',
    militarId: 'M-101', // Sgto Salles
    postoServico: 'ODONTOLOGIA',
    data: '2026-05-20',
    horaInicio: '16:00',
    horaFim: '00:00',
    turno: 'TARDE'
  },
  {
    id: 'E-08',
    militarId: 'M-101', // Sgto Salles
    postoServico: 'PSICOLOGIA',
    data: '2026-07-05',
    horaInicio: '08:00',
    horaFim: '16:00',
    turno: 'MANHÃ'
  },
  {
    id: 'E-09',
    militarId: 'M-101', // Sgto Salles
    postoServico: 'AMBULÂNCIA',
    data: '2026-07-22',
    horaInicio: '00:00',
    horaFim: '08:00',
    turno: 'TURNO A'
  }
];

// Simple hash generator for simulation
export function formatarDataBR(dateStr: string): string {
  if (!dateStr) return '00-00-0000';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  return dateStr;
}

export function generateSimpleHash(content: string, previousHash: string = ''): string {
  const input = content + previousHash;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padEnd(8, '4f');
  
  // Custom simple string to hex conversion to avoid Node.js Buffer in browser
  let hexString = '';
  const sliceStr = input.slice(0, 10);
  for (let i = 0; i < sliceStr.length; i++) {
    hexString += sliceStr.charCodeAt(i).toString(16);
  }
  
  return `0xSHA256_${hex.toUpperCase()}_${hexString.slice(0, 12).toUpperCase()}`;
}

// Block 0, Block 1, Block 2 for simulation
const genesisHash = '0xSHA256_GENESIS_BLOCK_ROOT_99AA88EE';
const b1Hash = generateSimpleHash('Sgto Salles logado com sucesso de Terminal Bioterra', genesisHash);
const b2Hash = generateSimpleHash('Criação do Protocolo Inicial PERMUCYBER', b1Hash);

export const LOGS_INICIAIS: BlockchainLog[] = [
  {
    id: 'L-01',
    timestamp: '2026-06-20 08:14:22',
    tipoEvento: 'INTEGRALIZAÇÃO',
    evento: 'Distribuição dos nós primários de redundância tática no datacenter de defesa.',
    militarEnvolvido: 'SISTEMA-ROOT',
    hashAnterior: '0x00000000000000000000000000000000',
    hashAtual: genesisHash
  },
  {
    id: 'L-02',
    timestamp: '2026-06-20 09:15:01',
    tipoEvento: 'LOGIN',
    evento: 'Sgto. Salles autenticado com Biometria Multimodal e 2FA Ativo.',
    militarEnvolvido: 'Sgto. Salles',
    hashAnterior: genesisHash,
    hashAtual: b1Hash
  },
  {
    id: 'L-03',
    timestamp: '2026-06-20 09:20:45',
    tipoEvento: 'PERMUTA_CRIADA',
    evento: 'Iniciado protocolo de permuta para escala ID [E-01] em 2026-06-21.',
    militarEnvolvido: 'Sgto. Salles',
    hashAnterior: b1Hash,
    hashAtual: b2Hash
  }
];

export const PERMUTAS_INICIAIS: Permuta[] = [
  {
    id: 'P-1001',
    escalaSubstituidaId: 'E-01',
    militarSubstituidoId: 'M-101', // Salles
    militarSubstitutoId: 'M-102', // Mendes
    dataSolicitacao: '2026-06-20',
    dataRealizacao: '2026-06-21',
    horaInicio: '08:00',
    horaFim: '16:00',
    turno: 'MANHÃ',
    postoServico: 'AMBULÂNCIA',
    status: 'PENDENTE_SUBSTITUTO', // To serve as an immediate playground for Mendes!
    comentarioAlteracao: undefined,
    assinaturaSubstituida: 'DECADIGITAL:VICTOR_SALLES_MD5_SIGND_ACTIVE',
    protocoloId: 'PEM-20260621-0089',
    qrCode: 'PERMUCYBER_AUTH::PEM-20260621-0089::CYBERSEC_TACTICAL',
    auditoriaHash: b2Hash
  }
];

export const CHATS_INICIAIS: ChatMessage[] = [
  {
    id: 'C-01',
    deMilitarId: 'M-101',
    paraMilitarId: 'M-102',
    conteudo: 'Mendes, iniciei a permuta da escala de amanhã (08h às 16h) na AMBULÂNCIA. Consegue validar pelo aplicativo?',
    timestamp: '2026-06-20 09:21',
    criptografada: true,
    chaveCripto: 'AES-GCM-256-QUANTUM-NODE-SALLES'
  },
  {
    id: 'C-02',
    deMilitarId: 'M-102',
    paraMilitarId: 'M-101',
    conteudo: 'Aguarde um minuto, Sargento. Estou acessando o setor de saúde para avaliar meu intervalo de descanso legal.',
    timestamp: '2026-06-20 09:25',
    criptografada: true,
    chaveCripto: 'AES-GCM-256-QUANTUM-NODE-MENDES'
  }
];
