import { createFileRoute, ErrorComponent, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, KeyRound, UserPlus } from "lucide-react";
import {
  listUsuarios, createUsuario, updateUsuarioRole, deleteUsuario, resetUsuarioPassword,
} from "@/lib/usuarios.functions";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: UsuariosPage,
  errorComponent: ErrorComponent,
  notFoundComponent: () => <div className="p-6">Página não encontrada</div>,
});

type Role = "admin" | "operador" | "vendedor";
type Usuario = {
  id: string;
  email: string;
  nome: string;
  roles: Role[];
  created_at: string;
  last_sign_in_at: string | null;
  confirmed: boolean;
};

const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  operador: "Operador",
  vendedor: "Vendedor",
};

const ROLE_VARIANT: Record<Role, "default" | "secondary" | "outline"> = {
  admin: "default",
  operador: "secondary",
  vendedor: "outline",
};

function UsuariosPage() {
  const router = useRouter();
  const listFn = useServerFn(listUsuarios);
  const createFn = useServerFn(createUsuario);
  const updateRoleFn = useServerFn(updateUsuarioRole);
  const deleteFn = useServerFn(deleteUsuario);
  const resetPwFn = useServerFn(resetUsuarioPassword);

  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetUser, setResetUser] = useState<Usuario | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listFn();
      setUsers(data as Usuario[]);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function changeRole(userId: string, role: Role) {
    try {
      await updateRoleFn({ data: { userId, role } });
      toast.success("Permissão atualizada");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao atualizar");
    }
  }

  async function handleDelete(u: Usuario) {
    if (!confirm(`Excluir o usuário ${u.email}?`)) return;
    try {
      await deleteFn({ data: { userId: u.id } });
      toast.success("Usuário excluído");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao excluir");
    }
  }

  return (
    <AppShell
      title="Usuários"
      subtitle="Cadastro e níveis de acesso"
      actions={
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo usuário
        </Button>
      }
    >
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-10 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
            </div>
          ) : error ? (
            <div className="p-6 text-destructive">{error}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Nível de acesso</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const currentRole = (u.roles[0] ?? "operador") as Role;
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.nome || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {u.email}
                          {!u.confirmed && <Badge variant="outline">não confirmado</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={ROLE_VARIANT[currentRole]}>{ROLE_LABEL[currentRole]}</Badge>
                          <Select value={currentRole} onValueChange={(v) => changeRole(u.id, v as Role)}>
                            <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="operador">Operador</SelectItem>
                              <SelectItem value="vendedor">Vendedor</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("pt-BR") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setResetUser(u)}>
                          <KeyRound className="mr-1 h-3 w-3" /> Senha
                        </Button>
                        <Button size="sm" variant="ghost" className="ml-1 text-destructive" onClick={() => handleDelete(u)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {users.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum usuário</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (form) => {
          try {
            await createFn({ data: form });
            toast.success("Usuário criado");
            setCreateOpen(false);
            refresh();
          } catch (e: any) {
            toast.error(e?.message ?? "Erro ao criar");
          }
        }}
      />
      <ResetPwDialog
        user={resetUser}
        onClose={() => setResetUser(null)}
        onReset={async (password) => {
          if (!resetUser) return;
          try {
            await resetPwFn({ data: { userId: resetUser.id, password } });
            toast.success("Senha redefinida");
            setResetUser(null);
          } catch (e: any) {
            toast.error(e?.message ?? "Erro");
          }
        }}
      />
    </AppShell>
  );
}

function CreateDialog({
  open, onClose, onCreate,
}: { open: boolean; onClose: () => void; onCreate: (f: { email: string; password: string; nome: string; role: Role }) => Promise<void> }) {
  const [form, setForm] = useState({ email: "", password: "", nome: "", role: "operador" as Role });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setForm({ email: "", password: "", nome: "", role: "operador" });
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Novo usuário</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div><Label>E-mail *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Senha * (mín. 8)</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <div>
            <Label>Nível de acesso *</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador — acesso total</SelectItem>
                <SelectItem value="operador">Operador — gestão diária</SelectItem>
                <SelectItem value="vendedor">Vendedor — mapa de vendas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={saving || !form.email || !form.password || !form.nome || form.password.length < 8}
            onClick={async () => { setSaving(true); try { await onCreate(form); } finally { setSaving(false); } }}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPwDialog({ user, onClose, onReset }: { user: Usuario | null; onClose: () => void; onReset: (pw: string) => Promise<void> }) {
  const [pw, setPw] = useState("");
  useEffect(() => { if (user) setPw(""); }, [user]);
  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Redefinir senha — {user?.email}</DialogTitle></DialogHeader>
        <div><Label>Nova senha (mín. 8)</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={pw.length < 8} onClick={() => onReset(pw)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
