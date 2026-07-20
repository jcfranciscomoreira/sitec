import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

export function AtendimentoFormDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: ['servicos-funerarios-list'] });
      toast.success("Atendimento iniciado com sucesso!");
      setOpen(false);
    },
    onError: (error: any) => {
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus size={18} />
          Novo Atendimento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastro de Serviço Funerário</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-8 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero_servico">Número do Serviço</Label>
              <Input name="numero_servico" placeholder="Automático" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_abertura">Data/Hora da abertura</Label>
              <Input type="datetime-local" name="data_abertura" defaultValue={new Date().toISOString().slice(0, 16)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo do Atendimento</Label>
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
              <Label htmlFor="status">Situação</Label>
              <Select name="status" defaultValue="Em Atendimento">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a situação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Em Atendimento">Em Atendimento</SelectItem>
                  <SelectItem value="Preparação">Preparação</SelectItem>
                  <SelectItem value="Velório">Velório</SelectItem>
                  <SelectItem value="Sepultamento">Sepultamento</SelectItem>
                  <SelectItem value="Finalizado">Finalizado</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-lg border-b pb-2">Falecido</h3>
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
                <Label htmlFor="falecido_rg">RG</Label>
                <Input name="falecido_rg" />
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
              <div className="space-y-2">
                <Label htmlFor="falecido_data_nascimento">Data de Nascimento</Label>
                <Input type="date" name="falecido_data_nascimento" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_obito">Data do Óbito</Label>
                <Input type="date" name="data_obito" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora_obito">Hora do Óbito</Label>
                <Input type="time" name="hora_obito" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="falecido_naturalidade">Naturalidade</Label>
                <Input name="falecido_naturalidade" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="falecido_nacionalidade">Nacionalidade</Label>
                <Input name="falecido_nacionalidade" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="falecido_profissao">Profissão</Label>
                <Input name="falecido_profissao" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="falecido_pai">Nome do Pai</Label>
                <Input name="falecido_pai" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="falecido_mae">Nome da Mãe</Label>
                <Input name="falecido_mae" />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="falecido_endereco">Endereço</Label>
                <Input name="falecido_endereco" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-lg border-b pb-2">Informações do Óbito</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="local_obito">Local do Óbito</Label>
                <Input name="local_obito" placeholder="Hospital, Residência, etc." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade_obito">Cidade</Label>
                <Input name="cidade_obito" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hospital_nome">Hospital</Label>
                <Input name="hospital_nome" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medico_responsavel">Médico responsável</Label>
                <Input name="medico_responsavel" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="causa_morte">Causa da morte</Label>
                <Input name="causa_morte" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero_do">Número da DO</Label>
                <Input name="numero_do" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cartorio_nome">Cartório</Label>
                <Input name="cartorio_nome" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-lg border-b pb-2">Responsável</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="responsavel_nome">Nome Completo</Label>
                <Input name="responsavel_nome" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsavel_cpf">CPF</Label>
                <Input name="responsavel_cpf" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsavel_rg">RG</Label>
                <Input name="responsavel_rg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsavel_telefone">Telefone</Label>
                <Input name="responsavel_telefone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsavel_whatsapp">WhatsApp</Label>
                <Input name="responsavel_whatsapp" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsavel_parentesco">Grau de parentesco</Label>
                <Input name="responsavel_parentesco" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="responsavel_endereco">Endereço</Label>
                <Input name="responsavel_endereco" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsavel_email">Email</Label>
                <Input type="email" name="responsavel_email" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border rounded-md p-4 bg-muted/50">
              <h3 className="font-bold text-lg border-b pb-2 mb-4">Plano Vinculado</h3>
              <p className="text-sm text-muted-foreground mb-4">Caso possua plano.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plano_numero_contrato">Número do contrato</Label>
                  <Input name="plano_numero_contrato" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plano_titular">Titular</Label>
                  <Input name="plano_titular" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plano_status">Status do plano</Label>
                  <Input name="plano_status" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plano_carencia">Carência</Label>
                  <Input name="plano_carencia" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="plano_cobertura">Cobertura</Label>
                  <Input name="plano_cobertura" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-lg border-b pb-2">Serviços Contratados</h3>
            <p className="text-sm text-muted-foreground">Selecionados em checklist.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                "Remoção", "Higienização", "Tanatopraxia", "Ornamentação", 
                "Urna", "Véu", "Flores", "Coroa", 
                "Transporte", "Sala de velório", "Cerimonial", "Cremação", 
                "Sepultamento", "Documentação", "Publicação de Nota de Falecimento", 
                "Livro de Presença", "Café", "Água", "Tenda", "Iluminação"
              ].map((servico) => (
                <div key={servico} className="flex items-center space-x-2">
                  <input type="checkbox" id={servico} className="h-4 w-4 rounded border-gray-300" />
                  <Label htmlFor={servico} className="text-sm font-normal cursor-pointer">{servico}</Label>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Iniciando..." : "Salvar Atendimento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
