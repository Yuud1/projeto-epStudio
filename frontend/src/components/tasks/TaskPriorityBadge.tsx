import { Badge } from "@/components/ui/badge";
import { TASK_PRIORITY_LABELS, type TaskPriority } from "@/types/task";

const variants: Record<TaskPriority, "default" | "secondary" | "outline" | "destructive"> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "default",
  URGENT: "destructive",
};

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <Badge variant={variants[priority]}>{TASK_PRIORITY_LABELS[priority]}</Badge>
  );
}
