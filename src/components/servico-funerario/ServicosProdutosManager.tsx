import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Package, Settings2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ResponsiveTable } from "@/components/Skeletons";
import { brl } from "@/lib/format";

export function ServicosProdutosManager() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['servicos-produtos-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servicos_produtos')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data;
    }
  });

  const upsertMutation = useMutation({
    mutationFn: async (formData: any) => {
      if (editing?.id) {
        const { error } = await supabase
          .from('servicos_produtos')
          .update(formData)
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('servicos_produtos')
          .insert([formData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos-produtos-list'] });
      toast.success(editing ? "Item atualizado" : "Item cadastrado");
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error("Erro: " + e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('servicos_produtos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos-produtos-list'] });
      toast.success("Item removido");
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nome: formData.get('nome'),
      tipo: formData.get('tipo'),
      preco: Number(formData.get('preco')),
      descricao: formData.get('descricao'),
    };
    upsertMutation.mutate(data);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Catálogo de Serviços e Produtos</h2>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if(!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={18} />
              Novo Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Item' : 'Novo Serviço ou Produto'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input name="nome" defaultValue={editing?.nome} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select name="tipo" defaultValue={editing?.tipo || 'Serviço'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Serviço">Serviço</SelectItem>
                      <SelectItem value="Produto">Produto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preco">Preço (R$)</Label>
                  <Input name="preco" type="number" step="0.01" defaultValue={editing?.preco} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input name="descricao" defaultValue={editing?.descricao} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit">{upsertMutation.isPending ? 'Salvando...' : 'Salvar'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="p-8 text-center italic text-muted-foreground">Carregando catálogo...</div>
      ) : (
        <ResponsiveTable>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Preço</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item: any) => (
              <tr key={item.id}>
                <td className="font-medium">{item.nome}</td>
                <td>
                  <div className="flex items-center gap-2">
                    {item.tipo === 'Produto' ? <Package size={14} className="text-blue-500" /> : <Settings2 size={14} className="text-orange-500" />}
                    {item.tipo}
                  </div>
                </td>
                <td>{brl(item.preco)}</td>
                <td className="text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(item); setOpen(true); }}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { if(confirm('Excluir item?')) deleteMutation.mutate(item.id); }}>
                    <Trash2 size={14} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </ResponsiveTable>
      )}
    </div>
  );
}
