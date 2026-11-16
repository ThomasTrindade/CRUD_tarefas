import { createReadStream } from 'node:fs';
import { parse } from 'csv-parse';

const filePath = process.argv[2];
const apiUrl = process.argv[3] ?? `http://localhost:${process.env.PORT ?? 3333}`;
let imported = 0;

try {
  if (!filePath) {
    throw new Error('Uso: npm run import:csv -- <arquivo.csv> [url-da-api]');
  }

  const tasksUrl = new URL('/tasks', apiUrl);
  const file = createReadStream(filePath);
  const parser = parse({
    from_line: 2, // A primeira linha contém o cabeçalho title,description.
    bom: true,
    skip_empty_lines: true,
  });

  // Encaminha erros de leitura para o mesmo tratamento dos erros do CSV.
  file.on('error', (error) => parser.destroy(error));
  file.pipe(parser);

  try {
    for await (const row of parser) {
      if (row.length !== 2) {
        throw new Error(`O registro ${imported + 1} deve conter os campos title e description.`);
      }

      const [title, description] = row;
      const response = await fetch(tasksUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
        signal: AbortSignal.timeout(10000),
      });

      // Consome a resposta para liberar a conexão antes da próxima requisição.
      await response.text();

      if (!response.ok) {
        throw new Error(`Falha ao importar o registro ${imported + 1}: HTTP ${response.status}.`);
      }

      imported += 1;
    }
  } finally {
    file.destroy();
    parser.destroy();
  }

  console.log(`Importação concluída: ${imported} tarefa(s) importada(s).`);
} catch (error) {
  console.error(`Erro na importação: ${error.message}`);
  console.error(`${imported} tarefa(s) importada(s) antes do erro.`);
  process.exitCode = 1;
}
