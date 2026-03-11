import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserPlus, Loader2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { formatPhone, formatCPF, formatCEP, validateCPF } from "@/lib/formatters";
import { fetchCEP } from "@/lib/cep";

export default function Register() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddressFields, setShowAddressFields] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    cpf: "",
    phone: "",
    address: {
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
    },
  });

  const handleCEP = async (cep: string) => {
    const raw = cep.replace(/\D/g, "");
    if (raw.length !== 8) {
      setShowAddressFields(false);
      return;
    }
    setCepLoading(true);
    try {
      const data = await fetchCEP(raw);
      if (data) {
        setFormData((prev) => ({
          ...prev,
          address: {
            ...prev.address,
            street: data.street || prev.address.street,
            neighborhood: data.neighborhood || prev.address.neighborhood,
            city: data.city || prev.address.city,
            state: data.state || prev.address.state,
          },
        }));
        setShowAddressFields(true);
      } else {
        setShowAddressFields(false);
      }
    } catch {
      setShowAddressFields(false);
    } finally {
      setCepLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validações
    if (formData.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    const cpfRaw = formData.cpf.replace(/\D/g, "");
    if (cpfRaw.length === 11 && !validateCPF(cpfRaw)) {
      setError("CPF inválido");
      return;
    }

    setLoading(true);

    try {
      await api.registerCustomer({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        cpf: cpfRaw || undefined,
        phone: formData.phone.replace(/\D/g, ""),
        address: formData.address.zipCode ? {
          street: formData.address.street,
          number: formData.address.number,
          complement: formData.address.complement,
          neighborhood: formData.address.neighborhood,
          city: formData.address.city,
          state: formData.address.state,
          zipCode: formData.address.zipCode.replace(/\D/g, ""),
        } : undefined,
      });
      toast.success("Conta criada com sucesso! Faça login para continuar.");
      setLocation("/cliente/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4">
      <Card className="w-full max-w-md border-0 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Criar Conta</CardTitle>
          <CardDescription>
            Preencha os dados para criar sua conta gratuita
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome completo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={loading}
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                type="text"
                placeholder="000.000.000-00"
                value={formatCPF(formData.cpf)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  if (raw.length <= 11) setFormData({ ...formData, cpf: raw });
                }}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                type="text"
                placeholder="(00) 00000-0000"
                value={formatPhone(formData.phone)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  if (raw.length <= 11) setFormData({ ...formData, phone: raw });
                }}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">CEP</Label>
              <div className="relative">
                <Input
                  id="zipCode"
                  type="text"
                  placeholder="00000-000"
                  value={formatCEP(formData.address.zipCode)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    if (raw.length <= 8) {
                      setFormData({
                        ...formData,
                        address: { ...formData.address, zipCode: raw },
                      });
                      if (raw.length === 8) {
                        handleCEP(raw);
                      } else if (raw.length < 8) {
                        setShowAddressFields(false);
                      }
                    }
                  }}
                  disabled={loading}
                />
                {cepLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>

            {showAddressFields && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="street">Rua</Label>
                    <Input
                      id="street"
                      type="text"
                      value={formData.address.street}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, street: e.target.value },
                        })
                      }
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="number">Número</Label>
                    <Input
                      id="number"
                      type="text"
                      value={formData.address.number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, number: e.target.value },
                        })
                      }
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input
                      id="neighborhood"
                      type="text"
                      value={formData.address.neighborhood}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, neighborhood: e.target.value },
                        })
                      }
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      type="text"
                      value={formData.address.city}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, city: e.target.value },
                        })
                      }
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      type="text"
                      placeholder="PE"
                      maxLength={2}
                      value={formData.address.state}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, state: e.target.value.toUpperCase().slice(0, 2) },
                        })
                      }
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      type="text"
                      value={formData.address.complement}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, complement: e.target.value },
                        })
                      }
                      disabled={loading}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={loading}
                autoComplete="new-password"
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                Mínimo de 6 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                disabled={loading}
                autoComplete="new-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Criar Conta
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              Já tem uma conta?{" "}
              <button
                type="button"
                onClick={() => setLocation("/login")}
                className="text-blue-600 hover:underline font-medium"
              >
                Faça login
              </button>
            </p>
            <div className="flex justify-center mt-2">
              <button
                type="button"
                onClick={() => setLocation("/")}
                className="text-blue-600 hover:underline"
              >
                Voltar para a página inicial
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
