import type { TaskActivity } from "@/types/task";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function TaskTimeline({ activities }: { activities: TaskActivity[] }) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma movimentação registrada.
      </p>
    );
  }

  return (
    <ol className="space-y-4 border-l pl-4">
      {activities.map((activity) => (
        <li key={activity.id} className="relative space-y-1">
          <span className="absolute top-1.5 -left-[1.35rem] size-2.5 rounded-full bg-foreground" />
          <p className="text-xs text-muted-foreground">
            {formatDateTime(activity.createdAt)}
          </p>
          <p className="text-sm font-medium">{activity.actor.name}</p>
          <p className="text-sm text-muted-foreground">{activity.description}</p>
        </li>
      ))}
    </ol>
  );
}
