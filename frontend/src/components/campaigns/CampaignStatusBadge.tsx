import { Badge } from "@/components/ui/badge";
import {
  CAMPAIGN_STATUS_LABELS,
  type CampaignStatus,
} from "@/types/campaign";

const variantByStatus: Record<
  CampaignStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  DRAFT: "outline",
  OPEN: "default",
  IN_ANALYSIS: "secondary",
  IN_PROGRESS: "default",
  WAITING_REQUESTER: "outline",
  WAITING_APPROVAL: "secondary",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <Badge variant={variantByStatus[status]}>
      {CAMPAIGN_STATUS_LABELS[status]}
    </Badge>
  );
}
