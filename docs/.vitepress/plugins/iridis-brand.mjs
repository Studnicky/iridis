// Markdown-it plugin: wrap every literal 'iridis' (case-sensitive,
// word-bounded) in a <span class="iridis-brand"> so the spectrum gradient
// renders. Skips code spans and code blocks because those are separate
// token types (code_inline, code_block, fence) — we touch only `text`
// tokens inside `inline` containers, AND now also inside heading_open /
// heading_close blocks (h1/h2/h3 etc.).
//
// The corresponding CSS in palette.css applies the static spectrum
// gradient. The navbar siteTitle and any other static-Vue-rendered
// "iridis" gets the same treatment via a sitewide CSS rule that targets
// the literal element text — see base.css `.VPNavBarTitle .title`.

const PATTERN = /\biridis\b/g;

export function iridisBrandPlugin(md) {
  md.core.ruler.after('inline', 'iridis-brand', (state) => {
    for (const block of state.tokens) {
      if (block.type !== 'inline' || !block.children) {
        continue;
      }

      const out = [];

      for (const token of block.children) {
        if (token.type !== 'text' || !PATTERN.test(token.content)) {
          out.push(token);
          continue;
        }

        const parts   = token.content.split(PATTERN);
        const matches = token.content.match(PATTERN) || [];

        for (let i = 0; i < parts.length; i++) {
          if (parts[i]) {
            const textToken = new state.Token('text', '', 0);

            textToken.content = parts[i];
            out.push(textToken);
          }

          if (i < matches.length) {
            const htmlToken = new state.Token('html_inline', '', 0);

            htmlToken.content = '<span class="iridis-brand">iridis</span>';
            out.push(htmlToken);
          }
        }
      }

      block.children = out;
    }
  });
}
