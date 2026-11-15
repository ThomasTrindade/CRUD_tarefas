import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTask, updateTask } from '../src/task.js';

const storedTask = {
  id: '0b8c6cd8-48e8-45df-9dc8-663753bc9d59',
  title: 'Estudar Node.js',
  description: 'Praticar manipulação de arquivos.',
  completed_at: null,
  created_at: '2026-01-01T10:00:00.000Z',
  updated_at: '2026-01-01T10:00:00.000Z',
};

test('cria tarefas pendentes com identificadores próprios e datas automáticas', () => {
  const before = Date.now();
  const input = {
    title: 'Estudar Node.js',
    description: 'Praticar manipulação de arquivos.',
    id: 'id-fornecido',
    completed_at: '2026-01-01T10:00:00.000Z',
    created_at: '2026-01-01T10:00:00.000Z',
    updated_at: '2026-01-01T10:00:00.000Z',
  };
  const first = createTask(input);
  const second = createTask(input);
  const after = Date.now();

  assert.deepEqual(Object.keys(first).sort(), Object.keys(storedTask).sort());
  assert.match(first.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.notEqual(first.id, second.id);
  assert.equal(first.title, input.title);
  assert.equal(first.description, input.description);
  assert.equal(first.completed_at, null);
  assert.equal(first.created_at, first.updated_at);
  assert.equal(new Date(first.created_at).toISOString(), first.created_at);
  assert.ok(Date.parse(first.created_at) >= before);
  assert.ok(Date.parse(first.created_at) <= after);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
});

test('atualiza parcialmente uma tarefa persistida sem alterar sua identidade ou o original', () => {
  const original = Object.freeze({ ...storedTask });
  const before = Date.now();
  const updated = updateTask(original, {
    title: 'Revisar Node.js',
    id: 'outro-id',
    created_at: '2000-01-01T00:00:00.000Z',
    updated_at: '2000-01-01T00:00:00.000Z',
    unexpected: true,
  });
  const after = Date.now();

  assert.equal(updated.title, 'Revisar Node.js');
  assert.equal(updated.description, original.description);
  assert.equal(updated.completed_at, original.completed_at);
  assert.equal(updated.id, original.id);
  assert.equal(updated.created_at, original.created_at);
  assert.notEqual(updated.updated_at, original.updated_at);
  assert.ok(Date.parse(updated.updated_at) >= before);
  assert.ok(Date.parse(updated.updated_at) <= after);
  assert.equal(Object.hasOwn(updated, 'unexpected'), false);
  assert.deepEqual(original, storedTask);
});

test('atualiza a descrição preservando o título e a conclusão existente', () => {
  const completed = {
    ...storedTask,
    completed_at: '2026-01-02T10:00:00.000Z',
  };
  const updated = updateTask(completed, { description: 'Revisar arquivos JSON.' });

  assert.equal(updated.description, 'Revisar arquivos JSON.');
  assert.equal(updated.title, completed.title);
  assert.equal(updated.completed_at, completed.completed_at);
  assert.notEqual(updated.updated_at, completed.updated_at);
});

test('registra e remove a data de conclusão renovando a data de atualização', () => {
  const completedAt = '2026-01-02T10:00:00.000Z';
  const completed = updateTask(storedTask, { completed_at: completedAt });
  const reopened = updateTask(
    { ...completed, updated_at: storedTask.updated_at },
    { completed_at: null },
  );

  assert.equal(completed.completed_at, completedAt);
  assert.equal(reopened.completed_at, null);
  assert.notEqual(completed.updated_at, storedTask.updated_at);
  assert.notEqual(reopened.updated_at, storedTask.updated_at);
  assert.equal(reopened.id, storedTask.id);
  assert.equal(reopened.created_at, storedTask.created_at);
  assert.equal(reopened.title, storedTask.title);
  assert.equal(reopened.description, storedTask.description);
});
