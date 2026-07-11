'use strict';

const ufo = require('ufo');
const node_fs = require('node:fs');
const node_path = require('node:path');
const ofetch = require('ofetch');
const hookable = require('hookable');
const deepmerge = require('deepmerge');

function _interopDefaultCompat (e) { return e && typeof e === 'object' && 'default' in e ? e.default : e; }

const deepmerge__default = /*#__PURE__*/_interopDefaultCompat(deepmerge);

const GOOGLE_FONTS_DOMAIN = "fonts.googleapis.com";
function isValidDisplay(display) {
  return ["auto", "block", "swap", "fallback", "optional"].includes(display);
}
function parseStyle(style) {
  if (["wght", "normal", "regular"].includes(style.toLowerCase())) {
    return "wght";
  }
  if (["ital", "italic", "i"].includes(style.toLowerCase())) {
    return "ital";
  }
  return style;
}
function cartesianProduct(...a) {
  return a.length < 2 ? a : a.reduce((a2, b) => a2.flatMap((d) => b.map((e) => [d, e].flat())));
}
function parseFamilyName(name) {
  return decodeURIComponent(name).replace(/\+/g, " ");
}

function constructURL({
  families,
  display,
  subsets,
  text
} = {}) {
  const _subsets = (Array.isArray(subsets) ? subsets : [subsets]).filter(Boolean);
  const family = convertFamiliesToArray(families ?? {});
  if (family.length < 1) {
    return false;
  }
  const query = {
    family
  };
  if (display && isValidDisplay(display)) {
    query.display = display;
  }
  if (_subsets.length > 0) {
    query.subset = _subsets.join(",");
  }
  if (text) {
    query.text = text;
  }
  return ufo.withHttps(ufo.withQuery(ufo.resolveURL(GOOGLE_FONTS_DOMAIN, "css2"), query));
}
function convertFamiliesToArray(families) {
  const result = [];
  Object.entries(families).forEach(([name, values]) => {
    if (!name) {
      return;
    }
    name = parseFamilyName(name);
    if (typeof values === "string" && String(values).includes("..")) {
      result.push(`${name}:wght@${values}`);
      return;
    }
    if (Array.isArray(values) && values.length > 0) {
      result.push(`${name}:wght@${values.join(";")}`);
      return;
    }
    if (Object.keys(values).length > 0) {
      const axes = {};
      let italicWeights = [];
      let hasNonItalBooleanTrue = false;
      Object.entries(values).sort(([styleA], [styleB]) => styleA.localeCompare(styleB)).forEach(([style, weight]) => {
        const parsedStyle = parseStyle(style);
        if (parsedStyle === "ital") {
          axes[parsedStyle] = ["0", "1"];
          if (weight === true || weight === 400 || weight === 1) {
            italicWeights = ["*"];
          } else {
            italicWeights = Array.isArray(weight) ? weight.map((w) => String(w)) : [weight];
          }
        } else if (weight === true) {
          hasNonItalBooleanTrue = true;
        } else {
          axes[parseStyle(style)] = Array.isArray(weight) ? weight.map((w) => String(w)) : [weight];
        }
      });
      const strictlyItalic = [];
      if (Object.keys(axes).length === 1 && Object.hasOwn(axes, "ital")) {
        if (hasNonItalBooleanTrue) {
          if (!italicWeights.includes("*")) {
            axes.wght = italicWeights;
          }
        } else if (!(italicWeights.includes("*") || italicWeights.length === 1 && italicWeights.includes("400"))) {
          axes.wght = italicWeights;
          strictlyItalic.push(...italicWeights);
        }
      } else if (Object.hasOwn(axes, "wght") && !italicWeights.includes("*")) {
        strictlyItalic.push(...italicWeights.filter((w) => !axes.wght.includes(w)));
        axes.wght = [.../* @__PURE__ */ new Set([...axes.wght, ...italicWeights])];
      }
      const axisTagList = Object.keys(axes).sort((axisA, axisB) => {
        const isLowerA = axisA[0] === axisA[0].toLowerCase();
        const isLowerB = axisB[0] === axisB[0].toLowerCase();
        if (isLowerA && !isLowerB) {
          return -1;
        }
        if (!isLowerA && isLowerB) {
          return 1;
        }
        return axisA.localeCompare(axisB);
      });
      if (axisTagList.length === 1 && axisTagList.includes("ital")) {
        result.push(`${name}:ital@${hasNonItalBooleanTrue ? "0;1" : "1"}`);
        return;
      }
      let axisTupleArrays = cartesianProduct(...axisTagList.map((tag) => axes[tag]), [[]]);
      const italicIndex = axisTagList.findIndex((i) => i === "ital");
      if (italicIndex !== -1) {
        const weightIndex = axisTagList.findIndex((i) => i === "wght");
        if (weightIndex !== -1) {
          axisTupleArrays = axisTupleArrays.filter((axisTuple) => axisTuple[italicIndex] === "0" && !strictlyItalic.includes(axisTuple[weightIndex]) || axisTuple[italicIndex] === "1" && italicWeights.includes(axisTuple[weightIndex]));
        }
      }
      const axisTupleList = axisTupleArrays.sort((axisTupleA, axisTupleB) => {
        for (let i = 0; i < axisTupleA.length; i++) {
          const compareResult = parseInt(axisTupleA[i]) - parseInt(axisTupleB[i]);
          if (compareResult !== 0) {
            return compareResult;
          }
        }
        return 0;
      }).map((axisTuple) => axisTuple.join(",")).join(";");
      result.push(`${name}:${axisTagList.join(",")}@${axisTupleList}`);
      return;
    }
    if (values) {
      result.push(name);
    }
  });
  return result;
}

