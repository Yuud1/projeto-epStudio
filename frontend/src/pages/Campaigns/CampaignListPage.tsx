import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignCard } from "@/components/campaigns/CampaignCard";
import { CampaignFiltersBar } from "@/components/campaigns/CampaignFilters";
import { useAuth } from "@/hooks/useAuth";
import { useCampaigns } from "@/hooks/useCampaigns";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { claimCampaign } from "@/services/campaignsService";
import type { Campaign } from "@/types/campaign";

export function CampaignListPage() {
  const { user } = useAuth();
  const { data, pagination, filters, setFilters, isLoading, error, reload } =
    useCampaigns();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const available = data.filter(
    (campaign) => campaign.status === "OPEN" && !campaign.marketingManager,
  );
  const mine = data.filter(
    (campaign) => campaign.marketingManager?.id === user?.id,
  );

  async function handleClaim(campaign: Campaign) {
    setClaimingId(campaign.id);
    setActionError(null);

    try {
      await claimCampaign(campaign.id);
      await reload();
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível assumir o chamado.",
      );
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Chamados</h1>
          <p className="text-muted-foreground">
            Solicitações internas de marketing da loja.
          </p>
        </div>
        <Link to="/campaigns/new" className={cn(buttonVariants())}>
          <Plus />
          Novo chamado
        </Link>
      </div>

      <CampaignFiltersBar
        value={filters}
        onChange={setFilters}
        showAdminFilters={user?.role === "ADMIN"}
      />

      {pagination ? (
        <p className="text-sm text-muted-foreground">
          {pagination.total} chamado(s) • página {pagination.page} de{" "}
          {Math.max(pagination.totalPages, 1)}
        </p>
      ) : null}

      {error || actionError ? (
        <Alert variant="destructive">
          <AlertDescription>{error ?? actionError}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : user?.role === "MARKETING_MANAGER" ? (
        <Tabs defaultValue="available">
          <TabsList>
            <TabsTrigger value="available">
              Disponíveis ({available.length})
            </TabsTrigger>
            <TabsTrigger value="mine">Meus chamados ({mine.length})</TabsTrigger>
            <TabsTrigger value="all">Todos visíveis ({data.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="available" className="mt-4 grid gap-4 md:grid-cols-2">
            {available.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum chamado disponível no momento.
              </p>
            ) : (
              available.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  showClaim
                  claiming={claimingId === campaign.id}
                  onClaim={handleClaim}
                />
              ))
            )}
          </TabsContent>
          <TabsContent value="mine" className="mt-4 grid gap-4 md:grid-cols-2">
            {mine.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Você ainda não assumiu chamados.
              </p>
            ) : (
              mine.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))
            )}
          </TabsContent>
          <TabsContent value="all" className="mt-4 grid gap-4 md:grid-cols-2">
            {data.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </TabsContent>
        </Tabs>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum chamado encontrado.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={pagination.page <= 1}
            onClick={() =>
              setFilters((current) => ({
                ...current,
                page: Math.max((current.page ?? 1) - 1, 1),
              }))
            }
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() =>
              setFilters((current) => ({
                ...current,
                page: (current.page ?? 1) + 1,
              }))
            }
          >
            Próxima
          </Button>
        </div>
      ) : null}
    </div>
  );
}
