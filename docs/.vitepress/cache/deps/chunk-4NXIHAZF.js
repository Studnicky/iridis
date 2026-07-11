// node_modules/@primeuix/utils/dist/object/index.mjs
var ie = Object.defineProperty;
var K = Object.getOwnPropertySymbols;
var se = Object.prototype.hasOwnProperty;
var ae = Object.prototype.propertyIsEnumerable;
var N = (e, t2, n) => t2 in e ? ie(e, t2, { enumerable: true, configurable: true, writable: true, value: n }) : e[t2] = n;
var d = (e, t2) => {
  for (var n in t2 || (t2 = {})) se.call(t2, n) && N(e, n, t2[n]);
  if (K) for (var n of K(t2)) ae.call(t2, n) && N(e, n, t2[n]);
  return e;
};
function l(e) {
  return e == null || e === "" || Array.isArray(e) && e.length === 0 || !(e instanceof Date) && typeof e == "object" && Object.keys(e).length === 0;
}
function b(e, t2, n = /* @__PURE__ */ new WeakSet()) {
  if (e === t2) return true;
  if (!e || !t2 || typeof e != "object" || typeof t2 != "object" || n.has(e) || n.has(t2)) return false;
  n.add(e).add(t2);
  let o = Array.isArray(e), r = Array.isArray(t2), u, f2, T2;
  if (o && r) {
    if (f2 = e.length, f2 != t2.length) return false;
    for (u = f2; u-- !== 0; ) if (!b(e[u], t2[u], n)) return false;
    return true;
  }
  if (o != r) return false;
  let S3 = e instanceof Date, A2 = t2 instanceof Date;
  if (S3 != A2) return false;
  if (S3 && A2) return e.getTime() == t2.getTime();
  let I2 = e instanceof RegExp, L = t2 instanceof RegExp;
  if (I2 != L) return false;
  if (I2 && L) return e.toString() == t2.toString();
  let R2 = Object.keys(e);
  if (f2 = R2.length, f2 !== Object.keys(t2).length) return false;
  for (u = f2; u-- !== 0; ) if (!Object.prototype.hasOwnProperty.call(t2, R2[u])) return false;
  for (u = f2; u-- !== 0; ) if (T2 = R2[u], !b(e[T2], t2[T2], n)) return false;
  return true;
}
function y(e, t2) {
  return b(e, t2);
}
function c(e) {
  return typeof e == "function" && "call" in e && "apply" in e;
}
function s(e) {
  return !l(e);
}
function p(e, t2) {
  if (!e || !t2) return null;
  try {
    let n = e[t2];
    if (s(n)) return n;
  } catch (n) {
  }
  if (Object.keys(e).length) {
    if (c(t2)) return t2(e);
    if (t2.indexOf(".") === -1) return e[t2];
    {
      let n = t2.split("."), o = e;
      for (let r = 0, u = n.length; r < u; ++r) {
        if (o == null) return null;
        o = o[n[r]];
      }
      return o;
    }
  }
  return null;
}
function k(e, t2, n) {
  return n ? p(e, n) === p(t2, n) : y(e, t2);
}
function q(e, t2) {
  if (e != null && t2 && t2.length) {
    for (let n of t2) if (k(e, n)) return true;
  }
  return false;
}
function i(e, t2 = true) {
  return e instanceof Object && e.constructor === Object && (t2 || Object.keys(e).length !== 0);
}
function $(e = {}, t2 = {}) {
  let n = d({}, e);
  return Object.keys(t2).forEach((o) => {
    let r = o;
    i(t2[r]) && r in e && i(e[r]) ? n[r] = $(e[r], t2[r]) : n[r] = t2[r];
  }), n;
}
function w(...e) {
  return e.reduce((t2, n, o) => o === 0 ? n : $(t2, n), {});
}
function M(e, t2) {
  let n = -1;
  if (s(e)) try {
    n = e.findLastIndex(t2);
  } catch (o) {
    n = e.lastIndexOf([...e].reverse().find(t2));
  }
  return n;
}
function m(e, ...t2) {
  return c(e) ? e(...t2) : e;
}
function a(e, t2 = true) {
  return typeof e == "string" && (t2 || e !== "");
}
function g(e) {
  return a(e) ? e.replace(/(-|_)/g, "").toLowerCase() : e;
}
function F(e, t2 = "", n = {}) {
  let o = g(t2).split("."), r = o.shift();
  if (r) {
    if (i(e)) {
      let u = Object.keys(e).find((f2) => g(f2) === r) || "";
      return F(m(e[u], n), o.join("."), n);
    }
    return;
  }
  return m(e, n);
}
function C(e, t2 = true) {
  return Array.isArray(e) && (t2 || e.length !== 0);
}
function z(e) {
  return s(e) && !isNaN(e);
}
function J(e = "") {
  return s(e) && e.length === 1 && !!e.match(/\S| /);
}
function G(e, t2) {
  if (t2) {
    let n = t2.test(e);
    return t2.lastIndex = 0, n;
  }
  return false;
}
function H(...e) {
  return w(...e);
}
function Y(e) {
  return e && e.replace(/\/\*(?:(?!\*\/)[\s\S])*\*\/|[\r\n\t]+/g, "").replace(/ {2,}/g, " ").replace(/ ([{:}]) /g, "$1").replace(/([;,]) /g, "$1").replace(/ !/g, "!").replace(/: /g, ":").trim();
}
function X(e) {
  if (e && /[\xC0-\xFF\u0100-\u017E]/.test(e)) {
    let n = { A: /[\xC0-\xC5\u0100\u0102\u0104]/g, AE: /[\xC6]/g, C: /[\xC7\u0106\u0108\u010A\u010C]/g, D: /[\xD0\u010E\u0110]/g, E: /[\xC8-\xCB\u0112\u0114\u0116\u0118\u011A]/g, G: /[\u011C\u011E\u0120\u0122]/g, H: /[\u0124\u0126]/g, I: /[\xCC-\xCF\u0128\u012A\u012C\u012E\u0130]/g, IJ: /[\u0132]/g, J: /[\u0134]/g, K: /[\u0136]/g, L: /[\u0139\u013B\u013D\u013F\u0141]/g, N: /[\xD1\u0143\u0145\u0147\u014A]/g, O: /[\xD2-\xD6\xD8\u014C\u014E\u0150]/g, OE: /[\u0152]/g, R: /[\u0154\u0156\u0158]/g, S: /[\u015A\u015C\u015E\u0160]/g, T: /[\u0162\u0164\u0166]/g, U: /[\xD9-\xDC\u0168\u016A\u016C\u016E\u0170\u0172]/g, W: /[\u0174]/g, Y: /[\xDD\u0176\u0178]/g, Z: /[\u0179\u017B\u017D]/g, a: /[\xE0-\xE5\u0101\u0103\u0105]/g, ae: /[\xE6]/g, c: /[\xE7\u0107\u0109\u010B\u010D]/g, d: /[\u010F\u0111]/g, e: /[\xE8-\xEB\u0113\u0115\u0117\u0119\u011B]/g, g: /[\u011D\u011F\u0121\u0123]/g, i: /[\xEC-\xEF\u0129\u012B\u012D\u012F\u0131]/g, ij: /[\u0133]/g, j: /[\u0135]/g, k: /[\u0137,\u0138]/g, l: /[\u013A\u013C\u013E\u0140\u0142]/g, n: /[\xF1\u0144\u0146\u0148\u014B]/g, p: /[\xFE]/g, o: /[\xF2-\xF6\xF8\u014D\u014F\u0151]/g, oe: /[\u0153]/g, r: /[\u0155\u0157\u0159]/g, s: /[\u015B\u015D\u015F\u0161]/g, t: /[\u0163\u0165\u0167]/g, u: /[\xF9-\xFC\u0169\u016B\u016D\u016F\u0171\u0173]/g, w: /[\u0175]/g, y: /[\xFD\xFF\u0177]/g, z: /[\u017A\u017C\u017E]/g };
    for (let o in n) e = e.replace(n[o], o);
  }
  return e;
}
function ne(e) {
  return a(e, false) ? e[0].toUpperCase() + e.slice(1) : e;
}
function re(e) {
  return a(e) ? e.replace(/(_)/g, "-").replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase() : e;
}

