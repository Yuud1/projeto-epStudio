import {
  CAMPAIGN_STATUS_LABELS,
  type CampaignActivity,
} from "@/types/campaign";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function CampaignTimeline({
  activities,
}: {
  activities: CampaignActivity[];
}) {
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
          {activity.type === "STATUS_CHANGED" &&
          activity.metadata &&
          typeof activity.metadata === "object" &&
          activity.metadata !== null &&
          "from" in activity.metadata &&
          "to" in activity.metadata ? (
            <p className="text-xs text-muted-foreground">
              {
                CAMPAIGN_STATUS_LABELS[
                  (activity.metadata as { from: keyof typeof CAMPAIGN_STATUS_LABELS }).from
                ]
              }{" "}
              →{" "}
              {
                CAMPAIGN_STATUS_LABELS[
                  (activity.metadata as { to: keyof typeof CAMPAIGN_STATUS_LABELS }).to
                ]
              }
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
