import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useConfiguracoes } from "@/hooks/use-configuracoes";
import { Cross } from "lucide-react";

export function LoadingScreen({ children }: { children: React.ReactNode }) {
  const isRouterLoading = useRouterState({ select: (s) => s.isLoading || s.status === "pending" });
  const [docReady, setDocReady] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { config } = useConfiguracoes();

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.readyState === "complete") setDocReady(true);
    else {
      const on = () => setDocReady(true);
      window.addEventListener("load", on);
      return () => window.removeEventListener("load", on);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), 400);
    return () => clearTimeout(t);
  }, []);

  const ready = docReady && minElapsed && !isRouterLoading;

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setHidden(true), 500);
    return () => clearTimeout(t);
  }, [ready]);

  return (
    <>
      {children}
      {!hidden && (
        <div
          aria-hidden={ready}
          className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
            ready ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="relative flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-gold/20" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-gold" />
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gold text-gold-foreground overflow-hidden">
              {docReady && config.logo_url
                ? <img src={config.logo_url} alt="" className="h-full w-full object-contain" />
                : <Cross className="h-6 w-6" />}
            </div>
          </div>
          <div className="mt-6 text-center animate-pulse">
            <p className="font-serif text-lg font-semibold text-foreground">{config.nome_sistema}</p>
            {config.subtitulo && (
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{config.subtitulo}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
