# PRD — API de gerenciamento de tarefas

## Objetivo

Criar uma API em Node.js para gerenciar tarefas, aplicando os conceitos de CRUD (Create, Read, Update, Delete) e manipulação de arquivos.

Cada bloco abaixo representa uma tarefa de implementação. As tarefas 09 e 10 são melhorias opcionais.

---

## Tarefa 01 — Preparar a estrutura da API

- [x] Criar o projeto da API em Node.js.
- [x] Preparar a estrutura para receber requisições HTTP e implementar as rotas de tarefas.
- [x] Preparar a manipulação de arquivos necessária ao projeto.

---

## Tarefa 02 — Definir a estrutura de uma tarefa

- [x] Definir o campo `id` como um identificador único para cada tarefa.
- [x] Definir o campo `title` para armazenar o título da tarefa.
- [x] Definir o campo `description` para armazenar a descrição detalhada da tarefa.
- [x] Definir o campo `completed_at` para armazenar a data de conclusão, iniciando como `null`.
- [x] Definir o campo `created_at` para armazenar a data de criação.
- [x] Definir o campo `updated_at` para armazenar a data da última atualização e alterá-lo a cada modificação.

---

## Tarefa 03 — Criar uma tarefa

**Rota:** `POST /tasks`

**Checklist de implementação:**

- [ ] Desenvolver a rota `POST /tasks` para criar uma nova tarefa.

**Detalhamento:**

- [ ] Receber `title` e `description` no corpo da requisição.
- [ ] Criar uma nova tarefa com os dados recebidos.
- [ ] Gerar automaticamente o `id` único.
- [ ] Preencher automaticamente `created_at` e `updated_at`.
- [ ] Inicializar `completed_at` como `null`.

---

## Tarefa 04 — Listar e buscar tarefas

**Rota:** `GET /tasks`

**Checklist de implementação:**

- [ ] Desenvolver a rota `GET /tasks` para listar todas as tarefas.
- [ ] Implementar a funcionalidade de busca por `title` e `description` na rota `GET /tasks`.

**Detalhamento:**

- [ ] Listar todas as tarefas existentes.
- [ ] Permitir a busca por tarefas pelo campo `title`.
- [ ] Permitir a busca por tarefas pelo campo `description`.

---

## Tarefa 05 — Atualizar uma tarefa

**Rota:** `PUT /tasks/:id`

**Checklist de implementação:**

- [ ] Desenvolver a rota `PUT /tasks/:id` para atualizar uma tarefa.
- [ ] Adicionar a validação de existência do `id` na rota `PUT /tasks/:id`.

**Detalhamento:**

- [ ] Receber o `id` da tarefa pelos parâmetros da rota.
- [ ] Validar se a tarefa existe antes de atualizá-la.
- [ ] Receber `title` e/ou `description` no corpo da requisição.
- [ ] Atualizar apenas os campos informados, preservando os demais dados.
- [ ] Atualizar o campo `updated_at` após a modificação.

---

## Tarefa 06 — Remover uma tarefa

**Rota:** `DELETE /tasks/:id`

**Checklist de implementação:**

- [ ] Desenvolver a rota `DELETE /tasks/:id` para remover uma tarefa.
- [ ] Adicionar a validação de existência do `id` na rota `DELETE /tasks/:id`.

**Detalhamento:**

- [ ] Receber o `id` da tarefa pelos parâmetros da rota.
- [ ] Validar se a tarefa existe antes de removê-la.
- [ ] Remover a tarefa correspondente ao `id` informado.

---

## Tarefa 07 — Alternar a conclusão de uma tarefa

**Rota informada no PRD original:** `PATCH /tasks/:id/completea`

> Ponto de atenção: confirmar se o sufixo `completea` é intencional ou se a rota deve ser `PATCH /tasks/:id/complete`.

**Checklist de implementação:**

- [ ] Desenvolver a rota `PATCH /tasks/:id/complete` para marcar uma tarefa como concluída/pendente.
- [ ] Adicionar a validação de existência do `id` na rota `PATCH /tasks/:id/complete`.

**Detalhamento:**

- [ ] Receber o `id` da tarefa pelos parâmetros da rota.
- [ ] Validar se a tarefa existe antes de alterar seu status.
- [ ] Marcar uma tarefa como concluída, preenchendo `completed_at` com a data de conclusão.
- [ ] Marcar uma tarefa concluída como não concluída, retornando `completed_at` para `null`.
- [ ] Atualizar o campo `updated_at` após a mudança de status.

---

## Tarefa 08 — Importar tarefas de um arquivo CSV

**Implementação sugerida:** script separado chamado `import-csv.js`.

**Checklist de implementação:**

- [ ] Criar um script separado para a importação de tarefas.
- [ ] Utilizar a biblioteca `csv-parse` para ler o arquivo CSV.
- [ ] Implementar a lógica de enviar requisição para `POST /tasks` para cada linha do CSV no script de importação.

**Detalhamento:**

- [ ] Instalar a biblioteca `csv-parse` com o gerenciador de pacotes de preferência.
- [ ] Criar um script separado para ler o arquivo CSV.
- [ ] Processar o CSV com o parser da biblioteca e um iterador assíncrono, utilizando `for await`.
- [ ] Pular a primeira linha do CSV, que contém o cabeçalho.
- [ ] Extrair os campos `title` e `description` de cada linha.
- [ ] Realizar uma requisição para `POST /tasks` para cada linha, enviando os campos necessários no corpo da requisição.

**Formato recomendado do CSV:**

```csv
title,description
Task 01,Descrição da Task 01
Task 02,Descrição da Task 02
Task 03,Descrição da Task 03
Task 04,Descrição da Task 04
Task 05,Descrição da Task 05
```

**Referência de implementação:** aplicar a abordagem com `for await` apresentada no arquivo `stream-http-server.js` das aulas ao parser da biblioteca `csv-parse`.

---

## Tarefa 09 — Validar os dados recebidos (opcional)

- [ ] Validar a presença de `title` e `description` no corpo das requisições de criação (`POST /tasks`).
- [ ] Validar os campos recebidos nas requisições de atualização (`PUT /tasks/:id`), respeitando a regra de permitir `title` e/ou `description`.

---

## Tarefa 10 — Informar quando uma tarefa não existir (opcional)

- [ ] Retornar uma mensagem informando que o registro não existe quando o `id` não for encontrado em `PUT /tasks/:id`.
- [ ] Retornar uma mensagem informando que o registro não existe quando o `id` não for encontrado em `DELETE /tasks/:id`.
- [ ] Retornar uma mensagem informando que o registro não existe quando o `id` não for encontrado na rota `PATCH` de conclusão.
