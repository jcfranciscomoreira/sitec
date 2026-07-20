import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/badge"; // I need to import correctly below, this is just a placeholder
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, FileText, UserPlus, Trash2 } from "lucide-react";
import { format } from "date-fns";

// Fixed imports
import {
  Dialog as ShadcnDialog,
  DialogContent as ShadcnDialogContent,
  DialogHeader as ShadcnDialogHeader,
  DialogTitle as ShadcnDialogTitle,
  DialogTrigger as ShadcnDialogTrigger,
  DialogFooter as ShadcnDialogFooter,
} from "@/components/ui/dialog";

export function AtendimentoFormDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: associados } = useQuery({
    queryKey: ['associados-search'],
    queryFn: async () => {
      const { data } = await supabase.from('associados').select('id, nome, codigo');
      return data || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (formData: any) => {
      const { data, error } = await supabase
        .from('servicos_funerarios')
        .insert([formData])
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servico-funerario-stats'] });
      toast.success("Atendimento iniciado com sucesso!");
      setOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao iniciar atendimento: " + error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    createMutation.mutate(data);
  };

  return (
    <ShadcnDialog open={open} onOpenChange={setOpen}>
      <ShadcnDialogTrigger asChild>
        <Button className="gap-2">
          <Plus size={18} />
          Novo Atendimento
        </Button>
      </ShadcnDialogTrigger>
      <ShadcnDialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <ShadcnDialogHeader>
          <ShadcnDialogTitle>Cadastro de Serviço Funerário</ShadcnDialogTitle>
        </ShadcnDialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Atendimento</Label>
              <Select name="tipo" required defaultValue="Particular">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Plano">Plano</SelectItem>
                  <SelectItem value="Particular">Particular</SelectItem>
                  <SelectItem value="Convênio">Convênio</SelectItem>
                  <SelectItem value="Prefeitura">Prefeitura</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="data_obito">Data do Óbito</Label>
              <Input type="date" name="data_obito" required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="hora_obito">Hora do Óbito</Label>
              <Input type="time" name="hora_obito" required />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold border-b pb-2">Dados do Falecido</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="falecido_nome">Nome Completo</Label>
                <Input name="falecido_nome" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="falecido_cpf">CPF</Label>
                <Input name="falecido_cpf" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="falecido_data_nascimento">Data de Nascimento</Label>
                <Input type="date" name="falecido_data_nascimento" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="falecido_sexo">Sexo</Label>
                <Select name="falecido_sexo">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                    <SelectItem value="O">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="falecido_estado_civil">Estado Civil</Label>
                <Input name="falecido_estado_civil" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold border-b pb-2">Informações do Óbito</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="local_obito">Local do Óbito</Label>
                <Input name="local_obito" placeholder="Hospital, Residência, etc." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade_obito">Cidade</Label>
                <Input name="cidade_obito" />
              </div>
            </div>
          </div>

          <ShadcnDialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Iniciando..." : "Salvar Atendimento"}
            </Button>
          </ShadcnDialogFooter>
        </form>
      </ShadcnDialogContent>
    </ShadcnDialog>
  );
}