// node_modules/@primeuix/utils/dist/classnames/index.mjs
function f(...e) {
  if (e) {
    let t2 = [];
    for (let i2 = 0; i2 < e.length; i2++) {
      let n = e[i2];
      if (!n) continue;
      let s4 = typeof n;
      if (s4 === "string" || s4 === "number") t2.push(n);
      else if (s4 === "object") {
        let c3 = Array.isArray(n) ? [f(...n)] : Object.entries(n).map(([r, o]) => o ? r : void 0);
        t2 = c3.length ? t2.concat(c3.filter((r) => !!r)) : t2;
      }
    }
    return t2.join(" ").trim();
  }
}

// node_modules/@primeuix/utils/dist/dom/index.mjs
function R(t2, e) {
  return t2 ? t2.classList ? t2.classList.contains(e) : new RegExp("(^| )" + e + "( |$)", "gi").test(t2.className) : false;
}
function W(t2, e) {
  if (t2 && e) {
    let o = (n) => {
      R(t2, n) || (t2.classList ? t2.classList.add(n) : t2.className += " " + n);
    };
    [e].flat().filter(Boolean).forEach((n) => n.split(" ").forEach(o));
  }
}
function P(t2, e) {
  if (t2 && e) {
    let o = (n) => {
      t2.classList ? t2.classList.remove(n) : t2.className = t2.className.replace(new RegExp("(^|\\b)" + n.split(" ").join("|") + "(\\b|$)", "gi"), " ");
    };
    [e].flat().filter(Boolean).forEach((n) => n.split(" ").forEach(o));
  }
}
function x(t2) {
  for (let e of document == null ? void 0 : document.styleSheets) try {
    for (let o of e == null ? void 0 : e.cssRules) for (let n of o == null ? void 0 : o.style) if (t2.test(n)) return { name: n, value: o.style.getPropertyValue(n).trim() };
  } catch (o) {
  }
  return null;
}
function w2(t2) {
  let e = { width: 0, height: 0 };
  if (t2) {
    let [o, n] = [t2.style.visibility, t2.style.display], r = t2.getBoundingClientRect();
    t2.style.visibility = "hidden", t2.style.display = "block", e.width = r.width || t2.offsetWidth, e.height = r.height || t2.offsetHeight, t2.style.display = n, t2.style.visibility = o;
  }
  return e;
}
function h() {
  let t2 = window, e = document, o = e.documentElement, n = e.getElementsByTagName("body")[0], r = t2.innerWidth || o.clientWidth || n.clientWidth, i2 = t2.innerHeight || o.clientHeight || n.clientHeight;
  return { width: r, height: i2 };
}
function E(t2) {
  return t2 ? Math.abs(t2.scrollLeft) : 0;
}
function k2() {
  let t2 = document.documentElement;
  return (window.pageXOffset || E(t2)) - (t2.clientLeft || 0);
}
function $2() {
  let t2 = document.documentElement;
  return (window.pageYOffset || t2.scrollTop) - (t2.clientTop || 0);
}
function V(t2) {
  return t2 ? getComputedStyle(t2).direction === "rtl" : false;
}
function D(t2, e, o = true) {
  var n, r, i2, l2;
  if (t2) {
    let d2 = t2.offsetParent ? { width: t2.offsetWidth, height: t2.offsetHeight } : w2(t2), s4 = d2.height, a2 = d2.width, u = e.offsetHeight, p2 = e.offsetWidth, f2 = e.getBoundingClientRect(), g3 = $2(), it = k2(), lt = h(), L, N3, ot = "top";
    f2.top + u + s4 > lt.height ? (L = f2.top + g3 - s4, ot = "bottom", L < 0 && (L = g3)) : L = u + f2.top + g3, f2.left + a2 > lt.width ? N3 = Math.max(0, f2.left + it + p2 - a2) : N3 = f2.left + it, V(t2) ? t2.style.insetInlineEnd = N3 + "px" : t2.style.insetInlineStart = N3 + "px", t2.style.top = L + "px", t2.style.transformOrigin = ot, o && (t2.style.marginTop = ot === "bottom" ? `calc(${(r = (n = x(/-anchor-gutter$/)) == null ? void 0 : n.value) != null ? r : "2px"} * -1)` : (l2 = (i2 = x(/-anchor-gutter$/)) == null ? void 0 : i2.value) != null ? l2 : "");
  }
}
function S(t2, e) {
  t2 && (typeof e == "string" ? t2.style.cssText = e : Object.entries(e || {}).forEach(([o, n]) => t2.style[o] = n));
}
function v(t2, e) {
  if (t2 instanceof HTMLElement) {
    let o = t2.offsetWidth;
    if (e) {
      let n = getComputedStyle(t2);
      o += parseFloat(n.marginLeft) + parseFloat(n.marginRight);
    }
    return o;
  }
  return 0;
}
function I(t2, e, o = true, n = void 0) {
  var r;
  if (t2) {
    let i2 = t2.offsetParent ? { width: t2.offsetWidth, height: t2.offsetHeight } : w2(t2), l2 = e.offsetHeight, d2 = e.getBoundingClientRect(), s4 = h(), a2, u, p2 = n != null ? n : "top";
    if (!n && d2.top + l2 + i2.height > s4.height ? (a2 = -1 * i2.height, p2 = "bottom", d2.top + a2 < 0 && (a2 = -1 * d2.top)) : a2 = l2, i2.width > s4.width ? u = d2.left * -1 : d2.left + i2.width > s4.width ? u = (d2.left + i2.width - s4.width) * -1 : u = 0, t2.style.top = a2 + "px", t2.style.insetInlineStart = u + "px", t2.style.transformOrigin = p2, o) {
      let f2 = (r = x(/-anchor-gutter$/)) == null ? void 0 : r.value;
      t2.style.marginTop = p2 === "bottom" ? `calc(${f2 != null ? f2 : "2px"} * -1)` : f2 != null ? f2 : "";
    }
  }
}
function y2(t2) {
  if (t2) {
    let e = t2.parentNode;
    return e && e instanceof ShadowRoot && e.host && (e = e.host), e;
  }
  return null;
}
function T(t2) {
  return !!(t2 !== null && typeof t2 != "undefined" && t2.nodeName && y2(t2));
}
function c2(t2) {
  return typeof Element != "undefined" ? t2 instanceof Element : t2 !== null && typeof t2 == "object" && t2.nodeType === 1 && typeof t2.nodeName == "string";
}
function pt() {
  if (window.getSelection) {
    let t2 = window.getSelection() || {};
    t2.empty ? t2.empty() : t2.removeAllRanges && t2.rangeCount > 0 && t2.getRangeAt(0).getClientRects().length > 0 && t2.removeAllRanges();
  }
}
function A(t2, e = {}) {
  if (c2(t2)) {
    let o = (n, r) => {
      var l2, d2;
      let i2 = (l2 = t2 == null ? void 0 : t2.$attrs) != null && l2[n] ? [(d2 = t2 == null ? void 0 : t2.$attrs) == null ? void 0 : d2[n]] : [];
      return [r].flat().reduce((s4, a2) => {
        if (a2 != null) {
          let u = typeof a2;
          if (u === "string" || u === "number") s4.push(a2);
          else if (u === "object") {
            let p2 = Array.isArray(a2) ? o(n, a2) : Object.entries(a2).map(([f2, g3]) => n === "style" && (g3 || g3 === 0) ? `${f2.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}:${g3}` : g3 ? f2 : void 0);
            s4 = p2.length ? s4.concat(p2.filter((f2) => !!f2)) : s4;
          }
        }
        return s4;
      }, i2);
    };
    Object.entries(e).forEach(([n, r]) => {
      if (r != null) {
        let i2 = n.match(/^on(.+)/);
        i2 ? t2.addEventListener(i2[1].toLowerCase(), r) : n === "p-bind" || n === "pBind" ? A(t2, r) : (r = n === "class" ? [...new Set(o("class", r))].join(" ").trim() : n === "style" ? o("style", r).join(";").trim() : r, (t2.$attrs = t2.$attrs || {}) && (t2.$attrs[n] = r), t2.setAttribute(n, r));
      }
    });
  }
}
function U(t2, e = {}, ...o) {
  if (t2) {
    let n = document.createElement(t2);
    return A(n, e), n.append(...o), n;
  }
}
function q2(t2, e = {}) {
  return t2 ? `<style${Object.entries(e).reduce((o, [n, r]) => o + ` ${n}="${r}"`, "")}>${t2}</style>` : "";
}
function Y2(t2, e) {
  return c2(t2) ? Array.from(t2.querySelectorAll(e)) : [];
}
function z2(t2, e) {
  return c2(t2) ? t2.matches(e) ? t2 : t2.querySelector(e) : null;
}
function bt(t2, e) {
  t2 && document.activeElement !== t2 && t2.focus(e);
}
function Q(t2, e) {
  if (c2(t2)) {
    let o = t2.getAttribute(e);
    return isNaN(o) ? o === "true" || o === "false" ? o === "true" : o : +o;
  }
}
function b2(t2, e = "") {
  let o = Y2(t2, `button:not([tabindex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])${e},
            [href]:not([tabindex = "-1"]):not([style*="display:none"]):not([hidden])${e},
            input:not([tabindex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])${e},
            select:not([tabindex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])${e},
            textarea:not([tabindex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])${e},
            [tabIndex]:not([tabIndex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])${e},
            [contenteditable]:not([tabIndex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])${e}`), n = [];
  for (let r of o) getComputedStyle(r).display != "none" && getComputedStyle(r).visibility != "hidden" && n.push(r);
  return n;
}
function vt(t2, e) {
  let o = b2(t2, e);
  return o.length > 0 ? o[0] : null;
}
function Tt(t2) {
  if (t2) {
    let e = t2.offsetHeight, o = getComputedStyle(t2);
    return e -= parseFloat(o.paddingTop) + parseFloat(o.paddingBottom) + parseFloat(o.borderTopWidth) + parseFloat(o.borderBottomWidth), e;
  }
  return 0;
}
function Lt(t2, e) {
  let o = b2(t2, e);
  return o.length > 0 ? o[o.length - 1] : null;
}
function K2(t2) {
  if (t2) {
    let e = t2.getBoundingClientRect();
    return { top: e.top + (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0), left: e.left + (window.pageXOffset || E(document.documentElement) || E(document.body) || 0) };
  }
  return { top: "auto", left: "auto" };
}
function C2(t2, e) {
  if (t2) {
    let o = t2.offsetHeight;
    if (e) {
      let n = getComputedStyle(t2);
      o += parseFloat(n.marginTop) + parseFloat(n.marginBottom);
    }
    return o;
  }
  return 0;
}
function M2(t2, e = []) {
  let o = y2(t2);
  return o === null ? e : M2(o, e.concat([o]));
}
function At(t2) {
  let e = [];
  if (t2) {
    let o = M2(t2), n = /(auto|scroll)/, r = (i2) => {
      try {
        let l2 = window.getComputedStyle(i2, null);
        return n.test(l2.getPropertyValue("overflow")) || n.test(l2.getPropertyValue("overflowX")) || n.test(l2.getPropertyValue("overflowY"));
      } catch (l2) {
        return false;
      }
    };
    for (let i2 of o) {
      let l2 = i2.nodeType === 1 && i2.dataset.scrollselectors;
      if (l2) {
        let d2 = l2.split(",");
        for (let s4 of d2) {
          let a2 = z2(i2, s4);
          a2 && r(a2) && e.push(a2);
        }
      }
      i2.nodeType !== 9 && r(i2) && e.push(i2);
    }
  }
  return e;
}
function Mt() {
  if (window.getSelection) return window.getSelection().toString();
  if (document.getSelection) return document.getSelection().toString();
}
function Rt(t2) {
  if (t2) {
    let e = t2.offsetWidth, o = getComputedStyle(t2);
    return e -= parseFloat(o.paddingLeft) + parseFloat(o.paddingRight) + parseFloat(o.borderLeftWidth) + parseFloat(o.borderRightWidth), e;
  }
  return 0;
}
function $t() {
  return /(android)/i.test(navigator.userAgent);
}
function tt() {
  return !!(typeof window != "undefined" && window.document && window.document.createElement);
}
function et(t2) {
  return !!(t2 && t2.offsetParent != null);
}
function Yt() {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
}
function _t(t2, e = "", o) {
  c2(t2) && o !== null && o !== void 0 && t2.setAttribute(e, o);
}

