import { PortalResult } from "@/components/portal/PortalResult";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ZtsLogo } from "@/components/zts/ZtsLogo";
import { api } from "@/lib/api";
import { digitsOnly } from "@/lib/format";
import type { PortalLookup } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

const CLOSED_STATUSES = new Set(["delivered", "cancelled", "unrepairable"]);
const POLL_MS = 15_000;

type PortalSession = { orderNumber: string; phoneLast4: string };

function portalQueryKey(s: PortalSession) {
  return ["portal-lookup", s.orderNumber, s.phoneLast4] as const;
}

/** Portal público: cliente consulta a OS e acompanha atualizações em tempo quase real. */
export default function PortalPage() {
  const queryClient = useQueryClient();
  const [orderNumber, setOrderNumber] = useState("");
  const [last4, setLast4] = useState("");
  const [session, setSession] = useState<PortalSession | null>(null);

  const valid = orderNumber.trim().length > 0 && last4.length === 4;

  const lookup = useQuery({
    queryKey: session ? portalQueryKey(session) : ["portal-lookup", "idle"],
    queryFn: () => {
      if (!session) throw new Error("Sem sessão");
      return api.portalLookup({
        orderNumber: session.orderNumber,
        phoneLast4: session.phoneLast4,
      });
    },
    enabled: Boolean(session),
    refetchInterval: q => {
      const status = q.state.data?.status;
      if (status && CLOSED_STATUSES.has(status)) return false;
      return POLL_MS;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
    retry: 1,
  });

  const polling = useMemo(() => {
    const status = lookup.data?.status;
    return Boolean(session && status && !CLOSED_STATUSES.has(status));
  }, [session, lookup.data?.status]);

  const startLookup = () => {
    const next: PortalSession = {
      orderNumber: orderNumber.trim().replace(/^#/, "").toUpperCase(),
      phoneLast4: last4,
    };
    setSession(next);
    void queryClient.invalidateQueries({ queryKey: portalQueryKey(next) });
  };

  return (
    <div className="min-h-screen bg-[#1a1f26] zts-grid-bg flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl space-y-5">
        <div className="text-center text-slate-300 space-y-2.5">
          <ZtsLogo tone="light" subtitle="Assistência técnica" className="justify-center" />
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight text-balance">
            Acompanhe seu aparelho
          </h1>
          <p className="text-sm leading-relaxed text-slate-400 max-w-md mx-auto">
            Informe o número da ordem de serviço e os 4 últimos dígitos do telefone cadastrado
            para ver o andamento do reparo.
          </p>
          <Link
            href="/"
            className="inline-block text-xs text-slate-400 underline underline-offset-4 hover:text-white"
          >
            Voltar ao site
          </Link>
        </div>

        <div className="w-full rounded-md border border-white/10 bg-background overflow-hidden shadow-[0_24px_60px_-28px_rgba(0,0,0,0.65)]">
          <div className="bg-[#1a1f26] px-4 py-3.5 sm:px-5">
            <ZtsLogo tone="light" subtitle="Portal do cliente" />
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            <form
              className="space-y-3"
              onSubmit={e => {
                e.preventDefault();
                if (valid) startLookup();
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="portal-os" className="text-xs font-medium">
                    Nº da OS
                  </label>
                  <Input
                    id="portal-os"
                    placeholder="Ex.: K7M2X9PA"
                    value={orderNumber}
                    onChange={e => setOrderNumber(e.target.value.toUpperCase())}
                    autoComplete="off"
                    className="font-mono tracking-wide uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="portal-phone" className="text-xs font-medium">
                    Últimos 4 dígitos do telefone
                  </label>
                  <Input
                    id="portal-phone"
                    placeholder="0000"
                    value={last4}
                    maxLength={4}
                    inputMode="numeric"
                    className="font-mono tracking-[0.3em]"
                    onChange={e => setLast4(digitsOnly(e.target.value).slice(0, 4))}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={!valid || lookup.isFetching}>
                {lookup.isFetching && !lookup.data ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Consultar
              </Button>
            </form>

            {lookup.isError && session && (
              <div className="border border-destructive/30 bg-destructive/5 text-destructive text-xs rounded-md p-3">
                {(lookup.error as Error).message || "Não encontramos uma OS com estes dados."}
              </div>
            )}

            {lookup.data && session && (
              <>
                <div className="flex items-center justify-between gap-2 text-[0.6875rem] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <RefreshCw
                      className={`h-3 w-3 ${lookup.isFetching ? "animate-spin" : ""}`}
                    />
                    {polling
                      ? "Atualizando automaticamente a cada 15s"
                      : "Consulta finalizada — sem novas atualizações"}
                  </span>
                  {polling && (
                    <button
                      type="button"
                      className="underline underline-offset-2 hover:text-foreground"
                      disabled={lookup.isFetching}
                      onClick={() => void lookup.refetch()}
                    >
                      Atualizar agora
                    </button>
                  )}
                </div>
                <PortalResult
                  data={lookup.data}
                  phoneLast4={session.phoneLast4}
                  onUpdated={(next: PortalLookup) => {
                    queryClient.setQueryData(portalQueryKey(session), next);
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
