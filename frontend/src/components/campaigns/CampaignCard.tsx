import { Link } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CampaignPriorityBadge } from "@/components/campaigns/CampaignPriorityBadge";
import { CampaignStatusBadge } from "@/components/campaigns/CampaignStatusBadge";
import { cn } from "@/lib/utils";
import type { Campaign } from "@/types/campaign";

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(value));
}

interface CampaignCardProps {
  campaign: Campaign;
  onClaim?: (campaign: Campaign) => void;
  claiming?: boolean;
  showClaim?: boolean;
}

export function CampaignCard({
  campaign,
  onClaim,
  claiming,
  showClaim,
}: CampaignCardProps) {
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CampaignStatusBadge status={campaign.status} />
          <CampaignPriorityBadge priority={campaign.priority} />
        </div>
        <CardTitle className="text-lg">
          <Link to={`/campaigns/${campaign.id}`} className="hover:underline">
            {campaign.title}
          </Link>
        </CardTitle>
        <CardDescription className="line-clamp-2">
          {campaign.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-muted-foreground">
        <p>Solicitante: {campaign.requester.name}</p>
        <p>
          Responsável:{" "}
          {campaign.marketingManager?.name ?? "Sem responsável"}
        </p>
        <p>Prazo: {formatDate(campaign.dueAt)}</p>
        <p>Criado em: {formatDate(campaign.createdAt)}</p>
      </CardContent>
      <CardFooter className="gap-2">
        <Link
          to={`/campaigns/${campaign.id}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Ver detalhes
        </Link>
        {showClaim && onClaim ? (
          <Button
            size="sm"
            disabled={claiming}
            onClick={() => onClaim(campaign)}
          >
            {claiming ? "Assumindo..." : "Assumir chamado"}
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
