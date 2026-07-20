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

export function AtendimentoFormDialog() {
  const [open, setOpen] = useState(false);
  const [atendimentoTipo, setAtendimentoTipo] = useState<string>("Particular");
  const [selectedAssociado, setSelectedAssociado] = useState<any>(null);
  const [selectedDependente, setSelectedDependente] = useState<any>(null);
  const [selectedItens, setSelectedItens] = useState<string[]>([]);
  const [desconto, setDesconto] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const queryClient = useQueryClient();
  const [headerHTML, setHeaderHTML] = useState("");

  useEffect(() => {
    getEmpresaHeaderHTML().then(setHeaderHTML);
  }, []);

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: associados = [], isLoading: isLoadingAssociados } = useQuery({
    queryKey: ['associados-search', debouncedSearch],
    queryFn: async ({ signal }) => {
      if (debouncedSearch.length < 2) return [];

      const term = `%${debouncedSearch}%`;
      const { data, error } = await supabase
        .from('associados')
        .select('*, planos(nome, valor_mensal)')
        .or(`nome.ilike.${term},codigo.ilike.${term},cpf.ilike.${term}`)
        .order('nome')
        .limit(10)
        .abortSignal(signal);

      if (error) {
        if (error.code === 'ABORT') return [];
        throw error;
      }
      return data;
    },
    enabled: open && atendimentoTipo === "Plano" && debouncedSearch.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: dependentes = [], isLoading: isLoadingDependentes } = useQuery({
    queryKey: ['dependentes-search-all', debouncedSearch],
    queryFn: async ({ signal }) => {
      if (debouncedSearch.length < 2) return [];

      const term = `%${debouncedSearch}%`;
      const { data, error } = await supabase
        .from('dependentes')
        .select('*, associados(id, nome, codigo, cpf, endereco, telefone, filial_id, planos(nome, valor_mensal))')
        .or(`nome.ilike.${term},cpf.ilike.${term}`)
        .order('nome')
        .limit(10)
        .abortSignal(signal);

      if (error) {
        if (error.code === 'ABORT') return [];
        throw error;
      }
      return data;
    },
    enabled: open && atendimentoTipo === "Plano" && debouncedSearch.length >= 2,
    staleTime: 1000 * 60 * 5,
  });

  const { data: catalogo = [] } = useQuery({
    queryKey: ['servicos-produtos-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('servicos_produtos').select('*').order('nome');
      if (error) throw error;
      return data;
    }
  });

  const totals = useMemo(() => {
    const totalItens = selectedItens.reduce((acc, id) => {
      const item = catalogo.find(i => i.id === id);
      return acc + (item?.preco || 0);
    }, 0);
    return {
      bruto: totalItens,
      final: Math.max(0, totalItens - desconto)
    };
  }, [selectedItens, catalogo, desconto]);

  const createMutation = useMutation({
    mutationFn: async (formData: any) => {
      // 1. Create service
      const { data: servico, error: sError } = await supabase
        .from('servicos_funerarios')
        .insert([{
          ...formData,
          valor_total: totals.bruto,
          desconto: desconto,
          valor_final: totals.final
        } as any])
        .select()
        .single();
      
      if (sError) throw sError;

      // 2. Insert items
      if (selectedItens.length > 0) {
        const itensToInsert = selectedItens.map(id => {
          const item = catalogo.find(i => i.id === id);
          if (!item) return null;
          return {
            servico_id: servico.id,
            item_id: id,
            nome: item.nome,
            quantidade: 1,
            preco_unitario: item.preco,
            subtotal: item.preco
          };
        }).filter(Boolean);
        
        const { error: iError } = await supabase.from('servico_itens' as any).insert(itensToInsert as any);
        if (iError) throw iError;
      }

      // 3. Register in financial if Particular
      if (formData.tipo === 'Particular' && totals.final > 0) {
        const { error: fError } = await supabase.from('contas_financeiras').insert([{
          descricao: `Serviço Funerário #${servico.numero_servico} - ${formData.falecido_nome}`,
          valor: totals.final,
          tipo: 'entrada',
          status: 'pendente',
          vencimento: new Date().toISOString().split('T')[0],
          filial_id: selectedAssociado?.filial_id || null
        } as any]);
        if (fError) throw fError;
      }

      return servico;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servico-funerario-stats'] });
      queryClient.invalidateQueries({ queryKey: ['servicos-funerarios-list'] });
      toast.success("Atendimento e lançamentos realizados com sucesso!");
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Erro ao iniciar atendimento: " + error.message);
    }
  });

  const resetForm = () => {
    setAtendimentoTipo("Particular");
    setSelectedAssociado(null);
    setSelectedDependente(null);
    setSelectedItens([]);
    setDesconto(0);
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
    
    createMutation.mutate(data);
  };

  const toggleItem = (id: string) => {
    setSelectedItens(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
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

          <div class="section">
            <div class="section-title">Serviços e Produtos</div>
            ${selectedItens.map(id => {
              const item = catalogo.find(i => i.id === id);
              return `<div class="item-row"><span>${item?.nome}</span><span>${brl(item?.preco || 0)}</span></div>`;
            }).join('')}
            <div class="total">
              <div>Bruto: ${brl(totals.bruto)}</div>
              <div>Desconto: ${brl(desconto)}</div>
              <div style="font-size: 1.4em; color: #d32f2f;">Total Final: ${brl(totals.final)}</div>
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
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if(!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus size={18} />
          Novo Atendimento
        </Button>
      </DialogTrigger>
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
              <Input type="datetime-local" name="data_abertura" defaultValue={new Date().toISOString().slice(0, 16)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo do Atendimento</Label>
              <Select 
                name="tipo" 
                required 
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
                        <Input
                          type="text"
                          placeholder="Digite nome, código ou CPF para buscar..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          autoComplete="off"
                        />
                        {searchTerm.length >= 2 && (
                          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-md border bg-popover shadow-md">
                            {(isLoadingAssociados || isLoadingDependentes) ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">Carregando...</div>
                            ) : (() => {
                              const term = searchTerm.toLowerCase();
                              const filteredA = associados.filter((a: any) =>
                                a.nome?.toLowerCase().includes(term) ||
                                a.codigo?.toLowerCase().includes(term) ||
                                a.cpf?.includes(searchTerm)
                              );
                              const filteredD = dependentes.filter((d: any) =>
                                d.nome?.toLowerCase().includes(term) ||
                                d.cpf?.includes(searchTerm) ||
                                d.associados?.nome?.toLowerCase().includes(term)
                              );
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
                    defaultValue={selectedDependente?.nome || selectedAssociado?.nome || ""}
                    required
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="falecido_cpf">CPF</Label>
                <Input 
                  key={`cpf-${selectedDependente?.id || selectedAssociado?.id || 'none'}`}
                  name="falecido_cpf" 
                  defaultValue={selectedDependente?.cpf || selectedAssociado?.cpf || ""} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="falecido_rg">RG</Label>
                <Input name="falecido_rg" defaultValue={selectedAssociado?.rg || ""} />
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
                <Select name="falecido_sexo" key={`sexo-${selectedDependente?.id || selectedAssociado?.id || 'none'}`} defaultValue={selectedDependente?.sexo || selectedAssociado?.sexo || ""}>
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
                <Input name="falecido_estado_civil" key={`civil-${selectedDependente?.id || selectedAssociado?.id || 'none'}`} defaultValue={selectedDependente?.estado_civil || selectedAssociado?.estado_civil || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="falecido_data_nascimento">Data de Nascimento</Label>
                <Input 
                  key={`birth-${selectedDependente?.id || selectedAssociado?.id || 'none'}`}
                  type="date" 
                  name="falecido_data_nascimento" 
                  defaultValue={selectedDependente?.data_nascimento || selectedAssociado?.data_nascimento || ""} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_obito">Data do Óbito</Label>
                <Input type="date" name="data_obito" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora_obito">Hora do Óbito</Label>
                <Input type="time" name="hora_obito" required />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="falecido_endereco">Endereço</Label>
                <Input name="falecido_endereco" defaultValue={selectedAssociado?.endereco || ""} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-lg border-b pb-2">Itens do Catálogo (Serviços e Produtos)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {catalogo.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-accent cursor-pointer" onClick={(e) => {
                  e.preventDefault();
                  toggleItem(item.id);
                }}>
                  <div className="flex items-center gap-2">
                    <Checkbox id={item.id} checked={selectedItens.includes(item.id)} />
                    <div>
                      <Label className="text-sm font-medium leading-none">{item.nome}</Label>
                      <p className="text-xs text-muted-foreground">{item.tipo}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold">{brl(item.preco)}</span>
                </div>
              ))}
            </div>
            
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <Label>Desconto (R$)</Label>
                <Input 
                  type="number" 
                  className="w-32" 
                  value={desconto} 
                  onChange={(e) => setDesconto(Number(e.target.value))} 
                />
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total Bruto:</span>
                <span>{brl(totals.bruto)}</span>
              </div>
              <div className="flex justify-between text-2xl font-black text-primary border-t pt-2">
                <span>Total Final:</span>
                <span>{brl(totals.final)}</span>
              </div>
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
