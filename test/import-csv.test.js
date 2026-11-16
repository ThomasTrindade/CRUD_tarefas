import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { once } from 'node:events';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const script = fileURLToPath(new URL('../import-csv.js', import.meta.url));
let directory;
let server;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'crud-tarefas-csv-test-'));
});

afterEach(async () => {
  if (server?.listening) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  server = undefined;

  if (directory) {
    const path = resolve(directory);
    assert.equal(dirname(path), resolve(tmpdir()));
    assert.ok(basename(path).startsWith('crud-tarefas-csv-test-'));
    await rm(path, { recursive: true, force: true });
  }
});

async function listen(app, host = '127.0.0.1') {
  server = app;
  server.listen(0, host);
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}`;
}

async function createCsv(content) {
  const path = join(directory, 'tarefas.csv');
  await writeFile(path, content, 'utf8');
  return path;
}

function runImport(args, env = {}) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [script, ...args], {
      cwd: directory,
      env: { ...process.env, ...env },
      encoding: 'utf8',
      timeout: 15000,
      windowsHide: true,
    }, (error, stdout, stderr) => {
      if (error && typeof error.code !== 'number') {
        reject(error);
        return;
      }

      resolve({ code: error?.code ?? 0, stdout, stderr });
    });
  });
}

test('importa o CSV pela API real, ignora o cabeçalho e preserva os dados do arquivo', async () => {
  await cp(new URL('../src/', import.meta.url), join(directory, 'src'), { recursive: true });
  await cp(new URL('../package.json', import.meta.url), join(directory, 'package.json'));
  const { app } = await import(pathToFileURL(join(directory, 'src/app.js')).href);
  const url = await listen(app);
  const existing = { title: 'Tarefa existente', description: 'Deve continuar salva.' };
  const response = await fetch(`${url}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(existing),
  });
  assert.equal(response.status, 201);
  const savedTask = await response.json();
  const path = await createCsv(
    '\uFEFFtitle,description\r\n'
    + '"Estudar Node.js","Praticar CSV, JSON e acentuação."\r\n'
    + '\r\n'
    + '"Revisar ""aspas""","Primeira linha\r\nSegunda linha"\r\n'
    + '  Tarefa com espaços  ,  Preservar os espaços do texto.  \r\n',
  );
  const result = await runImport([path, `${url}/`]);

  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /Importação concluída: 3 tarefa\(s\) importada\(s\)\./);
  const listResponse = await fetch(`${url}/tasks`);
  assert.equal(listResponse.status, 200);
  const tasks = await listResponse.json();
  assert.deepEqual(tasks[0], savedTask);
  assert.deepEqual(tasks.slice(1).map(({ title, description }) => ({ title, description })), [
    { title: 'Estudar Node.js', description: 'Praticar CSV, JSON e acentuação.' },
    { title: 'Revisar "aspas"', description: 'Primeira linha\r\nSegunda linha' },
    { title: '  Tarefa com espaços  ', description: '  Preservar os espaços do texto.  ' },
  ]);
  assert.equal(new Set(tasks.map((task) => task.id)).size, 4);
  assert.ok(tasks.slice(1).every((task) => task.completed_at === null));
  const savedTasks = JSON.parse(await readFile(join(directory, 'data/tasks.json'), 'utf8'));
  assert.deepEqual(savedTasks, tasks);
});

for (const { name, row } of [
  { name: 'título vazio', row: ',Descrição válida.' },
  { name: 'descrição vazia', row: 'Título válido,' },
  { name: 'título somente com espaços', row: '   ,Descrição válida.' },
  { name: 'descrição somente com espaços', row: 'Título válido, \t ' },
]) {
  test(`interrompe a importação pela API real ao receber ${name}`, async () => {
    await cp(new URL('../src/', import.meta.url), join(directory, 'src'), { recursive: true });
    await cp(new URL('../package.json', import.meta.url), join(directory, 'package.json'));
    const { app } = await import(pathToFileURL(join(directory, 'src/app.js')).href);
    const url = await listen(app);
    const path = await createCsv(
      'title,description\n'
      + 'Primeira tarefa,Deve permanecer salva.\n'
      + `${row}\n`
      + 'Última tarefa,Não deve ser importada.\n',
    );
    const result = await runImport([path, url]);

    assert.equal(result.code, 1);
    assert.match(result.stderr, /registro 2: HTTP 400/);
    assert.match(result.stderr, /1 tarefa\(s\) importada\(s\) antes do erro\./);
    assert.doesNotMatch(result.stdout, /Importação concluída/);

    const response = await fetch(`${url}/tasks`);
    assert.equal(response.status, 200);
    const tasks = await response.json();
    assert.deepEqual(tasks.map(({ title, description }) => ({ title, description })), [
      { title: 'Primeira tarefa', description: 'Deve permanecer salva.' },
    ]);
    const savedTasks = JSON.parse(await readFile(join(directory, 'data/tasks.json'), 'utf8'));
    assert.deepEqual(savedTasks, tasks);
  });
}

