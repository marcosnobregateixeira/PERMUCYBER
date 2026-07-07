/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Militar, Escala, Alerta, BlockchainLog, ChatMessage, Permuta } from './types';

export const MILITARES: Militar[] = [
  {
    id: 'M-103',
    nome: 'Douglas Rodrigues',
    nomeGuerra: 'Ten. Rodrigues',
    patente: '1ºTEN',
    quadro: 'QOPM',
    role: 'COMANDANTE',
    funcao: 'ADM',
    companhia: 'Comando Geral Regional',
    especialidade: 'ADMINISTRATIVO',
    statusProntidao: 'PRONTO',
    chaveDigital: 'COMMAND-NODE-RODRIGUES-00ALPHA',
    biometriaAtiva: true,
    pinSegurança: '1234',
    turno: 'TURNO A',
    matriculaFuncional: '103.456-1-0'
  },
  {
    id: 'M-104',
    nome: 'Fábio Toledo',
    nomeGuerra: 'Sgto. Toledo',
    patente: '3ºSGT',
    quadro: 'QPPM',
    role: 'USUARIO',
    funcao: 'DENTISTA',
    companhia: 'Seção de Odontologia Militar',
    especialidade: 'DENTISTA',
    statusProntidao: 'PRONTO',
    chaveDigital: 'SECURE-NODE-TOLEDO-33WE01',
    biometriaAtiva: false,
    pinSegurança: '8890',
    turno: '24H',
    matriculaFuncional: '104.456-1-1'
  },
  {
    id: 'M-301',
    nome: 'Rafael Pontes',
    nomeGuerra: 'Cb. Pontes',
    patente: 'CB',
    quadro: 'QPPM',
    role: 'USUARIO',
    funcao: 'ENFERMEIRO',
    companhia: 'Corpo de Enfermeiros do Hospital',
    especialidade: 'ENFERMEIRO',
    statusProntidao: 'FOLGA',
    chaveDigital: 'SECURE-NODE-FONTES-77GH77',
    biometriaAtiva: true,
    pinSegurança: '4321',
    turno: 'TURNO A',
    matriculaFuncional: '301.456-1-2'
  },
  {
    id: 'M-302',
    nome: 'Felipe Castro',
    nomeGuerra: 'Cb. Castro',
    patente: 'CB',
    quadro: 'QPPM',
    role: 'USUARIO',
    funcao: 'MOTORISTA',
    companhia: 'Setor de Transportes e Ambulâncias',
    especialidade: 'MOTORISTA',
    statusProntidao: 'PRONTO',
    chaveDigital: 'SECURE-NODE-CASTRO-22WE99',
    biometriaAtiva: true,
    pinSegurança: '2233',
    turno: 'TURNO B',
    matriculaFuncional: '302.456-1-3'
  },
  {
    id: 'M-303',
    nome: 'Marcos Souza',
    nomeGuerra: 'Cb. Souza',
    patente: 'CB',
    quadro: 'QPPM',
    role: 'USUARIO',
    funcao: 'FISCAL',
    companhia: 'Unidade de Fiscalização e Escalas',
    especialidade: 'FISCAL',
    statusProntidao: 'PRONTO',
    chaveDigital: 'SECURE-NODE-SOUZA-64KF29',
    biometriaAtiva: true,
    pinSegurança: '4455',
    turno: 'TURNO A',
    matriculaFuncional: '303.456-1-4'
  },
  {
    id: 'M-304',
    nome: 'Roberto Neves',
    nomeGuerra: 'Cb. Neves',
    patente: 'CB',
    quadro: 'QPPM',
    role: 'USUARIO',
    funcao: 'TEC. ENFERMAGEM',
    companhia: 'Corpo Técnico de Enfermagem',
    especialidade: 'TEC. ENFERMAGEM',
    statusProntidao: 'PRONTO',
    chaveDigital: 'SECURE-NODE-NEVES-81LH03',
    biometriaAtiva: true,
    pinSegurança: '6677',
    turno: 'TURNO B',
    matriculaFuncional: '304.456-1-5'
  },
  {
    id: 'M-305',
    nome: 'Juliana Lima',
    nomeGuerra: 'Cb. Lima',
    patente: 'CB',
    quadro: 'QPPM',
    role: 'USUARIO',
    funcao: 'ASSISTENTE SOCIAL',
    companhia: 'Diretoria de Serviço Social',
    especialidade: 'ASSISTENTE SOCIAL',
    statusProntidao: 'PRONTO',
    chaveDigital: 'SECURE-NODE-LIMA-19AA42',
    biometriaAtiva: true,
    pinSegurança: '8899',
    turno: 'TURNO A',
    matriculaFuncional: '305.456-1-6'
  },
  {
    id: 'M-ADMIN-1',
    nome: 'Marcos da Nobrega Teixeira',
    nomeGuerra: '1ºSgt Nobrega',
    patente: '1ºSGT',
    quadro: 'QOPM',
    role: 'ADMIN',
    funcao: 'ADM',
    companhia: 'Comando Geral',
    especialidade: 'ADMINISTRATIVO',
    statusProntidao: 'PRONTO',
    chaveDigital: 'ADMIN-NODE-NOBREGA-12345',
    biometriaAtiva: true,
    pinSegurança: '0000',
    turno: 'TURNO A',
    matriculaFuncional: '123.456-1-7'
  }
];

