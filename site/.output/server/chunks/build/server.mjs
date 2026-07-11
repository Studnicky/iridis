import process from 'node:process';globalThis._importMeta_=globalThis._importMeta_||{url:"file:///_entry.js",env:process.env};import { inject, ref, computed, isRef, provide, unref, mergeProps, createVNode, resolveDynamicComponent, toValue, watch, withCtx, renderSlot, openBlock, createBlock, toDisplayString, defineComponent, useModel, createTextVNode, createCommentVNode, mergeModels, h, toRef, Teleport, useSlots, Fragment, renderList, hasInjectionContext, getCurrentInstance, camelize, toHandlerKey, toRefs, nextTick, Comment, cloneVNode, shallowRef, resolveComponent, watchEffect, markRaw, onServerPrefetch, defineAsyncComponent, createElementBlock, useSSRContext, Suspense, createApp, useId, shallowReactive, onErrorCaptured, reactive, effectScope, useTemplateRef, withModifiers, normalizeProps, guardReactiveProps, normalizeStyle, getCurrentScope, onScopeDispose, isReadonly, isShallow, isReactive, toRaw } from 'vue';
import { s as serialize, k as klona, l as defu, m as hasProtocol, w as withLeadingSlash, n as withTrailingSlash, o as joinURL, q as defuFn, r as isEqual, t as parseQuery, v as getContext, x as hash, y as parseURL, e as encodePath, z as decodePath, A as isScriptProtocol, B as withQuery, C as withoutTrailingSlash, D as sanitizeStatusCode, $ as $fetch$1, E as baseURL, c as createError$1, F as executeAsync } from '../nitro/nitro.mjs';
import { RouterView, createMemoryHistory, createRouter, START_LOCATION } from 'vue-router';
import { Icon, getIcon, loadIcon as loadIcon$1, _api, addAPIProvider, setCustomIconsLoader } from '@iconify/vue';
import colors from 'tailwindcss/colors';
import { ssrRenderComponent, ssrRenderVNode, ssrRenderSlot, ssrRenderClass, ssrInterpolate, ssrRenderStyle, ssrRenderList, ssrRenderAttrs, ssrRenderAttr, ssrRenderSuspense } from 'vue/server-renderer';
import { useDebounceFn, reactivePick, useMounted, reactiveOmit, unrefElement, useVModel, defaultWindow, onKeyStroke, createSharedComposable, useRafFn } from '@vueuse/core';
import { isClient, useTimeoutFn, useTimeout } from '@vueuse/shared';
import { createTV, cnMerge } from 'tailwind-variants';
import { getIconCSS } from '@iconify/utils/lib/css/icon';
import { Logger, ConsoleTransport } from '@studnicky/logger';
import { ValidationError, ModuleError } from '@studnicky/errors';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';
import { SchemaValidator } from '@studnicky/json';
import { EffectInterpreter, StateMachine } from '@studnicky/fsm';
import { u as useHead$1, h as headSymbol } from '../routes/renderer.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import '@iconify/utils';
import 'consola';
import 'better-sqlite3';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';

function flatHooks(configHooks, hooks = {}, parentName) {
	for (const key in configHooks) {
		const subHook = configHooks[key];
		const name = parentName ? `${parentName}:${key}` : key;
		if (typeof subHook === "object" && subHook !== null) flatHooks(subHook, hooks, name);
		else if (typeof subHook === "function") hooks[name] = subHook;
	}
	return hooks;
}
const createTask = /* @__PURE__ */ (() => {
	if (console.createTask) return console.createTask;
	const defaultTask = { run: (fn) => fn() };
	return () => defaultTask;
})();
function callHooks(hooks, args, startIndex, task) {
	for (let i = startIndex; i < hooks.length; i += 1) try {
		const result = task ? task.run(() => hooks[i](...args)) : hooks[i](...args);
		if (result && typeof result.then === "function") return Promise.resolve(result).then(() => callHooks(hooks, args, i + 1, task));
	} catch (error) {
		return Promise.reject(error);
	}
}
function serialTaskCaller(hooks, args, name) {
	if (hooks.length > 0) return callHooks(hooks, args, 0, createTask(name));
}
function parallelTaskCaller(hooks, args, name) {
	if (hooks.length > 0) {
		const task = createTask(name);
		return Promise.all(hooks.map((hook) => task.run(() => hook(...args))));
	}
}
function callEachWith(callbacks, arg0) {
	for (const callback of [...callbacks]) callback(arg0);
}
var Hookable = class {
	_hooks;
	_before;
	_after;
	_deprecatedHooks;
	_deprecatedMessages;
	constructor() {
		this._hooks = {};
		this._before = void 0;
		this._after = void 0;
		this._deprecatedMessages = void 0;
		this._deprecatedHooks = {};
		this.hook = this.hook.bind(this);
		this.callHook = this.callHook.bind(this);
		this.callHookWith = this.callHookWith.bind(this);
	}
	hook(name, function_, options = {}) {
		if (!name || typeof function_ !== "function") return () => {};
		const originalName = name;
		let dep;
		while (this._deprecatedHooks[name]) {
			dep = this._deprecatedHooks[name];
			name = dep.to;
		}
		if (dep && !options.allowDeprecated) {
			let message = dep.message;
			if (!message) message = `${originalName} hook has been deprecated` + (dep.to ? `, please use ${dep.to}` : "");
			if (!this._deprecatedMessages) this._deprecatedMessages = /* @__PURE__ */ new Set();
			if (!this._deprecatedMessages.has(message)) {
				console.warn(message);
				this._deprecatedMessages.add(message);
			}
		}
		if (!function_.name) try {
			Object.defineProperty(function_, "name", {
				get: () => "_" + name.replace(/\W+/g, "_") + "_hook_cb",
				configurable: true
			});
		} catch {}
		this._hooks[name] = this._hooks[name] || [];
		this._hooks[name].push(function_);
		return () => {
			if (function_) {
				this.removeHook(name, function_);
				function_ = void 0;
			}
		};
	}
	hookOnce(name, function_) {
		let _unreg;
		let _function = (...arguments_) => {
			if (typeof _unreg === "function") _unreg();
			_unreg = void 0;
			_function = void 0;
			return function_(...arguments_);
		};
		_unreg = this.hook(name, _function);
		return _unreg;
	}
	removeHook(name, function_) {
		const hooks = this._hooks[name];
		if (hooks) {
			const index = hooks.indexOf(function_);
			if (index !== -1) hooks.splice(index, 1);
			if (hooks.length === 0) this._hooks[name] = void 0;
		}
	}
	clearHook(name) {
		this._hooks[name] = void 0;
	}
	deprecateHook(name, deprecated) {
		this._deprecatedHooks[name] = typeof deprecated === "string" ? { to: deprecated } : deprecated;
		const _hooks = this._hooks[name] || [];
		this._hooks[name] = void 0;
		for (const hook of _hooks) this.hook(name, hook);
	}
	deprecateHooks(deprecatedHooks) {
		for (const name in deprecatedHooks) this.deprecateHook(name, deprecatedHooks[name]);
	}
	addHooks(configHooks) {
		const hooks = flatHooks(configHooks);
		const removeFns = Object.keys(hooks).map((key) => this.hook(key, hooks[key]));
		return () => {
			for (const unreg of removeFns) unreg();
			removeFns.length = 0;
		};
	}
	removeHooks(configHooks) {
		const hooks = flatHooks(configHooks);
		for (const key in hooks) this.removeHook(key, hooks[key]);
	}
	removeAllHooks() {
		this._hooks = {};
	}
	callHook(name, ...args) {
		return this.callHookWith(serialTaskCaller, name, args);
	}
	callHookParallel(name, ...args) {
		return this.callHookWith(parallelTaskCaller, name, args);
	}
	callHookWith(caller, name, args) {
		const event = this._before || this._after ? {
			name,
			args,
			context: {}
		} : void 0;
		if (this._before) callEachWith(this._before, event);
		const result = caller(this._hooks[name] ? [...this._hooks[name]] : [], args, name);
		if (result instanceof Promise) return result.finally(() => {
			if (this._after && event) callEachWith(this._after, event);
		});
		if (this._after && event) callEachWith(this._after, event);
		return result;
	}
	beforeEach(function_) {
		this._before = this._before || [];
		this._before.push(function_);
		return () => {
			if (this._before !== void 0) {
				const index = this._before.indexOf(function_);
				if (index !== -1) this._before.splice(index, 1);
			}
		};
	}
	afterEach(function_) {
		this._after = this._after || [];
		this._after.push(function_);
		return () => {
			if (this._after !== void 0) {
				const index = this._after.indexOf(function_);
				if (index !== -1) this._after.splice(index, 1);
			}
		};
	}
};
function createHooks() {
	return new Hookable();
}

function diff(obj1, obj2) {
  const h1 = _toHashedObject(obj1);
  const h2 = _toHashedObject(obj2);
  return _diff(h1, h2);
}
function _diff(h1, h2) {
  const diffs = [];
  const allProps = /* @__PURE__ */ new Set([
    ...Object.keys(h1.props || {}),
    ...Object.keys(h2.props || {})
  ]);
  if (h1.props && h2.props) {
    for (const prop of allProps) {
      const p1 = h1.props[prop];
      const p2 = h2.props[prop];
      if (p1 && p2) {
        diffs.push(..._diff(h1.props?.[prop], h2.props?.[prop]));
      } else if (p1 || p2) {
        diffs.push(
          new DiffEntry((p2 || p1).key, p1 ? "removed" : "added", p2, p1)
        );
      }
    }
  }
  if (allProps.size === 0 && h1.hash !== h2.hash) {
    diffs.push(new DiffEntry((h2 || h1).key, "changed", h2, h1));
  }
  return diffs;
}
function _toHashedObject(obj, key = "") {
  if (obj && typeof obj !== "object") {
    return new DiffHashedObject(key, obj, serialize(obj));
  }
  const props = {};
  const hashes = [];
  for (const _key in obj) {
    props[_key] = _toHashedObject(obj[_key], key ? `${key}.${_key}` : _key);
    hashes.push(props[_key].hash);
  }
  return new DiffHashedObject(key, obj, `{${hashes.join(":")}}`, props);
}
class DiffEntry {
  constructor(key, type, newValue, oldValue) {
    this.key = key;
    this.type = type;
    this.newValue = newValue;
    this.oldValue = oldValue;
  }
  toString() {
    return this.toJSON();
  }
  toJSON() {
    switch (this.type) {
      case "added": {
        return `Added   \`${this.key}\``;
      }
      case "removed": {
        return `Removed \`${this.key}\``;
      }
      case "changed": {
        return `Changed \`${this.key}\` from \`${this.oldValue?.toString() || "-"}\` to \`${this.newValue.toString()}\``;
      }
    }
  }
}
class DiffHashedObject {
  constructor(key, value, hash, props) {
    this.key = key;
    this.value = value;
    this.hash = hash;
    this.props = props;
  }
  toString() {
    if (this.props) {
      return `{${Object.keys(this.props).join(",")}}`;
    } else {
      return JSON.stringify(this.value);
    }
  }
  toJSON() {
    const k = this.key || ".";
    if (this.props) {
      return `${k}({${Object.keys(this.props).join(",")}})`;
    }
    return `${k}(${this.value})`;
  }
}

//#region src/index.ts
const DEBOUNCE_DEFAULTS = { trailing: true };
/**
Debounce functions
@param fn - Promise-returning/async function to debounce.
@param wait - Milliseconds to wait before calling `fn`. Default value is 25ms
@returns A function that delays calling `fn` until after `wait` milliseconds have elapsed since the last time it was called.
@example
```
import { debounce } from 'perfect-debounce';
const expensiveCall = async input => input;
const debouncedFn = debounce(expensiveCall, 200);
for (const number of [1, 2, 3]) {
console.log(await debouncedFn(number));
}
//=> 1
//=> 2
//=> 3
```
*/
function debounce(fn, wait = 25, options = {}) {
	options = {
		...DEBOUNCE_DEFAULTS,
		...options
	};
	if (!Number.isFinite(wait)) throw new TypeError("Expected `wait` to be a finite number");
	let leadingValue;
	let timeout;
	let resolveList = [];
	let currentPromise;
	let trailingArgs;
	const applyFn = (_this, args) => {
		currentPromise = _applyPromised(fn, _this, args);
		currentPromise.finally(() => {
			currentPromise = null;
			if (options.trailing && trailingArgs && !timeout) {
				const promise = applyFn(_this, trailingArgs);
				trailingArgs = null;
				return promise;
			}
		});
		return currentPromise;
	};
	const debounced = function(...args) {
		if (options.trailing) trailingArgs = args;
		if (currentPromise) return currentPromise;
		return new Promise((resolve) => {
			const shouldCallNow = !timeout && options.leading;
			clearTimeout(timeout);
			timeout = setTimeout(() => {
				timeout = null;
				const promise = options.leading ? leadingValue : applyFn(this, args);
				trailingArgs = null;
				for (const _resolve of resolveList) _resolve(promise);
				resolveList = [];
			}, wait);
			if (shouldCallNow) {
				leadingValue = applyFn(this, args);
				resolve(leadingValue);
			} else resolveList.push(resolve);
		});
	};
	const _clearTimeout = (timer) => {
		if (timer) {
			clearTimeout(timer);
			timeout = null;
		}
	};
	debounced.isPending = () => !!timeout;
	debounced.cancel = () => {
		_clearTimeout(timeout);
		resolveList = [];
		trailingArgs = null;
	};
	debounced.flush = () => {
		_clearTimeout(timeout);
		if (!trailingArgs || currentPromise) return;
		const args = trailingArgs;
		trailingArgs = null;
		return applyFn(this, args);
	};
	return debounced;
}
async function _applyPromised(fn, _this, args) {
	return await fn.apply(_this, args);
}

if (!globalThis.$fetch) {
  globalThis.$fetch = $fetch$1.create({
    baseURL: baseURL()
  });
}
if (!("global" in globalThis)) {
  globalThis.global = globalThis;
}
const nuxtLinkDefaults = { "componentName": "NuxtLink" };
const asyncDataDefaults = { "deep": false };
const appId = "nuxt-app";
function getNuxtAppCtx(id = appId) {
  return getContext(id, {
    asyncContext: false
  });
}
const NuxtPluginIndicator = "__nuxt_plugin";
function createNuxtApp(options2) {
  let hydratingCount = 0;
  const nuxtApp = {
    _id: options2.id || appId || "nuxt-app",
    _scope: effectScope(),
    provide: void 0,
    versions: {
      get nuxt() {
        return "4.4.8";
      },
      get vue() {
        return nuxtApp.vueApp.version;
      }
    },
    payload: shallowReactive({
      ...options2.ssrContext?.payload || {},
      data: shallowReactive({}),
      state: reactive({}),
      once: /* @__PURE__ */ new Set(),
      _errors: shallowReactive({})
    }),
    static: {
      data: {}
    },
    runWithContext(fn) {
      if (nuxtApp._scope.active && !getCurrentScope()) {
        return nuxtApp._scope.run(() => callWithNuxt(nuxtApp, fn));
      }
      return callWithNuxt(nuxtApp, fn);
    },
    isHydrating: false,
    deferHydration() {
      if (!nuxtApp.isHydrating) {
        return () => {
        };
      }
      hydratingCount++;
      let called = false;
      return () => {
        if (called) {
          return;
        }
        called = true;
        hydratingCount--;
        if (hydratingCount === 0) {
          nuxtApp.isHydrating = false;
          return nuxtApp.callHook("app:suspense:resolve");
        }
      };
    },
    _asyncDataPromises: {},
    _asyncData: shallowReactive({}),
    _state: shallowReactive({}),
    _payloadRevivers: {},
    ...options2
  };
  {
    nuxtApp.payload.serverRendered = true;
  }
  if (nuxtApp.ssrContext) {
    nuxtApp.payload.path = nuxtApp.ssrContext.url;
    nuxtApp.ssrContext.nuxt = nuxtApp;
    nuxtApp.ssrContext.payload = nuxtApp.payload;
    nuxtApp.ssrContext.config = {
      public: nuxtApp.ssrContext.runtimeConfig.public,
      app: nuxtApp.ssrContext.runtimeConfig.app
    };
  }
  nuxtApp.hooks = createHooks();
  nuxtApp.hook = nuxtApp.hooks.hook;
  {
    const contextCaller = async function(hooks, args) {
      for (const hook of hooks) {
        await nuxtApp.runWithContext(() => hook(...args));
      }
    };
    nuxtApp.hooks.callHook = (name, ...args) => nuxtApp.hooks.callHookWith(contextCaller, name, args);
  }
  nuxtApp.callHook = nuxtApp.hooks.callHook;
  nuxtApp.provide = (name, value) => {
    const $name = "$" + name;
    defineGetter(nuxtApp, $name, value);
    defineGetter(nuxtApp.vueApp.config.globalProperties, $name, value);
  };
  defineGetter(nuxtApp.vueApp, "$nuxt", nuxtApp);
  defineGetter(nuxtApp.vueApp.config.globalProperties, "$nuxt", nuxtApp);
  const runtimeConfig = options2.ssrContext.runtimeConfig;
  nuxtApp.provide("config", runtimeConfig);
  return nuxtApp;
}
function registerPluginHooks(nuxtApp, plugin2) {
  if (plugin2.hooks) {
    nuxtApp.hooks.addHooks(plugin2.hooks);
  }
}
async function applyPlugin(nuxtApp, plugin2) {
  if (typeof plugin2 === "function") {
    const { provide: provide2 } = await nuxtApp.runWithContext(() => plugin2(nuxtApp)) || {};
    if (provide2 && typeof provide2 === "object") {
      for (const key in provide2) {
        nuxtApp.provide(key, provide2[key]);
      }
    }
  }
}
async function applyPlugins(nuxtApp, plugins2) {
  const resolvedPlugins = /* @__PURE__ */ new Set();
  const unresolvedPlugins = [];
  const parallels = [];
  let error2 = void 0;
  let promiseDepth = 0;
  async function executePlugin(plugin2) {
    const unresolvedPluginsForThisPlugin = plugin2.dependsOn?.filter((name) => plugins2.some((p) => p._name === name) && !resolvedPlugins.has(name)) ?? [];
    if (unresolvedPluginsForThisPlugin.length > 0) {
      unresolvedPlugins.push([new Set(unresolvedPluginsForThisPlugin), plugin2]);
    } else {
      const promise = applyPlugin(nuxtApp, plugin2).then(async () => {
        if (plugin2._name) {
          resolvedPlugins.add(plugin2._name);
          await Promise.all(unresolvedPlugins.map(async ([dependsOn, unexecutedPlugin]) => {
            if (dependsOn.has(plugin2._name)) {
              dependsOn.delete(plugin2._name);
              if (dependsOn.size === 0) {
                promiseDepth++;
                await executePlugin(unexecutedPlugin);
              }
            }
          }));
        }
      }).catch((e) => {
        if (!plugin2.parallel && !nuxtApp.payload.error) {
          throw e;
        }
        error2 ||= e;
      });
      if (plugin2.parallel) {
        parallels.push(promise);
      } else {
        await promise;
      }
    }
  }
  for (const plugin2 of plugins2) {
    if (nuxtApp.ssrContext?.islandContext && plugin2.env?.islands === false) {
      continue;
    }
    registerPluginHooks(nuxtApp, plugin2);
  }
  for (const plugin2 of plugins2) {
    if (nuxtApp.ssrContext?.islandContext && plugin2.env?.islands === false) {
      continue;
    }
    await executePlugin(plugin2);
  }
  await Promise.all(parallels);
  if (promiseDepth) {
    for (let i = 0; i < promiseDepth; i++) {
      await Promise.all(parallels);
    }
  }
  if (error2) {
    throw nuxtApp.payload.error || error2;
  }
}
// @__NO_SIDE_EFFECTS__
function defineNuxtPlugin(plugin2) {
  if (typeof plugin2 === "function") {
    return plugin2;
  }
  const _name = plugin2._name || plugin2.name;
  delete plugin2.name;
  return Object.assign(plugin2.setup || (() => {
  }), plugin2, { [NuxtPluginIndicator]: true, _name });
}
function callWithNuxt(nuxt, setup, args) {
  const fn = () => setup();
  const nuxtAppCtx = getNuxtAppCtx(nuxt._id);
  {
    return nuxt.vueApp.runWithContext(() => nuxtAppCtx.callAsync(nuxt, fn));
  }
}
function tryUseNuxtApp(id) {
  let nuxtAppInstance;
  if (hasInjectionContext()) {
    nuxtAppInstance = getCurrentInstance()?.appContext.app.$nuxt;
  }
  nuxtAppInstance ||= getNuxtAppCtx(id).tryUse();
  return nuxtAppInstance || null;
}
function useNuxtApp(id) {
  const nuxtAppInstance = tryUseNuxtApp(id);
  if (!nuxtAppInstance) {
    {
      throw new Error("[nuxt] instance unavailable");
    }
  }
  return nuxtAppInstance;
}
// @__NO_SIDE_EFFECTS__
function useRuntimeConfig(_event) {
  return useNuxtApp().$config;
}
function defineGetter(obj, key, val) {
  Object.defineProperty(obj, key, { get: () => val });
}
function defineAppConfig(config2) {
  return config2;
}
const LayoutMetaSymbol = /* @__PURE__ */ Symbol("layout-meta");
const PageRouteSymbol = /* @__PURE__ */ Symbol("route");
globalThis._importMeta_.url.replace(/\/app\/.*$/, "/");
const useRouter = () => {
  return useNuxtApp()?.$router;
};
const useRoute = () => {
  if (hasInjectionContext()) {
    return inject(PageRouteSymbol, useNuxtApp()._route);
  }
  return useNuxtApp()._route;
};
// @__NO_SIDE_EFFECTS__
function defineNuxtRouteMiddleware(middleware) {
  return middleware;
}
const isProcessingMiddleware = () => {
  try {
    if (useNuxtApp()._processingMiddleware) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
};
const HTML_ATTR_UNSAFE_RE = /[&"'<>]/g;
const HTML_ATTR_ENCODE_MAP = {
  "&": "%26",
  '"': "%22",
  "'": "%27",
  "<": "%3C",
  ">": "%3E"
};
function encodeForHtmlAttr(value) {
  return value.replace(HTML_ATTR_UNSAFE_RE, (c) => HTML_ATTR_ENCODE_MAP[c]);
}
const navigateTo = (to, options2) => {
  to ||= "/";
  const toPath = typeof to === "string" ? to : "path" in to ? resolveRouteObject(to) : useRouter().resolve(to).href;
  const isExternalHost = hasProtocol(toPath, { acceptRelative: true });
  const isExternal = options2?.external || isExternalHost;
  if (isExternal) {
    if (!options2?.external) {
      throw new Error("Navigating to an external URL is not allowed by default. Use `navigateTo(url, { external: true })`.");
    }
    const { protocol } = new URL(toPath, "http://localhost");
    if (protocol && isScriptProtocol(protocol)) {
      throw new Error(`Cannot navigate to a URL with '${protocol}' protocol.`);
    }
  }
  const inMiddleware = isProcessingMiddleware();
  const router = useRouter();
  const nuxtApp = useNuxtApp();
  {
    if (nuxtApp.ssrContext) {
      const fullPath = typeof to === "string" || isExternal ? toPath : router.resolve(to).fullPath || "/";
      const location2 = isExternal ? toPath : joinURL((/* @__PURE__ */ useRuntimeConfig()).app.baseURL, fullPath);
      const redirect = async function(response) {
        await nuxtApp.callHook("app:redirected");
        const encodedHeader = encodeURL(location2, isExternalHost);
        const encodedLoc = encodeForHtmlAttr(encodedHeader);
        nuxtApp.ssrContext["~renderResponse"] = {
          statusCode: sanitizeStatusCode(options2?.redirectCode || 302, 302),
          body: `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`,
          headers: { location: encodedHeader }
        };
        return response;
      };
      if (!isExternal && inMiddleware) {
        router.afterEach((final) => final.fullPath === fullPath ? redirect(false) : void 0);
        return to;
      }
      return redirect(!inMiddleware ? void 0 : (
        /* abort route navigation */
        false
      ));
    }
  }
  if (isExternal) {
    nuxtApp._scope.stop();
    if (options2?.replace) {
      (void 0).replace(toPath);
    } else {
      (void 0).href = toPath;
    }
    if (inMiddleware) {
      if (!nuxtApp.isHydrating) {
        return false;
      }
      return new Promise(() => {
      });
    }
    return Promise.resolve();
  }
  const encodedTo = typeof to === "string" ? encodeRoutePath(to) : to;
  return options2?.replace ? router.replace(encodedTo) : router.push(encodedTo);
};
function resolveRouteObject(to) {
  return withQuery(to.path || "", to.query || {}) + (to.hash || "");
}
function encodeURL(location2, isExternalHost = false) {
  const url = new URL(location2, "http://localhost");
  if (!isExternalHost) {
    const pathname = url.pathname.replace(/^\/{2,}/, "/");
    return pathname + url.search + url.hash;
  }
  if (location2.startsWith("//")) {
    return url.toString().replace(url.protocol, "");
  }
  return url.toString();
}
function encodeRoutePath(url) {
  const parsed = parseURL(url);
  return encodePath(decodePath(parsed.pathname)) + parsed.search + parsed.hash;
}
const NUXT_ERROR_SIGNATURE = "__nuxt_error";
const useError = /* @__NO_SIDE_EFFECTS__ */ () => toRef(useNuxtApp().payload, "error");
const showError = (error2) => {
  const nuxtError = createError(error2);
  try {
    const error22 = /* @__PURE__ */ useError();
    if (false) ;
    error22.value ||= nuxtError;
  } catch {
    throw nuxtError;
  }
  return nuxtError;
};
const isNuxtError = (error2) => !!error2 && typeof error2 === "object" && NUXT_ERROR_SIGNATURE in error2;
const createError = (error2) => {
  if (typeof error2 !== "string" && error2.statusText) {
    error2.message ??= error2.statusText;
  }
  const nuxtError = createError$1(error2);
  Object.defineProperty(nuxtError, NUXT_ERROR_SIGNATURE, {
    value: true,
    configurable: false,
    writable: false
  });
  Object.defineProperty(nuxtError, "status", {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    get: () => nuxtError.statusCode,
    configurable: true
  });
  Object.defineProperty(nuxtError, "statusText", {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    get: () => nuxtError.statusMessage,
    configurable: true
  });
  return nuxtError;
};
function freezeHead(head) {
  const realPush = head.push;
  head.push = () => ({ dispose: () => {
  }, patch: () => {
  }, _poll: () => {
  } });
  return () => {
    head.push = realPush;
  };
}
const unhead_PtamfB47yqQY_Rh4zjrimgYJkXOrkZ_s7Rhm1JWaAcQ = /* @__PURE__ */ defineNuxtPlugin({
  name: "nuxt:head",
  enforce: "pre",
  setup(nuxtApp) {
    const head = nuxtApp.ssrContext.head;
    if (nuxtApp.ssrContext.islandContext) {
      const unfreeze = freezeHead(head);
      nuxtApp.hooks.hookOnce("app:created", unfreeze);
    }
    nuxtApp.vueApp.use(head);
  }
});
function toArray(value) {
  return Array.isArray(value) ? value : [value];
}
const matcher = /* @__PURE__ */ (() => {
  const $0 = { prerender: true }, $1 = { payload: false };
  return (m, p) => {
    let r = [];
    if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
    if (p === "/__nuxt_content/docs/sql_dump.txt") {
      r.unshift({ data: $0 });
    }
    let s = p.split("/"), l = s.length;
    if (l > 1) {
      if (s[1] === "__nuxt_content") {
        r.unshift({ data: $1, params: { "_": s.slice(2).join("/") } });
      }
    }
    return r;
  };
})();
const _routeRulesMatcher = (path) => defu({}, ...matcher("", typeof path === "string" ? path.toLowerCase() : path).map((r) => r.data).reverse());
const routeRulesMatcher$1 = _routeRulesMatcher;
function getRouteRules(arg) {
  const path = typeof arg === "string" ? arg : arg.path;
  try {
    return routeRulesMatcher$1(path.toLowerCase());
  } catch (e) {
    console.error("[nuxt] Error matching route rules.", e);
    return {};
  }
}
const _routes = [
  {
    name: "index",
    path: "/",
    component: () => import('./index-yCAGl1nt.mjs').then((n) => n.i)
  }
];
const ROUTE_KEY_PARENTHESES_RE = /(:\w+)\([^)]+\)/g;
const ROUTE_KEY_SYMBOLS_RE = /(:\w+)[?+*]/g;
const ROUTE_KEY_NORMAL_RE = /:\w+/g;
function generateRouteKey(route) {
  const source = route?.meta.key ?? route.path.replace(ROUTE_KEY_PARENTHESES_RE, "$1").replace(ROUTE_KEY_SYMBOLS_RE, "$1").replace(ROUTE_KEY_NORMAL_RE, (r) => route.params[r.slice(1)]?.toString() || "");
  return typeof source === "function" ? source(route) : source;
}
function isChangingPage(to, from) {
  if (to === from || from === START_LOCATION) {
    return false;
  }
  if (generateRouteKey(to) !== generateRouteKey(from)) {
    return true;
  }
  const areComponentsSame = to.matched.every(
    (comp, index2) => comp.components && comp.components.default === from.matched[index2]?.components?.default
  );
  if (areComponentsSame) {
    return false;
  }
  return true;
}
const routerOptions0 = {
  scrollBehavior(to, from, savedPosition) {
    const nuxtApp = useNuxtApp();
    const hashScrollBehaviour = useRouter().options?.scrollBehaviorType ?? "auto";
    if (to.path.replace(/\/$/, "") === from.path.replace(/\/$/, "")) {
      if (from.hash && !to.hash) {
        return { left: 0, top: 0 };
      }
      if (to.hash) {
        return { el: to.hash, top: _getHashElementScrollMarginTop(to.hash), behavior: hashScrollBehaviour };
      }
      return false;
    }
    const routeAllowsScrollToTop = typeof to.meta.scrollToTop === "function" ? to.meta.scrollToTop(to, from) : to.meta.scrollToTop;
    if (routeAllowsScrollToTop === false) {
      return false;
    }
    if (from === START_LOCATION) {
      return _calculatePosition(to, from, savedPosition, hashScrollBehaviour);
    }
    return new Promise((resolve) => {
      const doScroll = () => {
        requestAnimationFrame(() => resolve(_calculatePosition(to, from, savedPosition, hashScrollBehaviour)));
      };
      nuxtApp.hooks.hookOnce("page:loading:end", () => {
        const transitionPromise = nuxtApp["~transitionPromise"];
        if (transitionPromise) {
          transitionPromise.then(doScroll);
        } else {
          doScroll();
        }
      });
    });
  }
};
function _getHashElementScrollMarginTop(selector) {
  try {
    const elem = (void 0).querySelector(selector);
    if (elem) {
      return (Number.parseFloat(getComputedStyle(elem).scrollMarginTop) || 0) + (Number.parseFloat(getComputedStyle((void 0).documentElement).scrollPaddingTop) || 0);
    }
  } catch {
  }
  return 0;
}
function _calculatePosition(to, from, savedPosition, defaultHashScrollBehaviour) {
  if (savedPosition) {
    return savedPosition;
  }
  if (to.hash) {
    return {
      el: to.hash,
      top: _getHashElementScrollMarginTop(to.hash),
      behavior: isChangingPage(to, from) ? defaultHashScrollBehaviour : "instant"
    };
  }
  return {
    left: 0,
    top: 0
  };
}
const configRouterOptions = {
  hashMode: false,
  scrollBehaviorType: "auto"
};
const routerOptions = {
  ...configRouterOptions,
  ...routerOptions0
};
const validate = /* @__PURE__ */ defineNuxtRouteMiddleware(async (to, from) => {
  let __temp, __restore;
  if (!to.meta?.validate) {
    return;
  }
  const result = ([__temp, __restore] = executeAsync(() => Promise.resolve(to.meta.validate(to))), __temp = await __temp, __restore(), __temp);
  if (result === true) {
    return;
  }
  const error2 = createError({
    fatal: false,
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    status: result && (result.status || result.statusCode) || 404,
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    statusText: result && (result.statusText || result.statusMessage) || `Page Not Found: ${to.fullPath}`,
    data: {
      path: to.fullPath
    }
  });
  return error2;
});
const manifest_45route_45rule = /* @__PURE__ */ defineNuxtRouteMiddleware((to) => {
  {
    return;
  }
});
const globalMiddleware = [
  validate,
  manifest_45route_45rule
];
const namedMiddleware = {};
Object.assign(/* @__PURE__ */ Object.create(null), {});
const pageIslandRoutes = Object.assign(/* @__PURE__ */ Object.create(null), {});
const plugin = /* @__PURE__ */ defineNuxtPlugin({
  name: "nuxt:router",
  enforce: "pre",
  async setup(nuxtApp) {
    let __temp, __restore;
    let routerBase = (/* @__PURE__ */ useRuntimeConfig()).app.baseURL;
    const history = routerOptions.history?.(routerBase) ?? createMemoryHistory(routerBase);
    const routes2 = routerOptions.routes ? ([__temp, __restore] = executeAsync(() => routerOptions.routes(_routes)), __temp = await __temp, __restore(), __temp) ?? _routes : _routes;
    let startPosition;
    const router = createRouter({
      ...routerOptions,
      scrollBehavior: (to, from, savedPosition) => {
        if (from === START_LOCATION) {
          startPosition = savedPosition;
          return;
        }
        if (routerOptions.scrollBehavior) {
          router.options.scrollBehavior = routerOptions.scrollBehavior;
          if ("scrollRestoration" in (void 0).history) {
            const unsub = router.beforeEach(() => {
              unsub();
              (void 0).history.scrollRestoration = "manual";
            });
          }
          return routerOptions.scrollBehavior(to, START_LOCATION, startPosition || savedPosition);
        }
      },
      history,
      routes: routes2
    });
    nuxtApp.vueApp.use(router);
    const previousRoute = shallowRef(router.currentRoute.value);
    router.afterEach((_to, from) => {
      previousRoute.value = from;
    });
    Object.defineProperty(nuxtApp.vueApp.config.globalProperties, "previousRoute", {
      get: () => previousRoute.value
    });
    const initialURL = nuxtApp.ssrContext.url;
    const _route = shallowRef(router.currentRoute.value);
    const syncCurrentRoute = () => {
      _route.value = router.currentRoute.value;
    };
    router.afterEach((to, from) => {
      const lastTo = to.matched.at(-1)?.components?.default;
      const lastFrom = from.matched.at(-1)?.components?.default;
      if (lastTo === lastFrom) {
        syncCurrentRoute();
        return;
      }
      if (to.matched.length < from.matched.length && to.matched.every((m, i) => m.components?.default === from.matched[i]?.components?.default)) {
        syncCurrentRoute();
      }
    });
    const route = { sync: syncCurrentRoute };
    for (const key in _route.value) {
      Object.defineProperty(route, key, {
        get: () => _route.value[key],
        enumerable: true
      });
    }
    nuxtApp._route = shallowReactive(route);
    nuxtApp._middleware ||= {
      global: [],
      named: {}
    };
    const error2 = /* @__PURE__ */ useError();
    const isServerPage = nuxtApp.ssrContext?.islandContext?.name?.startsWith("page_");
    if (!nuxtApp.ssrContext?.islandContext || isServerPage) {
      router.afterEach(async (to, _from, failure) => {
        delete nuxtApp._processingMiddleware;
        if (failure) {
          await nuxtApp.callHook("page:loading:end");
        }
        if (failure?.type === 4) {
          return;
        }
        if (to.redirectedFrom && to.fullPath !== initialURL) {
          await nuxtApp.runWithContext(() => navigateTo(to.fullPath || "/"));
        }
      });
    }
    try {
      if (true) {
        ;
        [__temp, __restore] = executeAsync(() => router.push(initialURL)), await __temp, __restore();
        ;
      }
      ;
      [__temp, __restore] = executeAsync(() => router.isReady()), await __temp, __restore();
      ;
    } catch (error22) {
      [__temp, __restore] = executeAsync(() => nuxtApp.runWithContext(() => showError(error22))), await __temp, __restore();
    }
    const resolvedInitialRoute = router.currentRoute.value;
    const hasDeferredRoute = false;
    syncCurrentRoute();
    if (nuxtApp.ssrContext?.islandContext && !isServerPage) {
      return { provide: { router } };
    }
    const initialLayout = nuxtApp.payload.state._layout;
    router.beforeEach(async (to, from) => {
      await nuxtApp.callHook("page:loading:start");
      to.meta = reactive(to.meta);
      if (nuxtApp.isHydrating && initialLayout && !isReadonly(to.meta.layout)) {
        to.meta.layout = initialLayout;
      }
      nuxtApp._processingMiddleware = true;
      if (!nuxtApp.ssrContext?.islandContext || isServerPage) {
        const middlewareEntries = /* @__PURE__ */ new Set([...globalMiddleware, ...nuxtApp._middleware.global]);
        for (const component of to.matched) {
          const componentMiddleware = component.meta.middleware;
          if (!componentMiddleware) {
            continue;
          }
          for (const entry2 of toArray(componentMiddleware)) {
            middlewareEntries.add(entry2);
          }
        }
        const routeRules = getRouteRules({ path: to.path });
        if (routeRules.appMiddleware) {
          for (const key in routeRules.appMiddleware) {
            if (routeRules.appMiddleware[key]) {
              middlewareEntries.add(key);
            } else {
              middlewareEntries.delete(key);
            }
          }
        }
        for (const entry2 of middlewareEntries) {
          const middleware = typeof entry2 === "string" ? nuxtApp._middleware.named[entry2] || await namedMiddleware[entry2]?.().then((r) => r.default || r) : entry2;
          if (!middleware) {
            throw new Error(`Unknown route middleware: '${entry2}'.`);
          }
          try {
            if (false) ;
            const result = await nuxtApp.runWithContext(() => middleware(to, from));
            if (true) {
              if (result === false || result instanceof Error) {
                const error22 = result || createError({
                  status: 404,
                  statusText: `Page Not Found: ${initialURL}`
                });
                await nuxtApp.runWithContext(() => showError(error22));
                return false;
              }
            }
            if (result === true) {
              continue;
            }
            if (result === false) {
              return result;
            }
            if (result) {
              if (isNuxtError(result) && result.fatal) {
                await nuxtApp.runWithContext(() => showError(result));
              }
              return result;
            }
          } catch (err) {
            const error22 = createError(err);
            if (error22.fatal) {
              await nuxtApp.runWithContext(() => showError(error22));
            }
            return error22;
          }
        }
      }
    });
    if (isServerPage) {
      router.beforeResolve((to) => {
        const expected = pageIslandRoutes[nuxtApp.ssrContext.islandContext.name];
        const actual = to.matched.find((m) => m.components?.default?.__nuxt_island)?.components?.default;
        if (!expected || expected !== actual?.__nuxt_island) {
          nuxtApp.ssrContext["~renderResponse"] = {
            statusCode: 400,
            statusMessage: "Invalid island request path"
          };
          return false;
        }
      });
    }
    router.onError(async () => {
      delete nuxtApp._processingMiddleware;
      await nuxtApp.callHook("page:loading:end");
    });
    router.afterEach((to) => {
      if (to.matched.length === 0 && !error2.value) {
        return nuxtApp.runWithContext(() => showError(createError({
          status: 404,
          fatal: false,
          statusText: `Page not found: ${to.fullPath}`,
          data: {
            path: to.fullPath
          }
        })));
      }
    });
    nuxtApp.hooks.hookOnce("app:created", async () => {
      try {
        if ("name" in resolvedInitialRoute) {
          resolvedInitialRoute.name = void 0;
        }
        if (hasDeferredRoute) ;
        else {
          await router.replace({
            ...resolvedInitialRoute,
            force: true
          });
        }
        router.options.scrollBehavior = routerOptions.scrollBehavior;
      } catch (error22) {
        await nuxtApp.runWithContext(() => showError(error22));
      }
    });
    return { provide: { router } };
  }
});
function injectHead(nuxtApp) {
  const nuxt = nuxtApp || useNuxtApp();
  return nuxt.ssrContext?.head || nuxt.runWithContext(() => {
    if (hasInjectionContext()) {
      const head = inject(headSymbol);
      if (!head) {
        throw new Error("[nuxt] [unhead] Missing Unhead instance.");
      }
      return head;
    }
  });
}
function useHead(input, options2 = {}) {
  const head = options2.head || injectHead(options2.nuxt);
  return useHead$1(input, { head, ...options2 });
}
function definePayloadReducer(name, reduce) {
  {
    useNuxtApp().ssrContext["~payloadReducers"][name] = reduce;
  }
}
const reducers = [
  ["NuxtError", (data) => isNuxtError(data) && data.toJSON()],
  ["EmptyShallowRef", (data) => isRef(data) && isShallow(data) && !data.value && (typeof data.value === "bigint" ? "0n" : JSON.stringify(data.value) || "_")],
  ["EmptyRef", (data) => isRef(data) && !data.value && (typeof data.value === "bigint" ? "0n" : JSON.stringify(data.value) || "_")],
  ["ShallowRef", (data) => isRef(data) && isShallow(data) && data.value],
  ["ShallowReactive", (data) => isReactive(data) && isShallow(data) && toRaw(data)],
  ["Ref", (data) => isRef(data) && data.value],
  ["Reactive", (data) => isReactive(data) && toRaw(data)]
];
const revive_payload_server_Ws8SUMTo68XWM_TEhuJIQbORo_qC7bnyjJcGdGVwAYw = /* @__PURE__ */ defineNuxtPlugin({
  name: "nuxt:revive-payload:server",
  setup() {
    for (const [reducer, fn] of reducers) {
      definePayloadReducer(reducer, fn);
    }
  }
});
const preference = "system";
const useStateKeyPrefix = "$s";
function useState(...args) {
  const autoKey = typeof args[args.length - 1] === "string" ? args.pop() : void 0;
  if (typeof args[0] !== "string") {
    args.unshift(autoKey);
  }
  const [_key, init] = args;
  if (!_key || typeof _key !== "string") {
    throw new TypeError("[nuxt] [useState] key must be a string: " + _key);
  }
  if (init !== void 0 && typeof init !== "function") {
    throw new Error("[nuxt] [useState] init must be a function: " + init);
  }
  const key = useStateKeyPrefix + _key;
  const nuxtApp = useNuxtApp();
  const state2 = toRef(nuxtApp.payload.state, key);
  if (init) {
    nuxtApp._state[key] ??= { _default: init };
  }
  if (state2.value === void 0 && init) {
    const initialValue = init();
    if (isRef(initialValue)) {
      nuxtApp.payload.state[key] = initialValue;
      return initialValue;
    }
    state2.value = initialValue;
  }
  return state2;
}
const plugin_server_nK_9z5G7Z_6JYbC0S1a1AruOe3jN3cdaGteeNbXx_T4 = /* @__PURE__ */ defineNuxtPlugin((nuxtApp) => {
  const colorMode = nuxtApp.ssrContext?.islandContext ? ref({}).value : useState("color-mode", () => reactive({
    preference,
    value: preference,
    unknown: true,
    forced: false
  })).value;
  const htmlAttrs = {};
  useHead({ htmlAttrs });
  useRouter().afterEach((to) => {
    const forcedColorMode = to.meta.colorMode;
    if (forcedColorMode && forcedColorMode !== "system") {
      htmlAttrs["data-color-mode-forced"] = forcedColorMode;
      colorMode.value = forcedColorMode;
      colorMode.forced = true;
    } else if (forcedColorMode === "system") {
      console.warn("You cannot force the colorMode to system at the page level.");
    }
  });
  nuxtApp.provide("colorMode", colorMode);
});
const cfg0 = defineAppConfig({
  "ui": {
    // Engine-lit glass treatment for every card on the site.
    "card": {
      "slots": {
        "body": "p-4 sm:p-6",
        "footer": "p-4 sm:px-6",
        "header": "p-4 sm:px-6",
        "root": "iridis-card rounded-2xl"
      }
    },
    "button": {
      "variants": {
        "solid": "text-[var(--ui-primary-contrast,white)] dark:text-[var(--ui-primary-contrast,gray-900)]"
      }
    }
  }
});
const inlineConfig = {
  "nuxt": {},
  "ui": {
    "colors": {
      "primary": "green",
      "secondary": "blue",
      "success": "green",
      "info": "blue",
      "warning": "yellow",
      "error": "red",
      "neutral": "slate"
    },
    "icons": {
      "arrowDown": "i-lucide-arrow-down",
      "arrowLeft": "i-lucide-arrow-left",
      "arrowRight": "i-lucide-arrow-right",
      "arrowUp": "i-lucide-arrow-up",
      "caution": "i-lucide-circle-alert",
      "check": "i-lucide-check",
      "chevronDoubleLeft": "i-lucide-chevrons-left",
      "chevronDoubleRight": "i-lucide-chevrons-right",
      "chevronDown": "i-lucide-chevron-down",
      "chevronLeft": "i-lucide-chevron-left",
      "chevronRight": "i-lucide-chevron-right",
      "chevronUp": "i-lucide-chevron-up",
      "close": "i-lucide-x",
      "copy": "i-lucide-copy",
      "copyCheck": "i-lucide-copy-check",
      "dark": "i-lucide-moon",
      "drag": "i-lucide-grip-vertical",
      "ellipsis": "i-lucide-ellipsis",
      "error": "i-lucide-circle-x",
      "external": "i-lucide-arrow-up-right",
      "eye": "i-lucide-eye",
      "eyeOff": "i-lucide-eye-off",
      "file": "i-lucide-file",
      "folder": "i-lucide-folder",
      "folderOpen": "i-lucide-folder-open",
      "hash": "i-lucide-hash",
      "info": "i-lucide-info",
      "light": "i-lucide-sun",
      "loading": "i-lucide-loader-circle",
      "menu": "i-lucide-menu",
      "minus": "i-lucide-minus",
      "panelClose": "i-lucide-panel-left-close",
      "panelOpen": "i-lucide-panel-left-open",
      "plus": "i-lucide-plus",
      "reload": "i-lucide-rotate-ccw",
      "search": "i-lucide-search",
      "stop": "i-lucide-square",
      "success": "i-lucide-circle-check",
      "system": "i-lucide-monitor",
      "tip": "i-lucide-lightbulb",
      "upload": "i-lucide-upload",
      "warning": "i-lucide-triangle-alert"
    },
    "tv": {
      "twMergeConfig": {}
    }
  },
  "__swiper": {
    "bundled": true
  },
  "icon": {
    "provider": "server",
    "class": "",
    "aliases": {},
    "iconifyApiEndpoint": "https://api.iconify.design",
    "localApiEndpoint": "/api/_nuxt_icon",
    "fallbackToApi": true,
    "cssSelectorPrefix": "i-",
    "cssWherePseudo": true,
    "cssLayer": "base",
    "mode": "css",
    "attrs": {
      "aria-hidden": true
    },
    "collections": [
      "academicons",
      "akar-icons",
      "ant-design",
      "arcticons",
      "basil",
      "bi",
      "bitcoin-icons",
      "bpmn",
      "brandico",
      "bx",
      "bxl",
      "bxs",
      "bytesize",
      "carbon",
      "catppuccin",
      "cbi",
      "charm",
      "ci",
      "cib",
      "cif",
      "cil",
      "circle-flags",
      "circum",
      "clarity",
      "codex",
      "codicon",
      "covid",
      "cryptocurrency",
      "cryptocurrency-color",
      "cuida",
      "dashicons",
      "devicon",
      "devicon-plain",
      "dinkie-icons",
      "duo-icons",
      "ei",
      "el",
      "emojione",
      "emojione-monotone",
      "emojione-v1",
      "entypo",
      "entypo-social",
      "eos-icons",
      "ep",
      "et",
      "eva",
      "f7",
      "fa",
      "fa-brands",
      "fa-regular",
      "fa-solid",
      "fa6-brands",
      "fa6-regular",
      "fa6-solid",
      "fa7-brands",
      "fa7-regular",
      "fa7-solid",
      "fad",
      "famicons",
      "fe",
      "feather",
      "file-icons",
      "flag",
      "flagpack",
      "flat-color-icons",
      "flat-ui",
      "flowbite",
      "fluent",
      "fluent-color",
      "fluent-emoji",
      "fluent-emoji-flat",
      "fluent-emoji-high-contrast",
      "fluent-mdl2",
      "fontelico",
      "fontisto",
      "formkit",
      "foundation",
      "fxemoji",
      "gala",
      "game-icons",
      "garden",
      "geo",
      "gg",
      "gis",
      "gravity-ui",
      "gridicons",
      "grommet-icons",
      "guidance",
      "healthicons",
      "heroicons",
      "heroicons-outline",
      "heroicons-solid",
      "hugeicons",
      "humbleicons",
      "ic",
      "icomoon-free",
      "icon-park",
      "icon-park-outline",
      "icon-park-solid",
      "icon-park-twotone",
      "iconamoon",
      "iconoir",
      "icons8",
      "il",
      "ion",
      "iwwa",
      "ix",
      "jam",
      "la",
      "lets-icons",
      "line-md",
      "lineicons",
      "logos",
      "ls",
      "lsicon",
      "lucide",
      "lucide-lab",
      "mage",
      "majesticons",
      "maki",
      "map",
      "marketeq",
      "material-icon-theme",
      "material-symbols",
      "material-symbols-light",
      "mdi",
      "mdi-light",
      "medical-icon",
      "memory",
      "meteocons",
      "meteor-icons",
      "mi",
      "mingcute",
      "mono-icons",
      "mynaui",
      "nimbus",
      "nonicons",
      "noto",
      "noto-v1",
      "nrk",
      "octicon",
      "oi",
      "ooui",
      "openmoji",
      "oui",
      "pajamas",
      "pepicons",
      "pepicons-pencil",
      "pepicons-pop",
      "pepicons-print",
      "ph",
      "picon",
      "pixel",
      "pixelarticons",
      "prime",
      "proicons",
      "ps",
      "qlementine-icons",
      "quill",
      "radix-icons",
      "raphael",
      "ri",
      "rivet-icons",
      "roentgen",
      "si",
      "si-glyph",
      "sidekickicons",
      "simple-icons",
      "simple-line-icons",
      "skill-icons",
      "solar",
      "stash",
      "streamline",
      "streamline-block",
      "streamline-color",
      "streamline-cyber",
      "streamline-cyber-color",
      "streamline-emojis",
      "streamline-flex",
      "streamline-flex-color",
      "streamline-freehand",
      "streamline-freehand-color",
      "streamline-kameleon-color",
      "streamline-logos",
      "streamline-pixel",
      "streamline-plump",
      "streamline-plump-color",
      "streamline-sharp",
      "streamline-sharp-color",
      "streamline-stickies-color",
      "streamline-ultimate",
      "streamline-ultimate-color",
      "subway",
      "svg-spinners",
      "system-uicons",
      "tabler",
      "tdesign",
      "teenyicons",
      "temaki",
      "token",
      "token-branded",
      "topcoat",
      "twemoji",
      "typcn",
      "uil",
      "uim",
      "uis",
      "uit",
      "uiw",
      "unjs",
      "vaadin",
      "vs",
      "vscode-icons",
      "websymbol",
      "weui",
      "whh",
      "wi",
      "wpf",
      "zmdi",
      "zondicons"
    ],
    "fetchTimeout": 1500
  }
};
const appConfig = /* @__PURE__ */ defuFn(cfg0, inlineConfig);
function useAppConfig() {
  const nuxtApp = useNuxtApp();
  nuxtApp._appConfig ||= klona(appConfig);
  return nuxtApp._appConfig;
}
const plugin_c515ayiLuocRMvhGInzV4Ci6HK9AGMOPyzAKHLWV3Qg = /* @__PURE__ */ defineNuxtPlugin({
  name: "@nuxt/icon",
  setup() {
    const configs = /* @__PURE__ */ useRuntimeConfig();
    const options2 = useAppConfig().icon;
    _api.setFetch($fetch.native);
    const resources = [];
    if (options2.provider === "server") {
      const baseURL2 = configs.app?.baseURL?.replace(/\/$/, "") ?? "";
      resources.push(baseURL2 + (options2.localApiEndpoint || "/api/_nuxt_icon"));
      if (options2.fallbackToApi === true || options2.fallbackToApi === "client-only") {
        resources.push(options2.iconifyApiEndpoint);
      }
    } else if (options2.provider === "none") {
      _api.setFetch(() => Promise.resolve(new Response()));
    } else {
      resources.push(options2.iconifyApiEndpoint);
    }
    async function customIconLoader(icons, prefix) {
      try {
        const data = await $fetch(resources[0] + "/" + prefix + ".json", {
          query: {
            icons: icons.join(",")
          }
        });
        if (!data || data.prefix !== prefix || !data.icons)
          throw new Error("Invalid data" + JSON.stringify(data));
        return data;
      } catch (e) {
        console.error("Failed to load custom icons", e);
        return null;
      }
    }
    addAPIProvider("", { resources });
    for (const prefix of options2.customCollections || []) {
      if (prefix)
        setCustomIconsLoader(customIconLoader, prefix);
    }
  }
  // For type portability
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
});
const LazyProseA = defineAsyncComponent(() => import('./A-Cdt9omAc.mjs').then((r) => r["default"] || r.default || r));
const LazyProseAccordion = defineAsyncComponent(() => import('./Accordion-CdAAQbJX.mjs').then((r) => r["default"] || r.default || r));
const LazyProseAccordionItem = defineAsyncComponent(() => import('./AccordionItem-Dq4CrJJa.mjs').then((r) => r["default"] || r.default || r));
const LazyProseBadge = defineAsyncComponent(() => import('./Badge-DySaxezU.mjs').then((r) => r["default"] || r.default || r));
const LazyProseBlockquote = defineAsyncComponent(() => import('./Blockquote-CVzzCwfi.mjs').then((r) => r["default"] || r.default || r));
const LazyProseCallout = defineAsyncComponent(() => import('./Callout-BK8-v7tf.mjs').then((r) => r["default"] || r.default || r));
const LazyProseCard = defineAsyncComponent(() => import('./Card-CEUOlM04.mjs').then((r) => r["default"] || r.default || r));
const LazyProseCardGroup = defineAsyncComponent(() => import('./CardGroup-BuoD06y8.mjs').then((r) => r["default"] || r.default || r));
const LazyProseCode = defineAsyncComponent(() => import('./Code-Ki1kiYCx.mjs').then((r) => r["default"] || r.default || r));
const LazyProseCodeCollapse = defineAsyncComponent(() => import('./CodeCollapse-DKnO11bl.mjs').then((r) => r["default"] || r.default || r));
const LazyProseCodeGroup = defineAsyncComponent(() => import('./CodeGroup-BpK1HAGL.mjs').then((r) => r["default"] || r.default || r));
const LazyProseCodeIcon = defineAsyncComponent(() => import('./CodeIcon-DUPBU4Dg.mjs').then((r) => r["default"] || r.default || r));
const LazyProseCodePreview = defineAsyncComponent(() => import('./CodePreview-E0UyEANI.mjs').then((r) => r["default"] || r.default || r));
const LazyProseCodeTree = defineAsyncComponent(() => import('./CodeTree-DUeSjGV2.mjs').then((r) => r["default"] || r.default || r));
const LazyProseCollapsible = defineAsyncComponent(() => import('./Collapsible-BFGch9Up.mjs').then((r) => r["default"] || r.default || r));
const LazyProseEm = defineAsyncComponent(() => import('./Em-Xxv4gmOP.mjs').then((r) => r["default"] || r.default || r));
const LazyProseField = defineAsyncComponent(() => import('./Field-BMcDhIbd.mjs').then((r) => r["default"] || r.default || r));
const LazyProseFieldGroup = defineAsyncComponent(() => import('./FieldGroup-DHtSTnPv.mjs').then((r) => r["default"] || r.default || r));
const LazyProseH1 = defineAsyncComponent(() => import('./H1-DDL_qiEc.mjs').then((r) => r["default"] || r.default || r));
const LazyProseH2 = defineAsyncComponent(() => import('./H2-BqQNOrs3.mjs').then((r) => r["default"] || r.default || r));
const LazyProseH3 = defineAsyncComponent(() => import('./H3-BIXqpSsS.mjs').then((r) => r["default"] || r.default || r));
const LazyProseH4 = defineAsyncComponent(() => import('./H4-Bok2iNza.mjs').then((r) => r["default"] || r.default || r));
const LazyProseHr = defineAsyncComponent(() => import('./Hr-BXCn8AR4.mjs').then((r) => r["default"] || r.default || r));
const LazyProseIcon = defineAsyncComponent(() => import('./Icon-Da1zfyz1.mjs').then((r) => r["default"] || r.default || r));
const LazyProseImg = defineAsyncComponent(() => import('./Img-BR655PuW.mjs').then((r) => r["default"] || r.default || r));
const LazyProseKbd = defineAsyncComponent(() => import('./Kbd-BsmbME9H.mjs').then((r) => r["default"] || r.default || r));
const LazyProseLi = defineAsyncComponent(() => import('./Li-CAyeLsvY.mjs').then((r) => r["default"] || r.default || r));
const LazyProseOl = defineAsyncComponent(() => import('./Ol-BhAV6GC5.mjs').then((r) => r["default"] || r.default || r));
const LazyProseP = defineAsyncComponent(() => import('./P-DsKA-zEx.mjs').then((r) => r["default"] || r.default || r));
const LazyProsePrompt = defineAsyncComponent(() => import('./Prompt-DISJxRtk.mjs').then((r) => r["default"] || r.default || r));
const LazyProseScript = defineAsyncComponent(() => import('./Script-Bgpuk461.mjs').then((r) => r["default"] || r.default || r));
const LazyProseSteps = defineAsyncComponent(() => import('./Steps-B3-dIi2Q.mjs').then((r) => r["default"] || r.default || r));
const LazyProseStrong = defineAsyncComponent(() => import('./Strong-BRGdGlhL.mjs').then((r) => r["default"] || r.default || r));
const LazyProseTable = defineAsyncComponent(() => import('./Table-HBNe5Dww.mjs').then((r) => r["default"] || r.default || r));
const LazyProseTabs = defineAsyncComponent(() => import('./Tabs-BOmcJd0S.mjs').then((r) => r["default"] || r.default || r));
const LazyProseTabsItem = defineAsyncComponent(() => import('./TabsItem-Dknj15cw.mjs').then((r) => r["default"] || r.default || r));
const LazyProseTbody = defineAsyncComponent(() => import('./Tbody-DGv3F__9.mjs').then((r) => r["default"] || r.default || r));
const LazyProseTd = defineAsyncComponent(() => import('./Td-FaZq1BTQ.mjs').then((r) => r["default"] || r.default || r));
const LazyProseTh = defineAsyncComponent(() => import('./Th-BYgWs1Ij.mjs').then((r) => r["default"] || r.default || r));
const LazyProseThead = defineAsyncComponent(() => import('./Thead-DyItEA3A.mjs').then((r) => r["default"] || r.default || r));
const LazyProseTr = defineAsyncComponent(() => import('./Tr-eXSAzNJZ.mjs').then((r) => r["default"] || r.default || r));
const LazyProseUl = defineAsyncComponent(() => import('./Ul-BMtWsAFD.mjs').then((r) => r["default"] || r.default || r));
const LazyProseCaution = defineAsyncComponent(() => import('./Caution-CuqVi9JB.mjs').then((r) => r["default"] || r.default || r));
const LazyProseNote = defineAsyncComponent(() => import('./Note-Bx3L3fHb.mjs').then((r) => r["default"] || r.default || r));
const LazyProseTip = defineAsyncComponent(() => import('./Tip-B0GpNBkr.mjs').then((r) => r["default"] || r.default || r));
const LazyProseWarning = defineAsyncComponent(() => import('./Warning-ChnqPUfT.mjs').then((r) => r["default"] || r.default || r));
const LazyProseH5 = defineAsyncComponent(() => import('./ProseH5-BTkfMiLg.mjs').then((r) => r["default"] || r.default || r));
const LazyProseH6 = defineAsyncComponent(() => import('./ProseH6-DoiaTlXJ.mjs').then((r) => r["default"] || r.default || r));
const LazyIcon = defineAsyncComponent(() => Promise.resolve().then(() => index).then((r) => r["default"] || r.default || r));
const lazyGlobalComponents = [
  ["ProseA", LazyProseA],
  ["ProseAccordion", LazyProseAccordion],
  ["ProseAccordionItem", LazyProseAccordionItem],
  ["ProseBadge", LazyProseBadge],
  ["ProseBlockquote", LazyProseBlockquote],
  ["ProseCallout", LazyProseCallout],
  ["ProseCard", LazyProseCard],
  ["ProseCardGroup", LazyProseCardGroup],
  ["ProseCode", LazyProseCode],
  ["ProseCodeCollapse", LazyProseCodeCollapse],
  ["ProseCodeGroup", LazyProseCodeGroup],
  ["ProseCodeIcon", LazyProseCodeIcon],
  ["ProseCodePreview", LazyProseCodePreview],
  ["ProseCodeTree", LazyProseCodeTree],
  ["ProseCollapsible", LazyProseCollapsible],
  ["ProseEm", LazyProseEm],
  ["ProseField", LazyProseField],
  ["ProseFieldGroup", LazyProseFieldGroup],
  ["ProseH1", LazyProseH1],
  ["ProseH2", LazyProseH2],
  ["ProseH3", LazyProseH3],
  ["ProseH4", LazyProseH4],
  ["ProseHr", LazyProseHr],
  ["ProseIcon", LazyProseIcon],
  ["ProseImg", LazyProseImg],
  ["ProseKbd", LazyProseKbd],
  ["ProseLi", LazyProseLi],
  ["ProseOl", LazyProseOl],
  ["ProseP", LazyProseP],
  ["ProsePrompt", LazyProsePrompt],
  ["ProseScript", LazyProseScript],
  ["ProseSteps", LazyProseSteps],
  ["ProseStrong", LazyProseStrong],
  ["ProseTable", LazyProseTable],
  ["ProseTabs", LazyProseTabs],
  ["ProseTabsItem", LazyProseTabsItem],
  ["ProseTbody", LazyProseTbody],
  ["ProseTd", LazyProseTd],
  ["ProseTh", LazyProseTh],
  ["ProseThead", LazyProseThead],
  ["ProseTr", LazyProseTr],
  ["ProseUl", LazyProseUl],
  ["ProseCaution", LazyProseCaution],
  ["ProseNote", LazyProseNote],
  ["ProseTip", LazyProseTip],
  ["ProseWarning", LazyProseWarning],
  ["ProseH5", LazyProseH5],
  ["ProseH6", LazyProseH6],
  ["Icon", LazyIcon]
];
const components_plugin_4kY4pyzJIYX99vmMAAIorFf3CnAaptHitJgf7JxiED8 = /* @__PURE__ */ defineNuxtPlugin({
  name: "nuxt:global-components",
  setup(nuxtApp) {
    for (const [name, component] of lazyGlobalComponents) {
      nuxtApp.vueApp.component(name, component);
      nuxtApp.vueApp.component("Lazy" + name, component);
    }
  }
});
const parents = /* @__PURE__ */ new Set();
const coords = /* @__PURE__ */ new WeakMap();
const siblings = /* @__PURE__ */ new WeakMap();
const animations = /* @__PURE__ */ new WeakMap();
const intersections = /* @__PURE__ */ new WeakMap();
const mutationObservers = /* @__PURE__ */ new WeakMap();
const intervals = /* @__PURE__ */ new WeakMap();
const options = /* @__PURE__ */ new WeakMap();
const debounces = /* @__PURE__ */ new WeakMap();
const enabled = /* @__PURE__ */ new WeakSet();
function forEach(parent, ...callbacks) {
  callbacks.forEach((callback) => callback(parent, options.has(parent)));
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children.item(i);
    if (child) {
      callbacks.forEach((callback) => callback(child, options.has(child)));
    }
  }
}
function autoAnimate(el, config2 = {}) {
  const controller = Object.freeze({
    parent: el,
    enable: () => {
      enabled.add(el);
    },
    disable: () => {
      enabled.delete(el);
      forEach(el, (node) => {
        const a = animations.get(node);
        try {
          a === null || a === void 0 ? void 0 : a.cancel();
        } catch {
        }
        animations.delete(node);
        const d = debounces.get(node);
        if (d)
          clearTimeout(d);
        debounces.delete(node);
        const i = intervals.get(node);
        if (i)
          clearInterval(i);
        intervals.delete(node);
      });
    },
    isEnabled: () => enabled.has(el),
    destroy: () => {
      enabled.delete(el);
      parents.delete(el);
      options.delete(el);
      const mo = mutationObservers.get(el);
      mo === null || mo === void 0 ? void 0 : mo.disconnect();
      mutationObservers.delete(el);
      forEach(el, (node) => {
        const a = animations.get(node);
        try {
          a === null || a === void 0 ? void 0 : a.cancel();
        } catch {
        }
        animations.delete(node);
        const io = intersections.get(node);
        io === null || io === void 0 ? void 0 : io.disconnect();
        intersections.delete(node);
        const i = intervals.get(node);
        if (i)
          clearInterval(i);
        intervals.delete(node);
        const d = debounces.get(node);
        if (d)
          clearTimeout(d);
        debounces.delete(node);
        coords.delete(node);
        siblings.delete(node);
      });
    }
  });
  return controller;
}
const vAutoAnimate$1 = {
  mounted: (el, binding) => {
    const ctl = autoAnimate(el, binding.value || {});
    Object.defineProperty(el, "__aa_ctl", { value: ctl, configurable: true });
  },
  unmounted: (el) => {
    var _a;
    const ctl = el["__aa_ctl"];
    (_a = ctl === null || ctl === void 0 ? void 0 : ctl.destroy) === null || _a === void 0 ? void 0 : _a.call(ctl);
    try {
      delete el["__aa_ctl"];
    } catch {
    }
  },
  getSSRProps: () => ({})
};
const vAutoAnimate = vAutoAnimate$1;
const plugin_rNd_9wmZjysjAGonfdtole0dRPomKgAKHntslWXR7_M = /* @__PURE__ */ defineNuxtPlugin((app) => {
  app.vueApp.directive("auto-animate", vAutoAnimate);
});
const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
function getColor(color, shade) {
  if (color in colors && typeof colors[color] === "object" && shade in colors[color]) {
    return colors[color][shade];
  }
  return "";
}
function generateShades(key, value, prefix) {
  const prefixStr = prefix ? `${prefix}-` : "";
  return `${shades.map((shade) => `--ui-color-${key}-${shade}: var(--${prefixStr}color-${value === "neutral" ? "old-neutral" : value}-${shade}, ${getColor(value, shade)});`).join("\n  ")}`;
}
function generateColor(key, shade) {
  return `--ui-${key}: var(--ui-color-${key}-${shade});`;
}
const colors_E_6ZpwPS68tAvi7jag3wmkQLhx00fumBSl0Ahqz2JYA = /* @__PURE__ */ defineNuxtPlugin(() => {
  const appConfig2 = useAppConfig();
  useNuxtApp();
  const root = computed(() => {
    const { neutral, ...colors2 } = appConfig2.ui.colors;
    const prefix = appConfig2.ui.prefix;
    return `@layer theme {
  :root, :host {
  ${Object.entries(appConfig2.ui.colors).map(([key, value]) => generateShades(key, value, prefix)).join("\n  ")}
  }
  :root, :host, .light {
  ${Object.keys(colors2).map((key) => generateColor(key, 500)).join("\n  ")}
  }
  .dark {
  ${Object.keys(colors2).map((key) => generateColor(key, 400)).join("\n  ")}
  }
}`;
  });
  const headData = {
    style: [{
      innerHTML: root,
      tagPriority: "critical",
      id: "nuxt-ui-colors"
    }]
  };
  useHead(headData);
});
const prerender_server__AJAqx0r_LckIr_UV_zhyfMZj1Pq0MnlGRdi7l3bBGw = /* @__PURE__ */ defineNuxtPlugin(async () => {
  {
    return;
  }
});
const plugins = [
  unhead_PtamfB47yqQY_Rh4zjrimgYJkXOrkZ_s7Rhm1JWaAcQ,
  plugin,
  revive_payload_server_Ws8SUMTo68XWM_TEhuJIQbORo_qC7bnyjJcGdGVwAYw,
  plugin_server_nK_9z5G7Z_6JYbC0S1a1AruOe3jN3cdaGteeNbXx_T4,
  plugin_c515ayiLuocRMvhGInzV4Ci6HK9AGMOPyzAKHLWV3Qg,
  components_plugin_4kY4pyzJIYX99vmMAAIorFf3CnAaptHitJgf7JxiED8,
  plugin_rNd_9wmZjysjAGonfdtole0dRPomKgAKHntslWXR7_M,
  colors_E_6ZpwPS68tAvi7jag3wmkQLhx00fumBSl0Ahqz2JYA,
  prerender_server__AJAqx0r_LckIr_UV_zhyfMZj1Pq0MnlGRdi7l3bBGw
];
function createContext(providerComponentName, contextName) {
  const symbolDescription = typeof providerComponentName === "string" && !contextName ? `${providerComponentName}Context` : contextName;
  const injectionKey = Symbol(symbolDescription);
  const injectContext = (fallback) => {
    const context = inject(injectionKey, fallback);
    if (context) return context;
    if (context === null) return context;
    throw new Error(`Injection \`${injectionKey.toString()}\` not found. Component must be used within ${Array.isArray(providerComponentName) ? `one of the following components: ${providerComponentName.join(", ")}` : `\`${providerComponentName}\``}`);
  };
  const provideContext = (contextValue) => {
    provide(injectionKey, contextValue);
    return contextValue;
  };
  return [injectContext, provideContext];
}
function getActiveElement() {
  let activeElement = (void 0).activeElement;
  if (activeElement == null) return null;
  while (activeElement != null && activeElement.shadowRoot != null && activeElement.shadowRoot.activeElement != null) activeElement = activeElement.shadowRoot.activeElement;
  return activeElement;
}
function isNullish(value) {
  return value === null || value === void 0;
}
function renderSlotFragments(children) {
  if (!children) return [];
  return children.flatMap((child) => {
    if (child.type === Fragment) return renderSlotFragments(child.children);
    return [child];
  });
}
const [injectConfigProviderContext, provideConfigProviderContext] = /* @__PURE__ */ createContext("ConfigProvider");
var ConfigProvider_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
  inheritAttrs: false,
  __name: "ConfigProvider",
  props: {
    dir: {
      type: String,
      required: false,
      default: "ltr"
    },
    locale: {
      type: String,
      required: false,
      default: "en"
    },
    scrollBody: {
      type: [Boolean, Object],
      required: false,
      default: true
    },
    nonce: {
      type: String,
      required: false,
      default: void 0
    },
    useId: {
      type: Function,
      required: false,
      default: void 0
    }
  },
  setup(__props) {
    const props = __props;
    const { dir, locale, scrollBody, nonce } = toRefs(props);
    provideConfigProviderContext({
      dir,
      locale,
      scrollBody,
      nonce,
      useId: props.useId
    });
    return (_ctx, _cache) => {
      return renderSlot(_ctx.$slots, "default");
    };
  }
});
var ConfigProvider_default = ConfigProvider_vue_vue_type_script_setup_true_lang_default;
function useEmitAsProps(emit) {
  const vm = getCurrentInstance();
  const events = vm?.type.emits;
  const result = {};
  if (!events?.length) console.warn(`No emitted event found. Please check component: ${vm?.type.__name}`);
  events?.forEach((ev) => {
    result[toHandlerKey(camelize(ev))] = (...arg) => emit(ev, ...arg);
  });
  return result;
}
function useForwardExpose() {
  const instance = getCurrentInstance();
  const currentRef = ref();
  const currentElement = computed(() => resolveCurrentElement());
  function resolveCurrentElement() {
    return currentRef.value && "$el" in currentRef.value && ["#text", "#comment"].includes(currentRef.value.$el.nodeName) ? currentRef.value.$el.nextElementSibling : unrefElement(currentRef);
  }
  const localExpose = Object.assign({}, instance.exposed);
  const ret = {};
  for (const key in instance.props) Object.defineProperty(ret, key, {
    enumerable: true,
    configurable: true,
    get: () => instance.props[key]
  });
  if (Object.keys(localExpose).length > 0) for (const key in localExpose) Object.defineProperty(ret, key, {
    enumerable: true,
    configurable: true,
    get: () => localExpose[key]
  });
  Object.defineProperty(ret, "$el", {
    enumerable: true,
    configurable: true,
    get: () => instance.vnode.el
  });
  instance.exposed = ret;
  function forwardRef(ref$1) {
    currentRef.value = ref$1;
    if (!ref$1) return;
    Object.defineProperty(ret, "$el", {
      enumerable: true,
      configurable: true,
      get: () => ref$1 instanceof Element ? ref$1 : ref$1.$el
    });
    if (!(ref$1 instanceof Element) && !Object.hasOwn(ref$1, "$el")) {
      const childExposed = ref$1.$.exposed;
      const merged = Object.assign({}, ret);
      for (const key in childExposed) Object.defineProperty(merged, key, {
        enumerable: true,
        configurable: true,
        get: () => childExposed[key]
      });
      instance.exposed = merged;
    }
  }
  return {
    forwardRef,
    currentRef,
    currentElement
  };
}
function useForwardProps$1(props) {
  const vm = getCurrentInstance();
  const defaultProps = Object.keys(vm?.type.props ?? {}).reduce((prev, curr) => {
    const defaultValue = (vm?.type.props[curr]).default;
    if (defaultValue !== void 0) prev[curr] = defaultValue;
    return prev;
  }, {});
  const refProps = toRef(props);
  return computed(() => {
    const preservedProps = {};
    const assignedProps = vm?.vnode.props ?? {};
    Object.keys(assignedProps).forEach((key) => {
      preservedProps[camelize(key)] = assignedProps[key];
    });
    return Object.keys({
      ...defaultProps,
      ...preservedProps
    }).reduce((prev, curr) => {
      if (refProps.value[curr] !== void 0) prev[curr] = refProps.value[curr];
      return prev;
    }, {});
  });
}
function useStateMachine(initialState, machine) {
  const state2 = ref(initialState);
  function reducer(event) {
    const nextState = machine[state2.value][event];
    return nextState ?? state2.value;
  }
  const dispatch = (event) => {
    state2.value = reducer(event);
  };
  return {
    state: state2,
    dispatch
  };
}
function usePresence(present, node) {
  const stylesRef = ref({});
  const prevAnimationNameRef = ref("none");
  const prevPresentRef = ref(present);
  const initialState = present.value ? "mounted" : "unmounted";
  let timeoutId;
  const ownerWindow = node.value?.ownerDocument.defaultView ?? defaultWindow;
  const { state: state2, dispatch } = useStateMachine(initialState, {
    mounted: {
      UNMOUNT: "unmounted",
      ANIMATION_OUT: "unmountSuspended"
    },
    unmountSuspended: {
      MOUNT: "mounted",
      ANIMATION_END: "unmounted"
    },
    unmounted: { MOUNT: "mounted" }
  });
  const dispatchCustomEvent = (name) => {
    if (isClient) {
      const customEvent = new CustomEvent(name, {
        bubbles: false,
        cancelable: false
      });
      node.value?.dispatchEvent(customEvent);
    }
  };
  watch(present, async (currentPresent, prevPresent) => {
    const hasPresentChanged = prevPresent !== currentPresent;
    await nextTick();
    if (hasPresentChanged) {
      const prevAnimationName = prevAnimationNameRef.value;
      const currentAnimationName = getAnimationName(node.value);
      if (currentPresent) {
        dispatch("MOUNT");
        dispatchCustomEvent("enter");
        if (currentAnimationName === "none") dispatchCustomEvent("after-enter");
      } else if (currentAnimationName === "none" || currentAnimationName === "undefined" || stylesRef.value?.display === "none") {
        dispatch("UNMOUNT");
        dispatchCustomEvent("leave");
        dispatchCustomEvent("after-leave");
      } else {
        const isAnimating = prevAnimationName !== currentAnimationName;
        if (prevPresent && isAnimating) {
          dispatch("ANIMATION_OUT");
          dispatchCustomEvent("leave");
        } else {
          dispatch("UNMOUNT");
          dispatchCustomEvent("after-leave");
        }
      }
    }
  }, { immediate: true });
  const handleAnimationEnd = (event) => {
    const currentAnimationName = getAnimationName(node.value);
    const isCurrentAnimation = currentAnimationName.includes(CSS.escape(event.animationName));
    const directionName = state2.value === "mounted" ? "enter" : "leave";
    if (event.target === node.value && isCurrentAnimation) {
      dispatchCustomEvent(`after-${directionName}`);
      dispatch("ANIMATION_END");
      if (!prevPresentRef.value) {
        const currentFillMode = node.value.style.animationFillMode;
        node.value.style.animationFillMode = "forwards";
        timeoutId = ownerWindow?.setTimeout(() => {
          if (node.value?.style.animationFillMode === "forwards") node.value.style.animationFillMode = currentFillMode;
        });
      }
    }
    if (event.target === node.value && currentAnimationName === "none") dispatch("ANIMATION_END");
  };
  const handleAnimationStart = (event) => {
    if (event.target === node.value) prevAnimationNameRef.value = getAnimationName(node.value);
  };
  watch(node, (newNode, oldNode) => {
    if (newNode) {
      stylesRef.value = getComputedStyle(newNode);
      newNode.addEventListener("animationstart", handleAnimationStart);
      newNode.addEventListener("animationcancel", handleAnimationEnd);
      newNode.addEventListener("animationend", handleAnimationEnd);
    } else {
      dispatch("ANIMATION_END");
      if (timeoutId !== void 0) ownerWindow?.clearTimeout(timeoutId);
      oldNode?.removeEventListener("animationstart", handleAnimationStart);
      oldNode?.removeEventListener("animationcancel", handleAnimationEnd);
      oldNode?.removeEventListener("animationend", handleAnimationEnd);
    }
  }, { immediate: true });
  watch(state2, () => {
    const currentAnimationName = getAnimationName(node.value);
    prevAnimationNameRef.value = state2.value === "mounted" ? currentAnimationName : "none";
  });
  const isPresent = computed(() => ["mounted", "unmountSuspended"].includes(state2.value));
  return { isPresent };
}
function getAnimationName(node) {
  return node ? getComputedStyle(node).animationName || "none" : "none";
}
var Presence_default = /* @__PURE__ */ defineComponent({
  name: "Presence",
  props: {
    present: {
      type: Boolean,
      required: true
    },
    forceMount: { type: Boolean }
  },
  slots: {},
  setup(props, { slots, expose }) {
    const { present, forceMount } = toRefs(props);
    const node = ref();
    const { isPresent } = usePresence(present, node);
    expose({ present: isPresent });
    let children = slots.default({ present: isPresent.value });
    children = renderSlotFragments(children || []);
    const instance = getCurrentInstance();
    if (children && children?.length > 1) {
      const componentName = instance?.parent?.type.name ? `<${instance.parent.type.name} />` : "component";
      throw new Error([
        `Detected an invalid children for \`${componentName}\` for  \`Presence\` component.`,
        "",
        "Note: Presence works similarly to `v-if` directly, but it waits for animation/transition to finished before unmounting. So it expect only one direct child of valid VNode type.",
        "You can apply a few solutions:",
        ["Provide a single child element so that `presence` directive attach correctly.", "Ensure the first child is an actual element instead of a raw text node or comment node."].map((line) => `  - ${line}`).join("\n")
      ].join("\n"));
    }
    return () => {
      if (forceMount.value || present.value || isPresent.value) return h(slots.default({ present: isPresent.value })[0], { ref: (v) => {
        const el = unrefElement(v);
        if (typeof el?.hasAttribute === "undefined") return el;
        if (el?.hasAttribute("data-reka-popper-content-wrapper")) node.value = el.firstElementChild;
        else node.value = el;
        return el;
      } });
      else return null;
    };
  }
});
const Slot = /* @__PURE__ */ defineComponent({
  name: "PrimitiveSlot",
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => {
      if (!slots.default) return null;
      const children = renderSlotFragments(slots.default());
      const firstNonCommentChildrenIndex = children.findIndex((child) => child.type !== Comment);
      if (firstNonCommentChildrenIndex === -1) return children;
      const firstNonCommentChildren = children[firstNonCommentChildrenIndex];
      delete firstNonCommentChildren.props?.ref;
      const mergedProps = firstNonCommentChildren.props ? mergeProps(attrs, firstNonCommentChildren.props) : attrs;
      const cloned = cloneVNode({
        ...firstNonCommentChildren,
        props: {}
      }, mergedProps);
      if (children.length === 1) return cloned;
      children[firstNonCommentChildrenIndex] = cloned;
      return children;
    };
  }
});
const SELF_CLOSING_TAGS = [
  "area",
  "img",
  "input"
];
const Primitive = /* @__PURE__ */ defineComponent({
  name: "Primitive",
  inheritAttrs: false,
  props: {
    asChild: {
      type: Boolean,
      default: false
    },
    as: {
      type: [String, Object],
      default: "div"
    }
  },
  setup(props, { attrs, slots }) {
    const asTag = props.asChild ? "template" : props.as;
    if (typeof asTag === "string" && SELF_CLOSING_TAGS.includes(asTag)) return () => h(asTag, attrs);
    if (asTag !== "template") return () => h(props.as, attrs, { default: slots.default });
    return () => h(Slot, attrs, { default: slots.default });
  }
});
function usePrimitiveElement() {
  const primitiveElement = ref();
  const currentElement = computed(() => ["#text", "#comment"].includes(primitiveElement.value?.$el.nodeName) ? primitiveElement.value?.$el.nextElementSibling : unrefElement(primitiveElement));
  return {
    primitiveElement,
    currentElement
  };
}
var DismissableLayerBranch_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
  __name: "DismissableLayerBranch",
  props: {
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false
    }
  },
  setup(__props) {
    const props = __props;
    const { forwardRef } = useForwardExpose();
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(Primitive), mergeProps({ ref: unref(forwardRef) }, props), {
        default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 16);
    };
  }
});
var DismissableLayerBranch_default = DismissableLayerBranch_vue_vue_type_script_setup_true_lang_default;
const AUTOFOCUS_ON_MOUNT = "focusScope.autoFocusOnMount";
const AUTOFOCUS_ON_UNMOUNT = "focusScope.autoFocusOnUnmount";
const EVENT_OPTIONS = {
  bubbles: false,
  cancelable: true
};
function focusFirst(candidates, { select = false } = {}) {
  const previouslyFocusedElement = getActiveElement();
  for (const candidate of candidates) {
    focus(candidate, { select });
    if (getActiveElement() !== previouslyFocusedElement) return true;
  }
}
function getTabbableEdges(container) {
  const candidates = getTabbableCandidates(container);
  const first = findVisible(candidates, container);
  const last = findVisible(candidates.reverse(), container);
  return [first, last];
}
function getTabbableCandidates(container) {
  const nodes = [];
  const walker = (void 0).createTreeWalker(container, NodeFilter.SHOW_ELEMENT, { acceptNode: (node) => {
    const isHiddenInput = node.tagName === "INPUT" && node.type === "hidden";
    if (node.disabled || node.hidden || isHiddenInput) return NodeFilter.FILTER_SKIP;
    return node.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
  } });
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
}
function findVisible(elements, container) {
  for (const element of elements) if (!isHidden(element, { upTo: container })) return element;
}
function isHidden(node, { upTo }) {
  if (getComputedStyle(node).visibility === "hidden") return true;
  while (node) {
    if (upTo !== void 0 && node === upTo) return false;
    if (getComputedStyle(node).display === "none") return true;
    node = node.parentElement;
  }
  return false;
}
function isSelectableInput(element) {
  return element instanceof HTMLInputElement && "select" in element;
}
function focus(element, { select = false } = {}) {
  if (element && element.focus) {
    const previouslyFocusedElement = getActiveElement();
    element.focus({ preventScroll: true });
    if (element !== previouslyFocusedElement && isSelectableInput(element) && select) element.select();
  }
}
var Teleport_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
  __name: "Teleport",
  props: {
    to: {
      type: null,
      required: false,
      default: "body"
    },
    disabled: {
      type: Boolean,
      required: false
    },
    defer: {
      type: Boolean,
      required: false
    },
    forceMount: {
      type: Boolean,
      required: false
    }
  },
  setup(__props) {
    const isMounted = useMounted();
    return (_ctx, _cache) => {
      return unref(isMounted) || _ctx.forceMount ? (openBlock(), createBlock(Teleport, {
        key: 0,
        to: _ctx.to,
        disabled: _ctx.disabled,
        defer: _ctx.defer
      }, [renderSlot(_ctx.$slots, "default")], 8, [
        "to",
        "disabled",
        "defer"
      ])) : createCommentVNode("v-if", true);
    };
  }
});
var Teleport_default = Teleport_vue_vue_type_script_setup_true_lang_default;
const ITEM_DATA_ATTR = "data-reka-collection-item";
function useCollection(options2 = {}) {
  const { key = "", isProvider = false } = options2;
  const injectionKey = `${key}CollectionProvider`;
  let context;
  if (isProvider) {
    const itemMap = ref(/* @__PURE__ */ new Map());
    const collectionRef = ref();
    context = {
      collectionRef,
      itemMap
    };
    provide(injectionKey, context);
  } else context = inject(injectionKey);
  const getItems = (includeDisabledItem = false) => {
    const collectionNode = context.collectionRef.value;
    if (!collectionNode) return [];
    const orderedNodes = Array.from(collectionNode.querySelectorAll(`[${ITEM_DATA_ATTR}]`));
    const items = Array.from(context.itemMap.value.values());
    const orderedItems = items.sort((a, b) => orderedNodes.indexOf(a.ref) - orderedNodes.indexOf(b.ref));
    if (includeDisabledItem) return orderedItems;
    else return orderedItems.filter((i) => i.ref.dataset.disabled !== "");
  };
  const CollectionSlot = /* @__PURE__ */ defineComponent({
    name: "CollectionSlot",
    inheritAttrs: false,
    setup(_, { slots, attrs }) {
      const { primitiveElement, currentElement } = usePrimitiveElement();
      watch(currentElement, () => {
        context.collectionRef.value = currentElement.value;
      });
      return () => h(Slot, {
        ref: primitiveElement,
        ...attrs
      }, slots);
    }
  });
  const CollectionItem = /* @__PURE__ */ defineComponent({
    name: "CollectionItem",
    inheritAttrs: false,
    props: { value: { validator: () => true } },
    setup(props, { slots, attrs }) {
      const { primitiveElement, currentElement } = usePrimitiveElement();
      watchEffect((cleanupFn) => {
        if (currentElement.value) {
          const key$1 = markRaw(currentElement.value);
          context.itemMap.value.set(key$1, {
            ref: currentElement.value,
            value: props.value
          });
          cleanupFn(() => context.itemMap.value.delete(key$1));
        }
      });
      return () => h(Slot, {
        ...attrs,
        [ITEM_DATA_ATTR]: "",
        ref: primitiveElement
      }, slots);
    }
  });
  const reactiveItems = computed(() => Array.from(context.itemMap.value.values()));
  const itemMapSize = computed(() => context.itemMap.value.size);
  return {
    getItems,
    reactiveItems,
    itemMapSize,
    CollectionSlot,
    CollectionItem
  };
}
var VisuallyHidden_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
  __name: "VisuallyHidden",
  props: {
    feature: {
      type: String,
      required: false,
      default: "focusable"
    },
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false,
      default: "span"
    }
  },
  setup(__props) {
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(Primitive), {
        as: _ctx.as,
        "as-child": _ctx.asChild,
        "aria-hidden": _ctx.feature === "focusable" ? "true" : void 0,
        "data-hidden": _ctx.feature === "fully-hidden" ? "" : void 0,
        tabindex: _ctx.feature === "fully-hidden" ? "-1" : void 0,
        style: {
          position: "absolute",
          border: 0,
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          clipPath: "inset(50%)",
          whiteSpace: "nowrap",
          wordWrap: "normal",
          top: "-1px",
          left: "-1px"
        }
      }, {
        default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 8, [
        "as",
        "as-child",
        "aria-hidden",
        "data-hidden",
        "tabindex"
      ]);
    };
  }
});
var VisuallyHidden_default = VisuallyHidden_vue_vue_type_script_setup_true_lang_default;
const DEFAULT_MAX$1 = 100;
const [injectProgressRootContext, provideProgressRootContext] = /* @__PURE__ */ createContext("ProgressRoot");
const isNumber = (v) => typeof v === "number";
function validateValue(value, max) {
  const isValidValueError = isNullish(value) || isNumber(value) && !Number.isNaN(value) && value <= max && value >= 0;
  if (isValidValueError) return value;
  console.error(`Invalid prop \`value\` of value \`${value}\` supplied to \`ProgressRoot\`. The \`value\` prop must be:
  - a positive number
  - less than the value passed to \`max\` (or ${DEFAULT_MAX$1} if no \`max\` prop is set)
  - \`null\`  or \`undefined\` if the progress is indeterminate.

Defaulting to \`null\`.`);
  return null;
}
function validateMax(max) {
  const isValidMaxError = isNumber(max) && !Number.isNaN(max) && max > 0;
  if (isValidMaxError) return max;
  console.error(`Invalid prop \`max\` of value \`${max}\` supplied to \`ProgressRoot\`. Only numbers greater than 0 are valid max values. Defaulting to \`${DEFAULT_MAX$1}\`.`);
  return DEFAULT_MAX$1;
}
var ProgressRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
  __name: "ProgressRoot",
  props: {
    modelValue: {
      type: [Number, null],
      required: false
    },
    max: {
      type: Number,
      required: false,
      default: DEFAULT_MAX$1
    },
    getValueLabel: {
      type: Function,
      required: false,
      default: (value, max) => isNumber(value) ? `${Math.round(value / max * DEFAULT_MAX$1)}%` : void 0
    },
    getValueText: {
      type: Function,
      required: false
    },
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false
    }
  },
  emits: ["update:modelValue", "update:max"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    useForwardExpose();
    const modelValue = useVModel(props, "modelValue", emit, { passive: props.modelValue === void 0 });
    const max = useVModel(props, "max", emit, { passive: props.max === void 0 });
    watch(() => modelValue.value, async (value) => {
      const correctedValue = validateValue(value, props.max);
      if (correctedValue !== value) {
        await nextTick();
        modelValue.value = correctedValue;
      }
    }, { immediate: true });
    watch(() => props.max, (newMax) => {
      const correctedMax = validateMax(props.max);
      if (correctedMax !== newMax) max.value = correctedMax;
    }, { immediate: true });
    const progressState = computed(() => {
      if (isNullish(modelValue.value)) return "indeterminate";
      if (modelValue.value === max.value) return "complete";
      return "loading";
    });
    provideProgressRootContext({
      modelValue,
      max,
      progressState
    });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(Primitive), {
        "as-child": _ctx.asChild,
        as: _ctx.as,
        "aria-valuemax": unref(max),
        "aria-valuemin": 0,
        "aria-valuenow": isNumber(unref(modelValue)) ? unref(modelValue) : void 0,
        "aria-valuetext": _ctx.getValueText?.(unref(modelValue), unref(max)),
        "aria-label": _ctx.getValueLabel(unref(modelValue), unref(max)),
        role: "progressbar",
        "data-state": progressState.value,
        "data-value": unref(modelValue) ?? void 0,
        "data-max": unref(max)
      }, {
        default: withCtx(() => [renderSlot(_ctx.$slots, "default", { modelValue: unref(modelValue) })]),
        _: 3
      }, 8, [
        "as-child",
        "as",
        "aria-valuemax",
        "aria-valuenow",
        "aria-valuetext",
        "aria-label",
        "data-state",
        "data-value",
        "data-max"
      ]);
    };
  }
});
var ProgressRoot_default = ProgressRoot_vue_vue_type_script_setup_true_lang_default;
var ProgressIndicator_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
  __name: "ProgressIndicator",
  props: {
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false
    }
  },
  setup(__props) {
    const props = __props;
    const rootContext = injectProgressRootContext();
    useForwardExpose();
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(Primitive), mergeProps(props, {
        "data-state": unref(rootContext).progressState.value,
        "data-value": unref(rootContext).modelValue?.value ?? void 0,
        "data-max": unref(rootContext).max.value
      }), {
        default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 16, [
        "data-state",
        "data-value",
        "data-max"
      ]);
    };
  }
});
var ProgressIndicator_default = ProgressIndicator_vue_vue_type_script_setup_true_lang_default;
var ToastAnnounceExclude_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
  __name: "ToastAnnounceExclude",
  props: {
    altText: {
      type: String,
      required: false
    },
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false
    }
  },
  setup(__props) {
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(Primitive), {
        as: _ctx.as,
        "as-child": _ctx.asChild,
        "data-reka-toast-announce-exclude": "",
        "data-reka-toast-announce-alt": _ctx.altText || void 0
      }, {
        default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 8, [
        "as",
        "as-child",
        "data-reka-toast-announce-alt"
      ]);
    };
  }
});
var ToastAnnounceExclude_default = ToastAnnounceExclude_vue_vue_type_script_setup_true_lang_default;
const [injectToastProviderContext, provideToastProviderContext] = /* @__PURE__ */ createContext("ToastProvider");
var ToastProvider_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
  inheritAttrs: false,
  __name: "ToastProvider",
  props: {
    label: {
      type: String,
      required: false,
      default: "Notification"
    },
    duration: {
      type: Number,
      required: false,
      default: 5e3
    },
    disableSwipe: {
      type: Boolean,
      required: false
    },
    swipeDirection: {
      type: String,
      required: false,
      default: "right"
    },
    swipeThreshold: {
      type: Number,
      required: false,
      default: 50
    }
  },
  setup(__props) {
    const props = __props;
    const { label, duration, disableSwipe, swipeDirection, swipeThreshold } = toRefs(props);
    useCollection({ isProvider: true });
    const viewport = ref();
    const toastCount = ref(0);
    const isFocusedToastEscapeKeyDownRef = ref(false);
    const isClosePausedRef = ref(false);
    if (props.label && typeof props.label === "string" && !props.label.trim()) {
      const error2 = "Invalid prop `label` supplied to `ToastProvider`. Expected non-empty `string`.";
      throw new Error(error2);
    }
    provideToastProviderContext({
      label,
      duration,
      disableSwipe,
      swipeDirection,
      swipeThreshold,
      toastCount,
      viewport,
      onViewportChange(el) {
        viewport.value = el;
      },
      onToastAdd() {
        toastCount.value++;
      },
      onToastRemove() {
        toastCount.value--;
      },
      isFocusedToastEscapeKeyDownRef,
      isClosePausedRef
    });
    return (_ctx, _cache) => {
      return renderSlot(_ctx.$slots, "default");
    };
  }
});
var ToastProvider_default = ToastProvider_vue_vue_type_script_setup_true_lang_default;
var ToastAnnounce_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
  __name: "ToastAnnounce",
  setup(__props) {
    const providerContext = injectToastProviderContext();
    const isAnnounced = useTimeout(1e3);
    const renderAnnounceText = ref(false);
    let raf1 = 0;
    let raf2 = 0;
    if (isClient) {
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          renderAnnounceText.value = true;
        });
      });
      onScopeDispose(() => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      });
    }
    return (_ctx, _cache) => {
      return unref(isAnnounced) || renderAnnounceText.value ? (openBlock(), createBlock(unref(VisuallyHidden_default), {
        key: 0,
        feature: "fully-hidden"
      }, {
        default: withCtx(() => [createTextVNode(toDisplayString(unref(providerContext).label.value) + " ", 1), renderSlot(_ctx.$slots, "default")]),
        _: 3
      })) : createCommentVNode("v-if", true);
    };
  }
});
var ToastAnnounce_default = ToastAnnounce_vue_vue_type_script_setup_true_lang_default;
const TOAST_SWIPE_START = "toast.swipeStart";
const TOAST_SWIPE_MOVE = "toast.swipeMove";
const TOAST_SWIPE_CANCEL = "toast.swipeCancel";
const TOAST_SWIPE_END = "toast.swipeEnd";
const VIEWPORT_PAUSE = "toast.viewportPause";
const VIEWPORT_RESUME = "toast.viewportResume";
function handleAndDispatchCustomEvent(name, handler, detail) {
  const currentTarget = detail.originalEvent.currentTarget;
  const event = new CustomEvent(name, {
    bubbles: false,
    cancelable: true,
    detail
  });
  if (handler) currentTarget.addEventListener(name, handler, { once: true });
  currentTarget.dispatchEvent(event);
}
function isDeltaInDirection(delta, direction, threshold = 0) {
  const deltaX = Math.abs(delta.x);
  const deltaY = Math.abs(delta.y);
  const isDeltaX = deltaX > deltaY;
  if (direction === "left" || direction === "right") return isDeltaX && deltaX > threshold;
  else return !isDeltaX && deltaY > threshold;
}
function isHTMLElement(node) {
  return node.nodeType === node.ELEMENT_NODE;
}
function getAnnounceTextContent(container) {
  const textContent = [];
  const childNodes = Array.from(container.childNodes);
  childNodes.forEach((node) => {
    if (node.nodeType === node.TEXT_NODE && node.textContent) textContent.push(node.textContent);
    if (isHTMLElement(node)) {
      const isHidden2 = node.ariaHidden || node.hidden || node.style.display === "none";
      const isExcluded = node.dataset.rekaToastAnnounceExclude === "";
      if (!isHidden2) if (isExcluded) {
        const altText = node.dataset.rekaToastAnnounceAlt;
        if (altText) textContent.push(altText);
      } else textContent.push(...getAnnounceTextContent(node));
    }
  });
  return textContent;
}
const [injectToastRootContext, provideToastRootContext] = /* @__PURE__ */ createContext("ToastRoot");
var ToastRootImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
  inheritAttrs: false,
  __name: "ToastRootImpl",
  props: {
    type: {
      type: String,
      required: false
    },
    open: {
      type: Boolean,
      required: false,
      default: false
    },
    duration: {
      type: Number,
      required: false
    },
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false,
      default: "li"
    }
  },
  emits: [
    "close",
    "escapeKeyDown",
    "pause",
    "resume",
    "swipeStart",
    "swipeMove",
    "swipeCancel",
    "swipeEnd"
  ],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emits = __emit;
    const { forwardRef, currentElement } = useForwardExpose();
    const { CollectionItem } = useCollection();
    const providerContext = injectToastProviderContext();
    const pointerStartRef = ref(null);
    const swipeDeltaRef = ref(null);
    const duration = computed(() => typeof props.duration === "number" ? props.duration : providerContext.duration.value);
    const closeTimerStartTimeRef = ref(0);
    const closeTimerRemainingTimeRef = ref(duration.value);
    const closeTimerRef = ref(0);
    const remainingTime = ref(duration.value);
    const remainingRaf = useRafFn(() => {
      const elapsedTime = Date.now() - closeTimerStartTimeRef.value;
      remainingTime.value = Math.max(closeTimerRemainingTimeRef.value - elapsedTime, 0);
    }, { fpsLimit: 60 });
    function startTimer(duration$1) {
      if (duration$1 <= 0 || duration$1 === Number.POSITIVE_INFINITY) return;
      if (!isClient) return;
      (void 0).clearTimeout(closeTimerRef.value);
      closeTimerStartTimeRef.value = Date.now();
      closeTimerRef.value = (void 0).setTimeout(handleClose, duration$1);
    }
    function handleClose(event) {
      const isNonPointerEvent = event?.pointerType === "";
      const isFocusInToast = currentElement.value?.contains(getActiveElement());
      if (isFocusInToast && isNonPointerEvent) providerContext.viewport.value?.focus();
      if (isNonPointerEvent) providerContext.isClosePausedRef.value = false;
      emits("close");
    }
    const announceTextContent = computed(() => currentElement.value ? getAnnounceTextContent(currentElement.value) : null);
    if (props.type && !["foreground", "background"].includes(props.type)) {
      const error2 = "Invalid prop `type` supplied to `Toast`. Expected `foreground | background`.";
      throw new Error(error2);
    }
    watchEffect((cleanupFn) => {
      const viewport = providerContext.viewport.value;
      if (viewport) {
        const handleResume = () => {
          startTimer(closeTimerRemainingTimeRef.value);
          remainingRaf.resume();
          emits("resume");
        };
        const handlePause = () => {
          const elapsedTime = Date.now() - closeTimerStartTimeRef.value;
          closeTimerRemainingTimeRef.value = closeTimerRemainingTimeRef.value - elapsedTime;
          (void 0).clearTimeout(closeTimerRef.value);
          remainingRaf.pause();
          emits("pause");
        };
        viewport.addEventListener(VIEWPORT_PAUSE, handlePause);
        viewport.addEventListener(VIEWPORT_RESUME, handleResume);
        return () => {
          viewport.removeEventListener(VIEWPORT_PAUSE, handlePause);
          viewport.removeEventListener(VIEWPORT_RESUME, handleResume);
        };
      }
    });
    watch(() => [props.open, duration.value], () => {
      closeTimerRemainingTimeRef.value = duration.value;
      if (props.open && !providerContext.isClosePausedRef.value) startTimer(duration.value);
    }, { immediate: true });
    onKeyStroke("Escape", (event) => {
      emits("escapeKeyDown", event);
      if (!event.defaultPrevented) {
        providerContext.isFocusedToastEscapeKeyDownRef.value = true;
        handleClose();
      }
    });
    provideToastRootContext({ onClose: handleClose });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock(Fragment, null, [announceTextContent.value ? (openBlock(), createBlock(ToastAnnounce_default, {
        key: 0,
        role: "alert",
        "aria-live": _ctx.type === "foreground" ? "assertive" : "polite"
      }, {
        default: withCtx(() => [createCommentVNode("\n      Render each chunk as its own text node so screen readers get the\n      natural pause break between nodes (see comment in utils.ts).\n      Interpolating the array directly with `{{ announceTextContent }}`\n      would route through Vue's `toDisplayString`, which JSON-stringifies\n      arrays — the live region would then announce literal `[`, quotes\n      and commas instead of the toast title and description.\n    "), (openBlock(true), createElementBlock(Fragment, null, renderList(announceTextContent.value, (text, i) => {
          return openBlock(), createElementBlock(Fragment, { key: i }, [createTextVNode(toDisplayString(text), 1)], 64);
        }), 128))]),
        _: 1
      }, 8, ["aria-live"])) : createCommentVNode("v-if", true), unref(providerContext).viewport.value ? (openBlock(), createBlock(Teleport, {
        key: 1,
        to: unref(providerContext).viewport.value
      }, [createVNode(unref(CollectionItem), null, {
        default: withCtx(() => [createVNode(unref(Primitive), mergeProps({
          ref: unref(forwardRef),
          tabindex: "0"
        }, _ctx.$attrs, {
          as: _ctx.as,
          "as-child": _ctx.asChild,
          "data-state": _ctx.open ? "open" : "closed",
          "data-swipe-direction": unref(providerContext).swipeDirection.value,
          style: unref(providerContext).disableSwipe.value ? void 0 : {
            userSelect: "none",
            touchAction: "none"
          },
          onPointerdown: _cache[0] || (_cache[0] = withModifiers((event) => {
            if (unref(providerContext).disableSwipe.value) return;
            pointerStartRef.value = {
              x: event.clientX,
              y: event.clientY
            };
          }, ["left"])),
          onPointermove: _cache[1] || (_cache[1] = (event) => {
            if (unref(providerContext).disableSwipe.value || !pointerStartRef.value) return;
            const x = event.clientX - pointerStartRef.value.x;
            const y = event.clientY - pointerStartRef.value.y;
            const hasSwipeMoveStarted = Boolean(swipeDeltaRef.value);
            const isHorizontalSwipe = ["left", "right"].includes(unref(providerContext).swipeDirection.value);
            const clamp2 = ["left", "up"].includes(unref(providerContext).swipeDirection.value) ? Math.min : Math.max;
            const clampedX = isHorizontalSwipe ? clamp2(0, x) : 0;
            const clampedY = !isHorizontalSwipe ? clamp2(0, y) : 0;
            const moveStartBuffer = event.pointerType === "touch" ? 10 : 2;
            const delta = {
              x: clampedX,
              y: clampedY
            };
            const eventDetail = {
              originalEvent: event,
              delta
            };
            if (hasSwipeMoveStarted) {
              swipeDeltaRef.value = delta;
              unref(handleAndDispatchCustomEvent)(unref(TOAST_SWIPE_MOVE), (ev) => emits("swipeMove", ev), eventDetail);
            } else if (unref(isDeltaInDirection)(delta, unref(providerContext).swipeDirection.value, moveStartBuffer)) {
              swipeDeltaRef.value = delta;
              unref(handleAndDispatchCustomEvent)(unref(TOAST_SWIPE_START), (ev) => emits("swipeStart", ev), eventDetail);
              event.target.setPointerCapture(event.pointerId);
            } else if (Math.abs(x) > moveStartBuffer || Math.abs(y) > moveStartBuffer) pointerStartRef.value = null;
          }),
          onPointerup: _cache[2] || (_cache[2] = (event) => {
            if (unref(providerContext).disableSwipe.value) return;
            const delta = swipeDeltaRef.value;
            const target = event.target;
            if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
            swipeDeltaRef.value = null;
            pointerStartRef.value = null;
            if (delta) {
              const toast = event.currentTarget;
              const eventDetail = {
                originalEvent: event,
                delta
              };
              if (unref(isDeltaInDirection)(delta, unref(providerContext).swipeDirection.value, unref(providerContext).swipeThreshold.value)) unref(handleAndDispatchCustomEvent)(unref(TOAST_SWIPE_END), (ev) => emits("swipeEnd", ev), eventDetail);
              else unref(handleAndDispatchCustomEvent)(unref(TOAST_SWIPE_CANCEL), (ev) => emits("swipeCancel", ev), eventDetail);
              toast?.addEventListener("click", (event$1) => event$1.preventDefault(), { once: true });
            }
          })
        }), {
          default: withCtx(() => [renderSlot(_ctx.$slots, "default", {
            remaining: remainingTime.value,
            duration: duration.value
          })]),
          _: 3
        }, 16, [
          "as",
          "as-child",
          "data-state",
          "data-swipe-direction",
          "style"
        ])]),
        _: 3
      })], 8, ["to"])) : createCommentVNode("v-if", true)], 64);
    };
  }
});
var ToastRootImpl_default = ToastRootImpl_vue_vue_type_script_setup_true_lang_default;
var ToastClose_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
  __name: "ToastClose",
  props: {
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false,
      default: "button"
    }
  },
  setup(__props) {
    const props = __props;
    const rootContext = injectToastRootContext();
    const { forwardRef } = useForwardExpose();
    return (_ctx, _cache) => {
      return openBlock(), createBlock(ToastAnnounceExclude_default, { "as-child": "" }, {
        default: withCtx(() => [createVNode(unref(Primitive), mergeProps(props, {
          ref: unref(forwardRef),
          type: _ctx.as === "button" ? "button" : void 0,
          onClick: unref(rootContext).onClose
        }), {
          default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
          _: 3
        }, 16, ["type", "onClick"])]),
        _: 3
      });
    };
  }
});
var ToastClose_default = ToastClose_vue_vue_type_script_setup_true_lang_default;
var ToastAction_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
  __name: "ToastAction",
  props: {
    altText: {
      type: String,
      required: true
    },
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false
    }
  },
  setup(__props) {
    const props = __props;
    if (!props.altText) throw new Error("Missing prop `altText` expected on `ToastAction`");
    const { forwardRef } = useForwardExpose();
    return (_ctx, _cache) => {
      return _ctx.altText ? (openBlock(), createBlock(ToastAnnounceExclude_default, {
        key: 0,
        "alt-text": _ctx.altText,
        "as-child": ""
      }, {
        default: withCtx(() => [createVNode(ToastClose_default, {
          ref: unref(forwardRef),
          as: _ctx.as,
          "as-child": _ctx.asChild
        }, {
          default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
          _: 3
        }, 8, ["as", "as-child"])]),
        _: 3
      }, 8, ["alt-text"])) : createCommentVNode("v-if", true);
    };
  }
});
var ToastAction_default = ToastAction_vue_vue_type_script_setup_true_lang_default;
var ToastDescription_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
  __name: "ToastDescription",
  props: {
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false
    }
  },
  setup(__props) {
    const props = __props;
    useForwardExpose();
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(Primitive), normalizeProps(guardReactiveProps(props)), {
        default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 16);
    };
  }
});
var ToastDescription_default = ToastDescription_vue_vue_type_script_setup_true_lang_default;
var ToastPortal_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
  __name: "ToastPortal",
  props: {
    to: {
      type: null,
      required: false
    },
    disabled: {
      type: Boolean,
      required: false
    },
    defer: {
      type: Boolean,
      required: false
    },
    forceMount: {
      type: Boolean,
      required: false
    }
  },
  setup(__props) {
    const props = __props;
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(Teleport_default), normalizeProps(guardReactiveProps(props)), {
        default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 16);
    };
  }
});
var ToastPortal_default = ToastPortal_vue_vue_type_script_setup_true_lang_default;
var ToastRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
  __name: "ToastRoot",
  props: {
    defaultOpen: {
      type: Boolean,
      required: false,
      default: true
    },
    forceMount: {
      type: Boolean,
      required: false
    },
    type: {
      type: String,
      required: false,
      default: "foreground"
    },
    open: {
      type: Boolean,
      required: false,
      default: void 0
    },
    duration: {
      type: Number,
      required: false
    },
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false,
      default: "li"
    }
  },
  emits: [
    "escapeKeyDown",
    "pause",
    "resume",
    "swipeStart",
    "swipeMove",
    "swipeCancel",
    "swipeEnd",
    "update:open"
  ],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emits = __emit;
    const { forwardRef } = useForwardExpose();
    const open = useVModel(props, "open", emits, {
      defaultValue: props.defaultOpen,
      passive: props.open === void 0
    });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(Presence_default), { present: _ctx.forceMount || unref(open) }, {
        default: withCtx(() => [createVNode(ToastRootImpl_default, mergeProps({
          ref: unref(forwardRef),
          open: unref(open),
          type: _ctx.type,
          as: _ctx.as,
          "as-child": _ctx.asChild,
          duration: _ctx.duration
        }, _ctx.$attrs, {
          onClose: _cache[0] || (_cache[0] = ($event) => open.value = false),
          onPause: _cache[1] || (_cache[1] = ($event) => emits("pause")),
          onResume: _cache[2] || (_cache[2] = ($event) => emits("resume")),
          onEscapeKeyDown: _cache[3] || (_cache[3] = ($event) => emits("escapeKeyDown", $event)),
          onSwipeStart: _cache[4] || (_cache[4] = (event) => {
            emits("swipeStart", event);
            if (!event.defaultPrevented) event.currentTarget.setAttribute("data-swipe", "start");
          }),
          onSwipeMove: _cache[5] || (_cache[5] = (event) => {
            emits("swipeMove", event);
            if (!event.defaultPrevented) {
              const { x, y } = event.detail.delta;
              const target = event.currentTarget;
              target.setAttribute("data-swipe", "move");
              target.style.setProperty("--reka-toast-swipe-move-x", `${x}px`);
              target.style.setProperty("--reka-toast-swipe-move-y", `${y}px`);
            }
          }),
          onSwipeCancel: _cache[6] || (_cache[6] = (event) => {
            emits("swipeCancel", event);
            if (!event.defaultPrevented) {
              const target = event.currentTarget;
              target.setAttribute("data-swipe", "cancel");
              target.style.removeProperty("--reka-toast-swipe-move-x");
              target.style.removeProperty("--reka-toast-swipe-move-y");
              target.style.removeProperty("--reka-toast-swipe-end-x");
              target.style.removeProperty("--reka-toast-swipe-end-y");
            }
          }),
          onSwipeEnd: _cache[7] || (_cache[7] = (event) => {
            emits("swipeEnd", event);
            if (!event.defaultPrevented) {
              const { x, y } = event.detail.delta;
              const target = event.currentTarget;
              target.setAttribute("data-swipe", "end");
              target.style.removeProperty("--reka-toast-swipe-move-x");
              target.style.removeProperty("--reka-toast-swipe-move-y");
              target.style.setProperty("--reka-toast-swipe-end-x", `${x}px`);
              target.style.setProperty("--reka-toast-swipe-end-y", `${y}px`);
              open.value = false;
            }
          })
        }), {
          default: withCtx(({ remaining, duration: _duration }) => [renderSlot(_ctx.$slots, "default", {
            remaining,
            duration: _duration,
            open: unref(open)
          })]),
          _: 3
        }, 16, [
          "open",
          "type",
          "as",
          "as-child",
          "duration"
        ])]),
        _: 3
      }, 8, ["present"]);
    };
  }
});
var ToastRoot_default = ToastRoot_vue_vue_type_script_setup_true_lang_default;
var ToastTitle_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
  __name: "ToastTitle",
  props: {
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false
    }
  },
  setup(__props) {
    const props = __props;
    useForwardExpose();
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(Primitive), normalizeProps(guardReactiveProps(props)), {
        default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 16);
    };
  }
});
var ToastTitle_default = ToastTitle_vue_vue_type_script_setup_true_lang_default;
var FocusProxy_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
  __name: "FocusProxy",
  emits: ["focusFromOutsideViewport"],
  setup(__props, { emit: __emit }) {
    const emits = __emit;
    const providerContext = injectToastProviderContext();
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(VisuallyHidden_default), {
        tabindex: "0",
        style: { "position": "fixed" },
        onFocus: _cache[0] || (_cache[0] = (event) => {
          const prevFocusedElement = event.relatedTarget;
          const isFocusFromOutsideViewport = !unref(providerContext).viewport.value?.contains(prevFocusedElement);
          if (isFocusFromOutsideViewport) emits("focusFromOutsideViewport");
        })
      }, {
        default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
        _: 3
      });
    };
  }
});
var FocusProxy_default = FocusProxy_vue_vue_type_script_setup_true_lang_default;
var ToastViewport_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
  inheritAttrs: false,
  __name: "ToastViewport",
  props: {
    hotkey: {
      type: Array,
      required: false,
      default: () => ["F8"]
    },
    label: {
      type: [String, Function],
      required: false,
      default: "Notifications ({hotkey})"
    },
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false,
      default: "ol"
    }
  },
  setup(__props) {
    const props = __props;
    const { hotkey, label } = toRefs(props);
    const { forwardRef, currentElement } = useForwardExpose();
    const { CollectionSlot, getItems } = useCollection();
    const providerContext = injectToastProviderContext();
    const hasToasts = computed(() => providerContext.toastCount.value > 0);
    const headFocusProxyRef = ref();
    const tailFocusProxyRef = ref();
    const KEY_RE = /Key/g;
    const DIGIT_RE = /Digit/g;
    const hotkeyMessage = computed(() => hotkey.value.join("+").replace(KEY_RE, "").replace(DIGIT_RE, ""));
    onKeyStroke(hotkey.value, () => {
      currentElement.value.focus();
    });
    watchEffect((cleanupFn) => {
      const viewport = currentElement.value;
      if (hasToasts.value && viewport) {
        const handlePause = () => {
          if (!providerContext.isClosePausedRef.value) {
            const pauseEvent = new CustomEvent(VIEWPORT_PAUSE);
            viewport.dispatchEvent(pauseEvent);
            providerContext.isClosePausedRef.value = true;
          }
        };
        const handleResume = () => {
          if (providerContext.isClosePausedRef.value) {
            const resumeEvent = new CustomEvent(VIEWPORT_RESUME);
            viewport.dispatchEvent(resumeEvent);
            providerContext.isClosePausedRef.value = false;
          }
        };
        const handleFocusOutResume = (event) => {
          const isFocusMovingOutside = !viewport.contains(event.relatedTarget);
          if (isFocusMovingOutside) handleResume();
        };
        const handlePointerLeaveResume = () => {
          const isFocusInside = viewport.contains(getActiveElement());
          if (!isFocusInside) handleResume();
        };
        const handleKeyDown = (event) => {
          const isMetaKey = event.altKey || event.ctrlKey || event.metaKey;
          const isTabKey = event.key === "Tab" && !isMetaKey;
          if (isTabKey) {
            const focusedElement = getActiveElement();
            const isTabbingBackwards = event.shiftKey;
            const targetIsViewport = event.target === viewport;
            if (targetIsViewport && isTabbingBackwards) {
              headFocusProxyRef.value?.focus();
              return;
            }
            const tabbingDirection = isTabbingBackwards ? "backwards" : "forwards";
            const sortedCandidates = getSortedTabbableCandidates({ tabbingDirection });
            const index2 = sortedCandidates.findIndex((candidate) => candidate === focusedElement);
            if (focusFirst(sortedCandidates.slice(index2 + 1))) event.preventDefault();
            else isTabbingBackwards ? headFocusProxyRef.value?.focus() : tailFocusProxyRef.value?.focus();
          }
        };
        viewport.addEventListener("focusin", handlePause);
        viewport.addEventListener("focusout", handleFocusOutResume);
        viewport.addEventListener("pointermove", handlePause);
        viewport.addEventListener("pointerleave", handlePointerLeaveResume);
        viewport.addEventListener("keydown", handleKeyDown);
        (void 0).addEventListener("blur", handlePause);
        (void 0).addEventListener("focus", handleResume);
        cleanupFn(() => {
          viewport.removeEventListener("focusin", handlePause);
          viewport.removeEventListener("focusout", handleFocusOutResume);
          viewport.removeEventListener("pointermove", handlePause);
          viewport.removeEventListener("pointerleave", handlePointerLeaveResume);
          viewport.removeEventListener("keydown", handleKeyDown);
          (void 0).removeEventListener("blur", handlePause);
          (void 0).removeEventListener("focus", handleResume);
        });
      }
    });
    function getSortedTabbableCandidates({ tabbingDirection }) {
      const toastItems = getItems().map((i) => i.ref);
      const tabbableCandidates = toastItems.map((toastNode) => {
        const toastTabbableCandidates = [toastNode, ...getTabbableCandidates(toastNode)];
        return tabbingDirection === "forwards" ? toastTabbableCandidates : toastTabbableCandidates.reverse();
      });
      return (tabbingDirection === "forwards" ? tabbableCandidates.reverse() : tabbableCandidates).flat();
    }
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(DismissableLayerBranch_default), {
        role: "region",
        "aria-label": typeof unref(label) === "string" ? unref(label).replace("{hotkey}", hotkeyMessage.value) : unref(label)(hotkeyMessage.value),
        tabindex: "-1",
        style: normalizeStyle({ pointerEvents: hasToasts.value ? void 0 : "none" })
      }, {
        default: withCtx(() => [
          hasToasts.value ? (openBlock(), createBlock(FocusProxy_default, {
            key: 0,
            ref: (node) => {
              if (!node) return void 0;
              headFocusProxyRef.value = unref(unrefElement)(node);
              return void 0;
            },
            onFocusFromOutsideViewport: _cache[0] || (_cache[0] = () => {
              const tabbableCandidates = getSortedTabbableCandidates({ tabbingDirection: "forwards" });
              unref(focusFirst)(tabbableCandidates);
            })
          }, null, 512)) : createCommentVNode("v-if", true),
          createVNode(unref(CollectionSlot), null, {
            default: withCtx(() => [createVNode(unref(Primitive), mergeProps({
              ref: unref(forwardRef),
              tabindex: "-1",
              as: _ctx.as,
              "as-child": _ctx.asChild
            }, _ctx.$attrs), {
              default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
              _: 3
            }, 16, ["as", "as-child"])]),
            _: 3
          }),
          hasToasts.value ? (openBlock(), createBlock(FocusProxy_default, {
            key: 1,
            ref: (node) => {
              if (!node) return void 0;
              tailFocusProxyRef.value = unref(unrefElement)(node);
              return void 0;
            },
            onFocusFromOutsideViewport: _cache[1] || (_cache[1] = () => {
              const tabbableCandidates = getSortedTabbableCandidates({ tabbingDirection: "backwards" });
              unref(focusFirst)(tabbableCandidates);
            })
          }, null, 512)) : createCommentVNode("v-if", true)
        ]),
        _: 3
      }, 8, ["aria-label", "style"]);
    };
  }
});
var ToastViewport_default = ToastViewport_vue_vue_type_script_setup_true_lang_default;
const [injectTooltipProviderContext, provideTooltipProviderContext] = /* @__PURE__ */ createContext("TooltipProvider");
var TooltipProvider_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
  inheritAttrs: false,
  __name: "TooltipProvider",
  props: {
    delayDuration: {
      type: Number,
      required: false,
      default: 700
    },
    skipDelayDuration: {
      type: Number,
      required: false,
      default: 300
    },
    disableHoverableContent: {
      type: Boolean,
      required: false,
      default: false
    },
    disableClosingTrigger: {
      type: Boolean,
      required: false
    },
    disabled: {
      type: Boolean,
      required: false
    },
    ignoreNonKeyboardFocus: {
      type: Boolean,
      required: false,
      default: false
    },
    content: {
      type: Object,
      required: false
    }
  },
  setup(__props) {
    const props = __props;
    const { delayDuration, skipDelayDuration, disableHoverableContent, disableClosingTrigger, ignoreNonKeyboardFocus, disabled, content } = toRefs(props);
    useForwardExpose();
    const isOpenDelayed = ref(true);
    const isPointerInTransitRef = ref(false);
    const { start: startTimer, stop: clearTimer } = useTimeoutFn(() => {
      isOpenDelayed.value = true;
    }, skipDelayDuration, { immediate: false });
    provideTooltipProviderContext({
      isOpenDelayed,
      delayDuration,
      onOpen() {
        clearTimer();
        isOpenDelayed.value = false;
      },
      onClose() {
        startTimer();
      },
      isPointerInTransitRef,
      disableHoverableContent,
      disableClosingTrigger,
      disabled,
      ignoreNonKeyboardFocus,
      content
    });
    return (_ctx, _cache) => {
      return renderSlot(_ctx.$slots, "default");
    };
  }
});
var TooltipProvider_default = TooltipProvider_vue_vue_type_script_setup_true_lang_default;
function omit(data, keys) {
  const result = { ...data };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}
function get(object, path, defaultValue) {
  if (typeof path === "string") {
    path = path.split(".").map((key) => {
      const numKey = Number(key);
      return Number.isNaN(numKey) ? key : numKey;
    });
  }
  let result = object;
  for (const key of path) {
    if (result === void 0 || result === null) {
      return defaultValue;
    }
    result = result[key];
  }
  return result !== void 0 ? result : defaultValue;
}
function looseToNumber(val) {
  const n = Number.parseFloat(val);
  return Number.isNaN(n) ? val : n;
}
function compare(value, currentValue, comparator) {
  if (value === void 0 || currentValue === void 0) {
    return false;
  }
  if (typeof value === "string") {
    return value === currentValue;
  }
  if (typeof comparator === "function") {
    return comparator(value, currentValue);
  }
  if (typeof comparator === "string") {
    return get(value, comparator) === get(currentValue, comparator);
  }
  return isEqual(value, currentValue);
}
function isEmpty(value) {
  if (value == null) {
    return true;
  }
  if (typeof value === "boolean" || typeof value === "number") {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (value instanceof Map || value instanceof Set) {
    return value.size === 0;
  }
  if (value instanceof Date || value instanceof RegExp || typeof value === "function") {
    return false;
  }
  if (typeof value === "object") {
    for (const _ in value) {
      if (Object.prototype.hasOwnProperty.call(value, _)) {
        return false;
      }
    }
    return true;
  }
  return false;
}
function getDisplayValue(items, value, options2 = {}) {
  const { valueKey, labelKey, by } = options2;
  const foundItem = items.find((item) => {
    const itemValue = typeof item === "object" && item !== null && valueKey ? get(item, valueKey) : item;
    return compare(itemValue, value, by);
  });
  if (isEmpty(value) && foundItem) {
    return labelKey ? get(foundItem, labelKey) : void 0;
  }
  if (isEmpty(value)) {
    return void 0;
  }
  const source = foundItem ?? value;
  if (source === null || source === void 0) {
    return void 0;
  }
  if (typeof source === "object") {
    return labelKey ? get(source, labelKey) : void 0;
  }
  return String(source);
}
function isArrayOfArray(item) {
  return Array.isArray(item[0]);
}
function mergeClasses(appConfigClass, propClass) {
  if (!appConfigClass && !propClass) {
    return "";
  }
  return [
    ...Array.isArray(appConfigClass) ? appConfigClass : [appConfigClass],
    propClass
  ].filter(Boolean);
}
function getSlotChildrenText(children) {
  return children.map((node) => {
    if (!node.children || typeof node.children === "string") return node.children || "";
    else if (Array.isArray(node.children)) return getSlotChildrenText(node.children);
    else if (node.children.default) return getSlotChildrenText(node.children.default());
  }).join("");
}
function transformUI(ui, uiProp) {
  return Object.entries(ui).reduce((acc, [key, value]) => {
    acc[key] = typeof value === "function" ? value({ class: uiProp?.[key] }) : value;
    return acc;
  }, { ...uiProp || {} });
}
function resolveBaseURL(path, baseURL2) {
  if (path?.startsWith("/") && !path.startsWith("//")) {
    const _base = withLeadingSlash(withTrailingSlash(baseURL2 || "/"));
    if (_base !== "/" && !path.startsWith(_base)) {
      return joinURL(_base, path);
    }
  }
  return path;
}
function buildTranslator(locale) {
  return (path, option) => translate(path, option, unref(locale));
}
function translate(path, option, locale) {
  const prop = get(locale, `messages.${path}`, path);
  return prop.replace(
    /\{(\w+)\}/g,
    (_, key) => `${option?.[key] ?? `{${key}}`}`
  );
}
function buildLocaleContext(locale) {
  const lang = computed(() => unref(locale).name);
  const code = computed(() => unref(locale).code);
  const dir = computed(() => unref(locale).dir);
  const localeRef = isRef(locale) ? locale : ref(locale);
  return {
    lang,
    code,
    dir,
    locale: localeRef,
    t: buildTranslator(locale)
  };
}
// @__NO_SIDE_EFFECTS__
function defineLocale(options2) {
  return defu(options2, { dir: "ltr" });
}
const en = /* @__PURE__ */ defineLocale({
  name: "English",
  code: "en",
  messages: {
    alert: {
      close: "Close"
    },
    authForm: {
      hidePassword: "Hide password",
      showPassword: "Show password",
      submit: "Continue"
    },
    banner: {
      close: "Close"
    },
    calendar: {
      nextMonth: "Next month",
      nextYear: "Next year",
      prevMonth: "Previous month",
      prevYear: "Previous year"
    },
    carousel: {
      dots: "Choose slide to display",
      goto: "Go to slide {slide}",
      next: "Next",
      prev: "Prev"
    },
    chatPrompt: {
      placeholder: "Type your message here…"
    },
    chatPromptSubmit: {
      label: "Send prompt"
    },
    colorMode: {
      dark: "Dark",
      light: "Light",
      switchToDark: "Switch to dark mode",
      switchToLight: "Switch to light mode",
      system: "System"
    },
    commandPalette: {
      back: "Back",
      close: "Close",
      noData: "No data",
      noMatch: "No matching data",
      placeholder: "Type a command or search…"
    },
    contentSearch: {
      links: "Links",
      search: "Results",
      theme: "Theme"
    },
    contentSearchButton: {
      label: "Search…"
    },
    contentToc: {
      title: "On this page"
    },
    dropdownMenu: {
      noMatch: "No matching data",
      search: "Search…"
    },
    dashboardSearch: {
      theme: "Theme"
    },
    dashboardSearchButton: {
      label: "Search…"
    },
    dashboardSidebarCollapse: {
      collapse: "Collapse sidebar",
      expand: "Expand sidebar"
    },
    dashboardSidebarToggle: {
      close: "Close sidebar",
      open: "Open sidebar"
    },
    error: {
      clear: "Back to home"
    },
    fileUpload: {
      removeFile: "Remove {filename}"
    },
    header: {
      close: "Close menu",
      open: "Open menu"
    },
    inputMenu: {
      create: 'Create "{label}"',
      noData: "No data",
      noMatch: "No matching data"
    },
    inputNumber: {
      decrement: "Decrement",
      increment: "Increment"
    },
    listbox: {
      noData: "No data",
      noMatch: "No matching data",
      search: "Search…"
    },
    modal: {
      close: "Close"
    },
    pricingTable: {
      caption: "Pricing plan comparison"
    },
    prose: {
      codeCollapse: {
        closeText: "Collapse",
        name: "code",
        openText: "Expand"
      },
      collapsible: {
        closeText: "Hide",
        name: "properties",
        openText: "Show"
      },
      pre: {
        copy: "Copy code to clipboard"
      },
      prompt: {
        copy: "Copy prompt",
        openIn: "Open in {name}"
      }
    },
    chatReasoning: {
      thinking: "Thinking…",
      thought: "Thought",
      thoughtFor: "Thought for {duration}"
    },
    sidebar: {
      close: "Close",
      toggle: "Toggle"
    },
    selectMenu: {
      create: 'Create "{label}"',
      noData: "No data",
      noMatch: "No matching data",
      search: "Search…"
    },
    slideover: {
      close: "Close"
    },
    table: {
      noData: "No data"
    },
    toast: {
      close: "Close"
    }
  }
});
const localeContextInjectionKey = /* @__PURE__ */ Symbol.for("nuxt-ui.locale-context");
const _useLocale = (localeOverrides) => {
  const locale = localeOverrides || toRef(inject(localeContextInjectionKey, en));
  return buildLocaleContext(computed(() => locale.value || en));
};
const useLocale = _useLocale;
const portalTargetInjectionKey = /* @__PURE__ */ Symbol("nuxt-ui.portal-target");
function usePortal(portal) {
  const globalPortal = inject(portalTargetInjectionKey, void 0);
  const value = computed(() => portal.value === true ? globalPortal?.value : portal.value);
  const disabled = computed(() => typeof value.value === "boolean" ? !value.value : false);
  const to = computed(() => typeof value.value === "boolean" ? "body" : value.value);
  return computed(() => ({
    to: to.value,
    disabled: disabled.value
  }));
}
const [_injectThemeContext] = createContext("UTheme", "RootContext");
const defaultThemeContext = {
  defaults: computed(() => ({}))
};
function injectThemeContext(fallback = defaultThemeContext) {
  return _injectThemeContext(fallback);
}
function camelCase(str) {
  return str.replace(/-(\w)/g, (_, c) => c.toUpperCase());
}
function kebabCase(str) {
  return str.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}
function propIsDefined(vnode, prop) {
  if (!vnode || !vnode.props) return false;
  return vnode.props[camelCase(prop)] !== void 0 || vnode.props[kebabCase(prop)] !== void 0;
}
function useComponentProps(name, props) {
  const vm = getCurrentInstance();
  const { defaults } = injectThemeContext();
  const appConfig2 = useAppConfig();
  return new Proxy(props, {
    get(target, prop, receiver) {
      if (prop === "__v_isReactive") return true;
      if (prop === "__v_raw") return target;
      const raw = Reflect.get(target, prop, receiver);
      if (typeof prop !== "string") return raw;
      const themeEntry = name.includes(".") ? get(defaults.value, name) : defaults.value[name];
      if (prop === "ui") {
        const themeUi = themeEntry?.ui;
        if (!raw && !themeUi) return raw;
        return defu(raw ?? {}, themeUi ?? {});
      }
      if (vm && propIsDefined(vm.vnode, prop)) return raw;
      const themeValue = themeEntry?.[prop];
      if (themeValue !== void 0) return themeValue;
      const propDef = vm?.type?.props?.[prop];
      if (propDef && Object.prototype.hasOwnProperty.call(propDef, "default")) {
        return raw;
      }
      const appConfigEntry = name.includes(".") ? get(appConfig2.ui ?? {}, name) : appConfig2.ui?.[name];
      return appConfigEntry?.defaultVariants?.[prop];
    },
    // `has`, `ownKeys`, and `getOwnPropertyDescriptor` reflect the underlying
    // `defineProps` schema only — theme defaults are NOT enumerable. As a
    // result, `Object.keys(props)`, `for…in`, and `{ ...props }` see only the
    // declared prop keys, but each value lookup still flows through the proxy.
    // This is the contract our internal `useForwardProps` relies on.
    has: (t, p) => Reflect.has(t, p),
    ownKeys: (t) => Reflect.ownKeys(t),
    getOwnPropertyDescriptor: (t, p) => Reflect.getOwnPropertyDescriptor(t, p)
  });
}
function useForwardProps(source, emits) {
  const emitAsProps = emits ? useEmitAsProps(emits) : {};
  return computed(() => {
    const src = isRef(source) ? source.value : source;
    const out = { ...emitAsProps };
    for (const key in src) {
      const value = src[key];
      if (value !== void 0) out[key] = value;
    }
    return out;
  });
}
const toastMaxInjectionKey = /* @__PURE__ */ Symbol("nuxt-ui.toast-max");
function useToast() {
  const toasts = useState("toasts", () => []);
  const max = inject(toastMaxInjectionKey, void 0);
  const running2 = ref(false);
  const queue = [];
  const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  async function processQueue() {
    if (running2.value || queue.length === 0) {
      return;
    }
    running2.value = true;
    while (queue.length > 0) {
      const toast = queue.shift();
      await nextTick();
      toasts.value = [...toasts.value, toast].slice(-(max?.value ?? 5));
    }
    running2.value = false;
  }
  function add(toast) {
    const body = {
      id: generateId(),
      open: true,
      ...toast
    };
    const existingIndex = toasts.value.findIndex((t) => t.id === body.id);
    if (existingIndex !== -1) {
      toasts.value[existingIndex] = {
        ...toasts.value[existingIndex],
        ...body,
        _duplicate: (toasts.value[existingIndex]._duplicate || 0) + 1
      };
      return body;
    }
    queue.push(body);
    processQueue();
    return body;
  }
  function update(id, toast) {
    const index2 = toasts.value.findIndex((t) => t.id === id);
    if (index2 !== -1) {
      toasts.value[index2] = {
        ...toasts.value[index2],
        ...toast,
        duration: toast.duration,
        open: true,
        _updated: true
      };
      nextTick(() => {
        const i = toasts.value.findIndex((t) => t.id === id);
        if (i !== -1 && toasts.value[i]._updated) {
          toasts.value[i] = {
            ...toasts.value[i],
            _updated: void 0
          };
        }
      });
    }
  }
  function remove(id) {
    const index2 = toasts.value.findIndex((t) => t.id === id);
    if (index2 !== -1 && toasts.value[index2]._updated) {
      return;
    }
    if (index2 !== -1) {
      toasts.value[index2] = {
        ...toasts.value[index2],
        open: false
      };
    }
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id);
    }, 200);
  }
  function clear() {
    toasts.value = [];
  }
  return {
    toasts,
    add,
    update,
    remove,
    clear
  };
}
const appConfigTv = appConfig;
const config = appConfigTv.ui?.tv;
const baseTv = /* @__PURE__ */ createTV(config);
function findReplacer(value) {
  if (typeof value === "function") {
    return value;
  }
  if (Array.isArray(value)) {
    for (let i = value.length - 1; i >= 0; i--) {
      const replacer = findReplacer(value[i]);
      if (replacer) {
        return replacer;
      }
    }
  }
  return void 0;
}
function plainClasses(value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => plainClasses(item));
  }
  if (typeof value === "function") {
    return [];
  }
  return [value];
}
function applyReplacer(replacer, slotProps, resolveDefaults) {
  return cnMerge(replacer(resolveDefaults()), ...plainClasses(slotProps.class), ...plainClasses(slotProps.className))(config) ?? "";
}
function wrapSlots(slots, directives) {
  return new Proxy(slots, {
    get(target, key) {
      const slot = target[key];
      if (typeof slot !== "function") {
        return slot;
      }
      return (slotProps = {}) => {
        const replacer = findReplacer(slotProps.class) ?? findReplacer(slotProps.className) ?? directives?.[key];
        if (!replacer) {
          return slot(slotProps);
        }
        return applyReplacer(replacer, slotProps, () => slot({ ...slotProps, class: void 0, className: void 0 }));
      };
    }
  });
}
function extractDirectives(componentConfig) {
  if (!componentConfig || typeof componentConfig !== "object") {
    return { config: componentConfig };
  }
  let config2 = componentConfig;
  let directives;
  if (typeof componentConfig.base === "function") {
    directives = { base: componentConfig.base };
    config2 = { ...config2, base: "" };
  }
  const slots = componentConfig.slots;
  if (slots && typeof slots === "object") {
    const replacers = Object.entries(slots).filter(([, value]) => typeof value === "function");
    if (replacers.length) {
      directives ??= {};
      const cleaned = { ...slots };
      for (const [slot, replacer] of replacers) {
        directives[slot] = replacer;
        cleaned[slot] = "";
      }
      config2 = { ...config2, slots: cleaned };
    }
  }
  return { config: config2, directives };
}
const tv = ((componentConfig) => {
  const { config: cleanConfig, directives } = extractDirectives(componentConfig);
  const component = baseTv(cleanConfig);
  return new Proxy(component, {
    apply(target, thisArg, args) {
      const result = Reflect.apply(target, thisArg, args);
      if (result && typeof result === "object") {
        return wrapSlots(result, directives);
      }
      if (typeof result === "string") {
        const slotProps = args[0] ?? {};
        const replacer = findReplacer(slotProps.class) ?? findReplacer(slotProps.className) ?? directives?.base;
        if (replacer) {
          return applyReplacer(replacer, slotProps, () => Reflect.apply(target, thisArg, [{ ...slotProps, class: void 0, className: void 0 }]));
        }
      }
      return result;
    }
  });
});
async function loadIcon(name, timeout) {
  if (!name)
    return null;
  const _icon = getIcon(name);
  if (_icon)
    return _icon;
  let timeoutWarn;
  const load = loadIcon$1(name).catch(() => {
    console.warn(`[Icon] failed to load icon \`${name}\``);
    return null;
  });
  if (timeout > 0)
    await Promise.race([
      load,
      new Promise((resolve) => {
        timeoutWarn = setTimeout(() => {
          console.warn(`[Icon] loading icon \`${name}\` timed out after ${timeout}ms`);
          resolve();
        }, timeout);
      })
    ]).finally(() => clearTimeout(timeoutWarn));
  else
    await load;
  return getIcon(name);
}
function useResolvedName(getName) {
  const options2 = useAppConfig().icon;
  const collections = (options2.collections || []).sort((a, b) => b.length - a.length);
  return computed(() => {
    const name = getName();
    const bare = name.startsWith(options2.cssSelectorPrefix) ? name.slice(options2.cssSelectorPrefix.length) : name;
    const resolved = options2.aliases?.[bare] || bare;
    if (!resolved.includes(":")) {
      const collection = collections.find((c) => resolved.startsWith(c + "-"));
      return collection ? collection + ":" + resolved.slice(collection.length + 1) : resolved;
    }
    return resolved;
  });
}
function resolveCustomizeFn(customize, globalCustomize) {
  if (customize === false) return void 0;
  if (customize === true || customize === null) return globalCustomize;
  return customize;
}
const SYMBOL_SERVER_CSS = "NUXT_ICONS_SERVER_CSS";
function escapeCssSelector(selector) {
  return selector.replace(/([^\w-])/g, "\\$1");
}
const NuxtIconCss = /* @__PURE__ */ defineComponent({
  name: "NuxtIconCss",
  props: {
    name: {
      type: String,
      required: true
    },
    customize: {
      type: [Function, Boolean, null],
      default: null,
      required: false
    }
  },
  setup(props) {
    const nuxt = useNuxtApp();
    const options2 = useAppConfig().icon;
    const cssClass = computed(() => {
      if (!props.name) return "";
      const base = options2.cssSelectorPrefix + props.name;
      if (typeof props.customize === "function") {
        return base + "--customized-" + hash(props.customize.toString());
      }
      return base;
    });
    const selector = computed(() => "." + escapeCssSelector(cssClass.value));
    function getCSS(icon, withLayer = true) {
      let iconSelector = selector.value;
      if (options2.cssWherePseudo) {
        iconSelector = `:where(${iconSelector})`;
      }
      const css = getIconCSS(icon, {
        iconSelector,
        format: "compressed",
        customise: resolveCustomizeFn(props.customize, options2.customize)
      });
      if (options2.cssLayer && withLayer) {
        return `@layer ${options2.cssLayer} { ${css} }`;
      }
      return css;
    }
    onServerPrefetch(async () => {
      {
        const configs = (/* @__PURE__ */ useRuntimeConfig()).icon || {};
        if (!configs?.serverKnownCssClasses?.includes(cssClass.value)) {
          const icon = await loadIcon(props.name, options2.fetchTimeout).catch(() => null);
          if (!icon)
            return null;
          let ssrCSS = nuxt.vueApp._context.provides[SYMBOL_SERVER_CSS];
          if (!ssrCSS) {
            ssrCSS = nuxt.vueApp._context.provides[SYMBOL_SERVER_CSS] = /* @__PURE__ */ new Map();
            nuxt.runWithContext(() => {
              useHead({
                style: [
                  () => {
                    const sep = "";
                    let css = Array.from(ssrCSS.values()).sort().join(sep);
                    if (options2.cssLayer) {
                      css = `@layer ${options2.cssLayer} {${sep}${css}${sep}}`;
                    }
                    return { innerHTML: css };
                  }
                ]
              }, {
                tagPriority: "low"
              });
            });
          }
          if (cssClass.value && !ssrCSS.has(cssClass.value)) {
            const css = getCSS(icon, false);
            ssrCSS.set(cssClass.value, css);
          }
          return null;
        }
      }
    });
    return () => h("span", { class: ["iconify", cssClass.value] });
  }
});
const __nuxt_component_2 = defineComponent({
  name: "ServerPlaceholder",
  render() {
    return createElementBlock("div");
  }
});
const clientOnlySymbol = /* @__PURE__ */ Symbol.for("nuxt:client-only");
const __nuxt_component_0$2 = defineComponent({
  name: "ClientOnly",
  inheritAttrs: false,
  props: ["fallback", "placeholder", "placeholderTag", "fallbackTag"],
  ...false,
  setup(props, { slots, attrs }) {
    const mounted = shallowRef(false);
    const vm = getCurrentInstance();
    if (vm) {
      vm._nuxtClientOnly = true;
    }
    provide(clientOnlySymbol, true);
    return () => {
      if (mounted.value) {
        const vnodes = slots.default?.();
        if (vnodes && vnodes.length === 1) {
          return [cloneVNode(vnodes[0], attrs)];
        }
        return vnodes;
      }
      const slot = slots.fallback || slots.placeholder;
      if (slot) {
        return h(slot);
      }
      const fallbackStr = props.fallback || props.placeholder || "";
      const fallbackTag = props.fallbackTag || props.placeholderTag || "span";
      return createElementBlock(fallbackTag, attrs, fallbackStr);
    };
  }
});
function defineKeyedFunctionFactory(factory) {
  const placeholder = function() {
    throw new Error(`[nuxt] \`${factory.name}\` is a compiler macro and cannot be called at runtime.`);
  };
  return Object.defineProperty(placeholder, "__nuxt_factory", {
    enumerable: false,
    get: () => factory.factory
  });
}
const createUseAsyncData = defineKeyedFunctionFactory({
  name: "createUseAsyncData",
  factory(options2 = {}) {
    function useAsyncData2(...args) {
      const autoKey = typeof args[args.length - 1] === "string" ? args.pop() : void 0;
      if (_isAutoKeyNeeded(args[0], args[1])) {
        args.unshift(autoKey);
      }
      let [_key, _handler, opts = {}] = args;
      const isKeyReactive = isRef(_key) || typeof _key === "function";
      const key = isKeyReactive ? computed(() => toValue(_key)) : { value: _key };
      if (!key.value || typeof key.value !== "string") {
        throw new TypeError("[nuxt] [useAsyncData] key must be a non-empty string.");
      }
      if (typeof _handler !== "function") {
        throw new TypeError("[nuxt] [useAsyncData] handler must be a function.");
      }
      const shouldFactoryOptionsOverride = typeof options2 === "function";
      const nuxtApp = useNuxtApp();
      const factoryOptions = shouldFactoryOptionsOverride ? options2(opts) : options2;
      if (!shouldFactoryOptionsOverride) {
        for (const key2 in factoryOptions) {
          if (factoryOptions[key2] === void 0) {
            continue;
          }
          if (opts[key2] !== void 0) {
            continue;
          }
          opts[key2] = factoryOptions[key2];
        }
      }
      opts.server ??= true;
      opts.default ??= getDefault;
      opts.getCachedData ??= getDefaultCachedData;
      opts.lazy ??= false;
      opts.immediate ??= true;
      opts.deep ??= asyncDataDefaults.deep;
      opts.dedupe ??= "cancel";
      if (shouldFactoryOptionsOverride) {
        for (const key2 in factoryOptions) {
          if (factoryOptions[key2] === void 0) {
            continue;
          }
          opts[key2] = factoryOptions[key2];
        }
      }
      nuxtApp._asyncData[key.value];
      function createInitialFetch() {
        const initialFetchOptions = { cause: "initial", dedupe: opts.dedupe };
        const existing = nuxtApp._asyncData[key.value];
        if (!existing?._init) {
          initialFetchOptions.cachedData = opts.getCachedData(key.value, nuxtApp, { cause: "initial" });
          nuxtApp._asyncData[key.value] = buildAsyncData(nuxtApp, key.value, _handler, opts, initialFetchOptions.cachedData);
          nuxtApp._asyncData[key.value]._initialCachedData = initialFetchOptions.cachedData;
        } else if (nuxtApp._asyncDataPromises[key.value]) {
          initialFetchOptions.cachedData = existing._initialCachedData;
        }
        return () => nuxtApp._asyncData[key.value].execute(initialFetchOptions);
      }
      const initialFetch = createInitialFetch();
      const asyncData = nuxtApp._asyncData[key.value];
      asyncData._deps++;
      const fetchOnServer = opts.server !== false && nuxtApp.payload.serverRendered;
      if (fetchOnServer && opts.immediate) {
        const promise = initialFetch();
        if (getCurrentInstance()) {
          onServerPrefetch(() => promise);
        } else {
          nuxtApp.hook("app:created", async () => {
            await promise;
          });
        }
      }
      const asyncReturn = {
        data: writableComputedRef(() => nuxtApp._asyncData[key.value]?.data),
        pending: writableComputedRef(() => nuxtApp._asyncData[key.value]?.pending),
        status: writableComputedRef(() => nuxtApp._asyncData[key.value]?.status),
        error: writableComputedRef(() => nuxtApp._asyncData[key.value]?.error),
        refresh: (...args2) => {
          if (!nuxtApp._asyncData[key.value]?._init) {
            const initialFetch2 = createInitialFetch();
            return initialFetch2();
          }
          return nuxtApp._asyncData[key.value].execute(...args2);
        },
        execute: (...args2) => asyncReturn.refresh(...args2),
        clear: () => {
          const entry2 = nuxtApp._asyncData[key.value];
          if (entry2?._abortController) {
            try {
              entry2._abortController.abort(new DOMException("AsyncData aborted by user.", "AbortError"));
            } finally {
              entry2._abortController = void 0;
            }
          }
          clearNuxtDataByKey(nuxtApp, key.value);
        }
      };
      const asyncDataPromise = Promise.resolve(nuxtApp._asyncDataPromises[key.value]).then(() => asyncReturn);
      Object.assign(asyncDataPromise, asyncReturn);
      Object.defineProperties(asyncDataPromise, {
        then: { enumerable: true, value: asyncDataPromise.then.bind(asyncDataPromise) },
        catch: { enumerable: true, value: asyncDataPromise.catch.bind(asyncDataPromise) },
        finally: { enumerable: true, value: asyncDataPromise.finally.bind(asyncDataPromise) }
      });
      return asyncDataPromise;
    }
    return useAsyncData2;
  }
});
const useAsyncData = createUseAsyncData.__nuxt_factory();
createUseAsyncData.__nuxt_factory({
  lazy: true,
  // @ts-expect-error private property
  _functionName: "useLazyAsyncData"
});
function writableComputedRef(getter) {
  return computed({
    get() {
      return getter()?.value;
    },
    set(value) {
      const ref2 = getter();
      if (ref2) {
        ref2.value = value;
      }
    }
  });
}
function _isAutoKeyNeeded(keyOrFetcher, fetcher) {
  if (typeof keyOrFetcher === "string") {
    return false;
  }
  if (typeof keyOrFetcher === "object" && keyOrFetcher !== null) {
    return false;
  }
  if (typeof keyOrFetcher === "function" && typeof fetcher === "function") {
    return false;
  }
  return true;
}
function clearNuxtDataByKey(nuxtApp, key) {
  if (key in nuxtApp.payload.data) {
    nuxtApp.payload.data[key] = void 0;
  }
  if (key in nuxtApp.payload._errors) {
    nuxtApp.payload._errors[key] = void 0;
  }
  if (nuxtApp._asyncData[key]) {
    nuxtApp._asyncData[key].data.value = unref(nuxtApp._asyncData[key]._default());
    nuxtApp._asyncData[key].error.value = void 0;
    nuxtApp._asyncData[key].status.value = "idle";
    nuxtApp._asyncData[key]._initialCachedData = void 0;
  }
  if (key in nuxtApp._asyncDataPromises) {
    nuxtApp._asyncDataPromises[key] = void 0;
  }
}
function pick$1(obj, keys) {
  const newObj = {};
  for (const key of keys) {
    newObj[key] = obj[key];
  }
  return newObj;
}
function buildAsyncData(nuxtApp, key, _handler, options2, initialCachedData) {
  nuxtApp.payload._errors[key] ??= void 0;
  const hasCustomGetCachedData = options2.getCachedData !== getDefaultCachedData;
  const handler = _handler ;
  const _ref = options2.deep ? ref : shallowRef;
  const hasCachedData = initialCachedData !== void 0;
  const unsubRefreshAsyncData = nuxtApp.hook("app:data:refresh", async (keys) => {
    if (!keys || keys.includes(key)) {
      await asyncData.execute({ cause: "refresh:hook" });
    }
  });
  const asyncData = {
    data: _ref(hasCachedData ? initialCachedData : options2.default()),
    pending: computed(() => asyncData.status.value === "pending"),
    error: toRef(nuxtApp.payload._errors, key),
    status: shallowRef("idle"),
    execute: (...args) => {
      const [_opts, newValue = void 0] = args;
      const opts = _opts && newValue === void 0 && typeof _opts === "object" ? _opts : {};
      if (nuxtApp._asyncDataPromises[key]) {
        if ((opts.dedupe ?? options2.dedupe) === "defer") {
          return nuxtApp._asyncDataPromises[key];
        }
      }
      {
        const cachedData = "cachedData" in opts ? opts.cachedData : options2.getCachedData(key, nuxtApp, { cause: opts.cause ?? "refresh:manual" });
        if (cachedData !== void 0) {
          nuxtApp.payload.data[key] = asyncData.data.value = cachedData;
          asyncData.error.value = void 0;
          asyncData.status.value = "success";
          return Promise.resolve(cachedData);
        }
      }
      if (asyncData._abortController) {
        asyncData._abortController.abort(new DOMException("AsyncData request cancelled by deduplication", "AbortError"));
      }
      asyncData._abortController = new AbortController();
      asyncData.status.value = "pending";
      const cleanupController = new AbortController();
      const promise = new Promise(
        (resolve, reject) => {
          try {
            const timeout = opts.timeout ?? options2.timeout;
            const mergedSignal = mergeAbortSignals([asyncData._abortController?.signal, opts?.signal], cleanupController.signal, timeout);
            if (mergedSignal.aborted) {
              const reason = mergedSignal.reason;
              reject(reason instanceof Error ? reason : new DOMException(String(reason ?? "Aborted"), "AbortError"));
              return;
            }
            mergedSignal.addEventListener("abort", () => {
              const reason = mergedSignal.reason;
              reject(reason instanceof Error ? reason : new DOMException(String(reason ?? "Aborted"), "AbortError"));
            }, { once: true, signal: cleanupController.signal });
            return Promise.resolve(handler(nuxtApp, { signal: mergedSignal })).then(resolve, reject);
          } catch (err) {
            reject(err);
          }
        }
      ).then(async (_result) => {
        if (nuxtApp._asyncDataPromises[key] !== promise) {
          return;
        }
        let result = _result;
        if (options2.transform) {
          result = await options2.transform(_result);
        }
        if (options2.pick) {
          result = pick$1(result, options2.pick);
        }
        nuxtApp.payload.data[key] = result;
        asyncData.data.value = result;
        asyncData.error.value = void 0;
        asyncData.status.value = "success";
      }).catch((error2) => {
        if (nuxtApp._asyncDataPromises[key] !== promise) {
          return nuxtApp._asyncDataPromises[key];
        }
        if (asyncData._abortController?.signal.aborted) {
          return nuxtApp._asyncDataPromises[key];
        }
        if (typeof DOMException !== "undefined" && error2 instanceof DOMException && error2.name === "AbortError") {
          asyncData.status.value = "idle";
          return nuxtApp._asyncDataPromises[key];
        }
        asyncData.error.value = createError(error2);
        asyncData.data.value = unref(options2.default());
        asyncData.status.value = "error";
      }).finally(() => {
        cleanupController.abort();
        if (nuxtApp._asyncDataPromises[key] === promise) {
          delete nuxtApp._asyncDataPromises[key];
        }
      });
      nuxtApp._asyncDataPromises[key] = promise;
      return nuxtApp._asyncDataPromises[key];
    },
    _execute: debounce((...args) => asyncData.execute(...args), 0, { leading: true }),
    _default: options2.default,
    _deps: 0,
    _init: true,
    _hash: void 0,
    _off: () => {
      unsubRefreshAsyncData();
      if (nuxtApp._asyncData[key]?._init) {
        nuxtApp._asyncData[key]._init = false;
      }
      if (!hasCustomGetCachedData) {
        nextTick(() => {
          if (!nuxtApp._asyncData[key]?._init) {
            clearNuxtDataByKey(nuxtApp, key);
            asyncData.execute = () => Promise.resolve();
          }
        });
      }
    }
  };
  return asyncData;
}
const getDefault = () => void 0;
const getDefaultCachedData = (key, nuxtApp, ctx) => {
  if (nuxtApp.isHydrating) {
    return nuxtApp.payload.data[key];
  }
  if (ctx.cause !== "refresh:manual" && ctx.cause !== "refresh:hook") {
    return nuxtApp.static.data[key];
  }
};
function mergeAbortSignals(signals, cleanupSignal, timeout) {
  const list = signals.filter((s) => !!s);
  if (typeof timeout === "number" && timeout >= 0) {
    const timeoutSignal = AbortSignal.timeout?.(timeout);
    if (timeoutSignal) {
      list.push(timeoutSignal);
    }
  }
  if (AbortSignal.any) {
    return AbortSignal.any(list);
  }
  const controller = new AbortController();
  for (const sig of list) {
    if (sig.aborted) {
      const reason = sig.reason ?? new DOMException("Aborted", "AbortError");
      try {
        controller.abort(reason);
      } catch {
        controller.abort();
      }
      return controller.signal;
    }
  }
  const onAbort = () => {
    const abortedSignal = list.find((s) => s.aborted);
    const reason = abortedSignal?.reason ?? new DOMException("Aborted", "AbortError");
    try {
      controller.abort(reason);
    } catch {
      controller.abort();
    }
  };
  for (const sig of list) {
    sig.addEventListener?.("abort", onAbort, { once: true, signal: cleanupSignal });
  }
  return controller.signal;
}
const NuxtIconSvg = /* @__PURE__ */ defineComponent({
  name: "NuxtIconSvg",
  props: {
    name: {
      type: String,
      required: true
    },
    customize: {
      type: [Function, Boolean, null],
      default: null,
      required: false
    }
  },
  setup(props, { slots }) {
    useNuxtApp();
    const options2 = useAppConfig().icon;
    const name = useResolvedName(() => props.name);
    const storeKey = "i-" + name.value;
    if (name.value) {
      onServerPrefetch(async () => {
        {
          await useAsyncData(
            storeKey,
            async () => await loadIcon(name.value, options2.fetchTimeout),
            { deep: false }
          );
        }
      });
    }
    return () => h(Icon, {
      icon: name.value,
      ssr: true,
      // Iconify uses `customise`, where we expose `customize` for consistency
      customise: resolveCustomizeFn(props.customize, options2.customize)
    }, slots);
  }
});
const NuxtIcon = defineComponent({
  name: "NuxtIcon",
  props: {
    name: {
      type: String,
      required: true
    },
    mode: {
      type: String,
      required: false,
      default: null
    },
    size: {
      type: [Number, String],
      required: false,
      default: null
    },
    customize: {
      type: [Function, Boolean, null],
      default: null,
      required: false
    }
  },
  setup(props, { slots }) {
    const nuxtApp = useNuxtApp();
    const runtimeOptions = useAppConfig().icon;
    const name = useResolvedName(() => props.name);
    const component = computed(
      () => nuxtApp.vueApp?.component(name.value) || ((props.mode || runtimeOptions.mode) === "svg" ? NuxtIconSvg : NuxtIconCss)
    );
    const style = computed(() => {
      const size = props.size || runtimeOptions.size;
      return size ? { fontSize: Number.isNaN(+size) ? size : size + "px" } : null;
    });
    return () => h(
      component.value,
      {
        ...runtimeOptions.attrs,
        name: name.value,
        class: runtimeOptions.class,
        style: style.value,
        customize: props.customize
      },
      slots
    );
  }
});
const index = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: NuxtIcon
}, Symbol.toStringTag, { value: "Module" }));
const _sfc_main$f = {
  __name: "UIcon",
  __ssrInlineRender: true,
  props: {
    name: { type: null, required: true },
    mode: { type: String, required: false },
    size: { type: [String, Number], required: false },
    customize: { type: [Function, Boolean, null], required: false }
  },
  setup(__props) {
    const props = __props;
    const iconProps = useForwardProps$1(reactivePick(props, "mode", "size", "customize"));
    return (_ctx, _push, _parent, _attrs) => {
      if (typeof __props.name === "string") {
        _push(ssrRenderComponent(unref(NuxtIcon), mergeProps({ name: __props.name }, unref(iconProps), _attrs), null, _parent));
      } else {
        ssrRenderVNode(_push, createVNode(resolveDynamicComponent(__props.name), _attrs, null), _parent);
      }
    };
  }
};
const _sfc_setup$f = _sfc_main$f.setup;
_sfc_main$f.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../node_modules/@nuxt/ui/dist/runtime/components/Icon.vue");
  return _sfc_setup$f ? _sfc_setup$f(props, ctx) : void 0;
};
const ImageComponent = "img";
const avatarGroupInjectionKey = /* @__PURE__ */ Symbol("nuxt-ui.avatar-group");
function useAvatarGroup(props) {
  const avatarGroup = inject(avatarGroupInjectionKey, void 0);
  const size = computed(() => props.size ?? avatarGroup?.value.size);
  const color = computed(() => props.color ?? avatarGroup?.value.color);
  provide(avatarGroupInjectionKey, computed(() => ({ size: size.value, color: color.value })));
  return {
    size,
    color
  };
}
const theme$6 = {
  "slots": {
    "root": "relative inline-flex items-center justify-center shrink-0",
    "base": "rounded-full ring ring-bg flex items-center justify-center text-inverted font-medium whitespace-nowrap"
  },
  "variants": {
    "color": {
      "primary": "bg-primary",
      "secondary": "bg-secondary",
      "success": "bg-success",
      "info": "bg-info",
      "warning": "bg-warning",
      "error": "bg-error",
      "neutral": "bg-inverted"
    },
    "size": {
      "3xs": "h-[4px] min-w-[4px] text-[4px]",
      "2xs": "h-[5px] min-w-[5px] text-[5px]",
      "xs": "h-[6px] min-w-[6px] text-[6px]",
      "sm": "h-[7px] min-w-[7px] text-[7px]",
      "md": "h-[8px] min-w-[8px] text-[8px]",
      "lg": "h-[9px] min-w-[9px] text-[9px]",
      "xl": "h-[10px] min-w-[10px] text-[10px]",
      "2xl": "h-[11px] min-w-[11px] text-[11px]",
      "3xl": "h-[12px] min-w-[12px] text-[12px]"
    },
    "position": {
      "top-right": "top-0 right-0",
      "bottom-right": "bottom-0 right-0",
      "top-left": "top-0 left-0",
      "bottom-left": "bottom-0 left-0"
    },
    "inset": {
      "false": ""
    },
    "standalone": {
      "false": "absolute"
    }
  },
  "compoundVariants": [
    {
      "position": "top-right",
      "inset": false,
      "class": "-translate-y-1/2 translate-x-1/2 transform"
    },
    {
      "position": "bottom-right",
      "inset": false,
      "class": "translate-y-1/2 translate-x-1/2 transform"
    },
    {
      "position": "top-left",
      "inset": false,
      "class": "-translate-y-1/2 -translate-x-1/2 transform"
    },
    {
      "position": "bottom-left",
      "inset": false,
      "class": "translate-y-1/2 -translate-x-1/2 transform"
    }
  ],
  "defaultVariants": {
    "size": "md",
    "color": "primary",
    "position": "top-right"
  }
};
const _sfc_main$e = /* @__PURE__ */ Object.assign({ inheritAttrs: false }, {
  __name: "UChip",
  __ssrInlineRender: true,
  props: /* @__PURE__ */ mergeModels({
    as: { type: null, required: false },
    text: { type: [String, Number], required: false },
    color: { type: null, required: false },
    size: { type: null, required: false },
    position: { type: null, required: false },
    inset: { type: Boolean, required: false, default: false },
    standalone: { type: Boolean, required: false, default: false },
    class: { type: null, required: false },
    ui: { type: Object, required: false }
  }, {
    "show": { type: Boolean, ...{ default: true } },
    "showModifiers": {}
  }),
  emits: ["update:show"],
  setup(__props) {
    const _props = __props;
    const props = useComponentProps("chip", _props);
    const show = useModel(__props, "show", { type: Boolean, ...{ default: true } });
    const { size } = useAvatarGroup(_props);
    const appConfig2 = useAppConfig();
    const ui = computed(() => tv({ extend: tv(theme$6), ...appConfig2.ui?.chip || {} })({
      color: props.color,
      size: size.value ?? props.size,
      position: props.position,
      inset: props.inset,
      standalone: props.standalone
    }));
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(unref(Primitive), mergeProps({
        as: unref(props).as,
        "data-slot": "root",
        class: ui.value.root({ class: [unref(props).ui?.root, unref(props).class] })
      }, _attrs), {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(unref(Slot), _ctx.$attrs, {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  ssrRenderSlot(_ctx.$slots, "default", {}, null, _push3, _parent3, _scopeId2);
                } else {
                  return [
                    renderSlot(_ctx.$slots, "default")
                  ];
                }
              }),
              _: 3
            }, _parent2, _scopeId));
            if (show.value) {
              _push2(`<span data-slot="base" class="${ssrRenderClass(ui.value.base({ class: unref(props).ui?.base }))}"${_scopeId}>`);
              ssrRenderSlot(_ctx.$slots, "content", {}, () => {
                _push2(`${ssrInterpolate(unref(props).text)}`);
              }, _push2, _parent2, _scopeId);
              _push2(`</span>`);
            } else {
              _push2(`<!---->`);
            }
          } else {
            return [
              createVNode(unref(Slot), _ctx.$attrs, {
                default: withCtx(() => [
                  renderSlot(_ctx.$slots, "default")
                ]),
                _: 3
              }, 16),
              show.value ? (openBlock(), createBlock("span", {
                key: 0,
                "data-slot": "base",
                class: ui.value.base({ class: unref(props).ui?.base })
              }, [
                renderSlot(_ctx.$slots, "content", {}, () => [
                  createTextVNode(toDisplayString(unref(props).text), 1)
                ])
              ], 2)) : createCommentVNode("", true)
            ];
          }
        }),
        _: 3
      }, _parent));
    };
  }
});
const _sfc_setup$e = _sfc_main$e.setup;
_sfc_main$e.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../node_modules/@nuxt/ui/dist/runtime/components/Chip.vue");
  return _sfc_setup$e ? _sfc_setup$e(props, ctx) : void 0;
};
const theme$5 = {
  "slots": {
    "root": "inline-flex items-center justify-center shrink-0 select-none rounded-full align-middle",
    "image": "h-full w-full rounded-[inherit] object-cover",
    "fallback": "font-medium truncate",
    "icon": "shrink-0"
  },
  "variants": {
    "color": {
      "primary": {
        "root": "bg-primary/10",
        "fallback": "text-primary",
        "icon": "text-primary"
      },
      "secondary": {
        "root": "bg-secondary/10",
        "fallback": "text-secondary",
        "icon": "text-secondary"
      },
      "success": {
        "root": "bg-success/10",
        "fallback": "text-success",
        "icon": "text-success"
      },
      "info": {
        "root": "bg-info/10",
        "fallback": "text-info",
        "icon": "text-info"
      },
      "warning": {
        "root": "bg-warning/10",
        "fallback": "text-warning",
        "icon": "text-warning"
      },
      "error": {
        "root": "bg-error/10",
        "fallback": "text-error",
        "icon": "text-error"
      },
      "neutral": {
        "root": "bg-elevated",
        "fallback": "text-muted",
        "icon": "text-muted"
      }
    },
    "size": {
      "3xs": {
        "root": "size-4 text-[8px]"
      },
      "2xs": {
        "root": "size-5 text-[10px]"
      },
      "xs": {
        "root": "size-6 text-xs"
      },
      "sm": {
        "root": "size-7 text-sm"
      },
      "md": {
        "root": "size-8 text-base"
      },
      "lg": {
        "root": "size-9 text-lg"
      },
      "xl": {
        "root": "size-10 text-xl"
      },
      "2xl": {
        "root": "size-11 text-[22px]"
      },
      "3xl": {
        "root": "size-12 text-2xl"
      }
    }
  },
  "defaultVariants": {
    "size": "md",
    "color": "neutral"
  }
};
const _sfc_main$d = /* @__PURE__ */ Object.assign({ inheritAttrs: false }, {
  __name: "UAvatar",
  __ssrInlineRender: true,
  props: {
    as: { type: null, required: false },
    src: { type: String, required: false },
    alt: { type: String, required: false },
    icon: { type: null, required: false },
    text: { type: String, required: false },
    size: { type: null, required: false },
    color: { type: null, required: false },
    chip: { type: [Boolean, Object], required: false },
    class: { type: null, required: false },
    style: { type: null, required: false },
    ui: { type: Object, required: false }
  },
  setup(__props) {
    const _props = __props;
    const props = useComponentProps("avatar", _props);
    const as = computed(() => {
      if (typeof props.as === "string" || typeof props.as?.render === "function") {
        return { root: props.as };
      }
      return defu(props.as, { root: "span" });
    });
    const fallback = computed(() => props.text || (props.alt || "").split(" ").map((word) => word.charAt(0)).join("").substring(0, 2));
    const appConfig2 = useAppConfig();
    const { size, color } = useAvatarGroup(_props);
    const ui = computed(() => tv({ extend: tv(theme$5), ...appConfig2.ui?.avatar || {} })({
      size: size.value ?? props.size,
      color: color.value ?? props.color
    }));
    const rootClass = computed(() => ui.value.root({ class: [props.ui?.root, props.class] }));
    const sizePx = computed(() => {
      const sizeClass = (rootClass.value || "").split(" ").find((c) => /^size-\d+$/.test(c));
      if (sizeClass) {
        const num = Number.parseFloat(sizeClass.split("-")[1] ?? "");
        if (!Number.isNaN(num)) return num * 4;
      }
      return null;
    });
    const error2 = ref(false);
    watch(() => props.src, () => {
      if (error2.value) {
        error2.value = false;
      }
    });
    function onError() {
      error2.value = true;
    }
    return (_ctx, _push, _parent, _attrs) => {
      ssrRenderVNode(_push, createVNode(resolveDynamicComponent(unref(props).chip ? _sfc_main$e : unref(Primitive)), mergeProps({
        as: as.value.root
      }, unref(props).chip ? typeof unref(props).chip === "object" ? { inset: true, ...unref(props).chip } : { inset: true } : {}, {
        "data-slot": "root",
        class: rootClass.value,
        style: unref(props).style
      }, _attrs), {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            if (unref(props).src && !error2.value) {
              ssrRenderVNode(_push2, createVNode(resolveDynamicComponent(as.value.img || unref(ImageComponent)), mergeProps({
                src: unref(props).src,
                alt: unref(props).alt,
                width: sizePx.value,
                height: sizePx.value
              }, _ctx.$attrs, {
                "data-slot": "image",
                class: ui.value.image({ class: unref(props).ui?.image }),
                onError
              }), null), _parent2, _scopeId);
            } else {
              _push2(ssrRenderComponent(unref(Slot), _ctx.$attrs, {
                default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                  if (_push3) {
                    ssrRenderSlot(_ctx.$slots, "default", {}, () => {
                      if (unref(props).icon) {
                        _push3(ssrRenderComponent(_sfc_main$f, {
                          name: unref(props).icon,
                          "data-slot": "icon",
                          class: ui.value.icon({ class: unref(props).ui?.icon })
                        }, null, _parent3, _scopeId2));
                      } else {
                        _push3(`<span data-slot="fallback" class="${ssrRenderClass(ui.value.fallback({ class: unref(props).ui?.fallback }))}"${_scopeId2}>${ssrInterpolate(fallback.value || " ")}</span>`);
                      }
                    }, _push3, _parent3, _scopeId2);
                  } else {
                    return [
                      renderSlot(_ctx.$slots, "default", {}, () => [
                        unref(props).icon ? (openBlock(), createBlock(_sfc_main$f, {
                          key: 0,
                          name: unref(props).icon,
                          "data-slot": "icon",
                          class: ui.value.icon({ class: unref(props).ui?.icon })
                        }, null, 8, ["name", "class"])) : (openBlock(), createBlock("span", {
                          key: 1,
                          "data-slot": "fallback",
                          class: ui.value.fallback({ class: unref(props).ui?.fallback })
                        }, toDisplayString(fallback.value || " "), 3))
                      ])
                    ];
                  }
                }),
                _: 3
              }, _parent2, _scopeId));
            }
          } else {
            return [
              unref(props).src && !error2.value ? (openBlock(), createBlock(resolveDynamicComponent(as.value.img || unref(ImageComponent)), mergeProps({
                key: 0,
                src: unref(props).src,
                alt: unref(props).alt,
                width: sizePx.value,
                height: sizePx.value
              }, _ctx.$attrs, {
                "data-slot": "image",
                class: ui.value.image({ class: unref(props).ui?.image }),
                onError
              }), null, 16, ["src", "alt", "width", "height", "class"])) : (openBlock(), createBlock(unref(Slot), mergeProps({ key: 1 }, _ctx.$attrs), {
                default: withCtx(() => [
                  renderSlot(_ctx.$slots, "default", {}, () => [
                    unref(props).icon ? (openBlock(), createBlock(_sfc_main$f, {
                      key: 0,
                      name: unref(props).icon,
                      "data-slot": "icon",
                      class: ui.value.icon({ class: unref(props).ui?.icon })
                    }, null, 8, ["name", "class"])) : (openBlock(), createBlock("span", {
                      key: 1,
                      "data-slot": "fallback",
                      class: ui.value.fallback({ class: unref(props).ui?.fallback })
                    }, toDisplayString(fallback.value || " "), 3))
                  ])
                ]),
                _: 3
              }, 16))
            ];
          }
        }),
        _: 3
      }), _parent);
    };
  }
});
const _sfc_setup$d = _sfc_main$d.setup;
_sfc_main$d.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../node_modules/@nuxt/ui/dist/runtime/components/Avatar.vue");
  return _sfc_setup$d ? _sfc_setup$d(props, ctx) : void 0;
};
function useComponentIcons(componentProps) {
  const appConfig2 = useAppConfig();
  const props = computed(() => toValue(componentProps));
  const isLeading = computed(() => props.value.icon && props.value.leading || props.value.icon && !props.value.trailing || props.value.loading && !props.value.trailing || !!props.value.leadingIcon);
  const isTrailing = computed(() => props.value.icon && props.value.trailing || props.value.loading && props.value.trailing || !!props.value.trailingIcon && props.value.trailing !== false);
  const leadingIconName = computed(() => {
    if (props.value.loading) {
      return props.value.loadingIcon || appConfig2.ui.icons.loading;
    }
    return props.value.leadingIcon || props.value.icon;
  });
  const trailingIconName = computed(() => {
    if (props.value.loading && !isLeading.value) {
      return props.value.loadingIcon || appConfig2.ui.icons.loading;
    }
    return props.value.trailingIcon || props.value.icon;
  });
  return {
    isLeading,
    isTrailing,
    leadingIconName,
    trailingIconName
  };
}
const fieldGroupInjectionKey = /* @__PURE__ */ Symbol("nuxt-ui.field-group");
function useFieldGroup(props) {
  const fieldGroup = inject(fieldGroupInjectionKey, void 0);
  return {
    orientation: computed(() => fieldGroup?.value.orientation),
    size: computed(() => props?.size ?? fieldGroup?.value.size)
  };
}
const FieldGroupReset = defineComponent({
  name: "FieldGroupReset",
  setup(_, { slots }) {
    provide(fieldGroupInjectionKey, computed(() => ({
      size: void 0,
      orientation: void 0
    })));
    return () => slots.default?.();
  }
});
const formOptionsInjectionKey = /* @__PURE__ */ Symbol("nuxt-ui.form-options");
const formBusInjectionKey = /* @__PURE__ */ Symbol("nuxt-ui.form-events");
const formFieldInjectionKey = /* @__PURE__ */ Symbol("nuxt-ui.form-field");
const inputIdInjectionKey = /* @__PURE__ */ Symbol("nuxt-ui.input-id");
const formInputsInjectionKey = /* @__PURE__ */ Symbol("nuxt-ui.form-inputs");
const formLoadingInjectionKey = /* @__PURE__ */ Symbol("nuxt-ui.form-loading");
const formErrorsInjectionKey = /* @__PURE__ */ Symbol("nuxt-ui.form-errors");
function useFormField(props, opts) {
  const formOptions = inject(formOptionsInjectionKey, void 0);
  const formBus = inject(formBusInjectionKey, void 0);
  const formField = inject(formFieldInjectionKey, void 0);
  const inputId = inject(inputIdInjectionKey, void 0);
  provide(formFieldInjectionKey, void 0);
  if (formField && inputId) {
    if (props?.id) {
      inputId.value = props?.id;
    }
  }
  function emitFormEvent(type, name, eager) {
    if (formBus && formField && name) {
      formBus.emit({ type, name, eager });
    }
  }
  function emitFormBlur() {
    emitFormEvent("blur", formField?.value.name);
  }
  function emitFormFocus() {
    emitFormEvent("focus", formField?.value.name);
  }
  function emitFormChange() {
    emitFormEvent("change", formField?.value.name);
  }
  const emitFormInput = useDebounceFn(
    () => {
      emitFormEvent("input", formField?.value.name, true);
    },
    formField?.value.validateOnInputDelay ?? formOptions?.value.validateOnInputDelay ?? 0
  );
  return {
    id: computed(() => props?.id ?? inputId?.value),
    name: computed(() => props?.name ?? formField?.value.name),
    size: computed(() => props?.size ?? formField?.value.size),
    color: computed(() => formField?.value.error ? "error" : props?.color),
    highlight: computed(() => formField?.value.error ? true : props?.highlight),
    disabled: computed(() => formOptions?.value.disabled || props?.disabled),
    emitFormBlur,
    emitFormInput,
    emitFormChange,
    emitFormFocus,
    ariaAttrs: computed(() => {
      if (!formField?.value) return;
      const descriptiveAttrs = ["error", "hint", "description", "help"].filter((type) => formField?.value?.[type]).map((type) => `${formField?.value.ariaId}-${type}`) || [];
      const attrs = {
        "aria-invalid": !!formField?.value.error
      };
      if (descriptiveAttrs.length > 0) {
        attrs["aria-describedby"] = descriptiveAttrs.join(" ");
      }
      return attrs;
    })
  };
}
const linkKeys = [
  "active",
  "activeClass",
  "ariaCurrentValue",
  "as",
  "disabled",
  "download",
  "exact",
  "exactActiveClass",
  "exactHash",
  "exactQuery",
  "external",
  "form",
  "formaction",
  "formenctype",
  "formmethod",
  "formnovalidate",
  "formtarget",
  "href",
  "hreflang",
  "inactiveClass",
  "locale",
  "media",
  "noPrefetch",
  "noRel",
  "onClick",
  "ping",
  "prefetch",
  "prefetchOn",
  "prefetchedClass",
  "referrerpolicy",
  "rel",
  "replace",
  "target",
  "title",
  "to",
  "trailingSlash",
  "type",
  "viewTransition"
];
function pickLinkProps(link) {
  const keys = Object.keys(link);
  const ariaKeys = keys.filter((key) => key.startsWith("aria-"));
  const dataKeys = keys.filter((key) => key.startsWith("data-"));
  const propsToInclude = [
    ...linkKeys,
    ...ariaKeys,
    ...dataKeys
  ];
  return reactivePick(link, ...propsToInclude);
}
function isPartiallyEqual(item1, item2) {
  const diffedKeys = diff(item1, item2).reduce((filtered, q) => {
    if (q.type === "added") {
      filtered.add(q.key);
    }
    return filtered;
  }, /* @__PURE__ */ new Set());
  const item1Filtered = Object.fromEntries(Object.entries(item1).filter(([key]) => !diffedKeys.has(key)));
  const item2Filtered = Object.fromEntries(Object.entries(item2).filter(([key]) => !diffedKeys.has(key)));
  return isEqual(item1Filtered, item2Filtered);
}
const firstNonUndefined = (...args) => args.find((arg) => arg !== void 0);
function sanitizeExternalHref(value) {
  let candidate = value.replace(/[\u0000-\u001F\s]+/g, "");
  while (candidate.toLowerCase().startsWith("view-source:")) {
    candidate = candidate.slice("view-source:".length);
  }
  const colon = candidate.indexOf(":");
  if (colon > 0 && isScriptProtocol(candidate.slice(0, colon + 1))) {
    return null;
  }
  return value;
}
// @__NO_SIDE_EFFECTS__
function defineNuxtLink(options2) {
  const componentName = options2.componentName || "NuxtLink";
  function isHashLinkWithoutHashMode(link) {
    return typeof link === "string" && link.startsWith("#");
  }
  function resolveTrailingSlashBehavior(to, resolve, trailingSlash) {
    const effectiveTrailingSlash = trailingSlash ?? options2.trailingSlash;
    if (!to || effectiveTrailingSlash !== "append" && effectiveTrailingSlash !== "remove") {
      return to;
    }
    if (typeof to === "string") {
      return applyTrailingSlashBehavior(to, effectiveTrailingSlash);
    }
    const path = "path" in to && to.path !== void 0 ? to.path : resolve(to).path;
    const resolvedPath = {
      ...to,
      name: void 0,
      // named routes would otherwise always override trailing slash behavior
      path: applyTrailingSlashBehavior(path, effectiveTrailingSlash)
    };
    return resolvedPath;
  }
  function useNuxtLink(props) {
    const router = useRouter();
    const config2 = /* @__PURE__ */ useRuntimeConfig();
    const hasTarget = computed(() => !!unref(props.target) && unref(props.target) !== "_self");
    const isAbsoluteUrl = computed(() => {
      const path = unref(props.to) || unref(props.href) || "";
      return typeof path === "string" && hasProtocol(path, { acceptRelative: true });
    });
    const builtinRouterLink = resolveComponent("RouterLink");
    const useBuiltinLink = builtinRouterLink && typeof builtinRouterLink !== "string" ? builtinRouterLink.useLink : void 0;
    const isExternal = computed(() => {
      if (unref(props.external)) {
        return true;
      }
      const path = unref(props.to) || unref(props.href) || "";
      if (typeof path === "object") {
        return false;
      }
      return path === "" || isAbsoluteUrl.value;
    });
    const to = computed(() => {
      const path = unref(props.to) || unref(props.href) || "";
      if (isExternal.value) {
        return path;
      }
      return resolveTrailingSlashBehavior(path, router.resolve, unref(props.trailingSlash));
    });
    const link = isExternal.value ? void 0 : useBuiltinLink?.({ ...props, to, viewTransition: unref(props.viewTransition) });
    const href = computed(() => {
      const effectiveTrailingSlash = unref(props.trailingSlash) ?? options2.trailingSlash;
      if (!to.value || isAbsoluteUrl.value || isHashLinkWithoutHashMode(to.value)) {
        const raw = to.value;
        return typeof raw === "string" ? sanitizeExternalHref(raw) : raw;
      }
      if (isExternal.value) {
        const path = typeof to.value === "object" && "path" in to.value ? resolveRouteObject(to.value) : to.value;
        const href2 = typeof path === "object" ? router.resolve(path).href : path;
        const safe = typeof href2 === "string" ? sanitizeExternalHref(href2) : href2;
        return safe === null ? null : applyTrailingSlashBehavior(safe, effectiveTrailingSlash);
      }
      if (typeof to.value === "object") {
        return router.resolve(to.value)?.href ?? null;
      }
      return applyTrailingSlashBehavior(joinURL(config2.app.baseURL, to.value), effectiveTrailingSlash);
    });
    return {
      to,
      hasTarget,
      isAbsoluteUrl,
      isExternal,
      //
      href,
      isActive: link?.isActive ?? computed(() => to.value === router.currentRoute.value.path),
      isExactActive: link?.isExactActive ?? computed(() => to.value === router.currentRoute.value.path),
      route: link?.route ?? computed(() => router.resolve(to.value)),
      async navigate(_e) {
        if (href.value === null) {
          return;
        }
        await navigateTo(href.value, { replace: unref(props.replace), external: isExternal.value || hasTarget.value });
      }
    };
  }
  return defineComponent({
    name: componentName,
    props: {
      // Routing
      to: {
        type: [String, Object],
        default: void 0,
        required: false
      },
      href: {
        type: [String, Object],
        default: void 0,
        required: false
      },
      // Attributes
      target: {
        type: String,
        default: void 0,
        required: false
      },
      rel: {
        type: String,
        default: void 0,
        required: false
      },
      noRel: {
        type: Boolean,
        default: void 0,
        required: false
      },
      // Prefetching
      prefetch: {
        type: Boolean,
        default: void 0,
        required: false
      },
      prefetchOn: {
        type: [String, Object],
        default: void 0,
        required: false
      },
      noPrefetch: {
        type: Boolean,
        default: void 0,
        required: false
      },
      // Styling
      activeClass: {
        type: String,
        default: void 0,
        required: false
      },
      exactActiveClass: {
        type: String,
        default: void 0,
        required: false
      },
      prefetchedClass: {
        type: String,
        default: void 0,
        required: false
      },
      // Vue Router's `<RouterLink>` additional props
      replace: {
        type: Boolean,
        default: void 0,
        required: false
      },
      ariaCurrentValue: {
        type: String,
        default: void 0,
        required: false
      },
      // Edge cases handling
      external: {
        type: Boolean,
        default: void 0,
        required: false
      },
      // Slot API
      custom: {
        type: Boolean,
        default: void 0,
        required: false
      },
      // Behavior
      trailingSlash: {
        type: String,
        default: void 0,
        required: false
      }
    },
    useLink: useNuxtLink,
    setup(props, { slots }) {
      const router = useRouter();
      const { to, href, navigate, isExternal, hasTarget, isAbsoluteUrl } = useNuxtLink(props);
      shallowRef(false);
      const el = void 0;
      const elRef = void 0;
      async function prefetch(nuxtApp = useNuxtApp()) {
        {
          return;
        }
      }
      return () => {
        if (!isExternal.value && !hasTarget.value && !isHashLinkWithoutHashMode(to.value)) {
          const routerLinkProps = {
            ref: elRef,
            to: to.value,
            activeClass: props.activeClass || options2.activeClass,
            exactActiveClass: props.exactActiveClass || options2.exactActiveClass,
            replace: props.replace,
            ariaCurrentValue: props.ariaCurrentValue,
            custom: props.custom
          };
          if (!props.custom) {
            routerLinkProps.rel = props.rel || void 0;
          }
          return h(
            resolveComponent("RouterLink"),
            routerLinkProps,
            slots.default
          );
        }
        const target = props.target || null;
        const rel = firstNonUndefined(
          // converts `""` to `null` to prevent the attribute from being added as empty (`rel=""`)
          props.noRel ? "" : props.rel,
          options2.externalRelAttribute,
          /*
          * A fallback rel of `noopener noreferrer` is applied for external links or links that open in a new tab.
          * This solves a reverse tabnapping security flaw in browsers pre-2021 as well as improving privacy.
          */
          isAbsoluteUrl.value || hasTarget.value ? "noopener noreferrer" : ""
        ) || null;
        if (props.custom) {
          if (!slots.default) {
            return null;
          }
          return slots.default({
            href: href.value,
            navigate,
            prefetch,
            get route() {
              if (!href.value) {
                return void 0;
              }
              const url = new URL(href.value, "http://localhost");
              return {
                path: url.pathname,
                fullPath: url.pathname,
                get query() {
                  return parseQuery(url.search);
                },
                hash: url.hash,
                params: {},
                name: void 0,
                matched: [],
                redirectedFrom: void 0,
                meta: {},
                href: href.value
              };
            },
            rel,
            target,
            isExternal: isExternal.value || hasTarget.value,
            isActive: false,
            isExactActive: false
          });
        }
        return h("a", {
          ref: el,
          href: href.value || null,
          // converts `""` to `null` to prevent the attribute from being added as empty (`href=""`)
          rel,
          target,
          onClick: async (event) => {
            if (isExternal.value || hasTarget.value) {
              return;
            }
            event.preventDefault();
            try {
              const encodedHref = encodeRoutePath(href.value ?? "");
              return await (props.replace ? router.replace(encodedHref) : router.push(encodedHref));
            } finally {
            }
          }
        }, slots.default?.());
      };
    }
  });
}
const __nuxt_component_0$1 = /* @__PURE__ */ defineNuxtLink(nuxtLinkDefaults);
function applyTrailingSlashBehavior(to, trailingSlash) {
  const normalizeFn = trailingSlash === "append" ? withTrailingSlash : withoutTrailingSlash;
  const hasProtocolDifferentFromHttp = hasProtocol(to) && !to.startsWith("http");
  if (hasProtocolDifferentFromHttp) {
    return to;
  }
  return normalizeFn(to, true);
}
const _sfc_main$c = {
  __name: "ULinkBase",
  __ssrInlineRender: true,
  props: {
    as: { type: String, required: false, default: "button" },
    type: { type: String, required: false, default: "button" },
    disabled: { type: Boolean, required: false },
    onClick: { type: [Function, Array], required: false },
    href: { type: [String, null], required: false },
    navigate: { type: Function, required: false },
    target: { type: [String, Object, null], required: false },
    rel: { type: [String, Object, null], required: false },
    active: { type: Boolean, required: false },
    isExternal: { type: Boolean, required: false }
  },
  setup(__props) {
    const props = __props;
    function onClickWrapper(e) {
      if (props.disabled) {
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      if (props.onClick) {
        for (const onClick of Array.isArray(props.onClick) ? props.onClick : [props.onClick]) {
          onClick(e);
        }
      }
      if (props.href && props.navigate && !props.isExternal) {
        props.navigate(e);
      }
    }
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(unref(Primitive), mergeProps(__props.href ? {
        "as": "a",
        "href": __props.disabled ? void 0 : __props.href,
        "aria-disabled": __props.disabled ? "true" : void 0,
        "role": __props.disabled ? "link" : void 0,
        "tabindex": __props.disabled ? -1 : void 0
      } : __props.as === "button" ? {
        as: __props.as,
        type: __props.type,
        disabled: __props.disabled
      } : {
        as: __props.as
      }, {
        rel: __props.rel,
        target: __props.target,
        onClick: onClickWrapper
      }, _attrs), {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            ssrRenderSlot(_ctx.$slots, "default", {}, null, _push2, _parent2, _scopeId);
          } else {
            return [
              renderSlot(_ctx.$slots, "default")
            ];
          }
        }),
        _: 3
      }, _parent));
    };
  }
};
const _sfc_setup$c = _sfc_main$c.setup;
_sfc_main$c.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../node_modules/@nuxt/ui/dist/runtime/components/LinkBase.vue");
  return _sfc_setup$c ? _sfc_setup$c(props, ctx) : void 0;
};
const theme$4 = {
  "base": "outline-primary/25 focus-visible:outline-3 rounded-md",
  "variants": {
    "active": {
      "true": "text-primary",
      "false": "text-muted"
    },
    "disabled": {
      "true": "cursor-not-allowed opacity-75"
    }
  },
  "compoundVariants": [
    {
      "active": false,
      "disabled": false,
      "class": [
        "hover:text-default",
        "transition-colors"
      ]
    }
  ]
};
const _sfc_main$b = /* @__PURE__ */ Object.assign({ inheritAttrs: false }, {
  __name: "ULink",
  __ssrInlineRender: true,
  props: {
    as: { type: null, required: false, default: "button" },
    type: { type: null, required: false, default: "button" },
    disabled: { type: Boolean, required: false },
    active: { type: Boolean, required: false, default: void 0 },
    exact: { type: Boolean, required: false },
    exactQuery: { type: [Boolean, String], required: false },
    exactHash: { type: Boolean, required: false },
    inactiveClass: { type: String, required: false },
    custom: { type: Boolean, required: false },
    raw: { type: Boolean, required: false },
    locale: { type: [Boolean, String], required: false, default: void 0 },
    class: { type: null, required: false },
    to: { type: null, required: false },
    href: { type: null, required: false },
    external: { type: Boolean, required: false },
    target: { type: [String, Object, null], required: false },
    rel: { type: [String, Object, null], required: false },
    noRel: { type: Boolean, required: false },
    prefetchedClass: { type: String, required: false },
    prefetch: { type: Boolean, required: false },
    prefetchOn: { type: [String, Object], required: false },
    noPrefetch: { type: Boolean, required: false },
    trailingSlash: { type: String, required: false },
    activeClass: { type: String, required: false },
    exactActiveClass: { type: String, required: false },
    ariaCurrentValue: { type: String, required: false, default: "page" },
    viewTransition: { type: Boolean, required: false },
    replace: { type: Boolean, required: false }
  },
  setup(__props) {
    const props = __props;
    const route = useRoute();
    const appConfig2 = useAppConfig();
    const nuxtApp = useNuxtApp();
    const nuxtLinkProps = useForwardProps$1(reactiveOmit(props, "as", "type", "disabled", "active", "exact", "exactQuery", "exactHash", "activeClass", "inactiveClass", "to", "href", "raw", "custom", "locale", "class"));
    const ui = computed(() => tv({
      extend: tv(theme$4),
      ...defu({
        variants: {
          active: {
            true: mergeClasses(appConfig2.ui?.link?.variants?.active?.true, props.activeClass),
            false: mergeClasses(appConfig2.ui?.link?.variants?.active?.false, props.inactiveClass)
          }
        }
      }, appConfig2.ui?.link || {})
    }));
    const to = computed(() => {
      const path = props.to ?? props.href;
      if (!path) return path;
      if (typeof path !== "string") return path;
      if (props.external || hasProtocol(path, { acceptRelative: true })) {
        return path;
      }
      if (props.locale === false) {
        return path;
      }
      const localePath = nuxtApp.$localePath;
      if (!localePath) {
        return path;
      }
      const i18n = nuxtApp.$i18n;
      const codes = i18n?.localeCodes?.value;
      if (codes?.length && new RegExp(`^/(${codes.join("|")})($|[/?#])`).test(path)) {
        return path;
      }
      return localePath(path, typeof props.locale === "string" ? props.locale : void 0);
    });
    const isInternalLink = computed(() => {
      if (!to.value) return false;
      if (props.external) return false;
      if (typeof to.value !== "string") return true;
      if (hasProtocol(to.value, { acceptRelative: true })) return false;
      if (props.target && props.target !== "_self") return false;
      return true;
    });
    const externalRel = computed(() => {
      if (props.noRel) return null;
      if (props.rel) return props.rel;
      return "noopener noreferrer";
    });
    function isLinkActive({ route: linkRoute, isActive, isExactActive } = {}) {
      if (props.active !== void 0) {
        return props.active;
      }
      if (!to.value) {
        return false;
      }
      if (props.exactQuery === "partial") {
        if (!isPartiallyEqual(linkRoute.query, route.query)) return false;
      } else if (props.exactQuery === true) {
        if (!isEqual(linkRoute.query, route.query)) return false;
      }
      if (props.exactHash && linkRoute.hash !== route.hash) {
        return false;
      }
      if (props.exact && isExactActive) {
        return true;
      }
      if (!props.exact && isActive) {
        return true;
      }
      return false;
    }
    function resolveLinkClass({ route: route2, isActive, isExactActive } = {}) {
      const active = isLinkActive({ route: route2, isActive, isExactActive });
      if (props.raw) {
        return [props.class, active ? props.activeClass : props.inactiveClass];
      }
      return ui.value({ class: props.class, active, disabled: props.disabled });
    }
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0$1;
      if (isInternalLink.value) {
        _push(ssrRenderComponent(_component_NuxtLink, mergeProps(unref(nuxtLinkProps), {
          to: to.value,
          custom: ""
        }, _attrs), {
          default: withCtx(({ href, navigate, route: linkRoute, isActive, isExactActive, ...rest }, _push2, _parent2, _scopeId) => {
            if (_push2) {
              if (__props.custom) {
                _push2(ssrRenderComponent(unref(Slot), null, {
                  default: withCtx((_, _push3, _parent3, _scopeId2) => {
                    if (_push3) {
                      ssrRenderSlot(_ctx.$slots, "default", {
                        ..._ctx.$attrs,
                        ...__props.exact && isExactActive ? { "aria-current": props.ariaCurrentValue } : {},
                        as: __props.as,
                        type: __props.type,
                        disabled: __props.disabled,
                        href,
                        navigate,
                        rel: rest.rel,
                        target: rest.target,
                        isExternal: rest.isExternal,
                        active: isLinkActive({ route: linkRoute, isActive, isExactActive })
                      }, null, _push3, _parent3, _scopeId2);
                    } else {
                      return [
                        renderSlot(_ctx.$slots, "default", {
                          ..._ctx.$attrs,
                          ...__props.exact && isExactActive ? { "aria-current": props.ariaCurrentValue } : {},
                          as: __props.as,
                          type: __props.type,
                          disabled: __props.disabled,
                          href,
                          navigate,
                          rel: rest.rel,
                          target: rest.target,
                          isExternal: rest.isExternal,
                          active: isLinkActive({ route: linkRoute, isActive, isExactActive })
                        })
                      ];
                    }
                  }),
                  _: 2
                }, _parent2, _scopeId));
              } else {
                _push2(ssrRenderComponent(_sfc_main$c, mergeProps({
                  ..._ctx.$attrs,
                  ...__props.exact && isExactActive ? { "aria-current": props.ariaCurrentValue } : {},
                  as: __props.as,
                  type: __props.type,
                  disabled: __props.disabled,
                  href,
                  navigate,
                  rel: rest.rel,
                  target: rest.target,
                  isExternal: rest.isExternal
                }, {
                  class: resolveLinkClass({ route: linkRoute, isActive, isExactActive })
                }), {
                  default: withCtx((_, _push3, _parent3, _scopeId2) => {
                    if (_push3) {
                      ssrRenderSlot(_ctx.$slots, "default", {
                        active: isLinkActive({ route: linkRoute, isActive, isExactActive })
                      }, null, _push3, _parent3, _scopeId2);
                    } else {
                      return [
                        renderSlot(_ctx.$slots, "default", {
                          active: isLinkActive({ route: linkRoute, isActive, isExactActive })
                        })
                      ];
                    }
                  }),
                  _: 2
                }, _parent2, _scopeId));
              }
            } else {
              return [
                __props.custom ? (openBlock(), createBlock(unref(Slot), { key: 0 }, {
                  default: withCtx(() => [
                    renderSlot(_ctx.$slots, "default", {
                      ..._ctx.$attrs,
                      ...__props.exact && isExactActive ? { "aria-current": props.ariaCurrentValue } : {},
                      as: __props.as,
                      type: __props.type,
                      disabled: __props.disabled,
                      href,
                      navigate,
                      rel: rest.rel,
                      target: rest.target,
                      isExternal: rest.isExternal,
                      active: isLinkActive({ route: linkRoute, isActive, isExactActive })
                    })
                  ]),
                  _: 2
                }, 1024)) : (openBlock(), createBlock(_sfc_main$c, mergeProps({ key: 1 }, {
                  ..._ctx.$attrs,
                  ...__props.exact && isExactActive ? { "aria-current": props.ariaCurrentValue } : {},
                  as: __props.as,
                  type: __props.type,
                  disabled: __props.disabled,
                  href,
                  navigate,
                  rel: rest.rel,
                  target: rest.target,
                  isExternal: rest.isExternal
                }, {
                  class: resolveLinkClass({ route: linkRoute, isActive, isExactActive })
                }), {
                  default: withCtx(() => [
                    renderSlot(_ctx.$slots, "default", {
                      active: isLinkActive({ route: linkRoute, isActive, isExactActive })
                    })
                  ]),
                  _: 2
                }, 1040, ["class"]))
              ];
            }
          }),
          _: 3
        }, _parent));
      } else if (__props.custom) {
        _push(ssrRenderComponent(unref(Slot), _attrs, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              ssrRenderSlot(_ctx.$slots, "default", {
                ..._ctx.$attrs,
                as: __props.as,
                type: __props.type,
                disabled: __props.disabled,
                ...to.value ? { href: String(to.value), target: props.target, rel: externalRel.value, isExternal: true } : {},
                active: __props.active ?? false
              }, null, _push2, _parent2, _scopeId);
            } else {
              return [
                renderSlot(_ctx.$slots, "default", {
                  ..._ctx.$attrs,
                  as: __props.as,
                  type: __props.type,
                  disabled: __props.disabled,
                  ...to.value ? { href: String(to.value), target: props.target, rel: externalRel.value, isExternal: true } : {},
                  active: __props.active ?? false
                })
              ];
            }
          }),
          _: 3
        }, _parent));
      } else {
        _push(ssrRenderComponent(_sfc_main$c, mergeProps({
          ..._ctx.$attrs,
          as: __props.as,
          type: __props.type,
          disabled: __props.disabled,
          ...to.value ? { href: String(to.value), target: props.target, rel: externalRel.value, isExternal: true } : {}
        }, {
          class: resolveLinkClass()
        }, _attrs), {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              ssrRenderSlot(_ctx.$slots, "default", {
                active: __props.active ?? false
              }, null, _push2, _parent2, _scopeId);
            } else {
              return [
                renderSlot(_ctx.$slots, "default", {
                  active: __props.active ?? false
                })
              ];
            }
          }),
          _: 3
        }, _parent));
      }
    };
  }
});
const _sfc_setup$b = _sfc_main$b.setup;
_sfc_main$b.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../node_modules/@nuxt/ui/dist/runtime/components/Link.vue");
  return _sfc_setup$b ? _sfc_setup$b(props, ctx) : void 0;
};
const theme$3 = {
  "slots": {
    "base": [
      "rounded-md font-medium inline-flex items-center disabled:cursor-not-allowed aria-disabled:cursor-not-allowed disabled:opacity-75 aria-disabled:opacity-75",
      "transition-colors"
    ],
    "label": "truncate",
    "leadingIcon": "shrink-0",
    "leadingAvatar": "shrink-0",
    "leadingAvatarSize": "",
    "trailingIcon": "shrink-0"
  },
  "variants": {
    "fieldGroup": {
      "horizontal": "not-only:first:rounded-e-none not-only:last:rounded-s-none not-last:not-first:rounded-none focus-visible:z-[1]",
      "vertical": "not-only:first:rounded-b-none not-only:last:rounded-t-none not-last:not-first:rounded-none focus-visible:z-[1]"
    },
    "color": {
      "primary": "",
      "secondary": "",
      "success": "",
      "info": "",
      "warning": "",
      "error": "",
      "neutral": ""
    },
    "variant": {
      "solid": "",
      "outline": "",
      "soft": "",
      "subtle": "",
      "ghost": "",
      "link": ""
    },
    "size": {
      "xs": {
        "base": "px-2 py-1 text-xs gap-1",
        "leadingIcon": "size-4",
        "leadingAvatarSize": "3xs",
        "trailingIcon": "size-4"
      },
      "sm": {
        "base": "px-2.5 py-1.5 text-xs gap-1.5",
        "leadingIcon": "size-4",
        "leadingAvatarSize": "3xs",
        "trailingIcon": "size-4"
      },
      "md": {
        "base": "px-2.5 py-1.5 text-sm gap-1.5",
        "leadingIcon": "size-5",
        "leadingAvatarSize": "2xs",
        "trailingIcon": "size-5"
      },
      "lg": {
        "base": "px-3 py-2 text-sm gap-2",
        "leadingIcon": "size-5",
        "leadingAvatarSize": "2xs",
        "trailingIcon": "size-5"
      },
      "xl": {
        "base": "px-3 py-2 text-base gap-2",
        "leadingIcon": "size-6",
        "leadingAvatarSize": "xs",
        "trailingIcon": "size-6"
      }
    },
    "block": {
      "true": {
        "base": "w-full justify-center",
        "trailingIcon": "ms-auto"
      }
    },
    "square": {
      "true": ""
    },
    "leading": {
      "true": ""
    },
    "trailing": {
      "true": ""
    },
    "loading": {
      "true": ""
    },
    "active": {
      "true": {
        "base": ""
      },
      "false": {
        "base": ""
      }
    }
  },
  "compoundVariants": [
    {
      "color": "primary",
      "variant": "solid",
      "class": "text-inverted bg-primary hover:bg-primary/75 active:bg-primary/75 disabled:bg-primary aria-disabled:bg-primary outline-primary/25 focus-visible:outline-3"
    },
    {
      "color": "secondary",
      "variant": "solid",
      "class": "text-inverted bg-secondary hover:bg-secondary/75 active:bg-secondary/75 disabled:bg-secondary aria-disabled:bg-secondary outline-secondary/25 focus-visible:outline-3"
    },
    {
      "color": "success",
      "variant": "solid",
      "class": "text-inverted bg-success hover:bg-success/75 active:bg-success/75 disabled:bg-success aria-disabled:bg-success outline-success/25 focus-visible:outline-3"
    },
    {
      "color": "info",
      "variant": "solid",
      "class": "text-inverted bg-info hover:bg-info/75 active:bg-info/75 disabled:bg-info aria-disabled:bg-info outline-info/25 focus-visible:outline-3"
    },
    {
      "color": "warning",
      "variant": "solid",
      "class": "text-inverted bg-warning hover:bg-warning/75 active:bg-warning/75 disabled:bg-warning aria-disabled:bg-warning outline-warning/25 focus-visible:outline-3"
    },
    {
      "color": "error",
      "variant": "solid",
      "class": "text-inverted bg-error hover:bg-error/75 active:bg-error/75 disabled:bg-error aria-disabled:bg-error outline-error/25 focus-visible:outline-3"
    },
    {
      "color": "primary",
      "variant": "outline",
      "class": "ring ring-inset ring-primary/50 text-primary hover:bg-primary/10 active:bg-primary/10 disabled:bg-transparent aria-disabled:bg-transparent dark:disabled:bg-transparent dark:aria-disabled:bg-transparent outline-primary/25 focus-visible:outline-3 focus-visible:ring-primary"
    },
    {
      "color": "secondary",
      "variant": "outline",
      "class": "ring ring-inset ring-secondary/50 text-secondary hover:bg-secondary/10 active:bg-secondary/10 disabled:bg-transparent aria-disabled:bg-transparent dark:disabled:bg-transparent dark:aria-disabled:bg-transparent outline-secondary/25 focus-visible:outline-3 focus-visible:ring-secondary"
    },
    {
      "color": "success",
      "variant": "outline",
      "class": "ring ring-inset ring-success/50 text-success hover:bg-success/10 active:bg-success/10 disabled:bg-transparent aria-disabled:bg-transparent dark:disabled:bg-transparent dark:aria-disabled:bg-transparent outline-success/25 focus-visible:outline-3 focus-visible:ring-success"
    },
    {
      "color": "info",
      "variant": "outline",
      "class": "ring ring-inset ring-info/50 text-info hover:bg-info/10 active:bg-info/10 disabled:bg-transparent aria-disabled:bg-transparent dark:disabled:bg-transparent dark:aria-disabled:bg-transparent outline-info/25 focus-visible:outline-3 focus-visible:ring-info"
    },
    {
      "color": "warning",
      "variant": "outline",
      "class": "ring ring-inset ring-warning/50 text-warning hover:bg-warning/10 active:bg-warning/10 disabled:bg-transparent aria-disabled:bg-transparent dark:disabled:bg-transparent dark:aria-disabled:bg-transparent outline-warning/25 focus-visible:outline-3 focus-visible:ring-warning"
    },
    {
      "color": "error",
      "variant": "outline",
      "class": "ring ring-inset ring-error/50 text-error hover:bg-error/10 active:bg-error/10 disabled:bg-transparent aria-disabled:bg-transparent dark:disabled:bg-transparent dark:aria-disabled:bg-transparent outline-error/25 focus-visible:outline-3 focus-visible:ring-error"
    },
    {
      "color": "primary",
      "variant": "soft",
      "class": "text-primary bg-primary/10 hover:bg-primary/15 active:bg-primary/15 outline-primary/25 focus-visible:outline-3 disabled:bg-primary/10 aria-disabled:bg-primary/10"
    },
    {
      "color": "secondary",
      "variant": "soft",
      "class": "text-secondary bg-secondary/10 hover:bg-secondary/15 active:bg-secondary/15 outline-secondary/25 focus-visible:outline-3 disabled:bg-secondary/10 aria-disabled:bg-secondary/10"
    },
    {
      "color": "success",
      "variant": "soft",
      "class": "text-success bg-success/10 hover:bg-success/15 active:bg-success/15 outline-success/25 focus-visible:outline-3 disabled:bg-success/10 aria-disabled:bg-success/10"
    },
    {
      "color": "info",
      "variant": "soft",
      "class": "text-info bg-info/10 hover:bg-info/15 active:bg-info/15 outline-info/25 focus-visible:outline-3 disabled:bg-info/10 aria-disabled:bg-info/10"
    },
    {
      "color": "warning",
      "variant": "soft",
      "class": "text-warning bg-warning/10 hover:bg-warning/15 active:bg-warning/15 outline-warning/25 focus-visible:outline-3 disabled:bg-warning/10 aria-disabled:bg-warning/10"
    },
    {
      "color": "error",
      "variant": "soft",
      "class": "text-error bg-error/10 hover:bg-error/15 active:bg-error/15 outline-error/25 focus-visible:outline-3 disabled:bg-error/10 aria-disabled:bg-error/10"
    },
    {
      "color": "primary",
      "variant": "subtle",
      "class": "text-primary ring ring-inset ring-primary/25 bg-primary/10 hover:bg-primary/15 active:bg-primary/15 disabled:bg-primary/10 aria-disabled:bg-primary/10 outline-primary/25 focus-visible:outline-3 focus-visible:ring-primary"
    },
    {
      "color": "secondary",
      "variant": "subtle",
      "class": "text-secondary ring ring-inset ring-secondary/25 bg-secondary/10 hover:bg-secondary/15 active:bg-secondary/15 disabled:bg-secondary/10 aria-disabled:bg-secondary/10 outline-secondary/25 focus-visible:outline-3 focus-visible:ring-secondary"
    },
    {
      "color": "success",
      "variant": "subtle",
      "class": "text-success ring ring-inset ring-success/25 bg-success/10 hover:bg-success/15 active:bg-success/15 disabled:bg-success/10 aria-disabled:bg-success/10 outline-success/25 focus-visible:outline-3 focus-visible:ring-success"
    },
    {
      "color": "info",
      "variant": "subtle",
      "class": "text-info ring ring-inset ring-info/25 bg-info/10 hover:bg-info/15 active:bg-info/15 disabled:bg-info/10 aria-disabled:bg-info/10 outline-info/25 focus-visible:outline-3 focus-visible:ring-info"
    },
    {
      "color": "warning",
      "variant": "subtle",
      "class": "text-warning ring ring-inset ring-warning/25 bg-warning/10 hover:bg-warning/15 active:bg-warning/15 disabled:bg-warning/10 aria-disabled:bg-warning/10 outline-warning/25 focus-visible:outline-3 focus-visible:ring-warning"
    },
    {
      "color": "error",
      "variant": "subtle",
      "class": "text-error ring ring-inset ring-error/25 bg-error/10 hover:bg-error/15 active:bg-error/15 disabled:bg-error/10 aria-disabled:bg-error/10 outline-error/25 focus-visible:outline-3 focus-visible:ring-error"
    },
    {
      "color": "primary",
      "variant": "ghost",
      "class": "text-primary hover:bg-primary/10 active:bg-primary/10 outline-primary/25 focus-visible:outline-3 disabled:bg-transparent aria-disabled:bg-transparent dark:disabled:bg-transparent dark:aria-disabled:bg-transparent"
    },
    {
      "color": "secondary",
      "variant": "ghost",
      "class": "text-secondary hover:bg-secondary/10 active:bg-secondary/10 outline-secondary/25 focus-visible:outline-3 disabled:bg-transparent aria-disabled:bg-transparent dark:disabled:bg-transparent dark:aria-disabled:bg-transparent"
    },
    {
      "color": "success",
      "variant": "ghost",
      "class": "text-success hover:bg-success/10 active:bg-success/10 outline-success/25 focus-visible:outline-3 disabled:bg-transparent aria-disabled:bg-transparent dark:disabled:bg-transparent dark:aria-disabled:bg-transparent"
    },
    {
      "color": "info",
      "variant": "ghost",
      "class": "text-info hover:bg-info/10 active:bg-info/10 outline-info/25 focus-visible:outline-3 disabled:bg-transparent aria-disabled:bg-transparent dark:disabled:bg-transparent dark:aria-disabled:bg-transparent"
    },
    {
      "color": "warning",
      "variant": "ghost",
      "class": "text-warning hover:bg-warning/10 active:bg-warning/10 outline-warning/25 focus-visible:outline-3 disabled:bg-transparent aria-disabled:bg-transparent dark:disabled:bg-transparent dark:aria-disabled:bg-transparent"
    },
    {
      "color": "error",
      "variant": "ghost",
      "class": "text-error hover:bg-error/10 active:bg-error/10 outline-error/25 focus-visible:outline-3 disabled:bg-transparent aria-disabled:bg-transparent dark:disabled:bg-transparent dark:aria-disabled:bg-transparent"
    },
    {
      "color": "primary",
      "variant": "link",
      "class": "text-primary hover:text-primary/75 active:text-primary/75 disabled:text-primary aria-disabled:text-primary outline-primary/25 focus-visible:outline-3"
    },
    {
      "color": "secondary",
      "variant": "link",
      "class": "text-secondary hover:text-secondary/75 active:text-secondary/75 disabled:text-secondary aria-disabled:text-secondary outline-secondary/25 focus-visible:outline-3"
    },
    {
      "color": "success",
      "variant": "link",
      "class": "text-success hover:text-success/75 active:text-success/75 disabled:text-success aria-disabled:text-success outline-success/25 focus-visible:outline-3"
    },
    {
      "color": "info",
      "variant": "link",
      "class": "text-info hover:text-info/75 active:text-info/75 disabled:text-info aria-disabled:text-info outline-info/25 focus-visible:outline-3"
    },
    {
      "color": "warning",
      "variant": "link",
      "class": "text-warning hover:text-warning/75 active:text-warning/75 disabled:text-warning aria-disabled:text-warning outline-warning/25 focus-visible:outline-3"
    },
    {
      "color": "error",
      "variant": "link",
      "class": "text-error hover:text-error/75 active:text-error/75 disabled:text-error aria-disabled:text-error outline-error/25 focus-visible:outline-3"
    },
    {
      "color": "neutral",
      "variant": "solid",
      "class": "text-inverted bg-inverted hover:bg-inverted/90 active:bg-inverted/90 disabled:bg-inverted aria-disabled:bg-inverted outline-inverted/25 focus-visible:outline-3"
    },
    {
      "color": "neutral",
      "variant": "outline",
      "class": "ring ring-inset ring-accented text-default bg-default hover:bg-elevated active:bg-elevated disabled:bg-default aria-disabled:bg-default outline-inverted/25 focus-visible:outline-3 focus-visible:ring-inverted"
    },
    {
      "color": "neutral",
      "variant": "soft",
      "class": "text-default bg-elevated hover:bg-accented/75 active:bg-accented/75 outline-inverted/25 focus-visible:outline-3 disabled:bg-elevated aria-disabled:bg-elevated"
    },
    {
      "color": "neutral",
      "variant": "subtle",
      "class": "ring ring-inset ring-accented text-default bg-elevated hover:bg-accented/75 active:bg-accented/75 disabled:bg-elevated aria-disabled:bg-elevated outline-inverted/25 focus-visible:outline-3 focus-visible:ring-inverted"
    },
    {
      "color": "neutral",
      "variant": "ghost",
      "class": "text-default hover:bg-elevated active:bg-elevated outline-inverted/25 focus-visible:outline-3 hover:disabled:bg-transparent dark:hover:disabled:bg-transparent hover:aria-disabled:bg-transparent dark:hover:aria-disabled:bg-transparent"
    },
    {
      "color": "neutral",
      "variant": "link",
      "class": "text-muted hover:text-default active:text-default disabled:text-muted aria-disabled:text-muted outline-inverted/25 focus-visible:outline-3"
    },
    {
      "size": "xs",
      "square": true,
      "class": "p-1"
    },
    {
      "size": "sm",
      "square": true,
      "class": "p-1.5"
    },
    {
      "size": "md",
      "square": true,
      "class": "p-1.5"
    },
    {
      "size": "lg",
      "square": true,
      "class": "p-2"
    },
    {
      "size": "xl",
      "square": true,
      "class": "p-2"
    },
    {
      "loading": true,
      "leading": true,
      "class": {
        "leadingIcon": "animate-spin"
      }
    },
    {
      "loading": true,
      "leading": false,
      "trailing": true,
      "class": {
        "trailingIcon": "animate-spin"
      }
    }
  ],
  "defaultVariants": {
    "color": "primary",
    "variant": "solid",
    "size": "md"
  }
};
const _sfc_main$a = {
  __name: "UButton",
  __ssrInlineRender: true,
  props: {
    label: { type: String, required: false },
    color: { type: null, required: false },
    activeColor: { type: null, required: false },
    variant: { type: null, required: false },
    activeVariant: { type: null, required: false },
    size: { type: null, required: false },
    square: { type: Boolean, required: false },
    block: { type: Boolean, required: false },
    loadingAuto: { type: Boolean, required: false },
    onClick: { type: [Function, Array], required: false },
    class: { type: null, required: false },
    ui: { type: Object, required: false },
    icon: { type: null, required: false },
    avatar: { type: Object, required: false },
    leading: { type: Boolean, required: false },
    leadingIcon: { type: null, required: false },
    trailing: { type: Boolean, required: false },
    trailingIcon: { type: null, required: false },
    loading: { type: Boolean, required: false },
    loadingIcon: { type: null, required: false },
    as: { type: null, required: false },
    type: { type: null, required: false },
    disabled: { type: Boolean, required: false },
    active: { type: Boolean, required: false },
    exact: { type: Boolean, required: false },
    exactQuery: { type: [Boolean, String], required: false },
    exactHash: { type: Boolean, required: false },
    inactiveClass: { type: String, required: false },
    locale: { type: [Boolean, String], required: false },
    to: { type: null, required: false },
    href: { type: null, required: false },
    external: { type: Boolean, required: false },
    target: { type: [String, Object, null], required: false },
    rel: { type: [String, Object, null], required: false },
    noRel: { type: Boolean, required: false },
    prefetchedClass: { type: String, required: false },
    prefetch: { type: Boolean, required: false },
    prefetchOn: { type: [String, Object], required: false },
    noPrefetch: { type: Boolean, required: false },
    trailingSlash: { type: String, required: false },
    activeClass: { type: String, required: false },
    exactActiveClass: { type: String, required: false },
    ariaCurrentValue: { type: String, required: false },
    viewTransition: { type: Boolean, required: false },
    replace: { type: Boolean, required: false }
  },
  setup(__props) {
    const _props = __props;
    const slots = useSlots();
    const props = useComponentProps("button", _props);
    const appConfig2 = useAppConfig();
    const { orientation, size: buttonSize } = useFieldGroup(_props);
    const linkProps = useForwardProps(pickLinkProps(props));
    const loadingAutoState = ref(false);
    const formLoading = inject(formLoadingInjectionKey, void 0);
    async function onClickWrapper(event) {
      loadingAutoState.value = true;
      const callbacks = Array.isArray(props.onClick) ? props.onClick : [props.onClick];
      try {
        await Promise.all(callbacks.map((fn) => fn?.(event)));
      } finally {
        loadingAutoState.value = false;
      }
    }
    const isLoading = computed(() => {
      return props.loading || props.loadingAuto && (loadingAutoState.value || formLoading?.value && props.type === "submit");
    });
    const { isLeading, isTrailing, leadingIconName, trailingIconName } = useComponentIcons(
      computed(() => ({ ...props, loading: isLoading.value }))
    );
    const ui = computed(() => tv({
      extend: tv(theme$3),
      ...defu({
        variants: {
          active: {
            true: {
              base: mergeClasses(appConfig2.ui?.button?.variants?.active?.true?.base, props.activeClass)
            },
            false: {
              base: mergeClasses(appConfig2.ui?.button?.variants?.active?.false?.base, props.inactiveClass)
            }
          }
        }
      }, appConfig2.ui?.button || {})
    })({
      color: props.color,
      variant: props.variant,
      size: buttonSize.value ?? props.size,
      loading: isLoading.value,
      block: props.block,
      square: props.square || !slots.default && !props.label,
      leading: isLeading.value,
      trailing: isTrailing.value,
      fieldGroup: orientation.value
    }));
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(_sfc_main$b, mergeProps({
        type: unref(props).type,
        disabled: unref(props).disabled || isLoading.value
      }, unref(omit)(unref(linkProps), ["type", "disabled", "onClick"]), { custom: "" }, _attrs), {
        default: withCtx(({ active, ...slotProps }, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(_sfc_main$c, mergeProps(slotProps, {
              "data-slot": "base",
              class: ui.value.base({
                class: [unref(props).ui?.base, unref(props).class],
                active,
                ...active && unref(props).activeVariant ? { variant: unref(props).activeVariant } : {},
                ...active && unref(props).activeColor ? { color: unref(props).activeColor } : {}
              }),
              onClick: onClickWrapper
            }), {
              default: withCtx((_, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  ssrRenderSlot(_ctx.$slots, "leading", { ui: ui.value }, () => {
                    if (unref(isLeading) && unref(leadingIconName)) {
                      _push3(ssrRenderComponent(_sfc_main$f, {
                        name: unref(leadingIconName),
                        "data-slot": "leadingIcon",
                        class: ui.value.leadingIcon({ class: unref(props).ui?.leadingIcon, active })
                      }, null, _parent3, _scopeId2));
                    } else if (!!unref(props).avatar) {
                      _push3(ssrRenderComponent(_sfc_main$d, mergeProps({
                        size: unref(props).ui?.leadingAvatarSize || ui.value.leadingAvatarSize()
                      }, unref(props).avatar, {
                        "data-slot": "leadingAvatar",
                        class: ui.value.leadingAvatar({ class: unref(props).ui?.leadingAvatar, active })
                      }), null, _parent3, _scopeId2));
                    } else {
                      _push3(`<!---->`);
                    }
                  }, _push3, _parent3, _scopeId2);
                  ssrRenderSlot(_ctx.$slots, "default", { ui: ui.value }, () => {
                    if (unref(props).label !== void 0 && unref(props).label !== null) {
                      _push3(`<span data-slot="label" class="${ssrRenderClass(ui.value.label({ class: unref(props).ui?.label, active }))}"${_scopeId2}>${ssrInterpolate(unref(props).label)}</span>`);
                    } else {
                      _push3(`<!---->`);
                    }
                  }, _push3, _parent3, _scopeId2);
                  ssrRenderSlot(_ctx.$slots, "trailing", { ui: ui.value }, () => {
                    if (unref(isTrailing) && unref(trailingIconName)) {
                      _push3(ssrRenderComponent(_sfc_main$f, {
                        name: unref(trailingIconName),
                        "data-slot": "trailingIcon",
                        class: ui.value.trailingIcon({ class: unref(props).ui?.trailingIcon, active })
                      }, null, _parent3, _scopeId2));
                    } else {
                      _push3(`<!---->`);
                    }
                  }, _push3, _parent3, _scopeId2);
                } else {
                  return [
                    renderSlot(_ctx.$slots, "leading", { ui: ui.value }, () => [
                      unref(isLeading) && unref(leadingIconName) ? (openBlock(), createBlock(_sfc_main$f, {
                        key: 0,
                        name: unref(leadingIconName),
                        "data-slot": "leadingIcon",
                        class: ui.value.leadingIcon({ class: unref(props).ui?.leadingIcon, active })
                      }, null, 8, ["name", "class"])) : !!unref(props).avatar ? (openBlock(), createBlock(_sfc_main$d, mergeProps({
                        key: 1,
                        size: unref(props).ui?.leadingAvatarSize || ui.value.leadingAvatarSize()
                      }, unref(props).avatar, {
                        "data-slot": "leadingAvatar",
                        class: ui.value.leadingAvatar({ class: unref(props).ui?.leadingAvatar, active })
                      }), null, 16, ["size", "class"])) : createCommentVNode("", true)
                    ]),
                    renderSlot(_ctx.$slots, "default", { ui: ui.value }, () => [
                      unref(props).label !== void 0 && unref(props).label !== null ? (openBlock(), createBlock("span", {
                        key: 0,
                        "data-slot": "label",
                        class: ui.value.label({ class: unref(props).ui?.label, active })
                      }, toDisplayString(unref(props).label), 3)) : createCommentVNode("", true)
                    ]),
                    renderSlot(_ctx.$slots, "trailing", { ui: ui.value }, () => [
                      unref(isTrailing) && unref(trailingIconName) ? (openBlock(), createBlock(_sfc_main$f, {
                        key: 0,
                        name: unref(trailingIconName),
                        "data-slot": "trailingIcon",
                        class: ui.value.trailingIcon({ class: unref(props).ui?.trailingIcon, active })
                      }, null, 8, ["name", "class"])) : createCommentVNode("", true)
                    ])
                  ];
                }
              }),
              _: 2
            }, _parent2, _scopeId));
          } else {
            return [
              createVNode(_sfc_main$c, mergeProps(slotProps, {
                "data-slot": "base",
                class: ui.value.base({
                  class: [unref(props).ui?.base, unref(props).class],
                  active,
                  ...active && unref(props).activeVariant ? { variant: unref(props).activeVariant } : {},
                  ...active && unref(props).activeColor ? { color: unref(props).activeColor } : {}
                }),
                onClick: onClickWrapper
              }), {
                default: withCtx(() => [
                  renderSlot(_ctx.$slots, "leading", { ui: ui.value }, () => [
                    unref(isLeading) && unref(leadingIconName) ? (openBlock(), createBlock(_sfc_main$f, {
                      key: 0,
                      name: unref(leadingIconName),
                      "data-slot": "leadingIcon",
                      class: ui.value.leadingIcon({ class: unref(props).ui?.leadingIcon, active })
                    }, null, 8, ["name", "class"])) : !!unref(props).avatar ? (openBlock(), createBlock(_sfc_main$d, mergeProps({
                      key: 1,
                      size: unref(props).ui?.leadingAvatarSize || ui.value.leadingAvatarSize()
                    }, unref(props).avatar, {
                      "data-slot": "leadingAvatar",
                      class: ui.value.leadingAvatar({ class: unref(props).ui?.leadingAvatar, active })
                    }), null, 16, ["size", "class"])) : createCommentVNode("", true)
                  ]),
                  renderSlot(_ctx.$slots, "default", { ui: ui.value }, () => [
                    unref(props).label !== void 0 && unref(props).label !== null ? (openBlock(), createBlock("span", {
                      key: 0,
                      "data-slot": "label",
                      class: ui.value.label({ class: unref(props).ui?.label, active })
                    }, toDisplayString(unref(props).label), 3)) : createCommentVNode("", true)
                  ]),
                  renderSlot(_ctx.$slots, "trailing", { ui: ui.value }, () => [
                    unref(isTrailing) && unref(trailingIconName) ? (openBlock(), createBlock(_sfc_main$f, {
                      key: 0,
                      name: unref(trailingIconName),
                      "data-slot": "trailingIcon",
                      class: ui.value.trailingIcon({ class: unref(props).ui?.trailingIcon, active })
                    }, null, 8, ["name", "class"])) : createCommentVNode("", true)
                  ])
                ]),
                _: 2
              }, 1040, ["class"])
            ];
          }
        }),
        _: 3
      }, _parent));
    };
  }
};
const _sfc_setup$a = _sfc_main$a.setup;
_sfc_main$a.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../node_modules/@nuxt/ui/dist/runtime/components/Button.vue");
  return _sfc_setup$a ? _sfc_setup$a(props, ctx) : void 0;
};
const theme$2 = {
  "slots": {
    "root": "gap-2",
    "base": "relative overflow-hidden rounded-full bg-accented",
    "indicator": "rounded-full size-full transition-transform duration-200 ease-out",
    "status": "flex text-dimmed transition-[width] duration-200",
    "steps": "grid items-end",
    "step": "truncate text-end row-start-1 col-start-1 transition-opacity"
  },
  "variants": {
    "animation": {
      "carousel": "",
      "carousel-inverse": "",
      "swing": "",
      "elastic": ""
    },
    "color": {
      "primary": {
        "indicator": "bg-primary",
        "steps": "text-primary"
      },
      "secondary": {
        "indicator": "bg-secondary",
        "steps": "text-secondary"
      },
      "success": {
        "indicator": "bg-success",
        "steps": "text-success"
      },
      "info": {
        "indicator": "bg-info",
        "steps": "text-info"
      },
      "warning": {
        "indicator": "bg-warning",
        "steps": "text-warning"
      },
      "error": {
        "indicator": "bg-error",
        "steps": "text-error"
      },
      "neutral": {
        "indicator": "bg-inverted",
        "steps": "text-inverted"
      }
    },
    "size": {
      "2xs": {
        "status": "text-xs",
        "steps": "text-xs"
      },
      "xs": {
        "status": "text-xs",
        "steps": "text-xs"
      },
      "sm": {
        "status": "text-sm",
        "steps": "text-sm"
      },
      "md": {
        "status": "text-sm",
        "steps": "text-sm"
      },
      "lg": {
        "status": "text-sm",
        "steps": "text-sm"
      },
      "xl": {
        "status": "text-base",
        "steps": "text-base"
      },
      "2xl": {
        "status": "text-base",
        "steps": "text-base"
      }
    },
    "step": {
      "active": {
        "step": "opacity-100"
      },
      "first": {
        "step": "opacity-100 text-muted"
      },
      "other": {
        "step": "opacity-0"
      },
      "last": {
        "step": ""
      }
    },
    "orientation": {
      "horizontal": {
        "root": "w-full flex flex-col",
        "base": "w-full",
        "status": "flex-row items-center justify-end min-w-fit"
      },
      "vertical": {
        "root": "h-full flex flex-row-reverse",
        "base": "h-full",
        "status": "flex-col justify-end min-h-fit"
      }
    },
    "inverted": {
      "true": {
        "status": "self-end"
      }
    }
  },
  "compoundVariants": [
    {
      "inverted": true,
      "orientation": "horizontal",
      "class": {
        "step": "text-start",
        "status": "flex-row-reverse"
      }
    },
    {
      "inverted": true,
      "orientation": "vertical",
      "class": {
        "steps": "items-start",
        "status": "flex-col-reverse"
      }
    },
    {
      "orientation": "horizontal",
      "size": "2xs",
      "class": "h-px"
    },
    {
      "orientation": "horizontal",
      "size": "xs",
      "class": "h-0.5"
    },
    {
      "orientation": "horizontal",
      "size": "sm",
      "class": "h-1"
    },
    {
      "orientation": "horizontal",
      "size": "md",
      "class": "h-2"
    },
    {
      "orientation": "horizontal",
      "size": "lg",
      "class": "h-3"
    },
    {
      "orientation": "horizontal",
      "size": "xl",
      "class": "h-4"
    },
    {
      "orientation": "horizontal",
      "size": "2xl",
      "class": "h-5"
    },
    {
      "orientation": "vertical",
      "size": "2xs",
      "class": "w-px"
    },
    {
      "orientation": "vertical",
      "size": "xs",
      "class": "w-0.5"
    },
    {
      "orientation": "vertical",
      "size": "sm",
      "class": "w-1"
    },
    {
      "orientation": "vertical",
      "size": "md",
      "class": "w-2"
    },
    {
      "orientation": "vertical",
      "size": "lg",
      "class": "w-3"
    },
    {
      "orientation": "vertical",
      "size": "xl",
      "class": "w-4"
    },
    {
      "orientation": "vertical",
      "size": "2xl",
      "class": "w-5"
    },
    {
      "orientation": "horizontal",
      "animation": "carousel",
      "class": {
        "indicator": "data-[state=indeterminate]:animate-[carousel_2s_ease-in-out_infinite] data-[state=indeterminate]:rtl:animate-[carousel-rtl_2s_ease-in-out_infinite]"
      }
    },
    {
      "orientation": "vertical",
      "animation": "carousel",
      "class": {
        "indicator": "data-[state=indeterminate]:animate-[carousel-vertical_2s_ease-in-out_infinite]"
      }
    },
    {
      "orientation": "horizontal",
      "animation": "carousel-inverse",
      "class": {
        "indicator": "data-[state=indeterminate]:animate-[carousel-inverse_2s_ease-in-out_infinite] data-[state=indeterminate]:rtl:animate-[carousel-inverse-rtl_2s_ease-in-out_infinite]"
      }
    },
    {
      "orientation": "vertical",
      "animation": "carousel-inverse",
      "class": {
        "indicator": "data-[state=indeterminate]:animate-[carousel-inverse-vertical_2s_ease-in-out_infinite]"
      }
    },
    {
      "orientation": "horizontal",
      "animation": "swing",
      "class": {
        "indicator": "data-[state=indeterminate]:animate-[swing_2s_ease-in-out_infinite]"
      }
    },
    {
      "orientation": "vertical",
      "animation": "swing",
      "class": {
        "indicator": "data-[state=indeterminate]:animate-[swing-vertical_2s_ease-in-out_infinite]"
      }
    },
    {
      "orientation": "horizontal",
      "animation": "elastic",
      "class": {
        "indicator": "data-[state=indeterminate]:animate-[elastic_2s_ease-in-out_infinite]"
      }
    },
    {
      "orientation": "vertical",
      "animation": "elastic",
      "class": {
        "indicator": "data-[state=indeterminate]:animate-[elastic-vertical_2s_ease-in-out_infinite]"
      }
    }
  ],
  "defaultVariants": {
    "animation": "carousel",
    "color": "primary",
    "size": "md"
  }
};
const _sfc_main$9 = {
  __name: "UProgress",
  __ssrInlineRender: true,
  props: {
    as: { type: null, required: false },
    max: { type: [Number, Array], required: false },
    status: { type: Boolean, required: false },
    inverted: { type: Boolean, required: false, default: false },
    size: { type: null, required: false },
    color: { type: null, required: false },
    orientation: { type: null, required: false, default: "horizontal" },
    animation: { type: null, required: false },
    class: { type: null, required: false },
    ui: { type: Object, required: false },
    getValueLabel: { type: Function, required: false },
    getValueText: { type: Function, required: false },
    modelValue: { type: [Number, null], required: false, default: null }
  },
  emits: ["update:modelValue", "update:max"],
  setup(__props, { emit: __emit }) {
    const _props = __props;
    const emits = __emit;
    const slots = useSlots();
    const props = useComponentProps("progress", _props);
    const { dir } = useLocale();
    const appConfig2 = useAppConfig();
    const rootProps = useForwardProps(reactivePick(props, "getValueLabel", "getValueText", "modelValue"), emits);
    const isIndeterminate = computed(() => rootProps.value.modelValue === null);
    const hasSteps = computed(() => Array.isArray(props.max));
    const realMax = computed(() => {
      if (isIndeterminate.value || !props.max) {
        return void 0;
      }
      if (Array.isArray(props.max)) {
        return props.max.length - 1;
      }
      return Number(props.max);
    });
    const percent = computed(() => {
      if (isIndeterminate.value) {
        return void 0;
      }
      switch (true) {
        case rootProps.value.modelValue < 0:
          return 0;
        case rootProps.value.modelValue > (realMax.value ?? 100):
          return 100;
        default:
          return Math.round(rootProps.value.modelValue / (realMax.value ?? 100) * 100);
      }
    });
    const indicatorStyle = computed(() => {
      if (percent.value === void 0) {
        return;
      }
      if (props.orientation === "vertical") {
        return {
          transform: `translateY(${props.inverted ? "" : "-"}${100 - percent.value}%)`
        };
      } else {
        if (dir.value === "rtl") {
          return {
            transform: `translateX(${props.inverted ? "-" : ""}${100 - percent.value}%)`
          };
        } else {
          return {
            transform: `translateX(${props.inverted ? "" : "-"}${100 - percent.value}%)`
          };
        }
      }
    });
    const statusStyle = computed(() => {
      const value = `${Math.max(percent.value ?? 0, 0)}%`;
      return props.orientation === "vertical" ? { height: value } : { width: value };
    });
    function isActive(index2) {
      return index2 === Number(props.modelValue);
    }
    function isFirst(index2) {
      return index2 === 0;
    }
    function isLast(index2) {
      return index2 === realMax.value;
    }
    function stepVariant(index2) {
      index2 = Number(index2);
      if (isActive(index2) && !isFirst(index2)) {
        return "active";
      }
      if (isFirst(index2) && isActive(index2)) {
        return "first";
      }
      if (isLast(index2) && isActive(index2)) {
        return "last";
      }
      return "other";
    }
    const ui = computed(() => tv({ extend: tv(theme$2), ...appConfig2.ui?.progress || {} })({
      animation: props.animation,
      size: props.size,
      color: props.color,
      orientation: props.orientation,
      inverted: props.inverted
    }));
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(unref(Primitive), mergeProps({
        as: unref(props).as,
        "data-orientation": unref(props).orientation,
        "data-slot": "root",
        class: ui.value.root({ class: [unref(props).ui?.root, unref(props).class] })
      }, _attrs), {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            if (!isIndeterminate.value && (unref(props).status || !!slots.status)) {
              _push2(`<div data-slot="status" class="${ssrRenderClass(ui.value.status({ class: unref(props).ui?.status }))}" style="${ssrRenderStyle(statusStyle.value)}"${_scopeId}>`);
              ssrRenderSlot(_ctx.$slots, "status", { percent: percent.value }, () => {
                _push2(`${ssrInterpolate(percent.value)}% `);
              }, _push2, _parent2, _scopeId);
              _push2(`</div>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(ssrRenderComponent(unref(ProgressRoot_default), mergeProps(unref(rootProps), {
              max: realMax.value,
              "data-slot": "base",
              class: ui.value.base({ class: unref(props).ui?.base }),
              style: { "transform": "translateZ(0)" }
            }), {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(ssrRenderComponent(unref(ProgressIndicator_default), {
                    "data-slot": "indicator",
                    class: ui.value.indicator({ class: unref(props).ui?.indicator }),
                    style: indicatorStyle.value
                  }, null, _parent3, _scopeId2));
                } else {
                  return [
                    createVNode(unref(ProgressIndicator_default), {
                      "data-slot": "indicator",
                      class: ui.value.indicator({ class: unref(props).ui?.indicator }),
                      style: indicatorStyle.value
                    }, null, 8, ["class", "style"])
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
            if (hasSteps.value) {
              _push2(`<div data-slot="steps" class="${ssrRenderClass(ui.value.steps({ class: unref(props).ui?.steps }))}"${_scopeId}><!--[-->`);
              ssrRenderList(unref(props).max, (step, index2) => {
                _push2(`<div data-slot="step" class="${ssrRenderClass(ui.value.step({ class: unref(props).ui?.step, step: stepVariant(index2) }))}"${_scopeId}>`);
                ssrRenderSlot(_ctx.$slots, `step-${index2}`, { step }, () => {
                  _push2(`${ssrInterpolate(step)}`);
                }, _push2, _parent2, _scopeId);
                _push2(`</div>`);
              });
              _push2(`<!--]--></div>`);
            } else {
              _push2(`<!---->`);
            }
          } else {
            return [
              !isIndeterminate.value && (unref(props).status || !!slots.status) ? (openBlock(), createBlock("div", {
                key: 0,
                "data-slot": "status",
                class: ui.value.status({ class: unref(props).ui?.status }),
                style: statusStyle.value
              }, [
                renderSlot(_ctx.$slots, "status", { percent: percent.value }, () => [
                  createTextVNode(toDisplayString(percent.value) + "% ", 1)
                ])
              ], 6)) : createCommentVNode("", true),
              createVNode(unref(ProgressRoot_default), mergeProps(unref(rootProps), {
                max: realMax.value,
                "data-slot": "base",
                class: ui.value.base({ class: unref(props).ui?.base }),
                style: { "transform": "translateZ(0)" }
              }), {
                default: withCtx(() => [
                  createVNode(unref(ProgressIndicator_default), {
                    "data-slot": "indicator",
                    class: ui.value.indicator({ class: unref(props).ui?.indicator }),
                    style: indicatorStyle.value
                  }, null, 8, ["class", "style"])
                ]),
                _: 1
              }, 16, ["max", "class"]),
              hasSteps.value ? (openBlock(), createBlock("div", {
                key: 1,
                "data-slot": "steps",
                class: ui.value.steps({ class: unref(props).ui?.steps })
              }, [
                (openBlock(true), createBlock(Fragment, null, renderList(unref(props).max, (step, index2) => {
                  return openBlock(), createBlock("div", {
                    key: index2,
                    "data-slot": "step",
                    class: ui.value.step({ class: unref(props).ui?.step, step: stepVariant(index2) })
                  }, [
                    renderSlot(_ctx.$slots, `step-${index2}`, { step }, () => [
                      createTextVNode(toDisplayString(step), 1)
                    ])
                  ], 2);
                }), 128))
              ], 2)) : createCommentVNode("", true)
            ];
          }
        }),
        _: 3
      }, _parent));
    };
  }
};
const _sfc_setup$9 = _sfc_main$9.setup;
_sfc_main$9.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../node_modules/@nuxt/ui/dist/runtime/components/Progress.vue");
  return _sfc_setup$9 ? _sfc_setup$9(props, ctx) : void 0;
};
const theme$1 = {
  "slots": {
    "root": "relative group overflow-hidden bg-default shadow-lg rounded-lg ring ring-default p-4 flex gap-2.5",
    "wrapper": "w-0 flex-1 flex flex-col",
    "title": "text-sm font-medium text-highlighted",
    "description": "text-sm text-muted",
    "icon": "shrink-0 size-5",
    "avatar": "shrink-0",
    "avatarSize": "2xl",
    "actions": "flex gap-1.5 shrink-0",
    "progress": "absolute inset-x-0 bottom-0",
    "close": "p-0"
  },
  "variants": {
    "color": {
      "primary": {
        "root": "outline-primary/25 focus-visible:outline-3 focus-visible:ring-primary",
        "icon": "text-primary"
      },
      "secondary": {
        "root": "outline-secondary/25 focus-visible:outline-3 focus-visible:ring-secondary",
        "icon": "text-secondary"
      },
      "success": {
        "root": "outline-success/25 focus-visible:outline-3 focus-visible:ring-success",
        "icon": "text-success"
      },
      "info": {
        "root": "outline-info/25 focus-visible:outline-3 focus-visible:ring-info",
        "icon": "text-info"
      },
      "warning": {
        "root": "outline-warning/25 focus-visible:outline-3 focus-visible:ring-warning",
        "icon": "text-warning"
      },
      "error": {
        "root": "outline-error/25 focus-visible:outline-3 focus-visible:ring-error",
        "icon": "text-error"
      },
      "neutral": {
        "root": "outline-inverted/25 focus-visible:outline-3 focus-visible:ring-inverted",
        "icon": "text-highlighted"
      }
    },
    "orientation": {
      "horizontal": {
        "root": "items-center",
        "actions": "items-center"
      },
      "vertical": {
        "root": "items-start",
        "actions": "items-start mt-2.5"
      }
    },
    "title": {
      "true": {
        "description": "mt-1"
      }
    }
  },
  "defaultVariants": {
    "color": "primary"
  }
};
const _sfc_main$8 = {
  __name: "UToast",
  __ssrInlineRender: true,
  props: {
    as: { type: null, required: false },
    title: { type: [String, Object, Function], required: false },
    description: { type: [String, Object, Function], required: false },
    icon: { type: null, required: false },
    avatar: { type: Object, required: false },
    color: { type: null, required: false },
    orientation: { type: null, required: false, default: "vertical" },
    close: { type: [Boolean, Object], required: false, default: true },
    closeIcon: { type: null, required: false },
    actions: { type: Array, required: false },
    duration: { type: Number, required: false },
    progress: { type: [Boolean, Object], required: false, default: true },
    class: { type: null, required: false },
    ui: { type: Object, required: false },
    defaultOpen: { type: Boolean, required: false },
    open: { type: Boolean, required: false },
    type: { type: String, required: false }
  },
  emits: ["escapeKeyDown", "pause", "resume", "swipeStart", "swipeMove", "swipeCancel", "swipeEnd", "update:open"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const _props = __props;
    const emits = __emit;
    const slots = useSlots();
    const props = useComponentProps("toast", _props);
    const { t } = useLocale();
    const appConfig2 = useAppConfig();
    const rootProps = useForwardProps(reactivePick(props, "as", "defaultOpen", "open", "duration", "type"), emits);
    const ui = computed(() => tv({ extend: tv(theme$1), ...appConfig2.ui?.toast || {} })({
      color: props.color,
      orientation: props.orientation,
      title: !!props.title || !!slots.title
    }));
    const rootRef = useTemplateRef("rootRef");
    const height = ref(0);
    __expose({
      height
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(unref(ToastRoot_default), mergeProps({
        ref_key: "rootRef",
        ref: rootRef
      }, unref(rootProps), {
        "data-orientation": unref(props).orientation,
        "data-slot": "root",
        class: ui.value.root({ class: [unref(props).ui?.root, unref(props).class] }),
        style: { "--height": height.value }
      }, _attrs), {
        default: withCtx(({ remaining, duration: totalDuration, open }, _push2, _parent2, _scopeId) => {
          if (_push2) {
            ssrRenderSlot(_ctx.$slots, "leading", { ui: ui.value }, () => {
              if (unref(props).avatar) {
                _push2(ssrRenderComponent(_sfc_main$d, mergeProps({
                  size: unref(props).ui?.avatarSize || ui.value.avatarSize()
                }, unref(props).avatar, {
                  "data-slot": "avatar",
                  class: ui.value.avatar({ class: unref(props).ui?.avatar })
                }), null, _parent2, _scopeId));
              } else if (unref(props).icon) {
                _push2(ssrRenderComponent(_sfc_main$f, {
                  name: unref(props).icon,
                  "data-slot": "icon",
                  class: ui.value.icon({ class: unref(props).ui?.icon })
                }, null, _parent2, _scopeId));
              } else {
                _push2(`<!---->`);
              }
            }, _push2, _parent2, _scopeId);
            _push2(`<div data-slot="wrapper" class="${ssrRenderClass(ui.value.wrapper({ class: unref(props).ui?.wrapper }))}"${_scopeId}>`);
            if (unref(props).title || !!slots.title) {
              _push2(ssrRenderComponent(unref(ToastTitle_default), {
                "data-slot": "title",
                class: ui.value.title({ class: unref(props).ui?.title })
              }, {
                default: withCtx((_, _push3, _parent3, _scopeId2) => {
                  if (_push3) {
                    ssrRenderSlot(_ctx.$slots, "title", {}, () => {
                      if (typeof unref(props).title === "function") {
                        ssrRenderVNode(_push3, createVNode(resolveDynamicComponent(unref(props).title()), null, null), _parent3, _scopeId2);
                      } else if (typeof unref(props).title === "object") {
                        ssrRenderVNode(_push3, createVNode(resolveDynamicComponent(unref(props).title), null, null), _parent3, _scopeId2);
                      } else {
                        _push3(`<!--[-->${ssrInterpolate(unref(props).title)}<!--]-->`);
                      }
                    }, _push3, _parent3, _scopeId2);
                  } else {
                    return [
                      renderSlot(_ctx.$slots, "title", {}, () => [
                        typeof unref(props).title === "function" ? (openBlock(), createBlock(resolveDynamicComponent(unref(props).title()), { key: 0 })) : typeof unref(props).title === "object" ? (openBlock(), createBlock(resolveDynamicComponent(unref(props).title), { key: 1 })) : (openBlock(), createBlock(Fragment, { key: 2 }, [
                          createTextVNode(toDisplayString(unref(props).title), 1)
                        ], 64))
                      ])
                    ];
                  }
                }),
                _: 2
              }, _parent2, _scopeId));
            } else {
              _push2(`<!---->`);
            }
            if (unref(props).description || !!slots.description) {
              _push2(ssrRenderComponent(unref(ToastDescription_default), {
                "data-slot": "description",
                class: ui.value.description({ class: unref(props).ui?.description })
              }, {
                default: withCtx((_, _push3, _parent3, _scopeId2) => {
                  if (_push3) {
                    ssrRenderSlot(_ctx.$slots, "description", {}, () => {
                      if (typeof unref(props).description === "function") {
                        ssrRenderVNode(_push3, createVNode(resolveDynamicComponent(unref(props).description()), null, null), _parent3, _scopeId2);
                      } else if (typeof unref(props).description === "object") {
                        ssrRenderVNode(_push3, createVNode(resolveDynamicComponent(unref(props).description), null, null), _parent3, _scopeId2);
                      } else {
                        _push3(`<!--[-->${ssrInterpolate(unref(props).description)}<!--]-->`);
                      }
                    }, _push3, _parent3, _scopeId2);
                  } else {
                    return [
                      renderSlot(_ctx.$slots, "description", {}, () => [
                        typeof unref(props).description === "function" ? (openBlock(), createBlock(resolveDynamicComponent(unref(props).description()), { key: 0 })) : typeof unref(props).description === "object" ? (openBlock(), createBlock(resolveDynamicComponent(unref(props).description), { key: 1 })) : (openBlock(), createBlock(Fragment, { key: 2 }, [
                          createTextVNode(toDisplayString(unref(props).description), 1)
                        ], 64))
                      ])
                    ];
                  }
                }),
                _: 2
              }, _parent2, _scopeId));
            } else {
              _push2(`<!---->`);
            }
            if (unref(props).orientation === "vertical" && (unref(props).actions?.length || !!slots.actions)) {
              _push2(`<div data-slot="actions" class="${ssrRenderClass(ui.value.actions({ class: unref(props).ui?.actions }))}"${_scopeId}>`);
              ssrRenderSlot(_ctx.$slots, "actions", {}, () => {
                _push2(`<!--[-->`);
                ssrRenderList(unref(props).actions, (action, index2) => {
                  _push2(ssrRenderComponent(unref(ToastAction_default), {
                    key: index2,
                    "alt-text": action.label || "Action",
                    "as-child": "",
                    onClick: () => {
                    }
                  }, {
                    default: withCtx((_, _push3, _parent3, _scopeId2) => {
                      if (_push3) {
                        _push3(ssrRenderComponent(_sfc_main$a, mergeProps({
                          size: "xs",
                          color: unref(props).color
                        }, { ref_for: true }, action), null, _parent3, _scopeId2));
                      } else {
                        return [
                          createVNode(_sfc_main$a, mergeProps({
                            size: "xs",
                            color: unref(props).color
                          }, { ref_for: true }, action), null, 16, ["color"])
                        ];
                      }
                    }),
                    _: 2
                  }, _parent2, _scopeId));
                });
                _push2(`<!--]-->`);
              }, _push2, _parent2, _scopeId);
              _push2(`</div>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`</div>`);
            if (unref(props).orientation === "horizontal" && (unref(props).actions?.length || !!slots.actions) || unref(props).close) {
              _push2(`<div data-slot="actions" class="${ssrRenderClass(ui.value.actions({ class: unref(props).ui?.actions, orientation: "horizontal" }))}"${_scopeId}>`);
              if (unref(props).orientation === "horizontal" && (unref(props).actions?.length || !!slots.actions)) {
                ssrRenderSlot(_ctx.$slots, "actions", {}, () => {
                  _push2(`<!--[-->`);
                  ssrRenderList(unref(props).actions, (action, index2) => {
                    _push2(ssrRenderComponent(unref(ToastAction_default), {
                      key: index2,
                      "alt-text": action.label || "Action",
                      "as-child": "",
                      onClick: () => {
                      }
                    }, {
                      default: withCtx((_, _push3, _parent3, _scopeId2) => {
                        if (_push3) {
                          _push3(ssrRenderComponent(_sfc_main$a, mergeProps({
                            size: "xs",
                            color: unref(props).color
                          }, { ref_for: true }, action), null, _parent3, _scopeId2));
                        } else {
                          return [
                            createVNode(_sfc_main$a, mergeProps({
                              size: "xs",
                              color: unref(props).color
                            }, { ref_for: true }, action), null, 16, ["color"])
                          ];
                        }
                      }),
                      _: 2
                    }, _parent2, _scopeId));
                  });
                  _push2(`<!--]-->`);
                }, _push2, _parent2, _scopeId);
              } else {
                _push2(`<!---->`);
              }
              if (unref(props).close || !!slots.close) {
                _push2(ssrRenderComponent(unref(ToastClose_default), { "as-child": "" }, {
                  default: withCtx((_, _push3, _parent3, _scopeId2) => {
                    if (_push3) {
                      ssrRenderSlot(_ctx.$slots, "close", { ui: ui.value }, () => {
                        if (unref(props).close) {
                          _push3(ssrRenderComponent(_sfc_main$a, mergeProps({
                            icon: unref(props).closeIcon || unref(appConfig2).ui.icons.close,
                            color: "neutral",
                            variant: "link",
                            "aria-label": unref(t)("toast.close")
                          }, typeof unref(props).close === "object" ? unref(props).close : {}, {
                            "data-slot": "close",
                            class: ui.value.close({ class: unref(props).ui?.close }),
                            onClick: () => {
                            }
                          }), null, _parent3, _scopeId2));
                        } else {
                          _push3(`<!---->`);
                        }
                      }, _push3, _parent3, _scopeId2);
                    } else {
                      return [
                        renderSlot(_ctx.$slots, "close", { ui: ui.value }, () => [
                          unref(props).close ? (openBlock(), createBlock(_sfc_main$a, mergeProps({
                            key: 0,
                            icon: unref(props).closeIcon || unref(appConfig2).ui.icons.close,
                            color: "neutral",
                            variant: "link",
                            "aria-label": unref(t)("toast.close")
                          }, typeof unref(props).close === "object" ? unref(props).close : {}, {
                            "data-slot": "close",
                            class: ui.value.close({ class: unref(props).ui?.close }),
                            onClick: withModifiers(() => {
                            }, ["stop"])
                          }), null, 16, ["icon", "aria-label", "class", "onClick"])) : createCommentVNode("", true)
                        ])
                      ];
                    }
                  }),
                  _: 2
                }, _parent2, _scopeId));
              } else {
                _push2(`<!---->`);
              }
              _push2(`</div>`);
            } else {
              _push2(`<!---->`);
            }
            if (unref(props).progress && open && remaining > 0 && totalDuration) {
              _push2(ssrRenderComponent(_sfc_main$9, mergeProps({
                "model-value": remaining / totalDuration * 100,
                color: unref(props).color
              }, typeof unref(props).progress === "object" ? unref(props).progress : {}, {
                size: "sm",
                "data-slot": "progress",
                class: ui.value.progress({ class: unref(props).ui?.progress })
              }), null, _parent2, _scopeId));
            } else {
              _push2(`<!---->`);
            }
          } else {
            return [
              renderSlot(_ctx.$slots, "leading", { ui: ui.value }, () => [
                unref(props).avatar ? (openBlock(), createBlock(_sfc_main$d, mergeProps({
                  key: 0,
                  size: unref(props).ui?.avatarSize || ui.value.avatarSize()
                }, unref(props).avatar, {
                  "data-slot": "avatar",
                  class: ui.value.avatar({ class: unref(props).ui?.avatar })
                }), null, 16, ["size", "class"])) : unref(props).icon ? (openBlock(), createBlock(_sfc_main$f, {
                  key: 1,
                  name: unref(props).icon,
                  "data-slot": "icon",
                  class: ui.value.icon({ class: unref(props).ui?.icon })
                }, null, 8, ["name", "class"])) : createCommentVNode("", true)
              ]),
              createVNode("div", {
                "data-slot": "wrapper",
                class: ui.value.wrapper({ class: unref(props).ui?.wrapper })
              }, [
                unref(props).title || !!slots.title ? (openBlock(), createBlock(unref(ToastTitle_default), {
                  key: 0,
                  "data-slot": "title",
                  class: ui.value.title({ class: unref(props).ui?.title })
                }, {
                  default: withCtx(() => [
                    renderSlot(_ctx.$slots, "title", {}, () => [
                      typeof unref(props).title === "function" ? (openBlock(), createBlock(resolveDynamicComponent(unref(props).title()), { key: 0 })) : typeof unref(props).title === "object" ? (openBlock(), createBlock(resolveDynamicComponent(unref(props).title), { key: 1 })) : (openBlock(), createBlock(Fragment, { key: 2 }, [
                        createTextVNode(toDisplayString(unref(props).title), 1)
                      ], 64))
                    ])
                  ]),
                  _: 3
                }, 8, ["class"])) : createCommentVNode("", true),
                unref(props).description || !!slots.description ? (openBlock(), createBlock(unref(ToastDescription_default), {
                  key: 1,
                  "data-slot": "description",
                  class: ui.value.description({ class: unref(props).ui?.description })
                }, {
                  default: withCtx(() => [
                    renderSlot(_ctx.$slots, "description", {}, () => [
                      typeof unref(props).description === "function" ? (openBlock(), createBlock(resolveDynamicComponent(unref(props).description()), { key: 0 })) : typeof unref(props).description === "object" ? (openBlock(), createBlock(resolveDynamicComponent(unref(props).description), { key: 1 })) : (openBlock(), createBlock(Fragment, { key: 2 }, [
                        createTextVNode(toDisplayString(unref(props).description), 1)
                      ], 64))
                    ])
                  ]),
                  _: 3
                }, 8, ["class"])) : createCommentVNode("", true),
                unref(props).orientation === "vertical" && (unref(props).actions?.length || !!slots.actions) ? (openBlock(), createBlock("div", {
                  key: 2,
                  "data-slot": "actions",
                  class: ui.value.actions({ class: unref(props).ui?.actions })
                }, [
                  renderSlot(_ctx.$slots, "actions", {}, () => [
                    (openBlock(true), createBlock(Fragment, null, renderList(unref(props).actions, (action, index2) => {
                      return openBlock(), createBlock(unref(ToastAction_default), {
                        key: index2,
                        "alt-text": action.label || "Action",
                        "as-child": "",
                        onClick: withModifiers(() => {
                        }, ["stop"])
                      }, {
                        default: withCtx(() => [
                          createVNode(_sfc_main$a, mergeProps({
                            size: "xs",
                            color: unref(props).color
                          }, { ref_for: true }, action), null, 16, ["color"])
                        ]),
                        _: 2
                      }, 1032, ["alt-text", "onClick"]);
                    }), 128))
                  ])
                ], 2)) : createCommentVNode("", true)
              ], 2),
              unref(props).orientation === "horizontal" && (unref(props).actions?.length || !!slots.actions) || unref(props).close ? (openBlock(), createBlock("div", {
                key: 0,
                "data-slot": "actions",
                class: ui.value.actions({ class: unref(props).ui?.actions, orientation: "horizontal" })
              }, [
                unref(props).orientation === "horizontal" && (unref(props).actions?.length || !!slots.actions) ? renderSlot(_ctx.$slots, "actions", { key: 0 }, () => [
                  (openBlock(true), createBlock(Fragment, null, renderList(unref(props).actions, (action, index2) => {
                    return openBlock(), createBlock(unref(ToastAction_default), {
                      key: index2,
                      "alt-text": action.label || "Action",
                      "as-child": "",
                      onClick: withModifiers(() => {
                      }, ["stop"])
                    }, {
                      default: withCtx(() => [
                        createVNode(_sfc_main$a, mergeProps({
                          size: "xs",
                          color: unref(props).color
                        }, { ref_for: true }, action), null, 16, ["color"])
                      ]),
                      _: 2
                    }, 1032, ["alt-text", "onClick"]);
                  }), 128))
                ]) : createCommentVNode("", true),
                unref(props).close || !!slots.close ? (openBlock(), createBlock(unref(ToastClose_default), {
                  key: 1,
                  "as-child": ""
                }, {
                  default: withCtx(() => [
                    renderSlot(_ctx.$slots, "close", { ui: ui.value }, () => [
                      unref(props).close ? (openBlock(), createBlock(_sfc_main$a, mergeProps({
                        key: 0,
                        icon: unref(props).closeIcon || unref(appConfig2).ui.icons.close,
                        color: "neutral",
                        variant: "link",
                        "aria-label": unref(t)("toast.close")
                      }, typeof unref(props).close === "object" ? unref(props).close : {}, {
                        "data-slot": "close",
                        class: ui.value.close({ class: unref(props).ui?.close }),
                        onClick: withModifiers(() => {
                        }, ["stop"])
                      }), null, 16, ["icon", "aria-label", "class", "onClick"])) : createCommentVNode("", true)
                    ])
                  ]),
                  _: 3
                })) : createCommentVNode("", true)
              ], 2)) : createCommentVNode("", true),
              unref(props).progress && open && remaining > 0 && totalDuration ? (openBlock(), createBlock(_sfc_main$9, mergeProps({
                key: 1,
                "model-value": remaining / totalDuration * 100,
                color: unref(props).color
              }, typeof unref(props).progress === "object" ? unref(props).progress : {}, {
                size: "sm",
                "data-slot": "progress",
                class: ui.value.progress({ class: unref(props).ui?.progress })
              }), null, 16, ["model-value", "color", "class"])) : createCommentVNode("", true)
            ];
          }
        }),
        _: 3
      }, _parent));
    };
  }
};
const _sfc_setup$8 = _sfc_main$8.setup;
_sfc_main$8.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../node_modules/@nuxt/ui/dist/runtime/components/Toast.vue");
  return _sfc_setup$8 ? _sfc_setup$8(props, ctx) : void 0;
};
const theme = {
  "slots": {
    "viewport": "fixed flex flex-col w-[calc(100%-2rem)] sm:w-96 z-[100] data-[expanded=true]:h-(--height) focus:outline-none",
    "base": "pointer-events-auto absolute inset-x-0 z-(--index) transform-(--transform) data-[expanded=false]:data-[front=false]:h-(--front-height) data-[expanded=false]:data-[front=false]:*:opacity-0 data-[front=false]:*:transition-opacity data-[front=false]:*:duration-100 data-[state=closed]:animate-[toast-closed_200ms_ease-in-out] data-[state=closed]:data-[expanded=false]:data-[front=false]:animate-[toast-collapsed-closed_200ms_ease-in-out] data-[state=open]:data-[pulsing=odd]:animate-[toast-pulse-a_300ms_ease-out] data-[state=open]:data-[pulsing=even]:animate-[toast-pulse-b_300ms_ease-out] data-[swipe=move]:transition-none transition-[transform,translate,height] duration-200 ease-out"
  },
  "variants": {
    "position": {
      "top-left": {
        "viewport": "left-4"
      },
      "top-center": {
        "viewport": "left-1/2 transform -translate-x-1/2"
      },
      "top-right": {
        "viewport": "right-4"
      },
      "bottom-left": {
        "viewport": "left-4"
      },
      "bottom-center": {
        "viewport": "left-1/2 transform -translate-x-1/2"
      },
      "bottom-right": {
        "viewport": "right-4"
      }
    },
    "swipeDirection": {
      "up": "data-[swipe=end]:animate-[toast-slide-up_200ms_ease-out]",
      "right": "data-[swipe=end]:animate-[toast-slide-right_200ms_ease-out]",
      "down": "data-[swipe=end]:animate-[toast-slide-down_200ms_ease-out]",
      "left": "data-[swipe=end]:animate-[toast-slide-left_200ms_ease-out]"
    }
  },
  "compoundVariants": [
    {
      "position": [
        "top-left",
        "top-center",
        "top-right"
      ],
      "class": {
        "viewport": "top-4",
        "base": "top-0 data-[state=open]:animate-[toast-slide-in-from-top_200ms_ease-in-out]"
      }
    },
    {
      "position": [
        "bottom-left",
        "bottom-center",
        "bottom-right"
      ],
      "class": {
        "viewport": "bottom-4",
        "base": "bottom-0 data-[state=open]:animate-[toast-slide-in-from-bottom_200ms_ease-in-out]"
      }
    },
    {
      "swipeDirection": [
        "left",
        "right"
      ],
      "class": "data-[swipe=move]:translate-x-(--reka-toast-swipe-move-x) data-[swipe=end]:translate-x-(--reka-toast-swipe-end-x) data-[swipe=cancel]:translate-x-0"
    },
    {
      "swipeDirection": [
        "up",
        "down"
      ],
      "class": "data-[swipe=move]:translate-y-(--reka-toast-swipe-move-y) data-[swipe=end]:translate-y-(--reka-toast-swipe-end-y) data-[swipe=cancel]:translate-y-0"
    }
  ],
  "defaultVariants": {
    "position": "bottom-right"
  }
};
const __default__$1 = {
  name: "Toaster"
};
const _sfc_main$7 = /* @__PURE__ */ Object.assign(__default__$1, {
  __ssrInlineRender: true,
  props: {
    position: { type: null, required: false },
    expand: { type: Boolean, required: false, default: true },
    progress: { type: Boolean, required: false, default: true },
    portal: { type: [Boolean, String], required: false, skipCheck: true, default: true },
    max: { type: Number, required: false, default: 5 },
    class: { type: null, required: false },
    ui: { type: Object, required: false },
    label: { type: String, required: false },
    duration: { type: Number, required: false, default: 5e3 },
    disableSwipe: { type: Boolean, required: false },
    swipeThreshold: { type: Number, required: false }
  },
  setup(__props) {
    const _props = __props;
    const props = useComponentProps("toaster", _props);
    const { toasts, remove } = useToast();
    const appConfig2 = useAppConfig();
    provide(toastMaxInjectionKey, toRef(() => props.max));
    const providerProps = useForwardProps(reactivePick(props, "duration", "label", "swipeThreshold", "disableSwipe"));
    const portalProps = usePortal(toRef(() => props.portal));
    const swipeDirection = computed(() => {
      switch (props.position) {
        case "top-center":
          return "up";
        case "top-right":
        case "bottom-right":
          return "right";
        case "bottom-center":
          return "down";
        case "top-left":
        case "bottom-left":
          return "left";
      }
      return "right";
    });
    const ui = computed(() => tv({ extend: tv(theme), ...appConfig2.ui?.toaster || {} })({
      position: props.position,
      swipeDirection: swipeDirection.value
    }));
    function onUpdateOpen(value, id) {
      if (value) {
        return;
      }
      remove(id);
    }
    const hovered = ref(false);
    const expanded = computed(() => props.expand || hovered.value);
    const refs = ref([]);
    const height = computed(() => refs.value.reduce((acc, { height: height2 }) => acc + height2 + 16, 0));
    const frontHeight = computed(() => refs.value[refs.value.length - 1]?.height || 0);
    function getOffset(index2) {
      return refs.value.slice(index2 + 1).reduce((acc, { height: height2 }) => acc + height2 + 16, 0);
    }
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(unref(ToastProvider_default), mergeProps({ "swipe-direction": swipeDirection.value }, unref(providerProps), _attrs), {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            ssrRenderSlot(_ctx.$slots, "default", {}, null, _push2, _parent2, _scopeId);
            _push2(`<!--[-->`);
            ssrRenderList(unref(toasts), (toast, index2) => {
              _push2(ssrRenderComponent(_sfc_main$8, mergeProps({
                key: toast.id,
                ref_for: true,
                ref_key: "refs",
                ref: refs,
                progress: unref(props).progress
              }, { ref_for: true }, unref(omit)(toast, ["id", "close", "_duplicate", "_updated"]), {
                close: toast.close,
                "data-expanded": expanded.value,
                "data-front": !expanded.value && index2 === unref(toasts).length - 1,
                "data-pulsing": toast._duplicate ? toast._duplicate % 2 === 0 ? "even" : "odd" : void 0,
                style: {
                  "--index": index2 - unref(toasts).length + unref(toasts).length,
                  "--before": unref(toasts).length - 1 - index2,
                  "--offset": getOffset(index2),
                  "--scale": expanded.value ? "1" : "calc(1 - var(--before) * var(--scale-factor))",
                  "--translate": expanded.value ? "calc(var(--offset) * var(--translate-factor))" : "calc(var(--before) * var(--gap))",
                  "--transform": "translateY(var(--translate)) scale(var(--scale))"
                },
                "data-slot": "base",
                class: ui.value.base({ class: [unref(props).ui?.base, toast.onClick ? "cursor-pointer" : void 0] }),
                "onUpdate:open": ($event) => onUpdateOpen($event, toast.id),
                onClick: ($event) => toast.onClick && toast.onClick(toast)
              }), null, _parent2, _scopeId));
            });
            _push2(`<!--]-->`);
            _push2(ssrRenderComponent(unref(ToastPortal_default), unref(portalProps), {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(ssrRenderComponent(unref(ToastViewport_default), {
                    "data-expanded": expanded.value,
                    "data-slot": "viewport",
                    class: ui.value.viewport({ class: [unref(props).ui?.viewport, unref(props).class] }),
                    style: {
                      "--scale-factor": "0.05",
                      "--translate-factor": unref(props).position?.startsWith("top") ? "1px" : "-1px",
                      "--gap": unref(props).position?.startsWith("top") ? "16px" : "-16px",
                      "--front-height": `${frontHeight.value}px`,
                      "--height": `${height.value}px`
                    },
                    onMouseenter: ($event) => hovered.value = true,
                    onMouseleave: ($event) => hovered.value = false
                  }, null, _parent3, _scopeId2));
                } else {
                  return [
                    createVNode(unref(ToastViewport_default), {
                      "data-expanded": expanded.value,
                      "data-slot": "viewport",
                      class: ui.value.viewport({ class: [unref(props).ui?.viewport, unref(props).class] }),
                      style: {
                        "--scale-factor": "0.05",
                        "--translate-factor": unref(props).position?.startsWith("top") ? "1px" : "-1px",
                        "--gap": unref(props).position?.startsWith("top") ? "16px" : "-16px",
                        "--front-height": `${frontHeight.value}px`,
                        "--height": `${height.value}px`
                      },
                      onMouseenter: ($event) => hovered.value = true,
                      onMouseleave: ($event) => hovered.value = false
                    }, null, 8, ["data-expanded", "class", "style", "onMouseenter", "onMouseleave"])
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
          } else {
            return [
              renderSlot(_ctx.$slots, "default"),
              (openBlock(true), createBlock(Fragment, null, renderList(unref(toasts), (toast, index2) => {
                return openBlock(), createBlock(_sfc_main$8, mergeProps({
                  key: toast.id,
                  ref_for: true,
                  ref_key: "refs",
                  ref: refs,
                  progress: unref(props).progress
                }, { ref_for: true }, unref(omit)(toast, ["id", "close", "_duplicate", "_updated"]), {
                  close: toast.close,
                  "data-expanded": expanded.value,
                  "data-front": !expanded.value && index2 === unref(toasts).length - 1,
                  "data-pulsing": toast._duplicate ? toast._duplicate % 2 === 0 ? "even" : "odd" : void 0,
                  style: {
                    "--index": index2 - unref(toasts).length + unref(toasts).length,
                    "--before": unref(toasts).length - 1 - index2,
                    "--offset": getOffset(index2),
                    "--scale": expanded.value ? "1" : "calc(1 - var(--before) * var(--scale-factor))",
                    "--translate": expanded.value ? "calc(var(--offset) * var(--translate-factor))" : "calc(var(--before) * var(--gap))",
                    "--transform": "translateY(var(--translate)) scale(var(--scale))"
                  },
                  "data-slot": "base",
                  class: ui.value.base({ class: [unref(props).ui?.base, toast.onClick ? "cursor-pointer" : void 0] }),
                  "onUpdate:open": ($event) => onUpdateOpen($event, toast.id),
                  onClick: ($event) => toast.onClick && toast.onClick(toast)
                }), null, 16, ["progress", "close", "data-expanded", "data-front", "data-pulsing", "style", "class", "onUpdate:open", "onClick"]);
              }), 128)),
              createVNode(unref(ToastPortal_default), unref(portalProps), {
                default: withCtx(() => [
                  createVNode(unref(ToastViewport_default), {
                    "data-expanded": expanded.value,
                    "data-slot": "viewport",
                    class: ui.value.viewport({ class: [unref(props).ui?.viewport, unref(props).class] }),
                    style: {
                      "--scale-factor": "0.05",
                      "--translate-factor": unref(props).position?.startsWith("top") ? "1px" : "-1px",
                      "--gap": unref(props).position?.startsWith("top") ? "16px" : "-16px",
                      "--front-height": `${frontHeight.value}px`,
                      "--height": `${height.value}px`
                    },
                    onMouseenter: ($event) => hovered.value = true,
                    onMouseleave: ($event) => hovered.value = false
                  }, null, 8, ["data-expanded", "class", "style", "onMouseenter", "onMouseleave"])
                ]),
                _: 1
              }, 16)
            ];
          }
        }),
        _: 3
      }, _parent));
    };
  }
});
const _sfc_setup$7 = _sfc_main$7.setup;
_sfc_main$7.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../node_modules/@nuxt/ui/dist/runtime/components/Toaster.vue");
  return _sfc_setup$7 ? _sfc_setup$7(props, ctx) : void 0;
};
const UToaster = Object.assign(_sfc_main$7, { __name: "UToaster" });
function _useOverlay() {
  const overlays = shallowReactive([]);
  const create = (component, _options) => {
    const { props, defaultOpen, destroyOnClose } = _options || {};
    const options2 = reactive({
      id: /* @__PURE__ */ Symbol(""),
      isOpen: !!defaultOpen,
      component: markRaw(component),
      isMounted: !!defaultOpen,
      destroyOnClose: !!destroyOnClose,
      originalProps: props || {},
      props: { ...props }
    });
    overlays.push(options2);
    return {
      ...options2,
      open: (props2) => open(options2.id, props2),
      close: (value) => close(options2.id, value),
      patch: (props2) => patch(options2.id, props2)
    };
  };
  const open = (id, props) => {
    const overlay = getOverlay(id);
    if (props) {
      overlay.props = { ...overlay.originalProps, ...props };
    } else {
      overlay.props = { ...overlay.originalProps };
    }
    overlay.isOpen = true;
    overlay.isMounted = true;
    const result = new Promise((resolve) => overlay.resolvePromise = resolve);
    return Object.assign(result, {
      id,
      isMounted: overlay.isMounted,
      isOpen: overlay.isOpen,
      result
    });
  };
  const close = (id, value) => {
    const overlay = getOverlay(id);
    overlay.isOpen = false;
    if (overlay.resolvePromise) {
      overlay.resolvePromise(value);
      overlay.resolvePromise = void 0;
    }
  };
  const closeAll = () => {
    overlays.forEach((overlay) => close(overlay.id));
  };
  const unmount = (id) => {
    const overlay = getOverlay(id);
    overlay.isMounted = false;
    if (overlay.destroyOnClose) {
      const index2 = overlays.findIndex((overlay2) => overlay2.id === id);
      overlays.splice(index2, 1);
    }
  };
  const patch = (id, props) => {
    const overlay = getOverlay(id);
    overlay.props = { ...overlay.props, ...props };
  };
  const getOverlay = (id) => {
    const overlay = overlays.find((overlay2) => overlay2.id === id);
    if (!overlay) {
      throw new Error("Overlay not found");
    }
    return overlay;
  };
  const isOpen = (id) => {
    const overlay = getOverlay(id);
    return overlay.isOpen;
  };
  return {
    overlays,
    open,
    close,
    closeAll,
    create,
    patch,
    unmount,
    isOpen
  };
}
const useOverlay = /* @__PURE__ */ createSharedComposable(_useOverlay);
const _sfc_main$6 = {
  __name: "UOverlayProvider",
  __ssrInlineRender: true,
  setup(__props) {
    const { overlays, unmount, close } = useOverlay();
    const mountedOverlays = computed(() => overlays.filter((overlay) => overlay.isMounted));
    const onAfterLeave = (id) => {
      close(id);
      unmount(id);
    };
    const onClose = (id, value) => {
      close(id, value);
    };
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<!--[-->`);
      ssrRenderList(mountedOverlays.value, (overlay) => {
        ssrRenderVNode(_push, createVNode(resolveDynamicComponent(overlay.component), mergeProps({
          key: overlay.id
        }, { ref_for: true }, overlay.props, {
          open: overlay.isOpen,
          "onUpdate:open": ($event) => overlay.isOpen = $event,
          onClose: (value) => onClose(overlay.id, value),
          "onAfter:leave": ($event) => onAfterLeave(overlay.id)
        }), null), _parent);
      });
      _push(`<!--]-->`);
    };
  }
};
const _sfc_setup$6 = _sfc_main$6.setup;
_sfc_main$6.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../node_modules/@nuxt/ui/dist/runtime/components/OverlayProvider.vue");
  return _sfc_setup$6 ? _sfc_setup$6(props, ctx) : void 0;
};
const __default__ = {
  name: "App"
};
const _sfc_main$5 = /* @__PURE__ */ Object.assign(__default__, {
  __ssrInlineRender: true,
  props: {
    tooltip: { type: Object, required: false },
    toaster: { type: [Object, null], required: false },
    locale: { type: Object, required: false },
    portal: { type: [Boolean, String], required: false, skipCheck: true, default: "body" },
    dir: { type: String, required: false },
    scrollBody: { type: [Boolean, Object], required: false },
    nonce: { type: String, required: false }
  },
  setup(__props) {
    const props = __props;
    const configProviderProps = useForwardProps$1(reactivePick(props, "scrollBody"));
    const tooltipProps = toRef(() => props.tooltip);
    const toasterProps = toRef(() => props.toaster);
    const locale = toRef(() => props.locale);
    provide(localeContextInjectionKey, locale);
    const portal = toRef(() => props.portal);
    provide(portalTargetInjectionKey, portal);
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(unref(ConfigProvider_default), mergeProps({
        "use-id": () => useId(),
        dir: props.dir || locale.value?.dir,
        locale: locale.value?.code
      }, unref(configProviderProps), _attrs), {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(unref(TooltipProvider_default), tooltipProps.value, {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  if (__props.toaster !== null) {
                    _push3(ssrRenderComponent(UToaster, toasterProps.value, {
                      default: withCtx((_3, _push4, _parent4, _scopeId3) => {
                        if (_push4) {
                          ssrRenderSlot(_ctx.$slots, "default", {}, null, _push4, _parent4, _scopeId3);
                        } else {
                          return [
                            renderSlot(_ctx.$slots, "default")
                          ];
                        }
                      }),
                      _: 3
                    }, _parent3, _scopeId2));
                  } else {
                    ssrRenderSlot(_ctx.$slots, "default", {}, null, _push3, _parent3, _scopeId2);
                  }
                  _push3(ssrRenderComponent(_sfc_main$6, null, null, _parent3, _scopeId2));
                } else {
                  return [
                    __props.toaster !== null ? (openBlock(), createBlock(UToaster, mergeProps({ key: 0 }, toasterProps.value), {
                      default: withCtx(() => [
                        renderSlot(_ctx.$slots, "default")
                      ]),
                      _: 3
                    }, 16)) : renderSlot(_ctx.$slots, "default", { key: 1 }),
                    createVNode(_sfc_main$6)
                  ];
                }
              }),
              _: 3
            }, _parent2, _scopeId));
          } else {
            return [
              createVNode(unref(TooltipProvider_default), tooltipProps.value, {
                default: withCtx(() => [
                  __props.toaster !== null ? (openBlock(), createBlock(UToaster, mergeProps({ key: 0 }, toasterProps.value), {
                    default: withCtx(() => [
                      renderSlot(_ctx.$slots, "default")
                    ]),
                    _: 3
                  }, 16)) : renderSlot(_ctx.$slots, "default", { key: 1 }),
                  createVNode(_sfc_main$6)
                ]),
                _: 3
              }, 16)
            ];
          }
        }),
        _: 3
      }, _parent));
    };
  }
});
const _sfc_setup$5 = _sfc_main$5.setup;
_sfc_main$5.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../node_modules/@nuxt/ui/dist/runtime/components/App.vue");
  return _sfc_setup$5 ? _sfc_setup$5(props, ctx) : void 0;
};
const __nuxt_component_0 = Object.assign(_sfc_main$5, { __name: "UApp" });
const _sfc_main$4 = /* @__PURE__ */ defineComponent({
  __name: "AmbientBackground",
  __ssrInlineRender: true,
  setup(__props) {
    function starField(count, colorVar, blur = "0") {
      const dots = [];
      for (let i = 0; i < count; i += 1) {
        const x = (Math.random() * 100).toFixed(2);
        const y = (Math.random() * 100).toFixed(2);
        dots.push(`${x}vw ${y}vh ${blur} ${colorVar}`);
      }
      return dots.join(",");
    }
    starField(200, "color-mix(in oklch, var(--ui-primary) 70%, transparent)", "0");
    starField(200, "color-mix(in oklch, var(--ui-info) 70%, transparent)", "0");
    starField(200, "color-mix(in oklch, var(--ui-success) 70%, transparent)", "0");
    starField(100, "color-mix(in oklch, var(--ui-warning) 85%, transparent)", "1px");
    starField(100, "color-mix(in oklch, var(--ui-error) 85%, transparent)", "1px");
    return (_ctx, _push, _parent, _attrs) => {
      const _component_ClientOnly = __nuxt_component_0$2;
      _push(`<div${ssrRenderAttrs(mergeProps({
        class: "ambient",
        "aria-hidden": "true"
      }, _attrs))} data-v-57388f35><div class="ambient-grid" data-v-57388f35></div><svg class="ambient-goo-defs" aria-hidden="true" data-v-57388f35><defs data-v-57388f35><filter id="iridis-goo" x="-60%" y="-60%" width="220%" height="220%" data-v-57388f35><feGaussianBlur in="SourceGraphic" stdDeviation="16" result="blur" data-v-57388f35></feGaussianBlur><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 16 -6" result="goo" data-v-57388f35></feColorMatrix><feBlend in="SourceGraphic" in2="goo" data-v-57388f35></feBlend></filter></defs></svg>`);
      _push(ssrRenderComponent(_component_ClientOnly, null, {}, _parent));
      _push(`</div>`);
    };
  }
});
const _export_sfc = (sfc, props) => {
  const target = sfc.__vccOpts || sfc;
  for (const [key, val] of props) {
    target[key] = val;
  }
  return target;
};
const _sfc_setup$4 = _sfc_main$4.setup;
_sfc_main$4.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/layout/AmbientBackground.vue");
  return _sfc_setup$4 ? _sfc_setup$4(props, ctx) : void 0;
};
const __nuxt_component_1 = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$4, [["__scopeId", "data-v-57388f35"]]), { __name: "AmbientBackground" });
const consoleLogger = Logger.create({
  "level": "warn",
  "transports": [ConsoleTransport.create()]
});
const InputSchema = {
  "$id": "https://studnicky.dev/iridis/Input",
  "additionalProperties": false,
  "properties": {
    "bypass": { "type": "boolean" },
    "colors": { "type": "array" },
    "contrast": {
      "additionalProperties": false,
      "properties": {
        "algorithm": { "enum": ["wcag21", "apca"], "type": "string" },
        "cvdCorrect": { "type": "boolean" },
        "extra": { "type": "array" },
        "level": { "type": "string" }
      },
      "type": "object"
    },
    "emit": {
      "items": { "type": "string" },
      "type": "array"
    },
    "maxColors": { "minimum": 1, "type": "number" },
    "metadata": {
      "additionalProperties": true,
      "type": "object"
    },
    "roles": { "type": "object" },
    "runtime": {
      "additionalProperties": false,
      "properties": {
        "colorSpace": { "enum": ["srgb", "displayP3"], "type": "string" },
        "extra": { "additionalProperties": true, "type": "object" },
        "framing": { "enum": ["dark", "light"], "type": "string" }
      },
      "type": "object"
    }
  },
  "required": ["colors"],
  "type": "object"
};
const PaletteStateSchema = {
  "$id": "https://studnicky.dev/iridis/PaletteState",
  "additionalProperties": false,
  "properties": {
    "colors": {
      "description": "Canonical intake colors after intake:* tasks normalize into ColorRecord.",
      "items": { "$ref": "https://studnicky.dev/iridis/ColorRecord" },
      "type": "array"
    },
    "input": {
      "description": "Verbatim caller input, frozen at run start.",
      "type": "object"
    },
    "metadata": {
      "additionalProperties": true,
      "description": "Run-scoped metadata (timings, contrast reports, role schema in use, etc.).",
      "type": "object"
    },
    "outputs": {
      "additionalProperties": true,
      "description": "Output namespace owned by emit:* tasks. Each emitter writes its slot.",
      "type": "object"
    },
    "roles": {
      "additionalProperties": { "$ref": "https://studnicky.dev/iridis/ColorRecord" },
      "description": "Role name → ColorRecord. Populated by resolve:roles, mutated by enforce:* tasks.",
      "type": "object"
    },
    "runtime": {
      "additionalProperties": false,
      "description": "Cross-output runtime toggles (framing, colorSpace, plugin extras). Read by emit:* tasks across plugins.",
      "properties": {
        "colorSpace": { "enum": ["srgb", "displayP3"], "type": "string" },
        "extra": { "additionalProperties": true, "type": "object" },
        "framing": { "enum": ["dark", "light"], "type": "string" }
      },
      "type": "object"
    },
    "variants": {
      "additionalProperties": {
        "additionalProperties": { "$ref": "https://studnicky.dev/iridis/ColorRecord" },
        "type": "object"
      },
      "description": "Variant name (light/dark/dim/debug/...) → role-shaped record.",
      "type": "object"
    }
  },
  "required": ["input", "runtime", "colors", "roles", "variants", "outputs", "metadata"],
  "type": "object"
};
const PluginSchema = {
  "$id": "https://studnicky.dev/iridis/Plugin",
  "properties": {
    "name": { "minLength": 1, "type": "string" },
    "schemas": {},
    "tasks": {},
    "version": { "minLength": 1, "type": "string" }
  },
  "required": ["name", "version"],
  "type": "object"
};
const RoleSchemaSchema = {
  "$id": "https://studnicky.dev/iridis/RoleSchema",
  "additionalProperties": false,
  "properties": {
    "contrastPairs": {
      "items": {
        "additionalProperties": false,
        "properties": {
          "algorithm": { "enum": ["wcag21", "apca"], "type": "string" },
          "background": { "type": "string" },
          "foreground": { "type": "string" },
          "minRatio": { "maximum": 21, "minimum": 1, "type": "number" }
        },
        "required": ["foreground", "background", "minRatio"],
        "type": "object"
      },
      "type": "array"
    },
    "description": { "type": "string" },
    "name": { "type": "string" },
    "roles": {
      "items": {
        "additionalProperties": false,
        "properties": {
          "chromaRange": {
            "items": { "maximum": 0.5, "minimum": 0, "type": "number" },
            "maxItems": 2,
            "minItems": 2,
            "type": "array"
          },
          "derivedFrom": { "description": "Other role name; if present, expand:family seeds from it.", "type": "string" },
          "description": { "type": "string" },
          "hue": { "maximum": 360, "minimum": 0, "type": "number" },
          "hueClamp": { "maximum": 180, "minimum": 0, "type": "number" },
          "hueOffset": { "maximum": 360, "minimum": -360, "type": "number" },
          "intent": {
            "enum": ["text", "background", "accent", "muted", "critical", "positive", "link", "button", "onAccent", "onButton"],
            "type": "string"
          },
          "lightnessRange": {
            "items": { "maximum": 1, "minimum": 0, "type": "number" },
            "maxItems": 2,
            "minItems": 2,
            "type": "array"
          },
          "name": { "type": "string" },
          "required": { "type": "boolean" }
        },
        "required": ["name"],
        "type": "object"
      },
      "type": "array"
    }
  },
  "required": ["name", "roles"],
  "type": "object"
};
const TaskManifestSchema = {
  "$id": "https://studnicky.dev/iridis/TaskManifest",
  "additionalProperties": false,
  "properties": {
    "description": { "type": "string" },
    "name": { "minLength": 1, "type": "string" },
    "phase": { "enum": ["onRunStart", "onRunEnd"], "type": "string" },
    "reads": { "items": { "type": "string" }, "type": "array" },
    "requires": { "items": { "type": "string" }, "type": "array" },
    "writes": { "items": { "type": "string" }, "type": "array" }
  },
  "required": ["name"],
  "type": "object"
};
const ColorRecordSchema = {
  "$id": "https://studnicky.dev/iridis/ColorRecord",
  "additionalProperties": false,
  "properties": {
    "alpha": { "maximum": 1, "minimum": 0, "type": "number" },
    "displayP3": {
      "additionalProperties": false,
      "properties": {
        "b": { "maximum": 1, "minimum": 0, "type": "number" },
        "g": { "maximum": 1, "minimum": 0, "type": "number" },
        "r": { "maximum": 1, "minimum": 0, "type": "number" }
      },
      "required": ["r", "g", "b"],
      "type": "object"
    },
    "hex": { "pattern": "^#[0-9a-fA-F]{6}$", "type": "string" },
    "hints": {
      "additionalProperties": false,
      "properties": {
        "intent": {
          "enum": ["text", "background", "accent", "muted", "critical", "positive", "link", "button", "onAccent", "onButton"],
          "type": "string"
        },
        "role": { "type": "string" },
        "weight": { "minimum": 0, "type": "number" }
      },
      "type": "object"
    },
    "oklch": {
      "additionalProperties": false,
      "properties": {
        "c": { "maximum": 0.5, "minimum": 0, "type": "number" },
        "h": { "maximum": 360, "minimum": 0, "type": "number" },
        "l": { "maximum": 1, "minimum": 0, "type": "number" }
      },
      "required": ["l", "c", "h"],
      "type": "object"
    },
    "rgb": {
      "additionalProperties": false,
      "properties": {
        "b": { "maximum": 1, "minimum": 0, "type": "number" },
        "g": { "maximum": 1, "minimum": 0, "type": "number" },
        "r": { "maximum": 1, "minimum": 0, "type": "number" }
      },
      "required": ["r", "g", "b"],
      "type": "object"
    },
    "sourceFormat": {
      "enum": ["hex", "rgb", "hsl", "oklch", "lab", "named", "imagePixel", "displayP3"],
      "type": "string"
    }
  },
  "required": ["oklch", "rgb", "hex", "alpha", "sourceFormat"],
  "type": "object"
};
class CrossReferenceRegistry {
  static ensure() {
    SchemaValidator.compile(ColorRecordSchema);
    SchemaValidator.compile(InputSchema);
    SchemaValidator.compile(PaletteStateSchema);
    SchemaValidator.compile(PluginSchema);
    SchemaValidator.compile(RoleSchemaSchema);
    SchemaValidator.compile(TaskManifestSchema);
  }
}
function normalisePath(instancePath, keyword, params) {
  if (keyword === "required") {
    const missing = params.missingProperty;
    if (missing !== void 0) {
      const base = instancePath.replace(/^\//, "").replace(/\//g, ".");
      return base.length > 0 ? `${base}.${missing}` : missing;
    }
  }
  if (instancePath === "") {
    return "";
  }
  const segments = instancePath.replace(/^\//, "").split("/");
  let result = "";
  for (const seg of segments) {
    if (/^\d+$/.test(seg)) {
      result += `[${seg}]`;
    } else {
      result += result === "" ? seg : `.${seg}`;
    }
  }
  return result;
}
const MESSAGE_FORMATTERS = {
  "additionalProperties": (params) => {
    const result = `additional property "${params.additionalProperty}" is not allowed`;
    return result;
  },
  "enum": (params, value) => {
    const allowed = params.allowedValues;
    return `expected one of [${allowed.join(", ")}], got ${String(value)}`;
  },
  "maximum": (params, value) => {
    const result = `${String(value)} is greater than maximum ${params.limit}`;
    return result;
  },
  "maxItems": (params, value) => {
    const actual = Array.isArray(value) ? value.length : 0;
    return `array length ${actual} is greater than maxItems ${params.limit}`;
  },
  "minimum": (params, value) => {
    const result = `${String(value)} is less than minimum ${params.limit}`;
    return result;
  },
  "minItems": (params, value) => {
    const actual = Array.isArray(value) ? value.length : 0;
    return `array length ${actual} is less than minItems ${params.limit}`;
  },
  "pattern": (params, value) => {
    const result = `value "${String(value)}" does not match pattern ${params.pattern}`;
    return result;
  },
  "required": (params) => {
    const result = `required property "${params.missingProperty}" is missing`;
    return result;
  },
  "type": (params, value) => {
    const expected = params.type;
    const expectedStr = Array.isArray(expected) ? expected.join(" | ") : expected;
    let actual;
    if (value === null) {
      actual = "null";
    } else if (Array.isArray(value)) {
      actual = "array";
    } else {
      actual = typeof value;
    }
    return `expected ${expectedStr}, got ${actual}`;
  }
};
function normaliseMessage(e, value) {
  const params = e.params;
  const formatter = MESSAGE_FORMATTERS[e.keyword];
  if (formatter !== void 0) {
    return formatter(params, value);
  }
  return e.message ?? "validation error";
}
class Value {
  static resolve(root, instancePath) {
    if (instancePath === "") {
      return root;
    }
    const segments = instancePath.replace(/^\//, "").split("/");
    let current = root;
    for (const seg of segments) {
      if (current === null || current === void 0) {
        return void 0;
      }
      if (typeof current === "object" && !Array.isArray(current)) {
        current = current[seg];
      } else if (Array.isArray(current)) {
        current = current[Number(seg)];
      } else {
        return void 0;
      }
    }
    return current;
  }
}
class ValidatorClass {
  #cache;
  constructor() {
    this.#cache = /* @__PURE__ */ new WeakMap();
    CrossReferenceRegistry.ensure();
  }
  validate(schema, value) {
    let fn = this.#cache.get(schema);
    if (fn === void 0) {
      fn = SchemaValidator.compile(schema);
      this.#cache.set(schema, fn);
    }
    const valid = fn(value);
    if (valid) {
      return { "errors": [], "valid": true };
    }
    const errors = (fn.errors ?? []).map((e) => {
      const params = e.params;
      const path = normalisePath(e.instancePath, e.keyword, params);
      const actual = Value.resolve(value, e.instancePath);
      const msg = normaliseMessage(e, actual);
      return { "message": msg, "path": path };
    });
    return { "errors": errors, "valid": false };
  }
  /**
   * Attempt to compile a schema to verify it is well-formed.
   * Returns true if the schema compiles without error, false otherwise.
   */
  tryCompile(schema) {
    try {
      SchemaValidator.compile(schema);
      return true;
    } catch {
      return false;
    }
  }
}
const Validator = ValidatorClass;
class TaskRegistry {
  entries = /* @__PURE__ */ new Map();
  onRunStart = [];
  onRunEnd = [];
  register(task) {
    if (task.name === "") {
      throw ValidationError.create({ "message": "task.name is required", "path": "TaskRegistry.register" });
    }
    this.entries.set(task.name, task);
  }
  hook(phase, task) {
    if (task.name === "") {
      throw ValidationError.create({ "message": "task.name is required", "path": "TaskRegistry.hook" });
    }
    this.entries.set(task.name, task);
    if (phase === "onRunStart") {
      this.onRunStart.push(task);
      return;
    }
    this.onRunEnd.push(task);
  }
  resolve(name) {
    const task = this.entries.get(name);
    if (task === void 0) {
      throw ModuleError.create(`TaskRegistry.resolve: no task registered with name '${name}'`, {
        "context": { "taskName": name },
        "scenario": "NOT_FOUND"
      });
    }
    return task;
  }
  has(name) {
    const result = this.entries.has(name);
    return result;
  }
  list() {
    const out = [];
    for (const task of this.entries.values()) {
      out.push(task.manifest ?? { "name": task.name });
    }
    return out;
  }
  hooks(phase) {
    return phase === "onRunStart" ? this.onRunStart : this.onRunEnd;
  }
}
class Engine {
  tasks = new TaskRegistry();
  order = [];
  /**
   * Cached, resolved task sequence for the current `order`. Built by
   * {@link Engine.pipeline} (or by the first {@link Engine.run} when no
   * pipeline was set) and reused across runs. Invalidated to `null` on
   * the next {@link Engine.pipeline} or {@link Engine.adopt} call;
   * either may change which task object resolves for a given name.
   */
  sequence = null;
  /** Plugin names that have been adopted. Used to warn on duplicate names. */
  adoptedPlugins = /* @__PURE__ */ new Set();
  /**
   * Per-engine ajv-backed validator (owns the ajv instance and compile cache).
   * Each Engine gets its own Validator so plugin-contributed schemas registered
   * into one Engine's validator don't leak to another.
   */
  validator = new Validator();
  /**
   * Accumulated plugin output schema contributions.
   * Key: slot name (e.g. 'json', 'cssVars'). Value: the JSON Schema to validate
   * state.outputs[key] against at run exit.
   */
  outputSchemas = /* @__PURE__ */ new Map();
  /**
   * Accumulated plugin metadata schema contributions.
   * Key: slot name. Value: the JSON Schema to validate state.metadata[key] against.
   */
  metadataSchemas = /* @__PURE__ */ new Map();
  /**
   * Registers every task and math primitive a plugin contributes in a
   * single call. Idempotent at the registry level: re-adopting a plugin
   * overwrites prior entries with the same names, which is how downstream
   * consumers monkey-patch built-ins.
   *
   * Validates: plugin shape, each task manifest (if present), and each
   * plugin-contributed output/metadata schema (must be ajv-compilable).
   * Rejects on first failure.
   */
  adopt(plugin2) {
    const pluginResult = this.validator.validate(PluginSchema, plugin2);
    if (!pluginResult.valid) {
      const first = pluginResult.errors[0];
      throw ValidationError.create({
        "message": `plugin invalid: ${first !== void 0 ? `${first.path}: ${first.message}` : "unknown error"}`,
        "path": "plugin",
        "violations": pluginResult.errors
      });
    }
    if (this.adoptedPlugins.has(plugin2.name)) {
      consoleLogger.warn(
        LogBody.create().component("Engine").operation("adopt").status(LOG_STATUS.PARTIAL).message(`Plugin '${plugin2.name}' (v${plugin2.version}) is already adopted; re-adopting will overwrite its tasks`).context({ "plugin": plugin2.name, "version": plugin2.version }).build()
      );
    }
    this.adoptedPlugins.add(plugin2.name);
    for (const task of plugin2.tasks()) {
      if (task.manifest !== void 0) {
        const manifestResult = this.validator.validate(TaskManifestSchema, task.manifest);
        if (!manifestResult.valid) {
          const first = manifestResult.errors[0];
          throw ValidationError.create({
            "message": `manifest invalid: ${first !== void 0 ? `${first.path}: ${first.message}` : "unknown error"}`,
            "path": `plugin.tasks['${task.name}'].manifest`,
            "violations": manifestResult.errors
          });
        }
      }
      const phase = task.manifest?.phase;
      if (phase !== void 0) {
        this.tasks.hook(phase, task);
      } else {
        this.tasks.register(task);
      }
    }
    if (typeof plugin2.schemas === "function") {
      const contrib = plugin2.schemas();
      if (contrib.outputs !== void 0) {
        for (const [slot, schema] of Object.entries(contrib.outputs)) {
          if (!this.validator.tryCompile(schema)) {
            throw ModuleError.create(
              `plugin '${plugin2.name}' contributed malformed output schema for slot '${slot}'`,
              {
                "context": { "kind": "outputs", "plugin": plugin2.name, "slot": slot },
                "scenario": "CONFIGURATION"
              }
            );
          }
          this.outputSchemas.set(slot, schema);
        }
      }
      if (contrib.metadata !== void 0) {
        for (const [slot, schema] of Object.entries(contrib.metadata)) {
          if (!this.validator.tryCompile(schema)) {
            throw ModuleError.create(
              `plugin '${plugin2.name}' contributed malformed metadata schema for slot '${slot}'`,
              {
                "context": { "kind": "metadata", "plugin": plugin2.name, "slot": slot },
                "scenario": "CONFIGURATION"
              }
            );
          }
          this.metadataSchemas.set(slot, schema);
        }
      }
    }
    this.sequence = null;
  }
  /**
   * Declares the explicit task execution order for {@link Engine.run}.
   * Each name MUST already be registered; an unknown name throws now
   * (fail-fast at composition) rather than mid-pipeline. When no order
   * is set, `run()` executes tasks in registration order.
   *
   * Re-validates each named task's manifest at pipeline declaration time.
   */
  pipeline(order) {
    for (const name of order) {
      if (!this.tasks.has(name)) {
        throw ModuleError.create(`Engine.pipeline: task '${name}' is not registered`, {
          "context": { "operation": "pipeline", "taskName": name },
          "scenario": "NOT_FOUND"
        });
      }
    }
    for (let i = 0; i < order.length; i++) {
      const name = order[i];
      const task = this.tasks.resolve(name);
      const requires = task.manifest?.requires;
      if (requires === void 0) {
        continue;
      }
      for (const dep of requires) {
        if (!this.tasks.has(dep)) {
          continue;
        }
        const depIndex = order.indexOf(dep);
        if (depIndex === -1) {
          throw ModuleError.create(
            `Engine.pipeline: task '${name}' requires '${dep}', which is missing from the pipeline entirely`,
            {
              "context": { "dependency": dep, "operation": "pipeline", "reason": "missing-from-pipeline", "taskName": name },
              "scenario": "CONFIGURATION"
            }
          );
        }
        if (depIndex >= i) {
          throw ModuleError.create(
            `Engine.pipeline: task '${name}' requires '${dep}', which must appear earlier in the pipeline`,
            {
              "context": { "dependency": dep, "operation": "pipeline", "reason": "out-of-order", "taskName": name },
              "scenario": "CONFIGURATION"
            }
          );
        }
      }
    }
    this.order = order;
    this.sequence = order.map((name) => {
      const result = this.tasks.resolve(name);
      return result;
    });
  }
  /**
   * Drives the configured pipeline against `input` and returns the final
   * state. Phase-marked tasks (`manifest.phase`) are skipped by the main
   * loop because they're invoked through the `onRunStart` / `onRunEnd`
   * hook channels instead. The returned state is a fresh object owned
   * by this call; callers may mutate it without affecting the engine.
   *
   * Validation points:
   *   - InputSchema at entry
   *   - RoleSchemaSchema on input.roles if present
   *   - PaletteStateSchema on final state at exit
   *   - Plugin-contributed output/metadata schemas at exit
   */
  run(input) {
    const inputResult = this.validator.validate(InputSchema, input);
    if (!inputResult.valid) {
      const first = inputResult.errors[0];
      throw ValidationError.create({
        "message": `input invalid: ${first !== void 0 ? `${first.path}: ${first.message}` : "unknown error"}`,
        "path": "input",
        "violations": inputResult.errors
      });
    }
    if (input.roles !== void 0) {
      const rolesResult = this.validator.validate(RoleSchemaSchema, input.roles);
      if (!rolesResult.valid) {
        const first = rolesResult.errors[0];
        throw ValidationError.create({
          "message": `input.roles invalid: ${first !== void 0 ? `${first.path}: ${first.message}` : "unknown error"}`,
          "path": "input.roles",
          "violations": rolesResult.errors
        });
      }
    }
    const state2 = {
      "colors": [],
      "input": input,
      "metadata": { ...input.metadata },
      "outputs": {},
      "roles": {},
      "runtime": { ...input.runtime },
      "variants": {}
    };
    const ctx = {
      "engine": this,
      "logger": consoleLogger,
      "startedAt": Date.now(),
      "tasks": this.tasks
    };
    for (const hook of this.tasks.hooks("onRunStart")) {
      hook.run(state2, ctx);
    }
    this.sequence ??= this.order.length > 0 ? this.order.map((name) => {
      const result = this.tasks.resolve(name);
      return result;
    }) : this.tasks.list().map((manifest) => {
      const result = this.tasks.resolve(manifest.name);
      return result;
    });
    for (const task of this.sequence) {
      if (task.manifest?.phase !== void 0) {
        continue;
      }
      task.run(state2, ctx);
    }
    for (const hook of this.tasks.hooks("onRunEnd")) {
      hook.run(state2, ctx);
    }
    const stateResult = this.validator.validate(PaletteStateSchema, state2);
    if (!stateResult.valid) {
      const first = stateResult.errors[0];
      throw ValidationError.create({
        "message": `output state invalid: ${first !== void 0 ? `${first.path}: ${first.message}` : "unknown error"}`,
        "path": "state",
        "violations": stateResult.errors
      });
    }
    for (const [slot, schema] of this.outputSchemas) {
      const slotValue = state2.outputs[slot];
      if (slotValue !== void 0) {
        const slotResult = this.validator.validate(schema, slotValue);
        if (!slotResult.valid) {
          const first = slotResult.errors[0];
          throw ValidationError.create({
            "message": `failed plugin schema: ${first !== void 0 ? `${first.path}: ${first.message}` : "unknown error"}`,
            "path": `outputs['${slot}']`,
            "violations": slotResult.errors
          });
        }
      }
    }
    for (const [slot, schema] of this.metadataSchemas) {
      const slotValue = state2.metadata[slot];
      if (slotValue !== void 0) {
        const slotResult = this.validator.validate(schema, slotValue);
        if (!slotResult.valid) {
          const first = slotResult.errors[0];
          throw ValidationError.create({
            "message": `failed plugin schema: ${first !== void 0 ? `${first.path}: ${first.message}` : "unknown error"}`,
            "path": `metadata['${slot}']`,
            "violations": slotResult.errors
          });
        }
      }
    }
    return state2;
  }
}
class Clamp {
  "name" = "clamp";
  apply(min, max, v) {
    if (v < min) {
      return min;
    }
    if (v > max) {
      return max;
    }
    return v;
  }
}
const clamp = new Clamp();
class Clamp01 {
  "name" = "clamp01";
  apply(v) {
    if (v < 0) {
      return 0;
    }
    if (v > 1) {
      return 1;
    }
    return v;
  }
}
const clamp01 = new Clamp01();
class GamutMapSrgb {
  "name" = "gamutMapSrgb";
  apply(l, c, h2) {
    if (inSrgbGamut(l, c, h2)) {
      return { "c": c, "h": h2, "inGamut": true, "l": l };
    }
    if (l <= 0) {
      return { "c": 0, "h": h2, "inGamut": false, "l": 0 };
    }
    if (l >= 1) {
      return { "c": 0, "h": h2, "inGamut": false, "l": 1 };
    }
    const JND_CHROMA = 0.02;
    let lo = 0;
    let hi = c;
    while (hi - lo > JND_CHROMA) {
      const mid = (lo + hi) / 2;
      if (inSrgbGamut(l, mid, h2)) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return { "c": lo, "h": h2, "inGamut": false, "l": l };
  }
}
function inSrgbGamut(l, c, h2) {
  const hRad = h2 * Math.PI / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  let x = l + 0.3963377774 * a + 0.2158037573 * b;
  let y = l - 0.1055613458 * a - 0.0638541728 * b;
  let z = l - 0.0894841775 * a - 1.291485548 * b;
  x = x * x * x;
  y = y * y * y;
  z = z * z * z;
  const rLin = 4.0767416621 * x - 3.3077115913 * y + 0.2309699292 * z;
  const gLin = -1.2684380046 * x + 2.6097574011 * y - 0.3413193965 * z;
  const bLin = -0.0041960863 * x - 0.7034186147 * y + 1.707614701 * z;
  const eps = 1e-6;
  return rLin >= -eps && rLin <= 1 + eps && gLin >= -eps && gLin <= 1 + eps && bLin >= -eps && bLin <= 1 + eps;
}
const gamutMapSrgb = new GamutMapSrgb();
class OklchToDisplayP3 {
  "name" = "oklchToDisplayP3";
  apply(l, c, h2) {
    const hRad = h2 * Math.PI / 180;
    const a = c * Math.cos(hRad);
    const b = c * Math.sin(hRad);
    let x = l + 0.3963377774 * a + 0.2158037573 * b;
    let y = l - 0.1055613458 * a - 0.0638541728 * b;
    let z = l - 0.0894841775 * a - 1.291485548 * b;
    x = x * x * x;
    y = y * y * y;
    z = z * z * z;
    const rLin = 4.0767416621 * x - 3.3077115913 * y + 0.2309699292 * z;
    const gLin = -1.2684380046 * x + 2.6097574011 * y - 0.3413193965 * z;
    const bLin = -0.0041960863 * x - 0.7034186147 * y + 1.707614701 * z;
    const p3rLin = 0.8224621 * rLin + 0.177538 * gLin + 0 * bLin;
    const p3gLin = 0.0331941 * rLin + 0.9668058 * gLin + 1e-7 * bLin;
    const p3bLin = 0.0170827 * rLin + 0.0723968 * gLin + 0.9105206 * bLin;
    return {
      "b": P3$1.encode(p3bLin),
      "g": P3$1.encode(p3gLin),
      "r": P3$1.encode(p3rLin)
    };
  }
}
let P3$1 = class P3 {
  static encode(v) {
    const sign = v < 0 ? -1 : 1;
    const abs = Math.abs(v);
    if (abs <= 31308e-7) {
      return sign * 12.92 * abs;
    }
    return sign * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055);
  }
};
const oklchToDisplayP3 = new OklchToDisplayP3();
function encode(v) {
  if (v <= 31308e-7) {
    return 12.92 * v;
  }
  return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}
class LinearToSrgb {
  "name" = "linearToSrgb";
  apply(r, g, b) {
    return {
      "b": encode(b),
      "g": encode(g),
      "r": encode(r)
    };
  }
}
const linearToSrgb = new LinearToSrgb();
class OklchToRgbRaw {
  "name" = "oklchToRgbRaw";
  apply(l, c, h2) {
    const hRad = h2 * Math.PI / 180;
    const a = c * Math.cos(hRad);
    const b = c * Math.sin(hRad);
    let x = l + 0.3963377774 * a + 0.2158037573 * b;
    let y = l - 0.1055613458 * a - 0.0638541728 * b;
    let z = l - 0.0894841775 * a - 1.291485548 * b;
    x = x * x * x;
    y = y * y * y;
    z = z * z * z;
    const rLin = 4.0767416621 * x - 3.3077115913 * y + 0.2309699292 * z;
    const gLin = -1.2684380046 * x + 2.6097574011 * y - 0.3413193965 * z;
    const bLin = -0.0041960863 * x - 0.7034186147 * y + 1.707614701 * z;
    const encoded = linearToSrgb.apply(rLin, gLin, bLin);
    return {
      "b": clamp01.apply(encoded.b),
      "g": clamp01.apply(encoded.g),
      "r": clamp01.apply(encoded.r)
    };
  }
}
const oklchToRgbRaw = new OklchToRgbRaw();
class RgbToHex {
  "name" = "rgbToHex";
  apply(r, g, b) {
    const toHex = (v) => {
      const byte = Math.round(clamp01.apply(v) * 255);
      return byte.toString(16).padStart(2, "0");
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
}
const rgbToHex = new RgbToHex();
function decode(v) {
  if (v <= 0.04045) {
    return v / 12.92;
  }
  return Math.pow((v + 0.055) / 1.055, 2.4);
}
class SrgbToLinear {
  "name" = "srgbToLinear";
  apply(r, g, b) {
    return {
      "b": decode(b),
      "g": decode(g),
      "r": decode(r)
    };
  }
}
const srgbToLinear = new SrgbToLinear();
function rgbToOklchRaw(r, g, b) {
  const { "b": bl, "g": gl, "r": rl } = srgbToLinear.apply(r, g, b);
  let x = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  let y = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  let z = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;
  x = Math.cbrt(x);
  y = Math.cbrt(y);
  z = Math.cbrt(z);
  const labL = 0.2104542553 * x + 0.793617785 * y - 0.0040720468 * z;
  const labA = 1.9779984951 * x - 2.428592205 * y + 0.4505937099 * z;
  const labB = 0.0259040371 * x + 0.7827717662 * y - 0.808675766 * z;
  const c = Math.sqrt(labA * labA + labB * labB);
  let h2 = Math.atan2(labB, labA) * 180 / Math.PI;
  if (h2 < 0) {
    h2 += 360;
  }
  return {
    "c": clamp.apply(0, 0.5, c),
    "h": h2 % 360,
    "l": clamp01.apply(labL)
  };
}
function hslToRgbRaw(h2, s, l) {
  const hh = (h2 % 360 + 360) % 360;
  const ss = clamp01.apply(s);
  const ll = clamp01.apply(l);
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(hh / 60 % 2 - 1));
  const m = ll - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (hh < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (hh < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (hh < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (hh < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  return { "b": clamp01.apply(b + m), "g": clamp01.apply(g + m), "r": clamp01.apply(r + m) };
}
class ColorRecordFactory {
  /**
   * Builds a record from OKLCH coordinates. `l` is normalised lightness
   * (0..1), `c` is chroma (0..0.5), `h` is hue in degrees (any real
   * number; wrapped into [0, 360)).
   *
   * Wide-gamut handling: when the input OKLCH falls outside the sRGB
   * gamut, the factory:
   *  1. Computes a sRGB-safe value via {@link import('./GamutMapSrgb.ts').GamutMapSrgb}
   *     (chroma-reduction along constant L+H per CSS Color 4 §13.2.2).
   *     The returned record's `rgb` and `hex` fields store this
   *     gamut-mapped value so any sRGB-only consumer is safe.
   *  2. Populates `displayP3` from the ORIGINAL (l, c, h) via
   *     {@link import('./OklchToDisplayP3.ts').OklchToDisplayP3}. P3
   *     channels are clipped to `[0, 1]` here for the rare case where
   *     even P3 does not cover the input.
   *  3. Records the ORIGINAL (l, c, h) on the `oklch` slot subject to
   *     bounds: `l` clamped to `[0, 1]`, `c` clamped to `[0, 0.5]`, `h`
   *     wrapped to `[0, 360)`. The 0.5 chroma ceiling covers the
   *     human-visible gamut with room to spare; values beyond it
   *     are pathological and get bounded silently.
   *
   * When the input is already in sRGB, `displayP3` is `undefined` and
   * `rgb` is the direct (unclamped → clamped) conversion.
   *
   * Round-trip note: when a record allocated by another factory method
   * (e.g. `intake:p3` populating `displayP3` verbatim from a P3 input)
   * is later passed BACK through `fromOklch` (e.g. by `ResolveRoles`
   * when copying `role.intent` onto the hints), the `displayP3` slot is
   * re-derived from the OKLCH chain rather than preserved. Drift is
   * ~1e-8 per channel, below the 4dp precision used by `serializeP3`
   * and invisible to consumers. If verbatim preservation matters,
   * consumers must hold the original record reference rather than
   * reallocating.
   *
   * `sourceFormat` defaults to `'oklch'` but accepts any
   * {@link SourceFormatType} so callers that transcoded into OKLCH from
   * another representation can preserve the origin tag without a
   * post-call spread.
   */
  fromOklch(l, c, h2, opts) {
    const { alpha = 1, hints, sourceFormat = "oklch" } = opts ?? {};
    const mapped = gamutMapSrgb.apply(l, c, h2);
    const rgb = oklchToRgbRaw.apply(mapped.l, mapped.c, mapped.h);
    let displayP3;
    if (!mapped.inGamut) {
      const p3 = oklchToDisplayP3.apply(l, c, h2);
      displayP3 = {
        "b": clamp01.apply(p3.b),
        "g": clamp01.apply(p3.g),
        "r": clamp01.apply(p3.r)
      };
    } else {
      displayP3 = void 0;
    }
    return {
      "alpha": clamp01.apply(alpha),
      "displayP3": displayP3,
      "hex": rgbToHex.apply(rgb.r, rgb.g, rgb.b),
      "hints": hints,
      "oklch": { "c": clamp.apply(0, 0.5, c), "h": (h2 % 360 + 360) % 360, "l": clamp01.apply(l) },
      "rgb": rgb,
      "sourceFormat": sourceFormat
    };
  }
  /**
   * Builds a record from gamma-encoded sRGB components in 0..1. Inputs
   * outside the unit range are clamped, not scaled; pass `r/255` if
   * starting from byte values. The OKLCH coordinates are derived via
   * Björn Ottosson's OKLab transform.
   *
   * `sourceFormat` defaults to `'rgb'` but accepts any
   * {@link SourceFormatType} so intake handlers that compute through
   * RGB (lab, hsl, imagePixel, ...) can tag the record with the format
   * they actually consumed.
   */
  fromRgb(r, g, b, opts) {
    const { alpha = 1, hints, sourceFormat = "rgb" } = opts ?? {};
    const oklch = rgbToOklchRaw(r, g, b);
    return {
      "alpha": clamp01.apply(alpha),
      "displayP3": void 0,
      "hex": rgbToHex.apply(r, g, b),
      "hints": hints,
      "oklch": oklch,
      "rgb": { "b": clamp01.apply(b), "g": clamp01.apply(g), "r": clamp01.apply(r) },
      "sourceFormat": sourceFormat
    };
  }
  /**
   * Parses `#rrggbb` or `#rrggbbaa` (case-insensitive, leading `#`
   * optional). Throws on any other length or non-hex characters. The
   * returned record's `hex` field is always the canonical 6-digit form;
   * any 8-digit alpha is split off into the `alpha` field so downstream
   * code never has to deal with two encodings.
   *
   * The optional `alphaOverride` argument lets callers (notably
   * `IntakeHex`) supply an alpha derived elsewhere, useful when the
   * hex string is the 6-digit canonical form but the original input
   * carried a separate alpha. When `undefined`, the alpha embedded in
   * the hex string (or `1` for 6-digit input) is used.
   */
  fromHex(hex, opts) {
    const { alphaOverride, hints, sourceFormat = "hex" } = opts ?? {};
    const cleaned = hex.replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/.test(cleaned)) {
      throw ValidationError.create({
        "message": "ColorRecordFactory.fromHex: invalid hex string",
        "path": "hex",
        "violations": [{
          "details": { "expectedFormat": "6 or 8 hex digits, with or without leading #", "received": hex },
          "message": "value is not a valid hex color string",
          "path": "hex"
        }]
      });
    }
    const r = parseInt(cleaned.slice(0, 2), 16) / 255;
    const g = parseInt(cleaned.slice(2, 4), 16) / 255;
    const b = parseInt(cleaned.slice(4, 6), 16) / 255;
    const parsedAlpha = cleaned.length === 8 ? parseInt(cleaned.slice(6, 8), 16) / 255 : 1;
    const alpha = alphaOverride ?? parsedAlpha;
    const oklch = rgbToOklchRaw(r, g, b);
    return {
      "alpha": clamp01.apply(alpha),
      "displayP3": void 0,
      "hex": `#${cleaned.slice(0, 6).toLowerCase()}`,
      "hints": hints,
      "oklch": oklch,
      "rgb": { "b": b, "g": g, "r": r },
      "sourceFormat": sourceFormat
    };
  }
  /**
   * Builds a record from HSL coordinates. `h` is degrees (wrapped into
   * [0, 360)); `s` and `l` are 0..1. The HSL → RGB conversion uses the
   * standard piecewise formula, then derives OKLCH and hex from the
   * RGB triple. `sourceFormat` defaults to `'hsl'`.
   */
  fromHsl(h2, s, l, opts) {
    const { alpha = 1, hints, sourceFormat = "hsl" } = opts ?? {};
    const rgb = hslToRgbRaw(h2, s, l);
    return this.fromRgb(rgb.r, rgb.g, rgb.b, { "alpha": alpha, "hints": hints, "sourceFormat": sourceFormat });
  }
}
const colorRecordFactory = new ColorRecordFactory();
function oklchToOklab(l, c, h2) {
  const hRad = h2 * Math.PI / 180;
  return [l, c * Math.cos(hRad), c * Math.sin(hRad)];
}
function deg(rad2) {
  return rad2 * 180 / Math.PI;
}
function rad(d) {
  return d * Math.PI / 180;
}
class DeltaE2000 {
  "name" = "deltaE2000";
  apply(a, b) {
    const [L1, a1, b1] = oklchToOklab(a.oklch.l, a.oklch.c, a.oklch.h);
    const [L2, a2, b2] = oklchToOklab(b.oklch.l, b.oklch.c, b.oklch.h);
    const scale = 100;
    const sa1 = a1 * scale;
    const sb1 = b1 * scale;
    const sL1 = L1 * scale;
    const sa2 = a2 * scale;
    const sb2 = b2 * scale;
    const sL2 = L2 * scale;
    const C1 = Math.sqrt(sa1 * sa1 + sb1 * sb1);
    const C2 = Math.sqrt(sa2 * sa2 + sb2 * sb2);
    const Cavg = (C1 + C2) / 2;
    const C7 = Math.pow(Cavg, 7);
    const factor25_7 = Math.pow(25, 7);
    const G = 0.5 * (1 - Math.sqrt(C7 / (C7 + factor25_7)));
    const a1p = sa1 * (1 + G);
    const a2p = sa2 * (1 + G);
    const C1p = Math.sqrt(a1p * a1p + sb1 * sb1);
    const C2p = Math.sqrt(a2p * a2p + sb2 * sb2);
    let h1p = deg(Math.atan2(sb1, a1p));
    if (h1p < 0) {
      h1p += 360;
    }
    let h2p = deg(Math.atan2(sb2, a2p));
    if (h2p < 0) {
      h2p += 360;
    }
    const dLp = sL2 - sL1;
    const dCp = C2p - C1p;
    let dhp = 0;
    if (C1p * C2p === 0) {
      dhp = 0;
    } else if (Math.abs(h2p - h1p) <= 180) {
      dhp = h2p - h1p;
    } else if (h2p - h1p > 180) {
      dhp = h2p - h1p - 360;
    } else {
      dhp = h2p - h1p + 360;
    }
    const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp / 2));
    const Lp = (sL1 + sL2) / 2;
    const Cp = (C1p + C2p) / 2;
    let Hp = 0;
    if (C1p * C2p === 0) {
      Hp = h1p + h2p;
    } else if (Math.abs(h1p - h2p) <= 180) {
      Hp = (h1p + h2p) / 2;
    } else if (h1p + h2p < 360) {
      Hp = (h1p + h2p + 360) / 2;
    } else {
      Hp = (h1p + h2p - 360) / 2;
    }
    const T = 1 - 0.17 * Math.cos(rad(Hp - 30)) + 0.24 * Math.cos(rad(2 * Hp)) + 0.32 * Math.cos(rad(3 * Hp + 6)) - 0.2 * Math.cos(rad(4 * Hp - 63));
    const SL = 1 + 0.015 * Math.pow(Lp - 50, 2) / Math.sqrt(20 + Math.pow(Lp - 50, 2));
    const SC = 1 + 0.045 * Cp;
    const SH = 1 + 0.015 * Cp * T;
    const Cp7 = Math.pow(Cp, 7);
    const RC = 2 * Math.sqrt(Cp7 / (Cp7 + factor25_7));
    const dTheta = 30 * Math.exp(-Math.pow((Hp - 275) / 25, 2));
    const RT = -Math.sin(rad(2 * dTheta)) * RC;
    const kC = 1;
    const kH = 1;
    const kL = 1;
    return Math.sqrt(
      Math.pow(dLp / (kL * SL), 2) + Math.pow(dCp / (kC * SC), 2) + Math.pow(dHp / (kH * SH), 2) + RT * (dCp / (kC * SC)) * (dHp / (kH * SH))
    );
  }
}
const deltaE2000 = new DeltaE2000();
function recordWeight$1(record) {
  const w = record.hints?.weight;
  return typeof w === "number" && w > 0 ? w : 1;
}
class Centroids {
  static merge(a, b) {
    const wa = a.weight > 0 ? a.weight : 1;
    const wb = b.weight > 0 ? b.weight : 1;
    const tot = wa + wb;
    const aRad = a.centroid.oklch.h * Math.PI / 180;
    const bRad = b.centroid.oklch.h * Math.PI / 180;
    const aA = a.centroid.oklch.c * Math.cos(aRad);
    const aB = a.centroid.oklch.c * Math.sin(aRad);
    const bA = b.centroid.oklch.c * Math.cos(bRad);
    const bB = b.centroid.oklch.c * Math.sin(bRad);
    const L = (a.centroid.oklch.l * wa + b.centroid.oklch.l * wb) / tot;
    const aMean = (aA * wa + bA * wb) / tot;
    const bMean = (aB * wa + bB * wb) / tot;
    const C = Math.sqrt(aMean * aMean + bMean * bMean);
    let H = Math.atan2(bMean, aMean) * 180 / Math.PI;
    if (H < 0) {
      H += 360;
    }
    const alpha = (a.centroid.alpha * wa + b.centroid.alpha * wb) / tot;
    return {
      "centroid": colorRecordFactory.fromOklch(L, C, H, { "alpha": alpha, "hints": { "weight": tot }, "sourceFormat": "oklch" }),
      "weight": tot
    };
  }
}
class ClusterDeltaEMerge {
  "name" = "clusterDeltaEMerge";
  apply(colors2, k) {
    if (colors2.length === 0) {
      return [];
    }
    if (k < 1) {
      throw ValidationError.create({
        "message": "ClusterDeltaEMerge.apply: k must be a positive number",
        "path": "k",
        "violations": [{
          "details": { "expected": "k >= 1", "received": k },
          "message": "k is not a positive number",
          "path": "k"
        }]
      });
    }
    const targetK = Math.min(Math.floor(k), colors2.length);
    if (targetK >= colors2.length) {
      return colors2.map((c) => {
        if (typeof c.hints?.weight === "number" && c.hints.weight > 0) {
          return c;
        }
        const hints = { ...c.hints ?? {}, "weight": 1 };
        return colorRecordFactory.fromOklch(c.oklch.l, c.oklch.c, c.oklch.h, { "alpha": c.alpha, "hints": hints, "sourceFormat": c.sourceFormat });
      });
    }
    let clusters = colors2.map((c) => {
      return {
        "centroid": c,
        "weight": recordWeight$1(c)
      };
    });
    while (clusters.length > targetK) {
      let bestI = 0;
      let bestJ = 1;
      let bestD = Infinity;
      for (let i = 0; i < clusters.length; i++) {
        const a2 = clusters[i];
        if (a2 === void 0) {
          continue;
        }
        for (let j = i + 1; j < clusters.length; j++) {
          const b2 = clusters[j];
          if (b2 === void 0) {
            continue;
          }
          const raw = deltaE2000.apply(a2.centroid, b2.centroid);
          const d = Number.isFinite(raw) ? raw : Infinity;
          if (d < bestD) {
            bestD = d;
            bestI = i;
            bestJ = j;
          }
        }
      }
      if (bestD === Infinity) {
        bestI = 0;
        bestJ = 1;
      }
      const a = clusters[bestI];
      const b = clusters[bestJ];
      if (a === void 0 || b === void 0) {
        break;
      }
      const merged = Centroids.merge(a, b);
      clusters = [
        ...clusters.slice(0, bestI),
        merged,
        ...clusters.slice(bestI + 1, bestJ),
        ...clusters.slice(bestJ + 1)
      ];
    }
    return clusters.map((cl) => {
      const result = cl.centroid;
      return result;
    });
  }
}
const clusterDeltaEMerge = new ClusterDeltaEMerge();
function bucketMedian(bucket) {
  const n = bucket.colors.length;
  if (n === 0) {
    return colorRecordFactory.fromOklch(0.5, 0, 0);
  }
  let sumAlpha = 0;
  let sumC = 0;
  let sumH = 0;
  let sumL = 0;
  for (let i = 0; i < n; i++) {
    const col = bucket.colors[i];
    if (col === void 0) {
      continue;
    }
    sumL += col.oklch.l;
    sumC += col.oklch.c;
    sumH += col.oklch.h;
    sumAlpha += col.alpha;
  }
  return colorRecordFactory.fromOklch(sumL / n, sumC / n, sumH / n, { "alpha": sumAlpha / n });
}
function rangeOf$1(colors2, channel) {
  if (colors2.length === 0) {
    return 0;
  }
  let max = -Infinity;
  let min = Infinity;
  for (let i = 0; i < colors2.length; i++) {
    const v = colors2[i]?.oklch[channel] ?? 0;
    if (v < min) {
      min = v;
    }
    if (v > max) {
      max = v;
    }
  }
  return max - min;
}
let Bucket$1 = class Bucket {
  static split(bucket) {
    const colors2 = bucket.colors;
    const lRange = rangeOf$1(colors2, "l");
    const cRange = rangeOf$1(colors2, "c");
    const hRange = rangeOf$1(colors2, "h") / 360;
    let channel = "l";
    if (cRange > lRange && cRange > hRange) {
      channel = "c";
    } else if (hRange > lRange) {
      channel = "h";
    }
    const sorted = [...colors2].sort((a, b) => {
      return a.oklch[channel] - b.oklch[channel];
    });
    const mid = Math.floor(sorted.length / 2);
    return [
      { "colors": sorted.slice(0, mid) },
      { "colors": sorted.slice(mid) }
    ];
  }
};
class ClusterMedianCut {
  "name" = "clusterMedianCut";
  apply(colors2, k) {
    if (colors2.length === 0) {
      return [];
    }
    if (k < 1) {
      throw ValidationError.create({
        "message": "ClusterMedianCut.apply: k must be a positive number",
        "path": "k",
        "violations": [{
          "details": { "expected": "k >= 1", "received": k },
          "message": "k is not a positive number",
          "path": "k"
        }]
      });
    }
    const targetK = Math.min(Math.floor(k), colors2.length);
    let buckets = [{ "colors": [...colors2] }];
    while (buckets.length < targetK) {
      let maxSize = 0;
      let maxIdx = 0;
      for (let i = 0; i < buckets.length; i++) {
        const len = buckets[i]?.colors.length ?? 0;
        if (len > maxSize) {
          maxSize = len;
          maxIdx = i;
        }
      }
      const target = buckets[maxIdx];
      if (target === void 0 || target.colors.length <= 1) {
        break;
      }
      const [left, right] = Bucket$1.split(target);
      buckets = [
        ...buckets.slice(0, maxIdx),
        left,
        right,
        ...buckets.slice(maxIdx + 1)
      ];
    }
    return buckets.map(bucketMedian);
  }
}
const clusterMedianCut = new ClusterMedianCut();
function recordWeight(record) {
  const w = record.hints?.weight;
  return typeof w === "number" && w > 0 ? w : 1;
}
function bucketCentroid(bucket) {
  const colors2 = bucket.colors;
  const n = colors2.length;
  if (n === 0) {
    return colorRecordFactory.fromOklch(0.5, 0, 0);
  }
  let sumA = 0;
  let sumAlpha = 0;
  let sumB = 0;
  let sumL = 0;
  let sumW = 0;
  for (let i = 0; i < n; i++) {
    const col = colors2[i];
    if (col === void 0) {
      continue;
    }
    const w = recordWeight(col);
    const hRad = col.oklch.h * Math.PI / 180;
    sumL += col.oklch.l * w;
    sumA += col.oklch.c * Math.cos(hRad) * w;
    sumB += col.oklch.c * Math.sin(hRad) * w;
    sumAlpha += col.alpha * w;
    sumW += w;
  }
  if (sumW === 0) {
    return colorRecordFactory.fromOklch(0.5, 0, 0);
  }
  const L = sumL / sumW;
  const aMean = sumA / sumW;
  const bMean = sumB / sumW;
  const C = Math.sqrt(aMean * aMean + bMean * bMean);
  let H = Math.atan2(bMean, aMean) * 180 / Math.PI;
  if (H < 0) {
    H += 360;
  }
  return colorRecordFactory.fromOklch(L, C, H, { "alpha": sumAlpha / sumW, "hints": { "weight": sumW }, "sourceFormat": "oklch" });
}
function rangeOf(colors2, channel) {
  if (colors2.length === 0) {
    return 0;
  }
  let max = -Infinity;
  let min = Infinity;
  for (let i = 0; i < colors2.length; i++) {
    const v = colors2[i]?.oklch[channel] ?? 0;
    if (v < min) {
      min = v;
    }
    if (v > max) {
      max = v;
    }
  }
  return max - min;
}
class Bucket2 {
  static split(bucket) {
    const colors2 = bucket.colors;
    const lRange = rangeOf(colors2, "l");
    const cRange = rangeOf(colors2, "c");
    const hRange = rangeOf(colors2, "h") / 360;
    let channel = "l";
    if (cRange > lRange && cRange > hRange) {
      channel = "c";
    } else if (hRange > lRange) {
      channel = "h";
    }
    const sorted = [...colors2].sort((a, b) => {
      return a.oklch[channel] - b.oklch[channel];
    });
    const half = bucket.totalWeight / 2;
    let acc = 0;
    let splitIdx = 0;
    for (let i = 0; i < sorted.length; i++) {
      const col = sorted[i];
      if (col === void 0) {
        continue;
      }
      acc += recordWeight(col);
      if (acc >= half) {
        splitIdx = i + 1;
        break;
      }
    }
    if (splitIdx <= 0) {
      splitIdx = 1;
    }
    if (splitIdx >= sorted.length) {
      splitIdx = sorted.length - 1;
    }
    const left = sorted.slice(0, splitIdx);
    const right = sorted.slice(splitIdx);
    let lw = 0;
    for (const col of left) {
      lw += recordWeight(col);
    }
    let rw = 0;
    for (const col of right) {
      rw += recordWeight(col);
    }
    return [
      { "colors": left, "totalWeight": lw },
      { "colors": right, "totalWeight": rw }
    ];
  }
}
class ClusterMedianCutWeighted {
  "name" = "clusterMedianCutWeighted";
  apply(colors2, k) {
    if (colors2.length === 0) {
      return [];
    }
    if (k < 1) {
      throw ValidationError.create({
        "message": "ClusterMedianCutWeighted.apply: k must be a positive number",
        "path": "k",
        "violations": [{
          "details": { "expected": "k >= 1", "received": k },
          "message": "k is not a positive number",
          "path": "k"
        }]
      });
    }
    const targetK = Math.min(Math.floor(k), colors2.length);
    let totalW = 0;
    for (const col of colors2) {
      totalW += recordWeight(col);
    }
    let buckets = [{ "colors": [...colors2], "totalWeight": totalW }];
    while (buckets.length < targetK) {
      let bestScore = -1;
      let bestIdx = 0;
      for (let i = 0; i < buckets.length; i++) {
        const bucket = buckets[i];
        if (bucket === void 0 || bucket.colors.length <= 1) {
          continue;
        }
        const lRange = rangeOf(bucket.colors, "l");
        const cRange = rangeOf(bucket.colors, "c");
        const hRange = rangeOf(bucket.colors, "h") / 360;
        const widestRange = Math.max(lRange, cRange, hRange);
        const score = bucket.totalWeight * widestRange;
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
      const target = buckets[bestIdx];
      if (target === void 0 || target.colors.length <= 1) {
        break;
      }
      const [left, right] = Bucket2.split(target);
      buckets = [
        ...buckets.slice(0, bestIdx),
        left,
        right,
        ...buckets.slice(bestIdx + 1)
      ];
    }
    return buckets.map(bucketCentroid);
  }
}
const clusterMedianCutWeighted = new ClusterMedianCutWeighted();
function fgLuminance(r, g, b) {
  const lin = srgbToLinear.apply(r, g, b);
  return 0.2126729 * Math.pow(lin.r, 0.56) + 0.7151522 * Math.pow(lin.g, 0.56) + 0.072175 * Math.pow(lin.b, 0.56);
}
function bgLuminance(r, g, b) {
  const lin = srgbToLinear.apply(r, g, b);
  return 0.2126729 * Math.pow(lin.r, 0.65) + 0.7151522 * Math.pow(lin.g, 0.65) + 0.072175 * Math.pow(lin.b, 0.65);
}
const SA98G_NORM_BG = 0.56;
const SA98G_NORM_TXT = 0.57;
const SA98G_CLAMP = 0.022;
const SA98G_CLAMP_P = 1.414;
const SA98G_SCALE = 1.14;
const SA98G_LOW_CLIP = 1e-3;
const SA98G_OFFSET = 0.027;
class ContrastApca {
  "name" = "contrastApca";
  apply(text, background) {
    const Ytxt = fgLuminance(text.rgb.r, text.rgb.g, text.rgb.b);
    const Ybg = bgLuminance(background.rgb.r, background.rgb.g, background.rgb.b);
    const txtClamp = Ytxt < SA98G_CLAMP ? Ytxt + Math.pow(SA98G_CLAMP - Ytxt, SA98G_CLAMP_P) : Ytxt;
    const bgClamp = Ybg < SA98G_CLAMP ? Ybg + Math.pow(SA98G_CLAMP - Ybg, SA98G_CLAMP_P) : Ybg;
    let Lc = 0;
    if (bgClamp > txtClamp) {
      Lc = (Math.pow(bgClamp, SA98G_NORM_BG) - Math.pow(txtClamp, SA98G_NORM_TXT)) * SA98G_SCALE;
      if (Lc < SA98G_LOW_CLIP) {
        return 0;
      }
      Lc = Lc - SA98G_OFFSET;
    } else {
      Lc = (Math.pow(bgClamp, 0.62) - Math.pow(txtClamp, 0.65)) * SA98G_SCALE;
      if (Lc > -SA98G_LOW_CLIP) {
        return 0;
      }
      Lc = Lc + SA98G_OFFSET;
    }
    return Lc * 100;
  }
}
const contrastApca = new ContrastApca();
class Luminance {
  "name" = "luminance";
  apply(color) {
    const lin = srgbToLinear.apply(color.rgb.r, color.rgb.g, color.rgb.b);
    return 0.2126 * lin.r + 0.7152 * lin.g + 0.0722 * lin.b;
  }
}
const luminance = new Luminance();
class ContrastWcag21 {
  "name" = "contrastWcag21";
  apply(a, b) {
    const l1 = luminance.apply(a);
    const l2 = luminance.apply(b);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }
}
const contrastWcag21 = new ContrastWcag21();
const APCA_NORM_BG = 0.56;
const APCA_NORM_TXT = 0.57;
const APCA_CLAMP = 0.022;
const APCA_CLAMP_P = 1.414;
const APCA_SCALE = 1.14;
const APCA_LOW_CLIP = 1e-3;
const APCA_OFFSET = 0.027;
const SRGB_FORMATS$1 = /* @__PURE__ */ new Set([
  "hex",
  "hsl",
  "imagePixel",
  "lab",
  "named",
  "rgb"
]);
function rgbLuminance(r, g, b) {
  const lin = srgbToLinear.apply(r, g, b);
  return 0.2126 * lin.r + 0.7152 * lin.g + 0.0722 * lin.b;
}
function wcagRatio(la, lb) {
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}
function apcaFg(r, g, b) {
  const lin = srgbToLinear.apply(r, g, b);
  return 0.2126729 * Math.pow(lin.r, 0.56) + 0.7151522 * Math.pow(lin.g, 0.56) + 0.072175 * Math.pow(lin.b, 0.56);
}
function apcaBg(r, g, b) {
  const lin = srgbToLinear.apply(r, g, b);
  return 0.2126729 * Math.pow(lin.r, 0.65) + 0.7151522 * Math.pow(lin.g, 0.65) + 0.072175 * Math.pow(lin.b, 0.65);
}
function apcaLcFromYtxt(Ytxt, Ybg) {
  const txtClamp = Ytxt < APCA_CLAMP ? Ytxt + Math.pow(APCA_CLAMP - Ytxt, APCA_CLAMP_P) : Ytxt;
  const bgClamp = Ybg < APCA_CLAMP ? Ybg + Math.pow(APCA_CLAMP - Ybg, APCA_CLAMP_P) : Ybg;
  let Lc = 0;
  if (bgClamp > txtClamp) {
    Lc = (Math.pow(bgClamp, APCA_NORM_BG) - Math.pow(txtClamp, APCA_NORM_TXT)) * APCA_SCALE;
    if (Lc < APCA_LOW_CLIP) {
      return 0;
    }
    Lc = Lc - APCA_OFFSET;
  } else {
    Lc = (Math.pow(bgClamp, 0.62) - Math.pow(txtClamp, 0.65)) * APCA_SCALE;
    if (Lc > -APCA_LOW_CLIP) {
      return 0;
    }
    Lc = Lc + APCA_OFFSET;
  }
  return Math.abs(Lc * 100);
}
class EnsureContrast {
  "name" = "ensureContrast";
  /**
   * Adjusts `foreground` along the OKLCH L axis until its contrast against
   * `background` meets `minRatio` for the given `algorithm`. The inner
   * loop operates on a scalar `L` value; no `ColorRecord` is allocated
   * per iteration. The background's luminance is computed once. A single
   * `ColorRecord` is materialised at return via `colorRecordFactory`.
   *
   * Gamut preservation: the adjusted record inherits `foreground.sourceFormat`.
   * When that format is an sRGB-family format (`hex`, `rgb`, `hsl`, `lab`,
   * `named`, `imagePixel`), the record is built via `fromRgb` using the
   * sRGB-clamped coordinates computed during the loop — preventing a
   * spurious `displayP3` slot from appearing on a colour that was never
   * wide-gamut. When the source is `displayP3` or `oklch`, `fromOklch` is
   * used so the wide-gamut `displayP3` slot is re-derived as expected.
   */
  apply(foreground, background, minRatio, algorithm = "wcag21") {
    const bgRgb = background.rgb;
    const Ybg = algorithm === "wcag21" ? rgbLuminance(bgRgb.r, bgRgb.g, bgRgb.b) : apcaBg(bgRgb.r, bgRgb.g, bgRgb.b);
    const fgRgb = foreground.rgb;
    const initialContrast = algorithm === "wcag21" ? wcagRatio(rgbLuminance(fgRgb.r, fgRgb.g, fgRgb.b), Ybg) : apcaLcFromYtxt(apcaFg(fgRgb.r, fgRgb.g, fgRgb.b), Ybg);
    if (initialContrast >= minRatio) {
      return foreground;
    }
    const fgL = foreground.oklch.l;
    const c = foreground.oklch.c;
    const h2 = foreground.oklch.h;
    const a = foreground.alpha;
    const fmt = foreground.sourceFormat;
    const hints = foreground.hints;
    const isSrgb = SRGB_FORMATS$1.has(fmt);
    const step = fgL < background.oklch.l ? -0.02 : 0.02;
    let currentL = fgL;
    let lastL = currentL;
    let lastRgb = fgRgb;
    for (let i = 0; i < 50; i++) {
      const newL = clamp01.apply(currentL + step);
      const rgb = oklchToRgbRaw.apply(newL, c, h2);
      const ratio = algorithm === "wcag21" ? wcagRatio(rgbLuminance(rgb.r, rgb.g, rgb.b), Ybg) : apcaLcFromYtxt(apcaFg(rgb.r, rgb.g, rgb.b), Ybg);
      lastL = newL;
      lastRgb = rgb;
      if (ratio >= minRatio) {
        return isSrgb ? colorRecordFactory.fromRgb(rgb.r, rgb.g, rgb.b, { "alpha": a, "hints": hints, "sourceFormat": fmt }) : colorRecordFactory.fromOklch(newL, c, h2, { "alpha": a, "hints": hints, "sourceFormat": fmt });
      }
      if (newL === 0 || newL === 1) {
        return isSrgb ? colorRecordFactory.fromRgb(rgb.r, rgb.g, rgb.b, { "alpha": a, "hints": hints, "sourceFormat": fmt }) : colorRecordFactory.fromOklch(newL, c, h2, { "alpha": a, "hints": hints, "sourceFormat": fmt });
      }
      currentL = newL;
    }
    return isSrgb ? colorRecordFactory.fromRgb(lastRgb.r, lastRgb.g, lastRgb.b, { "alpha": a, "hints": hints, "sourceFormat": fmt }) : colorRecordFactory.fromOklch(lastL, c, h2, { "alpha": a, "hints": hints, "sourceFormat": fmt });
  }
}
const ensureContrast = new EnsureContrast();
class HueShift {
  "name" = "hueShift";
  apply(color, degrees) {
    const h2 = ((color.oklch.h + degrees) % 360 + 360) % 360;
    return colorRecordFactory.fromOklch(color.oklch.l, color.oklch.c, h2, { "alpha": color.alpha });
  }
}
const hueShift = new HueShift();
class OklchToRgb {
  "name" = "oklchToRgb";
  apply(l, c, h2, alpha = 1) {
    const result = colorRecordFactory.fromOklch(l, c, h2, { "alpha": alpha });
    return result;
  }
}
const oklchToRgb = new OklchToRgb();
const DEFAULT_MAX = 64;
class ClampCount {
  "name" = "clamp:count";
  "manifest" = {
    "description": "Reduces state.colors to maxColors (default 64) via median-cut clustering when the limit is exceeded and bypass is not set.",
    "name": "clamp:count",
    "reads": ["colors", "input.maxColors", "input.bypass"],
    "requires": ["clusterMedianCut"],
    "writes": ["colors"]
  };
  run(state2, ctx) {
    if (state2.input.bypass === true) {
      return;
    }
    const max = state2.input.maxColors ?? DEFAULT_MAX;
    if (state2.colors.length <= max) {
      return;
    }
    ctx.logger.info(
      LogBody.create().component("ClampCount").operation("run").status(LOG_STATUS.PARTIAL).message("Reducing colors via clusterMedianCut").context({
        "from": state2.colors.length,
        "to": max
      }).build()
    );
    const clustered = clusterMedianCut.apply(state2.colors, max);
    state2.colors.length = 0;
    for (const c of clustered) {
      state2.colors.push(c);
    }
  }
}
const clampCount = new ClampCount();
const DEFAULT_L_RANGE = [0.05, 0.95];
const DEFAULT_C_RANGE = [0, 0.4];
function clampToRange$2(value, range) {
  const result = Math.max(range[0], Math.min(range[1], value));
  return result;
}
function roleRangeFor(color, state2) {
  const roleName = color.hints?.role;
  if (roleName !== void 0 && state2.input.roles !== void 0) {
    const def = state2.input.roles.roles.find((r) => {
      return r.name === roleName;
    });
    if (def !== void 0) {
      return {
        "cRange": def.chromaRange ?? DEFAULT_C_RANGE,
        "lRange": def.lightnessRange ?? DEFAULT_L_RANGE
      };
    }
  }
  return { "cRange": DEFAULT_C_RANGE, "lRange": DEFAULT_L_RANGE };
}
class ClampOklch {
  "name" = "clamp:oklch";
  "manifest" = {
    "description": "Clamps each color OKLCH L and C into role-defined ranges (or sensible defaults). Preserves hue.",
    "name": "clamp:oklch",
    "reads": ["colors", "input.roles"],
    "writes": ["colors"]
  };
  run(state2, ctx) {
    for (let i = 0; i < state2.colors.length; i++) {
      const color = state2.colors[i];
      if (color === void 0) {
        continue;
      }
      const { cRange, lRange } = roleRangeFor(color, state2);
      const { c, h: h2, l } = color.oklch;
      const clampedL = clampToRange$2(l, lRange);
      const clampedC = clampToRange$2(c, cRange);
      if (clampedL === l && clampedC === c) {
        continue;
      }
      const updated = colorRecordFactory.fromOklch(
        clampedL,
        clampedC,
        h2,
        { "alpha": color.alpha, "hints": color.hints, "sourceFormat": color.sourceFormat }
      );
      state2.colors[i] = updated;
      ctx.logger.debug(
        LogBody.create().component("ClampOklch").operation("run").status(LOG_STATUS.SUCCESS).message("Clamped color").context({
          "cFrom": c,
          "cTo": clampedC,
          "index": i,
          "lFrom": l,
          "lTo": clampedL
        }).build()
      );
    }
  }
}
const clampOklch = new ClampOklch();
const DEFAULT_VARIANTS = [
  { "invertLightness": true, "name": "dark" },
  { "invertLightness": false, "name": "light" }
];
function invertLightness(color) {
  const { c, h: h2, l } = color.oklch;
  const inverted = 1 - l;
  return colorRecordFactory.fromOklch(
    clamp01.apply(inverted),
    clamp.apply(0, 0.5, c),
    h2,
    { "alpha": color.alpha }
  );
}
function offsetLightness(color, offset) {
  const { c, h: h2, l } = color.oklch;
  return colorRecordFactory.fromOklch(
    clamp01.apply(l + offset),
    clamp.apply(0, 0.5, c),
    h2,
    { "alpha": color.alpha }
  );
}
function targetLightness(color, target) {
  const { c, h: h2 } = color.oklch;
  return colorRecordFactory.fromOklch(
    clamp01.apply(target),
    clamp.apply(0, 0.5, c),
    h2,
    { "alpha": color.alpha }
  );
}
class DeriveVariant {
  "name" = "derive:variant";
  "manifest" = {
    "description": "Produces light/dark variants by transforming all roles. Reads variantConfig from metadata or uses light/dark defaults.",
    "name": "derive:variant",
    "reads": ["roles", "metadata['core:variantConfig']"],
    "writes": ["variants"]
  };
  run(state2, ctx) {
    const configRaw = state2.metadata["core:variantConfig"];
    const configs = Array.isArray(configRaw) ? configRaw : DEFAULT_VARIANTS;
    const roleNames = Object.keys(state2.roles);
    if (roleNames.length === 0) {
      ctx.logger.debug(
        LogBody.create().component("DeriveVariant").operation("run").status(LOG_STATUS.SKIPPED).message("No roles assigned; skipping variant derivation").context({}).build()
      );
      return;
    }
    for (const config2 of configs) {
      const variantRoles = {};
      for (const roleName of roleNames) {
        const color = state2.roles[roleName];
        if (color === void 0) {
          continue;
        }
        if (config2.invertLightness) {
          variantRoles[roleName] = invertLightness(color);
        } else if (config2.lightnessTarget !== void 0) {
          variantRoles[roleName] = targetLightness(color, config2.lightnessTarget);
        } else if (config2.lightnessOffset !== void 0) {
          variantRoles[roleName] = offsetLightness(color, config2.lightnessOffset);
        } else {
          variantRoles[roleName] = color;
        }
      }
      state2.variants[config2.name] = variantRoles;
      ctx.logger.debug(
        LogBody.create().component("DeriveVariant").operation("run").status(LOG_STATUS.SUCCESS).message("Derived variant").context({
          "roleCount": roleNames.length,
          "variant": config2.name
        }).build()
      );
    }
  }
}
const deriveVariant = new DeriveVariant();
let Hex$1 = class Hex {
  static to(color) {
    const result = color.hex;
    return result;
  }
};
class EmitJson {
  "name" = "emit:json";
  "manifest" = {
    "description": "Writes state.outputs['core:json'] with {colors, roles, variants} flattened to hex strings.",
    "name": "emit:json",
    "reads": ["colors", "roles", "variants"],
    "writes": ["outputs['core:json']"]
  };
  run(state2, ctx) {
    const colors2 = state2.colors.map(Hex$1.to);
    const roles2 = {};
    for (const [name, color] of Object.entries(state2.roles)) {
      roles2[name] = Hex$1.to(color);
    }
    const variants = {};
    for (const [variantName, variantRoles] of Object.entries(state2.variants)) {
      const flat = {};
      for (const [roleName, color] of Object.entries(variantRoles)) {
        flat[roleName] = Hex$1.to(color);
      }
      variants[variantName] = flat;
    }
    const output = { "colors": colors2, "roles": roles2, "variants": variants };
    state2.outputs["core:json"] = output;
    ctx.logger.debug(
      LogBody.create().component("EmitJson").operation("run").status(LOG_STATUS.SUCCESS).message("Wrote json output").context({
        "colors": colors2.length,
        "roles": Object.keys(roles2).length,
        "variants": Object.keys(variants).length
      }).build()
    );
  }
}
const emitJson = new EmitJson();
function measureContrast(algorithm, fg, bg) {
  if (algorithm === "apca") {
    return contrastApca.apply(fg, bg);
  }
  return contrastWcag21.apply(fg, bg);
}
function levelFloor(level) {
  if (level === "AAA") {
    return 7;
  }
  if (level === "AA") {
    return 4.5;
  }
  return 1;
}
class EnforceContrast {
  "name" = "enforce:contrast";
  "manifest" = {
    "description": "Checks and nudges foreground role colors to meet minRatio for each contrast pair.",
    "name": "enforce:contrast",
    "reads": ["roles", "input.roles", "input.contrast"],
    "requires": ["contrastWcag21", "contrastApca", "ensureContrast"],
    "writes": ["roles", "metadata['core:contrastReport']"]
  };
  run(state2, ctx) {
    const schemaPairs = state2.input.roles?.contrastPairs ?? [];
    const extraPairs = state2.input.contrast?.extra ?? [];
    const defaultAlgo = state2.input.contrast?.algorithm ?? "wcag21";
    const floor = levelFloor(state2.input.contrast?.level);
    const allPairs = [...schemaPairs, ...extraPairs];
    if (allPairs.length === 0) {
      return;
    }
    const report = [];
    for (const pair of allPairs) {
      const fgColor = state2.roles[pair.foreground];
      const bgColor = state2.roles[pair.background];
      if (fgColor === void 0 || bgColor === void 0) {
        ctx.logger.warn(
          LogBody.create().component("EnforceContrast").operation("run").status(LOG_STATUS.INVALID).message("Contrast pair has missing role(s)").context({
            "background": pair.background,
            "foreground": pair.foreground
          }).build()
        );
        continue;
      }
      const algo = pair.algorithm ?? defaultAlgo;
      const minRatio = Math.max(pair.minRatio, floor);
      const ratio = measureContrast(algo, fgColor, bgColor);
      const passed = ratio >= minRatio;
      let adjusted = false;
      let finalFg = fgColor;
      if (!passed) {
        ctx.logger.info(
          LogBody.create().component("EnforceContrast").operation("run").status(LOG_STATUS.PARTIAL).message("Pair below minimum ratio; nudging").context({
            "background": pair.background,
            "foreground": pair.foreground,
            "minRatio": minRatio,
            "ratio": ratio
          }).build()
        );
        finalFg = ensureContrast.apply(fgColor, bgColor, minRatio, algo);
        state2.roles[pair.foreground] = finalFg;
        adjusted = true;
      }
      const finalRatio = adjusted ? measureContrast(algo, finalFg, bgColor) : ratio;
      report.push({
        "adjusted": adjusted,
        "algorithm": algo,
        "background": pair.background,
        "foreground": pair.foreground,
        "minRatio": minRatio,
        "passed": finalRatio >= minRatio,
        "ratio": finalRatio
      });
    }
    state2.metadata["core:contrastReport"] = report;
  }
}
const enforceContrast = new EnforceContrast();
function rangeCenter$1(range) {
  return (range[0] + range[1]) / 2;
}
function hueTowards$1(src, target, maxDeg) {
  const delta = (target - src + 540) % 360 - 180;
  const clamped = Math.max(-maxDeg, Math.min(maxDeg, delta));
  return ((src + clamped) % 360 + 360) % 360;
}
function deriveColor(source, role) {
  const { c, h: h2, l } = source.oklch;
  const targetL = role.lightnessRange !== void 0 ? rangeCenter$1(role.lightnessRange) : l;
  const targetC = role.chromaRange !== void 0 ? rangeCenter$1(role.chromaRange) : c;
  let targetH;
  if (role.hue !== void 0) {
    targetH = role.hueClamp !== void 0 ? hueTowards$1(h2, role.hue, role.hueClamp) : (role.hue % 360 + 360) % 360;
  } else if (role.hueOffset !== void 0) {
    targetH = ((h2 + role.hueOffset) % 360 + 360) % 360;
  } else {
    targetH = h2;
  }
  return colorRecordFactory.fromOklch(
    clamp01.apply(targetL),
    clamp.apply(0, 0.5, targetC),
    targetH,
    { "alpha": source.alpha }
  );
}
class ExpandFamily {
  "name" = "expand:family";
  "manifest" = {
    "description": "Derives missing roles that have derivedFrom set. Applies OKLCH deltas from the source role. Never overwrites an already-assigned role.",
    "name": "expand:family",
    "reads": ["roles", "input.roles"],
    "writes": ["roles"]
  };
  run(state2, ctx) {
    if (state2.input.roles === void 0) {
      ctx.logger.debug(
        LogBody.create().component("ExpandFamily").operation("run").status(LOG_STATUS.SKIPPED).message("No role schema; skipping").context({}).build()
      );
      return;
    }
    for (const role of state2.input.roles.roles) {
      if (role.derivedFrom === void 0 || role.derivedFrom === "") {
        continue;
      }
      if (state2.roles[role.name] !== void 0) {
        ctx.logger.debug(
          LogBody.create().component("ExpandFamily").operation("run").status(LOG_STATUS.SKIPPED).message("Role already assigned; skipping").context({ "role": role.name }).build()
        );
        continue;
      }
      const sourceColor = state2.roles[role.derivedFrom];
      if (sourceColor === void 0) {
        ctx.logger.warn(
          LogBody.create().component("ExpandFamily").operation("run").status(LOG_STATUS.INVALID).message("Role derivedFrom source is not assigned").context({
            "derivedFrom": role.derivedFrom,
            "role": role.name
          }).build()
        );
        continue;
      }
      state2.roles[role.name] = deriveColor(sourceColor, role);
      ctx.logger.debug(
        LogBody.create().component("ExpandFamily").operation("run").status(LOG_STATUS.SUCCESS).message("Derived role from source").context({
          "derivedFrom": role.derivedFrom,
          "role": role.name
        }).build()
      );
    }
  }
}
const expandFamily = new ExpandFamily();
function isImagePixelInput(v) {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const o = v;
  return o.data instanceof Uint8ClampedArray && typeof o.width === "number" && typeof o.height === "number";
}
class Hex2 {
  static normalize(raw) {
    const s = raw.trim();
    const cleaned = s.startsWith("#") ? s.slice(1) : s;
    if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
      const r = cleaned[0];
      const g = cleaned[1];
      const b = cleaned[2];
      return `${r}${r}${g}${g}${b}${b}`;
    }
    if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
      return cleaned;
    }
    if (/^[0-9a-fA-F]{8}$/.test(cleaned)) {
      return cleaned.slice(0, 6);
    }
    return "";
  }
}
class IntakeHex {
  "name" = "intake:hex";
  "manifest" = {
    "description": "Parses #RRGGBB, #RGB, and 8-digit hex strings into ColorRecord entries. Throws on non-hex input.",
    "name": "intake:hex",
    "reads": ["input.colors"],
    "writes": ["colors"]
  };
  /**
   * Parses a single value as a hex color. Throws when the input is not a
   * valid hex string. Used by IntakeAny for format dispatch (via try/catch).
   */
  parse(raw) {
    if (typeof raw !== "string") {
      throw ValidationError.create({
        "message": "intake:hex — expected a string input",
        "path": "raw",
        "violations": [{
          "details": { "expectedType": "string", "receivedType": typeof raw },
          "message": "input is not a string",
          "path": "raw"
        }]
      });
    }
    const trimmed = raw.trim();
    if (!trimmed.startsWith("#") && !/^[0-9a-fA-F]{3,8}$/.test(trimmed)) {
      throw ValidationError.create({
        "message": "intake:hex — not a hex pattern",
        "path": "raw",
        "violations": [{
          "details": { "expectedFormat": "#RGB, #RRGGBB, or #RRGGBBAA (with or without leading #)", "received": trimmed },
          "message": "value does not match hex pattern",
          "path": "raw"
        }]
      });
    }
    const hex6 = Hex2.normalize(trimmed);
    if (hex6 === "") {
      throw ValidationError.create({
        "message": "intake:hex — could not normalise hex",
        "path": "raw",
        "violations": [{
          "details": { "received": trimmed },
          "message": "value could not be normalised to a 3/6/8-digit hex string",
          "path": "raw"
        }]
      });
    }
    const cleaned = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
    const alpha = cleaned.length === 8 ? parseInt(cleaned.slice(6, 8), 16) / 255 : 1;
    return colorRecordFactory.fromHex(`#${hex6}`, { "alphaOverride": alpha });
  }
  /**
   * Wraps {@link IntakeHex.parse} so the dispatch loop in
   * {@link IntakeHex.run} does not carry a try/catch in its body (V8
   * de-optimises try/catch inside hot loops).
   */
  #tryParse(raw) {
    try {
      return this.parse(raw);
    } catch {
      return void 0;
    }
  }
  run(state2, ctx) {
    for (let i = 0; i < state2.input.colors.length; i++) {
      const raw = state2.input.colors[i];
      if (isImagePixelInput(raw)) {
        ctx.logger.trace(
          LogBody.create().component("IntakeHex").operation("run").status(LOG_STATUS.SKIPPED).message("Skipping ImageData entry (handled by intake:imagePixels)").context({ "index": i }).build()
        );
        continue;
      }
      const record = this.#tryParse(raw);
      if (record === void 0) {
        throw ValidationError.create({
          "message": `intake:hex — entry at index ${i} is not a hex color`,
          "path": `input.colors[${i}]`,
          "violations": [{
            "details": {
              "expectedFormat": "#RGB, #RRGGBB, or #RRGGBBAA (with or without leading #)",
              "index": i,
              "received": JSON.stringify(raw) ?? "undefined"
            },
            "message": "entry does not match a hex color format",
            "path": `input.colors[${i}]`
          }]
        });
      }
      state2.colors.push(record);
      ctx.logger.debug(
        LogBody.create().component("IntakeHex").operation("run").status(LOG_STATUS.SUCCESS).message("Parsed hex value").context({ "hex": record.hex, "raw": raw }).build()
      );
    }
  }
}
const intakeHex = new IntakeHex();
function isHslInput(v) {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const o = v;
  return typeof o.h === "number" && typeof o.s === "number" && typeof o.l === "number" && typeof o.r !== "number" && typeof o.c !== "number";
}
class IntakeHsl {
  "name" = "intake:hsl";
  "manifest" = {
    "description": "Parses {h,s,l,a?} (h: deg, s/l: 0..1 or 0..100) into ColorRecord entries. Throws on non-HSL input.",
    "name": "intake:hsl",
    "reads": ["input.colors"],
    "writes": ["colors"]
  };
  /**
   * Parses a single value as an HSL object. Throws when the input is not a
   * valid `{h,s,l}` object or carries keys from a different format (r/c).
   * Used by IntakeAny for format dispatch (via try/catch).
   */
  parse(raw) {
    if (!isHslInput(raw)) {
      throw ValidationError.create({
        "message": "intake:hsl — expected an {h,s,l} object",
        "path": "raw",
        "violations": [{
          "details": { "expectedShape": "{h: number (deg), s: number, l: number, a?: number}", "receivedType": typeof raw },
          "message": "input is not an HSL object",
          "path": "raw"
        }]
      });
    }
    const { h: h2, l, s } = raw;
    const a = typeof raw.a === "number" ? raw.a : 1;
    const alpha = a > 1 ? a / 100 : a;
    const sat = s > 1 ? s / 100 : s;
    const lig = l > 1 ? l / 100 : l;
    return colorRecordFactory.fromHsl(h2, sat, lig, { "alpha": clamp01.apply(alpha), "sourceFormat": "hsl" });
  }
  /**
   * Wraps {@link IntakeHsl.parse} so the dispatch loop in
   * {@link IntakeHsl.run} does not carry a try/catch in its body (V8
   * de-optimises try/catch inside hot loops).
   */
  #tryParse(raw) {
    try {
      return this.parse(raw);
    } catch {
      return void 0;
    }
  }
  run(state2, ctx) {
    for (let i = 0; i < state2.input.colors.length; i++) {
      const raw = state2.input.colors[i];
      const record = this.#tryParse(raw);
      if (record === void 0) {
        throw ValidationError.create({
          "message": `intake:hsl — entry at index ${i} is not an HSL object`,
          "path": `input.colors[${i}]`,
          "violations": [{
            "details": {
              "expectedShape": "{h: degrees, s: 0..1 or 0..100, l: 0..1 or 0..100, a?: number}",
              "index": i,
              "received": JSON.stringify(raw) ?? "undefined"
            },
            "message": "entry does not match the HSL object shape",
            "path": `input.colors[${i}]`
          }]
        });
      }
      const typed = raw;
      state2.colors.push(record);
      ctx.logger.debug(
        LogBody.create().component("IntakeHsl").operation("run").status(LOG_STATUS.SUCCESS).message("Parsed hsl value").context({ "h": typed.h, "hex": record.hex, "l": typed.l, "s": typed.s }).build()
      );
    }
  }
}
const intakeHsl = new IntakeHsl();
class IntakeImagePixels {
  "name" = "intake:imagePixels";
  "manifest" = {
    "description": "Parses ImageData or {data: Uint8ClampedArray, width, height} and pushes non-transparent pixels. Throws on non-image input.",
    "name": "intake:imagePixels",
    "reads": ["input.colors"],
    "writes": ["colors"]
  };
  /**
   * Parses a single value as an ImageData-shaped input, returning the first
   * non-transparent pixel as a format-match sentinel. Throws when the input
   * is not an `{data, width, height}` object or contains no opaque pixels.
   * Used by IntakeAny for format dispatch (via try/catch).
   * The full pixel set is pushed separately via {@link pushAllPixels}.
   */
  parse(raw) {
    if (!isImagePixelInput(raw)) {
      throw ValidationError.create({
        "message": "intake:imagePixels — expected an ImageData-shaped object",
        "path": "raw",
        "violations": [{
          "details": { "expectedShape": "{data: Uint8ClampedArray, width: number, height: number}", "receivedType": typeof raw },
          "message": "input is not an ImageData-shaped object",
          "path": "raw"
        }]
      });
    }
    const { data } = raw;
    const pixelCount = raw.width * raw.height;
    for (let i = 0; i < pixelCount; i++) {
      const offset = i * 4;
      const alpha = data[offset + 3];
      if (alpha === void 0 || alpha === 0) {
        continue;
      }
      const r = (data[offset] ?? 0) / 255;
      const g = (data[offset + 1] ?? 0) / 255;
      const b = (data[offset + 2] ?? 0) / 255;
      return colorRecordFactory.fromRgb(r, g, b, { "alpha": alpha / 255, "sourceFormat": "imagePixel" });
    }
    throw ValidationError.create({
      "message": "intake:imagePixels — image has no non-transparent pixels",
      "path": "raw",
      "violations": [{
        "details": { "height": raw.height, "pixelCount": pixelCount, "width": raw.width },
        "message": "every pixel in the image has alpha 0",
        "path": "raw"
      }]
    });
  }
  /**
   * Pushes all non-transparent pixels from an ImageData entry into `colors`.
   * Called by `IntakeAny` after `isImagePixelInput` confirms the entry is an image.
   */
  pushAllPixels(raw, state2, ctx) {
    if (!isImagePixelInput(raw)) {
      return;
    }
    const { data, height, width } = raw;
    const pixelCount = width * height;
    let pushed = 0;
    for (let i = 0; i < pixelCount; i++) {
      const offset = i * 4;
      const alpha = data[offset + 3];
      if (alpha === void 0 || alpha === 0) {
        continue;
      }
      const r = (data[offset] ?? 0) / 255;
      const g = (data[offset + 1] ?? 0) / 255;
      const b = (data[offset + 2] ?? 0) / 255;
      state2.colors.push(colorRecordFactory.fromRgb(r, g, b, { "alpha": alpha / 255, "sourceFormat": "imagePixel" }));
      pushed++;
    }
    ctx.logger.debug(
      LogBody.create().component("IntakeImagePixels").operation("pushAllPixels").status(LOG_STATUS.SUCCESS).message("Pushed pixels from image").context({
        "height": height,
        "pushed": pushed,
        "width": width
      }).build()
    );
  }
  run(state2, ctx) {
    for (let i = 0; i < state2.input.colors.length; i++) {
      const raw = state2.input.colors[i];
      if (!isImagePixelInput(raw)) {
        ctx.logger.trace(
          LogBody.create().component("IntakeImagePixels").operation("run").status(LOG_STATUS.SKIPPED).message("Skipping non-image entry").context({ "index": i }).build()
        );
        continue;
      }
      this.pushAllPixels(raw, state2, ctx);
    }
  }
}
const intakeImagePixels = new IntakeImagePixels();
function isLabInput(v) {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const o = v;
  return typeof o.l === "number" && typeof o.a === "number" && typeof o.b === "number" && typeof o.r !== "number" && typeof o.s !== "number" && typeof o.c !== "number" && typeof o.h !== "number";
}
function labToRgb(l, a, b) {
  const fy = (l + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;
  const eps = 8856e-6;
  const kap = 903.3;
  const xw = 0.95047;
  const yw = 1;
  const zw = 1.08883;
  const xr = Math.pow(fx, 3) > eps ? Math.pow(fx, 3) : (116 * fx - 16) / kap;
  const yr = l > kap * eps ? Math.pow((l + 16) / 116, 3) : l / kap;
  const zr = Math.pow(fz, 3) > eps ? Math.pow(fz, 3) : (116 * fz - 16) / kap;
  const x = xr * xw;
  const y = yr * yw;
  const z = zr * zw;
  let r = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  let g = -0.969266 * x + 1.8760108 * y + 0.041556 * z;
  let bv = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;
  const linearToSrgb2 = (v) => {
    if (v <= 31308e-7) {
      return 12.92 * v;
    }
    return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  };
  r = linearToSrgb2(r);
  g = linearToSrgb2(g);
  bv = linearToSrgb2(bv);
  return [
    clamp01.apply(r),
    clamp01.apply(g),
    clamp01.apply(bv)
  ];
}
class IntakeLab {
  "name" = "intake:lab";
  "manifest" = {
    "description": "Parses {l,a,b} CIE Lab D65 into ColorRecord entries. Throws on non-Lab input.",
    "name": "intake:lab",
    "reads": ["input.colors"],
    "writes": ["colors"]
  };
  /**
   * Parses a single value as a CIE Lab object. Throws when the input is not
   * a valid `{l,a,b}` object or carries conflicting format keys.
   * Used by IntakeAny for format dispatch (via try/catch).
   */
  parse(raw) {
    if (!isLabInput(raw)) {
      throw ValidationError.create({
        "message": "intake:lab — expected an {l,a,b} object",
        "path": "raw",
        "violations": [{
          "details": { "expectedShape": "{l: number, a: number, b: number} (no conflicting r/s/c/h keys)", "receivedType": typeof raw },
          "message": "input is not a CIE Lab object",
          "path": "raw"
        }]
      });
    }
    const { a, b, l } = raw;
    const [r, g, bv] = labToRgb(l, a, b);
    return colorRecordFactory.fromRgb(r, g, bv, { "sourceFormat": "lab" });
  }
  /**
   * Parses a single entry, rethrowing with index/context on failure.
   * Extracted from {@link IntakeLab.run} so the loop body contains only
   * a function call, not a try-catch, per V8 optimization guidance.
   */
  parseEntry(raw, index2) {
    try {
      return this.parse(raw);
    } catch {
      throw ValidationError.create({
        "message": `intake:lab — entry at index ${index2} is not a CIE Lab object`,
        "path": `input.colors[${index2}]`,
        "violations": [{
          "details": {
            "expectedShape": "{l, a, b} without conflicting format keys (r, s, c, h)",
            "index": index2,
            "received": JSON.stringify(raw) ?? "undefined"
          },
          "message": "entry does not match the CIE Lab object shape",
          "path": `input.colors[${index2}]`
        }]
      });
    }
  }
  run(state2, ctx) {
    for (let i = 0; i < state2.input.colors.length; i++) {
      const raw = state2.input.colors[i];
      const record = this.parseEntry(raw, i);
      state2.colors.push(record);
      ctx.logger.debug(
        LogBody.create().component("IntakeLab").operation("run").status(LOG_STATUS.SUCCESS).message("Parsed lab value").context({
          "a": raw.a,
          "b": raw.b,
          "hex": record.hex,
          "l": raw.l
        }).build()
      );
    }
  }
}
const intakeLab = new IntakeLab();
const CSS_NAMED_COLORS = {
  "aliceblue": "#f0f8ff",
  "antiquewhite": "#faebd7",
  "aqua": "#00ffff",
  "aquamarine": "#7fffd4",
  "azure": "#f0ffff",
  "beige": "#f5f5dc",
  "bisque": "#ffe4c4",
  "black": "#000000",
  "blanchedalmond": "#ffebcd",
  "blue": "#0000ff",
  "blueviolet": "#8a2be2",
  "brown": "#a52a2a",
  "burlywood": "#deb887",
  "cadetblue": "#5f9ea0",
  "chartreuse": "#7fff00",
  "chocolate": "#d2691e",
  "coral": "#ff7f50",
  "cornflowerblue": "#6495ed",
  "cornsilk": "#fff8dc",
  "crimson": "#dc143c",
  "cyan": "#00ffff",
  "darkblue": "#00008b",
  "darkcyan": "#008b8b",
  "darkgoldenrod": "#b8860b",
  "darkgray": "#a9a9a9",
  "darkgreen": "#006400",
  "darkgrey": "#a9a9a9",
  "darkkhaki": "#bdb76b",
  "darkmagenta": "#8b008b",
  "darkolivegreen": "#556b2f",
  "darkorange": "#ff8c00",
  "darkorchid": "#9932cc",
  "darkred": "#8b0000",
  "darksalmon": "#e9967a",
  "darkseagreen": "#8fbc8f",
  "darkslateblue": "#483d8b",
  "darkslategray": "#2f4f4f",
  "darkslategrey": "#2f4f4f",
  "darkturquoise": "#00ced1",
  "darkviolet": "#9400d3",
  "deeppink": "#ff1493",
  "deepskyblue": "#00bfff",
  "dimgray": "#696969",
  "dimgrey": "#696969",
  "dodgerblue": "#1e90ff",
  "firebrick": "#b22222",
  "floralwhite": "#fffaf0",
  "forestgreen": "#228b22",
  "fuchsia": "#ff00ff",
  "gainsboro": "#dcdcdc",
  "ghostwhite": "#f8f8ff",
  "gold": "#ffd700",
  "goldenrod": "#daa520",
  "gray": "#808080",
  "green": "#008000",
  "greenyellow": "#adff2f",
  "grey": "#808080",
  "honeydew": "#f0fff0",
  "hotpink": "#ff69b4",
  "indianred": "#cd5c5c",
  "indigo": "#4b0082",
  "ivory": "#fffff0",
  "khaki": "#f0e68c",
  "lavender": "#e6e6fa",
  "lavenderblush": "#fff0f5",
  "lawngreen": "#7cfc00",
  "lemonchiffon": "#fffacd",
  "lightblue": "#add8e6",
  "lightcoral": "#f08080",
  "lightcyan": "#e0ffff",
  "lightgoldenrodyellow": "#fafad2",
  "lightgray": "#d3d3d3",
  "lightgreen": "#90ee90",
  "lightgrey": "#d3d3d3",
  "lightpink": "#ffb6c1",
  "lightsalmon": "#ffa07a",
  "lightseagreen": "#20b2aa",
  "lightskyblue": "#87cefa",
  "lightslategray": "#778899",
  "lightslategrey": "#778899",
  "lightsteelblue": "#b0c4de",
  "lightyellow": "#ffffe0",
  "lime": "#00ff00",
  "limegreen": "#32cd32",
  "linen": "#faf0e6",
  "magenta": "#ff00ff",
  "maroon": "#800000",
  "mediumaquamarine": "#66cdaa",
  "mediumblue": "#0000cd",
  "mediumorchid": "#ba55d3",
  "mediumpurple": "#9370db",
  "mediumseagreen": "#3cb371",
  "mediumslateblue": "#7b68ee",
  "mediumspringgreen": "#00fa9a",
  "mediumturquoise": "#48d1cc",
  "mediumvioletred": "#c71585",
  "midnightblue": "#191970",
  "mintcream": "#f5fffa",
  "mistyrose": "#ffe4e1",
  "moccasin": "#ffe4b5",
  "navajowhite": "#ffdead",
  "navy": "#000080",
  "oldlace": "#fdf5e6",
  "olive": "#808000",
  "olivedrab": "#6b8e23",
  "orange": "#ffa500",
  "orangered": "#ff4500",
  "orchid": "#da70d6",
  "palegoldenrod": "#eee8aa",
  "palegreen": "#98fb98",
  "paleturquoise": "#afeeee",
  "palevioletred": "#db7093",
  "papayawhip": "#ffefd5",
  "peachpuff": "#ffdab9",
  "peru": "#cd853f",
  "pink": "#ffc0cb",
  "plum": "#dda0dd",
  "powderblue": "#b0e0e6",
  "purple": "#800080",
  "rebeccapurple": "#663399",
  "red": "#ff0000",
  "rosybrown": "#bc8f8f",
  "royalblue": "#4169e1",
  "saddlebrown": "#8b4513",
  "salmon": "#fa8072",
  "sandybrown": "#f4a460",
  "seagreen": "#2e8b57",
  "seashell": "#fff5ee",
  "sienna": "#a0522d",
  "silver": "#c0c0c0",
  "skyblue": "#87ceeb",
  "slateblue": "#6a5acd",
  "slategray": "#708090",
  "slategrey": "#708090",
  "snow": "#fffafa",
  "springgreen": "#00ff7f",
  "steelblue": "#4682b4",
  "tan": "#d2b48c",
  "teal": "#008080",
  "thistle": "#d8bfd8",
  "tomato": "#ff6347",
  "turquoise": "#40e0d0",
  "violet": "#ee82ee",
  "wheat": "#f5deb3",
  "white": "#ffffff",
  "whitesmoke": "#f5f5f5",
  "yellow": "#ffff00",
  "yellowgreen": "#9acd32"
};
class IntakeNamed {
  "name" = "intake:named";
  "manifest" = {
    "description": 'Parses CSS named color strings (e.g. "rebeccapurple") into ColorRecord entries. Throws on unrecognised input.',
    "name": "intake:named",
    "reads": ["input.colors"],
    "writes": ["colors"]
  };
  /**
   * Parses a single value as a CSS named color. Throws when the input is not
   * a recognized CSS named color string.
   * Used by IntakeAny for format dispatch (via try/catch).
   */
  parse(raw) {
    if (typeof raw !== "string") {
      throw ValidationError.create({
        "message": "intake:named — expected a string input",
        "path": "raw",
        "violations": [{
          "details": { "expectedType": "string", "receivedType": typeof raw },
          "message": "input is not a string",
          "path": "raw"
        }]
      });
    }
    const key = raw.trim().toLowerCase();
    const hex = CSS_NAMED_COLORS[key];
    if (hex === void 0 || hex.length === 0) {
      throw ValidationError.create({
        "message": "intake:named — not a recognized CSS named color",
        "path": "raw",
        "violations": [{
          "details": { "expectedFormat": "a CSS Color Level 4 named color keyword", "received": raw },
          "message": "value is not a recognized CSS named color",
          "path": "raw"
        }]
      });
    }
    return colorRecordFactory.fromHex(hex, { "sourceFormat": "named" });
  }
  /**
   * Parses a single entry, rethrowing with index/context on failure.
   * Extracted from {@link IntakeNamed.run} so the loop body contains only
   * a function call, not a try-catch, per V8 optimization guidance.
   */
  parseEntry(raw, index2) {
    try {
      return this.parse(raw);
    } catch {
      throw ValidationError.create({
        "message": `intake:named — entry at index ${index2} is not a CSS named color`,
        "path": `input.colors[${index2}]`,
        "violations": [{
          "details": {
            "expectedFormat": 'a string like "rebeccapurple" from the CSS Color Level 4 keyword list',
            "index": index2,
            "received": JSON.stringify(raw) ?? "undefined"
          },
          "message": "entry is not a recognized CSS named color",
          "path": `input.colors[${index2}]`
        }]
      });
    }
  }
  run(state2, ctx) {
    for (let i = 0; i < state2.input.colors.length; i++) {
      const raw = state2.input.colors[i];
      const record = this.parseEntry(raw, i);
      state2.colors.push(record);
      ctx.logger.debug(
        LogBody.create().component("IntakeNamed").operation("run").status(LOG_STATUS.SUCCESS).message("Parsed named color").context({ "hex": record.hex, "name": raw }).build()
      );
    }
  }
}
const intakeNamed = new IntakeNamed();
function isOklchInput(v) {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const o = v;
  return typeof o.l === "number" && typeof o.c === "number" && typeof o.h === "number" && typeof o.r !== "number" && typeof o.s !== "number";
}
class IntakeOklch {
  "name" = "intake:oklch";
  "manifest" = {
    "description": "Parses {l,c,h,a?} OKLCH (l: 0..1, c: 0..0.5, h: 0..360) into ColorRecord entries. Throws on non-OKLCH input.",
    "name": "intake:oklch",
    "reads": ["input.colors"],
    "writes": ["colors"]
  };
  /**
   * Parses a single value as an OKLCH object. Throws when the input is not a
   * valid `{l,c,h}` object or carries keys from a different format (r/s).
   * Used by IntakeAny for format dispatch (via try/catch).
   */
  parse(raw) {
    if (!isOklchInput(raw)) {
      throw ValidationError.create({
        "message": "intake:oklch — expected an {l,c,h} object",
        "path": "raw",
        "violations": [{
          "details": { "expectedShape": "{l: number, c: number, h: number, a?: number}", "receivedType": typeof raw },
          "message": "input is not an OKLCH object",
          "path": "raw"
        }]
      });
    }
    const { c, h: h2, l } = raw;
    const a = typeof raw.a === "number" ? raw.a : 1;
    return colorRecordFactory.fromOklch(l, c, h2, { "alpha": a });
  }
  /**
   * Wraps {@link IntakeOklch.parse} so the dispatch loop in
   * {@link IntakeOklch.run} does not carry a try/catch in its body (V8
   * de-optimises try/catch inside hot loops).
   */
  #tryParse(raw) {
    try {
      return this.parse(raw);
    } catch {
      return void 0;
    }
  }
  run(state2, ctx) {
    for (let i = 0; i < state2.input.colors.length; i++) {
      const raw = state2.input.colors[i];
      const record = this.#tryParse(raw);
      if (record === void 0) {
        throw ValidationError.create({
          "message": `intake:oklch — entry at index ${i} is not an OKLCH object`,
          "path": `input.colors[${i}]`,
          "violations": [{
            "details": {
              "expectedShape": "{l: 0..1, c: 0..0.5, h: 0..360, a?: number}",
              "index": i,
              "received": JSON.stringify(raw) ?? "undefined"
            },
            "message": "entry does not match the OKLCH object shape",
            "path": `input.colors[${i}]`
          }]
        });
      }
      const typed = raw;
      state2.colors.push(record);
      ctx.logger.debug(
        LogBody.create().component("IntakeOklch").operation("run").status(LOG_STATUS.SUCCESS).message("Parsed oklch value").context({ "c": typed.c, "h": typed.h, "hex": record.hex, "l": typed.l }).build()
      );
    }
  }
}
const intakeOklch = new IntakeOklch();
const P3_PATTERN = /^color\(\s*display-p3\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)(?:\s*\/\s*(-?\d*\.?\d+))?\s*\)$/i;
class IntakeP3 {
  "name" = "intake:p3";
  "manifest" = {
    "description": "Parses CSS color(display-p3 r g b [/ alpha]) strings into ColorRecord entries with displayP3 populated.",
    "name": "intake:p3",
    "reads": ["input.colors"],
    "writes": ["colors"]
  };
  /**
   * Parses a single value as a CSS `color(display-p3 …)` string. Throws when
   * the input is not a string or does not match the Display-P3 pattern.
   * Used by IntakeAny for format dispatch (via try/catch).
   */
  parse(raw) {
    if (typeof raw !== "string") {
      throw ValidationError.create({
        "message": "intake:p3 — expected a string input",
        "path": "raw",
        "violations": [{
          "details": { "expectedType": "string", "receivedType": typeof raw },
          "message": "input is not a string",
          "path": "raw"
        }]
      });
    }
    const match = P3_PATTERN.exec(raw.trim());
    if (match === null) {
      throw ValidationError.create({
        "message": "intake:p3 — not a display-p3 string",
        "path": "raw",
        "violations": [{
          "details": { "expectedFormat": "color(display-p3 r g b [/ alpha])", "received": raw },
          "message": "value does not match the display-p3 CSS syntax",
          "path": "raw"
        }]
      });
    }
    const p3R = parseFloat(match[1]);
    const p3G = parseFloat(match[2]);
    const p3B = parseFloat(match[3]);
    const alpha = match[4] !== void 0 ? parseFloat(match[4]) : 1;
    return recordFromP3(p3R, p3G, p3B, alpha, void 0);
  }
  /**
   * Parses a single entry, rethrowing with index/context on failure.
   * Extracted from {@link IntakeP3.run} so the loop body contains only
   * a function call, not a try-catch, per V8 optimization guidance.
   */
  parseEntry(raw, index2) {
    try {
      return this.parse(raw);
    } catch {
      throw ValidationError.create({
        "message": `intake:p3 — entry at index ${index2} is not a Display-P3 string`,
        "path": `input.colors[${index2}]`,
        "violations": [{
          "details": {
            "expectedFormat": "color(display-p3 r g b [/ alpha])",
            "index": index2,
            "received": JSON.stringify(raw) ?? "undefined"
          },
          "message": "entry does not match the display-p3 CSS syntax",
          "path": `input.colors[${index2}]`
        }]
      });
    }
  }
  run(state2, ctx) {
    for (let i = 0; i < state2.input.colors.length; i++) {
      const raw = state2.input.colors[i];
      const record = this.parseEntry(raw, i);
      state2.colors.push(record);
      ctx.logger.debug(
        LogBody.create().component("IntakeP3").operation("run").status(LOG_STATUS.SUCCESS).message("Parsed display-p3 value").context({
          "hex": record.hex,
          "raw": raw
        }).build()
      );
    }
  }
}
const intakeP3 = new IntakeP3();
function recordFromP3(p3R, p3G, p3B, alpha, hints) {
  const lp3R = P32.decode(p3R);
  const lp3G = P32.decode(p3G);
  const lp3B = P32.decode(p3B);
  const lsR = 1.2249401 * lp3R - 0.2249404 * lp3G + 0 * lp3B;
  const lsG = -0.0420569 * lp3R + 1.0420571 * lp3G - 1e-7 * lp3B;
  const lsB = -0.0196376 * lp3R - 0.0786361 * lp3G + 1.0982735 * lp3B;
  const oklch = linearSrgbToOklch(lsR, lsG, lsB);
  const inSrgb = lsR >= 0 && lsR <= 1 && lsG >= 0 && lsG <= 1 && lsB >= 0 && lsB <= 1;
  let safeRgb;
  if (inSrgb) {
    const encoded = linearToSrgb.apply(lsR, lsG, lsB);
    safeRgb = {
      "b": clamp01.apply(encoded.b),
      "g": clamp01.apply(encoded.g),
      "r": clamp01.apply(encoded.r)
    };
  } else {
    const mapped = gamutMapSrgb.apply(oklch.l, oklch.c, oklch.h);
    const mappedLin = oklchToLinearSrgb(mapped.l, mapped.c, mapped.h);
    const mappedSrgb = linearToSrgb.apply(mappedLin.r, mappedLin.g, mappedLin.b);
    safeRgb = {
      "b": clamp01.apply(mappedSrgb.b),
      "g": clamp01.apply(mappedSrgb.g),
      "r": clamp01.apply(mappedSrgb.r)
    };
  }
  return {
    "alpha": clamp01.apply(alpha),
    "displayP3": {
      "b": clamp01.apply(p3B),
      "g": clamp01.apply(p3G),
      "r": clamp01.apply(p3R)
    },
    "hex": rgbToHex.apply(safeRgb.r, safeRgb.g, safeRgb.b),
    "hints": hints,
    "oklch": oklch,
    "rgb": safeRgb,
    "sourceFormat": "displayP3"
  };
}
class P32 {
  static decode(v) {
    const sign = v < 0 ? -1 : 1;
    const abs = Math.abs(v);
    if (abs <= 0.04045) {
      return sign * (abs / 12.92);
    }
    return sign * Math.pow((abs + 0.055) / 1.055, 2.4);
  }
}
function linearSrgbToOklch(rl, gl, bl) {
  let x = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  let y = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  let z = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;
  x = signCbrt(x);
  y = signCbrt(y);
  z = signCbrt(z);
  const labL = 0.2104542553 * x + 0.793617785 * y - 0.0040720468 * z;
  const labA = 1.9779984951 * x - 2.428592205 * y + 0.4505937099 * z;
  const labB = 0.0259040371 * x + 0.7827717662 * y - 0.808675766 * z;
  const c = Math.sqrt(labA * labA + labB * labB);
  let h2 = Math.atan2(labB, labA) * 180 / Math.PI;
  if (h2 < 0) {
    h2 += 360;
  }
  return {
    "c": clamp.apply(0, 0.5, c),
    "h": h2 % 360,
    "l": clamp01.apply(labL)
  };
}
function signCbrt(v) {
  if (v < 0) {
    return -Math.cbrt(-v);
  }
  return Math.cbrt(v);
}
function oklchToLinearSrgb(l, c, h2) {
  const hRad = h2 * Math.PI / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  let x = l + 0.3963377774 * a + 0.2158037573 * b;
  let y = l - 0.1055613458 * a - 0.0638541728 * b;
  let z = l - 0.0894841775 * a - 1.291485548 * b;
  x = x * x * x;
  y = y * y * y;
  z = z * z * z;
  return {
    "b": -0.0041960863 * x - 0.7034186147 * y + 1.707614701 * z,
    "g": -1.2684380046 * x + 2.6097574011 * y - 0.3413193965 * z,
    "r": 4.0767416621 * x - 3.3077115913 * y + 0.2309699292 * z
  };
}
function isRgbInput(v) {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const o = v;
  return typeof o.r === "number" && typeof o.g === "number" && typeof o.b === "number";
}
class IntakeRgb {
  "name" = "intake:rgb";
  "manifest" = {
    "description": "Parses {r,g,b,a?} in 0..1 or 0..255 (auto-detected by max value) into ColorRecord entries. Throws on non-RGB input.",
    "name": "intake:rgb",
    "reads": ["input.colors"],
    "writes": ["colors"]
  };
  /**
   * Parses a single value as an RGB object. Throws when the input is not a
   * valid `{r,g,b}` object or carries keys from a different format (h/l/c).
   * Used by IntakeAny for format dispatch (via try/catch).
   */
  parse(raw) {
    if (!isRgbInput(raw)) {
      throw ValidationError.create({
        "message": "intake:rgb — expected an {r,g,b} object",
        "path": "raw",
        "violations": [{
          "details": { "expectedShape": "{r: number, g: number, b: number, a?: number}", "receivedType": typeof raw },
          "message": "input is not an RGB object",
          "path": "raw"
        }]
      });
    }
    const o = raw;
    if (typeof o.h === "number" || typeof o.l === "number" || typeof o.c === "number") {
      throw ValidationError.create({
        "message": "intake:rgb — object has conflicting format keys",
        "path": "raw",
        "violations": [{
          "details": { "conflictingKeys": ["h", "l", "c"], "reason": "h/l/c indicate a different format (hsl/oklch/lab)" },
          "message": "object carries keys from a different color format",
          "path": "raw"
        }]
      });
    }
    let { b, g, r } = raw;
    const a = typeof raw.a === "number" ? raw.a : 1;
    if (r > 1 || g > 1 || b > 1) {
      r = r / 255;
      g = g / 255;
      b = b / 255;
    }
    const alpha = a > 1 ? a / 255 : a;
    return colorRecordFactory.fromRgb(r, g, b, { "alpha": alpha });
  }
  /**
   * Wraps {@link IntakeRgb.parse} so the dispatch loop in
   * {@link IntakeRgb.run} does not carry a try/catch in its body (V8
   * de-optimises try/catch inside hot loops).
   */
  #tryParse(raw) {
    try {
      return this.parse(raw);
    } catch {
      return void 0;
    }
  }
  run(state2, ctx) {
    for (let i = 0; i < state2.input.colors.length; i++) {
      const raw = state2.input.colors[i];
      const record = this.#tryParse(raw);
      if (record === void 0) {
        throw ValidationError.create({
          "message": `intake:rgb — entry at index ${i} is not an RGB object`,
          "path": `input.colors[${i}]`,
          "violations": [{
            "details": {
              "expectedShape": "{r: 0..1 or 0..255, g: 0..1 or 0..255, b: 0..1 or 0..255, a?: number}",
              "index": i,
              "received": JSON.stringify(raw) ?? "undefined"
            },
            "message": "entry does not match the RGB object shape",
            "path": `input.colors[${i}]`
          }]
        });
      }
      state2.colors.push(record);
      ctx.logger.debug(
        LogBody.create().component("IntakeRgb").operation("run").status(LOG_STATUS.SUCCESS).message("Parsed rgb value").context({ "b": record.rgb.b, "g": record.rgb.g, "hex": record.hex, "r": record.rgb.r }).build()
      );
    }
  }
}
const intakeRgb = new IntakeRgb();
const SCALAR_DELEGATES = [
  intakeHex,
  intakeP3,
  intakeRgb,
  intakeHsl,
  intakeOklch,
  intakeLab,
  intakeNamed
];
function tryParse(delegate, raw) {
  try {
    return delegate.parse(raw);
  } catch {
    return void 0;
  }
}
class IntakeAny {
  "name" = "intake:any";
  "manifest" = {
    "description": "Recommended default intake task. Dispatches each entry to the first matching format delegate. Throws if no delegate matches.",
    "name": "intake:any",
    "reads": ["input.colors"],
    "writes": ["colors"]
  };
  run(state2, ctx) {
    for (let i = 0; i < state2.input.colors.length; i++) {
      const raw = state2.input.colors[i];
      if (isImagePixelInput(raw)) {
        intakeImagePixels.pushAllPixels(raw, state2, ctx);
        continue;
      }
      let matched = false;
      for (const delegate of SCALAR_DELEGATES) {
        const record = tryParse(delegate, raw);
        if (record === void 0) {
          continue;
        }
        state2.colors.push(record);
        matched = true;
        ctx.logger.debug(
          LogBody.create().component("IntakeAny").operation("run").status(LOG_STATUS.SUCCESS).message("Dispatched entry").context({
            "delegate": delegate.name,
            "hex": record.hex,
            "index": i
          }).build()
        );
        break;
      }
      if (!matched) {
        throw ValidationError.create({
          "message": `intake:any — entry at index ${i} does not match any known color format`,
          "path": `input.colors[${i}]`,
          "violations": [{
            "details": {
              "acceptedFormats": [
                "hex (#RGB, #RRGGBB)",
                "display-p3",
                "{r,g,b}",
                "{h,s,l}",
                "{l,c,h} (oklch)",
                "{l,a,b} (lab)",
                "CSS named color",
                "ImageData"
              ],
              "index": i,
              "received": JSON.stringify(raw) ?? "undefined"
            },
            "message": "entry does not match any known color format",
            "path": `input.colors[${i}]`
          }]
        });
      }
    }
    ctx.logger.debug(
      LogBody.create().component("IntakeAny").operation("run").status(LOG_STATUS.SUCCESS).message("Total colors after intake").context({ "count": state2.colors.length }).build()
    );
  }
}
const intakeAny = new IntakeAny();
function hueTowards(src, target, maxDeg) {
  const delta = (target - src + 540) % 360 - 180;
  const clamped = Math.max(-maxDeg, Math.min(maxDeg, delta));
  return ((src + clamped) % 360 + 360) % 360;
}
class TargetHue {
  static resolve(h2, role) {
    if (role.hue !== void 0) {
      return role.hueClamp !== void 0 ? hueTowards(h2, role.hue, role.hueClamp) : (role.hue % 360 + 360) % 360;
    }
    return role.hueOffset ?? h2;
  }
}
function rangeCenter(range) {
  return (range[0] + range[1]) / 2;
}
function clampToRange$1(value, range) {
  if (value < range[0]) {
    return range[0];
  }
  if (value > range[1]) {
    return range[1];
  }
  return value;
}
function distanceToRoleCenter(color, role) {
  const { c, h: h2, l } = color.oklch;
  let distance = 0;
  if (role.lightnessRange !== void 0) {
    const target = rangeCenter(role.lightnessRange);
    distance += Math.abs(l - target) * 2;
  }
  if (role.chromaRange !== void 0) {
    const target = rangeCenter(role.chromaRange);
    distance += Math.abs(c - target);
  }
  if (role.hueOffset !== void 0) {
    const hueDiff = Math.abs((h2 - role.hueOffset + 540) % 360 - 180);
    distance += hueDiff / 360 * 0.5;
  }
  return distance;
}
function nudgeIntoRole(candidate, role) {
  const { c, h: h2, l } = candidate.oklch;
  const targetL = role.lightnessRange !== void 0 ? clampToRange$1(l, role.lightnessRange) : l;
  const targetC = role.chromaRange !== void 0 ? clampToRange$1(c, role.chromaRange) : c;
  const targetH = TargetHue.resolve(h2, role);
  const needsRangeNudge = targetL !== l || targetC !== c || targetH !== h2;
  const needsIntent = role.intent !== void 0 && candidate.hints?.intent !== role.intent;
  if (!needsRangeNudge && !needsIntent) {
    return candidate;
  }
  const nextHints = role.intent !== void 0 ? { ...candidate.hints, "intent": role.intent } : candidate.hints;
  return colorRecordFactory.fromOklch(
    targetL,
    targetC,
    targetH,
    { "alpha": candidate.alpha, "hints": nextHints, "sourceFormat": candidate.sourceFormat }
  );
}
function synthesizedHue(role) {
  if (role.hue !== void 0) {
    return (role.hue % 360 + 360) % 360;
  }
  return role.hueOffset ?? 0;
}
function synthesizeForRole(role) {
  const l = role.lightnessRange !== void 0 ? rangeCenter(role.lightnessRange) : 0.5;
  const c = role.chromaRange !== void 0 ? rangeCenter(role.chromaRange) : 0;
  const h2 = synthesizedHue(role);
  const hints = role.intent !== void 0 ? { "intent": role.intent } : void 0;
  return colorRecordFactory.fromOklch(l, c, h2, { "alpha": 1, "hints": hints, "sourceFormat": "oklch" });
}
class ResolveRoles {
  "name" = "resolve:roles";
  "manifest" = {
    "description": "Assigns colors to schema roles by hint match then OKLCH distance to range center, then nudges the assigned color into the role's declared ranges. Required roles are guaranteed populated and constraint-satisfying.",
    "name": "resolve:roles",
    "reads": ["colors", "input.roles"],
    "writes": ["roles", "metadata"]
  };
  run(state2, ctx) {
    if (state2.input.roles === void 0) {
      ctx.logger.debug(
        LogBody.create().component("ResolveRoles").operation("run").status(LOG_STATUS.SKIPPED).message("No role schema provided; skipping").context({}).build()
      );
      return;
    }
    const schema = state2.input.roles;
    const synthesized = [];
    for (const role of schema.roles) {
      if (role.derivedFrom !== void 0 && role.derivedFrom.length > 0) {
        continue;
      }
      const hintMatch = state2.colors.find((c) => {
        return c.hints?.role === role.name;
      });
      if (hintMatch !== void 0) {
        const resolved = nudgeIntoRole(hintMatch, role);
        state2.roles[role.name] = resolved;
        const isClamped = Math.abs(hintMatch.oklch.l - resolved.oklch.l) > 5e-3 || Math.abs(hintMatch.oklch.c - resolved.oklch.c) > 5e-3 || Math.abs(hintMatch.oklch.h - resolved.oklch.h) > 0.5;
        if (isClamped) {
          if (!state2.metadata["core:roleClamps"]) {
            state2.metadata["core:roleClamps"] = {};
          }
          state2.metadata["core:roleClamps"][role.name] = {
            "seedHex": hintMatch.hex,
            "seedOklch": hintMatch.oklch,
            "resolvedHex": resolved.hex,
            "resolvedOklch": resolved.oklch
          };
        }
        ctx.logger.debug(
          LogBody.create().component("ResolveRoles").operation("run").status(LOG_STATUS.SUCCESS).message("Role assigned by hint match").context({ "role": role.name }).build()
        );
        continue;
      }
      if (state2.colors.length === 0) {
        if (role.required === true) {
          state2.roles[role.name] = synthesizeForRole(role);
          synthesized.push(role.name);
          ctx.logger.debug(
            LogBody.create().component("ResolveRoles").operation("run").status(LOG_STATUS.PARTIAL).message("Role synthesized from constraints; no input colors").context({ "role": role.name }).build()
          );
        }
        continue;
      }
      let best;
      let bestDist = Infinity;
      const distances = {};
      for (const color of state2.colors) {
        const dist = distanceToRoleCenter(color, role);
        distances[color.hex] = dist;
        if (dist < bestDist) {
          bestDist = dist;
          best = color;
        }
      }
      if (!state2.metadata["core:roleDistances"]) {
        state2.metadata["core:roleDistances"] = {};
      }
      state2.metadata["core:roleDistances"][role.name] = distances;
      if (best !== void 0) {
        const resolved = nudgeIntoRole(best, role);
        state2.roles[role.name] = resolved;
        const isClamped = Math.abs(best.oklch.l - resolved.oklch.l) > 5e-3 || Math.abs(best.oklch.c - resolved.oklch.c) > 5e-3 || Math.abs(best.oklch.h - resolved.oklch.h) > 0.5;
        if (isClamped) {
          if (!state2.metadata["core:roleClamps"]) {
            state2.metadata["core:roleClamps"] = {};
          }
          state2.metadata["core:roleClamps"][role.name] = {
            "seedHex": best.hex,
            "seedOklch": best.oklch,
            "resolvedHex": resolved.hex,
            "resolvedOklch": resolved.oklch
          };
        }
        ctx.logger.debug(
          LogBody.create().component("ResolveRoles").operation("run").status(LOG_STATUS.SUCCESS).message("Role assigned by distance and nudged into range").context({
            "distance": bestDist,
            "role": role.name
          }).build()
        );
      } else if (role.required === true) {
        state2.roles[role.name] = synthesizeForRole(role);
        synthesized.push(role.name);
      }
    }
    if (synthesized.length > 0) {
      const existing = state2.metadata["core:rolesSynthesized"];
      const prior = Array.isArray(existing) ? existing : [];
      state2.metadata["core:rolesSynthesized"] = [...prior, ...synthesized];
    }
  }
}
const resolveRoles = new ResolveRoles();
const coreTasks = [
  intakeHex,
  intakeRgb,
  intakeHsl,
  intakeOklch,
  intakeLab,
  intakeNamed,
  intakeImagePixels,
  intakeP3,
  intakeAny,
  clampCount,
  clampOklch,
  resolveRoles,
  expandFamily,
  enforceContrast,
  deriveVariant,
  emitJson
];
function apcaLcTarget(pair, roles2) {
  const fgRecord = roles2[pair.foreground];
  const bgRecord = roles2[pair.background];
  if (fgRecord === void 0 || bgRecord === void 0) {
    return 75;
  }
  const fgIntent = fgRecord.hints?.intent;
  const bgIntent = bgRecord.hints?.intent;
  const isText = fgIntent === "text" || bgIntent === "text";
  const isBackground = fgIntent === "background" || bgIntent === "background";
  if (isText && isBackground) {
    return 75;
  }
  if (isText) {
    return 60;
  }
  return 45;
}
class EnforceApca {
  "name" = "enforce:apca";
  "manifest" = {
    "description": "Enforce APCA (WCAG 3 draft) Lc targets: Lc 75 body text, Lc 60 fluent text, Lc 45 non-text UI.",
    "name": "enforce:apca",
    "reads": ["input.roles.contrastPairs", "roles"],
    "writes": ["roles", "metadata['contrast:apca']"]
  };
  run(state2, ctx) {
    const pairs = state2.input.roles?.contrastPairs ?? [];
    const extraPairs = state2.input.contrast?.extra ?? [];
    const allPairs = [...pairs, ...extraPairs];
    const apcaPairs = allPairs.filter((p) => {
      return (p.algorithm ?? "wcag21") === "apca";
    });
    if (apcaPairs.length === 0) {
      return;
    }
    const results = [];
    for (const pair of apcaPairs) {
      const fgRecord = state2.roles[pair.foreground];
      const bgRecord = state2.roles[pair.background];
      if (fgRecord === void 0 || bgRecord === void 0) {
        ctx.logger.warn(
          LogBody.create().component("EnforceApca").operation("run").status(LOG_STATUS.INVALID).message("Role not found for pair").context({ "background": pair.background, "foreground": pair.foreground }).build()
        );
        continue;
      }
      const requiredLc = apcaLcTarget(pair, state2.roles);
      const beforeLc = Math.abs(contrastApca.apply(fgRecord, bgRecord));
      let currentFg = fgRecord;
      let current = beforeLc;
      let iterations = 0;
      const maxIterations = 25;
      while (current < requiredLc && iterations < maxIterations) {
        iterations++;
        currentFg = ensureContrast.apply(currentFg, bgRecord, requiredLc, "apca");
        current = Math.abs(contrastApca.apply(currentFg, bgRecord));
      }
      if (current < requiredLc) {
        ctx.logger.warn(
          LogBody.create().component("EnforceApca").operation("run").status(LOG_STATUS.PARTIAL).message("Pair could not reach required Lc after iterations").context({
            "achievedLc": current,
            "background": pair.background,
            "foreground": pair.foreground,
            "maxIterations": maxIterations,
            "requiredLc": requiredLc
          }).build()
        );
      }
      state2.roles[pair.foreground] = currentFg;
      results.push({
        "afterLc": current,
        "algorithm": "apca",
        "background": pair.background,
        "beforeLc": beforeLc,
        "foreground": pair.foreground,
        "pass": current >= requiredLc,
        "requiredLc": requiredLc
      });
    }
    state2.metadata["contrast:apca"] = { "pairs": results };
    ctx.logger.debug(
      LogBody.create().component("EnforceApca").operation("run").status(LOG_STATUS.SUCCESS).message("Processed APCA pairs").context({ "apcaMeta": state2.metadata["contrast:apca"], "pairCount": results.length }).build()
    );
  }
}
const enforceApca = new EnforceApca();
const protanopiaMatrix = {
  "matrix": [
    0.152286,
    1.052583,
    -0.204868,
    0.114503,
    0.786281,
    0.099216,
    -3882e-6,
    -0.048116,
    1.051998
  ],
  "name": "protanopia"
};
const deuteranopiaMatrix = {
  "matrix": [
    0.367322,
    0.860646,
    -0.227968,
    0.280085,
    0.672501,
    0.047413,
    -0.01182,
    0.04294,
    0.968881
  ],
  "name": "deuteranopia"
};
const tritanopiaMatrix = {
  "matrix": [
    1.255528,
    -0.076749,
    -0.178779,
    -0.078411,
    0.930809,
    0.147602,
    4733e-6,
    0.691367,
    0.3039
  ],
  "name": "tritanopia"
};
const achromatopsiaMatrix = {
  "matrix": [
    0.2126,
    0.7152,
    0.0722,
    0.2126,
    0.7152,
    0.0722,
    0.2126,
    0.7152,
    0.0722
  ],
  "name": "achromatopsia"
};
const cvdMatrices = [
  protanopiaMatrix,
  deuteranopiaMatrix,
  tritanopiaMatrix,
  achromatopsiaMatrix
];
const CVD_THRESHOLDS = {
  /* Achromatopsia: rod monochromacy preserves luminance contrast
     exactly, so the drop signal is identically 0 [WS82]. We never want
     this signal to fire on its own, hence threshold 0 (any non-zero
     numerical noise from gamma round-trip should not trigger).
     `minSimulatedContrast` is the only meaningful signal: a pair that
     looks legible only because of chromatic difference fails when
     reduced to grayscale. 3.0 is the [WCAG21] SC-1.4.11 non-text
     minimum. */
  "achromatopsia": { "dropMagnitude": 0, "minSimulatedContrast": 3 },
  /* Deuteranopia: same red/green confusion family as protanopia, same
     prevalence (~1 % of males [WONG11]). Same threshold by symmetry of
     the [VBM99] confusion-plane projection. */
  "deuteranopia": { "dropMagnitude": 0.5, "minSimulatedContrast": 3 },
  /* Protanopia: red/green confusion is the most prevalent CVD class
     (~1 % of males [WONG11]). 0.5 corresponds to the ΔE76 ≈ 2.3
     just-noticeable boundary [CIE76] when mapped to WCAG-21
     contrast-ratio space across the mid-luminance band. */
  "protanopia": { "dropMagnitude": 0.5, "minSimulatedContrast": 3 },
  /* Tritanopia: blue/yellow confusion, rarer (~0.01 % [WONG11]). [BVM97]
     uses the same two-half-plane model so the perceptible-difference
     threshold derivation mirrors the dichromacies above. */
  "tritanopia": { "dropMagnitude": 0.5, "minSimulatedContrast": 3 }
};
const SRGB_FORMATS = /* @__PURE__ */ new Set([
  "hex",
  "hsl",
  "imagePixel",
  "lab",
  "named",
  "rgb"
]);
class Matrix {
  static apply(cvd, r, g, b) {
    const m = cvd.matrix;
    const rp = m[0] * r + m[1] * g + m[2] * b;
    const gp = m[3] * r + m[4] * g + m[5] * b;
    const bp = m[6] * r + m[7] * g + m[8] * b;
    return [
      clamp01.apply(rp),
      clamp01.apply(gp),
      clamp01.apply(bp)
    ];
  }
}
function simulateColor(rgb, cvd) {
  const lin = srgbToLinear.apply(rgb.r, rgb.g, rgb.b);
  const [rp, gp, bp] = Matrix.apply(cvd, lin.r, lin.g, lin.b);
  const encoded = linearToSrgb.apply(rp, gp, bp);
  return { "b": encoded.b, "g": encoded.g, "r": encoded.r };
}
function simulatedLuminance(sim) {
  const lin = srgbToLinear.apply(sim.r, sim.g, sim.b);
  return 0.2126 * lin.r + 0.7152 * lin.g + 0.0722 * lin.b;
}
function simulatedContrast(fg, bg) {
  const l1 = simulatedLuminance(fg);
  const l2 = simulatedLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
function evaluateCvd(fgRgb, bgRgb, originalContrast) {
  const evals = [];
  for (const cvd of cvdMatrices) {
    const threshold = CVD_THRESHOLDS[cvd.name];
    const simFg = simulateColor(fgRgb, cvd);
    const simBg = simulateColor(bgRgb, cvd);
    const simContrast = simulatedContrast(simFg, simBg);
    const drop = originalContrast - simContrast;
    const exceedsDrop = Math.abs(drop) > threshold.dropMagnitude;
    const belowFloor = simContrast < threshold.minSimulatedContrast;
    evals.push({
      "belowFloor": belowFloor,
      "cvdType": cvd.name,
      "drop": drop,
      "exceedsDrop": exceedsDrop,
      "fail": exceedsDrop || belowFloor,
      "originalContrast": originalContrast,
      "simContrast": simContrast
    });
  }
  return evals;
}
function scoreCandidate(l, c, h2, bgRgb, failingTypes) {
  const rgb = oklchToRgbRaw.apply(l, c, h2);
  const trichromatContrast = simulatedContrast(rgb, bgRgb);
  let worstSim = Infinity;
  let allClear = true;
  for (const cvd of failingTypes) {
    const threshold = CVD_THRESHOLDS[cvd.name];
    const simFg = simulateColor(rgb, cvd);
    const simBg = simulateColor(bgRgb, cvd);
    const simContrast = simulatedContrast(simFg, simBg);
    const drop = trichromatContrast - simContrast;
    const exceedsDrop = Math.abs(drop) > threshold.dropMagnitude;
    const belowFloor = simContrast < threshold.minSimulatedContrast;
    if (exceedsDrop || belowFloor) {
      allClear = false;
    }
    if (simContrast < worstSim) {
      worstSim = simContrast;
    }
  }
  return { allClear, c, l, rgb, trichromatContrast, "worstSim": worstSim };
}
function correctForeground(fgRecord, bgRecord, failingTypes, baseline) {
  const fgL = fgRecord.oklch.l;
  const c = fgRecord.oklch.c;
  const h2 = fgRecord.oklch.h;
  const alpha = fgRecord.alpha;
  const hints = fgRecord.hints;
  const fmt = fgRecord.sourceFormat;
  const isSrgb = SRGB_FORMATS.has(fmt);
  const bgRgb = bgRecord.rgb;
  const step = fgL < bgRecord.oklch.l ? -0.02 : 0.02;
  let best = scoreCandidate(fgL, c, h2, bgRgb, failingTypes);
  let currentL = fgL;
  for (let i = 0; i < 50 && !best.allClear; i++) {
    const newL = clamp01.apply(currentL + step);
    const candidate = scoreCandidate(newL, c, h2, bgRgb, failingTypes);
    if (candidate.trichromatContrast >= baseline && candidate.worstSim > best.worstSim) {
      best = candidate;
    }
    currentL = newL;
    if (newL === 0 || newL === 1) {
      break;
    }
  }
  if (!best.allClear) {
    let currentC = best.c;
    for (let i = 0; i < 20 && !best.allClear; i++) {
      currentC = currentC * 0.9;
      const candidate = scoreCandidate(best.l, currentC, h2, bgRgb, failingTypes);
      if (candidate.trichromatContrast >= baseline && candidate.worstSim > best.worstSim) {
        best = candidate;
      }
    }
  }
  return isSrgb ? colorRecordFactory.fromRgb(best.rgb.r, best.rgb.g, best.rgb.b, { "alpha": alpha, "hints": hints, "sourceFormat": fmt }) : colorRecordFactory.fromOklch(best.l, best.c, h2, { "alpha": alpha, "hints": hints, "sourceFormat": fmt });
}
class EnforceCvdSimulate {
  "name" = "enforce:cvdSimulate";
  "manifest" = {
    "description": "CVD simulation against published thresholds: protanopia, deuteranopia, tritanopia, achromatopsia. Advisory by default; when input.contrast.cvdCorrect is true, also auto-corrects failing pairs and writes roles.",
    "name": "enforce:cvdSimulate",
    "reads": ["input.roles.contrastPairs", "input.contrast.cvdCorrect", "roles"],
    "writes": ["roles", "metadata['contrast:cvd']"]
  };
  run(state2, ctx) {
    const pairs = state2.input.roles?.contrastPairs ?? [];
    if (pairs.length === 0) {
      return;
    }
    const cvdCorrect2 = state2.input.contrast?.cvdCorrect === true;
    const warnings = [];
    const corrections = [];
    for (const pair of pairs) {
      const fgRecord = state2.roles[pair.foreground];
      const bgRecord = state2.roles[pair.background];
      if (fgRecord === void 0 || bgRecord === void 0) {
        continue;
      }
      const originalContrast = contrastWcag21.apply(fgRecord, bgRecord);
      const evals = evaluateCvd(fgRecord.rgb, bgRecord.rgb, originalContrast);
      const failing = evals.filter((e) => {
        return e.fail;
      });
      if (!cvdCorrect2 || failing.length === 0) {
        for (const e of failing) {
          warnings.push(pushWarning(pair.foreground, pair.background, e, ctx));
        }
        continue;
      }
      const failingMatrices = cvdMatrices.filter((cvd) => {
        return failing.some((e) => {
          return e.cvdType === cvd.name;
        });
      });
      const correctedFg = correctForeground(fgRecord, bgRecord, failingMatrices, originalContrast);
      const finalOriginalContrast = contrastWcag21.apply(correctedFg, bgRecord);
      const finalEvals = evaluateCvd(correctedFg.rgb, bgRecord.rgb, finalOriginalContrast);
      const finalFailing = finalEvals.filter((e) => {
        return e.fail;
      });
      for (const e of finalFailing) {
        warnings.push(pushWarning(pair.foreground, pair.background, e, ctx));
      }
      if (finalFailing.length > 0) {
        ctx.logger.warn(
          LogBody.create().component("EnforceCvdSimulate").operation("run").status(LOG_STATUS.PARTIAL).message("CVD correction could not clear every failing type").context({
            "background": pair.background,
            "foreground": pair.foreground,
            "remainingCvdTypes": finalFailing.map((e) => {
              return e.cvdType;
            })
          }).build()
        );
      }
      state2.roles[pair.foreground] = correctedFg;
      if (correctedFg.hex !== fgRecord.hex) {
        const failingNames = failing.map((e) => {
          return e.cvdType;
        });
        const remainingNames = finalFailing.map((e) => {
          return e.cvdType;
        });
        corrections.push({
          "background": pair.background,
          "cvdTypesFixed": failingNames.filter((name) => {
            return !remainingNames.includes(name);
          }),
          "cvdTypesRemaining": remainingNames,
          "foreground": pair.foreground
        });
      }
    }
    state2.metadata["contrast:cvd"] = cvdCorrect2 ? { "corrections": corrections, "warnings": warnings } : { "warnings": warnings };
    ctx.logger.debug(
      LogBody.create().component("EnforceCvdSimulate").operation("run").status(LOG_STATUS.SUCCESS).message("CVD simulation complete").context({
        "correctionCount": corrections.length,
        "cvdMeta": state2.metadata["contrast:cvd"],
        "warningCount": warnings.length
      }).build()
    );
  }
}
function pushWarning(foreground, background, e, ctx) {
  const threshold = CVD_THRESHOLDS[e.cvdType];
  const warning = {
    "background": background,
    "cvdType": e.cvdType,
    "drop": e.drop,
    "dropThreshold": threshold.dropMagnitude,
    "foreground": foreground,
    "minSimulatedContrast": threshold.minSimulatedContrast,
    "originalLuminanceContrast": e.originalContrast,
    "simulatedLuminanceContrast": e.simContrast
  };
  ctx.logger.warn(
    LogBody.create().component("EnforceCvdSimulate").operation("run").status(LOG_STATUS.PARTIAL).message("CVD advisory: pair fails perceptual-stability threshold").context({
      "background": background,
      "cvdType": e.cvdType,
      "drop": e.drop,
      "dropThreshold": threshold.dropMagnitude,
      "foreground": foreground,
      "minSimulatedContrast": threshold.minSimulatedContrast,
      "originalContrast": e.originalContrast,
      "reason": e.exceedsDrop ? "drop" : "floor",
      "simulatedContrast": e.simContrast
    }).build()
  );
  return warning;
}
const enforceCvdSimulate = new EnforceCvdSimulate();
function isTextPair(pair, roles2) {
  const fgRecord = roles2[pair.foreground];
  const bgRecord = roles2[pair.background];
  if (fgRecord === void 0 || bgRecord === void 0) {
    return false;
  }
  const fgIntent = fgRecord.hints?.intent;
  const bgIntent = bgRecord.hints?.intent;
  return (fgIntent === "text" || bgIntent === "text") && (fgIntent === "background" || bgIntent === "background");
}
class WcagRequiredRatio {
  "name" = "wcagRequiredRatio";
  apply(level, pair, roles2) {
    if (pair.minRatio > 0) {
      return pair.minRatio;
    }
    if (level === "aa") {
      if (isTextPair(pair, roles2)) {
        return pair.minRatio <= 3 ? 3 : 4.5;
      }
      return 3;
    }
    if (roles2[pair.foreground] === void 0 || roles2[pair.background] === void 0) {
      return 7;
    }
    if (isTextPair(pair, roles2)) {
      return 7;
    }
    return 4.5;
  }
}
const wcagRequiredRatio = new WcagRequiredRatio();
class EnforceWcagAa {
  "name" = "enforce:wcagAA";
  "manifest" = {
    "description": "Enforce WCAG 2.1 AA contrast (4.5:1 normal text, 3:1 large/UI) on all role pairs.",
    "name": "enforce:wcagAA",
    "reads": ["input.roles.contrastPairs", "roles"],
    "writes": ["roles", "metadata['contrast:aa']"]
  };
  run(state2, ctx) {
    const pairs = state2.input.roles?.contrastPairs ?? [];
    if (pairs.length === 0) {
      return;
    }
    const results = [];
    for (const pair of pairs) {
      const algo = pair.algorithm ?? "wcag21";
      if (algo !== "wcag21") {
        continue;
      }
      const fgRecord = state2.roles[pair.foreground];
      const bgRecord = state2.roles[pair.background];
      if (fgRecord === void 0 || bgRecord === void 0) {
        ctx.logger.warn(
          LogBody.create().component("EnforceWcagAa").operation("run").status(LOG_STATUS.INVALID).message("Role not found for pair").context({ "background": pair.background, "foreground": pair.foreground }).build()
        );
        continue;
      }
      const required = wcagRequiredRatio.apply("aa", pair, state2.roles);
      const before = contrastWcag21.apply(fgRecord, bgRecord);
      const currentFg = ensureContrast.apply(fgRecord, bgRecord, required, "wcag21");
      const current = contrastWcag21.apply(currentFg, bgRecord);
      if (current < required) {
        ctx.logger.warn(
          LogBody.create().component("EnforceWcagAa").operation("run").status(LOG_STATUS.PARTIAL).message("Pair could not reach required ratio").context({
            "achieved": current,
            "background": pair.background,
            "foreground": pair.foreground,
            "required": required
          }).build()
        );
      }
      state2.roles[pair.foreground] = currentFg;
      results.push({
        "after": current,
        "algorithm": "wcag21",
        "background": pair.background,
        "before": before,
        "foreground": pair.foreground,
        "pass": current >= required,
        "required": required
      });
    }
    state2.metadata["contrast:aa"] = { "pairs": results };
    ctx.logger.debug(
      LogBody.create().component("EnforceWcagAa").operation("run").status(LOG_STATUS.SUCCESS).message("Processed pairs").context({ "aaMeta": state2.metadata["contrast:aa"], "pairCount": results.length }).build()
    );
  }
}
const enforceWcagAa = new EnforceWcagAa();
class EnforceWcagAaa {
  "name" = "enforce:wcagAAA";
  "manifest" = {
    "description": "Enforce WCAG 2.1 AAA contrast (7:1 normal text, 4.5:1 large/UI) on all role pairs.",
    "name": "enforce:wcagAAA",
    "reads": ["input.roles.contrastPairs", "roles"],
    "writes": ["roles", "metadata['contrast:aaa']"]
  };
  run(state2, ctx) {
    const pairs = state2.input.roles?.contrastPairs ?? [];
    if (pairs.length === 0) {
      return;
    }
    const results = [];
    for (const pair of pairs) {
      const algo = pair.algorithm ?? "wcag21";
      if (algo !== "wcag21") {
        continue;
      }
      const fgRecord = state2.roles[pair.foreground];
      const bgRecord = state2.roles[pair.background];
      if (fgRecord === void 0 || bgRecord === void 0) {
        ctx.logger.warn(
          LogBody.create().component("EnforceWcagAaa").operation("run").status(LOG_STATUS.INVALID).message("Role not found for pair").context({ "background": pair.background, "foreground": pair.foreground }).build()
        );
        continue;
      }
      const required = wcagRequiredRatio.apply("aaa", pair, state2.roles);
      const before = contrastWcag21.apply(fgRecord, bgRecord);
      const currentFg = ensureContrast.apply(fgRecord, bgRecord, required, "wcag21");
      const current = contrastWcag21.apply(currentFg, bgRecord);
      if (current < required) {
        ctx.logger.warn(
          LogBody.create().component("EnforceWcagAaa").operation("run").status(LOG_STATUS.PARTIAL).message("Pair could not reach required ratio").context({
            "achieved": current,
            "background": pair.background,
            "foreground": pair.foreground,
            "required": required
          }).build()
        );
      }
      state2.roles[pair.foreground] = currentFg;
      results.push({
        "after": current,
        "algorithm": "wcag21",
        "background": pair.background,
        "before": before,
        "foreground": pair.foreground,
        "pass": current >= required,
        "required": required
      });
    }
    state2.metadata["contrast:aaa"] = { "pairs": results };
    ctx.logger.debug(
      LogBody.create().component("EnforceWcagAaa").operation("run").status(LOG_STATUS.SUCCESS).message("Processed pairs").context({ "aaaMeta": state2.metadata["contrast:aaa"], "pairCount": results.length }).build()
    );
  }
}
const enforceWcagAaa = new EnforceWcagAaa();
const wcagPairResultSchema = {
  "additionalProperties": false,
  "properties": {
    "after": { "type": "number" },
    "algorithm": { "enum": ["wcag21", "apca"], "type": "string" },
    "background": { "type": "string" },
    "before": { "type": "number" },
    "foreground": { "type": "string" },
    "pass": { "type": "boolean" },
    "required": { "type": "number" }
  },
  "type": "object"
};
const apcaPairResultSchema = {
  "additionalProperties": false,
  "properties": {
    "afterLc": { "type": "number" },
    "algorithm": { "enum": ["apca"], "type": "string" },
    "background": { "type": "string" },
    "beforeLc": { "type": "number" },
    "foreground": { "type": "string" },
    "pass": { "type": "boolean" },
    "requiredLc": { "type": "number" }
  },
  "type": "object"
};
const cvdWarningSchema = {
  "additionalProperties": false,
  "properties": {
    "background": { "type": "string" },
    "cvdType": { "type": "string" },
    "drop": { "type": "number" },
    "dropThreshold": { "type": "number" },
    "foreground": { "type": "string" },
    "minSimulatedContrast": { "type": "number" },
    "originalLuminanceContrast": { "type": "number" },
    "simulatedLuminanceContrast": { "type": "number" }
  },
  "type": "object"
};
const cvdCorrectionSchema = {
  "additionalProperties": false,
  "properties": {
    "background": { "type": "string" },
    "cvdTypesFixed": { "items": { "type": "string" }, "type": "array" },
    "cvdTypesRemaining": { "items": { "type": "string" }, "type": "array" },
    "foreground": { "type": "string" }
  },
  "type": "object"
};
const wcagMetadataSchema = {
  "properties": {
    "aa": {
      "additionalProperties": false,
      "properties": { "pairs": { "items": wcagPairResultSchema, "type": "array" } },
      "type": "object"
    },
    "aaa": {
      "additionalProperties": false,
      "properties": { "pairs": { "items": wcagPairResultSchema, "type": "array" } },
      "type": "object"
    },
    "apca": {
      "additionalProperties": false,
      "properties": { "pairs": { "items": apcaPairResultSchema, "type": "array" } },
      "type": "object"
    },
    "cvd": {
      "additionalProperties": false,
      "properties": {
        "corrections": { "items": cvdCorrectionSchema, "type": "array" },
        "warnings": { "items": cvdWarningSchema, "type": "array" }
      },
      "type": "object"
    }
  }
};
class ContrastPlugin {
  "name" = "contrast";
  "version" = "0.1.0";
  tasks() {
    return [
      enforceWcagAa,
      enforceWcagAaa,
      enforceApca,
      enforceCvdSimulate
    ];
  }
  schemas() {
    return {
      "metadata": {
        "contrast:aa": wcagMetadataSchema.properties.aa,
        "contrast:aaa": wcagMetadataSchema.properties.aaa,
        "contrast:apca": wcagMetadataSchema.properties.apca,
        "contrast:cvd": wcagMetadataSchema.properties.cvd
      }
    };
  }
}
const contrastPlugin = new ContrastPlugin();
class GalleryAssignRoles {
  "name" = "gallery:assignRoles";
  "manifest" = {
    "description": "Assign dominant colors to gallery roles: canvas, frame, accent, muted, text",
    "name": "gallery:assignRoles",
    "reads": ["colors"],
    "writes": ["roles"]
  };
  run(state2, ctx) {
    const colors2 = state2.colors;
    if (colors2.length === 0) {
      ctx.logger.warn(
        LogBody.create().component("GalleryAssignRoles").operation("run").status(LOG_STATUS.INVALID).message("state.colors is empty; cannot assign roles").context({}).build()
      );
      return;
    }
    ctx.logger.debug(
      LogBody.create().component("GalleryAssignRoles").operation("run").status(LOG_STATUS.SUCCESS).message("assigning gallery roles").context({ "colorCount": colors2.length }).build()
    );
    const canvas = colors2.reduce(
      (best, c) => {
        return c.oklch.l < best.oklch.l ? c : best;
      }
    );
    const frame = colors2.reduce((best, c) => {
      const d = Math.abs(c.oklch.l - 0.5);
      const bd = Math.abs(best.oklch.l - 0.5);
      return d < bd ? c : best;
    });
    const accent = colors2.reduce(
      (best, c) => {
        return c.oklch.c > best.oklch.c ? c : best;
      }
    );
    const nonNeutral = colors2.filter((c) => {
      return c.oklch.c > 0.02 && c !== accent;
    });
    const muteSource = nonNeutral.length > 0 ? nonNeutral : colors2;
    const muted = muteSource.reduce(
      (best, c) => {
        return c.oklch.c < best.oklch.c ? c : best;
      }
    );
    const text = this.deriveTextColor(canvas);
    state2.roles.canvas = canvas;
    state2.roles.frame = frame;
    state2.roles.accent = accent;
    state2.roles.muted = muted;
    state2.roles.text = text;
    ctx.logger.info(
      LogBody.create().component("GalleryAssignRoles").operation("run").status(LOG_STATUS.SUCCESS).message("roles assigned").context({
        "accent": accent.hex,
        "canvas": canvas.hex,
        "frame": frame.hex,
        "muted": muted.hex,
        "text": text.hex
      }).build()
    );
  }
  deriveTextColor(canvas) {
    if (canvas.oklch.l <= 0.5) {
      return oklchToRgb.apply(1, 0, 0, 1);
    }
    return oklchToRgb.apply(0, 0, 0, 1);
  }
}
const galleryAssignRoles = new GalleryAssignRoles();
function hasAnyWeight(colors2) {
  for (const c of colors2) {
    if (typeof c.hints?.weight === "number" && c.hints.weight > 0) {
      return true;
    }
  }
  return false;
}
const DELTA_E_INPUT_CAP_DEFAULT = 128;
function trimByWeightDescending(colors2, cap) {
  if (colors2.length <= cap) {
    return colors2;
  }
  const sorted = [...colors2].sort((a, b) => {
    return (b.hints?.weight ?? 1) - (a.hints?.weight ?? 1);
  });
  return sorted.slice(0, cap);
}
class GalleryExtract {
  "name" = "gallery:extract";
  "manifest" = {
    "description": "Reduce input records to K dominant colors via median-cut (weighted) or deltaE-merge clustering",
    "name": "gallery:extract",
    "reads": ["colors", "metadata.gallery"],
    "writes": ["colors", "metadata.gallery:dominantColors"]
  };
  run(state2, ctx) {
    const galleryConfig = state2.metadata.gallery;
    const k = galleryConfig?.k ?? 5;
    const algorithm = galleryConfig?.algorithm ?? "median-cut";
    ctx.logger.debug(
      LogBody.create().component("GalleryExtract").operation("run").status(LOG_STATUS.SUCCESS).message("extracting dominant colors").context({
        "algorithm": algorithm,
        "inputCount": state2.colors.length,
        "k": k
      }).build()
    );
    if (state2.colors.length === 0) {
      ctx.logger.warn(
        LogBody.create().component("GalleryExtract").operation("run").status(LOG_STATUS.INVALID).message("state.colors is empty; nothing to extract").context({}).build()
      );
      return;
    }
    const clamp2 = Math.min(k, state2.colors.length);
    let dominant;
    if (algorithm === "delta-e") {
      const cap = Math.max(8, Math.min(512, Math.floor(galleryConfig?.deltaECap ?? DELTA_E_INPUT_CAP_DEFAULT)));
      const trimmed = trimByWeightDescending(state2.colors, cap);
      if (trimmed.length < state2.colors.length) {
        ctx.logger.debug(
          LogBody.create().component("GalleryExtract").operation("run").status(LOG_STATUS.PARTIAL).message("trimmed delta-E input by weight").context({
            "after": trimmed.length,
            "before": state2.colors.length,
            "cap": cap
          }).build()
        );
      }
      dominant = clusterDeltaEMerge.apply(trimmed, clamp2);
    } else if (hasAnyWeight(state2.colors)) {
      dominant = clusterMedianCutWeighted.apply(state2.colors, clamp2);
    } else {
      dominant = clusterMedianCut.apply(state2.colors, clamp2);
    }
    state2.metadata["gallery:dominantColors"] = dominant;
    state2.colors.splice(0, state2.colors.length, ...dominant);
    ctx.logger.info(
      LogBody.create().component("GalleryExtract").operation("run").status(LOG_STATUS.SUCCESS).message("extraction complete").context({
        "algorithm": algorithm,
        "dominantCount": dominant.length
      }).build()
    );
  }
}
const galleryExtract = new GalleryExtract();
class GalleryHarmonize {
  "name" = "gallery:harmonize";
  "manifest" = {
    "description": "Shift accent hue by 30° when deltaE2000 vs frame is < 10",
    "name": "gallery:harmonize",
    "reads": ["roles", "metadata.gallery"],
    "writes": ["roles.accent", "metadata.gallery:harmonized"]
  };
  run(state2, ctx) {
    const accent = state2.roles.accent;
    const frame = state2.roles.frame;
    if (accent === void 0 || frame === void 0) {
      ctx.logger.warn(
        LogBody.create().component("GalleryHarmonize").operation("run").status(LOG_STATUS.SKIPPED).message("accent or frame role missing; skipping harmonize").context({}).build()
      );
      state2.metadata["gallery:harmonized"] = false;
      return;
    }
    const galleryConfig = state2.metadata.gallery;
    const threshold = galleryConfig?.harmonizeThreshold ?? 10;
    const deltaE = deltaE2000.apply(accent, frame);
    ctx.logger.debug(
      LogBody.create().component("GalleryHarmonize").operation("run").status(LOG_STATUS.SUCCESS).message("deltaE2000 between accent and frame").context({ "deltaE": deltaE, "threshold": threshold }).build()
    );
    if (deltaE >= threshold) {
      ctx.logger.info(
        LogBody.create().component("GalleryHarmonize").operation("run").status(LOG_STATUS.SKIPPED).message("accent hue is sufficiently distinct; no shift needed").context({ "deltaE": deltaE }).build()
      );
      state2.metadata["gallery:harmonized"] = false;
      return;
    }
    const accentHue = accent.oklch.h;
    const frameHue = frame.oklch.h;
    const diff2 = (accentHue - frameHue + 540) % 360 - 180;
    const shift = diff2 > 0 ? 30 : -30;
    const newAccent = hueShift.apply(accent, shift);
    state2.roles.accent = newAccent;
    state2.metadata["gallery:harmonized"] = true;
    state2.metadata["gallery:harmonizeDetails"] = {
      "after": newAccent.hex,
      "before": accent.hex,
      "deltaE": deltaE,
      "hueShift": shift
    };
    ctx.logger.info(
      LogBody.create().component("GalleryHarmonize").operation("run").status(LOG_STATUS.SUCCESS).message("accent hue shifted").context({
        "after": newAccent.hex,
        "before": accent.hex,
        "deltaE": deltaE,
        "shift": shift
      }).build()
    );
  }
}
const galleryHarmonize = new GalleryHarmonize();
const DEFAULT_BITS_PER_CHANNEL = 5;
function packBin(r, g, b, bits) {
  const levels = 1 << bits;
  const denom = 256 / levels;
  const ri = Math.min(levels - 1, Math.floor(r * 255 / denom));
  const gi = Math.min(levels - 1, Math.floor(g * 255 / denom));
  const bi = Math.min(levels - 1, Math.floor(b * 255 / denom));
  return ri << 2 * bits | gi << bits | bi;
}
class GalleryHistogram {
  "name" = "gallery:histogram";
  "manifest" = {
    "description": "Quantise pixels into a 5-bit-per-channel histogram; emits weighted records keyed by bin centroid.",
    "name": "gallery:histogram",
    "reads": ["colors"],
    "writes": ["colors", "metadata.gallery:histogram"]
  };
  run(state2, ctx) {
    if (state2.colors.length === 0) {
      ctx.logger.warn(
        LogBody.create().component("GalleryHistogram").operation("run").status(LOG_STATUS.INVALID).message("state.colors is empty; nothing to histogram").context({}).build()
      );
      return;
    }
    const galleryConfig = state2.metadata.gallery;
    const rawBits = galleryConfig?.histogramBits ?? DEFAULT_BITS_PER_CHANNEL;
    const bits = Math.max(3, Math.min(7, Math.floor(rawBits)));
    const lRange = galleryConfig?.lightnessRange ?? [0, 1];
    const cRange = galleryConfig?.chromaRange ?? [0, 0.5];
    const bins = /* @__PURE__ */ new Map();
    let totalPixels = 0;
    let droppedFiltered = 0;
    for (const c of state2.colors) {
      if (c.alpha === 0) {
        continue;
      }
      if (c.oklch.l < lRange[0] || c.oklch.l > lRange[1]) {
        droppedFiltered++;
        continue;
      }
      if (c.oklch.c < cRange[0] || c.oklch.c > cRange[1]) {
        droppedFiltered++;
        continue;
      }
      const w = typeof c.hints?.weight === "number" && c.hints.weight > 0 ? c.hints.weight : 1;
      const key = packBin(c.rgb.r, c.rgb.g, c.rgb.b, bits);
      const existing = bins.get(key);
      if (existing === void 0) {
        bins.set(key, {
          "aSum": c.alpha * w,
          "bSum": c.rgb.b * w,
          "gSum": c.rgb.g * w,
          "rSum": c.rgb.r * w,
          "weight": w
        });
      } else {
        existing.rSum += c.rgb.r * w;
        existing.gSum += c.rgb.g * w;
        existing.bSum += c.rgb.b * w;
        existing.aSum += c.alpha * w;
        existing.weight += w;
      }
      totalPixels += w;
    }
    const records = [];
    const binSummary = [];
    for (const acc of bins.values()) {
      const r = acc.rSum / acc.weight;
      const g = acc.gSum / acc.weight;
      const b = acc.bSum / acc.weight;
      const a = acc.aSum / acc.weight;
      const record = colorRecordFactory.fromRgb(r, g, b, { "alpha": a, "hints": { "weight": acc.weight }, "sourceFormat": "imagePixel" });
      records.push(record);
      binSummary.push({ "hex": record.hex, "weight": acc.weight });
    }
    binSummary.sort((x, y) => {
      return y.weight - x.weight;
    });
    state2.metadata["gallery:histogram"] = {
      "binCount": binSummary.length,
      "bins": binSummary,
      "totalPixels": totalPixels
    };
    state2.colors.splice(0, state2.colors.length, ...records);
    ctx.logger.info(
      LogBody.create().component("GalleryHistogram").operation("run").status(LOG_STATUS.SUCCESS).message("histogram built").context({
        "bins": binSummary.length,
        "bitsPerChannel": bits,
        "droppedFiltered": droppedFiltered,
        "inputPixels": totalPixels
      }).build()
    );
  }
}
const galleryHistogram = new GalleryHistogram();
const galleryHistogramSchema = {
  "additionalProperties": false,
  "properties": {
    "binCount": { "minimum": 0, "type": "number" },
    "bins": { "type": "array" },
    "totalPixels": { "minimum": 0, "type": "number" }
  },
  "type": "object"
};
const galleryDominantColorsSchema = {
  "type": "array"
};
const galleryHarmonizedSchema = {
  "type": "boolean"
};
class ImagePlugin {
  "name" = "image";
  "version" = "0.2.0";
  tasks() {
    return [galleryHistogram, galleryExtract, galleryAssignRoles, galleryHarmonize];
  }
  schemas() {
    return {
      "metadata": {
        "gallery:dominantColors": galleryDominantColorsSchema,
        "gallery:harmonized": galleryHarmonizedSchema,
        "gallery:histogram": galleryHistogramSchema
      }
    };
  }
}
const imagePlugin = new ImagePlugin();
class IntakeHexHint {
  "name" = "intake:hexHint";
  "manifest" = {
    "description": "Parses hex strings or {hex, role} pin objects into ColorRecords, attaching hints.role when a role is pinned.",
    "name": "intake:hexHint",
    "reads": ["input.colors"],
    "writes": ["colors"]
  };
  run(state2, _ctx) {
    for (const raw of state2.input.colors) {
      const isPin = typeof raw === "object" && raw !== null;
      const hex = isPin ? raw.hex : raw;
      const role = isPin ? raw.role : void 0;
      state2.colors.push(colorRecordFactory.fromHex(hex, role !== void 0 ? { "hints": { "role": role } } : void 0));
    }
  }
}
const intakeHexHint = new IntakeHexHint();
function clampToRange(value, range) {
  if (value < range[0]) {
    return range[0];
  }
  if (value > range[1]) {
    return range[1];
  }
  return value;
}
function nudgeKeepingHue(hex, role) {
  const candidate = colorRecordFactory.fromHex(hex);
  const { c, h: h2, l } = candidate.oklch;
  const targetL = role.lightnessRange !== void 0 ? clampToRange(l, role.lightnessRange) : l;
  const targetC = role.chromaRange !== void 0 ? clampToRange(c, role.chromaRange) : c;
  return colorRecordFactory.fromOklch(targetL, targetC, h2, { "alpha": candidate.alpha });
}
class PinDerivedRoles {
  "name" = "pin:derivedRoles";
  "manifest" = {
    "description": "Assigns hint-pinned colors onto derivedFrom roles that ResolveRoles skipped, so a pin overrides hue-rotation instead of being silently discarded by ExpandFamily.",
    "name": "pin:derivedRoles",
    "reads": ["colors", "input.roles", "roles"],
    "writes": ["roles"]
  };
  run(state2, _ctx) {
    if (state2.input.roles === void 0) {
      return;
    }
    for (const role of state2.input.roles.roles) {
      if (role.derivedFrom === void 0 || role.derivedFrom === "") {
        continue;
      }
      if (state2.roles[role.name] !== void 0) {
        continue;
      }
      const hintMatch = state2.colors.find((c) => {
        return c.hints?.role === role.name;
      });
      if (hintMatch === void 0) {
        continue;
      }
      state2.roles[role.name] = nudgeKeepingHue(hintMatch.hex, role);
    }
  }
}
const pinDerivedRoles = new PinDerivedRoles();
const iridis4Dark = {
  "contrastPairs": [
    { "algorithm": "wcag21", "background": "background", "foreground": "text", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "background", "foreground": "brand", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "background", "foreground": "muted", "minRatio": 4.5 }
  ],
  "description": "Minimal four-role schema (dark framing). Background, text, brand, muted.",
  "name": "iridis-4-dark",
  "roles": [
    { "chromaRange": [0, 0.04], "intent": "background", "lightnessRange": [0.04, 0.14], "name": "background", "required": true },
    { "chromaRange": [0, 0.04], "intent": "text", "lightnessRange": [0.85, 0.96], "name": "text", "required": true },
    { "chromaRange": [0.12, 0.3], "intent": "accent", "lightnessRange": [0.55, 0.78], "name": "brand", "required": true },
    { "chromaRange": [0, 0.06], "intent": "muted", "lightnessRange": [0.5, 0.68], "name": "muted" }
  ]
};
const iridis4Light = {
  "contrastPairs": [
    { "algorithm": "wcag21", "background": "background", "foreground": "text", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "background", "foreground": "brand", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "background", "foreground": "muted", "minRatio": 4.5 }
  ],
  "description": "Minimal four-role schema (light framing). Background, text, brand, muted.",
  "name": "iridis-4-light",
  "roles": [
    { "chromaRange": [0, 0.03], "intent": "background", "lightnessRange": [0.94, 0.99], "name": "background", "required": true },
    { "chromaRange": [0, 0.04], "intent": "text", "lightnessRange": [0.1, 0.22], "name": "text", "required": true },
    { "chromaRange": [0.14, 0.32], "intent": "accent", "lightnessRange": [0.4, 0.58], "name": "brand", "required": true },
    { "chromaRange": [0, 0.06], "intent": "muted", "lightnessRange": [0.4, 0.55], "name": "muted" }
  ]
};
const iridis8Dark = {
  "contrastPairs": [
    ...iridis4Dark.contrastPairs ?? [],
    { "algorithm": "wcag21", "background": "surface", "foreground": "text", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "bg-soft", "foreground": "text", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "brand", "foreground": "on-brand", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "background", "foreground": "divider", "minRatio": 3 }
  ],
  "description": "Eight-role schema (dark framing). Adds surface, bgSoft, divider, onBrand.",
  "name": "iridis-8-dark",
  "roles": [
    ...iridis4Dark.roles,
    { "chromaRange": [0, 0.06], "derivedFrom": "background", "intent": "background", "lightnessRange": [0.08, 0.18], "name": "surface", "required": true },
    { "chromaRange": [0, 0.08], "derivedFrom": "background", "intent": "background", "lightnessRange": [0.1, 0.22], "name": "bg-soft" },
    { "chromaRange": [0, 0.06], "derivedFrom": "background", "intent": "muted", "lightnessRange": [0.18, 0.32], "name": "divider" },
    { "chromaRange": [0, 0.02], "derivedFrom": "brand", "intent": "text", "lightnessRange": [0.04, 0.14], "name": "on-brand", "required": true }
  ]
};
const iridis8Light = {
  "contrastPairs": [
    ...iridis4Light.contrastPairs ?? [],
    { "algorithm": "wcag21", "background": "surface", "foreground": "text", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "bg-soft", "foreground": "text", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "brand", "foreground": "on-brand", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "background", "foreground": "divider", "minRatio": 3 }
  ],
  "description": "Eight-role schema (light framing). Adds surface, bg-soft, divider, on-brand.",
  "name": "iridis-8-light",
  "roles": [
    ...iridis4Light.roles,
    { "chromaRange": [0, 0.04], "derivedFrom": "background", "intent": "background", "lightnessRange": [0.88, 0.96], "name": "surface", "required": true },
    { "chromaRange": [0, 0.04], "derivedFrom": "background", "intent": "background", "lightnessRange": [0.9, 0.98], "name": "bg-soft" },
    { "chromaRange": [0, 0.04], "derivedFrom": "background", "intent": "muted", "lightnessRange": [0.72, 0.86], "name": "divider" },
    { "chromaRange": [0, 0.02], "derivedFrom": "brand", "intent": "text", "lightnessRange": [0.97, 1], "name": "on-brand", "required": true }
  ]
};
const iridis12Dark = {
  "contrastPairs": [
    ...iridis8Dark.contrastPairs ?? [],
    { "algorithm": "wcag21", "background": "background", "foreground": "success", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "background", "foreground": "warning", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "background", "foreground": "error", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "bg-soft", "foreground": "syntax-keyword", "minRatio": 4.5 }
  ],
  "description": "Twelve-role schema (dark framing). Adds success, warning, error, syntaxKeyword.",
  "name": "iridis-12-dark",
  "roles": [
    ...iridis8Dark.roles,
    { "chromaRange": [0.14, 0.28], "derivedFrom": "brand", "hueOffset": 120, "intent": "positive", "lightnessRange": [0.65, 0.78], "name": "success" },
    { "chromaRange": [0.16, 0.28], "derivedFrom": "brand", "hueOffset": 85, "intent": "positive", "lightnessRange": [0.7, 0.82], "name": "warning" },
    { "chromaRange": [0.18, 0.3], "intent": "critical", "lightnessRange": [0.62, 0.76], "name": "error" },
    { "chromaRange": [0.14, 0.28], "derivedFrom": "brand", "intent": "accent", "lightnessRange": [0.68, 0.82], "name": "syntax-keyword" }
  ]
};
const iridis12Light = {
  "contrastPairs": [
    ...iridis8Light.contrastPairs ?? [],
    { "algorithm": "wcag21", "background": "background", "foreground": "success", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "background", "foreground": "warning", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "background", "foreground": "error", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "bg-soft", "foreground": "syntax-keyword", "minRatio": 4.5 }
  ],
  "description": "Twelve-role schema (light framing). Adds success, warning, error, syntaxKeyword.",
  "name": "iridis-12-light",
  "roles": [
    ...iridis8Light.roles,
    { "chromaRange": [0.16, 0.3], "derivedFrom": "brand", "hueOffset": 120, "intent": "positive", "lightnessRange": [0.4, 0.52], "name": "success" },
    { "chromaRange": [0.18, 0.3], "derivedFrom": "brand", "hueOffset": 85, "intent": "positive", "lightnessRange": [0.5, 0.62], "name": "warning" },
    { "chromaRange": [0.2, 0.32], "intent": "critical", "lightnessRange": [0.4, 0.55], "name": "error" },
    { "chromaRange": [0.16, 0.3], "derivedFrom": "brand", "intent": "accent", "lightnessRange": [0.42, 0.56], "name": "syntax-keyword" }
  ]
};
const iridis16Dark = {
  "contrastPairs": [
    ...iridis12Dark.contrastPairs ?? [],
    { "algorithm": "wcag21", "background": "bg-soft", "foreground": "syntax-string", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "bg-soft", "foreground": "syntax-number", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "bg-soft", "foreground": "syntax-function", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "bg-soft", "foreground": "syntax-type", "minRatio": 4.5 }
  ],
  "description": "Full sixteen-role schema (dark framing). Complete chrome + status + syntax theme.",
  "name": "iridis-16-dark",
  "roles": [
    ...iridis12Dark.roles,
    { "chromaRange": [0.14, 0.26], "derivedFrom": "brand", "hueOffset": 120, "intent": "accent", "lightnessRange": [0.7, 0.85], "name": "syntax-string" },
    { "chromaRange": [0.14, 0.28], "derivedFrom": "brand", "hueOffset": 60, "intent": "accent", "lightnessRange": [0.7, 0.85], "name": "syntax-number" },
    { "chromaRange": [0.12, 0.24], "derivedFrom": "brand", "hueOffset": 180, "intent": "accent", "lightnessRange": [0.68, 0.82], "name": "syntax-function" },
    { "chromaRange": [0.1, 0.22], "derivedFrom": "brand", "hueOffset": 210, "intent": "accent", "lightnessRange": [0.7, 0.84], "name": "syntax-type" }
  ]
};
const iridis16Light = {
  "contrastPairs": [
    ...iridis12Light.contrastPairs ?? [],
    { "algorithm": "wcag21", "background": "bg-soft", "foreground": "syntax-string", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "bg-soft", "foreground": "syntax-number", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "bg-soft", "foreground": "syntax-function", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "bg-soft", "foreground": "syntax-type", "minRatio": 4.5 }
  ],
  "description": "Full sixteen-role schema (light framing). Complete chrome + status + syntax theme.",
  "name": "iridis-16-light",
  "roles": [
    ...iridis12Light.roles,
    { "chromaRange": [0.14, 0.26], "derivedFrom": "brand", "hueOffset": 120, "intent": "accent", "lightnessRange": [0.4, 0.52], "name": "syntax-string" },
    { "chromaRange": [0.16, 0.28], "derivedFrom": "brand", "hueOffset": 60, "intent": "accent", "lightnessRange": [0.45, 0.58], "name": "syntax-number" },
    { "chromaRange": [0.14, 0.26], "derivedFrom": "brand", "hueOffset": 180, "intent": "accent", "lightnessRange": [0.4, 0.52], "name": "syntax-function" },
    { "chromaRange": [0.12, 0.22], "derivedFrom": "brand", "hueOffset": 210, "intent": "accent", "lightnessRange": [0.4, 0.52], "name": "syntax-type" }
  ]
};
const iridis32Dark = {
  "contrastPairs": [
    ...iridis16Dark.contrastPairs ?? [],
    { "algorithm": "wcag21", "background": "background", "foreground": "text-strong", "minRatio": 7 },
    { "algorithm": "wcag21", "background": "background", "foreground": "text-subtle", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "background", "foreground": "link", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "background", "foreground": "link-hover", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "background", "foreground": "info", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "background", "foreground": "accent-alt", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "code-bg", "foreground": "syntax-tag", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "code-bg", "foreground": "syntax-attribute", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "code-bg", "foreground": "syntax-operator", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "code-bg", "foreground": "syntax-class", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "code-bg", "foreground": "syntax-comment", "minRatio": 3 },
    { "algorithm": "wcag21", "background": "code-bg", "foreground": "syntax-punctuation", "minRatio": 3 }
  ],
  "description": "Thirty-two-role schema (dark framing). Adds emphasis tiers, interaction colors, chrome variants, and extended syntax tokens.",
  "name": "iridis-32-dark",
  "roles": [
    ...iridis16Dark.roles,
    /* Emphasis tiers: text-strong reads as primary headings, text-subtle as captions / metadata. */
    { "chromaRange": [0, 0.03], "derivedFrom": "text", "intent": "text", "lightnessRange": [0.92, 0.99], "name": "text-strong" },
    { "chromaRange": [0, 0.04], "derivedFrom": "text", "intent": "muted", "lightnessRange": [0.62, 0.74], "name": "text-subtle" },
    /* Interaction family: link/link-hover for anchors, focus-ring for a11y outlines. */
    { "chromaRange": [0.14, 0.28], "derivedFrom": "brand", "hueOffset": -15, "intent": "link", "lightnessRange": [0.62, 0.78], "name": "link" },
    { "chromaRange": [0.16, 0.3], "derivedFrom": "brand", "hueOffset": -15, "intent": "link", "lightnessRange": [0.72, 0.86], "name": "link-hover" },
    { "chromaRange": [0.2, 0.34], "derivedFrom": "brand", "intent": "accent", "lightnessRange": [0.6, 0.75], "name": "focus-ring" },
    /* Chrome variants: overlays, alternate borders, code surfaces. */
    { "chromaRange": [0, 0.04], "intent": "background", "lightnessRange": [0.02, 0.1], "name": "overlay" },
    { "chromaRange": [0, 0.06], "derivedFrom": "divider", "intent": "muted", "lightnessRange": [0.22, 0.34], "name": "border" },
    { "chromaRange": [0, 0.08], "derivedFrom": "divider", "intent": "muted", "lightnessRange": [0.32, 0.46], "name": "border-strong" },
    { "chromaRange": [0, 0.04], "derivedFrom": "bg-soft", "intent": "background", "lightnessRange": [0.08, 0.16], "name": "code-bg" },
    /* Status family: info completes the warning/error/success quadrant. */
    { "chromaRange": [0.16, 0.28], "derivedFrom": "brand", "hueOffset": -60, "intent": "accent", "lightnessRange": [0.55, 0.72], "name": "info" },
    /* Secondary accent: pairs with brand for two-color emphasis. */
    { "chromaRange": [0.14, 0.26], "derivedFrom": "brand", "hueOffset": 150, "intent": "accent", "lightnessRange": [0.58, 0.74], "name": "accent-alt" },
    /* Extended syntax: comment / tag / attribute / operator / class / punctuation. */
    { "chromaRange": [0, 0.06], "derivedFrom": "muted", "intent": "muted", "lightnessRange": [0.48, 0.6], "name": "syntax-comment" },
    { "chromaRange": [0.14, 0.26], "derivedFrom": "brand", "hueOffset": 240, "intent": "accent", "lightnessRange": [0.68, 0.82], "name": "syntax-tag" },
    { "chromaRange": [0.12, 0.24], "derivedFrom": "brand", "hueOffset": 270, "intent": "accent", "lightnessRange": [0.68, 0.82], "name": "syntax-attribute" },
    { "chromaRange": [0.1, 0.22], "derivedFrom": "brand", "hueOffset": 300, "intent": "accent", "lightnessRange": [0.7, 0.84], "name": "syntax-operator" },
    { "chromaRange": [0.14, 0.26], "derivedFrom": "brand", "hueOffset": 30, "intent": "accent", "lightnessRange": [0.7, 0.84], "name": "syntax-class" },
    { "chromaRange": [0, 0.08], "derivedFrom": "muted", "intent": "muted", "lightnessRange": [0.58, 0.72], "name": "syntax-punctuation" }
  ]
};
const iridis32Light = {
  "contrastPairs": [
    ...iridis16Light.contrastPairs ?? [],
    { "algorithm": "wcag21", "background": "background", "foreground": "text-strong", "minRatio": 7 },
    { "algorithm": "wcag21", "background": "background", "foreground": "text-subtle", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "background", "foreground": "link", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "background", "foreground": "link-hover", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "background", "foreground": "info", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "background", "foreground": "accent-alt", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "code-bg", "foreground": "syntax-tag", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "code-bg", "foreground": "syntax-attribute", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "code-bg", "foreground": "syntax-operator", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "code-bg", "foreground": "syntax-class", "minRatio": 4.5 },
    { "algorithm": "wcag21", "background": "code-bg", "foreground": "syntax-comment", "minRatio": 3 },
    { "algorithm": "wcag21", "background": "code-bg", "foreground": "syntax-punctuation", "minRatio": 3 }
  ],
  "description": "Thirty-two-role schema (light framing). Adds emphasis tiers, interaction colors, chrome variants, and extended syntax tokens.",
  "name": "iridis-32-light",
  "roles": [
    ...iridis16Light.roles,
    { "chromaRange": [0, 0.04], "derivedFrom": "text", "intent": "text", "lightnessRange": [0.04, 0.12], "name": "text-strong" },
    { "chromaRange": [0, 0.05], "derivedFrom": "text", "intent": "muted", "lightnessRange": [0.32, 0.46], "name": "text-subtle" },
    { "chromaRange": [0.14, 0.28], "derivedFrom": "brand", "hueOffset": -15, "intent": "link", "lightnessRange": [0.36, 0.5], "name": "link" },
    { "chromaRange": [0.16, 0.3], "derivedFrom": "brand", "hueOffset": -15, "intent": "link", "lightnessRange": [0.28, 0.42], "name": "link-hover" },
    { "chromaRange": [0.2, 0.34], "derivedFrom": "brand", "intent": "accent", "lightnessRange": [0.4, 0.58], "name": "focus-ring" },
    { "chromaRange": [0, 0.03], "intent": "background", "lightnessRange": [0.85, 0.94], "name": "overlay" },
    { "chromaRange": [0, 0.05], "derivedFrom": "divider", "intent": "muted", "lightnessRange": [0.72, 0.84], "name": "border" },
    { "chromaRange": [0, 0.06], "derivedFrom": "divider", "intent": "muted", "lightnessRange": [0.6, 0.72], "name": "border-strong" },
    { "chromaRange": [0, 0.03], "derivedFrom": "bg-soft", "intent": "background", "lightnessRange": [0.92, 0.97], "name": "code-bg" },
    { "chromaRange": [0.16, 0.28], "derivedFrom": "brand", "hueOffset": -60, "intent": "accent", "lightnessRange": [0.36, 0.5], "name": "info" },
    { "chromaRange": [0.14, 0.26], "derivedFrom": "brand", "hueOffset": 150, "intent": "accent", "lightnessRange": [0.36, 0.5], "name": "accent-alt" },
    { "chromaRange": [0, 0.06], "derivedFrom": "muted", "intent": "muted", "lightnessRange": [0.45, 0.58], "name": "syntax-comment" },
    { "chromaRange": [0.14, 0.26], "derivedFrom": "brand", "hueOffset": 240, "intent": "accent", "lightnessRange": [0.38, 0.52], "name": "syntax-tag" },
    { "chromaRange": [0.12, 0.24], "derivedFrom": "brand", "hueOffset": 270, "intent": "accent", "lightnessRange": [0.38, 0.52], "name": "syntax-attribute" },
    { "chromaRange": [0.1, 0.22], "derivedFrom": "brand", "hueOffset": 300, "intent": "accent", "lightnessRange": [0.4, 0.52], "name": "syntax-operator" },
    { "chromaRange": [0.14, 0.26], "derivedFrom": "brand", "hueOffset": 30, "intent": "accent", "lightnessRange": [0.38, 0.52], "name": "syntax-class" },
    { "chromaRange": [0, 0.08], "derivedFrom": "muted", "intent": "muted", "lightnessRange": [0.4, 0.55], "name": "syntax-punctuation" }
  ]
};
const roleSchemaByName = {
  "iridis-12": { "dark": iridis12Dark, "light": iridis12Light },
  "iridis-16": { "dark": iridis16Dark, "light": iridis16Light },
  "iridis-32": { "dark": iridis32Dark, "light": iridis32Light },
  "iridis-4": { "dark": iridis4Dark, "light": iridis4Light },
  "iridis-8": { "dark": iridis8Dark, "light": iridis8Light }
};
const ALIAS_SOURCE = {
  "error": ["error", "brand"],
  "info": ["info", "brand"],
  "neutral": ["muted", "text", "brand"],
  "primary": ["brand"],
  "secondary": ["accent-alt", "brand"],
  "success": ["success", "brand"],
  "warning": ["warning", "brand"]
};
const SHORTCUT_SOURCE = {
  "--ui-bg": ["background"],
  "--ui-bg-elevated": ["surface", "bg-soft", "background"],
  "--ui-bg-muted": ["bg-soft", "surface", "background"],
  "--ui-border": ["border", "divider", "muted"],
  "--ui-border-accented": ["border-strong", "border", "muted"],
  "--ui-border-muted": ["divider", "border", "muted"],
  "--ui-primary": ["brand"],
  "--ui-primary-contrast": ["on-brand", "brand-contrast", "background"],
  "--ui-error-contrast": ["on-error", "error-contrast", "background"],
  "--ui-success-contrast": ["on-success", "success-contrast", "background"],
  "--ui-warning-contrast": ["on-warning", "warning-contrast", "background"],
  "--ui-info-contrast": ["on-info", "info-contrast", "background"],
  "--ui-text": ["text"],
  "--ui-text-dimmed": ["muted", "text-subtle", "text"],
  "--ui-text-highlighted": ["text-strong", "text"],
  "--ui-text-muted": ["text-subtle", "muted", "text"]
};
function pick(roles2, candidates) {
  for (const c of candidates) {
    if (roles2[c] !== void 0 && roles2[c] !== "") {
      return roles2[c];
    }
  }
  return void 0;
}
class Tokens {
  static SHADE_KEYS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  /**
   * Map engine output to Nuxt UI CSS variables. `roles` is `state.roles` flattened
   * to role→hex; `scales` is `state.variants` flattened to shade→role→hex.
   */
  static mapFromEngine(roles2, scales2) {
    const tokens = {};
    for (const [alias, candidates] of Object.entries(ALIAS_SOURCE)) {
      for (const shade of Tokens.SHADE_KEYS) {
        const perShade = scales2[shade];
        if (perShade === void 0) {
          continue;
        }
        const hex = pick(perShade, candidates);
        if (hex !== void 0) {
          tokens[`--ui-color-${alias}-${shade}`] = hex;
        }
      }
    }
    for (const [cssVar, candidates] of Object.entries(SHORTCUT_SOURCE)) {
      const hex = pick(roles2, candidates);
      if (hex !== void 0) {
        tokens[cssVar] = hex;
      }
    }
    return tokens;
  }
  /** Serializes engine tokens as a highly specific rule for SSR head injection to override UI framework defaults. */
  static toCssText(tokens) {
    const decls = Object.entries(tokens).map(([k, v]) => {
      return `${k}:${v}`;
    }).join(";");
    return `html:root, html:root.dark, html:root:not(.dark) {${decls}}`;
  }
  /** Every role name this mapper ever reads by name — the ground truth for "does pinning this role actually show up anywhere". */
  static candidateRoleNames() {
    const names = /* @__PURE__ */ new Set();
    for (const candidates of Object.values(ALIAS_SOURCE)) {
      for (const c of candidates) {
        names.add(c);
      }
    }
    for (const candidates of Object.values(SHORTCUT_SOURCE)) {
      for (const c of candidates) {
        names.add(c);
      }
    }
    return [...names];
  }
}
var IridisUiEffectVariant = /* @__PURE__ */ ((IridisUiEffectVariant2) => {
  IridisUiEffectVariant2["MUTATE_SEEDS"] = "MUTATE_SEEDS";
  IridisUiEffectVariant2["PIN_SEED_ROLE"] = "PIN_SEED_ROLE";
  IridisUiEffectVariant2["SET_PALETTE_PARAM"] = "SET_PALETTE_PARAM";
  IridisUiEffectVariant2["EXTRACT_IMAGE"] = "EXTRACT_IMAGE";
  return IridisUiEffectVariant2;
})(IridisUiEffectVariant || {});
function wrap(index2, count) {
  return (index2 % count + count) % count;
}
class IridisUiMachine extends StateMachine {
  constructor() {
    super();
  }
  getInitialState() {
    return { "activeIndex": 0, "mode": "picker", "variant": "idle" };
  }
  reduce(state2, event) {
    switch (event.type) {
      case IridisUiActionType.SET_FRAMING:
        return { "effects": [{ "op": "framing", "value": event.framing, "variant": IridisUiEffectVariant.SET_PALETTE_PARAM }], "state": state2 };
      case IridisUiActionType.SET_SCHEMA:
        return { "effects": [{ "op": "schemaName", "value": event.schemaName, "variant": IridisUiEffectVariant.SET_PALETTE_PARAM }], "state": state2 };
      case IridisUiActionType.SET_CONTRAST_STRICTNESS:
        return { "effects": [{ "op": "strictness", "value": event.strictness, "variant": IridisUiEffectVariant.SET_PALETTE_PARAM }], "state": state2 };
      case IridisUiActionType.SET_COLOR_SPACE:
        return { "effects": [{ "op": "colorSpace", "value": event.colorSpace, "variant": IridisUiEffectVariant.SET_PALETTE_PARAM }], "state": state2 };
      case IridisUiActionType.SET_CVD_CORRECT:
        return { "effects": [{ "op": "cvdCorrect", "value": event.cvdCorrect, "variant": IridisUiEffectVariant.SET_PALETTE_PARAM }], "state": state2 };
      case IridisUiActionType.SET_IMAGE_ALGORITHM:
        return { "effects": [{ "op": "imgAlgorithm", "value": event.algorithm, "variant": IridisUiEffectVariant.SET_PALETTE_PARAM }], "state": state2 };
      case IridisUiActionType.SET_IMAGE_K:
        return { "effects": [{ "op": "imgK", "value": event.k, "variant": IridisUiEffectVariant.SET_PALETTE_PARAM }], "state": state2 };
      case IridisUiActionType.SET_IMAGE_HISTOGRAM_BITS:
        return { "effects": [{ "op": "imgHistogramBits", "value": event.bits, "variant": IridisUiEffectVariant.SET_PALETTE_PARAM }], "state": state2 };
      case IridisUiActionType.SET_IMAGE_DELTA_E_CAP:
        return { "effects": [{ "op": "imgDeltaECap", "value": event.cap, "variant": IridisUiEffectVariant.SET_PALETTE_PARAM }], "state": state2 };
      case IridisUiActionType.SET_IMAGE_HARMONIZE:
        return { "effects": [{ "op": "imgHarmonize", "value": event.threshold, "variant": IridisUiEffectVariant.SET_PALETTE_PARAM }], "state": state2 };
      case IridisUiActionType.SET_IMAGE_LIGHTNESS_RANGE:
        return { "effects": [{ "op": "imgLightnessRange", "value": event.range, "variant": IridisUiEffectVariant.SET_PALETTE_PARAM }], "state": state2 };
      case IridisUiActionType.SET_IMAGE_CHROMA_RANGE:
        return { "effects": [{ "op": "imgChromaRange", "value": event.range, "variant": IridisUiEffectVariant.SET_PALETTE_PARAM }], "state": state2 };
      case IridisUiActionType.PIN_SEED_ROLE:
        return { "effects": [{ "index": event.index, "role": event.role, "variant": IridisUiEffectVariant.PIN_SEED_ROLE }], "state": state2 };
      case IridisUiActionType.EXTRACT_IMAGE:
        return {
          "effects": [event.source === "file" ? { "file": event.file, "source": "file", "variant": IridisUiEffectVariant.EXTRACT_IMAGE } : { "source": "sample", "variant": IridisUiEffectVariant.EXTRACT_IMAGE }],
          "state": state2
        };
    }
    if (state2.variant === "idle") {
      switch (event.type) {
        case IridisUiActionType.ADD_SEED:
          return { "effects": [{ "hex": event.hex, "op": "add", "variant": IridisUiEffectVariant.MUTATE_SEEDS }], "state": state2 };
        case IridisUiActionType.DRAG_START:
          return { "effects": [], "state": { "activeIndex": state2.activeIndex, "dragPx": 0, "mode": state2.mode, "variant": "dragging" } };
        case IridisUiActionType.NAVIGATE:
          return { "effects": [], "state": { ...state2, "activeIndex": wrap(state2.activeIndex + event.delta, event.count) } };
        case IridisUiActionType.POPOVER_OPEN:
          return { "effects": [], "state": { "activeIndex": state2.activeIndex, "mode": state2.mode, "variant": "popoverOpen" } };
        case IridisUiActionType.REMOVE_SEED:
          return { "effects": [{ "index": event.index, "op": "remove", "variant": IridisUiEffectVariant.MUTATE_SEEDS }], "state": state2 };
        case IridisUiActionType.SELECT_CARD:
          return { "effects": [], "state": { ...state2, "activeIndex": event.index } };
        case IridisUiActionType.SELECT_MODE:
          return { "effects": [], "state": { "activeIndex": event.mode === "image" ? 0 : 1, "mode": event.mode, "variant": "idle" } };
        case IridisUiActionType.SET_SEED:
          return { "effects": [{ "hex": event.hex, "index": event.index, "op": "set", "variant": IridisUiEffectVariant.MUTATE_SEEDS }], "state": state2 };
      }
    } else if (state2.variant === "dragging") {
      switch (event.type) {
        case IridisUiActionType.DRAG_END:
          return { "effects": [], "state": { "activeIndex": wrap(state2.activeIndex + event.shiftedBy, event.count), "mode": state2.mode, "variant": "idle" } };
        case IridisUiActionType.DRAG_MOVE:
          return { "effects": [], "state": { ...state2, "dragPx": event.dragPx } };
      }
    } else if (state2.variant === "popoverOpen") {
      switch (event.type) {
        case IridisUiActionType.POPOVER_CLOSE:
          return { "effects": [], "state": { "activeIndex": state2.activeIndex, "mode": state2.mode, "variant": "idle" } };
      }
    }
    throw new Error(`Cannot handle event "${event.type}" in state "${state2.variant}"`);
  }
}
const handlers = {};
const interpreter = EffectInterpreter.create({ "handlers": handlers, "machine": new IridisUiMachine() });
interpreter.start();
const state = shallowRef(interpreter.getState());
interpreter.subscribe((next) => {
  state.value = next;
});
function send(event) {
  void interpreter.send(event);
}
function registerMutateSeedsHandler$1(handler) {
  handlers.MUTATE_SEEDS = handler;
}
function registerSetPaletteParamHandler$1(handler) {
  handlers.SET_PALETTE_PARAM = handler;
}
function registerExtractImageHandler$1(handler) {
  handlers.EXTRACT_IMAGE = handler;
}
function registerPinSeedRoleHandler$1(handler) {
  handlers.PIN_SEED_ROLE = handler;
}
function useIridisUiMachine() {
  return {
    "registerExtractImageHandler": registerExtractImageHandler$1,
    "registerMutateSeedsHandler": registerMutateSeedsHandler$1,
    "registerPinSeedRoleHandler": registerPinSeedRoleHandler$1,
    "registerSetPaletteParamHandler": registerSetPaletteParamHandler$1,
    "send": send,
    "state": state
  };
}
const CODE_BLOCK_ROLES = [
  "code-bg",
  "syntax-comment",
  "syntax-string",
  "syntax-number",
  "syntax-function",
  "syntax-attribute",
  "syntax-keyword",
  "syntax-punctuation",
  "syntax-type"
];
const USED_ROLE_NAMES = /* @__PURE__ */ new Set([...Tokens.candidateRoleNames(), ...CODE_BLOCK_ROLES]);
const SHADE_L = {
  "100": 0.955,
  "200": 0.915,
  "300": 0.855,
  "400": 0.775,
  "50": 0.985,
  "500": 0.685,
  "600": 0.595,
  "700": 0.505,
  "800": 0.415,
  "900": 0.335,
  "950": 0.235
};
const VARIANT_CONFIG = Tokens.SHADE_KEYS.map((s) => {
  return { "invertLightness": false, "lightnessTarget": SHADE_L[s], "name": `s${s}` };
});
const SEMANTIC_HUE = { "error": 25, "info": 230, "success": 160, "warning": 60 };
const SEMANTIC_HUE_CLAMP = 90;
const COLOR_PIPELINE = [
  "intake:hexHint",
  "resolve:roles",
  "pin:derivedRoles",
  "expand:family",
  "enforce:contrast",
  "enforce:wcagAA",
  "enforce:wcagAAA",
  "enforce:apca",
  "enforce:cvdSimulate",
  "derive:variant"
];
const REQUIRED_COLOR_STAGES = [
  "intake:hexHint",
  "resolve:roles",
  "pin:derivedRoles",
  "expand:family",
  "enforce:contrast",
  "enforce:cvdSimulate",
  "derive:variant"
];
const OPTIONAL_STAGE_NAMES = ["enforce:wcagAA", "enforce:wcagAAA", "enforce:apca"];
const enabledOptionalStages = computed(() => {
  if (contrastStrictness.value === 0) {
    return /* @__PURE__ */ new Set(["enforce:wcagAA"]);
  }
  if (contrastStrictness.value === 1) {
    return /* @__PURE__ */ new Set(["enforce:wcagAAA"]);
  }
  if (contrastStrictness.value === 2) {
    return /* @__PURE__ */ new Set(["enforce:apca"]);
  }
  return /* @__PURE__ */ new Set();
});
function buildPipeline(required) {
  const idx = required.indexOf("enforce:contrast");
  const optional = OPTIONAL_STAGE_NAMES.filter((n) => {
    return enabledOptionalStages.value.has(n);
  });
  const result = [...required];
  result.splice(idx + 1, 0, ...optional);
  return result;
}
const engine = new Engine();
for (const t of coreTasks) {
  engine.tasks.register(t);
}
engine.tasks.register(intakeHexHint);
engine.tasks.register(pinDerivedRoles);
engine.adopt(contrastPlugin);
engine.adopt(imagePlugin);
function withSemanticHues(schema) {
  return {
    ...schema,
    "roles": schema.roles.map((r) => {
      return SEMANTIC_HUE[r.name] !== void 0 ? { ...r, "hue": SEMANTIC_HUE[r.name], "hueClamp": SEMANTIC_HUE_CLAMP } : r;
    })
  };
}
const {
  "registerExtractImageHandler": registerExtractImageHandler,
  "registerMutateSeedsHandler": registerMutateSeedsHandler,
  "registerPinSeedRoleHandler": registerPinSeedRoleHandler,
  "registerSetPaletteParamHandler": registerSetPaletteParamHandler,
  "send": sendUiEvent,
  "state": uiState
} = useIridisUiMachine();
const mode = computed({
  "get": () => {
    const result = uiState.value.mode;
    return result;
  },
  "set": (m) => {
    const result = sendUiEvent({ "mode": m, "type": IridisUiActionType.SELECT_MODE });
    return result;
  }
});
const pickerSeeds = ref([{ "hex": "#7c3aed" }, { "hex": "#06b6d4" }, { "hex": "#f59e0b" }, { "hex": "#ec4899" }]);
const imageSeeds = ref([]);
const framing = ref("dark");
const schemaName = ref("iridis-32");
const contrastStrictness = ref(2);
const colorSpace = ref("srgb");
const cvdCorrect = ref(true);
const cvdPreviewTypes = ref(/* @__PURE__ */ new Set());
function toggleCvdPreviewType(type) {
  const next = new Set(cvdPreviewTypes.value);
  if (next.has(type)) {
    next.delete(type);
  } else {
    next.add(type);
  }
  cvdPreviewTypes.value = next;
}
const roles = ref({});
const roleViews = ref([]);
const roleClamps = ref({});
const roleDistances = ref({});
const rolesSynthesized = ref([]);
const scales = ref({});
const histogram = ref([]);
const running = ref(false);
const error = ref(null);
const contrastReport = ref({});
const imgAlgorithm = ref("delta-e");
const imgK = ref(8);
const imgHistogramBits = ref(5);
const imgDeltaECap = ref(128);
const imgHarmonize = ref(10);
const imgLightnessRange = ref([0, 1]);
const imgChromaRange = ref([0, 0.5]);
const lastImageSrc = ref(null);
const activeSeeds = computed(() => {
  return mode.value === "image" ? imageSeeds.value : pickerSeeds.value;
});
const pinnableRoles = computed(() => {
  const pair = roleSchemaByName[schemaName.value] ?? roleSchemaByName["iridis-32"];
  const schema = pair?.[framing.value];
  if (schema === void 0) {
    return [];
  }
  return schema.roles.filter((r) => {
    return USED_ROLE_NAMES.has(r.name);
  }).map((r) => {
    return r.name;
  });
});
function ingest(state2) {
  const roleHex = {};
  const views = [];
  for (const [name, r] of Object.entries(state2.roles)) {
    roleHex[name] = r.hex;
    views.push({ "c": r.oklch.c, "h": r.oklch.h, "hex": r.hex, "l": r.oklch.l, "name": name });
  }
  const sc = {};
  for (const s of Tokens.SHADE_KEYS) {
    const variant = state2.variants[`s${s}`];
    if (variant === void 0) {
      continue;
    }
    const perShade = {};
    for (const [name, rec] of Object.entries(variant)) {
      perShade[name] = rec.hex;
    }
    sc[s] = perShade;
  }
  roles.value = roleHex;
  roleViews.value = views;
  roleClamps.value = state2.metadata["core:roleClamps"] || {};
  roleDistances.value = state2.metadata["core:roleDistances"] || {};
  rolesSynthesized.value = state2.metadata["core:rolesSynthesized"] || [];
  scales.value = sc;
  contrastReport.value = {
    "aa": state2.metadata["contrast:aa"],
    "aaa": state2.metadata["contrast:aaa"],
    "apca": state2.metadata["contrast:apca"],
    "cvd": state2.metadata["contrast:cvd"]
  };
}
function run(framingOverride) {
  const targetFraming = framingOverride ?? framing.value;
  const pair = roleSchemaByName[schemaName.value] ?? roleSchemaByName["iridis-32"];
  if (pair === void 0 || activeSeeds.value.length === 0) {
    return;
  }
  running.value = true;
  error.value = null;
  try {
    engine.pipeline(buildPipeline(REQUIRED_COLOR_STAGES));
    const state2 = engine.run({
      "colors": activeSeeds.value,
      "contrast": { "algorithm": contrastStrictness.value === 2 ? "apca" : "wcag21", "cvdCorrect": cvdCorrect.value, "level": contrastStrictness.value === 0 ? "AA" : contrastStrictness.value === 1 ? "AAA" : "Lc" },
      "metadata": { "core:variantConfig": VARIANT_CONFIG },
      "roles": withSemanticHues(pair[targetFraming]),
      "runtime": { "colorSpace": colorSpace.value, "framing": targetFraming }
    });
    if (framingOverride !== void 0) {
      framing.value = framingOverride;
      if (false) ;
    }
    ingest(state2);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    running.value = false;
  }
}
class FromImage {
  /** Run the image pipeline: capture histogram, dominant seeds; switch to image mode. */
  static async extract(fileOrUrl) {
    {
      return;
    }
  }
}
function mutateSeeds(effect) {
  if (effect.op === "add") {
    if (pickerSeeds.value.length < 32) {
      pickerSeeds.value = [...pickerSeeds.value, { "hex": effect.hex ?? "#888888" }];
    }
  } else if (effect.op === "remove") {
    if (pickerSeeds.value.length > 1) {
      pickerSeeds.value = pickerSeeds.value.filter((_, idx) => {
        return idx !== effect.index;
      });
    }
  } else if (effect.op === "set") {
    pickerSeeds.value = pickerSeeds.value.map((s, idx) => {
      return idx === effect.index ? { ...s, "hex": effect.hex } : s;
    });
  }
}
registerMutateSeedsHandler(mutateSeeds);
function pinSeedRole(effect) {
  pickerSeeds.value = pickerSeeds.value.map((s, idx) => {
    if (effect.role && s.role === effect.role && idx !== effect.index) {
      return { ...s, role: void 0 };
    }
    return idx === effect.index ? { ...s, "role": effect.role } : s;
  });
}
registerPinSeedRoleHandler(pinSeedRole);
function setPaletteParam(effect) {
  if (effect.op === "framing") {
    run(effect.value);
  } else if (effect.op === "schemaName") {
    schemaName.value = effect.value;
  } else if (effect.op === "strictness") {
    contrastStrictness.value = effect.value;
  } else if (effect.op === "colorSpace") {
    colorSpace.value = effect.value;
  } else if (effect.op === "cvdCorrect") {
    cvdCorrect.value = effect.value;
  } else if (effect.op === "imgAlgorithm") {
    imgAlgorithm.value = effect.value;
  } else if (effect.op === "imgK") {
    imgK.value = effect.value;
  } else if (effect.op === "imgHistogramBits") {
    imgHistogramBits.value = effect.value;
  } else if (effect.op === "imgDeltaECap") {
    imgDeltaECap.value = effect.value;
  } else if (effect.op === "imgHarmonize") {
    imgHarmonize.value = effect.value;
  } else if (effect.op === "imgLightnessRange") {
    imgLightnessRange.value = effect.value;
  } else if (effect.op === "imgChromaRange") {
    imgChromaRange.value = effect.value;
  }
}
registerSetPaletteParamHandler(setPaletteParam);
function logoUrl() {
  const base = (/* @__PURE__ */ useRuntimeConfig()).app.baseURL;
  return `${base}logo.png`;
}
async function extractImageEffect(effect) {
  const src = effect.source === "file" ? effect.file : logoUrl();
  await FromImage.extract(src);
}
registerExtractImageHandler(extractImageEffect);
let booted = false;
function useIridis() {
  if (!booted) {
    booted = true;
    run();
  }
  return {
    "activeSeeds": activeSeeds,
    "contrastStrictness": contrastStrictness,
    "colorSpace": colorSpace,
    "contrastReport": contrastReport,
    "cvdCorrect": cvdCorrect,
    "cvdPreviewTypes": cvdPreviewTypes,
    "toggleCvdPreviewType": toggleCvdPreviewType,
    "enabledOptionalStages": enabledOptionalStages,
    "error": error,
    "framing": framing,
    "histogram": histogram,
    "imageSeeds": imageSeeds,
    "imgAlgorithm": imgAlgorithm,
    "imgChromaRange": imgChromaRange,
    "imgDeltaECap": imgDeltaECap,
    "imgHarmonize": imgHarmonize,
    "imgHistogramBits": imgHistogramBits,
    "imgK": imgK,
    "imgLightnessRange": imgLightnessRange,
    "lastImageSrc": lastImageSrc,
    "mode": mode,
    "pickerSeeds": pickerSeeds,
    "pinnableRoles": pinnableRoles,
    "roles": roles,
    "roleViews": roleViews,
    "roleClamps": roleClamps,
    "roleDistances": roleDistances,
    "rolesSynthesized": rolesSynthesized,
    "run": run,
    "running": running,
    "scales": scales,
    "schemaName": schemaName
  };
}
const SRGB_GAMMA = 2.2;
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "CvdPreviewOverlay",
  __ssrInlineRender: true,
  setup(__props) {
    const { cvdPreviewTypes: cvdPreviewTypes2 } = useIridis();
    function toFeColorMatrixValues(m) {
      const v = m.matrix;
      return [
        v[0],
        v[1],
        v[2],
        0,
        0,
        v[3],
        v[4],
        v[5],
        0,
        0,
        v[6],
        v[7],
        v[8],
        0,
        0,
        0,
        0,
        0,
        1,
        0
      ].join(" ");
    }
    const filterId = (name) => {
      return `cvd-${name}`;
    };
    const activeFilterChain = computed(() => {
      const ids = [...cvdPreviewTypes2.value].map((t) => {
        return `url(#${filterId(t)})`;
      });
      return ids.length > 0 ? ids.join(" ") : "none";
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<!--[--><svg class="cvd-preview-defs" aria-hidden="true" data-v-89832acd><defs data-v-89832acd><!--[-->`);
      ssrRenderList(unref(cvdMatrices), (m) => {
        _push(`<filter${ssrRenderAttr("id", filterId(m.name))} color-interpolation-filters="sRGB" data-v-89832acd><feComponentTransfer result="linear" data-v-89832acd><feFuncR type="gamma"${ssrRenderAttr("exponent", SRGB_GAMMA)} amplitude="1" offset="0" data-v-89832acd></feFuncR><feFuncG type="gamma"${ssrRenderAttr("exponent", SRGB_GAMMA)} amplitude="1" offset="0" data-v-89832acd></feFuncG><feFuncB type="gamma"${ssrRenderAttr("exponent", SRGB_GAMMA)} amplitude="1" offset="0" data-v-89832acd></feFuncB></feComponentTransfer><feColorMatrix in="linear" type="matrix"${ssrRenderAttr("values", toFeColorMatrixValues(m))} result="simulated" data-v-89832acd></feColorMatrix><feComponentTransfer in="simulated" data-v-89832acd><feFuncR type="gamma"${ssrRenderAttr("exponent", 1 / SRGB_GAMMA)} amplitude="1" offset="0" data-v-89832acd></feFuncR><feFuncG type="gamma"${ssrRenderAttr("exponent", 1 / SRGB_GAMMA)} amplitude="1" offset="0" data-v-89832acd></feFuncG><feFuncB type="gamma"${ssrRenderAttr("exponent", 1 / SRGB_GAMMA)} amplitude="1" offset="0" data-v-89832acd></feFuncB></feComponentTransfer></filter>`);
      });
      _push(`<!--]--></defs></svg><div class="cvd-preview-wrap" style="${ssrRenderStyle({ filter: activeFilterChain.value })}" data-v-89832acd>`);
      ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent);
      _push(`</div><!--]-->`);
    };
  }
});
const _sfc_setup$3 = _sfc_main$3.setup;
_sfc_main$3.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/layout/CvdPreviewOverlay.vue");
  return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
const __nuxt_component_3 = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$3, [["__scopeId", "data-v-89832acd"]]), { __name: "CvdPreviewOverlay" });
const defineRouteProvider = (name = "RouteProvider") => defineComponent({
  name,
  props: {
    route: {
      type: Object,
      required: true
    },
    vnode: Object,
    vnodeRef: Object,
    renderKey: String,
    trackRootNodes: Boolean
  },
  setup(props) {
    const previousKey = props.renderKey;
    const previousRoute = props.route;
    const route = {};
    for (const key in props.route) {
      Object.defineProperty(route, key, {
        get: () => previousKey === props.renderKey ? props.route[key] : previousRoute[key],
        enumerable: true
      });
    }
    provide(PageRouteSymbol, shallowReactive(route));
    return () => {
      if (!props.vnode) {
        return props.vnode;
      }
      return h(props.vnode, { ref: props.vnodeRef });
    };
  }
});
const RouteProvider = defineRouteProvider();
const __nuxt_component_4 = defineComponent({
  name: "NuxtPage",
  inheritAttrs: false,
  props: {
    name: {
      type: String
    },
    transition: {
      type: [Boolean, Object],
      default: void 0
    },
    keepalive: {
      type: [Boolean, Object],
      default: void 0
    },
    route: {
      type: Object
    },
    pageKey: {
      type: [Function, String],
      default: null
    }
  },
  setup(props, { attrs, slots, expose }) {
    const nuxtApp = useNuxtApp();
    const pageRef = ref();
    inject(PageRouteSymbol, null);
    expose({ pageRef });
    inject(LayoutMetaSymbol, null);
    nuxtApp.deferHydration();
    return () => {
      return h(RouterView, { name: props.name, route: props.route, ...attrs }, {
        default: (routeProps) => {
          return h(Suspense, { suspensible: true }, {
            default() {
              return h(RouteProvider, {
                vnode: slots.default ? normalizeSlot(slots.default, routeProps) : routeProps.Component,
                route: routeProps.route,
                vnodeRef: pageRef
              });
            }
          });
        }
      });
    };
  }
});
function normalizeSlot(slot, data) {
  const slotContent = slot(data);
  return slotContent.length === 1 ? h(slotContent[0]) : h(Fragment, void 0, slotContent);
}
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "app",
  __ssrInlineRender: true,
  setup(__props) {
    const { framing: framing2, roles: roles2, scales: scales2 } = useIridis();
    useHead({
      "htmlAttrs": {
        "class": computed(() => {
          return framing2.value === "dark" ? "dark" : "";
        }),
        "data-iridis-framing": framing2
      },
      "bodyAttrs": {
        "class": "preload"
      },
      "style": [
        { "key": "iridis-theme", "innerHTML": computed(() => {
          return Tokens.toCssText(Tokens.mapFromEngine(roles2.value, scales2.value));
        }) }
      ]
    });
    return (_ctx, _push, _parent, _attrs) => {
      const _component_UApp = __nuxt_component_0;
      const _component_AmbientBackground = __nuxt_component_1;
      const _component_NuxtRouteAnnouncer = __nuxt_component_2;
      const _component_CvdPreviewOverlay = __nuxt_component_3;
      const _component_NuxtPage = __nuxt_component_4;
      _push(ssrRenderComponent(_component_UApp, _attrs, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(_component_AmbientBackground, null, null, _parent2, _scopeId));
            _push2(ssrRenderComponent(_component_NuxtRouteAnnouncer, null, null, _parent2, _scopeId));
            _push2(ssrRenderComponent(_component_CvdPreviewOverlay, null, {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(ssrRenderComponent(_component_NuxtPage, null, null, _parent3, _scopeId2));
                } else {
                  return [
                    createVNode(_component_NuxtPage)
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
          } else {
            return [
              createVNode(_component_AmbientBackground),
              createVNode(_component_NuxtRouteAnnouncer),
              createVNode(_component_CvdPreviewOverlay, null, {
                default: withCtx(() => [
                  createVNode(_component_NuxtPage)
                ]),
                _: 1
              })
            ];
          }
        }),
        _: 1
      }, _parent));
    };
  }
});
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("app.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const _sfc_main$1 = {
  __name: "nuxt-error-page",
  __ssrInlineRender: true,
  props: {
    error: Object
  },
  setup(__props) {
    const props = __props;
    const _error = props.error;
    const status = Number(_error.statusCode || 500);
    const is404 = status === 404;
    const statusText = _error.statusMessage ?? (is404 ? "Page Not Found" : "Internal Server Error");
    const description = _error.message || _error.toString();
    const stack = void 0;
    const _Error404 = defineAsyncComponent(() => import('./error-404-BfBUhbRl.mjs'));
    const _Error = defineAsyncComponent(() => import('./error-500-C_SJAlxM.mjs'));
    const ErrorTemplate = is404 ? _Error404 : _Error;
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(unref(ErrorTemplate), mergeProps({ status: unref(status), statusText: unref(statusText), statusCode: unref(status), statusMessage: unref(statusText), description: unref(description), stack: unref(stack) }, _attrs), null, _parent));
    };
  }
};
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../node_modules/nuxt/dist/app/components/nuxt-error-page.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const _sfc_main = {
  __name: "nuxt-root",
  __ssrInlineRender: true,
  setup(__props) {
    const IslandRenderer = () => null;
    const nuxtApp = useNuxtApp();
    nuxtApp.deferHydration();
    nuxtApp.ssrContext.url;
    const SingleRenderer = false;
    provide(PageRouteSymbol, useRoute());
    nuxtApp.hooks.callHookWith((hooks) => hooks.map((hook) => hook()), "vue:setup", []);
    const error2 = /* @__PURE__ */ useError();
    const abortRender = error2.value && !nuxtApp.ssrContext.error;
    function invokeAppErrorHandler(err, target, info) {
      const errorHandler = nuxtApp.vueApp.config.errorHandler;
      if (errorHandler && !errorHandler.__nuxt_default) {
        try {
          errorHandler(err, target, info);
        } catch (handlerError) {
          console.error("[nuxt] Error in `app.config.errorHandler`", handlerError);
        }
      }
    }
    onErrorCaptured((err, target, info) => {
      nuxtApp.hooks.callHook("vue:error", err, target, info)?.catch((hookError) => console.error("[nuxt] Error in `vue:error` hook", hookError));
      {
        const p = nuxtApp.runWithContext(() => showError(err));
        onServerPrefetch(() => p);
        invokeAppErrorHandler(err, target, info);
        return false;
      }
    });
    const islandContext = nuxtApp.ssrContext.islandContext;
    return (_ctx, _push, _parent, _attrs) => {
      ssrRenderSuspense(_push, {
        default: () => {
          if (unref(abortRender)) {
            _push(`<div></div>`);
          } else if (unref(error2)) {
            _push(ssrRenderComponent(unref(_sfc_main$1), { error: unref(error2) }, null, _parent));
          } else if (unref(islandContext)) {
            _push(ssrRenderComponent(unref(IslandRenderer), { context: unref(islandContext) }, null, _parent));
          } else if (unref(SingleRenderer)) {
            ssrRenderVNode(_push, createVNode(resolveDynamicComponent(unref(SingleRenderer)), null, null), _parent);
          } else {
            _push(ssrRenderComponent(unref(_sfc_main$2), null, null, _parent));
          }
        },
        _: 1
      });
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../node_modules/nuxt/dist/app/components/nuxt-root.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
let entry;
{
  entry = async function createNuxtAppServer(ssrContext) {
    const vueApp = createApp(_sfc_main);
    const nuxt = createNuxtApp({ vueApp, ssrContext });
    try {
      await applyPlugins(nuxt, plugins);
      await nuxt.hooks.callHook("app:created", vueApp);
    } catch (error2) {
      await nuxt.hooks.callHook("app:error", error2);
      nuxt.payload.error ||= createError(error2);
    }
    if (ssrContext && (ssrContext["~renderResponse"] || ssrContext._renderResponse)) {
      throw new Error("skipping render");
    }
    return vueApp;
  };
}
const entry_default = ((ssrContext) => entry(ssrContext));

export { useToast as $, AUTOFOCUS_ON_MOUNT as A, useAppConfig as B, tv as C, useForwardProps as D, EVENT_OPTIONS as E, useFormField as F, _sfc_main$f as G, usePortal as H, useFieldGroup as I, useComponentIcons as J, isArrayOfArray as K, _sfc_main$d as L, FieldGroupReset as M, get as N, _sfc_main$e as O, Primitive as P, looseToNumber as Q, getDisplayValue as R, useLocale as S, Teleport_default as T, _sfc_main$a as U, VisuallyHidden_default as V, formErrorsInjectionKey as W, formInputsInjectionKey as X, inputIdInjectionKey as Y, formFieldInjectionKey as Z, _export_sfc as _, __nuxt_component_0$1 as a, _sfc_main$9 as a0, coreTasks as a1, intakeHexHint as a2, pinDerivedRoles as a3, contrastPlugin as a4, COLOR_PIPELINE as a5, OPTIONAL_STAGE_NAMES as a6, roleSchemaByName as a7, ensureContrast as a8, hueShift as a9, Engine as aa, tryUseNuxtApp as ab, useAsyncData as ac, _sfc_main$b as ad, transformUI as ae, resolveBaseURL as af, ImageComponent as ag, getSlotChildrenText as ah, useState as ai, useForwardProps$1 as b, useEmitAsProps as c, useForwardExpose as d, entry_default as default, isNullish as e, focusFirst as f, getActiveElement as g, getTabbableCandidates as h, injectConfigProviderContext as i, focus as j, AUTOFOCUS_ON_UNMOUNT as k, getTabbableEdges as l, usePrimitiveElement as m, createContext as n, useCollection as o, Presence_default as p, injectTooltipProviderContext as q, luminance as r, colorRecordFactory as s, clamp01 as t, useHead as u, clamp as v, useIridisUiMachine as w, useIridis as x, useRuntimeConfig as y, useComponentProps as z };
//# sourceMappingURL=server.mjs.map
