import { useEffect, useState } from "react";
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
import { listUsersRequest } from "@/services/usersService";
import { assignCampaign } from "@/services/campaignsService";
import type { Campaign } from "@/types/campaign";
import type { UserListItem } from "@/types/user";

interface AssignCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  currentManagerId: string | null;
  onAssigned: (campaign: Campaign) => void;
}

export function AssignCampaignDialog({
  open,
  onOpenChange,
  campaignId,
  currentManagerId,
  onAssigned,
}: AssignCampaignDialogProps) {
  const [managers, setManagers] = useState<UserListItem[]>([]);
  const [selected, setSelected] = useState<string>(currentManagerId ?? "NONE");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelected(currentManagerId ?? "NONE");
    setIsLoading(true);
    setError(null);

    void listUsersRequest()
      .then((users) => {
        setManagers(
          users.filter(
            (user) => user.role === "MARKETING_MANAGER" && user.active,
          ),
        );
      })
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar gestores.",
        );
      })
      .finally(() => setIsLoading(false));
  }, [open, currentManagerId]);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    try {
      const campaign = await assignCampaign(
        campaignId,
        selected === "NONE" ? null : selected,
      );
      onAssigned(campaign);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível atualizar o responsável.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir responsável</DialogTitle>
          <DialogDescription>
            Selecione um gestor de marketing ativo ou remova o responsável.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Carregando gestores...
            </p>
          ) : (
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={selected} onValueChange={(value) => value && setSelected(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Sem responsável</SelectItem>
                  {managers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={isSubmitting || isLoading} onClick={() => void handleSubmit()}>
            {isSubmitting ? <LoaderCircle className="animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
