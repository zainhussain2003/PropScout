import type { AgentRole } from '../types.js';

export interface QueuedTask {
  id: string;
  role: AgentRole;
  prompt: string;
  priority: number;
  addedAt: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rejected';
  result?: string;
}

let taskCounter = 0;
const queue: QueuedTask[] = [];

export function enqueue(role: AgentRole, prompt: string, priority: number = 0): QueuedTask {
  taskCounter++;
  const task: QueuedTask = {
    id: `task-${String(taskCounter).padStart(3, '0')}`,
    role,
    prompt,
    priority,
    addedAt: new Date().toISOString(),
    status: 'pending',
  };
  queue.push(task);
  queue.sort((a, b) => b.priority - a.priority);
  return task;
}

export function dequeue(): QueuedTask | null {
  const task = queue.find(t => t.status === 'pending');
  if (task) task.status = 'running';
  return task ?? null;
}

export function markCompleted(taskId: string, result: string): void {
  const task = queue.find(t => t.id === taskId);
  if (task) {
    task.status = 'completed';
    task.result = result;
  }
}

export function markFailed(taskId: string, reason: string): void {
  const task = queue.find(t => t.id === taskId);
  if (task) {
    task.status = 'failed';
    task.result = reason;
  }
}

export function markRejected(taskId: string, reason: string): void {
  const task = queue.find(t => t.id === taskId);
  if (task) {
    task.status = 'rejected';
    task.result = reason;
  }
}

export function getQueue(): ReadonlyArray<Readonly<QueuedTask>> {
  return queue;
}

export function pendingCount(): number {
  return queue.filter(t => t.status === 'pending').length;
}
