import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveTable } from "@/components/Skeletons";
import { Plus, Edit, Trash2, ArrowUp, ArrowDown, History } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export function EstoqueManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [movItem, setMovItem] = useState<any>(null);
  const [histItem, setHistItem] = useState<any>(null);

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ["estoque-itens"],
    queryFn: async () => {
      const { data } = await supabase.from("estoque_itens")
        .select("*, servicos_produtos(nome)")
        .order("nome");
      return data ?? [];
    },
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ["servicos-produtos-ativos-estoque"],
    queryFn: async () => {
      const { data } = await supabase.from("servicos_produtos")
        .select("id, nome, tipo").eq("ativo", true).order("nome");
      return data ?? [];
    },
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("estoque_itens").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Item excluído"); qc.invalidateQueries({ queryKey: ["estoque-itens"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-lg font-semibold">Controle de Estoque</h3>
        <Button size="sm" onClick={() => setEditing({})}><Plus size={14} className="mr-1" />Novo item</Button>
      </div>

      {isLoading ? (
        <div className="p-6 text-center italic text-muted-foreground">Carregando...</div>
      ) : itens.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed rounded-lg bg-muted/10">
          <p className="text-muted-foreground">Nenhum item de estoque cadastrado.</p>
        </div>
      ) : (
        <ResponsiveTable>
          <thead>
            <tr>
              <th>Item</th>
              <th>Vinculado a</th>
              <th>Unidade</th>
              <th>Quantidade</th>
              <th>Mínimo</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((i: any) => {
              const abaixo = Number(i.quantidade) <= Number(i.estoque_minimo);
              return (
                <tr key={i.id}>
                  <td className="font-medium">{i.nome}</td>
                  <td className="text-sm text-muted-foreground">{i.servicos_produtos?.nome ?? "-"}</td>
                  <td>{i.unidade ?? "-"}</td>
                  <td className={abaixo ? "text-red-600 font-semibold" : ""}>{Number(i.quantidade)}</td>
                  <td>{Number(i.estoque_minimo)}</td>
                  <td>
                    {abaixo
                      ? <Badge className="bg-red-100 text-red-800">Abaixo do mínimo</Badge>
                      : <Badge className="bg-green-100 text-green-800">OK</Badge>}
                  </td>
                  <td className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="ghost" onClick={() => setMovItem({ item: i, tipo: "entrada" })}>
                      <ArrowUp size={14} className="text-green-600" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setMovItem({ item: i, tipo: "saida" })}>
                      <ArrowDown size={14} className="text-orange-600" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setHistItem(i)}>
                      <History size={14} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(i)}>
                      <Edit size={14} className="text-blue-600" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      if (confirm(`Excluir item "${i.nome}"?`)) delMut.mutate(i.id);
                    }}>
                      <Trash2 size={14} className="text-red-600" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </ResponsiveTable>
      )}

      {editing && (
        <ItemDialog
          item={editing}
          produtos={produtos}
          onOpenChange={(o: boolean) => !o && setEditing(null)}
        />
      )}
      {movItem && (
        <MovimentoDialog
          item={movItem.item}
          tipoInicial={movItem.tipo}
          onOpenChange={(o: boolean) => !o && setMovItem(null)}
        />
      )}
      {histItem && (
        <HistoricoDialog item={histItem} onOpenChange={(o: boolean) => !o && setHistItem(null)} />
      )}

      <div className="pt-6 border-t">
        <EstoqueHistoricoGeral />
      </div>
    </div>
  );
}


