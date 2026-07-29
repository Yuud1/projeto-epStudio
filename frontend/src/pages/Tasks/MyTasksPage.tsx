import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskCard } from "@/components/tasks/TaskCard";
import { ApiError } from "@/lib/api";
import { getTaskSummary, listMyTasks } from "@/services/tasksService";
import {
  TASK_STATUS_LABELS,
  type Task,
  type TaskStatus,
  type TaskSummary,
} from "@/types/task";

export function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [status, setStatus] = useState<TaskStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [list, summaryData] = await Promise.all([
          listMyTasks({
            status: status === "ALL" ? undefined : status,
            search: search || undefined,
            limit: 50,
          }),
          getTaskSummary(),
        ]);
        if (!active) return;
        setTasks(list.data);
        setSummary(summaryData);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar suas tarefas.",
        );
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [status, search]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Minhas tarefas</h1>
        <p className="text-muted-foreground">
          Acompanhe e atualize as atividades atribuídas a você.
        </p>
      </div>

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Total" value={summary.total} />
          <SummaryCard label="Em andamento" value={summary.inProgress} />
          <SummaryCard label="Em revisão" value={summary.inReview} />
          <SummaryCard label="Atrasadas" value={summary.overdue} />
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="task-search">Busca</Label>
          <Input
            id="task-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Título ou descrição"
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(value) =>
              value && setStatus(value as TaskStatus | "ALL")
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              {Object.entries(TASK_STATUS_LABELS)
                .filter(([key]) => key !== "CANCELLED")
                .map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma tarefa atribuída no momento.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
