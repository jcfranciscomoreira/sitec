import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Printer, Upload, FileText, Loader2, X, Download, Paperclip } from "lucide-react";
import { getEmpresaHeaderHTML } from "@/lib/print-header";
import { format } from "date-fns";

const OS_STATUS = ["Aberta", "Em Execução", "Concluída", "Cancelada"] as const;

type Anexo = { path: string; name: string; type?: string; size?: number };

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function OSDialog({
  servico,
  open,
  onOpenChange,
}: {
  servico: any;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({});
  const [checklist, setChecklist] = useState<{ item: string; concluido: boolean }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [signedMap, setSignedMap] = useState<Record<string, string>>({});

  const { data: catalogo = [] } = useQuery({
    queryKey: ["servicos-produtos-ativos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("servicos_produtos")
        .select("id, nome, tipo, preco")
        .eq("ativo", true)
        .order("nome");
      return data || [];
    },
  });

  const { data: existingChecklist = [] } = useQuery({
    queryKey: ["servico-checklist", servico?.id],
    enabled: !!servico?.id && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("servico_checklist")
        .select("*")
        .eq("servico_id", servico.id);
      return data || [];
    },
  });

  // Agentes: usuários com role 'agente' + o usuário logado (se agente)
  const { data: agentes = [] } = useQuery({
    queryKey: ["usuarios-agentes"],
    enabled: open,
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "agente" as any);
      const ids = (roles ?? []).map((r: any) => r.user_id);
      if (!ids.length) return [] as { id: string; nome: string }[];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, nome")
        .in("id", ids);
      return (profs ?? []).filter((p: any) => p.nome).sort((a: any, b: any) => a.nome.localeCompare(b.nome));
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user-agente"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return null;
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("nome").eq("id", data.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", data.user.id),
      ]);
      const isAgente = (r ?? []).some((x: any) => x.role === "agente");
      return { id: data.user.id, nome: p?.nome ?? "", isAgente };
    },
  });

  useEffect(() => {
    if (!open || !servico) return;
    let initialAnexos: Anexo[] = [];
    if (Array.isArray(servico.os_arquivos) && servico.os_arquivos.length) {
      initialAnexos = servico.os_arquivos as Anexo[];
    } else if (servico.os_assinada_url) {
      initialAnexos = [{ path: servico.os_assinada_url, name: "OS assinada", type: "image/*" }];
    }
    setAnexos(initialAnexos);
    setForm({
      os_data: servico.os_data || format(new Date(), "yyyy-MM-dd"),
      os_hora: servico.os_hora || format(new Date(), "HH:mm"),
      atendente_nome: servico.atendente_nome || "",
      autorizacao_responsavel: servico.autorizacao_responsavel || "",
      responsavel_nome: servico.responsavel_nome || "",
      responsavel_telefone: servico.responsavel_telefone || "",
      agente_funerario: servico.agente_funerario || "",
      veiculo_placa: servico.veiculo_placa || "",
      os_materiais: servico.os_materiais || "",
      status: servico.status || "Aberta",
    });
    if (!servico.atendente_nome && currentUser?.nome) {
      setForm((f: any) => ({ ...f, atendente_nome: currentUser.nome }));
    }
    if (!servico.agente_funerario && currentUser?.isAgente && currentUser?.nome) {
      setForm((f: any) => ({ ...f, agente_funerario: currentUser.nome }));
    }
    setChecklist(
      existingChecklist.length
        ? existingChecklist.map((c: any) => ({ item: c.item, concluido: !!c.concluido }))
        : []
    );
  }, [open, servico, existingChecklist.length, currentUser?.id]);

  // Signed URLs para anexos
  useEffect(() => {
    if (!anexos.length) { setSignedMap({}); return; }
    let cancel = false;
    (async () => {
      const entries = await Promise.all(anexos.map(async (a) => {
        const { data } = await supabase.storage.from("os-assinadas").createSignedUrl(a.path, 3600);
        return [a.path, data?.signedUrl || ""] as const;
      }));
      if (!cancel) setSignedMap(Object.fromEntries(entries));
    })();
    return () => { cancel = true; };
  }, [anexos]);

  const totalChecklist = useMemo(() => {
    return checklist.reduce((sum, c) => {
      const p = catalogo.find((x: any) => x.nome === c.item);
      return sum + (Number(p?.preco) || 0);
    }, 0);
  }, [checklist, catalogo]);

  const toggleItem = (nome: string) => {
    setChecklist((prev) => {
      const exists = prev.find((c) => c.item === nome);
      if (exists) return prev.filter((c) => c.item !== nome);
      return [...prev, { item: nome, concluido: false }];
    });
  };

  const setConcluido = (nome: string, v: boolean) => {
    setChecklist((prev) => prev.map((c) => (c.item === nome ? { ...c, concluido: v } : c)));
  };

  const handleUpload = async (files: FileList | File[]) => {
    if (!servico?.id) return;
    const arr = Array.from(files);
    if (!arr.length) return;
    setUploading(true);
    try {
      const uploaded: Anexo[] = [];
      for (const file of arr) {
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${servico.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
        const { error } = await supabase.storage.from("os-assinadas").upload(path, file, {
          upsert: false, contentType: file.type || "application/octet-stream",
        });
        if (error) throw error;
        uploaded.push({ path, name: file.name, type: file.type, size: file.size });
      }
      setAnexos((prev) => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} arquivo(s) enviado(s)`);
    } catch (e: any) {
      toast.error("Erro no upload: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const removeAnexo = async (a: Anexo) => {
    setAnexos((prev) => prev.filter((x) => x.path !== a.path));
    try { await supabase.storage.from("os-assinadas").remove([a.path]); } catch { /* noop */ }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("servicos_funerarios")
        .update({
          os_data: form.os_data || null,
          os_hora: form.os_hora || null,
          atendente_nome: form.atendente_nome || null,
          autorizacao_responsavel: form.autorizacao_responsavel || null,
          responsavel_nome: form.responsavel_nome || null,
          responsavel_telefone: form.responsavel_telefone || null,
          agente_funerario: form.agente_funerario || null,
          veiculo_placa: form.veiculo_placa || null,
          os_materiais: form.os_materiais || null,
          status: form.status,
          os_assinada_url: anexos[0]?.path ?? null,
          os_arquivos: anexos as any,
        })
        .eq("id", servico.id);
      if (error) throw error;

      await supabase.from("servico_checklist").delete().eq("servico_id", servico.id);
      if (checklist.length) {
        const { error: cErr } = await supabase.from("servico_checklist").insert(
          checklist.map((c) => ({ servico_id: servico.id, item: c.item, concluido: c.concluido }))
        );
        if (cErr) throw cErr;
      }
    },
    onSuccess: () => {
      toast.success("OS salva");
      qc.invalidateQueries({ queryKey: ["servicos-funerarios-list"] });
      qc.invalidateQueries({ queryKey: ["servico-checklist", servico.id] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const handlePrint = async () => {
    const header = await getEmpresaHeaderHTML();
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    const checklistHTML = checklist.length
      ? `<table style="width:100%;border-collapse:collapse;margin-top:6px">
          <thead><tr style="background:#f3f4f6"><th style="text-align:left;padding:6px;border:1px solid #ddd">Item</th><th style="text-align:right;padding:6px;border:1px solid #ddd;width:120px">Valor</th></tr></thead>
          <tbody>${checklist.map((c) => {
            const p = catalogo.find((x: any) => x.nome === c.item);
            const preco = Number(p?.preco) || 0;
            return `<tr><td style="padding:6px;border:1px solid #ddd">${c.concluido ? "☑" : "☐"} ${esc(c.item)}</td><td style="padding:6px;border:1px solid #ddd;text-align:right">${brl(preco)}</td></tr>`;
          }).join("")}</tbody>
          <tfoot><tr><td style="padding:6px;border:1px solid #ddd;text-align:right;font-weight:bold">Total</td><td style="padding:6px;border:1px solid #ddd;text-align:right;font-weight:bold">${brl(totalChecklist)}</td></tr></tfoot>
        </table>`
      : '<p style="color:#666"><em>Nenhum item</em></p>';
    const imgs = anexos.filter((a) => (a.type || "").startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(a.name));
    const imgHTML = imgs.length
      ? `<div style="margin-top:14px"><strong>OS Assinada / Anexos (imagens):</strong>${imgs
          .map((a) => signedMap[a.path] ? `<div style="margin-top:6px"><img src="${signedMap[a.path]}" style="max-width:100%;max-height:400px;border:1px solid #ccc"/></div>` : "")
          .join("")}</div>`
      : "";
    w.document.write(`<html><head><title>OS #${servico.numero_servico}</title>
<style>body{font-family:Arial,sans-serif;padding:24px;color:#111}table{width:100%;border-collapse:collapse;margin-top:8px}td{padding:6px 4px;vertical-align:top}h2{margin:0 0 10px}.box{border:1px solid #ddd;padding:10px;border-radius:6px;margin-top:12px}.lbl{color:#666;font-size:11px;text-transform:uppercase}.val{font-size:13px;font-weight:600}.sig{margin-top:60px;border-top:1px solid #111;padding-top:6px;text-align:center;font-size:12px}</style>
</head><body>${header}
<h2>Ordem de Serviço #${servico.numero_servico}</h2>
<div class="box">
  <table>
    <tr>
      <td><span class="lbl">Data</span><div class="val">${esc(form.os_data || "-")}</div></td>
      <td><span class="lbl">Hora</span><div class="val">${esc(form.os_hora || "-")}</div></td>
      <td><span class="lbl">Status</span><div class="val">${esc(form.status || "-")}</div></td>
      <td><span class="lbl">Atendente</span><div class="val">${esc(form.atendente_nome || "-")}</div></td>
    </tr>
    <tr>
      <td colspan="2"><span class="lbl">Responsável pela Autorização</span><div class="val">${esc(form.autorizacao_responsavel || "-")}</div></td>
      <td><span class="lbl">Responsável</span><div class="val">${esc(form.responsavel_nome || "-")}</div></td>
      <td><span class="lbl">Telefone</span><div class="val">${esc(form.responsavel_telefone || "-")}</div></td>
    </tr>
    <tr>
      <td colspan="4"><span class="lbl">Falecido</span><div class="val">${esc(servico.falecido_nome || "-")}</div></td>
    </tr>
  </table>
</div>
<div class="box">
  <strong>Serviços Solicitados / Checklist</strong>
  ${checklistHTML}
</div>
<div class="box">
  <table>
    <tr>
      <td><span class="lbl">Agente Responsável</span><div class="val">${esc(form.agente_funerario || "-")}</div></td>
      <td><span class="lbl">Veículo</span><div class="val">${esc(form.veiculo_placa || "-")}</div></td>
    </tr>
    <tr><td colspan="2"><span class="lbl">Materiais</span><div class="val">${esc(form.os_materiais || "-").replace(/\n/g, "<br/>")}</div></td></tr>
  </table>
</div>
${imgHTML}
<div class="sig">Assinatura do Responsável</div>
<script>window.onload=()=>{window.print();}</script>
</body></html>`);
    w.document.close();
  };

  if (!servico) return null;

  const agenteEmLista = agentes.some((a: any) => a.nome === form.agente_funerario);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={18} /> Ordem de Serviço #{servico.numero_servico}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cabeçalho */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><Label>Data</Label><Input type="date" value={form.os_data || ""} onChange={(e) => setForm({ ...form, os_data: e.target.value })} /></div>
            <div><Label>Hora</Label><Input type="time" value={form.os_hora || ""} onChange={(e) => setForm({ ...form, os_hora: e.target.value })} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OS_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Atendente</Label><Input value={form.atendente_nome || ""} onChange={(e) => setForm({ ...form, atendente_nome: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Resp. pela Autorização</Label><Input value={form.autorizacao_responsavel || ""} onChange={(e) => setForm({ ...form, autorizacao_responsavel: e.target.value })} /></div>
            <div><Label>Responsável</Label><Input value={form.responsavel_nome || ""} onChange={(e) => setForm({ ...form, responsavel_nome: e.target.value })} /></div>
            <div><Label>Telefone</Label><Input value={form.responsavel_telefone || ""} onChange={(e) => setForm({ ...form, responsavel_telefone: e.target.value })} /></div>
          </div>

          <div className="border rounded p-3 bg-muted/20">
            <Label className="text-xs uppercase text-muted-foreground">Falecido</Label>
            <div className="font-semibold">{servico.falecido_nome}</div>
          </div>

          {/* Checklist */}
          <div className="border rounded p-3">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <Label className="text-sm font-semibold">Serviços Solicitados (Checklist)</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{checklist.length} selecionado(s)</Badge>
                <Badge>Total: {brl(totalChecklist)}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 max-h-60 overflow-y-auto">
              {catalogo.map((item: any) => {
                const sel = checklist.find((c) => c.item === item.nome);
                const preco = Number(item.preco) || 0;
                return (
                  <div key={item.id} className="flex items-center gap-2 p-1.5 hover:bg-muted/40 rounded">
                    <Checkbox checked={!!sel} onCheckedChange={() => toggleItem(item.nome)} />
                    <span className="flex-1 text-sm">
                      {item.nome} <span className="text-xs text-muted-foreground">({item.tipo})</span>
                      {preco > 0 && <span className="text-xs text-muted-foreground ml-1">· {brl(preco)}</span>}
                    </span>
                    {sel && (
                      <label className="flex items-center gap-1 text-xs">
                        <Checkbox checked={sel.concluido} onCheckedChange={(v) => setConcluido(item.nome, !!v)} />
                        concluído
                      </label>
                    )}
                  </div>
                );
              })}
              {catalogo.length === 0 && (
                <div className="text-sm text-muted-foreground italic p-2">Cadastre serviços/produtos no catálogo.</div>
              )}
            </div>
          </div>

          {/* Equipe / veículo / materiais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Agente Responsável</Label>
              {agentes.length > 0 ? (
                <Select
                  value={agenteEmLista ? form.agente_funerario : (form.agente_funerario ? "__custom__" : "")}
                  onValueChange={(v) => {
                    if (v === "__custom__") return;
                    setForm({ ...form, agente_funerario: v });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecionar agente" /></SelectTrigger>
                  <SelectContent>
                    {agentes.map((a: any) => (
                      <SelectItem key={a.id} value={a.nome}>{a.nome}</SelectItem>
                    ))}
                    {form.agente_funerario && !agenteEmLista && (
                      <SelectItem value="__custom__">{form.agente_funerario}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={form.agente_funerario || ""}
                  onChange={(e) => setForm({ ...form, agente_funerario: e.target.value })}
                  placeholder="Nenhum usuário com perfil Agente cadastrado"
                />
              )}
            </div>
            <div><Label>Veículo (placa)</Label><Input value={form.veiculo_placa || ""} onChange={(e) => setForm({ ...form, veiculo_placa: e.target.value })} /></div>
          </div>
          <div>
            <Label>Materiais</Label>
            <Textarea rows={3} value={form.os_materiais || ""} onChange={(e) => setForm({ ...form, os_materiais: e.target.value })} placeholder="Ex.: 2x velas, 1x urna modelo X, ..." />
          </div>

          {/* Upload arquivos (múltiplos, qualquer tipo) */}
          <div className="border rounded p-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label className="text-sm font-semibold">Anexos da OS (qualquer tipo)</Label>
              <label className="inline-flex">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleUpload(e.target.files)}
                />
                <Button type="button" variant="outline" size="sm" asChild disabled={uploading}>
                  <span className="cursor-pointer">
                    {uploading ? <Loader2 className="animate-spin mr-1" size={14} /> : <Upload size={14} className="mr-1" />}
                    Adicionar arquivos
                  </span>
                </Button>
              </label>
            </div>

            {anexos.length === 0 ? (
              <p className="text-sm text-muted-foreground italic mt-2">Nenhum anexo enviado.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {anexos.map((a) => {
                  const url = signedMap[a.path];
                  const isImg = (a.type || "").startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(a.name);
                  return (
                    <div key={a.path} className="flex items-center gap-2 border rounded p-2">
                      {isImg && url ? (
                        <img src={url} alt={a.name} className="w-12 h-12 object-cover rounded border" />
                      ) : (
                        <div className="w-12 h-12 flex items-center justify-center bg-muted rounded border">
                          <Paperclip size={18} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{a.name}</div>
                        {a.size && <div className="text-xs text-muted-foreground">{(a.size / 1024).toFixed(1)} KB</div>}
                      </div>
                      {url && (
                        <a href={url} target="_blank" rel="noreferrer" download={a.name}>
                          <Button type="button" variant="ghost" size="icon"><Download size={14} /></Button>
                        </a>
                      )}
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeAnexo(a)}>
                        <X size={14} />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handlePrint}><Printer size={14} className="mr-1" />Imprimir</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Salvando..." : "Salvar OS"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function esc(s: any) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
