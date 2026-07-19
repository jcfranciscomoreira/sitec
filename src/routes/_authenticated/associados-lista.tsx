import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { z } from "zod";
import { ArrowLeft, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonTable } from "@/components/ui/skeleton-table";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/ui/responsive-table";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const searchSchema = z.object({
  status: z.string().optional().default("ativo"),
});

function normalizeStatusFilter(status?: string) {
  return ["inativo", "inativos", "suspenso", "suspensos"].includes(status ?? "") ? "inativos" : "ativo";
}

export const Route = createFileRoute("/_authenticated/associados-lista")({
  head: () => ({ meta: [{ title: "Lista de associados — Memorial" }] }),
  validateSearch: searchSchema,
  component: AssociadosListaPage,
});

type Assoc = {
  id: string;
  codigo?: string | null;
  nome: string;
  cpf?: string | null;
  telefone?: string | null;
  cidade?: string | null;
  status?: string | null;
  plano_nome?: string | null;
};

function AssociadosListaPage() {
  const { status } = Route.useSearch();
  const statusFilter = normalizeStatusFilter(status);
  const isAtivos = statusFilter === "ativo";

  const { data = [], isLoading, isError, refetch } = useQuery<Assoc[]>({
    queryKey: ["associados-lista", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("associados")
        .select("id, codigo, nome, cpf, telefone, cidade, status, dia_vencimento, plano_id")
        .order("nome");
      q = isAtivos ? q.eq("status", "ativo") : q.in("status", ["inativo", "suspenso"]);
      const { data: assoc, error } = await q;
      if (error) throw error;
      const { data: planos } = await supabase.from("planos").select("id, nome");
      const planMap = new Map((planos ?? []).map((p: any) => [p.id, p.nome]));
      return (assoc ?? []).map((a: any) => ({ ...a, plano_nome: planMap.get(a.plano_id) ?? "—" }));
    },
  });

  const [busca, setBusca] = useState("");
  const buscaDebounced = useDebouncedValue(busca, 300);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => { setPage(1); }, [buscaDebounced]);

  const filtered = useMemo(() => {
    const q = buscaDebounced.trim().toLowerCase();
    if (!q) return data;
    return data.filter((a) =>
      [a.nome, a.cpf, a.codigo, a.telefone, a.cidade]
        .some((v) => (v ?? "").toString().toLowerCase().includes(q))
    );
  }, [data, buscaDebounced]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

  const columns: ResponsiveColumn<Assoc>[] = [
    { key: "codigo", label: "Código", render: (a) => <span className="font-mono text-xs">{a.codigo ?? "—"}</span> },
    { key: "nome", label: "Nome", render: (a) => <span className="font-medium">{a.nome}</span> },
    { key: "cpf", label: "CPF", hideOnMobile: true, render: (a) => a.cpf ?? "—" },
    { key: "telefone", label: "Telefone", hideOnMobile: true, render: (a) => a.telefone ?? "—" },
    { key: "cidade", label: "Cidade", hideOnMobile: true, render: (a) => a.cidade ?? "—" },
    { key: "plano", label: "Plano", render: (a) => a.plano_nome ?? "—" },
    { key: "status", label: "Status", render: (a) => <Badge variant="outline">{a.status}</Badge> },
  ];

  return (
    <AppShell
      title={isAtivos ? "Associados ativos" : "Associados inativos"}
      subtitle={isAtivos ? "Lista completa dos associados ativos" : "Cancelados, suspensos e demais"}
    >
      <div className="mb-4">
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
          <Link to="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Voltar ao painel</Link>
        </Button>
      </div>

      <Card className="border-border/60 shadow-soft">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="font-serif text-base sm:text-lg">{total} associado(s)</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF, código..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : isLoading ? (
            <SkeletonTable rows={6} cols={5} />
          ) : total === 0 ? (
            <EmptyState title="Nenhum associado encontrado" message={buscaDebounced ? "Tente ajustar sua busca." : undefined} />
          ) : (
            <>
              <ResponsiveTable
                columns={columns}
                rows={paged}
                getRowKey={(a) => a.id}
              />
              <PaginationBar page={currentPage} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
