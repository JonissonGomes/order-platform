import type { StatusHistory } from "@/types";
import { CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusLabels: Record<string, string> = {
  pending: "Aguardando Avaliação",
  evaluating: "Em Avaliação",
  approved: "Aprovado",
  waiting_parts: "Aguardando Peças",
  in_repair: "Em Conserto",
  testing: "Em Teste",
  ready: "Pronto para Retirada",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

interface StatusTimelineProps {
  history: StatusHistory[];
}

export function StatusTimeline({ history }: StatusTimelineProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum histórico de status disponível
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((item, index) => (
        <div key={item.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={`p-2 rounded-full ${
              index === 0 ? "bg-blue-100" : "bg-gray-100"
            }`}>
              {index === 0 ? (
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
              ) : (
                <Clock className="h-4 w-4 text-gray-600" />
              )}
            </div>
            {index < history.length - 1 && (
              <div className="w-0.5 h-full bg-gray-200 mt-2" />
            )}
          </div>
          <div className="flex-1 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="font-medium">
                  {statusLabels[item.previousStatus]} → {statusLabels[item.newStatus]}
                </p>
                <p className="text-sm text-muted-foreground">
                  {item.changedByEmployee?.name || "Sistema"} ({item.employeeRole})
                </p>
                {item.departmentName && (
                  <p className="text-xs text-muted-foreground">
                    Departamento: {item.departmentName}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(item.changedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            {item.notes && (
              <div className="mt-2 p-2 bg-gray-50 rounded-md">
                <p className="text-sm text-muted-foreground">{item.notes}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
