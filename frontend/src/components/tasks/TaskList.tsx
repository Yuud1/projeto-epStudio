import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { TaskPriorityBadge } from "@/components/tasks/TaskPriorityBadge";
import { Link } from "react-router-dom";
import type { Task } from "@/types/task";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
    new Date(value),
  );
}

export function TaskList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhuma tarefa encontrada.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left">
          <tr>
            <th className="px-3 py-2 font-medium">Título</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Prioridade</th>
            <th className="px-3 py-2 font-medium">Responsáveis</th>
            <th className="px-3 py-2 font-medium">Prazo</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="border-b last:border-0">
              <td className="px-3 py-2">
                <Link to={`/tasks/${task.id}`} className="font-medium hover:underline">
                  {task.title}
                </Link>
              </td>
              <td className="px-3 py-2">
                <TaskStatusBadge status={task.status} />
              </td>
              <td className="px-3 py-2">
                <TaskPriorityBadge priority={task.priority} />
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {task.assignees.map((a) => a.user.name).join(", ") || "—"}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {formatDate(task.dueAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
