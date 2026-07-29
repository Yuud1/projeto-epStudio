import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { listUsersRequest, updateUserRequest } from "@/services/usersService";
import { USER_ROLE_LABELS, type UserRole } from "@/types/auth";
import type { UserListItem } from "@/types/user";
import { CreateUserDialog } from "./CreateUserDialog";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await listUsersRequest();
      setUsers(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Não foi possível carregar os usuários.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function handleToggleActive(user: UserListItem) {
    if (user.active) {
      const confirmed = window.confirm(
        `Deseja desativar o usuário ${user.name}?`,
      );
      if (!confirmed) {
        return;
      }
    }

    setUpdatingId(user.id);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateUserRequest(user.id, {
        active: !user.active,
      });
      setUsers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSuccess(
        updated.active
          ? `${updated.name} foi ativado.`
          : `${updated.name} foi desativado.`,
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Não foi possível atualizar o status do usuário.");
      }
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleRoleChange(user: UserListItem, role: UserRole) {
    if (role === user.role) {
      return;
    }

    setUpdatingId(user.id);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateUserRequest(user.id, { role });
      setUsers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSuccess(`Papel de ${updated.name} atualizado.`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Não foi possível atualizar o papel do usuário.");
      }
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie acessos e papéis do ambiente interno.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Novo usuário
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Carregando usuários...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isSelf = currentUser?.id === user.id;

                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        disabled={updatingId === user.id}
                        onValueChange={(value) => {
                          if (value) {
                            void handleRoleChange(user, value as UserRole);
                          }
                        }}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue>
                            {USER_ROLE_LABELS[user.role]}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Administrador</SelectItem>
                          <SelectItem value="REQUESTER">Solicitante</SelectItem>
                          <SelectItem value="MARKETING_MANAGER">
                            Gerente de Marketing
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.active ? "default" : "secondary"}>
                        {user.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updatingId === user.id || isSelf}
                        onClick={() => {
                          void handleToggleActive(user);
                        }}
                      >
                        {updatingId === user.id ? (
                          <LoaderCircle className="animate-spin" />
                        ) : null}
                        {user.active ? "Desativar" : "Ativar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(user) => {
          setUsers((current) => [...current, user]);
          setSuccess(`${user.name} criado com sucesso.`);
        }}
      />
    </div>
  );
}
