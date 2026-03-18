import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  Truck,
  Gamepad2,
  Cpu,
  Wrench,
  MessageSquareText,
  BadgeCheck,
  Phone,
  MapPin,
  MessageCircle,
  Radar,
  History,
  Bell,
  ChevronDown,
} from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { formatPhone } from "@/lib/formatters";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function Home() {
  const [, setLocation] = useLocation();
  const [contactForm, setContactForm] = useState({ 
    fullName: "", 
    email: "", 
    phone: "", 
    equipment: "",
    description: "" 
  });
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successPhone, setSuccessPhone] = useState("");

  const heroHighlights = [
    {
      icon: ShieldCheck,
      title: "Garantia de 90 dias",
      text: "Cobertura para todos os reparos realizados pela equipe.",
    },
    {
      icon: Truck,
      title: "Coleta e entrega",
      text: "Buscamos e devolvemos em Recife com segurança e agilidade.",
    },
    {
      icon: Gamepad2,
      title: "Especialistas em consoles",
      text: "PlayStation, Xbox, Nintendo e controles de várias marcas.",
    },
  ];

  const services = [
    {
      icon: Cpu,
      title: "Reparo de Consoles",
      text: "Especialistas em PlayStation, Xbox e Nintendo. Placa, leitor, fonte, superaquecimento e travamentos.",
      hoverColor: "hover:border-blue-500/60",
    },
    {
      icon: Gamepad2,
      title: "Reparo de Controles",
      text: "Conserto de analógicos, botões, gatilhos, conectividade e problemas elétricos em controles de diversas marcas.",
      hoverColor: "hover:border-emerald-500/60",
    },
    {
      icon: Wrench,
      title: "Diagnóstico Detalhado",
      text: "Cada equipamento passa por análise completa para identificar a causa do defeito e definir o melhor reparo.",
      hoverColor: "hover:border-red-500/60",
    },
  ];

  const logisticsSteps = [
    {
      icon: MessageSquareText,
      title: "1. Solicite",
      text: "Envie o problema do seu console e receba orientação inicial da equipe.",
    },
    {
      icon: Truck,
      title: "2. Coleta",
      text: "Buscamos seu equipamento em Recife com segurança e praticidade.",
    },
    {
      icon: Wrench,
      title: "3. Reparo e Entrega",
      text: "Após diagnóstico e reparo, devolvemos seu videogame pronto para jogar.",
    },
  ];

  const logisticsBenefits = [
    "Técnicos qualificados",
    "Garantia de 90 dias",
    "Suporte especializado",
    "Coleta e entrega",
  ];

  const accountFeatures = [
    {
      icon: Radar,
      title: "Acompanhamento em tempo real",
      description: "Receba notificações sobre o status do seu serviço.",
    },
    {
      icon: History,
      title: "Histórico completo",
      description: "Acesse todo o histórico dos seus atendimentos.",
    },
    {
      icon: Bell,
      title: "Notificações automáticas",
      description: "Seja avisado sempre que houver mudança de status.",
    },
  ];

  const faqList = [
    {
      question: "Quais videogames vocês consertam?",
      answer: "Consertamos PlayStation (todas as gerações), Xbox (One, Series S/X), Nintendo Switch e controles de diversas marcas. Trabalhamos com problemas de hardware, software, superaquecimento, travamentos e muito mais.",
    },
    {
      question: "Vocês fazem coleta e entrega em Recife?",
      answer: "Sim! Oferecemos serviço de coleta e entrega em Recife e região metropolitana. Consulte nossas taxas por localidade ao solicitar o orçamento.",
    },
    {
      question: "Qual é o prazo médio de reparo?",
      answer: "O prazo varia conforme a complexidade do problema. Após o diagnóstico, informamos o tempo estimado. Geralmente, reparos simples levam de 3 a 5 dias úteis, enquanto reparos mais complexos podem levar até 10 dias úteis.",
    },
    {
      question: "Os reparos possuem garantia?",
      answer: "Sim! Todos os reparos realizados pela nossa equipe possuem garantia de 90 dias. Caso o mesmo problema ocorra novamente dentro desse período, refazemos o serviço sem custo adicional.",
    },
    {
      question: "Como solicitar orçamento?",
      answer: "Você pode solicitar um orçamento através do formulário de contato nesta página, pelo WhatsApp (botão flutuante) ou pelo telefone (81) 9 8676-3169. Descreva o problema do seu console ou controle e nossa equipe entrará em contato em breve.",
    },
  ];

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload = {
        fullName: contactForm.fullName,
        email: contactForm.email || undefined,
        phone: contactForm.phone,
        equipmentText: contactForm.equipment,
        problemDescription: contactForm.description,
      };

      await api.createPreOrderFromLanding(payload);
      setSuccessPhone(contactForm.phone);
      setShowSuccessDialog(true);
      setContactForm({ fullName: "", email: "", phone: "", equipment: "", description: "" });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao enviar pré-ordem");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="app-shell min-h-screen w-full bg-zinc-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="tech-grid absolute inset-0 opacity-25" aria-hidden="true"></div>
        <img 
          alt="Controles e consoles para reparo" 
          className="absolute inset-0 h-full w-full object-cover object-center opacity-25" 
          src="https://images.unsplash.com/photo-1550921464-1bbe1d247da5?auto=format&fit=crop&w=1600&q=80"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.2),transparent_60%)]"></div>
        
        <header className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 md:px-12">
          <a href="#topo" className="font-heading text-xl font-bold text-white">
            Doutor <span className="text-indigo-400">Game</span>
          </a>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a href="#servicos" className="text-slate-300 transition-colors hover:text-white">
              Serviços
            </a>
            <a href="#logistica" className="text-slate-300 transition-colors hover:text-white">
              Logística
            </a>
            <a href="#contato" className="text-slate-300 transition-colors hover:text-white">
              Contato
            </a>
          </nav>
          <a 
            href="https://wa.me/5581986763169" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            WhatsApp
          </a>
        </header>

        <div id="topo" className="relative mx-auto grid w-full max-w-7xl gap-10 px-6 pb-20 pt-16 md:grid-cols-12 md:px-12 md:pb-28">
          <div className="space-y-8 md:col-span-7">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-emerald-400">
              assistência técnica especializada em consoles • recife
            </p>
            <h1 className="font-heading text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
              Seu videogame <span className="text-indigo-400">quebrou</span>?
            </h1>
            <p className="max-w-2xl text-sm text-slate-300 md:text-lg">
              Reparos de PlayStation, Xbox e Nintendo com coleta e entrega em Recife. Atendimento técnico rápido, diagnóstico detalhado e garantia para você voltar a jogar sem dor de cabeça.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                className="h-12 w-full rounded-md bg-indigo-500 text-base font-semibold text-white transition-colors hover:bg-indigo-600"
                onClick={() => {
                  document.getElementById("contato")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Solicitar Orçamento
              </Button>
              <Button
                className="h-12 w-full rounded-md bg-emerald-500 text-base font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
                onClick={() => setLocation("/track")}
              >
                Acompanhar Serviço
              </Button>
            </div>
          </div>
          <div className="grid gap-4 md:col-span-5">
            {heroHighlights.map((highlight, index) => (
              <article key={index} className="rounded-xl border border-white/10 bg-black/50 p-5 backdrop-blur">
                <highlight.icon className="mb-3 h-5 w-5 text-emerald-400" aria-hidden="true" />
                <h2 className="font-heading text-base font-semibold text-white">{highlight.title}</h2>
                <p className="mt-2 text-sm text-slate-300">{highlight.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicos" className="mx-auto w-full max-w-7xl px-6 py-20 md:px-12">
        <div className="mb-12 max-w-2xl space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-indigo-300">serviços</p>
          <h2 className="font-heading text-3xl font-semibold text-white md:text-5xl">
            Reparos rápidos com padrão profissional
          </h2>
          <p className="text-sm text-slate-300 md:text-base">
            Nossa equipe técnica resolve desde defeitos simples até reparos complexos com peças de qualidade e atendimento transparente.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {services.map((service, index) => (
            <Card key={index} className={`rounded-xl border border-white/10 bg-zinc-950/70 backdrop-blur transition-all duration-300 ${service.hoverColor}`}>
              <CardHeader className="flex flex-col space-y-1.5 p-6">
                <service.icon className="h-6 w-6 text-indigo-400" aria-hidden="true" />
                <CardTitle className="font-heading text-xl text-white">{service.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <p className="text-sm leading-relaxed text-slate-300">{service.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Logistics Section */}
      <section id="logistica" className="relative overflow-hidden border-y border-white/10">
        <img 
          alt="Entrega de equipamento" 
          className="absolute inset-0 h-full w-full object-cover object-center opacity-25" 
          src="https://images.unsplash.com/photo-1768423083233-b3f696c9b703?auto=format&fit=crop&w=1400&q=80"
        />
        <div className="absolute inset-0 bg-black/85"></div>
        <div className="relative mx-auto w-full max-w-7xl px-6 py-20 md:px-12">
          <div className="mb-10 space-y-3">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-400">logística</p>
            <h2 className="font-heading text-3xl font-semibold text-white md:text-5xl">
              Coleta e entrega para sua conveniência
            </h2>
            <p className="max-w-3xl text-sm text-slate-300 md:text-base">
              Pensando no seu conforto, buscamos e entregamos seu console em Recife. Consulte taxas por localidade e disponibilidade.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {logisticsSteps.map((step, index) => (
              <article key={index} className="rounded-xl border border-white/10 bg-black/40 p-5 backdrop-blur transition-colors duration-300 hover:border-indigo-500/60">
                <step.icon className="mb-3 h-6 w-6 text-indigo-400" aria-hidden="true" />
                <h3 className="font-heading text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{step.text}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {logisticsBenefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                <BadgeCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <span className="text-sm text-slate-100">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contato" className="mx-auto w-full max-w-7xl px-6 py-20 md:px-12">
        <div className="mb-10 max-w-2xl space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-indigo-300">contatos</p>
          <h2 className="font-heading text-3xl font-semibold text-white md:text-5xl">
            Fale conosco e volte a jogar sem preocupações
          </h2>
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-xl border border-white/10 bg-zinc-950/70 p-6">
              <h3 className="font-heading text-xl font-semibold text-white">Informações de Contato</h3>
              <div className="mt-5 space-y-4">
                <p className="flex items-start gap-3 text-slate-200">
                  <Phone className="mt-0.5 h-4 w-4 text-emerald-400" aria-hidden="true" />
                  <span>
                    <strong className="text-white">Telefone:</strong> (81) 9 8676-3169
                  </span>
                </p>
                <p className="flex items-start gap-3 text-slate-200">
                  <MapPin className="mt-0.5 h-4 w-4 text-indigo-400" aria-hidden="true" />
                  <span>
                    <strong className="text-white">Endereço:</strong> Rua Ijuí, nº 293, Torrões, Recife - PE
                  </span>
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-950/70 p-3">
              <h3 className="mb-3 px-2 font-heading text-base font-semibold text-white">Nossa Localização</h3>
              <div className="aspect-[16/9] overflow-hidden rounded-lg border border-white/10">
                <iframe
                  title="Mapa Doutor Game"
                  src="https://www.google.com/maps?q=Rua%20Iju%C3%AD%20293%20Recife&output=embed"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-full w-full border-0"
                />
              </div>
            </div>
          </div>
          <form className="rounded-xl border border-white/10 bg-zinc-950/70 p-6 backdrop-blur" onSubmit={handleContactSubmit}>
            <h3 className="mb-5 font-heading text-xl font-semibold text-white">Envie sua Mensagem</h3>
            <div className="space-y-4">
              <Input
                placeholder="Seu nome completo"
                required
                value={contactForm.fullName}
                onChange={(e) => setContactForm({ ...contactForm, fullName: e.target.value })}
                name="fullName"
                className="h-11 border-white/10 bg-zinc-900/80 text-white placeholder:text-slate-500"
              />
              <Input
                type="email"
                placeholder="seu@email.com"
                required
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                name="email"
                className="h-11 border-white/10 bg-zinc-900/80 text-white placeholder:text-slate-500"
              />
              <Input
                placeholder="(81) 98676-3169"
                required
                value={formatPhone(contactForm.phone)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  if (raw.length <= 11) {
                    setContactForm({ ...contactForm, phone: raw });
                  }
                }}
                name="phone"
                className="h-11 border-white/10 bg-zinc-900/80 text-white placeholder:text-slate-500"
              />
              <Input
                placeholder="Console/controle"
                value={contactForm.equipment}
                onChange={(e) => setContactForm({ ...contactForm, equipment: e.target.value })}
                name="equipment"
                required
                className="h-11 border-white/10 bg-zinc-900/80 text-white placeholder:text-slate-500"
              />
              <Textarea
                name="description"
                placeholder="Descreva o problema do seu console ou controle..."
                required
                value={contactForm.description}
                onChange={(e) => setContactForm({ ...contactForm, description: e.target.value })}
                className="min-h-32 border-white/10 bg-zinc-900/80 text-white placeholder:text-slate-500"
              />
            </div>
            <Button 
              type="submit" 
              className="mt-6 h-11 w-full rounded-md bg-emerald-500 font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Enviando..." : "Enviar Mensagem"}
            </Button>
          </form>
        </div>
      </section>

      {/* Account Section */}
      <section className="border-y border-white/10 bg-zinc-950/30 px-6 py-20 md:px-12">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-5">
            <h2 className="font-heading text-3xl font-semibold text-white md:text-5xl">
              Crie sua conta e acompanhe melhor seus pedidos
            </h2>
            <p className="text-sm text-slate-300 md:text-base">
              Com uma conta, você terá acesso a recursos exclusivos para gerenciar seus serviços com mais praticidade.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {accountFeatures.map((feature, index) => (
                <article key={index} className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <feature.icon className="mb-2 h-5 w-5 text-indigo-400" aria-hidden="true" />
                  <h3 className="font-heading text-base font-semibold text-white">{feature.title}</h3>
                  <p className="mt-1 text-sm text-slate-300">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-center gap-4 rounded-xl border border-white/10 bg-black/40 p-6">
            <p className="text-sm text-slate-300">
              Quer ser avisado sobre cada etapa do reparo? Fale com nosso atendimento e solicite seu cadastro.
            </p>
            <Button
              className="h-11 w-full rounded-md bg-indigo-500 text-base font-semibold text-white transition-colors hover:bg-indigo-600"
              onClick={() => setLocation("/register")}
            >
              Criar conta gratuita
            </Button>
            <Button
              variant="outline"
              className="h-11 w-full rounded-md border-white/20 bg-white/5 text-base font-semibold text-white transition-colors hover:bg-white/10"
              onClick={() => setLocation("/login")}
            >
              Já tem uma conta? Faça login
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="mx-auto w-full max-w-7xl px-6 py-20 md:px-12">
        <div className="mb-8 space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-400">faq</p>
          <h2 className="font-heading text-3xl font-semibold text-white md:text-5xl">
            Dúvidas frequentes
          </h2>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-950/70 p-5 md:p-7">
          <Accordion type="single" collapsible className="w-full">
            {faqList.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-b border-white/10">
                <AccordionTrigger className="text-left text-base text-white hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-slate-300">{faq.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-6 pb-20 pt-8 md:px-12">
        <div className="mx-auto w-full max-w-7xl rounded-2xl border border-white/10 bg-[linear-gradient(120deg,rgba(99,102,241,0.25),rgba(16,185,129,0.2))] p-8 text-center backdrop-blur md:p-12">
          <h2 className="font-heading text-3xl font-semibold text-white md:text-5xl">
            Pronto para consertar seu videogame?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-100 md:text-base">
            Solicite um orçamento gratuito e sem compromisso com atendimento rápido da equipe Doutor Game.
          </p>
          <div className="mx-auto mt-7 grid max-w-xl gap-3 sm:grid-cols-2">
            <Button
              className="h-12 w-full rounded-md bg-indigo-500 text-base font-semibold text-white transition-colors hover:bg-indigo-600"
              onClick={() => {
                document.getElementById("contato")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Solicitar Orçamento
            </Button>
            <Button
              className="h-12 w-full rounded-md bg-emerald-500 text-base font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
              onClick={() => setLocation("/track")}
            >
              Acompanhar Serviço
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-6 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} Doutor Game • Rua Ijuí, nº 293 • Torrões, Recife - PE
      </footer>

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/5581986763169"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_20px_rgba(37,211,102,0.45)] transition-transform duration-300 hover:scale-110 active:scale-95"
        aria-label="Abrir conversa no WhatsApp"
      >
        <MessageCircle className="h-7 w-7" aria-hidden="true" />
      </a>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mx-auto mb-4">
              <ShieldCheck className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-center">Pré-ordem Recebida!</DialogTitle>
            <DialogDescription className="text-center">
              Sua pré-ordem foi recebida com sucesso. Você pode consultar o status pelo seu telefone em{" "}
              <button
                className="text-blue-600 hover:underline font-semibold"
                onClick={() => setLocation("/track")}
                type="button"
              >
                Acompanhar Serviço
              </button>
              {successPhone ? <>{" "}({formatPhone(successPhone)})</> : null}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button onClick={() => setShowSuccessDialog(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
