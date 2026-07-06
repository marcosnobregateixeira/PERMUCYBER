import fs from 'fs';

// Tenta ler o .env existente primeiro para preservar seus valores caso as variáveis de sistema estejam vazias
let existingUrl = '';
let existingKey = '';

if (fs.existsSync('.env')) {
  try {
    const content = fs.readFileSync('.env', 'utf-8');
    const urlMatch = content.match(/VITE_SUPABASE_URL=["']?([^"'\r\n]+)["']?/);
    const keyMatch = content.match(/VITE_SUPABASE_ANON_KEY=["']?([^"'\r\n]+)["']?/);
    if (urlMatch) existingUrl = urlMatch[1];
    if (keyMatch) existingKey = keyMatch[1];
    console.log('💡 Valores existentes encontrados no .env original:', {
      url: existingUrl ? 'Configurada' : 'Vazia',
      key: existingKey ? 'Configurada' : 'Vazia'
    });
  } catch (e) {
    console.warn('Aviso: Erro ao ler o arquivo .env existente:', e);
  }
}

// Se as variáveis do sistema operacional estiverem definidas, use-as. Caso contrário, use as já existentes no .env.
const url = process.env.VITE_SUPABASE_URL || existingUrl || '';
const key = process.env.VITE_SUPABASE_ANON_KEY || existingKey || '';

// Formata o arquivo .env
const envContent = `VITE_SUPABASE_URL="${url}"\nVITE_SUPABASE_ANON_KEY="${key}"\n`;

try {
  fs.writeFileSync('.env', envContent);
  console.log('✓ Arquivo .env gerado ou atualizado com sucesso para o build do Vite!');
  console.log(`URL do Supabase ativa no build: ${url}`);
} catch (e) {
  console.error('❌ Erro ao criar/atualizar arquivo .env no prepare-env:', e);
}
