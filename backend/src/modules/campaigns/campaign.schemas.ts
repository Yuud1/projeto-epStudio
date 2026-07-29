import { z } from "zod";

const emptyToNull = (value: string | null | undefined) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

export const campaignStatusSchema = z.enum([
  "DRAFT",
  "OPEN",
  "IN_ANALYSIS",
  "IN_PROGRESS",
  "WAITING_REQUESTER",
  "WAITING_APPROVAL",
  "COMPLETED",
  "CANCELLED",
]);

export const campaignPrioritySchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);

export const campaignIdParamsSchema = z.object({
  id: z.string().uuid("ID inválido."),
});

export const createCampaignBodySchema = z.object({
  title: z
    .string({ required_error: "Título é obrigatório." })
    .trim()
    .min(3, "Título deve ter no mínimo 3 caracteres.")
    .max(120, "Título deve ter no máximo 120 caracteres."),
  description: z
    .string({ required_error: "Descrição é obrigatória." })
    .trim()
    .min(10, "Descrição deve ter no mínimo 10 caracteres.")
    .max(5000, "Descrição deve ter no máximo 5000 caracteres."),
  objective: z
    .string()
    .trim()
    .max(1000, "Objetivo deve ter no máximo 1000 caracteres.")
    .nullish()
    .transform(emptyToNull),
  priority: campaignPrioritySchema.optional().default("MEDIUM"),
  startsAt: z.coerce.date().nullish(),
  dueAt: z.coerce.date().nullish(),
  saveAsDraft: z.boolean().optional().default(false),
});

export const updateCampaignBodySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Título deve ter no mínimo 3 caracteres.")
      .max(120, "Título deve ter no máximo 120 caracteres.")
      .optional(),
    description: z
      .string()
      .trim()
      .min(10, "Descrição deve ter no mínimo 10 caracteres.")
      .max(5000, "Descrição deve ter no máximo 5000 caracteres.")
      .optional(),
    objective: z
      .string()
      .trim()
      .max(1000, "Objetivo deve ter no máximo 1000 caracteres.")
      .nullish()
      .transform(emptyToNull),
    priority: campaignPrioritySchema.optional(),
    startsAt: z.coerce.date().nullish(),
    dueAt: z.coerce.date().nullish(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });

export const listCampaignsQuerySchema = z.object({
  status: campaignStatusSchema.optional(),
  priority: campaignPrioritySchema.optional(),
  requesterId: z.string().uuid().optional(),
  marketingManagerId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
  dueFrom: z.coerce.date().optional(),
  dueTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z
    .enum(["createdAt", "dueAt", "priority", "status", "title", "updatedAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const changeStatusBodySchema = z.object({
  status: campaignStatusSchema,
});

export const assignCampaignBodySchema = z.object({
  marketingManagerId: z.string().uuid().nullable(),
});

export const cancelCampaignBodySchema = z.object({
  reason: z
    .string({ required_error: "Motivo é obrigatório." })
    .trim()
    .min(5, "Motivo deve ter no mínimo 5 caracteres.")
    .max(1000, "Motivo deve ter no máximo 1000 caracteres."),
});

export const reopenCampaignBodySchema = z.object({
  status: z.enum(["OPEN", "IN_ANALYSIS"]),
});

export const activitiesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateCampaignBody = z.infer<typeof createCampaignBodySchema>;
export type UpdateCampaignBody = z.infer<typeof updateCampaignBodySchema>;
export type ListCampaignsQuery = z.infer<typeof listCampaignsQuerySchema>;
