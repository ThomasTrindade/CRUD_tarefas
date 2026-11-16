import { addTask, deleteTaskById, readTasks, updateTaskById } from './database.js';
import { createTask } from './task.js';

export const routes = [
  {
    method: 'GET',
    path: '/health',
    handler(request, response) {
      response.writeHead(200);
      response.end(JSON.stringify({ status: 'ok' }));
    },
  },
  {
    method: 'GET',
    path: '/tasks',
    async handler(request, response) {
      const { searchParams } = new URL(request.url, 'http://localhost');
      const title = (searchParams.get('title') ?? '').toLowerCase();
      const description = (searchParams.get('description') ?? '').toLowerCase();
      const tasks = await readTasks();

      const filteredTasks = tasks.filter((task) => {
        const taskTitle = String(task.title ?? '').toLowerCase();
        const taskDescription = String(task.description ?? '').toLowerCase();

        return taskTitle.includes(title) && taskDescription.includes(description);
      });

      response.writeHead(200);
      response.end(JSON.stringify(filteredTasks));
    },
  },
  {
    method: 'POST',
    path: '/tasks',
    async handler(request, response) {
      const chunks = [];

      for await (const chunk of request) {
        chunks.push(chunk);
      }

      let data;

      try {
        data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        response.writeHead(400);
        response.end(JSON.stringify({ message: 'JSON inválido.' }));
        return;
      }

      if (data === null || typeof data !== 'object' || Array.isArray(data)) {
        response.writeHead(400);
        response.end(JSON.stringify({ message: 'O corpo deve ser um objeto JSON.' }));
        return;
      }

      const task = createTask(data);
      await addTask(task);

      response.writeHead(201);
      response.end(JSON.stringify(task));
    },
  },
  {
    method: 'PUT',
    path: '/tasks/:id',
    async handler(request, response) {
      const { id } = request.params;
      const chunks = [];

      for await (const chunk of request) {
        chunks.push(chunk);
      }

      let data;

      try {
        data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        response.writeHead(400);
        response.end(JSON.stringify({ message: 'JSON inválido.' }));
        return;
      }

      if (data === null || typeof data !== 'object' || Array.isArray(data)) {
        response.writeHead(400);
        response.end(JSON.stringify({ message: 'O corpo deve ser um objeto JSON.' }));
        return;
      }

      const task = await updateTaskById(id, data);

      if (!task) {
        response.writeHead(404);
        response.end(JSON.stringify({ message: 'Tarefa não encontrada.' }));
        return;
      }

      response.writeHead(200);
      response.end(JSON.stringify(task));
    },
  },
  {
    method: 'DELETE',
    path: '/tasks/:id',
    async handler(request, response) {
      const { id } = request.params;
      const task = await deleteTaskById(id);

      if (!task) {
        response.writeHead(404);
        response.end(JSON.stringify({ message: 'Tarefa não encontrada.' }));
        return;
      }

      response.writeHead(204);
      response.end();
    },
  },
];
