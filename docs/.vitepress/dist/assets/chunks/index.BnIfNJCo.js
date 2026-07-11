var f=Object.defineProperty;var b=(c,e,t)=>e in c?f(c,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):c[e]=t;var d=(c,e,t)=>b(c,typeof e!="symbol"?e+"":e,t);import{L as $,a as g,t as m}from"./theme.nt-k-ham.js";import"./framework.DdcUsuRQ.js";class w{static serialize(e){if(e===void 0)return"";const t=e.r.toFixed(4),a=e.g.toFixed(4),o=e.b.toFixed(4);return`color(display-p3 ${t} ${a} ${o})`}}const j=/^(.+)-(\d+)$/,x=new Set(["50","100","150","200","250","300","350","400","450","500","550","600","650","700","750","800","850","900","950"]);class T{static build(e){const t={},a={};for(const[s,n]of Object.entries(e)){const r=j.exec(s);if(r!==null&&x.has(r[2]??"")){const i=r[1],l=r[2];t[i]??(t[i]={}),t[i][l]=n.hex}else a[s]=n.hex}const o={};for(const[s,n]of Object.entries(a))o[s]=n;for(const[s,n]of Object.entries(t))if(Object.keys(n).length===1){const[[r,i]]=Object.entries(n);o[`${s}-${r}`]=i}else o[s]=n;return o}}class y{static serialize(e){const t=["{"];for(const[a,o]of Object.entries(e))if(typeof o=="string")t.push(`  '${a}': '${o}',`);else{t.push(`  '${a}': {`);for(const[s,n]of Object.entries(o))t.push(`    '${s}': '${n}',`);t.push("  },")}return t.push("}"),t.join(`
`)}}class O{static build(e,t){const o=`:root {
${Object.entries(e).map(([r,i])=>`  ${m(r,t)}: ${i.hex};`).join(`
`)}
}`,s=[];for(const[r,i]of Object.entries(e))if(i.displayP3!==void 0){const l=m(r,t);s.push(`  ${l}: ${w.serialize(i.displayP3)};`)}if(s.length===0)return o;const n=`@supports (color: color(display-p3 0 0 0)) {
  :root {
${s.map(r=>`  ${r}`).join(`
`)}
  }
}`;return`${o}

${n}`}}class p{constructor(){d(this,"name","emit:tailwindTheme");d(this,"manifest",{description:"Emit Tailwind theme.colors object and config module from resolved roles",name:"emit:tailwindTheme",reads:["roles","metadata"],writes:["outputs.tailwind:theme"]})}run(e,t){const a=e.metadata.cssVarPrefix,o=typeof a=="string"?a:"--c-",s=T.build(e.roles),n=O.build(e.roles,o),i=["export default {","  theme: {","    extend: {",`      colors: ${y.serialize(s).split(`
`).map((u,h)=>h===0?u:`      ${u}`).join(`
`)},`,"    },","  },","};"].join(`
`),l={colors:s,config:i,cssVars:n};e.outputs["tailwind:theme"]=l,t.logger.debug($.create().component("EmitTailwindTheme").operation("run").status(g.SUCCESS).message("Emitted Tailwind theme").context({colorGroups:Object.keys(s).length}).build())}}const S={additionalProperties:!1,properties:{colors:{additionalProperties:!0,type:"object"},config:{type:"string"},cssVars:{type:"string"}},type:"object"};class E{constructor(){d(this,"name","tailwind");d(this,"version","0.1.0")}tasks(){return[new p]}schemas(){return{outputs:{"tailwind:theme":S}}}}const C=new E,V=new p;export{p as EmitTailwindTheme,E as TailwindPlugin,V as emitTailwindTheme,C as tailwindPlugin};
