import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Package, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: ShoppingCart,
      title: "Gestão de Pedidos",
      description: "Controle completo de pedidos em tempo real",
    },
    {
      icon: Package,
      title: "Controle de Estoque",
      description: "Acompanhe produtos e disponibilidade",
    },
    {
      icon: Users,
      title: "Gestão de Clientes",
      description: "Centralize informações dos seus clientes",
    },
    {
      icon: TrendingUp,
      title: "Relatórios e Analytics",
      description: "Insights para tomar decisões inteligentes",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
            Plataforma de Pedidos
            <span className="block text-blue-600 mt-2">Modernizada e Eficiente</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            Gerencie seus pedidos, estoque e clientes em uma única plataforma.
            Solução completa para otimizar suas operações.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
              onClick={() => setLocation("/login")}
            >
              Começar Agora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6"
              onClick={() => setLocation("/dashboard")}
            >
              Ver Dashboard
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-md hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Benefits Section */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Por que escolher nossa plataforma?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Interface intuitiva e fácil de usar",
                "Atualizações em tempo real",
                "Segurança e confiabilidade",
                "Suporte técnico dedicado",
                "Escalável para qualquer tamanho de negócio",
                "Integração com sistemas externos",
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-slate-700">{benefit}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
