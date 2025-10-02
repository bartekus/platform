/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_DOMAIN?: string;
  readonly VITE_LOGTO_APP_ID?: string;
  readonly VITE_LOGTO_DOMAIN?: string;
  readonly VITE_WEB_DOMAIN?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
