import { StatusBadge } from "@/components/zts/StatusBadge";
import { formatDate, formatDateTime } from "@/lib/format";
import { statusLabel } from "@/lib/orderStatus";
import type { PortalLookup } from "@/types";
import { CalendarClock, MessageSquare, Smartphone, Wrench } from "lucide-react";

export function PortalResult({ data }: { data: PortalLookup }) {
  // O backend devolve a linha do tempo em ordem cronológica; exibimos a mais recente primeiro
  const timeline = [...(data.timeline ?? [])].reverse();
  const messages = data.messages ?? [];

  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-md p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="zts-eyebrow">{data.orderNumber}</span>
          <StatusBadge status={data.status} />
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Smartphone className="h-4 w-4 text-muted-foreground" />
          {data.device}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-card border rounded-md p-3">
          <CalendarClock className="h-4 w-4 text-muted-foreground mb-1" />
          <p className="zts-eyebrow">Previsão</p>
          <p className="text-sm font-medium">{formatDate(data.expectedAt)}</p>
        </div>
        <div className="bg-card border rounded-md p-3">
          <Wrench className="h-4 w-4 text-muted-foreground mb-1" />
          <p className="zts-eyebrow">Serviço</p>
          <p className="text-sm font-medium">{data.serviceType || "—"}</p>
        </div>
      </div>

      <section>
        <h3 className="zts-eyebrow mb-2">Andamento</h3>
        {timeline.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem atualizações ainda.</p>
        ) : (
          <ol className="border-l ml-1 pl-4 space-y-3">
            {timeline.map((t, i) => (
              <li key={`${t.at}-${i}`} className="relative">
                <span className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-[1px] ${i === 0 ? "bg-primary" : "bg-border"}`} />
                <p className="text-sm font-medium">{t.statusLabel ?? statusLabel(t.status)}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(t.at)}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {messages.length > 0 && (
        <section>
          <h3 className="zts-eyebrow mb-2 flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> Mensagens da loja
          </h3>
          <ul className="space-y-2">
            {messages.map((m, i) => (
              <li key={i} className="bg-card border rounded-md p-2.5 text-sm">
                <p>{m.content}</p>
                <p className="text-[0.6875rem] text-muted-foreground mt-1">{formatDateTime(m.createdAt)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-[0.6875rem] text-muted-foreground text-center">
        Atualizado em {formatDateTime(data.updatedAt)}
      </p>
    </div>
  );
}
