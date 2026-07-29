import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().trim().min(3, "Título deve ter no mínimo 3 caracteres.").max(120),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  dueAt: z.string().optional().or(z.literal("")),
  assigneeIds: z.array(z.string()).default([]),
});

export type CreateTaskFormValues = z.infer<typeof createTaskSchema>;

export const cancelTaskSchema = z.object({
  reason: z.string().trim().min(5, "Motivo deve ter no mínimo 5 caracteres."),
});

export type CancelTaskFormValues = z.infer<typeof cancelTaskSchema>;