// node_modules/@primeuix/utils/dist/zindex/index.mjs
function g2() {
  let r = [], i2 = (e, n, t2 = 999) => {
    let s4 = u(e, n, t2), o = s4.value + (s4.key === e ? 0 : t2) + 1;
    return r.push({ key: e, value: o }), o;
  }, d2 = (e) => {
    r = r.filter((n) => n.value !== e);
  }, a2 = (e, n) => u(e, n).value, u = (e, n, t2 = 0) => [...r].reverse().find((s4) => n ? true : s4.key === e) || { key: e, value: t2 }, l2 = (e) => e && parseInt(e.style.zIndex, 10) || 0;
  return { get: l2, set: (e, n, t2) => {
    n && (n.style.zIndex = String(i2(e, true, t2)));
  }, clear: (e) => {
    e && (d2(l2(e)), e.style.zIndex = "");
  }, getCurrent: (e) => a2(e, true) };
}
var x2 = g2();

// node_modules/@primeuix/utils/dist/eventbus/index.mjs
function s2() {
  let r = /* @__PURE__ */ new Map();
  return { on(e, t2) {
    let n = r.get(e);
    return n ? n.push(t2) : n = [t2], r.set(e, n), this;
  }, off(e, t2) {
    let n = r.get(e);
    return n && n.splice(n.indexOf(t2) >>> 0, 1), this;
  }, emit(e, t2) {
    let n = r.get(e);
    n && n.forEach((i2) => {
      i2(t2);
    });
  }, clear() {
    r.clear();
  } };
}

