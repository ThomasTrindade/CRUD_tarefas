# API de gerenciamento de tarefas

Projeto em Node.js para praticar CRUD e manipulação de arquivos, conforme o `prd.md`.

As Tarefas 01 e 02 preparam o servidor HTTP, o registro de rotas, o armazenamento JSON e o modelo de tarefa. As rotas de tarefas serão implementadas nas próximas etapas do PRD.

## Requisitos

- Node.js 22 ou superior.
- Nenhuma dependência externa nesta etapa.

## Executar

```sh
npm start
```

Para reiniciar automaticamente ao editar o código:

```sh
npm run dev
```

No PowerShell, caso a política de execução bloqueie `npm.ps1`, use `npm.cmd start` ou `npm.cmd run dev`.

A porta padrão é `3333`. Para usar outra porta no PowerShell:

```powershell
$env:PORT = '3000'
npm.cmd start
```

## Verificar o servidor

Faça uma requisição `GET http://localhost:3333/health`. A resposta será `200` com:

```json
{ "status": "ok" }
```

Rotas ainda não implementadas retornam `404` com uma mensagem em JSON.

## Estrutura

```text
src/
  app.js       # Servidor HTTP e encaminhamento das requisições
  server.js    # Inicialização do armazenamento e da porta HTTP
  routes.js    # Registro das rotas
  database.js  # Leitura e gravação do arquivo JSON
  task.js      # Estrutura, criação e atualização dos dados de uma tarefa
test/
  task.test.js # Verificação das regras do modelo
data/
  tasks.json   # Criado automaticamente ao iniciar a API
```

Os dados ficam em `data/tasks.json`, fora do controle de versão. O caminho é relativo ao código, permitindo executar o servidor a partir de outro diretório. Erros de leitura ou JSON inválido são propagados para evitar sobrescrever dados existentes.

## Modelo de tarefa

O módulo `src/task.js` exporta `createTask` e `updateTask`. As tarefas são objetos compatíveis com o armazenamento JSON:

```js
import { createTask, updateTask } from './src/task.js';

const task = createTask({
  title: 'Estudar Node.js',
  description: 'Praticar manipulação de arquivos.',
});

const updatedTask = updateTask(task, { title: 'Revisar Node.js' });
```

Cada tarefa contém `id` (UUID gerado automaticamente), `title`, `description`, `completed_at`, `created_at` e `updated_at`. As datas usam o formato ISO 8601 em UTC. Na criação, `completed_at` é `null` e as datas de criação e atualização são iguais.

`updateTask` retorna um novo objeto, preserva `id` e `created_at`, altera apenas os campos mutáveis informados (`title`, `description` e `completed_at`) e renova `updated_at`. Para remover a data de conclusão, informe `completed_at: null`. As funções retornam os dados; a gravação continua a cargo de `writeTasks`.

## Testes

```sh
npm test
```

No PowerShell, também é possível usar `npm.cmd test`.
