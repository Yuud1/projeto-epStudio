import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { OPERATIONAL_ROLES } from "@/types/auth";
import { cn } from "@/lib/utils";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "text-sm transition-colors hover:text-foreground",
    isActive ? "font-medium text-foreground" : "text-muted-foreground",
  );

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const showTasks =
    user &&
    (user.role === "ADMIN" ||
      user.role === "MARKETING_MANAGER" ||
      OPERATIONAL_ROLES.includes(user.role));

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <span className="text-sm font-medium tracking-tight">epStudio</span>
            <nav className="flex items-center gap-4">
              <NavLink to="/dashboard" className={linkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/campaigns" className={linkClass}>
                Chamados
              </NavLink>
              {showTasks ? (
                <NavLink to="/tasks" className={linkClass}>
                  Minhas tarefas
                </NavLink>
              ) : null}
              {user?.role === "ADMIN" && (
                <NavLink to="/users" className={linkClass}>
                  Usuários
                </NavLink>
              )}
            </nav>
          </div>

          <Button variant="ghost" size="sm" onClick={() => void handleLogout()}>
            <LogOut />
            Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
