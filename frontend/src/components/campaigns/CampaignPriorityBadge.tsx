import { Badge } from "@/components/ui/badge";
import {
  CAMPAIGN_PRIORITY_LABELS,
  type CampaignPriority,
} from "@/types/campaign";

const variantByPriority: Record<
  CampaignPriority,
  "default" | "secondary" | "outline" | "destructive"
> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "default",
  URGENT: "destructive",
};

export function CampaignPriorityBadge({
  priority,
}: {
  priority: CampaignPriority;
}) {
  return (
    <Badge variant={variantByPriority[priority]}>
      {CAMPAIGN_PRIORITY_LABELS[priority]}
    </Badge>
  );
}
