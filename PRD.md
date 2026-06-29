# Product Requirement Document (PRD) - Sistema de Permuta Militar (PERMUCYBER)

Este documento de requisitos de produto (PRD) descreve as especificações funcionais, regras de negócio e limites de segurança do sistema **PERMUCYBER** (Diretoria de Saúde - Relatório de Permutas). Ele serve como guia definitivo para a implementação de testes manuais, auditoria de código e testes automatizados de segurança e de regressão (QA).

---

## 1. Visão Geral do Sistema

O **PERMUCYBER** é uma aplicação tática de gerenciamento e homologação de permutas de plantão (trocas de serviço) para os policiais militares da Diretoria de Saúde. O objetivo do sistema é garantir transparência, auditabilidade por blockchain-like hash, conformidade com as escalas vigentes, e validações rígidas contra sobreposição de serviços e escalas conflitantes.

---

## 2. Perfis de Acesso & Autorização (RBAC)

O sistema opera sob Controle de Acesso Baseado em Perfis (RBAC). O bypass dessas regras é considerado uma falha crítica de segurança.

| Papel (Role) | Descrição | Permissões no Sistema |
| :--- | :--- | :--- |
| **USUARIO** | Policial Militar de serviço | - Solicitar permutas de serviço;<br>- Aceitar ou rejeitar solicitações enviadas a ele;<br>- Solicitar alterações em propostas enviadas a ele;<br>- Visualizar seu histórico e escalas;<br>- Participar do chat seguro com outros policiais. |
| **COMANDANTE** | Oficial de Gestão de Escalas | - Permissões de **USUARIO** +<br>- Aprovar (homologar) ou rejeitar permanentemente propostas pendentes de gestor;<br>- Cadastrar/Editar/Remover policiais militares;<br>- Visualizar logs de auditoria;<br>- Excluir logs individuais ou limpar todo o histórico de auditoria. |
| **ADMIN** | Administrador Geral do Sistema | - Permissões completas em todas as abas e painéis;<br>- Gerenciar banco de dados (resetar para padrões, restaurar backups, etc.);<br>- Gerenciar perfis e dados de segurança de todos os militares. |

---

## 3. Regras de Negócio e Validações Críticas (Lógica de Domínio)

Qualquer ferramenta de teste automatizado deve verificar os seguintes limites e restrições obrigatórias:

### 3.1. Validação Temporal de Solicitações
* **Janela Permitida:** Uma permuta só pode ser agendada para datas entre o **dia seguinte (amanhã)** e até no máximo **30 dias** a partir da data atual de execução.
  * *Condição matemática:* $1 \le \Delta \text{dias} \le 30$.
  * *Entrada inválida:* Data atual (hoje), datas no passado ou datas superiores a 30 dias devem ser barradas com alerta impeditivo.

### 3.2. Restrição de Afastamento (Licenças, Férias, etc.)
* **Impedimento Absoluto:** Nem o militar solicitante (**Substituído**) nem o militar indicado (**Substituto**) podem possuir qualquer afastamento ativo registrado para a data da realização do serviço.
  * *Afastamentos válidos:* `FÉRIAS`, `LICENÇA`, `LUTO`, `ATESTADO`, `OUTROS`.
  * *Lógica de conflito:* Se `dataRealizacao >= dataInicio` e `dataRealizacao <= dataFim` de algum afastamento de qualquer uma das duas partes, a permuta deve ser impedida.

### 3.3. Prevenção de Conflito de Turno e Sobreposição
* **Conflito Direto:** Um militar não pode participar de duas permutas ativas diferentes (seja como substituto ou substituído) na **mesma data** e no **mesmo turno**, exceto se uma delas tiver status `REJEITADO` ou `REJEITADO_SUBSTITUTO`.
  * *Turnos considerados:* `TURNO A`, `TURNO B`, `24H`, `EXPEDIENTE`.

### 3.4. Regras de Formatação Militar (Regras de Negócio Protegidas)
Ao exibir militares nos relatórios oficiais e documentos de homologação em PDF:
* **Padrão de Exibição:** `[PATENTE] [NUMERAL] [NOME_GUERRA]` (em caixa alta).
* **Regra de Numeral:** O numeral identificador (número da farda/badge) **DEVE** ser exibido exclusivamente para as seguintes patentes: `ST`, `1ºSGT`, `2ºSGT`, `3ºSGT`, `CB`, `SD`.
  * *Exemplo correto:* `CB 1234 SILVA`, `SD 9876 SOUZA`.
  * *Oficiais (CEL, TC, MAJ, CAP, 1ºTEN, 2ºTEN, ASP. OF, AL. OF):* **NÃO** devem exibir o numeral, apenas patente e nome de guerra (Ex: `CEL MENDES`).

