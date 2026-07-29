import { Link, useParams } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CampaignDetails } from "@/components/campaigns/CampaignDetails";
import { useCampaign } from "@/hooks/useCampaign";
import { cn } from "@/lib/utils";

export function CampaignDetailsPage() {
  const { id } = useParams();
  const { campaign, isLoading, error, reload } = useCampaign(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>
            {error ?? "Chamado não encontrado."}
          </AlertDescription>
        </Alert>
        <Link to="/campaigns" className={cn(buttonVariants({ variant: "outline" }))}>
          Voltar para chamados
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        to="/campaigns"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
      >
        ← Voltar
      </Link>
      <CampaignDetails campaign={campaign} onReload={reload} />
    </div>
  );
}