export const ALERTAS_INICIAIS: Alerta[] = [
  {
    id: 'A-01',
    prioridade: 'CRÍTICA',
    titulo: 'ALERTA DE SEGURANÇA NIVEL 3',
    conteudo: 'Operação de Alinhamento Multidisciplinar Ativada. Escalas de Ambulância e Odontologia em atenção permanente.',
    datahora: '2026-06-20 às 09:30',
    color: 'red',
    icon: 'shield'
  },
  {
    id: 'A-02',
    prioridade: 'ALTA',
    titulo: 'AUDITORIA DE CRONOGRAMAS',
    conteudo: 'Auditoria geral de escalas de Serviço Social e Psicologia no Comando às 14:00. Todos devem estar aptos.',
    datahora: '2026-06-20 às 11:15',
    color: 'amber',
    icon: 'triangle'
  },
  {
    id: 'A-03',
    prioridade: 'OPERACIONAL',
    titulo: 'RODÍZIO DE AMBULÂNCIAS',
    conteudo: 'Viatura de Ambulância AMB-03 passará por limpeza asséptica. Substituição temporária autorizada.',
    datahora: '2026-06-20 às 08:00',
    color: 'blue',
    icon: 'info'
  }
];

export const ESCALAS_INICIAIS: Escala[] = [
  {
    id: 'E-03',
    militarId: 'M-103', // Sgto Rodrigues
    postoServico: 'SERVIÇO SOCIAL',
    data: '2026-06-22',
    horaInicio: '06:00',
    horaFim: '18:00',
    turno: 'TURNO A'
  },
  {
    id: 'E-04',
    militarId: 'M-104', // Sgto Toledo
    postoServico: 'ODONTOLOGIA',
    data: '2026-06-21',
    horaInicio: '18:00',
    horaFim: '06:00',
    turno: 'TURNO B'
  },
  {
    id: 'E-05',
    militarId: 'M-301', // Cb. Pontes
    postoServico: 'AMBULÂNCIA',
    data: '2026-06-21',
    horaInicio: '06:00',
    horaFim: '18:00',
    turno: 'TURNO A'
  }
];

// Simple hash generator for simulation
export function formatarDataBR(dateStr: string): string {
  if (!dateStr) return '00.00.0000';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
  }
  return dateStr;
}

export function formatarDataHoraBrasilia(rawStr: string): string {
  if (!rawStr) return '00.00.0000 00:00';
  try {
    let date: Date;
    if (rawStr.includes(' ') || rawStr.includes('T')) {
      const formatted = rawStr.replace(' ', 'T');
      // If there's no Z or timezone offset, treat it as UTC by appending Z.
      const iso = formatted.includes('+') || formatted.includes('Z') || (formatted.match(/-[0-9]{2}:[0-9]{2}$/) !== null) ? formatted : formatted + 'Z';
      date = new Date(iso);
    } else {
      date = new Date(rawStr + 'T00:00:00Z');
    }

    if (isNaN(date.getTime())) {
      return rawStr;
    }

    const dtfDate = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const dtfTime = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const dateFormatted = dtfDate.format(date).replace(/\//g, '.');
    if (rawStr.includes(' ') || rawStr.includes('T')) {
      const timeFormatted = dtfTime.format(date);
      return `${dateFormatted} ${timeFormatted}`;
    }
    return dateFormatted;
  } catch (e) {
    const utcMs = new Date(rawStr.replace(' ', 'T') + (rawStr.includes('Z') ? '' : 'Z')).getTime();
    if (isNaN(utcMs)) return rawStr;
    const bstMs = utcMs - 3 * 60 * 60 * 1000;
    const bstDate = new Date(bstMs);
    const dd = String(bstDate.getUTCDate()).padStart(2, '0');
    const mm = String(bstDate.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = bstDate.getUTCFullYear();
    const hh = String(bstDate.getUTCHours()).padStart(2, '0');
    const min = String(bstDate.getUTCMinutes()).padStart(2, '0');
    if (rawStr.includes(' ') || rawStr.includes('T')) {
      return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
    }
    return `${dd}.${mm}.${yyyy}`;
  }
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
const b1Hash = generateSimpleHash('Cb. Pontes logado com sucesso de Terminal Bioterra', genesisHash);
const b2Hash = generateSimpleHash('Criação do Protocolo Inicial PERMUCYBER', b1Hash);

export const LOGS_INICIAIS: BlockchainLog[] = [];

export const PERMUTAS_INICIAIS: Permuta[] = [];

export const CHATS_INICIAIS: ChatMessage[] = [];
