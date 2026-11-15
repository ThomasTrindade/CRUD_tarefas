import { mkdir, readFile, writeFile } from 'node:fs/promises';

const dataDirectory = new URL('../data/', import.meta.url);
const databaseFile = new URL('tasks.json', dataDirectory);

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
