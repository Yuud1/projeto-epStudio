import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, LoaderCircle, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TaskList } from "@/components/tasks/TaskList";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import {
  listCampaignTasks,
  reorderCampaignTasks,
} from "@/services/tasksService";
import type { Campaign } from "@/types/campaign";
import type { Task } from "@/types/task";

interface CampaignTasksSectionProps {
  campaign: Campaign;
}

export function CampaignTasksSection({ campaign }: CampaignTasksSectionProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [reordering, setReordering] = useState(false);

  const canManage =
    user?.role === "ADMIN" ||
    (user?.role === "MARKETING_MANAGER" &&
      campaign.marketingManager?.id === user.id);

  const progress = campaign.taskProgress ?? {
    total: 0,
    completed: 0,
    percentage: 0,
  };

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listCampaignTasks(campaign.id, {
        limit: 100,
      });
      setTasks(response.data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as tarefas.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [campaign.id]);

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= tasks.length) return;

    const next = [...tasks];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setReordering(true);
    try {
      const updated = await reorderCampaignTasks(
        campaign.id,
        next.map((task, position) => ({ id: task.id, position })),
      );
      setTasks(updated);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Falha ao reordenar tarefas.",
      );
    } finally {
      setReordering(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Tarefas da campanha</CardTitle>
          <CardDescription>
            {progress.completed} de {progress.total} concluídas (
            {progress.percentage}%)
          </CardDescription>
          <Progress value={progress.percentage} className="mt-2 w-56" />
        </div>
        {canManage ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            Nova tarefa
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Carregando tarefas...
          </p>
        ) : (
          <>
            <TaskList tasks={tasks} />
            {canManage && tasks.length > 1 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Reordenar</p>
                {tasks.map((task, index) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <span>
                      {index + 1}. {task.title}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        disabled={reordering || index === 0}
                        onClick={() => void move(index, -1)}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        disabled={reordering || index === tasks.length - 1}
                        onClick={() => void move(index, 1)}
                      >
                        <ArrowDown />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </CardContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
          </DialogHeader>
          <TaskForm
            campaignId={campaign.id}
            onCreated={(task) => {
              setTasks((current) => [...current, task]);
              setCreateOpen(false);
            }}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