// node_modules/@primeuix/utils/dist/uuid/index.mjs
var t = {};
function s3(n = "pui_id_") {
  return Object.hasOwn(t, n) || (t[n] = 0), t[n]++, `${n}${t[n]}`;
}

// node_modules/@primeuix/styled/dist/index.mjs
var rt = Object.defineProperty;
var st = Object.defineProperties;
var nt = Object.getOwnPropertyDescriptors;
var F2 = Object.getOwnPropertySymbols;
var xe = Object.prototype.hasOwnProperty;
var be = Object.prototype.propertyIsEnumerable;
var _e = (e, t2, r) => t2 in e ? rt(e, t2, { enumerable: true, configurable: true, writable: true, value: r }) : e[t2] = r;
var h2 = (e, t2) => {
  for (var r in t2 || (t2 = {})) xe.call(t2, r) && _e(e, r, t2[r]);
  if (F2) for (var r of F2(t2)) be.call(t2, r) && _e(e, r, t2[r]);
  return e;
};
var $3 = (e, t2) => st(e, nt(t2));
var v2 = (e, t2) => {
  var r = {};
  for (var s4 in e) xe.call(e, s4) && t2.indexOf(s4) < 0 && (r[s4] = e[s4]);
  if (e != null && F2) for (var s4 of F2(e)) t2.indexOf(s4) < 0 && be.call(e, s4) && (r[s4] = e[s4]);
  return r;
};
function ke(...e) {
  return w(...e);
}
var at = s2();
var N2 = at;
var k3 = /{([^}]*)}/g;
var ne2 = /(\d+\s+[\+\-\*\/]\s+\d+)/g;
var ie2 = /var\([^)]+\)/g;
function oe(e) {
  return a(e) ? e.replace(/[A-Z]/g, (t2, r) => r === 0 ? t2 : "." + t2.toLowerCase()).toLowerCase() : e;
}
function Lt2(e, t2) {
  C(e) ? e.push(...t2 || []) : i(e) && Object.assign(e, t2);
}
function ve(e) {
  return i(e) && e.hasOwnProperty("$value") && e.hasOwnProperty("$type") ? e.$value : e;
}
function At2(e, t2 = "") {
  return ["opacity", "z-index", "line-height", "font-weight", "flex", "flex-grow", "flex-shrink", "order"].some((s4) => t2.endsWith(s4)) ? e : `${e}`.trim().split(" ").map((a2) => z(a2) ? `${a2}px` : a2).join(" ");
}
function dt(e) {
  return e.replaceAll(/ /g, "").replace(/[^\w]/g, "-");
}
function Q2(e = "", t2 = "") {
  return dt(`${a(e, false) && a(t2, false) ? `${e}-` : e}${t2}`);
}
function ae2(e = "", t2 = "") {
  return `--${Q2(e, t2)}`;
}
function ht(e = "") {
  let t2 = (e.match(/{/g) || []).length, r = (e.match(/}/g) || []).length;
  return (t2 + r) % 2 !== 0;
}
function Y3(e, t2 = "", r = "", s4 = [], i2) {
  if (a(e)) {
    let a2 = e.trim();
    if (ht(a2)) return;
    if (G(a2, k3)) {
      let n = a2.replaceAll(k3, (l2) => {
        let c3 = l2.replace(/{|}/g, "").split(".").filter((m2) => !s4.some((d2) => G(m2, d2)));
        return `var(${ae2(r, re(c3.join("-")))}${s(i2) ? `, ${i2}` : ""})`;
      });
      return G(n.replace(ie2, "0"), ne2) ? `calc(${n})` : n;
    }
    return a2;
  } else if (z(e)) return e;
}
function Dt(e = {}, t2) {
  if (a(t2)) {
    let r = t2.trim();
    return G(r, k3) ? r.replaceAll(k3, (s4) => F(e, s4.replace(/{|}/g, ""))) : r;
  } else if (z(t2)) return t2;
}
function Re(e, t2, r) {
  a(t2, false) && e.push(`${t2}:${r};`);
}
function C3(e, t2) {
  return e ? `${e}{${t2}}` : "";
}
function le(e, t2) {
  if (e.indexOf("dt(") === -1) return e;
  function r(n, l2) {
    let o = [], c3 = 0, m2 = "", d2 = null, u = 0;
    for (; c3 <= n.length; ) {
      let g3 = n[c3];
      if ((g3 === '"' || g3 === "'" || g3 === "`") && n[c3 - 1] !== "\\" && (d2 = d2 === g3 ? null : g3), !d2 && (g3 === "(" && u++, g3 === ")" && u--, (g3 === "," || c3 === n.length) && u === 0)) {
        let f2 = m2.trim();
        f2.startsWith("dt(") ? o.push(le(f2, l2)) : o.push(s4(f2)), m2 = "", c3++;
        continue;
      }
      g3 !== void 0 && (m2 += g3), c3++;
    }
    return o;
  }
  function s4(n) {
    let l2 = n[0];
    if ((l2 === '"' || l2 === "'" || l2 === "`") && n[n.length - 1] === l2) return n.slice(1, -1);
    let o = Number(n);
    return isNaN(o) ? n : o;
  }
  let i2 = [], a2 = [];
  for (let n = 0; n < e.length; n++) if (e[n] === "d" && e.slice(n, n + 3) === "dt(") a2.push(n), n += 2;
  else if (e[n] === ")" && a2.length > 0) {
    let l2 = a2.pop();
    a2.length === 0 && i2.push([l2, n]);
  }
  if (!i2.length) return e;
  for (let n = i2.length - 1; n >= 0; n--) {
    let [l2, o] = i2[n], c3 = e.slice(l2 + 3, o), m2 = r(c3, t2), d2 = t2(...m2);
    e = e.slice(0, l2) + d2 + e.slice(o + 1);
  }
  return e;
}
function Te(e) {
  return e.length === 4 ? `#${e[1]}${e[1]}${e[2]}${e[2]}${e[3]}${e[3]}` : e;
}
function Ne(e) {
  let t2 = parseInt(e.substring(1), 16), r = t2 >> 16 & 255, s4 = t2 >> 8 & 255, i2 = t2 & 255;
  return { r, g: s4, b: i2 };
}
function gt(e, t2, r) {
  return `#${e.toString(16).padStart(2, "0")}${t2.toString(16).padStart(2, "0")}${r.toString(16).padStart(2, "0")}`;
}
var D2 = (e, t2, r) => {
  e = Te(e), t2 = Te(t2);
  let a2 = (r / 100 * 2 - 1 + 1) / 2, n = 1 - a2, l2 = Ne(e), o = Ne(t2), c3 = Math.round(l2.r * a2 + o.r * n), m2 = Math.round(l2.g * a2 + o.g * n), d2 = Math.round(l2.b * a2 + o.b * n);
  return gt(c3, m2, d2);
};
var ce = (e, t2) => D2("#000000", e, t2);
var me = (e, t2) => D2("#ffffff", e, t2);
var Ce = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
var ft = (e) => {
  if (G(e, k3)) {
    let t2 = e.replace(/{|}/g, "");
    return Ce.reduce((r, s4) => (r[s4] = `{${t2}.${s4}}`, r), {});
  }
  return typeof e == "string" ? Ce.reduce((t2, r, s4) => (t2[r] = s4 <= 5 ? me(e, (5 - s4) * 19) : ce(e, (s4 - 5) * 15), t2), {}) : e;
};
var rr = (e) => {
  var a2;
  let t2 = S2.getTheme(), r = ue(t2, e, void 0, "variable"), s4 = (a2 = r == null ? void 0 : r.match(/--[\w-]+/g)) == null ? void 0 : a2[0], i2 = ue(t2, e, void 0, "value");
  return { name: s4, variable: r, value: i2 };
};
var E2 = (...e) => ue(S2.getTheme(), ...e);
var ue = (e = {}, t2, r, s4) => {
  if (t2) {
    let { variable: i2, options: a2 } = S2.defaults || {}, { prefix: n, transform: l2 } = (e == null ? void 0 : e.options) || a2 || {}, o = G(t2, k3) ? t2 : `{${t2}}`;
    return s4 === "value" || l(s4) && l2 === "strict" ? S2.getTokenValue(t2) : Y3(o, void 0, n, [i2.excludedKeyRegex], r);
  }
  return "";
};
function ar(e, ...t2) {
  if (e instanceof Array) {
    let r = e.reduce((s4, i2, a2) => {
      var n;
      return s4 + i2 + ((n = m(t2[a2], { dt: E2 })) != null ? n : "");
    }, "");
    return le(r, E2);
  }
  return m(e, { dt: E2 });
}
var w3 = (e = {}) => {
  let { preset: t2, options: r } = e;
  return { preset(s4) {
    return t2 = t2 ? H(t2, s4) : s4, this;
  }, options(s4) {
    return r = r ? h2(h2({}, r), s4) : s4, this;
  }, primaryPalette(s4) {
    let { semantic: i2 } = t2 || {};
    return t2 = $3(h2({}, t2), { semantic: $3(h2({}, i2), { primary: s4 }) }), this;
  }, surfacePalette(s4) {
    var o, c3;
    let { semantic: i2 } = t2 || {}, a2 = s4 && Object.hasOwn(s4, "light") ? s4.light : s4, n = s4 && Object.hasOwn(s4, "dark") ? s4.dark : s4, l2 = { colorScheme: { light: h2(h2({}, (o = i2 == null ? void 0 : i2.colorScheme) == null ? void 0 : o.light), !!a2 && { surface: a2 }), dark: h2(h2({}, (c3 = i2 == null ? void 0 : i2.colorScheme) == null ? void 0 : c3.dark), !!n && { surface: n }) } };
    return t2 = $3(h2({}, t2), { semantic: h2(h2({}, i2), l2) }), this;
  }, define({ useDefaultPreset: s4 = false, useDefaultOptions: i2 = false } = {}) {
    return { preset: s4 ? S2.getPreset() : t2, options: i2 ? S2.getOptions() : r };
  }, update({ mergePresets: s4 = true, mergeOptions: i2 = true } = {}) {
    let a2 = { preset: s4 ? H(S2.getPreset(), t2) : t2, options: i2 ? h2(h2({}, S2.getOptions()), r) : r };
    return S2.setTheme(a2), a2;
  }, use(s4) {
    let i2 = this.define(s4);
    return S2.setTheme(i2), i2;
  } };
};
function de(e, t2 = {}) {
  let r = S2.defaults.variable, { prefix: s4 = r.prefix, selector: i2 = r.selector, excludedKeyRegex: a2 = r.excludedKeyRegex } = t2, n = [], l2 = [], o = [{ node: e, path: s4 }];
  for (; o.length; ) {
    let { node: m2, path: d2 } = o.pop();
    for (let u in m2) {
      let g3 = m2[u], f2 = ve(g3), p2 = G(u, a2) ? Q2(d2) : Q2(d2, re(u));
      if (i(f2)) o.push({ node: f2, path: p2 });
      else {
        let y3 = ae2(p2), R2 = Y3(f2, p2, s4, [a2]);
        Re(l2, y3, R2);
        let T2 = p2;
        s4 && T2.startsWith(s4 + "-") && (T2 = T2.slice(s4.length + 1)), n.push(T2.replace(/-/g, "."));
      }
    }
  }
  let c3 = l2.join("");
  return { value: l2, tokens: n, declarations: c3, css: C3(i2, c3) };
}
var b3 = { regex: { rules: { class: { pattern: /^\.([a-zA-Z][\w-]*)$/, resolve(e) {
  return { type: "class", selector: e, matched: this.pattern.test(e.trim()) };
} }, attr: { pattern: /^\[(.*)\]$/, resolve(e) {
  return { type: "attr", selector: `:root${e},:host${e}`, matched: this.pattern.test(e.trim()) };
} }, media: { pattern: /^@media (.*)$/, resolve(e) {
  return { type: "media", selector: e, matched: this.pattern.test(e.trim()) };
} }, system: { pattern: /^system$/, resolve(e) {
  return { type: "system", selector: "@media (prefers-color-scheme: dark)", matched: this.pattern.test(e.trim()) };
} }, custom: { resolve(e) {
  return { type: "custom", selector: e, matched: true };
} } }, resolve(e) {
  let t2 = Object.keys(this.rules).filter((r) => r !== "custom").map((r) => this.rules[r]);
  return [e].flat().map((r) => {
    var s4;
    return (s4 = t2.map((i2) => i2.resolve(r)).find((i2) => i2.matched)) != null ? s4 : this.rules.custom.resolve(r);
  });
} }, _toVariables(e, t2) {
  return de(e, { prefix: t2 == null ? void 0 : t2.prefix });
}, getCommon({ name: e = "", theme: t2 = {}, params: r, set: s4, defaults: i2 }) {
  var R2, T2, j, O, M3, z3, V2;
  let { preset: a2, options: n } = t2, l2, o, c3, m2, d2, u, g3;
  if (s(a2) && n.transform !== "strict") {
    let { primitive: L, semantic: te, extend: re2 } = a2, f2 = te || {}, { colorScheme: K3 } = f2, A2 = v2(f2, ["colorScheme"]), x3 = re2 || {}, { colorScheme: X2 } = x3, G2 = v2(x3, ["colorScheme"]), p2 = K3 || {}, { dark: U2 } = p2, B = v2(p2, ["dark"]), y3 = X2 || {}, { dark: I2 } = y3, H2 = v2(y3, ["dark"]), W2 = s(L) ? this._toVariables({ primitive: L }, n) : {}, q3 = s(A2) ? this._toVariables({ semantic: A2 }, n) : {}, Z = s(B) ? this._toVariables({ light: B }, n) : {}, pe = s(U2) ? this._toVariables({ dark: U2 }, n) : {}, fe = s(G2) ? this._toVariables({ semantic: G2 }, n) : {}, ye = s(H2) ? this._toVariables({ light: H2 }, n) : {}, Se = s(I2) ? this._toVariables({ dark: I2 }, n) : {}, [Me, ze] = [(R2 = W2.declarations) != null ? R2 : "", W2.tokens], [Ke, Xe] = [(T2 = q3.declarations) != null ? T2 : "", q3.tokens || []], [Ge, Ue] = [(j = Z.declarations) != null ? j : "", Z.tokens || []], [Be, Ie] = [(O = pe.declarations) != null ? O : "", pe.tokens || []], [He, We] = [(M3 = fe.declarations) != null ? M3 : "", fe.tokens || []], [qe, Ze] = [(z3 = ye.declarations) != null ? z3 : "", ye.tokens || []], [Fe, Je] = [(V2 = Se.declarations) != null ? V2 : "", Se.tokens || []];
    l2 = this.transformCSS(e, Me, "light", "variable", n, s4, i2), o = ze;
    let Qe = this.transformCSS(e, `${Ke}${Ge}`, "light", "variable", n, s4, i2), Ye = this.transformCSS(e, `${Be}`, "dark", "variable", n, s4, i2);
    c3 = `${Qe}${Ye}`, m2 = [.../* @__PURE__ */ new Set([...Xe, ...Ue, ...Ie])];
    let et2 = this.transformCSS(e, `${He}${qe}color-scheme:light`, "light", "variable", n, s4, i2), tt2 = this.transformCSS(e, `${Fe}color-scheme:dark`, "dark", "variable", n, s4, i2);
    d2 = `${et2}${tt2}`, u = [.../* @__PURE__ */ new Set([...We, ...Ze, ...Je])], g3 = m(a2.css, { dt: E2 });
  }
  return { primitive: { css: l2, tokens: o }, semantic: { css: c3, tokens: m2 }, global: { css: d2, tokens: u }, style: g3 };
}, getPreset({ name: e = "", preset: t2 = {}, options: r, params: s4, set: i2, defaults: a2, selector: n }) {
  var f2, x3, p2;
  let l2, o, c3;
  if (s(t2) && r.transform !== "strict") {
    let y3 = e.replace("-directive", ""), m2 = t2, { colorScheme: R2, extend: T2, css: j } = m2, O = v2(m2, ["colorScheme", "extend", "css"]), d2 = T2 || {}, { colorScheme: M3 } = d2, z3 = v2(d2, ["colorScheme"]), u = R2 || {}, { dark: V2 } = u, L = v2(u, ["dark"]), g3 = M3 || {}, { dark: te } = g3, re2 = v2(g3, ["dark"]), K3 = s(O) ? this._toVariables({ [y3]: h2(h2({}, O), z3) }, r) : {}, A2 = s(L) ? this._toVariables({ [y3]: h2(h2({}, L), re2) }, r) : {}, X2 = s(V2) ? this._toVariables({ [y3]: h2(h2({}, V2), te) }, r) : {}, [G2, U2] = [(f2 = K3.declarations) != null ? f2 : "", K3.tokens || []], [B, I2] = [(x3 = A2.declarations) != null ? x3 : "", A2.tokens || []], [H2, W2] = [(p2 = X2.declarations) != null ? p2 : "", X2.tokens || []], q3 = this.transformCSS(y3, `${G2}${B}`, "light", "variable", r, i2, a2, n), Z = this.transformCSS(y3, H2, "dark", "variable", r, i2, a2, n);
    l2 = `${q3}${Z}`, o = [.../* @__PURE__ */ new Set([...U2, ...I2, ...W2])], c3 = m(j, { dt: E2 });
  }
  return { css: l2, tokens: o, style: c3 };
}, getPresetC({ name: e = "", theme: t2 = {}, params: r, set: s4, defaults: i2 }) {
  var o;
  let { preset: a2, options: n } = t2, l2 = (o = a2 == null ? void 0 : a2.components) == null ? void 0 : o[e];
  return this.getPreset({ name: e, preset: l2, options: n, params: r, set: s4, defaults: i2 });
}, getPresetD({ name: e = "", theme: t2 = {}, params: r, set: s4, defaults: i2 }) {
  var c3, m2;
  let a2 = e.replace("-directive", ""), { preset: n, options: l2 } = t2, o = ((c3 = n == null ? void 0 : n.components) == null ? void 0 : c3[a2]) || ((m2 = n == null ? void 0 : n.directives) == null ? void 0 : m2[a2]);
  return this.getPreset({ name: a2, preset: o, options: l2, params: r, set: s4, defaults: i2 });
}, applyDarkColorScheme(e) {
  return !(e.darkModeSelector === "none" || e.darkModeSelector === false);
}, getColorSchemeOption(e, t2) {
  var r;
  return this.applyDarkColorScheme(e) ? this.regex.resolve(e.darkModeSelector === true ? t2.options.darkModeSelector : (r = e.darkModeSelector) != null ? r : t2.options.darkModeSelector) : [];
}, getLayerOrder(e, t2 = {}, r, s4) {
  let { cssLayer: i2 } = t2;
  return i2 ? `@layer ${m(i2.order || i2.name || "primeui", r)}` : "";
}, getCommonStyleSheet({ name: e = "", theme: t2 = {}, params: r, props: s4 = {}, set: i2, defaults: a2 }) {
  let n = this.getCommon({ name: e, theme: t2, params: r, set: i2, defaults: a2 }), l2 = Object.entries(s4).reduce((o, [c3, m2]) => o.push(`${c3}="${m2}"`) && o, []).join(" ");
  return Object.entries(n || {}).reduce((o, [c3, m2]) => {
    if (i(m2) && Object.hasOwn(m2, "css")) {
      let d2 = Y(m2.css), u = `${c3}-variables`;
      o.push(`<style type="text/css" data-primevue-style-id="${u}" ${l2}>${d2}</style>`);
    }
    return o;
  }, []).join("");
}, getStyleSheet({ name: e = "", theme: t2 = {}, params: r, props: s4 = {}, set: i2, defaults: a2 }) {
  var c3;
  let n = { name: e, theme: t2, params: r, set: i2, defaults: a2 }, l2 = (c3 = e.includes("-directive") ? this.getPresetD(n) : this.getPresetC(n)) == null ? void 0 : c3.css, o = Object.entries(s4).reduce((m2, [d2, u]) => m2.push(`${d2}="${u}"`) && m2, []).join(" ");
  return l2 ? `<style type="text/css" data-primevue-style-id="${e}-variables" ${o}>${Y(l2)}</style>` : "";
}, createTokens(e = {}, t2, r = "", s4 = "", i2 = {}) {
  let a2 = function(l2, o = {}, c3 = []) {
    if (c3.includes(this.path)) return console.warn(`Circular reference detected at ${this.path}`), { colorScheme: l2, path: this.path, paths: o, value: void 0 };
    c3.push(this.path), o.name = this.path, o.binding || (o.binding = {});
    let m2 = this.value;
    if (typeof this.value == "string" && k3.test(this.value)) {
      let u = this.value.trim().replace(k3, (g3) => {
        var y3;
        let f2 = g3.slice(1, -1), x3 = this.tokens[f2];
        if (!x3) return console.warn(`Token not found for path: ${f2}`), "__UNRESOLVED__";
        let p2 = x3.computed(l2, o, c3);
        return Array.isArray(p2) && p2.length === 2 ? `light-dark(${p2[0].value},${p2[1].value})` : (y3 = p2 == null ? void 0 : p2.value) != null ? y3 : "__UNRESOLVED__";
      });
      m2 = ne2.test(u.replace(ie2, "0")) ? `calc(${u})` : u;
    }
    return l(o.binding) && delete o.binding, c3.pop(), { colorScheme: l2, path: this.path, paths: o, value: m2.includes("__UNRESOLVED__") ? void 0 : m2 };
  }, n = (l2, o, c3) => {
    Object.entries(l2).forEach(([m2, d2]) => {
      let u = G(m2, t2.variable.excludedKeyRegex) ? o : o ? `${o}.${oe(m2)}` : oe(m2), g3 = c3 ? `${c3}.${m2}` : m2;
      i(d2) ? n(d2, u, g3) : (i2[u] || (i2[u] = { paths: [], computed: (f2, x3 = {}, p2 = []) => {
        if (i2[u].paths.length === 1) return i2[u].paths[0].computed(i2[u].paths[0].scheme, x3.binding, p2);
        if (f2 && f2 !== "none") for (let y3 = 0; y3 < i2[u].paths.length; y3++) {
          let R2 = i2[u].paths[y3];
          if (R2.scheme === f2) return R2.computed(f2, x3.binding, p2);
        }
        return i2[u].paths.map((y3) => y3.computed(y3.scheme, x3[y3.scheme], p2));
      } }), i2[u].paths.push({ path: g3, value: d2, scheme: g3.includes("colorScheme.light") ? "light" : g3.includes("colorScheme.dark") ? "dark" : "none", computed: a2, tokens: i2 }));
    });
  };
  return n(e, r, s4), i2;
}, getTokenValue(e, t2, r) {
  var l2;
  let i2 = ((o) => o.split(".").filter((m2) => !G(m2.toLowerCase(), r.variable.excludedKeyRegex)).join("."))(t2), a2 = t2.includes("colorScheme.light") ? "light" : t2.includes("colorScheme.dark") ? "dark" : void 0, n = [(l2 = e[i2]) == null ? void 0 : l2.computed(a2)].flat().filter((o) => o);
  return n.length === 1 ? n[0].value : n.reduce((o = {}, c3) => {
    let u = c3, { colorScheme: m2 } = u, d2 = v2(u, ["colorScheme"]);
    return o[m2] = d2, o;
  }, void 0);
}, getSelectorRule(e, t2, r, s4) {
  return r === "class" || r === "attr" ? C3(s(t2) ? `${e}${t2},${e} ${t2}` : e, s4) : C3(e, C3(t2 != null ? t2 : ":root,:host", s4));
}, transformCSS(e, t2, r, s4, i2 = {}, a2, n, l2) {
  if (s(t2)) {
    let { cssLayer: o } = i2;
    if (s4 !== "style") {
      let c3 = this.getColorSchemeOption(i2, n);
      t2 = r === "dark" ? c3.reduce((m2, { type: d2, selector: u }) => (s(u) && (m2 += u.includes("[CSS]") ? u.replace("[CSS]", t2) : this.getSelectorRule(u, l2, d2, t2)), m2), "") : C3(l2 != null ? l2 : ":root,:host", t2);
    }
    if (o) {
      let c3 = { name: "primeui", order: "primeui" };
      i(o) && (c3.name = m(o.name, { name: e, type: s4 })), s(c3.name) && (t2 = C3(`@layer ${c3.name}`, t2), a2 == null || a2.layerNames(c3.name));
    }
    return t2;
  }
  return "";
} };
var S2 = { defaults: { variable: { prefix: "p", selector: ":root,:host", excludedKeyRegex: /^(primitive|semantic|components|directives|variables|colorscheme|light|dark|common|root|states|extend|css)$/gi }, options: { prefix: "p", darkModeSelector: "system", cssLayer: false } }, _theme: void 0, _layerNames: /* @__PURE__ */ new Set(), _loadedStyleNames: /* @__PURE__ */ new Set(), _loadingStyles: /* @__PURE__ */ new Set(), _tokens: {}, update(e = {}) {
  let { theme: t2 } = e;
  t2 && (this._theme = $3(h2({}, t2), { options: h2(h2({}, this.defaults.options), t2.options) }), this._tokens = b3.createTokens(this.preset, this.defaults), this.clearLoadedStyleNames());
}, get theme() {
  return this._theme;
}, get preset() {
  var e;
  return ((e = this.theme) == null ? void 0 : e.preset) || {};
}, get options() {
  var e;
  return ((e = this.theme) == null ? void 0 : e.options) || {};
}, get tokens() {
  return this._tokens;
}, getTheme() {
  return this.theme;
}, setTheme(e) {
  this.update({ theme: e }), N2.emit("theme:change", e);
}, getPreset() {
  return this.preset;
}, setPreset(e) {
  this._theme = $3(h2({}, this.theme), { preset: e }), this._tokens = b3.createTokens(e, this.defaults), this.clearLoadedStyleNames(), N2.emit("preset:change", e), N2.emit("theme:change", this.theme);
}, getOptions() {
  return this.options;
}, setOptions(e) {
  this._theme = $3(h2({}, this.theme), { options: e }), this.clearLoadedStyleNames(), N2.emit("options:change", e), N2.emit("theme:change", this.theme);
}, getLayerNames() {
  return [...this._layerNames];
}, setLayerNames(e) {
  this._layerNames.add(e);
}, getLoadedStyleNames() {
  return this._loadedStyleNames;
}, isStyleNameLoaded(e) {
  return this._loadedStyleNames.has(e);
}, setLoadedStyleName(e) {
  this._loadedStyleNames.add(e);
}, deleteLoadedStyleName(e) {
  this._loadedStyleNames.delete(e);
}, clearLoadedStyleNames() {
  this._loadedStyleNames.clear();
}, getTokenValue(e) {
  return b3.getTokenValue(this.tokens, e, this.defaults);
}, getCommon(e = "", t2) {
  return b3.getCommon({ name: e, theme: this.theme, params: t2, defaults: this.defaults, set: { layerNames: this.setLayerNames.bind(this) } });
}, getComponent(e = "", t2) {
  let r = { name: e, theme: this.theme, params: t2, defaults: this.defaults, set: { layerNames: this.setLayerNames.bind(this) } };
  return b3.getPresetC(r);
}, getDirective(e = "", t2) {
  let r = { name: e, theme: this.theme, params: t2, defaults: this.defaults, set: { layerNames: this.setLayerNames.bind(this) } };
  return b3.getPresetD(r);
}, getCustomPreset(e = "", t2, r, s4) {
  let i2 = { name: e, preset: t2, options: this.options, selector: r, params: s4, defaults: this.defaults, set: { layerNames: this.setLayerNames.bind(this) } };
  return b3.getPreset(i2);
}, getLayerOrderCSS(e = "") {
  return b3.getLayerOrder(e, this.options, { names: this.getLayerNames() }, this.defaults);
}, transformCSS(e = "", t2, r = "style", s4) {
  return b3.transformCSS(e, t2, s4, r, this.options, { layerNames: this.setLayerNames.bind(this) }, this.defaults);
}, getCommonStyleSheet(e = "", t2, r = {}) {
  return b3.getCommonStyleSheet({ name: e, theme: this.theme, params: t2, props: r, defaults: this.defaults, set: { layerNames: this.setLayerNames.bind(this) } });
}, getStyleSheet(e, t2, r = {}) {
  return b3.getStyleSheet({ name: e, theme: this.theme, params: t2, props: r, defaults: this.defaults, set: { layerNames: this.setLayerNames.bind(this) } });
}, onStyleMounted(e) {
  this._loadingStyles.add(e);
}, onStyleUpdated(e) {
  this._loadingStyles.add(e);
}, onStyleLoaded(e, { name: t2 }) {
  this._loadingStyles.size && (this._loadingStyles.delete(t2), N2.emit(`theme:${t2}:load`, e), !this._loadingStyles.size && N2.emit("theme:load"));
} };
function Ve(...e) {
  let t2 = w(S2.getPreset(), ...e);
  return S2.setPreset(t2), t2;
}
function Le(e) {
  return w3().primaryPalette(e).update().preset;
}
function Ae(e) {
  return w3().surfacePalette(e).update().preset;
}
function De(...e) {
  let t2 = w(...e);
  return S2.setPreset(t2), t2;
}
function je(e) {
  return w3(e).update({ mergePresets: false });
}
var ge = class {
  constructor({ attrs: t2 } = {}) {
    this._styles = /* @__PURE__ */ new Map(), this._attrs = t2 || {};
  }
  get(t2) {
    return this._styles.get(t2);
  }
  has(t2) {
    return this._styles.has(t2);
  }
  delete(t2) {
    this._styles.delete(t2);
  }
  clear() {
    this._styles.clear();
  }
  add(t2, r) {
    if (s(r)) {
      let s4 = { name: t2, css: r, attrs: this._attrs, markup: q2(r, this._attrs) };
      this._styles.set(t2, $3(h2({}, s4), { element: this.createStyleElement(s4) }));
    }
  }
  update() {
  }
  getStyles() {
    return this._styles;
  }
  getAllCSS() {
    return [...this._styles.values()].map((t2) => t2.css).filter(String);
  }
  getAllMarkup() {
    return [...this._styles.values()].map((t2) => t2.markup).filter(String);
  }
  getAllElements() {
    return [...this._styles.values()].map((t2) => t2.element);
  }
  createStyleElement(t2 = {}) {
  }
};
var Nt = ge;

export {
  l,
  c,
  s,
  p,
  k,
  q,
  i,
  M,
  m,
  a,
  g,
  F,
  C,
  J,
  H,
  Y,
  X,
  ne,
  s2,
  f,
  W,
  P,
  k2,
  $2 as $,
  V,
  D,
  S,
  v,
  I,
  T,
  c2,
  pt,
  A,
  U,
  z2 as z,
  bt,
  Q,
  b2 as b,
  vt,
  Tt,
  Lt,
  K2 as K,
  C2,
  At,
  Mt,
  Rt,
  $t,
  tt,
  et,
  Yt,
  _t,
  s3,
  x2 as x,
  ke,
  N2 as N,
  k3,
  ne2,
  ie2 as ie,
  oe,
  Lt2,
  ve,
  At2,
  dt,
  Q2,
  ae2 as ae,
  ht,
  Y3 as Y2,
  Dt,
  Re,
  C3,
  le,
  D2,
  ce,
  me,
  ft,
  rr,
  E2 as E,
  ue,
  ar,
  w3 as w,
  de,
  b3 as b2,
  S2,
  Ve,
  Le,
  Ae,
  De,
  je,
  Nt
};
//# sourceMappingURL=chunk-4NXIHAZF.js.map
