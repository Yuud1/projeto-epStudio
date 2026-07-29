const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  skipAuth?: boolean;
  skipRefresh?: boolean;
};

async function parseError(response: Response): Promise<ApiError> {
  try {
    const data = (await response.json()) as {
      message?: string;
      code?: string;
    };
    return new ApiError(
      data.message ?? "Erro inesperado na requisição.",
      response.status,
      data.code,
    );
  } catch {
    return new ApiError("Erro inesperado na requisição.", response.status);
  }
}

async function tryRefreshSession(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        setAccessToken(null);
        return false;
      }

      const data = (await response.json()) as {
        accessToken: string;
      };

      setAccessToken(data.accessToken);
      return true;
    } catch {
      setAccessToken(null);
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, skipAuth, skipRefresh, headers, ...rest } = options;

  const requestHeaders = new Headers(headers);

  if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (!skipAuth && accessToken) {
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const shouldTryRefresh =
    response.status === 401 &&
    !skipAuth &&
    !skipRefresh &&
    !path.startsWith("/auth/login") &&
    !path.startsWith("/auth/refresh") &&
    !path.startsWith("/auth/logout");

  if (shouldTryRefresh) {
    const refreshed = await tryRefreshSession();

    if (refreshed) {
      return apiRequest<T>(path, {
        ...options,
        skipRefresh: true,
      });
    }

    onUnauthorized?.();
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function refreshAccessToken(): Promise<{
  accessToken: string;
  user: import("@/types/auth").AuthUser;
} | null> {
  try {
    const data = await apiRequest<{
      accessToken: string;
      user: import("@/types/auth").AuthUser;
    }>("/auth/refresh", {
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

export const apiConfig = {
  baseUrl: API_URL,
} as const;
