import { apiRequest } from "@/lib/api";
import type {
  CreateUserInput,
  UpdateUserInput,
  UserListItem,
} from "@/types/user";

export async function listUsersRequest(): Promise<UserListItem[]> {
  const data = await apiRequest<{ users: UserListItem[] }>("/users");
  return data.users;
}

export async function createUserRequest(
  input: CreateUserInput,
): Promise<UserListItem> {
  const data = await apiRequest<{ user: UserListItem }>("/users", {
    method: "POST",
    body: input,
  });
  return data.user;
}

export async function updateUserRequest(
  id: string,
  input: UpdateUserInput,
): Promise<UserListItem> {
  const data = await apiRequest<{ user: UserListItem }>(`/users/${id}`, {
    method: "PATCH",
    body: input,
  });
  return data.user;
}
