export type HealthResponse = {
  status: string;
  message: string;
};

export type ApiConnectionStatus = "idle" | "loading" | "success" | "error";
