import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Unauthorized() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Acesso negado</h1>
      <p className="text-muted-foreground">
        Você não possui permissão para acessar esta página.
      </p>
      <Link to="/dashboard" className={cn(buttonVariants())}>
        Voltar ao dashboard
      </Link>
    </div>
  );
}
