import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Textarea } from "@/components/ui/textarea";
import {
  cancelCampaignSchema,
  type CancelCampaignFormValues,
} from "@/schemas/campaignSchemas";
import { ApiError } from "@/lib/api";
import { cancelCampaign } from "@/services/campaignsService";
import type { Campaign } from "@/types/campaign";

interface CancelCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onCancelled: (campaign: Campaign) => void;
}

export function CancelCampaignDialog({
  open,
  onOpenChange,
  campaignId,
  onCancelled,
}: CancelCampaignDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CancelCampaignFormValues>({
    resolver: zodResolver(cancelCampaignSchema),
    defaultValues: { reason: "" },
  });

  async function onSubmit(values: CancelCampaignFormValues) {
    setError(null);
    try {
      const campaign = await cancelCampaign(campaignId, values);
      reset();
      onCancelled(campaign);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível cancelar o chamado.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar chamado</DialogTitle>
          <DialogDescription>
            Informe o motivo do cancelamento. Esta ação altera o status para
            Cancelado.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo</Label>
            <Textarea
              id="reason"
              rows={4}
              aria-invalid={Boolean(errors.reason)}
              {...register("reason")}
            />
            {errors.reason ? (
              <p className="text-sm text-destructive">{errors.reason.message}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Voltar
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? <LoaderCircle className="animate-spin" /> : null}
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
