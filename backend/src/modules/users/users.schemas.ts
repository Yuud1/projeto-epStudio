import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "A senha deve ter no mínimo 8 caracteres.")
  .regex(/[A-Z]/, "A senha deve conter letra maiúscula.")
  .regex(/[a-z]/, "A senha deve conter letra minúscula.")
  .regex(/[0-9]/, "A senha deve conter número.");

export const userRoleSchema = z.enum([
  "ADMIN",
  "REQUESTER",
  "MARKETING_MANAGER",
]);

export const createUserBodySchema = z.object({
  name: z
    .string({ required_error: "Nome é obrigatório." })
    .trim()
    .min(1, "Nome é obrigatório."),
  email: z
    .string({ required_error: "E-mail é obrigatório." })
    .email("Informe um e-mail válido.")
    .transform((value) => value.trim().toLowerCase()),
  password: passwordSchema,
  role: userRoleSchema,
});

export const updateUserBodySchema = z
  .object({
    name: z.string().trim().min(1, "Nome é obrigatório.").optional(),
    role: userRoleSchema.optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });

export const userIdParamsSchema = z.object({
  id: z.string().uuid("ID inválido."),
});

export type CreateUserBody = z.infer<typeof createUserBodySchema>;
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;
