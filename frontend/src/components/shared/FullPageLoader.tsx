import { LoaderCircle } from "lucide-react";

export function FullPageLoader({ message = "Carregando..." }: { message?: string }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background">
      <LoaderCircle className="size-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
