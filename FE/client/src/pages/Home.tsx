import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ZtsLogo } from "@/components/zts/ZtsLogo";
import { ROUTES } from "@/routes";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Cable,
  Clock,
  Laptop,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Phone,
  Shield,
  Smartphone,
  Wrench,
} from "lucide-react";
import { lazy, Suspense, useEffect } from "react";
import { useLocation } from "wouter";

// Three.js apenas no momento de marca da home, carregado sob demanda
const BrandCanvas = lazy(() =>
  import("@/components/zts/BrandCanvas").then(m => ({ default: m.BrandCanvas }))
);

const SERVICES = [
  { icon: Smartphone, title: "Smartphones", text: "Tela, bateria, conector de carga, software e placa." },
  { icon: Laptop, title: "Notebooks e tablets", text: "Troca de peças, limpeza interna e formatação." },
  { icon: Cable, title: "Acessórios", text: "Capas, películas, carregadores, cabos e fones." },
  { icon: Wrench, title: "Diagnóstico", text: "Avaliação técnica com orçamento antes do reparo." },
];

const BENEFITS = [
  { icon: Shield, title: "Garantia no serviço", text: "Prazo registrado na ordem de serviço." },
  { icon: Clock, title: "Prazo combinado", text: "Previsão de entrega informada na abertura." },
  { icon: MessageSquare, title: "Acompanhamento online", text: "Consulte a OS no portal com o número e o telefone." },
];

function isAdminRole(role?: string | null) {
  return role === "admin" || role === "super_admin";
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();

  // Admin logado não permanece na landing — vai direto ao painel
  useEffect(() => {
    if (!loading && user && isAdminRole(user.role)) {
      setLocation(ROUTES.DASHBOARD);
    }
  }, [loading, user, setLocation]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[#1a1f26] border-b border-white/10">
        <div className="container flex h-14 items-center justify-between">
          <ZtsLogo tone="light" subtitle="Assistência técnica" />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10"
              onClick={() => setLocation(ROUTES.PORTAL)}>
              Acompanhar OS
            </Button>
            {user && (
              <Button
                size="sm"
                variant="secondary"
                className="font-semibold shadow-md ring-2 ring-white/20"
                onClick={() => setLocation(ROUTES.DASHBOARD)}
              >
                <LayoutDashboard className="mr-1.5 h-4 w-4" />
                Acessar área
              </Button>
            )}
          </div>
        </div>
      </header>

      <section className="relative bg-[#1a1f26] zts-grid-bg overflow-hidden">
        <Suspense fallback={null}>
          <BrandCanvas className="absolute inset-y-0 right-0 w-full lg:w-1/2 opacity-80" />
        </Suspense>
        <div className="container relative py-20 md:py-28">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7fa3c7]">Assistência + acessórios</p>
            <h1 className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight text-white">
              Seu aparelho em boas mãos, do diagnóstico à garantia.
            </h1>
            <p className="mt-4 text-slate-300 leading-relaxed">
              A ZTS Cell cuida do reparo de smartphones, tablets e notebooks e ainda vende os
              acessórios que você precisa — tudo no mesmo balcão.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" variant="secondary" onClick={() => setLocation("/portal")}>
                Acompanhar meu serviço <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline"
                className="bg-transparent text-white border-white/30 hover:bg-white/10 hover:text-white"
                onClick={() => document.getElementById("contato")?.scrollIntoView({ behavior: "smooth" })}>
                Falar com a loja
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="container py-14">
        <h2 className="text-xl font-semibold tracking-tight mb-6">O que fazemos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map(s => (
            <div key={s.title} className="bg-card border rounded-md p-4">
              <s.icon className="h-5 w-5 text-primary mb-3" />
              <h3 className="text-sm font-semibold">{s.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-card border-y">
        <div className="container py-12 grid gap-6 md:grid-cols-3">
          {BENEFITS.map(b => (
            <div key={b.title} className="flex gap-3">
              <b.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold">{b.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{b.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="contato" className="container py-14">
        <h2 className="text-xl font-semibold tracking-tight mb-6">Contato</h2>
        <div className="grid gap-4 md:grid-cols-3 text-sm">
          <div className="flex gap-3 bg-card border rounded-md p-4">
            <Phone className="h-4 w-4 text-primary mt-0.5" />
            <div><p className="font-medium">Telefone</p><p className="text-muted-foreground">(11) 99999-9999</p></div>
          </div>
          <div className="flex gap-3 bg-card border rounded-md p-4">
            <MapPin className="h-4 w-4 text-primary mt-0.5" />
            <div><p className="font-medium">Endereço</p><p className="text-muted-foreground">Rua Exemplo, 123 — São Paulo/SP</p></div>
          </div>
          <div className="flex gap-3 bg-card border rounded-md p-4">
            <Clock className="h-4 w-4 text-primary mt-0.5" />
            <div><p className="font-medium">Horário</p><p className="text-muted-foreground">Seg–Sex 9h–18h · Sáb 9h–13h</p></div>
          </div>
        </div>
      </section>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} ZTS Cell — Assistência técnica e acessórios
      </footer>
    </div>
  );
}
