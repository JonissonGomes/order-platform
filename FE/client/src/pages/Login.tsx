import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ZtsLogo } from "@/components/zts/ZtsLogo";
import { api } from "@/lib/api";
import { AlertCircle, Loader2, LogIn } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { useLocation } from "wouter";

// Three.js só é carregado aqui (momento de marca) e fora do bundle principal
const BrandCanvas = lazy(() =>
  import("@/components/zts/BrandCanvas").then(m => ({ default: m.BrandCanvas }))
);

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.login({ email, password });
      // Recarrega para atualizar o estado de autenticação (cookie de sessão)
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <aside className="hidden lg:flex relative flex-col justify-between bg-[#1a1f26] zts-grid-bg p-10 overflow-hidden">
        <ZtsLogo tone="light" subtitle="Assistência técnica" />
        <Suspense fallback={null}>
          <BrandCanvas className="absolute inset-0" />
        </Suspense>
        <div className="relative max-w-sm pointer-events-none">
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Assistência e acessórios, num só balcão.
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Ordens de serviço, estoque, caixa e garantias integrados.
          </p>
        </div>
      </aside>

      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden">
            <ZtsLogo subtitle="Assistência técnica" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Entrar no ZTS Cell</h1>
            <p className="text-sm text-muted-foreground mt-1">Use suas credenciais de colaborador.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" placeholder="voce@ztscell.com.br" value={email}
                onChange={e => setEmail(e.target.value)} required disabled={loading} autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)} required disabled={loading}
                autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</>
              ) : (
                <><LogIn className="mr-2 h-4 w-4" /> Entrar</>
              )}
            </Button>
          </form>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <button type="button" onClick={() => setLocation("/")} className="hover:text-foreground underline underline-offset-4">
              Voltar ao site
            </button>
            <button type="button" onClick={() => setLocation("/portal")} className="hover:text-foreground underline underline-offset-4">
              Sou cliente: acompanhar OS
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
