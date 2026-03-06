import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Clock,
  Shield,
  Wrench,
  Smartphone,
  Laptop,
  Tablet,
  Star,
  MessageSquare,
  Zap,
} from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", message: "" });

  const services = [
    {
      icon: Smartphone,
      title: "Reparo de Smartphones",
      description: "Conserto completo de smartphones de todas as marcas. Tela, bateria, conector e muito mais.",
    },
    {
      icon: Laptop,
      title: "Reparo de Notebooks",
      description: "Manutenção e reparo de notebooks. Troca de peças, limpeza interna e formatação.",
    },
    {
      icon: Tablet,
      title: "Reparo de Tablets",
      description: "Especialistas em reparo de tablets. Tela, bateria e componentes internos.",
    },
    {
      icon: Zap,
      title: "Manutenção Preventiva",
      description: "Mantenha seus aparelhos em perfeito estado com nossa manutenção preventiva.",
    },
  ];

  const benefits = [
    {
      icon: Shield,
      title: "Garantia de 90 dias",
      description: "Todos os nossos serviços possuem garantia de 90 dias",
    },
    {
      icon: Clock,
      title: "Atendimento Rápido",
      description: "Avaliação em até 24 horas e conserto rápido",
    },
    {
      icon: Wrench,
      title: "Técnicos Especializados",
      description: "Equipe qualificada e certificada pelas principais marcas",
    },
    {
      icon: MessageSquare,
      title: "Acompanhamento Online",
      description: "Acompanhe o status do seu conserto em tempo real",
    },
  ];

  const testimonials = [
    {
      name: "Maria Silva",
      service: "Reparo de Smartphone",
      rating: 5,
      comment: "Atendimento excelente! Meu celular foi consertado rapidamente e com muita qualidade.",
    },
    {
      name: "João Santos",
      service: "Reparo de Notebook",
      rating: 5,
      comment: "Profissionais competentes e preço justo. Recomendo!",
    },
    {
      name: "Ana Costa",
      service: "Reparo de Tablet",
      rating: 5,
      comment: "Muito satisfeita com o serviço. Meu tablet voltou a funcionar perfeitamente.",
    },
  ];

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aqui você pode implementar o envio do formulário
    console.log("Formulário enviado:", contactForm);
    alert("Mensagem enviada com sucesso! Entraremos em contato em breve.");
    setContactForm({ name: "", email: "", phone: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
            Conserto de Aparelhos Eletrônicos
            <span className="block text-blue-600 mt-2">Profissional e Confiável</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            Especialistas em reparo de smartphones, notebooks e tablets. 
            Atendimento rápido, garantia de 90 dias e acompanhamento online do seu serviço.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
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
              className="text-lg px-8 py-6"
              onClick={() => setLocation("/public/track")}
            >
              Acompanhar Serviço
            </Button>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Nossos Serviços
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Oferecemos soluções completas para o conserto dos seus aparelhos eletrônicos
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <Card key={index} className="border-0 shadow-md hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                  <service.icon className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl">{service.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {service.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Por que escolher nossa empresa?
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="border-0 shadow-md text-center">
                <CardHeader>
                  <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{benefit.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            O que nossos clientes dizem
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-0 shadow-md">
              <CardHeader>
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <CardTitle className="text-lg">{testimonial.name}</CardTitle>
                <CardDescription>{testimonial.service}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 italic">"{testimonial.comment}"</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section id="contato" className="bg-gradient-to-br from-blue-50 to-slate-50 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Entre em Contato
              </h2>
              <p className="text-lg text-slate-600">
                Solicite um orçamento ou tire suas dúvidas
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Contact Info */}
              <div className="space-y-6">
                <Card className="border-0 shadow-md">
                  <CardHeader>
                    <CardTitle>Informações de Contato</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-blue-600 mt-1" />
                      <div>
                        <p className="font-semibold">Telefone</p>
                        <p className="text-slate-600">(11) 99999-9999</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-blue-600 mt-1" />
                      <div>
                        <p className="font-semibold">Email</p>
                        <p className="text-slate-600">contato@empresa.com.br</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-blue-600 mt-1" />
                      <div>
                        <p className="font-semibold">Endereço</p>
                        <p className="text-slate-600">
                          Rua Exemplo, 123<br />
                          São Paulo - SP, 01234-567
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-blue-600 mt-1" />
                      <div>
                        <p className="font-semibold">Horário de Atendimento</p>
                        <p className="text-slate-600">
                          Segunda a Sexta: 9h às 18h<br />
                          Sábado: 9h às 13h
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Contact Form */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle>Envie sua Mensagem</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome</Label>
                      <Input
                        id="name"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        required
                        placeholder="Seu nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        required
                        placeholder="seu@email.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        required
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Mensagem</Label>
                      <Textarea
                        id="message"
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        required
                        placeholder="Descreva o problema do seu aparelho..."
                        rows={5}
                      />
                    </div>
                    <Button type="submit" className="w-full" size="lg">
                      Enviar Mensagem
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <CardContent className="p-8 md:p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pronto para consertar seu aparelho?
            </h2>
            <p className="text-lg mb-8 text-blue-100">
              Solicite um orçamento gratuito e sem compromisso
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="secondary"
                className="text-lg px-8 py-6"
                onClick={() => {
                  document.getElementById("contato")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Solicitar Orçamento
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 bg-transparent border-white text-white hover:bg-white hover:text-blue-600"
                onClick={() => setLocation("/public/track")}
              >
                Acompanhar Serviço
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
