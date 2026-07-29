import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { getCampaign } from "@/services/campaignsService";
import type { CampaignDetail } from "@/types/campaign";

export function useCampaign(id: string | undefined) {
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setIsLoading(false);
      setError("Chamado inválido.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getCampaign(id);
      setCampaign(data);
    } catch (err) {
      setCampaign(null);
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o chamado.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return { campaign, setCampaign, isLoading, error, reload: load };
}
