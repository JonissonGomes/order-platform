import { ChecklistField } from "@/components/orders/ChecklistField";
import {
  CustomerPicker,
  type CustomerValue,
} from "@/components/orders/CustomerPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/zts/FormField";
import { SuggestInput } from "@/components/zts/SuggestInput";
import { qk, useDepartments } from "@/hooks/queries";
import { api } from "@/lib/api";
import { brandsForType, modelsForBrand } from "@/lib/deviceCatalog";
import {
  digitsOnly,
  formatImeiInput,
  formatIntegerInput,
  formatMoneyInput,
  parseMoney,
} from "@/lib/format";
import { DEFAULT_CHECKLIST, DEVICE_TYPES, SERVICE_TYPES } from "@/lib/orderStatus";
import type { CreateServiceOrderRequest } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function OrderNew() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const departments = useDepartments();

  const [customer, setCustomer] = useState<CustomerValue>({ mode: "existing", id: "" });
  const [device, setDevice] = useState({
    productType: "Smartphone",
    productBrand: "",
    productModel: "",
    imei: "",
    serviceType: "",
    problemDescription: "",
    departmentId: "",
  });
  const [checklist, setChecklist] = useState<string[]>([]);
  const [budget, setBudget] = useState({
    estimatedCost: "",
    depositAmount: "",
    warrantyDays: "90",
    expectedAt: "",
  });

  const setDev = (patch: Partial<typeof device>) => setDevice(d => ({ ...d, ...patch }));

  const brandOptions = useMemo(() => brandsForType(device.productType), [device.productType]);
  const modelOptions = useMemo(
    () => modelsForBrand(device.productType, device.productBrand),
    [device.productType, device.productBrand]
  );

  const create = useMutation({
    mutationFn: async () => {
      let customerId = customer.mode === "existing" ? customer.id : "";
      if (customer.mode === "new") {
        const created = await api.customers.create({
          name: customer.data.name.trim(),
          phone: digitsOnly(customer.data.phone),
          cpf: digitsOnly(customer.data.cpf) || undefined,
          email: customer.data.email.trim() || undefined,
        });
        customerId = created.id;
      }
      const payload: CreateServiceOrderRequest = {
        customerId,
        productType: device.productType,
        productBrand: device.productBrand.trim(),
        productModel: device.productModel.trim(),
        imei: device.imei.trim() || undefined,
        serviceType: device.serviceType || undefined,
        problemDescription: device.problemDescription.trim(),
        departmentId: device.departmentId || undefined,
        checklist,
        estimatedCost: parseMoney(budget.estimatedCost) || undefined,
        depositAmount: parseMoney(budget.depositAmount) || undefined,
        warrantyDays: Number(budget.warrantyDays) || undefined,
        expectedAt: budget.expectedAt ? new Date(budget.expectedAt).toISOString() : undefined,
      };
      return api.serviceOrders.create(payload);
    },
    onSuccess: order => {
      queryClient.invalidateQueries({ queryKey: qk.orders });
      queryClient.invalidateQueries({ queryKey: qk.customers });
      toast.success(`OS #${order?.orderNumber ?? ""} criada com sucesso`);
      setLocation("/dashboard/ordens");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const customerOk =
    customer.mode === "existing"
      ? Boolean(customer.id)
      : Boolean(customer.data.name.trim() && digitsOnly(customer.data.phone).length >= 10);
  const valid = Boolean(
    customerOk && device.productBrand.trim() && device.productModel.trim() && device.problemDescription.trim()
  );

  return (
    <form
      className="mx-auto w-full max-w-[48rem]"
      onSubmit={e => {
        e.preventDefault();
        if (valid) create.mutate();
      }}
    >
      <div className="space-y-4">
        <Card className="gap-3 py-4">
          <CardHeader className="px-4"><CardTitle className="text-sm">1. Cliente</CardTitle></CardHeader>
          <CardContent className="px-4"><CustomerPicker value={customer} onChange={setCustomer} /></CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardHeader className="px-4"><CardTitle className="text-sm">2. Aparelho e defeito</CardTitle></CardHeader>
          <CardContent className="px-4 grid gap-3 sm:grid-cols-3 overflow-visible">
            <FormField label="Tipo">
              <Select
                value={device.productType}
                onValueChange={v => setDev({ productType: v, productBrand: "", productModel: "" })}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{DEVICE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Marca *" htmlFor="brand">
              <SuggestInput
                id="brand"
                value={device.productBrand}
                options={brandOptions}
                placeholder="Ex.: Samsung"
                onChange={v => setDev({ productBrand: v, productModel: "" })}
              />
            </FormField>
            <FormField label="Modelo *" htmlFor="model">
              <SuggestInput
                id="model"
                value={device.productModel}
                options={modelOptions}
                placeholder="Ex.: Galaxy A54"
                onChange={v => setDev({ productModel: v })}
              />
            </FormField>
            <FormField label="IMEI / Nº de série (opcional)" htmlFor="imei" className="sm:col-span-2">
              <Input
                id="imei"
                value={device.imei}
                className="font-mono"
                onChange={e => setDev({ imei: formatImeiInput(e.target.value) })}
              />
            </FormField>
            <FormField label="Serviço (opcional)">
              <Select
                value={device.serviceType || undefined}
                onValueChange={v => setDev({ serviceType: v })}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{SERVICE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Defeito relatado *" htmlFor="problem" className="sm:col-span-3">
              <Textarea
                id="problem"
                rows={3}
                value={device.problemDescription}
                onChange={e => setDev({ problemDescription: e.target.value })}
              />
            </FormField>
            <FormField label="Setor responsável (opcional)" className="sm:col-span-3">
              <Select
                value={device.departmentId || undefined}
                onValueChange={v => setDev({ departmentId: v })}
              >
                <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Padrão" /></SelectTrigger>
                <SelectContent>
                  {(departments.data ?? []).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">3. Checklist de entrada (opcional)</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <ChecklistField options={DEFAULT_CHECKLIST} value={checklist} onChange={setChecklist} />
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">4. Orçamento e prazo</CardTitle>
          </CardHeader>
          <CardContent className="px-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:items-end">
            <FormField label="Orçamento (R$) — opcional" htmlFor="est">
              <Input
                id="est"
                inputMode="numeric"
                placeholder="0,00"
                value={budget.estimatedCost}
                onChange={e => setBudget(b => ({ ...b, estimatedCost: formatMoneyInput(e.target.value) }))}
              />
            </FormField>
            <FormField label="Sinal (R$) — opcional" htmlFor="dep">
              <Input
                id="dep"
                inputMode="numeric"
                placeholder="0,00"
                value={budget.depositAmount}
                onChange={e => setBudget(b => ({ ...b, depositAmount: formatMoneyInput(e.target.value) }))}
              />
            </FormField>
            <FormField label="Garantia (dias) — opcional" htmlFor="war">
              <Input
                id="war"
                inputMode="numeric"
                value={budget.warrantyDays}
                onChange={e => setBudget(b => ({ ...b, warrantyDays: formatIntegerInput(e.target.value, 4) }))}
              />
            </FormField>
            <FormField label="Previsão — opcional" htmlFor="exp">
              <Input
                id="exp"
                type="datetime-local"
                value={budget.expectedAt}
                onChange={e => setBudget(b => ({ ...b, expectedAt: e.target.value }))}
              />
            </FormField>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setLocation("/dashboard/ordens")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!valid || create.isPending}>
            {create.isPending ? "Criando…" : "Criar ordem"}
          </Button>
        </div>
      </div>
    </form>
  );
}
