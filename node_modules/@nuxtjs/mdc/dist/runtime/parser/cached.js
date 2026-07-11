export function createCachedParser(parserOptions) {
  let processor;
  let lastValue = "";
  let lastParse;
  return async function parse(value) {
    if (!processor) {
      processor = await import("@nuxtjs/mdc/runtime").then((m) => m.createParseProcessor({
        ...parserOptions,
        keepPosition: true
      }));
    }
    if (!value.startsWith(lastValue)) {
      lastValue = "";
      lastParse = void 0;
    }
    let startOffset = 0;
    if (lastParse?.body?.children.length && lastParse.body.children.length > 1) {
      const lastCompleteNode = lastParse.body.children[lastParse.body.children.length - 2];
      if (lastCompleteNode?.position?.end) {
        startOffset = lastCompleteNode.position.end;
      }
    }
    const processorResult = await processor.process({ value: value.slice(startOffset) });
    const result = processorResult?.result;
    if (result) {
      const body = {
        type: "root",
        children: [
          ...startOffset > 0 ? lastParse?.body?.children.slice(0, -1) || [] : [],
          ...result.body.children.map((child) => ({
            ...child,
            position: child.position && {
              start: child.position.start + startOffset,
              end: child.position.end + startOffset
            }
          }))
        ]
      };
      lastParse = { ...result, body };
      lastValue = value;
      return lastParse;
    }
  };
}
