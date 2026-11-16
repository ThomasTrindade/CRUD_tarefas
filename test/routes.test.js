import assert from 'node:assert/strict';
import { once } from 'node:events';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { pathToFileURL } from 'node:url';

let app;
let directory;
let url;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'crud-tarefas-test-'));
  await cp(new URL('../src/', import.meta.url), join(directory, 'src'), {
    recursive: true,
  });
  await cp(new URL('../package.json', import.meta.url), join(directory, 'package.json'));

  ({ app } = await import(pathToFileURL(join(directory, 'src/app.js')).href));
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  url = `http://127.0.0.1:${app.address().port}/tasks`;
});

afterEach(async () => {
  if (app?.listening) {
    await new Promise((resolve, reject) => {
      app.close((error) => (error ? reject(error) : resolve()));
    });
  }

  if (directory) {
    await rm(directory, { recursive: true, force: true });
  }
});

async function readSavedTasks() {
  const content = await readFile(join(directory, 'data/tasks.json'), 'utf8');
  return JSON.parse(content);
}

function postTask(body) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

function putTask(id, body) {
  return fetch(`${url}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

function deleteTask(id) {
  return fetch(`${url}/${id}`, { method: 'DELETE' });
}

async function createSavedTasks(inputs) {
  const tasks = [];

  for (const input of inputs) {
    const response = await postTask(JSON.stringify(input));
    assert.equal(response.status, 201);
    tasks.push(await response.json());
  }

  return tasks;
}

test('GET /tasks retorna uma lista vazia quando não há tarefas', async () => {
  const response = await fetch(url);

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await response.json(), []);
});

test('GET /tasks lista todas as tarefas salvas sem alterar seus dados', async () => {
  const tasks = await createSavedTasks([
    { title: 'Estudar Node.js', description: 'Praticar arquivos JSON.' },
    { title: 'Revisar o projeto', description: 'Conferir as rotas.' },
  ]);
  const response = await fetch(url);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), tasks);
  assert.deepEqual(await readSavedTasks(), tasks);
});

test('GET /tasks busca por trechos do título e da descrição e combina os filtros', async () => {
  const tasks = await createSavedTasks([
    { title: 'Estudar Node.js', description: 'Praticar manipulação de arquivos.' },
    { title: 'Revisar Node.js', description: 'Resolver exercícios de rotas.' },
    { title: 'Estudar JavaScript', description: 'Revisar arquivos JSON.' },
  ]);
  const searches = [
    { filters: { title: 'nOdE' }, expected: [tasks[0], tasks[1]] },
    { filters: { description: 'ARQUIVOS' }, expected: [tasks[0], tasks[2]] },
    { filters: { title: 'node', description: 'arquivos' }, expected: [tasks[0]] },
    { filters: { description: 'manipulação de arquivos' }, expected: [tasks[0]] },
    { filters: { title: 'arquivos' }, expected: [] },
    { filters: { description: 'Node.js' }, expected: [] },
    { filters: { title: 'node', description: 'JSON' }, expected: [] },
    { filters: { title: '', description: '' }, expected: tasks },
    { filters: { title: '', description: 'rotas' }, expected: [tasks[1]] },
  ];

  for (const { filters, expected } of searches) {
    const query = new URLSearchParams(filters);
    const response = await fetch(`${url}?${query}`);

    assert.equal(response.status, 200, `Busca: ${query}`);
    assert.deepEqual(await response.json(), expected, `Busca: ${query}`);
  }

  assert.deepEqual(await readSavedTasks(), tasks);
});

test('GET /tasks aceita registros com título ou descrição ausentes ou sem texto', async () => {
  const tasks = await createSavedTasks([
    {},
    { title: null, description: null },
    { title: 42, description: true },
    { title: 'Estudar Node.js' },
    { description: 'Praticar arquivos JSON.' },
  ]);
  const searches = [
    { filters: {}, expected: tasks },
    { filters: { title: 'node' }, expected: [tasks[3]] },
    { filters: { description: 'arquivos' }, expected: [tasks[4]] },
  ];

  for (const { filters, expected } of searches) {
    const response = await fetch(`${url}?${new URLSearchParams(filters)}`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), expected);
  }

  assert.deepEqual(await readSavedTasks(), tasks);
});

test('POST /tasks cria e salva tarefas com campos automáticos', async () => {
  const before = Date.now();
  const response = await postTask(JSON.stringify({
    title: 'Estudar Node.js',
    description: 'Praticar manipulação de arquivos.',
    id: 'id-fornecido',
    completed_at: '2000-01-01T00:00:00.000Z',
    created_at: '2000-01-01T00:00:00.000Z',
    updated_at: '2000-01-01T00:00:00.000Z',
    unexpected: true,
  }));
  const first = await response.json();
  const after = Date.now();

  assert.equal(response.status, 201);
  assert.match(first.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.deepEqual(Object.keys(first).sort(), [
    'completed_at', 'created_at', 'description', 'id', 'title', 'updated_at',
  ]);
  assert.equal(first.title, 'Estudar Node.js');
  assert.equal(first.description, 'Praticar manipulação de arquivos.');
  assert.equal(first.completed_at, null);
  assert.equal(first.created_at, first.updated_at);
  assert.equal(new Date(first.created_at).toISOString(), first.created_at);
  assert.ok(Date.parse(first.created_at) >= before);
  assert.ok(Date.parse(first.created_at) <= after);
  assert.deepEqual(await readSavedTasks(), [first]);

  const secondResponse = await postTask(JSON.stringify({
    title: 'Revisar o projeto',
    description: 'Conferir a criação de tarefas.',
  }));
  const second = await secondResponse.json();

  assert.equal(secondResponse.status, 201);
  assert.notEqual(second.id, first.id);
  assert.deepEqual(await readSavedTasks(), [first, second]);
});

test('POST /tasks preserva todas as tarefas em requisições simultâneas', async () => {
  const inputs = Array.from({ length: 8 }, (_, index) => ({
    title: `Tarefa ${index + 1}`,
    description: `Descrição ${index + 1}`,
  }));
  const tasks = await Promise.all(inputs.map(async (input) => {
    const response = await postTask(JSON.stringify(input));
    assert.equal(response.status, 201);
    return response.json();
  }));
  const savedTasks = await readSavedTasks();

  assert.equal(savedTasks.length, inputs.length);
  assert.equal(new Set(savedTasks.map((task) => task.id)).size, inputs.length);

  for (const task of tasks) {
    assert.deepEqual(savedTasks.find((saved) => saved.id === task.id), task);
  }
});

test('POST /tasks rejeita JSON inválido e corpos que não são objetos sem alterar os dados', async () => {
  const response = await postTask(JSON.stringify({
    title: 'Tarefa existente',
    description: 'Deve permanecer salva.',
  }));
  assert.equal(response.status, 201);
  await response.json();
  const savedTasks = await readSavedTasks();

  for (const body of ['{"title":', '', 'null', '[]', '"texto"', '42', 'true']) {
    const invalidResponse = await postTask(body);
    const error = await invalidResponse.json();

    assert.equal(invalidResponse.status, 400, `Corpo recebido: ${body}`);
    assert.equal(typeof error.message, 'string');
    assert.deepEqual(await readSavedTasks(), savedTasks);
  }
});

test('PUT /tasks/:id atualiza os campos informados e preserva os demais dados', async () => {
  const tasks = await createSavedTasks([
    { title: 'Estudar Node.js', description: 'Praticar arquivos JSON.' },
    { title: 'Outra tarefa', description: 'Deve permanecer igual.' },
  ]);
  tasks[0].created_at = '2026-01-01T10:00:00.000Z';
  tasks[0].completed_at = '2026-01-02T10:00:00.000Z';
  tasks[0].updated_at = tasks[0].completed_at;
  await writeFile(join(directory, 'data/tasks.json'), JSON.stringify(tasks), 'utf8');

  const changes = [
    { title: 'Revisar Node.js' },
    { description: 'Conferir a atualização de tarefas.' },
    { title: 'Revisar o projeto', description: 'Conferir as rotas.' },
    { title: '', description: '' },
  ];

  for (const change of changes) {
    const before = Date.now();
    const response = await putTask(tasks[0].id, JSON.stringify({
      ...change,
      id: 'outro-id',
      created_at: '2000-01-01T00:00:00.000Z',
      completed_at: null,
      updated_at: '2000-01-01T00:00:00.000Z',
      unexpected: true,
    }));
    const updated = await response.json();
    const after = Date.now();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.equal(new Date(updated.updated_at).toISOString(), updated.updated_at);
    assert.ok(Date.parse(updated.updated_at) >= before);
    assert.ok(Date.parse(updated.updated_at) <= after);
    assert.deepEqual(updated, {
      ...tasks[0],
      ...change,
      updated_at: updated.updated_at,
    });

    tasks[0] = updated;
    assert.deepEqual(await readSavedTasks(), tasks);
    const listResponse = await fetch(url);
    assert.equal(listResponse.status, 200);
    assert.deepEqual(await listResponse.json(), tasks);
  }
});

test('PUT /tasks/:id retorna 404 para uma tarefa inexistente sem alterar os dados', async () => {
  const tasks = await createSavedTasks([
    { title: 'Tarefa existente', description: 'Deve permanecer salva.' },
  ]);
  const response = await putTask('id-inexistente', JSON.stringify({ title: 'Novo título' }));

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { message: 'Tarefa não encontrada.' });
  assert.deepEqual(await readSavedTasks(), tasks);
});

test('PUT /tasks/:id rejeita JSON inválido e corpos que não são objetos sem alterar os dados', async () => {
  const tasks = await createSavedTasks([
    { title: 'Tarefa existente', description: 'Deve permanecer salva.' },
  ]);

  for (const body of ['{"title":', '', 'null', '[]', '"texto"', '42', 'true']) {
    const response = await putTask(tasks[0].id, body);
    const error = await response.json();

    assert.equal(response.status, 400, `Corpo recebido: ${body}`);
    assert.equal(typeof error.message, 'string');
    assert.deepEqual(await readSavedTasks(), tasks);
  }
});

test('PUT e POST preservam todas as tarefas em requisições simultâneas', async () => {
  const tasks = await createSavedTasks([
    { title: 'Primeira tarefa', description: 'Primeira descrição.' },
    { title: 'Segunda tarefa', description: 'Segunda descrição.' },
    { title: 'Terceira tarefa', description: 'Terceira descrição.' },
  ]);
  const newTask = { title: 'Nova tarefa', description: 'Criada durante as atualizações.' };
  const responses = await Promise.all([
    ...tasks.map((task) => putTask(task.id, JSON.stringify({ title: `${task.title} atualizada` }))),
    postTask(JSON.stringify(newTask)),
  ]);
  const savedTasks = await readSavedTasks();

  assert.equal(savedTasks.length, tasks.length + 1);

  for (let index = 0; index < tasks.length; index += 1) {
    const response = responses[index];
    const updated = await response.json();

    assert.equal(response.status, 200);
    assert.equal(updated.title, `${tasks[index].title} atualizada`);
    assert.equal(updated.description, tasks[index].description);
    assert.deepEqual(savedTasks.find((task) => task.id === updated.id), updated);
  }

  const createdResponse = responses[tasks.length];
  const created = await createdResponse.json();
  assert.equal(createdResponse.status, 201);
  assert.equal(created.title, newTask.title);
  assert.equal(created.description, newTask.description);
  assert.deepEqual(savedTasks.find((task) => task.id === created.id), created);
});

test('PUT preserva mudanças parciais simultâneas na mesma tarefa', async () => {
  const [task] = await createSavedTasks([
    { title: 'Título original', description: 'Descrição original.' },
  ]);
  const responses = await Promise.all([
    putTask(task.id, JSON.stringify({ title: 'Título atualizado' })),
    putTask(task.id, JSON.stringify({ description: 'Descrição atualizada.' })),
  ]);

  for (const response of responses) {
    assert.equal(response.status, 200);
    await response.json();
  }

  const savedTasks = await readSavedTasks();
  assert.equal(savedTasks.length, 1);
  assert.deepEqual(savedTasks[0], {
    ...task,
    title: 'Título atualizado',
    description: 'Descrição atualizada.',
    updated_at: savedTasks[0].updated_at,
  });
});

test('DELETE /tasks/:id remove apenas a tarefa informada e preserva as demais', async () => {
  const tasks = await createSavedTasks([
    { title: 'Primeira tarefa', description: 'Deve permanecer igual.' },
    { title: 'Segunda tarefa', description: 'Será removida.' },
    { title: 'Terceira tarefa', description: 'Deve permanecer igual.' },
  ]);
  const response = await deleteTask(tasks[1].id);

  assert.equal(response.status, 204);
  assert.equal(await response.text(), '');
  assert.deepEqual(await readSavedTasks(), [tasks[0], tasks[2]]);

  const listResponse = await fetch(url);
  assert.equal(listResponse.status, 200);
  assert.deepEqual(await listResponse.json(), [tasks[0], tasks[2]]);
});

test('DELETE /tasks/:id remove a última tarefa e salva uma lista vazia', async () => {
  const [task] = await createSavedTasks([
    { title: 'Única tarefa', description: 'Será removida.' },
  ]);
  const response = await deleteTask(task.id);

  assert.equal(response.status, 204);
  assert.equal(await response.text(), '');
  assert.deepEqual(await readSavedTasks(), []);

  const listResponse = await fetch(url);
  assert.equal(listResponse.status, 200);
  assert.deepEqual(await listResponse.json(), []);
});

test('DELETE /tasks/:id retorna 404 para id inexistente ou já removido sem alterar os dados', async () => {
  const tasks = await createSavedTasks([
    { title: 'Tarefa mantida', description: 'Deve permanecer salva.' },
    { title: 'Tarefa removida', description: 'Será removida uma vez.' },
  ]);
  const missingResponse = await deleteTask('id-inexistente');

  assert.equal(missingResponse.status, 404);
  assert.deepEqual(await missingResponse.json(), { message: 'Tarefa não encontrada.' });
  assert.deepEqual(await readSavedTasks(), tasks);

  const removedResponse = await deleteTask(tasks[1].id);
  assert.equal(removedResponse.status, 204);
  await removedResponse.text();

  const repeatedResponse = await deleteTask(tasks[1].id);
  assert.equal(repeatedResponse.status, 404);
  assert.deepEqual(await repeatedResponse.json(), { message: 'Tarefa não encontrada.' });
  assert.deepEqual(await readSavedTasks(), [tasks[0]]);
});

test('DELETE, PUT e POST preservam as alterações em requisições simultâneas', async () => {
  const tasks = await createSavedTasks([
    { title: 'Primeira tarefa', description: 'Será removida.' },
    { title: 'Segunda tarefa', description: 'Será atualizada.' },
    { title: 'Terceira tarefa', description: 'Será removida.' },
  ]);
  const newTask = { title: 'Nova tarefa', description: 'Criada durante as remoções.' };
  const [firstResponse, updatedResponse, thirdResponse, createdResponse] = await Promise.all([
    deleteTask(tasks[0].id),
    putTask(tasks[1].id, JSON.stringify({ title: 'Título atualizado' })),
    deleteTask(tasks[2].id),
    postTask(JSON.stringify(newTask)),
  ]);

  assert.equal(firstResponse.status, 204);
  assert.equal(await firstResponse.text(), '');
  assert.equal(thirdResponse.status, 204);
  assert.equal(await thirdResponse.text(), '');
  assert.equal(updatedResponse.status, 200);
  const updated = await updatedResponse.json();
  assert.deepEqual(updated, {
    ...tasks[1],
    title: 'Título atualizado',
    updated_at: updated.updated_at,
  });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  assert.equal(created.title, newTask.title);
  assert.equal(created.description, newTask.description);
  assert.deepEqual(await readSavedTasks(), [updated, created]);
});

test('DELETE simultâneo da mesma tarefa remove uma vez e retorna 404 na outra requisição', async () => {
  const tasks = await createSavedTasks([
    { title: 'Tarefa removida', description: 'Será removida uma vez.' },
    { title: 'Tarefa mantida', description: 'Deve permanecer igual.' },
  ]);
  const responses = await Promise.all([
    deleteTask(tasks[0].id),
    deleteTask(tasks[0].id),
  ]);

  assert.deepEqual(responses.map((response) => response.status).sort(), [204, 404]);

  for (const response of responses) {
    if (response.status === 204) {
      assert.equal(await response.text(), '');
    } else {
      assert.deepEqual(await response.json(), { message: 'Tarefa não encontrada.' });
    }
  }

  assert.deepEqual(await readSavedTasks(), [tasks[1]]);
});
