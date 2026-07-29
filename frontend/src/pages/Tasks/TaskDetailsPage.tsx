import { Link, useParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskDetails } from "@/components/tasks/TaskDetails";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getTask } from "@/services/tasksService";
import type { TaskDetail } from "@/types/task";

export function TaskDetailsPage() {
  const { id } = useParams();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setError("Tarefa inválida.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await getTask(id);
      setTask(data);
    } catch (err) {
      setTask(null);
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar a tarefa.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{error ?? "Tarefa não encontrada."}</AlertDescription>
        </Alert>
        <Link to="/tasks" className={cn(buttonVariants({ variant: "outline" }))}>
          Voltar
        </Link>
      </div>
    );
  }

  return <TaskDetails task={task} onReload={load} />;
}
