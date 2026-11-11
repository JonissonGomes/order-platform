import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Limita a largura do conteúdo do painel (evita esticar em monitores 21:9)
 * e padroniza o espaçamento mobile/desktop.
 */
export function PageShell({
  children,
  className,
  narrow,
}: {
  children: ReactNode;
  className?: string;
  /** Formulários / agenda: coluna mais estreita */
  narrow?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        /* 60rem ≈ formulários densos; 72rem ≈ listas/tabelas sem “vazar” em ultrawide */
        narrow ? "max-w-[40rem]" : "max-w-[72rem]",
        className
      )}
    >
      {children}
    </div>
  );
}
