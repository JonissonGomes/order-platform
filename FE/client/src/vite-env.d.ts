/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly ZTS_API_BASE_URL?: string;
  readonly ZTS_GOOGLE_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
