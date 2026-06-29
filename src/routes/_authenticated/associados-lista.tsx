import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
  status: z.enum(["ativo", "inativos"]).optional().default("ativo"),
});

export const Route = createFileRoute("/_authenticated/associados-lista")({
  head: () => ({ meta: [{ title: "Lista de associados — Memorial" }] }),
  validateSearch: searchSchema,
  component: AssociadosListaPage,
});

function AssociadosListaPage() {
  const { status } = Route.useSearch();
  const isAtivos = status === "ativo";

  const { data = [], isLoading } = useQuery({
    queryKey: ["associados-lista", status],
    queryFn: async () => {
      let q = supabase
        .from("associados")
        .select("id, codigo, nome, cpf, telefone, cidade, status, vencimento_dia, plano_id")
        .order("nome");
      q = isAtivos ? q.eq("status", "ativo") : q.neq("status", "ativo");
      const { data: assoc, error } = await q;
      if (error) throw error;
      const { data: planos } = await supabase.from("planos").select("id, nome");
      const planMap = new Map((planos ?? []).map((p: any) => [p.id, p.nome]));
      return (assoc ?? []).map((a: any) => ({ ...a, plano_nome: planMap.get(a.plano_id) ?? "—" }));
    },
  });

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
          <CardTitle className="font-serif">{data.length} associado(s)</CardTitle>
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
              {!isLoading && data.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Nenhum associado encontrado.</TableCell></TableRow>
              )}
              {data.map((a: any) => (
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
        </CardContent>
      </Card>
    </AppShell>
  );
}

// silence unused fmtDate import if not used later
void fmtDate;