---

## 4. Requisitos de Relatórios & Geração de PDF

A Diretoria de Saúde possui regras estritas de formatação protegida para o relatório gerado por gestores:

1. **Filtro de Status:** Apenas permutas com status `APROVADO` (homologadas pelo gestor) podem ser incluídas nos relatórios consolidados de exportação.
2. **Ordenação:** As permutas nos relatórios devem ser listadas obrigatoriamente por ordem cronológica crescente de `dataRealizacao`.
3. **Layout do Cabeçalho do PDF:**
   * **Título centralizado:** Texto multilinha contendo `"DIRETORIA DE SAÚDE"` e `"RELATÓRIO DE PERMUTAS"`.
   * **Brasões (Logos):** Tamanho exato de `logoSize = 55`.
   * **Posição dos Brasões:** 
     * Brasão Esquerdo: `x=45`, `y=20`.
     * Brasão Direito: `x=pageWidth - 45 - logoSize`, `y=20`.
   * **Linhas Separadoras:** Linha dupla desenhada nas posições `y=85` e `y=88` com a cor RGB `(200, 200, 200)`.
4. **Alinhamento e Largura da Tabela no PDF:**
   * **Alinhamento Geral:** Todas as colunas de dados devem possuir alinhamento centralizado obrigatório (`halign: 'center'`, `valign: 'middle'`).
   * **Coluna 0 (Turno):** Largura de célula fixada em `cellWidth: 45`.
   * **Coluna 1 (Data):** Largura de célula fixada em `cellWidth: 55`.
   * **Colunas 2 & 3:** Largura automática baseada no conteúdo.
   * **Coluna 4 (Homologação):** Largura fixa de `120` com tamanho de fonte `6.5`.

---

## 5. Auditoria de Segurança e Integridade (Blockchain Logs)

* **Rastreabilidade total:** Toda alteração de estado sensível no sistema (login, assinaturas de propostas, aceites, homologações ou rejeições de gestor) gera um registro de auditoria criptograficamente encadeado.
* **Integridade Hash:** Cada bloco de auditoria (`BlockchainLog`) contém:
  * `hashAnterior`: O hashSHA-like do bloco imediatamente anterior.
  * `hashAtual`: O hash do conteúdo do bloco corrente calculado com base no `hashAnterior`, gerando integridade matemática imutável (qualquer alteração física nos dados rompe a cadeia).
* **Regra de Exclusão de Auditoria:** O botão de exclusão ou limpeza de logs é restrito aos papéis de `COMANDANTE` e `ADMIN`.

---

## 6. Diretrizes para Scripts e Ferramentas de Testes Automatizados

Para configurar testes automatizados (como Cypress, Playwright, Selenium ou ferramentas baseadas em IA), utilize os seletores e cenários abaixo:

### 6.1. Casos de Teste Sugeridos (Cenários de Teste)

#### Cenário 1: Tentativa de Bypass de Data Limite (Teste de Entrada Inválida)
1. Efetuar login como `USUARIO`.
2. Acessar o fluxo de solicitação de permuta.
3. Tentar agendar uma permuta para a data de **hoje** ou para **daqui a 31 dias**.
4. **Resultado esperado:** O sistema deve exibir um pop-up de alerta contendo o termo `PROIBIDO` e impedir a submissão.

#### Cenário 2: Tentativa de Troca em Período de Afastamento (Validação Cruzada)
1. Adicionar um afastamento ativo ao Militar A para o período de `2026-07-10` a `2026-07-15`.
2. Autenticar como Militar A e tentar solicitar uma permuta para o dia `2026-07-12`.
3. **Resultado esperado:** O formulário deve barrar a submissão exibindo erro com a palavra `PROIBIDO`.

#### Cenário 3: Permissões de Exclusão de Log (Teste de Privilege Escalation)
1. Realizar login com usuário de perfil `USUARIO`.
2. Tentar acessar a URL ou o componente de Gestão/Auditoria.
3. Verificar que as ações de exclusão de logs individuais ou total (`onDeleteLog` ou `onClearLogs`) não estão renderizadas ou ativas para esse nível de privilégio.

#### Cenário 4: Geração e Layout do PDF
1. Acessar o painel de gestor como `COMANDANTE` ou `ADMIN`.
2. Ir para a aba de relatórios, filtrar as permutas e clicar para exportar o relatório oficial em PDF.
3. Verificar programaticamente (ou via teste visual) se as posições e dimensões dos brasões, as linhas separadoras `y=85/88` e as dimensões de células na tabela de dados respeitam estritamente as regras de layout estabelecidas na Seção 4.
