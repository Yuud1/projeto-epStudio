import { Badge } from "@/components/ui/badge";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/types/task";

const variants: Record<TaskStatus, "default" | "secondary" | "outline" | "destructive"> = {
  TODO: "outline",
  IN_PROGRESS: "default",
  BLOCKED: "destructive",
  IN_REVIEW: "secondary",
  DONE: "secondary",
  CANCELLED: "destructive",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Badge variant={variants[status]}>{TASK_STATUS_LABELS[status]}</Badge>;
}
