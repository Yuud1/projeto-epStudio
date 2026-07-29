import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CampaignForm } from "@/components/campaigns/CampaignForm";
import { ApiError } from "@/lib/api";
import type { CreateCampaignFormValues } from "@/schemas/campaignSchemas";
import { createCampaign } from "@/services/campaignsService";

function toIsoOrNull(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function CreateCampaignPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(
    values: CreateCampaignFormValues,
    options: { saveAsDraft: boolean },
  ) {
    setIsSubmitting(true);
    setError(null);

    try {
      const campaign = await createCampaign({
        title: values.title,
        description: values.description,
        objective: values.objective || null,
        priority: values.priority,
        startsAt: toIsoOrNull(values.startsAt),
        dueAt: toIsoOrNull(values.dueAt),
        saveAsDraft: options.saveAsDraft,
      });
      navigate(`/campaigns/${campaign.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível criar o chamado.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Novo chamado</h1>
        <p className="text-muted-foreground">
          Descreva a solicitação de marketing para a equipe interna.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do chamado</CardTitle>
          <CardDescription>
            O solicitante será automaticamente o usuário autenticado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignForm
            error={error}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            onCancel={() => navigate("/campaigns")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
