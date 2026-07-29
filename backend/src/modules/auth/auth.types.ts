import type { User, UserRole } from "@prisma/client";
import type { PublicUser } from "../../shared/types/auth.js";

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
  };
}

export type { UserRole };
