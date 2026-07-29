import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import {
  createTaskSchema,
  type CreateTaskFormValues,
} from "@/schemas/taskSchemas";
import { listAssignableUsersRequest } from "@/services/usersService";
import { createTask } from "@/services/tasksService";
import { TASK_PRIORITY_LABELS, type Task } from "@/types/task";

interface AssignableUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TaskFormProps {
  campaignId: string;
  onCreated: (task: Task) => void;
  onCancel: () => void;
}

export function TaskForm({ campaignId, onCreated, onCancel }: TaskFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskFormValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "MEDIUM",
      dueAt: "",
      assigneeIds: [],
    },
  });

  const priority = watch("priority");
  const assigneeIds = watch("assigneeIds");

  useEffect(() => {
    void listAssignableUsersRequest()
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  async function onSubmit(values: CreateTaskFormValues) {
    setError(null);
    try {
      const task = await createTask(campaignId, {
        title: values.title,
        description: values.description || null,
        priority: values.priority,
        dueAt: values.dueAt ? new Date(values.dueAt).toISOString() : null,
        assigneeIds: values.assigneeIds,
      });
      onCreated(task);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao criar tarefa.");
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="task-title">Título</Label>
        <Input id="task-title" {...register("title")} />
        {errors.title ? (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-description">Descrição</Label>
        <Textarea id="task-description" rows={3} {...register("description")} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Prioridade</Label>
          <Select
            value={priority}
            onValueChange={(value) =>
              value && setValue("priority", value as CreateTaskFormValues["priority"])
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TASK_PRIORITY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="task-due">Prazo</Label>
          <Input id="task-due" type="datetime-local" {...register("dueAt")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Responsáveis</Label>
        <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-3">
          {users.map((user) => {
            const checked = assigneeIds.includes(user.id);
            return (
              <label key={user.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...assigneeIds, user.id]
                      : assigneeIds.filter((id) => id !== user.id);
                    setValue("assigneeIds", next);
                  }}
                />
                {user.name}
              </label>
            );
          })}
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum usuário operacional disponível (requer ADMIN para listar).
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <LoaderCircle className="animate-spin" /> : null}
          Criar tarefa
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
