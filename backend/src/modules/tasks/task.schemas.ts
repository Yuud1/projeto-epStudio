import { z } from "zod";

const emptyToNull = (value: string | null | undefined) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

export const taskStatusSchema = z.enum([
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "IN_REVIEW",
  "DONE",
  "CANCELLED",
]);

export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const campaignIdParamsSchema = z.object({
  campaignId: z.string().uuid("ID da campanha inválido."),
});

export const taskIdParamsSchema = z.object({
  id: z.string().uuid("ID da tarefa inválido."),
});

export const assigneeParamsSchema = z.object({
  id: z.string().uuid("ID da tarefa inválido."),
  userId: z.string().uuid("ID do usuário inválido."),
});

export const createTaskBodySchema = z.object({
  title: z
    .string({ required_error: "Título é obrigatório." })
    .trim()
    .min(3, "Título deve ter no mínimo 3 caracteres.")
    .max(120, "Título deve ter no máximo 120 caracteres."),
  description: z
    .string()
    .trim()
    .max(5000)
    .nullish()
    .transform(emptyToNull),
  priority: taskPrioritySchema.optional().default("MEDIUM"),
  dueAt: z.coerce.date().nullish(),
  assigneeIds: z.array(z.string().uuid()).optional().default([]),
});

export const updateTaskBodySchema = z
  .object({
    title: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().max(5000).nullish().transform(emptyToNull),
    priority: taskPrioritySchema.optional(),
    dueAt: z.coerce.date().nullish(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });

export const listTasksQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assigneeId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  dueFrom: z.coerce.date().optional(),
  dueTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z
    .enum(["position", "createdAt", "dueAt", "priority", "status", "title"])
    .default("position"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export const myTasksQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  campaignId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  dueFrom: z.coerce.date().optional(),
  dueTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const changeTaskStatusBodySchema = z.object({
  status: taskStatusSchema,
});

export const assignTaskBodySchema = z.object({
  userIds: z
    .array(z.string().uuid())
    .min(1, "Informe ao menos um responsável."),
});

export const cancelTaskBodySchema = z.object({
  reason: z
    .string({ required_error: "Motivo é obrigatório." })
    .trim()
    .min(5, "Motivo deve ter no mínimo 5 caracteres.")
    .max(1000),
});

export const reopenTaskBodySchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS"]),
});

export const reorderTasksBodySchema = z.object({
  tasks: z
    .array(
      z.object({
        id: z.string().uuid(),
        position: z.number().int().min(0),
      }),
    )
    .min(1),
});

export const activitiesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateTaskBody = z.infer<typeof createTaskBodySchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type MyTasksQuery = z.infer<typeof myTasksQuerySchema>;
