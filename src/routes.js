export const routes = [
  {
    method: 'GET',
    path: '/health',
    handler(request, response) {
      response.writeHead(200);
      response.end(JSON.stringify({ status: 'ok' }));
    },
  },
];
