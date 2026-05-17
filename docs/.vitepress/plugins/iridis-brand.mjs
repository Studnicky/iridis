// Markdown-it plugin: wrap every standalone 'iridis' word (case-insensitive,
// word-bounded) in <span class="iridis-brand"> so the animated spectrum
// gradient renders. Three transform passes:
//
//   1. `text` tokens inside `inline` containers — covers prose,
//      paragraphs, headings (h1..h6 emit `inline` children for their
//      heading text).
//   2. `html_inline` tokens — covers inline raw HTML inside a paragraph,
//      e.g. `<span>iridis</span>` typed by the author.
//   3. `html_block` tokens — covers top-level raw HTML blocks such as
//      the hero `<div><h1>iridis</h1>…</div>` on index.md. These are
//      passed through by markdown-it without children, so the plugin
//      rewrites the raw HTML string directly.
//
// Skips:
//   - Code spans (`code_inline`) and code blocks (`code_block`, `fence`):
//     `iridis` inside ```typescript code stays unstyled.
//   - URLs and identifiers: the regex bounds the match with `\b` and
//     blocks any match preceded by `/`, `:`, `@`, `.`, or `-` so paths
//     like `/iridis/getting-started`, package names like
//     `@studnicky/iridis`, and CSS variables like `--iridis-brand`
//     are not touched.
//   - `<a>` link text and `class=` / `href=` attribute values:
//     the html-block pass uses a tokenising walk over `<` `>` so it
//     only mutates text-outside-tags, never attribute payloads.
//
// The matched literal is replaced VERBATIM (preserving case) inside
// the span — `Iridis` stays `Iridis`, `IRIDIS` stays `IRIDIS`.
//
// The corresponding CSS in palette.css applies the animated spectrum
// gradient. The navbar siteTitle and any other static-Vue-rendered
// "iridis" gets the same treatment via a sitewide CSS rule that targets
// the literal element text — see palette.css `.VPNavBarTitle .title`.

const PATTERN = /(^|[^A-Za-z0-9_/:@.\-])(iridis)\b/gi;

function wrapInText(input) {
  return input.replace(PATTERN, (_match, lead, word) => `${lead}<span class="iridis-brand">${word}</span>`);
}

/**
 * Rewrites raw HTML by splitting on tag boundaries so only the text
 * payload between tags is matched. Attribute values inside `<...>`
 * tags (href, class, src) are left untouched. The split is naïve but
 * correct for the small set of authored HTML blocks in this docs tree
 * — no embedded `>` in attributes.
 */
function wrapInHtml(html) {
  let out = '';
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      out += wrapInText(html.slice(i));
      break;
    }
    out += wrapInText(html.slice(i, lt));
    const gt = html.indexOf('>', lt);
    if (gt === -1) {
      out += html.slice(lt);
      break;
    }
    out += html.slice(lt, gt + 1);
    i = gt + 1;
  }
  return out;
}

export function iridisBrandPlugin(md) {
  md.core.ruler.after('inline', 'iridis-brand', (state) => {
    for (const block of state.tokens) {
      // Pass 3: raw top-level HTML blocks.
      if (block.type === 'html_block') {
        block.content = wrapInHtml(block.content);
        continue;
      }
      if (block.type !== 'inline' || !block.children) {
        continue;
      }

      const out = [];

      for (const token of block.children) {
        // Pass 1: plain text inside inline blocks.
        if (token.type === 'text' && PATTERN.test(token.content)) {
          PATTERN.lastIndex = 0;
          const rewritten = wrapInText(token.content);
          const htmlToken = new state.Token('html_inline', '', 0);
          htmlToken.content = rewritten;
          out.push(htmlToken);
          continue;
        }
        // Pass 2: inline raw HTML (e.g. <span>iridis</span> typed manually).
        if (token.type === 'html_inline') {
          token.content = wrapInHtml(token.content);
          out.push(token);
          continue;
        }
        // Reset regex state between tokens — /g regexes maintain lastIndex.
        PATTERN.lastIndex = 0;
        out.push(token);
      }

      block.children = out;
    }
  });
}
