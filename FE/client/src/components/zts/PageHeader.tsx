import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageHeaderProps {
  /** @deprecated Título fica no header do layout — mantido só por compat. */
  title?: string;
  /** @deprecated */
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/** Barra de ações da página (sem título — o layout já mostra o módulo ativo). */
export function PageHeader({ actions, className }: PageHeaderProps) {
  if (!actions) return null;
  return (
    <div className={cn("flex items-center justify-end gap-2 mb-4", className)}>
      <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:flex-wrap sm:items-center [&_button]:w-full sm:[&_button]:w-auto">
        {actions}
      </div>
    </div>
  );
}
