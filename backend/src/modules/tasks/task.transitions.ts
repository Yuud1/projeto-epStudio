import type { TaskStatus } from "@prisma/client";
import { UnprocessableEntityError } from "../../shared/errors/app-error.js";
import { TASK_STATUS_LABELS } from "./task.types.js";

export const allowedTaskTransitions: Record<TaskStatus, TaskStatus[]> = {
  TODO: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["BLOCKED", "IN_REVIEW", "DONE", "CANCELLED"],
  BLOCKED: ["IN_PROGRESS", "CANCELLED"],
  IN_REVIEW: ["IN_PROGRESS", "DONE", "CANCELLED"],
  DONE: [],
  CANCELLED: [],
};

/** Transições que operacionais podem executar sozinhos */
export const operationalAllowedTransitions: Record<TaskStatus, TaskStatus[]> = {
  TODO: ["IN_PROGRESS"],
  IN_PROGRESS: ["BLOCKED", "IN_REVIEW"],
  BLOCKED: ["IN_PROGRESS"],
  IN_REVIEW: [],
  DONE: [],
  CANCELLED: [],
};

export const reopenTaskStatuses: TaskStatus[] = ["TODO", "IN_PROGRESS"];

export function assertTaskTransition(from: TaskStatus, to: TaskStatus): void {
  if (!allowedTaskTransitions[from].includes(to)) {
    throw new UnprocessableEntityError(
      `Não é possível alterar o status de ${TASK_STATUS_LABELS[from]} para ${TASK_STATUS_LABELS[to]}.`,
    );
  }
}
