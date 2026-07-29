import type { TaskPriority, TaskStatus } from "@prisma/client";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "../tasks/task.types.js";

export function createdDescription(actorName: string) {
  return `${actorName} criou a tarefa.`;
}

export function updatedDescription(actorName: string) {
  return `${actorName} atualizou a tarefa.`;
}

export function statusChangedDescription(
  actorName: string,
  from: TaskStatus,
  to: TaskStatus,
) {
  return `${actorName} alterou o status de ${TASK_STATUS_LABELS[from]} para ${TASK_STATUS_LABELS[to]}.`;
}

export function priorityChangedDescription(
  actorName: string,
  from: TaskPriority,
  to: TaskPriority,
) {
  return `${actorName} alterou a prioridade de ${TASK_PRIORITY_LABELS[from]} para ${TASK_PRIORITY_LABELS[to]}.`;
}

export function dueDateChangedDescription(actorName: string) {
  return `${actorName} alterou o prazo.`;
}

export function assignedDescription(actorName: string, assigneeName: string) {
  return `${actorName} atribuiu ${assigneeName} à tarefa.`;
}

export function unassignedDescription(actorName: string, assigneeName: string) {
  return `${actorName} removeu ${assigneeName} da tarefa.`;
}

export function positionChangedDescription(actorName: string) {
  return `${actorName} reordenou a tarefa.`;
}

export function cancelledDescription(actorName: string) {
  return `${actorName} cancelou a tarefa.`;
}

export function completedDescription(actorName: string) {
  return `${actorName} concluiu a tarefa.`;
}

export function reopenedDescription(actorName: string) {
  return `${actorName} reabriu a tarefa.`;
}

export function startedDescription(actorName: string) {
  return `${actorName} iniciou a tarefa.`;
}

export function sentToReviewDescription(actorName: string) {
  return `${actorName} enviou a tarefa para revisão.`;
}
