import { resolve } from 'pathe';
import { useLogger, defineNuxtModule, resolvePath, isNuxt2 } from '@nuxt/kit';
import { isValidURL, parse, constructURL, merge, download } from 'google-fonts-helper';

const name = "@nuxtjs/google-fonts";
const version = "3.2.0";

const logger = useLogger("nuxt:google-fonts");
const module = defineNuxtModule({
  meta: {
    name,
    version,
    configKey: "googleFonts"
  },
  defaults: {
    families: {},
    display: void 0,
    // set to 'swap' later if no preload or user value
    subsets: [],
    text: void 0,
    prefetch: true,
    preconnect: true,
    preload: false,
    useStylesheet: false,
    download: true,
    base64: false,
    inject: true,
    overwriting: false,
    outputDir: "node_modules/.cache/nuxt-google-fonts",
    stylePath: "css/nuxt-google-fonts.css",
    fontsDir: "fonts",
    fontsPath: "../fonts"
  },
  async setup(options, nuxt) {
    if (options.display === void 0 && !options.preload) {
      options.display = "swap";
    }
    const fontsParsed = [];
    const head = nuxt.options.app.head || nuxt.options.head;
    if (typeof head === "function") {
      logger.warn("This module does not work with `head` as function.");
      return;
    }
    fontsParsed.push(
      ...head.link.filter((link) => isValidURL(String(link.href))).map((link) => parse(String(link.href)))
    );
    const url = constructURL(merge(options, ...fontsParsed));
    if (!url) {
      logger.warn("No provided fonts.");
      return;
    }
    head.link = head.link.filter((link) => !isValidURL(String(link.href)));
    if (options.download && options.outputDir) {
      const outputDir = await resolvePath(options.outputDir);
      try {
        const downloader = download(url, {
          base64: options.base64,
          overwriting: options.overwriting,
          outputDir,
          stylePath: options.stylePath,
          fontsDir: options.fontsDir,
          fontsPath: options.fontsPath
        });
        const outputFonts = [];
        downloader.hook("download:start", () => {
          logger.start("Downloading fonts...");
        });
        downloader.hook("download:complete", () => {
          logger.success("Download fonts completed.");
          logger.log("");
        });
        downloader.hook("download-css:done", (url2) => {
          logger.success(url2);
        });
        downloader.hook("download-font:done", (font) => {
          const fontName = font.outputFont.replace(`-${font.outputFont.replace(/.*-/, "")}`, "");
          if (!outputFonts.includes(fontName)) {
            outputFonts.push(fontName);
            logger.info(fontName);
          }
        });
        await downloader.execute();
        if (options.inject && options.stylePath) {
          nuxt.options.css.push(resolve(outputDir, options.stylePath));
        }
        nuxt.options.nitro = nuxt.options.nitro || {};
        nuxt.options.nitro.publicAssets = nuxt.options.nitro.publicAssets || [];
        nuxt.options.nitro.publicAssets.push({ dir: outputDir });
      } catch (e) {
        logger.error(e);
      }
      return;
    }
    if (options.prefetch) {
      head.link.push({
        key: "gf-prefetch",
        rel: "dns-prefetch",
        href: "https://fonts.gstatic.com/"
      });
    }
    if (options.preconnect) {
      head.link.push(
        // connect to domain of font files
        {
          key: "gf-preconnect",
          rel: "preconnect",
          href: "https://fonts.gstatic.com/",
          crossorigin: "anonymous"
        },
        // Should also preconnect to origin of Google fonts stylesheet.
        {
          key: "gf-origin-preconnect",
          rel: "preconnect",
          href: "https://fonts.googleapis.com/"
        }
      );
    }
    if (options.preload) {
      head.link.push({
        key: "gf-preload",
        rel: "preload",
        as: "style",
        href: url
      });
    }
    if (options.useStylesheet) {
      head.link.push({
        key: "gf-style",
        rel: "stylesheet",
        href: url
      });
      return;
    }
    if (isNuxt2()) {
      head.script.push({
        key: "gf-script",
        innerHTML: `(function(){var l=document.createElement('link');l.rel="stylesheet";l.href="${url}";document.querySelector("head").appendChild(l);})();`
      });
      head.noscript.push({
        key: "gf-noscript",
        innerHTML: `<link rel="stylesheet" href="${url}">`,
        tagPosition: "bodyOpen"
      });
      head.__dangerouslyDisableSanitizersByTagID = head.__dangerouslyDisableSanitizersByTagID || {};
      head.__dangerouslyDisableSanitizersByTagID["gf-script"] = ["innerHTML"];
      head.__dangerouslyDisableSanitizersByTagID["gf-noscript"] = ["innerHTML"];
      return;
    }
    head.script.unshift({
      key: "gf-script",
      children: `(function(){
        var h=document.querySelector("head");
        var m=h.querySelector('meta[name="head:count"]');
        if(m){m.setAttribute('content',Number(m.getAttribute('content'))+1);}
        else{m=document.createElement('meta');m.setAttribute('name','head:count');m.setAttribute('content','1');h.append(m);}
        var l=document.createElement('link');l.rel='stylesheet';l.href='${url}';h.appendChild(l);
      })();`
    });
    head.noscript.push({
      children: `<link rel="stylesheet" href="${url}">`,
      tagPosition: "bodyOpen"
    });
  }
});

export { module as default };
