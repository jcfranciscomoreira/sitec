import { useState, useMemo, useEffect, useRef } from "react";
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
import { toast } from "sonner";
import { Plus, Check, ChevronsUpDown, Printer, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { brl } from "@/lib/format";
import { getEmpresaHeaderHTML } from "@/lib/print-header";

export function AtendimentoFormDialog({ atendimento, onOpenChange }: { atendimento?: any, onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const editMode = !!atendimento;
  const [atendimentoTipo, setAtendimentoTipo] = useState<string>(atendimento?.tipo || "Particular");
  const [selectedAssociado, setSelectedAssociado] = useState<any>(null);
  const [selectedDependente, setSelectedDependente] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 10;
  
  const queryClient = useQueryClient();
  const [headerHTML, setHeaderHTML] = useState("");

  useEffect(() => {
    getEmpresaHeaderHTML().then(setHeaderHTML);
    if (atendimento) {
      setOpen(true);
      setAtendimentoTipo(atendimento.tipo || "Particular");
    }
  }, [atendimento]);

  // Prefill selected associado/dependente when editing a "Plano" atendimento
  useEffect(() => {
    if (!editMode || atendimentoTipo !== "Plano" || !atendimento) return;
    let cancelled = false;
    (async () => {
      if (atendimento.dependente_id) {
        const { data: dep } = await supabase
          .from("dependentes")
          .select("*, associados(id, nome, codigo, cpf, endereco, telefone, filial_id, planos(nome, valor_mensal))")
          .eq("id", atendimento.dependente_id)
          .maybeSingle();
        if (!cancelled && dep) {
          setSelectedDependente(dep);
          if (dep.associados) setSelectedAssociado(dep.associados);
          return;
        }
      }
      if (atendimento.associado_id) {
        const { data: assoc } = await supabase
          .from("associados")
          .select("*, planos(nome, valor_mensal)")
          .eq("id", atendimento.associado_id)
          .maybeSingle();
        if (!cancelled && assoc) setSelectedAssociado(assoc);
      } else if (atendimento.falecido_nome && !cancelled) {
        // Fallback: at least show the stored name so the field isn't empty
        setSelectedAssociado({ nome: atendimento.falecido_nome, planos: null });
      }
    })();
    return () => { cancelled = true; };
  }, [editMode, atendimento, atendimentoTipo]);

  // Debounce logic and reset page on new search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: searchResults = { associados: [], dependentes: [] }, isLoading } = useQuery({
    queryKey: ['atendimento-unified-search', debouncedSearch, page],
    queryFn: async ({ signal }) => {
      if (debouncedSearch.length < 2) return { associados: [], dependentes: [] };

      const search = debouncedSearch.trim();
      const term = `%${search}%`;
      const numericSearch = search.replace(/\D/g, "");
      const associadoFilters = [`nome.ilike.${term}`, `cpf.ilike.${term}`];
      if (numericSearch.length > 0) {
        associadoFilters.push(`codigo.eq.${Number(numericSearch)}`);
      }
      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Search associates
      const { data: assocData, error: assocError } = await supabase
        .from('associados')
        .select('*, planos(nome, valor_mensal)')
        .or(associadoFilters.join(','))
        .order('nome')
        .range(from, to)
        .abortSignal(signal);

      if (assocError && assocError.code !== 'ABORT') throw assocError;

      // Search dependents
      const { data: depData, error: depError } = await supabase
        .from('dependentes')
        .select('*, associados(id, nome, codigo, cpf, endereco, telefone, filial_id, planos(nome, valor_mensal))')
        .or(`nome.ilike.${term},cpf.ilike.${term}`)
        .order('nome')
        .range(from, to)
        .abortSignal(signal);

      if (depError && depError.code !== 'ABORT') throw depError;

      return {
        associados: assocData || [],
        dependentes: depData || []
      };
    },
    enabled: open && atendimentoTipo === "Plano" && debouncedSearch.length >= 2,
    staleTime: 1000 * 60,
  });

  const associados = searchResults.associados;
  const dependentes = searchResults.dependentes;
  const isLoadingAssociados = isLoading;
  const isLoadingDependentes = isLoading;

  const { data: catalogo = [] } = useQuery({
    queryKey: ['servicos-produtos-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('servicos_produtos').select('*').order('nome');
      if (error) throw error;
      return data;
    }
  });


  const mutation = useMutation({
    mutationFn: async (formData: any) => {
      if (editMode) {
        const { data, error } = await supabase
          .from('servicos_funerarios')
          .update(formData)
          .eq('id', atendimento.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('servicos_funerarios')
          .insert([formData])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servico-funerario-stats'] });
      queryClient.invalidateQueries({ queryKey: ['servicos-funerarios-list'] });
      toast.success(editMode ? "Atendimento atualizado com sucesso!" : "Atendimento iniciado com sucesso!");
      setOpen(false);
      if (onOpenChange) onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar atendimento: " + error.message);
    }
  });

  const resetForm = () => {
    setAtendimentoTipo("Particular");
    setSelectedAssociado(null);
    setSelectedDependente(null);
    setSearchTerm("");
  };

  const handleSelectAssociado = (assoc: any) => {
    setSelectedAssociado(assoc);
    setSelectedDependente(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    if (atendimentoTipo === "Plano" && selectedAssociado) {
      (data as any).associado_id = selectedAssociado.id;
      if (selectedDependente) {
        (data as any).dependente_id = selectedDependente.id;
      }
    }
    
    mutation.mutate(data);
  };


  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Atendimento Funerário</title>
          <style>
            body { font-family: sans-serif; padding: 20px; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .section-title { font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #ccc; margin-bottom: 10px; }
            .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 10px; }
            .item-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #eee; padding: 5px 0; }
            .footer { margin-top: 50px; text-align: center; font-size: 0.8em; }
            .total { font-weight: bold; font-size: 1.2em; text-align: right; margin-top: 20px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            ${headerHTML}
            <h2 style="margin-top: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">ORDEM DE ATENDIMENTO FUNERÁRIO</h2>
          </div>

          <div class="section">
            <div class="section-title">Dados do Falecido</div>
            <div class="grid">
              <div><strong>Nome:</strong> ${selectedDependente?.nome || selectedAssociado?.nome || 'N/A'}</div>
              <div><strong>CPF:</strong> ${selectedDependente?.cpf || selectedAssociado?.cpf || 'N/A'}</div>
              <div><strong>Plano:</strong> ${selectedAssociado?.planos?.nome || 'NÃO ASSOCIADO'}</div>
            </div>
          </div>


          <div class="footer">
            <p>Assinatura do Responsável: __________________________________________</p>
            <p>Data: ${new Date().toLocaleDateString()}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { 
      setOpen(v); 
      if (onOpenChange) onOpenChange(v);
      if(!v) resetForm(); 
    }}>
      {!editMode && (
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus size={18} />
            Novo Atendimento
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center pr-8">
            <DialogTitle>Cadastro de Serviço Funerário</DialogTitle>
            <Button variant="outline" type="button" size="sm" onClick={handlePrint} className="gap-2">
              <Printer size={16} /> Imprimir
            </Button>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-8 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero_servico">Número do Serviço</Label>
              <Input name="numero_servico" placeholder="Automático" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_abertura">Data/Hora da abertura</Label>
              <Input type="datetime-local" name="data_abertura" defaultValue={atendimento?.data_abertura ? new Date(atendimento.data_abertura).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo do Atendimento</Label>
              <Select 
                name="tipo" 
                value={atendimentoTipo}
                onValueChange={setAtendimentoTipo}
              >
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
              <Select name="status" defaultValue={atendimento?.status || "Em Atendimento"}>
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
                <Input type="hidden" name="falecido_nome" value={selectedDependente?.nome || selectedAssociado?.nome || ""} />
                {atendimentoTipo === "Plano" ? (
                  <>
                    {(selectedDependente || selectedAssociado) && (
                      <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2 text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {selectedDependente?.nome || selectedAssociado?.nome}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {selectedDependente ? `Dependente de ${selectedAssociado?.nome || ""}` : "Titular"} · Plano: {selectedAssociado?.planos?.nome || "N/A"}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAssociado(null);
                            setSelectedDependente(null);
                            setSearchTerm("");
                          }}
                        >
                          Trocar
                        </Button>
                      </div>
                    )}
                    {!(selectedDependente || selectedAssociado) && (
                        <div className="relative">
                          <div className="relative">
                            <Input
                              name="falecido_nome"
                              type="text"
                              placeholder="No campo de busca, buscar titular e dependentes"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              required
                              autoComplete="off"
                              className={cn(isLoadingAssociados || isLoadingDependentes ? "pr-10" : "")}
                            />
                            {(isLoadingAssociados || isLoadingDependentes) && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          {debouncedSearch.length >= 2 && (
                            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-md border bg-popover shadow-md">
                              {(isLoadingAssociados || isLoadingDependentes) ? (
                                <div className="p-4 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                  <span>Buscando registros...</span>
                                </div>
                              ) : (() => {
                                const filteredA = associados;
                                const filteredD = dependentes;
                                if (filteredA.length === 0 && filteredD.length === 0) {
                                  return <div className="p-4 text-center text-sm text-muted-foreground">Nenhum registro encontrado.</div>;
                                }
                                return (
                                  <div className="py-1">
                                  {filteredA.length > 0 && (
                                    <>
                                      <div className="px-3 py-1 text-xs font-semibold text-muted-foreground">Titulares</div>
                                      {filteredA.map((assoc: any) => (
                                        <button
                                          key={`a-${assoc.id}`}
                                          type="button"
                                          className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                                          onClick={() => {
                                            setSelectedAssociado(assoc);
                                            setSelectedDependente(null);
                                            setSearchTerm("");
                                          }}
                                        >
                                          <div className="flex flex-col">
                                            <span>{assoc.nome} <span className="text-xs text-muted-foreground">(Titular)</span></span>
                                            <span className="text-xs text-muted-foreground">
                                              Código: {assoc.codigo} | CPF: {assoc.cpf || 'N/A'} | Plano: {assoc.planos?.nome || 'N/A'}
                                            </span>
                                          </div>
                                        </button>
                                      ))}
                                    </>
                                  )}
                                  {filteredD.length > 0 && (
                                    <>
                                      <div className="px-3 py-1 text-xs font-semibold text-muted-foreground">Dependentes</div>
                                      {filteredD.map((dep: any) => (
                                        <button
                                          key={`d-${dep.id}`}
                                          type="button"
                                          className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                                          onClick={() => {
                                            setSelectedAssociado(dep.associados || null);
                                            setSelectedDependente(dep);
                                            setSearchTerm("");
                                          }}
                                        >
                                          <div className="flex flex-col">
                                            <span>{dep.nome} <span className="text-xs text-muted-foreground">({dep.parentesco || 'Dependente'})</span></span>
                                            <span className="text-xs text-muted-foreground">
                                              Titular: {dep.associados?.nome || 'N/A'} | Plano: {dep.associados?.planos?.nome || 'N/A'}
                                            </span>
                                          </div>
                                        </button>
                                      ))}
                                    </>
                                  )}
                                    {(filteredA.length === ITEMS_PER_PAGE || filteredD.length === ITEMS_PER_PAGE || page > 0) && (
                                      <div className="flex items-center justify-between border-t p-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="h-7 px-2 text-xs"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPage(prev => Math.max(0, prev - 1));
                                          }}
                                          disabled={page === 0}
                                        >
                                          Anterior
                                        </Button>
                                        <span className="text-xs text-muted-foreground">Página {page + 1}</span>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="h-7 px-2 text-xs"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPage(prev => prev + 1);
                                          }}
                                          disabled={filteredA.length < ITEMS_PER_PAGE && filteredD.length < ITEMS_PER_PAGE}
                                        >
                                          Próxima
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                          </div>
                        )}
                      </div>
                    )}
                    <input
                      type="hidden"
                      name="falecido_nome"
                      value={selectedDependente?.nome || selectedAssociado?.nome || ""}
                    />
                  </>
                ) : (
                  <Input
                    key={`name-${selectedDependente?.id || selectedAssociado?.id || 'none'}`}
                    name="falecido_nome"
                    defaultValue={selectedDependente?.nome || selectedAssociado?.nome || atendimento?.falecido_nome || ""}
                    required
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="falecido_cpf">CPF</Label>
                <Input 
                  key={`cpf-${selectedDependente?.id || selectedAssociado?.id || 'none'}`}
                  name="falecido_cpf" 
                  defaultValue={selectedDependente?.cpf || selectedAssociado?.cpf || atendimento?.falecido_cpf || ""} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="falecido_rg">RG</Label>
                <Input name="falecido_rg" defaultValue={selectedAssociado?.rg || atendimento?.falecido_rg || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo_vinculo">Vínculo</Label>
                <Input 
                  name="tipo_vinculo" 
                  disabled 
                  value={selectedDependente ? `Dependente (${selectedDependente.parentesco || 'N/A'})` : selectedAssociado ? "Titular" : "Particular"} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="falecido_sexo">Sexo</Label>
                <Select name="falecido_sexo" key={`sexo-${selectedDependente?.id || selectedAssociado?.id || 'none'}`} defaultValue={selectedDependente?.sexo || selectedAssociado?.sexo || atendimento?.falecido_sexo || ""}>
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
                <Input name="falecido_estado_civil" key={`civil-${selectedDependente?.id || selectedAssociado?.id || 'none'}`} defaultValue={selectedDependente?.estado_civil || selectedAssociado?.estado_civil || atendimento?.falecido_estado_civil || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="falecido_data_nascimento">Data de Nascimento</Label>
                <Input 
                  key={`birth-${selectedDependente?.id || selectedAssociado?.id || 'none'}`}
                  type="date" 
                  name="falecido_data_nascimento" 
                  defaultValue={selectedDependente?.data_nascimento || selectedAssociado?.data_nascimento || atendimento?.falecido_data_nascimento || ""} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_obito">Data do Óbito</Label>
                <Input type="date" name="data_obito" required defaultValue={atendimento?.data_obito || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora_obito">Hora do Óbito</Label>
                <Input type="time" name="hora_obito" required defaultValue={atendimento?.hora_obito || ""} />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="falecido_endereco">Endereço</Label>
                <Input name="falecido_endereco" defaultValue={selectedAssociado?.endereco || atendimento?.falecido_endereco || ""} />
              </div>
            </div>
          </div>


          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : editMode ? "Atualizar Atendimento" : "Salvar Atendimento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
