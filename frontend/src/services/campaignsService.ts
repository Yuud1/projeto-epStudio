import { apiRequest } from "@/lib/api";
import type {
  Campaign,
  CampaignDetail,
  CampaignFilters,
  CampaignListResponse,
  CampaignSummary,
  CancelCampaignInput,
  ChangeStatusInput,
  CreateCampaignInput,
  UpdateCampaignInput,
} from "@/types/campaign";

function toQuery(filters: CampaignFilters = {}): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function listCampaigns(
  filters: CampaignFilters = {},
): Promise<CampaignListResponse> {
  return apiRequest<CampaignListResponse>(`/campaigns${toQuery(filters)}`);
}

export async function getCampaignSummary(): Promise<CampaignSummary> {
  const data = await apiRequest<{ summary: CampaignSummary }>(
    "/campaigns/summary",
  );
  return data.summary;
}

export async function getCampaign(id: string): Promise<CampaignDetail> {
  const data = await apiRequest<{ campaign: CampaignDetail }>(
    `/campaigns/${id}`,
  );
  return data.campaign;
}

export async function createCampaign(
  input: CreateCampaignInput,
): Promise<Campaign> {
  const data = await apiRequest<{ campaign: Campaign }>("/campaigns", {
    method: "POST",
    body: input,
  });
  return data.campaign;
}

export async function updateCampaign(
  id: string,
  input: UpdateCampaignInput,
): Promise<Campaign> {
  const data = await apiRequest<{ campaign: Campaign }>(`/campaigns/${id}`, {
    method: "PATCH",
    body: input,
  });
  return data.campaign;
}

export async function submitCampaign(id: string): Promise<Campaign> {
  const data = await apiRequest<{ campaign: Campaign }>(
    `/campaigns/${id}/submit`,
    { method: "POST" },
  );
  return data.campaign;
}

export async function claimCampaign(id: string): Promise<Campaign> {
  const data = await apiRequest<{ campaign: Campaign }>(
    `/campaigns/${id}/claim`,
    { method: "POST" },
  );
  return data.campaign;
}

export async function assignCampaign(
  id: string,
  marketingManagerId: string | null,
): Promise<Campaign> {
  const data = await apiRequest<{ campaign: Campaign }>(
    `/campaigns/${id}/assignee`,
    {
      method: "PATCH",
      body: { marketingManagerId },
    },
  );
  return data.campaign;
}

export async function changeCampaignStatus(
  id: string,
  input: ChangeStatusInput,
): Promise<Campaign> {
  const data = await apiRequest<{ campaign: Campaign }>(
    `/campaigns/${id}/status`,
    {
      method: "PATCH",
      body: input,
    },
  );
  return data.campaign;
}

export async function cancelCampaign(
  id: string,
  input: CancelCampaignInput,
): Promise<Campaign> {
  const data = await apiRequest<{ campaign: Campaign }>(
    `/campaigns/${id}/cancel`,
    {
      method: "POST",
      body: input,
    },
  );
  return data.campaign;
}

export async function reopenCampaign(
  id: string,
  status: "OPEN" | "IN_ANALYSIS",
): Promise<Campaign> {
  const data = await apiRequest<{ campaign: Campaign }>(
    `/campaigns/${id}/reopen`,
    {
      method: "POST",
      body: { status },
    },
  );
  return data.campaign;
}
