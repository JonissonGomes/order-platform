import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import type { Settings } from "@/types";
import { formatPhone, formatCEP } from "@/lib/formatters";
import { fetchCEP } from "@/lib/cep";
import { Building2, Phone, Mail, MapPin, FileText, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_WARRANTY_TERMS = `1. O equipamento deve ser retirado em até 30 dias após a conclusão do serviço ou orçamento. Após esse prazo, será cobrada uma taxa de R$ 50,00 por mês referente a armazenamento. Equipamentos não retirados em até 90 dias serão considerados abandonados e poderão ser descartados.
2. Reparos de consoles e controles possuem 90 dias de garantia, válida apenas para o mesmo defeito relatado, com lacre intacto e sem sinais de mau uso.
3. Serviços como limpeza, desoxidação, troca de conectores, desbloqueio, formatação ou relacionados a software não possuem garantia.
4. A empresa não se responsabiliza pela perda de arquivos (jogos, fotos, vídeos, aplicativos, etc.). Recomendamos que o cliente realize backup antes da entrega do equipamento.
5. Em casos em que o orçamento não for aprovado pelo cliente, será cobrada uma taxa referente ao custo operacional do diagnóstico técnico.
6. Produtos vendidos pela empresa têm garantia de 90 dias, conforme o Código de Defesa do Consumidor.`;

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [form, setForm] = useState<{
    companyName: string;
    companyPhone: string;
    companyEmail: string;
    warrantyTerms: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  }>({
    companyName: "",
    companyPhone: "",
    companyEmail: "",
    warrantyTerms: DEFAULT_WARRANTY_TERMS,
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { settings } = await api.getSettings();
      if (settings) {
        setForm({
          companyName: settings.companyName || "",
          companyPhone: settings.companyPhone || "",
          companyEmail: settings.companyEmail || "",
          warrantyTerms: settings.warrantyTerms || DEFAULT_WARRANTY_TERMS,
          street: settings.companyAddress?.street || "",
          number: settings.companyAddress?.number || "",
          complement: settings.companyAddress?.complement || "",
          neighborhood: settings.companyAddress?.neighborhood || "",
          city: settings.companyAddress?.city || "",
          state: settings.companyAddress?.state || "",
          zipCode: settings.companyAddress?.zipCode || "",
        });
      }
    } catch {
      // silently fail — settings may not exist yet
    } finally {
      setLoading(false);
    }
  };

  const handleCEPSearch = async (cep: string) => {
    const raw = cep.replace(/\D/g, "");
    if (raw.length !== 8) return;
    try {
      setCepLoading(true);
      const data = await fetchCEP(raw);
      if (data) {
        setForm((f) => ({
          ...f,
          street: data.logradouro || f.street,
          neighborhood: data.bairro || f.neighborhood,
          city: data.localidade || f.city,
          state: data.uf || f.state,
        }));
      }
    } catch {
      // silently fail
    } finally {
      setCepLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload: Partial<Settings> = {
        companyName: form.companyName,
        companyPhone: form.companyPhone,
        companyEmail: form.companyEmail,
        warrantyTerms: form.warrantyTerms,
      };
      if (form.street || form.city) {
        payload.companyAddress = {
          street: form.street,
          number: form.number,
          complement: form.complement,
          neighborhood: form.neighborhood,
          city: form.city,
          state: form.state,
          zipCode: form.zipCode.replace(/\D/g, ""),
        };
      }
      await api.updateSettings(payload);
      toast.success("Configurações salvas com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Informações gerais da empresa e termos de garantia</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados da Empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Dados da Empresa
              </CardTitle>
              <CardDescription>Informações básicas exibidas nas ordens de serviço</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nome da Empresa</Label>
                <Input
                  id="companyName"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder="Nome da sua empresa"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyPhone" className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Telefone
                  </Label>
                  <Input
                    id="companyPhone"
                    value={formatPhone(form.companyPhone)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      if (raw.length <= 11) setForm({ ...form, companyPhone: raw });
                    }}
                    placeholder="(81) 98676-3169"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail" className="flex items-center gap-1">
                    <Mail className="h-3 w-3" /> E-mail
                  </Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={form.companyEmail}
                    onChange={(e) => setForm({ ...form, companyEmail: e.target.value })}
                    placeholder="contato@empresa.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Localização da Sede */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Localização da Sede Principal
              </CardTitle>
              <CardDescription>Endereço que aparecerá nas ordens de serviço</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zipCode">CEP</Label>
                  <div className="relative">
                    <Input
                      id="zipCode"
                      value={formatCEP(form.zipCode)}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        if (raw.length <= 8) {
                          setForm({ ...form, zipCode: raw });
                          if (raw.length === 8) handleCEPSearch(raw);
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
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase().slice(0, 2) })}
                    placeholder="PE"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="street">Rua / Logradouro</Label>
                  <Input
                    id="street"
                    value={form.street}
                    onChange={(e) => setForm({ ...form, street: e.target.value })}
                    placeholder="Rua das Flores"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    value={form.number}
                    onChange={(e) => setForm({ ...form, number: e.target.value })}
                    placeholder="123"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={form.neighborhood}
                    onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                    placeholder="Centro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Recife"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  value={form.complement}
                  onChange={(e) => setForm({ ...form, complement: e.target.value })}
                  placeholder="Sala 2, Bloco A..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Termos de Garantia */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Termos de Garantia
              </CardTitle>
              <CardDescription>
                Texto que aparecerá automaticamente nas ordens de serviço impressas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={form.warrantyTerms}
                onChange={(e) => setForm({ ...form, warrantyTerms: e.target.value })}
                rows={10}
                className="font-mono text-sm"
                placeholder="Digite os termos de garantia..."
              />
            </CardContent>
          </Card>

          <Separator />

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} size="lg">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
