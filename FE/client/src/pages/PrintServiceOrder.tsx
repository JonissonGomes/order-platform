import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { api } from "@/lib/api";
import type { ServiceOrder } from "@/types";

// Termos de garantia padrão usados quando a OS não possui termos customizados
const DEFAULT_WARRANTY_TERMS = `1. O equipamento deve ser retirado em até 30 dias após a conclusão do serviço ou orçamento. Após esse prazo, será cobrada uma taxa de R$ 50,00 por mês referente a armazenamento. Equipamentos não retirados em até 90 dias serão considerados abandonados e poderão ser descartados.
2. Reparos de consoles e controles possuem 90 dias de garantia, válida apenas para o mesmo defeito relatado, com lacre intacto e sem sinais de mau uso.
3. Serviços como limpeza, desoxidação, troca de conectores, desbloqueio, formatação ou relacionados a software não possuem garantia.
4. A empresa não se responsabiliza pela perda de arquivos (jogos, fotos, vídeos, aplicativos, etc.). Recomendamos que o cliente realize backup antes da entrega do equipamento.
5. Em casos em que o orçamento não for aprovado pelo cliente, será cobrada uma taxa referente ao custo operacional do diagnóstico técnico.
6. Produtos vendidos pela empresa têm garantia de 90 dias, conforme o Código de Defesa do Consumidor.`;

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const response = await api.getServiceOrder(params.id);
        setOrder(response.order);
      } catch (err: any) {
        setError(err.message || "Erro ao carregar ordem de serviço");
      } finally {
        setLoading(false);
      }
    };
    if (params.id) loadOrder();
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

  const totalServices = order.serviceItems?.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) ?? 0;
  const finalTotal = order.finalCost ?? totalServices;
  const warrantyTerms = order.warrantyTerms || DEFAULT_WARRANTY_TERMS;

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

        {/* Cabeçalho da empresa */}
        <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
          <h1 className="text-2xl font-bold uppercase tracking-wide">{import.meta.env.VITE_COMPANY_NAME || "Sistema de OS"}</h1>
          {import.meta.env.VITE_COMPANY_CNPJ && (
            <p className="text-xs text-gray-600">CNPJ: {import.meta.env.VITE_COMPANY_CNPJ}</p>
          )}
          {import.meta.env.VITE_COMPANY_ADDRESS && (
            <p className="text-xs text-gray-600">{import.meta.env.VITE_COMPANY_ADDRESS}</p>
          )}
          {import.meta.env.VITE_COMPANY_PHONE && (
            <p className="text-xs text-gray-600">{import.meta.env.VITE_COMPANY_PHONE}</p>
          )}
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
                <td className="border border-gray-300 px-2 py-1 font-semibold">{order.customer?.name ?? "-"}</td>
                <td className="border border-gray-300 px-2 py-1 w-28 font-medium">CPF:</td>
                <td className="border border-gray-300 px-2 py-1">{order.customer?.cpf ?? "-"}</td>
              </tr>
              {order.customer?.address && (
                <>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 font-medium">Endereço:</td>
                    <td className="border border-gray-300 px-2 py-1" colSpan={2}>
                      {order.customer.address.street}, {order.customer.address.number}
                      {order.customer.address.complement && ` (${order.customer.address.complement})`}
                      {" - "}{order.customer.address.neighborhood}
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      CEP: {order.customer.address.zipCode}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 font-medium">Cidade:</td>
                    <td className="border border-gray-300 px-2 py-1">{order.customer.address.city}</td>
                    <td className="border border-gray-300 px-2 py-1 font-medium">Estado:</td>
                    <td className="border border-gray-300 px-2 py-1">{order.customer.address.state}</td>
                  </tr>
                </>
              )}
              <tr>
                <td className="border border-gray-300 px-2 py-1 font-medium">Telefone:</td>
                <td className="border border-gray-300 px-2 py-1">{order.customer?.phone ?? "-"}</td>
                <td className="border border-gray-300 px-2 py-1 font-medium">E-mail:</td>
                <td className="border border-gray-300 px-2 py-1">{order.customer?.email ?? "-"}</td>
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
            <div className="text-right text-sm font-bold mt-1 pr-1">
              SERVIÇOS: {formatCurrency(totalServices)}
            </div>
            <div className="text-right text-base font-bold pr-1">
              TOTAL: {formatCurrency(finalTotal)}
            </div>
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
                  <td className="border border-gray-300 px-2 py-1">{formatCurrency(order.delivery.cost)}</td>
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