function isValidURL(url) {
  return RegExp(GOOGLE_FONTS_DOMAIN).test(url);
}

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
class Downloader extends hookable.Hookable {
  constructor(url, options) {
    super();
    this.url = url;
    __publicField(this, "config");
    this.config = {
      base64: false,
      overwriting: false,
      outputDir: "./",
      stylePath: "fonts.css",
      fontsDir: "fonts",
      fontsPath: "./fonts",
      headers: [["user-agent", [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "AppleWebKit/537.36 (KHTML, like Gecko)",
        "Chrome/98.0.4758.102 Safari/537.36"
      ].join(" ")]],
      ...options
    };
  }
  async execute() {
    if (!isValidURL(this.url)) {
      throw new Error("Invalid Google Fonts URL");
    }
    const { outputDir, stylePath, headers, fontsPath } = this.config;
    const cssPath = node_path.resolve(outputDir, stylePath);
    let overwriting = this.config.overwriting;
    if (!overwriting && node_fs.existsSync(cssPath)) {
      const currentCssContent = node_fs.readFileSync(cssPath, "utf-8");
      const currentUrl = (currentCssContent.split(/\r?\n/, 1).shift() || "").replace("/*", "").replace("*/", "").trim();
      if (currentUrl === this.url) {
        return false;
      }
      overwriting = true;
    }
    await this.callHook("download:start");
    const { searchParams } = new URL(this.url);
    const subsets = searchParams.get("subset") ? searchParams.get("subset")?.split(",") : void 0;
    await this.callHook("download-css:before", this.url);
    const _css = await ofetch.ofetch(this.url, { headers });
    const { fonts: fontsFromCss, css: cssContent } = parseFontsFromCss(_css, fontsPath, subsets);
    await this.callHook("download-css:done", this.url, cssContent, fontsFromCss);
    const fonts = await this.downloadFonts(fontsFromCss);
    await this.callHook("write-css:before", cssPath, cssContent, fonts);
    const newContent = this.writeCss(cssPath, `/* ${this.url} */
${cssContent}`, fonts);
    await this.callHook("write-css:done", cssPath, newContent, cssContent);
    await this.callHook("download:complete");
    return true;
  }
  async downloadFonts(fonts) {
    const { headers, base64, outputDir, fontsDir } = this.config;
    const downloadedFonts = [];
    const _fonts = [];
    for (const font of fonts) {
      const downloadedFont = downloadedFonts.find((f) => f.inputFont === font.inputFont);
      if (downloadedFont) {
        if (base64) {
          font.outputText = downloadedFont.outputText;
        } else {
          node_fs.copyFileSync(
            node_path.resolve(outputDir, fontsDir, downloadedFont.outputFont),
            node_path.resolve(outputDir, fontsDir, font.outputFont)
          );
        }
        _fonts.push(font);
        continue;
      }
      await this.callHook("download-font:before", font);
      const response = await ofetch.ofetch.raw(font.inputFont, { headers, responseType: "arrayBuffer" });
      if (!response?._data) {
        _fonts.push(font);
        continue;
      }
      const buffer = Buffer.from(response?._data);
      if (base64) {
        const mime = response.headers.get("content-type") ?? "font/woff2";
        font.outputText = `url('data:${mime};base64,${buffer.toString("base64")}')`;
      } else {
        const fontPath = node_path.resolve(outputDir, fontsDir, font.outputFont);
        node_fs.mkdirSync(node_path.dirname(fontPath), { recursive: true });
        node_fs.writeFileSync(fontPath, buffer);
      }
      _fonts.push(font);
      await this.callHook("download-font:done", font);
      downloadedFonts.push(font);
    }
    return _fonts;
  }
  writeCss(path, content, fonts) {
    for (const font of fonts) {
      content = content.replace(font.inputText, font.outputText);
    }
    node_fs.mkdirSync(node_path.dirname(path), { recursive: true });
    node_fs.writeFileSync(path, content, "utf-8");
    return content;
  }
}
function parseFontsFromCss(content, fontsPath, subsets) {
  const css = [];
  const fonts = [];
  const re = {
    face: /\s*(?:\/\*\s*(.*?)\s*\*\/)?[^@]*?@font-face\s*{(?:[^}]*?)}\s*/gi,
    family: /font-family\s*:\s*(?:'|")?([^;]*?)(?:'|")?\s*;/i,
    style: /font-style\s*:\s*([^;]*?)\s*;/i,
    weight: /font-weight\s*:\s*([^;]*?)\s*;/i,
    url: /url\s*\(\s*(?:'|")?\s*([^]*?)\s*(?:'|")?\s*\)\s*?/gi
  };
  let match1;
  while ((match1 = re.face.exec(content)) !== null) {
    const [fontface, subset] = match1;
    const familyRegExpArray = re.family.exec(fontface);
    const family = familyRegExpArray ? familyRegExpArray[1] : "";
    const styleRegExpArray = re.style.exec(fontface);
    const style = styleRegExpArray ? styleRegExpArray[1] : "";
    const weightRegExpArray = re.weight.exec(fontface);
    const weight = weightRegExpArray ? weightRegExpArray[1] : "";
    if (subsets && subsets.length && !subsets.includes(subset)) {
      continue;
    }
    css.push(fontface);
    let match2;
    while ((match2 = re.url.exec(fontface)) !== null) {
      const [forReplace, url] = match2;
      const ext = node_path.extname(url).replace(/^\./, "") || "woff2";
      const newFilename = formatFontFileName("{family}-{style}-{weight}-{subset}.{ext}", {
        family: family.replace(/\s+/g, "_"),
        style: style.replace(/\s+/g, "_") || "normal",
        weight: weight.replace(/\s+/g, "_") || "",
        subset: subset || "text",
        ext
      }).replace(/\.$/, "");
      fonts.push({
        inputFont: url,
        outputFont: newFilename,
        inputText: forReplace,
        outputText: `url('${node_path.posix.join(fontsPath, newFilename)}')`
      });
    }
  }
  return {
    css: css.join("\n"),
    fonts
  };
}
function formatFontFileName(template, values) {
  return Object.entries(values).filter(([key]) => /^[a-z0-9_-]+$/gi.test(key)).map(([key, value]) => [new RegExp(`([^{]|^){${key}}([^}]|$)`, "g"), `$1${value}$2`]).reduce((str, [regexp, replacement]) => str.replace(regexp, String(replacement)), template).replace(/({|}){2}/g, "$1");
}

function download(url, options) {
  return new Downloader(url, options);
}

function merge(...fonts) {
  return deepmerge__default.all(fonts);
}

function parse(url) {
  const result = {};
  if (!isValidURL(url)) {
    return result;
  }
  const { searchParams, pathname } = new URL(url);
  if (!searchParams.has("family")) {
    return result;
  }
  const families = convertFamiliesObject(searchParams.getAll("family"), pathname.endsWith("2"));
  if (Object.keys(families).length < 1) {
    return result;
  }
  result.families = families;
  const display = searchParams.get("display");
  if (display && isValidDisplay(display)) {
    result.display = display;
  }
  const subsets = searchParams.get("subset");
  if (subsets) {
    result.subsets = subsets.split(",");
  }
  const text = searchParams.get("text");
  if (text) {
    result.text = text;
  }
  return result;
}
function convertFamiliesObject(families, v2 = true) {
  const result = {};
  families.flatMap((family) => family.split("|")).forEach((family) => {
    if (!family) {
      return;
    }
    if (!family.includes(":")) {
      result[family] = true;
      return;
    }
    const parts = family.split(":");
    if (!parts[1]) {
      return;
    }
    const values = {};
    if (!v2) {
      parts[1].split(",").forEach((style) => {
        const styleParsed = parseStyle(style);
        if (styleParsed === "wght") {
          values.wght = true;
        }
        if (styleParsed === "ital") {
          values.ital = true;
        }
        if (styleParsed === "bold" || styleParsed === "b") {
          values.wght = 700;
        }
        if (styleParsed === "bolditalic" || styleParsed === "bi") {
          values.ital = 700;
        }
      });
    }
    if (v2) {
      let [styles, weights] = parts[1].split("@");
      if (!weights) {
        weights = String(styles).replace(",", ";");
        styles = "wght";
      }
      const listStyles = styles.split(",");
      listStyles.forEach((style) => {
        const styleParsed = parseStyle(style);
        if (listStyles.length === 1 && styleParsed === "ital" && weights === "0;1") {
          values.wght = true;
        }
        const weightsList = weights.split(";").map((weight) => {
          if (/^\+?\d+$/.test(weight)) {
            return parseInt(weight);
          }
          const [pos, w] = weight.split(",");
          const index = styleParsed === "wght" ? 0 : 1;
          if (!w) {
            return weight;
          }
          if (parseInt(pos) !== index) {
            return 0;
          }
          if (/^\+?\d+$/.test(w)) {
            return parseInt(w);
          }
          return w;
        }).filter((v) => parseInt(v.toString()) > 0 || v.toString().includes(".."));
        if (!weightsList.length) {
          return;
        }
        values[styleParsed] = weightsList;
        if (values[styleParsed].length > 1) {
          return;
        }
        const first = values[styleParsed][0];
        if (String(first).includes("..")) {
          values[styleParsed] = first;
        }
        if (first === 1 || first === true) {
          values[styleParsed] = true;
        }
      });
    }
    result[parseFamilyName(parts[0])] = values;
  });
  return result;
}

exports.Downloader = Downloader;
exports.constructURL = constructURL;
exports.download = download;
exports.isValidURL = isValidURL;
exports.merge = merge;
exports.parse = parse;
