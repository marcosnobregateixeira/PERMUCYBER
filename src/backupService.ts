import { BackupSnapshot, Militar, Escala, Permuta, Alerta, BlockchainLog } from './types';
import { salvarDados, deletarDados } from './databaseFallback';

const ENCRYPTION_PASSPHRASE = 'PERMUCYBER-MILITARY-EXCHANGE-SECURE-KEY-2026';

/**
 * 1. CRIPTOGRAFIA DE BACKUPS (XOR rotativo com salt e checksum)
 */
export function encryptBackup(snapshot: BackupSnapshot): string {
  const plainText = JSON.stringify(snapshot);
  // Gera salt aleatório de 16 caracteres hex
  const salt = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const key = ENCRYPTION_PASSPHRASE + salt;

  // Calcula checksum simples do plainText para garantia de integridade
  let sum = 0;
  for (let i = 0; i < plainText.length; i++) {
    sum = (sum + plainText.charCodeAt(i)) % 1000003;
  }
  const checksum = String(sum).padStart(7, '0');

  // Encripta os caracteres
  let cipherText = '';
  for (let i = 0; i < plainText.length; i++) {
    const charCode = plainText.charCodeAt(i);
    const keyChar = key.charCodeAt(i % key.length);
    const encryptedChar = charCode ^ keyChar;
    cipherText += String.fromCharCode(encryptedChar);
  }

  // Combina: salt + checksum + cifra em Base64 Unicode-safe
  const combined = `${salt}:${checksum}:${cipherText}`;
  const base64 = btoa(unescape(encodeURIComponent(combined)));
  return `SECURE_BACKUP_v1_${base64}`;
}

export function decryptBackup(encryptedStr: string): BackupSnapshot {
  if (!encryptedStr.startsWith('SECURE_BACKUP_v1_')) {
    throw new Error('Assinatura de criptografia de backup inválida ou corrompida.');
  }

  const base64 = encryptedStr.replace('SECURE_BACKUP_v1_', '');
  const combined = decodeURIComponent(escape(atob(base64)));
  const parts = combined.split(':');
  if (parts.length < 3) {
    throw new Error('Formato de backup criptografado inválido.');
  }

  const salt = parts[0];
  const storedChecksum = parts[1];
  const cipherText = parts.slice(2).join(':');

  const key = ENCRYPTION_PASSPHRASE + salt;

  let plainText = '';
  for (let i = 0; i < cipherText.length; i++) {
    const charCode = cipherText.charCodeAt(i);
    const keyChar = key.charCodeAt(i % key.length);
    const decryptedChar = charCode ^ keyChar;
    plainText += String.fromCharCode(decryptedChar);
  }

  // Valida o checksum para garantia de integridade anti-tampering
  let sum = 0;
  for (let i = 0; i < plainText.length; i++) {
    sum = (sum + plainText.charCodeAt(i)) % 1000003;
  }
  const computedChecksum = String(sum).padStart(7, '0');

  if (computedChecksum !== storedChecksum) {
    throw new Error('Violação de integridade: Checksum incompatível. Backup corrompido ou modificado.');
  }

  return JSON.parse(plainText) as BackupSnapshot;
}

/**
 * 2. VERIFICAÇÃO AUTOMÁTICA DE INTEGRIDADE
 */
export function verifyBackupIntegrity(snapshot: BackupSnapshot): { valid: boolean; error?: string } {
  if (!snapshot || typeof snapshot !== 'object') {
    return { valid: false, error: 'O snapshot de backup está vazio ou não é um objeto.' };
  }
  if (!snapshot.id || !snapshot.timestamp || !snapshot.tipo) {
    return { valid: false, error: 'Atributos estruturais obrigatórios ausentes (id, timestamp ou tipo).' };
  }
  if (!Array.isArray(snapshot.militares) || snapshot.militares.length === 0) {
    return { valid: false, error: 'A lista de militares ativos está ausente ou vazia.' };
  }
  if (!Array.isArray(snapshot.escalas)) {
    return { valid: false, error: 'A lista de escalas de serviço está ausente ou corrompida.' };
  }
  if (!Array.isArray(snapshot.permutas)) {
    return { valid: false, error: 'A lista de permutas homologadas/ativas está ausente ou corrompida.' };
  }
  return { valid: true };
}

/**
 * 3. RETENÇÃO MÍNIMA DE 90 DIAS
 * Filtra e retorna backups elegíveis e ids dos expirados para exclusão
 */
export function pruneExpiredBackups(backups: BackupSnapshot[]): { kept: BackupSnapshot[]; prunedIds: string[] } {
  // 90 dias em milissegundos
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const kept: BackupSnapshot[] = [];
  const prunedIds: string[] = [];

  for (const bk of backups) {
    try {
      const normalizedTimeStr = bk.timestamp.replace(' ', 'T');
      const bkTime = new Date(normalizedTimeStr).getTime();
      if (!isNaN(bkTime) && (now - bkTime) > ninetyDaysMs) {
        prunedIds.push(bk.id);
      } else {
        kept.push(bk);
      }
    } catch (e) {
      // Em caso de erro na data, preserva por segurança
      kept.push(bk);
    }
  }

  return { kept, prunedIds };
}

/**
 * 4. AUXILIARES DE DATA (Horário de Brasília: UTC-3)
 */
export function getBrasiliaTime(): Date {
  const d = new Date();
  // Obtém hora UTC em milissegundos e ajusta para UTC-3 (Brasília)
  const utcMs = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utcMs - (3 * 3600000));
}

/**
 * Retorna string YYYY-MM-DD no horário de Brasília
 */
export function getBrasiliaDateString(): string {
  const br = getBrasiliaTime();
  const yyyy = br.getFullYear();
  const mm = String(br.getMonth() + 1).padStart(2, '0');
  const dd = String(br.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 5. GERENCIADOR DE LOGS E ALERTAS DO BACKUP
 */
export interface BackupLogRecord {
  id: string;
  timestamp: string;
  tipo: 'DIÁRIO' | 'INCREMENTAL' | 'INTEGRIDADE' | 'PRUNE';
  status: 'SUCESSO' | 'FALHA';
  detalhes: string;
  erro?: string;
}

export function logBackupAction(
  tipo: BackupLogRecord['tipo'],
  status: BackupLogRecord['status'],
  detalhes: string,
  erro?: string
): BackupLogRecord {
  const log: BackupLogRecord = {
    id: `LOG-BK-${Date.now().toString().slice(-6)}`,
    timestamp: getBrasiliaTime().toISOString().replace('T', ' ').slice(0, 19),
    tipo,
    status,
    detalhes,
    erro
  };

  try {
    const existingLogsStr = localStorage.getItem('permucyber_backup_logs') || '[]';
    const logsList = JSON.parse(existingLogsStr) as BackupLogRecord[];
    logsList.unshift(log);
    // Mantém no máximo os 100 últimos logs de backup para não estourar o localStorage
    localStorage.setItem('permucyber_backup_logs', JSON.stringify(logsList.slice(0, 100)));
  } catch (e) {
    console.error('Falha ao gravar log localmente:', e);
  }

  return log;
}

export function getBackupLogs(): BackupLogRecord[] {
  try {
    return JSON.parse(localStorage.getItem('permucyber_backup_logs') || '[]') as BackupLogRecord[];
  } catch (e) {
    return [];
  }
}
