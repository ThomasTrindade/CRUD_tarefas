# API de gerenciamento de tarefas

Projeto em Node.js para praticar CRUD e manipulação de arquivos, conforme o `prd.md`.

As Tarefas 01 a 05 preparam o servidor HTTP, o registro de rotas, o armazenamento JSON, o modelo de tarefa e a criação, listagem, busca e atualização de tarefas pelas rotas `POST /tasks`, `GET /tasks` e `PUT /tasks/:id`.

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

## Criar uma tarefa

Envie uma requisição `POST http://localhost:3333/tasks` com `Content-Type: application/json` e o corpo:

```json
{
  "title": "Estudar Node.js",
  "description": "Praticar manipulação de arquivos."
}
```

A resposta será `201` com a tarefa criada. O servidor gera `id`, `created_at` e `updated_at`, inicia `completed_at` como `null` e salva a tarefa em `data/tasks.json`, preservando as anteriores.

No PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri 'http://localhost:3333/tasks' -ContentType 'application/json; charset=utf-8' -Body '{"title":"Estudar Node.js","description":"Praticar arquivos JSON."}'
```

JSON inválido ou um corpo que não seja um objeto JSON retorna `400`. A validação da presença de `title` e `description` está prevista na Tarefa 09 do PRD.

## Listar e buscar tarefas

Faça uma requisição `GET http://localhost:3333/tasks` para listar todas as tarefas salvas. A resposta será `200` com um array de tarefas, ou `[]` quando não houver tarefas.

Use os parâmetros da URL para buscar por trechos do título ou da descrição:

```text
GET /tasks?title=node
GET /tasks?description=arquivos
GET /tasks?title=node&description=arquivos
```

A busca ignora diferenças entre maiúsculas e minúsculas. Ao informar os dois parâmetros, serão retornadas apenas as tarefas que correspondam a ambos. Parâmetros vazios não filtram os resultados. Se nenhuma tarefa corresponder à busca, a resposta será `200` com `[]`.

No PowerShell:

```powershell
Invoke-RestMethod -Method Get -Uri 'http://localhost:3333/tasks?title=node&description=arquivos'
```

## Atualizar uma tarefa

Envie uma requisição `PUT http://localhost:3333/tasks/ID_DA_TAREFA` com `Content-Type: application/json` e o corpo:

```json
{
  "title": "Revisar Node.js"
}
```

É possível informar `title`, `description` ou ambos. A resposta será `200` com a tarefa atualizada e salva no arquivo JSON. Os campos não informados são preservados, e `updated_at` recebe a data da atualização. Os campos `id`, `created_at` e `completed_at` são preservados mesmo se enviados no corpo.

No PowerShell, substitua `ID_DA_TAREFA` pelo `id` retornado na criação:

```powershell
Invoke-RestMethod -Method Put -Uri 'http://localhost:3333/tasks/ID_DA_TAREFA' -ContentType 'application/json; charset=utf-8' -Body '{"title":"Revisar Node.js"}'
```

Se a tarefa não existir, a resposta será `404` com `{"message":"Tarefa não encontrada."}`. JSON inválido ou um corpo que não seja um objeto JSON retorna `400`. A validação dos valores de `title` e `description` continua prevista na Tarefa 09.

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
  routes.test.js # Verificação da criação, listagem, busca e atualização pela API
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
