import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ServerCog } from "lucide-react";
import { toast } from "sonner";

const TITLE = "Console da plataforma — Nuvem Planos";
const DESC = "Acesso restrito à administração da plataforma Nuvem Planos: empresas, planos de acesso e financeiro do SaaS.";

export const Route = createFileRoute("/console-login")({
  ssr: false,
  validateSearch: z.object({ erro: z.string().optional() }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConsoleLoginPage,
});

function ConsoleLoginPage() {
  const navigate = useNavigate();
  const { erro } = Route.useSearch();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: String(fd.get("email")),
        password: String(fd.get("password")),
      });
      if (error) throw error;

      const { data: master } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "super_admin" as any)
        .maybeSingle();

      if (!master) {
        await supabase.auth.signOut();
        throw new Error("Esta conta não tem acesso ao console da plataforma.");
      }

      navigate({ to: "/console", replace: true });
    } catch (err: any) {
      toast.error("Não foi possível entrar", { description: err?.message ?? "Verifique as credenciais." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sidebar px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ServerCog className="h-6 w-6" />
          </div>
          <CardTitle className="font-serif">Console da plataforma</CardTitle>
          <CardDescription>Área exclusiva da administração do SaaS.</CardDescription>
        </CardHeader>
        <CardContent>
          {erro === "sem-acesso" && (
            <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
              Sua conta não tem permissão para acessar o console.
            </p>
          )}
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar no console"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
