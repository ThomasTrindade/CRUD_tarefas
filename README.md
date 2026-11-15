# API de gerenciamento de tarefas

Projeto em Node.js para praticar CRUD e manipulação de arquivos, conforme o `prd.md`.

A Tarefa 01 prepara o servidor HTTP, o registro de rotas e o armazenamento JSON. As rotas de tarefas serão implementadas nas próximas etapas do PRD.

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
data/
  tasks.json   # Criado automaticamente ao iniciar a API
```

Os dados ficam em `data/tasks.json`, fora do controle de versão. O caminho é relativo ao código, permitindo executar o servidor a partir de outro diretório. Erros de leitura ou JSON inválido são propagados para evitar sobrescrever dados existentes.
