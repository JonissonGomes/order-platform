import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatCPF, formatPhone, formatCEP, validateCPF } from "@/lib/formatters";
import { fetchCEP } from "@/lib/cep";
import type { Customer } from "@/types";
import { ArrowLeft, Loader2, Save, User, Mail, Phone, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function CustomerProfile() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [showAddressFields, setShowAddressFields] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
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

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setLocation("/cliente/login");
      return;
    }

    // Verificar se é cliente
    if (user.type !== "customer" && user.role !== "customer") {
      setLocation("/dashboard");
      return;
    }

    loadCustomer();
  }, [user, isAuthenticated]);

  const loadCustomer = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const response = await api.getCustomer(user.id);
      setCustomer(response.customer);
      
      // Preencher formulário
      setFormData({
        name: response.customer.name || "",
        phone: response.customer.phone?.replace(/\D/g, "") || "",
        email: response.customer.email || "",
        address: {
          street: response.customer.address?.street || "",
          number: response.customer.address?.number || "",
          complement: response.customer.address?.complement || "",
          neighborhood: response.customer.address?.neighborhood || "",
          city: response.customer.address?.city || "",
          state: response.customer.address?.state || "",
          zipCode: response.customer.address?.zipCode?.replace(/\D/g, "") || "",
        },
      });

      // Mostrar campos de endereço se houver CEP
      if (response.customer.address?.zipCode && response.customer.address.zipCode.length >= 8) {
        setShowAddressFields(true);
      }
    } catch (error: any) {
      const errorMessage = error.message || "";
      if (errorMessage && !errorMessage.includes("status: 404") && errorMessage.trim() !== "") {
        toast.error(errorMessage || "Erro ao carregar dados do perfil");
      }
    } finally {
      setLoading(false);
    }
  };

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
    if (!customer?.id) return;

    try {
      setSaving(true);
      const hasAddress = formData.address.street || formData.address.city;
      const payload: any = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        address: hasAddress
          ? {
              ...formData.address,
              zipCode: formData.address.zipCode.replace(/\D/g, ""),
            }
          : undefined,
      };

      await api.updateCustomer(customer.id, payload);
      toast.success("Perfil atualizado com sucesso!");
      await loadCustomer(); // Recarregar dados atualizados
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar perfil");
    } finally {
      setSaving(false);
    }
  };

  const setAddr = (field: string, value: string) =>
    setFormData((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Erro ao carregar dados do perfil
            </p>
            <Button
              className="w-full mt-4"
              onClick={() => setLocation("/cliente/dashboard")}
            >
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/cliente/dashboard")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
                <p className="text-sm text-muted-foreground">
                  Atualize suas informações pessoais
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Informações Pessoais
            </CardTitle>
            <CardDescription>
              Mantenha seus dados atualizados para facilitar o atendimento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  <User className="h-4 w-4" />
                  Dados Pessoais
                </div>
                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={customer.cpf ? formatCPF(customer.cpf) : ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      CPF não pode ser alterado
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input
                      id="phone"
                      value={formatPhone(formData.phone)}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        if (raw.length <= 11)
                          setFormData({ ...formData, phone: raw });
                      }}
                      placeholder="(00) 00000-0000"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email <span className="text-xs text-muted-foreground">(opcional)</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  <MapPin className="h-4 w-4" />
                  Endereço
                </div>
                <Separator />

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-2">
                    <Label className="text-xs">CEP</Label>
                    <div className="relative">
                      <Input
                        value={formatCEP(formData.address.zipCode)}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          if (raw.length <= 8) {
                            setAddr("zipCode", raw);
                            if (raw.length === 8) {
                              handleCEP(raw);
                            } else if (raw.length < 8) {
                              setShowAddressFields(false);
                            }
                          }
                        }}
                        placeholder="00000-000"
                      />
                      {cepLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Estado</Label>
                    <Input
                      value={formData.address.state}
                      onChange={(e) =>
                        setAddr("state", e.target.value.toUpperCase().slice(0, 2))
                      }
                      placeholder="PE"
                      maxLength={2}
                    />
                  </div>
                </div>

                {showAddressFields && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 space-y-2">
                        <Label className="text-xs">Rua / Logradouro</Label>
                        <Input
                          value={formData.address.street}
                          onChange={(e) => setAddr("street", e.target.value)}
                          placeholder="Rua das Flores"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Número</Label>
                        <Input
                          value={formData.address.number}
                          onChange={(e) => setAddr("number", e.target.value)}
                          placeholder="123"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Bairro</Label>
                        <Input
                          value={formData.address.neighborhood}
                          onChange={(e) => setAddr("neighborhood", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Cidade</Label>
                        <Input
                          value={formData.address.city}
                          onChange={(e) => setAddr("city", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Complemento</Label>
                      <Input
                        value={formData.address.complement}
                        onChange={(e) => setAddr("complement", e.target.value)}
                        placeholder="Apto 10, Bloco A..."
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/cliente/dashboard")}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
