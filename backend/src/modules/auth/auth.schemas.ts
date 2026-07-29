import { z } from "zod";

export const loginBodySchema = z.object({
  email: z
    .string({ required_error: "E-mail é obrigatório." })
    .email("Informe um e-mail válido.")
    .transform((value) => value.trim().toLowerCase()),
  password: z
    .string({ required_error: "Senha é obrigatória." })
    .min(1, "Senha é obrigatória."),
});

export type LoginBody = z.infer<typeof loginBodySchema>;
