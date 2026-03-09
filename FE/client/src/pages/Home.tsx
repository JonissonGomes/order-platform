import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Clock,
  Shield,
  Wrench,
  Gamepad2,
  Joystick,
  Cpu,
  Truck,
  MessageSquare,
  Zap,
  UserPlus,
  Bell,
  Sparkles,
} from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { MapView } from "@/components/Map";
import { formatPhone } from "@/lib/formatters";

export default function Home() {
  const [, setLocation] = useLocation();
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const services = [
    {
      icon: Gamepad2,
      title: "Reparo de Consoles",
      description: "Especialistas em reparo de Playstation, Xbox e Nintendo. Resolvemos desde problemas simples até reparos complexos.",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: Joystick,
      title: "Reparo de Controles",
      description: "Conserto de controles de todas as marcas. Analógicos, botões, conectividade e muito mais.",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: Cpu,
      title: "Diagnóstico Detalhado",
      description: "Cada equipamento recebe diagnóstico detalhado e atendimento exclusivo.",
      gradient: "from-orange-500 to-red-500",
    },
    {
      icon: Truck,
      title: "Coleta e Entrega",
      description: "Buscamos e entregamos seu console em Recife. Consulte nossas taxas para sua localidade.",
      gradient: "from-green-500 to-emerald-500",
    },
  ];

  const benefits = [
    {
      icon: Wrench,
      title: "Técnicos qualificados",
      description: "Nossa equipe é composta por especialistas em videogames.",
    },
    {
      icon: Shield,
      title: "Garantia de 90 dias",
      description: "Para todos os reparos realizados pela nossa equipe.",
    },
    {
      icon: MessageSquare,
      title: "Suporte especializado",
      description: "Cada equipamento recebe diagnóstico detalhado e atendimento exclusivo.",
    },
    {
      icon: Clock,
      title: "Coleta e entrega",
      description: "Pensando na sua conveniência, buscamos e entregamos seu console em Recife.",
    },
  ];

  // Depoimentos removidos - podem ser adicionados via API no futuro

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aqui você pode implementar o envio do formulário
    console.log("Formulário enviado:", contactForm);
    setShowSuccessDialog(true);
    setContactForm({ name: "", email: "", phone: "", message: "" });
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Hero Section */}
      <section className="w-full container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 mb-6 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-purple-300" />
            <span className="text-sm font-medium text-purple-200">Especialistas em Reparo de Videogames</span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-4 leading-tight">
            <span className="block text-white">Seu videogame</span>
            <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mt-2 animate-pulse">
              quebrou ?
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-8 leading-relaxed font-medium max-w-3xl mx-auto">
            Reparos de <span className="text-purple-300 font-semibold">Playstation</span>, <span className="text-green-300 font-semibold">Xbox</span> e <span className="text-red-300 font-semibold">Nintendo</span> com coleta e entrega em Recife, só na <span className="text-cyan-300 font-bold">Doutor Game</span>.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="text-lg px-8 py-6 shadow-2xl hover:shadow-purple-500/50 transition-all w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white font-bold"
              onClick={() => {
                document.getElementById("contato")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Solicitar Orçamento
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 w-full sm:w-auto border-2 border-purple-400/50 text-purple-200 hover:bg-purple-500/20 hover:border-purple-400 backdrop-blur-sm"
              onClick={() => setLocation("/track")}
            >
              Acompanhar Serviço
            </Button>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="w-full container mx-auto px-4 py-16 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-4">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Serviços</span>
          </h2>
          <p className="text-lg text-slate-300 max-w-3xl mx-auto">
            Na <span className="text-cyan-300 font-semibold">Doutor Game</span>, somos especialistas em reparo de consoles e controles da Playstation, Xbox e Nintendo. 
            Com uma equipe de técnicos capacitados e tecnologia avançada, resolvemos desde problemas simples até reparos complexos, 
            sempre com agilidade e qualidade.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <Card key={index} className="border-0 shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border border-purple-500/20 hover:border-purple-400/50 group">
              <CardHeader>
                <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${service.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <service.icon className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-xl text-white">{service.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base text-slate-300">
                  {service.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="w-full bg-gradient-to-b from-slate-900 via-purple-900/50 to-slate-900 py-16 relative z-10">
        <div className="w-full container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Logística</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-4 font-semibold">
              Coleta e entrega
            </p>
            <p className="text-base text-slate-400 max-w-2xl mx-auto">
              Pensando na sua conveniência, buscamos e entregamos seu console em Recife. Consulte nossas taxas para sua localidade.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="border-0 shadow-2xl text-center bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border border-cyan-500/20 hover:border-cyan-400/50 transition-all duration-300 hover:shadow-cyan-500/20">
                <CardHeader>
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <benefit.icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-lg text-white">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-slate-300">{benefit.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section - Removido dados mockados */}

      {/* Contact Section */}
      <section id="contato" className="w-full bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 py-16 relative z-10">
        <div className="w-full container mx-auto px-4">
          <div className="max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4">
                <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">Contatos</span>
              </h2>
              <p className="text-lg text-slate-300 mb-2 font-medium">
                Fale conosco, e volte a jogar sem preocupações!
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Contact Info */}
              <div className="space-y-6">
                <Card className="border-0 shadow-2xl bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border border-purple-500/20">
                  <CardHeader>
                    <CardTitle className="text-white">Informações de Contato</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                        <Phone className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200">Telefone</p>
                        <p className="text-slate-300">(81) 9 8676-3169</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500">
                        <MapPin className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200">Endereço</p>
                        <p className="text-slate-300">
                          Rua Ijuí, nº 293<br />
                          Torrões, Recife - PE
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {/* Map */}
                <Card className="border-0 shadow-2xl bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border border-purple-500/20">
                  <CardHeader>
                    <CardTitle className="text-white">Nossa Localização</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <MapView 
                      initialCenter={{ lat: -8.0704, lng: -34.9100 }} 
                      initialZoom={15} 
                      className="h-[300px] w-full rounded-b-lg" 
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Contact Form */}
              <Card className="border-0 shadow-2xl bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Envie sua Mensagem</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-slate-200">Nome</Label>
                      <Input
                        id="name"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        required
                        placeholder="Seu nome completo"
                        className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-purple-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-200">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        required
                        placeholder="seu@email.com"
                        className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-purple-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-slate-200">Telefone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formatPhone(contactForm.phone)}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          if (raw.length <= 11) {
                            setContactForm({ ...contactForm, phone: raw });
                          }
                        }}
                        required
                        placeholder="(81) 98676-3169"
                        className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-purple-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-slate-200">Mensagem</Label>
                      <Textarea
                        id="message"
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        required
                        placeholder="Descreva o problema do seu console ou controle..."
                        rows={5}
                        className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-purple-500"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white font-bold shadow-lg" size="lg">
                      Enviar Mensagem
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* CTA para criar conta - Full width */}
            <Card className="border-0 shadow-2xl border-2 border-purple-500/30 bg-gradient-to-br from-purple-900/40 to-pink-900/40 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                    <UserPlus className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle className="text-xl text-white">Crie sua conta e acompanhe melhor seus pedidos</CardTitle>
                </div>
                <CardDescription className="text-base text-slate-300">
                  Com uma conta, você terá acesso a recursos exclusivos para gerenciar seus serviços
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-cyan-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-sm text-slate-200">Acompanhamento em tempo real</p>
                      <p className="text-xs text-slate-400">Receba notificações sobre o status do seu serviço</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-cyan-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-sm text-slate-200">Histórico completo</p>
                      <p className="text-xs text-slate-400">Acesse todo o histórico de seus serviços</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Bell className="h-5 w-5 text-cyan-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-sm text-slate-200">Notificações automáticas</p>
                      <p className="text-xs text-slate-400">Seja avisado sobre mudanças de status</p>
                    </div>
                  </div>
                </div>
            <Button 
              onClick={() => setLocation("/register")} 
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white font-bold shadow-lg" 
              size="lg"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Criar conta gratuita
            </Button>
                <p className="text-xs text-center text-slate-400">
                  Já tem uma conta? <button onClick={() => setLocation("/login")} className="text-cyan-400 hover:text-cyan-300 hover:underline font-medium">Faça login</button>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full container mx-auto px-4 py-16 relative z-10">
        <Card className="border-0 shadow-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 text-white max-w-6xl xl:max-w-7xl 2xl:max-w-full mx-auto border-2 border-white/20 backdrop-blur-sm">
          <CardContent className="p-8 md:p-12 text-center relative overflow-hidden">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC40Ij48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')]"></div>
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4 drop-shadow-lg">
                Pronto para consertar seu videogame?
              </h2>
              <p className="text-lg md:text-xl mb-8 text-white/90 font-medium">
                Solicite um orçamento gratuito e sem compromisso
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button
                  size="lg"
                  variant="secondary"
                  className="text-lg px-8 py-6 w-full sm:w-auto bg-white text-purple-600 hover:bg-slate-100 font-bold shadow-xl"
                  onClick={() => {
                    document.getElementById("contato")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Solicitar Orçamento
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-6 bg-transparent border-2 border-white text-white hover:bg-white hover:text-purple-600 w-full sm:w-auto font-bold backdrop-blur-sm"
                  onClick={() => setLocation("/track")}
                >
                  Acompanhar Serviço
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mx-auto mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-center">Mensagem Enviada!</DialogTitle>
            <DialogDescription className="text-center">
              Sua mensagem foi enviada com sucesso. Entraremos em contato em breve.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button onClick={() => setShowSuccessDialog(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
