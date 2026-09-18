# 🏫 Mapeador de Turmas - Diogolabs

> **Terminal logístico de alocação pseudo-aleatória de alunos com isolamento geométrico de conflitos.**

O **Mapeador de Turmas** é uma aplicação web focada em resolver um dos maiores problemas de gestão de sala de aula e espaços Maker: a distribuição física de alunos. Construído com Vanilla JavaScript e TailwindCSS, o motor matemático distribui alunos em carteiras respeitando regras complexas de agrupamento, colisões interpessoais e necessidades especiais.

---

## ✨ Funcionalidades Principais

### 1. Motor Geométrico Customizável
- Configuração de múltiplas salas.
- Definição livre da malha (Grid) de Fileiras (X) e Carteiras (Y).
- Agrupamento flexível: **Solo (Provas)**, **Duplas**, ou **Grupos Maker** (com tamanho customizável).
- Mistura de turmas configurável: *Caos Total (Ignorar)*, *Isolamento (Separar turmas)* ou *Blocos (Agrupar por turma)*.

### 2. Gestão de Alunos por Lote
- Adição rápida de turmas via Copiar/Colar (nome do aluno por linha).
- Arquitetura de "Duas Etapas": O professor insere todos os lotes de turmas e, em seguida, "Trava a Lista" para gerar o formulário de regras.
- *Nota de Produto: O suporte direto a arquivos CSV foi desativado na camada gratuita para compor uma futura funcionalidade SaaS/Premium em nuvem.*

### 3. Sistema de Regras de Alocação (Com Validação Soft-Lock)
O sistema conta com um poderoso verificador de matriz cruzada que impede a gravação de regras conflitantes no momento em que o usuário tenta salvar os grupos:
- 👁️ **Frente:** Alunos forçados a sentar na primeira fileira mais próxima à lousa.
- ♿ **PCD (Pessoas com Deficiência):** Tranca a carteira para uso exclusivo e adiciona a Tag Visual `[+ Auxiliar]`. Possui **peso matemático variável**, onde o professor decide se o auxiliar *consome* a vaga de outro colega no grupo maker ou se *conta como um elemento extra*.
- ✋ **Separar (Incompatíveis):** Criação de "Grupos de Conflito". O motor garante que alunos de um mesmo grupo de conflito nunca sentem na mesma mesa.
- 🔗 **Juntar (Inseparáveis):** Criação de pares ou times fechados que o algoritmo tentará sempre encaixar na mesma carteira geométrica.

### 4. Edição Fina e Renderização (Magia)
- **Mapa Interativo Visual:** Renderizado via HTML5 `<canvas>`.
- **Drag & Drop Lógico:** Caso o professor discorde do algoritmo, basta **clicar em um aluno no mapa e clicar em outra mesa** para realizar a troca de lugares instantaneamente, recalculando todas as tags.
- **Exportação em Alta Resolução (Ultra HD):** Botões de exportação convertem a tela do canvas para um arquivo `PNG` com multiplicador de escala (`SCALE=4`), garantindo impressão em folha A4 com nitidez perfeita.
- **Lista Detalhada:** Visualização do mapeamento em formato de texto para facilitar a chamada/presença.

### 5. UI/UX & Theming
- Estética Cyberpunk/Terminal inspirada no ecossistema Diogolabs.
- **Glitch Autônomo:** Logo com animação CSS `@keyframes` intermitente para atrair a atenção do usuário, revelando estado Neon no hover.
- **Tema Claro / Escuro Dinâmico:** Implementado via mapeamento nativo de Variáveis CSS (`:root`), permitindo a troca de paleta com um único clique (salvo via `localStorage`).
- **Manual Embutido:** Regras de uso disponíveis em um modal fluído sem necessidade de recarregar a página e perder o progresso.

---

## 🚀 Como Usar (Fluxo do Usuário)

1. **Setup Físico:** Defina a disciplina, a quantidade de salas e o número de fileiras/carteiras no painel esquerdo.
2. **Carregamento (Lotes):** 
   - Digite o identificador da turma (Ex: 901).
   - Cole a lista de nomes.
   - Clique em "Adicionar Turma". Repita até adicionar todas as turmas desejadas.
   - Clique em **"Confirmar Lista"**.
3. **Restrições:** Abra os modais de (Frente, PCD, Separar e Juntar). Marque as caixas e salve. Se houver discrepância geométrica (Ex: Aluno é PCD Isolado e também foi colocado em um grupo inseparável), a interface exibirá o erro na hora.
4. **Gerar Mapeamento:** O motor processa milhares de combinações aleatórias até encaixar a turma na geometria estipulada.
5. **Edição e Exportação:** Clique e ajuste o mapa manualmente, se necessário, e exporte o resultado final (PNG ou JSON).

---

## 🛠️ Tecnologias Utilizadas

- **HTML5** & **Tailwind CSS v3** (via CDN com configuração estendida in-file).
- **JavaScript (ES6+) Vanilla:** Sem frameworks. Todo o estado gerenciado na variável global `estadoAtual`.
- **HTML5 Canvas API:** Para renderização gráfica do mapa, feedback de seleção tracejada e buffer para exportação 4K.

---

## 📜 Histórico Recente (Changelog)

- **[UI] Tema Dinâmico:** Transição das cores puras do Tailwind para um sistema de mapeamento dinâmico em CSS Variável permitindo Modo Claro e Escuro sem poluir o markup do HTML.
- **[Lógica] Paradoxo do PCD:** Alteração do peso matemático do aluno PCD. Inclusão de dropdown seletor de "Auxiliar Ocupa ou Não Vaga", permitindo grupos Maker de tamanhos reais, sem "alunos fantasmas".
- **[Validação] Soft-Lock:** Remoção de checkboxes desabilitados dinamicamente (*hard-lock*). Implementação de checagem retroativa ao tentar fechar modais (*soft-lock*), melhorando drasticamente a experiência do usuário (UX).
- **[Negócios] Remoção do CSV:** Ocultamento intencional dos parsers de importação/exportação CSV da interface para agregação de valor ao futuro produto SaaS Cloud da Diogolabs.
- **[Renderização] Correção de Cores:** Ajuste do contraste de botões (Modo Claro vs Escuro) no cabeçalho do Modal e menus suspensos.
