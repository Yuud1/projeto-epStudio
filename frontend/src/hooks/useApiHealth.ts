import { useState } from "react";
import { getHealth } from "@/services/healthService";
import type { ApiConnectionStatus, HealthResponse } from "@/types/api";

export function useApiHealth() {
  const [status, setStatus] = useState<ApiConnectionStatus>("idle");
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkHealth() {
    setStatus("loading");
    setError(null);

    try {
      const response = await getHealth();
      setData(response);
      setStatus("success");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível conectar com o backend";

      setData(null);
      setError(message);
      setStatus("error");
    }
  }

  return {
    status,
    data,
    error,
    checkHealth,
    isLoading: status === "loading",
  };
}
