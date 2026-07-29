import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, LoaderCircle, Plus, RefreshCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiHealth } from "@/hooks/useApiHealth";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getCampaignSummary } from "@/services/campaignsService";
import { USER_ROLE_LABELS } from "@/types/auth";
import type { CampaignSummary } from "@/types/campaign";

function statusLabel(status: string) {
  switch (status) {
    case "loading":
      return "Testando conexão...";
    case "success":
      return "API online";
    case "error":
      return "API offline";
    default:
      return "Aguardando teste";
  }
}

export function DashboardPage() {
  const { user } = useAuth();
  const { status, data, error, checkHealth, isLoading } = useApiHealth();
  const [summary, setSummary] = useState<CampaignSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSummary() {
      setSummaryLoading(true);
      setSummaryError(null);

      try {
        const result = await getCampaignSummary();
        if (active) {
          setSummary(result);
        }
      } catch (err) {
        if (active) {
          setSummaryError(
            err instanceof ApiError
              ? err.message
              : "Não foi possível carregar o resumo.",
          );
        }
      } finally {
        if (active) {
          setSummaryLoading(false);
        }
      }
    }

    void loadSummary();

    return () => {
      active = false;
    };
  }, []);

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Olá, {user.name}
        </h1>
        <p className="text-muted-foreground">{user.email}</p>
        <p className="text-sm">
          Papel:{" "}
          <span className="font-medium">{USER_ROLE_LABELS[user.role]}</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/campaigns" className={cn(buttonVariants())}>
          Ver chamados
        </Link>
        <Link
          to="/campaigns/new"
          className={cn(buttonVariants({ variant: "secondary" }))}
        >
          <Plus />
          Criar chamado
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryLoading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : summaryError ? (
          <Card className="sm:col-span-2 lg:col-span-4">
            <CardContent className="pt-6 text-sm text-destructive">
              {summaryError}
            </CardContent>
          </Card>
        ) : summary ? (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Chamados abertos</CardDescription>
                <CardTitle className="text-3xl">{summary.open}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Em andamento</CardDescription>
                <CardTitle className="text-3xl">{summary.inProgress}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Aguardando aprovação</CardDescription>
                <CardTitle className="text-3xl">
                  {summary.waitingApproval}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Concluídos</CardDescription>
                <CardTitle className="text-3xl">{summary.completed}</CardTitle>
              </CardHeader>
            </Card>
          </>
        ) : null}
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4" />
            Status da API
          </CardTitle>
          <CardDescription>
            Teste a conexão com o backend em{" "}
            <code className="text-xs">GET /health</code>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <p className="text-sm">
            Status: <span className="font-medium">{statusLabel(status)}</span>
          </p>

          {status === "success" && data && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p>
                <span className="text-muted-foreground">status:</span>{" "}
                {data.status}
              </p>
              <p>
                <span className="text-muted-foreground">message:</span>{" "}
                {data.message}
              </p>
            </div>
          )}

          {status === "error" && error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </CardContent>

        <CardFooter>
          <Button onClick={checkHealth} disabled={isLoading}>
            {isLoading ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <RefreshCw />
            )}
            {isLoading ? "Testando..." : "Testar conexão com o backend"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
