import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Faixa horizontal com setas inline (esquerda/direita) na mesma linha dos itens.
 */
export function ScrollRow({
  children,
  className,
  contentClassName,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(max > 2 && el.scrollLeft < max - 2);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update, children]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(160, el.clientWidth * 0.6), behavior: "smooth" });
  };

  return (
    <div className={cn("flex items-center gap-1 min-w-0", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-sm"
        disabled={!canLeft}
        aria-label="Anterior"
        onClick={() => scrollByDir(-1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div
        ref={ref}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto scrollbar-none scroll-smooth",
          contentClassName
        )}
      >
        {children}
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-sm"
        disabled={!canRight}
        aria-label="Próximo"
        onClick={() => scrollByDir(1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
