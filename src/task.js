import { randomUUID } from 'node:crypto';

/**
 * @typedef {object} Task
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string | null} completed_at Data de conclusão em formato ISO 8601.
 * @property {string} created_at Data de criação em formato ISO 8601.
 * @property {string} updated_at Data da última atualização em formato ISO 8601.
 */

/**
 * @param {{ title: string, description: string }} data
 * @returns {Task}
 */
export function createTask({ title, description }) {
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    title,
    description,
    completed_at: null,
    created_at: now,
    updated_at: now,
  };
}

/**
 * @param {Task} task
 * @param {{ title?: string, description?: string, completed_at?: string | null }} changes
 * @returns {Task}
 */
export function updateTask(
  task,
  {
    title = task.title,
    description = task.description,
    completed_at = task.completed_at,
  },
) {
  return {
    ...task,
    title,
    description,
    completed_at,
    updated_at: new Date().toISOString(),
  };
}
