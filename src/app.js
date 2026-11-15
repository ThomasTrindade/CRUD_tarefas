import { createServer } from 'node:http';
import { routes } from './routes.js';

export const app = createServer(async (request, response) => {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const { pathname } = new URL(request.url, 'http://localhost');
    const route = routes.find(
      (route) => route.method === request.method && route.path === pathname,
    );

    if (!route) {
      response.writeHead(404);
      response.end(JSON.stringify({ message: 'Rota não encontrada.' }));
      return;
    }

    await route.handler(request, response);
  } catch (error) {
    if (error.code === 'ERR_INVALID_URL') {
      response.writeHead(400);
      response.end(JSON.stringify({ message: 'URL inválida.' }));
      return;
    }

    console.error('Erro ao processar a requisição:', error);
    response.writeHead(500);
    response.end(JSON.stringify({ message: 'Erro interno do servidor.' }));
  }
});
