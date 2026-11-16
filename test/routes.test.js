import assert from 'node:assert/strict';
import { once } from 'node:events';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
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
