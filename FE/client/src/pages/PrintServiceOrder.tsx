import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { api } from "@/lib/api";
import type { Customer, ServiceOrder, Settings } from "@/types";

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value?: number) {
  if (!value) return "R$ 0,00";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PrintServiceOrder() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [orderRes, settingsRes] = await Promise.all([
          api.getServiceOrder(params.id),
          api.getSettings().catch(() => ({ settings: null })),
        ]);
        const loadedOrder = orderRes.order;
        setOrder(loadedOrder);
        if (settingsRes.settings) setSettings(settingsRes.settings);

        // If customer is not populated in the order, fetch separately
        if (!loadedOrder.customer && loadedOrder.customerId) {
          try {
            const customerRes = await api.getCustomer(loadedOrder.customerId);
            setCustomer(customerRes.customer);
          } catch {
            // ignore customer fetch error
          }
        }
      } catch (err: any) {
        setError(err.message || "Erro ao carregar ordem de serviço");
      } finally {
        setLoading(false);
      }
    };
    if (params.id) loadData();
  }, [params.id]);

  useEffect(() => {
    if (order) {
      document.title = `OS #${order.orderNumber}`;
    }
  }, [order]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Carregando ordem de serviço...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">{error || "Ordem de serviço não encontrada"}</p>
      </div>
    );
  }

  // Use customer from order.customer or separately fetched
  const displayCustomer = order.customer ?? customer;

  const totalServices = order.serviceItems?.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) ?? 0;
  const finalTotal = order.finalCost ?? totalServices;
  // Warranty terms: order-specific > global settings > empty
  const warrantyTerms = order.warrantyTerms || settings?.defaultWarrantyTerms || "";

  return (
    <>
      {/* Botão de impressão — não aparece ao imprimir */}
      <div className="print:hidden fixed top-4 right-4 flex gap-2 z-50">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 text-sm font-medium"
        >
          🖨️ Imprimir
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded shadow hover:bg-gray-300 text-sm font-medium"
        >
          ✕ Fechar
        </button>
      </div>

      <div className="max-w-[800px] mx-auto p-6 print:p-0 print:max-w-none font-sans text-sm text-gray-900">

        {/* Cabeçalho da empresa com logo */}
        <div className="mb-6 border-b-2 border-gray-800 pb-4">
          <div className="flex items-start gap-4">
            {/* Logo - à esquerda */}
            <div className="flex-shrink-0">
              {(settings?.companyLogo || import.meta.env.VITE_COMPANY_LOGO) ? (
                <div>
                  <img
                    src={settings?.companyLogo || import.meta.env.VITE_COMPANY_LOGO}
                    alt="Logo"
                    className="h-20 w-20 object-contain print:h-20 print:w-20"
                  />
                  {/* Texto DOUTOR GAME abaixo do logo */}
                  <div className="mt-2 text-center">
                    <div className="text-[10px] font-bold text-yellow-500 leading-tight" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                      <div>DOUTOR</div>
                      <div>GAME</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="h-20 w-20 flex items-center justify-center bg-gradient-to-b from-pink-400 via-pink-500 to-purple-600 rounded-full relative print:h-20 print:w-20" style={{ background: 'linear-gradient(to bottom, #f472b6, #ec4899, #9333ea)' }}>
                    {/* Decorative stars and plus signs */}
                    <div className="absolute top-1 right-2 text-yellow-300 text-[8px]">★</div>
                    <div className="absolute bottom-2 left-1 text-yellow-300 text-[8px]">+</div>
                    <div className="absolute top-3 left-2 text-pink-200 text-[8px]">+</div>
                    <div className="absolute bottom-1 right-3 text-pink-200 text-[8px]">★</div>
                    
                    {/* D-pad icon - centered */}
                    <div className="relative w-10 h-10">
                      {/* Up arrow */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[7px] border-b-purple-900"></div>
                      {/* Down arrow */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-t-purple-900"></div>
                      {/* Left arrow */}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-b-[5px] border-r-[7px] border-r-purple-900"></div>
                      {/* Right arrow */}
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-b-[5px] border-l-[7px] border-l-purple-900"></div>
                      {/* Center button */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-purple-300 rounded-full"></div>
                    </div>
                    
                    {/* Registered trademark */}
                    <span className="absolute top-0 right-1 text-[7px] text-black font-bold">®</span>
                  </div>
                  {/* Texto DOUTOR GAME abaixo do logo */}
                  <div className="mt-2 text-center">
                    <div className="text-[10px] font-bold text-yellow-500 leading-tight" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3), 0 0 2px rgba(255,215,0,0.5)' }}>
                      <div>DOUTOR</div>
                      <div>GAME</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Informações da empresa - à direita */}
            <div className="flex-1">
              <h1 className="text-xl font-bold uppercase tracking-wide mb-2">
                {settings?.companyName || import.meta.env.VITE_COMPANY_NAME || "Doutor Game"}
              </h1>
              {(settings?.companyCNPJ || import.meta.env.VITE_COMPANY_CNPJ) && (
                <p className="text-xs text-gray-600 mb-1">CNPJ: {settings?.companyCNPJ || import.meta.env.VITE_COMPANY_CNPJ}</p>
              )}
              {(settings?.companyAddress || import.meta.env.VITE_COMPANY_ADDRESS) && (
                <p className="text-xs text-gray-600 mb-1">
                  {settings?.companyAddress
                    ? `${settings.companyAddress.street}, ${settings.companyAddress.number}${settings.companyAddress.complement ? ` (${settings.companyAddress.complement})` : ""} - ${settings.companyAddress.neighborhood || ""}`
                    : import.meta.env.VITE_COMPANY_ADDRESS}
                </p>
              )}
              {(settings?.companyAddress || import.meta.env.VITE_COMPANY_ADDRESS) && (
                <p className="text-xs text-gray-600 mb-1">
                  {settings?.companyAddress
                    ? `${settings.companyAddress.city}/${settings.companyAddress.state} - CEP: ${settings.companyAddress.zipCode || ""}`
                    : ""}
                </p>
              )}
            </div>

            {/* Informações de contato e responsáveis - à direita */}
            <div className="text-right text-xs text-gray-600 flex-shrink-0">
              {(settings?.companyPhone || import.meta.env.VITE_COMPANY_PHONE) && (
                <p className="mb-1">{settings?.companyPhone || import.meta.env.VITE_COMPANY_PHONE}</p>
              )}
              {(settings?.companyEmail || import.meta.env.VITE_COMPANY_EMAIL) && (
                <p className="mb-1">{settings?.companyEmail || import.meta.env.VITE_COMPANY_EMAIL}</p>
              )}
              {(settings?.companyWebsite || import.meta.env.VITE_COMPANY_WEBSITE) && (
                <p className="mb-1">{settings?.companyWebsite || import.meta.env.VITE_COMPANY_WEBSITE}</p>
              )}
              {(settings?.responsiblePerson || import.meta.env.VITE_RESPONSIBLE_PERSON) && (
                <p className="mb-1">Responsável: {settings?.responsiblePerson || import.meta.env.VITE_RESPONSIBLE_PERSON}</p>
              )}
              {(settings?.technicalContact || import.meta.env.VITE_TECHNICAL_CONTACT) && (
                <p>Técnico: {settings?.technicalContact || import.meta.env.VITE_TECHNICAL_CONTACT}</p>
              )}
            </div>
          </div>
        </div>

        {/* Título e número da OS */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold">ORDEM DE SERVIÇO N° {order.orderNumber}</h2>
          <p className="text-xs text-gray-600">{formatDate(order.entryDate ?? order.createdAt)}</p>
        </div>

        {/* Período de execução */}
        <table className="w-full border-collapse border border-gray-400 mb-4 text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-2 py-1 text-center" colSpan={2}>
                PERÍODO DE EXECUÇÃO
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-400 px-2 py-1 text-center">
                <strong>Entrada:</strong> {formatDate(order.entryDate ?? order.createdAt)}
              </td>
              <td className="border border-gray-400 px-2 py-1 text-center">
                <strong>Saída:</strong> {order.exitDate ? formatDate(order.exitDate) : "-"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Dados do cliente */}
        <div className="mb-4">
          <h3 className="font-bold text-xs uppercase bg-gray-200 px-2 py-1 border border-gray-400">DADOS DO CLIENTE</h3>
          <table className="w-full border-collapse text-xs">
            <tbody>
              <tr>
                <td className="border border-gray-300 px-2 py-1 w-20 font-medium">Cliente:</td>
                <td className="border border-gray-300 px-2 py-1 font-semibold">{displayCustomer?.name ?? "-"}</td>
                <td className="border border-gray-300 px-2 py-1 w-28 font-medium">CPF:</td>
                <td className="border border-gray-300 px-2 py-1">{displayCustomer?.cpf ?? "-"}</td>
              </tr>
              {displayCustomer?.address && (
                <>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 font-medium">Endereço:</td>
                    <td className="border border-gray-300 px-2 py-1" colSpan={2}>
                      {displayCustomer.address.street}, {displayCustomer.address.number}
                      {displayCustomer.address.complement && ` (${displayCustomer.address.complement})`}
                      {" - "}{displayCustomer.address.neighborhood}
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      CEP: {displayCustomer.address.zipCode}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 font-medium">Cidade:</td>
                    <td className="border border-gray-300 px-2 py-1">{displayCustomer.address.city}</td>
                    <td className="border border-gray-300 px-2 py-1 font-medium">Estado:</td>
                    <td className="border border-gray-300 px-2 py-1">{displayCustomer.address.state}</td>
                  </tr>
                </>
              )}
              <tr>
                <td className="border border-gray-300 px-2 py-1 font-medium">Telefone:</td>
                <td className="border border-gray-300 px-2 py-1">{displayCustomer?.phone ?? "-"}</td>
                <td className="border border-gray-300 px-2 py-1 font-medium">E-mail:</td>
                <td className="border border-gray-300 px-2 py-1">{displayCustomer?.email ?? "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Equipamento */}
        <div className="mb-4">
          <h3 className="font-bold text-xs uppercase bg-gray-200 px-2 py-1 border border-gray-400">EQUIPAMENTO</h3>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-2 py-1">Nome do equipamento</th>
                <th className="border border-gray-300 px-2 py-1">Marca</th>
                <th className="border border-gray-300 px-2 py-1">Modelo</th>
                <th className="border border-gray-300 px-2 py-1">Série</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-2 py-1">{order.productType}</td>
                <td className="border border-gray-300 px-2 py-1">{order.productBrand}</td>
                <td className="border border-gray-300 px-2 py-1">{order.productModel}</td>
                <td className="border border-gray-300 px-2 py-1">{order.serialNumber ?? "-"}</td>
              </tr>
              {order.aestheticConditions && (
                <tr>
                  <td className="border border-gray-300 px-2 py-1 font-medium">Condições:</td>
                  <td className="border border-gray-300 px-2 py-1 whitespace-pre-wrap" colSpan={3}>
                    {order.aestheticConditions}
                  </td>
                </tr>
              )}
              <tr>
                <td className="border border-gray-300 px-2 py-1 font-medium">Defeitos:</td>
                <td className="border border-gray-300 px-2 py-1 whitespace-pre-wrap" colSpan={3}>
                  {order.problemDescription}
                </td>
              </tr>
              {order.solution && (
                <tr>
                  <td className="border border-gray-300 px-2 py-1 font-medium">Solução:</td>
                  <td className="border border-gray-300 px-2 py-1 whitespace-pre-wrap" colSpan={3}>
                    {order.solution}
                  </td>
                </tr>
              )}
              {order.technicalReport && (
                <tr>
                  <td className="border border-gray-300 px-2 py-1 font-medium">Laudo técnico:</td>
                  <td className="border border-gray-300 px-2 py-1 whitespace-pre-wrap" colSpan={3}>
                    {order.technicalReport}
                  </td>
                </tr>
              )}
              <tr>
                <td className="border border-gray-300 px-2 py-1 font-medium align-top">Termos de garantia:</td>
                <td className="border border-gray-300 px-2 py-1 whitespace-pre-wrap" colSpan={3}>
                  {warrantyTerms}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Serviços */}
        {order.serviceItems && order.serviceItems.length > 0 && (
          <div className="mb-4">
            <h3 className="font-bold text-xs uppercase bg-gray-200 px-2 py-1 border border-gray-400">SERVIÇOS</h3>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-2 py-1 text-left">Nome</th>
                  <th className="border border-gray-300 px-2 py-1 w-16 text-center">Qtd.</th>
                  <th className="border border-gray-300 px-2 py-1 w-28 text-right">Valor Unit.</th>
                  <th className="border border-gray-300 px-2 py-1 w-28 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.serviceItems.map((item, i) => (
                  <tr key={i}>
                    <td className="border border-gray-300 px-2 py-1">{item.name}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{item.quantity.toFixed(2)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(item.quantity * item.unitPrice)}</td>
                  </tr>
                ))}
                <tr className="font-bold bg-gray-50">
                  <td className="border border-gray-300 px-2 py-1 text-right" colSpan={3}>TOTAL</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(totalServices)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Entrega */}
        {order.delivery && order.delivery.type !== "none" && (
          <div className="mb-4">
            <h3 className="font-bold text-xs uppercase bg-gray-200 px-2 py-1 border border-gray-400">ENTREGA</h3>
            <table className="w-full border-collapse text-xs">
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-2 py-1 font-medium w-32">Tipo:</td>
                  <td className="border border-gray-300 px-2 py-1">
                    {order.delivery.type === "own" ? "Entrega própria" : "Serviço terceirizado"}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 font-medium w-32">Custo:</td>
                  <td className="border border-gray-300 px-2 py-1">{formatCurrency(order.delivery.cost || 0)}</td>
                </tr>
                {order.delivery.distanceKm != null && order.delivery.distanceKm > 0 && (
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 font-medium">Distância:</td>
                    <td className="border border-gray-300 px-2 py-1" colSpan={3}>
                      {order.delivery.distanceKm} km
                    </td>
                  </tr>
                )}
                {order.delivery.address && (
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 font-medium">Endereço:</td>
                    <td className="border border-gray-300 px-2 py-1" colSpan={3}>
                      {order.delivery.address.street}, {order.delivery.address.number}
                      {" - "}{order.delivery.address.neighborhood}, {order.delivery.address.city}/{order.delivery.address.state}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Dados do pagamento */}
        {order.payment?.method && (
          <div className="mb-4">
            <h3 className="font-bold text-xs uppercase bg-gray-200 px-2 py-1 border border-gray-400">DADOS DO PAGAMENTO</h3>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-2 py-1">Vencimento</th>
                  <th className="border border-gray-300 px-2 py-1">Valor</th>
                  <th className="border border-gray-300 px-2 py-1">Forma de Pagamento</th>
                  <th className="border border-gray-300 px-2 py-1">Observação</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    {order.payment.dueDate ? new Date(order.payment.dueDate).toLocaleDateString("pt-BR") : "-"}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{formatCurrency(finalTotal)}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center uppercase">{order.payment.method}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{order.payment.observation ?? "-"}</td>
                </tr>
              </tbody>
            </table>
            {/* Valores de serviços e total abaixo do bloco de pagamento */}
            {order.serviceItems && order.serviceItems.length > 0 && (
              <div className="mt-2 text-right">
                <div className="text-sm font-bold pr-1">
                  SERVIÇOS: {formatCurrency(totalServices)}
                </div>
                <div className="text-base font-bold pr-1">
                  TOTAL: {formatCurrency(finalTotal)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Observações */}
        {order.observations && (
          <div className="mb-4">
            <h3 className="font-bold text-xs uppercase bg-gray-200 px-2 py-1 border border-gray-400">OBSERVAÇÕES</h3>
            <div className="border border-gray-300 px-2 py-2 text-xs whitespace-pre-wrap min-h-[40px]">
              {order.observations}
            </div>
          </div>
        )}

        {/* Assinaturas */}
        <div className="mt-8 print:mt-12">
          <table className="w-full border-collapse text-xs">
            <tbody>
              <tr>
                <td className="px-4 py-8 text-center border-t border-gray-400 w-1/2">
                  <div className="border-t border-gray-600 pt-2 mx-8">Assinatura do cliente</div>
                </td>
                <td className="px-4 py-8 text-center border-t border-gray-400 w-1/2">
                  <div className="border-t border-gray-600 pt-2 mx-8">
                    Assinatura do técnico
                    {order.assignedEmployee && (
                      <div className="text-xs text-gray-500 mt-1">{order.assignedEmployee.name}</div>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Rodapé */}
        <div className="text-center mt-4 text-xs text-gray-400 border-t pt-2 print:mt-4">
          Ordem de serviço emitida via sistema de OS
        </div>
      </div>

      <style>{`
        @media print {
          body { margin: 0; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </>
  );
}
