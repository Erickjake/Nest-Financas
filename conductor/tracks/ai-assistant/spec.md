# Spec: Assistente de IA Financeiro

## Objetivo
Expandir as capacidades do assistente de IA para que ele possa realizar consultas mais complexas e ajudar o usuário em tarefas comuns de gestão financeira.

## Requisitos Funcionais
- [ ] **Consulta de Saldo:** Ferramenta para calcular o saldo total (Receitas - Despesas).
- [ ] **Análise de Gastos:** Identificar as categorias onde o usuário mais gastou em um período.
- [ ] **Gestão de Categorias:** Ferramenta para listar as categorias disponíveis para o usuário.
- [ ] **Melhoria de Tipagem:** Corrigir os `@ts-ignore` e `as any` no arquivo de ferramentas para garantir segurança de tipos.

## Critérios de Aceite
1. O usuário deve conseguir perguntar "Qual meu saldo atual?" e receber uma resposta correta.
2. O assistente deve conseguir listar categorias quando questionado sobre quais opções ele tem.
3. O código deve compilar sem erros de TypeScript no módulo de IA.
