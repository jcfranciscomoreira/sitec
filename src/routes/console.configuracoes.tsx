import { createFileRoute } from "@tanstack/react-router";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IntegracaoBancariaConfig } from "@/components/IntegracaoBancariaConfig";
import { BackupConfig } from "@/components/BackupConfig";
import { LogsAuditoria } from "@/components/LogsAuditoria";

export const Route = createFileRoute("/console/configuracoes")({
  component: ConsoleConfiguracoesPage,
});

function ConsoleConfiguracoesPage() {
  return (
    <ConsoleShell title="Plataforma" subtitle="Integrações, backups e auditoria do SaaS">
      <Tabs defaultValue="pagamentos">
        <TabsList>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          <TabsTrigger value="backup">Backups</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="pagamentos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Gateway de cobrança da plataforma</CardTitle>
              <CardDescription>
                Credenciais usadas para cobrar as assinaturas das empresas clientes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IntegracaoBancariaConfig />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="mt-4">
          <BackupConfig />
        </TabsContent>

        <TabsContent value="auditoria" className="mt-4">
          <LogsAuditoria />
        </TabsContent>
      </Tabs>
    </ConsoleShell>
  );
}
