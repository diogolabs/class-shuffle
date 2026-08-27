# Embaralhador de Turmas para Provas

Um aplicativo web para organizar alunos em salas de aula durante provas, respeitando regras de proximidade e agrupamento.

## 🎯 Funcionalidades

- ✅ Definir disciplina e dados da prova
- ✅ Importar lista de alunos (manual ou via textarea)
- ✅ Configurar salas, fileiras e carteiras
- ✅ Escolher tipo de agrupamento (solo, dupla, grupo)
- ✅ Definir regras de mapeamento:
  - Alunos/duplas/grupos que precisam sentar perto do professor
  - Alunos da mesma turma que podem sentar juntos
  - Separação de alunos com necessidades especiais
- ✅ Visualizar o embaralhamento em mapa interativo
- ✅ Exportar resultado em PDF ou imprimir

## 🚀 Como usar

1. Abra o arquivo `index.html` em seu navegador
2. Preencha os campos:
   - **Disciplina**: Nome da prova (ex: Matemática)
   - **Alunos**: Lista de nomes (um por linha)
   - **Configuração das Salas**: Número de salas, fileiras e carteiras
   - **Agrupamento**: Solo, dupla ou grupo
   - **Regras**: Marque as restrições necessárias
3. Clique em **Embaralhar**
4. Visualize o resultado no mapa interativo
5. Imprima ou exporte conforme necessário

## 📋 Requisitos

- Navegador moderno (Chrome, Firefox, Safari, Edge)
- JavaScript habilitado
- Sem dependências externas

## 📁 Estrutura

```
embaralhador-turmas/
├── index.html       # Aplicação completa (HTML + CSS + JS)
├── README.md        # Este arquivo
├── .gitignore       # Configuração do Git
└── LICENSE          # Licença (opcional)
```

## 🛠️ Desenvolvimento

Não há dependências para instalar. Apenas abra `index.html` em um navegador.

Para fazer deploy:
1. Faça push para GitHub
2. Conecte com Vercel (https://vercel.com)
3. Selecione o repositório
4. Deploy automático em cada push

## 💡 Dicas

- **Carregar CSV**: Copie a coluna de alunos do Excel e cole na área de texto
- **Alunos especiais**: Marque "Sentar perto do professor" para alunos que precisam de atenção extra
- **Turmas mistas**: Marque "Mesma turma pode sentar junta" para permitir agrupamentos da mesma sala
- **Visualizar antes**: Sempre revise o mapa antes de imprimir

## 📝 Changelog

### v1.0.0 (2026-08-27)
- Versão inicial com todas as funcionalidades básicas

## 👨‍💻 Desenvolvido por

DiogoLabs - Soluções em Tecnologia Educacional

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes
