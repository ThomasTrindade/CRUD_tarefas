import { createServer } from 'node:http';
import { routes } from './routes.js';

export const app = createServer(async (request, response) => {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const { pathname } = new URL(request.url, 'http://localhost');
    const pathParts = pathname.split('/');
    const route = routes.find((route) => {
      if (route.method !== request.method) {
        return false;
      }

      const routeParts = route.path.split('/');

      return routeParts.length === pathParts.length && routeParts.every((part, index) => {
        if (part.startsWith(':')) {
          return pathParts[index] !== '';
        }

        return part === pathParts[index];
      });
    });

    if (!route) {
      response.writeHead(404);
      response.end(JSON.stringify({ message: 'Rota não encontrada.' }));
      return;
    }

    request.params = {};
    const routeParts = route.path.split('/');

    for (let index = 0; index < routeParts.length; index++) {
      if (routeParts[index].startsWith(':')) {
        const name = routeParts[index].slice(1);
        request.params[name] = pathParts[index];
      }
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
