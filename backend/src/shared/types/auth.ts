export type UserRole = "ADMIN" | "REQUESTER" | "MARKETING_MANAGER";

export interface AuthenticatedUser {
  sub: string;
  email: string;
  role: UserRole;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
}
