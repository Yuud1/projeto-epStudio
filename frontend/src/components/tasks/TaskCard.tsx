import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TaskPriorityBadge } from "@/components/tasks/TaskPriorityBadge";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
    new Date(value),
  );
}

export function TaskCard({ task }: { task: Task }) {
  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap gap-2">
          <TaskStatusBadge status={task.status} />
          <TaskPriorityBadge priority={task.priority} />
        </div>
        <CardTitle className="text-lg">
          <Link to={`/tasks/${task.id}`} className="hover:underline">
            {task.title}
          </Link>
        </CardTitle>
        <CardDescription>{task.campaign.title}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-muted-foreground">
        <p>
          Responsáveis:{" "}
          {task.assignees.length > 0
            ? task.assignees.map((item) => item.user.name).join(", ")
            : "Sem responsáveis"}
        </p>
        <p>Prazo: {formatDate(task.dueAt)}</p>
      </CardContent>
      <CardFooter>
        <Link
          to={`/tasks/${task.id}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Ver detalhes
        </Link>
      </CardFooter>
    </Card>
  );
}
