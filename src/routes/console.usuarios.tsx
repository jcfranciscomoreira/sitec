import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { listUsuarios } from "@/lib/usuarios.functions";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/console/usuarios")({
  component: ConsoleUsuariosPage,
});

function ConsoleUsuariosPage() {
  const fetchUsuarios = useServerFn(listUsuarios);
  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["console-usuarios"],
    queryFn: () => fetchUsuarios(),
  });

  return (
    <ConsoleShell title="Usuários da plataforma" subtitle="Contas de todas as empresas cadastradas">
      <Card>
        <CardHeader><CardTitle>{usuarios.length} usuários</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papéis</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Último acesso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nome || "—"}</TableCell>
                  <TableCell className="text-xs">{u.email}</TableCell>
                  <TableCell className="space-x-1">
                    {u.roles.map((r: string) => <Badge key={r} variant="outline">{r}</Badge>)}
                  </TableCell>
                  <TableCell className="text-xs">{fmtDate(u.created_at)}</TableCell>
                  <TableCell className="text-xs">{u.last_sign_in_at ? fmtDate(u.last_sign_in_at) : "nunca"}</TableCell>
                </TableRow>
              ))}
              {!isLoading && usuarios.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum usuário encontrado.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </ConsoleShell>
  );
}
