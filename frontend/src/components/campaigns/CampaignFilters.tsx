import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CAMPAIGN_PRIORITY_LABELS,
  CAMPAIGN_STATUS_LABELS,
  type CampaignFilters,
  type CampaignPriority,
  type CampaignStatus,
} from "@/types/campaign";

interface CampaignFiltersProps {
  value: CampaignFilters;
  onChange: (next: CampaignFilters) => void;
  showAdminFilters?: boolean;
}

export function CampaignFiltersBar({
  value,
  onChange,
  showAdminFilters = false,
}: CampaignFiltersProps) {
  return (
    <div className="grid gap-4 rounded-xl border p-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2 lg:col-span-2">
        <Label htmlFor="search">Busca</Label>
        <Input
          id="search"
          placeholder="Título ou descrição"
          value={value.search ?? ""}
          onChange={(event) =>
            onChange({ ...value, search: event.target.value, page: 1 })
          }
        />
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={value.status ?? "ALL"}
          onValueChange={(status) =>
            onChange({
              ...value,
              status:
                !status || status === "ALL"
                  ? undefined
                  : (status as CampaignStatus),
              page: 1,
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            {Object.entries(CAMPAIGN_STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Prioridade</Label>
        <Select
          value={value.priority ?? "ALL"}
          onValueChange={(priority) =>
            onChange({
              ...value,
              priority:
                !priority || priority === "ALL"
                  ? undefined
                  : (priority as CampaignPriority),
              page: 1,
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            {Object.entries(CAMPAIGN_PRIORITY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showAdminFilters ? (
        <p className="text-sm text-muted-foreground md:col-span-2 lg:col-span-4">
          Filtros administrativos avançados por solicitante/responsável podem
          ser aplicados via API. Use a busca e os filtros acima no painel.
        </p>
      ) : null}
    </div>
  );
}
