import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createCampaignSchema,
  type CreateCampaignFormValues,
} from "@/schemas/campaignSchemas";
import { CAMPAIGN_PRIORITY_LABELS } from "@/types/campaign";

interface CampaignFormProps {
  error?: string | null;
  isSubmitting?: boolean;
  onSubmit: (
    values: CreateCampaignFormValues,
    options: { saveAsDraft: boolean },
  ) => Promise<void>;
  onCancel: () => void;
}

export function CampaignForm({
  error,
  isSubmitting,
  onSubmit,
  onCancel,
}: CampaignFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateCampaignFormValues>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      title: "",
      description: "",
      objective: "",
      priority: "MEDIUM",
      startsAt: "",
      dueAt: "",
    },
  });

  const priority = watch("priority");

  return (
    <form className="space-y-4" noValidate>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input id="title" aria-invalid={Boolean(errors.title)} {...register("title")} />
        {errors.title ? (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          rows={5}
          aria-invalid={Boolean(errors.description)}
          {...register("description")}
        />
        {errors.description ? (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="objective">Objetivo</Label>
        <Textarea id="objective" rows={3} {...register("objective")} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Prioridade</Label>
          <Select
            value={priority}
            onValueChange={(value) => {
              if (value) {
                setValue("priority", value as CreateCampaignFormValues["priority"]);
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CAMPAIGN_PRIORITY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="startsAt">Data de início</Label>
          <Input id="startsAt" type="datetime-local" {...register("startsAt")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueAt">Prazo</Label>
          <Input id="dueAt" type="datetime-local" {...register("dueAt")} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmit((values) =>
            onSubmit(values, { saveAsDraft: false }),
          )}
        >
          {isSubmitting ? <LoaderCircle className="animate-spin" /> : null}
          Enviar chamado
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isSubmitting}
          onClick={handleSubmit((values) =>
            onSubmit(values, { saveAsDraft: true }),
          )}
        >
          Salvar rascunho
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
