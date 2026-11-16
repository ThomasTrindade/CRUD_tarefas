import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { updateTask } from './task.js';

const dataDirectory = new URL('../data/', import.meta.url);
const databaseFile = new URL('tasks.json', dataDirectory);
let saveQueue = Promise.resolve();

export async function readTasks() {
  try {
    const content = await readFile(databaseFile, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }

    await writeTasks([]);
    return [];
  }
}

export async function writeTasks(tasks) {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(databaseFile, `${JSON.stringify(tasks, null, 2)}\n`, 'utf8');
}

export function addTask(task) {
  // Salva uma tarefa por vez para não perder dados em requisições simultâneas.
  const save = saveQueue.then(async () => {
    const tasks = await readTasks();
    tasks.push(task);
    await writeTasks(tasks);
  });

  // Permite tentar novamente mesmo se uma gravação anterior falhar.
  saveQueue = save.catch(() => {});
  return save;
}

export function updateTaskById(id, { title, description }) {
  // Usa a mesma fila da criação para preservar alterações simultâneas.
  const save = saveQueue.then(async () => {
    const tasks = await readTasks();
    const index = tasks.findIndex((task) => task.id === id);

    if (index === -1) {
      return null;
    }

    const task = updateTask(tasks[index], { title, description });
    tasks[index] = task;
    await writeTasks(tasks);
    return task;
  });

  saveQueue = save.catch(() => {});
  return save;
}

export function deleteTaskById(id) {
  // Usa a mesma fila da criação e atualização para preservar os outros dados.
  const save = saveQueue.then(async () => {
    const tasks = await readTasks();
    const index = tasks.findIndex((task) => task.id === id);

    if (index === -1) {
      return null;
    }

    const [task] = tasks.splice(index, 1);
    await writeTasks(tasks);
    return task;
  });

  saveQueue = save.catch(() => {});
  return save;
}
