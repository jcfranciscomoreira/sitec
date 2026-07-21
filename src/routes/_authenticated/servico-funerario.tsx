import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SkeletonCard, ResponsiveTable } from '@/components/Skeletons';
import { 
  Activity, 
  CheckCircle2, 
  Clock, 
  Users2, 
  Truck, 
  FileWarning, 
  FileText, 
  MapPin, 
  DollarSign,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AtendimentoFormDialog } from '@/components/servico-funerario/AtendimentoFormDialog';
import { ServicosProdutosManager } from '@/components/servico-funerario/ServicosProdutosManager';
import { OSDialog } from '@/components/servico-funerario/OSDialog';
import { format } from 'date-fns';
import { AppShell } from '@/components/AppShell';

export const Route = createFileRoute('/_authenticated/servico-funerario')({
  component: ServicoFunerarioPage,
});

function ServicoFunerarioPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['servico-funerario-stats'],
    queryFn: async () => {
      const { data: servicos } = await supabase
        .from('servicos_funerarios')
        .select('status, tipo, data_abertura');
      
      const counts = {
        andamento: servicos?.filter((s) => s.status !== 'Finalizado' && s.status !== 'Cancelado').length || 0,
        concluidos: servicos?.filter((s) => s.status === 'Finalizado').length || 0,
        obitosHoje: servicos?.filter((s) => {
          const d = s.data_abertura ? new Date(s.data_abertura) : null;
          return d && d.toDateString() === new Date().toDateString();
        }).length || 0,
        equipes: 0, 
        veiculos: 0, 
        pendencias: 0, 
        osAbertas: servicos?.filter((s) => s.status === 'Em Atendimento').length || 0,
        receitaParticular: 0,
      };
      
      return counts;
    }
  });

  return (
    <AppShell title="Serviço Funerário" subtitle="Gestão de atendimentos, O.S. e equipes">
      {isLoading ? (
        <div className="p-8"><SkeletonCard /></div>
      ) : (
        <div className="space-y-6">


      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 h-auto gap-1">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="atendimentos">Atendimentos</TabsTrigger>
          <TabsTrigger value="os">O.S.</TabsTrigger>
          <TabsTrigger value="equipe">Equipes</TabsTrigger>
          <TabsTrigger value="catalogo">Serviços/Produtos</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Serviços em andamento" value={stats?.andamento} icon={Activity} color="text-blue-600" />
            <StatCard title="Serviços concluídos" value={stats?.concluidos} icon={CheckCircle2} color="text-green-600" />
            <StatCard title="Óbitos do dia" value={stats?.obitosHoje} icon={Clock} color="text-orange-600" />
            <StatCard title="Equipes em atendimento" value={stats?.equipes} icon={Users2} color="text-purple-600" />
            <StatCard title="Veículos disponíveis" value={stats?.veiculos} icon={Truck} color="text-gray-600" />
            <StatCard title="Pendências documentais" value={stats?.pendencias} icon={FileWarning} color="text-red-600" />
            <StatCard title="O.S. abertas" value={stats?.osAbertas} icon={FileText} color="text-blue-500" />
            <StatCard title="Receita Particular" value={`R$ ${stats?.receitaParticular || 0}`} icon={DollarSign} color="text-emerald-600" />
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Serviços por cidade</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="h-[200px] flex items-center justify-center text-muted-foreground italic">
                 Gráfico de distribuição por cidade (em breve)
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="atendimentos">
          <AtendimentosTab />
        </TabsContent>
        
        {/* Placeholder for other tabs */}
        <TabsContent value="os"><div className="p-8 text-center border rounded-lg bg-muted/20">Módulo de Ordens de Serviço em desenvolvimento</div></TabsContent>
        <TabsContent value="equipe"><div className="p-8 text-center border rounded-lg bg-muted/20">Gestão de Equipes e Veículos em desenvolvimento</div></TabsContent>
        <TabsContent value="catalogo">
          <Card>
            <CardContent className="pt-6">
              <ServicosProdutosManager />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="financeiro"><div className="p-8 text-center border rounded-lg bg-muted/20">Controle Financeiro de Serviços Particulares em desenvolvimento</div></TabsContent>
        <TabsContent value="relatorios"><div className="p-8 text-center border rounded-lg bg-muted/20">Relatórios de Atendimento em desenvolvimento</div></TabsContent>
      </Tabs>
        </div>
      )}
    </AppShell>
  );
}


function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={`p-2 rounded-full bg-muted/50 ${color}`}>
            <Icon size={20} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AtendimentosTab() {
  const [editingAtendimento, setEditingAtendimento] = useState<any>(null);
  const [osServico, setOsServico] = useState<any>(null);

  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('servicos_funerarios')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos-funerarios-list'] });
      queryClient.invalidateQueries({ queryKey: ['servico-funerario-stats'] });
      toast.success("Atendimento excluído com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir atendimento: " + error.message);
    }
  });

  const { data: atendimentos, isLoading } = useQuery({
    queryKey: ['servicos-funerarios-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('servicos_funerarios')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    }
  });

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
         <h2 className="text-xl font-semibold">Atendimentos Registrados</h2>
         <AtendimentoFormDialog />
      </div>

      {editingAtendimento && (
        <AtendimentoFormDialog 
          atendimento={editingAtendimento} 
          onOpenChange={(open) => !open && setEditingAtendimento(null)} 
        />
      )}
      
      {isLoading ? (
        <div className="p-8 text-center italic text-muted-foreground">Carregando atendimentos...</div>
      ) : atendimentos?.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed rounded-lg bg-muted/10">
          <p className="text-muted-foreground">Nenhum atendimento registrado ainda.</p>
        </div>
      ) : (
        <ResponsiveTable>
          <thead>
            <tr>
              <th>Nº</th>
              <th>Falecido</th>
              <th>Data Óbito</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {atendimentos?.map((item) => (
              <tr key={item.id}>
                <td className="font-mono">#{item.numero_servico}</td>
                <td className="font-medium">{item.falecido_nome}</td>
                <td>{item.data_obito ? format(new Date(item.data_obito), 'dd/MM/yyyy') : '-'}</td>
                <td><Badge variant="outline">{item.tipo}</Badge></td>
                <td>
                  <Badge className={
                    item.status === 'Finalizado' ? 'bg-green-100 text-green-800' :
                    item.status === 'Cancelado' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }>
                    {item.status}
                  </Badge>
                </td>
                <td className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingAtendimento(item)}>
                    <Edit size={16} className="text-blue-600" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      if (confirm("Tem certeza que deseja excluir este atendimento?")) {
                        deleteMutation.mutate(item.id);
                      }
                    }}
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setOsServico(item)}>
                    <FileText size={16} className="text-emerald-600 mr-1" />OS
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </ResponsiveTable>
      )}

      <OSDialog servico={osServico} open={!!osServico} onOpenChange={(o) => !o && setOsServico(null)} />
    </div>
  );
}
