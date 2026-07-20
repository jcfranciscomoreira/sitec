import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SkeletonCard } from '@/components/SkeletonCard';
import { 
  Activity, 
  CheckCircle2, 
  Clock, 
  Users2, 
  Truck, 
  FileWarning, 
  FileText, 
  MapPin, 
  DollarSign 
} from 'lucide-react';

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
        .select('status, tipo, cidade_obito');
      
      const counts = {
        andamento: servicos?.filter(s => s.status !== 'Finalizado' && s.status !== 'Cancelado').length || 0,
        concluidos: servicos?.filter(s => s.status === 'Finalizado').length || 0,
        obitosHoje: servicos?.filter(s => new Date(s.data_abertura).toDateString() === new Date().toDateString()).length || 0,
        equipes: 0, // Mock for now
        veiculos: 0, // Mock for now
        pendencias: 0, // Mock for now
        osAbertas: servicos?.filter(s => s.status === 'Em Atendimento').length || 0,
        receitaParticular: 0, // Need finance join
      };
      
      return counts;
    }
  });

  if (isLoading) return <div className="p-8"><SkeletonCard /></div>;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold">Serviço Funerário</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 h-auto gap-1">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="atendimentos">Atendimentos</TabsTrigger>
          <TabsTrigger value="os">O.S.</TabsTrigger>
          <TabsTrigger value="equipe">Equipes</TabsTrigger>
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
        <TabsContent value="financeiro"><div className="p-8 text-center border rounded-lg bg-muted/20">Controle Financeiro de Serviços Particulares em desenvolvimento</div></TabsContent>
        <TabsContent value="relatorios"><div className="p-8 text-center border rounded-lg bg-muted/20">Relatórios de Atendimento em desenvolvimento</div></TabsContent>
      </Tabs>
    </div>
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
  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
         <h2 className="text-xl font-semibold">Gestão de Atendimentos</h2>
         {/* Button to open creation dialog would go here */}
      </div>
      <div className="p-8 text-center border-2 border-dashed rounded-lg bg-muted/10">
        <p className="text-muted-foreground">Clique no botão para iniciar um novo atendimento funerário.</p>
      </div>
    </div>
  );
}
