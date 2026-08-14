import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Cross, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { createTenant } from "@/lib/tenants.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Acessar — Nuvem Planos" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const createTenantFn = useServerFn(createTenant);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error("Falha ao entrar", { description: error.message });
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/dashboard", replace: true });
  }

  async function handleForgotPassword() {
    if (!email) {
      return toast.error("Informe seu e-mail", {
        description: "Digite o e-mail da conta para receber o link de alteração de senha.",
      });
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error("Falha ao enviar e-mail", { description: error.message });
    toast.success("E-mail enviado!", {
      description: "Acesse o link recebido para definir uma nova senha.",
    });
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setLoading(true);
    
    try {
      // 1. Criar conta no Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email, 
        password,
        options: { 
          emailRedirectTo: window.location.origin, 
          data: { nome } 
        },
      });

      if (signUpError) {
        const msg = signUpError.message?.toLowerCase() ?? "";
        if (msg.includes("already registered") || msg.includes("already been registered")) {
          throw new Error(
            "Este e-mail já possui cadastro. Use a aba \"Entrar\" para acessar sua conta.",
          );
        }
        throw signUpError;
      }
      if (!signUpData.user) throw new Error("Falha ao criar usuário.");


      // 2. Garantir sessão: usa a sessão do cadastro ou faz login imediato
      if (!signUpData.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          throw new Error(
            "Conta criada, mas não foi possível entrar automaticamente. Use a aba \"Entrar\" com seu e-mail e senha.",
          );
        }
      }



      // 3. Criar tenant e vincular ao perfil
      await createTenantFn({ data: { nome: empresa } });

      toast.success("Conta e empresa criadas com sucesso!", { 
        description: "Você está sendo redirecionado para o dashboard." 
      });
      navigate({ to: "/dashboard", replace: true });
    } catch (error: any) {
      toast.error("Falha ao criar conta", { description: error.message });
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary via-primary to-[oklch(0.32_0.06_250)] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center text-primary-foreground">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold text-gold-foreground shadow-elevated">
            <Cross className="h-7 w-7" />
          </div>
          <h1 className="font-serif text-3xl font-semibold text-white">Nuvem Planos</h1>
          <p className="mt-1 text-sm text-primary-foreground/70">Gestão de Planos Funerários</p>
        </div>

        <Card className="border-border/40 shadow-elevated">
          <CardHeader>
            <CardTitle className="font-serif">Acessar o sistema</CardTitle>
            <CardDescription>Restrito a administradores e operadores...</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Entrando..." : "Entrar"}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="w-full text-xs"
                    onClick={handleForgotPassword}
                    disabled={loading}
                  >
                    Esqueci minha senha / alterar senha
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Seu nome completo</Label>
                    <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="empresa">Nome da sua empresa funerária</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input id="empresa" className="pl-9" value={empresa} onChange={(e) => setEmpresa(e.target.value)} required placeholder="Ex: Funerária Paz Celestial" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-s">E-mail</Label>
                    <Input id="email-s" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-s">Senha</Label>
                    <Input id="password-s" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                    <p className="text-xs text-muted-foreground">Ao criar conta, você estabelece uma nova empresa funerária isolada no sistema.</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || isSubmitting}>
                    {loading ? "Processando..." : "Criar empresa e conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
