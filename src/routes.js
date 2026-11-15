import { addTask } from './database.js';
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
];
