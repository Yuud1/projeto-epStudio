import type { User } from "@prisma/client";
import type { PublicUser } from "../../shared/types/auth.js";

export type UserListItem = PublicUser & {
  createdAt: Date;
  updatedAt: Date;
};

export function toUserListItem(user: User): UserListItem {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export type { PublicUser };
