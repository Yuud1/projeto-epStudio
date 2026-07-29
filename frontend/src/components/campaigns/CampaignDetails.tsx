import { useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AssignCampaignDialog } from "@/components/campaigns/AssignCampaignDialog";
import { CancelCampaignDialog } from "@/components/campaigns/CancelCampaignDialog";
import { CampaignPriorityBadge } from "@/components/campaigns/CampaignPriorityBadge";
import { CampaignStatusBadge } from "@/components/campaigns/CampaignStatusBadge";
import { CampaignTasksSection } from "@/components/campaigns/CampaignTasksSection";
import { CampaignTimeline } from "@/components/campaigns/CampaignTimeline";
import { ChangeStatusDialog } from "@/components/campaigns/ChangeStatusDialog";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import {
  claimCampaign,
  reopenCampaign,
  submitCampaign,
} from "@/services/campaignsService";
import type { CampaignDetail } from "@/types/campaign";

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

interface CampaignDetailsProps {
  campaign: CampaignDetail;
  onReload: () => Promise<void>;
}

export function CampaignDetails({
  campaign,
  onReload,
}: CampaignDetailsProps) {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const actions = useMemo(() => {
    if (!user) {
      return {
        claim: false,
        submit: false,
        cancel: false,
        changeStatus: false,
        assign: false,
        reopen: false,
      };
    }

    const isOwner = campaign.requester.id === user.id;
    const isManager = campaign.marketingManager?.id === user.id;

    return {
      claim:
        user.role === "MARKETING_MANAGER" &&
        campaign.status === "OPEN" &&
        !campaign.marketingManager,
      submit:
        campaign.status === "DRAFT" &&
        (user.role === "ADMIN" || (user.role === "REQUESTER" && isOwner)),
      cancel:
        campaign.status !== "COMPLETED" &&
        campaign.status !== "CANCELLED" &&
        (user.role === "ADMIN" ||
          (user.role === "REQUESTER" &&
            isOwner &&
            (campaign.status === "DRAFT" || campaign.status === "OPEN")) ||
          (user.role === "MARKETING_MANAGER" && isManager)),
      changeStatus:
        (user.role === "ADMIN" ||
          (user.role === "MARKETING_MANAGER" && isManager)) &&
        campaign.status !== "DRAFT" &&
        campaign.status !== "COMPLETED" &&
        campaign.status !== "CANCELLED",
      assign: user.role === "ADMIN",
      reopen:
        user.role === "ADMIN" &&
        (campaign.status === "COMPLETED" || campaign.status === "CANCELLED"),
    };
  }, [campaign, user]);

  async function runAction(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await onReload();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível executar a ação.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <CampaignStatusBadge status={campaign.status} />
          <CampaignPriorityBadge priority={campaign.priority} />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{campaign.title}</h1>
        <div className="grid gap-1 text-sm text-muted-foreground md:grid-cols-2">
          <p>Solicitante: {campaign.requester.name}</p>
          <p>
            Responsável:{" "}
            {campaign.marketingManager?.name ?? "Sem responsável"}
          </p>
          <p>Criado em: {formatDateTime(campaign.createdAt)}</p>
          <p>Prazo: {formatDateTime(campaign.dueAt)}</p>
          <p>Início: {formatDateTime(campaign.startsAt)}</p>
          <p>Concluído em: {formatDateTime(campaign.completedAt)}</p>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {actions.claim ? (
          <Button
            disabled={busy}
            onClick={() =>
              void runAction(async () => {
                await claimCampaign(campaign.id);
              })
            }
          >
            {busy ? <LoaderCircle className="animate-spin" /> : null}
            Assumir chamado
          </Button>
        ) : null}

        {actions.submit ? (
          <Button
            disabled={busy}
            onClick={() =>
              void runAction(async () => {
                await submitCampaign(campaign.id);
              })
            }
          >
            Enviar chamado
          </Button>
        ) : null}

        {actions.changeStatus ? (
          <Button variant="secondary" onClick={() => setStatusOpen(true)}>
            Alterar status
          </Button>
        ) : null}

        {actions.assign ? (
          <Button variant="secondary" onClick={() => setAssignOpen(true)}>
            Atribuir responsável
          </Button>
        ) : null}

        {actions.reopen ? (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void runAction(async () => {
                await reopenCampaign(
                  campaign.id,
                  campaign.marketingManager ? "IN_ANALYSIS" : "OPEN",
                );
              })
            }
          >
            Reabrir
          </Button>
        ) : null}

        {actions.cancel ? (
          <Button variant="destructive" onClick={() => setCancelOpen(true)}>
            Cancelar
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Descrição</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 whitespace-pre-wrap text-sm">
          <p>{campaign.description}</p>
          {campaign.objective ? (
            <div>
              <p className="mb-1 font-medium">Objetivo</p>
              <p className="text-muted-foreground">{campaign.objective}</p>
            </div>
          ) : null}
          {campaign.cancellationReason ? (
            <div>
              <p className="mb-1 font-medium">Motivo do cancelamento</p>
              <p className="text-destructive">{campaign.cancellationReason}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          <CampaignTimeline activities={campaign.activities} />
        </CardContent>
      </Card>

      <CampaignTasksSection campaign={campaign} />

      <CancelCampaignDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        campaignId={campaign.id}
        onCancelled={async () => {
          await onReload();
        }}
      />

      <ChangeStatusDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        campaign={campaign}
        onChanged={async () => {
          await onReload();
        }}
      />

      <AssignCampaignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        campaignId={campaign.id}
        currentManagerId={campaign.marketingManager?.id ?? null}
        onAssigned={async () => {
          await onReload();
        }}
      />
    </div>
  );
}
