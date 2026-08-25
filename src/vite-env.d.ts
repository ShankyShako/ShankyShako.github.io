/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Public HTTPS origin of the local chat gateway (bot/server.mjs), e.g.
   * `https://genovas-mbp.tail1234.ts.net`. Unset — the normal case for a
   * preview build — means the chat widget never renders and never makes a
   * request.
   */
  readonly VITE_BOT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
