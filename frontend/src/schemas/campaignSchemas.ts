import { z } from "zod";

export const createCampaignSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Título deve ter no mínimo 3 caracteres.")
    .max(120, "Título deve ter no máximo 120 caracteres."),
  description: z
    .string()
    .trim()
    .min(10, "Descrição deve ter no mínimo 10 caracteres.")
    .max(5000, "Descrição deve ter no máximo 5000 caracteres."),
  objective: z
    .string()
    .trim()
    .max(1000, "Objetivo deve ter no máximo 1000 caracteres.")
    .optional()
    .or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  startsAt: z.string().optional().or(z.literal("")),
  dueAt: z.string().optional().or(z.literal("")),
});

export type CreateCampaignFormValues = z.infer<typeof createCampaignSchema>;

export const cancelCampaignSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Motivo deve ter no mínimo 5 caracteres.")
    .max(1000, "Motivo deve ter no máximo 1000 caracteres."),
});

export type CancelCampaignFormValues = z.infer<typeof cancelCampaignSchema>;
