# API de gerenciamento de tarefas

Projeto em Node.js para praticar CRUD e manipulação de arquivos, conforme o `prd.md`.

As Tarefas 01 a 07 preparam o servidor HTTP, o registro de rotas, o armazenamento JSON, o modelo de tarefa e a criação, listagem, busca, atualização, remoção e alternância da conclusão de tarefas pelas rotas `POST /tasks`, `GET /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id` e `PATCH /tasks/:id/complete`.

A Tarefa 08 adiciona o script `import-csv.js` para importar tarefas de um CSV pela rota `POST /tasks`.

A Tarefa 09 valida os campos `title` e `description` na criação e na atualização de tarefas.

A Tarefa 10 retorna `404` com a mensagem `Tarefa não encontrada.` quando o ID não existe nas rotas de atualização, remoção e conclusão.

## Requisitos

- Node.js 22 ou superior.
- Biblioteca `csv-parse`, instalada com `npm install` (ou `npm.cmd install` no PowerShell).

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

Os campos `title` e `description` são obrigatórios e devem ser textos não vazios. Valores `null`, números, booleanos, objetos, arrays, textos vazios ou compostos apenas por espaços em branco retornam `400`. JSON inválido ou um corpo que não seja um objeto JSON também retorna `400`.

O erro informa o campo inválido, por exemplo: `{"message":"O campo title deve ser um texto não vazio."}`. Nenhuma tarefa é criada em caso de erro. Espaços e quebras de linha em textos válidos são preservados.

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

Informe pelo menos um dos campos `title` ou `description`, usando texto não vazio. Apenas os campos enviados são validados. Valores inválidos seguem as mesmas regras da criação e retornam `400`, sem alterar os dados salvos, incluindo `updated_at`. Um objeto vazio ou contendo somente outros campos retorna `400` com `{"message":"Informe title e/ou description para atualizar a tarefa."}`.

Se os dados forem válidos e a tarefa não existir, a resposta será `404` com `{"message":"Tarefa não encontrada."}`. JSON inválido ou um corpo que não seja um objeto JSON retorna `400`.

## Remover uma tarefa

Envie uma requisição `DELETE http://localhost:3333/tasks/ID_DA_TAREFA`, substituindo `ID_DA_TAREFA` pelo `id` retornado na criação. Não é necessário enviar um corpo.

No PowerShell:

```powershell
Invoke-RestMethod -Method Delete -Uri 'http://localhost:3333/tasks/ID_DA_TAREFA'
```

A resposta será `204`, sem corpo. A tarefa será removida do arquivo JSON, preservando as demais tarefas. Se o ID não existir, a resposta será `404` com `{"message":"Tarefa não encontrada."}`.

## Alternar a conclusão de uma tarefa

Envie uma requisição `PATCH http://localhost:3333/tasks/ID_DA_TAREFA/complete`, substituindo `ID_DA_TAREFA` pelo `id` retornado na criação. Não é necessário enviar um corpo.

No PowerShell:

```powershell
Invoke-RestMethod -Method Patch -Uri 'http://localhost:3333/tasks/ID_DA_TAREFA/complete'
```

Se a tarefa estiver pendente, `completed_at` recebe a data atual em formato ISO 8601. Se já estiver concluída, `completed_at` volta a ser `null`. Cada requisição alterna o status e atualiza `updated_at`, preservando os demais dados.

A resposta será `200` com a tarefa atualizada e salva no arquivo JSON. Se o ID não existir, a resposta será `404` com `{"message":"Tarefa não encontrada."}`.

## Importar tarefas de um CSV

Com a API em execução (`npm.cmd start`), abra outro terminal na pasta do projeto e execute:

```powershell
npm.cmd run import:csv -- tasks.csv
```

O arquivo `tasks.csv` contém cinco tarefas de exemplo. Para importar outro arquivo, informe seu caminho. Use aspas se o caminho contiver espaços:

```powershell
npm.cmd run import:csv -- "C:\arquivos\minhas tarefas.csv"
```

O CSV deve usar UTF-8, vírgula como separador e o cabeçalho `title,description`, nesta ordem:

```csv
title,description
Estudar Node.js,Praticar arquivos JSON.
Revisar projeto,"Conferir rotas, testes e documentação."
```

O script usa `csv-parse` e `for await`, ignora o cabeçalho e as linhas vazias e envia uma requisição `POST /tasks` por registro. Campos com vírgulas ou quebras de linha devem ficar entre aspas duplas. Cada registro deve ter dois campos com texto não vazio. Um campo vazio ou composto apenas por espaços em branco faz a API retornar `400` e interrompe a importação.

A URL padrão é `http://localhost:3333`. O script também respeita `PORT`, se definida no terminal da importação. Para informar outra URL da API:

```powershell
npm.cmd run import:csv -- tasks.csv http://localhost:3000
```

Ao terminar, o script informa a quantidade importada. Se houver erro no arquivo ou na API, ele interrompe a importação, informa quantas tarefas foram importadas e encerra com código `1`. As tarefas já criadas permanecem salvas. Executar o mesmo arquivo novamente cria novas tarefas, inclusive para registros já importados.

## Estrutura

```text
import-csv.js  # Importação de tarefas do CSV pela API
tasks.csv      # Arquivo CSV de exemplo
src/
  app.js       # Servidor HTTP e encaminhamento das requisições
  server.js    # Inicialização do armazenamento e da porta HTTP
  routes.js    # Registro das rotas
  database.js  # Leitura e gravação do arquivo JSON
  task.js      # Estrutura, criação e atualização dos dados de uma tarefa
test/
  task.test.js # Verificação das regras do modelo
  routes.test.js # Verificação da criação, listagem, busca, atualização, remoção e conclusão pela API
  import-csv.test.js # Verificação da importação e dos erros do CSV e da API
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

Os testes verificam as regras do modelo, as rotas da API e a importação de CSV, incluindo a conclusão e a reabertura de tarefas, o retorno para ID inexistente, a persistência dos dados, as alterações simultâneas, a validação dos campos e os erros de importação.
