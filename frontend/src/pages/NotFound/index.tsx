import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export function NotFoundPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col items-start justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        Página não encontrada
      </h1>
      <p className="text-muted-foreground">
        O endereço acessado não existe neste ambiente.
      </p>
      <Link
        to={isAuthenticated ? "/dashboard" : "/login"}
        className={cn(buttonVariants())}
      >
        {isAuthenticated ? "Ir para o dashboard" : "Ir para o login"}
      </Link>
    </div>
  );
}