test('informa o uso e erros de leitura com saída de erro', async () => {
  const missingArgument = await runImport([]);
  assert.equal(missingArgument.code, 1);
  assert.match(missingArgument.stderr, /uso:.*(import-csv\.js|import:csv)/i);

  const missingFile = await runImport([join(directory, 'nao-existe.csv')]);
  assert.equal(missingFile.code, 1);
  assert.match(missingFile.stderr, /ENOENT|nao-existe\.csv/i);
  assert.match(missingFile.stderr, /0 tarefa\(s\) importada\(s\) antes do erro\./);
  assert.doesNotMatch(missingFile.stdout, /Importação concluída/);
});

test('interrompe no primeiro erro HTTP e informa quantas tarefas foram importadas', async () => {
  const requests = [];
  const url = await listen(createServer(async (request, response) => {
    const chunks = [];

    for await (const chunk of request) {
      chunks.push(chunk);
    }

    requests.push({
      method: request.method,
      url: request.url,
      contentType: request.headers['content-type'],
      body: Buffer.concat(chunks).toString('utf8'),
    });
    response.writeHead(requests.length === 2 ? 500 : 201, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ message: requests.length === 2 ? 'Falha ao salvar.' : 'Criada.' }));
  }));
  const path = await createCsv('title,description\nPrimeira,Uma\nSegunda,Duas\nTerceira,Três\n');
  const result = await runImport([path, url]);

  assert.equal(result.code, 1);
  assert.equal(requests.length, 2);
  assert.ok(requests.every((request) => request.method === 'POST' && request.url === '/tasks'));
  assert.ok(requests.every((request) => request.contentType.includes('application/json')));
  assert.deepEqual(requests.map((request) => JSON.parse(request.body)), [
    { title: 'Primeira', description: 'Uma' },
    { title: 'Segunda', description: 'Duas' },
  ]);
  assert.match(result.stderr, /500/);
  assert.match(result.stderr, /1 tarefa\(s\) importada\(s\) antes do erro\./);
  assert.doesNotMatch(result.stdout, /Importação concluída/);
});

test('rejeita CSV malformado e registros com quantidade incorreta de campos', async () => {
  let requests = 0;
  const url = await listen(createServer((request, response) => {
    requests += 1;
    response.writeHead(201);
    response.end('{}');
  }));

  for (const content of [
    'title,description\n"Aspas abertas,Descrição\n',
    'title,description\nSem descrição\n',
    'title,description\nTítulo,Descrição,Campo extra\n',
  ]) {
    const path = await createCsv(content);
    const result = await runImport([path, url]);

    assert.equal(result.code, 1, content);
    assert.match(result.stderr, /CSV|campo|coluna|registro|quote|column|record/i);
    assert.match(result.stderr, /0 tarefa\(s\) importada\(s\) antes do erro\./);
    assert.doesNotMatch(result.stdout, /Importação concluída/);
  }

  assert.equal(requests, 0);
});

test('arquivo vazio ou somente com cabeçalho não envia requisições', async () => {
  let requests = 0;
  const url = await listen(createServer((request, response) => {
    requests += 1;
    response.writeHead(201);
    response.end('{}');
  }));

  for (const content of ['', '\uFEFFtitle,description\r\n\r\n']) {
    const path = await createCsv(content);
    const result = await runImport([path, url]);

    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.match(result.stdout, /Importação concluída: 0 tarefa\(s\) importada\(s\)\./);
  }

  assert.equal(requests, 0);
});

test('usa PORT quando a URL não é informada e trata API indisponível', async () => {
  const requests = [];
  await listen(createServer(async (request, response) => {
    const chunks = [];

    for await (const chunk of request) {
      chunks.push(chunk);
    }

    requests.push(Buffer.concat(chunks).toString('utf8'));
    response.writeHead(201);
    response.end('{}');
  }), undefined);
  const port = server.address().port;
  const path = await createCsv('title,description\nTítulo,Descrição\n');
  const result = await runImport([path], { PORT: String(port) });

  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(requests.map((body) => JSON.parse(body)), [{ title: 'Título', description: 'Descrição' }]);
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  const unavailable = await runImport([path, `http://127.0.0.1:${port}`]);

  assert.equal(unavailable.code, 1);
  assert.match(unavailable.stderr, /fetch|conexão|conectar|ECONNREFUSED|API/i);
  assert.match(unavailable.stderr, /0 tarefa\(s\) importada\(s\) antes do erro\./);
  assert.doesNotMatch(unavailable.stdout, /Importação concluída/);
});
