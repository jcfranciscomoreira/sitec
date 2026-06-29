import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/format";

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

function AssociadosListaPage() {
  const { status } = Route.useSearch();
  const statusFilter = normalizeStatusFilter(status);
  const isAtivos = statusFilter === "ativo";

  const { data = [], isLoading } = useQuery({
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

  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => data.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [data, currentPage]
  );

  return (
    <AppShell
      title={isAtivos ? "Associados ativos" : "Associados inativos"}
      subtitle={isAtivos ? "Lista completa dos associados ativos" : "Cancelados, suspensos e demais"}
    >
      <div className="mb-4">
        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Voltar ao painel</Link>
        </Button>
      </div>

      <Card className="border-border/60 shadow-soft">
        <CardHeader>
          <CardTitle className="font-serif">{total} associado(s)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
              )}
              {!isLoading && total === 0 && (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Nenhum associado encontrado.</TableCell></TableRow>
              )}
              {paged.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.codigo}</TableCell>
                  <TableCell className="font-medium">{a.nome}</TableCell>
                  <TableCell>{a.cpf ?? "—"}</TableCell>
                  <TableCell>{a.telefone ?? "—"}</TableCell>
                  <TableCell>{a.cidade ?? "—"}</TableCell>
                  <TableCell>{a.plano_nome ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, total)} de {total}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Anterior</Button>
                <span className="text-muted-foreground">Página {currentPage} de {totalPages}</span>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Próxima</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

// silence unused fmtDate import if not used later
void fmtDate;
