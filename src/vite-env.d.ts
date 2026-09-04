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

/**
 * plane-send.js — the paper-plane micro-interaction, vendored verbatim in
 * public/ and loaded by a classic <script defer> in index.html. It is a global,
 * not a module, and it is optional: if the file fails to load, every consumer
 * has to keep working without it.
 */
type PlaneSendOptions = {
  triggers?: string;
  directTriggers?: string;
  bindTriggers?: boolean;
  bubble?: string;
  card?: string;
  sendButton?: string | null;
  closeButton?: string | null;
  staggerSelector?: string;
  accent?: string;
  trailColor?: string;
  planeSize?: number;
  exitAt?: number;
  timeScale?: number;
  trail?: boolean;
  zIndex?: number;
  onSend?: (() => void) | null;
};

type PlaneSendEngine = {
  /** Only set once the engine found its targets and built its layers. */
  plane?: SVGSVGElement;
  /** Live options bag — the engine reads most of these at animation time. */
  o: PlaneSendOptions;
  send: () => void;
  reset: () => void;
  closeCard: (then?: () => void) => void;
  destroy: () => void;
};

interface Window {
  PlaneSend?: { init: (opts: PlaneSendOptions) => PlaneSendEngine | undefined };
}
