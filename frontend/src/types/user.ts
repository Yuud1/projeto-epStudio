import type { AuthUser, UserRole } from "./auth";

export type { AuthUser, UserRole };

export interface UserListItem extends AuthUser {
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  active?: boolean;
}
