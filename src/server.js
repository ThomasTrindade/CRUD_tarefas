import { app } from './app.js';
import { readTasks } from './database.js';

const port = Number(process.env.PORT ?? 3333);

await readTasks();

app.listen(port, () => {
  console.log(`API disponível em http://localhost:${app.address().port}`);
});
