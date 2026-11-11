import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon: Icon = Inbox, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 border border-dashed rounded-md bg-card/50 py-10 px-6 text-center w-full">
      <Icon className="h-8 w-8 text-muted-foreground/60 shrink-0" />
      <p className="text-sm font-medium text-center w-full">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground max-w-sm text-center mx-auto">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="border border-destructive/30 bg-destructive/5 rounded-md p-4 text-sm flex items-center justify-between gap-4">
      <span className="text-destructive">{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="text-xs underline underline-offset-2">
          Tentar novamente
        </button>
      )}
    </div>
  );
}
