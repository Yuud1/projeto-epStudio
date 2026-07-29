import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { changeCampaignStatus } from "@/services/campaignsService";
import {
  CAMPAIGN_STATUS_LABELS,
  type Campaign,
  type CampaignStatus,
} from "@/types/campaign";

const transitions: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ["OPEN"],
  OPEN: ["IN_ANALYSIS"],
  IN_ANALYSIS: ["IN_PROGRESS", "WAITING_REQUESTER"],
  IN_PROGRESS: ["WAITING_REQUESTER", "WAITING_APPROVAL", "COMPLETED"],
  WAITING_REQUESTER: ["IN_ANALYSIS", "IN_PROGRESS"],
  WAITING_APPROVAL: ["IN_PROGRESS", "COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

interface ChangeStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign;
  onChanged: (campaign: Campaign) => void;
}

export function ChangeStatusDialog({
  open,
  onOpenChange,
  campaign,
  onChanged,
}: ChangeStatusDialogProps) {
  const options = transitions[campaign.status];
  const [status, setStatus] = useState<CampaignStatus | "">(options[0] ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!status) {
      setError("Selecione um status.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updated = await changeCampaignStatus(campaign.id, { status });
      onChanged(updated);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível alterar o status.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar status</DialogTitle>
          <DialogDescription>
            Status atual: {CAMPAIGN_STATUS_LABELS[campaign.status]}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Não há transições disponíveis neste status. Use cancelar ou
              reabrir quando aplicável.
            </p>
          ) : (
            <div className="space-y-2">
              <Label>Novo status</Label>
              <Select
                value={status}
                onValueChange={(value) => {
                  if (value) {
                    setStatus(value as CampaignStatus);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {CAMPAIGN_STATUS_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            disabled={isSubmitting || options.length === 0}
            onClick={() => void handleSubmit()}
          >
            {isSubmitting ? <LoaderCircle className="animate-spin" /> : null}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
