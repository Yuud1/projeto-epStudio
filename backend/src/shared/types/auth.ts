export type UserRole =
  | "ADMIN"
  | "REQUESTER"
  | "MARKETING_MANAGER"
  | "DESIGNER"
  | "CONTENT_CREATOR"
  | "SOCIAL_MEDIA";

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

export const OPERATIONAL_ROLES: UserRole[] = [
  "DESIGNER",
  "CONTENT_CREATOR",
  "SOCIAL_MEDIA",
];

export const TASK_ASSIGNEE_ROLES: UserRole[] = [
  "DESIGNER",
  "CONTENT_CREATOR",
  "SOCIAL_MEDIA",
  "MARKETING_MANAGER",
];

export function isOperationalRole(role: UserRole): boolean {
  return OPERATIONAL_ROLES.includes(role);
}
