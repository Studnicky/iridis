var S=Object.defineProperty;var x=(c,t,o)=>t in c?S(c,t,{enumerable:!0,configurable:!0,writable:!0,value:o}):c[t]=o;var p=(c,t,o)=>x(c,typeof t!="symbol"?t+"":t,o);import{t as m,L as j,a as V}from"./theme.DDFRprnP.js";import"./framework.DdcUsuRQ.js";function k(c){if(c===void 0)return"";const t=c.r.toFixed(4),o=c.g.toFixed(4),e=c.b.toFixed(4);return`color(display-p3 ${t} ${o} ${e})`}function C(c){var t;switch((t=c.hints)==null?void 0:t.intent){case"accent":return"Highlight";case"background":return"Canvas";case"button":return"ButtonFace";case"critical":return"CanvasText";case"link":return"LinkText";case"muted":return"GrayText";case"onAccent":return"HighlightText";case"onButton":return"ButtonText";case"positive":return"CanvasText";case"text":return"CanvasText";default:return"CanvasText"}}class y{static build(t,o){return Object.entries(t).map(([s,r])=>`  ${m(s,o)}: ${r.hex};`)}}class P{static build(t,o){return`:root {
${y.build(t,o).join(`
`)}
}`}}class B{static build(t,o,e,s){const r=y.build(t,o);return`${typeof e=="string"&&e.length>0?`[${e}='${s}']`:`[data-theme='${s}']`} {
${r.join(`
`)}
}`}}class w{static build(t,o){return`@media (prefers-color-scheme: dark) {
  :root {
${y.build(t,o).map(s=>`  ${s}`).join(`
`)}
  }
}`}}class O{static build(t,o){return`@media (forced-colors: active) {
  :root {
${Object.entries(t).map(([s,r])=>{const a=m(s,o),n=C(r);return`  ${a}: ${n};`}).map(s=>`  ${s}`).join(`
`)}
  }
}`}}class G{static build(t,o){const e=[];for(const[s,r]of Object.entries(t))if(r.displayP3!==void 0){const a=m(s,o);e.push(`  ${a}: ${k(r.displayP3)};`)}return e.length===0?"":`@supports (color: color(display-p3 0 0 0)) {
  :root {
${e.map(s=>`  ${s}`).join(`
`)}
  }
}`}}class N{static build(t,o){const e={};for(const s of Object.keys(t))e[s]=m(s,o);return e}}class T{constructor(){p(this,"name","emit:cssVars");p(this,"manifest",{description:"Emit CSS custom property blocks from resolved roles and variants",name:"emit:cssVars",reads:["roles","variants","metadata"],writes:["outputs.stylesheet:cssVars"]})}run(t,o){const e=typeof t.metadata.cssVarPrefix=="string"?t.metadata.cssVarPrefix:"--c-",s=typeof t.metadata.scopeAttr=="string"?t.metadata.scopeAttr:void 0,r=typeof t.metadata.themeName=="string"?t.metadata.themeName:"default",a=t.variants.dark,n=P.build(t.roles,e),i=B.build(t.roles,e,s,r),u=a!==void 0?w.build(a,e):"",f=O.build(t.roles,e),l=G.build(t.roles,e),b=[n,u,l,f].filter(Boolean).join(`

`),$=N.build(t.roles,e),v={darkScheme:u,forcedColors:f,full:b,map:$,rootBlock:n,scopedBlock:i,wideGamut:l};t.outputs["stylesheet:cssVars"]=v}}const E=new T;class h{static build(t,o,e,s){const r=Object.entries(o).map(([n,i])=>`  ${m(n,e)}: ${i.hex};`);return`${`[data-${s}='${t}']`} {
${r.join(`
`)}
}`}}class g{static build(t,o,e,s){const r=[];for(const[n,i]of Object.entries(o))if(i.displayP3!==void 0){const u=m(n,e);r.push(`  ${u}: ${k(i.displayP3)};`)}return r.length===0?"":`@supports (color: color(display-p3 0 0 0)) {
  ${`[data-${s}='${t}']`} {
${r.map(n=>`  ${n}`).join(`
`)}
  }
}`}}class F{constructor(){p(this,"name","emit:cssVarsScoped");p(this,"manifest",{description:"Emit per-category scoped CSS custom property blocks for Vue/Capacitor use cases",name:"emit:cssVarsScoped",reads:["roles","variants","metadata"],writes:["outputs.stylesheet:cssVarsScoped"]})}run(t,o){const e=typeof t.metadata.cssVarPrefix=="string"?t.metadata.cssVarPrefix:"--c-",s=typeof t.metadata.scopePrefix=="string"?t.metadata.scopePrefix:"theme",r={},a={};r.default=h.build("default",t.roles,e,s);const n=g.build("default",t.roles,e,s);n.length>0&&(a.default=n);for(const[l,d]of Object.entries(t.variants)){r[l]=h.build(l,d,e,s);const b=g.build(l,d,e,s);b.length>0&&(a[l]=b)}const i=[];for(const l of Object.keys(r)){i.push(r[l]);const d=a[l];d!==void 0&&d.length>0&&i.push(d)}const u=i.join(`

`),f={blocks:r,full:u,wideGamut:a};t.outputs["stylesheet:cssVarsScoped"]=f,o.logger.debug(j.create().component("EmitCssVarsScoped").operation("run").status(V.SUCCESS).message("Emitted scoped blocks").context({count:Object.keys(r).length,wideGamutCount:Object.keys(a).length}).build())}}const D=new F,L={additionalProperties:!1,properties:{darkScheme:{type:"string"},forcedColors:{type:"string"},full:{type:"string"},map:{additionalProperties:{type:"string"},type:"object"},rootBlock:{type:"string"},scopedBlock:{type:"string"},wideGamut:{type:"string"}},type:"object"},A={additionalProperties:!1,properties:{blocks:{additionalProperties:{type:"string"},type:"object"},full:{type:"string"},wideGamut:{additionalProperties:{type:"string"},type:"object"}},type:"object"};class R{constructor(){p(this,"name","stylesheet");p(this,"version","0.1.0")}tasks(){return[E,D]}schemas(){return{outputs:{"stylesheet:cssVars":L,"stylesheet:cssVarsScoped":A}}}}const _=new R;export{E as emitCssVars,D as emitCssVarsScoped,_ as stylesheetPlugin};
