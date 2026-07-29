import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { listCampaigns } from "@/services/campaignsService";
import type { Campaign, CampaignFilters, PaginationMeta } from "@/types/campaign";

export function useCampaigns(initialFilters: CampaignFilters = {}) {
  const [filters, setFilters] = useState<CampaignFilters>({
    page: 1,
    limit: 20,
    ...initialFilters,
  });
  const [data, setData] = useState<Campaign[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await listCampaigns(filters);
      setData(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os chamados.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    data,
    pagination,
    filters,
    setFilters,
    isLoading,
    error,
    reload: load,
  };
}
