export type UserRole =
  | "ADMIN"
  | "REQUESTER"
  | "MARKETING_MANAGER"
  | "DESIGNER"
  | "CONTENT_CREATOR"
  | "SOCIAL_MEDIA";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
  user: AuthUser;
}

export interface MeResponse {
  user: AuthUser;
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  REQUESTER: "Solicitante",
  MARKETING_MANAGER: "Gerente de Marketing",
  DESIGNER: "Designer",
  CONTENT_CREATOR: "Criador de Conteúdo",
  SOCIAL_MEDIA: "Social Media",
};

export const OPERATIONAL_ROLES: UserRole[] = [
  "DESIGNER",
  "CONTENT_CREATOR",
  "SOCIAL_MEDIA",
];
