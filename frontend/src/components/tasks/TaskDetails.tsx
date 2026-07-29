import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { TaskPriorityBadge } from "@/components/tasks/TaskPriorityBadge";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { TaskTimeline } from "@/components/tasks/TaskTimeline";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  cancelTask,
  changeTaskStatus,
  reopenTask,
} from "@/services/tasksService";
import { OPERATIONAL_ROLES } from "@/types/auth";
import {
  TASK_STATUS_LABELS,
  type TaskDetail,
  type TaskStatus,
} from "@/types/task";

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

const operationalTransitions: Partial<Record<TaskStatus, TaskStatus[]>> = {
  TODO: ["IN_PROGRESS"],
  IN_PROGRESS: ["BLOCKED", "IN_REVIEW"],
  BLOCKED: ["IN_PROGRESS"],
};

const managerTransitions: Partial<Record<TaskStatus, TaskStatus[]>> = {
  TODO: ["IN_PROGRESS"],
  IN_PROGRESS: ["BLOCKED", "IN_REVIEW", "DONE"],
  BLOCKED: ["IN_PROGRESS"],
  IN_REVIEW: ["IN_PROGRESS", "DONE"],
};

interface TaskDetailsProps {
  task: TaskDetail;
  onReload: () => Promise<void>;
}

export function TaskDetails({ task, onReload }: TaskDetailsProps) {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<TaskStatus | "">("");
  const [reason, setReason] = useState("");

  const isAssignee = task.assignees.some((item) => item.user.id === user?.id);
  const isManager =
    user?.role === "ADMIN" ||
    user?.role === "MARKETING_MANAGER";
  const isOperational = user && OPERATIONAL_ROLES.includes(user.role);

  const options = useMemo(() => {
    if (!user) return [];
    if (isOperational && isAssignee && !isManager) {
      return operationalTransitions[task.status] ?? [];
    }
    if (isManager) {
      return managerTransitions[task.status] ?? [];
    }
    return [];
  }, [user, isOperational, isAssignee, isManager, task.status]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await onReload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha na ação.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <TaskStatusBadge status={task.status} />
          <TaskPriorityBadge priority={task.priority} />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{task.title}</h1>
        <p className="text-sm text-muted-foreground">
          Campanha:{" "}
          <Link
            to={`/campaigns/${task.campaign.id}`}
            className="underline-offset-4 hover:underline"
          >
            {task.campaign.title}
          </Link>
        </p>
        <div className="grid gap-1 text-sm text-muted-foreground md:grid-cols-2">
          <p>Criador: {task.createdBy.name}</p>
          <p>
            Responsáveis:{" "}
            {task.assignees.map((a) => a.user.name).join(", ") || "—"}
          </p>
          <p>Prazo: {formatDateTime(task.dueAt)}</p>
          <p>Concluída em: {formatDateTime(task.completedAt)}</p>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {options.length > 0 ? (
          <Button
            onClick={() => {
              setNextStatus(options[0] ?? "");
              setStatusOpen(true);
            }}
          >
            Alterar status
          </Button>
        ) : null}

        {isManager &&
        task.status !== "DONE" &&
        task.status !== "CANCELLED" ? (
          <Button variant="destructive" onClick={() => setCancelOpen(true)}>
            Cancelar tarefa
          </Button>
        ) : null}

        {user?.role === "ADMIN" &&
        (task.status === "DONE" || task.status === "CANCELLED") ? (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await reopenTask(task.id, "TODO");
              })
            }
          >
            Reabrir
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Descrição</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm">
          {task.description || "Sem descrição."}
          {task.cancellationReason ? (
            <p className="mt-4 text-destructive">
              Motivo do cancelamento: {task.cancellationReason}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskTimeline activities={task.activities} />
        </CardContent>
      </Card>

      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar status</DialogTitle>
            <DialogDescription>
              Status atual: {TASK_STATUS_LABELS[task.status]}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Novo status</Label>
            <Select
              value={nextStatus}
              onValueChange={(value) => value && setNextStatus(value as TaskStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((status) => (
                  <SelectItem key={status} value={status}>
                    {TASK_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusOpen(false)}>
              Fechar
            </Button>
            <Button
              disabled={busy || !nextStatus}
              onClick={() =>
                void run(async () => {
                  await changeTaskStatus(task.id, nextStatus as TaskStatus);
                  setStatusOpen(false);
                })
              }
            >
              {busy ? <LoaderCircle className="animate-spin" /> : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Motivo</Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              disabled={busy || reason.trim().length < 5}
              onClick={() =>
                void run(async () => {
                  await cancelTask(task.id, reason.trim());
                  setCancelOpen(false);
                })
              }
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Link to="/tasks" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
        ← Minhas tarefas
      </Link>
    </div>
  );
}
