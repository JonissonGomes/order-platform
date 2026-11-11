import { PortalResult } from "@/components/portal/PortalResult";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ZtsLogo } from "@/components/zts/ZtsLogo";
import { api } from "@/lib/api";
import { digitsOnly } from "@/lib/format";
import type { PortalLookup } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

/** Portal público: cliente consulta a OS informando o número e os 4 últimos dígitos do telefone. */
export default function PortalPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [last4, setLast4] = useState("");
  const [result, setResult] = useState<PortalLookup | null>(null);

  const lookup = useMutation({
    mutationFn: () =>
      api.portalLookup({ orderNumber: orderNumber.trim().replace(/^#/, ""), phoneLast4: last4 }),
    onSuccess: data => setResult(data),
    onError: () => setResult(null),
  });

  const valid = orderNumber.trim().length > 0 && last4.length === 4;

  return (
    <div className="min-h-screen bg-[#1a1f26] zts-grid-bg flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-3xl grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-center lg:gap-10">
        <div className="text-center lg:text-left text-slate-300 space-y-3">
          <ZtsLogo
            tone="light"
            subtitle="Assistência técnica"
            className="justify-center lg:justify-start"
          />
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight text-balance">
            Acompanhe seu aparelho
          </h1>
          <p className="text-sm leading-relaxed text-slate-400 max-w-md mx-auto lg:mx-0">
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

        <div className="w-full max-w-sm mx-auto lg:max-w-none lg:mx-0 rounded-md border border-white/10 bg-background overflow-hidden shadow-[0_24px_60px_-28px_rgba(0,0,0,0.65)]">
          <div className="bg-[#1a1f26] px-4 py-3.5">
            <ZtsLogo tone="light" subtitle="Portal do cliente" />
          </div>

          <div className="p-4 space-y-4">
            <form
              className="space-y-3"
              onSubmit={e => {
                e.preventDefault();
                if (valid) lookup.mutate();
              }}
            >
              <div className="space-y-1.5">
                <label htmlFor="portal-os" className="text-xs font-medium">
                  Nº da OS
                </label>
                <Input
                  id="portal-os"
                  placeholder="Ex.: 1042"
                  value={orderNumber}
                  onChange={e => setOrderNumber(e.target.value)}
                  inputMode="numeric"
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
              <Button type="submit" className="w-full" disabled={!valid || lookup.isPending}>
                {lookup.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Consultar
              </Button>
            </form>

            {lookup.isError && (
              <div className="border border-destructive/30 bg-destructive/5 text-destructive text-xs rounded-md p-3">
                {lookup.error.message || "Não encontramos uma OS com estes dados."}
              </div>
            )}

            {result && (
              <PortalResult data={result} phoneLast4={last4} onUpdated={setResult} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
