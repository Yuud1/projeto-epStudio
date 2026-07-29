import { apiRequest } from "@/lib/api";
import type {
  CreateTaskInput,
  Task,
  TaskDetail,
  TaskFilters,
  TaskListResponse,
  TaskPriority,
  TaskStatus,
  TaskSummary,
} from "@/types/task";

function toQuery(filters: TaskFilters = {}): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function listCampaignTasks(
  campaignId: string,
  filters: TaskFilters = {},
): Promise<TaskListResponse> {
  return apiRequest(`/campaigns/${campaignId}/tasks${toQuery(filters)}`);
}

export async function listMyTasks(
  filters: TaskFilters = {},
): Promise<TaskListResponse> {
  return apiRequest(`/tasks/my${toQuery(filters)}`);
}

export async function getTaskSummary(): Promise<TaskSummary> {
  const data = await apiRequest<{ summary: TaskSummary }>("/tasks/summary");
  return data.summary;
}

export async function getTask(id: string): Promise<TaskDetail> {
  const data = await apiRequest<{ task: TaskDetail }>(`/tasks/${id}`);
  return data.task;
}

export async function createTask(
  campaignId: string,
  input: CreateTaskInput,
): Promise<Task> {
  const data = await apiRequest<{ task: Task }>(
    `/campaigns/${campaignId}/tasks`,
    { method: "POST", body: input },
  );
  return data.task;
}

export async function updateTask(
  id: string,
  input: {
    title?: string;
    description?: string | null;
    priority?: TaskPriority;
    dueAt?: string | null;
  },
): Promise<Task> {
  const data = await apiRequest<{ task: Task }>(`/tasks/${id}`, {
    method: "PATCH",
    body: input,
  });
  return data.task;
}

export async function changeTaskStatus(
  id: string,
  status: TaskStatus,
): Promise<Task> {
  const data = await apiRequest<{ task: Task }>(`/tasks/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
  return data.task;
}

export async function cancelTask(id: string, reason: string): Promise<Task> {
  const data = await apiRequest<{ task: Task }>(`/tasks/${id}/cancel`, {
    method: "POST",
    body: { reason },
  });
  return data.task;
}

export async function reopenTask(
  id: string,
  status: "TODO" | "IN_PROGRESS",
): Promise<Task> {
  const data = await apiRequest<{ task: Task }>(`/tasks/${id}/reopen`, {
    method: "POST",
    body: { status },
  });
  return data.task;
}

export async function addTaskAssignees(
  id: string,
  userIds: string[],
): Promise<Task> {
  const data = await apiRequest<{ task: Task }>(`/tasks/${id}/assignees`, {
    method: "POST",
    body: { userIds },
  });
  return data.task;
}

export async function removeTaskAssignee(
  id: string,
  userId: string,
): Promise<Task> {
  const data = await apiRequest<{ task: Task }>(
    `/tasks/${id}/assignees/${userId}`,
    { method: "DELETE" },
  );
  return data.task;
}

export async function reorderCampaignTasks(
  campaignId: string,
  tasks: Array<{ id: string; position: number }>,
): Promise<Task[]> {
  const data = await apiRequest<{ data: Task[] }>(
    `/campaigns/${campaignId}/tasks/reorder`,
    { method: "PATCH", body: { tasks } },
  );
  return data.data;
}
