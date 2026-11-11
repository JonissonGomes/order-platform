import { ComponentType, lazy, LazyExoticComponent } from "react";

const RELOAD_KEY = "zts:lazy-chunk-reload";

/**
 * lazy() com 1 retry + reload único quando o Vite falha ao buscar o chunk
 * (HMR / optimizeDeps corrompido / hash antigo após deploy).
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem(RELOAD_KEY);
      return mod;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isChunkError =
        /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
          msg
        );

      if (isChunkError && !sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, "1");
        window.location.reload();
        return { default: (() => null) as unknown as T };
      }

      sessionStorage.removeItem(RELOAD_KEY);
      throw err;
    }
  });
}
