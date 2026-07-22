import { createFileRoute, ErrorComponent } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, KeyRound, UserPlus, ShieldCheck } from "lucide-react";
import {
  listUsuarios, createUsuario, updateUsuarioRole, deleteUsuario, resetUsuarioPassword,
} from "@/lib/usuarios.functions";
import {
  listRolePermissions, updateRolePermission,
  listUserPermissions, setUserPermissionsBulk,
} from "@/lib/permissions.functions";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: UsuariosPage,
  errorComponent: ErrorComponent,
  notFoundComponent: () => <div className="p-6">Página não encontrada</div>,
});

type Role = "admin" | "operador" | "vendedor" | "cobrador" | "agente";
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
  cobrador: "Cobrador",
  agente: "Agente",
};

const ROLE_VARIANT: Record<Role, "default" | "secondary" | "outline"> = {
  admin: "default",
  operador: "secondary",
  vendedor: "outline",
  cobrador: "outline",
  agente: "outline",
};

const ALL_ROLES: Role[] = ["admin", "operador", "vendedor", "cobrador", "agente"];
// Módulos vêm do registro central em src/lib/modules.ts.
// Adicione novos módulos lá — aparecerão automaticamente nas permissões.
import { MODULES } from "@/lib/modules";
export { MODULES };

function UsuariosPage() {
  const listFn = useServerFn(listUsuarios);
  const createFn = useServerFn(createUsuario);
  const updateRoleFn = useServerFn(updateUsuarioRole);
  const deleteFn = useServerFn(deleteUsuario);
  const resetPwFn = useServerFn(resetUsuarioPassword);
  const listRolePermsFn = useServerFn(listRolePermissions);
  const bulkFn = useServerFn(setUserPermissionsBulk);

  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetUser, setResetUser] = useState<Usuario | null>(null);
  const [permsUser, setPermsUser] = useState<Usuario | null>(null);
  const [rolePerms, setRolePerms] = useState<Record<string, boolean>>({});

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [data, rp] = await Promise.all([listFn(), listRolePermsFn()]);
      setUsers(data as Usuario[]);
      const map: Record<string, boolean> = {};
      (rp as any[]).forEach((p) => { map[`${p.role}:${p.module}`] = !!p.allowed; });
      setRolePerms(map);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  function defaultsFor(role: Role): Record<string, boolean> {
    const d: Record<string, boolean> = {};
    if (role === "admin") {
      MODULES.forEach((m) => {
        d[m.key] = true;
        m.tabs?.forEach((t) => { d[`${m.key}.${t.key}`] = true; });
      });
      return d;
    }
    MODULES.forEach((m) => {
      d[m.key] = !!rolePerms[`${role}:${m.key}`];
      m.tabs?.forEach((t) => {
        const k = `${m.key}.${t.key}`;
        // padrão: se não houver registro de aba, herdar o do módulo
        const stored = rolePerms[`${role}:${k}`];
        d[k] = stored === undefined ? d[m.key] : !!stored;
      });
    });
    return d;
  }

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
      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="permissoes">Permissões padrão por perfil</TabsTrigger>
        </TabsList>
        <TabsContent value="usuarios">
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
                      <TableHead>Nível</TableHead>
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
                                  {ALL_ROLES.map((r) => (
                                    <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("pt-BR") : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => setPermsUser(u)}>
                              <ShieldCheck className="mr-1 h-3 w-3" /> Permissões
                            </Button>
                            <Button size="sm" variant="outline" className="ml-1" onClick={() => setResetUser(u)}>
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
        </TabsContent>
        <TabsContent value="permissoes">
          <PermissoesTab />
        </TabsContent>
      </Tabs>

      <CreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultsFor={defaultsFor}
        onCreate={async (form, perms) => {
          const created: any = await createFn({ data: { email: form.email, password: form.password, nome: form.nome, role: form.role } });
          const newUserId = created?.userId ?? created?.id ?? created?.user?.id;
          if (newUserId && perms) {
            const list = Object.entries(perms).map(([module, allowed]) => ({ module, allowed }));
            try { await bulkFn({ data: { userId: newUserId, permissions: list } }); }
            catch (e: any) { toast.error("Usuário criado, mas falhou ao salvar permissões: " + (e?.message ?? "")); }
          }
          toast.success("Usuário criado");
          setCreateOpen(false);
          refresh();
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
      <UserPermsDialog
        user={permsUser}
        defaultsFor={defaultsFor}
        onClose={() => setPermsUser(null)}
      />
    </AppShell>
  );
}

function CreateDialog({
  open, onClose, onCreate, defaultsFor,
}: {
  open: boolean; onClose: () => void;
  defaultsFor: (r: Role) => Record<string, boolean>;
  onCreate: (f: { email: string; password: string; nome: string; role: Role }, perms: Record<string, boolean>) => Promise<void>;
}) {
  const [form, setForm] = useState({ email: "", password: "", nome: "", role: "operador" as Role });
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ email: "", password: "", nome: "", role: "operador" });
      setPerms(defaultsFor("operador"));
    }
  }, [open]);

  useEffect(() => { if (open) setPerms(defaultsFor(form.role)); }, [form.role]);

  const groups = Array.from(new Set(MODULES.map((m) => m.group)));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Novo usuário</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div><Label>E-mail *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Senha * (mín. 8)</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div>
              <Label>Nível de acesso *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="cobrador">Cobrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border p-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Permissões deste usuário</h4>
              <Button type="button" size="sm" variant="ghost"
                onClick={() => setPerms(defaultsFor(form.role))}>
                Restaurar padrão do perfil
              </Button>
            </div>
            <p className="mb-2 text-xs text-muted-foreground">
              Comece com o padrão do perfil e ative/desative módulos para este usuário.
            </p>
            {form.role === "admin" ? (
              <p className="text-xs text-muted-foreground">Administradores têm acesso total — não é necessário configurar.</p>
            ) : (
              <div className="space-y-3">
                {groups.map((g) => (
                  <div key={g}>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                      {MODULES.filter((m) => m.group === g).map((m) => (
                        <div key={m.key} className="rounded border p-2 text-sm">
                          <label className="flex items-center justify-between">
                            <span className="font-medium">{m.label}</span>
                            <Switch checked={!!perms[m.key]}
                              onCheckedChange={(v) => setPerms((p) => {
                                const np = { ...p, [m.key]: v };
                                m.tabs?.forEach((t) => { np[`${m.key}.${t.key}`] = v; });
                                return np;
                              })} />
                          </label>
                          {m.tabs && perms[m.key] && (
                            <div className="mt-2 space-y-1 border-t pt-2 pl-2">
                              {m.tabs.map((t) => (
                                <label key={t.key} className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">↳ {t.label}</span>
                                  <Switch checked={!!perms[`${m.key}.${t.key}`]}
                                    onCheckedChange={(v) => setPerms((p) => ({ ...p, [`${m.key}.${t.key}`]: v }))} />
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={saving || !form.email || !form.password || !form.nome || form.password.length < 8}
            onClick={async () => {
              setSaving(true);
              try { await onCreate(form, form.role === "admin" ? {} : perms); }
              catch (e: any) { toast.error(e?.message ?? "Erro ao criar"); }
              finally { setSaving(false); }
            }}
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

function UserPermsDialog({
  user, onClose, defaultsFor,
}: { user: Usuario | null; onClose: () => void; defaultsFor: (r: Role) => Record<string, boolean> }) {
  const listFn = useServerFn(listUserPermissions);
  const bulkFn = useServerFn(setUserPermissionsBulk);
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const role = (user?.roles?.[0] ?? "operador") as Role;
  const defaults = useMemo(() => (user ? defaultsFor(role) : {}), [user, role]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    (async () => {
      try {
        const overrides = await listFn({ data: { userId: user.id } }) as { module: string; allowed: boolean }[];
        const map: Record<string, boolean> = { ...defaults };
        overrides.forEach((o) => { map[o.module] = !!o.allowed; });
        setPerms(map);
      } finally { setLoading(false); }
    })();
  }, [user]);

  const groups = Array.from(new Set(MODULES.map((m) => m.group)));

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      const list = Object.entries(perms).map(([module, allowed]) => ({ module, allowed }));
      await bulkFn({ data: { userId: user.id, permissions: list } });
      toast.success("Permissões salvas");
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Permissões — {user?.nome || user?.email}</DialogTitle>
        </DialogHeader>
        {role === "admin" ? (
          <p className="text-sm text-muted-foreground">Administradores têm acesso total.</p>
        ) : loading ? (
          <div className="flex items-center justify-center p-6 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Perfil base: <strong>{ROLE_LABEL[role]}</strong>. Ative ou desative módulos individualmente.
              </p>
              <Button type="button" size="sm" variant="ghost" onClick={() => setPerms(defaults)}>
                Restaurar padrão
              </Button>
            </div>
            {groups.map((g) => (
              <div key={g}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {MODULES.filter((m) => m.group === g).map((m) => {
                    const overridden = !!perms[m.key] !== !!defaults[m.key];
                    return (
                      <div key={m.key} className="rounded border p-2 text-sm">
                        <label className="flex items-center justify-between">
                          <span className="flex items-center gap-2 font-medium">
                            {m.label}
                            {overridden && <Badge variant="outline" className="text-[10px]">personalizado</Badge>}
                          </span>
                          <Switch checked={!!perms[m.key]}
                            onCheckedChange={(v) => setPerms((p) => {
                              const np = { ...p, [m.key]: v };
                              m.tabs?.forEach((t) => { np[`${m.key}.${t.key}`] = v; });
                              return np;
                            })} />
                        </label>
                        {m.tabs && perms[m.key] && (
                          <div className="mt-2 space-y-1 border-t pt-2 pl-2">
                            {m.tabs.map((t) => {
                              const tk = `${m.key}.${t.key}`;
                              const tOver = !!perms[tk] !== !!defaults[tk];
                              return (
                                <label key={t.key} className="flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    ↳ {t.label}
                                    {tOver && <Badge variant="outline" className="text-[9px]">personalizado</Badge>}
                                  </span>
                                  <Switch checked={!!perms[tk]}
                                    onCheckedChange={(v) => setPerms((p) => ({ ...p, [tk]: v }))} />
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          {role !== "admin" && (
            <Button disabled={saving || loading} onClick={save}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PermissoesTab() {
  const listFn = useServerFn(listRolePermissions);
  const updateFn = useServerFn(updateRolePermission);
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await listFn();
      const map: Record<string, boolean> = {};
      (data as any[]).forEach((p) => { map[`${p.role}:${p.module}`] = !!p.allowed; });
      setPerms(map);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function toggle(role: Role, module: string, allowed: boolean) {
    const key = `${role}:${module}`;
    setPerms((p) => ({ ...p, [key]: allowed }));
    try {
      await updateFn({ data: { role, module, allowed } });
      toast.success("Permissão atualizada");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
      setPerms((p) => ({ ...p, [key]: !allowed }));
    }
  }

  const groups = Array.from(new Set(MODULES.map((m) => m.group)));

  return (
    <Card>
      <CardContent className="p-4">
        {loading ? (
          <div className="flex items-center justify-center p-10 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Padrão por perfil. Cada usuário pode ter ajustes individuais no botão "Permissões".
            </p>
            {groups.map((group) => (
              <div key={group}>
                <h3 className="mb-2 font-serif text-sm font-semibold uppercase tracking-wider text-muted-foreground">{group}</h3>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Módulo</TableHead>
                        {ALL_ROLES.map((r) => (
                          <TableHead key={r} className="text-center">{ROLE_LABEL[r]}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {MODULES.filter((m) => m.group === group).flatMap((m) => [
                        <TableRow key={m.key}>
                          <TableCell className="font-medium">{m.label}</TableCell>
                          {ALL_ROLES.map((r) => {
                            const isAdmin = r === "admin";
                            const checked = isAdmin ? true : !!perms[`${r}:${m.key}`];
                            return (
                              <TableCell key={r} className="text-center">
                                <Switch
                                  checked={checked}
                                  disabled={isAdmin}
                                  onCheckedChange={(v) => toggle(r, m.key, v)}
                                />
                              </TableCell>
                            );
                          })}
                        </TableRow>,
                        ...(m.tabs?.map((t) => (
                          <TableRow key={`${m.key}.${t.key}`} className="bg-muted/30">
                            <TableCell className="pl-8 text-sm text-muted-foreground">↳ {t.label}</TableCell>
                            {ALL_ROLES.map((r) => {
                              const isAdmin = r === "admin";
                              const moduleOn = isAdmin || !!perms[`${r}:${m.key}`];
                              const tk = `${m.key}.${t.key}`;
                              const stored = perms[`${r}:${tk}`];
                              const checked = isAdmin ? true : (stored === undefined ? moduleOn : !!stored);
                              return (
                                <TableCell key={r} className="text-center">
                                  <Switch
                                    checked={checked}
                                    disabled={isAdmin || !moduleOn}
                                    onCheckedChange={(v) => toggle(r, tk, v)}
                                  />
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        )) ?? []),
                      ])}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
