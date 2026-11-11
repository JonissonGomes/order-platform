import { ChecklistField } from "@/components/orders/ChecklistField";
import {
  CustomerPicker,
  EMPTY_NEW_CUSTOMER,
  type CustomerValue,
} from "@/components/orders/CustomerPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/zts/FormField";
import { PageHeader } from "@/components/zts/PageHeader";
import { qk, useDepartments } from "@/hooks/queries";
import { api } from "@/lib/api";
import { digitsOnly, parseMoney } from "@/lib/format";
import { DEFAULT_CHECKLIST, DEVICE_TYPES, SERVICE_TYPES } from "@/lib/orderStatus";
import type { CreateServiceOrderRequest } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function OrderNew() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const departments = useDepartments();

  const [customer, setCustomer] = useState<CustomerValue>({ mode: "existing", id: "" });
  const [device, setDevice] = useState({
    productType: "Smartphone", productBrand: "", productModel: "", imei: "",
    serviceType: "", problemDescription: "", departmentId: "",
  });
  const [checklist, setChecklist] = useState<string[]>([]);
  const [budget, setBudget] = useState({ estimatedCost: "", depositAmount: "", warrantyDays: "90", expectedAt: "" });

  const setDev = (patch: Partial<typeof device>) => setDevice(d => ({ ...d, ...patch }));

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
      className="max-w-4xl mx-auto"
      onSubmit={e => {
        e.preventDefault();
        if (valid) create.mutate();
      }}
    >
      <PageHeader title="Nova ordem de serviço" description="Cadastre cliente, aparelho, checklist e orçamento." />

      <div className="space-y-4">
        <Card className="gap-3 py-4">
          <CardHeader className="px-4"><CardTitle className="text-sm">1. Cliente</CardTitle></CardHeader>
          <CardContent className="px-4"><CustomerPicker value={customer} onChange={setCustomer} /></CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardHeader className="px-4"><CardTitle className="text-sm">2. Aparelho e defeito</CardTitle></CardHeader>
          <CardContent className="px-4 grid gap-3 sm:grid-cols-3">
            <FormField label="Tipo">
              <Select value={device.productType} onValueChange={v => setDev({ productType: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{DEVICE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Marca *" htmlFor="brand">
              <Input id="brand" value={device.productBrand} onChange={e => setDev({ productBrand: e.target.value })} />
            </FormField>
            <FormField label="Modelo *" htmlFor="model">
              <Input id="model" value={device.productModel} onChange={e => setDev({ productModel: e.target.value })} />
            </FormField>
            <FormField label="IMEI / Nº de série" htmlFor="imei" className="sm:col-span-2">
              <Input id="imei" value={device.imei} className="font-mono"
                onChange={e => setDev({ imei: e.target.value })} />
            </FormField>
            <FormField label="Serviço">
              <Select value={device.serviceType} onValueChange={v => setDev({ serviceType: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{SERVICE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Defeito relatado *" htmlFor="problem" className="sm:col-span-3">
              <Textarea id="problem" rows={3} value={device.problemDescription}
                onChange={e => setDev({ problemDescription: e.target.value })} />
            </FormField>
            <FormField label="Setor responsável" className="sm:col-span-3">
              <Select value={device.departmentId} onValueChange={v => setDev({ departmentId: v })}>
                <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Padrão" /></SelectTrigger>
                <SelectContent>
                  {(departments.data ?? []).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardHeader className="px-4"><CardTitle className="text-sm">3. Checklist de entrada</CardTitle></CardHeader>
          <CardContent className="px-4"><ChecklistField options={DEFAULT_CHECKLIST} value={checklist} onChange={setChecklist} /></CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardHeader className="px-4"><CardTitle className="text-sm">4. Orçamento e prazo</CardTitle></CardHeader>
          <CardContent className="px-4 grid gap-3 sm:grid-cols-4">
            <FormField label="Orçamento (R$)" htmlFor="est">
              <Input id="est" inputMode="decimal" placeholder="0,00" value={budget.estimatedCost}
                onChange={e => setBudget(b => ({ ...b, estimatedCost: e.target.value }))} />
            </FormField>
            <FormField label="Sinal (R$)" htmlFor="dep">
              <Input id="dep" inputMode="decimal" placeholder="0,00" value={budget.depositAmount}
                onChange={e => setBudget(b => ({ ...b, depositAmount: e.target.value }))} />
            </FormField>
            <FormField label="Garantia (dias)" htmlFor="war">
              <Input id="war" inputMode="numeric" value={budget.warrantyDays}
                onChange={e => setBudget(b => ({ ...b, warrantyDays: e.target.value }))} />
            </FormField>
            <FormField label="Previsão de entrega" htmlFor="exp">
              <Input id="exp" type="datetime-local" value={budget.expectedAt}
                onChange={e => setBudget(b => ({ ...b, expectedAt: e.target.value }))} />
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
