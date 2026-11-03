/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_BUILD_VERSION?: string;
  readonly VITE_BASE_PATH?: string;
  readonly VITE_PRELAUNCH_PASSWORD?: string;
  readonly VITE_CARTO_API_KEY?: string;
  readonly VITE_SYKE_DEVELOPER_TEST_API_KEY?: string;
  readonly VITE_SYKE_DEVELOPER_PROD_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'mermaid/dist/mermaid.core.mjs' {
  import mermaid from 'mermaid';
  export default mermaid;
}