function ItemDialog({ item, produtos, onOpenChange }: any) {
  const qc = useQueryClient();
  const isEdit = !!item?.id;
  const [form, setForm] = useState<any>({
    nome: item?.nome ?? "",
    unidade: item?.unidade ?? "",
    quantidade: item?.quantidade ?? 0,
    estoque_minimo: item?.estoque_minimo ?? 0,
    produto_id: item?.produto_id ?? "",
    ativo: item?.ativo ?? true,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: form.nome,
        unidade: form.unidade || null,
        quantidade: Number(form.quantidade) || 0,
        estoque_minimo: Number(form.estoque_minimo) || 0,
        produto_id: form.produto_id || null,
        ativo: form.ativo,
      };
      if (isEdit) {
        const { error } = await supabase.from("estoque_itens").update(payload).eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("estoque_itens").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Item atualizado" : "Item cadastrado");
      qc.invalidateQueries({ queryKey: ["estoque-itens"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? "Editar item" : "Novo item de estoque"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Unidade</Label><Input value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} placeholder="un, kg, cx..." /></div>
            <div>
              <Label>Vincular ao catálogo</Label>
              <Select value={form.produto_id || "__none__"} onValueChange={(v) => setForm({ ...form, produto_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Sem vínculo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem vínculo</SelectItem>
                  {produtos.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Quantidade atual</Label><Input type="number" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} /></div>
            <div><Label>Estoque mínimo</Label><Input type="number" value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })} /></div>
          </div>
          <p className="text-xs text-muted-foreground">
            Vincule um item de catálogo para que a baixa aconteça automaticamente quando a OS for Concluída.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.nome}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MovimentoDialog({ item, tipoInicial, onOpenChange }: any) {
  const qc = useQueryClient();
  const [tipo, setTipo] = useState<"entrada" | "saida" | "ajuste">(tipoInicial);
  const [qty, setQty] = useState<string>("");
  const [obs, setObs] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const q = Number(qty);
      if (!q || q <= 0) throw new Error("Quantidade inválida");
      const uid = (await supabase.auth.getUser()).data.user?.id ?? null;
      const { error } = await supabase.from("estoque_movimentos").insert({
        item_id: item.id, tipo, quantidade: q, observacao: obs || null, created_by: uid,
      });
      if (error) throw error;
      const atual = Number(item.quantidade);
      const nova = tipo === "entrada" ? atual + q : tipo === "saida" ? atual - q : q;
      const { error: uErr } = await supabase.from("estoque_itens").update({ quantidade: nova }).eq("id", item.id);
      if (uErr) throw uErr;
    },
    onSuccess: () => {
      toast.success("Movimento registrado");
      qc.invalidateQueries({ queryKey: ["estoque-itens"] });
      qc.invalidateQueries({ queryKey: ["estoque-mov", item.id] });
      qc.invalidateQueries({ queryKey: ["estoque-mov-all"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Movimentar: {item.nome}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
                <SelectItem value="ajuste">Ajuste (definir quantidade)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{tipo === "ajuste" ? "Nova quantidade" : "Quantidade"}</Label>
            <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div><Label>Observação</Label><Input value={obs} onChange={(e) => setObs(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">Atual: {Number(item.quantidade)}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function enrichMovs(raw: any[]) {
  const uids = [...new Set(raw.map((m: any) => m.created_by).filter(Boolean))] as string[];
  const sids = [...new Set(raw.map((m: any) => m.servico_id).filter(Boolean))] as string[];
  const [profs, svs] = await Promise.all([
    uids.length
      ? supabase.from("profiles").select("id, nome").in("id", uids)
      : Promise.resolve({ data: [] as any[] }),
    sids.length
      ? supabase.from("servicos_funerarios").select("id, numero_servico, falecido_nome").in("id", sids)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const pMap = Object.fromEntries((profs.data ?? []).map((p: any) => [p.id, p.nome]));
  const sMap = Object.fromEntries((svs.data ?? []).map((s: any) => [s.id, s]));
  return raw.map((m: any) => ({
    ...m,
    _user: pMap[m.created_by] ?? (m.created_by ? "usuário" : "sistema"),
    _os: sMap[m.servico_id],
  }));
}

function HistoricoDialog({ item, onOpenChange }: any) {
  const { data: movs = [] } = useQuery({
    queryKey: ["estoque-mov", item.id],
    queryFn: async () => {
      const { data } = await supabase.from("estoque_movimentos")
        .select("*").eq("item_id", item.id).order("created_at", { ascending: false }).limit(200);
      return enrichMovs(data ?? []);
    },
  });
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Histórico: {item.nome}</DialogTitle></DialogHeader>
        {movs.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Sem movimentações.</p>
        ) : (
          <ResponsiveTable>
            <thead><tr><th>Data</th><th>Tipo</th><th>Qtd</th><th>OS</th><th>Usuário</th><th>Observação</th></tr></thead>
            <tbody>
              {movs.map((m: any) => (
                <tr key={m.id}>
                  <td>{format(new Date(m.created_at), "dd/MM/yyyy HH:mm")}</td>
                  <td>
                    <Badge variant="outline" className={
                      m.tipo === "entrada" ? "text-green-700 border-green-300" :
                      m.tipo === "saida" ? "text-orange-700 border-orange-300" : ""
                    }>{m.tipo}</Badge>
                  </td>
                  <td>{Number(m.quantidade)}</td>
                  <td className="text-sm">{m._os ? `#${m._os.numero_servico}` : "-"}</td>
                  <td className="text-sm">{m._user}</td>
                  <td className="text-sm">{m.observacao ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </ResponsiveTable>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function EstoqueHistoricoGeral() {
  const { data: movs = [], isLoading } = useQuery({
    queryKey: ["estoque-mov-all"],
    queryFn: async () => {
      const { data } = await supabase.from("estoque_movimentos")
        .select("*, estoque_itens(nome)")
        .order("created_at", { ascending: false })
        .limit(500);
      return enrichMovs(data ?? []);
    },
  });
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Histórico geral de movimentações</h3>
      {isLoading ? (
        <div className="p-6 text-center italic text-muted-foreground">Carregando...</div>
      ) : movs.length === 0 ? (
        <div className="p-6 text-center border-2 border-dashed rounded-lg bg-muted/10 text-muted-foreground">
          Nenhuma movimentação registrada.
        </div>
      ) : (
        <ResponsiveTable>
          <thead>
            <tr><th>Data</th><th>Item</th><th>Tipo</th><th>Qtd</th><th>OS</th><th>Falecido</th><th>Usuário</th><th>Observação</th></tr>
          </thead>
          <tbody>
            {movs.map((m: any) => (
              <tr key={m.id}>
                <td className="text-sm">{format(new Date(m.created_at), "dd/MM/yyyy HH:mm")}</td>
                <td className="font-medium">{m.estoque_itens?.nome ?? "-"}</td>
                <td>
                  <Badge variant="outline" className={
                    m.tipo === "entrada" ? "text-green-700 border-green-300" :
                    m.tipo === "saida" ? "text-orange-700 border-orange-300" : ""
                  }>{m.tipo}</Badge>
                </td>
                <td>{Number(m.quantidade)}</td>
                <td className="text-sm">{m._os ? `#${m._os.numero_servico}` : "-"}</td>
                <td className="text-sm">{m._os?.falecido_nome ?? "-"}</td>
                <td className="text-sm">{m._user}</td>
                <td className="text-sm">{m.observacao ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </ResponsiveTable>
      )}
    </div>
  );
}

