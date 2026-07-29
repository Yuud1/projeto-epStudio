import { apiConfig } from "@/lib/api";
import type { HealthResponse } from "@/types/api";

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${apiConfig.baseUrl}/health`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Falha ao conectar com a API (HTTP ${response.status})`);
  }

  return response.json() as Promise<HealthResponse>;
}
