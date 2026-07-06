import fs from 'fs';

// Lê as variáveis do ambiente de execução do container
const url = process.env.VITE_SUPABASE_URL || '';
const key = process.env.VITE_SUPABASE_ANON_KEY || '';

// Formata o arquivo .env
const envContent = `VITE_SUPABASE_URL="${url}"\nVITE_SUPABASE_ANON_KEY="${key}"\n`;

try {
  fs.writeFileSync('.env', envContent);
  console.log('✓ Arquivo .env gerado com sucesso para o build do Vite!');
  console.log(`URL: ${url}`);
} catch (e) {
  console.error('❌ Erro ao criar arquivo .env no prepare-env:', e);
}
