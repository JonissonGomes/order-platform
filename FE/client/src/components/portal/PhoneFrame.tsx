import type { ReactNode } from "react";

/** Moldura de aparelho (mock) para o portal do cliente. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[340px] rounded-[1.5rem] border-[10px] border-[#1a1f26] bg-[#1a1f26] shadow-[0_24px_60px_-20px_rgba(26,31,38,0.55)]">
      <div className="absolute left-1/2 top-0 z-10 h-4 w-24 -translate-x-1/2 rounded-b-md bg-[#1a1f26]" aria-hidden />
      <div className="h-[600px] overflow-y-auto rounded-[0.9rem] bg-background">{children}</div>
    </div>
  );
}
