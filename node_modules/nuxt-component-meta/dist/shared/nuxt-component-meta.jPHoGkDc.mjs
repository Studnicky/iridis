import { camelCase } from 'scule';

function refineMeta(meta, fields = { type: true, props: true, slots: true, events: true, exposed: true }, overrides = {}) {
  const eventProps = new Set(meta.events.map((event) => camelCase(`on_${event.name}`)));
  const props = (fields.props ? meta.props : []).filter((prop) => !prop.global && !eventProps.has(prop.name)).sort((a, b) => {
    if (!a.required && b.required) {
      return 1;
    }
    if (a.required && !b.required) {
      return -1;
    }
    if (a.type === "boolean" && b.type !== "boolean") {
      return 1;
    }
    if (a.type !== "boolean" && b.type === "boolean") {
      return -1;
    }
    return 0;
  });
  const refinedMeta = {
    type: meta.type,
    props: props.map((sch) => stripeTypeScriptInternalTypesSchema(sch, true)),
    slots: (fields.slots ? meta.slots : []).map((sch) => stripeTypeScriptInternalTypesSchema(sch, true)),
    exposed: (fields.exposed ? meta.exposed : []).map((sch) => stripeTypeScriptInternalTypesSchema(sch, true)),
    events: (fields.events ? meta.events : []).map((sch) => stripeTypeScriptInternalTypesSchema(sch, true))
  };
  removeFields(refinedMeta, ["declarations"]);
  if (fields.slots === "no-schema") {
    removeFields(refinedMeta.slots, ["schema"]);
  }
  if (fields.events === "no-schema") {
    removeFields(refinedMeta.events, ["schema"]);
  }
  if (fields.exposed === "no-schema") {
    removeFields(refinedMeta.exposed, ["schema"]);
  }
  if (fields.props === "no-schema") {
    removeFields(refinedMeta.props, ["schema"]);
  }
  for (const meta2 in overrides) {
    const metaOverrides = overrides[meta2];
    const metaFields = refinedMeta[meta2];
    if (Array.isArray(metaFields)) {
      for (const fieldName in metaOverrides) {
        const override = metaOverrides[fieldName];
        const index = metaFields.findIndex((field) => field.name === fieldName);
        if (index !== -1) {
          metaFields[index] = override;
        }
      }
    }
  }
  return refinedMeta;
}
function stripeTypeScriptInternalTypesSchema(type, _topLevel = true) {
  if (!type) {
    return type;
  }
  if (type.schema && typeof type.schema === "object" && type.schema.kind === "object" && typeof type.schema.type === "string" && isNativeBrowserType(type.schema.type)) {
    return {
      ...type,
      schema: type.schema.type
    };
  }
  if (type.kind === "object" && type.schema && typeof type.schema === "object" && !Array.isArray(type.schema)) {
    if (isNativeBrowserTypeSchema(type)) {
      return {
        ...type,
        schema: type.schema.type || "object",
        declarations: void 0
      };
    }
  }
  if (Array.isArray(type)) {
    return type.map((sch) => stripeTypeScriptInternalTypesSchema(sch, false)).filter((r) => r !== false);
  }
  if (Array.isArray(type.schema)) {
    return {
      ...type,
      declarations: void 0,
      schema: type.schema.map((sch) => stripeTypeScriptInternalTypesSchema(sch, false)).filter((r) => r !== false)
    };
  }
  if (!type.schema || typeof type.schema !== "object") {
    return typeof type === "object" ? { ...type, declarations: void 0 } : type;
  }
  const schema = {};
  Object.keys(type.schema).forEach((sch) => {
    if (sch === "schema" && type.schema[sch]) {
      schema[sch] = schema[sch] || {};
      Object.keys(type.schema[sch]).forEach((sch2) => {
        const res2 = stripeTypeScriptInternalTypesSchema(type.schema[sch][sch2], false);
        if (res2 !== false) {
          schema[sch][sch2] = res2;
        }
      });
      return;
    }
    const res = stripeTypeScriptInternalTypesSchema(type.schema[sch], false);
    if (res !== false) {
      schema[sch] = res;
    }
  });
  return {
    ...type,
    declarations: void 0,
    schema
  };
}
function isNativeBrowserType(typeName) {
  const nativeTypes = [
    // HTML Elements
    "HTMLElement",
    "HTMLCanvasElement",
    "HTMLDivElement",
    "HTMLSpanElement",
    "HTMLInputElement",
    "HTMLButtonElement",
    "HTMLFormElement",
    "HTMLImageElement",
    "HTMLAnchorElement",
    "HTMLLinkElement",
    "HTMLScriptElement",
    "HTMLStyleElement",
    "HTMLTableElement",
    "HTMLIFrameElement",
    "HTMLVideoElement",
    "HTMLAudioElement",
    "HTMLSelectElement",
    "HTMLOptionElement",
    "HTMLTextAreaElement",
    "HTMLLabelElement",
    "HTMLSlotElement",
    // DOM
    "Element",
    "Document",
    "Window",
    "Node",
    "NodeList",
    "HTMLCollection",
    "DOMTokenList",
    "NamedNodeMap",
    "DocumentFragment",
    "ShadowRoot",
    // Events
    "Event",
    "MouseEvent",
    "KeyboardEvent",
    "FocusEvent",
    "InputEvent",
    "EventTarget",
    "EventListener",
    // Canvas/WebGL
    "CanvasRenderingContext2D",
    "WebGLRenderingContext",
    "WebGL2RenderingContext",
    "ImageBitmap",
    "OffscreenCanvas",
    // Media
    "MediaStream",
    "MediaStreamTrack",
    "MediaRecorder",
    // Storage/Data
    "Storage",
    "SessionStorage",
    "LocalStorage",
    "DOMStringMap",
    // Node.js types
    "Buffer",
    "Process",
    "Stream"
  ];
  return nativeTypes.includes(typeName);
}
function removeFields(obj, fieldsToRemove) {
  if (obj && typeof obj === "object") {
    for (const key in obj) {
      if (fieldsToRemove.includes(key)) {
        delete obj[key];
      } else if (typeof obj[key] === "object") {
        removeFields(obj[key], fieldsToRemove);
      }
    }
  }
  return obj;
}
function isNativeBrowserTypeSchema(schema) {
  if (schema.kind === "object" && typeof schema.type === "string" && isNativeBrowserType(schema.type)) {
    return true;
  }
  const schemaProps = schema.schema;
  const propKeys = Object.keys(schemaProps);
  if (propKeys.length > 50) {
    const sampleSize = Math.min(10, propKeys.length);
    let nativeCount = 0;
    for (let i = 0; i < sampleSize; i++) {
      const prop = schemaProps[propKeys[i]];
      if (prop && prop.description && typeof prop.description === "string") {
        if (prop.description.includes("MDN Reference") || prop.description.includes("[MDN") || prop.description.includes("developer.mozilla.org")) {
          nativeCount++;
        }
      }
    }
    if (nativeCount > sampleSize / 2) {
      return true;
    }
  }
  return false;
}

export { isNativeBrowserType as i, refineMeta as r };
