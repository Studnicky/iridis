import { rehypeHighlight as rehypeHighlightUniversal } from "./rehype.js";
import { useRuntimeConfig } from "#imports";
class HighlighterError extends Error {
  constructor(message, httpStatus) {
    super(message);
    this.httpStatus = httpStatus;
    this.name = "HighlighterError";
  }
}
function isHighlightResult(res) {
  if (!res) return false;
  return "tree" in res;
}
const defaults = {
  theme: {},
  async highlighter(code, lang, theme, options) {
    try {
      if (import.meta.client && window.sessionStorage.getItem("mdc-shiki-highlighter") === "browser") {
        return import("#mdc-highlighter").then((h) => h.default(code, lang, theme, options)).catch(() => ({}));
      }
      if (import.meta.client) {
        const highlight = useRuntimeConfig().public.mdc.highlight;
        if (highlight === false) {
          return Promise.resolve({ tree: [{ type: "text", value: code }], className: "", style: "" });
        }
        if (highlight?.noApiRoute === true) {
          return import("#mdc-highlighter").then((h) => h.default(code, lang, theme, options)).catch(() => ({}));
        }
      }
      const result = await $fetch("/api/_mdc/highlight", {
        params: {
          code,
          lang,
          theme: JSON.stringify(theme),
          options: JSON.stringify(options)
        }
      });
      if (!isHighlightResult(result)) {
        throw new HighlighterError(`result:${result}`);
      }
      return result;
    } catch (e) {
      if (import.meta.client && (e?.response?.status > 399 || e?.name == "HighlighterError")) {
        window.sessionStorage.setItem("mdc-shiki-highlighter", "browser");
        return this.highlighter?.(code, lang, theme, options);
      }
    }
    return Promise.resolve({ tree: [{ type: "text", value: code }], className: "", style: "" });
  }
};
export default rehypeHighlight;
export function rehypeHighlight(opts = {}) {
  const options = { ...defaults, ...opts };
  if (typeof options.highlighter !== "function") {
    options.highlighter = defaults.highlighter;
  }
  return rehypeHighlightUniversal(options);
}
