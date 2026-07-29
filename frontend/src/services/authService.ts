import { apiRequest, setAccessToken } from "@/lib/api";
import type {
  AuthUser,
  LoginResponse,
  MeResponse,
  RefreshResponse,
} from "@/types/auth";

export async function loginRequest(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const data = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
    skipAuth: true,
    skipRefresh: true,
  });

  setAccessToken(data.accessToken);
  return data;
}

export async function refreshRequest(): Promise<RefreshResponse | null> {
  try {
    const data = await apiRequest<RefreshResponse>("/auth/refresh", {
      method: "POST",
      skipAuth: true,
      skipRefresh: true,
    });
    setAccessToken(data.accessToken);
    return data;
  } catch {
    setAccessToken(null);
    return null;
  }
}

export async function meRequest(): Promise<AuthUser> {
  const data = await apiRequest<MeResponse>("/auth/me");
  return data.user;
}

export async function logoutRequest(): Promise<void> {
  try {
    await apiRequest<{ message: string }>("/auth/logout", {
      method: "POST",
      skipAuth: true,
      skipRefresh: true,
    });
  } finally {
    setAccessToken(null);
  }
}
