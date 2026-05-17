# Integracao Frontend - Goals (Metas)

Este documento descreve como consumir a API de metas financeiras no backend.

## Objetivo

O recurso Goals permite criar e acompanhar metas como:

- Reserva de emergencia
- Viagem
- Compra de equipamento
- Qualquer objetivo com valor alvo e data limite

## Autenticacao

Todos os endpoints de Goals sao protegidos.

A API espera cookie HttpOnly com access_token, obtido no login.

Fluxo resumido:

1. POST /users (se necessario)
2. POST /auth/login
3. Consumir endpoints /goals enviando cookie access_token

## Base de rota

- Recurso: /goals

## Modelo de dados

Campos persistidos da meta:

- id: number
- title: string
- targetAmount: number
- currentAmount: number
- dueDate: string (ISO)
- createdAt: string (ISO)
- updatedAt: string (ISO)
- deletedAt: string (ISO) | null

Observacao:

- Soft delete: ao remover, deletedAt recebe data e o item deixa de aparecer nas listagens.

## Validacoes

Criacao e atualizacao seguem estas regras:

- title: obrigatorio na criacao, string, maximo 120 caracteres
- targetAmount: obrigatorio na criacao, numero, minimo 0.01
- currentAmount: opcional, numero, minimo 0
- dueDate: obrigatorio na criacao, data ISO valida

Na atualizacao (PATCH), todos os campos sao opcionais.

## Endpoints

### 1) Criar meta

- Metodo: POST
- Rota: /goals
- Body:

```json
{
  "title": "Reserva de Emergencia",
  "targetAmount": 10000,
  "currentAmount": 2500,
  "dueDate": "2026-12-31"
}
```

- Resposta 201 (exemplo):

```json
{
  "id": 1,
  "title": "Reserva de Emergencia",
  "targetAmount": 10000,
  "currentAmount": 2500,
  "dueDate": "2026-12-31T00:00:00.000Z",
  "createdAt": "2026-05-17T22:00:00.000Z",
  "updatedAt": "2026-05-17T22:00:00.000Z",
  "deletedAt": null,
  "userId": 12
}
```

### 2) Listar metas do usuario

- Metodo: GET
- Rota: /goals

- Resposta 200 (exemplo):

```json
[
  {
    "id": 1,
    "title": "Reserva de Emergencia",
    "targetAmount": 10000,
    "currentAmount": 2500,
    "dueDate": "2026-12-31T00:00:00.000Z",
    "createdAt": "2026-05-17T22:00:00.000Z",
    "updatedAt": "2026-05-17T22:00:00.000Z",
    "deletedAt": null,
    "userId": 12
  }
]
```

Ordenacao atual da API:

- dueDate ascendente
- createdAt descendente (desempate)

### 3) Buscar meta por ID

- Metodo: GET
- Rota: /goals/:id

- Resposta 200: objeto Goal
- Resposta 404: Meta nao encontrada

### 4) Atualizar meta

- Metodo: PATCH
- Rota: /goals/:id
- Body parcial (exemplo):

```json
{
  "currentAmount": 3000
}
```

- Resposta 200: objeto Goal atualizado

### 5) Remover meta (soft delete)

- Metodo: DELETE
- Rota: /goals/:id

- Resposta 200: objeto Goal com deletedAt preenchido

## Erros esperados

### 400 - Validacao

Exemplos comuns:

- title must be a string
- title must be shorter than or equal to 120 characters
- targetAmount must not be less than 0.01
- currentAmount must not be less than 0
- dueDate must be a valid ISO 8601 date string

### 401 - Nao autenticado

Sem cookie access_token valido.

### 404 - Meta nao encontrada

Quando o id nao existe, foi removido, ou pertence a outro usuario.

## Contrato sugerido para TypeScript no frontend

```ts
export type Goal = {
  id: number;
  title: string;
  targetAmount: number;
  currentAmount: number;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  userId: number;
};

export type CreateGoalPayload = {
  title: string;
  targetAmount: number;
  currentAmount?: number;
  dueDate: string;
};

export type UpdateGoalPayload = Partial<CreateGoalPayload>;
```

## Checklist para a tela

- Form de criacao:
  - title
  - targetAmount
  - currentAmount (opcional, default visual 0)
  - dueDate
- Listagem com progresso:
  - percentual = currentAmount / targetAmount * 100
- Botao editar com PATCH parcial
- Botao remover (DELETE)
- Tratar erros 400 com mensagens do backend
- Tratar 401 redirecionando para login

## Requests prontas no projeto

Veja exemplos de uso em:

- api_test.http
